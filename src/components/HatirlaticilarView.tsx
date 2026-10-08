import React, { useState, useEffect, useRef } from 'react';
import { Hatirlatici, AjandaBildirimi } from '../types';
import { formatTarihTR } from '../utils/dateUtils';
import { guvenliDosyaIndir } from '../utils/downloadUtils';
import { 
  Bell, 
  Plus, 
  Camera,
  CheckCircle2, 
  Circle, 
  Calendar, 
  Trash2, 
  Clock,
  Check,
  X,
  Image as ImageIcon,
  Paperclip,
  Upload,
  Download,
  Eye,
  FileText,
  AlertTriangle,
  FileCheck,
  Loader2,
  Sparkles,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  ExternalLink,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  File as FileIcon,
  Maximize2,
  Move
} from 'lucide-react';

interface HatirlaticilarViewProps {
  hatirlaticilar: Hatirlatici[];
  personeller?: any[];
  onAddHatirlatici: (h: Partial<Hatirlatici>) => Promise<any> | void;
  onToggleTamamlandi: (id: number, tamamlandi: boolean) => void;
  onUpdateHatirlatici?: (id: number, fields: Partial<Hatirlatici>) => Promise<any> | void;
  onDeleteHatirlatici: (id: number) => Promise<any> | void;
  unreadNotifHatirlaticiIds?: number[];
  ajandaBildirimler?: AjandaBildirimi[];
  currentUserName?: string;
  userRole?: 'admin' | 'ustabasi';
  onHatirlaticiInspected?: (id: number) => void;
  onMarkNotificationRead?: (notificationId?: number, hatirlaticiId?: number) => void;
  targetOpenHatirlaticiId?: number | null;
  onClearTargetOpenHatirlaticiId?: () => void;
  onMarkAllNotificationsRead?: () => void;
}

// Dosya/Görsel içeriğini (base64, data-uri, hex, url) her türlü formattan render edilebilir data-uri formatına çevirir
export const getBelgeDosyaIcerigi = (file: any): string => {
  if (!file) return '';
  const raw = 
    file.DosyaIcerigi || 
    file.DosyaVerisi || 
    file.base64 || 
    file.Base64 || 
    file.content || 
    file.Content || 
    file.fileData || 
    file.fileContent || 
    file.preview || 
    file.url || 
    file.Url || 
    file.DosyaYolu || 
    '';
  if (!raw) return '';
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }
  // PostgreSQL bytea hex string formatı: \x...
  if (trimmed.startsWith('\\x')) {
    try {
      const hex = trimmed.slice(2);
      const binary = hex.match(/.{1,2}/g)?.map(byte => String.fromCharCode(parseInt(byte, 16))).join('') || '';
      const b64 = btoa(binary);
      if (hex.startsWith('89504e47')) return `data:image/png;base64,${b64}`;
      if (hex.startsWith('ffd8ff')) return `data:image/jpeg;base64,${b64}`;
      if (hex.startsWith('474946')) return `data:image/gif;base64,${b64}`;
      if (hex.startsWith('52494646')) return `data:image/webp;base64,${b64}`;
      if (hex.startsWith('25504446')) return `data:application/pdf;base64,${b64}`;
      return `data:image/jpeg;base64,${b64}`;
    } catch {
      return '';
    }
  }
  // Ön eki eksik base64 dizesi
  const clean = trimmed.replace(/\s/g, '');
  if (clean.length > 10) {
    if (clean.startsWith('/9j/')) return `data:image/jpeg;base64,${clean}`;
    if (clean.startsWith('iVBOR')) return `data:image/png;base64,${clean}`;
    if (clean.startsWith('R0lGOD')) return `data:image/gif;base64,${clean}`;
    if (clean.startsWith('UklGR')) return `data:image/webp;base64,${clean}`;
    if (clean.startsWith('JVBER')) return `data:application/pdf;base64,${clean}`;
    if (/^[A-Za-z0-9+/=]+$/.test(clean)) {
      return `data:image/jpeg;base64,${clean}`;
    }
  }
  return '';
};

// Dosya uzantısı ve türü tespiti
export const getFileInfo = (file: any) => {
  const name = String(file?.DosyaAdi || file?.name || '').trim();
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const content = getBelgeDosyaIcerigi(file);
  
  const isPdf = ext === 'pdf' || content.startsWith('data:application/pdf') || content.startsWith('data:application/x-pdf');
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext) || content.startsWith('data:image/');
  const isExcel = ['xls', 'xlsx', 'csv'].includes(ext) || content.includes('spreadsheet') || content.includes('excel');
  const isWord = ['doc', 'docx'].includes(ext) || content.includes('word') || content.includes('officedocument.word');
  const isArchive = ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
  const isText = ['txt', 'log', 'json', 'xml'].includes(ext) || content.startsWith('data:text/');
  
  return {
    name: name || 'isimsiz_dosya',
    ext: ext.toUpperCase() || (isPdf ? 'PDF' : isImage ? 'GÖRSEL' : 'DOSYA'),
    content,
    isPdf,
    isImage,
    isExcel,
    isWord,
    isArchive,
    isText,
    isDocument: !isImage
  };
};

