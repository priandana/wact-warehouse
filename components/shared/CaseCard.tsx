'use client';
// components/shared/CaseCard.tsx
// Modern Consumer/Fintech Feed Card for Cases

import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { MapPin, Clock, ChevronRight, CheckCircle2, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow, isPast, differenceInHours } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

import { getSlaStatus } from '@/lib/utils/sla';

export interface CaseCardData {
  id: string;
  case_number: string;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical' | string;
  status: 'open' | 'on_progress' | 'waiting_repair' | 'waiting_verification' | 'closed' | 'reopened' | string;
  due_date?: string | null;
  closed_at?: string | null;
  created_at: string;
  has_operational_impact?: boolean | null;
  requires_maintenance?: boolean | null;
  areas?: { name: string } | null;
  locations?: { name: string } | null;
  assets?: { asset_code: string; name: string } | null;
  assignee?: { full_name: string } | null;
  reporter?: { full_name: string } | null;
}

interface CaseCardProps {
  item: CaseCardData;
  className?: string;
  showAssignee?: boolean;
}

export function CaseCard({ item, className, showAssignee = true }: CaseCardProps) {
  const slaInfo = getSlaStatus(item.due_date, item.status, item.closed_at);
  const isOverdue = slaInfo.isOverdue && !slaInfo.isClosed;

  const getSlaDisplay = () => {
    if (slaInfo.type === 'no_sla') return null;

    if (slaInfo.isClosed) {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border select-none shadow-2xs',
            slaInfo.badgeBg,
            slaInfo.badgeText,
            slaInfo.badgeBorder
          )}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>{slaInfo.badgeLabel}</span>
        </span>
      );
    }

    if (slaInfo.isOverdue) {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs select-none',
            slaInfo.badgeBg,
            slaInfo.badgeText,
            slaInfo.badgeBorder
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>{slaInfo.badgeLabel}</span>
        </span>
      );
    }

    if (slaInfo.isApproaching) {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs select-none',
            slaInfo.badgeBg,
            slaInfo.badgeText,
            slaInfo.badgeBorder
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span>{slaInfo.badgeLabel}</span>
        </span>
      );
    }

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full border select-none shadow-2xs',
          slaInfo.badgeBg,
          slaInfo.badgeText,
          slaInfo.badgeBorder
        )}
      >
        <Clock className="w-3 h-3 text-slate-400" />
        <span>{slaInfo.badgeLabel}</span>
      </span>
    );
  };

  const locationText = [item.areas?.name, item.locations?.name].filter(Boolean).join(' • ');

  return (
    <Link
      href={`/cases/${item.id}`}
      className={cn(
        'group block w-full p-4 sm:p-5 rounded-3xl bg-[#EEF2F7] dark:bg-[#131C31] border border-white/80 dark:border-white/5 shadow-[6px_6px_16px_rgba(163,177,198,0.32),-6px_-6px_16px_rgba(255,255,255,0.95)] dark:shadow-[6px_6px_16px_rgba(0,0,0,0.55),-4px_-4px_12px_rgba(255,255,255,0.03)] hover:shadow-[8px_8px_22px_rgba(163,177,198,0.42),-8px_-8px_22px_rgba(255,255,255,1)] dark:hover:shadow-[8px_8px_22px_rgba(0,0,0,0.65),-5px_-5px_14px_rgba(255,255,255,0.04)] hover:-translate-y-1 active:scale-[0.99] transition-all duration-150',
        isOverdue && 'border-rose-300/80 dark:border-rose-900/60 shadow-[6px_6px_18px_rgba(244,63,94,0.2),-6px_-6px_18px_rgba(255,255,255,0.95)]',
        className,
      )}
    >
      {/* Top Header: Case Number & Priority */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-black font-mono text-blue-700 dark:text-blue-300 bg-[#EEF2F7] dark:bg-[#0D1322] px-3 py-1 rounded-full border border-blue-200/60 dark:border-blue-900 shadow-[inset_1.5px_1.5px_3px_rgba(163,177,198,0.3),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.85)] dark:shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.5),inset_-1px_-1px_2px_rgba(255,255,255,0.03)]">
            {item.case_number}
          </span>
          {item.requires_maintenance && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50/90 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold border border-amber-200/80 dark:border-amber-800 shadow-[1.5px_1.5px_4px_rgba(245,158,11,0.2),-1.5px_-1.5px_4px_rgba(255,255,255,0.8)]" title="Maintenance Diperlukan">
              <Wrench className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Maint</span>
            </span>
          )}
        </div>
        <PriorityBadge priority={item.priority} size="sm" />
      </div>

      {/* Case Title */}
      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {item.title}
      </h3>

      {/* Location & Asset Metadata Tag */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3.5 font-medium">
        {locationText ? (
          <span className="inline-flex items-center gap-1.5 bg-[#EEF2F7] dark:bg-[#131C31] px-2.5 py-1 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 border border-white/70 dark:border-white/5 shadow-[2px_2px_5px_rgba(163,177,198,0.22),-2px_-2px_5px_rgba(255,255,255,0.85)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.35),-1px_-1px_3px_rgba(255,255,255,0.02)]">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[200px] font-medium">{locationText}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 bg-[#EEF2F7] dark:bg-[#131C31] px-2.5 py-1 rounded-xl text-[10.5px] text-slate-400 dark:text-slate-500 italic border border-slate-300/30 dark:border-slate-800">
            <MapPin className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
            <span>Lokasi belum ditentukan</span>
          </span>
        )}
        {item.assets && (
          <span className="inline-flex items-center gap-1.5 bg-[#EEF2F7] dark:bg-[#131C31] px-2.5 py-1 rounded-xl text-[10.5px] text-slate-700 dark:text-slate-300 font-mono font-bold border border-white/70 dark:border-white/5 shadow-[2px_2px_5px_rgba(163,177,198,0.22),-2px_-2px_5px_rgba(255,255,255,0.85)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.35),-1px_-1px_3px_rgba(255,255,255,0.02)]">
            {item.assets.asset_code}
          </span>
        )}
      </div>

      {/* Bottom Footer: Status Badge, SLA countdown, and Assignee */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-300/40 dark:border-slate-800/60 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={item.status} size="sm" />
          {getSlaDisplay()}
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
          {showAssignee && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-[#EEF2F7] dark:bg-[#131C31] px-2.5 py-1 rounded-full border border-white/70 dark:border-white/5 shadow-[2px_2px_5px_rgba(163,177,198,0.22),-2px_-2px_5px_rgba(255,255,255,0.85)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.35),-1px_-1px_3px_rgba(255,255,255,0.02)]">
              <div className="w-5 h-5 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center text-[9px] font-black shadow-2xs">
                {item.assignee?.full_name ? item.assignee.full_name[0].toUpperCase() : '?'}
              </div>
              <span className="truncate max-w-[90px] hidden sm:inline">
                {item.assignee?.full_name ? item.assignee.full_name.split(' ')[0] : 'Belum di-assign'}
              </span>
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}
