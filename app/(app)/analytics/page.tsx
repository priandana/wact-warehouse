// app/(app)/analytics/page.tsx
// Operational Intelligence Command Center — Server Component with Strict Warehouse Isolation

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';
import { roleCapabilities } from '@/lib/permissions/roleCapabilities';
import { Capability } from '@/lib/permissions/capabilities';
import { AnalyticsCommandCenter } from '@/components/analytics/AnalyticsCommandCenter';

export const metadata: Metadata = {
  title: 'Analitik Operasional',
  description: 'Executive command center monitoring performa kasus, kepatuhan SLA, dan kualitas inspeksi gudang',
};

export const dynamic = 'force-dynamic';

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  };
}

export default async function AnalyticsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Parallel Phase 1: Resolve accessible warehouses (deduplicated by React cache) and cookie
  const [accessibleWarehouses, cookieStore] = await Promise.all([
    getUserWarehouseAccess(user.id),
    cookies(),
  ]);

  if (accessibleWarehouses.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center space-y-2">
        <h1 className="text-xl font-bold text-slate-900">Akses Gudang Tidak Ditemukan</h1>
        <p className="text-xs text-slate-500">Akun Anda belum memiliki akses gudang aktif. Hubungi Koordinator.</p>
      </div>
    );
  }

  // 2. Validate active warehouse from cookie against accessible warehouses
  const activeWarehouseCookie = cookieStore.get('wact_active_warehouse_id')?.value;
  let activeWarehouse = accessibleWarehouses.find((w) => w.warehouseId === activeWarehouseCookie);

  if (!activeWarehouse) {
    const pdlWh = accessibleWarehouses.find(
      (w) => w.warehouseCode === 'WH-PDL' || w.warehouseCode === 'PDL' || w.warehouseName.toLowerCase().includes('padalarang')
    );
    activeWarehouse = pdlWh ?? accessibleWarehouses[0];
  }

  const activeWarehouseId = activeWarehouse.warehouseId;
  const activeWarehouseName = activeWarehouse.warehouseName;
  const activeWarehouseCode = activeWarehouse.warehouseCode;

  // 3. Enforce Server Route Guard: Zero-overhead capability resolution from cached warehouse roles
  const effectiveCaps = new Set<Capability>();
  for (const roleName of activeWarehouse.roles) {
    const caps = roleCapabilities[roleName];
    if (caps) for (const c of caps) effectiveCaps.add(c);
  }

  const canViewAnalytics = effectiveCaps.has(Capability.ANALYTICS_VIEW) && effectiveCaps.has(Capability.CASE_VIEW_ALL);
  if (!canViewAnalytics) {
    redirect('/dashboard');
  }

  // 4. Parallel Phase 2: Query authoritative warehouse cases and inspections with nested results in a single round-trip
  const [casesRes, inspectionsRes] = await Promise.all([
    supabase
      .from('cases')
      .select(`
        id,
        case_number,
        title,
        priority,
        status,
        due_date,
        created_at,
        closed_at,
        has_operational_impact,
        requires_maintenance,
        category:category_id ( id, name ),
        area:area_id ( id, name ),
        location:location_id ( id, name ),
        asset:asset_id ( id, asset_code, name )
      `)
      .eq('warehouse_id', activeWarehouseId)
      .order('created_at', { ascending: false }),
    supabase
      .from('inspections')
      .select(`
        id,
        inspection_number,
        status,
        overall_result,
        completed_at,
        created_at,
        template:template_id ( name ),
        asset:asset_id ( asset_code, name ),
        inspection_results (
          id,
          value
        )
      `)
      .eq('warehouse_id', activeWarehouseId)
      .order('created_at', { ascending: false }),
  ]);

  if (casesRes.error) {
    console.error('Error fetching analytics cases:', casesRes.error);
  }
  if (inspectionsRes.error) {
    console.error('Error fetching analytics inspections:', inspectionsRes.error);
  }

  const rawCases = casesRes.data ?? [];
  const rawInspections = inspectionsRes.data ?? [];

  // Extract flat inspection results from nested query without additional DB calls
  const inspectionResults: any[] = [];
  for (const insp of rawInspections) {
    const results = (insp as any).inspection_results;
    if (Array.isArray(results)) {
      for (const r of results) {
        inspectionResults.push({
          id: r.id,
          inspection_id: insp.id,
          value: r.value,
        });
      }
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-8 min-w-0 max-w-full overflow-x-hidden">
      <AnalyticsCommandCenter
        cases={rawCases as any}
        inspections={rawInspections as any}
        inspectionResults={inspectionResults}
        warehouseName={activeWarehouseName}
        warehouseCode={activeWarehouseCode}
      />
    </div>
  );
}
