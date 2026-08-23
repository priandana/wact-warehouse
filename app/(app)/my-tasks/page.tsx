// app/(app)/my-tasks/page.tsx
// PIC My Tasks Page — Server Component with Decoupled Queries

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { type CaseCardData } from '@/components/shared/CaseCard';
import { MyTasksClient } from '@/components/tasks/MyTasksClient';

export const metadata: Metadata = { title: 'Tugas Saya' };
export const dynamic = 'force-dynamic';

export default async function MyTasksPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 1. Fetch user's active assignments
  const { data: userAssignments } = await supabase
    .from('case_assignments')
    .select('case_id, is_current')
    .eq('assignee_id', user.id)
    .eq('is_current', true);

  const assignedCaseIds = (userAssignments ?? []).map(a => a.case_id);

  let myTasks: CaseCardData[] = [];

  if (assignedCaseIds.length > 0) {
    const { data: rawCases } = await supabase
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
        assets:asset_id ( asset_code, name ),
        reporter:reporter_id ( full_name )
      `)
      .in('id', assignedCaseIds)
      .order('created_at', { ascending: false });

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
      assignee: { full_name: 'Saya (PIC)' },
      reporter: c.reporter,
    }));
  }

  return (
    <div className="page-padding py-5 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Tugas Saya
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Daftar kasus aktif yang saat ini ditugaskan kepada Anda
        </p>
      </div>

      <MyTasksClient tasks={myTasks} />
    </div>
  );
}
