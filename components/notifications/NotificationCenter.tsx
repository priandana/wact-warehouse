'use client';
// components/notifications/NotificationCenter.tsx
// Operational Notification Command Center with Real-Time Invalidation, Filter Tabs & Pagination

import { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Bell,
  CheckCheck,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  BellOff,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { EmptyState } from '@/components/shared/EmptyState';
import { NotificationCard } from './NotificationCard';
import type {
  NotificationItem,
  NotificationFilterTab,
} from '@/app/actions/notifications';
import {
  getNotificationsAction,
  markAllNotificationsAsReadAction,
} from '@/app/actions/notifications';

interface NotificationCenterProps {
  initialNotifications: NotificationItem[];
  initialTotalCount: number;
  initialUnreadCount: number;
  initialPage: number;
  initialPageSize: number;
  userId: string;
}

const FILTER_TABS: { id: NotificationFilterTab; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'unread', label: 'Belum Dibaca' },
  { id: 'assignments', label: 'Penugasan & Verifikasi' },
  { id: 'case_updates', label: 'Pembaruan Kasus' },
];

export function NotificationCenter({
  initialNotifications,
  initialTotalCount,
  initialUnreadCount,
  initialPage,
  initialPageSize,
  userId,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [page, setPage] = useState(initialPage);
  const [activeFilter, setActiveFilter] = useState<NotificationFilterTab>('all');
  const [isPending, startTransition] = useTransition();
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchLatestNotifications = useCallback(
    async (targetPage: number = page, targetFilter: NotificationFilterTab = activeFilter) => {
      startTransition(async () => {
        const res = await getNotificationsAction({
          page: targetPage,
          pageSize: initialPageSize,
          filter: targetFilter,
        });

        if (res.success) {
          setNotifications(res.notifications);
          setTotalCount(res.totalCount);
          setUnreadCount(res.unreadCount);
          setPage(res.page);
        }
      });
    },
    [page, activeFilter, initialPageSize]
  );

  // 1. Realtime Invalidation Channel Subscription
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`notification-center-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          // Re-fetch authoritative state upon Realtime invalidation signal
          fetchLatestNotifications(page, activeFilter);
        }
      )
      .subscribe();

    // Window focus reconciliation
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLatestNotifications(page, activeFilter);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, page, activeFilter, fetchLatestNotifications]);

  const handleFilterChange = (tabId: NotificationFilterTab) => {
    setActiveFilter(tabId);
    setPage(1);
    fetchLatestNotifications(1, tabId);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    setPage(newPage);
    fetchLatestNotifications(newPage, activeFilter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkSingleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    setFeedbackMsg(null);
    try {
      const res = await markAllNotificationsAsReadAction();
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
        setFeedbackMsg('Semua notifikasi berhasil ditandai telah dibaca.');
        setTimeout(() => setFeedbackMsg(null), 3500);
      }
    } catch (err: any) {
      setFeedbackMsg(err.message || 'Gagal menandai notifikasi.');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const totalPages = Math.ceil(totalCount / initialPageSize);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150 pb-8">
      {/* ── 1. Header Banner & Action Bar ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Pusat Notifikasi
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                {unreadCount} Baru
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Monitoring penugasan kasus, pembaruan status verifikasi, dan penyelesaian
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => fetchLatestNotifications(page, activeFilter)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 transition-all active:scale-95 disabled:opacity-60"
            title="Muat ulang notifikasi"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isPending && 'animate-spin text-blue-600')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll || isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 transition-all active:scale-95 disabled:opacity-60 shadow-2xs"
            >
              {isMarkingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              <span>Tandai Semua Dibaca</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedbackMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* ── 2. Filter Tabs Bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleFilterChange(tab.id)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 flex items-center gap-1.5',
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              )}
            >
              <span>{tab.label}</span>
              {tab.id === 'unread' && unreadCount > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 text-[10px] font-extrabold rounded-full',
                    isActive ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'
                  )}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 3. Notification List Container ───────────────────────────────── */}
      <div className="space-y-2.5">
        {isPending && (
          <div className="flex items-center justify-center py-4 text-xs font-bold text-slate-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Memperbarui notifikasi...</span>
          </div>
        )}

        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <NotificationCard
              key={notif.id}
              notification={notif}
              onMarkRead={handleMarkSingleRead}
            />
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-2xs">
            {activeFilter === 'unread' ? (
              <EmptyState
                icon={CheckCircle2}
                title="Semua Notifikasi Sudah Dibaca"
                description="Tidak ada notifikasi baru yang memerlukan perhatian Anda saat ini."
              />
            ) : (
              <EmptyState
                icon={BellOff}
                title="Belum Ada Notifikasi"
                description="Semua penugasan kasus, pembaruan verifikasi, dan status operasional akan muncul di sini."
              />
            )}
          </div>
        )}
      </div>

      {/* ── 4. Pagination Bar ───────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-2xs mt-4">
          <p className="text-xs font-semibold text-slate-500">
            Halaman <span className="font-extrabold text-slate-900">{page}</span> dari{' '}
            <span className="font-extrabold text-slate-900">{totalPages}</span> ({totalCount} total)
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || isPending}
              className="p-1.5 rounded-lg border border-slate-200/80 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || isPending}
              className="p-1.5 rounded-lg border border-slate-200/80 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              title="Halaman Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
