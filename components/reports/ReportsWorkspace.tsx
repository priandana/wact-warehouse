'use client';
// components/reports/ReportsWorkspace.tsx
// Operational Reporting Workspace Component with Multi-Type Dataset Previews,
// Dynamic On-Demand ExcelJS XLSX Export, and RFC-4180 UTF-8 CSV Export

import { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  Search,
  SlidersHorizontal,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import {
  type PeriodKey,
  isIsoInPeriod,
  formatWib,
  getNowWib,
} from '@/lib/utils/analyticsDateUtils';

export type ReportType = 'cases' | 'maintenance' | 'inspections';

export interface ReportRawCase {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'on_progress' | 'waiting_repair' | 'waiting_verification' | 'closed' | 'reopened';
  due_date: string | null;
  created_at: string;
  closed_at: string | null;
  has_operational_impact: boolean;
  requires_maintenance: boolean;
  category?: { id: string; name: string } | null;
  area?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
  assets?: { id: string; asset_code: string; name: string } | null;
  reporter?: { full_name: string } | null;
  case_assignments?: {
    is_current: boolean;
    assignee?: { full_name: string } | null;
  }[];
}

export interface ReportRawInspection {
  id: string;
  inspection_number: string;
  status: 'draft' | 'completed' | 'cancelled';
  overall_result: 'ok' | 'ng' | 'na' | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  template?: { name: string } | null;
  asset?: { asset_code: string; name: string } | null;
  inspector?: { full_name: string } | null;
}

export interface ReportRawInspectionResult {
  id: string;
  inspection_id: string;
  value: 'ok' | 'ng' | 'na' | null;
  notes: string | null;
}

interface ReportsWorkspaceProps {
  cases: ReportRawCase[];
  inspections: ReportRawInspection[];
  inspectionResults: ReportRawInspectionResult[];
  warehouseName: string;
  warehouseCode: string;
}

const PAGE_SIZE = 15;

const REPORT_TYPES: { key: ReportType; label: string; icon: React.ElementType; description: string }[] = [
  {
    key: 'cases',
    label: 'Rekapitulasi Kasus Operasional',
    icon: FileText,
    description: 'Seluruh rekam jejak insiden operasional, status penanganan, pelapor, dan kepatuhan SLA',
  },
  {
    key: 'maintenance',
    label: 'Log Pemeliharaan & Maintenance',
    icon: Wrench,
    description: 'Daftar kasus perbaikan mesin/aset, penugasan teknisi, dan riwayat downtime gudang',
  },
  {
    key: 'inspections',
    label: 'Hasil Audit & QC Inspeksi',
    icon: ClipboardCheck,
    description: 'Rangkuman sesi checklist inspeksi harian, temuan OK/NG, dan verifikasi auditor',
  },
];

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'all', label: 'Semua Data' },
  { key: 'month', label: 'Bulan Ini' },
  { key: '7d', label: '7 Hari Terakhir' },
  { key: '30d', label: '30 Hari Terakhir' },
];

