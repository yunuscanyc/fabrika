import React, { useState, useMemo, useEffect } from 'react';
import { RuhsatKaydi, RuhsatKategori } from '../types';
import { formatTarihTR, getBugunIso } from '../utils/dateUtils';
import { getFileInfo } from './HatirlaticilarView';
import { guvenliDosyaIndir } from '../utils/downloadUtils';
import { 
  FileCheck, 
  Plus, 
  Search, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Calendar, 
  Building2, 
  User, 
  Paperclip, 
  Camera, 
  ImageIcon, 
  Trash2, 
  Edit3, 
  Eye, 
  Download, 
  Printer, 
  X, 
  ShieldAlert, 
  Filter,
  Sparkles,
  Loader2,
  FileSpreadsheet,
  ClipboardPaste
} from 'lucide-react';
import { extractImagesFromClipboard, readImagesFromClipboardApi } from '../utils/clipboardUtils';
import { CameraCaptureModal } from './CameraCaptureModal';

interface RuhsatlarViewProps {
  ruhsatlar: RuhsatKaydi[];
  onAddRuhsat: (r: Partial<RuhsatKaydi>) => Promise<any> | void;
  onUpdateRuhsat: (id: number, fields: Partial<RuhsatKaydi>) => Promise<any> | void;
  onDeleteRuhsat: (id: number) => Promise<any> | void;
  onYenileRuhsat: (id: number, yeniBitisTarihi: string, aciklama?: string) => Promise<any> | void;
  userRole?: 'admin' | 'ustabasi';
  currentUserName?: string;
}

