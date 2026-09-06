// components/integrity/IntegritySettingsClient.tsx
// Super Admin Settings Interface for Integrity Center
// Manages public announcements and displays immutable system privacy architecture.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Settings,
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Calendar,
  Save,
  Loader2,
  Lock,
  Layers,
  Camera,
  EyeOff,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Sparkles,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type {
  IntegrityAnnouncementType,
  IntegrityPublicAnnouncement,
  PublicAnnouncementDisplay,
} from '@/lib/integrity/types';
import {
  saveIntegrityAnnouncement,
  deleteIntegrityAnnouncement,
} from '@/lib/integrity/actions';
import { IntegrityAnnouncementBanner } from './IntegrityAnnouncementBanner';
import { formatWib } from '@/lib/utils/dateFormat';

interface IntegritySettingsClientProps {
  initialAnnouncements: IntegrityPublicAnnouncement[];
  warehouseName: string;
  warehouseCode: string;
}

export function IntegritySettingsClient({
  initialAnnouncements,
  warehouseName,
  warehouseCode,
}: IntegritySettingsClientProps) {
  const [announcements, setAnnouncements] = useState<IntegrityPublicAnnouncement[]>(initialAnnouncements);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(
    initialAnnouncements[0]?.id || null
  );

  // Form state
  const [title, setTitle] = useState(initialAnnouncements[0]?.title || 'Jangan Takut untuk Melapor');
  const [body, setBody] = useState(
    initialAnnouncements[0]?.body ||
      'Gunakan saluran ini apabila Anda mengetahui dugaan pencurian, konsumsi barang tanpa izin, manipulasi stok, atau pelanggaran lainnya.'
  );
  const [type, setType] = useState<IntegrityAnnouncementType>(
    initialAnnouncements[0]?.type || 'info'
  );
  const [isActive, setIsActive] = useState(initialAnnouncements[0]?.is_active ?? true);
  const [showOnReport, setShowOnReport] = useState(initialAnnouncements[0]?.show_on_report ?? true);
  const [showOnTrack, setShowOnTrack] = useState(initialAnnouncements[0]?.show_on_track ?? true);
  const [publishStart, setPublishStart] = useState(
    initialAnnouncements[0]?.publish_start ? initialAnnouncements[0].publish_start.slice(0, 16) : ''
  );
  const [publishEnd, setPublishEnd] = useState(
    initialAnnouncements[0]?.publish_end ? initialAnnouncements[0].publish_end.slice(0, 16) : ''
  );

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectAnnouncement = (ann: IntegrityPublicAnnouncement) => {
    setSelectedAnnouncementId(ann.id);
    setTitle(ann.title);
    setBody(ann.body);
    setType(ann.type);
    setIsActive(ann.is_active);
    setShowOnReport(ann.show_on_report);
    setShowOnTrack(ann.show_on_track);
    setPublishStart(ann.publish_start ? ann.publish_start.slice(0, 16) : '');
    setPublishEnd(ann.publish_end ? ann.publish_end.slice(0, 16) : '');
    setSaveSuccess(false);
    setErrorMessage(null);
  };

  const handleNewAnnouncement = () => {
    setSelectedAnnouncementId(null);
    setTitle('');
    setBody('');
    setType('info');
    setIsActive(true);
    setShowOnReport(true);
    setShowOnTrack(true);
    setPublishStart('');
    setPublishEnd('');
    setSaveSuccess(false);
    setErrorMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await saveIntegrityAnnouncement({
        id: selectedAnnouncementId || undefined,
        title: title.trim(),
        body: body.trim(),
        type,
        isActive,
        showOnReport,
        showOnTrack,
        publishStart: publishStart.trim() || null,
        publishEnd: publishEnd.trim() || null,
      });

      if (res.success) {
        if (res.id) {
          setSelectedAnnouncementId(res.id);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMessage(res.error || 'Gagal menyimpan pengumuman.');
      }
    } catch {
      setErrorMessage('Terjadi kendala saat menyimpan pengumuman.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAnnouncementId) return;
    if (!confirm('Apakah Anda yakin ingin menghapus pengumuman ini?')) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      const res = await deleteIntegrityAnnouncement(selectedAnnouncementId);
      if (res.success) {
        handleNewAnnouncement();
      } else {
        setErrorMessage(res.error || 'Gagal menghapus pengumuman.');
      }
    } catch {
      setErrorMessage('Terjadi kendala saat menghapus pengumuman.');
    } finally {
      setSaving(false);
    }
  };

  // Preview object for live rendering
  const livePreviewAnnouncement: PublicAnnouncementDisplay = {
    title: title.trim() || 'Judul Pengumuman',
    body: body.trim() || 'Isi teks pengumuman yang akan ditampilkan kepada publik...',
    type,
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="page-padding py-4 sm:py-6 max-w-6xl mx-auto space-y-7">
      {/* ── 1. Header Banner & Sub-Nav ────────────────────────────────────── */}
      <div className="neu-raised rounded-3xl p-5 sm:p-6 bg-[#EEF2F7] dark:bg-[#131C31] border border-black/[0.04] dark:border-white/[0.05] text-slate-900 dark:text-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl neu-icon-well flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Pengaturan & Pengumuman Integritas
              </h1>
              <span className="neu-pill-active text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                SUPER ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Konfigurasi pengumuman publik dan transparansi arsitektur privasi sistem Integrity Center.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/integrity/report"
              target="_blank"
              className="neu-btn-secondary px-3.5 py-2 rounded-2xl text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 min-h-[44px] active:scale-95"
            >
              <span>Portal Publik</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Sub-Nav Switcher */}
        <div className="flex items-center gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
          <Link
            href="/integrity"
            className="neu-pill-inactive px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all flex items-center gap-1.5 min-h-[44px]"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Laporan Masuk</span>
          </Link>
          <div className="neu-pill-active px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-xs min-h-[44px]">
            <Settings className="w-3.5 h-3.5" />
            <span>Pengaturan & Pengumuman</span>
          </div>
        </div>
      </div>

      {/* ── 2. Announcement Management Form & Live Preview ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Editor (7 cols) */}
        <div className="lg:col-span-7 neu-raised rounded-3xl p-5 sm:p-7 bg-[#EEF2F7] dark:bg-[#131C31] border border-black/[0.04] dark:border-white/[0.05] space-y-6">
          <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.05] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl neu-icon-well flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Bell className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                Editor Pengumuman Publik
              </h2>
            </div>
            <button
              type="button"
              onClick={handleNewAnnouncement}
              className="neu-btn-secondary py-1.5 px-3.5 rounded-2xl text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer min-h-[44px] active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Baru</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Pengumuman berhasil disimpan dan diterapkan pada portal publik.</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Judul Pengumuman <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Jangan Takut untuk Melapor"
                className="w-full py-2.5 px-3.5 rounded-xl neu-inset bg-transparent border-0 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Isi Pengumuman <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tuliskan informasi atau himbauan integritas yang ingin disampaikan kepada pelapor..."
                className="w-full p-3 rounded-xl neu-inset bg-transparent border-0 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 leading-relaxed"
              />
            </div>

            {/* Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Tipe Pengumuman
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { key: 'info', label: 'Informasi', icon: Info, color: 'text-blue-600' },
                  { key: 'important', label: 'Penting', icon: AlertCircle, color: 'text-amber-600' },
                  { key: 'warning', label: 'Peringatan', icon: AlertTriangle, color: 'text-rose-600' },
                ].map((item) => {
                  const isSelected = type === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setType(item.key as IntegrityAnnouncementType)}
                      className={cn(
                        'p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[44px] active:scale-95',
                        isSelected
                          ? 'neu-inset border-blue-500/40 text-blue-700 dark:text-blue-300'
                          : 'neu-raised border-black/[0.04] dark:border-white/[0.05] text-slate-600 dark:text-slate-400'
                      )}
                    >
                      <item.icon className={cn('w-3.5 h-3.5', item.color)} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Pages & Active Switch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl neu-inset-sm bg-[#E5EBF3]/60 dark:bg-[#101726]/60 border border-black/[0.04] dark:border-white/[0.05] space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Target Tampilan Portal
                </span>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnReport}
                    onChange={(e) => setShowOnReport(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Formulir Laporan (/integrity/report)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnTrack}
                    onChange={(e) => setShowOnTrack(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Pelacakan Status (/integrity/track)</span>
                </label>
              </div>

              <div className="p-3.5 rounded-2xl neu-inset-sm bg-[#E5EBF3]/60 dark:bg-[#101726]/60 border border-black/[0.04] dark:border-white/[0.05] space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Status Publikasi
                </span>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className={cn('font-bold', isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}>
                    {isActive ? 'Aktif (Ditampilkan)' : 'Nonaktif (Disembunyikan)'}
                  </span>
                </label>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  Pengumuman nonaktif tidak akan muncul di portal publik.
                </p>
              </div>
            </div>

            {/* Optional Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Mulai Publikasi (Opsional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={publishStart}
                  onChange={(e) => setPublishStart(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl neu-inset bg-transparent border-0 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Selesai Publikasi (Opsional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={publishEnd}
                  onChange={(e) => setPublishEnd(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl neu-inset bg-transparent border-0 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            </div>

            {/* Actions: Delete & Save */}
            <div className="pt-3 border-t border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between">
              {selectedAnnouncementId ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleDelete}
                  className="py-2.5 px-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={saving}
                className="fintech-btn-primary py-2.5 px-6 rounded-2xl text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer min-h-[44px] active:scale-95"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Pengumuman</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Interactive Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Preview Box */}
          <div className="neu-raised rounded-3xl p-5 sm:p-6 bg-[#EEF2F7] dark:bg-[#131C31] border border-black/[0.04] dark:border-white/[0.05] space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.05] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                  Pratinjau Langsung (Live Preview)
                </h3>
              </div>
              <span className="neu-pill-active text-[10.5px] px-2.5 py-0.5 rounded-full font-bold">
                Tampilan Publik
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Berikut adalah bentuk tampilan banner yang akan muncul di portal pelapor anonim:
            </p>

            <div className="p-2.5 rounded-2xl neu-inset-sm bg-[#E5EBF3]/70 dark:bg-[#101726]/70 border border-black/[0.04] dark:border-white/[0.05]">
              <IntegrityAnnouncementBanner announcement={livePreviewAnnouncement} />
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pt-1">
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Target: {showOnReport && 'Laporan '} {showOnTrack && 'Pelacakan'}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Status: {isActive ? 'Aktif Tayang' : 'Disimpan Sebagai Draf'}</span>
              </p>
            </div>
          </div>

          {/* ── 3. Immutable System Privacy Architecture (Part H) ─────────── */}
          <div className="neu-raised rounded-3xl p-5 sm:p-6 bg-[#EEF2F7] dark:bg-[#131C31] border border-black/[0.04] dark:border-white/[0.05] space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-2.5 pb-3 border-b border-black/[0.04] dark:border-white/[0.05]">
              <div className="w-8 h-8 rounded-xl neu-icon-well text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                  System Privacy Information
                </h3>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  Permanen & Terisolasi
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Jaminan privasi berikut merupakan properti teknis sistem permanen yang <strong>tidak dapat diubah atau ditimpa</strong> oleh editor pengumuman untuk menjaga integritas kepatuhan:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl neu-inset-sm bg-[#E5EBF3]/70 dark:bg-[#101726]/70 border border-black/[0.04] dark:border-white/[0.05] space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 text-blue-500" />
                  <span>Zero Identity Capture</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-5">
                  Sistem tidak menyimpan ID pengguna, email, IP address, atau user-agent pada laporan anonim.
                </p>
              </div>

              <div className="p-3 rounded-2xl neu-inset-sm bg-[#E5EBF3]/70 dark:bg-[#101726]/70 border border-black/[0.04] dark:border-white/[0.05] space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Tabel Kunci Rahasia Terisolasi</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-5">
                  Hash kunci akses disimpan terpisah dengan RLS menutup total seluruh akses client.
                </p>
              </div>

              <div className="p-3 rounded-2xl neu-inset-sm bg-[#E5EBF3]/70 dark:bg-[#101726]/70 border border-black/[0.04] dark:border-white/[0.05] space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-purple-500" />
                  <span>Sanitasi Metadata Foto Server</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-5">
                  Seluruh EXIF, GPS, dan metadata perangkat dibersihkan secara binary di sisi server.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
