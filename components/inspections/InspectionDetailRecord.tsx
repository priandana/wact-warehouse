'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardCheck,
  CheckCircle2,
  AlertOctagon,
  MinusCircle,
  AlertTriangle,
  MapPin,
  Clock,
  Layers,
  ExternalLink,
  User,
  Image as ImageIcon,
  Check,
  XCircle,
  Wrench,
  FileText,
} from 'lucide-react';
import {
  InspectionStatusBadge,
  OverallResultBadge,
} from './InspectionStatusBadge';
import { type InspectionData } from './InspectionChecklistView';
import { getSignedUrls, BUCKETS } from '@/lib/supabase/storage';

interface InspectionDetailRecordProps {
  inspection: InspectionData;
}

export function InspectionDetailRecord({ inspection }: InspectionDetailRecordProps) {
  const isCompleted = inspection.status === 'completed';
  const isCancelled = inspection.status === 'cancelled';
  const isNG = inspection.overall_result === 'ng';

  const [signedPhotoUrls, setSignedPhotoUrls] = useState<Record<string, string>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Compute metric stats
  const metrics = inspection.sections.reduce(
    (acc, sec) => {
      for (const item of sec.items) {
        acc.total++;
        const res = inspection.initialResults.find((r) => r.item_id === item.id);
        if (res?.value === 'ok') acc.ok++;
        else if (res?.value === 'ng') acc.ng++;
        else if (res?.value === 'na') acc.na++;
        else acc.unfilled++;
      }
      return acc;
    },
    { total: 0, ok: 0, ng: 0, na: 0, unfilled: 0 }
  );

  // Calculate duration
  const durationMinutes = inspection.completed_at
    ? Math.max(
        1,
        Math.round(
          (new Date(inspection.completed_at).getTime() -
            new Date(inspection.started_at).getTime()) /
            60000
        )
      )
    : null;

  // Load signed URLs for photos
  useEffect(() => {
    const allStoragePaths: string[] = [];
    for (const ev of inspection.initialEvidences || []) {
      if (ev.file_url && !allStoragePaths.includes(ev.file_url)) {
        allStoragePaths.push(ev.file_url);
      }
    }

    if (allStoragePaths.length > 0) {
      getSignedUrls(BUCKETS.INSPECTION_EVIDENCES, allStoragePaths)
        .then((items) => {
          const map: Record<string, string> = {};
          for (const item of items) {
            map[item.path] = item.signedUrl;
          }
          setSignedPhotoUrls(map);
        })
        .catch((err) => console.error('Failed to load signed inspection photos:', err));
    }
  }, [inspection.initialEvidences]);

  // Prefilled link to create case from defect
  const createCaseUrl = `/cases/new?asset_id=${inspection.asset_id}&warehouse_id=${inspection.warehouse_id}${
    inspection.asset?.area ? `&area_id=${(inspection.asset as any).area_id || ''}` : ''
  }`;

  return (
    <div className="page-padding py-5 max-w-4xl mx-auto space-y-5">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/inspections"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Inspeksi</span>
        </Link>
      </div>

      {/* Main Banner Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                {inspection.inspection_number}
              </span>
              <InspectionStatusBadge status={inspection.status} size="md" />
              {isCompleted && (
                <OverallResultBadge result={inspection.overall_result} size="md" />
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {inspection.template?.name || 'Audit Inspeksi QC'}
            </h1>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold flex-wrap">
              <span className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>{inspection.asset?.category?.name || 'Aset Operasional'}</span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {inspection.warehouse?.code} &bull; {inspection.asset?.area?.name || 'Area Umum'}
                </span>
              </span>
            </div>
          </div>

          {/* Link to Asset */}
          <Link
            href={`/assets/${inspection.asset_id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition-colors self-start sm:self-center"
          >
            <span>Detail Aset ({inspection.asset?.asset_code})</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </Link>
        </div>

        {/* Audit Meta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Inspector (Auditor)
            </span>
            <span className="font-black text-slate-900 mt-0.5 block truncate">
              {inspection.inspector?.full_name || 'Petugas'}
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Waktu Selesai
            </span>
            <span className="font-bold text-slate-800 mt-0.5 block truncate">
              {inspection.completed_at
                ? new Date(inspection.completed_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-'}
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Durasi Inspeksi
            </span>
            <span className="font-bold text-slate-800 mt-0.5 block truncate">
              {durationMinutes ? `${durationMinutes} Menit` : '-'}
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Status Kesimpulan
            </span>
            <span className="font-black text-slate-900 mt-0.5 block">
              {inspection.overall_result?.toUpperCase() || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Cancellation Notice (if cancelled) */}
      {isCancelled && (
        <div className="p-5 rounded-3xl bg-slate-100 border border-slate-200 space-y-1">
          <div className="flex items-center gap-2 text-slate-700">
            <XCircle className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-black">
              Inspeksi Dibatalkan
            </h3>
          </div>
          <p className="text-xs text-slate-600 pl-6 leading-relaxed">
            Alasan: <span className="font-bold text-slate-800">{inspection.cancellation_reason || 'Tidak ada keterangan.'}</span>
          </p>
        </div>
      )}

      {/* Action Banner for Defect (NG): Create Case */}
      {isCompleted && isNG && (
        <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200/90 shadow-2xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-black text-rose-900">
                Temuan Defect / Kerusakan ({metrics.ng} Poin Checklist NG)
              </h3>
              <p className="text-xs text-rose-800 leading-relaxed">
                Unit aset ini membutuhkan tindakan perbaikan atau pemeliharaan teknis. Buat tiket kendala / kasus untuk menugaskan PIC Warehouse.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-200/60">
            <Link
              href={createCaseUrl}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-sm shadow-rose-500/20 active:scale-95 transition-all"
            >
              <Wrench className="w-4 h-4" />
              <span>Buat Kasus / Tiket Perbaikan dari Temuan Ini</span>
            </Link>
          </div>
        </div>
      )}

      {/* 4 Metrics Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="block text-[10px] font-extrabold uppercase text-slate-400">
            Total Poin Diperiksa
          </span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">
            {metrics.total}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="block text-[10px] font-extrabold uppercase text-emerald-500">
            Kondisi Normal (OK)
          </span>
          <span className="text-xl font-black text-emerald-600 mt-0.5 block">
            {metrics.ok}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="block text-[10px] font-extrabold uppercase text-rose-500">
            Kondisi Rusak (NG)
          </span>
          <span className="text-xl font-black text-rose-600 mt-0.5 block">
            {metrics.ng}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="block text-[10px] font-extrabold uppercase text-slate-400">
            Tidak Berlaku (N/A)
          </span>
          <span className="text-xl font-black text-slate-700 mt-0.5 block">
            {metrics.na}
          </span>
        </div>
      </div>

      {/* Detailed Checklist Breakdown by Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-slate-900 tracking-tight">
          Rincian Hasil Poin Audit
        </h2>

        {inspection.sections.map((section, sIndex) => (
          <div
            key={section.id}
            className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden"
          >
            {/* Section Header */}
            <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-800 font-mono font-black text-[11px] flex items-center justify-center">
                  {sIndex + 1}
                </span>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">
                  {section.title}
                </h3>
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-slate-100">
              {section.items.map((item) => {
                const res = inspection.initialResults.find((r) => r.item_id === item.id);
                const val = res?.value;

                return (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 space-y-2.5 ${
                      val === 'ng' ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900">
                            {item.label}
                          </span>
                          {item.is_required && (
                            <span className="text-slate-400 text-[10px] font-bold">
                              (Wajib)
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-500">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Value Badge */}
                      <div className="shrink-0 self-start sm:self-center">
                        {val === 'ok' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>OK</span>
                          </span>
                        )}
                        {val === 'ng' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-600 text-white font-black text-xs shadow-2xs">
                            <AlertOctagon className="w-3.5 h-3.5" />
                            <span>NG (DEFECT)</span>
                          </span>
                        )}
                        {val === 'na' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs">
                            <MinusCircle className="w-3.5 h-3.5" />
                            <span>N/A</span>
                          </span>
                        )}
                        {!val && (
                          <span className="text-xs text-slate-400 font-medium">
                            Belum Diisi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Notes (if recorded) */}
                    {res?.notes && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                          Catatan Temuan:
                        </span>
                        <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                          {res.notes}
                        </p>
                      </div>
                    )}

                    {/* Photos (if attached) */}
                    {(() => {
                      const itemEvidences = (inspection.initialEvidences || []).filter(
                        (e) => e.inspection_result_id === res?.id
                      );
                      if (itemEvidences.length === 0) return null;

                      return (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Foto Bukti Pemeriksaan ({itemEvidences.length}):
                          </span>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {itemEvidences.map((ev, idx) => {
                              const url = signedPhotoUrls[ev.file_url];
                              return (
                                <div
                                  key={idx}
                                  onClick={() => url && setSelectedPhoto(url)}
                                  className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 cursor-pointer hover:opacity-90 transition-opacity bg-slate-100"
                                >
                                  {url ? (
                                    <img
                                      src={url}
                                      alt="Foto Bukti"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                      <ImageIcon className="w-5 h-5" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-2xl w-full max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl bg-black">
            <img
              src={selectedPhoto}
              alt="Foto Bukti Penuh"
              className="w-full h-full object-contain max-h-[85vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
