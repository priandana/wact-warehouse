'use client';
// components/notifications/NotificationDropdownFlyout.tsx
// Desktop Topbar Notification Flyout Menu with Real-Time Data

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ArrowRight,
  Loader2,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils/cn';
import type { NotificationItem } from '@/app/actions/notifications';
import {
  getNotificationsAction,
  markAllNotificationsAsReadAction,
  resolveNotificationDestinationAction,
} from '@/app/actions/notifications';
import { useActiveWarehouse } from '@/components/shared/layout/AppShellProvider';

interface NotificationDropdownFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onUnreadCountChange: (count: number) => void;
}

export function NotificationDropdownFlyout({
  isOpen,
  onClose,
  unreadCount,
  onUnreadCountChange,
}: NotificationDropdownFlyoutProps) {
  const router = useRouter();
  const { activeWarehouseId, switchWarehouse } = useActiveWarehouse();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);

  // Load recent notifications when opened
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    getNotificationsAction({ page: 1, pageSize: 5, filter: 'all' })
      .then((res) => {
        if (isMounted && res.success) {
          setNotifications(res.notifications);
          onUnreadCountChange(res.unreadCount);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, onUnreadCountChange]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMarkingAll(true);
    try {
      const res = await markAllNotificationsAsReadAction();
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        );
        onUnreadCountChange(0);
      }
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleItemClick = async (notif: NotificationItem) => {
    try {
      const result = await resolveNotificationDestinationAction(
        notif.id,
        activeWarehouseId ?? undefined
      );

      if (result.success) {
        if (result.isCrossWarehouse && result.targetWarehouseId) {
          switchWarehouse(result.targetWarehouseId);
        }

        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        onUnreadCountChange(Math.max(0, unreadCount - 1));
        onClose();

        if (result.caseId) {
          router.push(`/cases/${result.caseId}`);
        }
      }
    } catch (err) {
      console.error('Error opening notification from flyout:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={flyoutRef}
      className="absolute right-0 top-12 w-[360px] bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
    >
      {/* ── 1. Flyout Header ────────────────────────────────────────────── */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-xs text-slate-900">Notifikasi</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700">
              {unreadCount} Baru
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline disabled:opacity-50"
          >
            {isMarkingAll ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCheck className="w-3 h-3" />
            )}
            <span>Tandai dibaca</span>
          </button>
        )}
      </div>

      {/* ── 2. Notification List ────────────────────────────────────────── */}
      <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Memuat notifikasi...</span>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notif) => {
            const timeAgo = (() => {
              try {
                return formatDistanceToNow(new Date(notif.created_at), {
                  addSuffix: true,
                  locale: localeId,
                });
              } catch {
                return 'Baru saja';
              }
            })();

            return (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={cn(
                  'p-3 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-start gap-2.5 select-none',
                  !notif.is_read ? 'bg-blue-50/30' : ''
                )}
              >
                {!notif.is_read ? (
                  <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-100 shrink-0 mt-1.5" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-200 shrink-0 mt-1.5" />
                )}

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={cn(
                        'text-xs truncate',
                        notif.is_read ? 'font-medium text-slate-700' : 'font-extrabold text-slate-900'
                      )}
                    >
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0">{timeAgo}</span>
                  </div>

                  {notif.body && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 font-normal">{notif.body}</p>
                  )}

                  {notif.caseInfo?.case_number && (
                    <div className="flex items-center gap-1 text-[10px] pt-0.5">
                      <span className="font-bold text-blue-700 font-mono">
                        {notif.caseInfo.case_number}
                      </span>
                      {notif.caseInfo.warehouse_code && (
                        <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                          {notif.caseInfo.warehouse_code}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 space-y-1">
            <CheckCircle2 className="w-6 h-6 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-600">Tidak ada notifikasi</p>
            <p className="text-[11px]">Semua notifikasi sudah dibaca.</p>
          </div>
        )}
      </div>

      {/* ── 3. Flyout Footer ────────────────────────────────────────────── */}
      <div className="p-2.5 border-t border-slate-100 bg-slate-50/70 text-center">
        <Link
          href="/notifications"
          onClick={onClose}
          className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-slate-100 transition-colors"
        >
          <span>Lihat Semua Notifikasi</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
