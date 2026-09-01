// app/(app)/integrity/settings/page.tsx
// Integrity Center Settings & Public Announcement Management Page
// Strictly guarded: Only Global Super Admin may access this page.

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getUserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';
import { IntegritySettingsClient } from '@/components/integrity/IntegritySettingsClient';
import { getIntegritySettingsAnnouncements } from '@/lib/integrity/actions';
import { Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pengaturan & Pengumuman Integritas — WACT',
  description: 'Kelola pengumuman publik dan transparansi sistem Integrity Center.',
};

export const dynamic = 'force-dynamic';

export default async function IntegritySettingsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Fetch user profile & super admin status
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single();

  const isSuperAdmin = profile?.is_super_admin === true;

  if (!isSuperAdmin) {
    return (
      <div className="page-padding py-8 max-w-xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              Akses Ditolak — Super Admin Only
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Hanya <strong>Global Super Admin</strong> yang memiliki wewenang untuk mengelola pengumuman dan pengaturan publik Integrity Center.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/integrity"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all min-h-[44px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Integrity Center</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fetch accessible warehouses to get active context
  const [accessibleWarehouses, cookieStore] = await Promise.all([
    getUserWarehouseAccess(user.id),
    cookies(),
  ]);

  const activeWarehouseCookie = cookieStore.get('wact_active_warehouse_id')?.value;
  let activeWarehouse = accessibleWarehouses.find((w) => w.warehouseId === activeWarehouseCookie);
  if (!activeWarehouse) {
    activeWarehouse = accessibleWarehouses[0] || {
      warehouseId: 'global',
      warehouseCode: 'ALL',
      warehouseName: 'Semua Gudang',
      warehouseTimezone: 'Asia/Jakarta',
      roles: ['super_admin'],
    };
  }

  // 3. Fetch announcements
  const res = await getIntegritySettingsAnnouncements();
  const announcements = res.announcements || [];

  return (
    <IntegritySettingsClient
      initialAnnouncements={announcements}
      warehouseName={activeWarehouse.warehouseName}
      warehouseCode={activeWarehouse.warehouseCode}
    />
  );
}