export function ReportsWorkspace({
  cases,
  inspections,
  inspectionResults,
  warehouseName,
  warehouseCode,
}: ReportsWorkspaceProps) {
  const [reportType, setReportType] = useState<ReportType>('cases');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Map inspection results by inspection ID for quick aggregation
  const inspectionResultsMap = useMemo(() => {
    const map = new Map<string, { ok: number; ng: number; na: number }>();
    for (const r of inspectionResults) {
      if (!map.has(r.inspection_id)) {
        map.set(r.inspection_id, { ok: 0, ng: 0, na: 0 });
      }
      const entry = map.get(r.inspection_id)!;
      if (r.value === 'ok') entry.ok++;
      else if (r.value === 'ng') entry.ng++;
      else if (r.value === 'na') entry.na++;
    }
    return map;
  }, [inspectionResults]);

  // ── FILTERED DATASET GENERATION (Authoritative filtered dataset for table and exports) ──
  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (reportType === 'cases') {
      return cases.filter((c) => {
        // Period filter by created_at
        if (!isIsoInPeriod(c.created_at, selectedPeriod)) return false;

        // Status filter
        if (statusFilter !== 'all' && c.status !== statusFilter) return false;

        // Priority filter
        if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;

        // Search query
        if (query) {
          const matchNum = c.case_number.toLowerCase().includes(query);
          const matchTitle = c.title.toLowerCase().includes(query);
          const matchArea = c.area?.name?.toLowerCase().includes(query) ?? false;
          const matchAsset = c.assets?.name?.toLowerCase().includes(query) ?? false;
          const matchReporter = c.reporter?.full_name?.toLowerCase().includes(query) ?? false;
          if (!matchNum && !matchTitle && !matchArea && !matchAsset && !matchReporter) return false;
        }

        return true;
      });
    }

    if (reportType === 'maintenance') {
      return cases
        .filter((c) => c.requires_maintenance)
        .filter((c) => {
          if (!isIsoInPeriod(c.created_at, selectedPeriod)) return false;
          if (statusFilter !== 'all' && c.status !== statusFilter) return false;
          if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;

          if (query) {
            const matchNum = c.case_number.toLowerCase().includes(query);
            const matchTitle = c.title.toLowerCase().includes(query);
            const matchAsset = c.assets?.name?.toLowerCase().includes(query) ?? false;
            const matchCode = c.assets?.asset_code?.toLowerCase().includes(query) ?? false;
            if (!matchNum && !matchTitle && !matchAsset && !matchCode) return false;
          }
          return true;
        });
    }

    if (reportType === 'inspections') {
      return inspections.filter((insp) => {
        const dateToCheck = insp.completed_at || insp.created_at;
        if (!isIsoInPeriod(dateToCheck, selectedPeriod)) return false;

        if (statusFilter !== 'all' && insp.status !== statusFilter) return false;

        if (query) {
          const matchNum = insp.inspection_number.toLowerCase().includes(query);
          const matchTemplate = insp.template?.name?.toLowerCase().includes(query) ?? false;
          const matchAsset = insp.asset?.name?.toLowerCase().includes(query) ?? false;
          const matchCode = insp.asset?.asset_code?.toLowerCase().includes(query) ?? false;
          const matchInspector = insp.inspector?.full_name?.toLowerCase().includes(query) ?? false;
          if (!matchNum && !matchTemplate && !matchAsset && !matchCode && !matchInspector) return false;
        }
        return true;
      });
    }

    return [];
  }, [cases, inspections, reportType, selectedPeriod, statusFilter, priorityFilter, searchQuery]);

  // Reset pagination on filter or type change
  const totalRows = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const paginatedData = useMemo(() => {
    const from = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(from, from + PAGE_SIZE);
  }, [filteredData, currentPage]);

  const handleTypeChange = (type: ReportType) => {
    setReportType(type);
    setCurrentPage(1);
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  // ── AUTHORITATIVE DYNAMIC EXCELJS XLSX EXPORT (Lazy Loaded On-Demand) ──
  const handleExportExcel = async () => {
    if (filteredData.length === 0) return;
    setIsExportingExcel(true);

    try {
      // Dynamic import ensures ExcelJS is excluded from initial route bundle
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'WACT V2 Operational System';
      workbook.created = new Date();

      const typeMeta = REPORT_TYPES.find((t) => t.key === reportType)!;
      const sheetName = reportType === 'cases' ? 'Kasus' : reportType === 'maintenance' ? 'Maintenance' : 'Inspeksi';
      const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ showGridLines: true }],
      });

      // 1. Title & Metadata Header Block
      worksheet.mergeCells('A1:F1');
      worksheet.getCell('A1').value = `LAPORAN: ${typeMeta.label.toUpperCase()}`;
      worksheet.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E293B' } };

      worksheet.getCell('A2').value = `Gudang: ${warehouseCode} — ${warehouseName}`;
      worksheet.getCell('A3').value = `Periode: ${PERIOD_OPTIONS.find((p) => p.key === selectedPeriod)?.label}`;
      worksheet.getCell('A4').value = `Diekspor Pada: ${formatWib(new Date(), 'dd MMMM yyyy, HH:mm')} WIB`;
      worksheet.getCell('A5').value = `Total Data: ${totalRows} baris`;

      [worksheet.getCell('A2'), worksheet.getCell('A3'), worksheet.getCell('A4'), worksheet.getCell('A5')].forEach(
        (cell) => {
          cell.font = { name: 'Arial', size: 10, color: { argb: 'FF64748B' } };
        }
      );

      // 2. Table Column Headers
      let headers: string[] = [];
      if (reportType === 'cases') {
        headers = [
          'No',
          'Nomor Kasus',
          'Judul Kasus',
          'Area',
          'Lokasi',
          'Aset',
          'Prioritas',
          'Status',
          'Pelapor',
          'PIC Ditugaskan',
          'Target SLA (WIB)',
          'Waktu Selesai (WIB)',
          'Status SLA',
        ];
      } else if (reportType === 'maintenance') {
        headers = [
          'No',
          'Nomor Kasus',
          'Nama Mesin / Aset',
          'Kode Aset',
          'Area / Lokasi',
          'Masalah',
          'Prioritas',
          'Status',
          'PIC Teknisi',
          'Dampak Operasional',
          'Tanggal Dilaporkan (WIB)',
        ];
      } else if (reportType === 'inspections') {
        headers = [
          'No',
          'Nomor Inspeksi',
          'Template Checklist',
          'Nama Aset',
          'Kode Aset',
          'Auditor / Inspector',
          'Status Sesi',
          'Hasil Keseluruhan',
          'Item OK',
          'Item NG',
          'Item N/A',
          'Waktu Selesai (WIB)',
        ];
      }

      const headerRowIndex = 7;
      const headerRow = worksheet.getRow(headerRowIndex);
      headers.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = h;
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E3A8A' }, // Dark Blue #1E3A8A
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        };
      });
      headerRow.height = 24;

      // 3. Populate Rows
      const now = new Date();
      filteredData.forEach((item: any, rowIdx) => {
        const rIndex = headerRowIndex + 1 + rowIdx;
        const row = worksheet.getRow(rIndex);

        if (reportType === 'cases') {
          const isClosed = item.status === 'closed';
          const isOverdue = !isClosed && item.due_date && new Date(item.due_date) < now;
          const slaStatus = isClosed
            ? item.due_date && item.closed_at
              ? new Date(item.closed_at) <= new Date(item.due_date)
                ? 'Selesai Tepat SLA'
                : 'Selesai Lewat SLA'
              : 'Selesai'
            : isOverdue
            ? 'LEWAT SLA (Overdue)'
            : item.due_date
            ? 'Dalam Batas SLA'
            : 'Tanpa SLA';

          const currentAssignee = Array.isArray(item.case_assignments)
            ? item.case_assignments.find((a: any) => a.is_current)?.assignee?.full_name
            : '—';

          row.values = [
            rowIdx + 1,
            item.case_number,
            item.title,
            item.area?.name || '—',
            item.location?.name || '—',
            item.assets?.name ? `${item.assets.name} (${item.assets.asset_code})` : '—',
            item.priority.toUpperCase(),
            item.status.toUpperCase(),
            item.reporter?.full_name || '—',
            currentAssignee || 'Belum Ditugaskan',
            formatWib(item.due_date, 'dd/MM/yyyy HH:mm'),
            formatWib(item.closed_at, 'dd/MM/yyyy HH:mm'),
            slaStatus,
          ];
        } else if (reportType === 'maintenance') {
          const currentAssignee = Array.isArray(item.case_assignments)
            ? item.case_assignments.find((a: any) => a.is_current)?.assignee?.full_name
            : '—';

          row.values = [
            rowIdx + 1,
            item.case_number,
            item.assets?.name || '—',
            item.assets?.asset_code || '—',
            item.area?.name ? `${item.area.name} - ${item.location?.name || ''}` : '—',
            item.title,
            item.priority.toUpperCase(),
            item.status.toUpperCase(),
            currentAssignee || 'Belum Ditugaskan',
            item.has_operational_impact ? 'Ya (Berdampak)' : 'Tidak',
            formatWib(item.created_at, 'dd/MM/yyyy HH:mm'),
          ];
        } else if (reportType === 'inspections') {
          const counts = inspectionResultsMap.get(item.id) || { ok: 0, ng: 0, na: 0 };
          row.values = [
            rowIdx + 1,
            item.inspection_number,
            item.template?.name || '—',
            item.asset?.name || '—',
            item.asset?.asset_code || '—',
            item.inspector?.full_name || '—',
            item.status.toUpperCase(),
            item.overall_result ? item.overall_result.toUpperCase() : '—',
            counts.ok,
            counts.ng,
            counts.na,
            formatWib(item.completed_at, 'dd/MM/yyyy HH:mm'),
          ];
        }

        row.font = { name: 'Arial', size: 9 };
        row.alignment = { vertical: 'middle' };
        row.height = 20;

        // Subtle zebra striping
        if (rowIdx % 2 === 1) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
      });

      // Auto-fit column widths
      worksheet.columns.forEach((col: any) => {
        let maxLen = 12;
        col.eachCell({ includeEmpty: true }, (cell: any) => {
          const val = cell.value ? String(cell.value) : '';
          maxLen = Math.max(maxLen, Math.min(val.length + 3, 40));
        });
        col.width = maxLen;
      });

      // Write and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `WACT_${warehouseCode}_${reportType}_${formatWib(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export Excel:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // ── AUTHORITATIVE RFC-4180 UTF-8 CSV EXPORT (Lightweight Client-Side) ──
  const handleExportCsv = () => {
    if (filteredData.length === 0) return;
    setIsExportingCsv(true);

    try {
      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      let csvRows: string[] = [];
      const now = new Date();

      if (reportType === 'cases') {
        csvRows.push(
          [
            'No',
            'Nomor Kasus',
            'Judul Kasus',
            'Area',
            'Lokasi',
            'Aset',
            'Kode Aset',
            'Prioritas',
            'Status',
            'Pelapor',
            'PIC Ditugaskan',
            'Target SLA',
            'Waktu Selesai',
            'Status SLA',
          ].map(escapeCsv).join(',')
        );

        filteredData.forEach((c: any, idx) => {
          const isClosed = c.status === 'closed';
          const isOverdue = !isClosed && c.due_date && new Date(c.due_date) < now;
          const slaStatus = isClosed
            ? c.due_date && c.closed_at
              ? new Date(c.closed_at) <= new Date(c.due_date)
                ? 'Selesai Tepat SLA'
                : 'Selesai Lewat SLA'
              : 'Selesai'
            : isOverdue
            ? 'LEWAT SLA'
            : c.due_date
            ? 'Dalam Batas SLA'
            : 'Tanpa SLA';

          const currentAssignee = Array.isArray(c.case_assignments)
            ? c.case_assignments.find((a: any) => a.is_current)?.assignee?.full_name
            : '';

          csvRows.push(
            [
              idx + 1,
              c.case_number,
              c.title,
              c.area?.name || '',
              c.location?.name || '',
              c.assets?.name || '',
              c.assets?.asset_code || '',
              c.priority,
              c.status,
              c.reporter?.full_name || '',
              currentAssignee,
              formatWib(c.due_date, 'yyyy-MM-dd HH:mm'),
              formatWib(c.closed_at, 'yyyy-MM-dd HH:mm'),
              slaStatus,
            ].map(escapeCsv).join(',')
          );
        });
      } else if (reportType === 'maintenance') {
        csvRows.push(
          [
            'No',
            'Nomor Kasus',
            'Nama Mesin / Aset',
            'Kode Aset',
            'Area',
            'Lokasi',
            'Deskripsi Masalah',
            'Prioritas',
            'Status',
            'PIC Teknisi',
            'Dampak Operasional',
            'Tanggal Dibuat',
          ].map(escapeCsv).join(',')
        );

        filteredData.forEach((c: any, idx) => {
          const currentAssignee = Array.isArray(c.case_assignments)
            ? c.case_assignments.find((a: any) => a.is_current)?.assignee?.full_name
            : '';

          csvRows.push(
            [
              idx + 1,
              c.case_number,
              c.assets?.name || '',
              c.assets?.asset_code || '',
              c.area?.name || '',
              c.location?.name || '',
              c.title,
              c.priority,
              c.status,
              currentAssignee,
              c.has_operational_impact ? 'Ya' : 'Tidak',
              formatWib(c.created_at, 'yyyy-MM-dd HH:mm'),
            ].map(escapeCsv).join(',')
          );
        });
      } else if (reportType === 'inspections') {
        csvRows.push(
          [
            'No',
            'Nomor Inspeksi',
            'Template',
            'Nama Aset',
            'Kode Aset',
            'Auditor / Inspector',
            'Status Sesi',
            'Hasil',
            'Item OK',
            'Item NG',
            'Item NA',
            'Waktu Selesai',
          ].map(escapeCsv).join(',')
        );

        filteredData.forEach((insp: any, idx) => {
          const counts = inspectionResultsMap.get(insp.id) || { ok: 0, ng: 0, na: 0 };
          csvRows.push(
            [
              idx + 1,
              insp.inspection_number,
              insp.template?.name || '',
              insp.asset?.name || '',
              insp.asset?.asset_code || '',
              insp.inspector?.full_name || '',
              insp.status,
              insp.overall_result || '',
              counts.ok,
              counts.ng,
              counts.na,
              formatWib(insp.completed_at, 'yyyy-MM-dd HH:mm'),
            ].map(escapeCsv).join(',')
          );
        });
      }

      // UTF-8 BOM for flawless Excel Indonesian character rendering
      const csvString = '\uFEFF' + csvRows.join('\r\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `WACT_${warehouseCode}_${reportType}_${formatWib(new Date(), 'yyyyMMdd_HHmm')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* ── Header & Workspace Controls ── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200/60 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{warehouseCode} — {warehouseName}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>WIB (UTC+7)</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Pusat Laporan & Rekapitulasi Data
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ekspor rekapitulasi data operasional terstruktur ke format Excel (.xlsx) dan CSV
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <button
            onClick={handleExportCsv}
            disabled={isExportingCsv || filteredData.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExportingCsv ? 'Menyiapkan...' : 'Ekspor CSV'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel || filteredData.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>{isExportingExcel ? 'Membuat Excel...' : 'Ekspor Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* ── Report Type Switcher Tabs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {REPORT_TYPES.map((t) => {
          const Icon = t.icon;
          const isActive = reportType === t.key;
          return (
            <button
              key={t.key}
              onClick={() => handleTypeChange(t.key)}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between space-y-2',
                isActive
                  ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
              )}
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center',
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                )}
              </div>
              <div>
                <h3 className={cn('text-xs sm:text-sm font-bold', isActive ? 'text-blue-950' : 'text-slate-900')}>
                  {t.label}
                </h3>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                  {t.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                reportType === 'inspections'
                  ? 'Cari nomor inspeksi, template, aset, auditor...'
                  : 'Cari nomor kasus, judul, area, aset, pelapor...'
              }
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 max-w-full overflow-x-auto">
              <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5 shrink-0" />
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setSelectedPeriod(opt.key);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0',
                    selectedPeriod === opt.key
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Status Dropdown */}
            {reportType !== 'inspections' ? (
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Semua Status</option>
                <option value="open">Open</option>
                <option value="reopened">Reopened</option>
                <option value="on_progress">On Progress</option>
                <option value="waiting_repair">Menunggu Perbaikan</option>
                <option value="waiting_verification">Verifikasi QC</option>
                <option value="closed">Selesai (Closed)</option>
              </select>
            ) : (
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Semua Status</option>
                <option value="completed">Completed</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>
            )}

            {/* Priority Dropdown (Cases & Maintenance) */}
            {reportType !== 'inspections' && (
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Semua Prioritas</option>
                <option value="critical">Kritis (Critical)</option>
                <option value="high">Tinggi (High)</option>
                <option value="medium">Sedang (Medium)</option>
                <option value="low">Rendah (Low)</option>
              </select>
            )}
          </div>
        </div>

        {/* Results Counter Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <span>Menampilkan <strong>{filteredData.length}</strong> data terverifikasi</span>
            {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || selectedPeriod !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setSelectedPeriod('all');
                  setCurrentPage(1);
                }}
                className="text-blue-600 font-bold hover:underline ml-2"
              >
                Reset Filter
              </button>
            )}
          </div>
          <span>Halaman {currentPage} dari {totalPages}</span>
        </div>
      </div>

      {/* ── High-Density Data Preview Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden max-w-full">
        <div className="overflow-x-auto w-full max-w-full">
          {reportType === 'cases' && (
            <table className="w-full min-w-[640px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nomor & Judul Kasus</th>
                  <th className="py-3 px-4">Area & Lokasi</th>
                  <th className="py-3 px-4">Prioritas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Pelapor & PIC</th>
                  <th className="py-3 px-4">Target SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                      Tidak ada data kasus yang sesuai dengan filter
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((c: any, idx) => {
                    const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                    const currentAssignee = Array.isArray(c.case_assignments)
                      ? c.case_assignments.find((a: any) => a.is_current)?.assignee?.full_name
                      : null;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-slate-400 font-semibold">{rowNum}</td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-mono font-bold text-blue-700 text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                              {c.case_number}
                            </span>
                            {c.requires_maintenance && (
                              <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                Maint
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-slate-900 truncate">{c.title}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          <div>{c.area?.name || '—'}</div>
                          <div className="text-[10px] text-slate-400">{c.location?.name || ''}</div>
                        </td>
                        <td className="py-3 px-4">
                          <PriorityBadge priority={c.priority} size="sm" />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={c.status} size="sm" />
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <div className="font-semibold text-slate-900">{c.reporter?.full_name || '—'}</div>
                          <div className="text-[10.5px] text-slate-500 truncate">
                            PIC: {currentAssignee || 'Belum ditugaskan'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">
                          {c.due_date ? formatWib(c.due_date, 'dd MMM yyyy, HH:mm') : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {reportType === 'maintenance' && (
            <table className="w-full min-w-[640px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nomor & Kasus</th>
                  <th className="py-3 px-4">Mesin / Aset Terkait</th>
                  <th className="py-3 px-4">Area</th>
                  <th className="py-3 px-4">Prioritas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tanggal Dilaporkan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                      Tidak ada data log pemeliharaan mesin yang sesuai
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((c: any, idx) => {
                    const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-slate-400 font-semibold">{rowNum}</td>
                        <td className="py-3 px-4 max-w-xs">
                          <span className="font-mono font-bold text-blue-700 text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 block mb-0.5 w-fit">
                            {c.case_number}
                          </span>
                          <p className="font-bold text-slate-900 truncate">{c.title}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {c.assets?.name ? (
                            <div>
                              <div className="font-bold text-slate-900">{c.assets.name}</div>
                              <div className="text-[10.5px] font-mono text-slate-500">{c.assets.asset_code}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Tidak terhubung aset spesifik</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {c.area?.name || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <PriorityBadge priority={c.priority} size="sm" />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={c.status} size="sm" />
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">
                          {formatWib(c.created_at, 'dd MMM yyyy, HH:mm')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {reportType === 'inspections' && (
            <table className="w-full min-w-[640px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nomor Inspeksi</th>
                  <th className="py-3 px-4">Template Checklist</th>
                  <th className="py-3 px-4">Aset Diperiksa</th>
                  <th className="py-3 px-4">Auditor</th>
                  <th className="py-3 px-4">Hasil / Status</th>
                  <th className="py-3 px-4">Temuan Item</th>
                  <th className="py-3 px-4">Waktu Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                      Tidak ada data audit inspeksi QC yang sesuai
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((insp: any, idx) => {
                    const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                    const counts = inspectionResultsMap.get(insp.id) || { ok: 0, ng: 0, na: 0 };
                    return (
                      <tr key={insp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-slate-400 font-semibold">{rowNum}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {insp.inspection_number}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {insp.template?.name || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {insp.asset?.name ? (
                            <div>
                              <div className="font-semibold">{insp.asset.name}</div>
                              <div className="text-[10px] font-mono text-slate-500">{insp.asset.asset_code}</div>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {insp.inspector?.full_name || 'Staff'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10.5px] font-bold uppercase',
                              insp.status === 'completed'
                                ? insp.overall_result === 'ng'
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {insp.status === 'completed'
                              ? `Selesai (${insp.overall_result?.toUpperCase() || 'OK'})`
                              : insp.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-[10.5px] font-bold font-mono">
                            <span className="text-emerald-700 bg-emerald-50 px-1 rounded">{counts.ok} OK</span>
                            <span className="text-rose-700 bg-rose-50 px-1 rounded">{counts.ng} NG</span>
                            <span className="text-slate-500 bg-slate-100 px-1 rounded">{counts.na} NA</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">
                          {insp.completed_at ? formatWib(insp.completed_at, 'dd MMM yyyy, HH:mm') : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination Controls ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border-t border-slate-200 text-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>
            <span className="text-slate-600 font-medium">
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
