// app/actions/notifications.ts
// Guarded Server Actions for Notification Management, Click-Through Resolution, and Read-State Synchronization
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';

export type NotificationType =
  | 'case_assigned'
  | 'waiting_verification'
  | 'case_closed'
  | 'verification_failed'
  | 'reopened'
  | 'force_closed';

export type NotificationFilterTab = 'all' | 'unread' | 'assignments' | 'case_updates';

export interface NotificationItem {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: { case_id?: string } | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  // Resolved Case Reference (if case exists and accessible)
  caseInfo?: {
    id: string;
    case_number: string;
    title: string;
    warehouse_id: string;
    warehouse_code: string;
    warehouse_name: string;
  } | null;
}

export interface GetNotificationsResult {
  success: boolean;
  error?: string;
  notifications: NotificationItem[];
  totalCount: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ResolveDestinationResult {
  success: boolean;
  error?: string;
  caseId?: string;
  targetWarehouseId?: string;
  targetWarehouseCode?: string;
  isCrossWarehouse?: boolean;
}

/**
 * Validates the authenticated session, active profile status, and forced-password invariant.
 */
async function getAuthenticatedUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'UNAUTHENTICATED', message: 'Sesi login tidak valid atau telah berakhir.' };
  }

  if (user.app_metadata?.must_change_password === true) {
    return {
      error: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Anda wajib mengganti password awal sebelum mengakses notifikasi.',
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_active, is_super_admin')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    return {
      error: 'ACCOUNT_INACTIVE',
      message: 'Akun Anda berstatus nonaktif. Akses data ditolak.',
    };
  }

  return { user, profile, supabase };
}

/**
 * Fetches paginated notifications for the current authenticated caller, with authoritative case & warehouse resolution.
 */
