import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, SwitchCamera } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string, fileName: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [loading, setLoading] = useState(false);

  // Kamerayı Başlat
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setErrorMsg(null);
    setLoading(true);

    // Varsa eski akışı durdur
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Cihazınızda / tarayıcınızda canlı kamera erişimi desteklenmiyor.');
      }

      let newStream: MediaStream;
      try {
        // Önce istenen yönü (arka/ön kamera) dene
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch (err1) {
        // Yön belirtimi başarısız olursa varsayılan herhangi bir kamerayı dene
        newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error('Kamera başlatma hatası:', err);
      setErrorMsg(err.message || 'Kamera açılamadı. Lütfen kamera izinlerinizi kontrol ediniz.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera(facingMode);
    } else {
      // Modal kapandığında kamerayı kapat
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  // Ön / Arka Kamera Değiştir
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Fotoğraf Çek
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

    // Fotoğrafı kanvasa çiz
    ctx.drawImage(video, 0, 0, width, height);

    // Max 1600px olarak sıkıştır ve JPEG olarak al
    let maxDim = 1600;
    let targetW = width;
    let targetH = height;

    if (targetW > maxDim || targetH > maxDim) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
    }

    const resizeCanvas = document.createElement('canvas');
    resizeCanvas.width = targetW;
    resizeCanvas.height = targetH;
    const resizeCtx = resizeCanvas.getContext('2d');
    if (resizeCtx) {
      resizeCtx.drawImage(canvas, 0, 0, targetW, targetH);
      const dataUrl = resizeCanvas.toDataURL('image/jpeg', 0.82);
      setCapturedImage(dataUrl);
    } else {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      setCapturedImage(dataUrl);
    }
  };

  // Fotoğrafı Onayla ve Gönder
  const handleConfirmPhoto = () => {
    if (!capturedImage) return;
    const timeStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const fileName = `kamera_foto_${timeStr}.jpg`;
    onCapture(capturedImage, fileName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Modal Başlık */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Canlı Kamera ile Fotoğraf Çek</h3>
              <p className="text-[11px] text-slate-400">Masaüstü bilgisayar veya mobil kamera çekimi</p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal İçeriği (Video / Önizleme) */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col items-center justify-center bg-slate-950/60 overflow-hidden min-h-[300px]">
          {errorMsg ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center space-y-3 max-w-md">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-xs text-rose-200 leading-relaxed">{errorMsg}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition"
              >
                Tekrar Dene
              </button>
            </div>
          ) : capturedImage ? (
            /* Çekilen Fotoğraf Önizleme */
            <div className="relative w-full h-full max-h-[60vh] flex items-center justify-center rounded-xl overflow-hidden bg-black border border-slate-800">
              <img
                src={capturedImage}
                alt="Çekilen Fotoğraf"
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>
          ) : (
            /* Canlı Video Akışı */
            <div className="relative w-full h-full max-h-[60vh] flex items-center justify-center rounded-xl overflow-hidden bg-black border border-slate-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[60vh] object-contain rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Arka / Ön Kamera Değiştirme Butonu */}
              <button
                type="button"
                onClick={handleToggleCamera}
                className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl border border-slate-700/60 shadow-lg backdrop-blur-xs transition cursor-pointer flex items-center gap-1 text-xs"
                title="Kamera Değiştir"
              >
                <SwitchCamera className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Kamera Değiştir</span>
              </button>
            </div>
          )}
        </div>

        {/* Alt Butonlar */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={() => setCapturedImage(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Yeniden Çek</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmPhoto}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Bu Fotoğrafı Kullan</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
              >
                İptal
              </button>

              {!errorMsg && (
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  disabled={loading}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>📸 Fotoğraf Çek</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
