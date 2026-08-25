// app/actions/users.ts
'use server';

import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export interface CreateUserInput {
  email: string;
  fullName: string;
  employeeId?: string | null;
  phone?: string | null;
  warehouseId: string;
  roleIds: string[];
}

export interface AssignWarehouseAccessInput {
  userId: string;
  warehouseId: string;
  roleIds: string[];
}

export interface RevokeWarehouseAccessInput {
  userId: string;
  warehouseId: string;
}

export interface UpdateUserProfileInput {
  userId: string;
  fullName: string;
  employeeId?: string | null;
  phone?: string | null;
}

export interface CompletePasswordChangeInput {
  newPassword: string;
  confirmPassword: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH HELPER: Authorize Caller & Verify Privileged Boundaries
// ─────────────────────────────────────────────────────────────────────────────

async function getAuthenticatedCaller() {
  const supabase = await createServerClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();

  if (authErr || !authData?.user) {
    return { caller: null, error: 'Unauthorized: Harap login terlebih dahulu.' };
  }

  if (authData.user.app_metadata?.must_change_password === true) {
    return {
      caller: null,
      error: 'PASSWORD_CHANGE_REQUIRED: Anda wajib mengganti password awal sebelum melakukan tindakan operasional.',
    };
  }

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, full_name, is_super_admin, is_active')
    .eq('id', authData.user.id)
    .single();

  if (!profile || !profile.is_active) {
    return { caller: null, error: 'Akun Anda tidak aktif atau tidak ditemukan.' };
  }

  return {
    caller: {
      userId: authData.user.id,
      email: authData.user.email,
      fullName: profile.full_name,
      isSuperAdmin: profile.is_super_admin ?? false,
    },
    adminClient,
    error: null,
  };
}

/**
 * Verify caller has USER_MANAGE authority on a given warehouse, or is Super Admin.
 */
async function verifyWarehouseUserAuthority(adminClient: any, callerUserId: string, isSuperAdmin: boolean, targetWarehouseId: string) {
  if (isSuperAdmin) return true;

  const { data: uw } = await adminClient
    .from('user_warehouses')
    .select('roles(name, role_capabilities(capability))')
    .eq('user_id', callerUserId)
    .eq('warehouse_id', targetWarehouseId)
    .eq('is_active', true);

  if (!uw || uw.length === 0) return false;

  for (const row of uw) {
    const caps = row.roles?.role_capabilities || [];
    if (caps.some((c: any) => c.capability === 'user.manage')) {
      return true;
    }
  }

  return false;
}

/**
 * Inspect target user's effective system-wide authority across all warehouses.
 * Returns true if the target user is a Privileged Target (Super Admin, Admin anywhere, Regional Manager anywhere).
 */
async function isTargetUserPrivileged(adminClient: any, targetUserId: string): Promise<{ isPrivileged: boolean; reason?: string }> {
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('is_super_admin')
    .eq('id', targetUserId)
    .maybeSingle();

  if (targetProfile?.is_super_admin) {
    return { isPrivileged: true, reason: 'Super Admin' };
  }

  const { data: targetUws } = await adminClient
    .from('user_warehouses')
    .select('roles(name)')
    .eq('user_id', targetUserId)
    .eq('is_active', true);

  if (targetUws && targetUws.length > 0) {
    for (const row of targetUws) {
      const roleName = row.roles?.name;
      if (roleName === 'admin' || roleName === 'regional_manager') {
        return { isPrivileged: true, reason: roleName === 'admin' ? 'Administrator' : 'Regional Manager' };
      }
    }
  }

  return { isPrivileged: false };
}

/**
 * Check if the target user is the last active Super Admin.
 */
async function isLastActiveSuperAdmin(adminClient: any, targetUserId: string): Promise<boolean> {
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('is_super_admin, is_active')
    .eq('id', targetUserId)
    .maybeSingle();

  if (!targetProfile?.is_super_admin) return false;

  const { count } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_super_admin', true)
    .eq('is_active', true);

  return (count ?? 0) <= 1;
}

/**
 * Check if the target user is the last active Admin in a specific warehouse.
 */
async function isLastWarehouseAdmin(adminClient: any, warehouseId: string, targetUserId: string): Promise<boolean> {
  const { data: adminRole } = await adminClient.from('roles').select('id').eq('name', 'admin').single();
  if (!adminRole) return false;

  const { count } = await adminClient
    .from('user_warehouses')
    .select('*', { count: 'exact', head: true })
    .eq('warehouse_id', warehouseId)
    .eq('role_id', adminRole.id)
    .eq('is_active', true);

  if ((count ?? 0) <= 1) {
    const { data: isUserAdmin } = await adminClient
      .from('user_warehouses')
      .select('id')
      .eq('warehouse_id', warehouseId)
      .eq('user_id', targetUserId)
      .eq('role_id', adminRole.id)
      .eq('is_active', true)
      .maybeSingle();

    return !!isUserAdmin;
  }

  return false;
}

/**
 * Generate cryptographically secure random initial password (16 characters).
 */
function generateSecureInitialPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const bytes = crypto.randomBytes(16);
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREATE NEW USER ACTION (BUAT PENGGUNA BARU)
// ─────────────────────────────────────────────────────────────────────────────

export async function createUserAction(input: CreateUserInput) {
  try {
    const { caller, adminClient, error: authError } = await getAuthenticatedCaller();
    if (authError || !caller) return { success: false, error: authError };

    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();
    const employeeId = input.employeeId?.trim() || null;
    const phone = input.phone?.trim() || null;
    const warehouseId = input.warehouseId;
    const roleIds = input.roleIds || [];

    if (!email || !fullName || !warehouseId || roleIds.length === 0) {
      return { success: false, error: 'Email, Nama Lengkap, Gudang, dan minimal satu Role wajib diisi.' };
    }

    // 1. Authorize caller on target warehouse
    const hasAuthority = await verifyWarehouseUserAuthority(adminClient, caller.userId, caller.isSuperAdmin, warehouseId);
    if (!hasAuthority) {
      return { success: false, error: 'Akses Ditolak: Anda tidak memiliki wewenang manajemen pengguna di gudang target.' };
    }

    // 2. Fetch requested roles
    const { data: requestedRoles, error: rolesErr } = await adminClient
      .from('roles')
      .select('id, name, display_name')
      .in('id', roleIds);

    if (rolesErr || !requestedRoles || requestedRoles.length === 0) {
      return { success: false, error: 'Role yang dipilih tidak valid.' };
    }

    // 3. Warehouse Admin privilege boundary check
    if (!caller.isSuperAdmin) {
      const hasPrivilegedRole = requestedRoles.some((r: any) => r.name === 'admin' || r.name === 'regional_manager');
      if (hasPrivilegedRole) {
        return {
          success: false,
          error: 'Akses Ditolak: Hanya Super Admin yang dapat memberikan hak akses Administrator atau Regional Manager.',
        };
      }
    }

    // 4. Pre-check duplicate employee ID
    if (employeeId) {
      const { data: existingEmp } = await adminClient
        .from('profiles')
        .select('id')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (existingEmp) {
        return { success: false, error: `ID Karyawan "${employeeId}" sudah terdaftar pada pengguna lain.` };
      }
    }

    // 5. Generate secure initial password & deterministic membership IDs
    const initialPassword = generateSecureInitialPassword();
    const onboardingMembershipIds = roleIds.map(() => crypto.randomUUID());

    // 6. Create Supabase Auth identity with trusted must_change_password and onboarding_membership_ids
    const { data: authCreated, error: createAuthErr } = await adminClient.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
      app_metadata: {
        must_change_password: true,
        onboarding_membership_ids: onboardingMembershipIds,
      },
      user_metadata: { full_name: fullName },
    });

