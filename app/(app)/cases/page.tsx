import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { CasesListClient } from '@/components/cases/CasesListClient';
import type { CaseCardData } from '@/components/shared/CaseCard';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { getUserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';
import { EmptyState } from '@/components/shared/EmptyState';
import { FolderOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Daftar Kasus',
  description: 'Monitoring dan pelacakan seluruh kasus operasional warehouse',
};

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

interface CasesPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    date?: string;
    page?: string;
  }>;
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Fetch user's accessible warehouses and cookie store
  const [accessibleWarehouses, cookieStore] = await Promise.all([
    getUserWarehouseAccess(user.id),
    cookies(),
  ]);

  if (accessibleWarehouses.length === 0) {
    return (
      <div className="page-padding py-4 sm:py-5 max-w-6xl mx-auto space-y-4">
        <EmptyState
          icon={FolderOpen}
          title="Akses Gudang Tidak Ditemukan"
          description="Akun Anda belum memiliki akses gudang aktif. Hubungi Administrator."
        />
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

  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const status = params.status ?? 'all';
  const priority = params.priority ?? 'all';
  const dateRange = params.date ?? 'all';
  const currentPage = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Build query
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
      closed_at,
      created_at,
      has_operational_impact,
      requires_maintenance,
      areas:area_id ( name ),
      locations:location_id ( name ),
      assets:asset_id ( asset_code, name ),
      reporter:reporter_id ( full_name ),
      case_assignments (
        assignee_id,
        is_current,
        assignee:assignee_id ( full_name )
      )
    `, { count: 'exact' })
    .eq('warehouse_id', activeWarehouseId);

  // 1. Search Query (Case number or title)
  if (q) {
    query = query.or(`case_number.ilike.%${q}%,title.ilike.%${q}%`);
  }

  // 2. Status Filter
  if (status && status !== 'all') {
    if (status === 'overdue') {
      // Overdue = non-closed and due_date in the past
      query = query
        .neq('status', 'closed')
        .not('due_date', 'is', null)
        .lt('due_date', new Date().toISOString());
    } else {
      query = query.eq('status', status);
    }
  }

  // 3. Priority Filter
  if (priority && priority !== 'all') {
    query = query.eq('priority', priority);
  }

  // 4. Date Filter
  if (dateRange && dateRange !== 'all') {
    const now = new Date();
    if (dateRange === 'today') {
      query = query.gte('created_at', startOfDay(now).toISOString());
    } else if (dateRange === 'week') {
      query = query.gte('created_at', startOfWeek(now, { weekStartsOn: 1 }).toISOString());
    } else if (dateRange === 'month') {
      query = query.gte('created_at', startOfMonth(now).toISOString());
    }
  }

  // 5. Order & Pagination
  query = query
    .order('created_at', { ascending: false })
    .range(from, to);

  // Parallel fetch: paginated list + all visible cases for authoritative KPI counters
  const [
    { data: rawCases, count, error },
    { data: allVisibleCases },
  ] = await Promise.all([
    query,
    supabase.from('cases').select('status, due_date').eq('warehouse_id', activeWarehouseId),
  ]);

  if (error) {
    console.error('Error fetching cases:', error);
  }

  const totalCount = count ?? 0;
  const nowIso = new Date().toISOString();

  const kpiStats = {
    openCount: (allVisibleCases ?? []).filter((c) => c.status === 'open' || c.status === 'reopened').length,
    inProgressCount: (allVisibleCases ?? []).filter((c) => c.status === 'on_progress' || c.status === 'waiting_repair').length,
    waitingQcCount: (allVisibleCases ?? []).filter((c) => c.status === 'waiting_verification').length,
    overdueCount: (allVisibleCases ?? []).filter((c) => c.status !== 'closed' && c.due_date && c.due_date < nowIso).length,
  };

  // Normalize case data
  const normalizedCases: CaseCardData[] = (rawCases ?? []).map((c: any) => {
    const currentAssignment = Array.isArray(c.case_assignments)
      ? c.case_assignments.find((a: any) => a.is_current)
      : null;

    return {
      id: c.id,
      case_number: c.case_number,
      title: c.title,
      description: c.description,
      priority: c.priority,
      status: c.status,
      due_date: c.due_date,
      closed_at: c.closed_at,
      created_at: c.created_at,
      has_operational_impact: c.has_operational_impact,
      requires_maintenance: c.requires_maintenance,
      areas: c.areas,
      locations: c.locations,
      assets: c.assets,
      assignee: currentAssignment?.assignee ?? null,
      reporter: c.reporter,
    };
  });

  return (
    <div className="page-padding py-4 sm:py-5 max-w-6xl mx-auto space-y-4">
      <CasesListClient
        initialCases={normalizedCases}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        kpiStats={kpiStats}
      />
    </div>
  );
}
