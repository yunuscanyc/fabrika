import React, { useState, useEffect } from 'react';
import { Makine, Personel } from '../types';
import { 
  Cog, 
  Plus, 
  Search, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  History, 
  Settings2,
  Calendar,
  Layers,
  Paperclip,
  Image as ImageIcon,
  Download,
  X,
  Eye,
  FileText,
  Trash2,
  Edit
} from 'lucide-react';
import { MakineBakimModal } from './MakineBakimModal';
import { PersonelCombobox } from './PersonelCombobox';

export function formatTrDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  if (dateStr.includes('.') && dateStr.split('.').length === 3) {
    return dateStr;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    }
  } catch (e) {}
  return dateStr;
}

interface MakineViewProps {
  makineler: Makine[];
  personeller?: Personel[];
  onRefresh: () => void;
}

export const MakineView: React.FC<MakineViewProps> = ({ makineler, personeller = [], onRefresh }) => {
  const [arama, setArama] = useState('');
  const [yerelPersoneller, setYerelPersoneller] = useState<Personel[]>(personeller);

  useEffect(() => {
    if (personeller && personeller.length > 0) {
      setYerelPersoneller(personeller);
    } else {
      fetch('/api/personeller')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setYerelPersoneller(data); })
        .catch(() => {});
    }
  }, [personeller]);
  const [turFiltre, setTurFiltre] = useState('Tümü');
  const [aktiflikFiltre, setAktiflikFiltre] = useState<'aktif' | 'arsiv' | 'hepsi' | 'acil' | 'yaklasan'>('aktif');

  const [seciliMakine, setSeciliMakine] = useState<Makine | null>(null);
  const [bakimModalAcik, setBakimModalAcik] = useState(false);
  const [yeniMakineModalAcik, setYeniMakineModalAcik] = useState(false);
  const [gecmisModalMakine, setGecmisModalMakine] = useState<Makine | null>(null);
  const [lightboxDosya, setLightboxDosya] = useState<any | null>(null);

  const [duzenlenecekMakine, setDuzenlenecekMakine] = useState<Makine | null>(null);

  const aktifGecmisMakine = gecmisModalMakine
    ? (makineler.find(m => m.MakineId === gecmisModalMakine.MakineId) || gecmisModalMakine)
    : null;

  // Kritik Makine Bakım Hesaplamaları
  const acilMakineler = makineler.filter(m => {
    if (m.AktifMi === false) return false;
    const kalanSaat = (m.SonBakimSaati + m.BakimAraligiSaat) - m.GuncelCalismaSaati;
    return kalanSaat <= 0;
  });

  const yaklasanMakineler = makineler.filter(m => {
    if (m.AktifMi === false) return false;
    const kalanSaat = (m.SonBakimSaati + m.BakimAraligiSaat) - m.GuncelCalismaSaati;
    return kalanSaat > 0 && kalanSaat <= 25;
  });

  const toplamKritikMakine = acilMakineler.length + yaklasanMakineler.length;

  const turler = Array.from(new Set(makineler.map(m => m.MakineTuru).filter(Boolean)));

  const filtrelenmis = makineler.filter(m => {
    const matchArama = 
      m.MakineAdi.toLowerCase().includes(arama.toLowerCase()) ||
      m.MakineKodu.toLowerCase().includes(arama.toLowerCase()) ||
      (m.MarkaModel && m.MarkaModel.toLowerCase().includes(arama.toLowerCase()));
    const matchTur = turFiltre === 'Tümü' || m.MakineTuru === turFiltre;
    
    const matchAktif = 
      aktiflikFiltre === 'hepsi' ? true :
      aktiflikFiltre === 'aktif' ? m.AktifMi !== false :
      aktiflikFiltre === 'arsiv' ? m.AktifMi === false :
      aktiflikFiltre === 'acil' ? (m.AktifMi !== false && ((m.SonBakimSaati + m.BakimAraligiSaat) - m.GuncelCalismaSaati <= 0)) :
      (m.AktifMi !== false && ((m.SonBakimSaati + m.BakimAraligiSaat) - m.GuncelCalismaSaati > 0 && (m.SonBakimSaati + m.BakimAraligiSaat) - m.GuncelCalismaSaati <= 25));

    return matchArama && matchTur && matchAktif;
  });
  const [formKod, setFormKod] = useState('');
  const [formAd, setFormAd] = useState('');
  const [formTur, setFormTur] = useState('CNC İşleme Merkezi');
  const [formMarka, setFormMarka] = useState('');
  const [formKonum, setFormKonum] = useState('Fabrika / İmalat');
  const [formSorumlu, setFormSorumlu] = useState('');
  const [formGuncelSaat, setFormGuncelSaat] = useState(0);
  const [formBakimAraligi, setFormBakimAraligi] = useState(250);
  const [formNotlar, setFormNotlar] = useState('');
  const [formAktifMi, setFormAktifMi] = useState(true);
  const [formDurum, setFormDurum] = useState('Faal');
  const [islemSuruyor, setIslemSuruyor] = useState(false);

  // Bakım Düzenleme ve Silme State
  const [duzenlenenBakimId, setDuzenlenenBakimId] = useState<number | null>(null);
  const [editBakimTarih, setEditBakimTarih] = useState('');
  const [editBakimSaat, setEditBakimSaat] = useState(0);
  const [editBakimTur, setEditBakimTur] = useState('250 Saatlik Periyodik Bakım');
  const [editBakimYapan, setEditBakimYapan] = useState('');
  const [editBakimMaliyet, setEditBakimMaliyet] = useState(0);
  const [editBakimParcalar, setEditBakimParcalar] = useState('');
  const [editBakimAciklama, setEditBakimAciklama] = useState('');
  const [editBakimBelgeler, setEditBakimBelgeler] = useState<any[]>([]);

  const handleBakimDuzenlemeBaslat = (b: any) => {
    setDuzenlenenBakimId(b.BakimId);
    setEditBakimTarih(b.BakimTarihi);
    setEditBakimSaat(b.YapildigiSaat);
    setEditBakimTur(b.BakimTuru);
    setEditBakimYapan(b.BakimiYapan || '');
    setEditBakimMaliyet(b.Maliyet || 0);
    setEditBakimParcalar(b.DegisenParcalar || '');
    setEditBakimAciklama(b.Aciklama || '');
    setEditBakimBelgeler(b.Belgeler || []);
  };

  const handleBakimDuzenlemeKaydet = async (bakimId: number) => {
    if (!aktifGecmisMakine) return;
    setIslemSuruyor(true);
    try {
      const res = await fetch(`/api/makineler/${aktifGecmisMakine.MakineId}/bakimlar/${bakimId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          BakimTarihi: editBakimTarih,
          YapildigiSaat: Number(editBakimSaat),
          BakimTuru: editBakimTur,
          BakimiYapan: editBakimYapan,
          Maliyet: Number(editBakimMaliyet),
          DegisenParcalar: editBakimParcalar,
          Aciklama: editBakimAciklama,
          Belgeler: editBakimBelgeler
        })
      });
      if (res.ok) {
        setDuzenlenenBakimId(null);
        onRefresh();
      } else {
        alert('Bakım güncelleme hatası');
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setIslemSuruyor(false);
    }
  };

  const handleBakimSil = async (bakimId: number) => {
    if (!aktifGecmisMakine) return;
    if (!window.confirm('Bu bakım kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    setIslemSuruyor(true);
    try {
      const res = await fetch(`/api/makineler/${aktifGecmisMakine.MakineId}/bakimlar/${bakimId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert('Bakım kaydı silinemedi');
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setIslemSuruyor(false);
    }
  };

  const handleYeniEkle = () => {
    setDuzenlenecekMakine(null);
    setFormKod(`MAK-${String(makineler.length + 1).padStart(2, '0')}`);
    setFormAd('');
    setFormTur('CNC İşleme Merkezi');
    setFormMarka('');
    setFormKonum('Fabrika / İmalat');
    setFormSorumlu('');
    setFormGuncelSaat(0);
    setFormBakimAraligi(250);
    setFormNotlar('');
    setFormAktifMi(true);
    setFormDurum('Faal');
    setYeniMakineModalAcik(true);
  };

  const handleDuzenle = (m: Makine) => {
    setDuzenlenecekMakine(m);
    setFormKod(m.MakineKodu);
    setFormAd(m.MakineAdi);
    setFormTur(m.MakineTuru);
    setFormMarka(m.MarkaModel || '');
    setFormKonum(m.KonumBolum || 'Fabrika / İmalat');
    setFormSorumlu(m.SorumluUsta || '');
    setFormGuncelSaat(m.GuncelCalismaSaati);
    setFormBakimAraligi(m.BakimAraligiSaat);
    setFormNotlar(m.Notlar || '');
    setFormAktifMi(m.AktifMi !== false);
    setFormDurum(m.Durum || 'Faal');
    setYeniMakineModalAcik(true);
  };

  const handleYeniKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIslemSuruyor(true);
    try {
      const payload = {
        MakineKodu: formKod,
        MakineAdi: formAd,
        MakineTuru: formTur,
        MarkaModel: formMarka,
        KonumBolum: formKonum,
        SorumluUsta: formSorumlu,
        GuncelCalismaSaati: Number(formGuncelSaat),
        BakimAraligiSaat: Number(formBakimAraligi),
        Notlar: formNotlar,
        AktifMi: formAktifMi,
        Durum: formDurum,
        ...(duzenlenecekMakine ? {} : {
          SonBakimSaati: Number(formGuncelSaat),
          SonBakimTarihi: new Date().toISOString().split('T')[0]
        })
      };

      const url = duzenlenecekMakine ? `/api/makineler/${duzenlenecekMakine.MakineId}` : '/api/makineler';
      const method = duzenlenecekMakine ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setYeniMakineModalAcik(false);
      setDuzenlenecekMakine(null);
      onRefresh();
    } catch (err: any) {
      alert('Kayıt hatası: ' + err.message);
    } finally {
      setIslemSuruyor(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Buton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Cog className="w-6 h-6 text-amber-400 animate-spin-slow" />
            <h1 className="text-xl font-bold text-white tracking-wide">Fabrika Makineleri & Ekipmanlar</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            CNC işleme merkezleri, kenar bantlama, yatar daire motor çalışma saatleri ve 250 saatlik periyodik bakımlar
          </p>
        </div>

        <button
          onClick={handleYeniEkle}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          Yeni Makine Tanımla
        </button>
      </div>

      {/* Kritik Periyodik Bakım Uyarı Paneli */}
      {toplamKritikMakine > 0 && (
        <div className="bg-rose-950/40 border-2 border-rose-500/70 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-rose-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/40 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Makineler Kritik Periyodik Bakım Uyarıları</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-extrabold">
                    {toplamKritikMakine} Makine
                  </span>
                </h2>
                <p className="text-xs text-rose-300 mt-0.5">
                  250 saatlik periyodik çalışma süresi dolan veya yaklaşan makineler için servis &amp; bakım kaydı gereklidir.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {acilMakineler.length > 0 && (
                <button
                  onClick={() => setAktiflikFiltre('acil')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    aktiflikFiltre === 'acil'
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-rose-900/40 text-rose-300 border border-rose-700/60 hover:bg-rose-800/60'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
                  <span>{acilMakineler.length} Acil Bakım</span>
                </button>
              )}
              {yaklasanMakineler.length > 0 && (
                <button
                  onClick={() => setAktiflikFiltre('yaklasan')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    aktiflikFiltre === 'yaklasan'
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-amber-900/40 text-amber-300 border border-amber-700/60 hover:bg-amber-800/60'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{yaklasanMakineler.length} Bakım Yakın</span>
                </button>
              )}
              {aktiflikFiltre !== 'aktif' && (
                <button
                  onClick={() => setAktiflikFiltre('aktif')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Filtreyi Sıfırla
                </button>
              )}
            </div>
          </div>

          {/* Acil Liste Özeti & Hızlı Bakım Butonu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {[...acilMakineler, ...yaklasanMakineler].map((m) => {
              const hedefSaat = m.SonBakimSaati + m.BakimAraligiSaat;
              const kalanSaat = hedefSaat - m.GuncelCalismaSaati;
              const isAcil = kalanSaat <= 0;

              return (
                <div
                  key={m.MakineId}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 shadow-sm ${
                    isAcil
                      ? 'bg-slate-900/90 border-rose-500/60 text-rose-100'
                      : 'bg-slate-900/90 border-amber-500/60 text-amber-100'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-800 px-1.5 py-0.5 rounded text-amber-400 border border-slate-700">
                        {m.MakineKodu}
                      </span>
                      <span className="font-bold text-xs truncate text-white">{m.MakineAdi}</span>
                    </div>
                    <div className={`text-[11px] font-bold mt-1 ${isAcil ? 'text-rose-400' : 'text-amber-400'}`}>
                      {isAcil ? `${Math.abs(kalanSaat)} saat gecikti!` : `${kalanSaat} saat kaldı`}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSeciliMakine(m);
                      setBakimModalAcik(true);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                      isAcil
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow'
                        : 'bg-amber-600 hover:bg-amber-500 text-white shadow'
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

      {/* Arama & Filtre */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Makine adı, kodu veya model ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        {turler.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Tür:</span>
            <select
              value={turFiltre}
              onChange={(e) => setTurFiltre(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none"
            >
              <option value="Tümü">Tüm Makine Türleri</option>
              {turler.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Arşiv Durumu:</span>
          <select
            value={aktiflikFiltre}
            onChange={(e) => setAktiflikFiltre(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
          >
            <option value="aktif">Aktif Makineler</option>
            {acilMakineler.length > 0 && (
              <option value="acil">🔴 Acil Bakım ({acilMakineler.length})</option>
            )}
            {yaklasanMakineler.length > 0 && (
              <option value="yaklasan">🟠 Bakımı Yaklaşan ({yaklasanMakineler.length})</option>
            )}
            <option value="arsiv">Arşivlenmiş Makineler</option>
            <option value="hepsi">Tüm Makineler</option>
          </select>
        </div>
      </div>

      {/* Makine Kartları Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtrelenmis.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-xl">
            Kayıtlı makine bulunamadı.
          </div>
        ) : (
          filtrelenmis.map((m) => {
            const hedefSaat = m.SonBakimSaati + m.BakimAraligiSaat;
            const kalanSaat = hedefSaat - m.GuncelCalismaSaati;
            const yuzde = Math.min(100, Math.max(0, ((m.GuncelCalismaSaati - m.SonBakimSaati) / m.BakimAraligiSaat) * 100));

            const acilBakim = kalanSaat <= 0;
            const yakinBakim = kalanSaat > 0 && kalanSaat <= 25;

            return (
              <div 
                key={m.MakineId}
                className={`bg-slate-900 border rounded-xl p-5 shadow-lg flex flex-col justify-between transition ${
                  acilBakim ? 'border-rose-700/80 bg-rose-950/10' :
                  yakinBakim ? 'border-amber-700/80 bg-amber-950/10' :
                  'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Kart Başlığı */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400">
                          {m.MakineKodu}
                        </span>
                        <span className="text-xs text-slate-400">{m.KonumBolum || 'Fabrika'}</span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">{m.MakineAdi}</h3>
                      <p className="text-xs text-slate-400">{m.MakineTuru} • {m.MarkaModel || '-'}</p>
                    </div>

                    <div className="text-right">
                      {m.AktifMi === false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-slate-950 text-slate-400 border border-slate-800">
                          Arşivlendi
                        </span>
                      ) : acilBakim ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-extrabold bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          ACİL BAKIM!
                        </span>
                      ) : yakinBakim ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          Bakım Yakın
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Faal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Çalışma Saati & Bakım İlerlemesi */}
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Çalışma Saati:</span>
                      <span className="font-mono font-bold text-white">{m.GuncelCalismaSaati} Saat</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          acilBakim ? 'bg-rose-500' :
                          yakinBakim ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${yuzde}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Son: {m.SonBakimSaati}s</span>
                      <span className={`font-semibold ${acilBakim ? 'text-rose-400' : yakinBakim ? 'text-amber-400' : 'text-slate-400'}`}>
                        {acilBakim ? `${Math.abs(kalanSaat)} saat geçti!` : `${kalanSaat} saat kaldı`}
                      </span>
                    </div>
                  </div>

                  {/* Bilgi Rozetleri */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500 block">Sorumlu:</span>
                      <span className="text-slate-300 font-medium">{m.SorumluUsta || 'Atanmadı'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Periyot:</span>
                      <span className="text-slate-300 font-medium">{m.BakimAraligiSaat} Saat</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Son Bakım Tarihi:</span>
                      <span className="text-slate-300 font-medium">{formatTrDate(m.SonBakimTarihi)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Durum:</span>
                      <span className="text-slate-300 font-medium">{m.Durum}</span>
                    </div>
                  </div>

                  {/* Notlar */}
                  {m.Notlar && (
                    <div className="mt-3 p-2 bg-slate-950 rounded border border-slate-800/60 text-[11px] text-slate-400 max-h-16 overflow-y-auto">
                      <strong className="text-slate-500">Not: </strong>{m.Notlar}
                    </div>
                  )}
                </div>

                {/* Alt Aksiyon Butonları */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setGecmisModalMakine(m)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
                  >
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    Geçmiş ({m.BakimGecmisi?.length || 0})
                  </button>

                  <button
                    onClick={() => handleDuzenle(m)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg transition"
                    title="Makine bilgilerini düzenle, arşive kaldır veya not ekle"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Düzenle
                  </button>

                  <button
                    onClick={() => {
                      setSeciliMakine(m);
                      setBakimModalAcik(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition shadow"
                    title="Bu makineye bakım kaydı, servis formu ve fotoğraf ekle"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Bakım Ekle
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bakım Geçmişi Modalı */}
      {aktifGecmisMakine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                {aktifGecmisMakine.MakineAdi} - Bakım Geçmişi
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const target = aktifGecmisMakine;
                    setGecmisModalMakine(null);
                    setSeciliMakine(target);
                    setBakimModalAcik(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition shadow"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>+ Yeni Bakım Ekle</span>
                </button>
                <button onClick={() => setGecmisModalMakine(null)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">✕</button>
              </div>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {!aktifGecmisMakine.BakimGecmisi || aktifGecmisMakine.BakimGecmisi.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm space-y-3">
                  <p>Bu makineye ait geçmiş bakım kaydı bulunamadı.</p>
                  <button
                    onClick={() => {
                      const target = aktifGecmisMakine;
                      setGecmisModalMakine(null);
                      setSeciliMakine(target);
                      setBakimModalAcik(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition shadow"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>İlk Bakım Kaydını &amp; Fotoğrafları Ekle</span>
                  </button>
                </div>
              ) : (
                aktifGecmisMakine.BakimGecmisi.map((b) => {
                  const isEditing = duzenlenenBakimId === b.BakimId;

                  if (isEditing) {
                    return (
                      <div key={b.BakimId} className="p-4 bg-slate-950 border border-slate-700 rounded-xl space-y-3">
                        <div className="text-xs font-bold text-amber-400 border-b border-slate-800 pb-1 flex justify-between">
                          <span>Bakım Kaydını Düzenle</span>
                          <span className="font-mono text-slate-500">ID: {b.BakimId}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block font-bold">Bakım Tarihi</label>
                            <input
                              type="date"
                              value={editBakimTarih}
                              onChange={(e) => setEditBakimTarih(e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block font-bold">Yapıldığı Saat</label>
                            <input
                              type="number"
                              value={editBakimSaat}
                              onChange={(e) => setEditBakimSaat(Number(e.target.value))}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block font-bold">Bakım Türü</label>
                            <input
                              type="text"
                              value={editBakimTur}
                              onChange={(e) => setEditBakimTur(e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block font-bold">Bakımı Yapan</label>
                            <input
                              type="text"
                              value={editBakimYapan}
                              onChange={(e) => setEditBakimYapan(e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block font-bold">Maliyet (TL)</label>
                            <input
                              type="number"
                              value={editBakimMaliyet}
                              onChange={(e) => setEditBakimMaliyet(Number(e.target.value))}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block font-bold">Değişen Parçalar</label>
                            <input
                              type="text"
                              value={editBakimParcalar}
                              onChange={(e) => setEditBakimParcalar(e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 block font-bold">Açıklama</label>
                          <textarea
                            value={editBakimAciklama}
                            onChange={(e) => setEditBakimAciklama(e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => setDuzenlenenBakimId(null)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs rounded transition"
                          >
                            İptal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBakimDuzenlemeKaydet(b.BakimId)}
                            disabled={islemSuruyor}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded transition"
                          >
                            {islemSuruyor ? 'Kaydediliyor...' : 'Kaydet'}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={b.BakimId} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-amber-400">{b.BakimTuru}</span>
                            <span className="font-mono text-slate-400">{formatTrDate(b.BakimTarihi)} • {b.YapildigiSaat} Saat</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            type="button"
                            onClick={() => handleBakimDuzenlemeBaslat(b)}
                            className="text-slate-400 hover:text-amber-400 p-1 rounded hover:bg-slate-900 transition"
                            title="Bakım kaydını düzenle"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBakimSil(b.BakimId)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-900 transition"
                            title="Bakım kaydını sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-300">
                        <span className="text-slate-500">Yapan: </span>{b.BakimiYapan || '-'}
                        {b.Maliyet > 0 && <span className="ml-3 text-emerald-400 font-semibold">{b.Maliyet.toLocaleString()} TL</span>}
                      </div>
                      {b.DegisenParcalar && (
                        <div className="text-xs text-slate-400">
                          <span className="text-slate-500">Değişen Parçalar: </span>{b.DegisenParcalar}
                        </div>
                      )}
                      {b.Aciklama && (
                        <p className="text-xs italic text-slate-400 pt-1 border-t border-slate-800/60">{b.Aciklama}</p>
                      )}

                      {/* Fotoğraf & Belge Listesi */}
                      {b.Belgeler && b.Belgeler.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/60">
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1.5 font-medium">
                            <Paperclip className="w-3 h-3 text-amber-400" />
                            <span>Ekli Belgeler &amp; Fotoğraflar ({b.Belgeler.length}):</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {b.Belgeler.map((doc: any, docIdx: number) => {
                              const isImg = doc.DosyaIcerigi && (doc.DosyaIcerigi.startsWith('data:image') || doc.DosyaAdi.match(/\.(jpg|jpeg|png|webp|gif)$/i));
                              return (
                                <button
                                  key={docIdx}
                                  type="button"
                                  onClick={() => setLightboxDosya(doc)}
                                  className="relative group w-10 h-10 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center hover:border-amber-500 transition-all shadow-xs"
                                  title={`${doc.DosyaAdi} (${doc.DosyaBoyutu || ''})`}
                                >
                                  {isImg ? (
                                    <img src={doc.DosyaIcerigi} alt={doc.DosyaAdi} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-slate-400" />
                                  )}
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
              <button onClick={() => setGecmisModalMakine(null)} className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Makine Tanımlama Modalı */}
      {yeniMakineModalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                {duzenlenecekMakine ? 'Makine Bilgilerini Düzenle' : 'Yeni Makine Tanımla'}
              </h2>
              <button onClick={() => setYeniMakineModalAcik(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleYeniKaydet} className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Makine Kodu *</label>
                  <input
                    type="text"
                    required
                    value={formKod}
                    onChange={(e) => setFormKod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-amber-400 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Makine Adı *</label>
                  <input
                    type="text"
                    required
                    value={formAd}
                    onChange={(e) => setFormAd(e.target.value)}
                    placeholder="Örn: 5 Eksen CNC Freze"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Makine Türü</label>
                  <select
                    value={formTur}
                    onChange={(e) => setFormTur(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="CNC İşleme Merkezi">CNC İşleme Merkezi</option>
                    <option value="Kenar Bantlama Makinesi">Kenar Bantlama Makinesi</option>
                    <option value="Yatar Daire Testere">Yatar Daire Testere</option>
                    <option value="Çoklu Delik Makinesi">Çoklu Delik Makinesi</option>
                    <option value="Kalibre Zımpara">Kalibre Zımpara</option>
                    <option value="Vidalı Kompresör">Vidalı Kompresör</option>
                    <option value="Toz Emme & Filtre">Toz Emme & Filtre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Marka & Model</label>
                  <input
                    type="text"
                    value={formMarka}
                    onChange={(e) => setFormMarka(e.target.value)}
                    placeholder="Örn: Biesse Rover B"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Konum / Hat</label>
                  <input
                    type="text"
                    value={formKonum}
                    onChange={(e) => setFormKonum(e.target.value)}
                    placeholder="Örn: Ebatlama Hattı"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <PersonelCombobox
                    label="Sorumlu Usta / Operatör"
                    variant="dark"
                    personeller={yerelPersoneller}
                    value={formSorumlu}
                    onChange={(val) => setFormSorumlu(val)}
                    placeholder="Personel seçin veya yazın..."
                    helperText="Çalışanlarımız arasından seçebilir veya özel yazabilirsiniz."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {duzenlenecekMakine ? 'Güncel Çalışma Saati' : 'Başlangıç Çalışma Saati'}
                  </label>
                  <input
                    type="number"
                    value={formGuncelSaat}
                    onChange={(e) => setFormGuncelSaat(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Bakım Aralığı (Saat)</label>
                  <input
                    type="number"
                    value={formBakimAraligi}
                    onChange={(e) => setFormBakimAraligi(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Not Alanı */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Makine Notları / Detaylı Bilgiler</label>
                <textarea
                  value={formNotlar}
                  onChange={(e) => setFormNotlar(e.target.value)}
                  placeholder="Makineye ait özel notlar, servis bilgileri, fatura no vb..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {duzenlenecekMakine && (
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-3 animate-in fade-in slide-in-from-top-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Makine Durumu</label>
                    <select
                      value={formDurum}
                      onChange={(e) => setFormDurum(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="Faal">Faal (Çalışıyor)</option>
                      <option value="Arızalı">Arızalı (Çalışmıyor)</option>
                      <option value="Bakımda">Bakımda</option>
                      <option value="Revizyonda">Revizyonda</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Aktiflik Durumu</label>
                    <select
                      value={formAktifMi ? 'aktif' : 'arsiv'}
                      onChange={(e) => setFormAktifMi(e.target.value === 'aktif')}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="aktif">Aktif (Listede gösterilir)</option>
                      <option value="arsiv">Arşive Kaldır (Arşiv listesinde saklanır)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setYeniMakineModalAcik(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={islemSuruyor}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow transition disabled:opacity-50"
                >
                  {islemSuruyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bakım Yap Modalı */}
      <MakineBakimModal
        isOpen={bakimModalAcik}
        onClose={() => setBakimModalAcik(false)}
        makine={seciliMakine}
        onSuccess={() => {
          onRefresh();
        }}
      />

      {/* LIGHTBOX MODALI */}
      {lightboxDosya && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
            <div className="flex items-center justify-between p-4 bg-slate-950/40 text-white shrink-0">
              <span className="text-xs font-bold truncate max-w-[60%] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
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
                  <FileText className="w-16 h-16 text-amber-400 mx-auto" />
                  <p className="font-semibold text-sm">{lightboxDosya.DosyaAdi}</p>
                  <a
                    href={lightboxDosya.DosyaIcerigi}
                    download={lightboxDosya.DosyaAdi}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow transition"
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