export async function getNotificationsAction(options: {
  page?: number;
  pageSize?: number;
  filter?: NotificationFilterTab;
  warehouseId?: string;
}): Promise<GetNotificationsResult> {
  try {
    const authResult = await getAuthenticatedUser();
    if ('error' in authResult) {
      return {
        success: false,
        error: authResult.message,
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      };
    }

    const { user, supabase } = authResult;
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.max(1, Math.min(50, options.pageSize || 20));
    const filter = options.filter || 'all';

    // 1. Build Query (RLS automatically enforces recipient_id = auth.uid(), active profile, and authorized warehouse)
    let query = supabase
      .from('notifications')
      .select('id, recipient_id, type, title, body, data, is_read, read_at, created_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply Filter Tabs
    if (filter === 'unread') {
      query = query.eq('is_read', false);
    } else if (filter === 'assignments') {
      query = query.in('type', ['case_assigned', 'waiting_verification']);
    } else if (filter === 'case_updates') {
      query = query.in('type', ['case_closed', 'verification_failed', 'reopened', 'force_closed']);
    }

    // Apply pagination range
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const [{ data: rawNotifs, count: totalCount, error: notifErr }, { count: unreadCount, error: unreadErr }] =
      await Promise.all([
        query,
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false),
      ]);

    if (notifErr) {
      console.error('[getNotificationsAction] Query error:', notifErr.message);
      return {
        success: false,
        error: 'Gagal memuat daftar notifikasi.',
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    const notifs = (rawNotifs || []) as any[];

    // 2. Batch resolve referenced cases
    const referencedCaseIds = Array.from(
      new Set(
        notifs
          .map((n) => n.data?.case_id)
          .filter((cid): cid is string => typeof cid === 'string' && cid.length > 0)
      )
    );

    let caseMap = new Map<string, { id: string; case_number: string; title: string; warehouse_id: string; warehouse_code: string; warehouse_name: string }>();

    if (referencedCaseIds.length > 0) {
      const { data: casesData } = await supabase
        .from('cases')
        .select(`
          id,
          case_number,
          title,
          warehouse_id,
          warehouses ( code, name )
        `)
        .in('id', referencedCaseIds);

      if (casesData) {
        for (const c of casesData as any[]) {
          caseMap.set(c.id, {
            id: c.id,
            case_number: c.case_number,
            title: c.title,
            warehouse_id: c.warehouse_id,
            warehouse_code: c.warehouses?.code || '',
            warehouse_name: c.warehouses?.name || '',
          });
        }
      }
    }

    // 3. Map result items with resolved case metadata
    const items: NotificationItem[] = notifs.map((n) => {
      const caseId = n.data?.case_id;
      const caseInfo = caseId ? caseMap.get(caseId) || null : null;

      return {
        id: n.id,
        recipient_id: n.recipient_id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        is_read: n.is_read,
        read_at: n.read_at,
        created_at: n.created_at,
        caseInfo,
      };
    });

    const total = totalCount ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      notifications: items,
      totalCount: total,
      unreadCount: unreadCount ?? 0,
      page,
      pageSize,
      totalPages,
    };
  } catch (err: any) {
    console.error('[getNotificationsAction] Unexpected error:', err.message);
    return {
      success: false,
      error: 'Terjadi kesalahan sistem saat mengambil data notifikasi.',
      notifications: [],
      totalCount: 0,
      unreadCount: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    };
  }
}

/**
 * Authoritative click-through action:
 * Validates caller identity, verifies case existence & active warehouse authorization,
 * marks the notification as read atomically, and returns destination & cross-warehouse instructions.
 */
export async function resolveNotificationDestinationAction(
  notificationId: string,
  currentActiveWarehouseId?: string
): Promise<ResolveDestinationResult> {
  try {
    const authResult = await getAuthenticatedUser();
    if ('error' in authResult) {
      return { success: false, error: authResult.message };
    }

    const { user, supabase } = authResult;

    // 1. Fetch caller-owned notification
    const { data: notif, error: notifErr } = await supabase
      .from('notifications')
      .select('id, recipient_id, type, data, is_read')
      .eq('id', notificationId)
      .maybeSingle();

    if (notifErr || !notif) {
      return {
        success: false,
        error: 'Notifikasi tidak ditemukan atau Anda tidak memiliki akses.',
      };
    }

    const notifData = notif.data as Record<string, any> | null;
    const caseId = notifData?.case_id;
    if (!caseId) {
      // Mark as read and return general destination
      await supabase.rpc('mark_notifications_read', { p_notification_ids: [notificationId] });
      return { success: true };
    }

    // 2. Fetch referenced case & resolve warehouse
    const { data: caseItem, error: caseErr } = await supabase
      .from('cases')
      .select('id, warehouse_id, warehouses(code, name)')
      .eq('id', caseId)
      .maybeSingle();

    if (caseErr || !caseItem) {
      return {
        success: false,
        error: 'Kasus terkait tidak ditemukan atau berada di luar wewenang gudang Anda.',
      };
    }

    // 3. Verify user currently holds active access to that case's warehouse
    const accessibleWarehouses = await getUserWarehouseAccess(user.id);
    const targetWarehouseAccess = accessibleWarehouses.find(
      (w) => w.warehouseId === caseItem.warehouse_id
    );

    if (!targetWarehouseAccess) {
      return {
        success: false,
        error: 'Akses ditolak: Anda tidak lagi memiliki penugasan aktif pada gudang kasus ini.',
      };
    }

    // 4. Mark notification as read ONLY after authorization succeeds
    if (!notif.is_read) {
      await supabase.rpc('mark_notifications_read', { p_notification_ids: [notificationId] });
    }

    const isCrossWarehouse =
      Boolean(currentActiveWarehouseId) && currentActiveWarehouseId !== caseItem.warehouse_id;

    return {
      success: true,
      caseId: caseItem.id,
      targetWarehouseId: caseItem.warehouse_id,
      targetWarehouseCode: (caseItem.warehouses as any)?.code || '',
      isCrossWarehouse,
    };
  } catch (err: any) {
    console.error('[resolveNotificationDestinationAction] Unexpected error:', err.message);
    return {
      success: false,
      error: 'Terjadi kesalahan saat memproses rute notifikasi.',
    };
  }
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsReadAction(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const authResult = await getAuthenticatedUser();
    if ('error' in authResult) {
      return { success: false, error: authResult.message };
    }

    const { supabase } = authResult;
    const { error: rpcErr } = await supabase.rpc('mark_notifications_read', {
      p_notification_ids: [notificationId],
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message };
    }

    revalidatePath('/notifications');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Marks all currently visible unread notifications for the caller as read.
 */
export async function markAllNotificationsAsReadAction(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const authResult = await getAuthenticatedUser();
    if ('error' in authResult) {
      return { success: false, error: authResult.message };
    }

    const { user, supabase } = authResult;

    // Fetch caller's visible unread notification IDs (RLS guarantees active profile & warehouse scope)
    const { data: unreadRows, error: fetchErr } = await supabase
      .from('notifications')
      .select('id')
      .eq('is_read', false);

    if (fetchErr) {
      return { success: false, error: 'Gagal mengambil daftar notifikasi belum dibaca.' };
    }

    const unreadIds = (unreadRows || []).map((r) => r.id);
    if (unreadIds.length === 0) {
      return { success: true, count: 0 };
    }

    const { error: rpcErr } = await supabase.rpc('mark_notifications_read', {
      p_notification_ids: unreadIds,
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message };
    }

    revalidatePath('/notifications');
    return { success: true, count: unreadIds.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Returns the authoritative unread notification count for the current caller.
 */
export async function getUnreadNotificationCountAction(): Promise<{ success: boolean; unreadCount: number }> {
  try {
    const authResult = await getAuthenticatedUser();
    if ('error' in authResult) {
      return { success: false, unreadCount: 0 };
    }

    const { supabase } = authResult;
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    if (error) {
      return { success: false, unreadCount: 0 };
    }

    return { success: true, unreadCount: count ?? 0 };
  } catch {
    return { success: false, unreadCount: 0 };
  }
}
