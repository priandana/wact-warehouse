// components/integrity/IntegrityAnnouncementBanner.tsx
// Public Announcement Banner for /integrity/report and /integrity/track
// Dynamically styled based on announcement type (info, important, warning) with Light & Dark support.
// Compact mobile geometry with zero text clipping.

import { Info, AlertTriangle, AlertCircle, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { PublicAnnouncementDisplay, IntegrityAnnouncementType } from '@/lib/integrity/types';

interface IntegrityAnnouncementBannerProps {
  announcement: PublicAnnouncementDisplay | null;
  className?: string;
  onOpenModal?: () => void;
}

const TYPE_CONFIG: Record<
  IntegrityAnnouncementType,
  {
    icon: typeof Info;
    containerClass: string;
    iconBgClass: string;
    iconColorClass: string;
    badgeLabel: string;
    badgeClass: string;
  }
> = {
  info: {
    icon: Info,
    containerClass:
      'neu-raised-sm bg-blue-500/10 border-blue-500/20 text-blue-950 dark:text-blue-200',
    iconBgClass: 'neu-icon-well bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25',
    iconColorClass: 'text-blue-600 dark:text-blue-400',
    badgeLabel: 'Informasi',
    badgeClass: 'neu-inset-sm bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/20',
  },
  important: {
    icon: AlertCircle,
    containerClass:
      'neu-raised-sm bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-200',
    iconBgClass: 'neu-icon-well bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
    badgeLabel: 'Penting',
    badgeClass: 'neu-inset-sm bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/20',
  },
  warning: {
    icon: AlertTriangle,
    containerClass:
      'neu-raised-sm bg-rose-500/10 border-rose-500/20 text-rose-950 dark:text-rose-200',
    iconBgClass: 'neu-icon-well bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25',
    iconColorClass: 'text-rose-600 dark:text-rose-400',
    badgeLabel: 'Peringatan',
    badgeClass: 'neu-inset-sm bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/20',
  },
};

export function IntegrityAnnouncementBanner({
  announcement,
  className,
  onOpenModal,
}: IntegrityAnnouncementBannerProps) {
  if (!announcement) return null;

  const typeConfig = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info;
  const IconComp = typeConfig.icon;

  return (
    <div
      className={cn(
        'p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl border flex items-start gap-2.5 sm:gap-3.5 transition-all w-full min-w-0',
        typeConfig.containerClass,
        className
      )}
    >
      <div
        className={cn(
          'w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
          typeConfig.iconBgClass
        )}
      >
        <IconComp className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md border',
                typeConfig.badgeClass
              )}
            >
              {typeConfig.badgeLabel}
            </span>
            <h4 className="font-black text-xs sm:text-sm tracking-tight break-words">
              {announcement.title}
            </h4>
          </div>

          {onOpenModal && (
            <button
              type="button"
              onClick={onOpenModal}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer ml-auto shrink-0"
            >
              <span>Detail</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <p className="text-[11.5px] sm:text-xs leading-relaxed opacity-90 break-words whitespace-pre-wrap">
          {announcement.body}
        </p>
      </div>
    </div>
  );
}
