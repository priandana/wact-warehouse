// app/(app)/users/page.tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getUserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';
import { cookies } from 'next/headers';
import { Capability } from '@/lib/permissions/capabilities';
import { roleCapabilities } from '@/lib/permissions/roleCapabilities';
import { UsersCommandCenter } from '@/components/users/UsersCommandCenter';
import type { UserItem, UserWarehouseMembership } from '@/components/users/UserCard';

export const metadata: Metadata = { title: 'Manajemen Pengguna' };
export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const supabase = await createServerClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();

  if (authErr || !authData?.user) {
    redirect('/login');
  }

  const userId = authData.user.id;

  // 1. Fetch caller profile
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, full_name, is_super_admin, is_active')
    .eq('id', userId)
    .single();

  if (!profile || profile.is_active === false) {
    redirect('/login?error=account_inactive');
  }

  const isSuperAdmin = profile.is_super_admin ?? false;

  // 2. Fetch accessible warehouses
  const userWarehouses = await getUserWarehouseAccess(userId);
  if (userWarehouses.length === 0 && !isSuperAdmin) {
    redirect('/dashboard');
  }

  // 3. Resolve active warehouse from cookie
  const cookieStore = await cookies();
  const cookieWhId = cookieStore.get('wact_active_warehouse')?.value;
  const activeWh =
    userWarehouses.find((w) => w.warehouseId === cookieWhId) ||
    userWarehouses[0] || {
      warehouseId: '',
      warehouseCode: 'WH',
      warehouseName: 'Gudang',
    };

  // 4. Resolve caller capabilities in active warehouse
  const effectiveCaps = new Set<Capability>();
  for (const roleName of activeWh.roles || []) {
    const caps = roleCapabilities[roleName];
    if (caps) for (const c of caps) effectiveCaps.add(c);
  }

  const hasUserManage = effectiveCaps.has(Capability.USER_MANAGE) || isSuperAdmin;
  if (!hasUserManage) {
    redirect('/dashboard');
  }

  // 5. Prefetch Master Tables & User Directory
  const [
    { data: rawProfiles },
    { data: rawUws },
    { data: rawRoles },
    { data: rawWarehouses },
    { data: authList },
  ] = await Promise.all([
    adminClient.from('profiles').select('*').order('created_at', { ascending: false }),
    adminClient
      .from('user_warehouses')
      .select(`
        id,
        user_id,
        warehouse_id,
        role_id,
        is_active,
        warehouses (id, code, name),
        roles (id, name, display_name)
      `),
    adminClient.from('roles').select('id, name, display_name, description').order('sort_order'),
    adminClient.from('warehouses').select('id, code, name').eq('is_active', true).order('code'),
    adminClient.auth.admin.listUsers(),
  ]);

  const authMap = new Map<string, any>((authList?.users || []).map((u: any) => [u.id, u]));

  // Map memberships by user_id
  const uwsByUserId = new Map<string, UserWarehouseMembership[]>();
  for (const uw of (rawUws as any[]) || []) {
    if (!uwsByUserId.has(uw.user_id)) {
      uwsByUserId.set(uw.user_id, []);
    }
    uwsByUserId.get(uw.user_id)!.push({
      id: uw.id,
      warehouse_id: uw.warehouse_id,
      is_active: uw.is_active,
      warehouses: uw.warehouses,
      roles: uw.roles,
    });
  }

  // Filter profiles according to scope:
  // Super Admin: sees all users
  // Warehouse Admin: sees only users with active/historical membership in active warehouse
  const eligibleProfiles = (rawProfiles || []).filter((p: any) => {
    if (isSuperAdmin) return true;
    const memberships = uwsByUserId.get(p.id) || [];
    return memberships.some((m) => m.warehouse_id === activeWh.warehouseId);
  });

  const formattedUsers: UserItem[] = eligibleProfiles.map((p: any) => {
    const authU = authMap.get(p.id);
    return {
      id: p.id,
      fullName: p.full_name,
      email: authU?.email || 'N/A',
      employeeId: p.employee_id,
      phone: p.phone,
      avatarUrl: p.avatar_url,
      isSuperAdmin: p.is_super_admin ?? false,
      isActive: p.is_active ?? true,
      createdAt: p.created_at,
      memberships: uwsByUserId.get(p.id) || [],
    };
  });

  return (
    <UsersCommandCenter
      users={formattedUsers}
      roles={rawRoles || []}
      warehouses={rawWarehouses || []}
      activeWarehouse={{
        id: activeWh.warehouseId,
        code: activeWh.warehouseCode,
        name: activeWh.warehouseName,
      }}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
