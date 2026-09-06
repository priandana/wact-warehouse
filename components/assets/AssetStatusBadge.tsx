import { cn } from '@/lib/utils/cn';
import {
  CheckCircle2,
  AlertCircle,
  Wrench,
  Archive,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

interface AssetStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function AssetStatusBadge({ status, size = 'md' }: AssetStatusBadgeProps) {
  const statusLower = status?.toLowerCase() || 'active';

  const config: Record<string, { label: string; dotClass: string; className: string }> = {
    active: {
      label: 'Aktif (Ready)',
      dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
      className: 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
    },
    maintenance: {
      label: 'Dalam Maintenance',
      dotClass: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
      className: 'bg-amber-50/90 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
    },
    inactive: {
      label: 'Non-Aktif / Idle',
      dotClass: 'bg-slate-400',
      className: 'bg-slate-100/90 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700',
    },
    retired: {
      label: 'Afkir (Retired)',
      dotClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]',
      className: 'bg-rose-50/90 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50',
    },
  };

  const current = config[statusLower] || config.active;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-bold border rounded-full shrink-0 shadow-xs',
        size === 'sm' ? 'px-2.5 py-0.5 text-[10.5px]' : 'px-3 py-1 text-xs',
        current.className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', current.dotClass)} />
      <span>{current.label}</span>
    </span>
  );
}

interface AssetConditionBadgeProps {
  condition?: string | null;
  size?: 'sm' | 'md';
}

export function AssetConditionBadge({ condition, size = 'sm' }: AssetConditionBadgeProps) {
  const condLower = condition?.toLowerCase() || 'good';

  const config: Record<string, { label: string; dotClass: string; className: string }> = {
    good: {
      label: 'Kondisi Baik',
      dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
      className: 'bg-emerald-50/90 text-emerald-800 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
    },
    fair: {
      label: 'Kondisi Cukup',
      dotClass: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]',
      className: 'bg-blue-50/90 text-blue-800 border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50',
    },
    damaged: {
      label: 'Ada Kerusakan',
      dotClass: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
      className: 'bg-amber-50/90 text-amber-800 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
    },
    critical: {
      label: 'Kritis / Rusak Berat',
      dotClass: 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]',
      className: 'bg-rose-50/90 text-rose-800 border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50',
    },
  };

  const current = config[condLower] || config.good;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-bold border rounded-full shrink-0 shadow-xs',
        size === 'sm' ? 'px-2.5 py-0.5 text-[10.5px]' : 'px-3 py-1 text-xs',
        current.className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', current.dotClass)} />
      <span>{current.label}</span>
    </span>
  );
}
