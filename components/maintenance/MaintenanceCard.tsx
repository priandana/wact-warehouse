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
import { formatDistanceToNow, isPast, differenceInHours } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export interface MaintenanceItemData {
  id: string;
  case_number: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  due_date?: string | null;
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
  const isOverdue = item.due_date && isPast(new Date(item.due_date)) && !isClosed;
  const remainingHours = item.due_date
    ? differenceInHours(new Date(item.due_date), new Date())
    : null;
  const isApproachingSla = !isClosed && !isOverdue && remainingHours !== null && remainingHours <= 4 && remainingHours >= 0;

  const locationText = [item.areas?.name, item.locations?.name].filter(Boolean).join(' • ');
  const assigneeName = item.assignee?.full_name;

  return (
    <Link
      href={`/cases/${item.id}`}
      className="group block p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-blue-400/80 hover:shadow-xs transition-all active:scale-[0.99]"
    >
      {/* ── 1. Top Metadata Row: ID + Badges ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100/90">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-black text-xs text-blue-700 bg-blue-50/90 px-2 py-0.5 rounded-md border border-blue-200/60 shadow-2xs">
            {item.case_number}
          </span>
          <PriorityBadge priority={item.priority} />
        </div>
        <StatusBadge status={item.status} />
      </div>

      {/* ── 2. Work Order Title & Description Snippet ────────────────────── */}
      <div className="mt-3 space-y-1.5">
        <h2 className="font-extrabold text-sm text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
          {item.title}
        </h2>
        {item.description && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
            {item.description}
          </p>
        )}
      </div>

      {/* ── 3. Asset & Location Chips ────────────────────────────────────── */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
        {item.assets ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-800">
            <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="font-mono font-bold text-[11px] text-indigo-700">{item.assets.asset_code}</span>
            <span className="font-medium text-slate-600 truncate max-w-[140px]">{item.assets.name}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-slate-500">
            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] italic">Non-aset / Fasilitas Umum</span>
          </div>
        )}

        {locationText ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-semibold text-[11px] truncate max-w-[180px]">{locationText}</span>
          </div>
        ) : null}
      </div>

      {/* ── 4. Footer: PIC, SLA & Action CTA ─────────────────────────────── */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
        {/* PIC Technician */}
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            'w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 shadow-2xs',
            assigneeName ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'
          )}>
            {assigneeName ? assigneeName[0].toUpperCase() : <User className="w-3 h-3" />}
          </div>
          <span className={cn('text-[11.5px] truncate', assigneeName ? 'font-bold text-slate-800' : 'text-slate-400 italic font-medium')}>
            {assigneeName || 'Belum ada teknisi'}
          </span>
        </div>

        {/* SLA Status */}
        <div className="flex items-center gap-2 shrink-0">
          {isClosed ? (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Selesai
            </span>
          ) : isOverdue ? (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              Lewat SLA {item.due_date ? `${Math.abs(differenceInHours(new Date(), new Date(item.due_date)))}j` : ''}
            </span>
          ) : isApproachingSla ? (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              Sisa {item.due_date ? formatDistanceToNow(new Date(item.due_date), { locale: localeId }) : ''}
            </span>
          ) : item.due_date ? (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-500">
              <Clock className="w-3 h-3 text-slate-400" />
              {formatDistanceToNow(new Date(item.due_date), { locale: localeId })}
            </span>
          ) : null}

          <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center text-slate-400 transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
