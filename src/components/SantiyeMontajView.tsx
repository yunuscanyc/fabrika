import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Users, Calendar, CheckCircle2, XCircle, Plus, Search, 
  Filter, MapPin, Phone, Clock, ArrowRight, UserCheck, UserX, 
  Archive, RotateCcw, Trash2, Edit3, Check, X, Printer, FileText, 
  AlertCircle, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  HardHat, User, Briefcase, Award, ShieldCheck, Sparkles, DollarSign,
  Save, CloudSun, AlertTriangle, CheckSquare, Layers, History, TrendingUp, Info
} from 'lucide-react';
import { SantiyeMontajGrubu, SantiyeEkipUyesi, Personel, Yevmiyeci, Proje, Departman, Gorev, SantiyeGunlukDurum } from '../types';

interface SantiyeMontajViewProps {
  personeller: Personel[];
  projeler?: Proje[];
  departmanlar?: Departman[];
  gorevler?: Gorev[];
  onRefresh?: () => void;
}

const LOCAL_STORAGE_KEY = 'fabrika_santiye_gruplari_v1';

export const SantiyeMontajView: React.FC<SantiyeMontajViewProps> = ({
  personeller,
  projeler = [],
  departmanlar = [],
  gorevler = [],
  onRefresh
}) => {
  // Şantiye Grupları State
  const [santiyeler, setSantiyeler] = useState<SantiyeMontajGrubu[]>([]);
  const [yevmiyeciler, setYevmiyeciler] = useState<Yevmiyeci[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Görünüm & Filtreler
  const [anaSekme, setAnaSekme] = useState<'aktif' | 'arsiv'>('aktif');
  const [aramaMetni, setAramaMetni] = useState('');
  const [seciliSantiyeId, setSeciliSantiyeId] = useState<number | string | null>(null);

  // Tarih ve Detay Sekmesi
  const getBugunStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [seciliTarih, setSeciliTarih] = useState<string>(getBugunStr());
  const [detaySekmesi, setDetaySekmesi] = useState<'durum' | 'yoklama' | 'gecmis' | 'matris'>('durum');

  // Günlük Durum Form State'leri (O günkü şantiye raporu)
  const [durumOzet, setDurumOzet] = useState<SantiyeGunlukDurum['DurumOzet']>('Normal Devam Ediyor');
  const [ilerlemeYuzdesi, setIlerlemeYuzdesi] = useState<number>(50);
  const [havaDurumu, setHavaDurumu] = useState<string>('Güneşli / Açık');
  const [yapilanIsler, setYapilanIsler] = useState<string>('');
  const [eksikMalzemeler, setEksikMalzemeler] = useState<string>('');
  const [genelNotlar, setGenelNotlar] = useState<string>('');
  const [raporlayan, setRaporlayan] = useState<string>('');
  const [kaydediliyor, setKaydediliyor] = useState<boolean>(false);

  // Modal States
  const [formModalAcik, setFormModalAcik] = useState(false);
  const [duzenlenenSantiye, setDuzenlenenSantiye] = useState<SantiyeMontajGrubu | null>(null);
  const [notModalAcik, setNotModalAcik] = useState(false);
  const [notHedefUye, setNotHedefUye] = useState<{ uyeId: string; uyeAd: string; not: string } | null>(null);
  const [yazdirModalAcik, setYazdirModalAcik] = useState(false);
  const [yazdirSantiye, setYazdirSantiye] = useState<SantiyeMontajGrubu | null>(null);
  const [yazdirMod, setYazdirMod] = useState<'gunluk' | 'genel'>('gunluk');

  // Şantiye Ekle/Düzenle Form State'leri
  const [formSantiyeAdi, setFormSantiyeAdi] = useState('');
  const [formProjeId, setFormProjeId] = useState<string>('');
  const [formLokasyon, setFormLokasyon] = useState('');
  const [formMusteriFirma, setFormMusteriFirma] = useState('');
  const [formBaslangicTarihi, setFormBaslangicTarihi] = useState(getBugunStr());
  const [formPlanlananBitisTarihi, setFormPlanlananBitisTarihi] = useState('');
  const [formSorumluUsta, setFormSorumluUsta] = useState('');
  const [formSorumluTelefon, setFormSorumluTelefon] = useState('');
  const [formAciklama, setFormAciklama] = useState('');
  const [formEkip, setFormEkip] = useState<SantiyeEkipUyesi[]>([]);

  // Ekip Seçici Form İçi State
  const [ekipSeciciSekme, setEkipSeciciSekme] = useState<'kadrolu' | 'yevmiyeci'>('kadrolu');
  const [ekipArama, setEkipArama] = useState('');

  // Bildirim mesajı
  const [bildirim, setBildirim] = useState<{ tip: 'basari' | 'hata'; metin: string } | null>(null);

  const gosterBildirim = (metin: string, tip: 'basari' | 'hata' = 'basari') => {
    setBildirim({ tip, metin });
    setTimeout(() => setBildirim(null), 3500);
  };

  // LocalStorage Yardımcıları
  const kaydetLocal = (data: SantiyeMontajGrubu[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  };

  const yukleLocal = (): SantiyeMontajGrubu[] | null => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }
    return null;
  };

  // Verileri Yükle
  const verileriYukle = async () => {
    setYukleniyor(true);
    try {
      // 1. Yevmiyecileri getir
      const yevRes = await fetch('/api/yevmiyeciler').then(r => r.json()).catch(() => []);
      if (Array.isArray(yevRes)) {
        setYevmiyeciler(yevRes);
      }

      // 2. Şantiyeleri getir
      const res = await fetch('/api/montaj-gruplari');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSantiyeler(data);
          kaydetLocal(data);
          if (!seciliSantiyeId && data.length > 0) {
            const aktifIlk = data.find(s => s.Durum === 'Aktif') || data[0];
            setSeciliSantiyeId(aktifIlk.Id);
          }
          setYukleniyor(false);
          return;
        }
      }

      // Backend henüz boşsa veya ulaşılamazsa LocalStorage veya Varsayılan Demo Veri
      const localData = yukleLocal();
      if (localData && localData.length > 0) {
        setSantiyeler(localData);
        if (!seciliSantiyeId) {
          const aktifIlk = localData.find(s => s.Durum === 'Aktif') || localData[0];
          setSeciliSantiyeId(aktifIlk.Id);
        }
      } else {
        // İlk demo şantiye gruplarını oluştur
        const bugun = getBugunStr();
        const demoGruplar: SantiyeMontajGrubu[] = [
          {
            Id: 1,
            SantiyeAdi: 'Kadıköy Sahil Villa Ahşap & Mobilya Montajı',
            ProjeId: projeler[0]?.ProjeId || null,
            ProjeAdi: projeler[0]?.ProjeAdi || 'Villa Dekorasyon Projesi',
            Lokasyon: 'Kadıköy / İstanbul',
            MusteriFirma: 'Acar Mimarlık & İnşaat',
            BaslangicTarihi: bugun,
            PlanlananBitisTarihi: '',
            SorumluUsta: personeller[0]?.AdSoyad || 'Ahmet Yılmaz (Usta Başı)',
            SorumluTelefon: personeller[0]?.Telefon || '0532 555 0123',
            Durum: 'Aktif',
            Aciklama: 'Mutfak dolapları, giyinme odaları ve masif panel kaplamaların sahada montajı.',
            Ekip: [
              ...(personeller.slice(0, 2).map((p, idx) => ({
                Id: `kadrolu_${p.PersonelId}`,
                PersonelId: p.PersonelId,
                Tur: 'Kadrolu' as const,
                AdSoyad: p.AdSoyad,
                Telefon: p.Telefon,
                Uzmanlik: p.Gorev || p.Departman || 'Montaj Ustası',
                Rol: idx === 0 ? ('Usta Başı' as const) : ('Montaj Ustası' as const),
                EklemeTarihi: bugun
              }))),
              ...(yevRes.slice(0, 2).map((y: Yevmiyeci) => ({
                Id: `yevmiyeci_${y.YevmiyeciId}`,
                YevmiyeciId: y.YevmiyeciId,
                Tur: 'Yevmiyeci' as const,
                AdSoyad: y.AdSoyad,
                Telefon: y.Telefon,
                Uzmanlik: y.UzmanlikAlani || 'Dış Montaj Ustası',
                Rol: 'Şantiye Elemanı' as const,
                GunlukUcret: y.GunlukYevmiye || 2500,
                EklemeTarihi: bugun
              })))
            ],
            YoklamaKayitlari: {
              [bugun]: {}
            },
            YoklamaNotlari: {},
            GunlukDurumlar: {
              [bugun]: {
                Tarih: bugun,
                DurumOzet: 'Normal Devam Ediyor',
                IlerlemeYuzdesi: 65,
                HavaDurumu: 'Güneşli / Açık',
                YapilanIsler: 'Mutfak alt ve üst dolap gövdelerinin duvara asılması ve terazi ayarları tamamlandı. Ada tezgah iskeleti kuruldu.',
                EksikMalzemeVeSorunlar: '2 koli frenli menteşe eksik, fabrikadan takviye istendi.',
                GenelNotlar: 'Şantiyede elektrik ve su tesisatçıları ile uyumlu şekilde çalışıldı.',
                Raporlayan: personeller[0]?.AdSoyad || 'Ahmet Yılmaz'
              }
            },
            OlusturmaTarihi: bugun
          },
          {
            Id: 2,
            SantiyeAdi: 'Bursa AVM Mağaza Ahşap Konsept Kurulumu',
            ProjeId: null,
            ProjeAdi: 'Bursa Mağaza Stand Projesi',
            Lokasyon: 'Nilüfer / Bursa',
            MusteriFirma: 'Zenith Retail Grubu',
            BaslangicTarihi: bugun,
            PlanlananBitisTarihi: '',
            SorumluUsta: 'Mehmet Demir',
            SorumluTelefon: '0544 333 4455',
            Durum: 'Aktif',
            Aciklama: 'Gece vardiyası AVM içi mağaza raf ve teşhir üniteleri montaj işi.',
            Ekip: [
              ...(personeller.slice(2, 3).map(p => ({
                Id: `kadrolu_${p.PersonelId}`,
                PersonelId: p.PersonelId,
                Tur: 'Kadrolu' as const,
                AdSoyad: p.AdSoyad,
                Telefon: p.Telefon,
                Uzmanlik: p.Gorev || 'Mobilya Ustası',
                Rol: 'Usta Başı' as const,
                EklemeTarihi: bugun
              }))),
              ...(yevRes.slice(2, 4).map((y: Yevmiyeci) => ({
                Id: `yevmiyeci_${y.YevmiyeciId}`,
                YevmiyeciId: y.YevmiyeciId,
                Tur: 'Yevmiyeci' as const,
                AdSoyad: y.AdSoyad,
                Telefon: y.Telefon,
                Uzmanlik: y.UzmanlikAlani || 'Montaj Ustası',
                Rol: 'Montaj Ustası' as const,
                GunlukUcret: y.GunlukYevmiye || 2750,
                EklemeTarihi: bugun
              })))
            ],
            YoklamaKayitlari: {
              [bugun]: {}
            },
            YoklamaNotlari: {},
            GunlukDurumlar: {
              [bugun]: {
                Tarih: bugun,
                DurumOzet: 'Hızlı İlerliyor',
                IlerlemeYuzdesi: 40,
                HavaDurumu: 'Kapalı / İç Mekan',
                YapilanIsler: 'Kasa bankosu ve soyunma kabinlerinin ahşap konstrüksiyonu yerleştirildi.',
                EksikMalzemeVeSorunlar: 'Herhangi bir eksik malzeme yok.',
                GenelNotlar: 'AVM gece çalışma izni 23:00 - 07:00 arası.',
                Raporlayan: 'Mehmet Demir'
              }
            },
            OlusturmaTarihi: bugun
          }
        ];

        // İlk gün yoklamalarında personelleri otomatik geldi olarak işaretleyelim
        demoGruplar.forEach(g => {
          g.Ekip.forEach(u => {
            if (!g.YoklamaKayitlari[bugun]) g.YoklamaKayitlari[bugun] = {};
            g.YoklamaKayitlari[bugun][u.Id] = true;
          });
        });

        setSantiyeler(demoGruplar);
        kaydetLocal(demoGruplar);
        setSeciliSantiyeId(demoGruplar[0].Id);

        // Sunucuya da kaydetmeyi dene
        demoGruplar.forEach(g => {
          fetch('/api/montaj-gruplari', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(g)
          }).catch(() => {});
        });
      }
    } catch (err) {
      console.error('Şantiye verileri yükleme hatası:', err);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    verileriYukle();
  }, []);

  // Seçili Şantiye Nesnesi
  const seciliSantiye = useMemo(() => {
    if (!seciliSantiyeId) return null;
    return santiyeler.find(s => String(s.Id) === String(seciliSantiyeId)) || null;
  }, [santiyeler, seciliSantiyeId]);

  // Seçili Şantiye veya Tarih Değiştiğinde Günlük Durum Formunu Doldur
  useEffect(() => {
    if (!seciliSantiye) return;

    const kayitliRapor = seciliSantiye.GunlukDurumlar?.[seciliTarih];
    if (kayitliRapor) {
      setDurumOzet(kayitliRapor.DurumOzet || 'Normal Devam Ediyor');
      setIlerlemeYuzdesi(kayitliRapor.IlerlemeYuzdesi !== undefined ? kayitliRapor.IlerlemeYuzdesi : 50);
      setHavaDurumu(kayitliRapor.HavaDurumu || 'Güneşli / Açık');
      setYapilanIsler(kayitliRapor.YapilanIsler || '');
      setEksikMalzemeler(kayitliRapor.EksikMalzemeVeSorunlar || '');
      setGenelNotlar(kayitliRapor.GenelNotlar || '');
      setRaporlayan(kayitliRapor.Raporlayan || seciliSantiye.SorumluUsta || '');
    } else {
      // O güne özel henüz rapor girilmemişse varsayılanları getir
      setDurumOzet('Normal Devam Ediyor');
      setIlerlemeYuzdesi(50);
      setHavaDurumu('Güneşli / Açık');
      setYapilanIsler('');
      setEksikMalzemeler('');
      setGenelNotlar('');
      setRaporlayan(seciliSantiye.SorumluUsta || '');
    }
  }, [seciliSantiye, seciliTarih]);

  // Filtrelenmiş Şantiyeler (Aktif veya Arşiv)
  const filtrelenmisSantiyeler = useMemo(() => {
    return santiyeler.filter(s => {
      if (anaSekme === 'aktif' && s.Durum !== 'Aktif') return false;
      if (anaSekme === 'arsiv' && s.Durum !== 'Tamamlandi') return false;

      if (!aramaMetni.trim()) return true;
      const lower = aramaMetni.toLowerCase();
      const ad = (s.SantiyeAdi || '').toLowerCase();
      const lok = (s.Lokasyon || '').toLowerCase();
      const mus = (s.MusteriFirma || '').toLowerCase();
      const sorumlu = (s.SorumluUsta || '').toLowerCase();
      const ekipMatch = s.Ekip?.some(e => e.AdSoyad.toLowerCase().includes(lower));

      return ad.includes(lower) || lok.includes(lower) || mus.includes(lower) || sorumlu.includes(lower) || ekipMatch;
    });
  }, [santiyeler, anaSekme, aramaMetni]);

  // İstatistiksel Özetler
  const istatistikler = useMemo(() => {
    const aktifler = santiyeler.filter(s => s.Durum === 'Aktif');
    const arsivler = santiyeler.filter(s => s.Durum === 'Tamamlandi');

    let toplamSahadakiUsta = 0;
    let toplamKadrolu = 0;
    let toplamYevmiyeci = 0;
    let bugunGelenler = 0;
    let bugunToplamBeklenen = 0;

    aktifler.forEach(s => {
      s.Ekip.forEach(u => {
        toplamSahadakiUsta++;
        if (u.Tur === 'Kadrolu') toplamKadrolu++;
        else toplamYevmiyeci++;

        bugunToplamBeklenen++;
        const geldiMi = s.YoklamaKayitlari?.[seciliTarih]?.[u.Id];
        if (geldiMi === true) {
          bugunGelenler++;
        }
      });
    });

    const katilimYuzdesi = bugunToplamBeklenen > 0 
      ? Math.round((bugunGelenler / bugunToplamBeklenen) * 100) 
      : 0;

    return {
      aktifSantiyeSayisi: aktifler.length,
      arsivSantiyeSayisi: arsivler.length,
      toplamSahadakiUsta,
      toplamKadrolu,
      toplamYevmiyeci,
      bugunGelenler,
      bugunToplamBeklenen,
      katilimYuzdesi
    };
  }, [santiyeler, seciliTarih]);

  // Şantiyenin çalışma günleri listesi (Geriye doğru 14 gün + gelecek günler)
  const santiyeCalismaGunleri = useMemo(() => {
    if (!seciliSantiye) return [];
    const set = new Set<string>();

    if (seciliSantiye.BaslangicTarihi) set.add(seciliSantiye.BaslangicTarihi);
    set.add(seciliTarih);
    set.add(getBugunStr());

    if (seciliSantiye.YoklamaKayitlari) {
      Object.keys(seciliSantiye.YoklamaKayitlari).forEach(t => set.add(t));
    }
    if (seciliSantiye.GunlukDurumlar) {
      Object.keys(seciliSantiye.GunlukDurumlar).forEach(t => set.add(t));
    }

    // Seçili tarihten 5 gün önce ve 2 gün sonrasını da ekle
    const secDate = new Date(seciliTarih);
    for (let i = -7; i <= 3; i++) {
      const d = new Date(secDate);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      set.add(`${y}-${m}-${day}`);
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [seciliSantiye, seciliTarih]);

  // =========================================================================
  // GÜNLÜK DURUM & SAHA RAPORU KAYDETME (KULLANICININ İSTEDİĞİ ANA BUTON)
  // =========================================================================
  const handleGunlukDurumuKaydet = async () => {
    if (!seciliSantiye) return;

    setKaydediliyor(true);
    const yeniRapor: SantiyeGunlukDurum = {
      Tarih: seciliTarih,
      DurumOzet: durumOzet,
      IlerlemeYuzdesi: Number(ilerlemeYuzdesi),
      HavaDurumu: havaDurumu,
      YapilanIsler: yapilanIsler.trim(),
      EksikMalzemeVeSorunlar: eksikMalzemeler.trim(),
      GenelNotlar: genelNotlar.trim(),
      Raporlayan: raporlayan.trim() || seciliSantiye.SorumluUsta || 'Sorumlu Usta',
      KayitZamani: new Date().toISOString()
    };

    // Mevcut yoklama verilerini de toparla
    const mevcutYoklama = seciliSantiye.YoklamaKayitlari?.[seciliTarih] || {};
    const mevcutYoklamaNotlari = seciliSantiye.YoklamaNotlari?.[seciliTarih] || {};

    const guncelSantiyeler = santiyeler.map(s => {
      if (String(s.Id) !== String(seciliSantiye.Id)) return s;

      const yeniGunlukler = { ...(s.GunlukDurumlar || {}) };
      yeniGunlukler[seciliTarih] = yeniRapor;

      return {
        ...s,
        GunlukDurumlar: yeniGunlukler
      };
    });

    setSantiyeler(guncelSantiyeler);
    kaydetLocal(guncelSantiyeler);

    try {
      const res = await fetch(`/api/montaj-gruplari/${seciliSantiye.Id}/gunluk-durum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tarih: seciliTarih,
          durumKaydi: yeniRapor,
          yoklamaKayitlari: mevcutYoklama,
          yoklamaNotlari: mevcutYoklamaNotlari
        })
      });

      if (res.ok) {
        gosterBildirim(`✅ ${seciliTarih} tarihli şantiye durumu ve saha günlüğü başarıyla kaydedildi!`);
      } else {
        gosterBildirim(`✅ ${seciliTarih} tarihli durum yerel olarak kaydedildi.`);
      }
    } catch (err) {
      console.warn('Durum kaydetme sunucu uyarısı:', err);
      gosterBildirim(`✅ ${seciliTarih} tarihli durum başarıyla kaydedildi.`);
    } finally {
      setKaydediliyor(false);
    }
  };

  // =========================================================================
  // YOKLAMA TOGGLE İŞLEMİ (Tek tıkla Geldi / Gelmedi Geçişi)
  // =========================================================================
  const handleToggleYoklama = async (santiyeId: number | string, uyeId: string) => {
    const santiye = santiyeler.find(s => String(s.Id) === String(santiyeId));
    if (!santiye) return;

    const mevcutDurum = santiye.YoklamaKayitlari?.[seciliTarih]?.[uyeId] ?? false;
    const yeniDurum = !mevcutDurum;

    const guncelSantiyeler = santiyeler.map(s => {
      if (String(s.Id) !== String(santiyeId)) return s;

      const yeniYoklama = { ...(s.YoklamaKayitlari || {}) };
      if (!yeniYoklama[seciliTarih]) {
        yeniYoklama[seciliTarih] = {};
      }
      yeniYoklama[seciliTarih] = {
        ...yeniYoklama[seciliTarih],
        [uyeId]: yeniDurum
      };

      return {
        ...s,
        YoklamaKayitlari: yeniYoklama
      };
    });

    setSantiyeler(guncelSantiyeler);
    kaydetLocal(guncelSantiyeler);

    try {
      await fetch(`/api/montaj-gruplari/${santiyeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          YoklamaKayitlari: guncelSantiyeler.find(s => String(s.Id) === String(santiyeId))?.YoklamaKayitlari
        })
      });
    } catch (err) {}
  };

  // Toplu Yoklama (Tüm Ekip Geldi / Temizle)
  const handleTopluYoklama = async (santiyeId: number | string, durum: boolean) => {
    const santiye = santiyeler.find(s => String(s.Id) === String(santiyeId));
    if (!santiye || !santiye.Ekip) return;

    const guncelSantiyeler = santiyeler.map(s => {
      if (String(s.Id) !== String(santiyeId)) return s;

      const yeniYoklama = { ...(s.YoklamaKayitlari || {}) };
      const gunlukMap: Record<string, boolean> = {};
      s.Ekip.forEach(u => {
        gunlukMap[u.Id] = durum;
      });
      yeniYoklama[seciliTarih] = gunlukMap;

      return {
        ...s,
        YoklamaKayitlari: yeniYoklama
      };
    });

    setSantiyeler(guncelSantiyeler);
    kaydetLocal(guncelSantiyeler);
    gosterBildirim(durum ? 'Tüm ekip "GELDİ" olarak işaretlendi.' : 'Yoklama temizlendi.');

    try {
      await fetch(`/api/montaj-gruplari/${santiyeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          YoklamaKayitlari: guncelSantiyeler.find(s => String(s.Id) === String(santiyeId))?.YoklamaKayitlari
        })
      });
    } catch (err) {}
  };

  // Günlük Not Ekleme / Güncelleme
  const handleNotKaydet = async () => {
    if (!seciliSantiye || !notHedefUye) return;

    const { uyeId, not } = notHedefUye;
    const guncelSantiyeler = santiyeler.map(s => {
      if (String(s.Id) !== String(seciliSantiye.Id)) return s;

      const yeniNotlar = { ...(s.YoklamaNotlari || {}) };
      if (!yeniNotlar[seciliTarih]) yeniNotlar[seciliTarih] = {};
      yeniNotlar[seciliTarih] = {
        ...yeniNotlar[seciliTarih],
        [uyeId]: not
      };

      return {
        ...s,
        YoklamaNotlari: yeniNotlar
      };
    });

    setSantiyeler(guncelSantiyeler);
    kaydetLocal(guncelSantiyeler);
    setNotModalAcik(false);
    gosterBildirim('Yoklama notu kaydedildi.');

    try {
      await fetch(`/api/montaj-gruplari/${seciliSantiye.Id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          YoklamaNotlari: guncelSantiyeler.find(s => String(s.Id) === String(seciliSantiye.Id))?.YoklamaNotlari
        })
      });
    } catch (e) {}
  };

  // Tarih Değiştirme Yardımcısı
  const handleGunDegistir = (fark: number) => {
    const current = new Date(seciliTarih);
    current.setDate(current.getDate() + fark);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    setSeciliTarih(`${y}-${m}-${day}`);
  };

  // =========================================================================
  // ŞANTİYE OLUŞTURMA & DÜZENLEME & ARŞİVLEME
  // =========================================================================
  const handleYeniSantiyeModalAc = () => {
    setDuzenlenenSantiye(null);
    setFormSantiyeAdi('');
    setFormProjeId('');
    setFormLokasyon('');
    setFormMusteriFirma('');
    setFormBaslangicTarihi(getBugunStr());
    setFormPlanlananBitisTarihi('');
    setFormSorumluUsta('');
    setFormSorumluTelefon('');
    setFormAciklama('');
    setFormEkip([]);
    setFormModalAcik(true);
  };

  const handleDuzenleModalAc = (s: SantiyeMontajGrubu) => {
    setDuzenlenenSantiye(s);
    setFormSantiyeAdi(s.SantiyeAdi || '');
    setFormProjeId(s.ProjeId ? String(s.ProjeId) : '');
    setFormLokasyon(s.Lokasyon || '');
    setFormMusteriFirma(s.MusteriFirma || '');
    setFormBaslangicTarihi(s.BaslangicTarihi || getBugunStr());
    setFormPlanlananBitisTarihi(s.PlanlananBitisTarihi || '');
    setFormSorumluUsta(s.SorumluUsta || '');
    setFormSorumluTelefon(s.SorumluTelefon || '');
    setFormAciklama(s.Aciklama || '');
    setFormEkip(s.Ekip ? [...s.Ekip] : []);
    setFormModalAcik(true);
  };

  const handleEkipUyesiEkle = (tur: 'Kadrolu' | 'Yevmiyeci', id: number) => {
    const uyeKey = `${tur.toLowerCase()}_${id}`;
    if (formEkip.some(e => e.Id === uyeKey)) {
      gosterBildirim('Bu personel zaten ekibe eklenmiş!', 'hata');
      return;
    }

    if (tur === 'Kadrolu') {
      const p = personeller.find(item => item.PersonelId === id);
      if (!p) return;
      const yeniUye: SantiyeEkipUyesi = {
        Id: uyeKey,
        PersonelId: p.PersonelId,
        Tur: 'Kadrolu',
        AdSoyad: p.AdSoyad,
        Telefon: p.Telefon,
        Uzmanlik: p.Gorev || p.Departman || 'Personel',
        Rol: formEkip.length === 0 ? 'Usta Başı' : 'Montaj Ustası',
        EklemeTarihi: getBugunStr()
      };
      setFormEkip(prev => [...prev, yeniUye]);
      if (!formSorumluUsta && formEkip.length === 0) {
        setFormSorumluUsta(p.AdSoyad);
        setFormSorumluTelefon(p.Telefon || '');
      }
    } else {
      const y = yevmiyeciler.find(item => item.YevmiyeciId === id);
      if (!y) return;
      const yeniUye: SantiyeEkipUyesi = {
        Id: uyeKey,
        YevmiyeciId: y.YevmiyeciId,
        Tur: 'Yevmiyeci',
        AdSoyad: y.AdSoyad,
        Telefon: y.Telefon,
        Uzmanlik: y.UzmanlikAlani || 'Dış Montaj Ustası',
        Rol: 'Şantiye Elemanı',
        GunlukUcret: y.GunlukYevmiye || 2500,
        EklemeTarihi: getBugunStr()
      };
      setFormEkip(prev => [...prev, yeniUye]);
    }
  };

  const handleEkipUyesiCikar = (uyeId: string) => {
    setFormEkip(prev => prev.filter(e => e.Id !== uyeId));
  };

  const handleEkipRolDegistir = (uyeId: string, rol: SantiyeEkipUyesi['Rol']) => {
    setFormEkip(prev => prev.map(e => e.Id === uyeId ? { ...e, Rol: rol } : e));
  };

  const handleSantiyeFormKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSantiyeAdi.trim()) {
      gosterBildirim('Lütfen şantiye / montaj işinin adını giriniz.', 'hata');
      return;
    }

    if (formEkip.length === 0) {
      gosterBildirim('Lütfen montaj grubuna en az 1 personel veya usta ekleyiniz.', 'hata');
      return;
    }

    const bagliProje = formProjeId ? projeler.find(p => String(p.ProjeId) === formProjeId) : null;

    if (duzenlenenSantiye) {
      // Güncelleme
      const guncellenmis: SantiyeMontajGrubu = {
        ...duzenlenenSantiye,
        SantiyeAdi: formSantiyeAdi.trim(),
        ProjeId: formProjeId ? Number(formProjeId) : null,
        ProjeAdi: bagliProje ? bagliProje.ProjeAdi : '',
        Lokasyon: formLokasyon.trim(),
        MusteriFirma: formMusteriFirma.trim(),
        BaslangicTarihi: formBaslangicTarihi,
        PlanlananBitisTarihi: formPlanlananBitisTarihi || undefined,
        SorumluUsta: formSorumluUsta.trim(),
        SorumluTelefon: formSorumluTelefon.trim(),
        Aciklama: formAciklama.trim(),
        Ekip: formEkip
      };

      const yeniListe = santiyeler.map(s => String(s.Id) === String(duzenlenenSantiye.Id) ? guncellenmis : s);
      setSantiyeler(yeniListe);
      kaydetLocal(yeniListe);
      setFormModalAcik(false);
      gosterBildirim('Şantiye montaj grubu başarıyla güncellendi.');

      try {
        await fetch(`/api/montaj-gruplari/${duzenlenenSantiye.Id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(guncellenmis)
        });
      } catch (err) {}
    } else {
      // Yeni Ekleme
      const yeniId = Date.now();
      const yeniSantiye: SantiyeMontajGrubu = {
        Id: yeniId,
        SantiyeAdi: formSantiyeAdi.trim(),
        ProjeId: formProjeId ? Number(formProjeId) : null,
        ProjeAdi: bagliProje ? bagliProje.ProjeAdi : '',
        Lokasyon: formLokasyon.trim(),
        MusteriFirma: formMusteriFirma.trim(),
        BaslangicTarihi: formBaslangicTarihi,
        PlanlananBitisTarihi: formPlanlananBitisTarihi || undefined,
        SorumluUsta: formSorumluUsta.trim(),
        SorumluTelefon: formSorumluTelefon.trim(),
        Durum: 'Aktif',
        Aciklama: formAciklama.trim(),
        Ekip: formEkip,
        YoklamaKayitlari: {
          [formBaslangicTarihi]: {}
        },
        YoklamaNotlari: {},
        GunlukDurumlar: {
          [formBaslangicTarihi]: {
            Tarih: formBaslangicTarihi,
            DurumOzet: 'Normal Devam Ediyor',
            IlerlemeYuzdesi: 10,
            HavaDurumu: 'Güneşli / Açık',
            YapilanIsler: 'Şantiye kurulumu yapıldı, ekip sahaya intikal etti.',
            Raporlayan: formSorumluUsta.trim()
          }
        },
        OlusturmaTarihi: getBugunStr()
      };

      formEkip.forEach(u => {
        yeniSantiye.YoklamaKayitlari[formBaslangicTarihi][u.Id] = true;
      });

      const yeniListe = [yeniSantiye, ...santiyeler];
      setSantiyeler(yeniListe);
      kaydetLocal(yeniListe);
      setSeciliSantiyeId(yeniId);
      setFormModalAcik(false);
      gosterBildirim('Yeni şantiye montaj grubu oluşturuldu.');

      try {
        await fetch('/api/montaj-gruplari', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(yeniSantiye)
        });
      } catch (err) {}
    }
  };

  // Şantiyeyi Arşive Al / Aktife Döndür
  const handleToggleArsiv = async (santiyeId: number | string, hedefDurum: 'Aktif' | 'Tamamlandi') => {
    const bugun = getBugunStr();
    const guncelSantiyeler = santiyeler.map(s => {
      if (String(s.Id) !== String(santiyeId)) return s;
      return {
        ...s,
        Durum: hedefDurum,
        GerceklesenBitisTarihi: hedefDurum === 'Tamamlandi' ? bugun : undefined,
        ArsivlenmeTarihi: hedefDurum === 'Tamamlandi' ? bugun : undefined
      };
    });

    setSantiyeler(guncelSantiyeler);
    kaydetLocal(guncelSantiyeler);
    gosterBildirim(hedefDurum === 'Tamamlandi' ? 'Şantiye başarıyla tamamlandı ve arşive alındı.' : 'Şantiye yeniden aktif edildi.');

    try {
      await fetch(`/api/montaj-gruplari/${santiyeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Durum: hedefDurum,
          GerceklesenBitisTarihi: hedefDurum === 'Tamamlandi' ? bugun : null,
          ArsivlenmeTarihi: hedefDurum === 'Tamamlandi' ? bugun : null
        })
      });
    } catch (err) {}
  };

  // Şantiye Sil
  const handleSantiyeSil = async (santiyeId: number | string) => {
    if (!window.confirm('Bu şantiye montaj grubunu ve tüm günlük durum geçmişini silmek istediğinize emin misiniz?')) {
      return;
    }

    const guncelSantiyeler = santiyeler.filter(s => String(s.Id) !== String(santiyeId));
    setSantiyeler(guncelSantiyeler);
    kaydetLocal(guncelSantiyeler);

    if (String(seciliSantiyeId) === String(santiyeId)) {
      setSeciliSantiyeId(guncelSantiyeler[0]?.Id || null);
    }

    gosterBildirim('Şantiye grubu silindi.');

    try {
      await fetch(`/api/montaj-gruplari/${santiyeId}`, {
        method: 'DELETE'
      });
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Aksiyon Barı */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                Şantiye & Dış Montaj Yönetimi
              </h2>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                Gün Gün Durum Takibi
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dış şantiyeler, montaj ekipleri, günlük saha raporları ve anlık usta yoklaması
            </p>
          </div>
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleYeniSantiyeModalAc}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-lg shadow-blue-600/30 transition transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Şantiye / Montaj İşi Oluştur</span>
          </button>
        </div>
      </div>

      {/* Bildirim Toast */}
      {bildirim && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition animate-fade-in ${
          bildirim.tip === 'basari' 
            ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200' 
            : 'bg-rose-950/80 border border-rose-500/50 text-rose-200'
        }`}>
          {bildirim.tip === 'basari' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{bildirim.metin}</span>
        </div>
      )}

      {/* İstatistik Özet Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aktif Şantiyeler</div>
            <div className="text-lg font-black text-white">{istatistikler.aktifSantiyeSayisi} <span className="text-xs text-slate-500 font-normal">Grup</span></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sahadaki Toplam Ekip</div>
            <div className="text-lg font-black text-white">{istatistikler.toplamSahadakiUsta} <span className="text-xs text-slate-500 font-normal">Usta</span></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Seçili Gün Gelenler</div>
            <div className="text-lg font-black text-emerald-400">
              {istatistikler.bugunGelenler} / {istatistikler.bugunToplamBeklenen}
              <span className="text-xs text-slate-400 font-normal ml-1">(%{istatistikler.katilimYuzdesi})</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tamamlanan / Arşiv</div>
            <div className="text-lg font-black text-white">{istatistikler.arsivSantiyeSayisi} <span className="text-xs text-slate-500 font-normal">İş</span></div>
          </div>
        </div>
      </div>

      {/* Ana Çalışma Alanı: Sol Kolon (Şantiye Listesi) + Sağ Kolon (Durum & Yoklama Paneli) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Sol Kolon: Şantiye Seçici & Arama (4 kolon) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Aktif / Arşiv Sekmeleri */}
          <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => setAnaSekme('aktif')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                anaSekme === 'aktif' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Aktif ({santiyeler.filter(s => s.Durum === 'Aktif').length})</span>
            </button>

            <button
              onClick={() => setAnaSekme('arsiv')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                anaSekme === 'arsiv' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Arşiv ({santiyeler.filter(s => s.Durum === 'Tamamlandi').length})</span>
            </button>
          </div>

          {/* Şantiye Arama Kutusu */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Şantiye, lokasyon, müşteri veya usta ara..."
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Şantiye Kartları Listesi */}
          <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {filtrelenmisSantiyeler.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-xs text-slate-400 font-medium">Kayıtlı şantiye bulunamadı</div>
                <button
                  onClick={handleYeniSantiyeModalAc}
                  className="text-xs text-blue-400 hover:underline font-bold"
                >
                  + Yeni Şantiye Oluştur
                </button>
              </div>
            ) : (
              filtrelenmisSantiyeler.map(s => {
                const isSelected = String(s.Id) === String(seciliSantiyeId);
                const ekipSayisi = s.Ekip?.length || 0;
                let gunlukGelen = 0;
                s.Ekip?.forEach(e => {
                  if (s.YoklamaKayitlari?.[seciliTarih]?.[e.Id] === true) gunlukGelen++;
                });

                const sonDurum = s.GunlukDurumlar?.[seciliTarih] || Object.values(s.GunlukDurumlar || {}).pop();

                return (
                  <div
                    key={s.Id}
                    onClick={() => setSeciliSantiyeId(s.Id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer text-left relative space-y-2 ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500/80 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-black text-white leading-snug line-clamp-2">
                        {s.SantiyeAdi}
                      </h4>
                      {s.Durum === 'Aktif' ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1 shadow-sm shadow-emerald-400" />
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">Arşiv</span>
                      )}
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-400">
                      {s.Lokasyon && (
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                          <span className="truncate">{s.Lokasyon}</span>
                        </div>
                      )}
                      {s.SorumluUsta && (
                        <div className="flex items-center gap-1 truncate">
                          <HardHat className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate font-medium text-slate-300">{s.SorumluUsta}</span>
                        </div>
                      )}
                    </div>

                    {/* İlerleme ve Katılım Özeti */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-blue-300">
                        <Users className="w-3 h-3" />
                        {gunlukGelen}/{ekipSayisi} Usta Sahada
                      </span>
                      {sonDurum?.IlerlemeYuzdesi !== undefined && (
                        <span className="font-bold text-emerald-400">
                          %{sonDurum.IlerlemeYuzdesi} İlerleme
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sağ Kolon: Seçili Şantiye Detayları, Durum Formu & Yoklama Paneli (8 kolon) */}
        <div className="lg:col-span-8 space-y-4">
          {seciliSantiye ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
              
              {/* Şantiye Detay Başlığı & Aksiyonlar */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      seciliSantiye.Durum === 'Aktif'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {seciliSantiye.Durum === 'Aktif' ? '• AKTİF ŞANTİYE' : 'TAMAMLANMIŞ / ARŞİV'}
                    </span>
                    {seciliSantiye.Lokasyon && (
                      <span className="text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        {seciliSantiye.Lokasyon}
                      </span>
                    )}
                    {seciliSantiye.ProjeAdi && (
                      <span className="text-xs text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-800/50 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-blue-400" />
                        Proje: {seciliSantiye.ProjeAdi}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {seciliSantiye.SantiyeAdi}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    {seciliSantiye.SorumluUsta && (
                      <span><strong>Sorumlu Usta:</strong> {seciliSantiye.SorumluUsta} {seciliSantiye.SorumluTelefon && `(${seciliSantiye.SorumluTelefon})`}</span>
                    )}
                    <span><strong>Başlangıç:</strong> {seciliSantiye.BaslangicTarihi}</span>
                    {seciliSantiye.PlanlananBitisTarihi && (
                      <span><strong>Planlanan Bitiş:</strong> {seciliSantiye.PlanlananBitisTarihi}</span>
                    )}
                  </div>
                </div>

                {/* Sağ Aksiyon Butonları */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setYazdirSantiye(seciliSantiye);
                      setYazdirModalAcik(true);
                    }}
                    title="Şantiye Rapor Çıktısı Al"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-blue-400" />
                    <span>Yazdır / Rapor</span>
                  </button>

                  <button
                    onClick={() => handleDuzenleModalAc(seciliSantiye)}
                    title="Şantiye ve Ekip Bilgilerini Düzenle"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    <span>Düzenle</span>
                  </button>

                  {seciliSantiye.Durum === 'Aktif' ? (
                    <button
                      onClick={() => handleToggleArsiv(seciliSantiye.Id, 'Tamamlandi')}
                      title="Şantiyeyi Tamamla ve Arşive Al"
                      className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Tamamla & Arşivle</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleArsiv(seciliSantiye.Id, 'Aktif')}
                      title="Yeniden Aktif Et"
                      className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Yeniden Aktif Et</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleSantiyeSil(seciliSantiye.Id)}
                    title="Şantiyeyi Sil"
                    className="p-2 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* TARİH SEÇİMİ VE GÜNLÜK MOD BAR */}
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Tarih Seçici */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleGunDegistir(-1)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition"
                    title="Önceki Gün"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <input
                      type="date"
                      value={seciliTarih}
                      onChange={(e) => setSeciliTarih(e.target.value)}
                      className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={() => handleGunDegistir(1)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition"
                    title="Sonraki Gün"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {seciliTarih !== getBugunStr() && (
                    <button
                      onClick={() => setSeciliTarih(getBugunStr())}
                      className="px-2.5 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      Bugün
                    </button>
                  )}
                </div>

                {/* Alt Sekmeler: Durum Raporu / Yoklama / Geçmiş Günlükler / Matris */}
                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1 flex-wrap">
                  <button
                    onClick={() => setDetaySekmesi('durum')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      detaySekmesi === 'durum' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Günlük Durum & Rapor</span>
                  </button>

                  <button
                    onClick={() => setDetaySekmesi('yoklama')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      detaySekmesi === 'yoklama' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Usta Yoklaması ({seciliSantiye.Ekip?.filter(e => seciliSantiye.YoklamaKayitlari?.[seciliTarih]?.[e.Id] === true).length || 0})</span>
                  </button>

                  <button
                    onClick={() => setDetaySekmesi('gecmis')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      detaySekmesi === 'gecmis' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Günlük Rapor Geçmişi</span>
                  </button>

                  <button
                    onClick={() => setDetaySekmesi('matris')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      detaySekmesi === 'matris' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Devam Matrisi</span>
                  </button>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 1. SEKME: GÜNLÜK SAHA DURUMU & RAPOR KAYDI (KULLANICININ ÖZELLİKLE İSTEDİĞİ DURUMU KAYDET FORMU) */}
              {/* ========================================================================= */}
              {detaySekmesi === 'durum' && (
                <div className="space-y-5">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span>{seciliTarih} Tarihli Şantiye Saha Durumu</span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Günün ilerleme durumunu, yapılan montajları, eksik malzemeleri ve saha notlarını girip kaydedin.
                        </p>
                      </div>

                      {/* BÜYÜK ÜST KAYDET BUTONU */}
                      <button
                        type="button"
                        onClick={handleGunlukDurumuKaydet}
                        disabled={kaydediliyor}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>{kaydediliyor ? 'Kaydediliyor...' : '💾 Günlük Durumu Kaydet'}</span>
                      </button>
                    </div>

                    {/* Form Alanları */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Günün Genel Durumu */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                          <span>Günün Genel Durumu</span>
                        </label>
                        <select
                          value={durumOzet}
                          onChange={(e) => setDurumOzet(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                        >
                          <option value="Normal Devam Ediyor">Normal Devam Ediyor</option>
                          <option value="Hızlı İlerliyor">Hızlı İlerliyor (Planın Önünde)</option>
                          <option value="Malzeme Bekleniyor">Malzeme / Parça Bekleniyor</option>
                          <option value="Hava Engeli / Durduruldu">Hava Engeli / Geçici Durduruldu</option>
                          <option value="Müşteri Revizyonu Bekleniyor">Müşteri / Mimar Revizyonu</option>
                          <option value="Montaj Tamamlandı">Montaj & İmalat Tamamlandı</option>
                        </select>
                      </div>

                      {/* Şantiye Tamamlanma Yüzdesi (%) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Toplam İlerleme</span>
                          </label>
                          <span className="text-xs font-black text-emerald-400 font-mono">
                            %{ilerlemeYuzdesi}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={ilerlemeYuzdesi}
                            onChange={(e) => setIlerlemeYuzdesi(Number(e.target.value))}
                            className="flex-1 accent-emerald-500 cursor-pointer"
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={ilerlemeYuzdesi}
                            onChange={(e) => setIlerlemeYuzdesi(Number(e.target.value))}
                            className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-bold text-center"
                          />
                        </div>
                      </div>

                      {/* Hava Durumu / Şantiye Ortamı */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <CloudSun className="w-3.5 h-3.5 text-amber-400" />
                          <span>Hava Durumu / Saha Şartı</span>
                        </label>
                        <select
                          value={havaDurumu}
                          onChange={(e) => setHavaDurumu(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                        >
                          <option value="Güneşli / Açık">Güneşli / Açık</option>
                          <option value="Parçalı Bulutlu">Parçalı Bulutlu</option>
                          <option value="Yağmurlu">Yağmurlu</option>
                          <option value="Rüzgarlı / Fırtına">Rüzgarlı / Fırtına</option>
                          <option value="Soğuk / Kar">Soğuk / Kar Yağışlı</option>
                          <option value="Kapalı / İç Mekan">Kapalı / İç Mekan Şartı</option>
                        </select>
                      </div>
                    </div>

                    {/* Gün İçinde Yapılan İşler */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                          <span>Bugün Tamamlanan Montaj & İmalat İşleri</span>
                        </span>
                        <span className="text-[10px] text-slate-500">Günlük İlerleme Raporu</span>
                      </label>
                      <textarea
                        rows={3}
                        value={yapilanIsler}
                        onChange={(e) => setYapilanIsler(e.target.value)}
                        placeholder="Örn: Mutfak alt dolap iskeletleri duvara monte edildi, ada tezgahın elektrik geçişleri açıldı, kiler rayları takıldı..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Eksik Malzemeler ve Saha Aksaklıkları */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-amber-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Eksik Malzemeler, Hasarlı Parçalar veya Saha İhtiyaçları</span>
                        </span>
                        <span className="text-[10px] text-amber-500/80">Fabrikadan istenecekler</span>
                      </label>
                      <textarea
                        rows={2}
                        value={eksikMalzemeler}
                        onChange={(e) => setEksikMalzemeler(e.target.value)}
                        placeholder="Örn: 2 koli frenli menteşe eksik, boy dolap kapaklarından 1 tanesi çatlak geldi, 5 kutu 3.5x18 vida gerekiyor..."
                        className="w-full bg-slate-900 border border-amber-900/40 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Genel Şantiye Notları & Raporlayan */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">Genel Şantiye Notları & Talimatlar</label>
                        <input
                          type="text"
                          value={genelNotlar}
                          onChange={(e) => setGenelNotlar(e.target.value)}
                          placeholder="Örn: Yarın sabah 09:00'da mermerci gelecek, çalışma alanı süpürüldü..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">Raporlayan / Sorumlu Usta</label>
                        <input
                          type="text"
                          value={raporlayan}
                          onChange={(e) => setRaporlayan(e.target.value)}
                          placeholder="Ad Soyad"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* ALT BÜYÜK KAYDET BUTONU */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-blue-400" />
                        <span>Kaydettiğiniz raporlar şantiye tarihçesinde gün gün saklanır ve PDF / çıktı alınabilir.</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleGunlukDurumuKaydet}
                        disabled={kaydediliyor}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm px-6 py-3 rounded-2xl shadow-xl shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer"
                      >
                        <Save className="w-5 h-5" />
                        <span>{kaydediliyor ? 'Kaydediliyor...' : '💾 GÜNLÜK DURUMU VE RAPORU KAYDET'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 2. SEKME: USTA YOKLAMASI (GELDİ / GELMEDİ TOGGLE) */}
              {/* ========================================================================= */}
              {detaySekmesi === 'yoklama' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-slate-400 px-1">
                    <span className="text-white">{seciliTarih} Tarihli Usta Katılım Listesi</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTopluYoklama(seciliSantiye.Id, true)}
                        className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        ✔ Tüm Ekip Geldi
                      </button>
                      <button
                        onClick={() => handleTopluYoklama(seciliSantiye.Id, false)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {seciliSantiye.Ekip?.map(uye => {
                      const geldiMi = seciliSantiye.YoklamaKayitlari?.[seciliTarih]?.[uye.Id] ?? false;
                      const gunlukNot = seciliSantiye.YoklamaNotlari?.[seciliTarih]?.[uye.Id] || '';

                      return (
                        <div
                          key={uye.Id}
                          className={`p-4 rounded-2xl border transition relative flex flex-col justify-between gap-3 ${
                            geldiMi
                              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                              : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                                uye.Tur === 'Kadrolu'
                                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                              }`}>
                                {uye.AdSoyad.charAt(0)}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-sm font-bold text-white leading-none">
                                    {uye.AdSoyad}
                                  </h4>
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                    uye.Tur === 'Kadrolu'
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  }`}>
                                    {uye.Tur === 'Kadrolu' ? 'Kadrolu Personel' : 'Dış Usta / Yevmiyeci'}
                                  </span>
                                </div>

                                <div className="text-xs text-slate-400 flex items-center gap-2">
                                  <span>{uye.Rol || 'Montaj Ustası'}</span>
                                  {uye.Uzmanlik && <span>• {uye.Uzmanlik}</span>}
                                </div>

                                {uye.Tur === 'Yevmiyeci' && uye.GunlukUcret && (
                                  <div className="text-[11px] text-amber-400/90 font-mono">
                                    Günlük Ücret: ₺{uye.GunlukUcret.toLocaleString('tr-TR')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Yoklama Notu */}
                          {gunlukNot && (
                            <div className="text-xs text-slate-300 bg-slate-900/90 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
                              <span className="italic">"{gunlukNot}"</span>
                              <button
                                onClick={() => {
                                  setNotHedefUye({ uyeId: uye.Id, uyeAd: uye.AdSoyad, not: gunlukNot });
                                  setNotModalAcik(true);
                                }}
                                className="text-[10px] text-blue-400 hover:underline ml-2"
                              >
                                Düzenle
                              </button>
                            </div>
                          )}

                          {/* TOGGLE BUTONU */}
                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setNotHedefUye({ uyeId: uye.Id, uyeAd: uye.AdSoyad, not: gunlukNot });
                                setNotModalAcik(true);
                              }}
                              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition"
                            >
                              {gunlukNot ? 'Notu Düzenle' : '+ Not Ekle'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleYoklama(seciliSantiye.Id, uye.Id)}
                              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-xs transition transform active:scale-95 cursor-pointer shadow-md ${
                                geldiMi
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {geldiMi ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-white" />
                                  <span>GELDİ (İŞTE ÇALIŞIYOR)</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 text-slate-500" />
                                  <span>GELMEDİ (Tıkla ve Geldi Yap)</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 3. SEKME: GÜNLÜK RAPOR GEÇMİŞİ (ŞANTİYENİN GÜN GÜN ARŞİVİ) */}
              {/* ========================================================================= */}
              {detaySekmesi === 'gecmis' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                    <span className="text-white">Şantiye Gün Gün Durum Raporu Geçmişi</span>
                    <span>Toplam {Object.keys(seciliSantiye.GunlukDurumlar || {}).length} Günlük Rapor Kayıtlı</span>
                  </div>

                  {Object.keys(seciliSantiye.GunlukDurumlar || {}).length === 0 ? (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                      <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                      <div className="text-xs text-slate-400">Henüz kaydedilmiş bir günlük durum raporu bulunmuyor.</div>
                      <button
                        onClick={() => setDetaySekmesi('durum')}
                        className="text-xs text-blue-400 font-bold hover:underline"
                      >
                        İlk Günün Durumunu Kaydet →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(seciliSantiye.GunlukDurumlar || {})
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .map(([tarih, rapor]) => {
                          const gelenUstaSayisi = seciliSantiye.Ekip?.filter(e => seciliSantiye.YoklamaKayitlari?.[tarih]?.[e.Id] === true).length || 0;

                          return (
                            <div
                              key={tarih}
                              className={`p-4 rounded-2xl border transition ${
                                tarih === seciliTarih
                                  ? 'bg-blue-950/30 border-blue-500/60 shadow'
                                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="text-sm font-black text-white flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-blue-400" />
                                    {tarih}
                                  </span>
                                  {rapor.DurumOzet && (
                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                      {rapor.DurumOzet}
                                    </span>
                                  )}
                                  {rapor.HavaDurumu && (
                                    <span className="text-[11px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-800/40">
                                      {rapor.HavaDurumu}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 text-xs">
                                  {rapor.IlerlemeYuzdesi !== undefined && (
                                    <span className="font-bold text-emerald-400">
                                      İlerleme: %{rapor.IlerlemeYuzdesi}
                                    </span>
                                  )}
                                  <span className="text-slate-400">
                                    {gelenUstaSayisi} Usta Çalıştı
                                  </span>
                                  <button
                                    onClick={() => {
                                      setSeciliTarih(tarih);
                                      setDetaySekmesi('durum');
                                    }}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-xs font-bold transition"
                                  >
                                    Düzenle
                                  </button>
                                </div>
                              </div>

                              {/* Yapılan İşler */}
                              {rapor.YapilanIsler && (
                                <div className="mt-2.5 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase">Tamamlanan Montajlar:</div>
                                  <div className="mt-0.5 whitespace-pre-line">{rapor.YapilanIsler}</div>
                                </div>
                              )}

                              {/* Eksik Malzemeler */}
                              {rapor.EksikMalzemeVeSorunlar && (
                                <div className="mt-2 text-xs text-amber-300 bg-amber-950/20 p-2.5 rounded-xl border border-amber-900/30">
                                  <div className="text-[10px] font-bold text-amber-400 uppercase">Eksik Malzeme & Sorunlar:</div>
                                  <div className="mt-0.5 whitespace-pre-line">{rapor.EksikMalzemeVeSorunlar}</div>
                                </div>
                              )}

                              {rapor.Raporlayan && (
                                <div className="mt-2 text-[10px] text-slate-500 text-right">
                                  Raporlayan: {rapor.Raporlayan}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* 4. SEKME: TÜM GÜNLER DEVAM MATRİSİ */}
              {/* ========================================================================= */}
              {detaySekmesi === 'matris' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                    <span>ŞANTİYE DEVAM MATRİSİ</span>
                    <span className="text-slate-500">Hücreye tıklayarak durumu anında değiştirebilirsiniz</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-black text-[11px] border-b border-slate-800">
                        <tr>
                          <th className="p-3">Usta / Personel</th>
                          <th className="p-3">Tür / Rol</th>
                          {santiyeCalismaGunleri.map(t => (
                            <th key={t} className={`p-2.5 text-center min-w-[75px] ${t === seciliTarih ? 'bg-blue-950 text-blue-300' : ''}`}>
                              <div>{t.substring(5)}</div>
                              <div className="text-[9px] font-normal lowercase">{t === getBugunStr() ? '(Bugün)' : ''}</div>
                            </th>
                          ))}
                          <th className="p-3 text-center bg-slate-900 font-bold text-emerald-400">Toplam Geldiği Gün</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {seciliSantiye.Ekip?.map(uye => {
                          let toplamGun = 0;
                          santiyeCalismaGunleri.forEach(t => {
                            if (seciliSantiye.YoklamaKayitlari?.[t]?.[uye.Id] === true) {
                              toplamGun++;
                            }
                          });

                          return (
                            <tr key={uye.Id} className="hover:bg-slate-900/50 transition">
                              <td className="p-3 font-bold text-white flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${uye.Tur === 'Kadrolu' ? 'bg-blue-400' : 'bg-indigo-400'}`} />
                                {uye.AdSoyad}
                              </td>
                              <td className="p-3 text-slate-400">
                                <span className="text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                  {uye.Rol || uye.Tur}
                                </span>
                              </td>

                              {santiyeCalismaGunleri.map(t => {
                                const geldiMi = seciliSantiye.YoklamaKayitlari?.[t]?.[uye.Id] ?? false;

                                return (
                                  <td
                                    key={t}
                                    onClick={() => {
                                      setSeciliTarih(t);
                                      handleToggleYoklama(seciliSantiye.Id, uye.Id);
                                    }}
                                    className={`p-2 text-center cursor-pointer transition select-none ${
                                      t === seciliTarih ? 'bg-blue-950/40' : ''
                                    } hover:bg-slate-800`}
                                    title={`${uye.AdSoyad} - ${t}: Tıklayarak durumu değiştir`}
                                  >
                                    {geldiMi ? (
                                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs shadow">
                                        ✔
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 text-slate-600 border border-slate-800 font-black text-xs hover:border-slate-600">
                                        ✖
                                      </span>
                                    )}
                                  </td>
                                );
                              })}

                              <td className="p-3 text-center font-black text-emerald-400 bg-slate-900/60">
                                {toplamGun} Gün
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Şantiye Grubu Seçiniz</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Günlük durum kaydetmek, saha raporu girmek veya usta yoklaması yapmak için sol taraftaki listeden bir şantiye seçin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: YENİ ŞANTİYE / MONTAJ İŞİ EKLEME & DÜZENLEME MODALI */}
      {/* ========================================================================= */}
      {formModalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-3xl shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {duzenlenenSantiye ? 'Şantiye Montaj Grubunu Düzenle' : 'Yeni Şantiye / Montaj İşi Oluştur'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Şantiye adı, lokasyon, sorumlu usta ve sahada çalışacak usta kadrosunu belirleyin
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFormModalAcik(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSantiyeFormKaydet} className="space-y-6">
              {/* Temel Bilgiler */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Şantiye / Montaj İşi Adı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Kadıköy Sahil Villa Ahşap Montajı"
                    value={formSantiyeAdi}
                    onChange={(e) => setFormSantiyeAdi(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Bağlı Fabrika Projesi (Opsiyonel)</label>
                  <select
                    value={formProjeId}
                    onChange={(e) => setFormProjeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Proje Seçilmedi (Bağımsız Şantiye) --</option>
                    {projeler.map(p => (
                      <option key={p.ProjeId} value={p.ProjeId}>
                        {p.ProjeAdi} ({p.Musteri || 'Müşteri Belirtilmedi'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Lokasyon / Açık Adres</label>
                  <input
                    type="text"
                    placeholder="Örn: Kadıköy / İstanbul, Bağdat Cad. No:12"
                    value={formLokasyon}
                    onChange={(e) => setFormLokasyon(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Müşteri / Firma Adı</label>
                  <input
                    type="text"
                    placeholder="Örn: Acar Mimarlık"
                    value={formMusteriFirma}
                    onChange={(e) => setFormMusteriFirma(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Başlangıç Tarihi *</label>
                  <input
                    type="date"
                    required
                    value={formBaslangicTarihi}
                    onChange={(e) => setFormBaslangicTarihi(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Planlanan Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={formPlanlananBitisTarihi}
                    onChange={(e) => setFormPlanlananBitisTarihi(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Sorumlu Usta / Şef</label>
                  <input
                    type="text"
                    placeholder="Örn: Ahmet Usta"
                    value={formSorumluUsta}
                    onChange={(e) => setFormSorumluUsta(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Sorumlu Telefon</label>
                  <input
                    type="text"
                    placeholder="Örn: 0532 555 0000"
                    value={formSorumluTelefon}
                    onChange={(e) => setFormSorumluTelefon(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Şantiye Açıklaması / Notlar</label>
                  <textarea
                    rows={2}
                    placeholder="Montaj detayları, özel talimatlar..."
                    value={formAciklama}
                    onChange={(e) => setFormAciklama(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* EKİP SEÇİCİ VE YÖNETİMİ */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Şantiye Montaj Ekibi Kadrosu ({formEkip.length} Usta Eklendi)</span>
                  </h4>
                </div>

                {/* Ekip Havuzundan Seçim */}
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEkipSeciciSekme('kadrolu')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          ekipSeciciSekme === 'kadrolu' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Fabrika Kadrolu ({personeller.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEkipSeciciSekme('yevmiyeci')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          ekipSeciciSekme === 'yevmiyeci' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Dış Usta / Yevmiyeci ({yevmiyeciler.length})
                      </button>
                    </div>

                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Personel veya usta ara..."
                        value={ekipArama}
                        onChange={(e) => setEkipArama(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Personel / Yevmiyeci Listesi (Seçmek için tıkla) */}
                  <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                    {ekipSeciciSekme === 'kadrolu' ? (
                      personeller
                        .filter(p => !ekipArama || p.AdSoyad.toLowerCase().includes(ekipArama.toLowerCase()))
                        .map(p => {
                          const eklendi = formEkip.some(e => e.Id === `kadrolu_${p.PersonelId}`);
                          return (
                            <button
                              key={p.PersonelId}
                              type="button"
                              onClick={() => handleEkipUyesiEkle('Kadrolu', p.PersonelId)}
                              disabled={eklendi}
                              className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition ${
                                eklendi
                                  ? 'bg-blue-950/20 border-blue-500/30 text-slate-400 opacity-60'
                                  : 'bg-slate-900 border-slate-800 hover:border-blue-500 text-white cursor-pointer'
                              }`}
                            >
                              <div className="truncate">
                                <div className="font-bold truncate">{p.AdSoyad}</div>
                                <div className="text-[10px] text-slate-400 truncate">{p.Gorev || p.Departman || 'Personel'}</div>
                              </div>
                              <span className="text-xs font-bold text-blue-400 ml-2">
                                {eklendi ? '✔ Eklendi' : '+ Ekle'}
                              </span>
                            </button>
                          );
                        })
                    ) : (
                      yevmiyeciler
                        .filter(y => !ekipArama || y.AdSoyad.toLowerCase().includes(ekipArama.toLowerCase()))
                        .map(y => {
                          const eklendi = formEkip.some(e => e.Id === `yevmiyeci_${y.YevmiyeciId}`);
                          return (
                            <button
                              key={y.YevmiyeciId}
                              type="button"
                              onClick={() => handleEkipUyesiEkle('Yevmiyeci', y.YevmiyeciId)}
                              disabled={eklendi}
                              className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition ${
                                eklendi
                                  ? 'bg-indigo-950/20 border-indigo-500/30 text-slate-400 opacity-60'
                                  : 'bg-slate-900 border-slate-800 hover:border-indigo-500 text-white cursor-pointer'
                              }`}
                            >
                              <div className="truncate">
                                <div className="font-bold truncate">{y.AdSoyad}</div>
                                <div className="text-[10px] text-amber-400 truncate">
                                  {y.UzmanlikAlani || 'Dış Usta'} • ₺{y.GunlukYevmiye || 0}/gün
                                </div>
                              </div>
                              <span className="text-xs font-bold text-indigo-400 ml-2">
                                {eklendi ? '✔ Eklendi' : '+ Ekle'}
                              </span>
                            </button>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* Seçilmiş Ekip Üyeleri Tablosu */}
                {formEkip.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-300">Ekibe Dahil Edilen Ustalar & Roller:</div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {formEkip.map(uye => (
                        <div
                          key={uye.Id}
                          className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${uye.Tur === 'Kadrolu' ? 'bg-blue-400' : 'bg-indigo-400'}`} />
                            <span className="font-bold text-white">{uye.AdSoyad}</span>
                            <span className="text-[10px] text-slate-400">({uye.Tur})</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={uye.Rol || 'Montaj Ustası'}
                              onChange={(e) => handleEkipRolDegistir(uye.Id, e.target.value as any)}
                              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                            >
                              <option value="Usta Başı">Usta Başı / Şef</option>
                              <option value="Montaj Ustası">Montaj Ustası</option>
                              <option value="Şantiye Elemanı">Şantiye Elemanı</option>
                              <option value="Çırak / Yardımcı">Çırak / Yardımcı</option>
                              <option value="Şoför & Lojistik">Şoför & Lojistik</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleEkipUyesiCikar(uye.Id)}
                              className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition"
                              title="Ekip Listesinden Çıkar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Butonları */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormModalAcik(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition transform active:scale-95"
                >
                  {duzenlenenSantiye ? 'Değişiklikleri Kaydet' : 'Şantiye Grubunu Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: USTA YOKLAMA NOTU EKLEME / DÜZENLEME */}
      {/* ========================================================================= */}
      {notModalAcik && notHedefUye && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white">
                Yoklama Notu: {notHedefUye.uyeAd}
              </h4>
              <button onClick={() => setNotModalAcik(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">
                {seciliTarih} tarihi için mesai, izin veya açıklama notu:
              </label>
              <textarea
                rows={3}
                value={notHedefUye.not}
                onChange={(e) => setNotHedefUye({ ...notHedefUye, not: e.target.value })}
                placeholder="Örn: 2 saat fazla mesai yaptı, öğleden sonra izinli ayrıldı..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setNotModalAcik(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
              >
                Vazgeç
              </button>
              <button
                onClick={handleNotKaydet}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
              >
                Notu Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: YAZDIRMA & RESMİ RAPOR ÇIKTI MODALI */}
      {/* ========================================================================= */}
      {yazdirModalAcik && yazdirSantiye && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-4xl shadow-2xl space-y-6 my-8 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Printer className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-base font-black text-white">Şantiye Durum & Puantaj Raporu</h3>
                  <p className="text-xs text-slate-400">Yazıcı çıktısı veya PDF olarak arşivlemek için hazırlanan resmi rapor</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>Yazdır / PDF Kaydet</span>
                </button>
                <button
                  onClick={() => setYazdirModalAcik(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Yazdırma Kağıdı Önizleme */}
            <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-inner space-y-6 font-sans border border-slate-200 print:border-none print:shadow-none">
              {/* Antet */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900">ŞANTİYE SAHA VE MONTAJ RAPORU</h1>
                  <p className="text-xs text-slate-600">Rende Ahşap & Mobilya İmalat Fabrikası Dış Montaj Şube</p>
                </div>
                <div className="text-right text-xs">
                  <div><strong>Rapor Tarihi:</strong> {seciliTarih}</div>
                  <div><strong>Durum:</strong> {yazdirSantiye.Durum === 'Aktif' ? 'AKTİF ŞANTİYE' : 'TAMAMLANDI'}</div>
                </div>
              </div>

              {/* Bilgiler */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div><strong>Şantiye Adı:</strong> {yazdirSantiye.SantiyeAdi}</div>
                <div><strong>Lokasyon:</strong> {yazdirSantiye.Lokasyon || '-'}</div>
                <div><strong>Müşteri / Firma:</strong> {yazdirSantiye.MusteriFirma || '-'}</div>
                <div><strong>Sorumlu Usta / Şef:</strong> {yazdirSantiye.SorumluUsta || '-'}</div>
                <div><strong>Başlangıç Tarihi:</strong> {yazdirSantiye.BaslangicTarihi}</div>
                <div><strong>Bitiş Tarihi:</strong> {yazdirSantiye.PlanlananBitisTarihi || yazdirSantiye.GerceklesenBitisTarihi || 'Devam Ediyor'}</div>
              </div>

              {/* Seçili Günlük Rapor Bilgisi */}
              {yazdirSantiye.GunlukDurumlar?.[seciliTarih] && (
                <div className="space-y-2 text-xs border border-slate-300 p-4 rounded-xl">
                  <h4 className="font-bold text-slate-900 uppercase">Günün Durum ve İlerleme Raporu ({seciliTarih}):</h4>
                  <div><strong>Genel Durum:</strong> {yazdirSantiye.GunlukDurumlar[seciliTarih].DurumOzet}</div>
                  <div><strong>Toplam İlerleme:</strong> %{yazdirSantiye.GunlukDurumlar[seciliTarih].IlerlemeYuzdesi}</div>
                  {yazdirSantiye.GunlukDurumlar[seciliTarih].YapilanIsler && (
                    <div><strong>Tamamlanan Montajlar:</strong> {yazdirSantiye.GunlukDurumlar[seciliTarih].YapilanIsler}</div>
                  )}
                  {yazdirSantiye.GunlukDurumlar[seciliTarih].EksikMalzemeVeSorunlar && (
                    <div><strong>Eksik Malzeme & Sorunlar:</strong> {yazdirSantiye.GunlukDurumlar[seciliTarih].EksikMalzemeVeSorunlar}</div>
                  )}
                </div>
              )}

              {/* Ekip ve Puantaj Tablosu */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-900">Usta Kadrosu ve Katılım Durumu</h4>
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800">
                    <tr>
                      <th className="border border-slate-300 p-2">Sıra</th>
                      <th className="border border-slate-300 p-2">Usta Adı Soyadı</th>
                      <th className="border border-slate-300 p-2">Statü / Rol</th>
                      <th className="border border-slate-300 p-2 text-center">{seciliTarih} Yoklama</th>
                      <th className="border border-slate-300 p-2">Günlük Not</th>
                      <th className="border border-slate-300 p-2 text-center">İmza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yazdirSantiye.Ekip?.map((e, idx) => {
                      const geldiMi = yazdirSantiye.YoklamaKayitlari?.[seciliTarih]?.[e.Id] ?? false;
                      const not = yazdirSantiye.YoklamaNotlari?.[seciliTarih]?.[e.Id] || '-';

                      return (
                        <tr key={e.Id}>
                          <td className="border border-slate-300 p-2">{idx + 1}</td>
                          <td className="border border-slate-300 p-2 font-bold">{e.AdSoyad}</td>
                          <td className="border border-slate-300 p-2">{e.Rol || e.Tur}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold">
                            {geldiMi ? 'GELDİ (ÇALIŞTI)' : 'GELMEDİ'}
                          </td>
                          <td className="border border-slate-300 p-2 text-slate-600">{not}</td>
                          <td className="border border-slate-300 p-2 min-w-[90px]"></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* İmza Alanı */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                <div>
                  <div className="font-bold">Şantiye Sorumlu Ustası</div>
                  <div className="mt-1">{yazdirSantiye.SorumluUsta || 'İmza'}</div>
                  <div className="mt-8 border-b border-slate-400 w-32 mx-auto"></div>
                </div>
                <div>
                  <div className="font-bold">Fabrika & Üretim Müdürü</div>
                  <div className="mt-1">Onay & Teslim</div>
                  <div className="mt-8 border-b border-slate-400 w-32 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
