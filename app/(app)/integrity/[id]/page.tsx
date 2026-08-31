// app/(app)/integrity/[id]/page.tsx
// Integrity Investigation Detail — Server Page with Authorization & Data Resolution

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { hasCapability } from '@/lib/permissions/resolveCapabilities';
import { Capability } from '@/lib/permissions/capabilities';
import { IntegrityDetailClient } from '@/components/integrity/IntegrityDetailClient';
import {
  type IntegrityReport,
  type IntegrityMessage,
  type IntegrityInternalNote,
  type IntegrityEvidence,
  type IntegrityActivity,
} from '@/lib/integrity/types';

export const metadata: Metadata = {
  title: 'Detail Investigasi Integritas — WACT',
  description: 'Ruang kerja investigasi laporan integritas terenkripsi.',
};

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function IntegrityReportDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const adminClient = createAdminClient();

  // 1. Fetch main report row
  const { data: rawReport, error: reportErr } = await adminClient
    .from('integrity_reports')
    .select(`
      id,
      report_code,
      warehouse_id,
      area_id,
      location_id,
      category,
      severity,
      status,
      incident_datetime,
      description,
      estimated_loss,
      involved_party_description,
      assigned_investigator_id,
      resolution_notes,
      resolution_action,
      resolved_at,
      created_at,
      updated_at,
      warehouses:warehouse_id ( id, name, code ),
      investigator:assigned_investigator_id ( id, full_name )
    `)
    .eq('id', id)
    .single();

  if (reportErr || !rawReport) {
    notFound();
  }

  // 2. Strict Capability Verification on report's warehouse
  const canView = await hasCapability(user.id, rawReport.warehouse_id, Capability.INTEGRITY_VIEW);
  if (!canView) {
    notFound(); // Fails closed, do not reveal existence of report to unauthorized users
  }

  // 3. Fetch messages, internal notes, evidences, activities, and candidates in parallel
  const [
    { data: rawMessages },
    { data: rawNotes },
    { data: rawEvidences },
    { data: rawActivities },
    { data: rawCandidates },
  ] = await Promise.all([
    adminClient
      .from('integrity_messages')
      .select('id, report_id, sender_type, sender_id, message, created_at, sender:sender_id ( full_name )')
      .eq('report_id', id)
      .order('created_at', { ascending: true }),

    adminClient
      .from('integrity_internal_notes')
      .select('id, report_id, author_id, note, created_at, updated_at, author:author_id ( full_name )')
      .eq('report_id', id)
      .order('created_at', { ascending: true }),

    adminClient
      .from('integrity_evidences')
      .select('id, report_id, message_id, storage_path, file_name, file_size, mime_type, source_type, caption, created_at')
      .eq('report_id', id)
      .order('created_at', { ascending: true }),

    adminClient
      .from('integrity_activities')
      .select('id, report_id, actor_type, actor_id, action, from_status, to_status, metadata, created_at, actor:actor_id ( full_name )')
      .eq('report_id', id)
      .order('created_at', { ascending: true }),

    adminClient
      .from('user_warehouses')
      .select(`
        user_id,
        is_active,
        roles ( name, display_name ),
        profiles:user_id ( id, full_name, is_active )
      `)
      .eq('warehouse_id', rawReport.warehouse_id)
      .eq('is_active', true),
  ]);

  // 4. Generate signed URLs for evidences
  const evidences: IntegrityEvidence[] = await Promise.all(
    (rawEvidences || []).map(async (ev) => {
      let signedUrl = '';
      try {
        const { data: signData } = await adminClient.storage
          .from('integrity-evidences')
          .createSignedUrl(ev.storage_path, 3600);
        signedUrl = signData?.signedUrl || '';
      } catch {
        // ignore
      }
      return {
        id: ev.id,
        report_id: ev.report_id,
        message_id: ev.message_id,
        storage_path: ev.storage_path,
        file_name: ev.file_name,
        file_size: ev.file_size,
        mime_type: ev.mime_type,
        source_type: ev.source_type as any,
        caption: ev.caption,
        created_at: ev.created_at,
        signedUrl,
      };
    })
  );

  const messages: IntegrityMessage[] = (rawMessages || []).map((m) => {
    const senderObj = Array.isArray(m.sender) ? m.sender[0] : m.sender;
    return {
      id: m.id,
      report_id: m.report_id,
      sender_type: m.sender_type as any,
      sender_id: m.sender_id,
      sender_name: senderObj?.full_name || null,
      message: m.message,
      created_at: m.created_at,
    };
  });

  const internal_notes: IntegrityInternalNote[] = (rawNotes || []).map((n) => {
    const authorObj = Array.isArray(n.author) ? n.author[0] : n.author;
    return {
      id: n.id,
      report_id: n.report_id,
      author_id: n.author_id,
      author_name: authorObj?.full_name || 'Investigator',
      note: n.note,
      created_at: n.created_at,
      updated_at: n.updated_at,
    };
  });

  const activities: IntegrityActivity[] = (rawActivities || []).map((a) => {
    const actorObj = Array.isArray(a.actor) ? a.actor[0] : a.actor;
    return {
      id: a.id,
      report_id: a.report_id,
      actor_type: a.actor_type as any,
      actor_id: a.actor_id,
      actor_name: actorObj?.full_name || null,
      action: a.action,
      from_status: a.from_status,
      to_status: a.to_status,
      metadata: a.metadata as any,
      created_at: a.created_at,
    };
  });

  const whObj = Array.isArray(rawReport.warehouses) ? rawReport.warehouses[0] : rawReport.warehouses;
  const invObj = Array.isArray(rawReport.investigator) ? rawReport.investigator[0] : rawReport.investigator;

  const report: IntegrityReport = {
    id: rawReport.id,
    report_code: rawReport.report_code,
    warehouse_id: rawReport.warehouse_id,
    warehouse_name: whObj?.name || 'Gudang',
    warehouse_code: whObj?.code || 'WACT',
    area_id: rawReport.area_id,
    location_id: rawReport.location_id,
    category: rawReport.category as any,
    severity: rawReport.severity as any,
    status: rawReport.status as any,
    incident_datetime: rawReport.incident_datetime,
    description: rawReport.description,
    estimated_loss: rawReport.estimated_loss ? Number(rawReport.estimated_loss) : null,
    involved_party_description: rawReport.involved_party_description,
    assigned_investigator_id: rawReport.assigned_investigator_id,
    assigned_investigator_name: invObj?.full_name || null,
    resolution_notes: rawReport.resolution_notes,
    resolution_action: rawReport.resolution_action,
    resolved_at: rawReport.resolved_at,
    created_at: rawReport.created_at,
    updated_at: rawReport.updated_at,
    messages,
    evidences,
    internal_notes,
    activities,
  };

  // Build candidate list (deduplicated by user_id)
  const candidateMap = new Map<string, { id: string; full_name: string; role_display_name?: string }>();
  for (const row of (rawCandidates || [])) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
    if (profile && profile.is_active && !candidateMap.has(profile.id)) {
      candidateMap.set(profile.id, {
        id: profile.id,
        full_name: profile.full_name,
        role_display_name: role?.display_name || 'Staff',
      });
    }
  }

  const candidates = Array.from(candidateMap.values()).sort((a, b) =>
    a.full_name.localeCompare(b.full_name, 'id', { sensitivity: 'base' })
  );

  return (
    <IntegrityDetailClient
      report={report}
      candidates={candidates}
      currentUserId={user.id}
    />
  );
}
