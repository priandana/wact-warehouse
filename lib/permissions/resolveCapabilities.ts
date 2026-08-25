// lib/permissions/resolveCapabilities.ts
// Resolves effective capabilities by unioning all active roles
// a user holds in a given warehouse.
// Used for UX (show/hide buttons). NOT the primary security layer.

import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { type Capability } from './capabilities';
import { roleCapabilities } from './roleCapabilities';

export const resolveCapabilities = cache(async function resolveCapabilities(
  userId: string,
  warehouseId: string,
): Promise<Set<Capability>> {
  const supabase = await createServerClient();

  // Check super admin first
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .single();

  if ((profile as { is_super_admin?: boolean } | null)?.is_super_admin) {
    return new Set(Object.values(roleCapabilities.admin));
  }

  // Fetch all active role names for user in this warehouse
  const { data: userRoles } = await supabase
    .from('user_warehouses')
    .select('roles(name)')
    .eq('user_id', userId)
    .eq('warehouse_id', warehouseId)
    .eq('is_active', true);

  if (!userRoles?.length) return new Set();

  // Union capabilities from all roles
  const caps = new Set<Capability>();
  for (const row of (userRoles as Array<{ roles: { name: string } | null }>)) {
    const roleName = row.roles?.name;
    if (roleName && roleCapabilities[roleName]) {
      for (const cap of roleCapabilities[roleName]) {
        caps.add(cap);
      }
    }
  }

  return caps;
});

/**
 * Lightweight check — resolves capabilities then checks for one.
 * For checking multiple capabilities at once, use resolveCapabilities directly.
 */
export async function hasCapability(
  userId: string,
  warehouseId: string,
  capability: Capability,
): Promise<boolean> {
  const caps = await resolveCapabilities(userId, warehouseId);
  return caps.has(capability);
}
