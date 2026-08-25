'use client';

// components/master-data/MasterDataCommandCenter.tsx
// Main Tabbed Hub for WACT V2 Master Data Management (Phase UI-8A).
// Synchronizes active warehouse context, controls tabbed navigation with scope indicators,
// and enforces client-side permission visibility while delegating authoritative mutations to Server Actions.

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Layers,
  FolderTree,
  AlertCircle,
  Wrench,
  Clock,
  Globe,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useActiveWarehouse } from '@/components/shared/layout/AppShellProvider';
import { AreasLocationsTab, AreaRecord, LocationRecord } from './AreasLocationsTab';
import { CaseCategoriesTab, CaseCategoryRecord, CaseSubcategoryRecord } from './CaseCategoriesTab';
import { RootCausesTab, RootCauseRecord } from './RootCausesTab';
import { AssetCategoriesTab, AssetCategoryRecord } from './AssetCategoriesTab';
import { SlaConfigTab, SlaConfigRecord } from './SlaConfigTab';

export type MasterDataTabType = 'areas' | 'case_categories' | 'root_causes' | 'asset_categories' | 'sla';

interface MasterDataCommandCenterProps {
  initialAreas: AreaRecord[];
  initialLocations: LocationRecord[];
  initialCaseCategories: CaseCategoryRecord[];
  initialCaseSubcategories: CaseSubcategoryRecord[];
  initialRootCauses: RootCauseRecord[];
  initialAssetCategories: AssetCategoryRecord[];
  initialSlaConfigurations: SlaConfigRecord[];
  isSuperAdmin: boolean;
  canManageWarehouseMaster: boolean;
}

export function MasterDataCommandCenter({
  initialAreas,
  initialLocations,
  initialCaseCategories,
  initialCaseSubcategories,
  initialRootCauses,
  initialAssetCategories,
  initialSlaConfigurations,
  isSuperAdmin,
  canManageWarehouseMaster,
}: MasterDataCommandCenterProps) {
  const router = useRouter();
  const { activeWarehouse } = useActiveWarehouse();
  const [activeTab, setActiveTab] = useState<MasterDataTabType>('areas');

  const handleRefresh = () => {
    router.refresh();
  };

  const currentWarehouseId = activeWarehouse?.warehouseId || '';
  const currentWarehouseCode = activeWarehouse?.warehouseCode || 'PDL';
  const currentWarehouseName = activeWarehouse?.warehouseName || 'Warehouse Padalarang';

  // Filter areas and locations for currently active warehouse
  const scopedAreas = initialAreas.filter((a) => a.warehouse_id === currentWarehouseId);
  const scopedLocations = initialLocations.filter((l) => l.warehouse_id === currentWarehouseId);

  const tabs = [
    {
      id: 'areas' as MasterDataTabType,
      label: 'Area & Lokasi',
      icon: Building2,
      scope: 'warehouse',
      scopeLabel: currentWarehouseCode,
    },
    {
      id: 'case_categories' as MasterDataTabType,
      label: 'Kategori Kasus',
      icon: FolderTree,
      scope: 'global',
      scopeLabel: 'Global',
    },
    {
      id: 'root_causes' as MasterDataTabType,
      label: 'Root Cause',
      icon: AlertCircle,
      scope: 'global',
      scopeLabel: 'Global',
    },
    {
      id: 'asset_categories' as MasterDataTabType,
      label: 'Kategori Aset',
      icon: Wrench,
      scope: 'global',
      scopeLabel: 'Global',
    },
    {
      id: 'sla' as MasterDataTabType,
      label: 'Konfigurasi SLA',
      icon: Clock,
      scope: 'hybrid',
      scopeLabel: `${currentWarehouseCode} / Global`,
    },
  ];

  return (
    <div className="page-padding py-5 max-w-6xl mx-auto space-y-5">
      {/* ── COMMAND CENTER TOP HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Settings className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Pengaturan Master Data
                </h1>
                {isSuperAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100/90 text-purple-800 font-extrabold text-[10.5px] border border-purple-200">
                    <ShieldCheck className="w-3 h-3 text-purple-600" />
                    <span>Super Admin</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Kelola taksonomi sistem, struktur area gudang, dan target waktu operasional
              </p>
            </div>
          </div>
        </div>

        {/* Active Warehouse Context Pill */}
        <div className="flex items-center gap-2 self-start md:self-auto p-2 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0 ml-1" />
          <div className="min-w-0 pr-2 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gudang Aktif Terpilih</p>
            <p className="text-xs font-black text-slate-900 truncate">
              {currentWarehouseCode} — {currentWarehouseName}
            </p>
          </div>
        </div>
      </div>

      {/* ── RESPONSIVE TAB BAR ── */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/60 overflow-x-auto no-scrollbar shadow-2xs w-full scroll-smooth">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all touch-target shrink-0',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 active:scale-95',
                isActive
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0',
                  isActive
                    ? tab.scope === 'global'
                      ? 'text-purple-600'
                      : 'text-blue-600'
                    : 'text-slate-400'
                )}
              />
              <span>{tab.label}</span>
              <span
                className={cn(
                  'text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 transition-colors',
                  isActive
                    ? tab.scope === 'global'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                      : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                    : 'bg-slate-200/70 text-slate-500'
                )}
              >
                {tab.scopeLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT CONTAINERS ── */}
      <div className="animate-in fade-in duration-200">
        {activeTab === 'areas' && (
          <AreasLocationsTab
            warehouseId={currentWarehouseId}
            warehouseCode={currentWarehouseCode}
            warehouseName={currentWarehouseName}
            areas={scopedAreas}
            locations={scopedLocations}
            canManage={isSuperAdmin || canManageWarehouseMaster}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'case_categories' && (
          <CaseCategoriesTab
            categories={initialCaseCategories}
            subcategories={initialCaseSubcategories}
            isSuperAdmin={isSuperAdmin}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'root_causes' && (
          <RootCausesTab
            rootCauses={initialRootCauses}
            isSuperAdmin={isSuperAdmin}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'asset_categories' && (
          <AssetCategoriesTab
            assetCategories={initialAssetCategories}
            isSuperAdmin={isSuperAdmin}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'sla' && (
          <SlaConfigTab
            warehouseId={currentWarehouseId}
            warehouseCode={currentWarehouseCode}
            warehouseName={currentWarehouseName}
            slaConfigurations={initialSlaConfigurations}
            isSuperAdmin={isSuperAdmin}
            canManageWarehouse={isSuperAdmin || canManageWarehouseMaster}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  );
}
