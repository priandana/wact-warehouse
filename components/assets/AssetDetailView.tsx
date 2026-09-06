'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  QrCode,
  AlertTriangle,
  ClipboardCheck,
  Edit3,
  Trash2,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  Clock,
  ChevronRight,
  Package,
  Wrench,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { AssetStatusBadge, AssetConditionBadge } from './AssetStatusBadge';
import { AssetQRModal } from './AssetQRModal';
import { EditAssetModal } from './EditAssetModal';
import { deleteAssetAction } from '@/app/actions/assets';
import { cn } from '@/lib/utils/cn';

interface CategoryItem {
  id: string;
  name: string;
}

interface AreaItem {
  id: string;
  name: string;
  warehouse_id: string;
}

interface LocationItem {
  id: string;
  name: string;
  area_id: string;
}

interface AssetDetailProps {
  asset: {
    id: string;
    warehouse_id: string;
    asset_code: string;
    name: string;
    category_id?: string | null;
    area_id?: string | null;
    location_id?: string | null;
    photo_url?: string | null;
    photo_signed_url?: string | null;
    status: string;
    installed_date?: string | null;
    qr_code_url?: string | null;
    last_inspection_at?: string | null;
    next_inspection_at?: string | null;
    created_at: string;
    updated_at: string;
    specification?: {
      brand?: string | null;
      model?: string | null;
      serial_number?: string | null;
      condition?: string | null;
      notes?: string | null;
    } | null;
    category?: { name: string } | null;
    area?: { name: string } | null;
    location?: { name: string } | null;
    warehouse?: { name: string; code: string } | null;
  };
  cases: Array<{
    id: string;
    case_number: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
    reporter?: { full_name: string } | null;
  }>;
  inspections: Array<{
    id: string;
    inspection_number?: string;
    status?: string;
    overall_result?: string;
    created_at: string;
    inspector?: { full_name: string } | null;
  }>;
  canManage: boolean;
  categories: CategoryItem[];
  areas: AreaItem[];
  locations: LocationItem[];
}

