'use client';
// components/tasks/TaskCard.tsx
// Dedicated Personal Task Card in WACT V2 Design Language
// Focuses on "What should I do next?" for warehouse staff and technicians

import Link from 'next/link';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import {
  Clock,
  MapPin,
  Package,
  ChevronRight,
  CheckCircle2,
  PlayCircle,
  Wrench,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow, isPast, differenceInHours } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export interface TaskItemData {
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
  reporter?: { full_name: string } | null;
}

interface TaskCardProps {
  item: TaskItemData;
}

export function TaskCard({ item }: TaskCardProps) {
  const isClosed = item.status === 'closed';
  const isOverdue = item.due_date && isPast(new Date(item.due_date)) && !isClosed;
  const remainingHours = item.due_date
    ? differenceInHours(new Date(item.due_date), new Date())
    : null;
  const isApproachingSla = !isClosed && !isOverdue && remainingHours !== null && remainingHours <= 4 && remainingHours >= 0;

  const locationText = [item.areas?.name, item.locations?.name].filter(Boolean).join(' • ');

  // Contextual CTA wording & styling based on authoritative task lifecycle
  let ctaLabel = 'Lihat Detail Kasus';
  let ctaIcon = ChevronRight;
  let ctaButtonClass = 'bg-slate-900 hover:bg-slate-800 text-white';

  if (item.status === 'open' || item.status === 'reopened') {
    ctaLabel = 'Mulai Kerjakan Kasus';
    ctaIcon = PlayCircle;
    ctaButtonClass = 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs';
  } else if (item.status === 'on_progress' || item.status === 'waiting_repair') {
    ctaLabel = 'Update Progres & Hasil';
    ctaIcon = Wrench;
    ctaButtonClass = 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs';
  } else if (item.status === 'waiting_verification') {
    ctaLabel = 'Lihat Status Review QC';
    ctaIcon = Clock;
    ctaButtonClass = 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs';
  } else if (isClosed) {
    ctaLabel = 'Lihat Riwayat Tugas';
    ctaIcon = CheckCircle2;
    ctaButtonClass = 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200';
  }

  const CtaIconComponent = ctaIcon;

  return (
    <div className="group block p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-blue-400/80 hover:shadow-xs transition-all">
      {/* ── 1. Top Metadata Row: ID + Badges ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100/90">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-black text-xs text-blue-700 bg-blue-50/90 px-2 py-0.5 rounded-md border border-blue-200/60 shadow-2xs">
            {item.case_number}
          </span>
          <PriorityBadge priority={item.priority} />
          {item.requires_maintenance && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              <Wrench className="w-3 h-3 text-amber-600" />
              Maintenance
            </span>
          )}
        </div>
        <StatusBadge status={item.status} />
      </div>

      {/* ── 2. Task Title & Description Preview ──────────────────────────── */}
      <div className="mt-3 space-y-1.5">
        <Link href={`/cases/${item.id}`} className="block">
          <h2 className="font-extrabold text-sm sm:text-[14.5px] text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
            {item.title}
          </h2>
        </Link>
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
            <span className="font-medium text-slate-600 truncate max-w-[150px]">{item.assets.name}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-slate-500">
            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] italic">Non-aset / Fasilitas</span>
          </div>
        )}

        {locationText ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-semibold text-[11px] truncate max-w-[180px]">{locationText}</span>
          </div>
        ) : null}
      </div>

      {/* ── 4. Footer: SLA Urgency + Primary Next Action CTA ─────────────── */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* SLA Urgency Pill */}
        <div className="flex items-center gap-2">
          {isClosed ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Tugas Selesai
            </span>
          ) : isOverdue ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              Lewat Batas SLA {item.due_date ? `(${Math.abs(differenceInHours(new Date(), new Date(item.due_date)))} jam)` : ''}
            </span>
          ) : isApproachingSla ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              Mendekati Deadline ({item.due_date ? formatDistanceToNow(new Date(item.due_date), { locale: localeId }) : ''})
            </span>
          ) : item.due_date ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Target: {formatDistanceToNow(new Date(item.due_date), { locale: localeId })} lagi
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 italic">Tanpa batas waktu khusus</span>
          )}
        </div>

        {/* Primary Next Action CTA Button */}
        <Link
          href={`/cases/${item.id}`}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-98',
            ctaButtonClass
          )}
        >
          <CtaIconComponent className="w-3.5 h-3.5 shrink-0" />
          <span>{ctaLabel}</span>
          <ArrowUpRight className="w-3.5 h-3.5 ml-0.5 opacity-70" />
        </Link>
      </div>
    </div>
  );
}
