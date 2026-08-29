import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { HomeDashboard } from '@/components/dashboard/HomeDashboard';
import type { CaseCardData } from '@/components/shared/CaseCard';
import { getJakartaDayBoundaries } from '@/lib/utils/sla';
import { getUserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';

export const metadata: Metadata = {
  title: 'Beranda',
  description: 'Dashboard operasional warehouse case tracking',
};

// Force dynamic server rendering for real-time dashboard data
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Fetch user profile and accessible warehouses in parallel
  const [profileRes, accessibleWarehouses, cookieStore] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    getUserWarehouseAccess(user.id),
    cookies(),
  ]);

  const userName = profileRes.data?.full_name ?? user.email ?? 'Pengguna';

  if (accessibleWarehouses.length === 0) {
    return (
      <div className="page-padding py-5 max-w-6xl mx-auto">
        <HomeDashboard
          userName={userName}
          stats={{ openCount: 0, onProgressCount: 0, overdueCount: 0, closedTodayCount: 0 }}
          needsAttentionCases={[]}
          myTasksCases={[]}
          recentCases={[]}
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

  // 3. Fetch all visible cases scoped to the active warehouse
  const { data: casesData, error: casesError } = await supabase
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
    `)
    .eq('warehouse_id', activeWarehouseId)
    .order('created_at', { ascending: false });

  if (casesError) {
    console.error('[Dashboard] Error fetching cases for warehouse:', activeWarehouseId, casesError);
  }

  const rawCases = casesData ?? [];

  // Normalize case data with current assignee
  const normalizedCases: CaseCardData[] = rawCases.map((c: any) => {
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

  // Calculate Metrics
  const now = new Date();
  const { start: jakartaStart, nextDay: jakartaNextDay } = getJakartaDayBoundaries(now);

  const openCount = normalizedCases.filter(c => c.status === 'open' || c.status === 'reopened').length;
  const onProgressCount = normalizedCases.filter(c => c.status === 'on_progress' || c.status === 'waiting_repair').length;
  const overdueCount = normalizedCases.filter(c => c.status !== 'closed' && c.due_date && new Date(c.due_date) < now).length;
  const closedTodayCount = normalizedCases.filter(c => {
    if (c.status !== 'closed' || !c.closed_at) return false;
    const closedTime = new Date(c.closed_at);
    return closedTime >= jakartaStart && closedTime < jakartaNextDay;
  }).length;

  const stats = {
    openCount,
    onProgressCount,
    overdueCount,
    closedTodayCount,
  };

  // Needs Attention: Waiting QC, Critical, High, or Overdue non-closed cases
  const needsAttentionCases = normalizedCases.filter(c => {
    if (c.status === 'closed') return false;
    const isOverdue = c.due_date && new Date(c.due_date) < now;
    return c.status === 'waiting_verification' || c.priority === 'critical' || c.priority === 'high' || isOverdue;
  }).slice(0, 5);

  // My Tasks: Cases where current user is current assignee and not closed
  const myTasksCases = rawCases
    .filter((c: any) => {
      if (c.status === 'closed') return false;
      const assignments = Array.isArray(c.case_assignments) ? c.case_assignments : [];
      return assignments.some((a: any) => a.assignee_id === user.id && a.is_current);
    })
    .map((c: any) => {
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
        created_at: c.created_at,
        has_operational_impact: c.has_operational_impact,
        requires_maintenance: c.requires_maintenance,
        areas: c.areas,
        locations: c.locations,
        assets: c.assets,
        assignee: currentAssignment?.assignee ?? null,
        reporter: c.reporter,
      };
    })
    .slice(0, 5);

  // Recent Cases (Top 5)
  const recentCases = normalizedCases.slice(0, 5);

  return (
    <div className="page-padding py-5 max-w-6xl mx-auto">
      <HomeDashboard
        userName={userName}
        stats={stats}
        needsAttentionCases={needsAttentionCases}
        myTasksCases={myTasksCases}
        recentCases={recentCases}
      />
    </div>
  );
}
