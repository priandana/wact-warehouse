// app/(app)/cases/[id]/page.tsx
// Case Detail View — Server Component with Live Supabase Data
// High-Clarity Operations Workspace (70% Enterprise Operations + 30% Fintech/Super-App Polish)

import type { Metadata } from 'next';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { EvidenceGallery, type EvidenceItem } from '@/components/cases/EvidenceGallery';
import { CaseActivityTimeline } from '@/components/cases/CaseActivityTimeline';
import {
  CaseWorkflowActionPanel,
  type AssignableUser,
  type RootCauseItem,
} from '@/components/cases/CaseWorkflowActionPanel';
import { BUCKETS } from '@/lib/supabase/storage';
import { getSlaStatus } from '@/lib/utils/sla';
import { formatMultiRoleString } from '@/lib/utils/rolePresentation';
import { resolveCapabilities } from '@/lib/permissions/resolveCapabilities';
import { Capability } from '@/lib/permissions/capabilities';
import Link from 'next/link';
import {
  ChevronLeft,
  Clock,
  MapPin,
  User,
  AlertCircle,
  Wrench,
  Activity,
  Calendar,
  Building2,
  Package,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  FileCheck2,
  HelpCircle,
  ArrowRight,
  Info,
  UserCheck,
} from 'lucide-react';
import { differenceInHours, formatDistanceToNow, isPast } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { formatWib } from '@/lib/utils/dateFormat';
import { cn } from '@/lib/utils/cn';

