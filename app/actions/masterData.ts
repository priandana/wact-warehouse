'use server';

// app/actions/masterData.ts
// Authoritative Server Actions for Master Data Management (Phase UI-8A)
// Enforces multi-tier authorization:
// - Warehouse entities (Areas, Locations, Warehouse SLA Overrides): Target warehouse authorization (MASTER_DATA_MANAGE) or Super Admin
// - Global entities (Case Categories, Subcategories, Root Causes, Asset Categories, Global SLA): Super Admin Only
// Performs server-side re-verification, input sanitization, and duplicate checking before mutation via createAdminClient().

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Capability } from '@/lib/permissions/capabilities';

export type ServerActionResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH & PERMISSION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function verifyAuthAndSuperAdmin() {
  const supabase = await createClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    return { error: 'Unauthorized: Harap login terlebih dahulu.' };
  }

  const userId = authData.user.id;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .single();

  const isSuperAdmin = profile?.is_super_admin ?? false;
  return { userId, isSuperAdmin, supabase };
}

async function verifyWarehouseAuthority(targetWarehouseId: string) {
  const auth = await verifyAuthAndSuperAdmin();
  if ('error' in auth) return auth;

  if (auth.isSuperAdmin) {
    return { userId: auth.userId, isSuperAdmin: true, hasAccess: true };
  }

  // Check user_warehouses for active assignment and role capability
  const { data: uw } = await auth.supabase
    .from('user_warehouses')
    .select('roles(id, name, role_capabilities(capability))')
    .eq('user_id', auth.userId)
    .eq('warehouse_id', targetWarehouseId)
    .eq('is_active', true)
    .maybeSingle();

  if (!uw) {
    return { error: 'Akses Ditolak: Anda tidak memiliki akses ke gudang target.' };
  }

  const role = (uw as any)?.roles;
  const capabilities: string[] = (role?.role_capabilities || []).map((rc: any) => rc.capability);
  const canManage = capabilities.includes(Capability.MASTER_DATA_MANAGE) || role?.name === 'admin';

  if (!canManage) {
    return { error: 'Akses Ditolak: Anda tidak memiliki izin Master Data pada gudang target.' };
  }

  return { userId: auth.userId, isSuperAdmin: false, hasAccess: true };
}

function sanitizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '_');
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AREAS ACTIONS (WAREHOUSE-SCOPED)
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateAreaInput {
  warehouseId: string;
  code: string;
  name: string;
  description?: string;
}

