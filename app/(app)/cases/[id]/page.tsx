// app/(app)/cases/[id]/page.tsx
// Case Detail View — Server Component with Live Supabase Data

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import Link from 'next/link';
import {
  ChevronLeft,
  Clock,
  MapPin,
  User,
  AlertCircle,
  Wrench,
  Activity,
  Calendar,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface CaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: CaseDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: item } = await supabase
    .from('cases')
    .select('case_number, title')
    .eq('id', id)
    .maybeSingle();

  if (!item) return { title: 'Detail Kasus' };
  return {
    title: `${item.case_number} — ${item.title}`,
  };
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: item, error } = await supabase
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
      ),
      case_activities (
        id,
        action_type,
        old_status,
        new_status,
        note,
        created_at,
        actor:actor_id ( full_name )
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !item) {
    notFound();
  }

  const currentAssignment = Array.isArray(item.case_assignments)
    ? item.case_assignments.find((a: any) => a.is_current)
    : null;

  const activities = (item.case_activities ?? []).sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const isOverdue = item.due_date && isPast(new Date(item.due_date)) && item.status !== 'closed';
  const locationText = [item.areas?.name, item.locations?.name].filter(Boolean).join(' • ');

  return (
    <div className="page-padding py-4 max-w-3xl mx-auto space-y-4">
      {/* Top Nav Back Link */}
      <Link
        href="/cases"
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Kembali ke Daftar Kasus</span>
      </Link>

      {/* Main Case Header Card */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 text-xs">
              {item.case_number}
            </span>
            <PriorityBadge priority={item.priority} size="sm" />
          </div>
          <StatusBadge status={item.status} size="md" />
        </div>

        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
          {item.title}
        </h1>

        {item.description && (
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            {item.description}
          </p>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Lokasi</p>
            <p className="font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{locationText || '-'}</span>
            </p>
          </div>

          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">PIC Ditugaskan</p>
            <p className="font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{currentAssignment?.assignee?.full_name || 'Belum ditugaskan'}</span>
            </p>
          </div>

          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Target SLA</p>
            <p className="font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {item.due_date
                  ? format(new Date(item.due_date), 'dd MMM yyyy, HH:mm', { locale: localeId })
                  : '-'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Activity Timeline Card */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
            Riwayat Aktivitas & Workflow
          </h2>
        </div>

        {activities.length > 0 ? (
          <div className="space-y-3 pt-1">
            {activities.map((act: any) => (
              <div key={act.id} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {act.actor?.full_name ? act.actor.full_name[0].toUpperCase() : 'S'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-bold text-slate-800 truncate">
                      {act.actor?.full_name || 'Sistem'}
                    </span>
                    <span className="text-[10.5px] text-slate-400">
                      {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: localeId })}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-600 font-medium capitalize">
                    {act.action_type.replace(/_/g, ' ')}
                    {act.new_status ? ` → ${act.new_status}` : ''}
                  </p>
                  {act.note && (
                    <p className="text-[11px] text-slate-500 italic mt-1 bg-white p-2 rounded-lg border border-slate-200/60">
                      &quot;{act.note}&quot;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Belum ada riwayat aktivitas.</p>
        )}
      </div>
    </div>
  );
}
