// app/(app)/dashboard/page.tsx
// Dashboard home page — Phase 1 placeholder (content built in Phase 2)

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="page-padding py-6">
      <h1 className="text-xl font-bold text-[--color-text-primary] mb-2">Selamat datang 👋</h1>
      <p className="text-sm text-[--color-text-secondary]">
        Dashboard WACT sedang dibangun. Phase 2 akan menampilkan ringkasan kasus, asset, dan inspeksi.
      </p>
    </div>
  );
}
