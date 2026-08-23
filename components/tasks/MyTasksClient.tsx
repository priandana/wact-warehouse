'use client';
// components/tasks/MyTasksClient.tsx
// Interactive PIC Task List with tab filtering and quick SLA counters

import { useState } from 'react';
import { CaseCard, type CaseCardData } from '@/components/shared/CaseCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { UserCheck, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface MyTasksClientProps {
  tasks: CaseCardData[];
}

export function MyTasksClient({ tasks }: MyTasksClientProps) {
  const [filter, setFilter] = useState<'all' | 'on_progress' | 'waiting_verification' | 'closed'>('all');

  const onProgressCount = tasks.filter(t => t.status === 'on_progress' || t.status === 'waiting_repair').length;
  const waitingVerificationCount = tasks.filter(t => t.status === 'waiting_verification').length;
  const closedCount = tasks.filter(t => t.status === 'closed').length;

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'on_progress') return t.status === 'on_progress' || t.status === 'waiting_repair';
    if (filter === 'waiting_verification') return t.status === 'waiting_verification';
    if (filter === 'closed') return t.status === 'closed';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* ── Status Tab Filter ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5',
            filter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          )}
        >
          <span>Semua Tugas</span>
          <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full', filter === 'all' ? 'bg-white/20' : 'bg-slate-100')}>
            {tasks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('on_progress')}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5',
            filter === 'on_progress'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          )}
        >
          <PlayCircle className="w-3.5 h-3.5" />
          <span>Perlu Dikerjakan</span>
          <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full', filter === 'on_progress' ? 'bg-white/20' : 'bg-slate-100')}>
            {onProgressCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('waiting_verification')}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5',
            filter === 'waiting_verification'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Menunggu Verifikasi</span>
          <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full', filter === 'waiting_verification' ? 'bg-white/20' : 'bg-slate-100')}>
            {waitingVerificationCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('closed')}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5',
            filter === 'closed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Selesai</span>
          <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full', filter === 'closed' ? 'bg-white/20' : 'bg-slate-100')}>
            {closedCount}
          </span>
        </button>
      </div>

      {/* ── Tasks Feed List ──────────────────────────────────────────────── */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-3">
          {filteredTasks.map((item) => (
            <CaseCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={UserCheck}
          title="Tidak ada tugas"
          description={
            filter === 'all'
              ? 'Saat ini tidak ada kasus yang ditugaskan kepada Anda.'
              : `Tidak ada tugas dalam kategori ${filter.replace(/_/g, ' ')}.`
          }
        />
      )}
    </div>
  );
}
