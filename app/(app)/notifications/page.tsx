// app/(app)/notifications/page.tsx
// Operational Notification Center — Server Component with Authoritative Data Prefetching

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { getNotificationsAction } from '@/app/actions/notifications';

export const metadata: Metadata = {
  title: 'Pusat Notifikasi',
  description: 'Pemberitahuan penugasan kasus, pembaruan verifikasi, dan status operasional gudang',
};

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Prefetch initial notifications (Page 1, 20 items, All filter)
  const initialData = await getNotificationsAction({
    page: 1,
    pageSize: 20,
    filter: 'all',
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <NotificationCenter
        initialNotifications={initialData.notifications}
        initialTotalCount={initialData.totalCount}
        initialUnreadCount={initialData.unreadCount}
        initialPage={initialData.page}
        initialPageSize={initialData.pageSize}
        userId={user.id}
      />
    </div>
  );
}
