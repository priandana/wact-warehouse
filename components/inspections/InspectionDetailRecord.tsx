'use client';

import { useState, useEffect, useMemo } from 'react';
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
  linkedCase?: {
    id: string;
    case_number: string;
    title: string;
    status: string;
  } | null;
}

export function InspectionDetailRecord({ inspection, linkedCase }: InspectionDetailRecordProps) {
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

  // Clean, minimal URL carrying only authoritative identifier & source
  const createCaseUrl = `/cases/new?inspection_id=${inspection.id}&source=inspection`;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── 1. Top Navigation ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          href="/inspections"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Inspeksi</span>
        </Link>
      </div>

      {/* ── 2. Main Executive Summary Card ──────────────────────────────── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-50/50 via-indigo-50/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200/70 shadow-2xs">
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

            <div className="flex items-center gap-2.5 text-xs text-slate-500 font-semibold flex-wrap">
              {inspection.asset?.category?.name && (
                <span className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>{inspection.asset.category.name}</span>
                </span>
              )}
              <span className="flex items-center gap-1 text-[11.5px]">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {inspection.warehouse?.code} &bull; {inspection.asset?.area?.name || 'Area Umum'}
                </span>
              </span>
            </div>
          </div>

          {/* Link to Asset Detail */}
          <Link
            href={`/assets/${inspection.asset_id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors self-start sm:self-center shrink-0 active:scale-95"
          >
            <span>Detail Aset ({inspection.asset?.asset_code})</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>

        {/* Audit Meta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Inspector (Auditor)
            </span>
            <span className="font-black text-slate-900 mt-0.5 block truncate">
              {inspection.inspector?.full_name || 'Petugas'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
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

          <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Durasi Inspeksi
            </span>
            <span className="font-bold text-slate-800 mt-0.5 block truncate">
              {durationMinutes ? `${durationMinutes} Menit` : '-'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
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
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-100 border border-slate-200 space-y-1">
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

      {/* ── 3. Action Banner for Defect (NG): Create Case ────────────────── */}
      {isCompleted && isNG && (
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-rose-50/90 border border-rose-200/90 shadow-2xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 shadow-2xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-black text-rose-900">
                Temuan Defect / Kerusakan ({metrics.ng} Poin Checklist NG)
              </h3>
              <p className="text-xs text-rose-800 leading-relaxed">
                Unit aset ini membutuhkan tindakan perbaikan atau pemeliharaan teknis. Buat tiket kendala / kasus untuk menugaskan tim perbaikan.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-rose-200/70 flex items-center justify-between gap-3 flex-wrap">
            {linkedCase ? (
              <>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <span className="text-slate-500">Kasus Terkait:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-900 font-extrabold">
                    {linkedCase.case_number}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">
                    ({linkedCase.status})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/cases/${linkedCase.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Lihat Kasus Terkait</span>
                  </Link>
                  <Link
                    href={createCaseUrl}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-xs transition-all active:scale-95"
                  >
                    <span>Buat Kasus Tambahan</span>
                  </Link>
                </div>
              </>
            ) : (
              <div className="w-full flex justify-end">
                <Link
                  href={createCaseUrl}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs shadow-xs shadow-rose-500/20 active:scale-95 transition-all"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Buat Kasus / Tiket Perbaikan dari Temuan Ini</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. 4 Summary Metric Tiles ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
            Total Poin Diperiksa
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight">
            {metrics.total}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-700">
              Kondisi Normal (OK)
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 block tracking-tight">
            {metrics.ok}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-rose-700">
              Kondisi Rusak (NG)
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-rose-700 block tracking-tight">
            {metrics.ng}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
            Tidak Berlaku (N/A)
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-700 block tracking-tight">
            {metrics.na}
          </span>
        </div>
      </div>

      {/* ── 5. Detailed Checklist Breakdown by Section ──────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-slate-900 tracking-tight">
          Rincian Hasil Poin Audit
        </h2>

        {inspection.sections.map((section, sIndex) => (
          <div
            key={section.id}
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden"
          >
            {/* Section Header */}
            <div className="bg-slate-50/90 px-4 sm:px-5 py-3 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono font-black text-[11px] flex items-center justify-center">
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
                    className={`p-3.5 sm:p-4 space-y-2.5 ${
                      val === 'ng' ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5 flex-1 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-slate-900">
                            {item.label}
                          </span>
                          {item.is_required && (
                            <span className="text-slate-400 text-[10px] font-bold">
                              (Wajib)
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Value Badge */}
                      <div className="shrink-0 self-start sm:self-center">
                        {val === 'ok' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-black text-xs shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>OK</span>
                          </span>
                        )}
                        {val === 'ng' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200/80 font-black text-xs shadow-2xs">
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                            <span>NG (DEFECT)</span>
                          </span>
                        )}
                        {val === 'na' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs">
                            <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
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
                                  className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 cursor-pointer hover:opacity-90 transition-opacity bg-slate-100 shadow-2xs"
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
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
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
