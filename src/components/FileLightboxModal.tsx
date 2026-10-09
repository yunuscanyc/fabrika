import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  ExternalLink, 
  FileText, 
  FileSpreadsheet, 
  FileArchive, 
  File as FileIcon, 
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { guvenliDosyaIndir } from '../utils/downloadUtils';

interface FileLightboxModalProps {
  dosya?: any;
  dosyaListesi?: any[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
}

export const FileLightboxModal: React.FC<FileLightboxModalProps> = ({ 
  dosya, 
  dosyaListesi, 
  initialIndex = 0, 
  title, 
  onClose 
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Pinch-to-zoom refs
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);

  const currentFile = dosyaListesi && dosyaListesi.length > 0 
    ? dosyaListesi[currentIndex] 
    : dosya;

  useEffect(() => {
    setCurrentIndex(initialIndex || 0);
  }, [initialIndex, dosyaListesi]);

  useEffect(() => {
    setZoomLevel(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  }, [currentFile, currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && dosyaListesi && dosyaListesi.length > 1) {
        setCurrentIndex(prev => (prev - 1 + dosyaListesi.length) % dosyaListesi.length);
      } else if (e.key === 'ArrowRight' && dosyaListesi && dosyaListesi.length > 1) {
        setCurrentIndex(prev => (prev + 1) % dosyaListesi.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, dosyaListesi]);

  if (!currentFile) return null;

  const fileName = currentFile.DosyaAdi || currentFile.ad || currentFile.name || 'dosya';
  const fileContent = currentFile.DosyaIcerigi || currentFile.base64 || currentFile.url || currentFile.icerik || '';
  const fileSize = currentFile.DosyaBoyutu || currentFile.boyut || '';

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isImage = 
    (fileContent && fileContent.startsWith('data:image/')) ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  const isPdf = 
    (fileContent && fileContent.startsWith('data:application/pdf')) ||
    ext === 'pdf';
  const isExcel = ['xls', 'xlsx', 'csv'].includes(ext);
  const isWord = ['doc', 'docx'].includes(ext);
  const isArchive = ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(Number((prev + 0.15).toFixed(2)), 4.0));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(Number((prev - 0.15).toFixed(2)), 0.5));
  const handleZoomReset = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setRotation(0);
  };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  // Mouse Drag / Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch Drag & Pinch-to-Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistanceRef.current = dist;
      initialZoomRef.current = zoomLevel;
    } else if (e.touches.length === 1) {
      initialPinchDistanceRef.current = null;
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX - panPosition.x, y: e.touches[0].clientY - panPosition.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = dist / initialPinchDistanceRef.current;
      const newZoom = Math.min(Math.max(Number((initialZoomRef.current * scaleFactor).toFixed(2)), 0.5), 4.0);
      setZoomLevel(newZoom);
    } else if (e.touches.length === 1 && isDragging) {
      setPanPosition({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    initialPinchDistanceRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(Number((prev + 0.15).toFixed(2)), 4.0));
    } else {
      setZoomLevel(prev => Math.max(Number((prev - 0.15).toFixed(2)), 0.5));
    }
  };

  const handleImageDoubleClick = () => {
    if (zoomLevel > 1.1) {
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    } else {
      setZoomLevel(2);
    }
  };

  const handleOpenInNewTab = () => {
    if (!fileContent) return;
    try {
      if (fileContent.startsWith('http://') || fileContent.startsWith('https://')) {
        window.open(fileContent, '_blank', 'noopener,noreferrer');
        return;
      }
      if (fileContent.startsWith('data:')) {
        const parts = fileContent.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        let mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        if (!mimeMatch || mimeType === 'application/octet-stream') {
          if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg';
          else if (ext === 'png') mimeType = 'image/png';
          else if (ext === 'webp') mimeType = 'image/webp';
          else if (ext === 'pdf') mimeType = 'application/pdf';
        }
        const byteChars = atob(parts[1]);
        const byteNums = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNums[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNums);
        const blob = new Blob([byteArray], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        const newWin = window.open(blobUrl, '_blank');
        if (!newWin) {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        return;
      }
    } catch (err) {
      console.warn('Blob URL error:', err);
    }

    try {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>${fileName}</title>
              <style>body { margin: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; }</style>
            </head>
            <body>
              <img src="${fileContent}" style="max-width:100%; height:auto;" />
            </body>
          </html>
        `);
        win.document.close();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl w-full h-[92vh] bg-slate-900 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
      >
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 bg-slate-950/90 border-b border-slate-800 text-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 max-w-[45%] sm:max-w-[40%]">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isPdf ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              isExcel ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              isWord ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
              isArchive ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
              'bg-sky-500/20 text-sky-400 border border-sky-500/30'
            }`}>
              {isPdf ? <FileText className="w-4 h-4" /> :
               isExcel ? <FileSpreadsheet className="w-4 h-4" /> :
               isWord ? <FileText className="w-4 h-4" /> :
               isArchive ? <FileArchive className="w-4 h-4" /> :
               <ImageIcon className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate" title={title || fileName}>
                {title ? `${title} — ${fileName}` : fileName}
              </h4>
              <p className="text-[10px] text-slate-400 truncate">
                {fileSize ? `${fileSize} • ` : ''}
                {dosyaListesi && dosyaListesi.length > 1 ? `(${currentIndex + 1} / ${dosyaListesi.length}) • ` : ''}
                {ext.toUpperCase()} Dosyası
              </p>
            </div>
          </div>

          {/* Controls: Zoom / Rotate / Download / New Tab / Close */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isImage && (
              <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700 text-slate-200 shadow-sm">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Uzaklaştır (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="px-2 py-1 hover:bg-slate-700 hover:text-white rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer"
                  title="Sıfırla (%100)"
                >
                  %{Math.round(zoomLevel * 100)}
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Yakınlaştır (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-slate-700 mx-1" />
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="90° Döndür"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {fileContent && (
              <button
                type="button"
                onClick={() => guvenliDosyaIndir(fileContent, fileName)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer"
                title="İndir"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">İndir</span>
              </button>
            )}

            {fileContent && (
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Yeni Sekmede Aç"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Yeni Sekmede Aç</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl border border-rose-500/30 hover:border-rose-600 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shadow-sm"
              title="Kapat (ESC)"
            >
              <X className="w-4 h-4" />
              <span className="hidden md:inline">Kapat (ESC)</span>
            </button>
          </div>
        </div>

        {/* Content Scene */}
        <div 
          className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-hidden flex items-center justify-center relative select-none cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onMouseDown={isImage ? handleMouseDown : undefined}
          onMouseMove={isImage ? handleMouseMove : undefined}
          onMouseUp={isImage ? handleMouseUp : undefined}
          onMouseLeave={isImage ? handleMouseUp : undefined}
          onTouchStart={isImage ? handleTouchStart : undefined}
          onTouchMove={isImage ? handleTouchMove : undefined}
          onTouchEnd={isImage ? handleTouchEnd : undefined}
          onWheel={isImage ? handleWheel : undefined}
        >
          {isImage && fileContent ? (
            <div 
              className="flex items-center justify-center"
              style={{
                transform: `translate3d(${panPosition.x}px, ${panPosition.y}px, 0)`,
                transition: isDragging ? 'none' : 'transform 0.08s ease-out'
              }}
            >
              <img
                src={fileContent}
                alt={fileName}
                draggable={false}
                onDoubleClick={handleImageDoubleClick}
                referrerPolicy="no-referrer"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                  maxHeight: '75vh',
                  maxWidth: '90vw',
                  objectFit: 'contain'
                }}
                className="rounded-lg shadow-2xl pointer-events-auto select-none"
              />
            </div>
          ) : isPdf && fileContent ? (
            <div className="w-full h-full flex flex-col rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
              <iframe
                src={fileContent}
                title={fileName}
                className="w-full h-full border-0 rounded-xl bg-white"
              />
            </div>
          ) : (
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-4 shadow-xl">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                {isExcel ? <FileSpreadsheet className="w-10 h-10 text-emerald-400" /> :
                 isWord ? <FileText className="w-10 h-10 text-blue-400" /> :
                 isArchive ? <FileArchive className="w-10 h-10 text-purple-400" /> :
                 <FileIcon className="w-10 h-10 text-slate-300" />}
              </div>
              <div>
                <h3 className="font-bold text-white text-base break-all">{fileName}</h3>
                <p className="text-xs text-slate-400 mt-1">{fileSize || 'Belge Dosyası'} • {ext.toUpperCase()}</p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                {fileContent && (
                  <button
                    type="button"
                    onClick={() => guvenliDosyaIndir(fileContent, fileName)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Dosyayı İndir</span>
                  </button>
                )}
                {fileContent && (
                  <button
                    type="button"
                    onClick={handleOpenInNewTab}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 border border-slate-700 cursor-pointer shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Yeni Sekmede Aç</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Gallery Prev / Next Buttons */}
          {dosyaListesi && dosyaListesi.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentIndex(prev => (prev - 1 + dosyaListesi.length) % dosyaListesi.length)}
                className="absolute left-3 p-3 rounded-full bg-slate-900/80 hover:bg-amber-600 text-white transition shadow-xl border border-slate-700 cursor-pointer"
                title="Önceki Fotoğraf"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex(prev => (prev + 1) % dosyaListesi.length)}
                className="absolute right-3 p-3 rounded-full bg-slate-900/80 hover:bg-amber-600 text-white transition shadow-xl border border-slate-700 cursor-pointer"
                title="Sonraki Fotoğraf"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Footer Tip Bar */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-300">İpucu:</span>
            <span>Görseli parmakla sürükleyerek kaydırabilir, iki parmakla sıkıştırarak (Pinch-to-zoom) yakınlaştırabilir veya çift tıklayabilirsiniz.</span>
          </span>
          {isImage && (
            <div className="flex items-center gap-2 text-slate-400">
              <span>
                Boyut: %{Math.round(zoomLevel * 100)} {rotation > 0 ? `• Döndürme: ${rotation}°` : ''}
              </span>
              {(zoomLevel !== 1 || panPosition.x !== 0 || panPosition.y !== 0) && (
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="text-amber-400 hover:text-amber-300 underline font-semibold text-[10px] cursor-pointer"
                >
                  Sıfırla
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
