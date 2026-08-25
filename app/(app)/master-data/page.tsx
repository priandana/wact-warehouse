// app/(app)/master-data/page.tsx
// Server Component for Master Data Command Center (Phase UI-8A).
// Enforces route guard (Super Admin or MASTER_DATA_MANAGE on active warehouse),
// prefetches all master data datasets, and passes them to MasterDataCommandCenter.

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { getUserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';
import { roleCapabilities } from '@/lib/permissions/roleCapabilities';
import { Capability } from '@/lib/permissions/capabilities';
import { MasterDataCommandCenter } from '@/components/master-data/MasterDataCommandCenter';
import type { SlaConfigRecord } from '@/components/master-data/SlaConfigTab';

export const metadata: Metadata = {
  title: 'Pengaturan Master Data — WACT V2',
  description: 'Pusat pengelolaan master data, area gudang, taksonomi, dan konfigurasi SLA',
};

export const dynamic = 'force-dynamic';

export default async function MasterDataPage() {
  const supabase = await createServerClient();

  // 1. Authenticate user session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Resolve accessible warehouses and profile
  const [accessibleWarehouses, cookieStore, profileRes] = await Promise.all([
    getUserWarehouseAccess(user.id),
    cookies(),
    supabase.from('profiles').select('is_super_admin').eq('id', user.id).single(),
  ]);

  const isSuperAdmin = profileRes.data?.is_super_admin ?? false;

  if (!isSuperAdmin && accessibleWarehouses.length === 0) {
    redirect('/dashboard');
  }

  // 3. Resolve active warehouse from cookie
  const activeWarehouseCookie = cookieStore.get('wact_active_warehouse_id')?.value;
  let activeWarehouse = accessibleWarehouses.find((w) => w.warehouseId === activeWarehouseCookie);

  if (!activeWarehouse) {
    const pdlWh = accessibleWarehouses.find(
      (w) => w.warehouseCode === 'WH-PDL' || w.warehouseCode === 'PDL' || w.warehouseName.toLowerCase().includes('padalarang')
    );
    activeWarehouse = pdlWh ?? accessibleWarehouses[0];
  }

  // 4. Resolve capabilities on active warehouse
  const effectiveCaps = new Set<Capability>();
  if (activeWarehouse) {
    for (const roleName of activeWarehouse.roles) {
      const caps = roleCapabilities[roleName];
      if (caps) for (const c of caps) effectiveCaps.add(c);
    }
  }

  const canManageWarehouseMaster = isSuperAdmin || effectiveCaps.has(Capability.MASTER_DATA_MANAGE);

  // 5. Enforce Server Route Guard
  if (!isSuperAdmin && !canManageWarehouseMaster) {
    redirect('/dashboard');
  }

  // 6. Prefetch all master data entities in parallel
  const [
    { data: areasData },
    { data: locationsData },
    { data: caseCategoriesData },
    { data: caseSubcategoriesData },
    { data: rootCausesData },
    { data: assetCategoriesData },
    { data: slaConfigurationsData },
  ] = await Promise.all([
    supabase
      .from('areas')
      .select('*')
      .order('code', { ascending: true }),

    supabase
      .from('locations')
      .select('*')
      .order('code', { ascending: true }),

    supabase
      .from('case_categories')
      .select('*')
      .order('sort_order', { ascending: true }),

    supabase
      .from('case_subcategories')
      .select('*')
      .order('sort_order', { ascending: true }),

    supabase
      .from('root_causes')
      .select('*')
      .order('sort_order', { ascending: true }),

    supabase
      .from('asset_categories')
      .select('*')
      .order('sort_order', { ascending: true }),

    supabase
      .from('sla_configurations')
      .select('*')
      .order('created_at', { ascending: true }),
  ]);

  return (
    <MasterDataCommandCenter
      initialAreas={areasData || []}
      initialLocations={locationsData || []}
      initialCaseCategories={caseCategoriesData || []}
      initialCaseSubcategories={caseSubcategoriesData || []}
      initialRootCauses={rootCausesData || []}
      initialAssetCategories={assetCategoriesData || []}
      initialSlaConfigurations={(slaConfigurationsData as unknown as SlaConfigRecord[]) || []}
      isSuperAdmin={isSuperAdmin}
      canManageWarehouseMaster={canManageWarehouseMaster}
    />
  );
}