export async function createAreaAction(input: CreateAreaInput): Promise<ServerActionResult> {
  try {
    const auth = await verifyWarehouseAuthority(input.warehouseId);
    if ('error' in auth) return { success: false, error: auth.error };

    const sanitizedCode = sanitizeCode(input.code);
    const trimmedName = input.name.trim();

    if (!sanitizedCode || !/^[A-Z0-9_]+$/.test(sanitizedCode)) {
      return { success: false, error: 'Kode Area harus berupa huruf kapital, angka, atau underscore (A-Z, 0-9, _).' };
    }
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Nama Area minimal 2 karakter.' };
    }

    const adminClient = createAdminClient();

    // Check duplicate code in this warehouse
    const { data: existing } = await adminClient
      .from('areas')
      .select('id')
      .eq('warehouse_id', input.warehouseId)
      .eq('code', sanitizedCode)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Kode Area "${sanitizedCode}" sudah terdaftar pada gudang ini.` };
    }

    const { data, error } = await adminClient
      .from('areas')
      .insert({
        warehouse_id: input.warehouseId,
        code: sanitizedCode,
        name: trimmedName,
        description: input.description?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/cases/new');
    revalidatePath('/assets');
    return { success: true, data };
  } catch (err: any) {
    console.error('[createAreaAction]', err);
    return { success: false, error: err?.message || 'Gagal membuat area baru.' };
  }
}

export interface UpdateAreaInput {
  id: string;
  name: string;
  description?: string;
}

export async function updateAreaAction(input: UpdateAreaInput): Promise<ServerActionResult> {
  try {
    const adminClient = createAdminClient();

    // Re-fetch existing area to verify warehouse ownership
    const { data: area, error: fetchErr } = await adminClient
      .from('areas')
      .select('id, warehouse_id')
      .eq('id', input.id)
      .single();

    if (fetchErr || !area) {
      return { success: false, error: 'Area tidak ditemukan.' };
    }

    const auth = await verifyWarehouseAuthority(area.warehouse_id);
    if ('error' in auth) return { success: false, error: auth.error };

    const trimmedName = input.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Nama Area minimal 2 karakter.' };
    }

    const { data, error } = await adminClient
      .from('areas')
      .update({
        name: trimmedName,
        description: input.description?.trim() || null,
      })
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/cases/new');
    revalidatePath('/assets');
    return { success: true, data };
  } catch (err: any) {
    console.error('[updateAreaAction]', err);
    return { success: false, error: err?.message || 'Gagal memperbarui area.' };
  }
}

export async function toggleAreaActiveAction(id: string, isActive: boolean): Promise<ServerActionResult> {
  try {
    const adminClient = createAdminClient();

    const { data: area, error: fetchErr } = await adminClient
      .from('areas')
      .select('id, warehouse_id, name')
      .eq('id', id)
      .single();

    if (fetchErr || !area) {
      return { success: false, error: 'Area tidak ditemukan.' };
    }

    const auth = await verifyWarehouseAuthority(area.warehouse_id);
    if ('error' in auth) return { success: false, error: auth.error };

    const { error } = await adminClient
      .from('areas')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/cases/new');
    revalidatePath('/assets');
    return { success: true };
  } catch (err: any) {
    console.error('[toggleAreaActiveAction]', err);
    return { success: false, error: err?.message || 'Gagal mengubah status area.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOCATIONS ACTIONS (WAREHOUSE-SCOPED)
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateLocationInput {
  warehouseId: string;
  areaId: string;
  code: string;
  name: string;
  description?: string;
}

export async function createLocationAction(input: CreateLocationInput): Promise<ServerActionResult> {
  try {
    const auth = await verifyWarehouseAuthority(input.warehouseId);
    if ('error' in auth) return { success: false, error: auth.error };

    const adminClient = createAdminClient();

    // Re-verify parent area belongs to this exact warehouse
    const { data: parentArea, error: areaErr } = await adminClient
      .from('areas')
      .select('id, warehouse_id')
      .eq('id', input.areaId)
      .single();

    if (areaErr || !parentArea || parentArea.warehouse_id !== input.warehouseId) {
      return { success: false, error: 'Area yang dipilih tidak valid untuk gudang ini.' };
    }

    const sanitizedCode = sanitizeCode(input.code);
    const trimmedName = input.name.trim();

    if (!sanitizedCode || !/^[A-Z0-9_]+$/.test(sanitizedCode)) {
      return { success: false, error: 'Kode Lokasi harus berupa huruf kapital, angka, atau underscore.' };
    }
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Nama Lokasi minimal 2 karakter.' };
    }

    // Check duplicate code in this area
    const { data: existing } = await adminClient
      .from('locations')
      .select('id')
      .eq('area_id', input.areaId)
      .eq('code', sanitizedCode)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Kode Lokasi "${sanitizedCode}" sudah ada di area ini.` };
    }

    const { data, error } = await adminClient
      .from('locations')
      .insert({
        warehouse_id: input.warehouseId,
        area_id: input.areaId,
        code: sanitizedCode,
        name: trimmedName,
        description: input.description?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/cases/new');
    revalidatePath('/assets');
    return { success: true, data };
  } catch (err: any) {
    console.error('[createLocationAction]', err);
    return { success: false, error: err?.message || 'Gagal membuat lokasi baru.' };
  }
}

export interface UpdateLocationInput {
  id: string;
  name: string;
  description?: string;
}

export async function updateLocationAction(input: UpdateLocationInput): Promise<ServerActionResult> {
  try {
    const adminClient = createAdminClient();

    const { data: loc, error: fetchErr } = await adminClient
      .from('locations')
      .select('id, warehouse_id')
      .eq('id', input.id)
      .single();

    if (fetchErr || !loc) {
      return { success: false, error: 'Lokasi tidak ditemukan.' };
    }

    const auth = await verifyWarehouseAuthority(loc.warehouse_id);
    if ('error' in auth) return { success: false, error: auth.error };

    const trimmedName = input.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Nama Lokasi minimal 2 karakter.' };
    }

    const { data, error } = await adminClient
      .from('locations')
      .update({
        name: trimmedName,
        description: input.description?.trim() || null,
      })
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/cases/new');
    revalidatePath('/assets');
    return { success: true, data };
  } catch (err: any) {
    console.error('[updateLocationAction]', err);
    return { success: false, error: err?.message || 'Gagal memperbarui lokasi.' };
  }
}

