// components/users/UserCard.tsx
'use client';

import React from 'react';
import { Shield, ShieldAlert, Phone, Mail, Building2, MoreHorizontal, Edit3, Settings, Ban, RotateCcw, Lock } from 'lucide-react';
import { RoleBadge } from './RoleBadge';

export interface UserWarehouseMembership {
  id: string;
  warehouse_id: string;
  is_active: boolean;
  warehouses?: { id: string; code: string; name: string };
  roles?: { id: string; name: string; display_name: string };
}

export interface UserItem {
  id: string;
  fullName: string;
  email: string;
  employeeId?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  memberships: UserWarehouseMembership[];
}

interface UserCardProps {
  user: UserItem;
  isCallerSuperAdmin: boolean;
  activeWarehouseId: string;
  activeWarehouseCode: string;
  onEditProfile: (user: UserItem) => void;
  onManageAccess: (user: UserItem, warehouseId: string) => void;
  onToggleGlobalAccount: (user: UserItem) => void;
}

export function UserCard({
  user,
  isCallerSuperAdmin,
  activeWarehouseId,
  activeWarehouseCode,
  onEditProfile,
  onManageAccess,
  onToggleGlobalAccount,
}: UserCardProps) {
  // Check if target user is privileged
  const isTargetPrivileged =
    user.isSuperAdmin ||
    user.memberships.some((m) => m.is_active && (m.roles?.name === 'admin' || m.roles?.name === 'regional_manager'));

  // If caller is NOT Super Admin, can they mutate this target?
  const canCallerMutate = isCallerSuperAdmin || !isTargetPrivileged;

  // Group active memberships by warehouse
  const activeMemberships = user.memberships.filter((m) => m.is_active);
  const membershipsByWarehouse = new Map<string, { warehouse: any; roles: any[] }>();

  for (const m of activeMemberships) {
    const whId = m.warehouse_id;
    if (!membershipsByWarehouse.has(whId)) {
      membershipsByWarehouse.set(whId, {
        warehouse: m.warehouses || { id: whId, code: 'WH', name: 'Warehouse' },
        roles: [],
      });
    }
    if (m.roles) {
      membershipsByWarehouse.get(whId)!.roles.push(m.roles);
    }
  }

  // Get active roles in current warehouse
  const currentWhGroup = membershipsByWarehouse.get(activeWarehouseId);
  const currentWhRoles = currentWhGroup?.roles || [];

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl bg-white border transition-all shadow-xs hover:shadow-md flex flex-col justify-between gap-4 ${
        !user.isActive
          ? 'border-slate-200/60 bg-slate-50/50 opacity-75'
          : isTargetPrivileged
          ? 'border-blue-200/80 bg-gradient-to-b from-blue-50/20 to-white'
          : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      {/* Top Identity Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Avatar with Initials */}
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
              user.isSuperAdmin
                ? 'bg-gradient-to-tr from-rose-600 to-indigo-600 text-white shadow-rose-500/20'
                : !user.isActive
                ? 'bg-slate-200 text-slate-500'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/20'
            }`}
          >
            {user.fullName?.[0]?.toUpperCase() || 'U'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-slate-900 truncate">{user.fullName}</h3>
              {user.isSuperAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  <ShieldAlert className="w-3 h-3" />
                  Super Admin
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate font-mono">
              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{user.email}</span>
            </p>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {user.employeeId && (
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  ID: {user.employeeId}
                </span>
              )}
              {user.phone && (
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Phone className="w-2.5 h-2.5 text-slate-400" />
                  {user.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Active Status */}
        <div className="shrink-0">
          {user.isActive ? (
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

      {/* Warehouse Roles Section */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Penugasan & Peran Gudang
        </span>

        {membershipsByWarehouse.size === 0 ? (
          <p className="text-xs text-slate-400 italic">Belum ada akses gudang aktif.</p>
        ) : (
          <div className="space-y-1.5">
            {Array.from(membershipsByWarehouse.values()).map(({ warehouse, roles }) => (
              <div
                key={warehouse.id}
                className={`p-2 rounded-xl flex items-center justify-between gap-2 text-xs ${
                  warehouse.id === activeWarehouseId
                    ? 'bg-blue-50/60 border border-blue-100'
                    : 'bg-slate-50 border border-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded ${
                      warehouse.id === activeWarehouseId
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {warehouse.code}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap min-w-0">
                    {roles.map((r) => (
                      <RoleBadge key={r.id} roleName={r.name} displayName={r.display_name} size="sm" />
                    ))}
                  </div>
                </div>

                {/* Manage Access shortcut for this warehouse */}
                {canCallerMutate && (
                  <button
                    type="button"
                    onClick={() => onManageAccess(user, warehouse.id)}
                    className="p-1 rounded-lg hover:bg-white text-slate-400 hover:text-blue-600 transition-colors shrink-0 cursor-pointer"
                    title="Kelola Role Gudang"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        {!canCallerMutate ? (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
            <Lock className="w-3.5 h-3.5" />
            <span>Dikelola Super Admin</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onEditProfile(user)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Profil</span>
            </button>

            <button
              type="button"
              onClick={() => onManageAccess(user, activeWarehouseId)}
              className="py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Akses {activeWarehouseCode}</span>
            </button>
          </div>
        )}

        {/* Super Admin Global Deactivate/Reactivate Button */}
        {isCallerSuperAdmin && (
          <button
            type="button"
            onClick={() => onToggleGlobalAccount(user)}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              user.isActive
                ? 'border-rose-200 hover:bg-rose-50 text-rose-600'
                : 'border-emerald-200 hover:bg-emerald-50 text-emerald-600'
            }`}
            title={user.isActive ? 'Nonaktifkan Akun Global' : 'Aktifkan Akun'}
          >
            {user.isActive ? <Ban className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