    if (createAuthErr || !authCreated?.user) {
      if (createAuthErr?.message?.toLowerCase().includes('already') || createAuthErr?.status === 422) {
        return {
          success: false,
          error: 'USER_EXISTS',
          message: `Pengguna dengan email "${email}" sudah terdaftar. Gunakan menu "Tambahkan Akses Gudang" untuk menugaskan akun yang sudah ada.`,
        };
      }
      return { success: false, error: `Gagal membuat akun Auth: ${createAuthErr?.message || 'Unknown error'}` };
    }

    const newUserId = authCreated.user.id;

    // 7. Provision Profile & User Warehouse Memberships with Rollback Protection
    try {
      // Update profile fields (employee_id, phone)
      const { error: profUpdateErr } = await adminClient
        .from('profiles')
        .update({
          full_name: fullName,
          employee_id: employeeId,
          phone: phone,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', newUserId);

      if (profUpdateErr) {
        throw new Error(`Profile update error: ${profUpdateErr.message}`);
      }

      // Insert warehouse membership rows (initially inactive until mandatory password change completes)
      const membershipRows = roleIds.map((rId, idx) => ({
        id: onboardingMembershipIds[idx],
        user_id: newUserId,
        warehouse_id: warehouseId,
        role_id: rId,
        is_active: false,
        assigned_by: caller.userId,
        assigned_at: new Date().toISOString(),
      }));

      const { error: insertUwErr } = await adminClient.from('user_warehouses').insert(membershipRows);

      if (insertUwErr) {
        throw new Error(`User warehouses insertion error: ${insertUwErr.message}`);
      }
    } catch (compensationErr: any) {
      // 8. Safe compensation rollback for newly created identity
      console.error('[createUserAction] Provisioning failed, executing compensation rollback for:', newUserId, compensationErr);
      await adminClient.auth.admin.deleteUser(newUserId);
      return {
        success: false,
        error: 'Gagal melakukan inisialisasi penugasan pengguna. Pembuatan akun baru dibatalkan sepenuhnya untuk mencegah orphan account.',
      };
    }

    revalidatePath('/users');
    revalidatePath('/profile');

    // Return credentials once for administrator modal display. Never logged to console.
    return {
      success: true,
      user: {
        id: newUserId,
        email,
        fullName,
        employeeId,
      },
      initialPassword,
    };
  } catch (err: any) {
    console.error('[createUserAction] Unexpected error:', err.message);
    return { success: false, error: 'Terjadi kesalahan sistem saat membuat pengguna.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOOKUP EXISTING USER ACTION (PENCARIAN IDENTITAS EKSISTING)
// ─────────────────────────────────────────────────────────────────────────────

export async function lookupExistingUserAction(query: string) {
  try {
    const { caller, adminClient, error: authError } = await getAuthenticatedCaller();
    if (authError || !caller) return { success: false, error: authError };

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return { success: false, error: 'Query pencarian tidak boleh kosong.' };

    // Search by exact email via Auth or profiles
    let targetProfile: any = null;

    if (trimmed.includes('@')) {
      const { data: authList } = await adminClient.auth.admin.listUsers();
      const matchedAuth = authList?.users?.find((u: any) => u.email?.toLowerCase() === trimmed);
      if (matchedAuth) {
        const { data: p } = await adminClient.from('profiles').select('*').eq('id', matchedAuth.id).maybeSingle();
        targetProfile = p ? { ...p, email: matchedAuth.email } : null;
      }
    } else {
      const { data: p } = await adminClient.from('profiles').select('*').eq('employee_id', query.trim()).maybeSingle();
      if (p) {
        const { data: authU } = await adminClient.auth.admin.getUserById(p.id);
        targetProfile = { ...p, email: authU?.user?.email || null };
      }
    }

    if (!targetProfile) {
      return { success: false, found: false, message: 'Pengguna tidak ditemukan.' };
    }

    // Check if account is globally inactive
    const isGloballyInactive = targetProfile.is_active === false;

    // Fetch existing warehouse assignments
    const { data: uws } = await adminClient
      .from('user_warehouses')
      .select('id, warehouse_id, is_active, warehouses(code, name), roles(name, display_name)')
      .eq('user_id', targetProfile.id);

    // Return minimal attribution for Warehouse Admin privacy
    return {
      success: true,
      found: true,
      user: {
        id: targetProfile.id,
        fullName: targetProfile.full_name,
        email: targetProfile.email,
        employeeId: targetProfile.employee_id,
        avatarUrl: targetProfile.avatar_url,
        isSuperAdmin: targetProfile.is_super_admin ?? false,
        isGloballyInactive,
        existingMemberships: uws || [],
      },
    };
  } catch (err: any) {
    console.error('[lookupExistingUserAction] Error:', err.message);
    return { success: false, error: 'Gagal melakukan pencarian pengguna.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ASSIGN / UPDATE WAREHOUSE ACCESS (TAMBAHKAN / KELOLA AKSES GUDANG)
// ─────────────────────────────────────────────────────────────────────────────

export async function assignWarehouseAccessAction(input: AssignWarehouseAccessInput) {
  try {
    const { caller, adminClient, error: authError } = await getAuthenticatedCaller();
    if (authError || !caller) return { success: false, error: authError };

    const { userId, warehouseId, roleIds } = input;

    if (!userId || !warehouseId || roleIds.length === 0) {
      return { success: false, error: 'User ID, Gudang, dan minimal satu Role wajib dipilih.' };
    }

    // 1. Authorize caller on target warehouse
    const hasAuthority = await verifyWarehouseUserAuthority(adminClient, caller.userId, caller.isSuperAdmin, warehouseId);
    if (!hasAuthority) {
      return { success: false, error: 'Akses Ditolak: Anda tidak memiliki wewenang manajemen pengguna di gudang target.' };
    }

    // 2. Self-mutation check
    if (userId === caller.userId) {
      return { success: false, error: 'Akses Ditolak: Anda tidak dapat mengubah peran atau akses gudang Anda sendiri.' };
    }

    // 3. Check target global active status
    const { data: targetProfile } = await adminClient.from('profiles').select('is_active, full_name').eq('id', userId).single();
    if (!targetProfile || targetProfile.is_active === false) {
      return {
        success: false,
        error: 'Akun pengguna sedang dinonaktifkan secara global. Hubungi Super Admin untuk mengaktifkannya kembali.',
      };
    }

    // 4. Privileged Target Inspection
    if (!caller.isSuperAdmin) {
      const { isPrivileged, reason } = await isTargetUserPrivileged(adminClient, userId);
      if (isPrivileged) {
        return {
          success: false,
          error: `Akses Ditolak: Hanya Super Admin yang dapat mengelola penugasan pengguna dengan hak akses ${reason}.`,
        };
      }
    }

    // 5. Fetch requested roles
    const { data: requestedRoles } = await adminClient.from('roles').select('id, name').in('id', roleIds);
    if (!requestedRoles || requestedRoles.length === 0) {
      return { success: false, error: 'Role yang dipilih tidak valid.' };
    }

    // 6. Warehouse Admin role boundary check
    if (!caller.isSuperAdmin) {
      const hasPrivilegedRole = requestedRoles.some((r: any) => r.name === 'admin' || r.name === 'regional_manager');
      if (hasPrivilegedRole) {
        return {
          success: false,
          error: 'Akses Ditolak: Hanya Super Admin yang dapat memberikan hak akses Administrator atau Regional Manager.',
        };
      }
    }

    // 7. Last Warehouse Admin protection
    const isDemotingAdmin = await isLastWarehouseAdmin(adminClient, warehouseId, userId);
    const keepsAdminRole = requestedRoles.some((r: any) => r.name === 'admin');
    if (isDemotingAdmin && !keepsAdminRole) {
      return {
        success: false,
        error: 'Tidak dapat mencabut hak Administrator dari pengguna ini karena merupakan Administrator aktif terakhir pada gudang tersebut.',
      };
    }

    // 8. Multi-role soft sync
    const { data: existingRows } = await adminClient
      .from('user_warehouses')
      .select('id, role_id, is_active')
      .eq('user_id', userId)
      .eq('warehouse_id', warehouseId);

    const existingMap = new Map<string, any>((existingRows || []).map((r: any) => [r.role_id, r]));

    // Activate or insert requested roles
    for (const rId of roleIds) {
      const existing = existingMap.get(rId);
      if (existing) {
        if (!existing.is_active) {
          await adminClient
            .from('user_warehouses')
            .update({ is_active: true, assigned_by: caller.userId, assigned_at: new Date().toISOString() })
            .eq('id', existing.id);
        }
      } else {
        await adminClient.from('user_warehouses').insert({
          user_id: userId,
          warehouse_id: warehouseId,
          role_id: rId,
          is_active: true,
          assigned_by: caller.userId,
          assigned_at: new Date().toISOString(),
        });
      }
    }

    // Deactivate unselected roles
    for (const [rId, row] of existingMap.entries()) {
      if (!roleIds.includes(rId) && (row as any).is_active) {
        await adminClient
          .from('user_warehouses')
          .update({ is_active: false })
          .eq('id', (row as any).id);
      }
    }

    revalidatePath('/users');
    return { success: true };
  } catch (err: any) {
    console.error('[assignWarehouseAccessAction] Error:', err.message);
    return { success: false, error: 'Gagal memperbarui penugasan gudang.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. REVOKE WAREHOUSE ACCESS (CABUT AKSES GUDANG — SOFT ONLY)
// ─────────────────────────────────────────────────────────────────────────────

export async function revokeWarehouseAccessAction(input: RevokeWarehouseAccessInput) {
  try {
    const { caller, adminClient, error: authError } = await getAuthenticatedCaller();
    if (authError || !caller) return { success: false, error: authError };

    const { userId, warehouseId } = input;

    // 1. Authorize caller on target warehouse
    const hasAuthority = await verifyWarehouseUserAuthority(adminClient, caller.userId, caller.isSuperAdmin, warehouseId);
    if (!hasAuthority) {
      return { success: false, error: 'Akses Ditolak: Anda tidak memiliki wewenang manajemen pengguna di gudang target.' };
    }

    // 2. Self-revocation check
    if (userId === caller.userId) {
      return { success: false, error: 'Akses Ditolak: Anda tidak dapat mencabut akses gudang Anda sendiri.' };
    }

    // 3. Privileged Target Inspection
    if (!caller.isSuperAdmin) {
      const { isPrivileged, reason } = await isTargetUserPrivileged(adminClient, userId);
      if (isPrivileged) {
        return {
          success: false,
          error: `Akses Ditolak: Hanya Super Admin yang dapat mencabut akses pengguna dengan hak akses ${reason}.`,
        };
      }
    }

    // 4. Last Warehouse Admin protection
    const isLastAdmin = await isLastWarehouseAdmin(adminClient, warehouseId, userId);
    if (isLastAdmin) {
      return {
        success: false,
        error: 'Tidak dapat mencabut akses pengguna ini karena merupakan Administrator aktif terakhir pada gudang tersebut.',
      };
    }

    // 5. Soft-revocation: set is_active = false for all roles in this warehouse
    const { error: revokeErr } = await adminClient
      .from('user_warehouses')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('warehouse_id', warehouseId);

    if (revokeErr) {
      return { success: false, error: `Gagal mencabut akses gudang: ${revokeErr.message}` };
    }

    revalidatePath('/users');
    return { success: true };
  } catch (err: any) {
    console.error('[revokeWarehouseAccessAction] Error:', err.message);
    return { success: false, error: 'Gagal mencabut akses gudang.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. UPDATE USER PROFILE CONTACT (EDIT PROFIL PENGGUNA)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateUserProfileContactAction(input: UpdateUserProfileInput) {
  try {
    const { caller, adminClient, error: authError } = await getAuthenticatedCaller();
    if (authError || !caller) return { success: false, error: authError };

    const { userId, fullName, employeeId, phone } = input;
    const trimmedName = fullName.trim();
    const trimmedEmpId = employeeId?.trim() || null;
    const trimmedPhone = phone?.trim() || null;

    if (!userId || !trimmedName) {
      return { success: false, error: 'User ID dan Nama Lengkap wajib diisi.' };
    }

    // 1. Privileged Target Inspection for Warehouse Admins
    if (!caller.isSuperAdmin && userId !== caller.userId) {
      const { isPrivileged, reason } = await isTargetUserPrivileged(adminClient, userId);
      if (isPrivileged) {
        return {
          success: false,
          error: `Akses Ditolak: Hanya Super Admin yang dapat mengedit profil pengguna dengan hak akses ${reason}.`,
        };
      }
    }

    // 2. Pre-check employee ID uniqueness
    if (trimmedEmpId) {
      const { data: existingEmp } = await adminClient
        .from('profiles')
        .select('id')
        .eq('employee_id', trimmedEmpId)
        .neq('id', userId)
        .maybeSingle();

      if (existingEmp) {
        return { success: false, error: `ID Karyawan "${trimmedEmpId}" sudah digunakan oleh pengguna lain.` };
      }
    }

    // 3. Update profile
    const { error: updateErr } = await adminClient
      .from('profiles')
      .update({
        full_name: trimmedName,
        employee_id: trimmedEmpId,
        phone: trimmedPhone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateErr) {
      return { success: false, error: `Gagal memperbarui profil: ${updateErr.message}` };
    }

    revalidatePath('/users');
    revalidatePath('/profile');
    return { success: true };
  } catch (err: any) {
    console.error('[updateUserProfileContactAction] Error:', err.message);
    return { success: false, error: 'Gagal memperbarui profil pengguna.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. TOGGLE GLOBAL ACCOUNT ACTIVE (SUPER ADMIN ONLY)
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleGlobalAccountActiveAction(targetUserId: string, isActive: boolean) {
  try {
    const { caller, adminClient, error: authError } = await getAuthenticatedCaller();
    if (authError || !caller) return { success: false, error: authError };

    // 1. Super Admin authority check
    if (!caller.isSuperAdmin) {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengaktifkan atau menonaktifkan akun secara global.' };
    }

    // 2. Self-deactivation check
    if (targetUserId === caller.userId) {
      return { success: false, error: 'Akses Ditolak: Anda tidak dapat menonaktifkan akun Anda sendiri.' };
    }

    // 3. Last Super Admin protection
    if (!isActive) {
      const isLast = await isLastActiveSuperAdmin(adminClient, targetUserId);
      if (isLast) {
        return { success: false, error: 'Tidak dapat menonaktifkan Super Admin aktif terakhir pada sistem.' };
      }
    }

    // 4. Update profiles table
    const { error: profErr } = await adminClient
      .from('profiles')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId);

    if (profErr) {
      return { success: false, error: `Gagal memperbarui status akun: ${profErr.message}` };
    }

    // 5. Update Auth account ban status (do not alter user_warehouses rows)
    const banDuration = isActive ? 'none' : '876000h';
    const { error: authBanErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
      ban_duration: banDuration,
    });

    if (authBanErr) {
      console.warn('[toggleGlobalAccountActiveAction] Auth ban update warning:', authBanErr.message);
    }

    revalidatePath('/users');
    return { success: true };
  } catch (err: any) {
    console.error('[toggleGlobalAccountActiveAction] Error:', err.message);
    return { success: false, error: 'Gagal mengubah status akun pengguna.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. COMPLETE INITIAL PASSWORD CHANGE ACTION (/change-password)
// ─────────────────────────────────────────────────────────────────────────────

export async function completeInitialPasswordChangeAction(input: CompletePasswordChangeInput) {
  try {
    const supabase = await createServerClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData?.user) {
      return { success: false, error: 'Sesi tidak valid. Harap login kembali.' };
    }

    const user = authData.user;
    const mustChangePassword = user.app_metadata?.must_change_password === true;

    if (!mustChangePassword) {
      return { success: true, message: 'Password sudah dalam kondisi valid.' };
    }

    const { newPassword, confirmPassword } = input;

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Password baru minimal harus terdiri dari 8 karakter.' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'Konfirmasi password tidak cocok.' };
    }

    // 1. Update user password
    const { error: passErr } = await supabase.auth.updateUser({ password: newPassword });
    if (passErr) {
      return { success: false, error: `Gagal memperbarui password: ${passErr.message}` };
    }

    const adminClient = createAdminClient();

    // 2. Extract onboarding membership IDs and clear must_change_password in app_metadata FIRST
    const currentAppMetadata = user.app_metadata || {};
    const onboardingMembershipIds: string[] = Array.isArray(currentAppMetadata.onboarding_membership_ids)
      ? currentAppMetadata.onboarding_membership_ids
      : [];

    const updatedAppMetadata = {
      ...currentAppMetadata,
      must_change_password: false,
      password_changed_at: new Date().toISOString(),
    };
    delete (updatedAppMetadata as any).onboarding_membership_ids;

    const { error: metaErr } = await adminClient.auth.admin.updateUserById(user.id, {
      app_metadata: updatedAppMetadata,
    });

    if (metaErr) {
      console.error('[completeInitialPasswordChangeAction] Meta update error:', metaErr.message);
      return {
        success: false,
        error: 'Password berhasil diubah, namun gagal memperbarui status keamanan sesi. Silakan coba lagi.',
      };
    }

    // 3. Activate ONLY the exact onboarding warehouse memberships LAST
    if (onboardingMembershipIds.length > 0) {
      const { error: activateErr } = await adminClient
        .from('user_warehouses')
        .update({ is_active: true })
        .in('id', onboardingMembershipIds);

      if (activateErr) {
        console.error('[completeInitialPasswordChangeAction] Targeted membership activation error:', activateErr.message);
        return {
          success: false,
          error: 'Password berhasil diperbarui, namun terjadi kendala saat mengaktifkan hak akses gudang awal. Hubungi Administrator.',
        };
      }
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('[completeInitialPasswordChangeAction] Unexpected error:', err.message);
    return { success: false, error: 'Terjadi kesalahan sistem saat memperbarui password.' };
  }
}
