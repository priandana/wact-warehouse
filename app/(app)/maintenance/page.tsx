// app/(app)/maintenance/page.tsx
// Maintenance Command Center — Server Component with Strict Warehouse Isolation & Authoritative Maintenance Scoping

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';
import { MaintenanceListClient } from '@/components/maintenance/MaintenanceListClient';
import type { MaintenanceItemData } from '@/components/maintenance/MaintenanceCard';

export const metadata: Metadata = {
  title: 'Pusat Pemeliharaan & Maintenance',
  description: 'Monitoring kasus pemeliharaan mesin, log reparasi, dan penanganan teknisi PIC',
};

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

interface MaintenancePageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    page?: string;
  }>;
}

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  };
}

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Parallel Phase 1: Resolve accessible warehouses (deduplicated by React cache), cookieStore, and searchParams
  const [
    accessibleWarehouses,
    cookieStore,
    params,
  ] = await Promise.all([
    getUserWarehouseAccess(user.id),
    cookies(),
    searchParams,
  ]);

  if (accessibleWarehouses.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center space-y-2">
        <h1 className="text-xl font-bold text-slate-900">Akses Gudang Tidak Ditemukan</h1>
        <p className="text-xs text-slate-500">Akun Anda belum memiliki akses gudang aktif. Hubungi Koordinator.</p>
      </div>
    );
  }

  // 2. Resolve Active Warehouse from Cookie (fallback to PDL or first warehouse)
  const activeWarehouseCookie = cookieStore.get('wact_active_warehouse_id')?.value;

  let activeWarehouse = accessibleWarehouses.find((w) => w.warehouseId === activeWarehouseCookie);

  if (!activeWarehouse) {
    const pdlWh = accessibleWarehouses.find(
      (w) => w.warehouseCode === 'WH-PDL' || w.warehouseCode === 'PDL' || w.warehouseName.toLowerCase().includes('padalarang')
    );
    activeWarehouse = pdlWh ?? accessibleWarehouses[0];
  }

  const activeWarehouseId = activeWarehouse.warehouseId;

  const q = params.q?.trim() ?? '';
  const status = params.status ?? 'all';
  const priority = params.priority ?? 'all';
  const currentPage = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // 3. Build Strict Authoritative Maintenance Query (scoped to active warehouse and requires_maintenance = true)
  let query = supabase
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
      reporter:reporter_id ( full_name ),
      case_assignments (
        assignee_id,
        is_current
      )
    `, { count: 'exact' })
    .eq('requires_maintenance', true)
    .eq('warehouse_id', activeWarehouseId);

  // 4. Search Filter (Case Number, Title, Description)
  if (q) {
    query = query.or(`case_number.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  // 5. Status Filter
  if (status && status !== 'all') {
    if (status === 'overdue') {
      // Overdue = non-closed and due_date in the past
      query = query
        .neq('status', 'closed')
        .not('due_date', 'is', null)
        .lt('due_date', new Date().toISOString());
    } else if (status === 'open') {
      query = query.in('status', ['open', 'reopened']);
    } else if (status === 'on_progress') {
      query = query.in('status', ['on_progress', 'waiting_repair']);
    } else {
      query = query.eq('status', status);
    }
  }

  // 6. Priority Filter
  if (priority && priority !== 'all') {
    query = query.eq('priority', priority);
  }

  // 7. Order & Pagination
  query = query
    .order('created_at', { ascending: false })
    .range(from, to);

  // Parallel fetch: paginated list + all qualifying maintenance records in active warehouse for authoritative KPI stats
  const [
    { data: rawCases, count, error },
    { data: allWarehouseMaintCases },
    { data: directoryUsers },
  ] = await Promise.all([
    query,
    supabase
      .from('cases')
      .select('id, status, due_date')
      .eq('requires_maintenance', true)
      .eq('warehouse_id', activeWarehouseId),
    supabase.from('profile_directory').select('id, full_name, avatar_url'),
  ]);

  if (error) {
    console.error('Error fetching maintenance cases:', error);
  }

  const profileMap = new Map<string, string>((directoryUsers ?? []).map((u: any) => [u.id, u.full_name]));
  const totalCount = count ?? 0;
  const nowIso = new Date().toISOString();

  // Authoritative KPI Stats computed STRICTLY on active warehouse's maintenance cases
  const visibleList = allWarehouseMaintCases ?? [];
  const kpiStats = {
    openCount: visibleList.filter((c) => c.status === 'open' || c.status === 'reopened').length,
    inProgressCount: visibleList.filter((c) => c.status === 'on_progress' || c.status === 'waiting_repair').length,
    waitingQcCount: visibleList.filter((c) => c.status === 'waiting_verification').length,
    closedCount: visibleList.filter((c) => c.status === 'closed').length,
    overdueCount: visibleList.filter((c) => c.status !== 'closed' && c.due_date && c.due_date < nowIso).length,
  };

  // Normalize maintenance data with robust profile mapping
  const normalizedItems: MaintenanceItemData[] = (rawCases ?? []).map((c: any) => {
    const currentAssignment = Array.isArray(c.case_assignments)
      ? c.case_assignments.find((a: any) => a.is_current)
      : null;

    const assigneeName = currentAssignment?.assignee_id
      ? profileMap.get(currentAssignment.assignee_id) || 'Teknisi PIC'
      : null;

    const reporterName = c.reporter_id
      ? profileMap.get(c.reporter_id) || (c.reporter as any)?.full_name || 'Staff'
      : (c.reporter as any)?.full_name || 'Staff';

    return {
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
      assignee: assigneeName ? { full_name: assigneeName } : null,
      reporter: reporterName ? { full_name: reporterName } : null,
    };
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <MaintenanceListClient
        initialItems={normalizedItems}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        kpiStats={kpiStats}
      />
    </div>
  );
}
