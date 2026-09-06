// components/users/UsersCommandCenter.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Building2,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  Wrench,
  User,
  Filter,
  RefreshCw,
  Ban,
  Lock,
} from 'lucide-react';
import { UserCard, type UserItem } from './UserCard';
import {
  CreateUserModal,
  AssignExistingUserModal,
  EditProfileModal,
  ManageWarehouseAccessModal,
  GlobalAccountModal,
} from './UserModals';

interface UsersCommandCenterProps {
  users: UserItem[];
  roles: Array<{ id: string; name: string; display_name: string }>;
  warehouses: Array<{ id: string; code: string; name: string }>;
  activeWarehouse: { id: string; code: string; name: string };
  isSuperAdmin: boolean;
}

export function UsersCommandCenter({
  users,
  roles,
  warehouses,
  activeWarehouse,
  isSuperAdmin,
}: UsersCommandCenterProps) {
  const router = useRouter();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>(
    isSuperAdmin ? 'all' : activeWarehouse.id
  );
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [managingAccess, setManagingAccess] = useState<{ user: UserItem; warehouseId: string } | null>(null);
  const [globalAccountUser, setGlobalAccountUser] = useState<UserItem | null>(null);

  // Refresh handler
  const handleSuccess = () => {
    router.refresh();
  };

  // Summary Metrics calculations
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const inactiveUsers = users.filter((u) => !u.isActive).length;
  const operationalUsers = users.filter((u) =>
    u.memberships.some(
      (m) =>
        m.is_active &&
        ['coordinator', 'qc_leader', 'pic_maintenance', 'reporter'].includes(m.roles?.name || '')
    )
  ).length;

  // Filtered dataset
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = user.fullName.toLowerCase().includes(q);
        const matchesEmail = user.email.toLowerCase().includes(q);
        const matchesEmpId = user.employeeId?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesEmpId) return false;
      }

      // 2. Warehouse Filter
      if (selectedWarehouseFilter !== 'all') {
        const hasWarehouse = user.memberships.some(
          (m) => m.is_active && m.warehouse_id === selectedWarehouseFilter
        );
        if (!hasWarehouse) return false;
      }

      // 3. Role Filter
      if (selectedRoleFilter !== 'all') {
        const hasRole = user.memberships.some(
          (m) => m.is_active && m.roles?.name === selectedRoleFilter
        );
        if (!hasRole) return false;
      }

      // 4. Status Filter
      if (selectedStatusFilter === 'active' && !user.isActive) return false;
      if (selectedStatusFilter === 'inactive' && user.isActive) return false;

      return true;
    });
  }, [users, searchQuery, selectedWarehouseFilter, selectedRoleFilter, selectedStatusFilter]);

  // Active warehouse object for managing access
  const activeWhObj =
    warehouses.find((w) => w.id === (managingAccess?.warehouseId || activeWarehouse.id)) || activeWarehouse;

  return (
    <div className="page-padding py-5 max-w-7xl mx-auto space-y-6">
      {/* ── 1. Page Header & Actions ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Manajemen Pengguna & Hak Akses
            </h1>
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-3 py-0.5 rounded-full border border-rose-500/20">
                <ShieldAlert className="w-3.5 h-3.5" />
                Global Super Admin
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-500/10 px-3 py-0.5 rounded-full border border-blue-500/20">
                <Building2 className="w-3.5 h-3.5" />
                Gudang [{activeWarehouse.code}] {activeWarehouse.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            {isSuperAdmin
              ? 'Kelola direktori pengguna sistem, peran multi-warehouse, dan aktivasi akun global.'
              : `Kelola penugasan peran operasional dan staf untuk fasilitas ${activeWarehouse.name}.`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAssignOpen(true)}
            className="neu-btn-secondary py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center gap-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>+ Tambahkan Akses Gudang</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="fintech-btn-primary py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Buat Pengguna Baru</span>
          </button>
        </div>
      </div>

      {/* ── 2. Summary KPI Metrics ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl neu-raised flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl neu-icon-well flex items-center justify-center font-bold text-sm shrink-0 text-blue-600 dark:text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Pengguna</span>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">{totalUsers}</p>
          </div>
        </div>

        <div className="p-4 rounded-3xl neu-raised flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl neu-icon-well flex items-center justify-center font-bold text-sm shrink-0 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pengguna Aktif</span>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">{activeUsers}</p>
          </div>
        </div>

        <div className="p-4 rounded-3xl neu-raised flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl neu-icon-well flex items-center justify-center font-bold text-sm shrink-0 text-indigo-600 dark:text-indigo-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Staff Operasional</span>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">{operationalUsers}</p>
          </div>
        </div>

        <div className="p-4 rounded-3xl neu-raised flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl neu-icon-well flex items-center justify-center font-bold text-sm shrink-0 text-rose-600 dark:text-rose-400">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Akun Nonaktif</span>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">{inactiveUsers}</p>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Search Controls ─────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-3xl neu-raised space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pengguna, email, atau ID karyawan..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl neu-inset text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-hidden transition-all"
            />
          </div>

          {/* Filter Selects */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Warehouse Filter (Super Admin Only) */}
            {isSuperAdmin && (
              <select
                value={selectedWarehouseFilter}
                onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                className="px-3.5 py-2 rounded-2xl neu-inset-sm text-xs font-bold text-slate-700 dark:text-slate-200 outline-hidden"
              >
                <option value="all">Semua Gudang</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    [{w.code}] {w.name}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
              className="px-3.5 py-2 rounded-2xl neu-inset-sm text-xs font-bold text-slate-700 dark:text-slate-200 outline-hidden"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif Saja</option>
              <option value="inactive">Nonaktif Saja</option>
            </select>
          </div>
        </div>

        {/* Role Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            Filter Role:
          </span>
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('all')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedRoleFilter === 'all'
                ? 'neu-pill-active'
                : 'neu-pill-inactive'
            }`}
          >
            Semua Role
          </button>
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRoleFilter(r.name)}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedRoleFilter === r.name
                  ? 'neu-pill-active'
                  : 'neu-pill-inactive'
              }`}
            >
              {r.display_name}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. User Directory Grid ───────────────────────────────────────────── */}
      {filteredUsers.length === 0 ? (
        <div className="p-12 text-center neu-raised rounded-3xl space-y-3">
          <Users className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Tidak Ada Pengguna Ditemukan</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
            Tidak ada pengguna yang cocok dengan kriteria pencarian dan filter aktif.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isCallerSuperAdmin={isSuperAdmin}
              activeWarehouseId={activeWarehouse.id}
              activeWarehouseCode={activeWarehouse.code}
              onEditProfile={(u) => setEditingUser(u)}
              onManageAccess={(u, whId) => setManagingAccess({ user: u, warehouseId: whId })}
              onToggleGlobalAccount={(u) => setGlobalAccountUser(u)}
            />
          ))}
        </div>
      )}

      {/* ── 5. Modals ────────────────────────────────────────────────────────── */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        warehouses={warehouses}
        roles={roles}
        activeWarehouseId={activeWarehouse.id}
        isSuperAdmin={isSuperAdmin}
        onSuccess={handleSuccess}
      />

      <AssignExistingUserModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        roles={roles}
        activeWarehouse={activeWarehouse}
        isSuperAdmin={isSuperAdmin}
        onSuccess={handleSuccess}
      />

      {editingUser && (
        <EditProfileModal
          isOpen={true}
          onClose={() => setEditingUser(null)}
          user={editingUser}
          onSuccess={handleSuccess}
        />
      )}

      {managingAccess && (
        <ManageWarehouseAccessModal
          isOpen={true}
          onClose={() => setManagingAccess(null)}
          user={managingAccess.user}
          warehouse={activeWhObj}
          roles={roles}
          currentRoleIds={
            managingAccess.user.memberships
              .filter((m) => m.warehouse_id === activeWhObj.id && m.is_active)
              .map((m) => roles.find((r) => r.name === m.roles?.name)?.id)
              .filter(Boolean) as string[]
          }
          isSuperAdmin={isSuperAdmin}
          onSuccess={handleSuccess}
        />
      )}

      {globalAccountUser && (
        <GlobalAccountModal
          isOpen={true}
          onClose={() => setGlobalAccountUser(null)}
          user={globalAccountUser}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
