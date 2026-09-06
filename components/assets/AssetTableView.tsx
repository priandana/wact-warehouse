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
    <div className="hidden lg:block neu-raised rounded-3xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#E5EBF3] dark:bg-[#101726] border-b border-slate-200/60 dark:border-slate-800 text-[10.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <th className="py-3 px-4">Kode & Nama Aset</th>
              <th className="py-3 px-4">Kategori</th>
              <th className="py-3 px-4">Area & Lokasi</th>
              <th className="py-3 px-4">Kondisi</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-center">Kendala Aktif</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-300">
            {assets.map((asset) => {
              const brand = asset.specification?.brand;
              const model = asset.specification?.model;
              const condition = asset.specification?.condition;
              const openCases = asset.openCasesCount || 0;

              return (
                <tr
                  key={asset.id}
                  className="hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-colors group"
                >
                  {/* Code & Name */}
                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-blue-700 dark:text-blue-400 neu-pill-active px-2 py-0.5 rounded-lg text-[11px]">
                          {asset.asset_code}
                        </span>
                      </div>
                      <Link
                        href={`/assets/${asset.id}`}
                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block line-clamp-1"
                      >
                        {asset.name}
                      </Link>
                      {(brand || model) && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {brand} {model ? `• ${model}` : ''}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4">
                    {asset.category?.name ? (
                      <span className="font-bold neu-pill-inactive px-2.5 py-0.5 rounded-lg text-[10.5px]">
                        {asset.category.name}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* Area & Location */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
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
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                        <span>{openCases} Kasus</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">0 Kasus</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenQR(asset)}
                        className="w-8 h-8 rounded-xl neu-icon-well flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                        title="Tampilkan QR Code"
                        aria-label="Tampilkan QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/assets/${asset.id}`}
                        className="neu-btn-secondary inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-blue-600 dark:text-blue-400 font-bold text-[11px] transition-all"
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
