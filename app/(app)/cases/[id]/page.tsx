// app/(app)/cases/[id]/page.tsx
// Case Detail View — Server Component with Live Supabase Data
// High-Clarity Operations Workspace (70% Enterprise Operations + 30% Fintech/Super-App Polish)

import type { Metadata } from 'next';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { EvidenceGallery, type EvidenceItem } from '@/components/cases/EvidenceGallery';
import {
  CaseWorkflowActionPanel,
  type AssignableUser,
  type RootCauseItem,
} from '@/components/cases/CaseWorkflowActionPanel';
import { BUCKETS } from '@/lib/supabase/storage';
import { getSlaStatus } from '@/lib/utils/sla';
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
      assets:asset_id ( asset_code, name ),
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
          picRoleDisplayName?: string;
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
            hasActivePicRole: false,
          });
        }

        const userEntry = userMap.get(row.user_id)!;
        const role = row.roles as { id: string; name: string; display_name: string } | null;
        if (role?.name === 'pic_maintenance') {
          userEntry.hasActivePicRole = true;
          userEntry.picRoleDisplayName = role.display_name || 'PIC / Maintenance';
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
          role_display_name: u.picRoleDisplayName || 'PIC / Maintenance',
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

  const formatActivityAction = (act: any) => {
    switch (act.action) {
      case 'created':
        return 'Kasus dibuat dan dilaporkan';
      case 'assigned':
        return `Kasus ditugaskan ke PIC ${act.metadata?.assignee_name ? `(${act.metadata.assignee_name})` : ''}`;
      case 'status_changed':
        return `Status diubah ${act.from_status ? `dari ${act.from_status}` : ''} menjadi ${act.to_status}`;
      case 'priority_changed':
        return `Prioritas kasus diubah ${act.metadata?.from ? `dari ${act.metadata.from}` : ''} menjadi ${act.metadata?.to || ''}`;
      case 'due_date_overridden':
        return `Batas waktu SLA diperbarui ${act.metadata?.to ? `menjadi ${formatWib(act.metadata.to, 'dd MMM yyyy, HH:mm')}` : ''}`;
      case 'force_closed':
        return 'Kasus ditutup paksa oleh Administrator';
      case 'evidence_added':
        return `Bukti foto (${act.metadata?.phase === 'after' ? 'Fase Selesai / After' : 'Fase Awal / Before'}) diunggah`;
      case 'commented':
        return 'Komentar baru ditambahkan';
      case 'verified':
        return 'Pekerjaan diverifikasi dan disetujui oleh QC';
      case 'verification_failed':
        return 'Verifikasi ditolak — dikembalikan untuk perbaikan ulang';
      case 'closed':
        return 'Kasus diselesaikan dan ditutup (Closed)';
      case 'reopened':
        return 'Kasus dibuka kembali untuk investigasi lanjutan (Reopened)';
      default:
        return act.action.replace(/_/g, ' ');
    }
  };

  // 4. Stepper Stage Definition
  const steps = [
    {
      id: 'reported',
      label: 'Dilaporkan',
      isCompleted: true,
      isActive: item.status === 'open' && !currentAssigneeName,
    },
    {
      id: 'in_progress',
      label: 'Penanganan PIC',
      isCompleted: ['waiting_verification', 'closed'].includes(item.status),
      isActive: ['on_progress', 'waiting_repair', 'reopened'].includes(item.status) || (item.status === 'open' && Boolean(currentAssigneeName)),
    },
    {
      id: 'qc_verification',
      label: 'Verifikasi QC',
      isCompleted: item.status === 'closed',
      isActive: item.status === 'waiting_verification',
    },
    {
      id: 'closed',
      label: 'Selesai',
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 active:scale-95 transition-all p-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Kasus</span>
        </Link>
      </div>

      {/* ── 1. Case Command Header Card ──────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-black text-blue-700 bg-blue-50/90 px-2.5 py-0.5 rounded-lg border border-blue-200/70 text-xs shadow-2xs">
              {item.case_number}
            </span>
            <PriorityBadge priority={item.priority} size="sm" />
            <StatusBadge status={item.status} size="sm" />
          </div>

          <span className="text-[11px] font-medium text-slate-400">
            Dibuat {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: localeId })} ({formatWib(item.created_at, 'dd MMM yyyy, HH:mm')})
          </span>
        </div>

        <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-snug tracking-tight">
          {item.title}
        </h1>

        {/* Badges / Context Callouts */}
        <div className="flex flex-wrap items-center gap-2">
          {item.has_operational_impact && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-800 bg-orange-50/90 px-2.5 py-0.5 rounded-md border border-orange-200/70 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
              Dampak Operasional Aktif
            </span>
          )}
          {item.requires_maintenance && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50/90 px-2.5 py-0.5 rounded-md border border-amber-200/70 shadow-2xs">
              <Wrench className="w-3.5 h-3.5 text-amber-600" />
              Membutuhkan Maintenance
            </span>
          )}
          {item.status === 'reopened' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50/90 px-2.5 py-0.5 rounded-md border border-rose-200/70 shadow-2xs">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Kasus Dibuka Kembali (Reopened)
            </span>
          )}
        </div>

        {/* Inspection Source Banner (if originated from QC inspection) */}
        {sourceInspection && (
          <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/70 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FileCheck2 className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-blue-950">Dibuat dari Temuan Inspeksi QC: </span>
                <span className="font-mono font-bold text-blue-700">{sourceInspection.inspection_number}</span>
              </div>
            </div>
            <Link
              href={`/inspections/${sourceInspection.id}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 font-bold text-[11px] hover:bg-blue-50 transition-colors shrink-0 shadow-2xs"
            >
              <span>Lihat QC</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* ── 2. Operational Lifecycle Stepper ─────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Alur Penyelesaian Operasional
          </span>
          <span className="text-[11px] font-bold text-slate-500">
            Fase Aktif: <strong className="text-slate-900 font-extrabold">{item.status.replace(/_/g, ' ')}</strong>
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-4 relative">
          {steps.map((s, idx) => (
            <div key={s.id} className="flex flex-col items-center text-center space-y-1.5 relative">
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-3.5 left-[50%] w-full h-0.5 -z-0 transition-colors',
                    s.isCompleted && steps[idx + 1].isCompleted
                      ? 'bg-blue-600'
                      : s.isCompleted
                      ? 'bg-blue-200'
                      : 'bg-slate-100'
                  )}
                />
              )}

              {/* Step Circle */}
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black z-10 transition-all shadow-2xs',
                  s.isCompleted
                    ? 'bg-blue-600 text-white'
                    : s.isActive
                    ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-600 border border-blue-300'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                )}
              >
                {s.isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </div>

              {/* Step Label */}
              <span
                className={cn(
                  'text-[10px] sm:text-[11.5px] font-bold leading-tight line-clamp-1',
                  s.isActive
                    ? 'text-blue-700 font-black'
                    : s.isCompleted
                    ? 'text-slate-800'
                    : 'text-slate-400'
                )}
              >
                {s.label}
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
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Deskripsi & Konteks Kejadian
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span>Kategori:</span>
                <strong className="text-slate-800 font-bold">
                  {(item.category as any)?.name || 'Umum'}
                  {(item.subcategory as any)?.name ? ` • ${(item.subcategory as any).name}` : ''}
                </strong>
              </div>
            </div>

            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-100 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {item.description || 'Tidak ada deskripsi rinci.'}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Pelapor: <strong>{(item.reporter as any)?.full_name || (item.reporter_id ? profileMap.get(item.reporter_id) : null) || 'Staff Gudang'}</strong></span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatWib(item.created_at, 'dd MMM yyyy, HH:mm')}</span>
              </span>
            </div>
          </div>

          {/* Card: Root Cause & Action (if populated) */}
          {(item.root_cause || item.corrective_action || item.preventive_action) && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Wrench className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Analisis & Tindakan Perbaikan
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {item.root_cause && (
                  <div className="sm:col-span-2 p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-purple-950 space-y-1">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-purple-700">
                      Akar Masalah (Root Cause)
                    </span>
                    <p className="font-bold text-xs">{(item.root_cause as any).name}</p>
                  </div>
                )}

                {item.corrective_action && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                      Tindakan Korektif
                    </span>
                    <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                      {item.corrective_action}
                    </p>
                  </div>
                )}

                {item.preventive_action && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                      Tindakan Preventif
                    </span>
                    <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                      {item.preventive_action}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card: Evidence Photos with Fullscreen Lightbox */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            <EvidenceGallery evidences={evidenceList} />
          </div>

          {/* Card: Discussion & Internal Notes */}
          {comments && comments.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
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
                        'p-3 rounded-xl border text-xs space-y-1',
                        com.is_internal
                          ? 'bg-amber-50/70 border-amber-200/80'
                          : 'bg-slate-50 border-slate-100'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">
                            {authorName}
                          </span>
                          {com.is_internal && (
                            <span className="text-[9.5px] font-extrabold text-amber-800 bg-amber-200/80 px-1.5 py-0.2 rounded-md">
                              Internal
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {formatWib(com.created_at, 'dd MMM yyyy, HH:mm')} ({formatDistanceToNow(new Date(com.created_at), { addSuffix: true, locale: localeId })})
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{com.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card: Activity & Workflow Timeline */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Activity className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Riwayat Aktivitas & Alur Kerja ({activities?.length || 0})
              </h2>
            </div>

            {activities && activities.length > 0 ? (
              <div className="space-y-2.5 pt-1">
                {activities.map((act: any) => {
                  const actorName = act.actor?.full_name || (act.actor_id ? profileMap.get(act.actor_id) : null) || 'Sistem / Administrator';
                  return (
                    <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                      <div className="w-6 h-6 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {actorName ? actorName[0].toUpperCase() : 'S'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-bold text-slate-800 truncate">
                            {actorName}
                          </span>
                          <span className="text-[10.5px] text-slate-400">
                            {formatWib(act.created_at, 'dd MMM yyyy, HH:mm')}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-700 font-semibold">
                          {formatActivityAction(act)}
                        </p>
                        {act.metadata?.reason && (
                          <p className="text-[11px] text-amber-900 italic mt-1.5 bg-amber-50 p-2 rounded-lg border border-amber-200/80">
                            <strong>Alasan:</strong> &quot;{act.metadata.reason}&quot;
                          </p>
                        )}
                        {act.metadata?.note && (
                          <p className="text-[11px] text-slate-700 italic mt-1.5 bg-white p-2 rounded-lg border border-slate-200/80">
                            <strong>Catatan:</strong> &quot;{act.metadata.note}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">Belum ada riwayat aktivitas.</p>
            )}
          </div>

          {/* Card: Due Date Overrides History (if any) */}
          {dueDateChanges && dueDateChanges.length > 0 && (
            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 text-xs space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-purple-900 font-extrabold">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>Histori Penyesuaian Batas Waktu SLA ({dueDateChanges.length})</span>
              </div>
              <div className="space-y-2">
                {dueDateChanges.map((ddc: any) => {
                  const changerName = ddc.changer?.full_name || (ddc.changed_by ? profileMap.get(ddc.changed_by) : null) || 'Koordinator / Admin';
                  return (
                    <div key={ddc.id} className="text-[11.5px] bg-white/90 p-2.5 rounded-xl border border-purple-100 text-slate-700 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900 text-xs">
                        <span>Oleh: {changerName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {formatWib(ddc.changed_at, 'dd MMM yyyy, HH:mm')}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        Batas waktu baru: <strong className="text-purple-700 font-bold">{formatWib(ddc.new_due_date, 'dd MMM yyyy, HH:mm')}</strong>
                      </p>
                      <p className="text-amber-900 italic bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/60">
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
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-800">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
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
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
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

            <p className={cn('text-sm font-black tracking-tight', isOverdue ? 'text-rose-600' : 'text-slate-900')}>
              {item.due_date
                ? formatWib(item.due_date, 'dd MMMM yyyy • HH:mm')
                : 'Batas waktu belum diatur'}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              {isClosed
                ? `Kasus telah ditutup pada ${item.closed_at ? formatWib(item.closed_at, 'dd MMM yyyy, HH:mm') : 'selesai'}`
                : isOverdue
                ? 'Penyelesaian melewati batas waktu target operasional'
                : 'Target penyelesaian sesuai standar SLA'}
            </p>
          </div>

          {/* 2. Penugasan PIC Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Penanggung Jawab (PIC)
              </span>
            </div>

            {currentAssignment ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-2xs shrink-0">
                  {currentAssigneeName ? currentAssigneeName[0].toUpperCase() : 'P'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-xs text-slate-900 truncate">
                    {currentAssigneeName}
                  </p>
                  <p className="text-[10.5px] text-slate-500 font-semibold mt-0.5">
                    Ditugaskan {currentAssignment.assigned_at ? formatDistanceToNow(new Date(currentAssignment.assigned_at), { addSuffix: true, locale: localeId }) : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 text-xs">
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
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Lokasi & Aset
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Area & Lokasi
                  </span>
                  {locationText ? (
                    <span className="font-bold text-slate-800 leading-snug">{locationText}</span>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">Lokasi belum ditentukan</span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
                <Package className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Aset Terkait
                  </span>
                  {item.assets ? (
                    <div>
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10.5px]">
                        {item.assets.asset_code}
                      </span>
                      <p className="font-semibold text-slate-800 text-[11px] mt-0.5">{item.assets.name}</p>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">Tidak terkait aset</span>
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