export const HatirlaticilarView: React.FC<HatirlaticilarViewProps> = ({
  hatirlaticilar,
  onAddHatirlatici,
  onToggleTamamlandi,
  onUpdateHatirlatici,
  onDeleteHatirlatici,
  unreadNotifHatirlaticiIds = [],
  ajandaBildirimler = [],
  currentUserName = '',
  userRole = 'admin',
  onHatirlaticiInspected,
  onMarkNotificationRead,
  targetOpenHatirlaticiId,
  onClearTargetOpenHatirlaticiId,
  onMarkAllNotificationsRead
}) => {
  const [modalAcik, setModalAcik] = useState(false);
  const [secilenHatirlatici, setSecilenHatirlatici] = useState<Hatirlatici | null>(null);
  const [silinecekHatirlatici, setSilinecekHatirlatici] = useState<Hatirlatici | null>(null);
  const [siliniyor, setSiliniyor] = useState(false);
  const [filtre, setFiltre] = useState<'hepsi' | 'bugun' | 'tamamlanmayan' | 'tamamlanan'>('tamamlanmayan');
  const [aramaMetni, setAramaMetni] = useState('');
  const [doubleClickHintId, setDoubleClickHintId] = useState<number | null>(null);
  const clickTrackerRef = useRef<{ id: number; time: number } | null>(null);
  const lastToggleRef = useRef<{ id: number; time: number } | null>(null);

  // Hatırlatıcılar ekranı açıldığında okunmamış bildirimleri otomatik temizle
  useEffect(() => {
    if (onMarkAllNotificationsRead) {
      onMarkAllNotificationsRead();
    }
  }, [onMarkAllNotificationsRead]);

  // Dışarıdan veya bildirim çubuğundan belirli bir hatırlatıcı açılması istendiğinde
  useEffect(() => {
    if (targetOpenHatirlaticiId) {
      const target = hatirlaticilar.find(h => Number(h.Id) === Number(targetOpenHatirlaticiId));
      if (target) {
        setSecilenHatirlatici(target);
        if (onHatirlaticiInspected) {
          onHatirlaticiInspected(target.Id);
        }
      }
      if (onClearTargetOpenHatirlaticiId) {
        onClearTargetOpenHatirlaticiId();
      }
    }
  }, [targetOpenHatirlaticiId, hatirlaticilar]);

  const handleOpenCard = (h: Hatirlatici) => {
    setSecilenHatirlatici(h);
    if (onHatirlaticiInspected) {
      onHatirlaticiInspected(h.Id);
    }
  };

  const executeToggle = (h: Hatirlatici) => {
    if (!onToggleTamamlandi) return;
    const now = Date.now();
    // 700ms debounce koruması
    if (lastToggleRef.current && lastToggleRef.current.id === h.Id && now - lastToggleRef.current.time < 700) {
      return;
    }
    lastToggleRef.current = { id: h.Id, time: now };
    clickTrackerRef.current = null;
    setDoubleClickHintId(null);
    onToggleTamamlandi(h.Id, !h.TamamlandiMi);
  };

  const handleCircleClick = (e: React.MouseEvent, h: Hatirlatici) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onToggleTamamlandi) return;

    const now = Date.now();

    // 1. Tarayıcı yerel çift tıklama
    if (e.detail === 2) {
      executeToggle(h);
      return;
    }

    // 2. Çift tıklama / çift dokunma zamanlama aralığı (100ms - 500ms)
    const prev = clickTrackerRef.current;
    if (prev && prev.id === h.Id && now - prev.time >= 100 && now - prev.time <= 500) {
      executeToggle(h);
      return;
    }

    // 3. Tek tıklama -> ASLA TAMAMLAMA! Sadece uyarı gösterilir
    clickTrackerRef.current = { id: h.Id, time: now };
    setDoubleClickHintId(h.Id);
    setTimeout(() => {
      setDoubleClickHintId(prevId => (prevId === h.Id ? null : prevId));
    }, 2200);
  };

  const handleCircleDoubleClick = (e: React.MouseEvent, h: Hatirlatici) => {
    e.stopPropagation();
    e.preventDefault();
    executeToggle(h);
  };
  
  // Yeni Ekleme Formu için Ekler (Belgeler)
  const [yeniBelgeler, setYeniBelgeler] = useState<any[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kayitHatasi, setKayitHatasi] = useState<string | null>(null);
  
  // Detay/Güncelleme Formu için State'ler
  const [editBaslik, setEditBaslik] = useState('');
  const [editAciklama, setEditAciklama] = useState('');
  const [editTarih, setEditTarih] = useState('');
  const [editKategori, setEditKategori] = useState<any>('Gorev');
  const [editOnem, setEditOnem] = useState<any>('Normal');
  const [editBelgeler, setEditBelgeler] = useState<any[]>([]);
  const [editUstabasiGorsun, setEditUstabasiGorsun] = useState(false);
  const [guncelleniyor, setGuncelleniyor] = useState(false);
  const [guncellemeHatasi, setGuncellemeHatasi] = useState<string | null>(null);

  // Fotoğraf & Belge Lightbox/Önizleme State & Zoom & Pan
  const [lightboxDosya, setLightboxDosya] = useState<any | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // ESC Tuşu ile Kapatma ve Body Scroll Kilidi
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxDosya(null);
      }
    };
    if (lightboxDosya) {
      window.addEventListener('keydown', handleKeyDown);
      setZoomLevel(1);
      setRotation(0);
      setPanPosition({ x: 0, y: 0 });
      setIsDragging(false);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxDosya]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(Number((prev + 0.25).toFixed(2)), 4.0));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(Number((prev - 0.25).toFixed(2)), 0.5));
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Mouse ile Sürükleme (Pan) Olayları
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Sadece sol tık
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panPosition.x,
      y: e.clientY - panPosition.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Dokunmatik Ekran (Mobil/Tablet) Sürükleme (Pan) Olayları
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.touches[0].clientX - panPosition.x,
      y: e.touches[0].clientY - panPosition.y
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPanPosition({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse Tekerleği ile Yakınlaştırma / Uzaklaştırma
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(Number((prev + 0.15).toFixed(2)), 4.0));
    } else {
      setZoomLevel(prev => Math.max(Number((prev - 0.15).toFixed(2)), 0.5));
    }
  };

  // Çift Tıklama ile 1x <-> 2x Toggle
  const handleImageDoubleClick = () => {
    if (zoomLevel > 1.1) {
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    } else {
      setZoomLevel(2);
    }
  };

  // Yeni Sekmede Güvenli ve Kesin Açma Fonksiyonu (Blob URL ile %100 Çalışır)
  const handleOpenInNewTab = (file: any) => {
    if (!file) return;
    const content = getBelgeDosyaIcerigi(file);
    if (!content) return;

    try {
      if (content.startsWith('http://') || content.startsWith('https://')) {
        window.open(content, '_blank', 'noopener,noreferrer');
        return;
      }

      if (content.startsWith('data:')) {
        const parts = content.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const ext = (file.DosyaAdi || '').split('.').pop()?.toLowerCase() || '';
        let mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        
        if (!mimeMatch || mimeType === 'application/octet-stream') {
          if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg';
          else if (ext === 'png') mimeType = 'image/png';
          else if (ext === 'webp') mimeType = 'image/webp';
          else if (ext === 'gif') mimeType = 'image/gif';
          else if (ext === 'svg') mimeType = 'image/svg+xml';
          else if (ext === 'pdf') mimeType = 'application/pdf';
        }

        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
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
      console.warn('Blob URL generation error:', err);
    }

    // Ultimate fallback for HTML viewer
    try {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${file.DosyaAdi || 'Görsel Önizleme'}</title>
              <style>
                body { margin: 0; padding: 0; background-color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; overflow: auto; }
                img { max-width: 100%; height: auto; object-fit: contain; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
              </style>
            </head>
            <body>
              <img src="${content}" alt="${file.DosyaAdi || 'Görsel'}" />
            </body>
          </html>
        `);
        win.document.close();
      }
    } catch (fallbackErr) {
      console.error('New tab open fallback error:', fallbackErr);
    }
  };

  const bugunStr = new Date().toISOString().split('T')[0];

  // Görselleri ve belgeleri yüksek netlikte (Full HD - 1600px, 0.85 kalite JPEG) ve optimize dosya boyutuyla yükleme
  const readImageOrFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        let dataUrl = (e.target?.result as string) || '';
        if (!dataUrl) {
          resolve('');
          return;
        }

        // Windows/tarayıcı MIME tipi düzeltme
        if (dataUrl.startsWith('data:application/octet-stream') || dataUrl.startsWith('data:;')) {
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          if (['jpg', 'jpeg'].includes(ext)) dataUrl = dataUrl.replace(/^data:[^;]*/, 'data:image/jpeg');
          else if (['png'].includes(ext)) dataUrl = dataUrl.replace(/^data:[^;]*/, 'data:image/png');
          else if (['webp'].includes(ext)) dataUrl = dataUrl.replace(/^data:[^;]*/, 'data:image/webp');
          else if (['gif'].includes(ext)) dataUrl = dataUrl.replace(/^data:[^;]*/, 'data:image/gif');
          else if (['svg'].includes(ext)) dataUrl = dataUrl.replace(/^data:[^;]*/, 'data:image/svg+xml');
          else if (['pdf'].includes(ext)) dataUrl = dataUrl.replace(/^data:[^;]*/, 'data:application/pdf');
        }

        const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|gif|svg)$/i.test(file.name);
        if (!isImage) {
          resolve(dataUrl);
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            const maxDim = 1600; // Full HD 1600px netlik standardı
            let w = img.width;
            let h = img.height;

            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(dataUrl);
              return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);

            // %85 kaliteli JPEG: Kristal netlikte fotoğraf, ~200KB dosya boyutu ve anında (0.2sn) yükleme
            const optimized = canvas.toDataURL('image/jpeg', 0.85);
            resolve(optimized || dataUrl);
          } catch {
            resolve(dataUrl);
          }
        };
        img.onerror = () => {
          resolve(dataUrl);
        };
        img.src = dataUrl;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // Seçilen hatırlatıcı değiştiğinde güncelleme state'lerini doldur
  useEffect(() => {
    if (secilenHatirlatici) {
      setEditBaslik(secilenHatirlatici.Baslik);
      setEditAciklama(secilenHatirlatici.Aciklama || '');
      setEditTarih(secilenHatirlatici.Tarih);
      setEditKategori(secilenHatirlatici.Kategori);
      setEditOnem(secilenHatirlatici.OnemDerecesi);
      setEditBelgeler(secilenHatirlatici.Belgeler || []);
      setEditUstabasiGorsun(Boolean(secilenHatirlatici.UstabasiGorsun));
    } else {
      setEditBelgeler([]);
      setEditUstabasiGorsun(false);
    }
  }, [secilenHatirlatici]);

  // Renk ve Durum Ayrımı (Canlı Açık Mavi standardı)
  const durumBelirle = (h: Hatirlatici) => {
    if (h.TamamlandiMi) {
      return {
        tur: 'tamamlandi',
        renk: 'bg-emerald-50/40 border-emerald-200/90 text-slate-700 hover:border-emerald-300',
        etiket: 'Tamamlandı',
        badge: 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
      };
    }
    if (h.Tarih < bugunStr) {
      return {
        tur: 'gecikti',
        renk: 'bg-red-50/70 border-red-200 text-red-900 hover:border-red-300 shadow-sm',
        etiket: 'Gecikmiş',
        badge: 'bg-red-200 text-red-800'
      };
    }
    if (h.Tarih === bugunStr) {
      return {
        tur: 'bugun',
        renk: 'bg-sky-50/95 border-sky-300 text-sky-950 shadow-sm ring-1 ring-sky-200 hover:bg-sky-100/50',
        etiket: 'Bugün',
        badge: 'bg-sky-200 text-sky-900 font-extrabold border border-sky-300'
      };
    }
    return {
      tur: 'yaklasan',
      renk: 'bg-amber-50/70 border-amber-200 text-amber-900 hover:border-amber-300 shadow-sm',
      etiket: 'Yaklaşıyor',
      badge: 'bg-amber-200 text-amber-800'
    };
  };

  const filtrelenenler = hatirlaticilar.filter((h) => {
    if (userRole === 'ustabasi') {
      const uLower = (currentUserName || 'ustabaşı').toLowerCase().trim();
      const olusturan = ((h.OlusturanKisi || (h as any).YapanKisi || (h as any).EkleyenKisi || '') as string).toLowerCase().trim();
      const isKendi = olusturan === uLower || olusturan.includes('ustabaşı') || olusturan.includes('ustabasi');
      if (!h.UstabasiGorsun && !isKendi) return false;
    }
    if (filtre === 'bugun' && (h.Tarih !== bugunStr || h.TamamlandiMi)) return false;
    if (filtre === 'tamamlanmayan' && h.TamamlandiMi) return false;
    if (filtre === 'tamamlanan' && !h.TamamlandiMi) return false;

    if (aramaMetni.trim()) {
      const q = aramaMetni.trim().toLowerCase();
      const baslikMatch = (h.Baslik || '').toLowerCase().includes(q);
      const aciklamaMatch = (h.Aciklama || '').toLowerCase().includes(q);
      const kategoriMatch = (h.Kategori || '').toLowerCase().includes(q);
      const yapanMatch = ((h as any).YapanKisi || (h as any).EkleyenKisi || h.SorumluPersonelAd || '').toLowerCase().includes(q);
      const tarihMatch = (h.Tarih || '').includes(q);
      return baslikMatch || aciklamaMatch || kategoriMatch || yapanMatch || tarihMatch;
    }

    return true;
  });

  const siralananlar = [...filtrelenenler].sort((a, b) => {
    if (a.TamamlandiMi !== b.TamamlandiMi) {
      return a.TamamlandiMi ? 1 : -1;
    }
    return a.Tarih.localeCompare(b.Tarih);
  });

  // Çoklu Dosya Yükleme (Fotoğraf, PDF, Word, Excel, vb.)
  const handleDosyaYukle = async (e: React.ChangeEvent<HTMLInputElement>, isEditMode: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFiles(true);
    if (isEditMode) {
      setGuncellemeHatasi(null);
    } else {
      setKayitHatasi(null);
    }

    try {
      const fileList = Array.from(files) as File[];
      const yuklenenler: any[] = [];

      for (const file of fileList) {
        const base64 = await readImageOrFile(file);
        if (!base64) continue;

        const boyutStr = file.size > 1024 * 1024 
          ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' 
          : (file.size / 1024).toFixed(1) + ' KB';

        const yeniBelge = {
          DosyaAdi: file.name,
          DosyaBoyutu: boyutStr,
          YuklemeTarihi: new Date().toISOString().split('T')[0],
          DosyaIcerigi: base64
        };
        yuklenenler.push(yeniBelge);
      }

      if (yuklenenler.length > 0) {
        if (isEditMode) {
          setEditBelgeler(prev => [...prev, ...yuklenenler]);
        } else {
          setYeniBelgeler(prev => [...prev, ...yuklenenler]);
        }
      }
    } catch (err: any) {
      console.error('Dosya yükleme hatası:', err);
    } finally {
      setIsProcessingFiles(false);
      e.target.value = '';
    }
  };

  const dosyaSil = (index: number, isEditMode: boolean) => {
    if (isEditMode) {
      setEditBelgeler(prev => prev.filter((_, i) => i !== index));
    } else {
      setYeniBelgeler(prev => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Üst Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            <span>Ajanda, Görev &amp; Hatırlatıcılar</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Fabrika günlük işleri, araç muayeneleri, montaj randevuları ve belge ekleri
          </p>
        </div>

        <button
          onClick={() => {
            setModalAcik(true);
            setKayitHatasi(null);
            setYeniBelgeler([]);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Görev / Not Ekle</span>
        </button>
      </div>

      {/* Arama & Filtreler */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Başlık, açıklama, kategori veya personel ara..."
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {aramaMetni && (
            <button
              onClick={() => setAramaMetni('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={() => setFiltre('tamamlanmayan')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtre === 'tamamlanmayan'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Açık Görevler ({hatirlaticilar.filter(h => !h.TamamlandiMi).length})
          </button>
          <button
            onClick={() => setFiltre('hepsi')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filtre === 'hepsi'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tümü ({hatirlaticilar.length})
          </button>
          <button
            onClick={() => setFiltre('bugun')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtre === 'bugun'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100'
            }`}
          >
            Bugün ({hatirlaticilar.filter(h => h.Tarih === bugunStr && !h.TamamlandiMi).length})
          </button>
          <button
            onClick={() => setFiltre('tamamlanan')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filtre === 'tamamlanan'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tamamlananlar ({hatirlaticilar.filter(h => h.TamamlandiMi).length})
          </button>

          {onMarkAllNotificationsRead && (
            <button
              type="button"
              onClick={onMarkAllNotificationsRead}
              className="ml-auto px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Tüm ajanda bildirim geçmişini okundu say ve sayacı sıfırla"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bildirimleri Sıfırla (0'la)</span>
            </button>
          )}
        </div>
      </div>

      {/* Silinen Hatırlatıcılar İçin Bekleyen Bildirimler */}
      {ajandaBildirimler && ajandaBildirimler.filter(b => !b.Okundu && b.IslemTuru === 'silindi' && b.YapanKisi !== currentUserName).length > 0 && (
        <div className="space-y-2">
          {ajandaBildirimler.filter(b => !b.Okundu && b.IslemTuru === 'silindi' && b.YapanKisi !== currentUserName).map(delNotif => (
            <div key={delNotif.Id} className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-900 shadow-xs animate-pulse">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
                <div>
                  <span className="font-bold">{delNotif.YapanKisi}</span> tarafından <strong className="font-extrabold">"{delNotif.Baslik}"</strong> başlıklı hatırlatma silindi.
                </div>
              </div>
              <button
                type="button"
                onClick={() => onMarkNotificationRead && onMarkNotificationRead(delNotif.Id)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-[11px] shrink-0 cursor-pointer shadow-xs transition-colors"
              >
                Gördüm / Kapat
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hatırlatıcı Kartları */}
      <div className="space-y-2.5">
        {siralananlar.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-100/80 text-slate-400">
            <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <span className="text-xs font-medium">
              {aramaMetni.trim()
                ? `"${aramaMetni}" aramasına uygun görev veya hatırlatıcı bulunamadı.`
                : 'Bu filtrede gösterilecek görev veya hatırlatıcı bulunamadı.'}
            </span>
          </div>
        ) : (
          siralananlar.map((h) => {
            const d = durumBelirle(h);
            const belgeSayisi = h.Belgeler?.length || h.FotoSayisi || 0;
            const unreadNotif = ajandaBildirimler.find(
              b => Number(b.HatirlaticiId) === Number(h.Id) && !b.Okundu && b.YapanKisi !== currentUserName
            );
            const unreadText = unreadNotif ? (unreadNotif.IslemTuru === 'eklendi' ? 'Yeni Hatırlatma' : 'Düzenlendi') : null;

            return (
              <div
                key={h.Id}
                onClick={() => handleOpenCard(h)}
                className={`p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all flex items-start justify-between gap-3 ${d.renk} ${
                  unreadText ? 'ring-2 ring-amber-500 shadow-md animate-glow' : ''
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0 relative">
                  <div className="relative shrink-0 flex flex-col items-center">
                    <button
                      type="button"
                      onClick={(e) => handleCircleClick(e, h)}
                      onDoubleClick={(e) => handleCircleDoubleClick(e, h)}
                      className="mt-0.5 text-slate-400 hover:text-blue-600 transition-all shrink-0 p-1 rounded-full hover:scale-110 active:scale-95 cursor-pointer"
                      title="Tamamlamak veya açmak için ÇİFT TIKLAYIN"
                    >
                      {h.TamamlandiMi ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 hover:scale-105" />
                      )}
                    </button>

                    {doubleClickHintId === h.Id && (
                      <div className="absolute top-8 left-0 z-30 whitespace-nowrap bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xl border border-slate-700 animate-bounce flex items-center gap-1.5 pointer-events-none">
                        <span>👆</span>
                        <span>{h.TamamlandiMi ? 'Açmak için ÇİFT TIKLAYIN' : 'Tamamlamak için ÇİFT TIKLAYIN'}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {unreadText && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black text-white shadow-xs animate-pulse ${
                          unreadNotif?.IslemTuru === 'eklendi' ? 'bg-emerald-600 border border-emerald-700' : 'bg-amber-600 border border-amber-700'
                        }`}>
                          <Sparkles className="w-3 h-3 text-white" />
                          <span>{unreadText}</span>
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.badge}`}>
                        {d.etiket}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {h.Kategori}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatTarihTR(h.Tarih)}
                      </span>
                      
                      {/* Belgeler / Dosyalar / Fotoğraflar Mevcutsa Göster */}
                      {belgeSayisi > 0 && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 shadow-2xs">
                          <Paperclip className="w-3 h-3 text-blue-600" />
                          <span>{belgeSayisi} Dosya / Görsel</span>
                        </span>
                      )}

                      {/* Ustabaşı Görsün Rozet ve Toggle (Yalnızca Yönetici Görür) */}
                      {userRole !== 'ustabasi' && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!onUpdateHatirlatici) return;
                            try {
                              await onUpdateHatirlatici(h.Id, {
                                UstabasiGorsun: !h.UstabasiGorsun
                              });
                            } catch (err: any) {
                              alert(err?.message || 'Güncelleme yapılamadı.');
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all shadow-2xs ${
                            h.UstabasiGorsun
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Tıklayarak Ustabaşı görünürlüğünü açıp kapatabilirsiniz"
                        >
                          <span>🔨</span>
                          <span>{h.UstabasiGorsun ? 'Ustabaşı Görür' : 'Sadece Yönetici'}</span>
                        </button>
                      )}
                    </div>

                    <h3
                      className={`text-sm font-bold text-slate-900 mt-1.5 ${
                        h.TamamlandiMi ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {h.Baslik}
                    </h3>

                    {h.Aciklama && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {h.Aciklama}
                      </p>
                    )}

                    {/* Doğrudan Kart Üzerinde Belge / Görsel Önizleme Galerisi */}
                    {h.Belgeler && h.Belgeler.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-slate-200/50">
                        {h.Belgeler.slice(0, 5).map((belge, bIdx) => {
                          const fInfo = getFileInfo(belge);
                          return (
                            <div
                              key={bIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxDosya(belge);
                              }}
                              className="relative group/thumb h-12 rounded-xl border border-slate-200 overflow-hidden bg-white flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all shadow-xs"
                              title={fInfo.name}
                            >
                              {fInfo.isImage && fInfo.content ? (
                                <div className="w-12 h-12 bg-slate-900">
                                  <img
                                    src={fInfo.content}
                                    alt={fInfo.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                                  />
                                </div>
                              ) : (
                                <div className={`px-2.5 h-12 flex items-center gap-1.5 text-xs font-bold ${
                                  fInfo.isPdf ? 'bg-red-50 text-red-700' :
                                  fInfo.isExcel ? 'bg-emerald-50 text-emerald-700' :
                                  fInfo.isWord ? 'bg-blue-50 text-blue-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {fInfo.isPdf ? <FileText className="w-4 h-4 text-red-600" /> :
                                   fInfo.isExcel ? <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> :
                                   fInfo.isWord ? <FileText className="w-4 h-4 text-blue-600" /> :
                                   <FileIcon className="w-4 h-4 text-slate-500" />}
                                  <span className="text-[10px] tracking-tight">{fInfo.ext}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          );
                        })}
                        {h.Belgeler.length > 5 && (
                          <div className="h-12 px-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">
                            +{h.Belgeler.length - 5}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 self-start">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSilinecekHatirlatici(h);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50/80 transition-colors cursor-pointer"
                    title="Hatırlatıcıyı Sil (Onay İster)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DETAY VE ÇOKLU FOTOĞRAF / BELGE MODALI */}
      {secilenHatirlatici && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl md:max-w-4xl lg:max-w-5xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Ajanda Notu Detayları &amp; Ekler</h3>
                  <p className="text-[11px] text-slate-500 hidden sm:block">Görev detaylarını güncelleyin, geniş açıklama girin ve fotoğraf / dosya / belge ekleyin</p>
                </div>
              </div>
              <button onClick={() => setSecilenHatirlatici(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* SOL SÜTUN: Form Alanları & Geniş Açıklama */}
                <div className="space-y-3 flex flex-col">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Başlık / Görev Adı:</label>
                    <input
                      value={editBaslik}
                      onChange={(e) => setEditBaslik(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tarih:</label>
                      <input
                        type="date"
                        value={editTarih}
                        onChange={(e) => setEditTarih(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Kategori:</label>
                      <select 
                        value={editKategori} 
                        onChange={(e) => setEditKategori(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="Bakim">Bakım &amp; Muayene</option>
                        <option value="Proje">Proje &amp; Montaj</option>
                        <option value="Evrak">Evrak &amp; Teklif</option>
                        <option value="Gorev">Genel Görev</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Önem Derecesi:</label>
                    <select 
                      value={editOnem} 
                      onChange={(e) => setEditOnem(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Onemli">Önemli</option>
                      <option value="Kritik">Kritik / Acil</option>
                    </select>
                  </div>

                  {/* USTABAŞI DA GÖRSÜN CHECKBOX (Yalnızca Yönetici Görür) */}
                  {userRole !== 'ustabasi' && (
                    <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🔨</span>
                        <div>
                          <label htmlFor="editUstabasiGorsunCheck" className="font-bold text-amber-900 dark:text-amber-200 text-xs sm:text-sm cursor-pointer">
                            Ustabaşı da Görsün
                          </label>
                          <p className="text-[11px] text-amber-700 dark:text-amber-300">
                            İşaretlenirse bu ajanda notu Ustabaşı PIN girişi yapıldığında görünür olur.
                          </p>
                        </div>
                      </div>
                      <input
                        id="editUstabasiGorsunCheck"
                        type="checkbox"
                        checked={editUstabasiGorsun}
                        onChange={(e) => setEditUstabasiGorsun(e.target.checked)}
                        className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="flex-1 flex flex-col pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 block">Açıklama / Detaylı Not:</label>
                      <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">Geniş Metin Alanı</span>
                    </div>
                    <textarea
                      value={editAciklama}
                      onChange={(e) => setEditAciklama(e.target.value)}
                      rows={6}
                      placeholder="Görevin tüm detayları, montaj notları, irtibat telefonları, adres veya özel yönergeler..."
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none flex-1 min-h-[140px] resize-y"
                    />
                  </div>
                </div>

                {/* SAĞ SÜTUN: Fotoğraflar / Belgeler / Dosyalar Bölümü */}
                <div className="space-y-3 flex flex-col md:border-l md:border-slate-100 md:pl-5 border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-blue-500" />
                      Dosya &amp; Fotoğraf Ekleri ({editBelgeler.length})
                    </span>
                    
                    {/* Dosya / Kamera Seçme Butonları */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isProcessingFiles && (
                        <span className="text-[11px] text-blue-600 flex items-center gap-1 font-semibold animate-pulse mr-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Dosya işleniyor...
                        </span>
                      )}
                      <label className="cursor-pointer bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1.5 rounded-xl border border-rose-200 flex items-center gap-1 transition-colors shadow-2xs" title="Kamera ile fotoğraf çek">
                        <Camera className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Kamera</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleDosyaYukle(e, true)}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold px-2 py-1.5 rounded-xl border border-sky-200 flex items-center gap-1 transition-colors shadow-2xs" title="Galeriden fotoğraf seç">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Fotoğraf</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleDosyaYukle(e, true)}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1 transition-colors shadow-2xs" title="PDF, Word, Excel veya her türlü dosya ekle">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Dosya / Belge</span>
                        <input
                          type="file"
                          multiple
                          accept="*/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar,.dwg"
                          onChange={(e) => handleDosyaYukle(e, true)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Hata Bildirimi */}
                  {guncellemeHatasi && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{guncellemeHatasi}</span>
                    </div>
                  )}

                  {/* Dosya Önizleme Izgarası */}
                  <div className="flex-1 overflow-y-auto max-h-[420px]">
                    {editBelgeler.length === 0 ? (
                      <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-48 bg-slate-50/50 transition-colors">
                        <Paperclip className="w-10 h-10 text-slate-300 mb-2" />
                        <span className="font-semibold text-slate-600">Eklenmiş belge veya fotoğraf bulunmuyor</span>
                        <span className="text-[11px] text-slate-400 mt-1">Dosya/Belge veya Fotoğraf butonlarına basarak ekleyebilirsiniz.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {editBelgeler.map((file, idx) => {
                          const fInfo = getFileInfo(file);
                          return (
                            <div key={idx} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50 h-32 flex flex-col justify-between shadow-2xs">
                              {/* Önizleme Alanı */}
                              {fInfo.isImage && fInfo.content ? (
                                <div className="w-full h-24 overflow-hidden relative cursor-zoom-in bg-slate-900" onClick={() => setLightboxDosya(file)}>
                                  <img
                                    src={fInfo.content}
                                    alt={fInfo.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Eye className="w-5 h-5 text-white" />
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className={`w-full h-24 flex flex-col items-center justify-center p-2 cursor-pointer transition-colors ${
                                    fInfo.isPdf ? 'bg-red-50 hover:bg-red-100 text-red-700' :
                                    fInfo.isExcel ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' :
                                    fInfo.isWord ? 'bg-blue-50 hover:bg-blue-100 text-blue-700' :
                                    'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                  onClick={() => setLightboxDosya(file)}
                                  title="Dosyayı Önizle / Aç"
                                >
                                  {fInfo.isPdf ? <FileText className="w-7 h-7 text-red-600 mb-1" /> :
                                   fInfo.isExcel ? <FileSpreadsheet className="w-7 h-7 text-emerald-600 mb-1" /> :
                                   fInfo.isWord ? <FileText className="w-7 h-7 text-blue-600 mb-1" /> :
                                   fInfo.isArchive ? <FileArchive className="w-7 h-7 text-purple-600 mb-1" /> :
                                   <FileIcon className="w-7 h-7 text-slate-500 mb-1" />}
                                  <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-white/80 border border-slate-200">
                                    {fInfo.ext}
                                  </span>
                                </div>
                              )}

                              {/* Alt Dosya Bilgileri ve Silme */}
                              <div className="px-2 py-1 bg-white border-t border-slate-100 flex items-center justify-between text-[10px] shrink-0">
                                <span className="truncate font-semibold max-w-[70%] text-slate-700" title={fInfo.name}>
                                  {fInfo.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => dosyaSil(idx, true)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                  title="Dosyayı Kaldır"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* İşlem Butonları */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onToggleTamamlandi(secilenHatirlatici.Id, !secilenHatirlatici.TamamlandiMi);
                    setSecilenHatirlatici(null);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    secilenHatirlatici.TamamlandiMi 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {secilenHatirlatici.TamamlandiMi ? 'Açık Göreve Çevir' : 'Tamamlandı Olarak İşaretle'}
                </button>
                <button
                  type="button"
                  onClick={() => setSilinecekHatirlatici(secilenHatirlatici)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 hover:border-red-300 border border-red-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Hatırlatıcıyı Ajandadan Sil (Onay İster)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sil</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSecilenHatirlatici(null)}
                  disabled={guncelleniyor}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  disabled={guncelleniyor || isProcessingFiles}
                  onClick={async () => {
                    if (onUpdateHatirlatici) {
                      setGuncellemeHatasi(null);
                      setGuncelleniyor(true);
                      try {
                        await onUpdateHatirlatici(secilenHatirlatici.Id, {
                          Baslik: editBaslik,
                          Aciklama: editAciklama,
                          Tarih: editTarih,
                          Kategori: editKategori,
                          OnemDerecesi: editOnem,
                          Belgeler: editBelgeler,
                          UstabasiGorsun: editUstabasiGorsun
                        });
                        setSecilenHatirlatici(null);
                      } catch (err: any) {
                        setGuncellemeHatasi(err?.message || 'Güncelleme sırasında bir hata oluştu.');
                      } finally {
                        setGuncelleniyor(false);
                      }
                    } else {
                      setSecilenHatirlatici(null);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {guncelleniyor ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <span>Değişiklikleri Kaydet</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YENİ HATIRLATICI MODALI */}
      {modalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl md:max-w-4xl lg:max-w-5xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Yeni Görev / Hatırlatıcı Ekle</h3>
                  <p className="text-[11px] text-slate-500 hidden sm:block">Görevin detaylarını belirleyin, geniş açıklama girin ve evrak / dosya / fotoğrafları ekleyin</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setModalAcik(false);
                  setKayitHatasi(null);
                  setYeniBelgeler([]);
                }} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hata Bildirimi */}
            {kayitHatasi && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Kayıt Başarısız Oldu</p>
                  <p>{kayitHatasi}</p>
                </div>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setKayitHatasi(null);
                setKaydediliyor(true);
                const form = e.target as any;
                try {
                  await onAddHatirlatici({
                    Baslik: form.baslik.value,
                    Aciklama: form.aciklama.value,
                    Tarih: form.tarih.value || bugunStr,
                    Kategori: form.kategori.value,
                    TamamlandiMi: false,
                    OnemDerecesi: form.onem.value,
                    Belgeler: yeniBelgeler,
                    UstabasiGorsun: userRole === 'ustabasi' ? true : Boolean(form.ustabasiGorsun?.checked),
                    OlusturanKisi: currentUserName || (userRole === 'ustabasi' ? 'Ustabaşı' : '1. Yönetici')
                  });
                  setModalAcik(false);
                  setYeniBelgeler([]);
                } catch (err: any) {
                  setKayitHatasi(err?.message || 'Hatırlatıcı kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
                } finally {
                  setKaydediliyor(false);
                }
              }}
              className="py-4 overflow-y-auto flex-1 text-xs sm:text-sm flex flex-col"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
                {/* SOL SÜTUN: Form Alanları & Geniş Açıklama */}
                <div className="space-y-3 flex flex-col">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Görev / Not Başlığı:</label>
                    <input
                      name="baslik"
                      placeholder="Örn: Megane Muayene Randevusu Alınacak"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tarih:</label>
                      <input
                        type="date"
                        name="tarih"
                        defaultValue={bugunStr}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Kategori:</label>
                      <select name="kategori" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="Bakim">Bakım &amp; Muayene</option>
                        <option value="Proje">Proje &amp; Montaj</option>
                        <option value="Evrak">Evrak &amp; Teklif</option>
                        <option value="Gorev">Genel Görev</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Önem Derecesi:</label>
                    <select name="onem" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="Normal">Normal</option>
                      <option value="Onemli">Önemli</option>
                      <option value="Kritik">Kritik / Acil</option>
                    </select>
                  </div>

                  {/* USTABAŞI DA GÖRSÜN CHECKBOX (Yalnızca Yönetici Görür) */}
                  {userRole !== 'ustabasi' && (
                    <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🔨</span>
                        <div>
                          <label htmlFor="addUstabasiGorsunCheck" className="font-bold text-amber-900 text-xs sm:text-sm cursor-pointer">
                            Ustabaşı da Görsün
                          </label>
                          <p className="text-[11px] text-amber-700">
                            İşaretlenirse bu ajanda notu Ustabaşı PIN girişi yapıldığında görünür olur.
                          </p>
                        </div>
                      </div>
                      <input
                        id="addUstabasiGorsunCheck"
                        type="checkbox"
                        name="ustabasiGorsun"
                        className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="flex-1 flex flex-col pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 block">Açıklama / Detaylı Not:</label>
                      <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">Geniş Metin Alanı</span>
                    </div>
                    <textarea
                      name="aciklama"
                      rows={6}
                      placeholder="İlgili kişi, istasyon, fatura detayları veya özel talimatlar..."
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none flex-1 min-h-[140px] resize-y"
                    />
                  </div>
                </div>

                {/* SAĞ SÜTUN: Çoklu Fotoğraf / Belge Ekleme Alanı */}
                <div className="space-y-3 flex flex-col md:border-l md:border-slate-100 md:pl-5 border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-blue-500" />
                      Dosya &amp; Fotoğraf Ekle ({yeniBelgeler.length})
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isProcessingFiles && (
                        <span className="text-[11px] text-blue-600 flex items-center gap-1 font-semibold animate-pulse mr-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          İşleniyor...
                        </span>
                      )}
                      <label className="cursor-pointer bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1.5 rounded-xl border border-rose-200 flex items-center gap-1 transition-colors shadow-2xs" title="Kamera ile çek">
                        <Camera className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Kamera</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleDosyaYukle(e, false)}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold px-2 py-1.5 rounded-xl border border-sky-200 flex items-center gap-1 transition-colors shadow-2xs" title="Galeriden fotoğraf seç">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Fotoğraf</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleDosyaYukle(e, false)}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1 transition-colors shadow-2xs" title="PDF, Word, Excel veya her türlü dosya ekle">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Dosya / Belge</span>
                        <input
                          type="file"
                          multiple
                          accept="*/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar,.dwg"
                          onChange={(e) => handleDosyaYukle(e, false)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[420px]">
                    {yeniBelgeler.length === 0 ? (
                      <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-48 bg-slate-50/50 transition-colors">
                        <Paperclip className="w-10 h-10 text-slate-300 mb-2" />
                        <span className="font-semibold text-slate-600">Henüz dosya veya fotoğraf eklenmedi</span>
                        <span className="text-[11px] text-slate-400 mt-1">Dosya/Belge veya Fotoğraf butonlarına basarak ekleyebilirsiniz.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {yeniBelgeler.map((file, idx) => {
                          const fInfo = getFileInfo(file);
                          return (
                            <div key={idx} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50 h-32 flex flex-col justify-between shadow-2xs">
                              {fInfo.isImage && fInfo.content ? (
                                <div 
                                  className="w-full h-24 overflow-hidden relative cursor-zoom-in bg-slate-900"
                                  onClick={() => setLightboxDosya(file)}
                                  title="Önizlemeyi Büyüt"
                                >
                                  <img
                                    src={fInfo.content}
                                    alt={fInfo.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Eye className="w-5 h-5 text-white" />
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className={`w-full h-24 flex flex-col items-center justify-center p-2 cursor-pointer transition-colors ${
                                    fInfo.isPdf ? 'bg-red-50 hover:bg-red-100 text-red-700' :
                                    fInfo.isExcel ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' :
                                    fInfo.isWord ? 'bg-blue-50 hover:bg-blue-100 text-blue-700' :
                                    'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                  onClick={() => setLightboxDosya(file)}
                                  title="Dosyayı Önizle / Aç"
                                >
                                  {fInfo.isPdf ? <FileText className="w-7 h-7 text-red-600 mb-1" /> :
                                   fInfo.isExcel ? <FileSpreadsheet className="w-7 h-7 text-emerald-600 mb-1" /> :
                                   fInfo.isWord ? <FileText className="w-7 h-7 text-blue-600 mb-1" /> :
                                   fInfo.isArchive ? <FileArchive className="w-7 h-7 text-purple-600 mb-1" /> :
                                   <FileIcon className="w-7 h-7 text-slate-500 mb-1" />}
                                  <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-white/80 border border-slate-200">
                                    {fInfo.ext}
                                  </span>
                                </div>
                              )}
                              <div className="px-2 py-1 bg-white border-t border-slate-100 flex items-center justify-between text-[10px] truncate text-slate-700">
                                <span className="truncate max-w-[70%] font-semibold">{fInfo.name}</span>
                                <button
                                  type="button"
                                  onClick={() => dosyaSil(idx, false)}
                                  className="text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer"
                                  title="Kaldır"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  disabled={kaydediliyor}
                  onClick={() => {
                    setModalAcik(false);
                    setKayitHatasi(null);
                    setYeniBelgeler([]);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={kaydediliyor || isProcessingFiles}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {kaydediliyor ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <span>Kaydet</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SİLME ONAY MODALI (AJANDA & HATIRLATICI) */}
      {silinecekHatirlatici && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 flex flex-col space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-slate-900 text-base">Hatırlatıcıyı Sil</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bu ajanda hatırlatıcısını silmek istediğinize emin misiniz?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              <div className="font-bold text-slate-800 line-clamp-2">
                {silinecekHatirlatici.Baslik}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>📅 {silinecekHatirlatici.Tarih}</span>
                <span>•</span>
                <span>🏷️ {silinecekHatirlatici.Kategori}</span>
              </div>
              {silinecekHatirlatici.Belgeler && silinecekHatirlatici.Belgeler.length > 0 && (
                <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200/60 flex items-center gap-1 font-medium mt-1">
                  <Paperclip className="w-3.5 h-3.5 shrink-0" />
                  <span>Bu kayda ait {silinecekHatirlatici.Belgeler.length} adet ekli dosya/belge de silinecektir.</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={siliniyor}
                onClick={() => setSilinecekHatirlatici(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={siliniyor}
                onClick={async () => {
                  setSiliniyor(true);
                  try {
                    await onDeleteHatirlatici(silinecekHatirlatici.Id);
                    // Eğer detay modalı da bu öğeyi gösteriyorsa onu da kapat
                    if (secilenHatirlatici && secilenHatirlatici.Id === silinecekHatirlatici.Id) {
                      setSecilenHatirlatici(null);
                    }
                    setSilinecekHatirlatici(null);
                  } catch (err: any) {
                    console.error('Silme hatası:', err);
                  } finally {
                    setSiliniyor(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {siliniyor ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Siliniyor...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Evet, Sil</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX (FOTOĞRAF VE BELGE ÖNİZLEME / İNTERAKTİF PAN & ZOOM / ESC İLE KAPATMA) */}
      {lightboxDosya && (() => {
        const fileInfo = getFileInfo(lightboxDosya);
        const dataUrl = fileInfo.content;
        const fileName = lightboxDosya.DosyaAdi || 'dosya';
        const fileSize = lightboxDosya.DosyaBoyutu || '';

        return (
          <div 
            onClick={() => setLightboxDosya(null)}
            className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full h-[92vh] bg-slate-900 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
            >
              {/* Üst Bar: Başlık, Bilgi, Zoom & Döndürme Araçları, İndirme ve Kapatma Butonu */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 bg-slate-950/90 border-b border-slate-800 text-white shrink-0">
                <div className="flex items-center gap-2.5 min-w-0 max-w-[45%] sm:max-w-[40%]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    fileInfo.isPdf ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    fileInfo.isExcel ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    fileInfo.isWord ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    fileInfo.isArchive ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}>
                    {fileInfo.isPdf ? <FileText className="w-4 h-4" /> :
                     fileInfo.isExcel ? <FileSpreadsheet className="w-4 h-4" /> :
                     fileInfo.isWord ? <FileText className="w-4 h-4" /> :
                     fileInfo.isArchive ? <FileArchive className="w-4 h-4" /> :
                     <ImageIcon className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate" title={fileName}>
                      {fileName}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      {fileSize ? `${fileSize} • ` : ''}{fileInfo.ext} Dosyası
                    </p>
                  </div>
                </div>

                {/* Kontroller: Zoom / Döndür / İndir / Yeni Sekme / Kapat */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {fileInfo.isImage && (
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
                        title="Varsayılan Boyut &amp; Konuma Sıfırla (%100)"
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

                  {dataUrl && (
                    <button
                      type="button"
                      onClick={() => guvenliDosyaIndir(dataUrl, fileName)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer"
                      title="Dosyayı Güvenle İndir"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">İndir</span>
                    </button>
                  )}

                  {dataUrl && (
                    <button
                      type="button"
                      onClick={() => handleOpenInNewTab(lightboxDosya)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Yeni Sekmede Tam Boyut Aç"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Yeni Sekmede Aç</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setLightboxDosya(null)}
                    className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl border border-rose-500/30 hover:border-rose-600 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shadow-sm"
                    title="Kapat (ESC tuşuna da basabilirsiniz)"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden md:inline">Kapat (ESC)</span>
                  </button>
                </div>
              </div>

              {/* İçerik Sahnesi (İnteraktif Sürükleme / Pan & Zoom Desteği) */}
              <div 
                className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-hidden flex items-center justify-center relative select-none cursor-grab active:cursor-grabbing"
                onMouseDown={fileInfo.isImage ? handleMouseDown : undefined}
                onMouseMove={fileInfo.isImage ? handleMouseMove : undefined}
                onMouseUp={fileInfo.isImage ? handleMouseUp : undefined}
                onMouseLeave={fileInfo.isImage ? handleMouseUp : undefined}
                onTouchStart={fileInfo.isImage ? handleTouchStart : undefined}
                onTouchMove={fileInfo.isImage ? handleTouchMove : undefined}
                onTouchEnd={fileInfo.isImage ? handleTouchEnd : undefined}
                onWheel={fileInfo.isImage ? handleWheel : undefined}
              >
                {fileInfo.isImage && dataUrl ? (
                  <div 
                    className="flex items-center justify-center"
                    style={{
                      transform: `translate3d(${panPosition.x}px, ${panPosition.y}px, 0)`,
                      transition: isDragging ? 'none' : 'transform 0.08s ease-out'
                    }}
                  >
                    <img
                      src={dataUrl}
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
                ) : fileInfo.isPdf && dataUrl ? (
                  <div className="w-full h-full flex flex-col rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                    <iframe
                      src={dataUrl}
                      title={fileName}
                      className="w-full h-full border-0 rounded-xl bg-white"
                    />
                  </div>
                ) : (
                  /* Diğer Belgeler (Word, Excel, Zip, vb.) */
                  <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-4 shadow-xl">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                      {fileInfo.isExcel ? <FileSpreadsheet className="w-10 h-10 text-emerald-400" /> :
                       fileInfo.isWord ? <FileText className="w-10 h-10 text-blue-400" /> :
                       fileInfo.isArchive ? <FileArchive className="w-10 h-10 text-purple-400" /> :
                       <FileIcon className="w-10 h-10 text-slate-300" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base break-all">{fileName}</h3>
                      <p className="text-xs text-slate-400 mt-1">{fileSize || 'Belge Dosyası'} • {fileInfo.ext}</p>
                    </div>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                      {dataUrl && (
                        <button
                          type="button"
                          onClick={() => guvenliDosyaIndir(dataUrl, fileName)}
                          className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Dosyayı İndir</span>
                        </button>
                      )}
                      {dataUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenInNewTab(lightboxDosya)}
                          className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 border border-slate-700 cursor-pointer shadow-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Yeni Sekmede Aç</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Alt Bilgi İpucu Çubuğu */}
              <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-300">İpucu:</span>
                  <span>Görseli mouse ile sürükleyerek (Pan) kaydırabilir, tekerlekle yakınlaştırabilir, <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-200 font-mono">ESC</kbd> veya dışarı tıklayarak kapatabilirsiniz.</span>
                </span>
                {fileInfo.isImage && (
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
      })()}
    </div>
  );
};
