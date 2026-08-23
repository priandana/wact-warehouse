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
    <div className="space-y-5">
      {/* Back Link & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/assets"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Aset</span>
        </Link>

        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Ubah Data</span>
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus / Retire</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Header Banner Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/70 shadow-2xs">
                {asset.asset_code}
              </span>
              <AssetStatusBadge status={asset.status} size="md" />
              <AssetConditionBadge condition={condition} size="md" />
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {asset.name}
            </h1>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold flex-wrap">
              {asset.category?.name && (
                <span className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>{asset.category.name}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {asset.warehouse?.name || 'Gudang'} &bull; {asset.area?.name || 'Area Belum Diatur'}
                  {asset.location?.name ? ` • ${asset.location.name}` : ''}
                </span>
              </span>
            </div>
          </div>

          {/* Action Buttons: Laporkan Masalah & Mulai Inspeksi & QR */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setIsQROpen(true)}
              className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-2xs"
              title="Tampilkan Label QR Code"
            >
              <QrCode className="w-5 h-5 text-blue-600" />
            </button>

            <Link
              href={`/inspections/new?asset_id=${asset.id}`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs shadow-2xs active:scale-95 transition-all"
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              <span>Mulai Inspeksi</span>
            </Link>

            <Link
              href={reportProblemUrl}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs shadow-rose-500/20 active:scale-95 transition-all"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Laporkan Masalah</span>
            </Link>
          </div>
        </div>

        {/* 4 Summary Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Kendala Aktif
            </span>
            <span className="text-lg font-black text-rose-600 mt-0.5 block">
              {openCasesCount}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Total Riwayat Kasus
            </span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">
              {cases.length}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              QC Terakhir
            </span>
            <span className="text-xs font-black text-slate-800 mt-1 block truncate">
              {asset.last_inspection_at
                ? new Date(asset.last_inspection_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Belum Ada'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Jadwal QC Berikutnya
            </span>
            <span className="text-xs font-black text-slate-700 mt-1 block truncate">
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

      {/* Grid 2 Columns: Identity & Specs vs Case & Inspection History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Photo & Specifications */}
        <div className="lg:col-span-1 space-y-4">
          {/* Photo Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Dokumentasi Fisik Aset
            </h3>
            {asset.photo_signed_url ? (
              <div className="aspect-4/3 rounded-2xl overflow-hidden border border-slate-200">
                <img
                  src={asset.photo_signed_url}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-4/3 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                <Package className="w-8 h-8 mb-1 text-slate-300" />
                <span className="text-xs font-bold text-slate-500">Belum Ada Foto</span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Foto fisik dapat diunggah melalui menu Ubah Data
                </span>
              </div>
            )}
          </div>

          {/* Specifications Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Spesifikasi & Identitas
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500 font-medium">Merek (Brand)</span>
                <span className="font-bold text-slate-900">{brand || '-'}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500 font-medium">Model / Tipe</span>
                <span className="font-bold text-slate-900">{model || '-'}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500 font-medium">Nomor Seri</span>
                <span className="font-mono font-bold text-slate-900">{serialNumber || '-'}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500 font-medium">Tanggal Pengadaan</span>
                <span className="font-bold text-slate-900">
                  {asset.installed_date
                    ? new Date(asset.installed_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '-'}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500 font-medium">Token QR Code</span>
                <span className="font-mono font-bold text-blue-700">{asset.qr_code_url || `WACT-${asset.asset_code}`}</span>
              </div>
            </div>

            {notes && (
              <div className="pt-2 border-t border-slate-100">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Catatan Khusus
                </span>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  {notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Case & Inspection History */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('cases')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-colors ${
                  activeTab === 'cases'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Riwayat Kendala / Kasus ({cases.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('inspections')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-colors ${
                  activeTab === 'inspections'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Riwayat QC & Inspeksi ({inspections.length})</span>
              </button>
            </div>

            {/* Tab 1: Cases List */}
            {activeTab === 'cases' && (
              <div className="space-y-3">
                {cases.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <h4 className="text-xs font-extrabold text-slate-800">
                      Tidak Ada Riwayat Kendala
                    </h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Aset ini belum pernah dilaporkan mengalami kerusakan atau gangguan operasional.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {cases.map((c) => (
                      <Link
                        key={c.id}
                        href={`/cases/${c.id}`}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors group block"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-blue-700">
                              {c.case_number}
                            </span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {c.status.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              {c.priority}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {c.title}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Dilaporkan oleh {c.reporter?.full_name || 'Pelapor'} &bull;{' '}
                            {new Date(c.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Inspections List */}
            {activeTab === 'inspections' && (
              <div className="space-y-3">
                {inspections.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="text-xs font-extrabold text-slate-800">
                      Belum Ada Catatan QC
                    </h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Lakukan inspeksi pertama untuk mencatat riwayat pemeliharaan berkala aset ini.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {inspections.map((insp) => (
                      <Link
                        key={insp.id}
                        href={`/inspections/${insp.id}`}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors group block"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-blue-700">
                              {insp.inspection_number || 'INSP-QC'}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                insp.status === 'completed'
                                  ? insp.overall_result === 'ng'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {insp.status === 'completed'
                                ? insp.overall_result === 'ng'
                                  ? 'SELESAI (NG)'
                                  : 'SELESAI (OK)'
                                : 'DRAFT'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            Inspeksi QC Rutin
                          </p>
                          <p className="text-[11px] text-slate-400">
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

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
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