interface CaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: CaseDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: item } = await supabase
    .from('cases')
    .select('case_number, title')
    .eq('id', id)
    .maybeSingle();

  if (!item) return { title: 'Detail Kasus' };
  return {
    title: `${item.case_number} — ${item.title}`,
  };
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // 1. Primary Case Query with explicit column foreign key disambiguation
  const { data: item, error: caseError } = await supabase
    .from('cases')
    .select(`
      id,
      warehouse_id,
      case_number,
      title,
      description,
      priority,
      status,
      due_date,
      created_at,
      has_operational_impact,
      requires_maintenance,
      source,
      inspection_id,
      corrective_action,
      preventive_action,
      closed_at,
      reporter_id,
      warehouses:warehouse_id ( id, code, name ),
      areas:area_id ( name ),
      locations:location_id ( name ),
      assets:asset_id ( id, asset_code, name ),
      category:category_id ( name ),
      subcategory:subcategory_id ( name ),
      reporter:reporter_id ( full_name ),
      root_cause:root_cause_id ( id, name )
    `)
    .eq('id', id)
    .maybeSingle();

  if (caseError) {
    console.error('Case detail query error:', caseError);
  }

  // If primary case doesn't exist or RLS denies access
  if (!item) {
    notFound();
  }

  // 2. Decoupled Child Queries (Fail-safe: errors in child queries won't 404 the page)
  const [
    { data: assignments },
    { data: activities },
    { data: evidences },
    { data: comments },
    { data: dueDateChanges },
    { data: rawRootCauses },
    { data: rawUserProfile },
    { data: directoryUsers },
    sourceInspectionResult,
  ] = await Promise.all([
    supabase
      .from('case_assignments')
      .select(`
        id,
        assignee_id,
        is_current,
        assigned_at,
        assignee:assignee_id ( full_name )
      `)
      .eq('case_id', id),

    supabase
      .from('case_activities')
      .select(`
        id,
        action,
        from_status,
        to_status,
        metadata,
        created_at,
        actor_id,
        actor:actor_id ( full_name )
      `)
      .eq('case_id', id)
      .order('created_at', { ascending: true }),

    supabase
      .from('case_evidences')
      .select(`
        id,
        phase,
        file_url,
        file_name,
        file_size,
        mime_type,
        caption,
        uploaded_at,
        uploader_id,
        uploader:uploader_id ( full_name )
      `)
      .eq('case_id', id)
      .order('uploaded_at', { ascending: false }),

    supabase
      .from('case_comments')
      .select(`
        id,
        content,
        is_internal,
        created_at,
        author_id,
        author:author_id ( full_name )
      `)
      .eq('case_id', id)
      .order('created_at', { ascending: true }),

    supabase
      .from('due_date_changes')
      .select(`
        id,
        previous_due_date,
        new_due_date,
        reason,
        changed_at,
        changed_by,
        changer:changed_by ( full_name )
      `)
      .eq('case_id', id)
      .order('changed_at', { ascending: false }),

    supabase
      .from('root_causes')
      .select('id, name')
      .order('name'),

    supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single(),

    supabase
      .from('profile_directory')
      .select('id, full_name, avatar_url'),

    item.inspection_id
      ? supabase
          .from('inspections')
          .select('id, inspection_number, overall_result')
          .eq('id', item.inspection_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const profileMap = new Map<string, string>((directoryUsers ?? []).map((u: any) => [u.id, u.full_name]));

  const sourceInspection = sourceInspectionResult?.data ?? null;
  const isSuperAdmin = (rawUserProfile as any)?.is_super_admin ?? false;
  const warehouseName =
    (item as any)?.warehouses?.name ||
    ((item as any)?.warehouses?.code ? `Warehouse ${(item as any).warehouses.code}` : 'Warehouse');

  // Resolve caller capabilities across multi-role warehouse memberships
  const callerCapabilities = await resolveCapabilities(user.id, item.warehouse_id);
  const canAssignPIC = callerCapabilities.has(Capability.CASE_ASSIGN);

  // Guarded service-role query for PIC candidate roster (executed strictly when caller may assign)
  let assignableUsers: AssignableUser[] = [];
  if (canAssignPIC) {
    const adminClient = createAdminClient();
    const { data: rawMemberships, error: memErr } = await adminClient
      .from('user_warehouses')
      .select(`
        user_id,
        is_active,
        roles ( id, name, display_name ),
        profiles:user_id ( id, full_name, avatar_url, is_active )
      `)
      .eq('warehouse_id', item.warehouse_id)
      .eq('is_active', true);

    if (memErr) {
      console.error('Error fetching warehouse PIC candidates:', memErr);
    } else if (rawMemberships) {
      // Group by user_id to handle multi-role warehouse memberships correctly
      const userMap = new Map<
        string,
        {
          id: string;
          full_name: string;
          avatar_url: string | null;
          roles: string[];
          hasActivePicRole: boolean;
        }
      >();

      for (const row of rawMemberships) {
        const profile = row.profiles as {
          id: string;
          full_name: string;
          avatar_url: string | null;
          is_active: boolean;
        } | null;

        // Guard: active profile required
        if (!profile || !profile.is_active) continue;

        if (!userMap.has(row.user_id)) {
          userMap.set(row.user_id, {
            id: row.user_id,
            full_name: profile.full_name || 'Staff',
            avatar_url: profile.avatar_url,
            roles: [],
            hasActivePicRole: false,
          });
        }

        const userEntry = userMap.get(row.user_id)!;
        const role = row.roles as { id: string; name: string; display_name: string } | null;
        if (role?.name) {
          userEntry.roles.push(role.name);
          if (role.name === 'pic_maintenance') {
            userEntry.hasActivePicRole = true;
          }
        }
      }

      // Filter to users with active pic_maintenance role in this warehouse, deduplicated by user_id
      assignableUsers = Array.from(userMap.values())
        .filter((u) => u.hasActivePicRole)
        .map((u) => ({
          id: u.id,
          full_name: u.full_name,
          avatar_url: u.avatar_url,
          role_name: 'pic_maintenance',
          role_display_name: formatMultiRoleString(u.roles, { maxVisible: 2 }),
          roles: u.roles,
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name, 'id', { sensitivity: 'base' }));
    }
  }

  // 3. Generate signed URLs via authenticated server client
  const evidenceList: EvidenceItem[] = await Promise.all(
    (evidences ?? []).map(async (ev) => {
      let signedUrl = '';
      if (ev.file_url) {
        try {
          const { data: signData, error: signErr } = await supabase.storage
            .from(BUCKETS.CASE_EVIDENCES)
            .createSignedUrl(ev.file_url, 3600);

          if (!signErr && signData?.signedUrl) {
            signedUrl = signData.signedUrl;
          }
        } catch (err) {
          console.error('Failed to create signed URL:', ev.file_url, err);
        }
      }
      return {
        id: ev.id,
        phase: ev.phase,
        file_url: ev.file_url,
        file_name: ev.file_name,
        file_size: ev.file_size,
        mime_type: ev.mime_type,
        caption: ev.caption,
        uploaded_at: ev.uploaded_at,
        signedUrl,
        uploader: (ev.uploader as any) ?? (ev.uploader_id ? { full_name: profileMap.get(ev.uploader_id) } : null),
      };
    })
  );

  const currentAssignment = Array.isArray(assignments)
    ? assignments.find((a: any) => a.is_current)
    : null;

  const currentAssigneeName =
    currentAssignment?.assignee?.full_name ||
    (currentAssignment?.assignee_id ? profileMap.get(currentAssignment.assignee_id) : null) ||
    null;
  const isClosed = item.status === 'closed';
  const slaInfo = getSlaStatus(item.due_date, item.status, item.closed_at);
  const isOverdue = slaInfo.isOverdue && !isClosed;
  const locationText = [item.areas?.name, item.locations?.name].filter(Boolean).join(' • ');

  // 4. Stepper Stage Definition
  const steps = [
    {
      id: 'reported',
      label: 'Dilaporkan',
      shortLabel: 'Dilaporkan',
      isCompleted: true,
      isActive: item.status === 'open' && !currentAssigneeName,
    },
    {
      id: 'in_progress',
      label: 'Penanganan PIC',
      shortLabel: 'Penanganan',
      isCompleted: ['waiting_verification', 'closed'].includes(item.status),
      isActive: ['on_progress', 'waiting_repair', 'reopened'].includes(item.status) || (item.status === 'open' && Boolean(currentAssigneeName)),
    },
    {
      id: 'qc_verification',
      label: 'Verifikasi QC',
      shortLabel: 'Verifikasi',
      isCompleted: item.status === 'closed',
      isActive: item.status === 'waiting_verification',
    },
    {
      id: 'closed',
      label: 'Selesai',
      shortLabel: 'Selesai',
      isCompleted: item.status === 'closed',
      isActive: item.status === 'closed',
    },
  ];

  return (
    <div className="page-padding py-4 sm:py-5 max-w-6xl mx-auto space-y-4 sm:space-y-5 pb-36 sm:pb-24">
      {/* ── Top Navigation Bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          href="/cases"
          className="neu-btn-secondary inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition-all px-3 py-1.5 rounded-xl"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Kasus</span>
        </Link>
      </div>

      {/* ── 1. Case Command Header Card (High Scannability Matrix) ──────── */}
      <div className="p-4 sm:p-5 rounded-3xl neu-raised space-y-3.5">
        {/* Top Metadata Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/40 dark:border-slate-800/60">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-black text-blue-700 dark:text-blue-400 neu-pill-active px-2.5 py-0.5 rounded-lg text-xs">
              {item.case_number}
            </span>
            <PriorityBadge priority={item.priority} size="sm" />
            <StatusBadge status={item.status} size="sm" />
          </div>

          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Dibuat {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: localeId })} ({formatWib(item.created_at, 'dd MMM yyyy, HH:mm')})
          </span>
        </div>

        {/* Case Title */}
        <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-snug tracking-tight">
          {item.title}
        </h1>

        {/* Badges / Operational Flags */}
        {(item.has_operational_impact || item.requires_maintenance || item.status === 'reopened') && (
          <div className="flex flex-wrap items-center gap-2">
            {item.has_operational_impact && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-800 dark:text-orange-300 bg-orange-500/10 px-2.5 py-0.5 rounded-md border border-orange-200 dark:border-orange-900/40">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                Dampak Operasional Aktif
              </span>
            )}
            {item.requires_maintenance && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/40">
                <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                Membutuhkan Maintenance
              </span>
            )}
            {item.status === 'reopened' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-900/40">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                Kasus Dibuka Kembali (Reopened)
              </span>
            )}
          </div>
        )}

        {/* Inspection Source Banner (if originated from QC inspection) */}
        {sourceInspection && (
          <div className="p-3 rounded-2xl neu-inset-sm flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg neu-icon-well flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <FileCheck2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-800 dark:text-slate-200">Dibuat dari Temuan Inspeksi QC: </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{sourceInspection.inspection_number}</span>
              </div>
            </div>
            <Link
              href={`/inspections/${sourceInspection.id}`}
              className="neu-btn-secondary inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-blue-600 dark:text-blue-400 font-bold text-[11px] shrink-0"
            >
              <span>Lihat QC</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Quick Context Matrix: 4-Pillar Discovery Grid (Instant 3-5s scan) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 pt-3 border-t border-slate-200/40 dark:border-slate-800/60">
          {/* 1. Lokasi & Area */}
          <div className="p-2.5 sm:p-3 rounded-2xl neu-inset-sm flex items-start gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl neu-icon-well text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Lokasi & Area
              </span>
              <p className="text-[11.5px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={locationText || 'Lokasi belum ditentukan'}>
                {locationText || 'Belum ditentukan'}
              </p>
              <span className="text-[10px] sm:text-[10.5px] font-medium text-slate-500 dark:text-slate-400 truncate block">
                {warehouseName}
              </span>
            </div>
          </div>

          {/* 2. Aset Terkait */}
          <div className="p-2.5 sm:p-3 rounded-2xl neu-inset-sm flex items-start gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl neu-icon-well text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <Package className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Aset Terkait
              </span>
              {item.assets ? (
                <div>
                  <Link
                    href={`/assets/${(item.assets as any).id || ''}`}
                    className="inline-flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline text-[10.5px] sm:text-[11px] truncate max-w-full"
                  >
                    <span>{item.assets.asset_code}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </Link>
                  <p className="text-[10.5px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate" title={item.assets.name}>
                    {item.assets.name}
                  </p>
                </div>
              ) : (
                <p className="text-[11.5px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 italic">Tidak terkait aset</p>
              )}
            </div>
          </div>

          {/* 3. Penanggung Jawab (PIC) */}
          <div className="p-2.5 sm:p-3 rounded-2xl neu-inset-sm flex items-start gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl neu-icon-well text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Penanggung Jawab
              </span>
              {currentAssigneeName ? (
                <div>
                  <p className="text-[11.5px] sm:text-xs font-black text-slate-900 dark:text-slate-100 truncate" title={currentAssigneeName}>
                    {currentAssigneeName}
                  </p>
                  <span className="text-[9.5px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                    {currentAssignment?.assigned_at ? `Ditugaskan ${formatDistanceToNow(new Date(currentAssignment.assigned_at), { addSuffix: true, locale: localeId })}` : 'PIC Aktif'}
                  </span>
                </div>
              ) : (
                <span className="inline-flex items-center text-[10px] sm:text-[10.5px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/40 mt-0.5">
                  Belum Ditugaskan
                </span>
              )}
            </div>
          </div>

          {/* 4. Target SLA */}
          <div className="p-2.5 sm:p-3 rounded-2xl neu-inset-sm flex items-start gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl neu-icon-well text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Batas SLA
              </span>
              {item.due_date ? (
                <div>
                  <p className={cn('text-[11.5px] sm:text-xs font-black truncate', isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100')}>
                    {formatWib(item.due_date, 'dd MMM, HH:mm')}
                  </p>
                  <span className={cn('text-[9.5px] sm:text-[10px] font-bold inline-flex items-center gap-1 mt-0.5', slaInfo.badgeText)}>
                    {isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />}
                    {slaInfo.badgeLabel}
                  </span>
                </div>
              ) : (
                <p className="text-[11.5px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 italic">Belum diatur</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Operational Lifecycle Stepper (Adaptive Responsive) ───────── */}
      <div className="p-4 sm:p-5 rounded-3xl neu-raised">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/40 dark:border-slate-800/60">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Alur Penyelesaian Operasional
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">Fase Aktif:</span>
            <StatusBadge status={item.status} size="sm" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 sm:gap-4 relative">
          {steps.map((s, idx) => (
            <div key={s.id} className="flex flex-col items-center text-center space-y-1.5 relative">
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-3.5 sm:top-4 left-[50%] w-full h-0.5 -z-0 transition-colors',
                    s.isCompleted && steps[idx + 1].isCompleted
                      ? 'bg-blue-600'
                      : s.isCompleted
                      ? 'bg-blue-300 dark:bg-blue-800'
                      : 'bg-slate-200 dark:bg-slate-800'
                  )}
                />
              )}

              {/* Step Circle */}
              <div
                className={cn(
                  'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black z-10 transition-all',
                  s.isCompleted
                    ? 'bg-blue-600 text-white shadow-xs'
                    : s.isActive
                    ? 'neu-raised border border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/30'
                    : 'neu-inset-sm text-slate-400'
                )}
              >
                {s.isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" /> : idx + 1}
              </div>

              {/* Step Label: Desktop full / Mobile adapted */}
              <span
                className={cn(
                  'text-[10px] sm:text-xs font-bold leading-tight line-clamp-1',
                  s.isActive
                    ? 'text-blue-600 dark:text-blue-400 font-black'
                    : s.isCompleted
                    ? 'text-slate-800 dark:text-slate-200'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              >
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.shortLabel}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Operational Workspace: 2-Column Grid ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* ── Main Content Column (8 cols on desktop, 2nd on mobile) ─────── */}
        <div className="lg:col-span-8 order-2 lg:order-1 space-y-4 sm:space-y-5">
          {/* Card: Incident Description & Context */}
          <div className="p-4 sm:p-5 rounded-3xl neu-raised space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800/60">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Deskripsi & Konteks Kejadian
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>Kategori:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-bold">
                  {(item.category as any)?.name || 'Umum'}
                  {(item.subcategory as any)?.name ? ` • ${(item.subcategory as any).name}` : ''}
                </strong>
              </div>
            </div>

            <div className="neu-inset-sm p-4 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {item.description || 'Tidak ada deskripsi rinci.'}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Pelapor: <strong>{(item.reporter as any)?.full_name || (item.reporter_id ? profileMap.get(item.reporter_id) : null) || 'Staff Gudang'}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatWib(item.created_at, 'dd MMM yyyy, HH:mm')}</span>
              </span>
            </div>
          </div>

          {/* Card: Root Cause & Action (if populated) */}
          {(item.root_cause || item.corrective_action || item.preventive_action) && (
            <div className="p-4 sm:p-5 rounded-3xl neu-raised space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/40 dark:border-slate-800/60">
                <div className="w-6 h-6 rounded-lg neu-icon-well flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Analisis & Tindakan Perbaikan
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {item.root_cause && (
                  <div className="sm:col-span-2 p-3.5 rounded-2xl bg-purple-500/10 border border-purple-200 dark:border-purple-900/40 text-purple-950 dark:text-purple-200 space-y-1">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                      Akar Masalah (Root Cause)
                    </span>
                    <p className="font-bold text-xs">{(item.root_cause as any).name}</p>
                  </div>
                )}

                {item.corrective_action && (
                  <div className="p-3.5 rounded-2xl neu-inset-sm space-y-1">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tindakan Korektif
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">
                      {item.corrective_action}
                    </p>
                  </div>
                )}

                {item.preventive_action && (
                  <div className="p-3.5 rounded-2xl neu-inset-sm space-y-1">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tindakan Preventif
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">
                      {item.preventive_action}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card: Evidence Photos with Fullscreen Lightbox */}
          <div className="p-4 sm:p-5 rounded-3xl neu-raised space-y-3">
            <EvidenceGallery evidences={evidenceList} />
          </div>

          {/* Card: Discussion & Internal Notes */}
          {comments && comments.length > 0 && (
            <div className="p-4 sm:p-5 rounded-3xl neu-raised space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/40 dark:border-slate-800/60">
                <div className="w-6 h-6 rounded-lg neu-icon-well flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Diskusi & Catatan ({comments.length})
                </h2>
              </div>

              <div className="space-y-2.5 pt-1">
                {comments.map((com: any) => {
                  const authorName = com.author?.full_name || (com.author_id ? profileMap.get(com.author_id) : null) || 'Staf';
                  return (
                    <div
                      key={com.id}
                      className={cn(
                        'p-3.5 rounded-2xl text-xs space-y-1',
                        com.is_internal
                          ? 'bg-amber-500/10 border border-amber-200 dark:border-amber-900/40'
                          : 'neu-inset-sm'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {authorName}
                          </span>
                          {com.is_internal && (
                            <span className="text-[9.5px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded-md">
                              Internal
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {formatWib(com.created_at, 'dd MMM yyyy, HH:mm')} ({formatDistanceToNow(new Date(com.created_at), { addSuffix: true, locale: localeId })})
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{com.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card: Activity & Workflow Timeline */}
          <div className="p-4 sm:p-5 rounded-3xl neu-raised space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/40 dark:border-slate-800/60">
              <div className="w-6 h-6 rounded-lg neu-icon-well flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Riwayat Aktivitas & Alur Kerja ({activities?.length || 0})
              </h2>
            </div>

            <CaseActivityTimeline
              activities={(activities as any[]) ?? []}
              profileMap={profileMap}
            />
          </div>

          {/* Card: Due Date Overrides History (if any) */}
          {dueDateChanges && dueDateChanges.length > 0 && (
            <div className="p-4 rounded-3xl bg-purple-500/10 border border-purple-200 dark:border-purple-900/40 text-xs space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-purple-900 dark:text-purple-300 font-extrabold">
                <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Histori Penyesuaian Batas Waktu SLA ({dueDateChanges.length})</span>
              </div>
              <div className="space-y-2">
                {dueDateChanges.map((ddc: any) => {
                  const changerName = ddc.changer?.full_name || (ddc.changed_by ? profileMap.get(ddc.changed_by) : null) || 'Koordinator / Admin';
                  return (
                    <div key={ddc.id} className="text-[11.5px] neu-inset-sm p-3 rounded-2xl text-slate-700 dark:text-slate-300 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100 text-xs">
                        <span>Oleh: {changerName}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          {formatWib(ddc.changed_at, 'dd MMM yyyy, HH:mm')}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">
                        Batas waktu baru: <strong className="text-purple-600 dark:text-purple-400 font-bold">{formatWib(ddc.new_due_date, 'dd MMM yyyy, HH:mm')}</strong>
                      </p>
                      <p className="text-amber-800 dark:text-amber-300 italic bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40">
                        Alasan: &quot;{ddc.reason}&quot;
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right / Operational Rail Column (4 cols on desktop, 1st on mobile) */}
        <div className="lg:col-span-4 order-1 lg:order-2 space-y-4 lg:sticky lg:top-4 lg:self-start">
          {/* 1. Target SLA Card */}
          <div className="p-4 rounded-3xl neu-raised space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Target SLA</span>
              </div>
              {slaInfo.type === 'no_sla' ? (
                <span className="text-xs text-slate-400">—</span>
              ) : slaInfo.isClosed ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border shadow-2xs',
                    slaInfo.badgeBg,
                    slaInfo.badgeText,
                    slaInfo.badgeBorder
                  )}
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{slaInfo.badgeLabel}</span>
                </span>
              ) : slaInfo.isOverdue ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2 py-0.5 rounded-full border shadow-2xs',
                    slaInfo.badgeBg,
                    slaInfo.badgeText,
                    slaInfo.badgeBorder
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <span>{slaInfo.badgeLabel}</span>
                </span>
              ) : slaInfo.isApproaching ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border shadow-2xs',
                    slaInfo.badgeBg,
                    slaInfo.badgeText,
                    slaInfo.badgeBorder
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>{slaInfo.badgeLabel}</span>
                </span>
              ) : (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs',
                    slaInfo.badgeBg,
                    slaInfo.badgeText,
                    slaInfo.badgeBorder
                  )}
                >
                  <span>{slaInfo.badgeLabel}</span>
                </span>
              )}
            </div>

            <p className={cn('text-sm font-black tracking-tight', isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100')}>
              {item.due_date
                ? formatWib(item.due_date, 'dd MMMM yyyy • HH:mm')
                : 'Batas waktu belum diatur'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {isClosed
                ? `Kasus telah ditutup pada ${item.closed_at ? formatWib(item.closed_at, 'dd MMM yyyy, HH:mm') : 'selesai'}`
                : isOverdue
                ? 'Penyelesaian melewati batas waktu target operasional'
                : 'Target penyelesaian sesuai standar SLA'}
            </p>
          </div>

          {/* 2. Penugasan PIC Card */}
          <div className="p-4 rounded-3xl neu-raised space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800/60">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Penanggung Jawab (PIC)
              </span>
            </div>

            {currentAssignment ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl neu-pill-active text-white font-black text-sm flex items-center justify-center shrink-0">
                  {currentAssigneeName ? currentAssigneeName[0].toUpperCase() : 'P'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {currentAssigneeName}
                  </p>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                    Ditugaskan {currentAssignment.assigned_at ? formatDistanceToNow(new Date(currentAssignment.assigned_at), { addSuffix: true, locale: localeId }) : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-2.5 rounded-2xl neu-inset-sm text-slate-500 dark:text-slate-400 text-xs">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium italic text-[11.5px]">Belum ada PIC ditugaskan</span>
              </div>
            )}
          </div>

          {/* 3. Panel Aksi Operasional (CaseWorkflowActionPanel) — Placed immediately above Location for immediate fold discovery */}
          <CaseWorkflowActionPanel
            caseId={item.id}
            caseNumber={item.case_number}
            warehouseId={item.warehouse_id}
            warehouseName={warehouseName}
            status={item.status}
            priority={item.priority}
            dueDate={item.due_date}
            hasOperationalImpact={item.has_operational_impact}
            requiresMaintenance={item.requires_maintenance}
            currentUserId={user.id}
            currentAssigneeId={currentAssignment?.assignee_id || null}
            currentAssigneeName={currentAssigneeName}
            reporterId={item.reporter_id}
            userCapabilities={Array.from(callerCapabilities)}
            isSuperAdmin={isSuperAdmin}
            assignableUsers={assignableUsers}
            rootCauses={(rawRootCauses as RootCauseItem[]) ?? []}
            hasAfterEvidence={(evidences ?? []).some((ev) => ev.phase === 'after')}
          />

          {/* 4. Lokasi & Aset Terkait Card */}
          <div className="p-4 rounded-3xl neu-raised space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800/60">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Lokasi & Aset
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl neu-icon-well flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Area & Lokasi
                  </span>
                  {locationText ? (
                    <span className="font-bold text-slate-800 dark:text-slate-200 leading-snug">{locationText}</span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">Lokasi belum ditentukan</span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/40 dark:border-slate-800/60">
                <div className="w-7 h-7 rounded-xl neu-icon-well flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                  <Package className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Aset Terkait
                  </span>
                  {item.assets ? (
                    <div>
                      <Link
                        href={`/assets/${(item.assets as any).id || ''}`}
                        className="inline-flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400 neu-pill-active px-2 py-0.5 rounded-lg text-[10.5px] hover:underline"
                      >
                        <span>{item.assets.asset_code}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </Link>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] mt-1">{item.assets.name}</p>
                    </div>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">Tidak terkait aset</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
