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
            'inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs font-bold',
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
            'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs font-bold',
            sizeClasses,
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
          <span>Selesai</span>
        </span>
      );
    case 'cancelled':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 shadow-2xs font-bold',
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
            'inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold',
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
            'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs font-bold',
            sizeClasses,
            className
          )}
        >
          {showIcon && <CheckCircle2 className={cn(iconSizes, 'text-emerald-600')} />}
          <span>LOLOS (OK)</span>
        </span>
      );
    case 'ng':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200/80 shadow-2xs font-bold',
            sizeClasses,
            className
          )}
        >
          {showIcon && <AlertOctagon className={cn(iconSizes, 'text-rose-600 animate-pulse')} />}
          <span>TEMUAN DEFECT (NG)</span>
        </span>
      );
    case 'na':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs font-bold',
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
            'inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-bold',
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
