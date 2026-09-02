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
        'group block w-full p-4 sm:p-4.5 rounded-3xl bg-white border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_24px_-4px_rgba(15,23,42,0.06)] hover:border-blue-300 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-150',
        isOverdue && 'border-rose-200/90 bg-rose-50/20 hover:border-rose-300',
        className,
      )}
    >
      {/* Top Header: Case Number & Priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-black font-mono text-blue-700 bg-blue-50/90 px-2.5 py-0.5 rounded-full border border-blue-100/80 shadow-2xs">
            {item.case_number}
          </span>
          {item.requires_maintenance && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50/90 text-amber-800 text-[10px] font-bold border border-amber-200/70 shadow-2xs" title="Maintenance Diperlukan">
              <Wrench className="w-3 h-3 text-amber-600" />
              <span>Maint</span>
            </span>
          )}
        </div>
        <PriorityBadge priority={item.priority} size="sm" />
      </div>

      {/* Case Title */}
      <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug mb-2.5 group-hover:text-blue-600 transition-colors">
        {item.title}
      </h3>

      {/* Location & Asset Metadata Tag */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mb-3.5 font-medium">
        {locationText ? (
          <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl text-[11px] text-slate-600 border border-slate-200/60 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[200px] font-medium">{locationText}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 bg-slate-50/60 px-2.5 py-1 rounded-xl text-[10.5px] text-slate-400 italic border border-slate-200/40">
            <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span>Lokasi belum ditentukan</span>
          </span>
        )}
        {item.assets && (
          <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl text-[10.5px] text-slate-700 font-mono font-bold border border-slate-200/60 shadow-2xs">
            {item.assets.asset_code}
          </span>
        )}
      </div>

      {/* Bottom Footer: Status Badge, SLA countdown, and Assignee */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={item.status} size="sm" />
          {getSlaDisplay()}
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
          {showAssignee && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-50/80 px-2 py-0.5 rounded-full border border-slate-200/50">
              <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[9px] font-black shadow-2xs">
                {item.assignee?.full_name ? item.assignee.full_name[0].toUpperCase() : '?'}
              </div>
              <span className="truncate max-w-[90px] hidden sm:inline">
                {item.assignee?.full_name ? item.assignee.full_name.split(' ')[0] : 'Belum di-assign'}
              </span>
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}
