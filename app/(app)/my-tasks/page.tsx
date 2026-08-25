// app/(app)/my-tasks/page.tsx
// Personal Assignment Center (Tugas Saya) — Server Component with Strict Warehouse Isolation & Optimized Parallel Queries

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';
import { MyTasksClient } from '@/components/tasks/MyTasksClient';
import type { TaskItemData } from '@/components/tasks/TaskCard';

export const metadata: Metadata = {
  title: 'Pusat Tugas & Penugasan PIC',
  description: 'Daftar kasus dan tugas operasional warehouse yang ditugaskan kepada Anda',
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

export default async function MyTasksPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Parallel Phase 1: Resolve accessible warehouses (deduplicated by React cache), active cookie, and user assignments concurrently
  const [
    accessibleWarehouses,
    cookieStore,
    { data: userAssignments, error: assignError },
  ] = await Promise.all([
    getUserWarehouseAccess(user.id),
    cookies(),
    supabase
      .from('case_assignments')
      .select('case_id, is_current')
      .eq('assignee_id', user.id)
      .eq('is_current', true),
  ]);

  if (assignError) {
    console.error('Error fetching user assignments:', assignError);
  }

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

  const assignedCaseIds = (userAssignments ?? []).map((a) => a.case_id);

  let myTasks: TaskItemData[] = [];

  // 3. Parallel Phase 2: If user has assigned cases, query cases strictly scoped to warehouse & assignedCaseIds
  if (assignedCaseIds.length > 0) {
    const { data: rawCases, error: casesError } = await supabase
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
        has_operational_impact,
        requires_maintenance,
        areas:area_id ( name ),
        locations:location_id ( name ),
        assets:asset_id ( id, asset_code, name ),
        reporter:reporter_id ( full_name )
      `)
      .in('id', assignedCaseIds)
      .eq('warehouse_id', activeWarehouseId)
      .order('created_at', { ascending: false });

    if (casesError) {
      console.error('Error fetching assigned cases:', casesError);
    }

    myTasks = (rawCases ?? []).map((c: any) => ({
      id: c.id,
      case_number: c.case_number,
      title: c.title,
      description: c.description,
      priority: c.priority,
      status: c.status,
      due_date: c.due_date,
      created_at: c.created_at,
      has_operational_impact: c.has_operational_impact,
      requires_maintenance: c.requires_maintenance,
      areas: c.areas,
      locations: c.locations,
      assets: c.assets,
      reporter: c.reporter,
    }));
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <MyTasksClient
        initialTasks={myTasks}
        warehouseName={activeWarehouseName}
        warehouseCode={activeWarehouseCode}
      />
    </div>
  );
}
