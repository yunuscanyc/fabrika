import React, { useState, useEffect, useMemo } from 'react';
import { Personel, GunlukPuantaj, MesaiAyari, IzinKaydi } from '../types';
import { 
  Clock, 
  Calendar, 
  Save, 
  FileSpreadsheet, 
  CheckCheck, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
  Building2,
  Lock,
  Unlock,
  CheckCircle2,
  X,
  Info,
  Palmtree,
  ShieldAlert
} from 'lucide-react';
import { AylikPuantajRaporModal } from './AylikPuantajRaporModal';
import { 
  getBugunIso, 
  formatTarihTR, 
  formatTarihUzunTR, 
  tarihKaydir, 
  getResmiTatil, 
  getGunIndex, 
  isHaftaTatiliGunu, 
  isCumartesiGunu, 
  isYuzdeYuzMesaiGecerli, 
  getStandartNormalSaat 
} from '../utils/dateUtils';

interface PuantajViewProps {
  personeller: Personel[];
  izinler?: IzinKaydi[];
  onRefresh?: () => void;
}

interface SatirState {
  PersonelId: number;
  DurumKodu: string;
  NormalCalismaSaati: number;
  FazlaMesaiSaati: number;
  HaftaTatiliMesaiSaati: number;
  ResmiTatilMesaiSaati: number;
  SaatlikKesintiUcretsiz: number;
  Aciklama: string;
}

