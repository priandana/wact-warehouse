'use client';

import Link from 'next/link';
import {
  QrCode,
  MapPin,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Package,
} from 'lucide-react';
import { AssetStatusBadge, AssetConditionBadge } from './AssetStatusBadge';

export interface AssetRecord {
  id: string;
  warehouse_id: string;
  asset_code: string;
  name: string;
  category_id?: string | null;
  area_id?: string | null;
  location_id?: string | null;
  photo_url?: string | null;
  status: string;
  installed_date?: string | null;
  last_inspection_at?: string | null;
  next_inspection_at?: string | null;
  specification?: {
    brand?: string | null;
    model?: string | null;
    serial_number?: string | null;
    condition?: string | null;
    notes?: string | null;
  } | null;
  category?: { name: string } | null;
  area?: { name: string } | null;
  location?: { name: string } | null;
  openCasesCount?: number;
}

interface AssetCardProps {
  asset: AssetRecord;
  onOpenQR: (asset: AssetRecord) => void;
}

export function AssetCard({ asset, onOpenQR }: AssetCardProps) {
  const brand = asset.specification?.brand;
  const model = asset.specification?.model;
  const condition = asset.specification?.condition;
  const openCases = asset.openCasesCount || 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3 relative hover:border-blue-300 transition-all">
      {/* Header: Code, Badges, QR Trigger */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
              {asset.asset_code}
            </span>
            {asset.category?.name && (
              <span className="text-[10.5px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {asset.category.name}
              </span>
            )}
          </div>
          <Link
            href={`/assets/${asset.id}`}
            className="block text-sm font-black text-slate-900 hover:text-blue-600 transition-colors leading-snug line-clamp-2"
          >
            {asset.name}
          </Link>
          {(brand || model) && (
            <p className="text-[11px] font-semibold text-slate-500">
              {brand} {model ? `• ${model}` : ''}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpenQR(asset)}
          className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200 transition-colors shrink-0"
          title="Tampilkan QR Code"
        >
          <QrCode className="w-4 h-4" />
        </button>
      </div>

      {/* Location & Status Badges */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <AssetStatusBadge status={asset.status} size="sm" />
        <AssetConditionBadge condition={condition} size="sm" />
      </div>

      {/* Footer Info: Area, Cases, Detail Link */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate text-[11px] font-semibold text-slate-600">
            {asset.area?.name || 'Area Belum Diatur'}
            {asset.location?.name ? ` • ${asset.location.name}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {openCases > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
              <AlertTriangle className="w-3 h-3" />
              <span>{openCases} Kasus</span>
            </span>
          )}
          <Link
            href={`/assets/${asset.id}`}
            className="flex items-center gap-0.5 text-xs font-bold text-blue-600 hover:text-blue-700 p-1"
          >
            <span>Detail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
