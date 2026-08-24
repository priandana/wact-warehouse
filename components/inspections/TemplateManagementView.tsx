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
    <div className="page-padding py-5 max-w-5xl mx-auto space-y-5">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/inspections"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Inspeksi</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Master Template Checklist QC
            </h1>
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
              {templates.length} Aktif
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Standar audit keselamatan, kebersihan, dan integritas mekanis per kategori aset
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm shadow-blue-500/20 active:scale-95 transition-all self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Template Baru</span>
          </button>
        )}
      </div>

      {!canManage && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2 font-medium">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Mode Read-Only: Hanya Administrator yang berwenang menambah atau menonaktifkan template master.</span>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-4">
        {templates.map((tpl) => {
          const isExpanded = expandedTemplateIds[tpl.id] ?? false;
          const totalItems = tpl.sections.reduce((acc, s) => acc + s.items.length, 0);

          return (
            <div
              key={tpl.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
            >
              {/* Header */}
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      Kategori: {tpl.category?.name || 'Global / Semua Aset'}
                    </span>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Aktif
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900">
                    {tpl.name}
                  </h3>

                  {tpl.description && (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {tpl.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 pt-1">
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
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleExpand(tpl.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                  >
                    <span>{isExpanded ? 'Tutup Poin' : 'Lihat Poin Audit'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDeactivate(tpl.id, tpl.name)}
                      disabled={deactivatingId === tpl.id}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors disabled:opacity-50"
                      title="Nonaktifkan Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Accordion Detail: Sections & Items */}
              {isExpanded && (
                <div className="bg-slate-50/70 p-5 border-t border-slate-100 space-y-4 animate-in fade-in duration-100">
                  {tpl.sections.map((sec, sIdx) => (
                    <div
                      key={sec.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5"
                    >
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="w-4 h-4 rounded bg-slate-100 text-slate-700 font-mono font-black text-[10px] flex items-center justify-center">
                          {sIdx + 1}
                        </span>
                        <h4 className="text-xs font-black text-slate-900">
                          {sec.title}
                        </h4>
                      </div>

                      <div className="divide-y divide-slate-100 text-xs">
                        {sec.items.map((item, iIdx) => (
                          <div key={item.id} className="py-2 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">
                                {iIdx + 1}. {item.label}
                              </span>
                              {item.is_required && (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                  Wajib
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-slate-500 pl-4">
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

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-hidden animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                Buat Master Template Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="p-6 overflow-y-auto space-y-4 flex-1">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Nama Template <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Checklist Inspeksi Forklift Listrik"
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Interval Siklus (Hari)
                  </label>
                  <input
                    type="number"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(e.target.value)}
                    placeholder="Kosongkan jika manual"
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Deskripsi Panduan
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instruksi singkat bagi inspector saat melakukan audit..."
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xs disabled:opacity-50"
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