export function AssetDetailView({
  asset,
  cases,
  inspections,
  canManage,
  categories,
  areas,
  locations,
}: AssetDetailProps) {
  const router = useRouter();
  const [isQROpen, setIsQROpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'cases' | 'inspections'>('cases');

  const brand = asset.specification?.brand;
  const model = asset.specification?.model;
  const serialNumber = asset.specification?.serial_number;
  const condition = asset.specification?.condition || 'good';
  const notes = asset.specification?.notes;

  const openCasesCount = cases.filter((c) =>
    ['open', 'on_progress', 'waiting_repair', 'waiting_verification', 'reopened'].includes(c.status)
  ).length;

  const reportProblemUrl = `/cases/new?asset_id=${asset.id}&warehouse_id=${asset.warehouse_id}${
    asset.area_id ? `&area_id=${asset.area_id}` : ''
  }${asset.location_id ? `&location_id=${asset.location_id}` : ''}`;

  const handleDelete = async () => {
    if (!confirm(`Apakah Anda yakin ingin menghapus / meng-afkir aset "${asset.asset_code} - ${asset.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteAssetAction(asset.id);
      if (res.success) {
        router.push('/assets');
      } else {
        alert(res.error || 'Gagal menghapus aset');
        setIsDeleting(false);
      }
    } catch {
      alert('Terjadi kesalahan sistem.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── 1. Back Link & Top Management Actions ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <Link
          href="/assets"
          className="neu-btn-secondary inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Aset</span>
        </Link>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="neu-btn-secondary flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Ubah Data</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="neu-btn-secondary flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold transition-all disabled:opacity-50 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus / Retire</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 2. Main Executive Identity Banner Card ───────────────────────── */}
      <div className="neu-raised rounded-3xl p-4 sm:p-6 space-y-4 relative overflow-hidden">
        {/* Subtle ambient gradient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-mono text-xs sm:text-sm font-black text-blue-700 dark:text-blue-400 neu-pill-active px-2.5 py-0.5 rounded-lg">
                {asset.asset_code}
              </span>
              <AssetStatusBadge status={asset.status} size="md" />
              <AssetConditionBadge condition={condition} size="md" />
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
              {asset.name}
            </h1>

            <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 font-semibold flex-wrap">
              {asset.category?.name && (
                <span className="neu-pill-inactive flex items-center gap-1 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-lg text-[11px]">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>{asset.category.name}</span>
                </span>
              )}
              <span className="flex items-center gap-1 text-[11.5px]">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {asset.warehouse?.name || 'Gudang'} &bull; {asset.area?.name || 'Area Belum Diatur'}
                  {asset.location?.name ? ` • ${asset.location.name}` : ''}
                </span>
              </span>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap pt-2 lg:pt-0">
            <button
              type="button"
              onClick={() => setIsQROpen(true)}
              className="w-11 h-11 rounded-2xl neu-icon-well flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all shrink-0 active:scale-95"
              title="Tampilkan Label QR Code"
              aria-label="Tampilkan Label QR Code"
            >
              <QrCode className="w-5 h-5" />
            </button>

            <Link
              href={`/inspections/new?asset_id=${asset.id}`}
              className="neu-btn-secondary flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all active:scale-95 text-slate-800 dark:text-slate-200"
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Mulai Inspeksi</span>
            </Link>

            <Link
              href={reportProblemUrl}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs shadow-md shadow-rose-500/25 active:scale-95 transition-all"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Laporkan Masalah</span>
            </Link>
          </div>
        </div>

        {/* 4 Summary Stat Tiles (2x2 on mobile, 4-col on desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-3 border-t border-slate-200/40 dark:border-slate-800/60">
          <div className="p-3.5 rounded-2xl neu-inset-sm">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500">
              Kendala Aktif
            </span>
            <span className={`text-lg font-black mt-0.5 block ${openCasesCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
              {openCasesCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl neu-inset-sm">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500">
              Total Riwayat Kasus
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
              {cases.length}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl neu-inset-sm">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500">
              QC Terakhir
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block truncate">
              {asset.last_inspection_at
                ? new Date(asset.last_inspection_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Belum Ada'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl neu-inset-sm">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500">
              Jadwal QC Berikutnya
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block truncate">
              {asset.next_inspection_at
                ? new Date(asset.next_inspection_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Belum Dijadwalkan'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Dual-Column Details & History ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Left Column: Photo & Specifications */}
        <div className="lg:col-span-1 space-y-4">
          {/* Photo Card */}
          <div className="neu-raised rounded-3xl p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Dokumentasi Fisik Aset
            </h3>
            {asset.photo_signed_url ? (
              <div className="aspect-4/3 rounded-2xl overflow-hidden neu-inset-sm">
                <img
                  src={asset.photo_signed_url}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-4/3 rounded-2xl neu-inset-sm flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                <div className="w-10 h-10 rounded-2xl neu-icon-well flex items-center justify-center text-slate-400 mb-2">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Belum Ada Foto Fisik</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Foto fisik dapat diunggah melalui menu Ubah Data
                </span>
              </div>
            )}
          </div>

          {/* Specifications Card */}
          <div className="neu-raised rounded-3xl p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Spesifikasi & Identitas
            </h3>

            <div className="divide-y divide-slate-200/40 dark:divide-slate-800/60 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Merek (Brand)</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{brand || '-'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Model / Tipe</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{model || '-'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Nomor Seri</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{serialNumber || '-'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Tanggal Pengadaan</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {asset.installed_date
                    ? new Date(asset.installed_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '-'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Token QR Code</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{asset.qr_code_url || `WACT-${asset.asset_code}`}</span>
              </div>
            </div>

            {notes && (
              <div className="pt-2.5 border-t border-slate-200/40 dark:border-slate-800/60">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Catatan Khusus
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed neu-inset-sm p-3.5 rounded-2xl">
                  {notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Case & Inspection History */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs Container */}
          <div className="neu-raised rounded-3xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-1.5 p-1 neu-inset-sm rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('cases')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all',
                  activeTab === 'cases'
                    ? 'neu-raised text-blue-600 dark:text-blue-400 font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>Riwayat Kendala ({cases.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('inspections')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all',
                  activeTab === 'inspections'
                    ? 'neu-raised text-blue-600 dark:text-blue-400 font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Riwayat QC ({inspections.length})</span>
              </button>
            </div>

            {/* Tab 1: Cases List */}
            {activeTab === 'cases' && (
              <div className="space-y-2">
                {cases.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl neu-icon-well flex items-center justify-center text-emerald-500 mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Tidak Ada Riwayat Kendala
                    </h4>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                      Aset ini belum pernah dilaporkan mengalami kerusakan atau gangguan operasional.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200/40 dark:divide-slate-800/60">
                    {cases.map((c) => (
                      <Link
                        key={c.id}
                        href={`/cases/${c.id}`}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 px-3 rounded-2xl transition-colors group block"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-400 neu-pill-active px-2 py-0.5 rounded-lg">
                              {c.case_number}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full neu-pill-inactive">
                              {c.status.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/40">
                              {c.priority}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {c.title}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            Dilaporkan oleh {c.reporter?.full_name || 'Pelapor'} &bull;{' '}
                            {new Date(c.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Inspections List */}
            {activeTab === 'inspections' && (
              <div className="space-y-2">
                {inspections.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl neu-icon-well flex items-center justify-center text-slate-400 mx-auto">
                      <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Belum Ada Catatan QC
                    </h4>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                      Lakukan inspeksi pertama untuk mencatat riwayat pemeliharaan berkala aset ini.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200/40 dark:divide-slate-800/60">
                    {inspections.map((insp) => (
                      <Link
                        key={insp.id}
                        href={`/inspections/${insp.id}`}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 px-3 rounded-2xl transition-colors group block"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-400 neu-pill-active px-2 py-0.5 rounded-lg">
                              {insp.inspection_number || 'INSP-QC'}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                insp.status === 'completed'
                                  ? insp.overall_result === 'ng'
                                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40'
                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40'
                              }`}
                            >
                              {insp.status === 'completed'
                                ? insp.overall_result === 'ng'
                                ? 'SELESAI (NG)'
                                : 'SELESAI (OK)'
                                : 'DRAFT'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            Inspeksi QC Rutin
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            Oleh {insp.inspector?.full_name || 'Inspector'} &bull;{' '}
                            {new Date(insp.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isQROpen && (
        <AssetQRModal
          isOpen={isQROpen}
          onClose={() => setIsQROpen(false)}
          asset={{
            id: asset.id,
            asset_code: asset.asset_code,
            name: asset.name,
            warehouse_name: asset.warehouse?.name,
            area_name: asset.area?.name,
            location_name: asset.location?.name,
          }}
        />
      )}

      {isEditOpen && (
        <EditAssetModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          asset={asset as any}
          categories={categories}
          areas={areas}
          locations={locations}
        />
      )}
    </div>
  );
}
