// app/(app)/my-tasks/page.tsx
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CaseCard, type CaseCardData } from '@/components/shared/CaseCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { UserCheck, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Tugas Saya' };
export const dynamic = 'force-dynamic';

export default async function MyTasksPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

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
    .neq('status', 'closed')
    .order('created_at', { ascending: false });

  const myTasks: CaseCardData[] = (rawCases ?? [])
    .filter((c: any) => {
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
    });

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

      {myTasks.length > 0 ? (
        <div className="space-y-3">
          {myTasks.map((item) => (
            <CaseCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={UserCheck}
          title="Tidak ada tugas aktif"
          description="Saat ini tidak ada kasus yang ditugaskan kepada Anda. Cek kembali nanti."
        />
      )}
    </div>
  );
}
