import React, { useState, useEffect } from 'react';
import { Arac, BakimKaydi, Personel } from '../types';
import { 
  Truck, 
  Plus, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  FileText, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Search,
  X,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  Paperclip,
  Download,
  Eye
} from 'lucide-react';
import { PersonelCombobox } from './PersonelCombobox';
import { formatTarihTR } from '../utils/dateUtils';

interface AraclarViewProps {
  araclar: Arac[];
  personeller?: Personel[];
  onSaveArac: (arac: Arac) => void;
  onAddBakim: (aracId: number, bakim: Partial<BakimKaydi>) => void;
  onUpdateBakim: (aracId: number, bakimId: number, bakim: Partial<BakimKaydi>) => void;
  onDeleteBakim: (aracId: number, bakimId: number) => void;
}

export const AraclarView: React.FC<AraclarViewProps> = ({
  araclar,
  personeller = [],
  onSaveArac,
  onAddBakim,
  onUpdateBakim,
  onDeleteBakim
}) => {
  const [yerelPersoneller, setYerelPersoneller] = useState<Personel[]>(personeller);

  useEffect(() => {
    if (personeller && personeller.length > 0) {
      setYerelPersoneller(personeller);
    } else {
      fetch('/api/personeller')
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setYerelPersoneller(d); })
        .catch(() => {});
    }
  }, [personeller]);

  const [filtre, setFiltre] = useState<'aktif' | 'pasif' | 'hepsi' | 'gecikmis' | 'yaklasan'>('aktif');
  const [aramaMetni, setAramaMetni] = useState('');
  
  // Bakım Geçmişi Modalı
  const [seciliAracBakimModal, setSeciliAracBakimModal] = useState<Arac | null>(null);
  const [duzenlenenBakim, setDuzenlenenBakim] = useState<BakimKaydi | null>(null);
  const [yeniBakimFormAcik, setYeniBakimFormAcik] = useState(false);
  const [bakimBelgeler, setBakimBelgeler] = useState<any[]>([]);
  const [lightboxDosya, setLightboxDosya] = useState<any | null>(null);

  // Kalan Sayaç ve Durum Rozeti Hesaplama
  const bakimDurumuHesapla = (a: Arac) => {
    const kalan = a.SonBakimKmVeyaSaat + a.BakimAraligiKmVeyaSaat - a.GuncelKmVeyaSaat;
    const birim = a.SaatTakibiMi ? 'Saat' : 'KM';
    const esik = a.SaatTakibiMi ? 50 : 1000;

    if (kalan <= 0) {
      return {
        durum: 'Gecikmis',
        renk: 'text-red-600 bg-red-50 border-red-200',
        metin: `${Math.abs(kalan)} ${birim} Gecikti!`,
        kalan,
        yuzde: 100
      };
    } else if (kalan <= esik) {
      return {
        durum: 'Yaklasiyor',
        renk: 'text-amber-600 bg-amber-50 border-amber-200',
        metin: `${kalan} ${birim} Kaldı`,
        kalan,
        yuzde: Math.round(((a.BakimAraligiKmVeyaSaat - kalan) / a.BakimAraligiKmVeyaSaat) * 100)
      };
    } else {
      return {
        durum: 'Normal',
        renk: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        metin: `${kalan} ${birim} Kaldı`,
        kalan,
        yuzde: Math.max(0, Math.round(((a.BakimAraligiKmVeyaSaat - kalan) / a.BakimAraligiKmVeyaSaat) * 100))
      };
    }
  };

  // Kritik Bakım Listeleri
  const gecikmisAraclar = araclar.filter(a => a.AktifMi && bakimDurumuHesapla(a).durum === 'Gecikmis');
  const yaklasanAraclar = araclar.filter(a => a.AktifMi && bakimDurumuHesapla(a).durum === 'Yaklasiyor');
  const toplamKritikBakim = gecikmisAraclar.length + yaklasanAraclar.length;

  // Güncel seçili aracı senkronize al
  const aktifSeciliArac = seciliAracBakimModal
    ? araclar.find(a => a.AracId === seciliAracBakimModal.AracId) || seciliAracBakimModal
    : null;

  const handleBakimDosyaYukle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const yeniBelge = {
          DosyaAdi: file.name,
          DosyaBoyutu: (file.size / 1024).toFixed(1) + ' KB',
          YuklemeTarihi: new Date().toISOString().split('T')[0],
          DosyaIcerigi: base64
        };
        setBakimBelgeler(prev => [...prev, yeniBelge]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const bakimDosyaSil = (index: number) => {
    setBakimBelgeler(prev => prev.filter((_, i) => i !== index));
  };

  // Araç Ekleme / Düzenleme Modalı
  const [aracFormAcik, setAracFormAcik] = useState(false);
  const [duzenlenenArac, setDuzenlenenArac] = useState<Arac | null>(null);
  const [formZimmetli, setFormZimmetli] = useState('');

  useEffect(() => {
    if (duzenlenenArac) {
      setFormZimmetli(duzenlenenArac.ZimmetliKisi || '');
    } else {
      setFormZimmetli('');
    }
  }, [duzenlenenArac, aracFormAcik]);

  // Filtreleme
  const filtrelenenAraclar = araclar.filter((a) => {
    let durumUygun = true;
    if (filtre === 'aktif') durumUygun = a.AktifMi;
    else if (filtre === 'pasif') durumUygun = !a.AktifMi;
    else if (filtre === 'gecikmis') durumUygun = a.AktifMi && bakimDurumuHesapla(a).durum === 'Gecikmis';
    else if (filtre === 'yaklasan') durumUygun = a.AktifMi && bakimDurumuHesapla(a).durum === 'Yaklasiyor';
    else if (filtre === 'hepsi') durumUygun = true;

    const aramaUygun =
      a.PlakaVeyaKod.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      a.MarkaModel.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      (a.ZimmetliKisi && a.ZimmetliKisi.toLowerCase().includes(aramaMetni.toLowerCase()));

    return durumUygun && aramaUygun;
  });

  // Sayısal Giriş Kontrolü (Global Politikamız: Harf ve sembol engeli)
  const sadeceRakamGiris = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      !/[0-9]/.test(e.key) &&
      e.key !== 'Backspace' &&
      e.key !== 'Delete' &&
      e.key !== 'ArrowLeft' &&
      e.key !== 'ArrowRight' &&
      e.key !== 'Tab'
    ) {
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Üst Bar: Başlık & Ekle Butonu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            <span>Araç &amp; Ekipman Bakım Yönetimi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            KM ve çalışma saati sayaçları, periyodik bakım geçmişi ve filo takibi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDuzenlenenArac(null);
              setAracFormAcik(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Araç / Ekipman Ekle</span>
          </button>
        </div>
      </div>

      {/* Kritik Bakım Uyarı Paneli (İSG Panelinde Olduğu Gibi) */}
      {toplamKritikBakim > 0 && (
        <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-rose-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm shadow-rose-500/30 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-rose-950 flex items-center gap-2">
                  <span>Filo &amp; Ekipman Kritik Bakım Uyarıları</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-extrabold">
                    {toplamKritikBakim} Araç / Ekipman
                  </span>
                </h2>
                <p className="text-xs text-rose-700 mt-0.5">
                  Periyodik KM veya çalışma saati dolan araçlar için acil bakım kaydı oluşturulmalıdır.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {gecikmisAraclar.length > 0 && (
                <button
                  onClick={() => setFiltre('gecikmis')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    filtre === 'gecikmis'
                      ? 'bg-rose-700 text-white shadow'
                      : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                  <span>{gecikmisAraclar.length} Acil Geciken</span>
                </button>
              )}
              {yaklasanAraclar.length > 0 && (
                <button
                  onClick={() => setFiltre('yaklasan')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    filtre === 'yaklasan'
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>{yaklasanAraclar.length} Bakımı Yaklaşan</span>
                </button>
              )}
              {filtre !== 'aktif' && (
                <button
                  onClick={() => setFiltre('aktif')}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 text-xs font-semibold transition"
                >
                  Filtreyi Sıfırla
                </button>
              )}
            </div>
          </div>

          {/* Acil Liste Özeti & Hızlı Bakım Butonu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {[...gecikmisAraclar, ...yaklasanAraclar].map((a) => {
              const b = bakimDurumuHesapla(a);
              const isGecikmis = b.durum === 'Gecikmis';
              return (
                <div
                  key={a.AracId}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 shadow-sm ${
                    isGecikmis
                      ? 'bg-white border-rose-300 text-rose-950'
                      : 'bg-white border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-900 px-1.5 py-0.5 rounded text-white">
                        {a.PlakaVeyaKod}
                      </span>
                      <span className="font-bold text-xs truncate text-slate-800">{a.MarkaModel}</span>
                    </div>
                    <div className={`text-[11px] font-bold mt-1 ${isGecikmis ? 'text-rose-600' : 'text-amber-600'}`}>
                      {b.metin}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSeciliAracBakimModal(a);
                      setDuzenlenenBakim(null);
                      setYeniBakimFormAcik(true);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                      isGecikmis
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                        : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                    }`}
                  >
                    + Bakım Ekle
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Arama & Aktif/Pasif Filtresi */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Plaka, kod, marka veya zimmetli personel ara..."
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0 flex-wrap">
          {gecikmisAraclar.length > 0 && (
            <button
              onClick={() => setFiltre('gecikmis')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                filtre === 'gecikmis'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Acil Bakım ({gecikmisAraclar.length})</span>
            </button>
          )}
          {yaklasanAraclar.length > 0 && (
            <button
              onClick={() => setFiltre('yaklasan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                filtre === 'yaklasan'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-600 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Yaklaşan ({yaklasanAraclar.length})</span>
            </button>
          )}
          <button
            onClick={() => setFiltre('aktif')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filtre === 'aktif'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Faal Araçlar ({araclar.filter(a => a.AktifMi).length})
          </button>
          <button
            onClick={() => setFiltre('pasif')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filtre === 'pasif'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Elden Çıkarılanlar ({araclar.filter(a => !a.AktifMi).length})
          </button>
          <button
            onClick={() => setFiltre('hepsi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filtre === 'hepsi'
                ? 'bg-slate-200 text-slate-800'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tümü
          </button>
        </div>
      </div>

      {/* Araç Kartları Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrelenenAraclar.map((arac) => {
          const bakim = bakimDurumuHesapla(arac);
          const birim = arac.SaatTakibiMi ? 'Saat' : 'KM';

          return (
            <div
              key={arac.AracId}
              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all relative flex flex-col justify-between ${
                !arac.AktifMi
                  ? 'border-slate-200 bg-slate-50/70 opacity-90'
                  : bakim.durum === 'Gecikmis'
                  ? 'border-red-300 ring-1 ring-red-200'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Üst Satır: Plaka & Durum */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 font-mono">
                      {arac.PlakaVeyaKod}
                    </span>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">
                      {arac.MarkaModel} • {arac.ModelYili}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      !arac.AktifMi
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : bakim.renk
                    }`}
                  >
                    {!arac.AktifMi ? 'Elden Çıkarıldı' : bakim.metin}
                  </span>
                </div>

                {/* Zimmet & Tür */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Araç Türü:</span>
                    <span className="font-semibold text-slate-800">{arac.AracTipi}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Zimmetli:</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {arac.ZimmetliKisi || 'Atanmadı'}
                    </span>
                  </div>
                </div>

                {/* Sayaç & Bakım İlerlemesi */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>
                      Sayaç: <strong className="text-slate-900">{arac.GuncelKmVeyaSaat.toLocaleString()} {birim}</strong>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Periyot: {arac.BakimAraligiKmVeyaSaat.toLocaleString()} {birim}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        bakim.durum === 'Gecikmis'
                          ? 'bg-red-600'
                          : bakim.durum === 'Yaklasiyor'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, bakim.yuzde)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Not Varsa Göster */}
                {arac.Notlar && (
                  <div className="mt-3 text-[11px] bg-amber-50/60 border border-amber-200/60 text-amber-900 p-2 rounded-lg leading-relaxed flex items-start gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{arac.Notlar}</span>
                  </div>
                )}
              </div>

              {/* Alt Butonlar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {/* Yanlışlıkla elden çıkarılan aracı geri aktif yapma butonu */}
                {!arac.AktifMi ? (
                  <button
                    onClick={() => {
                      const guncel = { ...arac, Durum: 'Faal', AktifMi: true };
                      onSaveArac(guncel);
                      alert(`${arac.PlakaVeyaKod} tekrar faal filoya alındı.`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Geri Aktif Yap</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSeciliAracBakimModal(arac);
                        setDuzenlenenBakim(null);
                        setBakimBelgeler([]);
                        setYeniBakimFormAcik(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Bu araca yeni bakım kaydı, fatura ve fotoğraf ekle"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Bakım Ekle</span>
                    </button>

                    <button
                      onClick={() => {
                        setSeciliAracBakimModal(arac);
                        setYeniBakimFormAcik(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Geçmiş bakım kayıtlarını ve ekli belgeleri incele"
                    >
                      <Wrench className="w-3.5 h-3.5 text-blue-600" />
                      <span>Geçmiş ({arac.BakimGecmisi?.length || 0})</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setDuzenlenenArac(arac);
                    setAracFormAcik(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  title="Araç Bilgilerini Düzenle"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* BAKIM GEÇMİŞİ MODALI (DÜZENLEME & SİLME DESTEKLİ) */}
      {aktifSeciliArac && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 font-mono">
                  {aktifSeciliArac.PlakaVeyaKod}
                </span>
                <h3 className="font-bold text-slate-900 text-base">Periyodik Bakım Geçmişi &amp; Belge Yönetimi</h3>
              </div>
              <div className="flex items-center gap-2">
                {!yeniBakimFormAcik && (
                  <button
                    onClick={() => {
                      setDuzenlenenBakim(null);
                      setBakimBelgeler([]);
                      setYeniBakimFormAcik(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Yeni Bakım Ekle (Fotoğraf &amp; Belge)</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setSeciliAracBakimModal(null);
                    setYeniBakimFormAcik(false);
                    setDuzenlenenBakim(null);
                    setBakimBelgeler([]);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Yeni Bakım Ekle / Düzenle Formu */}
            {yeniBakimFormAcik ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as any;
                  const data: Partial<BakimKaydi> = {
                    BakimTarihi: form.tarih.value,
                    YapilanKmVeyaSaat: Number(form.sayac.value),
                    Aciklama: form.aciklama.value,
                    Maliyet: Number(form.maliyet.value) || 0,
                    YapanUstaVeyaServis: form.servis.value,
                    Belgeler: bakimBelgeler,
                    FotoSayisi: bakimBelgeler.length
                  };

                  if (duzenlenenBakim) {
                    onUpdateBakim(aktifSeciliArac.AracId, duzenlenenBakim.BakimId, data);
                  } else {
                    onAddBakim(aktifSeciliArac.AracId, data);
                  }
                  setYeniBakimFormAcik(false);
                  setDuzenlenenBakim(null);
                  setBakimBelgeler([]);
                }}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs sm:text-sm overflow-y-auto max-h-[60vh]"
              >
                <h4 className="font-bold text-slate-800">
                  {duzenlenenBakim ? 'Bakım Kaydını Düzenle' : 'Yeni Bakım İşle'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Bakım Tarihi:</label>
                    <input
                      type="date"
                      name="tarih"
                      defaultValue={duzenlenenBakim?.BakimTarihi || new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {aktifSeciliArac.SaatTakibiMi ? 'Yapılan Saat:' : 'Yapılan KM:'}
                    </label>
                    <input
                      type="text"
                      name="sayac"
                      defaultValue={duzenlenenBakim?.YapilanKmVeyaSaat ?? aktifSeciliArac.GuncelKmVeyaSaat}
                      onKeyDown={sadeceRakamGiris}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Yapılan İşlemler / Açıklama:</label>
                  <input
                    type="text"
                    name="aciklama"
                    defaultValue={duzenlenenBakim?.Aciklama || 'Periyodik Bakım, Yağ & Filtre Değişimi'}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Maliyet (TL):</label>
                    <input
                      type="text"
                      name="maliyet"
                      defaultValue={duzenlenenBakim?.Maliyet ?? 0}
                      onKeyDown={sadeceRakamGiris}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Yapan Servis / Usta:</label>
                    <input
                      type="text"
                      name="servis"
                      defaultValue={duzenlenenBakim?.YapanUstaVeyaServis || 'Yetkili Servis'}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                {/* Çoklu Fotoğraf ve Belge Yükleme Alanı */}
                <div className="space-y-2 pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <Paperclip className="w-4 h-4 text-blue-600" />
                      Bakım Fotoğrafları, Fatura &amp; Servis Belgeleri:
                    </span>
                    <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {bakimBelgeler.length > 0 ? `${bakimBelgeler.length} Dosya Eklendi` : 'Çoklu Yükleme'}
                    </span>
                  </div>

                  {/* Belirgin Yükleme Alanı / Dropzone */}
                  <label className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center group shadow-inner">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-blue-700">
                      Fotoğraf veya Belge Eklemek İçin Tıklayın
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      Fatura, servis tutanağı, parça veya bakım fotoğrafları (JPG, PNG, PDF - Birden fazla seçebilirsiniz)
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleBakimDosyaYukle}
                      className="hidden"
                    />
                  </label>

                  {bakimBelgeler.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                      {bakimBelgeler.map((doc, idx) => {
                        const isImg = doc.DosyaIcerigi && (doc.DosyaIcerigi.startsWith('data:image') || doc.DosyaAdi.match(/\.(jpg|jpeg|png|webp|gif)$/i));
                        return (
                          <div key={idx} className="relative rounded-lg border border-slate-200 overflow-hidden bg-white h-20 flex flex-col justify-between shadow-xs group">
                            <div className="w-full h-14 overflow-hidden bg-slate-100 flex items-center justify-center">
                              {isImg ? (
                                <img
                                  src={doc.DosyaIcerigi}
                                  alt={doc.DosyaAdi}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover cursor-pointer"
                                  onClick={() => setLightboxDosya(doc)}
                                />
                              ) : (
                                <FileText className="w-6 h-6 text-slate-500" />
                              )}
                            </div>
                            <div className="px-1.5 py-0.5 bg-white border-t border-slate-100 flex items-center justify-between text-[10px] truncate text-slate-700">
                              <span className="truncate max-w-[70%]" title={doc.DosyaAdi}>{doc.DosyaAdi}</span>
                              <button
                                type="button"
                                onClick={() => bakimDosyaSil(idx)}
                                className="text-slate-400 hover:text-red-600"
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

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setYeniBakimFormAcik(false);
                      setDuzenlenenBakim(null);
                      setBakimBelgeler([]);
                    }}
                    className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 text-xs font-semibold"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                  >
                    {duzenlenenBakim ? 'Güncellemeyi Kaydet' : 'Bakımı Ekle'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setDuzenlenenBakim(null);
                    setBakimBelgeler([]);
                    setYeniBakimFormAcik(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Bakım İşle</span>
                </button>
              </div>
            )}

            {/* Geçmiş Tablosu */}
            <div className="overflow-y-auto max-h-64 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">Tarih</th>
                    <th className="p-2.5">Sayaç</th>
                    <th className="p-2.5">Açıklama</th>
                    <th className="p-2.5">Maliyet</th>
                    <th className="p-2.5">Belge &amp; Foto</th>
                    <th className="p-2.5 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aktifSeciliArac.BakimGecmisi && aktifSeciliArac.BakimGecmisi.length > 0 ? (
                    aktifSeciliArac.BakimGecmisi.map((b) => (
                      <tr key={b.BakimId} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-medium whitespace-nowrap">
                          {formatTarihTR(b.BakimTarihi)}
                        </td>
                        <td className="p-2.5 font-bold font-mono">
                          {b.YapilanKmVeyaSaat.toLocaleString()} {aktifSeciliArac.SaatTakibiMi ? 'Saat' : 'KM'}
                        </td>
                        <td className="p-2.5 font-medium text-slate-700">
                          <div>{b.Aciklama}</div>
                          {b.YapanUstaVeyaServis && (
                            <div className="text-[11px] text-slate-500">Servis: {b.YapanUstaVeyaServis}</div>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-slate-900 font-semibold whitespace-nowrap">
                          {b.Maliyet ? `${b.Maliyet.toLocaleString()} TL` : '-'}
                        </td>
                        <td className="p-2.5">
                          {b.Belgeler && b.Belgeler.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap max-w-[180px]">
                              {b.Belgeler.map((doc: any, docIdx: number) => {
                                const isImg = doc.DosyaIcerigi && (doc.DosyaIcerigi.startsWith('data:image') || doc.DosyaAdi.match(/\.(jpg|jpeg|png|webp|gif)$/i));
                                return (
                                  <button
                                    key={docIdx}
                                    type="button"
                                    onClick={() => setLightboxDosya(doc)}
                                    className="relative group w-7 h-7 rounded-md overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center hover:border-blue-500 transition-all shadow-xs"
                                    title={`${doc.DosyaAdi} (${doc.DosyaBoyutu || ''}) - Tıkla ve İncele`}
                                  >
                                    {isImg ? (
                                      <img src={doc.DosyaIcerigi} alt={doc.DosyaAdi} className="w-full h-full object-cover" />
                                    ) : (
                                      <FileText className="w-3.5 h-3.5 text-slate-600" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <Eye className="w-3 h-3 text-white" />
                                    </div>
                                  </button>
                                );
                              })}
                              <span className="text-[10px] text-slate-600 font-bold ml-0.5">
                                {b.Belgeler.length} dosya
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setDuzenlenenBakim(b);
                              setBakimBelgeler(b.Belgeler ? [...b.Belgeler] : []);
                              setYeniBakimFormAcik(true);
                            }}
                            className="p-1 rounded text-blue-600 hover:bg-blue-50 mr-1"
                            title="Düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Bu bakım kaydını silmek istediğinize emin misiniz?')) {
                                onDeleteBakim(aktifSeciliArac.AracId, b.BakimId);
                              }
                            }}
                            className="p-1 rounded text-red-600 hover:bg-red-50"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        Henüz kayıtlı bakım geçmişi bulunmuyor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setSeciliAracBakimModal(null);
                  setYeniBakimFormAcik(false);
                  setDuzenlenenBakim(null);
                  setBakimBelgeler([]);
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARAÇ EKLEME / DÜZENLEME MODALI */}
      {aracFormAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {duzenlenenArac ? 'Araç / Ekipman Bilgilerini Düzenle' : 'Yeni Araç / Ekipman Kartı'}
              </h3>
              <button onClick={() => setAracFormAcik(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as any;
                const saatTakibi = form.takipTuru.value === 'saat';
                const durum = form.durum.value;

                const yeni: Arac = {
                  AracId: duzenlenenArac?.AracId || Date.now(),
                  PlakaVeyaKod: form.plaka.value,
                  AracTipi: form.tur.value,
                  MarkaModel: form.marka.value,
                  ModelYili: Number(form.yil.value) || new Date().getFullYear(),
                  SasiSeriNo: form.sasi.value,
                  ZimmetliKisi: form.zimmet.value,
                  GuncelKmVeyaSaat: Number(form.guncelSayac.value) || 0,
                  BakimAraligiKmVeyaSaat: Number(form.aralikSayac.value) || (saatTakibi ? 250 : 10000),
                  BakimAraligiAy: Number(form.aralikAy.value) || 12,
                  SonBakimTarihi: form.sonBakimTarihi.value || new Date().toISOString().split('T')[0],
                  SonBakimKmVeyaSaat: Number(form.guncelSayac.value) || 0,
                  SaatTakibiMi: saatTakibi,
                  Durum: durum,
                  AktifMi: durum !== 'Elden Çıkarıldı / Satıldı',
                  Notlar: form.notlar.value,
                  BakimGecmisi: duzenlenenArac?.BakimGecmisi || []
                };

                onSaveArac(yeni);
                setAracFormAcik(false);
              }}
              className="space-y-3 text-xs sm:text-sm"
            >
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Plaka veya Ekipman Kodu:</label>
                <input
                  name="plaka"
                  defaultValue={duzenlenenArac?.PlakaVeyaKod || ''}
                  placeholder="Örn: 07 RND 45 veya FK-01"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Araç / Ekipman Türü:</label>
                  <select
                    name="tur"
                    defaultValue={duzenlenenArac?.AracTipi || 'Kamyonet / Sevkiyat'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="Kamyonet / Sevkiyat">Kamyonet / Sevkiyat</option>
                    <option value="Forklift (Dizel/Elektrik)">Forklift (Dizel/Elektrik)</option>
                    <option value="Otomobil (Binek)">Otomobil (Binek)</option>
                    <option value="Transpalet / Yükleyici">Transpalet / Yükleyici</option>
                    <option value="Tavan Vinci / Makine">Tavan Vinci / Makine</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Takip Birimi:</label>
                  <select
                    name="takipTuru"
                    defaultValue={duzenlenenArac?.SaatTakibiMi ? 'saat' : 'km'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white font-bold"
                  >
                    <option value="km">Kilometre (KM)</option>
                    <option value="saat">Çalışma Saati (Saat)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Marka &amp; Model:</label>
                  <input
                    name="marka"
                    defaultValue={duzenlenenArac?.MarkaModel || ''}
                    placeholder="Örn: Ford Transit 350L"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Model Yılı:</label>
                  <input
                    name="yil"
                    defaultValue={duzenlenenArac?.ModelYili || new Date().getFullYear()}
                    onKeyDown={sadeceRakamGiris}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Güncel Sayaç (KM / Saat):</label>
                  <input
                    name="guncelSayac"
                    defaultValue={duzenlenenArac?.GuncelKmVeyaSaat ?? 0}
                    onKeyDown={sadeceRakamGiris}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bakım Periyodu (KM / Saat):</label>
                  <input
                    name="aralikSayac"
                    defaultValue={duzenlenenArac?.BakimAraligiKmVeyaSaat ?? 10000}
                    onKeyDown={sadeceRakamGiris}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <PersonelCombobox
                    name="zimmet"
                    label="Zimmetli Personel:"
                    personeller={yerelPersoneller}
                    value={formZimmetli}
                    onChange={(val) => setFormZimmetli(val)}
                    placeholder="Personel seçin veya yazın..."
                    helperText="Çalışanlarımız arasından seçebilir veya özel yazabilirsiniz."
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Durum:</label>
                  <select
                    name="durum"
                    defaultValue={duzenlenenArac?.Durum || 'Faal'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="Faal">Faal</option>
                    <option value="Bakımda / Serviste">Bakımda / Serviste</option>
                    <option value="Arızalı">Arızalı</option>
                    <option value="Elden Çıkarıldı / Satıldı">Elden Çıkarıldı / Satıldı</option>
                  </select>
                </div>
              </div>

              <input type="hidden" name="sasi" defaultValue={duzenlenenArac?.SasiSeriNo || ''} />
              <input type="hidden" name="aralikAy" defaultValue={duzenlenenArac?.BakimAraligiAy || 12} />
              <input type="hidden" name="sonBakimTarihi" defaultValue={duzenlenenArac?.SonBakimTarihi || ''} />

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Araç Notları:</label>
                <textarea
                  name="notlar"
                  rows={2}
                  defaultValue={duzenlenenArac?.Notlar || ''}
                  placeholder="Kritik parça değişimleri, lastik durumu vb."
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAracFormAcik(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                >
                  {duzenlenenArac ? 'Değişiklikleri Kaydet' : 'Aracı Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX (FOTOĞRAF VE BELGE TAM BOY İNCELEME) MODALI */}
      {lightboxDosya && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
            <div className="flex items-center justify-between p-4 bg-slate-950/40 text-white shrink-0">
              <span className="text-xs font-bold truncate max-w-[60%] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                {lightboxDosya.DosyaAdi} {lightboxDosya.DosyaBoyutu ? `(${lightboxDosya.DosyaBoyutu})` : ''}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxDosya.DosyaIcerigi || lightboxDosya.base64}
                  download={lightboxDosya.DosyaAdi}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
                  title="Belgeyi / Görseli İndir"
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

            <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 min-h-[50vh] max-h-[75vh]">
              {lightboxDosya.DosyaIcerigi && (lightboxDosya.DosyaIcerigi.startsWith('data:image') || lightboxDosya.DosyaAdi.match(/\.(jpg|jpeg|png|webp|gif)$/i)) ? (
                <img
                  src={lightboxDosya.DosyaIcerigi || lightboxDosya.base64}
                  alt={lightboxDosya.DosyaAdi}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-xl"
                />
              ) : (
                <div className="text-center p-8 text-white space-y-3">
                  <FileText className="w-16 h-16 text-blue-400 mx-auto" />
                  <p className="font-semibold text-sm">{lightboxDosya.DosyaAdi}</p>
                  <a
                    href={lightboxDosya.DosyaIcerigi}
                    download={lightboxDosya.DosyaAdi}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition"
                  >
                    <Download className="w-4 h-4" />
                    Belgeyi İndir ve Görüntüle
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
