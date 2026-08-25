// components/users/UserModals.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  UserPlus,
  Building2,
  Shield,
  KeyRound,
  Copy,
  Check,
  AlertTriangle,
  Search,
  CheckCircle2,
  UserCheck,
  Ban,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import {
  createUserAction,
  lookupExistingUserAction,
  assignWarehouseAccessAction,
  revokeWarehouseAccessAction,
  updateUserProfileContactAction,
  toggleGlobalAccountActiveAction,
} from '@/app/actions/users';
import { RoleBadge } from './RoleBadge';

// ─────────────────────────────────────────────────────────────────────────────
// BASE PORTAL MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface PortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  maxWidth?: string;
  children: React.ReactNode;
}

export function PortalModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  maxWidth = 'max-w-lg',
  children,
}: PortalModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in">
      <div
        className={`w-full ${maxWidth} bg-white rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] overflow-hidden animate-in zoom-in-95 relative`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{title}</h3>
              {subtitle && <p className="text-[11px] text-slate-500 font-medium">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREATE USER MODAL (BUAT PENGGUNA BARU + ONE-TIME PASSWORD RESULT)
// ─────────────────────────────────────────────────────────────────────────────

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Array<{ id: string; code: string; name: string }>;
  roles: Array<{ id: string; name: string; display_name: string }>;
  activeWarehouseId: string;
  isSuperAdmin: boolean;
  onSuccess: () => void;
}

export function CreateUserModal({
  isOpen,
  onClose,
  warehouses,
  roles,
  activeWarehouseId,
  isSuperAdmin,
  onSuccess,
}: CreateUserModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState(activeWarehouseId);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One-time password result state
  const [createdResult, setCreatedResult] = useState<{
    user: { id: string; email: string; fullName: string; employeeId?: string | null };
    initialPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Filter permitted roles: non-super-admins cannot grant admin or regional_manager
  const permittedRoles = roles.filter((r) => {
    if (isSuperAdmin) return true;
    return r.name !== 'admin' && r.name !== 'regional_manager';
  });

  const handleRoleToggle = (roleId: string) => {
    if (selectedRoleIds.includes(roleId)) {
      setSelectedRoleIds(selectedRoleIds.filter((id) => id !== roleId));
    } else {
      setSelectedRoleIds([...selectedRoleIds, roleId]);
    }
  };

  const handleCopyPassword = () => {
    if (createdResult?.initialPassword) {
      navigator.clipboard.writeText(createdResult.initialPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoleIds.length === 0) {
      setError('Harap pilih minimal satu role operasional.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createUserAction({
        email,
        fullName,
        employeeId: employeeId || null,
        phone: phone || null,
        warehouseId: targetWarehouseId,
        roleIds: selectedRoleIds,
      });

      if (!res.success) {
        if (res.error === 'USER_EXISTS') {
          setError(res.message || 'Pengguna dengan email ini sudah terdaftar.');
        } else {
          setError(res.error || 'Gagal membuat pengguna.');
        }
        setLoading(false);
        return;
      }

      if (res.user && res.initialPassword) {
        setCreatedResult({
          user: res.user,
          initialPassword: res.initialPassword,
        });
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setCreatedResult(null);
    setEmail('');
    setFullName('');
    setEmployeeId('');
    setPhone('');
    setSelectedRoleIds([]);
    onClose();
  };

  if (createdResult) {
    return (
      <PortalModal
        isOpen={isOpen}
        onClose={handleFinish}
        title="Akun Berhasil Dibuat"
        subtitle="Informasi kredensial login pertama"
        icon={KeyRound}
      >
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">Akun pengguna baru telah siap</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Pengguna telah didaftarkan dengan status wajib ganti password pada login pertama.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Nama Pengguna</span>
              <p className="text-xs font-bold text-slate-900">{createdResult.user.fullName}</p>
            </div>
            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Email Login</span>
              <p className="text-xs font-mono font-bold text-blue-600">{createdResult.user.email}</p>
            </div>

            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Password Awal (Sementara)</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdResult.initialPassword}
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono text-xs font-bold text-slate-900 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-blue-500/20"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-amber-900 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Penting:</span> Password awal hanya berlaku sampai pengguna mengganti password pada login pertama. Berikan kredensial ini secara aman kepada pengguna.
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
          >
            Selesai & Tutup
          </button>
        </div>
      </PortalModal>
    );
  }

  return (
    <PortalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Pengguna Baru"
      subtitle="Daftarkan identitas baru dan tentukan penugasan gudang awal"
      icon={UserPlus}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ahmad Fauzi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email Perusahaan <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ahmad.fauzi@wact.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">ID Karyawan (Opsional)</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. EMP-10492"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Nomor Telepon / WA (Opsional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +62 812-3456-7890"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Warehouse Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Gudang Penugasan Awal <span className="text-rose-500">*</span>
          </label>
          <select
            value={targetWarehouseId}
            onChange={(e) => setTargetWarehouseId(e.target.value)}
            disabled={!isSuperAdmin}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                [{w.code}] {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Role untuk Gudang <span className="text-rose-500">*</span>
          </label>
          <p className="text-[11px] text-slate-400 mb-2">
            Pilih satu atau beberapa role yang berlaku pada gudang terpilih.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {permittedRoles.map((r) => {
              const isChecked = selectedRoleIds.includes(r.id);
              return (
                <label
                  key={r.id}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-bold shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleRoleToggle(r.id)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs truncate">{r.display_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{r.name}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Buat Pengguna & Hasilkan Password</span>
          </button>
        </div>
      </form>
    </PortalModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ASSIGN EXISTING USER MODAL (TAMBAHKAN AKSES GUDANG UNTUK USER EKSISTING)
// ─────────────────────────────────────────────────────────────────────────────

interface AssignExistingUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Array<{ id: string; name: string; display_name: string }>;
  activeWarehouse: { id: string; code: string; name: string };
  isSuperAdmin: boolean;
  onSuccess: () => void;
}

export function AssignExistingUserModal({
  isOpen,
  onClose,
  roles,
  activeWarehouse,
  isSuperAdmin,
  onSuccess,
}: AssignExistingUserModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resolvedUser, setResolvedUser] = useState<{
    id: string;
    fullName: string;
    email: string;
    employeeId?: string | null;
    avatarUrl?: string | null;
    isSuperAdmin?: boolean;
    isGloballyInactive?: boolean;
    existingMemberships?: any[];
  } | null>(null);

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const permittedRoles = roles.filter((r) => {
    if (isSuperAdmin) return true;
    return r.name !== 'admin' && r.name !== 'regional_manager';
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);
    setResolvedUser(null);
    setSelectedRoleIds([]);

    try {
      const res = await lookupExistingUserAction(searchQuery.trim());
      if (!res.success || !res.found || !res.user) {
        setSearchError(res.message || 'Pengguna tidak ditemukan dengan email atau ID Karyawan tersebut.');
      } else {
        setResolvedUser(res.user);

        // Pre-populate existing active roles in this warehouse if any
        const currentWhMemberships = (res.user.existingMemberships || []).filter(
          (m: any) => m.warehouse_id === activeWarehouse.id && m.is_active
        );
        // Find matching role IDs
        const preSelected = currentWhMemberships
          .map((m: any) => roles.find((r) => r.name === m.roles?.name)?.id)
          .filter((id): id is string => Boolean(id));
        setSelectedRoleIds(preSelected);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Gagal melakukan pencarian.');
    } finally {
      setSearching(false);
    }
  };

  const handleRoleToggle = (roleId: string) => {
    if (selectedRoleIds.includes(roleId)) {
      setSelectedRoleIds(selectedRoleIds.filter((id) => id !== roleId));
    } else {
      setSelectedRoleIds([...selectedRoleIds, roleId]);
    }
  };

  const handleSaveAccess = async () => {
    if (!resolvedUser) return;
    if (selectedRoleIds.length === 0) {
      setSaveError('Harap pilih minimal satu role untuk penugasan gudang.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const res = await assignWarehouseAccessAction({
        userId: resolvedUser.id,
        warehouseId: activeWarehouse.id,
        roleIds: selectedRoleIds,
      });

      if (!res.success) {
        setSaveError(res.error || 'Gagal memperbarui penugasan.');
        setSaving(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambahkan Akses Gudang"
      subtitle={`Tugaskan karyawan yang sudah terdaftar ke [${activeWarehouse.code}] ${activeWarehouse.name}`}
      icon={Building2}
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Cari Pengguna Terdaftar (Email / ID Karyawan)
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. pic.bdg@wact.test atau EMP-102"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Cari</span>
            </button>
          </div>
        </form>

        {searchError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Resolved User Attribution Card */}
        {resolvedUser && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {resolvedUser.fullName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{resolvedUser.fullName}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">{resolvedUser.email}</p>
                  {resolvedUser.employeeId && (
                    <span className="text-[10px] text-slate-400 font-medium">ID: {resolvedUser.employeeId}</span>
                  )}
                </div>
              </div>

              {resolvedUser.isGloballyInactive ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                  Nonaktif Global
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Aktif
                </span>
              )}
            </div>

            {/* Inactive Global User Warning */}
            {resolvedUser.isGloballyInactive ? (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Akun Nonaktif:</span> Akun pengguna sedang dinonaktifkan secara global. Hubungi Super Admin untuk mengaktifkannya kembali sebelum memberikan akses gudang.
                </div>
              </div>
            ) : (
              /* Role Multi-Select */
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Pilih Role untuk Gudang [{activeWarehouse.code}] {activeWarehouse.name}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {permittedRoles.map((r) => {
                    const isChecked = selectedRoleIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-bold shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleRoleToggle(r.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs truncate">{r.display_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{r.name}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {saveError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mt-2">
                    {saveError}
                  </div>
                )}

                <div className="pt-3 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAccess}
                    disabled={saving}
                    className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Simpan Penugasan Gudang</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PortalModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. EDIT USER PROFILE CONTACT MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; fullName: string; employeeId?: string | null; phone?: string | null; email: string };
  onSuccess: () => void;
}

export function EditProfileModal({ isOpen, onClose, user, onSuccess }: EditProfileModalProps) {
  const [fullName, setFullName] = useState(user.fullName);
  const [employeeId, setEmployeeId] = useState(user.employeeId || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await updateUserProfileContactAction({
        userId: user.id,
        fullName,
        employeeId: employeeId || null,
        phone: phone || null,
      });

      if (!res.success) {
        setError(res.error || 'Gagal memperbarui profil.');
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
      setLoading(false);
    }
  };

  return (
    <PortalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profil Pengguna"
      subtitle={`Informasi kontak untuk ${user.email}`}
      icon={UserCheck}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Nama Lengkap <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">ID Karyawan</label>
          <input
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="e.g. EMP-10294"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Nomor Telepon / WhatsApp</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +62 812-3456-7890"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </form>
    </PortalModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MANAGE WAREHOUSE ACCESS MODAL (KELOLA PENUGASAN GUDANG)
// ─────────────────────────────────────────────────────────────────────────────

interface ManageWarehouseAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; fullName: string; email: string };
  warehouse: { id: string; code: string; name: string };
  roles: Array<{ id: string; name: string; display_name: string }>;
  currentRoleIds: string[];
  isSuperAdmin: boolean;
  onSuccess: () => void;
}

export function ManageWarehouseAccessModal({
  isOpen,
  onClose,
  user,
  warehouse,
  roles,
  currentRoleIds,
  isSuperAdmin,
  onSuccess,
}: ManageWarehouseAccessModalProps) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(currentRoleIds);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const permittedRoles = roles.filter((r) => {
    if (isSuperAdmin) return true;
    return r.name !== 'admin' && r.name !== 'regional_manager';
  });

  const handleRoleToggle = (roleId: string) => {
    if (selectedRoleIds.includes(roleId)) {
      setSelectedRoleIds(selectedRoleIds.filter((id) => id !== roleId));
    } else {
      setSelectedRoleIds([...selectedRoleIds, roleId]);
    }
  };

  const handleSave = async () => {
    if (selectedRoleIds.length === 0) {
      setError('Jika ingin mencabut seluruh akses, gunakan tombol "Cabut Akses Gudang" di bawah.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await assignWarehouseAccessAction({
        userId: user.id,
        warehouseId: warehouse.id,
        roleIds: selectedRoleIds,
      });

      if (!res.success) {
        setError(res.error || 'Gagal memperbarui role.');
        setSaving(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
      setSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm(`Cabut seluruh akses [${warehouse.code}] ${warehouse.name} dari ${user.fullName}?`)) return;

    setRevoking(true);
    setError(null);

    try {
      const res = await revokeWarehouseAccessAction({
        userId: user.id,
        warehouseId: warehouse.id,
      });

      if (!res.success) {
        setError(res.error || 'Gagal mencabut akses.');
        setRevoking(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
      setRevoking(false);
    }
  };

  return (
    <PortalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Kelola Akses Gudang"
      subtitle={`Penugasan untuk ${user.fullName} di [${warehouse.code}] ${warehouse.name}`}
      icon={Building2}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">Role Terdaftar di Fasilitas Ini</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {permittedRoles.map((r) => {
              const isChecked = selectedRoleIds.includes(r.id);
              return (
                <label
                  key={r.id}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-bold shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleRoleToggle(r.id)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs truncate">{r.display_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{r.name}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between border-t border-slate-100">
          <button
            type="button"
            onClick={handleRevoke}
            disabled={revoking || saving}
            className="py-2 px-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Cabut Akses Gudang</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || revoking}
              className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Simpan Role</span>
            </button>
          </div>
        </div>
      </div>
    </PortalModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DEACTIVATE / ACTIVATE GLOBAL ACCOUNT MODAL (SUPER ADMIN ONLY)
// ─────────────────────────────────────────────────────────────────────────────

interface GlobalAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; fullName: string; email: string; isActive: boolean };
  onSuccess: () => void;
}

export function GlobalAccountModal({ isOpen, onClose, user, onSuccess }: GlobalAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDeactivating = user.isActive;

  const handleToggle = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await toggleGlobalAccountActiveAction(user.id, !user.isActive);
      if (!res.success) {
        setError(res.error || 'Gagal mengubah status akun.');
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
      setLoading(false);
    }
  };

  return (
    <PortalModal
      isOpen={isOpen}
      onClose={onClose}
      title={isDeactivating ? 'Nonaktifkan Akun Global' : 'Aktifkan Kembali Akun'}
      subtitle={user.email}
      icon={isDeactivating ? Ban : RotateCcw}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isDeactivating ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan menonaktifkan akun <span className="font-bold text-slate-900">{user.fullName}</span> secara global. Pengguna tidak akan dapat login ke seluruh sistem WACT.
            </p>
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-amber-900 text-xs flex items-start gap-2.5 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Perlindungan Data Historis:</span> Seluruh riwayat pelaporan kasus, inspeksi, dan komentar pengguna ini tetap aman dan terbaca pada sistem.
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-600 leading-relaxed">
            Aktifkan kembali akun <span className="font-bold text-slate-900">{user.fullName}</span>. Pengguna akan dapat login kembali dan riwayat penugasan gudang sebelumnya akan dipulihkan secara otomatis.
          </p>
        )}

        <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleToggle}
            disabled={loading}
            className={`py-2.5 px-5 rounded-xl font-bold text-xs text-white transition-colors shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
              isDeactivating
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isDeactivating ? 'Ya, Nonaktifkan Akun' : 'Ya, Aktifkan Akun'}</span>
          </button>
        </div>
      </div>
    </PortalModal>
  );
}
