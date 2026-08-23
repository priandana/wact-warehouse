'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Printer,
  X,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface AssetQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: string;
    asset_code: string;
    name: string;
    warehouse_name?: string;
    area_name?: string;
    location_name?: string;
  };
}

export function AssetQRModal({ isOpen, onClose, asset }: AssetQRModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const assetUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/assets/${asset.id}`
    : `https://wact-warehouse.vercel.app/assets/${asset.id}`;

  useEffect(() => {
    if (isOpen && asset.id) {
      QRCode.toDataURL(assetUrl, {
        width: 380,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }
  }, [isOpen, asset.id, assetUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(assetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${asset.asset_code}.png`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-extrabold text-slate-900">QR Code Label Aset</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div
          ref={printRef}
          className="p-5 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center text-center space-y-3 print:border-solid print:bg-white print:p-8"
        >
          <div className="flex items-center gap-1.5 text-blue-700 font-mono font-black text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>WACT OFFICIAL ASSET TAG</span>
          </div>

          {qrDataUrl ? (
            <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <img
                src={qrDataUrl}
                alt={`QR Code ${asset.asset_code}`}
                className="w-44 h-44 object-contain rounded-lg"
              />
            </div>
          ) : (
            <div className="w-44 h-44 bg-slate-200 animate-pulse rounded-2xl flex items-center justify-center text-xs text-slate-400 font-bold">
              Membuat QR Code...
            </div>
          )}

          <div className="space-y-0.5">
            <span className="font-mono text-base font-black text-slate-900 tracking-wider">
              {asset.asset_code}
            </span>
            <p className="text-xs font-bold text-slate-700 leading-snug line-clamp-2">
              {asset.name}
            </p>
            {(asset.warehouse_name || asset.area_name) && (
              <p className="text-[10.5px] font-semibold text-slate-400">
                {asset.warehouse_name} {asset.area_name ? `• ${asset.area_name}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadQR}
            disabled={!qrDataUrl}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Unduh PNG</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!qrDataUrl}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Label</span>
          </button>
        </div>

        {/* Copy Direct Link */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50/60 rounded-xl transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tautan Aset Berhasil Disalin!' : 'Salin Tautan Langsung ke Aset'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
