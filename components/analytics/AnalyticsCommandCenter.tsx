'use client';
// components/analytics/AnalyticsCommandCenter.tsx
// Operational Intelligence Command Center Component with 5 Core Historical KPIs,
// Real-time Operational Snapshot, Recharts Trend Timeline, and Distribution Insights

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Calendar,
  Building2,
  Layers,
  MapPin,
  Wrench,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  type PeriodKey,
  getPeriodDateRange,
  isIsoInPeriod,
  getDailyChartBuckets,
  formatWib,
  TIMEZONE,
} from '@/lib/utils/analyticsDateUtils';
import { differenceInMinutes } from 'date-fns';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export interface AnalyticsRawCase {
  id: string;
  case_number: string;
  title: string;
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
  asset?: { id: string; asset_code: string; name: string } | null;
}

export interface AnalyticsRawInspection {
  id: string;
  inspection_number: string;
  status: 'draft' | 'completed' | 'cancelled';
  overall_result: 'ok' | 'ng' | 'na' | null;
  completed_at: string | null;
  created_at: string;
  template?: { name: string } | null;
  asset?: { asset_code: string; name: string } | null;
}

export interface AnalyticsRawInspectionResult {
  id: string;
  inspection_id: string;
  value: 'ok' | 'ng' | 'na' | null;
}

interface AnalyticsCommandCenterProps {
  cases: AnalyticsRawCase[];
  inspections: AnalyticsRawInspection[];
  inspectionResults: AnalyticsRawInspectionResult[];
  warehouseName: string;
  warehouseCode: string;
}

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: '7d', label: '7 Hari Terakhir' },
  { key: '30d', label: '30 Hari Terakhir' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'all', label: 'Semua Waktu' },
];

