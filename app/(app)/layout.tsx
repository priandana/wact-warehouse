// app/(app)/layout.tsx
// Protected app layout — fetches session, warehouse access, wraps in AppShell.

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getUserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';
import { AppShellProvider } from '@/components/shared/layout/AppShellProvider';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile + warehouse access
  const [{ data: profileData }, warehouseAccess] = await Promise.all([
    supabase.from('profiles').select('full_name, is_active').eq('id', user.id).single(),
    getUserWarehouseAccess(user.id),
  ]);

  const profile = profileData as { full_name: string; is_active: boolean } | null;

  // Deactivated account
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    redirect('/login?error=account_inactive');
  }

  return (
    <AppShellProvider
      warehouseAccess={warehouseAccess}
      userName={profile?.full_name ?? user.email ?? ''}
    >
      {children}
    </AppShellProvider>
  );
}
