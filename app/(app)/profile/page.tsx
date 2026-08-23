// app/(app)/profile/page.tsx
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { User, LogOut, Shield, Building2, Mail } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Profil Pengguna' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: userWhs } = await supabase
    .from('user_warehouses')
    .select(`
      warehouse_id,
      warehouses ( code, name ),
      roles ( display_name, name )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true);

  return (
    <div className="page-padding py-5 max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Profil Saya
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Informasi akun dan akses warehouse
        </p>
      </div>

      {/* Profile Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
          {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-900 truncate">
            {profile?.full_name || 'Pengguna'}
          </h2>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{user.email}</span>
          </p>
          {profile?.is_super_admin && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 mt-2">
              <Shield className="w-3 h-3" />
              Super Admin
            </span>
          )}
        </div>
      </div>

      {/* Accessible Warehouses */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Gudang & Role Terdaftar
        </h3>
        <div className="space-y-2">
          {userWhs && userWhs.length > 0 ? (
            userWhs.map((uw: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{uw.warehouses?.name}</p>
                    <p className="text-[11px] text-slate-500">{uw.warehouses?.code}</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                  {uw.roles?.display_name || uw.roles?.name}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">Belum ada penugasan gudang.</p>
          )}
        </div>
      </div>

      {/* Sign Out Button */}
      <form action="/login" className="pt-2">
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-rose-700 font-bold text-xs transition-colors shadow-2xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Akun</span>
        </button>
      </form>
    </div>
  );
}
