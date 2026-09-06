'use client';
// components/maintenance/MaintenanceCard.tsx
// Mobile & Grid Card for Maintenance Work Orders in WACT V2 Design Language

import Link from 'next/link';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import {
  Clock,
  MapPin,
  Package,
  User,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getSlaStatus } from '@/lib/utils/sla';

export interface MaintenanceItemData {
  id: string;
  case_number: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  due_date?: string | null;
  closed_at?: string | null;
  created_at: string;
  has_operational_impact?: boolean | null;
  requires_maintenance?: boolean | null;
  areas?: { name: string } | null;
  locations?: { name: string } | null;
  assets?: { id?: string; asset_code: string; name: string } | null;
  assignee?: { full_name: string } | null;
  reporter?: { full_name: string } | null;
  root_cause?: { name: string } | null;
  corrective_action?: string | null;
  preventive_action?: string | null;
}

interface MaintenanceCardProps {
  item: MaintenanceItemData;
}

export function MaintenanceCard({ item }: MaintenanceCardProps) {
  const isClosed = item.status === 'closed';
  const slaInfo = getSlaStatus(item.due_date, item.status, (item as any).closed_at);
  const isOverdue = slaInfo.isOverdue && !isClosed;

  const locationText = [item.areas?.name, item.locations?.name].filter(Boolean).join(' • ');
  const assigneeName = item.assignee?.full_name;

  return (
    <Link
      href={`/cases/${item.id}`}
      className="group block p-4 sm:p-5 rounded-3xl bg-[#EEF2F7] dark:bg-[#131C31] neu-raised neu-card-interactive border border-black/[0.04] dark:border-white/[0.05] transition-all active:scale-[0.99]"
    >
      {/* ── 1. Top Metadata Row: ID + Badges ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-black/[0.04] dark:border-white/[0.05]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 neu-inset-sm px-2.5 py-1 rounded-xl border border-black/[0.04] dark:border-white/[0.05]">
            {item.case_number}
          </span>
          <PriorityBadge priority={item.priority} />
        </div>
        <StatusBadge status={item.status} />
      </div>

      {/* ── 2. Work Order Title & Description Snippet ────────────────────── */}
      <div className="mt-3 space-y-1.5">
        <h2 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {item.title}
        </h2>
        {item.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
            {item.description}
          </p>
        )}
      </div>

      {/* ── 3. Asset & Location Chips ────────────────────────────────────── */}
      <div className="mt-3.5 pt-3 border-t border-black/[0.04] dark:border-white/[0.05] flex flex-wrap gap-2 text-xs">
        {item.assets ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl neu-inset-sm bg-[#E5EBF3]/60 dark:bg-[#0D1322]/60 border border-black/[0.04] dark:border-white/[0.05] text-slate-800 dark:text-slate-200">
            <Package className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="font-mono font-bold text-[11px] text-indigo-600 dark:text-indigo-400">{item.assets.asset_code}</span>
            <span className="font-medium text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{item.assets.name}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl neu-inset-sm bg-[#E5EBF3]/40 dark:bg-[#0D1322]/40 border border-black/[0.04] dark:border-white/[0.05] text-slate-500 dark:text-slate-400">
            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] italic">Non-aset / Fasilitas Umum</span>
          </div>
        )}

        {locationText ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl neu-inset-sm bg-[#E5EBF3]/60 dark:bg-[#0D1322]/60 border border-black/[0.04] dark:border-white/[0.05] text-slate-700 dark:text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="font-semibold text-[11px] truncate max-w-[180px]">{locationText}</span>
          </div>
        ) : null}
      </div>

      {/* ── 4. Footer: PIC, SLA & Action CTA ─────────────────────────────── */}
      <div className="mt-3.5 pt-3 border-t border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between gap-3 text-xs">
        {/* PIC Technician */}
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            'w-7 h-7 rounded-xl neu-icon-well flex items-center justify-center font-black text-[11px] shrink-0',
            assigneeName ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
          )}>
            {assigneeName ? assigneeName[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
          </div>
          <span className={cn('text-[11.5px] truncate', assigneeName ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-400 italic font-medium')}>
            {assigneeName || 'Belum ada teknisi'}
          </span>
        </div>

        {/* SLA Status */}
        <div className="flex items-center gap-2 shrink-0">
          {slaInfo.type === 'no_sla' ? null : slaInfo.isClosed ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full border neu-inset-sm',
                slaInfo.badgeBg,
                slaInfo.badgeText,
                slaInfo.badgeBorder
              )}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>{slaInfo.badgeLabel}</span>
            </span>
          ) : slaInfo.isOverdue ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10.5px] font-black px-2.5 py-1 rounded-full border neu-inset-sm',
                slaInfo.badgeBg,
                slaInfo.badgeText,
                slaInfo.badgeBorder
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{slaInfo.badgeLabel}</span>
            </span>
          ) : slaInfo.isApproaching ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full border neu-inset-sm',
                slaInfo.badgeBg,
                slaInfo.badgeText,
                slaInfo.badgeBorder
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>{slaInfo.badgeLabel}</span>
            </span>
          ) : (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1 rounded-full border neu-inset-sm',
                slaInfo.badgeBg,
                slaInfo.badgeText,
                slaInfo.badgeBorder
              )}
            >
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{slaInfo.badgeLabel}</span>
            </span>
          )}

          <div className="w-7 h-7 rounded-xl neu-icon-well flex items-center justify-center text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
