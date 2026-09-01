// components/integrity/IntegrityAnnouncementBanner.tsx
// Public Announcement Banner for /integrity/report and /integrity/track
// Dynamically styled based on announcement type (info, important, warning) with Light & Dark support.

import { Info, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { PublicAnnouncementDisplay, IntegrityAnnouncementType } from '@/lib/integrity/types';

interface IntegrityAnnouncementBannerProps {
  announcement: PublicAnnouncementDisplay | null;
  className?: string;
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
      'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200/90 dark:border-blue-800/60 text-blue-950 dark:text-blue-200',
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400',
    iconColorClass: 'text-blue-600 dark:text-blue-400',
    badgeLabel: 'Informasi',
    badgeClass: 'bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700/60',
  },
  important: {
    icon: AlertCircle,
    containerClass:
      'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/90 dark:border-amber-800/60 text-amber-950 dark:text-amber-200',
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
    badgeLabel: 'Penting',
    badgeClass: 'bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700/60',
  },
  warning: {
    icon: AlertTriangle,
    containerClass:
      'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200/90 dark:border-rose-800/60 text-rose-950 dark:text-rose-200',
    iconBgClass: 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400',
    iconColorClass: 'text-rose-600 dark:text-rose-400',
    badgeLabel: 'Peringatan',
    badgeClass: 'bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-700/60',
  },
};

export function IntegrityAnnouncementBanner({
  announcement,
  className,
}: IntegrityAnnouncementBannerProps) {
  if (!announcement) return null;

  const typeConfig = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info;
  const IconComp = typeConfig.icon;

  return (
    <div
      className={cn(
        'p-4 sm:p-5 rounded-2xl border shadow-xs flex items-start gap-3.5 transition-all',
        typeConfig.containerClass,
        className
      )}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
          typeConfig.iconBgClass
        )}
      >
        <IconComp className="w-5 h-5" />
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border',
              typeConfig.badgeClass
            )}
          >
            {typeConfig.badgeLabel}
          </span>
          <h4 className="font-extrabold text-xs sm:text-sm tracking-tight">
            {announcement.title}
          </h4>
        </div>
        <p className="text-xs leading-relaxed opacity-90 whitespace-pre-wrap">
          {announcement.body}
        </p>
      </div>
    </div>
  );
}