export async function toggleLocationActiveAction(id: string, isActive: boolean): Promise<ServerActionResult> {
  try {
    const adminClient = createAdminClient();

    const { data: loc, error: fetchErr } = await adminClient
      .from('locations')
      .select('id, warehouse_id')
      .eq('id', id)
      .single();

    if (fetchErr || !loc) {
      return { success: false, error: 'Lokasi tidak ditemukan.' };
    }

    const auth = await verifyWarehouseAuthority(loc.warehouse_id);
    if ('error' in auth) return { success: false, error: auth.error };

    const { error } = await adminClient
      .from('locations')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/cases/new');
    revalidatePath('/assets');
    return { success: true };
  } catch (err: any) {
    console.error('[toggleLocationActiveAction]', err);
    return { success: false, error: err?.message || 'Gagal mengubah status lokasi.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CASE CATEGORIES ACTIONS (GLOBAL — SUPER ADMIN ONLY)
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateCaseCategoryInput {
  name: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export async function createCaseCategoryAction(input: CreateCaseCategoryInput): Promise<ServerActionResult> {
  try {
    const auth = await verifyAuthAndSuperAdmin();
    if ('error' in auth) return { success: false, error: auth.error };
    if (!auth.isSuperAdmin) {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengelola Kategori Kasus global.' };
    }

    const trimmedName = input.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Nama Kategori minimal 2 karakter.' };
    }

    const adminClient = createAdminClient();

    // Case-insensitive name uniqueness check
    const { data: existing } = await adminClient
      .from('case_categories')
      .select('id')
      .ilike('name', trimmedName)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Nama kategori "${trimmedName}" sudah digunakan.` };
    }

    const { data, error } = await adminClient
      .from('case_categories')
      .insert({
        name: trimmedName,
        icon: input.icon?.trim() || null,
        color: input.color?.trim() || null,
        sort_order: input.sortOrder ?? 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/cases/new');
    return { success: true, data };
  } catch (err: any) {
    console.error('[createCaseCategoryAction]', err);
    return { success: false, error: err?.message || 'Gagal membuat kategori kasus.' };
  }
}

export interface UpdateCaseCategoryInput {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export async function updateCaseCategoryAction(input: UpdateCaseCategoryInput): Promise<ServerActionResult> {
  try {
    const auth = await verifyAuthAndSuperAdmin();
    if ('error' in auth) return { success: false, error: auth.error };
    if (!auth.isSuperAdmin) {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengelola Kategori Kasus global.' };
    }

    const trimmedName = input.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Nama Kategori minimal 2 karakter.' };
    }

    const adminClient = createAdminClient();

    // Check duplicate name excluding current record
    const { data: existing } = await adminClient
      .from('case_categories')
      .select('id')
      .ilike('name', trimmedName)
      .neq('id', input.id)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Nama kategori "${trimmedName}" sudah digunakan.` };
    }

    const { data, error } = await adminClient
      .from('case_categories')
      .update({
        name: trimmedName,
        icon: input.icon?.trim() || null,
        color: input.color?.trim() || null,
        sort_order: input.sortOrder ?? 0,
      })
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/cases/new');
    return { success: true, data };
  } catch (err: any) {
    console.error('[updateCaseCategoryAction]', err);
    return { success: false, error: err?.message || 'Gagal memperbarui kategori kasus.' };
  }
}

export async function toggleCaseCategoryActiveAction(id: string, isActive: boolean): Promise<ServerActionResult> {
  try {
    const auth = await verifyAuthAndSuperAdmin();
    if ('error' in auth) return { success: false, error: auth.error };
    if (!auth.isSuperAdmin) {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengubah status Kategori Kasus global.' };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('case_categories')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/cases/new');
    return { success: true };
  } catch (err: any) {
    console.error('[toggleCaseCategoryActiveAction]', err);
    return { success: false, error: err?.message || 'Gagal mengubah status kategori kasus.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CASE SUBCATEGORIES ACTIONS (GLOBAL — SUPER ADMIN ONLY)
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateCaseSubcategoryInput {
  categoryId: string;
  name: string;
  sortOrder?: number;
}

export async function createCaseSubcategoryAction(input: CreateCaseSubcategoryInput): Promise<ServerActionResult> {
  try {
    const auth = await verifyAuthAndSuperAdmin();
    if ('error' in auth) return { success: false, error: auth.error };
    if (!auth.isSuperAdmin) {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengelola Subkategori Kasus global.' };
    }

    const trimmedName = input.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Nama Subkategori minimal 2 karakter.' };
    }

    const adminClient = createAdminClient();

    // Verify parent category exists
    const { data: parentCat } = await adminClient
      .from('case_categories')
      .select('id')
      .eq('id', input.categoryId)
      .single();

    if (!parentCat) {
      return { success: false, error: 'Kategori utama tidak ditemukan.' };
    }

    // Check duplicate in same category
    const { data: existing } = await adminClient
      .from('case_subcategories')
      .select('id')
      .eq('category_id', input.categoryId)
      .ilike('name', trimmedName)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Nama subkategori "${trimmedName}" sudah ada pada kategori ini.` };
    }

    const { data, error } = await adminClient
      .from('case_subcategories')
      .insert({
        category_id: input.categoryId,
        name: trimmedName,
        sort_order: input.sortOrder ?? 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/cases/new');
    return { success: true, data };
  } catch (err: any) {
    console.error('[createCaseSubcategoryAction]', err);
    return { success: false, error: err?.message || 'Gagal membuat subkategori kasus.' };
  }
}

export interface UpdateCaseSubcategoryInput {
  id: string;
  name: string;
  sortOrder?: number;
}

export async function updateCaseSubcategoryAction(input: UpdateCaseSubcategoryInput): Promise<ServerActionResult> {
  try {
    const auth = await verifyAuthAndSuperAdmin();
    if ('error' in auth) return { success: false, error: auth.error };
    if (!auth.isSuperAdmin) {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengelola Subkategori Kasus global.' };
    }

    const trimmedName = input.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Nama Subkategori minimal 2 karakter.' };
    }

    const adminClient = createAdminClient();

    // Re-fetch existing subcategory to get parent category
    const { data: subcat, error: fetchErr } = await adminClient
      .from('case_subcategories')
      .select('id, category_id')
      .eq('id', input.id)
      .single();

    if (fetchErr || !subcat) {
      return { success: false, error: 'Subkategori tidak ditemukan.' };
    }

    // Check duplicate in same category
    const { data: existing } = await adminClient
      .from('case_subcategories')
      .select('id')
      .eq('category_id', subcat.category_id)
      .ilike('name', trimmedName)
      .neq('id', input.id)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Nama subkategori "${trimmedName}" sudah ada pada kategori ini.` };
    }

    const { data, error } = await adminClient
      .from('case_subcategories')
      .update({
        name: trimmedName,
        sort_order: input.sortOrder ?? 0,
      })
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/cases/new');
    return { success: true, data };
  } catch (err: any) {
    console.error('[updateCaseSubcategoryAction]', err);
    return { success: false, error: err?.message || 'Gagal memperbarui subkategori kasus.' };
  }
}

export async function toggleCaseSubcategoryActiveAction(id: string, isActive: boolean): Promise<ServerActionResult> {
  try {
    const auth = await verifyAuthAndSuperAdmin();
    if ('error' in auth) return { success: false, error: auth.error };
    if (!auth.isSuperAdmin) {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengubah status Subkategori Kasus global.' };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('case_subcategories')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/cases/new');
    return { success: true };
  } catch (err: any) {
    console.error('[toggleCaseSubcategoryActiveAction]', err);
    return { success: false, error: err?.message || 'Gagal mengubah status subkategori.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ROOT CAUSES ACTIONS (GLOBAL — SUPER ADMIN ONLY)
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateRootCauseInput {
  name: string;
  description?: string;
  sortOrder?: number;
}

export async function createRootCauseAction(input: CreateRootCauseInput): Promise<ServerActionResult> {
  try {
    const auth = await verifyAuthAndSuperAdmin();
    if ('error' in auth) return { success: false, error: auth.error };
    if (!auth.isSuperAdmin) {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengelola Root Cause global.' };
    }

    const trimmedName = input.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Nama Root Cause minimal 2 karakter.' };
    }

    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from('root_causes')
      .select('id')
      .ilike('name', trimmedName)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Nama Root Cause "${trimmedName}" sudah digunakan.` };
    }

    const { data, error } = await adminClient
      .from('root_causes')
      .insert({
        name: trimmedName,
        description: input.description?.trim() || null,
        sort_order: input.sortOrder ?? 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/master-data');
    return { success: true, data };
  } catch (err: any) {
    console.error('[createRootCauseAction]', err);
    return { success: false, error: err?.message || 'Gagal membuat root cause.' };
  }
}

export interface UpdateRootCauseInput {
  id: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

export async function updateRootCauseAction(input: UpdateRootCauseInput): Promise<ServerActionResult> {
  try {
    const auth = await verifyAuthAndSuperAdmin();
    if ('error' in auth) return { success: false, error: auth.error };
    if (!auth.isSuperAdmin) {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengelola Root Cause global.' };
    }

    const trimmedName = input.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Nama Root Cause minimal 2 karakter.' };
    }

    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from('root_causes')
      .select('id')
      .ilike('name', trimmedName)
      .neq('id', input.id)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Nama Root Cause "${trimmedName}" sudah digunakan.` };
    }

    const { data, error } = await adminClient
      .from('root_causes')
      .update({
        name: trimmedName,
        description: input.description?.trim() || null,
        sort_order: input.sortOrder ?? 0,
      })
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/master-data');
    return { success: true, data };
  } catch (err: any) {
    console.error('[updateRootCauseAction]', err);
    return { success: false, error: err?.message || 'Gagal memperbarui root cause.' };
  }
}

export async function toggleRootCauseActiveAction(id: string, isActive: boolean): Promise<ServerActionResult> {
  try {
    const auth = await verifyAuthAndSuperAdmin();
    if ('error' in auth) return { success: false, error: auth.error };
    if (!auth.isSuperAdmin) {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengubah status Root Cause global.' };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('root_causes')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/master-data');
    return { success: true };
  } catch (err: any) {
    console.error('[toggleRootCauseActiveAction]', err);
    return { success: false, error: err?.message || 'Gagal mengubah status root cause.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ASSET CATEGORIES ACTIONS (GLOBAL — SUPER ADMIN ONLY)
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateAssetCategoryInput {
  name: string;
  icon?: string;
  sortOrder?: number;
}

export async function createAssetCategoryAction(input: CreateAssetCategoryInput): Promise<ServerActionResult> {
  try {
    const auth = await verifyAuthAndSuperAdmin();
    if ('error' in auth) return { success: false, error: auth.error };
    if (!auth.isSuperAdmin) {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengelola Kategori Aset global.' };
    }

    const trimmedName = input.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Nama Kategori Aset minimal 2 karakter.' };
    }

    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from('asset_categories')
      .select('id')
      .ilike('name', trimmedName)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Nama Kategori Aset "${trimmedName}" sudah digunakan.` };
    }

    const { data, error } = await adminClient
      .from('asset_categories')
      .insert({
        name: trimmedName,
        icon: input.icon?.trim() || null,
        sort_order: input.sortOrder ?? 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/assets');
    return { success: true, data };
  } catch (err: any) {
    console.error('[createAssetCategoryAction]', err);
    return { success: false, error: err?.message || 'Gagal membuat kategori aset.' };
  }
}

export interface UpdateAssetCategoryInput {
  id: string;
  name: string;
  icon?: string;
  sortOrder?: number;
}

export async function updateAssetCategoryAction(input: UpdateAssetCategoryInput): Promise<ServerActionResult> {
  try {
    const auth = await verifyAuthAndSuperAdmin();
    if ('error' in auth) return { success: false, error: auth.error };
    if (!auth.isSuperAdmin) {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengelola Kategori Aset global.' };
    }

    const trimmedName = input.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Nama Kategori Aset minimal 2 karakter.' };
    }

    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from('asset_categories')
      .select('id')
      .ilike('name', trimmedName)
      .neq('id', input.id)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Nama Kategori Aset "${trimmedName}" sudah digunakan.` };
    }

    const { data, error } = await adminClient
      .from('asset_categories')
      .update({
        name: trimmedName,
        icon: input.icon?.trim() || null,
        sort_order: input.sortOrder ?? 0,
      })
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/assets');
    return { success: true, data };
  } catch (err: any) {
    console.error('[updateAssetCategoryAction]', err);
    return { success: false, error: err?.message || 'Gagal memperbarui kategori aset.' };
  }
}

export async function toggleAssetCategoryActiveAction(id: string, isActive: boolean): Promise<ServerActionResult> {
  try {
    const auth = await verifyAuthAndSuperAdmin();
    if ('error' in auth) return { success: false, error: auth.error };
    if (!auth.isSuperAdmin) {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengubah status Kategori Aset global.' };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('asset_categories')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/master-data');
    revalidatePath('/assets');
    return { success: true };
  } catch (err: any) {
    console.error('[toggleAssetCategoryActiveAction]', err);
    return { success: false, error: err?.message || 'Gagal mengubah status kategori aset.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. SLA CONFIGURATIONS ACTIONS (GLOBAL DEFAULTS & WAREHOUSE OVERRIDES)
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateGlobalSlaInput {
  id: string;
  durationHours: number;
}

export async function updateGlobalSlaAction(input: UpdateGlobalSlaInput): Promise<ServerActionResult> {
  try {
    const auth = await verifyAuthAndSuperAdmin();
    if ('error' in auth) return { success: false, error: auth.error };
    if (!auth.isSuperAdmin) {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengedit SLA Default Global.' };
    }

    if (!input.durationHours || input.durationHours <= 0) {
      return { success: false, error: 'Durasi SLA harus lebih besar dari 0 jam.' };
    }

    const adminClient = createAdminClient();

    // Verify target is indeed a global record (warehouse_id IS NULL)
    const { data: existing, error: fetchErr } = await adminClient
      .from('sla_configurations')
      .select('id, warehouse_id')
      .eq('id', input.id)
      .single();

    if (fetchErr || !existing || existing.warehouse_id !== null) {
      return { success: false, error: 'Konfigurasi SLA Global tidak valid.' };
    }

    const { data, error } = await adminClient
      .from('sla_configurations')
      .update({
        duration_hours: input.durationHours,
        updated_by: auth.userId,
      })
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/master-data');
    return { success: true, data };
  } catch (err: any) {
    console.error('[updateGlobalSlaAction]', err);
    return { success: false, error: err?.message || 'Gagal memperbarui SLA Global.' };
  }
}

export interface UpsertWarehouseSlaOverrideInput {
  warehouseId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  durationHours: number;
  isActive?: boolean;
}

export async function upsertWarehouseSlaOverrideAction(input: UpsertWarehouseSlaOverrideInput): Promise<ServerActionResult> {
  try {
    const auth = await verifyWarehouseAuthority(input.warehouseId);
    if ('error' in auth) return { success: false, error: auth.error };

    if (!input.durationHours || input.durationHours <= 0) {
      return { success: false, error: 'Durasi SLA Override harus lebih besar dari 0 jam.' };
    }

    const adminClient = createAdminClient();

    // Check if an override already exists for this warehouse and priority
    const { data: existing } = await adminClient
      .from('sla_configurations')
      .select('id')
      .eq('warehouse_id', input.warehouseId)
      .eq('priority', input.priority)
      .maybeSingle();

    let result;
    if (existing) {
      result = await adminClient
        .from('sla_configurations')
        .update({
          duration_hours: input.durationHours,
          is_active: input.isActive ?? true,
          updated_by: auth.userId,
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await adminClient
        .from('sla_configurations')
        .insert({
          warehouse_id: input.warehouseId,
          priority: input.priority,
          duration_hours: input.durationHours,
          is_active: input.isActive ?? true,
          created_by: auth.userId,
          updated_by: auth.userId,
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    revalidatePath('/master-data');
    return { success: true, data: result.data };
  } catch (err: any) {
    console.error('[upsertWarehouseSlaOverrideAction]', err);
    return { success: false, error: err?.message || 'Gagal menyimpan override SLA gudang.' };
  }
}

export async function toggleSlaActiveAction(id: string, isActive: boolean): Promise<ServerActionResult> {
  try {
    const adminClient = createAdminClient();

    const { data: sla, error: fetchErr } = await adminClient
      .from('sla_configurations')
      .select('id, warehouse_id')
      .eq('id', id)
      .single();

    if (fetchErr || !sla) {
      return { success: false, error: 'Konfigurasi SLA tidak ditemukan.' };
    }

    if (sla.warehouse_id === null) {
      // Global SLA toggle requires Super Admin
      const auth = await verifyAuthAndSuperAdmin();
      if ('error' in auth) return { success: false, error: auth.error };
      if (!auth.isSuperAdmin) {
        return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengubah status SLA Global.' };
      }
    } else {
      // Warehouse SLA toggle requires warehouse authority
      const auth = await verifyWarehouseAuthority(sla.warehouse_id);
      if ('error' in auth) return { success: false, error: auth.error };
    }

    const { error } = await adminClient
      .from('sla_configurations')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/master-data');
    return { success: true };
  } catch (err: any) {
    console.error('[toggleSlaActiveAction]', err);
    return { success: false, error: err?.message || 'Gagal mengubah status konfigurasi SLA.' };
  }
}
