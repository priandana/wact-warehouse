// components/integrity/IntegrityListClient.tsx
// Interactive Investigator Command Center list view with KPI metrics, filters, and report cards.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Search,
  Filter,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  Shield,
  DollarSign,
  User,
  CheckCircle2,
  ExternalLink,
  Settings,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  type IntegrityCategory,
  type IntegritySeverity,
  type IntegrityStatus,
  type IntegrityReport,
  INTEGRITY_CATEGORIES,
  INTEGRITY_STATUSES,
  INTEGRITY_SEVERITIES,
} from '@/lib/integrity/types';
import { formatWib } from '@/lib/utils/dateFormat';

interface IntegrityListClientProps {
  reports: IntegrityReport[];
  warehouseName: string;
  warehouseCode: string;
  counts: {
    submitted: number;
    triage: number;
    investigating: number;
    actionRequired: number;
    critical: number;
    resolved: number;
  };
  isSuperAdmin?: boolean;
}

export function IntegrityListClient({
  reports,
  warehouseName,
  warehouseCode,
  counts,
  isSuperAdmin,
}: IntegrityListClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  // Filter reports
  const filteredReports = reports.filter((r) => {
    // Search query matches code, description, or involved party
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeMatch = r.report_code.toLowerCase().includes(q);
      const descMatch = r.description.toLowerCase().includes(q);
      const partyMatch = r.involved_party_description?.toLowerCase().includes(q);
      if (!codeMatch && !descMatch && !partyMatch) return false;
    }

    // Status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active') {
        if (r.status === 'resolved' || r.status === 'unsubstantiated' || r.status === 'duplicate') {
          return false;
        }
      } else if (r.status !== selectedStatus) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory !== 'all' && r.category !== selectedCategory) {
      return false;
    }

    // Severity filter
    if (selectedSeverity !== 'all' && r.severity !== selectedSeverity) {
      return false;
    }

    return true;
  });

  return (
    <div className="page-padding py-4 sm:py-5 max-w-6xl mx-auto space-y-6">
      {/* ── 1. Header Banner ──────────────────────────────────────────────── */}
      <div className="neu-raised rounded-3xl p-5 sm:p-6 bg-[#EEF2F7] dark:bg-[#131C31] border border-black/[0.04] dark:border-white/[0.05] text-slate-900 dark:text-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl neu-icon-well flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Integrity Investigation Center
              </h1>
              <span className="neu-pill-active text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                {warehouseCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Pusat penanganan dan investigasi laporan pelanggaran operasional di {warehouseName}.
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

        {/* Sub-Nav Switcher (If Super Admin) */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
            <div className="neu-pill-active px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 min-h-[44px]">
              <Layers className="w-3.5 h-3.5" />
              <span>Laporan Masuk</span>
            </div>
            <Link
              href="/integrity/settings"
              className="neu-pill-inactive px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Pengaturan & Pengumuman</span>
            </Link>
          </div>
        )}
      </div>

      {/* ── 2. KPI Metrics Bar ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Submitted (Baru) */}
        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'submitted' ? 'all' : 'submitted')}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98]',
            selectedStatus === 'submitted'
              ? 'neu-inset bg-[#EEF2F7] dark:bg-[#131C31] border-blue-500/40 shadow-inner'
              : 'neu-raised bg-[#EEF2F7] dark:bg-[#131C31] border-black/[0.04] dark:border-white/[0.05] hover:scale-[1.01]'
          )}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Laporan Baru
          </span>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{counts.submitted}</p>
        </button>

        {/* Metric 2: Triage (Screening) */}
        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'triage' ? 'all' : 'triage')}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98]',
            selectedStatus === 'triage'
              ? 'neu-inset bg-[#EEF2F7] dark:bg-[#131C31] border-indigo-500/40 shadow-inner'
              : 'neu-raised bg-[#EEF2F7] dark:bg-[#131C31] border-black/[0.04] dark:border-white/[0.05] hover:scale-[1.01]'
          )}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Screening
          </span>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{counts.triage}</p>
        </button>

        {/* Metric 3: Investigating */}
        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'investigating' ? 'all' : 'investigating')}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98]',
            selectedStatus === 'investigating'
              ? 'neu-inset bg-[#EEF2F7] dark:bg-[#131C31] border-amber-500/40 shadow-inner'
              : 'neu-raised bg-[#EEF2F7] dark:bg-[#131C31] border-black/[0.04] dark:border-white/[0.05] hover:scale-[1.01]'
          )}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Investigasi
          </span>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{counts.investigating}</p>
        </button>

        {/* Metric 4: Action Required */}
        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'action_required' ? 'all' : 'action_required')}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98]',
            selectedStatus === 'action_required'
              ? 'neu-inset bg-[#EEF2F7] dark:bg-[#131C31] border-rose-500/40 shadow-inner'
              : 'neu-raised bg-[#EEF2F7] dark:bg-[#131C31] border-black/[0.04] dark:border-white/[0.05] hover:scale-[1.01]'
          )}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Perlu Tindakan
          </span>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{counts.actionRequired}</p>
        </button>

        {/* Metric 5: Critical Severity */}
        <button
          type="button"
          onClick={() => setSelectedSeverity(selectedSeverity === 'critical' ? 'all' : 'critical')}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98]',
            selectedSeverity === 'critical'
              ? 'neu-inset bg-[#EEF2F7] dark:bg-[#131C31] border-rose-500/40 shadow-inner'
              : 'neu-raised bg-[#EEF2F7] dark:bg-[#131C31] border-black/[0.04] dark:border-white/[0.05] hover:scale-[1.01]'
          )}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Critical
          </span>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{counts.critical}</p>
        </button>

        {/* Metric 6: Resolved */}
        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'resolved' ? 'all' : 'resolved')}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98]',
            selectedStatus === 'resolved'
              ? 'neu-inset bg-[#EEF2F7] dark:bg-[#131C31] border-emerald-500/40 shadow-inner'
              : 'neu-raised bg-[#EEF2F7] dark:bg-[#131C31] border-black/[0.04] dark:border-white/[0.05] hover:scale-[1.01]'
          )}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Selesai
          </span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{counts.resolved}</p>
        </button>
      </div>

      {/* ── 3. Filters & Search Bar ───────────────────────────────────────── */}
      <div className="neu-raised rounded-2xl p-3 sm:p-4 bg-[#EEF2F7] dark:bg-[#131C31] border border-black/[0.04] dark:border-white/[0.05] space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode laporan, kata kunci kronologi, pihak terkait..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl neu-inset bg-transparent border-0 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-2.5 px-3 rounded-xl neu-inset bg-[#EEF2F7] dark:bg-[#131C31] border-0 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="all">Semua Status</option>
            <option value="active">Semua Aktif (Belum Selesai)</option>
            <option value="submitted">Laporan Baru</option>
            <option value="triage">Screening / Triage</option>
            <option value="investigating">Proses Investigasi</option>
            <option value="action_required">Perlu Tindakan</option>
            <option value="resolved">Selesai</option>
            <option value="unsubstantiated">Tidak Terbukti</option>
            <option value="duplicate">Duplikat</option>
          </select>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="py-2.5 px-3 rounded-xl neu-inset bg-[#EEF2F7] dark:bg-[#131C31] border-0 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="all">Semua Kategori</option>
            {(Object.keys(INTEGRITY_CATEGORIES) as IntegrityCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {INTEGRITY_CATEGORIES[cat].label}
              </option>
            ))}
          </select>

          {/* Severity Dropdown */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="py-2.5 px-3 rounded-xl neu-inset bg-[#EEF2F7] dark:bg-[#131C31] border-0 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="all">Semua Severity</option>
            <option value="low">Rendah (Low)</option>
            <option value="medium">Sedang (Medium)</option>
            <option value="high">Tinggi (High)</option>
            <option value="critical">Kritis (Critical)</option>
          </select>
        </div>
      </div>

      {/* ── 4. Reports List / Table View ──────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Daftar Laporan Integritas ({filteredReports.length})
          </span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="neu-raised rounded-3xl p-10 bg-[#EEF2F7] dark:bg-[#131C31] border border-black/[0.04] dark:border-white/[0.05] text-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak ada laporan yang sesuai</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Tidak ditemukan laporan integritas untuk filter yang dipilih di {warehouseName}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const statusMeta = INTEGRITY_STATUSES[report.status];
              const severityMeta = INTEGRITY_SEVERITIES[report.severity];
              const catMeta = INTEGRITY_CATEGORIES[report.category];

              return (
                <Link
                  key={report.id}
                  href={`/integrity/${report.id}`}
                  className="block neu-raised neu-card-interactive rounded-3xl p-4 sm:p-5 bg-[#EEF2F7] dark:bg-[#131C31] border border-black/[0.04] dark:border-white/[0.05] transition-all touch-target group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Code, Category & Badges */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                          {report.report_code}
                        </span>
                        <span className={cn('text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-xs', statusMeta.badgeClass)}>
                          {statusMeta.label}
                        </span>
                        <span className={cn('text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-xs', severityMeta.badgeClass)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', severityMeta.dotColor)} />
                          <span>{severityMeta.label}</span>
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {catMeta?.label || report.category}
                      </p>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {report.description}
                      </p>

                      {/* Meta Pills */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatWib(report.created_at, 'dd MMM yyyy, HH:mm')}</span>
                        </span>

                        {report.estimated_loss && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Rp {report.estimated_loss.toLocaleString('id-ID')}</span>
                          </span>
                        )}

                        {report.assigned_investigator_name && (
                          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                            <User className="w-3.5 h-3.5" />
                            <span>Investigator: {report.assigned_investigator_name}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Chevron Action */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <div className="w-9 h-9 rounded-xl neu-icon-well text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-center transition-all group-hover:scale-105">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
