'use client';
// components/cases/EvidenceGallery.tsx
// Interactive Evidence Photo Gallery with Loading Skeletons, Fallbacks, and Fullscreen Lightbox Modal

import { useState } from 'react';
import {
  Image as ImageIcon,
  ImageOff,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  User,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils/cn';

export interface EvidenceItem {
  id: string;
  phase: string;
  file_url: string;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  caption?: string | null;
  uploaded_at: string;
  signedUrl?: string;
  uploader?: { full_name: string } | null;
}

interface EvidenceGalleryProps {
  evidences: EvidenceItem[];
  className?: string;
}

export function EvidenceGallery({ evidences, className }: EvidenceGalleryProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({});

  if (!evidences || evidences.length === 0) return null;

  const currentItem = selectedIdx !== null ? evidences[selectedIdx] : null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIdx !== null && selectedIdx < evidences.length - 1) {
      setSelectedIdx(selectedIdx + 1);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIdx !== null && selectedIdx > 0) {
      setSelectedIdx(selectedIdx - 1);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPhaseBadge = (phase: string) => {
    switch (phase) {
      case 'before':
        return { label: 'Sebelum (Temuan Awal)', color: 'bg-rose-500/90 text-white' };
      case 'during':
        return { label: 'Sedang Diperbaiki', color: 'bg-amber-500/90 text-white' };
      case 'after':
        return { label: 'Sesudah (Selesai)', color: 'bg-emerald-500/90 text-white' };
      default:
        return { label: phase, color: 'bg-slate-700/90 text-white' };
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
            Bukti Foto ({evidences.length})
          </h2>
        </div>
      </div>

      {/* ── Photo Thumbnail Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {evidences.map((item, idx) => {
          const isLoaded = loadedMap[item.id];
          const isError = errorMap[item.id] || !item.signedUrl;
          const badge = getPhaseBadge(item.phase);

          return (
            <div
              key={item.id}
              onClick={() => !isError && setSelectedIdx(idx)}
              className={cn(
                'group relative aspect-square rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 shadow-2xs transition-all duration-200',
                !isError ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : 'cursor-default'
              )}
            >
              {/* Skeleton Placeholder while image is loading */}
              {!isLoaded && !isError && (
                <div className="absolute inset-0 bg-slate-200/70 animate-pulse flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-slate-300" />
                </div>
              )}

              {/* Unavailable / Missing Storage Fallback */}
              {isError && (
                <div className="absolute inset-0 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center p-2.5 text-center">
                  <ImageOff className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[10px] font-bold text-slate-700 line-clamp-1 max-w-full px-1">
                    {item.file_name || 'Foto Bukti'}
                  </span>
                  <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
                    Bukti tidak tersedia
                  </span>
                </div>
              )}

              {/* Actual Image */}
              {item.signedUrl && (
                <img
                  src={item.signedUrl}
                  alt={item.caption || item.file_name || 'Foto Bukti Kasus'}
                  onLoad={() => setLoadedMap((prev) => ({ ...prev, [item.id]: true }))}
                  onError={() => setErrorMap((prev) => ({ ...prev, [item.id]: true }))}
                  className={cn(
                    'w-full h-full object-cover group-hover:scale-105 transition-transform duration-300',
                    !isLoaded && 'opacity-0'
                  )}
                />
              )}

              {/* Hover overlay with zoom icon */}
              {!isError && (
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-800 shadow-sm">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>
              )}

              {/* Phase tag badge */}
              <div className="absolute top-2 left-2">
                <span className={cn('text-[9px] font-extrabold px-2 py-0.5 rounded-md backdrop-blur-xs shadow-2xs', badge.color)}>
                  {item.phase.toUpperCase()}
                </span>
              </div>

              {/* File size footer */}
              {item.file_size && (
                <div className="absolute bottom-1.5 right-1.5 bg-slate-900/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                  {formatFileSize(item.file_size)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Fullscreen Lightbox Modal ────────────────────────────────────── */}
      {selectedIdx !== null && currentItem && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedIdx(null)}
        >
          {/* Top Bar: Info & Close Button */}
          <div className="flex items-center justify-between text-white z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn('text-xs font-extrabold px-2.5 py-1 rounded-lg', getPhaseBadge(currentItem.phase).color)}>
                {getPhaseBadge(currentItem.phase).label}
              </span>
              <span className="text-xs font-semibold text-slate-300 truncate max-w-[200px] sm:max-w-md">
                {currentItem.file_name || 'Foto Bukti'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {currentItem.signedUrl && (
                <a
                  href={currentItem.signedUrl}
                  download={currentItem.file_name || 'bukti-kasus.jpg'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Unduh Foto"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedIdx(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-rose-600/80 text-white transition-colors"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Image with Prev / Next Navigation */}
          <div className="relative flex-1 flex items-center justify-center min-h-0 my-4" onClick={(e) => e.stopPropagation()}>
            {selectedIdx > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white transition-all active:scale-90"
                aria-label="Foto Sebelumnya"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={currentItem.signedUrl}
              alt={currentItem.caption || currentItem.file_name || 'Bukti Kasus'}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150"
            />

            {selectedIdx < evidences.length - 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white transition-all active:scale-90"
                aria-label="Foto Selanjutnya"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Footer: Metadata & Counter */}
          <div className="flex items-center justify-between text-xs text-slate-300 z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              {currentItem.uploader?.full_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentItem.uploader.full_name}</span>
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{format(new Date(currentItem.uploaded_at), 'dd MMM yyyy, HH:mm', { locale: localeId })}</span>
              </span>
            </div>

            <span className="font-extrabold text-white bg-white/10 px-2.5 py-1 rounded-lg">
              {selectedIdx + 1} / {evidences.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
