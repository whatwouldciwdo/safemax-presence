'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle, SwitchCamera } from 'lucide-react';
import { NeuButton } from '../ui/NeuButton';

interface SelfieCameraProps {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
  title?: string;
}

export const SelfieCamera: React.FC<SelfieCameraProps> = ({
  onCapture,
  onCancel,
  title = 'Ambil Foto Selfie Presensi',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Stop camera tracks helper
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setCameraError(null);

    // Stop existing tracks first
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser Anda tidak mendukung akses kamera.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal mengakses kamera. Pastikan izin kamera telah diberikan.';
      setCameraError(msg);
    } finally {
      setIsInitializing(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera]);

  // Flip camera (user <-> environment)
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Capture frame to canvas
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, mirror image for natural selfie feel
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  // Confirm photo
  const handleConfirm = () => {
    if (capturedImage) {
      stopCamera();
      onCapture(capturedImage);
    }
  };

  // Fallback file input if camera is not available
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedImage(reader.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="neu-card w-full max-w-md p-4 sm:p-6 relative flex flex-col items-center max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 neu-inset rounded-xl text-blue-600">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base md:text-lg">{title}</h3>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            className="p-2 neu-btn text-slate-500 hover:text-slate-800 rounded-full"
            aria-label="Tutup kamera"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Viewport Frame */}
        <div className="w-full aspect-square max-w-[280px] sm:max-w-[340px] neu-inset-deep rounded-2xl overflow-hidden relative flex items-center justify-center border-4 border-[#e2e8f0]">
          {isInitializing && !capturedImage && !cameraError && (
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm">Menghubungkan kamera...</p>
            </div>
          )}

          {cameraError && !capturedImage && (
            <div className="p-6 text-center flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-rose-500" />
              <p className="text-sm text-slate-700 font-medium">{cameraError}</p>
              <div className="flex flex-col gap-2 mt-2 w-full">
                <NeuButton size="sm" onClick={() => startCamera()}>
                  Coba Lagi
                </NeuButton>
                <label className="neu-btn px-4 py-2 text-xs font-semibold text-blue-600 cursor-pointer block text-center">
                  Unggah Foto Selfie Manual
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Live Video */}
          {!capturedImage && !cameraError && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />
          )}

          {/* Captured Image Preview */}
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Hasil Selfie"
              className="w-full h-full object-cover"
            />
          )}

          {/* Target Face Guide Overlay */}
          {!capturedImage && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-60 border-2 border-dashed border-white/60 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
              <span className="absolute bottom-6 px-3 py-1 bg-black/50 text-white text-xs rounded-full backdrop-blur-xs">
                Posisikan wajah di dalam oval
              </span>
            </div>
          )}
        </div>

        {/* Offscreen Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Action Controls */}
        <div className="w-full mt-6 flex items-center justify-center gap-4">
          {!capturedImage && !cameraError && (
            <>
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-3 neu-btn rounded-full text-slate-600 hover:text-blue-600"
                title="Putar Kamera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleCapture}
                className="w-16 h-16 neu-btn-primary rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                title="Ambil Foto"
              >
                <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded-full" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onCancel();
                }}
                className="p-3 neu-btn rounded-full text-slate-600 hover:text-rose-600"
                title="Batal"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}

          {capturedImage && (
            <div className="flex items-center gap-3 w-full justify-center">
              <NeuButton
                variant="default"
                size="md"
                onClick={handleRetake}
                className="flex-1 max-w-[150px]"
              >
                <RefreshCw className="w-4 h-4" />
                Foto Ulang
              </NeuButton>

              <NeuButton
                variant="success"
                size="md"
                onClick={handleConfirm}
                className="flex-1 max-w-[170px]"
              >
                <Check className="w-4 h-4" />
                Gunakan Foto
              </NeuButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
