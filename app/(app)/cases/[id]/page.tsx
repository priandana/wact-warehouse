// app/(app)/cases/[id]/page.tsx
// Case Detail View — Server Component with Live Supabase Data
// Decoupled, resilient queries with signed evidence photo URLs and full timeline

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { BUCKETS, getSignedUrl } from '@/lib/supabase/storage';
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
  Image as ImageIcon,
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
      case_number,
      title,
      description,
      priority,
      status,
      due_date,
      created_at,
      has_operational_impact,
      requires_maintenance,
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
      .order('created_at', { ascending: false }),

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
  ]);

  // Generate signed URLs for private storage images
  const evidenceList = await Promise.all(
    (evidences ?? []).map(async (ev) => {
      let signedUrl = '';
      try {
        if (ev.file_url) {
          signedUrl = await getSignedUrl(BUCKETS.CASE_EVIDENCES, ev.file_url, 3600);
        }
      } catch (e) {
        console.error('Failed to sign evidence URL:', ev.file_url, e);
      }
      return {
        ...ev,
        signedUrl,
      };
    })
  );

  const currentAssignment = Array.isArray(assignments)
    ? assignments.find((a: any) => a.is_current)
    : null;

  const isOverdue = item.due_date && isPast(new Date(item.due_date)) && item.status !== 'closed';
  const locationText = [(item.areas as any)?.name, (item.locations as any)?.name].filter(Boolean).join(' • ');

  const formatActivityAction = (act: any) => {
    switch (act.action) {
      case 'created':
        return 'Kasus dibuat dan dilaporkan';
      case 'assigned':
        return 'Kasus ditugaskan ke PIC';
      case 'status_changed':
        return `Status diubah ${act.from_status ? `dari ${act.from_status}` : ''} menjadi ${act.to_status}`;
      case 'evidence_added':
        return 'Bukti foto ditambahkan';
      case 'commented':
        return 'Komentar baru ditambahkan';
      case 'verified':
        return 'Kasus diverifikasi oleh QC';
      case 'closed':
        return 'Kasus ditutup (selesai)';
      case 'reopened':
        return 'Kasus dibuka kembali';
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
        {(item.has_operational_impact || item.requires_maintenance) && (
          <div className="flex flex-wrap gap-2">
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

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Kategori</p>
            <p className="font-bold text-slate-800 mt-0.5 truncate">
              {(item.category as any)?.name || '-'}
            </p>
            {(item.subcategory as any)?.name && (
              <p className="text-[10.5px] text-slate-500 truncate">{(item.subcategory as any).name}</p>
            )}
          </div>

          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Lokasi</p>
            <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{locationText || '-'}</span>
            </p>
            {(item.assets as any)?.asset_code && (
              <p className="text-[10.5px] text-slate-500 font-mono truncate">{(item.assets as any).asset_code}</p>
            )}
          </div>

          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Pelapor</p>
            <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1 truncate">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{(item.reporter as any)?.full_name || 'Administrator'}</span>
            </p>
            <p className="text-[10.5px] text-slate-400 truncate">
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
      </div>

      {/* ── 2. Evidence Photos Section ───────────────────────────────────── */}
      {evidenceList.length > 0 && (
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Bukti Foto ({evidenceList.length})
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {evidenceList.map((ev) => (
              <div key={ev.id} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs group">
                {ev.signedUrl ? (
                  <a href={ev.signedUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={ev.signedUrl}
                      alt={ev.caption || ev.file_name || 'Bukti Kasus'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </a>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-400 text-center">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">{ev.file_name || 'Foto'}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/80 to-transparent p-2 text-white text-[10px] font-semibold truncate">
                  <span className="capitalize">{ev.phase}</span>
                  {ev.caption && <span className="opacity-80"> • {ev.caption}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. Activity Timeline Card ────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
          <Activity className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
            Riwayat Aktivitas & Workflow
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
                      {act.actor?.full_name || 'Sistem'}
                    </span>
                    <span className="text-[10.5px] text-slate-400">
                      {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: localeId })}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-600 font-medium">
                    {formatActivityAction(act)}
                  </p>
                  {act.note && (
                    <p className="text-[11px] text-slate-500 italic mt-1 bg-white p-2 rounded-lg border border-slate-200/60">
                      &quot;{act.note}&quot;
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
