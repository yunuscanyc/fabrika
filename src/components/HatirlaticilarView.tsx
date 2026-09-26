import React, { useState, useEffect, useRef } from 'react';
import { Hatirlatici, AjandaBildirimi } from '../types';
import { formatTarihTR } from '../utils/dateUtils';
import { 
  Bell, 
  Plus, 
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
  Search
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
  onHatirlaticiInspected?: (id: number) => void;
  onMarkNotificationRead?: (notificationId?: number, hatirlaticiId?: number) => void;
  targetOpenHatirlaticiId?: number | null;
  onClearTargetOpenHatirlaticiId?: () => void;
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

export const HatirlaticilarView: React.FC<HatirlaticilarViewProps> = ({
  hatirlaticilar,
  onAddHatirlatici,
  onToggleTamamlandi,
  onUpdateHatirlatici,
  onDeleteHatirlatici,
  unreadNotifHatirlaticiIds = [],
  ajandaBildirimler = [],
  currentUserName = '',
  onHatirlaticiInspected,
  onMarkNotificationRead,
  targetOpenHatirlaticiId,
  onClearTargetOpenHatirlaticiId
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
  const [guncelleniyor, setGuncelleniyor] = useState(false);
  const [guncellemeHatasi, setGuncellemeHatasi] = useState<string | null>(null);

  // Fotoğraf Lightbox/Önizleme State
  const [lightboxDosya, setLightboxDosya] = useState<any | null>(null);

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
        }

        const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(file.name);
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
    } else {
      setEditBelgeler([]);
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

  // Çoklu Dosya Yükleme (Tam Orijinal Çözünürlük & Kalite)
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
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Teklif takipleri, muayene günleri, bakım hatırlatıcıları ve görsel belgeleri
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setYeniBelgeler([]);
              setModalAcik(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Hatırlatıcı Ekle</span>
          </button>
        </div>
      </div>

      {/* Arama ve Filtre Çubuğu */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Arama Kutusu */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Başlık, açıklama veya detaylarda kelime ara..."
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs transition-all"
          />
          {aramaMetni && (
            <button
              type="button"
              onClick={() => setAramaMetni('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer transition-colors"
              title="Aramayı Temizle"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtre Butonları */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFiltre('hepsi')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filtre === 'hepsi'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tüm Görevler ({hatirlaticilar.length})
          </button>
          <button
            onClick={() => setFiltre('tamamlanmayan')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filtre === 'tamamlanmayan'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Açık Kalanlar ({hatirlaticilar.filter(h => !h.TamamlandiMi).length})
          </button>
          <button
            onClick={() => setFiltre('bugun')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filtre === 'bugun'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100'
            }`}
          >
            Bugün ({hatirlaticilar.filter(h => h.Tarih === bugunStr && !h.TamamlandiMi).length})
          </button>
          <button
            onClick={() => setFiltre('tamamlanan')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filtre === 'tamamlanan'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tamamlananlar ({hatirlaticilar.filter(h => h.TamamlandiMi).length})
          </button>
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
            const hasUnreadChange = unreadNotifHatirlaticiIds.includes(Number(h.Id));

            return (
              <div
                key={h.Id}
                onClick={() => handleOpenCard(h)}
                className={`p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all flex items-start justify-between gap-3 ${d.renk} ${
                  hasUnreadChange ? 'ring-2 ring-amber-500 shadow-md animate-glow' : ''
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0 relative">
                  <div className="relative shrink-0 flex flex-col items-center">
                    <button
                      type="button"
                      onClick={(e) => handleCircleClick(e, h)}
                      onDoubleClick={(e) => handleCircleDoubleClick(e, h)}
                      className="mt-0.5 text-slate-400 hover:text-blue-600 transition-all shrink-0 p-1 rounded-full hover:scale-110 active:scale-95"
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
                      {hasUnreadChange && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-red-500 text-white shadow-xs animate-pulse">
                          <Sparkles className="w-3 h-3 text-white" />
                          <span>YENİ DEĞİŞİKLİK</span>
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
                      
                      {/* Belgeler / Fotoğraflar Mevcutsa Göster */}
                      {belgeSayisi > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1 animate-pulse">
                          <ImageIcon className="w-3 h-3" />
                          <span>{belgeSayisi} Görsel / Belge</span>
                        </span>
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
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200/50">
                        {h.Belgeler.slice(0, 4).map((belge, bIdx) => (
                          <div
                            key={bIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxDosya(belge);
                            }}
                            className="relative group/thumb w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center cursor-zoom-in hover:ring-2 hover:ring-blue-500 transition-all shadow-xs"
                            title={belge.DosyaAdi || 'Belgeyi Büyüt'}
                          >
                            {getBelgeDosyaIcerigi(belge) ? (
                              <img
                                src={getBelgeDosyaIcerigi(belge)}
                                alt={belge.DosyaAdi}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                              />
                            ) : (
                              <FileText className="w-5 h-5 text-slate-500" />
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        ))}
                        {h.Belgeler.length > 4 && (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">
                            +{h.Belgeler.length - 4}
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
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50/80 transition-colors"
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

      {/* DETAY VE ÇOKLU FOTOĞRAF MODALI */}
      {secilenHatirlatici && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Ajanda Notu Detayları &amp; Görseller</h3>
              </div>
              <button onClick={() => setSecilenHatirlatici(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              {/* Form Alanları */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Başlık / Görev Adı:</label>
                  <input
                    value={editBaslik}
                    onChange={(e) => setEditBaslik(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
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
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kategori:</label>
                    <select 
                      value={editKategori} 
                      onChange={(e) => setEditKategori(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Onemli">Önemli</option>
                    <option value="Kritik">Kritik / Acil</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Açıklama / Detaylı Not:</label>
                  <textarea
                    value={editAciklama}
                    onChange={(e) => setEditAciklama(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Fotoğraflar / Belgeler Bölümü */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    Çoklu Fotoğraf ve Belge Ekleri ({editBelgeler.length})
                  </span>
                  
                  {/* Dosya Seçme Butonu */}
                  <div className="flex items-center gap-2">
                    {isProcessingFiles && (
                      <span className="text-[11px] text-blue-600 flex items-center gap-1 font-semibold animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Görsel işleniyor...
                      </span>
                    )}
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Görsel Ekle
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleDosyaYukle(e, true)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Hata Bildirimi */}
                {guncellemeHatasi && (
                  <div className="mb-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{guncellemeHatasi}</span>
                  </div>
                )}

                {/* Dosya Önizleme Izgarası */}
                {editBelgeler.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center text-slate-400 text-xs">
                    <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                    Eklenmiş fotoğraf bulunmuyor. Yukarıdaki butondan fotoğraf ekleyebilirsiniz.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {editBelgeler.map((file, idx) => (
                      <div key={idx} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50 h-28 flex flex-col justify-between">
                        {/* Resim Önizleme */}
                        {getBelgeDosyaIcerigi(file) ? (
                          <div className="w-full h-20 overflow-hidden relative cursor-zoom-in" onClick={() => setLightboxDosya(file)}>
                            <img
                              src={getBelgeDosyaIcerigi(file)}
                              alt={file.DosyaAdi}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-20 flex flex-col items-center justify-center text-slate-400 bg-slate-100 p-2">
                            <FileText className="w-6 h-6 text-slate-400 mb-1" />
                            <span className="text-[9px] text-slate-500 font-medium">Belge / Dosya</span>
                          </div>
                        )}

                        {/* Alt Dosya Bilgileri ve Silme */}
                        <div className="px-2 py-1 bg-white border-t border-slate-100 flex items-center justify-between text-[10px] shrink-0">
                          <span className="truncate font-semibold max-w-[70%] text-slate-700" title={file.DosyaAdi}>
                            {file.DosyaAdi}
                          </span>
                          <button
                            type="button"
                            onClick={() => dosyaSil(idx, true)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Dosyayı Kaldır"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${
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
                  className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 hover:border-red-300 border border-red-200 flex items-center gap-1 transition-colors"
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
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
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
                          Belgeler: editBelgeler
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
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Yeni Görev / Hatırlatıcı Ekle</h3>
              <button 
                onClick={() => {
                  setModalAcik(false);
                  setKayitHatasi(null);
                  setYeniBelgeler([]);
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hata Bildirimi */}
            {kayitHatasi && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
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
                    Belgeler: yeniBelgeler
                  });
                  setModalAcik(false);
                  setYeniBelgeler([]);
                } catch (err: any) {
                  setKayitHatasi(err?.message || 'Hatırlatıcı kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
                } finally {
                  setKaydediliyor(false);
                }
              }}
              className="space-y-4 text-xs sm:text-sm"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">Görev / Not Başlığı:</label>
                <input
                  name="baslik"
                  placeholder="Örn: Megane Muayene Randevusu Alınacak"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori:</label>
                  <select name="kategori" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Bakim">Bakım &amp; Muayene</option>
                    <option value="Proje">Proje &amp; Montaj</option>
                    <option value="Evrak">Evrak &amp; Teklif</option>
                    <option value="Gorev">Genel Görev</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Önem Derecesi:</label>
                <select name="onem" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="Normal">Normal</option>
                  <option value="Onemli">Önemli</option>
                  <option value="Kritik">Kritik / Acil</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Açıklama / Detay:</label>
                <textarea
                  name="aciklama"
                  rows={2}
                  placeholder="İlgili kişi, istasyon veya not..."
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Çoklu Fotoğraf Ekleme Alanı */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-700 text-xs flex items-center gap-1">
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    Fotoğraf / Belge Ekle ({yeniBelgeler.length})
                  </span>
                  <div className="flex items-center gap-2">
                    {isProcessingFiles && (
                      <span className="text-[11px] text-blue-600 flex items-center gap-1 font-semibold animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Görsel işleniyor...
                      </span>
                    )}
                    <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-bold px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      Görsel Seç
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleDosyaYukle(e, false)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {yeniBelgeler.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {yeniBelgeler.map((file, idx) => (
                      <div key={idx} className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-50 h-20 flex flex-col justify-between">
                        <div 
                          className="w-full h-14 overflow-hidden relative cursor-zoom-in"
                          onClick={() => setLightboxDosya(file)}
                          title="Önizlemeyi Büyüt"
                        >
                          {getBelgeDosyaIcerigi(file) ? (
                            <img
                              src={getBelgeDosyaIcerigi(file)}
                              alt={file.DosyaAdi}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                        <div className="px-1.5 py-0.5 bg-white border-t border-slate-100 flex items-center justify-between text-[8px] truncate text-slate-700">
                          <span className="truncate max-w-[70%] font-medium">{file.DosyaAdi}</span>
                          <button
                            type="button"
                            onClick={() => dosyaSil(idx, false)}
                            className="text-slate-400 hover:text-red-600 p-0.5 rounded"
                            title="Kaldır"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={kaydediliyor}
                  onClick={() => {
                    setModalAcik(false);
                    setKayitHatasi(null);
                    setYeniBelgeler([]);
                  }}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={kaydediliyor || isProcessingFiles}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors"
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
                  <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Bu kayda ait {silinecekHatirlatici.Belgeler.length} adet ekli fotoğraf da silinecektir.</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={siliniyor}
                onClick={() => setSilinecekHatirlatici(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
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
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
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

      {/* LIGHTBOX (FOTOĞRAF TAM BOY GÖSTERİM) MODALI */}
      {lightboxDosya && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
            {/* Üst Bar */}
            <div className="flex items-center justify-between p-4 bg-slate-950/40 text-white shrink-0">
              <span className="text-xs font-bold truncate max-w-[60%] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                {lightboxDosya.DosyaAdi} ({lightboxDosya.DosyaBoyutu})
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={getBelgeDosyaIcerigi(lightboxDosya)}
                  download={lightboxDosya.DosyaAdi || 'gorsel.png'}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
                  title="Görseli İndir"
                >
                  <Download className="w-4 h-4" />
                  <span>İndir</span>
                </a>
                <button
                  onClick={() => setLightboxDosya(null)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Görsel Sahnesi */}
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 h-[60vh]">
              {getBelgeDosyaIcerigi(lightboxDosya) ? (
                <img
                  src={getBelgeDosyaIcerigi(lightboxDosya)}
                  alt={lightboxDosya.DosyaAdi}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                  <FileText className="w-12 h-12 text-slate-500" />
                  <span className="text-xs">Görsel önizleme yüklenemedi</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
