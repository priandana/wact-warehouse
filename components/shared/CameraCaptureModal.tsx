'use client';
// components/shared/CameraCaptureModal.tsx
// Modern In-App Camera Experience with Live Stream, Capture, Retake, and Fallback

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RotateCw,
  Check,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  onFallbackToFilePicker?: () => void;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  onFallbackToFilePicker,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Stop current video stream
  const stopStream = useCallback((mediaStream?: MediaStream | null) => {
    const s = mediaStream || stream;
    if (s) {
      s.getTracks().forEach((track) => {
        track.stop();
      });
    }
  }, [stream]);

  // Start camera stream
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    setCameraLoading(true);
    setCameraError(null);
    stopStream();

    if (
      typeof window === 'undefined' ||
      !Boolean(navigator?.mediaDevices?.getUserMedia)
    ) {
      setCameraError('Kamera tidak didukung pada browser ini.');
      setCameraLoading(false);
      return;
    }

    try {
      // Check available video devices
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraLoading(false);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.'
          : err instanceof DOMException && err.name === 'NotFoundError'
          ? 'Perangkat kamera tidak ditemukan.'
          : 'Gagal mengakses kamera.';
      setCameraError(errorMsg);
      setCameraLoading(false);
    }
  }, [stopStream]);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setCapturedBlob(null);
      setCapturedPreviewUrl(null);
      startCamera(facingMode);
    } else {
      stopStream();
      if (capturedPreviewUrl) {
        URL.revokeObjectURL(capturedPreviewUrl);
      }
      setCapturedBlob(null);
      setCapturedPreviewUrl(null);
    }

    return () => {
      stopStream();
    };
  }, [isOpen]);

  // Handle Capture
  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setCapturedPreviewUrl(url);
      },
      'image/jpeg',
      0.92
    );
  };

  // Retake photo
  const handleRetake = () => {
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
  };

  // Confirm photo
  const handleConfirmPhoto = () => {
    if (!capturedBlob) return;
    const file = new File(
      [capturedBlob],
      `camera_${Date.now()}.jpg`,
      { type: 'image/jpeg' }
    );
    onCapture(file);
    stopStream();
    onClose();
  };

  // Switch Camera
  const handleToggleFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-hidden border border-slate-800 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-extrabold">Kamera Bukti</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport / Live Stream / Preview */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px] sm:min-h-[380px]">
          {/* Hidden Canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Captured Preview Mode */}
          {capturedPreviewUrl ? (
            <img
              src={capturedPreviewUrl}
              alt="Hasil Tangkapan Kamera"
              className="w-full h-full object-contain max-h-[50dvh]"
            />
          ) : (
            <>
              {/* Live Video Stream */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={cn(
                  'w-full h-full object-cover max-h-[50dvh]',
                  cameraLoading && 'opacity-0'
                )}
              />

              {/* Loading Indicator */}
              {cameraLoading && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white bg-slate-950/60 backdrop-blur-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                  <span className="text-xs font-semibold">Menghubungkan ke kamera...</span>
                </div>
              )}

              {/* Camera Error Fallback */}
              {cameraError && (
                <div className="p-6 text-center text-white space-y-3 max-w-xs">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-300 leading-relaxed">
                    {cameraError}
                  </p>
                  {onFallbackToFilePicker && (
                    <button
                      type="button"
                      onClick={() => {
                        stopStream();
                        onClose();
                        onFallbackToFilePicker();
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Pilih Foto dari Perangkat</span>
                    </button>
                  )}
                </div>
              )}

              {/* Camera Flip Switch (Mobile / Multiple devices) */}
              {hasMultipleCameras && !cameraLoading && !cameraError && (
                <button
                  type="button"
                  onClick={handleToggleFacing}
                  className="absolute top-3 right-3 p-2.5 rounded-full bg-slate-900/70 text-white border border-white/10 hover:bg-slate-800 backdrop-blur-xs transition-all shadow-md active:scale-95"
                  title="Ganti Kamera Depan/Belakang"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="px-5 py-4 border-t border-slate-800 bg-slate-900 shrink-0 flex items-center justify-between gap-3 text-white"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {capturedPreviewUrl ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Ambil Ulang</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmPhoto}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Gunakan Foto</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  stopStream();
                  onClose();
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={cameraLoading || Boolean(cameraError)}
                onClick={handleTakePhoto}
                className="flex-1 py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Camera className="w-4 h-4" />
                <span>Ambil Foto</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