export function AnalyticsCommandCenter({
  cases,
  inspections,
  inspectionResults,
  warehouseName,
  warehouseCode,
}: AnalyticsCommandCenterProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('all');

  // ── 1. CURRENT OPERATIONAL SNAPSHOT (Real-time at view time, NOT period-filtered) ──
  const currentSnapshot = useMemo(() => {
    const now = new Date();
    const activeCases = cases.filter((c) => c.status !== 'closed');
    const totalActive = activeCases.length;
    const currentReopened = cases.filter((c) => c.status === 'reopened').length;

    let overdueCount = 0;
    let approachingCount = 0;
    let onTimeCount = 0;
    let noSlaCount = 0;

    for (const c of activeCases) {
      if (!c.due_date) {
        noSlaCount++;
        continue;
      }
      const dueDate = new Date(c.due_date);
      const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours < 0) {
        overdueCount++;
      } else if (diffHours <= 4) {
        approachingCount++;
      } else {
        onTimeCount++;
      }
    }

    return {
      totalActive,
      currentReopened,
      overdueCount,
      approachingCount,
      onTimeCount,
      noSlaCount,
    };
  }, [cases]);

  // ── 2. HISTORICAL / PERIOD-FILTERED METRICS ──
  const periodMetrics = useMemo(() => {
    // Filter cases by created_at in period
    const casesCreatedInPeriod = cases.filter((c) => isIsoInPeriod(c.created_at, selectedPeriod));
    const totalNewCases = casesCreatedInPeriod.length;

    // Filter closed cases by closed_at in period
    const casesClosedInPeriod = cases.filter(
      (c) => c.status === 'closed' && c.closed_at && isIsoInPeriod(c.closed_at, selectedPeriod)
    );
    const totalClosedCases = casesClosedInPeriod.length;

    // SLA Compliance (Closed cases in period with valid due_date)
    const closedWithDueDate = casesClosedInPeriod.filter((c) => c.due_date);
    const closedOnTime = closedWithDueDate.filter(
      (c) => new Date(c.closed_at!) <= new Date(c.due_date!)
    );
    const slaEligibleCount = closedWithDueDate.length;
    const slaOnTimeCount = closedOnTime.length;
    const slaComplianceRate =
      slaEligibleCount > 0 ? (slaOnTimeCount / slaEligibleCount) * 100 : null;

    // MTTR (Average resolution time for closed cases in period)
    let avgResolutionMinutes: number | null = null;
    if (totalClosedCases > 0) {
      const totalMinutes = casesClosedInPeriod.reduce((acc, c) => {
        return acc + differenceInMinutes(new Date(c.closed_at!), new Date(c.created_at));
      }, 0);
      avgResolutionMinutes = totalMinutes / totalClosedCases;
    }

    // Completed Inspections in period (by completed_at)
    const completedInspectionsInPeriod = inspections.filter(
      (i) => i.status === 'completed' && i.completed_at && isIsoInPeriod(i.completed_at, selectedPeriod)
    );
    const totalCompletedInspections = completedInspectionsInPeriod.length;
    const completedInspectionIds = new Set(completedInspectionsInPeriod.map((i) => i.id));

    // QC Defect Rate from completed inspections in period
    const resultsInPeriod = inspectionResults.filter((r) => completedInspectionIds.has(r.inspection_id));
    const okCount = resultsInPeriod.filter((r) => r.value === 'ok').length;
    const ngCount = resultsInPeriod.filter((r) => r.value === 'ng').length;
    const naCount = resultsInPeriod.filter((r) => r.value === 'na').length;
    const applicableItems = okCount + ngCount;
    const qcDefectRate = applicableItems > 0 ? (ngCount / applicableItems) * 100 : null;

    return {
      totalNewCases,
      totalClosedCases,
      slaComplianceRate,
      slaEligibleCount,
      slaOnTimeCount,
      avgResolutionMinutes,
      totalCompletedInspections,
      qcDefectRate,
      ngCount,
      okCount,
      naCount,
      applicableItems,
      casesCreatedInPeriod,
    };
  }, [cases, inspections, inspectionResults, selectedPeriod]);

  // ── 3. RECHARTS TREND TIMELINE DATA ──
  const trendData = useMemo(() => {
    const buckets = getDailyChartBuckets(selectedPeriod);
    const bucketMap = new Map<string, { dateLabel: string; created: number; closed: number }>();

    for (const b of buckets) {
      bucketMap.set(b.key, {
        dateLabel: b.label,
        created: 0,
        closed: 0,
      });
    }

    // Populate created counts by created_at WIB day
    for (const c of cases) {
      const dayKey = formatWib(c.created_at, 'yyyy-MM-dd');
      if (bucketMap.has(dayKey)) {
        bucketMap.get(dayKey)!.created += 1;
      }
    }

    // Populate closed counts by closed_at WIB day
    for (const c of cases) {
      if (c.status === 'closed' && c.closed_at) {
        const dayKey = formatWib(c.closed_at, 'yyyy-MM-dd');
        if (bucketMap.has(dayKey)) {
          bucketMap.get(dayKey)!.closed += 1;
        }
      }
    }

    return Array.from(bucketMap.values());
  }, [cases, selectedPeriod]);

  // ── 4. OPERATIONAL DISTRIBUTIONS ──
  const distributions = useMemo(() => {
    // Status breakdown (all cases in period or all-time)
    const dataset = selectedPeriod === 'all' ? cases : periodMetrics.casesCreatedInPeriod;
    const total = dataset.length || 1;

    const statusCounts = {
      open: dataset.filter((c) => c.status === 'open').length,
      reopened: dataset.filter((c) => c.status === 'reopened').length,
      on_progress: dataset.filter((c) => c.status === 'on_progress').length,
      waiting_repair: dataset.filter((c) => c.status === 'waiting_repair').length,
      waiting_verification: dataset.filter((c) => c.status === 'waiting_verification').length,
      closed: dataset.filter((c) => c.status === 'closed').length,
    };

    const priorityCounts = {
      critical: dataset.filter((c) => c.priority === 'critical').length,
      high: dataset.filter((c) => c.priority === 'high').length,
      medium: dataset.filter((c) => c.priority === 'medium').length,
      low: dataset.filter((c) => c.priority === 'low').length,
    };

    // Area Hotspot counts
    const areaMap = new Map<string, number>();
    for (const c of dataset) {
      const areaName = c.area?.name || 'Area Belum Ditentukan';
      areaMap.set(areaName, (areaMap.get(areaName) || 0) + 1);
    }
    const areaHotspots = Array.from(areaMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      statusCounts,
      priorityCounts,
      areaHotspots,
      datasetTotal: dataset.length,
      total,
    };
  }, [cases, periodMetrics.casesCreatedInPeriod, selectedPeriod]);

  // Helper to format MTTR
  const formatMttr = (minutes: number | null) => {
    if (minutes === null) return '—';
    if (minutes < 60) return `${Math.round(minutes)} mnt`;
    const hours = (minutes / 60).toFixed(1);
    return `${hours} jam`;
  };

  return (
    <div className="space-y-6">
      {/* ── Executive Header ── */}
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
            Analitik & Intelijen Operasional
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitoring performa kepatuhan SLA, waktu penyelesaian kasus, dan kualitas inspeksi gudang
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 self-start md:self-auto overflow-x-auto max-w-full">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSelectedPeriod(opt.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                selectedPeriod === opt.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 5 Core Historical Period KPI Cards ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">
              Metrik Periode: {PERIOD_OPTIONS.find((p) => p.key === selectedPeriod)?.label}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. Total Kasus Baru */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Kasus Baru
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {periodMetrics.totalNewCases}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>Selesai di periode:</span>
              <span className="font-bold text-slate-800">{periodMetrics.totalClosedCases}</span>
            </div>
          </div>

          {/* 2. Kepatuhan SLA Selesai */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Kepatuhan SLA
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {periodMetrics.slaComplianceRate !== null
                  ? `${periodMetrics.slaComplianceRate.toFixed(1)}%`
                  : '—'}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100 truncate">
              {periodMetrics.slaEligibleCount > 0
                ? `${periodMetrics.slaOnTimeCount}/${periodMetrics.slaEligibleCount} tepat SLA`
                : 'Belum ada kasus selesai'}
            </div>
          </div>

          {/* 3. Waktu Selesai (MTTR) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Rata-rata MTTR
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {formatMttr(periodMetrics.avgResolutionMinutes)}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100 truncate">
              {periodMetrics.totalClosedCases > 0
                ? `Dari ${periodMetrics.totalClosedCases} kasus selesai`
                : 'Belum ada kasus selesai'}
            </div>
          </div>

          {/* 4. Sesi QC Selesai */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Inspeksi QC
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {periodMetrics.totalCompletedInspections}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100 truncate">
              {periodMetrics.totalCompletedInspections > 0
                ? `${periodMetrics.totalCompletedInspections} sesi selesai diaudit`
                : 'Belum ada audit selesai'}
            </div>
          </div>

          {/* 5. Tingkat Temuan NG QC */}
          <div className="col-span-2 lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Defect Rate QC
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {periodMetrics.qcDefectRate !== null
                  ? `${periodMetrics.qcDefectRate.toFixed(1)}%`
                  : '—'}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100 truncate">
              {periodMetrics.applicableItems > 0
                ? `${periodMetrics.ngCount} NG dari ${periodMetrics.applicableItems} item applicable`
                : 'Belum ada data QC'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Real-time Operational Snapshot Tier ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
              <span>Snapshot Operasional Berjalan</span>
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/30">
              Saat Ini
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Kondisi riil antrean & SLA saat ini di gudang
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Aktif */}
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <span className="text-[10.5px] text-slate-400 font-medium block mb-1">Kasus Aktif</span>
            <div className="text-xl sm:text-2xl font-black text-white">
              {currentSnapshot.totalActive}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block truncate">Sedang ditangani</span>
          </div>

          {/* Reopened Aktif */}
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <span className="text-[10.5px] text-slate-400 font-medium block mb-1">Kasus Reopened</span>
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              {currentSnapshot.currentReopened}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block truncate">Perlu re-evaluasi</span>
          </div>

          {/* Overdue */}
          <div className="bg-rose-500/10 rounded-xl p-3.5 border border-rose-500/30">
            <span className="text-[10.5px] text-rose-300 font-medium block mb-1">SLA Overdue</span>
            <div className="text-xl sm:text-2xl font-black text-rose-400">
              {currentSnapshot.overdueCount}
            </div>
            <span className="text-[10px] text-rose-300/80 mt-1 block truncate">Lewat batas waktu</span>
          </div>

          {/* Mendekati Deadline */}
          <div className="bg-amber-500/10 rounded-xl p-3.5 border border-amber-500/30">
            <span className="text-[10.5px] text-amber-300 font-medium block mb-1">Mendekati SLA</span>
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              {currentSnapshot.approachingCount}
            </div>
            <span className="text-[10px] text-amber-300/80 mt-1 block truncate">Sisa waktu ≤ 4 jam</span>
          </div>

          {/* Aman */}
          <div className="bg-emerald-500/10 rounded-xl p-3.5 border border-emerald-500/30">
            <span className="text-[10.5px] text-emerald-300 font-medium block mb-1">SLA Aman</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {currentSnapshot.onTimeCount}
            </div>
            <span className="text-[10px] text-emerald-300/80 mt-1 block truncate">Dalam batas waktu</span>
          </div>

          {/* Tanpa Target SLA */}
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <span className="text-[10.5px] text-slate-400 font-medium block mb-1">Tanpa Target SLA</span>
            <div className="text-xl sm:text-2xl font-black text-slate-300">
              {currentSnapshot.noSlaCount}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block truncate">Belum diisi deadline</span>
          </div>
        </div>
      </div>

      {/* ── Main Trend Timeline Chart ── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Tren Kasus Masuk vs Kasus Selesai
            </h2>
            <p className="text-xs text-slate-500">
              Perbandingan laju pembuatan insiden baru terhadap penyelesaian kasus per hari
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
              <span>Kasus Masuk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span>Kasus Selesai</span>
            </div>
          </div>
        </div>

        <div className="w-full h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="dateLabel"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '0.75rem',
                  border: 'none',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey="created"
                name="Kasus Masuk"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorCreated)"
              />
              <Area
                type="monotone"
                dataKey="closed"
                name="Kasus Selesai"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorClosed)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Operational Distributions Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Distribusi Status Kasus</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              Total: {distributions.datasetTotal} kasus
            </span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Open', count: distributions.statusCounts.open, color: 'bg-blue-500' },
              { label: 'Reopened', count: distributions.statusCounts.reopened, color: 'bg-amber-500' },
              { label: 'On Progress', count: distributions.statusCounts.on_progress, color: 'bg-indigo-500' },
              { label: 'Menunggu Perbaikan', count: distributions.statusCounts.waiting_repair, color: 'bg-orange-500' },
              { label: 'Verifikasi QC', count: distributions.statusCounts.waiting_verification, color: 'bg-purple-500' },
              { label: 'Selesai (Closed)', count: distributions.statusCounts.closed, color: 'bg-emerald-500' },
            ].map((item) => {
              const pct = distributions.datasetTotal > 0
                ? Math.round((item.count / distributions.datasetTotal) * 100)
                : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="font-bold text-slate-900">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', item.color)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-500" />
              <span>Distribusi Tingkat Prioritas</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              Total: {distributions.datasetTotal} kasus
            </span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Kritis (Critical)', count: distributions.priorityCounts.critical, color: 'bg-rose-500' },
              { label: 'Tinggi (High)', count: distributions.priorityCounts.high, color: 'bg-amber-500' },
              { label: 'Sedang (Medium)', count: distributions.priorityCounts.medium, color: 'bg-blue-500' },
              { label: 'Rendah (Low)', count: distributions.priorityCounts.low, color: 'bg-slate-400' },
            ].map((item) => {
              const pct = distributions.datasetTotal > 0
                ? Math.round((item.count / distributions.datasetTotal) * 100)
                : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="font-bold text-slate-900">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', item.color)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Area Hotspots */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span>Hotspot Area Kasus Tertinggi</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Top Area</span>
          </div>

          {distributions.areaHotspots.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 italic">
              Belum ada data area terkait kasus
            </div>
          ) : (
            <div className="space-y-2.5">
              {distributions.areaHotspots.map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{item.name}</span>
                  </div>
                  <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    {item.count} kasus
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QC Inspection Summary */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-slate-500" />
              <span>Rekapitulasi Temuan Audit QC</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              Sesi: {periodMetrics.totalCompletedInspections}
            </span>
          </div>

          {periodMetrics.applicableItems === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 italic">
              Belum ada data item audit QC selesai di periode ini
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">OK</span>
                  <span className="text-lg font-black text-emerald-800">{periodMetrics.okCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                  <span className="text-[10px] font-bold text-rose-700 uppercase block">NG</span>
                  <span className="text-lg font-black text-rose-800">{periodMetrics.ngCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">N/A</span>
                  <span className="text-lg font-black text-slate-700">{periodMetrics.naCount}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                <div className="flex justify-between font-medium text-slate-600">
                  <span>Total Item Berlaku (OK + NG):</span>
                  <span className="font-bold text-slate-900">{periodMetrics.applicableItems} item</span>
                </div>
                <div className="flex justify-between font-medium text-slate-600">
                  <span>Tingkat Defect (NG / Applicable):</span>
                  <span className="font-extrabold text-rose-600">
                    {periodMetrics.qcDefectRate !== null ? `${periodMetrics.qcDefectRate.toFixed(1)}%` : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
