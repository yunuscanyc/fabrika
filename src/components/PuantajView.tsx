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
  ShieldAlert,
  Printer
} from 'lucide-react';
import { AylikPuantajRaporModal } from './AylikPuantajRaporModal';
import { HaftalikYevmiyeciRaporModal } from './HaftalikYevmiyeciRaporModal';
import { GunlukImzaCizelgesiModal } from './GunlukImzaCizelgesiModal';
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
  getStandartNormalSaat,
  isNormalCalismaGirilebilir,
  getMaxNormalCalismaSaati
} from '../utils/dateUtils';
import { isPersonelCalisiyorMuTarihte } from '../utils/personelUtils';

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
  const [yevmiyeciModalAcik, setYevmiyeciModalAcik] = useState(false);
  const [imzaCizelgesiAcik, setImzaCizelgesiAcik] = useState(false);
  const [eksikBannerGizli, setEksikBannerGizli] = useState(false);

  // Günün Çalışma ve Tatil Kuralları
  const gunIdx = getGunIndex(seciliTarih);
  const is5GunHaftaSonu = calismaRejimi === '5gun' && (gunIdx === 0 || gunIdx === 6);
  const is6GunPazar = calismaRejimi === '6gun' && gunIdx === 0;
  const is6GunCumartesi = calismaRejimi === '6gun' && gunIdx === 6;
  const isNormalEngelli = !isNormalCalismaGirilebilir(seciliTarih, calismaRejimi);
  const maxNormalSaat = getMaxNormalCalismaSaati(seciliTarih, calismaRejimi);

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
          GunlukStandartSaat: yeniRejim === '5gun' ? 9.0 : 8.0,
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

      // O gün için listelenecek personeller:
      // 1. O tarihte işe giriş yapmış ve aktif çalışanlar (veya giriş-çıkış dönemleri içinde olanlar)
      // 2. VEYA o tarihe ait zaten kaydedilmiş puantaj kaydı bulunan personeller
      const gunlukPersonelIdleri = new Set(gunData.map(g => g.PersonelId));
      let calisanPersoneller = personeller.filter(p => 
        isPersonelCalisiyorMuTarihte(p, tarih) || gunlukPersonelIdleri.has(p.PersonelId)
      );

      // Aynı isimdeki mükerrer personel kayıtlarını ayıkla (Aktif olan kaydı tercih et)
      const benzersizPersonellerMap = new Map<string, Personel>();
      calisanPersoneller.forEach(p => {
        const normKey = (p.AdSoyad || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (!benzersizPersonellerMap.has(normKey)) {
          benzersizPersonellerMap.set(normKey, p);
        } else {
          const mevcut = benzersizPersonellerMap.get(normKey)!;
          if (!mevcut.DurumAktifMi && p.DurumAktifMi) {
            benzersizPersonellerMap.set(normKey, p);
          }
        }
      });
      calisanPersoneller = Array.from(benzersizPersonellerMap.values());
      const hazirlanan: SatirState[] = calisanPersoneller.map(p => {
        // İzinli olup olmadığını kontrol et
        const aktifIzin = izinler?.find(iz => 
          iz.PersonelId === p.PersonelId && 
          iz.Durum === 'Onaylandı' && 
          !iz.SilindiMi && 
          tarih >= iz.BaslangicTarihi && 
          tarih <= iz.BitisTarihi
        );

        const targetGunIdx = getGunIndex(tarih);
        const targetIs5GunHaftaSonu = rejim === '5gun' && (targetGunIdx === 0 || targetGunIdx === 6);
        const targetIs6GunPazar = rejim === '6gun' && targetGunIdx === 0;
        const targetIs6GunCumartesi = rejim === '6gun' && targetGunIdx === 6;
        const targetNormalEngelli = targetIs5GunHaftaSonu || targetIs6GunPazar;

        const mevcut = gunData.find(x => x.PersonelId === p.PersonelId);
        if (mevcut) {
          const yuzdeYuzGecerli = isYuzdeYuzMesaiGecerli(tarih, rejim, mevcut.DurumKodu);
          let normSaat = Number(mevcut.NormalCalismaSaati || 0);
          let fazlaSaat = Number(mevcut.FazlaMesaiSaati || 0);
          let htSaat = Number(mevcut.HaftaTatiliMesaiSaati || 0);
          let dKod = mevcut.DurumKodu || 'N';

          if (targetNormalEngelli) {
            // 5 günlük rejimde hafta sonu veya 6 günlükte Pazar günü normal mesai OLAMAZ!
            // Hafta tatili çalışması %50 Fazla Mesaiye aktarılır (%100'e değil)
            if (normSaat > 0) {
              fazlaSaat = Number((fazlaSaat + normSaat).toFixed(1));
              normSaat = 0;
            }
            if (!yuzdeYuzGecerli && htSaat > 0) {
              fazlaSaat = Number((fazlaSaat + htSaat).toFixed(1));
              htSaat = 0;
            }
            if (dKod === 'N') dKod = 'HT';
          } else if (targetIs6GunCumartesi) {
            // 6 günlük rejimde Cumartesi günü en fazla 5 saat normal, üzeri fazla mesaidir
            if (normSaat > 5) {
              const asan = normSaat - 5;
              normSaat = 5;
              fazlaSaat = Number((fazlaSaat + asan).toFixed(1));
            }
          }

          let kesintiSaat = Number(mevcut.SaatlikKesintiUcretsiz || 0);
          if ((dKod === 'UI' || dKod === 'D') && kesintiSaat === 0 && !targetNormalEngelli) {
            kesintiSaat = targetIs6GunCumartesi ? 5.0 : (rejim === '5gun' ? 9.0 : 8.0);
          }

          return {
            PersonelId: p.PersonelId,
            DurumKodu: dKod,
            NormalCalismaSaati: normSaat,
            FazlaMesaiSaati: fazlaSaat,
            // Yalnızca resmi tatil ise %100 mesai geçerlidir
            HaftaTatiliMesaiSaati: yuzdeYuzGecerli ? htSaat : 0,
            ResmiTatilMesaiSaati: yuzdeYuzGecerli ? Number(mevcut.ResmiTatilMesaiSaati || 0) : 0,
            SaatlikKesintiUcretsiz: kesintiSaat,
            Aciklama: mevcut.Aciklama || ''
          };
        }

        // Yeni satır için akıllı varsayılanlar
        const tatil = getResmiTatil(tarih);
        const standartSaat = getStandartNormalSaat(tarih, rejim);

        let varsayilanKod = 'N';
        let customAciklama = '';
        let initialNormalCalisma = 0;
        let initialKesinti = 0;

        if (aktifIzin) {
          if (aktifIzin.IzinTuru === 'Ücretsiz İzin') {
            varsayilanKod = 'UI';
            initialKesinti = standartSaat;
          }
          else if (aktifIzin.IzinTuru === 'Hastalık / Rapor') varsayilanKod = 'R';
          else if (aktifIzin.IzinTuru === 'Mazeret İzni') varsayilanKod = 'M';
          else varsayilanKod = 'YI'; // Yıllık İzin default

          initialNormalCalisma = 0;
          customAciklama = `Onaylı ${aktifIzin.IzinTuru} İzninde (${aktifIzin.BaslangicTarihi} - ${aktifIzin.BitisTarihi})`;
        } else {
          if (tatil.isTatil && !tatil.yarimGunMu) {
            varsayilanKod = 'RT';
            initialNormalCalisma = 0;
          } else if (targetNormalEngelli) {
            varsayilanKod = 'HT';
            initialNormalCalisma = 0;
          } else if (targetIs6GunCumartesi) {
            varsayilanKod = 'N';
            initialNormalCalisma = 5.0; // Cumartesi 5 saat standart normal
          } else {
            initialNormalCalisma = standartSaat;
          }
        }

        return {
          PersonelId: p.PersonelId,
          DurumKodu: varsayilanKod,
          NormalCalismaSaati: initialNormalCalisma,
          FazlaMesaiSaati: 0,
          HaftaTatiliMesaiSaati: 0,
          ResmiTatilMesaiSaati: 0,
          SaatlikKesintiUcretsiz: initialKesinti,
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

  // Günlük Satırların Toplam İstatistikleri (TFOOT & Toplam Özet Kartları İçin)
  const toplamNormal = useMemo(() => satirlar.reduce((acc, x) => acc + Number(x.NormalCalismaSaati || 0), 0), [satirlar]);
  const toplamFazlaMesai = useMemo(() => satirlar.reduce((acc, x) => acc + Number(x.FazlaMesaiSaati || 0), 0), [satirlar]);
  const toplamTatilMesai = useMemo(() => satirlar.reduce((acc, x) => acc + Number(x.HaftaTatiliMesaiSaati || 0), 0), [satirlar]);
  const toplamKesinti = useMemo(() => satirlar.reduce((acc, x) => acc + Number(x.SaatlikKesintiUcretsiz || 0), 0), [satirlar]);
  const toplamGenelSaat = useMemo(() => satirlar.reduce((acc, x) => acc + Math.max(0, Number(x.NormalCalismaSaati || 0) + Number(x.FazlaMesaiSaati || 0) + Number(x.HaftaTatiliMesaiSaati || 0) - Number(x.SaatlikKesintiUcretsiz || 0)), 0), [satirlar]);

  // Ay İçi Birikimli Harita (Her Personelin Bu Ayki Toplam Çalışması)
  const buAyPuantajHaritasi = useMemo(() => {
    if (!seciliTarih) return new Map<number, { gunCount: number; mesaiSaat: number }>();
    const parts = seciliTarih.split('-');
    if (parts.length < 2) return new Map<number, { gunCount: number; mesaiSaat: number }>();
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);

    const map = new Map<number, { gunCount: number; mesaiSaat: number }>();

    tumPuantajlar.forEach(p => {
      if (!p.Tarih) return;
      const clean = String(p.Tarih).trim();
      const pMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (pMatch) {
        const py = parseInt(pMatch[1], 10);
        const pm = parseInt(pMatch[2], 10);
        if (py === y && pm === m) {
          const curr = map.get(p.PersonelId) || { gunCount: 0, mesaiSaat: 0 };
          if (p.DurumKodu === 'N' || p.DurumKodu === 'HT' || p.DurumKodu === 'RT') {
            curr.gunCount += 1;
          }
          curr.mesaiSaat += Number(p.FazlaMesaiSaati || 0) + Number(p.HaftaTatiliMesaiSaati || 0);
          map.set(p.PersonelId, curr);
        }
      }
    });

    return map;
  }, [tumPuantajlar, seciliTarih]);

  // Durum Kodu Değiştiğinde Akıllı Saat Ayarı
  const handleDurumChange = (personelId: number, kod: string) => {
    if (isNormalEngelli && kod === 'N') {
      setKayitMesaji(
        calismaRejimi === '5gun'
          ? '5 günlük rejimde Cumartesi ve Pazar günleri normal mesai kapalıdır. Hafta Tatili (HT) seçilmelidir.'
          : 'Pazar günleri hafta tatilidir, normal mesai girilemez.'
      );
      setTimeout(() => setKayitMesaji(''), 4000);
      return;
    }

    const standartSaat = is6GunCumartesi ? 5.0 : getStandartNormalSaat(seciliTarih, calismaRejimi);
    setSatirlar(prev => prev.map(s => {
      if (s.PersonelId !== personelId) return s;
      if (kod === 'N') {
        const normalHedef = is6GunCumartesi 
          ? Math.min(5, Math.max(0, 5 - (s.SaatlikKesintiUcretsiz || 0))) 
          : Math.max(0, standartSaat - (s.SaatlikKesintiUcretsiz || 0));
        return { 
          ...s, 
          DurumKodu: kod, 
          NormalCalismaSaati: normalHedef,
          SaatlikKesintiUcretsiz: 0
        };
      } else if (kod === 'UI' || kod === 'D') {
        // Ücretsiz İzin veya Devamsız seçildiğinde tam gün çalışma saati (9s / 8s / 5s) otomatik eksik saat olarak yazılır
        return {
          ...s,
          DurumKodu: kod,
          NormalCalismaSaati: 0,
          SaatlikKesintiUcretsiz: standartSaat
        };
      } else {
        // İzin, Tatil vb. ise normal mesai 0 ve eksik saat 0 olur
        return { ...s, DurumKodu: kod, NormalCalismaSaati: 0, SaatlikKesintiUcretsiz: 0 };
      }
    }));
  };

  // Eksik / Kesinti Saat Girildiğinde
  const handleEksikSaatChange = (personelId: number, eksik: number) => {
    const standartSaat = is6GunCumartesi ? 5.0 : getStandartNormalSaat(seciliTarih, calismaRejimi);
    setSatirlar(prev => prev.map(s => {
      if (s.PersonelId !== personelId) return s;
      // Normal çalışma yapılabilen günde ve durum kodu 'N' ise, normal mesai standartSaat - eksik olarak düşer
      const normal = (!isNormalEngelli && s.DurumKodu === 'N') 
        ? Math.max(0, standartSaat - eksik) 
        : s.NormalCalismaSaati;
      return { ...s, SaatlikKesintiUcretsiz: Math.max(0, eksik), NormalCalismaSaati: normal };
    }));
  };

  // Normal Saat Değiştirildiğinde (Hafta Sonu Engelleme ve Cumartesi 5 Saat Sınırı)
  const handleNormalSaatChange = (personelId: number, saat: number) => {
    if (isNormalEngelli) {
      setKayitMesaji(
        calismaRejimi === '5gun'
          ? '5 günlük rejimde Cumartesi ve Pazar günleri normal mesai girilemez. Yapılan çalışma %50 Fazla Mesai sütununa yazılmalıdır.'
          : 'Pazar günü hafta tatilidir, normal mesai girilemez.'
      );
      setTimeout(() => setKayitMesaji(''), 4000);
      return;
    }

    // 6 Günlük Rejimde Cumartesi Kuralı: Maksimum 5 saat normal, üzeri otomatik Fazla Mesai
    if (is6GunCumartesi) {
      if (saat > 5) {
        const asanSaat = Number((saat - 5).toFixed(1));
        setSatirlar(prev => prev.map(s => {
          if (s.PersonelId !== personelId) return s;
          return {
            ...s,
            NormalCalismaSaati: 5,
            FazlaMesaiSaati: Number(((s.FazlaMesaiSaati || 0) + asanSaat).toFixed(1))
          };
        }));
        setKayitMesaji(`Cumartesi kuralı: 5 saat normal çalışma sabitlendi, aşan ${asanSaat} saat fazla mesaiye aktarıldı.`);
        setTimeout(() => setKayitMesaji(''), 4000);
        return;
      }
    }

    setSatirlar(prev => prev.map(s => s.PersonelId === personelId ? { ...s, NormalCalismaSaati: Math.max(0, saat) } : s));
  };

  const handleFazlaMesaiChange = (personelId: number, saat: number) => {
    setSatirlar(prev => prev.map(s => s.PersonelId === personelId ? { ...s, FazlaMesaiSaati: Math.max(0, saat) } : s));
  };

  const handleTatilMesaiChange = (personelId: number, saat: number) => {
    const yuzdeYuzGecerli = isYuzdeYuzMesaiGecerli(seciliTarih, calismaRejimi, satirlar.find(x => x.PersonelId === personelId)?.DurumKodu);
    if (!yuzdeYuzGecerli) return;
    setSatirlar(prev => prev.map(s => s.PersonelId === personelId ? { ...s, HaftaTatiliMesaiSaati: Math.max(0, saat) } : s));
  };

  // Tümüne Normal Çalışma Doldur
  const handleTumuneNormalDoldur = () => {
    const tatil = getResmiTatil(seciliTarih);

    let hedefKod = 'N';
    let hedefSaat = getStandartNormalSaat(seciliTarih, calismaRejimi);

    if (tatil.isTatil && !tatil.yarimGunMu) {
      hedefKod = 'RT';
      hedefSaat = 0;
    } else if (isNormalEngelli) {
      hedefKod = 'HT';
      hedefSaat = 0;
    } else if (is6GunCumartesi) {
      hedefKod = 'N';
      hedefSaat = 5.0; // Cumartesi 5 saat normal
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
        <div className="bg-slate-900 border border-emerald-500/40 rounded-xl px-4 py-3 text-slate-100 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-white">
              Son 30 günün tüm geçmiş çalışma günleri eksiksiz olarak kaydedilmiş durumda.
            </span>
          </div>
          <span className="text-[11px] font-bold font-mono text-emerald-300 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg shrink-0">
            Puantaj Güncel
          </span>
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
            İş Kanununa tam uyumlu 5 gün (9 saat) veya 6 gün (Hafta içi 8s, Cumartesi 5s) çalışma rejimi, %50 ve %100 mesai denetimi.
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
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
            title="Kadrolu fabrika personelleri için aylık puantaj icmal cetveli"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Kadrolu Aylık İcmal</span>
          </button>

          <button
            onClick={() => setYevmiyeciModalAcik(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-950/70 hover:bg-amber-900/90 text-amber-200 text-xs font-bold rounded-lg border border-amber-800/80 transition shadow-sm cursor-pointer"
            title="Yevmiyeci ve saha ustaları için haftalık puantaj ve hakediş cetveli"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>🔨 Yevmiyeci Haftalık İcmal</span>
          </button>

          <button
            onClick={() => setImzaCizelgesiAcik(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
            title="Günlük Personel Puantaj ve İmza Çizelgesi (Yazıcı Formatı)"
          >
            <Printer className="w-4 h-4 text-rose-400" />
            Puantaj İmza Listesi
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
              title="Pzt-Cum günde 8 saat, Cumartesi öğlene kadar 5 saat (45 saat). Pazar hafta tatilidir."
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
            <strong>Rejim Bilgisi:</strong> {calismaRejimi === '5gun' ? '5 Günlük Çalışma (Haftalık 45s: Pzt-Cum 9 saat, Cmt-Pzr Hafta Tatili — Yargıtay maktu 225s esası)' : '6 Günlük Çalışma (Haftalık 45s: Pzt-Cum 8 saat, Cmt Öğlene Kadar 5 saat, Pzr Hafta Tatili — Yargıtay maktu 225s esası)'}
          </span>
        </div>

        {/* Hafta Sonu ve Cumartesi Özel Kural Uyarısı */}
        {is5GunHaftaSonu && (
          <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md font-semibold">
            <span>⚠️ 5 Günlük Rejim: Hafta sonu normal çalışma kapalıdır. Hafta tatilinde yapılan çalışma %50 Fazla Mesai olarak yazılır.</span>
          </div>
        )}
        {is6GunCumartesi && (
          <div className="flex items-center gap-1.5 text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md font-semibold">
            <span>⏱️ 6 Günlük Rejim (Cumartesi): En fazla 5 saat normal çalışılır, üzeri otomatik %50 Fazla Mesaiye aktarılır.</span>
          </div>
        )}
        {is6GunPazar && (
          <div className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md font-semibold">
            <span>☕ Pazar Hafta Tatili: Normal mesai kapalıdır.</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {isYuzdeYuzMesaiGecerli(seciliTarih, calismaRejimi) ? (
            <div className="flex items-center gap-1.5 text-purple-400 bg-purple-950/50 border border-purple-800/60 px-2.5 py-1 rounded-md font-medium">
              <Unlock className="w-3.5 h-3.5" />
              <span>%100 Resmi Tatil Mesaisi AÇIK (Resmi Tatil / Bayram)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>%100 Mesai KİLİTLİ (Yalnızca Resmi Tatillerde Uygulanır; Hafta Tatili ve Fazla Mesai %50'dir)</span>
            </div>
          )}
        </div>
      </div>

      {/* 3.1 GÜNLÜK İSTATİSTİK VE TOPLAM ÖZET KARTLARI */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-md">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Aktif İşçi Kadrosu</div>
          <div className="text-lg font-black text-white mt-0.5 flex items-center gap-1.5 font-mono">
            <span>{satirlar.length} Personel</span>
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5 font-medium">
            {satirlar.filter(s => s.DurumKodu === 'N').length} Normal | {satirlar.filter(s => s.DurumKodu === 'D').length} Devamsız
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-md">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Günlük Normal Saat</div>
          <div className="text-lg font-black text-emerald-400 mt-0.5 font-mono">
            {toplamNormal} Sa.
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Fabrika Standart Çalışma</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-md">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Günlük %50 Fazla Mesai</div>
          <div className="text-lg font-black text-blue-400 mt-0.5 font-mono">
            {toplamFazlaMesai} Sa.
          </div>
          <div className="text-[10px] text-blue-300/80 mt-0.5 font-medium">Toplam Fazla Mesai</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-md">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">%100 Resmi Tatil Mesaisi</div>
          <div className="text-lg font-black text-purple-300 mt-0.5 font-mono">
            {toplamTatilMesai} Sa.
          </div>
          <div className="text-[10px] text-purple-400/80 mt-0.5 font-medium">Bayram / Tatil Çalışması</div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-blue-950/60 border border-blue-800/80 p-3 rounded-xl shadow-lg ring-1 ring-blue-500/20">
          <div className="text-[11px] text-blue-300 font-bold uppercase tracking-wide">📊 Günlük Toplam Hakediş</div>
          <div className="text-xl font-black text-blue-200 mt-0.5 font-mono">
            {toplamGenelSaat} Sa.
          </div>
          <div className="text-[10px] text-blue-300/80 mt-0.5 font-medium">Fabrika Günlük Net Çalışma</div>
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
                  <div className="flex items-center justify-center gap-1">
                    <span>Normal (Saat)</span>
                    {isNormalEngelli && (
                      <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1 py-0.5 rounded font-bold lowercase">
                        (kapalı)
                      </span>
                    )}
                    {is6GunCumartesi && (
                      <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded font-bold">
                        (Maks 5s)
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    {isNormalEngelli ? 'Hafta Tatili - Normal Kapalı' : is6GunCumartesi ? 'Maks 5s Normal, Üzeri Fazla' : `Hedef: ${standartSaat}s`}
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div>%50 Fazla Mesai</div>
                  <div className="text-[10px] text-slate-500 font-normal">Hafta İçi &amp; Hafta Tatili</div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span>%100 Resmi Tatil</span>
                    {!isYuzdeYuzMesaiGecerli(seciliTarih, calismaRejimi) && <Lock className="w-3 h-3 text-slate-500" />}
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">Milli &amp; Dini Bayramlar</div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div>Eksik / Kesinti (Saat)</div>
                  <div className="text-[10px] text-slate-500 font-normal">Otomatik Düşer</div>
                </th>
                <th className="py-3 px-3 text-center bg-blue-950/40 border-x border-slate-800">
                  <div className="text-blue-300 font-bold">Toplam Çalışma</div>
                  <div className="text-[10px] text-blue-400/80 font-normal">Günlük Net Sa.</div>
                </th>
                <th className="py-3 px-4">Açıklama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {yukleniyor ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    Puantaj verileri yükleniyor...
                  </td>
                </tr>
              ) : satirlar.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
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

                  const ayOzet = buAyPuantajHaritasi.get(s.PersonelId);
                  const toplamGunlukSaat = Math.max(0, (s.NormalCalismaSaati || 0) + (s.FazlaMesaiSaati || 0) + (s.HaftaTatiliMesaiSaati || 0));

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
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-normal mt-0.5">
                          <span>{p?.Departman || 'Genel'} - {p?.Gorev || ''}</span>
                          {ayOzet && (
                            <span className="px-1.5 py-0.2 bg-slate-800 text-emerald-400 rounded text-[10px] font-bold border border-slate-700/80">
                              Bu Ay: {ayOzet.gunCount} Gün | {ayOzet.mesaiSaat}s Mesai
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          value={s.DurumKodu}
                          onChange={(e) => handleDurumChange(s.PersonelId, e.target.value)}
                          className={`px-2.5 py-1 bg-slate-950 border rounded text-xs text-white focus:outline-none focus:border-blue-500 font-medium ${
                            isNormalEngelli && s.DurumKodu === 'HT' ? 'border-amber-500/50 text-amber-300' : 'border-slate-800'
                          }`}
                        >
                          {!isNormalEngelli ? (
                            <option value="N">Normal Çalışma (N)</option>
                          ) : (
                            <option value="N" disabled>Normal Çalışma (Hafta Sonu Kapalı)</option>
                          )}
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
                        {isNormalEngelli ? (
                          <div 
                            className="relative inline-block group" 
                            title={
                              calismaRejimi === '5gun'
                                ? "5 günlük çalışma rejiminde Cumartesi ve Pazar günleri normal çalışma yapılamaz. Çalışma varsa Fazla Mesai veya Hafta Tatili Mesaisi girilmelidir."
                                : "Pazar günleri hafta tatilidir. Normal çalışma girilemez, çalışma varsa Hafta Tatili Mesaisi girilmelidir."
                            }
                          >
                            <input
                              type="number"
                              disabled
                              value={0}
                              className="w-16 px-2 py-1 bg-slate-950/40 border border-slate-800/40 rounded text-center text-xs text-slate-600 font-medium cursor-not-allowed opacity-50"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={is6GunCumartesi ? 5 : 24}
                              disabled={s.DurumKodu !== 'N'}
                              value={s.NormalCalismaSaati}
                              onChange={(e) => handleNormalSaatChange(s.PersonelId, parseFloat(e.target.value) || 0)}
                              className={`w-16 px-2 py-1 bg-slate-950 border rounded text-center text-xs font-bold focus:outline-none ${
                                s.DurumKodu !== 'N'
                                  ? 'border-slate-800/40 text-slate-600 opacity-50 cursor-not-allowed'
                                  : is6GunCumartesi 
                                    ? 'border-amber-500/50 text-amber-300 focus:border-amber-400' 
                                    : 'border-slate-800 text-emerald-400 focus:border-emerald-500'
                              }`}
                              title={
                                is6GunCumartesi 
                                  ? "Cumartesi kuralı: En fazla 5 saat normal çalışılabilir. 5 saatten fazlası otomatik olarak Fazla Mesaiye aktarılır." 
                                  : undefined
                              }
                            />
                            {is6GunCumartesi && (
                              <span className="text-[9px] text-amber-400/80 font-mono mt-0.5 font-semibold">maks 5s</span>
                            )}
                          </div>
                        )}
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
                            title="Resmi Tatil / Bayram %100 mesaisi girilebilir"
                          />
                        ) : (
                          <div className="relative inline-block group">
                            <input
                              type="number"
                              disabled
                              value={0}
                              className="w-16 px-2 py-1 bg-slate-950/40 border border-slate-800/40 rounded text-center text-xs text-slate-600 font-medium cursor-not-allowed opacity-50"
                              title="İş Kanunu / İşyeri Kuralı: %100 mesai yalnızca resmi tatil ve bayram günlerinde (RT) geçerlidir. Hafta tatili ve hafta içi çalışmaları %50 Fazla Mesai sütununa yazılır."
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

                      <td className="py-2.5 px-3 text-center bg-blue-950/20 border-x border-slate-800/80">
                        <span className="inline-block px-2.5 py-1 bg-blue-900/60 border border-blue-500/40 rounded text-xs font-black text-blue-200 font-mono shadow-sm">
                          {toplamGunlukSaat} s
                        </span>
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

            {/* TOPLAM SÜTÜNÜ VE GENEL TABLO İCMALİ (TFOOT) */}
            <tfoot className="bg-slate-950 font-bold border-t-2 border-slate-700 text-xs text-slate-200">
              <tr>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-black text-sm">📊 GENEL TOPLAM</span>
                    <span className="text-[10px] text-slate-400 font-medium">({satirlar.length} Personel)</span>
                  </div>
                </td>
                <td className="py-3.5 px-3 text-slate-300 text-xs">
                  {satirlar.filter(x => x.DurumKodu === 'N').length} Normal / {satirlar.filter(x => x.DurumKodu === 'D').length} Devamsız
                </td>
                <td className="py-3.5 px-3 text-center text-emerald-400 text-sm font-black font-mono">
                  {toplamNormal} s
                </td>
                <td className="py-3.5 px-3 text-center text-blue-400 text-sm font-black font-mono">
                  {toplamFazlaMesai} s
                </td>
                <td className="py-3.5 px-3 text-center text-purple-300 text-sm font-black font-mono">
                  {toplamTatilMesai} s
                </td>
                <td className="py-3.5 px-3 text-center text-rose-400 text-sm font-black font-mono">
                  {toplamKesinti} s
                </td>
                <td className="py-3.5 px-3 text-center bg-blue-900/60 text-blue-200 text-sm font-black font-mono border-x border-blue-500/40 shadow-inner">
                  {toplamGenelSaat} s
                </td>
                <td className="py-3.5 px-4 text-slate-400 text-[11px] font-normal">
                  Fabrikadaki tüm personelin günlük net hakediş toplamı
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. AYLIK İCMAL MODALI (KADROLU PERSONEL) */}
      <AylikPuantajRaporModal
        isOpen={raporModalAcik}
        onClose={() => setRaporModalAcik(false)}
        personeller={personeller}
        puantajlar={tumPuantajlar}
      />

      {/* 6. HAFTALIK İCMAL MODALI (YEVMİYECİ USTALAR) */}
      <HaftalikYevmiyeciRaporModal
        isOpen={yevmiyeciModalAcik}
        onClose={() => setYevmiyeciModalAcik(false)}
        personeller={personeller}
        puantajlar={tumPuantajlar}
      />

      {/* GÜNLÜK PERSONEL PUANTAJ VE İMZA ÇİZELGESİ MODALI */}
      <GunlukImzaCizelgesiModal
        isOpen={imzaCizelgesiAcik}
        onClose={() => setImzaCizelgesiAcik(false)}
        personeller={personeller}
        varsayilanTarih={seciliTarih}
        izinler={izinler}
        puantajlar={tumPuantajlar}
      />
    </div>
  );
};