export const PuantajView: React.FC<PuantajViewProps> = ({ personeller, izinler }) => {
  const [seciliTarih, setSeciliTarih] = useState<string>(getBugunIso());
  const [calismaRejimi, setCalismaRejimi] = useState<'5gun' | '6gun'>('5gun');
  const [satirlar, setSatirlar] = useState<SatirState[]>([]);
  const [tumPuantajlar, setTumPuantajlar] = useState<GunlukPuantaj[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [siliniyor, setSiliniyor] = useState(false);
  const [kayitMesaji, setKayitMesaji] = useState('');
  const [hataMesaji, setHataMesaji] = useState('');
  const [raporModalAcik, setRaporModalAcik] = useState(false);
  const [eksikBannerGizli, setEksikBannerGizli] = useState(false);

  // 1. Mesai ayarlarını sunucudan çek
  useEffect(() => {
    fetch('/api/mesai-ayarlari')
      .then(r => r.json())
      .then((data: MesaiAyari) => {
        if (data && (data.CalismaRejimi === '5gun' || data.CalismaRejimi === '6gun')) {
          setCalismaRejimi(data.CalismaRejimi);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Çalışma rejimini değiştir ve sunucuya kaydet
  const handleRejimDegistir = async (yeniRejim: '5gun' | '6gun') => {
    setCalismaRejimi(yeniRejim);
    try {
      await fetch('/api/mesai-ayarlari', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CalismaRejimi: yeniRejim,
          HaftalikCalismaGunu: yeniRejim === '5gun' ? 5 : 6,
          GunlukStandartSaat: yeniRejim === '5gun' ? 9.0 : 7.5,
          CumartesiStandartSaat: 5.0
        })
      });
    } catch (e) {
      console.error('Mesai ayarı kaydedilemedi:', e);
    }
  };

  // 3. Günün puantajını ve tüm puantajları çek
  const verileriGetir = async (tarih: string, rejim = calismaRejimi) => {
    setYukleniyor(true);
    setHataMesaji('');
    try {
      const [gunRes, tumRes] = await Promise.all([
        fetch(`/api/puantajlar?tarih=${tarih}`),
        fetch('/api/puantajlar')
      ]);
      const gunData: GunlukPuantaj[] = await gunRes.json();
      const tumData: GunlukPuantaj[] = await tumRes.json();
      setTumPuantajlar(tumData);

      const aktifPersoneller = personeller.filter(p => p.DurumAktifMi);
      const hazirlanan: SatirState[] = aktifPersoneller.map(p => {
        // İzinli olup olmadığını kontrol et
        const aktifIzin = izinler?.find(iz => 
          iz.PersonelId === p.PersonelId && 
          iz.Durum === 'Onaylandı' && 
          !iz.SilindiMi && 
          tarih >= iz.BaslangicTarihi && 
          tarih <= iz.BitisTarihi
        );

        const mevcut = gunData.find(x => x.PersonelId === p.PersonelId);
        if (mevcut) {
          const yuzdeYuzGecerli = isYuzdeYuzMesaiGecerli(tarih, rejim, mevcut.DurumKodu);
          return {
            PersonelId: p.PersonelId,
            DurumKodu: mevcut.DurumKodu || 'N',
            NormalCalismaSaati: Number(mevcut.NormalCalismaSaati || 0),
            FazlaMesaiSaati: Number(mevcut.FazlaMesaiSaati || 0),
            // Tatil veya hafta sonu değilse %100 mesai sıfırlanır
            HaftaTatiliMesaiSaati: yuzdeYuzGecerli ? Number(mevcut.HaftaTatiliMesaiSaati || 0) : 0,
            ResmiTatilMesaiSaati: yuzdeYuzGecerli ? Number(mevcut.ResmiTatilMesaiSaati || 0) : 0,
            SaatlikKesintiUcretsiz: Number(mevcut.SaatlikKesintiUcretsiz || 0),
            Aciklama: mevcut.Aciklama || ''
          };
        }

        // Yeni satır için akıllı varsayılanlar
        const tatil = getResmiTatil(tarih);
        const haftaTatili = isHaftaTatiliGunu(tarih, rejim);
        const standartSaat = getStandartNormalSaat(tarih, rejim);

        let varsayilanKod = 'N';
        let customAciklama = '';
        let initialNormalCalisma = 0;

        if (aktifIzin) {
          if (aktifIzin.IzinTuru === 'Ücretsiz İzin') varsayilanKod = 'UI';
          else if (aktifIzin.IzinTuru === 'Hastalık / Rapor') varsayilanKod = 'R';
          else if (aktifIzin.IzinTuru === 'Mazeret İzni') varsayilanKod = 'M';
          else varsayilanKod = 'YI'; // Yıllık İzin default

          initialNormalCalisma = 0;
          customAciklama = `Onaylı ${aktifIzin.IzinTuru} İzninde (${aktifIzin.BaslangicTarihi} - ${aktifIzin.BitisTarihi})`;
        } else {
          if (tatil.isTatil && !tatil.yarimGunMu) {
            varsayilanKod = 'RT';
          } else if (haftaTatili) {
            varsayilanKod = 'HT';
          }
          initialNormalCalisma = varsayilanKod === 'N' ? standartSaat : 0;
        }

        return {
          PersonelId: p.PersonelId,
          DurumKodu: varsayilanKod,
          NormalCalismaSaati: initialNormalCalisma,
          FazlaMesaiSaati: 0,
          HaftaTatiliMesaiSaati: 0,
          ResmiTatilMesaiSaati: 0,
          SaatlikKesintiUcretsiz: 0,
          Aciklama: customAciklama
        };
      });

      setSatirlar(hazirlanan);
    } catch (err: any) {
      console.error(err);
      setHataMesaji('Puantaj verileri alınırken hata oluştu: ' + err.message);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    verileriGetir(seciliTarih, calismaRejimi);
  }, [seciliTarih, calismaRejimi, personeller]);

  // Seçili tarihe ait kayıt var mı kontrolü
  const buGununKayitlari = useMemo(() => {
    return tumPuantajlar.filter(p => p.Tarih === seciliTarih);
  }, [tumPuantajlar, seciliTarih]);
  const isGunKayitli = buGununKayitlari.length > 0;
  const buGununKayitSayisi = buGununKayitlari.length;

  // Geçmiş kaydedilmemiş iş günlerini tespit et (Son 30 gün)
  const eksikGunler = useMemo(() => {
    const kayitliSet = new Set(tumPuantajlar.map(p => p.Tarih));
    const eksikler: { tarih: string; etiket: string; gunAdi: string; aciklama: string }[] = [];
    const bugunStr = getBugunIso();

    for (let i = 1; i <= 30; i++) {
      const dStr = tarihKaydir(bugunStr, -i);
      const dayIdx = getGunIndex(dStr);
      const tatil = getResmiTatil(dStr);

      // Çalışma günü kontrolü
      // 5 günlük rejimde Cmt(6) ve Pzr(0) çalışma günü değildir
      // 6 günlük rejimde Pzr(0) çalışma günü değildir, Cmt(6) öğlene kadar çalışma günüdür
      const isCalismaGunu = calismaRejimi === '5gun'
        ? (dayIdx !== 0 && dayIdx !== 6 && (!tatil.isTatil || tatil.yarimGunMu))
        : (dayIdx !== 0 && (!tatil.isTatil || tatil.yarimGunMu));

      if (isCalismaGunu && !kayitliSet.has(dStr)) {
        const uzun = formatTarihUzunTR(dStr);
        const parts = uzun.split(',');
        eksikler.push({
          tarih: dStr,
          etiket: formatTarihTR(dStr),
          gunAdi: parts.length > 1 ? parts[1].trim() : '',
          aciklama: dayIdx === 6 ? 'Cumartesi (Öğlene Kadar)' : 'Hafta İçi Mesaisi'
        });
      }
    }
    return eksikler;
  }, [tumPuantajlar, calismaRejimi]);

  // Durum Kodu Değiştiğinde Akıllı Saat Ayarı
  const handleDurumChange = (personelId: number, kod: string) => {
    const standartSaat = getStandartNormalSaat(seciliTarih, calismaRejimi);
    setSatirlar(prev => prev.map(s => {
      if (s.PersonelId !== personelId) return s;
      if (kod === 'N') {
        return { 
          ...s, 
          DurumKodu: kod, 
          NormalCalismaSaati: Math.max(0, standartSaat - s.SaatlikKesintiUcretsiz) 
        };
      } else {
        // İzin, Tatil, Devamsız vb. ise normal mesai 0 olur
        return { ...s, DurumKodu: kod, NormalCalismaSaati: 0 };
      }
    }));
  };

  // Eksik Saat Girildiğinde Normal Mesai Otomatik Düşer
  const handleEksikSaatChange = (personelId: number, eksik: number) => {
    const standartSaat = getStandartNormalSaat(seciliTarih, calismaRejimi);
    setSatirlar(prev => prev.map(s => {
      if (s.PersonelId !== personelId) return s;
      const normal = s.DurumKodu === 'N' ? Math.max(0, standartSaat - eksik) : s.NormalCalismaSaati;
      return { ...s, SaatlikKesintiUcretsiz: eksik, NormalCalismaSaati: normal };
    }));
  };

  const handleNormalSaatChange = (personelId: number, saat: number) => {
    setSatirlar(prev => prev.map(s => s.PersonelId === personelId ? { ...s, NormalCalismaSaati: saat } : s));
  };

  const handleFazlaMesaiChange = (personelId: number, saat: number) => {
    setSatirlar(prev => prev.map(s => s.PersonelId === personelId ? { ...s, FazlaMesaiSaati: saat } : s));
  };

  const handleTatilMesaiChange = (personelId: number, saat: number) => {
    const yuzdeYuzGecerli = isYuzdeYuzMesaiGecerli(seciliTarih, calismaRejimi, satirlar.find(x => x.PersonelId === personelId)?.DurumKodu);
    if (!yuzdeYuzGecerli) return;
    setSatirlar(prev => prev.map(s => s.PersonelId === personelId ? { ...s, HaftaTatiliMesaiSaati: saat } : s));
  };

  // Tümüne Normal Çalışma Doldur
  const handleTumuneNormalDoldur = () => {
    const standartSaat = getStandartNormalSaat(seciliTarih, calismaRejimi);
    const tatil = getResmiTatil(seciliTarih);
    const haftaTatili = isHaftaTatiliGunu(seciliTarih, calismaRejimi);

    let hedefKod = 'N';
    let hedefSaat = standartSaat;

    if (tatil.isTatil && !tatil.yarimGunMu) {
      hedefKod = 'RT';
      hedefSaat = 0;
    } else if (haftaTatili) {
      hedefKod = 'HT';
      hedefSaat = 0;
    }

    setSatirlar(prev => prev.map(s => ({
      ...s,
      DurumKodu: hedefKod,
      NormalCalismaSaati: hedefSaat,
      SaatlikKesintiUcretsiz: 0
    })));
  };

  // Puantaj Kaydet
  const handleKaydet = async () => {
    setKaydediliyor(true);
    setKayitMesaji('');
    setHataMesaji('');
    try {
      const res = await fetch('/api/puantajlar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tarih: seciliTarih,
          satirlar
        })
      });
      if (res.ok) {
        setKayitMesaji(`${formatTarihTR(seciliTarih)} tarihli puantaj başarıyla kaydedildi!`);
        setTimeout(() => setKayitMesaji(''), 4000);
        verileriGetir(seciliTarih, calismaRejimi);
      } else {
        const d = await res.json();
        setHataMesaji(d.error || 'Kaydetme işlemi başarısız oldu');
      }
    } catch (err: any) {
      setHataMesaji('Kayıt hatası: ' + err.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  // Günün Puantajını Sil
  const handleGunuSil = async () => {
    if (!isGunKayitli) return;
    const onay = window.confirm(
      `DİKKAT: ${formatTarihUzunTR(seciliTarih)} tarihine ait ${buGununKayitSayisi} personelin puantaj kaydı kalıcı olarak silinecek!\n\nDevam etmek istiyor musunuz?`
    );
    if (!onay) return;

    setSiliniyor(true);
    setKayitMesaji('');
    setHataMesaji('');
    try {
      const res = await fetch(`/api/puantajlar?tarih=${seciliTarih}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setKayitMesaji(`${formatTarihTR(seciliTarih)} tarihine ait tüm puantaj kayıtları başarıyla silindi.`);
        setTimeout(() => setKayitMesaji(''), 4000);
        verileriGetir(seciliTarih, calismaRejimi);
      } else {
        const d = await res.json();
        setHataMesaji(d.error || 'Silme işlemi başarısız oldu');
      }
    } catch (err: any) {
      setHataMesaji('Silme hatası: ' + err.message);
    } finally {
      setSiliniyor(false);
    }
  };

  const getPersonel = (id: number) => personeller.find(p => p.PersonelId === id);

  // Tarih ve Gün Detayı Bilgisi
  const tatilBilgi = getResmiTatil(seciliTarih);
  const isHaftaTatili = isHaftaTatiliGunu(seciliTarih, calismaRejimi);
  const isCumartesi = isCumartesiGunu(seciliTarih);
  const standartSaat = getStandartNormalSaat(seciliTarih, calismaRejimi);

  return (
    <div className="space-y-5">
      {/* 1. UYARI BANDI: Geçmiş Kaydedilmemiş İş Günleri */}
      {eksikGunler.length > 0 && !eksikBannerGizli && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 text-amber-200 shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-300">
                    Kaydedilmemiş Geçmiş İş Günü Uyarısı ({eksikGunler.length} Gün Eksik)
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-full font-medium">
                    Son 30 Gün Kontrolü
                  </span>
                </div>
                <p className="text-xs text-amber-300/80 mt-1">
                  Aşağıdaki geçmiş iş günleri için henüz puantaj kaydı bulunmuyor. İlgili güne tıklayarak doğrudan o tarihin puantajına geçebilirsiniz:
                </p>

                {/* Hızlı Geçiş Butonları */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {eksikGunler.slice(0, 10).map(e => (
                    <button
                      key={e.tarih}
                      onClick={() => setSeciliTarih(e.tarih)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
                        seciliTarih === e.tarih
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow'
                          : 'bg-slate-900/90 hover:bg-amber-900/40 text-amber-200 border-amber-700/50 hover:border-amber-500'
                      }`}
                      title={`${e.etiket} ${e.gunAdi} (${e.aciklama}) - Tıklayarak bu güne geç`}
                    >
                      <Calendar className="w-3.5 h-3.5 opacity-70" />
                      <span>{e.etiket}</span>
                      <span className="opacity-75 text-[10px]">({e.gunAdi})</span>
                    </button>
                  ))}
                  {eksikGunler.length > 10 && (
                    <span className="text-xs text-amber-400/70 self-center">
                      +{eksikGunler.length - 10} gün daha...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setEksikBannerGizli(true)}
              className="text-amber-400 hover:text-amber-200 p-1 rounded-lg hover:bg-amber-900/40 transition"
              title="Uyarıyı Gizle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Eksik gün yoksa yeşil bilgilendirme */}
      {eksikGunler.length === 0 && (
        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl px-4 py-2.5 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Son 30 günün tüm geçmiş çalışma günleri eksiksiz olarak kaydedilmiş durumda.</span>
          </div>
          <span className="text-[11px] text-emerald-400/70 font-mono">Puantaj Güncel</span>
        </div>
      )}

      {/* Üst Başlık & Butonlar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-white tracking-wide">Günlük Puantaj & Mesai Takibi</h1>
            {isGunKayitli ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Kayıtlı ({buGununKayitSayisi} Personel)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                Kayıtlı Değil (Taslak)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            İş Kanununa tam uyumlu 5 gün (9 saat) veya 6 gün (Cumartesi öğlene kadar) çalışma rejimi, %50 ve %100 mesai denetimi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-stretch lg:self-auto justify-end">
          {/* Kayıtlı Günü Sil Butonu */}
          {isGunKayitli && (
            <button
              onClick={handleGunuSil}
              disabled={siliniyor || kaydediliyor}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800/80 transition shadow-sm disabled:opacity-50"
              title="Bu güne ait tüm puantaj kayıtlarını siler"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              {siliniyor ? 'Siliniyor...' : 'Günü Sil'}
            </button>
          )}

          <button
            onClick={() => setRaporModalAcik(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Aylık İcmal Raporu
          </button>

          <button
            onClick={handleKaydet}
            disabled={kaydediliyor || siliniyor}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md transition disabled:opacity-50 tracking-wide"
          >
            <Save className="w-4 h-4" />
            {kaydediliyor ? 'Kaydediliyor...' : isGunKayitli ? 'Günü Güncelle' : 'Günü Kaydet'}
          </button>
        </div>
      </div>

      {kayitMesaji && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow">
          <CheckCheck className="w-4 h-4 shrink-0" />
          {kayitMesaji}
        </div>
      )}

      {hataMesaji && (
        <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {hataMesaji}
        </div>
      )}

      {/* 2. REJİM VE TARİH ÇUBUĞU */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        {/* Sol: Tarih Seçimi & Hızlı İleri/Geri */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setSeciliTarih(tarihKaydir(seciliTarih, -1))}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              title="Önceki Gün"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={seciliTarih}
              onChange={(e) => setSeciliTarih(e.target.value)}
              className="px-2 py-1 bg-transparent text-white font-mono text-sm focus:outline-none cursor-pointer"
            />
            <button
              onClick={() => setSeciliTarih(tarihKaydir(seciliTarih, 1))}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              title="Sonraki Gün"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSeciliTarih(getBugunIso())}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            Bugün
          </button>

          {/* Günün Adı ve Durum Etiketi */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">
              {formatTarihUzunTR(seciliTarih)}
            </span>
            {tatilBilgi.isTatil && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                🎉 {tatilBilgi.ad}
              </span>
            )}
            {isHaftaTatili && !tatilBilgi.isTatil && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ☕ Hafta Tatili
              </span>
            )}
            {calismaRejimi === '6gun' && isCumartesi && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                ⏱️ Cts Öğlene Kadar (5s)
              </span>
            )}
          </div>
        </div>

        {/* Sağ: Çalışma Rejimi Seçimi (5 Günlük vs 6 Günlük) */}
        <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
          <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => handleRejimDegistir('5gun')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                calismaRejimi === '5gun'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="Hafta içi 5 gün, günde 9 saat (45 saat). Cumartesi ve Pazar hafta tatilidir."
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>5 Günlük (Pzt-Cum 9s)</span>
            </button>

            <button
              onClick={() => handleRejimDegistir('6gun')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                calismaRejimi === '6gun'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="Pzt-Cum günde 7.5 saat, Cumartesi öğlene kadar 5 saat (42.5 ~ 45 saat). Pazar hafta tatilidir."
            >
              <Clock className="w-3.5 h-3.5" />
              <span>6 Günlük (Cmt Öğlene Kadar)</span>
            </button>
          </div>

          <button
            onClick={handleTumuneNormalDoldur}
            className="px-3 py-2 bg-slate-800/90 hover:bg-slate-800 text-blue-400 text-xs font-bold rounded-lg border border-slate-700 transition flex items-center gap-1.5"
            title={`Seçili gün için standart saat (${standartSaat}s) ve kod (${standartSaat > 0 ? 'Normal' : 'Tatil'}) uygular`}
          >
            <span>✓ Tümüne Doldur ({standartSaat}s)</span>
          </button>
        </div>
      </div>

      {/* 3. BİLGİLENDİRME ŞERİDİ: %100 Mesai Durumu ve İş Kanunu Kuralı */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            <strong>Rejim Bilgisi:</strong> {calismaRejimi === '5gun' ? '5 Günlük Çalışma (Haftalık 45s: Pzt-Cum 9 saat, Cmt-Pzr Hafta Tatili)' : '6 Günlük Çalışma (Haftalık 45s: Pzt-Cum 7.5 saat, Cmt Öğlene Kadar 5 saat, Pzr Hafta Tatili)'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isYuzdeYuzMesaiGecerli(seciliTarih, calismaRejimi) ? (
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2.5 py-1 rounded-md font-medium">
              <Unlock className="w-3.5 h-3.5" />
              <span>%100 Tatil Mesaisi AÇIK (Hafta Sonu / Resmi Tatil)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>%100 Mesai KİLİTLİ (İş Kanunu: Sadece Hafta Tatili veya Resmi Tatilde Verilir)</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. PUANTAJ TABLOSU */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/90 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Personel</th>
                <th className="py-3 px-3">Durum Kodu</th>
                <th className="py-3 px-3 text-center">
                  <div>Normal (Saat)</div>
                  <div className="text-[10px] text-slate-500 font-normal">Hedef: {standartSaat}s</div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div>%50 Fazla Mesai</div>
                  <div className="text-[10px] text-slate-500 font-normal">Hafta İçi Mesai</div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span>%100 Tatil Mesaisi</span>
                    {!isYuzdeYuzMesaiGecerli(seciliTarih, calismaRejimi) && <Lock className="w-3 h-3 text-slate-500" />}
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">Pazar / Resmi Tatil</div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div>Eksik / Kesinti (Saat)</div>
                  <div className="text-[10px] text-slate-500 font-normal">Otomatik Düşer</div>
                </th>
                <th className="py-3 px-4">Açıklama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {yukleniyor ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Puantaj verileri yükleniyor...
                  </td>
                </tr>
              ) : satirlar.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Aktif çalışan personel bulunamadı.
                  </td>
                </tr>
              ) : (
                satirlar.map((s) => {
                  const p = getPersonel(s.PersonelId);
                  const yuzdeYuzGecerli = isYuzdeYuzMesaiGecerli(seciliTarih, calismaRejimi, s.DurumKodu);
                  const aktifIzin = izinler?.find(iz => 
                    iz.PersonelId === s.PersonelId && 
                    iz.Durum === 'Onaylandı' && 
                    !iz.SilindiMi && 
                    seciliTarih >= iz.BaslangicTarihi && 
                    seciliTarih <= iz.BitisTarihi
                  );

                  return (
                    <tr key={s.PersonelId} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-4 font-semibold text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{p?.AdSoyad || `ID: ${s.PersonelId}`}</span>
                          {aktifIzin && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded text-[10px] font-medium" title={aktifIzin.Aciklama}>
                              <Palmtree className="w-3 h-3 text-amber-400" />
                              <span>{aktifIzin.IzinTuru}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal">{p?.Departman || 'Genel'} - {p?.Gorev || ''}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          value={s.DurumKodu}
                          onChange={(e) => handleDurumChange(s.PersonelId, e.target.value)}
                          className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                        >
                          <option value="N">Normal Çalışma (N)</option>
                          <option value="HT">Hafta Tatili (HT)</option>
                          <option value="RT">Resmi Tatil (RT)</option>
                          <option value="YI">Yıllık İzin (YI)</option>
                          <option value="UI">Ücretsiz İzin (UI)</option>
                          <option value="R">Raporlu (R)</option>
                          <option value="M">Mazeret İzni (M)</option>
                          <option value="D">Devamsız (D)</option>
                        </select>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={s.NormalCalismaSaati}
                          onChange={(e) => handleNormalSaatChange(s.PersonelId, parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-center text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={s.FazlaMesaiSaati}
                          onChange={(e) => handleFazlaMesaiChange(s.PersonelId, parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-center text-xs text-blue-400 font-bold focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {yuzdeYuzGecerli ? (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            value={s.HaftaTatiliMesaiSaati}
                            onChange={(e) => handleTatilMesaiChange(s.PersonelId, parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 bg-slate-950 border border-emerald-500/50 rounded text-center text-xs text-emerald-300 font-bold focus:outline-none focus:border-emerald-400 shadow-inner"
                            title="Hafta Tatili veya Resmi Tatil %100 mesaisi girilebilir"
                          />
                        ) : (
                          <div className="relative inline-block group">
                            <input
                              type="number"
                              disabled
                              value={0}
                              className="w-16 px-2 py-1 bg-slate-950/40 border border-slate-800/40 rounded text-center text-xs text-slate-600 font-medium cursor-not-allowed opacity-50"
                              title="İş Kanunu: %100 mesai yalnızca hafta tatili ve resmi tatil günlerinde girilebilir. Normal günlerde fazla mesai %50 olarak hesaplanır."
                            />
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={s.SaatlikKesintiUcretsiz}
                          onChange={(e) => handleEksikSaatChange(s.PersonelId, parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-center text-xs text-rose-400 font-bold focus:outline-none focus:border-rose-500"
                          title="Eksik saat girildiğinde normal çalışma saatinden otomatik düşer"
                        />
                      </td>

                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={s.Aciklama}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSatirlar(prev => prev.map(item => item.PersonelId === s.PersonelId ? { ...item, Aciklama: val } : item));
                          }}
                          placeholder="Örn: 2 saat erken çıktı"
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. AYLIK İCMAL MODALI */}
      <AylikPuantajRaporModal
        isOpen={raporModalAcik}
        onClose={() => setRaporModalAcik(false)}
        personeller={personeller}
        puantajlar={tumPuantajlar}
      />
    </div>
  );
};
