// app/(app)/cases/page.tsx
// Cases List Page — Server Component with Paginated Supabase Query

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CasesListClient } from '@/components/cases/CasesListClient';
import type { CaseCardData } from '@/components/shared/CaseCard';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';

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
    `, { count: 'exact' });

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

  const { data: rawCases, count, error } = await query;

  if (error) {
    console.error('Error fetching cases:', error);
  }

  const totalCount = count ?? 0;

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
    <div className="page-padding py-5 max-w-6xl mx-auto">
      <CasesListClient
        initialCases={normalizedCases}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
