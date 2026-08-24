// app/(app)/cases/new/page.tsx
// New Case Page — Server Component loading active master data & validating authoritative inspection context

import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CreateCaseWizard } from '@/components/cases/CreateCaseWizard';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Laporkan Kasus Baru',
  description: 'Formulir pelaporan kasus dan insiden operasional gudang',
};

export const dynamic = 'force-dynamic';

export interface SourceInspectionEvidence {
  id: string;
  file_url: string;
  signed_url?: string;
  file_name?: string | null;
  caption?: string | null;
  item_label?: string | null;
  is_ng?: boolean;
}

export interface ServerInspectionContext {
  inspectionId: string;
  inspectionNumber: string;
  warehouseId: string;
  warehouseName?: string;
  assetId: string;
  assetName?: string;
  assetCode?: string;
  areaId?: string;
  locationId?: string;
  ngFindings: Array<{ label: string; notes?: string | null }>;
  defaultTitle: string;
  defaultDescription: string;
  evidences?: SourceInspectionEvidence[];
  existingCase?: { id: string; case_number: string; title: string; status: string } | null;
}

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{
    asset_id?: string;
    warehouse_id?: string;
    area_id?: string;
    location_id?: string;
    inspection_id?: string;
    source?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all active master data in parallel
  const [
    { data: categories },
    { data: subcategories },
    { data: areas },
    { data: locations },
    { data: assets },
  ] = await Promise.all([
    supabase
      .from('case_categories')
      .select('id, name, icon, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    supabase
      .from('case_subcategories')
      .select('id, category_id, name, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    supabase
      .from('areas')
      .select('id, warehouse_id, code, name')
      .eq('is_active', true)
      .order('name', { ascending: true }),

    supabase
      .from('locations')
      .select('id, area_id, warehouse_id, code, name')
      .eq('is_active', true)
      .order('name', { ascending: true }),

    supabase
      .from('assets')
      .select('id, warehouse_id, area_id, asset_code, name')
      .neq('status', 'retired')
      .order('name', { ascending: true }),
  ]);

  // Server-side authoritative validation and derivation from inspection_id
  let inspectionContext: ServerInspectionContext | null = null;

  if (params.inspection_id && /^[0-9a-fA-F-]{36}$/.test(params.inspection_id)) {
    const [
      { data: rawInsp, error: inspErr },
      { data: resultsData },
      { data: evidencesData },
      { data: existingCases },
    ] = await Promise.all([
      supabase
        .from('inspections')
        .select(`
          id,
          inspection_number,
          warehouse_id,
          asset_id,
          status,
          overall_result,
          notes,
          asset:assets!inspections_asset_fk(
            id,
            asset_code,
            name,
            area_id,
            location_id,
            warehouse_id
          ),
          warehouse:warehouses(
            id,
            code,
            name
          )
        `)
        .eq('id', params.inspection_id)
        .maybeSingle(),

      supabase
        .from('inspection_results')
        .select(`
          id,
          item_id,
          value,
          notes,
          item:inspection_template_items(
            id,
            label
          )
        `)
        .eq('inspection_id', params.inspection_id),

      supabase
        .from('inspection_evidences')
        .select('id, inspection_result_id, file_url, file_name, caption')
        .eq('inspection_id', params.inspection_id),

      supabase
        .from('cases')
        .select('id, case_number, title, status')
        .eq('inspection_id', params.inspection_id)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    if (rawInsp && !inspErr && rawInsp.status === 'completed' && rawInsp.overall_result === 'ng') {
      const rawAsset = rawInsp.asset as any;
      const rawWarehouse = rawInsp.warehouse as any;
      const ngList = ((resultsData as any[]) || [])
        .filter((r) => r.value === 'ng')
        .map((r) => ({
          label: r.item?.label || 'Item Checklist',
          notes: r.notes?.trim() || null,
        }));

      if (ngList.length > 0) {
        const descLines: string[] = [
          `Dibuat otomatis dari hasil audit inspeksi QC **${rawInsp.inspection_number}**.`,
          `Unit Aset: **${rawAsset?.asset_code ? `${rawAsset.asset_code} — ` : ''}${rawAsset?.name || 'Aset'}**`,
          '',
          '### ⚠️ Temuan Checklist NG (Defect):',
        ];

        ngList.forEach((ng, idx) => {
          descLines.push(`${idx + 1}. **${ng.label}**`);
          if (ng.notes) {
            descLines.push(`   *Catatan temuan:* ${ng.notes}`);
          }
        });

        // Generate finite-expiry signed URLs for source inspection evidence photos
        let signedEvidences: SourceInspectionEvidence[] = [];
        if (evidencesData && evidencesData.length > 0) {
          const paths = evidencesData
            .map((e) => e.file_url)
            .filter((p): p is string => Boolean(p));

          const signedMap = new Map<string, string>();
          if (paths.length > 0) {
            const { data: signedResults } = await supabase.storage
              .from('inspection-evidences')
              .createSignedUrls(paths, 3600);

            if (signedResults) {
              for (const s of signedResults) {
                if (s.path && s.signedUrl) {
                  signedMap.set(s.path, s.signedUrl);
                }
              }
            }
          }

          const resultMap = new Map<string, { label: string; is_ng: boolean }>(
            ((resultsData as any[]) || []).map((r) => [
              r.id,
              {
                label: r.item?.label || '',
                is_ng: r.value === 'ng',
              },
            ])
          );

          signedEvidences = evidencesData.map((e) => {
            const res = e.inspection_result_id
              ? resultMap.get(e.inspection_result_id)
              : undefined;
            return {
              id: e.id,
              file_url: e.file_url,
              signed_url: signedMap.get(e.file_url) || undefined,
              file_name: e.file_name,
              caption: e.caption,
              item_label: res?.label || undefined,
              is_ng: res?.is_ng ?? false,
            };
          });
        }

        inspectionContext = {
          inspectionId: rawInsp.id,
          inspectionNumber: rawInsp.inspection_number,
          warehouseId: rawInsp.warehouse_id,
          warehouseName: rawWarehouse?.name || '',
          assetId: rawInsp.asset_id,
          assetName: rawAsset?.name || '',
          assetCode: rawAsset?.asset_code || '',
          areaId: rawAsset?.area_id || undefined,
          locationId: rawAsset?.location_id || undefined,
          ngFindings: ngList,
          defaultTitle: `Temuan Inspeksi ${rawAsset?.name || 'Aset'}${rawAsset?.asset_code ? ` - ${rawAsset.asset_code}` : ''}`,
          defaultDescription: descLines.join('\n'),
          evidences: signedEvidences,
          existingCase: existingCases && existingCases.length > 0 ? existingCases[0] : null,
        };
      }
    }
  }

  // Safe Context Error: If inspection_id was explicitly supplied but validation failed, do NOT silently fall back to direct mode.
  if (params.inspection_id && !inspectionContext) {
    return (
      <div className="page-padding py-12 max-w-lg mx-auto">
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm text-center space-y-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Referensi Inspeksi Tidak Valid
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Referensi inspeksi tidak valid atau tidak dapat digunakan untuk membuat kasus. Pastikan sesi inspeksi berstatus selesai (completed) dan memiliki temuan checklist NG (defect).
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Link
              href="/inspections"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all"
            >
              Kembali ke Daftar Inspeksi
            </Link>
            <Link
              href="/cases/new"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs transition-all"
            >
              Buat Kasus Biasa
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-padding py-4">
      <CreateCaseWizard
        categories={categories ?? []}
        subcategories={subcategories ?? []}
        areas={areas ?? []}
        locations={locations ?? []}
        assets={assets ?? []}
        inspectionContext={inspectionContext}
        initialAssetId={inspectionContext ? inspectionContext.assetId : params.asset_id}
        initialAreaId={inspectionContext ? inspectionContext.areaId : params.area_id}
        initialLocationId={inspectionContext ? inspectionContext.locationId : params.location_id}
        initialWarehouseId={inspectionContext ? inspectionContext.warehouseId : params.warehouse_id}
        initialInspectionId={inspectionContext ? inspectionContext.inspectionId : params.inspection_id}
        initialInspectionNumber={inspectionContext ? inspectionContext.inspectionNumber : undefined}
        initialTitle={inspectionContext ? inspectionContext.defaultTitle : undefined}
        initialDescription={inspectionContext ? inspectionContext.defaultDescription : undefined}
        initialSource={inspectionContext ? 'inspection' : params.source}
      />
    </div>
  );
}
