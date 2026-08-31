// app/(app)/layout.tsx
// Protected app layout — fetches session, profile, and warehouse access with strict error discrimination.

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getUserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';
import { AppShellProvider } from '@/components/shared/layout/AppShellProvider';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 1. Unauthenticated or session expired
  if (!user || authError) {
    redirect('/login');
  }

  // 1b. Mandatory first-login password change guard
  if (user.app_metadata?.must_change_password === true) {
    redirect('/change-password');
  }

  // 2. Fetch profile with explicit error checking
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, is_active, is_super_admin')
    .eq('id', user.id)
    .maybeSingle();

  // Condition: PROFILE_QUERY_FAILED
  if (profileError) {
    console.error(`[AppLayout] PROFILE_QUERY_FAILED: User ${user.id} query returned error: ${profileError.message} (code: ${profileError.code})`);
    // Do NOT sign out or mask as account_inactive. Allow fallback or redirect with explicit code.
  }

  // Condition: PROFILE_NOT_FOUND
  if (!profile && !profileError) {
    console.warn(`[AppLayout] PROFILE_NOT_FOUND: No profile row found for user ${user.id}`);
    redirect('/login?error=profile_not_found');
  }

  // Condition: ACCOUNT_INACTIVE (Only if profile explicitly exists and is_active === false)
  if (profile && profile.is_active === false) {
    console.warn(`[AppLayout] ACCOUNT_INACTIVE: Account ${user.id} is deactivated`);
    await supabase.auth.signOut();
    redirect('/login?error=account_inactive');
  }

  // 3. Fetch warehouse access
  const warehouseAccess = await getUserWarehouseAccess(user.id);

  // Condition: NO_WAREHOUSE_ACCESS (Non-superadmin with zero active warehouses)
  const isSuperAdmin = profile?.is_super_admin ?? false;
  if (warehouseAccess.length === 0 && !isSuperAdmin) {
    console.warn(`[AppLayout] NO_WAREHOUSE_ACCESS: User ${user.id} has 0 active warehouse assignments`);
    // We can still render AppShell so the user can see their profile / contact admin, or pass empty access
  }

  // Diagnostics summary (Safe: non-sensitive metadata only)
  console.log(`[AppLayout] Session verified: user=${user.id}, active=${profile?.is_active ?? 'unknown'}, super_admin=${isSuperAdmin}, warehouses=${warehouseAccess.length}`);

  const displayName = profile?.full_name || user.email || 'Pengguna';

  return (
    <AppShellProvider
      warehouseAccess={warehouseAccess}
      userName={displayName}
      isSuperAdmin={isSuperAdmin}
    >
      {children}
    </AppShellProvider>
  );
}
