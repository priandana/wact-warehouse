'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Settings,
  Plus,
  Layers,
  Calendar,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  Package,
} from 'lucide-react';
import {
  createInspectionTemplateAction,
  deactivateInspectionTemplateAction,
} from '@/app/actions/inspections';
import { Select } from '@/components/shared/Select';

export interface CategoryItem {
  id: string;
  name: string;
}

export interface TemplateDetailItem {
  id: string;
  name: string;
  category_id?: string | null;
  description?: string | null;
  inspection_interval_days?: number | null;
  is_active: boolean;
  category?: { id: string; name: string } | null;
  sections: Array<{
    id: string;
    title: string;
    sort_order: number;
    items: Array<{
      id: string;
      label: string;
      description?: string | null;
      is_required: boolean;
      sort_order: number;
    }>;
  }>;
}

interface TemplateManagementViewProps {
  templates: TemplateDetailItem[];
  categories: CategoryItem[];
  canManage: boolean;
}

export function TemplateManagementView({
  templates,
  categories,
  canManage,
}: TemplateManagementViewProps) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedTemplateIds, setExpandedTemplateIds] = useState<Record<string, boolean>>({});
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  // Form state for creating template
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [intervalDays, setIntervalDays] = useState<string>('');
  const [sections, setSections] = useState<
    Array<{
      title: string;
      sortOrder: number;
      items: Array<{ label: string; description: string; isRequired: boolean; sortOrder: number }>;
    }>
  >([
    {
      title: 'Kondisi Fisik & Keamanan',
      sortOrder: 1,
      items: [{ label: '', description: '', isRequired: true, sortOrder: 1 }],
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTemplateIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDeactivate = async (templateId: string, templateName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan template "${templateName}"?`)) {
      return;
    }

    setDeactivatingId(templateId);
    try {
      const res = await deactivateInspectionTemplateAction(templateId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Gagal menonaktifkan template.');
      }
    } catch {
      alert('Terjadi kesalahan sistem.');
    } finally {
      setDeactivatingId(null);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama template wajib diisi.');
      return;
    }

    // Validate sections
    for (const sec of sections) {
      if (!sec.title.trim()) {
        setError('Semua judul section wajib diisi.');
        return;
      }
      for (const itm of sec.items) {
        if (!itm.label.trim()) {
          setError('Semua label item checklist wajib diisi.');
          return;
        }
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createInspectionTemplateAction({
        name: name.trim(),
        categoryId: categoryId || null,
        description: description.trim() || null,
        inspectionIntervalDays: intervalDays ? parseInt(intervalDays, 10) : null,
        sections: sections.map((s, sIdx) => ({
          title: s.title.trim(),
          sortOrder: sIdx + 1,
          items: s.items.map((i, iIdx) => ({
            label: i.label.trim(),
            description: i.description?.trim() || null,
            isRequired: i.isRequired,
            sortOrder: iIdx + 1,
          })),
        })),
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        setName('');
        setCategoryId('');
        setDescription('');
        setIntervalDays('');
        router.refresh();
      } else {
        setError(res.error || 'Gagal membuat template.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── 1. Top Back Navigation ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          href="/inspections"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 neu-btn-secondary px-3 py-1.5 rounded-xl transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Daftar Inspeksi</span>
        </Link>
      </div>

      {/* ── 2. Header Banner ────────────────────────────────────────────── */}
      <div className="bg-[#EEF2F7] dark:bg-[#131C31] neu-raised rounded-3xl border border-black/[0.04] dark:border-white/[0.05] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Master Template Checklist QC
            </h1>
            <span className="text-xs font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/20 neu-inset-sm">
              {templates.length} Aktif
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Standar audit keselamatan, kebersihan, dan integritas mekanis per kategori aset
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="relative z-10 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl fintech-btn-primary font-bold text-xs active:scale-95 transition-all self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Template Baru</span>
          </button>
        )}
      </div>

      {!canManage && (
        <div className="p-3.5 sm:p-4 rounded-2xl neu-inset-sm bg-slate-100/50 dark:bg-slate-900/40 border border-black/[0.04] dark:border-white/[0.05] text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 font-medium">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Mode Read-Only: Hanya Administrator yang berwenang menambah atau menonaktifkan template master.</span>
        </div>
      )}

      {/* ── 3. Templates List ───────────────────────────────────────────── */}
      <div className="space-y-3 sm:space-y-4">
        {templates.map((tpl) => {
          const isExpanded = expandedTemplateIds[tpl.id] ?? false;
          const totalItems = tpl.sections.reduce((acc, s) => acc + s.items.length, 0);

          return (
            <div
              key={tpl.id}
              className="bg-[#EEF2F7] dark:bg-[#131C31] neu-raised rounded-3xl border border-black/[0.04] dark:border-white/[0.05] overflow-hidden transition-all"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 neu-inset-sm px-2.5 py-1 rounded-xl border border-black/[0.04] dark:border-white/[0.05]">
                      Kategori: {tpl.category?.name || 'Global / Semua Aset'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 neu-inset-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Aktif</span>
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                    {tpl.name}
                  </h3>

                  {tpl.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {tpl.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-0.5 flex-wrap">
                    <span>{tpl.sections.length} Section</span>
                    <span>&bull;</span>
                    <span>{totalItems} Poin Checklist</span>
                    <span>&bull;</span>
                    <span>
                      Siklus:{' '}
                      {tpl.inspection_interval_days
                        ? `Setiap ${tpl.inspection_interval_days} Hari`
                        : 'Manual / Rutin'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => toggleExpand(tpl.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl neu-btn-secondary text-slate-800 dark:text-slate-200 font-bold text-xs transition-all active:scale-95"
                  >
                    <span>{isExpanded ? 'Tutup Poin' : 'Lihat Poin Audit'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDeactivate(tpl.id, tpl.name)}
                      disabled={deactivatingId === tpl.id}
                      className="w-8 h-8 rounded-xl neu-icon-well flex items-center justify-center text-rose-600 dark:text-rose-400 hover:text-rose-700 transition-colors disabled:opacity-50 active:scale-95"
                      title="Nonaktifkan Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Accordion Detail: Sections & Items */}
              {isExpanded && (
                <div className="neu-inset-sm bg-[#E5EBF3]/60 dark:bg-[#0D1322]/60 p-4 sm:p-5 border-t border-black/[0.04] dark:border-white/[0.05] space-y-3 animate-in fade-in duration-100">
                  {tpl.sections.map((sec, sIdx) => (
                    <div
                      key={sec.id}
                      className="bg-[#EEF2F7] dark:bg-[#131C31] neu-raised-sm rounded-2xl border border-black/[0.04] dark:border-white/[0.05] p-3.5 sm:p-4 space-y-2.5"
                    >
                      <div className="flex items-center gap-2 border-b border-black/[0.04] dark:border-white/[0.05] pb-2">
                        <span className="w-5 h-5 rounded-lg neu-inset-sm bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-black text-[10px] flex items-center justify-center border border-blue-500/20">
                          {sIdx + 1}
                        </span>
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">
                          {sec.title}
                        </h4>
                      </div>

                      <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05] text-xs">
                        {sec.items.map((item, iIdx) => (
                          <div key={item.id} className="py-2 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {iIdx + 1}. {item.label}
                              </span>
                              {item.is_required && (
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 neu-inset-sm shrink-0">
                                  Wajib
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-4">
                                {item.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 4. Create Modal ─────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-hidden animate-in fade-in">
          <div className="bg-[#EEF2F7] dark:bg-[#131C31] neu-raised-lg rounded-3xl border border-black/[0.04] dark:border-white/[0.05] max-w-xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 relative">
            <div className="px-5 sm:px-6 py-4 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between shrink-0 bg-[#EEF2F7] dark:bg-[#131C31]">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                Buat Master Template Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-xl neu-icon-well flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain touch-pan-y space-y-4 flex-1">
                {error && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Nama Template <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Checklist Inspeksi Forklift Listrik"
                    className="w-full text-xs rounded-2xl neu-inset p-3 font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Kategori Aset (Opsional)"
                    value={categoryId}
                    onChange={setCategoryId}
                    options={[
                      { value: '', label: 'Global / Berlaku untuk Semua Aset' },
                      ...categories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Interval Siklus (Hari)
                    </label>
                    <input
                      type="number"
                      value={intervalDays}
                      onChange={(e) => setIntervalDays(e.target.value)}
                      placeholder="Kosongkan jika manual"
                      className="w-full text-xs rounded-2xl neu-inset p-3 font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Deskripsi Panduan
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Instruksi singkat bagi inspector saat melakukan audit..."
                    className="w-full text-xs rounded-2xl neu-inset p-3 font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sticky Actions Footer */}
              <div
                className="flex items-center gap-2.5 px-5 sm:px-6 py-3.5 border-t border-black/[0.04] dark:border-white/[0.05] bg-[#EEF2F7] dark:bg-[#131C31] shrink-0"
                style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl neu-btn-secondary text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="flex-1 py-2.5 rounded-xl fintech-btn-primary font-bold text-xs disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Template Master</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
