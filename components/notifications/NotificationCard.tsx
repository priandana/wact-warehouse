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
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200/80',
    iconColor: 'text-blue-600',
    label: 'Penugasan PIC',
  },
  waiting_verification: {
    icon: Clock,
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200/80',
    iconColor: 'text-amber-600',
    label: 'Menunggu Verifikasi',
  },
  case_closed: {
    icon: CheckCircle2,
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200/80',
    iconColor: 'text-emerald-600',
    label: 'Kasus Selesai',
  },
  verification_failed: {
    icon: XCircle,
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200/80',
    iconColor: 'text-rose-600',
    label: 'Verifikasi Ditolak',
  },
  reopened: {
    icon: RefreshCw,
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200/80',
    iconColor: 'text-purple-600',
    label: 'Kasus Dibuka Kembali',
  },
  force_closed: {
    icon: ShieldAlert,
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200/80',
    iconColor: 'text-rose-600',
    label: 'Ditutup Paksa Admin',
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
    badgeBg: 'bg-slate-50',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
    iconColor: 'text-slate-600',
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
        'group relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col gap-2.5 select-none',
        hasCase ? 'cursor-pointer hover:shadow-xs active:scale-[0.99]' : '',
        notification.is_read
          ? 'bg-white/70 border-slate-200/70 hover:bg-white hover:border-slate-300/80 text-slate-600'
          : 'bg-white border-blue-200/90 shadow-2xs shadow-blue-500/5 hover:border-blue-300'
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
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200/80">
              <Building2 className="w-2.5 h-2.5 text-slate-400" />
              <span>{caseInfo.warehouse_code}</span>
            </span>
          )}

          {/* Case Number */}
          {caseInfo?.case_number && (
            <span className="text-[11px] font-extrabold text-blue-700 tracking-tight font-mono">
              {caseInfo.case_number}
            </span>
          )}
        </div>

        {/* Timestamp & Unread Dot */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10.5px] font-medium text-slate-400">{timeAgo}</span>
          {!notification.is_read && (
            <span
              className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-100 shrink-0 animate-pulse"
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
            notification.is_read ? 'font-semibold text-slate-700' : 'font-extrabold text-slate-900'
          )}
        >
          {notification.title}
        </h4>
        {notification.body && (
          <p className="text-[11.5px] sm:text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
            {notification.body}
          </p>
        )}
      </div>

      {/* Error Alert if Navigation Fails */}
      {errorMessage && (
        <div className="p-2 rounded-xl bg-rose-50 border border-rose-200/80 text-[11px] font-bold text-rose-700 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setErrorMessage(null);
            }}
            className="text-rose-500 hover:text-rose-700 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-0.5">
        {hasCase ? (
          <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all">
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
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all"
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
