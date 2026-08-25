// app/(app)/reports/page.tsx
// Operational Reporting Workspace — Server Component with Strict Warehouse Isolation

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';
import { roleCapabilities } from '@/lib/permissions/roleCapabilities';
import { Capability } from '@/lib/permissions/capabilities';
import { ReportsWorkspace } from '@/components/reports/ReportsWorkspace';

export const metadata: Metadata = {
  title: 'Laporan Operasional',
  description: 'Pusat pembuatan dan ekspor rekapitulasi data operasional, audit, dan maintenance',
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

export default async function ReportsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Parallel Phase 1: Resolve accessible warehouses (deduplicated by React cache) and cookies
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

  const canExportReports = effectiveCaps.has(Capability.REPORT_EXPORT) && effectiveCaps.has(Capability.CASE_VIEW_ALL);
  if (!canExportReports) {
    redirect('/dashboard');
  }

  // 4. Parallel Phase 2: Fetch cases, inspections (with nested results), and profile_directory in a single round-trip
  const [casesRes, inspectionsRes, directoryRes] = await Promise.all([
    supabase
      .from('cases')
      .select(`
        id,
        case_number,
        title,
        description,
        priority,
        status,
        due_date,
        created_at,
        closed_at,
        reporter_id,
        has_operational_impact,
        requires_maintenance,
        category:category_id ( id, name ),
        area:area_id ( id, name ),
        location:location_id ( id, name ),
        assets:asset_id ( id, asset_code, name ),
        case_assignments (
          is_current,
          assignee_id
        )
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
        started_at,
        completed_at,
        created_at,
        inspector_id,
        template:template_id ( name ),
        asset:asset_id ( asset_code, name ),
        inspection_results (
          id,
          value,
          notes
        )
      `)
      .eq('warehouse_id', activeWarehouseId)
      .order('created_at', { ascending: false }),
    supabase
      .from('profile_directory')
      .select('id, full_name'),
  ]);

  if (casesRes.error) {
    console.error('Error fetching reports cases:', casesRes.error);
  }
  if (inspectionsRes.error) {
    console.error('Error fetching reports inspections:', inspectionsRes.error);
  }
  if (directoryRes.error) {
    console.error('Error fetching profile directory for reports:', directoryRes.error);
  }

  const profileMap = new Map<string, string>((directoryRes.data ?? []).map((u: any) => [u.id, u.full_name]));
  const rawCases = casesRes.data ?? [];
  const rawInspections = inspectionsRes.data ?? [];

  // Normalize case assignments and reporters with authoritative profile_directory names
  const normalizedCases = rawCases.map((c: any) => {
    const reporterName = c.reporter_id ? profileMap.get(c.reporter_id) || 'Staff' : 'Staff';
    const assignments = Array.isArray(c.case_assignments)
      ? c.case_assignments.map((a: any) => ({
          is_current: a.is_current,
          assignee: a.assignee_id ? { full_name: profileMap.get(a.assignee_id) || 'Teknisi PIC' } : null,
        }))
      : [];

    return {
      ...c,
      reporter: { full_name: reporterName },
      case_assignments: assignments,
    };
  });

  // Extract flat inspection results and normalize inspector names
  const inspectionResults: any[] = [];
  const normalizedInspections = rawInspections.map((insp: any) => {
    const inspectorName = insp.inspector_id ? profileMap.get(insp.inspector_id) || 'Staff' : 'Staff';
    const results = (insp as any).inspection_results;
    if (Array.isArray(results)) {
      for (const r of results) {
        inspectionResults.push({
          id: r.id,
          inspection_id: insp.id,
          value: r.value,
          notes: r.notes,
        });
      }
    }

    return {
      ...insp,
      inspector: { full_name: inspectorName },
    };
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-8 min-w-0 max-w-full overflow-x-hidden">
      <ReportsWorkspace
        cases={normalizedCases as any}
        inspections={normalizedInspections as any}
        inspectionResults={inspectionResults}
        warehouseName={activeWarehouseName}
        warehouseCode={activeWarehouseCode}
      />
    </div>
  );
}