export const RuhsatlarView: React.FC<RuhsatlarViewProps> = ({
  ruhsatlar = [],
  onAddRuhsat,
  onUpdateRuhsat,
  onDeleteRuhsat,
  onYenileRuhsat,
  userRole = 'admin',
  currentUserName = ''
}) => {
  const bugunStr = getBugunIso();
  const [aramaMetni, setAramaMetni] = useState('');
  const [seciliKategori, setSeciliKategori] = useState<string>('hepsi');
  const [seciliDurum, setSeciliDurum] = useState<'hepsi' | 'yaklasiyor' | 'suresi_doldu' | 'gecerli'>('hepsi');
  
  // Modallar
  const [ekleModalAcik, setEkleModalAcik] = useState(false);
  const [duzenleModalKayit, setDuzenleModalKayit] = useState<RuhsatKaydi | null>(null);
  const [yenileModalKayit, setYenileModalKayit] = useState<RuhsatKaydi | null>(null);
  const [silModalKayit, setSilModalKayit] = useState<RuhsatKaydi | null>(null);
  const [detayModalKayit, setDetayModalKayit] = useState<RuhsatKaydi | null>(null);

  // Form State'leri
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [islemHatasi, setIslemHatasi] = useState<string | null>(null);
  const [yeniBelgeler, setYeniBelgeler] = useState<any[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [ruhsatCameraTarget, setRuhsatCameraTarget] = useState<'ekle' | 'duzenle' | null>(null);

  const handleRuhsatCameraCapture = (base64Image: string, fileName: string) => {
    const newDoc = {
      Id: Date.now(),
      DosyaAdi: fileName,
      DosyaBoyutu: 'Fotoğraf',
      YuklemeTarihi: new Date().toISOString(),
      DosyaIcerigi: base64Image
    };
    if (ruhsatCameraTarget === 'ekle') {
      setYeniBelgeler(prev => [...prev, newDoc]);
    } else if (ruhsatCameraTarget === 'duzenle' && duzenleModalKayit) {
      setDuzenleModalKayit({
        ...duzenleModalKayit,
        Belgeler: [...(duzenleModalKayit.Belgeler || []), newDoc]
      });
    }
    setRuhsatCameraTarget(null);
  };

  // Görünüm Modu: 'grid' veya 'table'
  const [gorunumModu, setGorunumModu] = useState<'grid' | 'table'>('grid');

  // Belge ve Görsel İnceleme Modalı
  const [activeDocViewer, setActiveDocViewer] = useState<{ file: any; name: string } | null>(null);

  // Kalan gün hesaplama yardımcı fonksiyonu
  const calculateKalanGun = (bitisTarihiStr: string): number => {
    if (!bitisTarihiStr) return 999;
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const bitis = new Date(bitisTarihiStr);
    bitis.setHours(0, 0, 0, 0);
    const diffTime = bitis.getTime() - bugun.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Ruhsat Durumunu Dinamik Belirle
  const getRuhsatDurumu = (r: RuhsatKaydi): { durum: 'SuresiDoldu' | 'Yaklasiyor' | 'Gecerli'; kalanGun: number; etiket: string; renk: string } => {
    const kalanGun = calculateKalanGun(r.BitisTarihi);
    const uyariSuresi = r.UyariSuresiGun || 30;

    if (kalanGun < 0) {
      return {
        durum: 'SuresiDoldu',
        kalanGun,
        etiket: `Süresi ${Math.abs(kalanGun)} Gün Önce Doldu!`,
        renk: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
      };
    } else if (kalanGun <= uyariSuresi) {
      return {
        durum: 'Yaklasiyor',
        kalanGun,
        etiket: `Dolmasına ${kalanGun} Gün Kaldı (1 Ay / Uyarı Dönemi)`,
        renk: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
      };
    } else {
      return {
        durum: 'Gecerli',
        kalanGun,
        etiket: `Geçerli (${kalanGun} gün kaldı)`,
        renk: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      };
    }
  };

  // Dosya Yükleme İşleyicisi
  const processFiles = async (files: FileList | File[], isEdit: boolean = false) => {
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);

    const newDocs: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      await new Promise((resolve) => {
        reader.onload = (event) => {
          const content = event.target?.result as string;
          newDocs.push({
            DosyaAdi: file.name,
            DosyaBoyutu: `${(file.size / 1024).toFixed(1)} KB`,
            YuklemeTarihi: new Date().toISOString(),
            DosyaIcerigi: content
          });
          resolve(true);
        };
        reader.readAsDataURL(file);
      });
    }

    if (isEdit && duzenleModalKayit) {
      setDuzenleModalKayit({
        ...duzenleModalKayit,
        Belgeler: [...(duzenleModalKayit.Belgeler || []), ...newDocs]
      });
    } else {
      setYeniBelgeler(prev => [...prev, ...newDocs]);
    }
    setIsProcessingFiles(false);
  };

  const handleDosyaYukle = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files, isEdit);
    e.target.value = '';
  };

  // Pano (Clipboard / Ekran Görüntüsü / Ctrl + V) ile Doğrudan Resim Yapıştırma
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (ekleModalAcik) {
        const pastedFiles = extractImagesFromClipboard(e);
        if (pastedFiles.length > 0) {
          e.preventDefault();
          processFiles(pastedFiles, false);
        }
      } else if (duzenleModalKayit) {
        const pastedFiles = extractImagesFromClipboard(e);
        if (pastedFiles.length > 0) {
          e.preventDefault();
          processFiles(pastedFiles, true);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [ekleModalAcik, duzenleModalKayit]);

  // İstatistik Hesaplamaları
  const stats = useMemo(() => {
    let toplam = ruhsatlar.length;
    let gecerli = 0;
    let yaklasiyor = 0;
    let suresiDoldu = 0;

    ruhsatlar.forEach(r => {
      const { durum } = getRuhsatDurumu(r);
      if (durum === 'SuresiDoldu') suresiDoldu++;
      else if (durum === 'Yaklasiyor') yaklasiyor++;
      else gecerli++;
    });

    return { toplam, gecerli, yaklasiyor, suresiDoldu };
  }, [ruhsatlar]);

  // Filtrelenmiş Ruhsat Listesi
  const filtrelenmisRuhsatlar = useMemo(() => {
    return ruhsatlar.filter(r => {
      // Metin Arama
      const arama = aramaMetni.toLowerCase().trim();
      const matchText = !arama || 
        r.BelgeAdi.toLowerCase().includes(arama) || 
        (r.KurumMakam || '').toLowerCase().includes(arama) || 
        (r.RuhsatNo || '').toLowerCase().includes(arama) || 
        (r.SorumluKisi || '').toLowerCase().includes(arama) || 
        (r.Aciklama || '').toLowerCase().includes(arama);

      if (!matchText) return false;

      // Kategori Filtresi
      if (seciliKategori !== 'hepsi' && r.Kategori !== seciliKategori) {
        return false;
      }

      // Durum Filtresi
      const { durum } = getRuhsatDurumu(r);
      if (seciliDurum === 'yaklasiyor' && durum !== 'Yaklasiyor') return false;
      if (seciliDurum === 'suresi_doldu' && durum !== 'SuresiDoldu') return false;
      if (seciliDurum === 'gecerli' && durum !== 'Gecerli') return false;

      return true;
    }).sort((a, b) => {
      // Önce süresi dolmuşlar ve yaklaşanlar üste gelsin
      const kalanA = calculateKalanGun(a.BitisTarihi);
      const kalanB = calculateKalanGun(b.BitisTarihi);
      return kalanA - kalanB;
    });
  }, [ruhsatlar, aramaMetni, seciliKategori, seciliDurum, userRole]);

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6 pb-24">
      {/* BAŞLIK VE AKSİYON BARİ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl shadow-xl border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                Ruhsatlar &amp; Periyodik İzinler Masası
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                1 Ay Kala Otomatik Uyarı Sistemli
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ses, duman, baca, çevre, işyeri ruhsatı ve periyodik muayene belgelerinizin süre takibi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setEkleModalAcik(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Yeni Ruhsat / İzin Ekle</span>
          </button>
        </div>
      </div>

      {/* SÜRESİ DOLMAK ÜZERE OLAN VEYA DOLAN RUHSATLAR ACİL BİLDİRİM BARI */}
      {(stats.suresiDoldu > 0 || stats.yaklasiyor > 0) && (
        <div className="p-4 bg-gradient-to-r from-amber-950/80 via-red-950/80 to-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-amber-200 flex items-center gap-2">
                <span>⚠️ Dikkat: Yenileme Zamanı Gelen Belgeler Var!</span>
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                {stats.suresiDoldu > 0 && <span className="font-bold text-red-400">{stats.suresiDoldu} adet belgenin süresi doldu! </span>}
                {stats.yaklasiyor > 0 && <span className="font-bold text-amber-300">{stats.yaklasiyor} adet belgenin süresi 1 ay içinde doluyor. </span>}
                Lütfen ilgili kamu kurumları ile iletişime geçerek yenileme işlemlerini başlatın.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSeciliDurum('yaklasiyor')}
            className="px-3 py-1.5 bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 border border-amber-400/40 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
          >
            Yaklaşanları Listele
          </button>
        </div>
      )}

      {/* İSTATİSTİK KARTLARI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Toplam Ruhsat */}
        <div 
          onClick={() => setSeciliDurum('hepsi')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            seciliDurum === 'hepsi' 
              ? 'bg-slate-900 text-white border-blue-500 shadow-md ring-2 ring-blue-500/30' 
              : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Toplam Kayıtlı Belge</span>
            <FileCheck className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2">{stats.toplam}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Tüm mutad izinler</span>
        </div>

        {/* Geçerli */}
        <div 
          onClick={() => setSeciliDurum('gecerli')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            seciliDurum === 'gecerli' 
              ? 'bg-emerald-950 text-emerald-100 border-emerald-500 shadow-md ring-2 ring-emerald-500/30' 
              : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Süresi Geçerli</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{stats.gecerli}</div>
          <span className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-1 block">Sorunsuz aktif</span>
        </div>

        {/* 1 Ay Kala Uyarısı (Yaklaşanlar) */}
        <div 
          onClick={() => setSeciliDurum('yaklasiyor')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            seciliDurum === 'yaklasiyor' 
              ? 'bg-amber-950 text-amber-100 border-amber-500 shadow-md ring-2 ring-amber-500/30' 
              : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">⚠️ 1 Ay Kala Uyarısı</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">{stats.yaklasiyor}</div>
          <span className="text-[11px] text-amber-600/70 dark:text-amber-400/70 mt-1 block">Dolmasına az kalanlar</span>
        </div>

        {/* Süresi Dolmuşlar */}
        <div 
          onClick={() => setSeciliDurum('suresi_doldu')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            seciliDurum === 'suresi_doldu' 
              ? 'bg-red-950 text-red-100 border-red-500 shadow-md ring-2 ring-red-500/30' 
              : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:border-red-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 dark:text-red-400">🚨 Süresi Dolmuş!</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400 mt-2">{stats.suresiDoldu}</div>
          <span className="text-[11px] text-red-600/70 dark:text-red-400/70 mt-1 block">Acil yenilenmeli</span>
        </div>
      </div>

      {/* ARAMA VE FİLTRELEME BARI */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Arama Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            placeholder="Ruhsat adı, kurum, no veya açıklama ara..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {aramaMetni && (
            <button 
              onClick={() => setAramaMetni('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Kategori Filtresi */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <select
            value={seciliKategori}
            onChange={(e) => setSeciliKategori(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="hepsi">Tüm Kategoriler</option>
            <option value="Çevre & Ses">🔊 Çevre &amp; Ses İzni</option>
            <option value="Duman & Baca">🏭 Duman &amp; Baca Ruhsatı</option>
            <option value="İşyeri & Belediye">🏢 İşyeri &amp; Belediye Ruhsatı</option>
            <option value="Yangın & İtfaiye">🚒 Yangın &amp; İtfaiye Belgesi</option>
            <option value="İSG & Periyodik Kontrol">🛡️ İSG Periyodik Kontrol</option>
            <option value="Makine & Ekipman Muayenesi">⚙️ Makine Muayenesi</option>
            <option value="Diğer">📄 Diğer Mutad İzinler</option>
          </select>

          {/* Görünüm Değiştirici */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 ml-auto">
            <button
              onClick={() => setGorunumModu('grid')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                gorunumModu === 'grid' 
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kartlar
            </button>
            <button
              onClick={() => setGorunumModu('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                gorunumModu === 'table' 
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tablo
            </button>
          </div>
        </div>
      </div>

      {/* RUHSAT LİSTESİ */}
      {filtrelenmisRuhsatlar.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <FileCheck className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Aranan Kriterlere Uygun Ruhsat Bulunamadı</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Henüz mutat ruhsat kaydı eklenmemiş veya arama kriterleriniz ile eşleşen bir belge bulunmuyor.
          </p>
          <button
            onClick={() => setEkleModalAcik(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Ruhsat Ekle</span>
          </button>
        </div>
      ) : gorunumModu === 'grid' ? (
        /* KART GÖRÜNÜMÜ */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrelenmisRuhsatlar.map((ruhsat) => {
            const { durum, kalanGun, etiket, renk } = getRuhsatDurumu(ruhsat);
            const belgeler = ruhsat.Belgeler || [];

            return (
              <div 
                key={ruhsat.Id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative ${
                  durum === 'SuresiDoldu' 
                    ? 'border-red-300 dark:border-red-900/60 ring-1 ring-red-500/20' 
                    : durum === 'Yaklasiyor'
                    ? 'border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Üst Kısım: Kategori ve Durum Etiketi */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {ruhsat.Kategori}
                    </span>
                  </div>

                  {/* Belge Adı ve Kurum */}
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug">
                    {ruhsat.BelgeAdi}
                  </h3>

                  {ruhsat.KurumMakam && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{ruhsat.KurumMakam}</span>
                      {ruhsat.RuhsatNo && <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 ml-1">#{ruhsat.RuhsatNo}</span>}
                    </p>
                  )}
                </div>

                {/* Orta Kısım: Tarihler ve Durum Rozeti */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-[11px] text-slate-400">Son Geçerlilik Tarihi:</span>
                    <span className="font-bold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      {formatTarihTR(ruhsat.BitisTarihi)}
                    </span>
                  </div>

                  {/* Durum Rozeti */}
                  <div className={`p-2 rounded-lg border font-extrabold text-xs flex items-center gap-1.5 justify-center text-center ${renk}`}>
                    {durum === 'SuresiDoldu' && <XCircle className="w-4 h-4 shrink-0 animate-bounce text-red-500" />}
                    {durum === 'Yaklasiyor' && <Clock className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />}
                    {durum === 'Gecerli' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />}
                    <span>{etiket}</span>
                  </div>
                </div>

                {/* Alt Notlar ve Sorumlu */}
                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {ruhsat.SorumluKisi && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Sorumlu: <strong className="text-slate-700 dark:text-slate-200">{ruhsat.SorumluKisi}</strong></span>
                    </div>
                  )}

                  {ruhsat.Aciklama && (
                    <p className="text-[11px] line-clamp-2 italic text-slate-600 dark:text-slate-400">
                      "{ruhsat.Aciklama}"
                    </p>
                  )}

                  {/* Ekler / Fotoğraflar */}
                  {belgeler.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">{belgeler.length} Adet Dosya/Ek</span>
                      <div className="flex items-center gap-1 ml-auto">
                        {belgeler.slice(0, 3).map((doc: any, idx: number) => {
                          const info = getFileInfo(doc);
                          if (info.isImage && info.content) {
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveDocViewer({ file: doc, name: info.name })}
                                className="h-7 min-w-7 max-w-14 rounded overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 flex items-center justify-center p-0.5 hover:ring-2 hover:ring-amber-500 transition cursor-pointer"
                                title={info.name}
                              >
                                <img src={info.content} alt={info.name} className="h-full w-auto max-w-full object-contain" />
                              </button>
                            );
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveDocViewer({ file: doc, name: info.name })}
                              className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-bold flex items-center justify-center hover:bg-amber-500 hover:text-white transition cursor-pointer"
                              title={info.name}
                            >
                              {info.ext.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Alt Aksiyon Butonları */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setYenileModalKayit(ruhsat)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                    title="Ruhsatı Yenile (Tarihi Uzat)"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ruhsatı Yenile</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDuzenleModalKayit(ruhsat)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer"
                      title="Düzenle"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSilModalKayit(ruhsat)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLO GÖRÜNÜMÜ */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider font-extrabold border-b border-slate-800">
                  <th className="p-3.5">Belge / Ruhsat Adı</th>
                  <th className="p-3.5">Kategori</th>
                  <th className="p-3.5">Kurum / Ruhsat No</th>
                  <th className="p-3.5">Son Geçerlilik</th>
                  <th className="p-3.5">Kalan Gün &amp; Durum</th>
                  <th className="p-3.5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                {filtrelenmisRuhsatlar.map((ruhsat) => {
                  const { durum, kalanGun, etiket, renk } = getRuhsatDurumu(ruhsat);

                  return (
                    <tr key={ruhsat.Id} className="hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 dark:text-white">{ruhsat.BelgeAdi}</div>
                        {ruhsat.SorumluKisi && <span className="text-[11px] text-slate-400">Sorumlu: {ruhsat.SorumluKisi}</span>}
                      </td>

                      <td className="p-3.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {ruhsat.Kategori}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        <div>{ruhsat.KurumMakam || '-'}</div>
                        {ruhsat.RuhsatNo && <span className="font-mono text-[10px] text-slate-400">#{ruhsat.RuhsatNo}</span>}
                      </td>

                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {formatTarihTR(ruhsat.BitisTarihi)}
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1 ${renk}`}>
                          {durum === 'SuresiDoldu' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                          {durum === 'Yaklasiyor' && <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />}
                          {durum === 'Gecerli' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                          <span>{etiket}</span>
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setYenileModalKayit(ruhsat)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
                            title="Yenile"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Yenile</span>
                          </button>
                          <button
                            onClick={() => setDuzenleModalKayit(ruhsat)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSilModalKayit(ruhsat)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* YENİ RUHSAT EKLEME MODALI */}
      {ekleModalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl md:max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Yeni Mutad Ruhsat / İzin Ekle</h3>
              </div>
              <button onClick={() => setEkleModalAcik(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIslemHatasi(null);
                setKaydediliyor(true);
                const form = e.target as any;
                try {
                  await onAddRuhsat({
                    BelgeAdi: form.belgeAdi.value,
                    Kategori: form.kategori.value as RuhsatKategori,
                    KurumMakam: form.kurumMakam.value,
                    RuhsatNo: form.ruhsatNo.value,
                    BaslangicTarihi: form.baslangicTarihi.value || bugunStr,
                    BitisTarihi: form.bitisTarihi.value,
                    UyariSuresiGun: Number(form.uyariSuresi.value) || 30,
                    SorumluKisi: form.sorumluKisi.value,
                    Aciklama: form.aciklama.value,
                    Belgeler: yeniBelgeler
                  });
                  setEkleModalAcik(false);
                  setYeniBelgeler([]);
                } catch (err: any) {
                  setIslemHatasi(err?.message || 'Ruhsat eklenirken bir hata oluştu.');
                } finally {
                  setKaydediliyor(false);
                }
              }}
              className="py-4 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm"
            >
              {islemHatasi && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl font-bold text-xs">{islemHatasi}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Ruhsat / Belge Adı *</label>
                  <input
                    name="belgeAdi"
                    required
                    placeholder="Örn: Ses ve Gürültü Emisyon Ruhsatı"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Kategori *</label>
                  <select name="kategori" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold">
                    <option value="Çevre & Ses">🔊 Çevre &amp; Ses İzni</option>
                    <option value="Duman & Baca">🏭 Duman &amp; Baca Ruhsatı</option>
                    <option value="İşyeri & Belediye">🏢 İşyeri &amp; Belediye Ruhsatı</option>
                    <option value="Yangın & İtfaiye">🚒 Yangın &amp; İtfaiye Belgesi</option>
                    <option value="İSG & Periyodik Kontrol">🛡️ İSG Periyodik Kontrol</option>
                    <option value="Makine & Ekipman Muayenesi">⚙️ Makine Muayenesi</option>
                    <option value="Diğer">📄 Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Düzenleyen Kurum / Makam</label>
                  <input
                    name="kurumMakam"
                    placeholder="Örn: Çevre ve Şehircilik İl Mülk. / Belediye"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Ruhsat / Belge No</label>
                  <input
                    name="ruhsatNo"
                    placeholder="Örn: R-2026-9812"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    name="baslangicTarihi"
                    defaultValue={bugunStr}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Bitiş / Son Geçerlilik Tarihi *</label>
                  <input
                    type="date"
                    name="bitisTarihi"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-amber-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Uyarı Süresi (Kaç Gün Kala Uyaracak?)</label>
                  <select name="uyariSuresi" defaultValue="30" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold">
                    <option value="15">15 Gün Kala Uyar</option>
                    <option value="30">30 Gün Kala Uyar (1 Ay)</option>
                    <option value="60">60 Gün Kala Uyar (2 Ay)</option>
                    <option value="90">90 Gün Kala Uyar (3 Ay)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Sorumlu Kişi / Birim</label>
                  <input
                    name="sorumluKisi"
                    placeholder="Örn: Fabrika Müdürü / İSG Uzmanı"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Açıklama / Notlar</label>
                <textarea
                  name="aciklama"
                  rows={3}
                  placeholder="Yenileme harcı, ölçüm istasyonu, ilgili mevzuat veya özel notlar..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm"
                />
              </div>

              {/* DOSYA YÜKLEME */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                    Ruhsat / Belge Dosyası veya Fotoğrafı Ekleyin ({yeniBelgeler.length})
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setRuhsatCameraTarget('ekle')}
                      className="cursor-pointer text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 font-bold text-xs bg-rose-50 dark:bg-rose-950/50 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-800/60"
                      title="Canlı kamera ile fotoğraf çek ve kırp"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Kamera ile Çek</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const files = await readImagesFromClipboardApi();
                          if (files.length > 0) {
                            await processFiles(files, false);
                          } else {
                            alert('Panoda yapıştırılacak resim veya ekran görüntüsü bulunamadı. Lütfen önce resmi kopyalayın (Ctrl+C veya Win+Shift+S).');
                          }
                        } catch (err: any) {
                          alert(err.message || 'Panodan resim okunamadı. Doğrudan Ctrl + V tuşlarına basarak yapıştırabilirsiniz.');
                        }
                      }}
                      className="cursor-pointer text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 font-bold text-xs bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/60"
                      title="Ekran görüntüsünü veya kopyalanan resmi panodan yapıştır (Ctrl+V)"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>Panodan Yapıştır (Ctrl+V)</span>
                    </button>

                    <label className="cursor-pointer text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1 font-bold text-xs bg-sky-50 dark:bg-sky-950/50 px-2 py-1 rounded-lg border border-sky-200 dark:border-sky-800/60" title="Galeriden veya cihazdan fotoğraf seç">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Fotoğraf Ekle</span>
                      <input type="file" accept="image/*" multiple onChange={(e) => handleDosyaYukle(e, false)} className="hidden" />
                    </label>

                    <label className="cursor-pointer text-amber-600 hover:underline flex items-center gap-1 font-bold text-xs bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800/60">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Dosya Seç</span>
                      <input type="file" multiple onChange={(e) => handleDosyaYukle(e, false)} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400">
                  💡 Ekran görüntüsü aldığınızda doğrudan <b>Ctrl + V</b> ile yapıştırabilirsiniz.
                </div>

                {yeniBelgeler.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {yeniBelgeler.map((doc, idx) => {
                      const isImg = doc.DosyaIcerigi && (doc.DosyaIcerigi.startsWith('data:image') || doc.DosyaAdi.match(/\.(jpg|jpeg|png|webp|gif)$/i));
                      return (
                        <div key={idx} className="relative group rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center gap-1.5 p-1 shadow-2xs">
                          {isImg ? (
                            <div className="h-10 min-w-10 max-w-20 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center p-0.5">
                              <img src={doc.DosyaIcerigi} alt={doc.DosyaAdi} className="h-full w-auto max-w-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-[10px]">
                              {doc.DosyaAdi.split('.').pop()?.toUpperCase() || 'BELGE'}
                            </div>
                          )}
                          <div className="text-[11px] font-semibold truncate max-w-[120px] pr-1">
                            {doc.DosyaAdi}
                          </div>
                          <button
                            type="button"
                            onClick={() => setYeniBelgeler(yeniBelgeler.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                            title="Dosyayı Kaldır"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEkleModalAcik(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={kaydediliyor}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {kaydediliyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                  <span>Ruhsatı Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RUHSATI YENİLE MODALI */}
      {yenileModalKayit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <RefreshCw className="w-5 h-5" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Ruhsatı Yenile</h3>
              </div>
              <button onClick={() => setYenileModalKayit(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                try {
                  await onYenileRuhsat(
                    yenileModalKayit.Id,
                    form.yeniBitisTarihi.value,
                    form.yenilemeAciklamasi.value
                  );
                  setYenileModalKayit(null);
                } catch (err: any) {
                  alert(err?.message || 'Yenileme sırasında hata oluştu.');
                }
              }}
              className="py-4 space-y-4 text-xs sm:text-sm"
            >
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60">
                <p className="font-bold text-amber-900 dark:text-amber-200">{yenileModalKayit.BelgeAdi}</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">Mevcut Bitiş Tarihi: {formatTarihTR(yenileModalKayit.BitisTarihi)}</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Yeni Bitiş Tarihi *</label>
                <input
                  type="date"
                  name="yeniBitisTarihi"
                  required
                  defaultValue={(() => {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() + 1);
                    return d.toISOString().split('T')[0];
                  })()}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-amber-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Yenileme Notu / Dekont Bilgisi</label>
                <input
                  name="yenilemeAciklamasi"
                  placeholder="Örn: 2026 yılı yenileme harcı yatırıldı, yeni belge alındı."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setYenileModalKayit(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Yenilemeyi Onayla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DÜZENLEME MODALI */}
      {duzenleModalKayit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl md:max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Ruhsat Kaydını Düzenle</h3>
              </div>
              <button onClick={() => setDuzenleModalKayit(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIslemHatasi(null);
                setKaydediliyor(true);
                const form = e.target as any;
                try {
                  await onUpdateRuhsat(duzenleModalKayit.Id, {
                    BelgeAdi: form.belgeAdi.value,
                    Kategori: form.kategori.value as RuhsatKategori,
                    KurumMakam: form.kurumMakam.value,
                    RuhsatNo: form.ruhsatNo.value,
                    BaslangicTarihi: form.baslangicTarihi.value,
                    BitisTarihi: form.bitisTarihi.value,
                    UyariSuresiGun: Number(form.uyariSuresi.value) || 30,
                    SorumluKisi: form.sorumluKisi.value,
                    Aciklama: form.aciklama.value,
                    Belgeler: duzenleModalKayit.Belgeler || []
                  });
                  setDuzenleModalKayit(null);
                } catch (err: any) {
                  setIslemHatasi(err?.message || 'Güncelleme sırasında bir hata oluştu.');
                } finally {
                  setKaydediliyor(false);
                }
              }}
              className="py-4 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Ruhsat / Belge Adı *</label>
                  <input
                    name="belgeAdi"
                    required
                    defaultValue={duzenleModalKayit.BelgeAdi}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Kategori *</label>
                  <select name="kategori" defaultValue={duzenleModalKayit.Kategori} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold">
                    <option value="Çevre & Ses">🔊 Çevre &amp; Ses İzni</option>
                    <option value="Duman & Baca">🏭 Duman &amp; Baca Ruhsatı</option>
                    <option value="İşyeri & Belediye">🏢 İşyeri &amp; Belediye Ruhsatı</option>
                    <option value="Yangın & İtfaiye">🚒 Yangın &amp; İtfaiye Belgesi</option>
                    <option value="İSG & Periyodik Kontrol">🛡️ İSG Periyodik Kontrol</option>
                    <option value="Makine & Ekipman Muayenesi">⚙️ Makine Muayenesi</option>
                    <option value="Diğer">📄 Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Düzenleyen Kurum / Makam</label>
                  <input
                    name="kurumMakam"
                    defaultValue={duzenleModalKayit.KurumMakam || ''}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Ruhsat / Belge No</label>
                  <input
                    name="ruhsatNo"
                    defaultValue={duzenleModalKayit.RuhsatNo || ''}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    name="baslangicTarihi"
                    defaultValue={duzenleModalKayit.BaslangicTarihi}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Bitiş / Son Geçerlilik Tarihi *</label>
                  <input
                    type="date"
                    name="bitisTarihi"
                    required
                    defaultValue={duzenleModalKayit.BitisTarihi}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-amber-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Uyarı Süresi (Kaç Gün Kala Uyaracak?)</label>
                  <select name="uyariSuresi" defaultValue={String(duzenleModalKayit.UyariSuresiGun || 30)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold">
                    <option value="15">15 Gün Kala Uyar</option>
                    <option value="30">30 Gün Kala Uyar (1 Ay)</option>
                    <option value="60">60 Gün Kala Uyar (2 Ay)</option>
                    <option value="90">90 Gün Kala Uyar (3 Ay)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Sorumlu Kişi / Birim</label>
                  <input
                    name="sorumluKisi"
                    defaultValue={duzenleModalKayit.SorumluKisi || ''}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Açıklama / Notlar</label>
                <textarea
                  name="aciklama"
                  rows={3}
                  defaultValue={duzenleModalKayit.Aciklama || ''}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm"
                />
              </div>

              {/* DOSYA & BELGE YÖNETİMİ */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                    Ekli Belgeler & Fotoğraflar ({(duzenleModalKayit.Belgeler || []).length})
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setRuhsatCameraTarget('duzenle')}
                      className="cursor-pointer text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 font-bold text-xs bg-rose-50 dark:bg-rose-950/50 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-800/60"
                      title="Canlı kamera ile fotoğraf çek ve kırp"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Kamera ile Çek</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const files = await readImagesFromClipboardApi();
                          if (files.length > 0) {
                            await processFiles(files, true);
                          } else {
                            alert('Panoda yapıştırılacak resim veya ekran görüntüsü bulunamadı. Lütfen önce resmi kopyalayın (Ctrl+C veya Win+Shift+S).');
                          }
                        } catch (err: any) {
                          alert(err.message || 'Panodan resim okunamadı. Doğrudan Ctrl + V tuşlarına basarak yapıştırabilirsiniz.');
                        }
                      }}
                      className="cursor-pointer text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 font-bold text-xs bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/60"
                      title="Ekran görüntüsünü veya kopyalanan resmi panodan yapıştır (Ctrl+V)"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>Panodan Yapıştır (Ctrl+V)</span>
                    </button>

                    <label className="cursor-pointer text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1 font-bold text-xs bg-sky-50 dark:bg-sky-950/50 px-2 py-1 rounded-lg border border-sky-200 dark:border-sky-800/60" title="Galeriden veya cihazdan fotoğraf seç">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Fotoğraf Ekle</span>
                      <input type="file" accept="image/*" multiple onChange={(e) => handleDosyaYukle(e, true)} className="hidden" />
                    </label>

                    <label className="cursor-pointer text-amber-600 hover:underline flex items-center gap-1 font-bold text-xs bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800/60">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Dosya Ekle</span>
                      <input type="file" multiple onChange={(e) => handleDosyaYukle(e, true)} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400">
                  💡 Ekran görüntüsü aldığınızda doğrudan <b>Ctrl + V</b> ile yapıştırabilirsiniz.
                </div>

                {(duzenleModalKayit.Belgeler || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
                    {(duzenleModalKayit.Belgeler || []).map((doc: any, idx: number) => {
                      const isImg = doc.DosyaIcerigi && (doc.DosyaIcerigi.startsWith('data:image') || doc.DosyaAdi.match(/\.(jpg|jpeg|png|webp|gif)$/i));
                      return (
                        <div key={idx} className="relative group rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center gap-1.5 p-1 shadow-2xs">
                          {isImg ? (
                            <div className="h-10 min-w-10 max-w-20 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center p-0.5">
                              <img src={doc.DosyaIcerigi} alt={doc.DosyaAdi} className="h-full w-auto max-w-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-[10px]">
                              {doc.DosyaAdi.split('.').pop()?.toUpperCase() || 'BELGE'}
                            </div>
                          )}
                          <div className="text-[11px] font-semibold truncate max-w-[120px] pr-1">
                            {doc.DosyaAdi}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (duzenleModalKayit.Belgeler || []).filter((_: any, i: number) => i !== idx);
                              setDuzenleModalKayit({ ...duzenleModalKayit, Belgeler: updated });
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                            title="Dosyayı Kaldır"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDuzenleModalKayit(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={kaydediliyor}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {kaydediliyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                  <span>Değişiklikleri Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SİLME MODALI */}
      {silModalKayit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Ruhsat Kaydını Sil</h3>
              <p className="text-xs text-slate-500 mt-1">
                "<strong className="text-slate-800 dark:text-slate-200">{silModalKayit.BelgeAdi}</strong>" isimli ruhsat kaydı sistemden kalıcı olarak silinecek.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSilModalKayit(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await onDeleteRuhsat(silModalKayit.Id);
                    setSilModalKayit(null);
                  } catch (err: any) {
                    alert(err?.message || 'Silme işlemi başarısız.');
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOSYA İNCELEME MODALI */}
      {activeDocViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 text-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col p-4 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-sm text-slate-200">{activeDocViewer.name}</h4>
              <button onClick={() => setActiveDocViewer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
              {getFileInfo(activeDocViewer.file).isImage ? (
                <img src={getFileInfo(activeDocViewer.file).content} alt={activeDocViewer.name} className="max-h-[70vh] object-contain rounded-xl" />
              ) : (
                <div className="text-center space-y-3">
                  <Paperclip className="w-12 h-12 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold">{activeDocViewer.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      const fileContent = getFileInfo(activeDocViewer.file).content;
                      guvenliDosyaIndir(fileContent, activeDocViewer.name);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer transition shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Dosyayı İndir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* CANLI KAMERA VE KIRPMA MODALI */}
      <CameraCaptureModal
        isOpen={ruhsatCameraTarget !== null}
        onClose={() => setRuhsatCameraTarget(null)}
        onCapture={handleRuhsatCameraCapture}
      />
    </div>
  );
};
