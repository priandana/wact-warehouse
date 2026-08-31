// app/(app)/profile/page.tsx
// Authoritative User Profile & Multi-Role Warehouse Identity View

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ShieldAlert, Building2, Mail, CheckCircle2 } from 'lucide-react';
import { ProfileSignOutButton } from '@/components/profile/ProfileSignOutButton';
import { RoleBadge } from '@/components/users/RoleBadge';
import { getInitials, sortRoles } from '@/lib/utils/rolePresentation';
import { getUserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';

export const metadata: Metadata = { title: 'Profil Pengguna' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Parallel fetch: profile, raw memberships, and validated accessible warehouses
  const [
    { data: profile },
    { data: userWhs },
    accessibleWarehouses,
    cookieStore,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('user_warehouses')
      .select(`
        warehouse_id,
        warehouses ( id, code, name ),
        roles ( id, name, display_name )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true),
    getUserWarehouseAccess(user.id),
    cookies(),
  ]);

  // Determine validated active warehouse ID
  const activeWarehouseCookie = cookieStore.get('wact_active_warehouse_id')?.value;
  let activeWarehouse = accessibleWarehouses.find((w) => w.warehouseId === activeWarehouseCookie);
  if (!activeWarehouse && accessibleWarehouses.length > 0) {
    const pdlWh = accessibleWarehouses.find(
      (w) => w.warehouseCode === 'WH-PDL' || w.warehouseCode === 'PDL' || w.warehouseName.toLowerCase().includes('padalarang')
    );
    activeWarehouse = pdlWh ?? accessibleWarehouses[0];
  }
  const activeWarehouseId = activeWarehouse?.warehouseId;

  // Group roles by warehouse
  const membershipsByWarehouse = new Map<
    string,
    { warehouse: { id: string; code: string; name: string }; roles: Array<{ id: string; name: string; display_name: string }> }
  >();

  if (profile?.is_super_admin) {
    // Super Admin has global access to all accessible warehouses as Administrator
    for (const wh of accessibleWarehouses) {
      membershipsByWarehouse.set(wh.warehouseId, {
        warehouse: { id: wh.warehouseId, code: wh.warehouseCode, name: wh.warehouseName },
        roles: [{ id: `admin-${wh.warehouseId}`, name: 'admin', display_name: 'Administrator' }],
      });
    }
  } else if (userWhs && userWhs.length > 0) {
    for (const uw of userWhs) {
      const wh = (uw.warehouses as any) || { id: uw.warehouse_id, code: 'WH', name: 'Warehouse' };
      const role = uw.roles as any;
      if (!membershipsByWarehouse.has(uw.warehouse_id)) {
        membershipsByWarehouse.set(uw.warehouse_id, {
          warehouse: wh,
          roles: [],
        });
      }
      if (role) {
        membershipsByWarehouse.get(uw.warehouse_id)!.roles.push(role);
      }
    }
  }

  const isSuperAdmin = profile?.is_super_admin ?? false;
  const isProfileActive = profile?.is_active ?? true;

  return (
    <div className="page-padding py-5 max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Profil Saya
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Identitas akun dan penugasan peran per gudang
        </p>
      </div>

      {/* Profile Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-base flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            {getInitials(profile?.full_name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 truncate">
                {profile?.full_name || 'Pengguna'}
              </h2>
              {isSuperAdmin && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  <ShieldAlert className="w-3 h-3" />
                  Super Admin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate font-mono">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{user.email}</span>
            </p>
          </div>
        </div>

        {/* Global Account Status */}
        <div className="shrink-0">
          {isProfileActive ? (
            <span className="inline-flex items-center text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Aktif
            </span>
          ) : (
            <span className="inline-flex items-center text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Nonaktif
            </span>
          )}
        </div>
      </div>

      {/* Accessible Warehouses Grouped */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Penugasan & Peran Gudang ({membershipsByWarehouse.size})
        </h3>

        {membershipsByWarehouse.size === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">Belum ada penugasan gudang aktif.</p>
        ) : (
          <div className="space-y-2.5">
            {Array.from(membershipsByWarehouse.values()).map(({ warehouse, roles }) => {
              const sortedRoles = sortRoles(roles);
              const isActiveWh = warehouse.id === activeWarehouseId;

              return (
                <div
                  key={warehouse.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isActiveWh
                      ? 'bg-blue-50/50 border-blue-200/90 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        <Building2 className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {warehouse.name}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                            {warehouse.code}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isActiveWh && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200 shrink-0 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        Gudang Aktif
                      </span>
                    )}
                  </div>

                  {/* Multi-role chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pl-9">
                    {sortedRoles.map((r) => (
                      <RoleBadge key={r.id} roleName={r.name} displayName={r.display_name} size="sm" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sign Out Button */}
      <div className="pt-2">
        <ProfileSignOutButton />
      </div>
    </div>
  );
}
