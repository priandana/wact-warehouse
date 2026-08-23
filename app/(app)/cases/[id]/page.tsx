// app/(app)/cases/[id]/page.tsx
// Case Detail View — Server Component with Live Supabase Data
// Decoupled, resilient queries with signed evidence photo URLs, full workflow actions, and timeline

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
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
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
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
      reporter_id,
      areas:area_id ( name ),
      locations:location_id ( name ),
      assets:asset_id ( asset_code, name ),
      category:category_id ( name ),
      subcategory:subcategory_id ( name ),
      reporter:reporter_id ( full_name )
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
    { data: rawProfiles },
    { data: rawRootCauses },
    { data: rawUserWarehouse },
    { data: rawUserProfile },
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
        changer:changed_by ( full_name )
      `)
      .eq('case_id', id)
      .order('changed_at', { ascending: false }),

    supabase
      .from('user_warehouses')
      .select(`
        user_id,
        is_active,
        profiles ( id, full_name, avatar_url ),
        roles ( name, display_name )
      `)
      .eq('warehouse_id', item.warehouse_id)
      .eq('is_active', true),

    supabase
      .from('root_causes')
      .select('id, name')
      .order('name'),

    supabase
      .from('user_warehouses')
      .select('roles(name)')
      .eq('user_id', user.id)
      .eq('warehouse_id', item.warehouse_id)
      .maybeSingle(),

    supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single(),
  ]);

  const currentUserRole = (rawUserWarehouse as any)?.roles?.name;
  const isSuperAdmin = (rawUserProfile as any)?.is_super_admin ?? false;

  // Filter assignable users to eligible candidates only (PIC Maintenance, Coordinator, Admin)
  const eligibleRoles = ['pic_maintenance', 'coordinator', 'admin', 'qc_leader'];
  const assignableUsers: AssignableUser[] = (rawProfiles ?? [])
    .filter((uw: any) => uw?.profiles && uw?.roles && eligibleRoles.includes(uw.roles.name))
    .map((uw: any) => ({
      id: uw.profiles.id,
      full_name: uw.profiles.full_name,
      avatar_url: uw.profiles.avatar_url,
      role_name: uw.roles?.name,
      role_display_name: uw.roles?.display_name || uw.roles?.name || 'Staff',
    }))
    .sort((a: AssignableUser, b: AssignableUser) => {
      const score = (role?: string) => {
        if (role === 'pic_maintenance') return 0;
        if (role === 'coordinator') return 1;
        if (role === 'admin') return 2;
        return 3;
      };
      return score(a.role_name) - score(b.role_name);
    });

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
        uploader: (ev.uploader as any) ?? null,
      };
    })
  );

  const currentAssignment = Array.isArray(assignments)
    ? assignments.find((a: any) => a.is_current)
    : null;

  const currentAssigneeName = currentAssignment?.assignee?.full_name || null;
  const isOverdue = item.due_date && isPast(new Date(item.due_date)) && item.status !== 'closed';

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
        return `Batas waktu SLA diperbarui ${act.metadata?.to ? `menjadi ${format(new Date(act.metadata.to), 'dd MMM yyyy, HH:mm', { locale: localeId })}` : ''}`;
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

  return (
    <div className="page-padding py-4 max-w-4xl mx-auto space-y-5 pb-24">
      {/* Top Nav Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 active:scale-95 transition-all p-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Kasus</span>
        </Link>
      </div>

      {/* ── 1. Main Case Header Card ─────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100 text-xs">
              {item.case_number}
            </span>
            <PriorityBadge priority={item.priority} size="sm" />
          </div>
          <StatusBadge status={item.status} size="md" />
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
          {item.title}
        </h1>

        {/* Operational & Maintenance Badges */}
        {(item.has_operational_impact || item.requires_maintenance || currentAssigneeName) && (
          <div className="flex flex-wrap items-center gap-2">
            {item.has_operational_impact && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                Dampak Operasional Aktif
              </span>
            )}
            {item.requires_maintenance && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                <Wrench className="w-3.5 h-3.5" />
                Membutuhkan Maintenance
              </span>
            )}
            {currentAssigneeName && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <User className="w-3.5 h-3.5" />
                PIC: {currentAssigneeName}
              </span>
            )}
          </div>
        )}

        {item.description && (
          <div className="space-y-1">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Deskripsi Masalah</p>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap">
              {item.description}
            </p>
          </div>
        )}

        {/* Metadata Grid (Responsive, unclipped Location) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Kategori</p>
            <p className="font-bold text-slate-800 mt-0.5">
              {(item.category as any)?.name || '-'}
            </p>
            {(item.subcategory as any)?.name && (
              <p className="text-[10.5px] text-slate-500 font-medium">{(item.subcategory as any).name}</p>
            )}
          </div>

          {/* Location with responsive wrapping (no premature ellipsis) */}
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Lokasi & Area</p>
            <div className="flex items-start gap-1 mt-0.5 text-slate-800 font-bold">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span>{(item.areas as any)?.name || '-'}</span>
                {(item.locations as any)?.name && (
                  <span className="text-slate-500 font-normal"> &bull; {(item.locations as any).name}</span>
                )}
              </div>
            </div>
            {(item.assets as any)?.asset_code && (
              <p className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                {(item.assets as any).asset_code} — {(item.assets as any).name}
              </p>
            )}
          </div>

          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Pelapor</p>
            <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{(item.reporter as any)?.full_name || 'Administrator'}</span>
            </p>
            <p className="text-[10.5px] text-slate-400">
              {format(new Date(item.created_at), 'dd MMM, HH:mm', { locale: localeId })}
            </p>
          </div>

          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Target SLA</p>
            <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className={cn(isOverdue && 'text-rose-600 font-extrabold')}>
                {item.due_date
                  ? format(new Date(item.due_date), 'dd MMM, HH:mm', { locale: localeId })
                  : '-'}
              </span>
            </p>
            {isOverdue && (
              <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md">
                Overdue
              </span>
            )}
          </div>
        </div>

        {/* Due Date Overrides History (if any) */}
        {dueDateChanges && dueDateChanges.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center gap-1.5 text-purple-900 font-extrabold">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>Histori Penyesuaian Batas Waktu ({dueDateChanges.length})</span>
            </div>
            <div className="space-y-2">
              {dueDateChanges.map((ddc: any) => (
                <div key={ddc.id} className="text-[11.5px] bg-white/90 p-2.5 rounded-xl border border-purple-100 text-slate-700 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900 text-xs">
                    <span>Oleh: {ddc.changer?.full_name || 'Koordinator / Admin'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {format(new Date(ddc.changed_at), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Batas waktu baru: <strong className="text-purple-700 font-bold">{format(new Date(ddc.new_due_date), 'dd MMM yyyy, HH:mm', { locale: localeId })}</strong>
                  </p>
                  <p className="text-amber-900 italic bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/60">
                    Alasan: &quot;{ddc.reason}&quot;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Workflow Action Panel (Assign, Priority, DueDate, ForceClose, Verify, Reopen) */}
      <CaseWorkflowActionPanel
        caseId={item.id}
        caseNumber={item.case_number}
        warehouseId={item.warehouse_id}
        status={item.status}
        priority={item.priority}
        dueDate={item.due_date}
        hasOperationalImpact={item.has_operational_impact}
        requiresMaintenance={item.requires_maintenance}
        currentUserId={user.id}
        currentAssigneeId={currentAssignment?.assignee_id || null}
        currentAssigneeName={currentAssigneeName}
        reporterId={item.reporter_id}
        userRole={currentUserRole}
        isSuperAdmin={isSuperAdmin}
        assignableUsers={assignableUsers}
        rootCauses={(rawRootCauses as RootCauseItem[]) ?? []}
      />

      {/* ── 3. Evidence Photos Section with Lightbox ─────────────────────── */}
      <EvidenceGallery evidences={evidenceList} />

      {/* ── 4. Comments List ─────────────────────────────────────────────── */}
      {comments && comments.length > 0 && (
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Diskusi & Catatan ({comments.length})
            </h2>
          </div>

          <div className="space-y-2.5 pt-1">
            {comments.map((com: any) => (
              <div
                key={com.id}
                className={cn(
                  'p-3.5 rounded-2xl border text-xs space-y-1',
                  com.is_internal
                    ? 'bg-amber-50/70 border-amber-200/80'
                    : 'bg-slate-50 border-slate-100'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">
                      {com.author?.full_name || 'Staf'}
                    </span>
                    {com.is_internal && (
                      <span className="text-[9.5px] font-extrabold text-amber-800 bg-amber-200/80 px-1.5 py-0.2 rounded-md">
                        Internal
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {format(new Date(com.created_at), 'dd MMM yyyy, HH:mm', { locale: localeId })} ({formatDistanceToNow(new Date(com.created_at), { addSuffix: true, locale: localeId })})
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{com.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. Activity Timeline Card ────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
          <Activity className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
            Riwayat Aktivitas & Alur Kerja ({activities?.length || 0})
          </h2>
        </div>

        {activities && activities.length > 0 ? (
          <div className="space-y-3 pt-2">
            {activities.map((act: any) => (
              <div key={act.id} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {act.actor?.full_name ? act.actor.full_name[0].toUpperCase() : 'S'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-bold text-slate-800 truncate">
                      {act.actor?.full_name || 'Sistem / Administrator'}
                    </span>
                    <span className="text-[10.5px] text-slate-400">
                      {format(new Date(act.created_at), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-700 font-semibold">
                    {formatActivityAction(act)}
                  </p>
                  {act.metadata?.reason && (
                    <p className="text-[11px] text-amber-900 italic mt-1.5 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80">
                      <strong>Alasan:</strong> &quot;{act.metadata.reason}&quot;
                    </p>
                  )}
                  {act.metadata?.note && (
                    <p className="text-[11px] text-slate-700 italic mt-1.5 bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <strong>Catatan:</strong> &quot;{act.metadata.note}&quot;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-2">Belum ada riwayat aktivitas.</p>
        )}
      </div>
    </div>
  );
}
