'use client';

import Link from 'next/link';
import {
  QrCode,
  MapPin,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { AssetRecord } from './AssetCard';
import { AssetStatusBadge, AssetConditionBadge } from './AssetStatusBadge';

interface AssetTableViewProps {
  assets: AssetRecord[];
  onOpenQR: (asset: AssetRecord) => void;
}

export function AssetTableView({ assets, onOpenQR }: AssetTableViewProps) {
  return (
    <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">Kode & Nama Aset</th>
              <th className="py-3 px-4">Kategori</th>
              <th className="py-3 px-4">Area & Lokasi</th>
              <th className="py-3 px-4">Kondisi</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-center">Kendala Aktif</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {assets.map((asset) => {
              const brand = asset.specification?.brand;
              const model = asset.specification?.model;
              const condition = asset.specification?.condition;
              const openCases = asset.openCasesCount || 0;

              return (
                <tr
                  key={asset.id}
                  className="hover:bg-slate-50/60 transition-colors group"
                >
                  {/* Code & Name */}
                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] border border-blue-200/60">
                          {asset.asset_code}
                        </span>
                      </div>
                      <Link
                        href={`/assets/${asset.id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition-colors block line-clamp-1"
                      >
                        {asset.name}
                      </Link>
                      {(brand || model) && (
                        <p className="text-[11px] text-slate-400 font-medium">
                          {brand} {model ? `• ${model}` : ''}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4">
                    {asset.category?.name ? (
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        {asset.category.name}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* Area & Location */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-[11px] truncate max-w-[160px]">
                        {asset.area?.name || 'Belum diatur'}
                        {asset.location?.name ? ` • ${asset.location.name}` : ''}
                      </span>
                    </div>
                  </td>

                  {/* Condition */}
                  <td className="py-3 px-4">
                    <AssetConditionBadge condition={condition} size="sm" />
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    <AssetStatusBadge status={asset.status} size="sm" />
                  </td>

                  {/* Open Cases */}
                  <td className="py-3 px-4 text-center">
                    {openCases > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{openCases} Kasus</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400">0 Kasus</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenQR(asset)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                        title="Tampilkan QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/assets/${asset.id}`}
                        className="inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-colors"
                      >
                        <span>Detail</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
