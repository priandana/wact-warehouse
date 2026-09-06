'use client';
// components/notifications/NotificationCard.tsx
// High-Density Responsive Notification Card for Warehouse Operations

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldAlert,
  Building2,
  ArrowRight,
  Check,
  Loader2,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils/cn';
import type { NotificationItem, NotificationType } from '@/app/actions/notifications';
import { resolveNotificationDestinationAction, markNotificationAsReadAction } from '@/app/actions/notifications';
import { useActiveWarehouse } from '@/components/shared/layout/AppShellProvider';

interface NotificationCardProps {
  notification: NotificationItem;
  onMarkRead?: (id: string) => void;
  onNavigate?: () => void;
}

interface TypeConfig {
  icon: React.ElementType;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconColor: string;
  label: string;
}

const TYPE_CONFIGS: Record<NotificationType, TypeConfig> = {
  case_assigned: {
    icon: ClipboardCheck,
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badgeText: 'text-blue-700 dark:text-blue-300',
    badgeBorder: 'border-blue-500/20 dark:border-blue-500/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    label: 'Penugasan PIC',
  },
  waiting_verification: {
    icon: Clock,
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    badgeText: 'text-purple-700 dark:text-purple-300',
    badgeBorder: 'border-purple-500/20 dark:border-purple-500/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    label: 'Menunggu Verifikasi',
  },
  case_closed: {
    icon: CheckCircle2,
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-500/20 dark:border-emerald-500/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    label: 'Kasus Selesai',
  },
  verification_failed: {
    icon: XCircle,
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-500/20 dark:border-rose-500/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    label: 'Verifikasi Ditolak',
  },
  reopened: {
    icon: RefreshCw,
    badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBorder: 'border-indigo-500/20 dark:border-indigo-500/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    label: 'Kasus Dibuka Kembali',
  },
  force_closed: {
    icon: ShieldAlert,
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-500/20 dark:border-rose-500/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    label: 'Ditutup Paksa Admin',
  },
  sla_approaching: {
    icon: Clock,
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-500/20 dark:border-amber-500/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    label: 'SLA Mendekati Batas',
  },
  sla_overdue: {
    icon: AlertTriangle,
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-500/20 dark:border-rose-500/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    label: 'SLA Terlewati',
  },
};

export function NotificationCard({ notification, onMarkRead, onNavigate }: NotificationCardProps) {
  const router = useRouter();
  const { activeWarehouseId, switchWarehouse } = useActiveWarehouse();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const config = TYPE_CONFIGS[notification.type] || {
    icon: Bell,
    badgeBg: 'bg-slate-500/10 dark:bg-slate-500/20',
    badgeText: 'text-slate-700 dark:text-slate-300',
    badgeBorder: 'border-slate-500/20 dark:border-slate-500/30',
    iconColor: 'text-slate-600 dark:text-slate-400',
    label: 'Notifikasi',
  };

  const IconComponent = config.icon;

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(notification.created_at), {
        addSuffix: true,
        locale: localeId,
      });
    } catch {
      return 'Baru saja';
    }
  })();

  const handleNavigate = async () => {
    setIsNavigating(true);
    setErrorMessage(null);

    try {
      const result = await resolveNotificationDestinationAction(
        notification.id,
        activeWarehouseId ?? undefined
      );

      if (!result.success) {
        setErrorMessage(result.error || 'Akses ke kasus ditolak.');
        setIsNavigating(false);
        return;
      }

      if (result.isCrossWarehouse && result.targetWarehouseId) {
        // Reuse authoritative switchWarehouse logic
        switchWarehouse(result.targetWarehouseId);
      }

      if (onMarkRead) {
        onMarkRead(notification.id);
      }

      if (onNavigate) {
        onNavigate();
      }

      if (result.caseId) {
        router.push(`/cases/${result.caseId}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
      setIsNavigating(false);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMarkingRead(true);
    try {
      const res = await markNotificationAsReadAction(notification.id);
      if (res.success && onMarkRead) {
        onMarkRead(notification.id);
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const hasCase = Boolean(notification.data?.case_id);
  const caseInfo = notification.caseInfo;

  return (
    <div
      onClick={hasCase ? handleNavigate : undefined}
      className={cn(
        'group relative p-4 rounded-3xl transition-all duration-200 flex flex-col gap-2.5 select-none',
        hasCase ? 'cursor-pointer active:scale-[0.99]' : '',
        notification.is_read
          ? 'neu-raised-sm opacity-85 hover:opacity-100 text-slate-600 dark:text-slate-300'
          : 'neu-raised ring-1 ring-blue-500/30'
      )}
    >
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Type Badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold text-[10.5px] border tracking-tight',
              config.badgeBg,
              config.badgeText,
              config.badgeBorder
            )}
          >
            <IconComponent className={cn('w-3 h-3 shrink-0', config.iconColor)} />
            <span>{config.label}</span>
          </span>

          {/* Warehouse Badge */}
          {caseInfo?.warehouse_code && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono font-bold text-[10px] neu-inset-sm text-slate-700 dark:text-slate-300">
              <Building2 className="w-2.5 h-2.5 text-slate-400" />
              <span>{caseInfo.warehouse_code}</span>
            </span>
          )}

          {/* Case Number */}
          {caseInfo?.case_number && (
            <span className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20 tracking-tight">
              {caseInfo.case_number}
            </span>
          )}
        </div>

        {/* Timestamp & Unread Dot */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">{timeAgo}</span>
          {!notification.is_read && (
            <span
              className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-500/20 shrink-0 animate-pulse"
              title="Belum dibaca"
            />
          )}
        </div>
      </div>

      {/* Title & Body */}
      <div className="space-y-0.5">
        <h4
          className={cn(
            'text-xs sm:text-sm tracking-tight',
            notification.is_read ? 'font-bold text-slate-700 dark:text-slate-300' : 'font-black text-slate-900 dark:text-slate-100'
          )}
        >
          {notification.title}
        </h4>
        {notification.body && (
          <p className="text-[11.5px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
            {notification.body}
          </p>
        )}
      </div>

      {/* Error Alert if Navigation Fails */}
      {errorMessage && (
        <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[11px] font-bold text-rose-700 dark:text-rose-400 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setErrorMessage(null);
            }}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 dark:border-slate-800/60 mt-0.5">
        {hasCase ? (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 group-hover:translate-x-0.5 transition-all">
            {isNavigating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Membuka kasus...</span>
              </>
            ) : (
              <>
                <span>Lihat Kasus</span>
                <ArrowRight className="w-3 h-3" />
              </>
            )}
          </div>
        ) : (
          <div />
        )}

        {!notification.is_read && (
          <button
            type="button"
            onClick={handleMarkAsRead}
            disabled={isMarkingRead}
            className="neu-btn-secondary inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10.5px] font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            title="Tandai sudah dibaca"
          >
            {isMarkingRead ? (
              <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
            ) : (
              <Check className="w-3 h-3 text-slate-400" />
            )}
            <span>Tandai Dibaca</span>
          </button>
        )}
      </div>
    </div>
  );
}
