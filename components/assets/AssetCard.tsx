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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 space-y-2.5 relative hover:border-blue-300 hover:shadow-xs transition-all">
      {/* Header: Code, Category, QR Trigger */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
              {asset.asset_code}
            </span>
            {asset.category?.name && (
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {asset.category.name}
              </span>
            )}
          </div>
          <Link
            href={`/assets/${asset.id}`}
            className="block text-sm font-black text-slate-900 hover:text-blue-600 transition-colors leading-snug truncate"
          >
            {asset.name}
          </Link>
          {(brand || model) && (
            <p className="text-[11px] font-semibold text-slate-400 truncate">
              {brand} {model ? `• ${model}` : ''}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpenQR(asset)}
          className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200/80 transition-colors shrink-0 active:scale-95"
          title="Tampilkan QR Code"
          aria-label="Tampilkan QR Code"
        >
          <QrCode className="w-4 h-4" />
        </button>
      </div>

      {/* Location */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate text-[11px] font-semibold text-slate-600">
          {asset.area?.name || 'Area Belum Diatur'}
          {asset.location?.name ? ` • ${asset.location.name}` : ''}
        </span>
      </div>

      {/* Badges: Status & Condition */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <AssetConditionBadge condition={condition} size="sm" />
        <AssetStatusBadge status={asset.status} size="sm" />
      </div>

      {/* Footer: Open Cases & Detail Link */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <div>
          {openCases > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span>{openCases} Kasus Aktif</span>
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400">
              0 Kasus Aktif
            </span>
          )}
        </div>

        <Link
          href={`/assets/${asset.id}`}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
        >
          <span>Lihat Detail</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
