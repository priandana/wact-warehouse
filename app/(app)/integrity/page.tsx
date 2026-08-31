// app/(app)/integrity/page.tsx
// Integrity Investigation Center — Authorized Command Center
// Strictly protected by Capability.INTEGRITY_VIEW. Warehouse Admin without integrity role gets ACCESS DENIED.

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getUserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';
import { hasCapability } from '@/lib/permissions/resolveCapabilities';
import { Capability } from '@/lib/permissions/capabilities';
import { IntegrityListClient } from '@/components/integrity/IntegrityListClient';
import { type IntegrityReport } from '@/lib/integrity/types';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Integrity Center — Investigasi Pelanggaran',
  description: 'Pusat komando penanganan dan investigasi laporan integritas gudang.',
};

export const dynamic = 'force-dynamic';

export default async function IntegrityDashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Fetch user's accessible warehouses and cookie store
  const [accessibleWarehouses, cookieStore] = await Promise.all([
    getUserWarehouseAccess(user.id),
    cookies(),
  ]);

  if (accessibleWarehouses.length === 0) {
    redirect('/dashboard');
  }

  // 2. Validate active warehouse from cookie
  const activeWarehouseCookie = cookieStore.get('wact_active_warehouse_id')?.value;
  let activeWarehouse = accessibleWarehouses.find((w) => w.warehouseId === activeWarehouseCookie);

  if (!activeWarehouse) {
    activeWarehouse = accessibleWarehouses[0];
  }

  const activeWarehouseId = activeWarehouse.warehouseId;

  // 3. Strict Capability Check: INTEGRITY_VIEW
  const canViewIntegrity = await hasCapability(user.id, activeWarehouseId, Capability.INTEGRITY_VIEW);

  if (!canViewIntegrity) {
    return (
      <div className="page-padding py-8 max-w-xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              Akses Khusus Tim Integritas
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Halaman ini dikhususkan untuk <strong>Integrity Investigator</strong> dan <strong>Super Admin</strong>. Akun Anda pada gudang <strong>{activeWarehouse.warehouseName}</strong> tidak memiliki wewenang investigasi integritas.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Fetch reports for the active warehouse
  const adminClient = createAdminClient();

  const { data: rawReports, error: reportsErr } = await adminClient
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
      investigator:assigned_investigator_id ( full_name )
    `)
    .eq('warehouse_id', activeWarehouseId)
    .order('created_at', { ascending: false });

  if (reportsErr) {
    console.error('[Integrity] Error fetching reports:', reportsErr);
  }

  const reports: IntegrityReport[] = (rawReports || []).map((r) => {
    const invObj = Array.isArray(r.investigator) ? r.investigator[0] : r.investigator;
    return {
      id: r.id,
      report_code: r.report_code,
      warehouse_id: r.warehouse_id,
      area_id: r.area_id,
      location_id: r.location_id,
      category: r.category as any,
      severity: r.severity as any,
      status: r.status as any,
      incident_datetime: r.incident_datetime,
      description: r.description,
      estimated_loss: r.estimated_loss ? Number(r.estimated_loss) : null,
      involved_party_description: r.involved_party_description,
      assigned_investigator_id: r.assigned_investigator_id,
      assigned_investigator_name: invObj?.full_name || null,
      resolution_notes: r.resolution_notes,
      resolution_action: r.resolution_action,
      resolved_at: r.resolved_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  // Calculate metrics
  const counts = {
    submitted: reports.filter((r) => r.status === 'submitted').length,
    triage: reports.filter((r) => r.status === 'triage').length,
    investigating: reports.filter((r) => r.status === 'investigating').length,
    actionRequired: reports.filter((r) => r.status === 'action_required').length,
    critical: reports.filter((r) => r.severity === 'critical' && r.status !== 'resolved').length,
    resolved: reports.filter((r) => r.status === 'resolved' || r.status === 'unsubstantiated' || r.status === 'duplicate').length,
  };

  return (
    <IntegrityListClient
      reports={reports}
      warehouseName={activeWarehouse.warehouseName}
      warehouseCode={activeWarehouse.warehouseCode}
      counts={counts}
    />
  );
}
