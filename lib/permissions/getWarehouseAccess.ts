// lib/permissions/getWarehouseAccess.ts
// Returns all warehouses accessible to a user, optionally with their role(s).

import { createServerClient } from '@/lib/supabase/server';

export interface UserWarehouseAccess {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseTimezone: string;
  roles: string[];
}

type ProfileRow = { is_super_admin: boolean };
type WarehouseRow = { id: string; code: string; name: string; timezone: string };
type UserWarehouseRow = {
  warehouse_id: string;
  warehouses: WarehouseRow | null;
  roles: { name: string } | null;
};

export async function getUserWarehouseAccess(
  userId: string,
): Promise<UserWarehouseAccess[]> {
  const supabase = await createServerClient();

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .single();

  if ((profile as ProfileRow | null)?.is_super_admin) {
    // Super admin sees all active warehouses
    const { data: warehouses } = await supabase
      .from('warehouses')
      .select('id, code, name, timezone')
      .eq('is_active', true)
      .order('name');

    return ((warehouses ?? []) as WarehouseRow[]).map((w) => ({
      warehouseId: w.id,
      warehouseCode: w.code,
      warehouseName: w.name,
      warehouseTimezone: w.timezone,
      roles: ['admin'],
    }));
  }

  // Regular users — get from user_warehouses
  const { data: rows } = await supabase
    .from('user_warehouses')
    .select(`
      warehouse_id,
      warehouses (id, code, name, timezone),
      roles (name)
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!rows?.length) return [];

  // Group by warehouse
  const map = new Map<string, UserWarehouseAccess>();
  for (const row of (rows as UserWarehouseRow[])) {
    const wh = row.warehouses;
    const role = row.roles;
    if (!wh) continue;

    if (!map.has(wh.id)) {
      map.set(wh.id, {
        warehouseId: wh.id,
        warehouseCode: wh.code,
        warehouseName: wh.name,
        warehouseTimezone: wh.timezone,
        roles: [],
      });
    }
    if (role?.name) {
      map.get(wh.id)!.roles.push(role.name);
    }
  }

  return Array.from(map.values());
}
