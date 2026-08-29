// components/cases/CaseActivityTimeline.tsx
// High-Density Operational Audit Trail & Activity Timeline
// Strict presentation layer: Zero mutations, zero workflow logic, zero role assumptions.

'use client';

import React from 'react';
import { formatWib } from '@/lib/utils/dateFormat';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import { getActivityPresentation } from '@/lib/utils/activityPresentation';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils/cn';
import {
  Activity,
  ArrowRight,
  Clock,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCw,
} from 'lucide-react';

export interface CaseActivityRow {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  metadata: Record<string, any> | any[] | string | number | boolean | null;
  created_at: string;
  actor_id: string | null;
  actor?: { full_name: string } | null;
}

interface CaseActivityTimelineProps {
  activities: CaseActivityRow[];
  profileMap?: Map<string, string>;
  className?: string;
}

interface ActivityGroup {
  dateKey: string;
  dateLabel: string;
  items: CaseActivityRow[];
}

/**
 * Group events strictly by Western Indonesia Time (Asia/Jakarta) calendar date.
 */
function groupActivitiesByJakartaDate(activities: CaseActivityRow[]): ActivityGroup[] {
  const groupsMap = new Map<string, { dateKey: string; dateLabel: string; items: CaseActivityRow[] }>();

  // Determine current and yesterday Jakarta date boundaries
  const nowJakartaStr = formatInTimeZone(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  const yesterdayJakarta = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterdayJakartaStr = formatInTimeZone(yesterdayJakarta, 'Asia/Jakarta', 'yyyy-MM-dd');

  for (const act of activities) {
    if (!act.created_at) continue;
    const d = typeof act.created_at === 'string' ? new Date(act.created_at) : act.created_at;
    if (isNaN(d.getTime())) continue;

    const jakartaDateKey = formatInTimeZone(d, 'Asia/Jakarta', 'yyyy-MM-dd');

    if (!groupsMap.has(jakartaDateKey)) {
      let label = '';
      if (jakartaDateKey === nowJakartaStr) {
        label = 'Hari Ini';
      } else if (jakartaDateKey === yesterdayJakartaStr) {
        label = 'Kemarin';
      } else {
        label = formatInTimeZone(d, 'Asia/Jakarta', 'd MMMM yyyy', { locale: idLocale });
      }
      groupsMap.set(jakartaDateKey, { dateKey: jakartaDateKey, dateLabel: label, items: [] });
    }

    groupsMap.get(jakartaDateKey)!.items.push(act);
  }

  return Array.from(groupsMap.values());
}

export function CaseActivityTimeline({
  activities,
  profileMap,
  className,
}: CaseActivityTimelineProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className={cn('p-6 text-center rounded-2xl bg-slate-50/60 border border-slate-100', className)}>
        <Activity className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
        <p className="text-xs font-bold text-slate-500">Belum ada riwayat aktivitas</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Semua aksi dan perubahan status kasus akan tercatat di sini.</p>
      </div>
    );
  }

  const groups = groupActivitiesByJakartaDate(activities);

  return (
    <div className={cn('space-y-5', className)}>
      {groups.map((group) => (
        <div key={group.dateKey} className="space-y-2.5">
          {/* Date Section Header */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-100/80 border border-slate-200/60 px-2 py-0.5 rounded-md">
              {group.dateLabel}
            </span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Activity Items List */}
          <div className="relative pl-5 sm:pl-6 space-y-3.5 before:absolute before:left-[15px] sm:before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200/70">
            {group.items.map((act) => {
              const pres = getActivityPresentation({
                action: act.action,
                from_status: act.from_status,
                to_status: act.to_status,
                metadata: act.metadata,
              });

              const meta = (typeof act.metadata === 'object' && act.metadata !== null && !Array.isArray(act.metadata))
                ? (act.metadata as Record<string, any>)
                : {};

              // Display actor name only (no role string to prevent historical role hallucination)
              const actorName =
                act.actor?.full_name ||
                (act.actor_id && profileMap ? profileMap.get(act.actor_id) : null) ||
                'Sistem';

              const Icon = pres.icon;

              // Check for status transition
              const hasTransition = act.from_status && act.to_status && act.from_status !== act.to_status;

              return (
                <div key={act.id} className="relative flex items-start gap-3 group">
                  {/* Semantic Icon Node (32px) */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 z-10 transition-transform shadow-2xs -ml-5 sm:-ml-6 bg-white',
                      pres.nodeBorder
                    )}
                    aria-hidden="true"
                  >
                    <div className={cn('w-full h-full rounded-xl flex items-center justify-center', pres.nodeBg)}>
                      <Icon className={cn('w-4 h-4', pres.iconColor)} />
                    </div>
                  </div>

                  {/* Activity Details Card */}
                  <div className="min-w-0 flex-1 p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1.5">
                    {/* Header Row: Action Title + Timestamp */}
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5 sm:gap-2">
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {pres.title}
                      </h4>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {formatWib(act.created_at, 'HH:mm')} WIB
                      </span>
                    </div>

                    {/* Actor Identity Row */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">{actorName}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-400 text-[10.5px]">
                        {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: idLocale })}
                      </span>
                    </div>

                    {/* Status Transition Badges (if present) */}
                    {hasTransition && (
                      <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                        <StatusBadge status={act.from_status!} size="sm" />
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <StatusBadge status={act.to_status!} size="sm" />
                      </div>
                    )}

                    {/* Specific Event Callouts */}
                    {/* 1. QC Rejection Reason */}
                    {act.action === 'verification_failed' && (meta.rejection_reason || meta.note) && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200/80 text-[11px] text-rose-900 space-y-0.5">
                        <div className="flex items-center gap-1 font-bold text-rose-800">
                          <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>Alasan Penolakan QC:</span>
                        </div>
                        <p className="italic pl-4 text-rose-950 font-medium">
                          &quot;{meta.rejection_reason || meta.note}&quot;
                        </p>
                      </div>
                    )}

                    {/* 2. QC Approval Note */}
                    {act.action === 'verified' && meta.note && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-900 space-y-0.5">
                        <div className="flex items-center gap-1 font-bold text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Catatan Persetujuan QC:</span>
                        </div>
                        <p className="italic pl-4 text-emerald-950 font-medium">
                          &quot;{meta.note}&quot;
                        </p>
                      </div>
                    )}

                    {/* 3. Reopen Reason */}
                    {act.action === 'reopened' && meta.reason && (
                      <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200/80 text-[11px] text-indigo-900 space-y-0.5">
                        <div className="flex items-center gap-1 font-bold text-indigo-800">
                          <RotateCw className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span>Alasan Pembukaan Kembali:</span>
                        </div>
                        <p className="italic pl-4 text-indigo-950 font-medium">
                          &quot;{meta.reason}&quot;
                        </p>
                      </div>
                    )}

                    {/* 4. General Human-Entered Reason (Assignment, Due date, Priority, Force close) */}
                    {meta.reason &&
                      !['assigned', 'verification_requested', 'status_transition', 'system', 'auto', 'trigger'].includes(
                        String(meta.reason).trim().toLowerCase()
                      ) &&
                      act.action !== 'reopened' &&
                      act.action !== 'verification_failed' && (
                        <p className="text-[11px] text-amber-900 bg-amber-50/90 p-2 rounded-lg border border-amber-200/80 italic">
                          <strong>Alasan:</strong> &quot;{meta.reason}&quot;
                        </p>
                      )}

                    {/* 5. General Note / Verification Submission Note */}
                    {meta.note &&
                      !['assigned', 'verification_requested', 'status_transition', 'system', 'auto', 'trigger'].includes(
                        String(meta.note).trim().toLowerCase()
                      ) &&
                      act.action !== 'verified' &&
                      act.action !== 'verification_failed' && (
                        <p className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80 italic">
                          <strong>Catatan:</strong> &quot;{meta.note}&quot;
                        </p>
                      )}
                    {meta.notes &&
                      !['assigned', 'verification_requested', 'status_transition', 'system', 'auto', 'trigger'].includes(
                        String(meta.notes).trim().toLowerCase()
                      ) && (
                        <p className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80 italic">
                          <strong>Catatan:</strong> &quot;{meta.notes}&quot;
                        </p>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

