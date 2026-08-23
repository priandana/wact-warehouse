'use client';
// components/shared/CaseCard.tsx
// Modern Consumer/Fintech Feed Card for Cases

import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { MapPin, Clock, ChevronRight, AlertCircle, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow, isPast, differenceInHours } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export interface CaseCardData {
  id: string;
  case_number: string;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical' | string;
  status: 'open' | 'on_progress' | 'waiting_repair' | 'waiting_verification' | 'closed' | 'reopened' | string;
  due_date?: string | null;
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
  const isOverdue = item.due_date && isPast(new Date(item.due_date)) && item.status !== 'closed';

  const getSlaDisplay = () => {
    if (!item.due_date) return null;
    const dueDate = new Date(item.due_date);

    if (item.status === 'closed') {
      return (
        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-100/80">
          <Clock className="w-3 h-3" />
          Selesai
        </span>
      );
    }

    if (isOverdue) {
      const hoursLate = Math.abs(differenceInHours(new Date(), dueDate));
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/80 animate-pulse">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          Lewat SLA {hoursLate > 0 ? `${hoursLate}j` : '<1j'}
        </span>
      );
    }

    return (
      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 bg-slate-100/70 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3 text-slate-400" />
        Sisa {formatDistanceToNow(dueDate, { locale: localeId })}
      </span>
    );
  };

  const locationText = [item.areas?.name, item.locations?.name].filter(Boolean).join(' • ');

  return (
    <Link
      href={`/cases/${item.id}`}
      className={cn(
        'group block w-full p-4 rounded-2xl bg-white border border-slate-200/70 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_22px_-4px_rgba(15,23,42,0.07)] hover:border-blue-200 active:scale-[0.99] transition-all duration-150',
        isOverdue && 'border-rose-200/90 bg-rose-50/15',
        className,
      )}
    >
      {/* Top Header: Case Number & Priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold font-mono text-blue-700 bg-blue-50/90 px-2 py-0.5 rounded-lg border border-blue-100/80">
            {item.case_number}
          </span>
          {item.requires_maintenance && (
            <span className="p-1 rounded-md bg-amber-50 text-amber-700" title="Maintenance Diperlukan">
              <Wrench className="w-3 h-3" />
            </span>
          )}
        </div>
        <PriorityBadge priority={item.priority} size="sm" />
      </div>

      {/* Case Title */}
      <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug mb-2 group-hover:text-blue-600 transition-colors">
        {item.title}
      </h3>

      {/* Location & Asset Metadata Tag */}
      {(locationText || item.assets) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mb-3 font-medium">
          {locationText && (
            <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md text-[11.5px] text-slate-600">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-[200px]">{locationText}</span>
            </span>
          )}
          {item.assets && (
            <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md text-[10.5px] text-slate-500 font-mono">
              {item.assets.asset_code}
            </span>
          )}
        </div>
      )}

      {/* Bottom Footer: Status Badge, SLA countdown, and Assignee */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={item.status} size="sm" />
          {getSlaDisplay()}
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
          {showAssignee && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700">
                {item.assignee?.full_name ? item.assignee.full_name[0].toUpperCase() : '?'}
              </div>
              <span className="truncate max-w-[75px] hidden sm:inline">
                {item.assignee?.full_name ? item.assignee.full_name.split(' ')[0] : 'Unassigned'}
              </span>
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}
