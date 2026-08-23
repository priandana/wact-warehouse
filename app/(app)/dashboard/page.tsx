// app/(app)/dashboard/page.tsx
// Server Component Dashboard Page — Fetches live Supabase data

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { HomeDashboard } from '@/components/dashboard/HomeDashboard';
import type { CaseCardData } from '@/components/shared/CaseCard';
import { isPast, startOfDay } from 'date-fns';

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

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const userName = profile?.full_name ?? user.email ?? 'Pengguna';

  // 2. Fetch all visible cases for stats and feeds (RLS automatically scopes by warehouse & user capability)
  const { data: casesData } = await supabase
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
      areas ( name ),
      locations ( name ),
      assets ( asset_code, name ),
      reporter:reporter_id ( full_name ),
      case_assignments (
        assignee_id,
        is_current,
        assignee:assignee_id ( full_name )
      )
    `)
    .order('created_at', { ascending: false });

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
  const todayStart = startOfDay(new Date());

  const openCount = normalizedCases.filter(c => c.status === 'open' || c.status === 'reopened').length;
  const onProgressCount = normalizedCases.filter(c => c.status === 'on_progress' || c.status === 'waiting_repair' || c.status === 'waiting_verification').length;
  const overdueCount = normalizedCases.filter(c => c.status !== 'closed' && c.due_date && isPast(new Date(c.due_date))).length;
  const closedTodayCount = normalizedCases.filter(c => c.status === 'closed' && new Date(c.created_at) >= todayStart).length;

  const stats = {
    openCount,
    onProgressCount,
    overdueCount,
    closedTodayCount,
  };

  // Needs Attention: Critical, High, or Overdue non-closed cases
  const needsAttentionCases = normalizedCases.filter(c => {
    if (c.status === 'closed') return false;
    const isOverdue = c.due_date && isPast(new Date(c.due_date));
    return c.priority === 'critical' || c.priority === 'high' || isOverdue;
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
