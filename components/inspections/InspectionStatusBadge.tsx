import { cn } from '@/lib/utils/cn';
import {
  CheckCircle2,
  AlertOctagon,
  MinusCircle,
  Clock,
  CheckCircle,
  XCircle,
  FileEdit,
} from 'lucide-react';

export type InspectionStatus = 'draft' | 'completed' | 'cancelled' | string;
export type OverallResult = 'ok' | 'ng' | 'na' | null | string;

interface StatusBadgeProps {
  status: InspectionStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function InspectionStatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] sm:text-[11px] px-2.5 py-0.5 font-extrabold uppercase tracking-wider',
    md: 'text-xs px-3 py-1 font-extrabold uppercase tracking-wider',
    lg: 'text-sm px-3.5 py-1.5 font-black uppercase tracking-wider',
  }[size];

  switch (status?.toLowerCase()) {
    case 'draft':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-bold',
            sizeClasses,
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span>Draft (Berjalan)</span>
        </span>
      );
    case 'completed':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-bold',
            sizeClasses,
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
          <span>Selesai</span>
        </span>
      );
    case 'cancelled':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 font-bold',
            sizeClasses,
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
          <span>Dibatalkan</span>
        </span>
      );
    default:
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-black/[0.06] dark:border-white/[0.06] font-bold',
            sizeClasses,
            className
          )}
        >
          <span>{status}</span>
        </span>
      );
  }
}

interface OverallResultBadgeProps {
  result: OverallResult;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function OverallResultBadge({
  result,
  size = 'sm',
  showIcon = true,
  className,
}: OverallResultBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] sm:text-[11px] px-2.5 py-0.5 font-extrabold uppercase tracking-wider',
    md: 'text-xs px-3 py-1 font-extrabold uppercase tracking-wider',
    lg: 'text-sm px-3.5 py-1.5 font-black uppercase tracking-wider',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  switch (result?.toLowerCase()) {
    case 'ok':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-bold',
            sizeClasses,
            className
          )}
        >
          {showIcon && <CheckCircle2 className={cn(iconSizes, 'text-emerald-600 dark:text-emerald-400')} />}
          <span>LOLOS (OK)</span>
        </span>
      );
    case 'ng':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30 font-bold',
            sizeClasses,
            className
          )}
        >
          {showIcon && <AlertOctagon className={cn(iconSizes, 'text-rose-600 dark:text-rose-400 animate-pulse')} />}
          <span>TEMUAN DEFECT (NG)</span>
        </span>
      );
    case 'na':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 font-bold',
            sizeClasses,
            className
          )}
        >
          {showIcon && <MinusCircle className={cn(iconSizes, 'text-slate-400')} />}
          <span>TIDAK BERLAKU (N/A)</span>
        </span>
      );
    default:
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-black/[0.06] dark:border-white/[0.06] font-bold',
            sizeClasses,
            className
          )}
        >
          {showIcon && <Clock className={iconSizes} />}
          <span>Belum Selesai</span>
        </span>
      );
  }
}
