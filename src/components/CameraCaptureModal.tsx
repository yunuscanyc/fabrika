import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  X, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  SwitchCamera, 
  ClipboardPaste, 
  Crop, 
  RotateCw, 
  Maximize2 
} from 'lucide-react';
import { extractImagesFromClipboard, readImagesFromClipboardApi } from '../utils/clipboardUtils';

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
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [loading, setLoading] = useState(false);

  // Kırpma Alanı (Yüzdelik Koordinatlar: 0 - 100)
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 100,
    h: 100
  });

  const dragRef = useRef<{
    type: 'tl' | 'br' | 'tr' | 'bl' | 'move';
    startX: number;
    startY: number;
    startCrop: { x: number; y: number; w: number; h: number };
    containerW: number;
    containerH: number;
  } | null>(null);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCrop({ x: 0, y: 0, w: 100, h: 100 });
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

  // Pano (Clipboard / Ekran Görüntüsü / Ctrl + V) ile Doğrudan Resim Yapıştırma
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const files = extractImagesFromClipboard(e);
      if (files.length > 0) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedImage(reader.result as string);
          setCrop({ x: 0, y: 0, w: 100, h: 100 });
        };
        reader.readAsDataURL(files[0]);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

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

    // Max 1920px olarak sıkıştır ve JPEG olarak al
    let maxDim = 1920;
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
      const dataUrl = resizeCanvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
    } else {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
    }
    setCrop({ x: 0, y: 0, w: 100, h: 100 });
  };

  // 90° Saat Yönünde Döndürme
  const handleRotate90 = () => {
    if (!capturedImage) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        const rotatedData = canvas.toDataURL('image/jpeg', 0.88);
        setCapturedImage(rotatedData);
        setCrop({ x: 0, y: 0, w: 100, h: 100 });
      }
    };
    img.src = capturedImage;
  };

  // Kırpma Alanını Sıfırla (Tüm Fotoğraf)
  const handleResetCrop = () => {
    setCrop({ x: 0, y: 0, w: 100, h: 100 });
  };

  // Köşeleri ve Kırpma Alanını Sürükleme Başlatıcı
  const startDrag = (
    e: React.PointerEvent,
    type: 'tl' | 'br' | 'tr' | 'bl' | 'move'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();

    dragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
      containerW: rect.width,
      containerH: rect.height,
    };

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!dragRef.current) return;
      const { type: dType, startX, startY, startCrop, containerW, containerH } = dragRef.current;
      if (containerW <= 0 || containerH <= 0) return;

      const deltaX = ((moveEv.clientX - startX) / containerW) * 100;
      const deltaY = ((moveEv.clientY - startY) / containerH) * 100;
      const minSize = 6; // Minimum %6 alan

      setCrop(prev => {
        let next = { ...prev };
        if (dType === 'tl') {
          // Sol üst köşe
          const maxX = startCrop.x + startCrop.w - minSize;
          const maxY = startCrop.y + startCrop.h - minSize;
          const newX = Math.max(0, Math.min(maxX, startCrop.x + deltaX));
          const newY = Math.max(0, Math.min(maxY, startCrop.y + deltaY));
          next.x = Math.round(newX * 10) / 10;
          next.y = Math.round(newY * 10) / 10;
          next.w = Math.round(((startCrop.x + startCrop.w) - newX) * 10) / 10;
          next.h = Math.round(((startCrop.y + startCrop.h) - newY) * 10) / 10;
        } else if (dType === 'br') {
          // Sağ alt köşe
          const minRight = startCrop.x + minSize;
          const minBottom = startCrop.y + minSize;
          const newRight = Math.max(minRight, Math.min(100, startCrop.x + startCrop.w + deltaX));
          const newBottom = Math.max(minBottom, Math.min(100, startCrop.y + startCrop.h + deltaY));
          next.w = Math.round((newRight - startCrop.x) * 10) / 10;
          next.h = Math.round((newBottom - startCrop.y) * 10) / 10;
        } else if (dType === 'tr') {
          // Sağ üst köşe
          const minRight = startCrop.x + minSize;
          const maxY = startCrop.y + startCrop.h - minSize;
          const newRight = Math.max(minRight, Math.min(100, startCrop.x + startCrop.w + deltaX));
          const newY = Math.max(0, Math.min(maxY, startCrop.y + deltaY));
          next.w = Math.round((newRight - startCrop.x) * 10) / 10;
          next.y = Math.round(newY * 10) / 10;
          next.h = Math.round(((startCrop.y + startCrop.h) - newY) * 10) / 10;
        } else if (dType === 'bl') {
          // Sol alt köşe
          const maxX = startCrop.x + startCrop.w - minSize;
          const minBottom = startCrop.y + minSize;
          const newX = Math.max(0, Math.min(maxX, startCrop.x + deltaX));
          const newBottom = Math.max(minBottom, Math.min(100, startCrop.y + startCrop.h + deltaY));
          next.x = Math.round(newX * 10) / 10;
          next.w = Math.round(((startCrop.x + startCrop.w) - newX) * 10) / 10;
          next.h = Math.round((newBottom - startCrop.y) * 10) / 10;
        } else if (dType === 'move') {
          // Kutunun tamamını taşıma
          const maxX = 100 - startCrop.w;
          const maxY = 100 - startCrop.h;
          next.x = Math.round(Math.max(0, Math.min(maxX, startCrop.x + deltaX)) * 10) / 10;
          next.y = Math.round(Math.max(0, Math.min(maxY, startCrop.y + deltaY)) * 10) / 10;
        }
        return next;
      });
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Fotoğrafı Kırp ve Onayla
  const handleConfirmPhoto = () => {
    if (!capturedImage) return;
    const timeStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const fileName = `kamera_foto_${timeStr}.jpg`;

    // Kırpma tam boyuta çok yakınsa doğrudan mevcut resmi kullan
    const isFullImage = crop.x <= 1 && crop.y <= 1 && crop.w >= 98 && crop.h >= 98;
    if (isFullImage) {
      onCapture(capturedImage, fileName);
      onClose();
      return;
    }

    // Seçili alanı canvas ile kırp
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;

      const sx = Math.max(0, Math.round((crop.x / 100) * naturalW));
      const sy = Math.max(0, Math.round((crop.y / 100) * naturalH));
      const sw = Math.min(naturalW - sx, Math.round((crop.w / 100) * naturalW));
      const sh = Math.min(naturalH - sy, Math.round((crop.h / 100) * naturalH));

      canvas.width = Math.max(1, sw);
      canvas.height = Math.max(1, sh);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        onCapture(croppedDataUrl, fileName);
        onClose();
      } else {
        onCapture(capturedImage, fileName);
        onClose();
      }
    };
    img.src = capturedImage;
  };

  if (!isOpen) return null;

  const isCropped = crop.x > 1 || crop.y > 1 || crop.w < 98 || crop.h < 98;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-4xl h-[92vh] sm:h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col">
        {/* Modal Başlık */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Canlı Kamera ile Fotoğraf Çek</span>
                {capturedImage && (
                  <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    Kırpma Modu Aktif
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                {capturedImage 
                  ? 'Fotoğrafı kırpmak için sol üst veya sağ alt köşelerdeki turuncu butonları sürükleyin.'
                  : 'Masaüstü bilgisayar, tablet veya mobil kameranızdan net fotoğraf çekin.'}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Kapat (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal İçeriği (Video / Önizleme ve Kırpma Alanı) */}
        <div className="p-2 sm:p-3 flex-1 flex flex-col items-center justify-center bg-slate-950/70 overflow-hidden relative select-none">
          {errorMsg ? (
            <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center space-y-3 max-w-md">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-xs text-rose-200 leading-relaxed font-semibold">{errorMsg}</p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Tekrar Dene
                </button>
                <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition cursor-pointer">
                  Dosyadan Seç
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCapturedImage(reader.result as string);
                          setCrop({ x: 0, y: 0, w: 100, h: 100 });
                          setErrorMsg(null);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : capturedImage ? (
            /* Çekilen Fotoğraf & İnteraktif Kırpma Alanı */
            <div className="w-full h-full flex flex-col items-center justify-between">
              {/* Üst Kırpma Kontrol Çubuğu */}
              <div className="w-full max-w-2xl px-2 py-1.5 mb-1.5 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs shrink-0 shadow-lg">
                <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-semibold truncate">
                  <Crop className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Sol üst ve sağ alt köşelerden kırpılacak alanı seçin</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleRotate90}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                    title="Fotoğrafı 90° Saat Yönünde Döndür"
                  >
                    <RotateCw className="w-3 h-3 text-cyan-400" />
                    <span>90° Döndür</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetCrop}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                    title="Tüm fotoğrafı seç"
                  >
                    <Maximize2 className="w-3 h-3 text-amber-400" />
                    <span>Tamamı</span>
                  </button>
                </div>
              </div>

              {/* Fotoğraf ve Kırpma Kutusu Konteynırı */}
              <div className="flex-1 w-full flex items-center justify-center overflow-hidden p-1">
                <div 
                  ref={imageContainerRef}
                  className="relative inline-block max-w-full max-h-[66vh] overflow-hidden rounded-xl border border-slate-800 bg-black shadow-2xl select-none"
                  style={{ touchAction: 'none' }}
                >
                  <img
                    src={capturedImage}
                    alt="Çekilen Fotoğraf"
                    className="max-w-full max-h-[66vh] w-auto h-auto object-contain block mx-auto select-none pointer-events-none"
                    draggable={false}
                  />

                  {/* Kırpma Alanı Dikdörtgeni */}
                  <div
                    style={{
                      left: `${crop.x}%`,
                      top: `${crop.y}%`,
                      width: `${crop.w}%`,
                      height: `${crop.h}%`,
                    }}
                    onPointerDown={(e) => startDrag(e, 'move')}
                    className="absolute border-2 border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] cursor-move z-10"
                  >
                    {/* 3x3 Kılavuz Çizgileri */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-35 divide-x divide-y divide-white/70" />

                    {/* SOL ÜST KÖŞE TUTAMACI (Top-Left) */}
                    <div
                      onPointerDown={(e) => startDrag(e, 'tl')}
                      className="absolute -top-3.5 -left-3.5 w-7 h-7 sm:w-8 sm:h-8 bg-amber-500 hover:bg-amber-400 border-2 border-white rounded-full shadow-2xl flex items-center justify-center cursor-nwse-resize z-30 touch-none active:scale-125 transition-transform group"
                      title="Sol Üst Köşeyi Uzat / Kısalt"
                    >
                      <div className="w-2.5 h-2.5 bg-slate-950 rounded-full" />
                      <div className="absolute -top-6 left-0 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap hidden sm:block">
                        ↖ Sol Üst
                      </div>
                    </div>

                    {/* SAĞ ALT KÖŞE TUTAMACI (Bottom-Right) */}
                    <div
                      onPointerDown={(e) => startDrag(e, 'br')}
                      className="absolute -bottom-3.5 -right-3.5 w-7 h-7 sm:w-8 sm:h-8 bg-amber-500 hover:bg-amber-400 border-2 border-white rounded-full shadow-2xl flex items-center justify-center cursor-nwse-resize z-30 touch-none active:scale-125 transition-transform group"
                      title="Sağ Alt Köşeyi Uzat / Kısalt"
                    >
                      <div className="w-2.5 h-2.5 bg-slate-950 rounded-full" />
                      <div className="absolute -bottom-6 right-0 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap hidden sm:block">
                        Sağ Alt ↘
                      </div>
                    </div>

                    {/* SAĞ ÜST KÖŞE TUTAMACI (Top-Right) */}
                    <div
                      onPointerDown={(e) => startDrag(e, 'tr')}
                      className="absolute -top-2.5 -right-2.5 w-5 h-5 sm:w-6 sm:h-6 bg-amber-400 hover:bg-amber-300 border-2 border-white rounded-full shadow-lg flex items-center justify-center cursor-nesw-resize z-25 touch-none active:scale-115 transition-transform"
                      title="Sağ Üst Köşe"
                    >
                      <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                    </div>

                    {/* SOL ALT KÖŞE TUTAMACI (Bottom-Left) */}
                    <div
                      onPointerDown={(e) => startDrag(e, 'bl')}
                      className="absolute -bottom-2.5 -left-2.5 w-5 h-5 sm:w-6 sm:h-6 bg-amber-400 hover:bg-amber-300 border-2 border-white rounded-full shadow-lg flex items-center justify-center cursor-nesw-resize z-25 touch-none active:scale-115 transition-transform"
                      title="Sol Alt Köşe"
                    >
                      <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                    </div>

                    {/* Kırpma Boyut Bilgisi Rozeti */}
                    <div className="absolute bottom-1 left-1 bg-black/80 text-amber-300 text-[10px] font-mono px-1.5 py-0.5 rounded pointer-events-none">
                      {Math.round(crop.w)}% × {Math.round(crop.h)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Canlı Video Akışı - Genişletilmiş Görünüm */
            <div className="relative w-full h-full flex items-center justify-center rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full max-h-[72vh] object-contain rounded-xl"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Arka / Ön Kamera Değiştirme Butonu */}
              <button
                type="button"
                onClick={handleToggleCamera}
                className="absolute top-3 right-3 p-2.5 bg-slate-900/85 hover:bg-slate-900 text-white rounded-xl border border-slate-700/60 shadow-xl backdrop-blur-xs transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Kamerayı Değiştir (Ön / Arka)"
              >
                <SwitchCamera className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Kamera Değiştir</span>
              </button>
            </div>
          )}
        </div>

        {/* Alt Aksiyon Butonları */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2.5 shrink-0 flex-wrap">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setCapturedImage(null);
                  startCamera(facingMode);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Yeniden Çek</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmPhoto}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{isCropped ? 'Kırp & Bu Fotoğrafı Kullan' : 'Bu Fotoğrafı Kullan'}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                >
                  İptal
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const files = await readImagesFromClipboardApi();
                      if (files.length > 0) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCapturedImage(reader.result as string);
                          setCrop({ x: 0, y: 0, w: 100, h: 100 });
                        };
                        reader.readAsDataURL(files[0]);
                      } else {
                        alert('Panoda yapıştırılacak resim veya ekran görüntüsü bulunamadı. Lütfen önce resmi kopyalayın.');
                      }
                    } catch (err: any) {
                      alert(err.message || 'Panodan resim okunamadı. Doğrudan Ctrl + V tuşlarına basarak yapıştırabilirsiniz.');
                    }
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                  title="Panodaki ekran görüntüsü veya resmi yapıştır (Ctrl+V)"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Panodan Yapıştır (Ctrl+V)</span>
                  <span className="sm:hidden">Panodan</span>
                </button>
              </div>

              {!errorMsg && (
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  disabled={loading}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <Camera className="w-5 h-5" />
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
