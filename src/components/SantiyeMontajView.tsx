import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Users, Calendar, CheckCircle2, XCircle, Plus, Search, 
  Filter, MapPin, Phone, Clock, ArrowRight, UserCheck, UserX, 
  Archive, RotateCcw, Trash2, Edit3, Check, X, Printer, FileText, 
  AlertCircle, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  HardHat, User, Briefcase, Award, ShieldCheck, Sparkles, DollarSign
} from 'lucide-react';
import { SantiyeMontajGrubu, SantiyeEkipUyesi, Personel, Yevmiyeci, Proje, Departman, Gorev } from '../types';

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

  // Tarih ve Yoklama State'leri
  const getBugunStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [seciliTarih, setSeciliTarih] = useState<string>(getBugunStr());
  const [gorunumModu, setGorunumModu] = useState<'gunluk' | 'matris'>('gunluk');

  // Modal States
  const [formModalAcik, setFormModalAcik] = useState(false);
  const [duzenlenenSantiye, setDuzenlenenSantiye] = useState<SantiyeMontajGrubu | null>(null);
  const [notModalAcik, setNotModalAcik] = useState(false);
  const [notHedefUye, setNotHedefUye] = useState<{ uyeId: string; uyeAd: string; not: string } | null>(null);
  const [yazdirModalAcik, setYazdirModalAcik] = useState(false);
  const [yazdirSantiye, setYazdirSantiye] = useState<SantiyeMontajGrubu | null>(null);

  // Form State'leri
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

  // Filtrelenmiş Şantiyeler (Aktif veya Arşiv)
  const filtrelenmisSantiyeler = useMemo(() => {
    return santiyeler.filter(s => {
      // 1. Durum filtresi (Aktif / Arşiv)
      if (anaSekme === 'aktif' && s.Durum !== 'Aktif') return false;
      if (anaSekme === 'arsiv' && s.Durum !== 'Tamamlandi') return false;

      // 2. Arama filtresi
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

  // =========================================================================
  // YOKLAMA TOGGLE İŞLEMİ (Tek tıkla Geldi / Gelmedi Geçişi)
  // =========================================================================
  const handleToggleYoklama = async (santiyeId: number | string, uyeId: string) => {
    const santiye = santiyeler.find(s => String(s.Id) === String(santiyeId));
    if (!santiye) return;

    const mevcutDurum = santiye.YoklamaKayitlari?.[seciliTarih]?.[uyeId] ?? false;
    const yeniDurum = !mevcutDurum;

    // Local state anında güncellensin (sıfır gecikme)
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

    // Sunucuya ilet
    try {
      await fetch(`/api/montaj-gruplari/${santiyeId}/toggle-yoklama`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uyeId,
          tarih: seciliTarih,
          geldiMi: yeniDurum
        })
      });
    } catch (err) {
      console.warn('Sunucu yoklama senkronizasyon uyarısı:', err);
    }
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
      await fetch(`/api/montaj-gruplari/${santiyeId}/toplu-yoklama`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tarih: seciliTarih,
          durum
        })
      });
    } catch (err) {
      console.warn('Toplu yoklama sunucu uyarısı:', err);
    }
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
        OlusturmaTarihi: getBugunStr()
      };

      // İlk gün için herkesi otomatik geldi yapalım
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

  // Şantiyeyi Arşive Al / Tamamla veya Yeniden Aktif Et
  const handleToggleArsiv = async (santiyeId: number | string, yeniDurum: 'Aktif' | 'Tamamlandi') => {
    const onayMetni = yeniDurum === 'Tamamlandi'
      ? 'Bu şantiye montaj işini tamamlayıp arşive kaldırmak istediğinize emin misiniz? (Tüm geçmiş katılım kayıtları arşivde güvenle saklanacaktır)'
      : 'Bu şantiye montaj işini arşivden çıkarıp tekrar aktif şantiyelere almak istediğinize emin misiniz?';

    if (!window.confirm(onayMetni)) return;

    const bugun = getBugunStr();
    const guncelSantiyeler = santiyeler.map(s => {
      if (String(s.Id) !== String(santiyeId)) return s;
      return {
        ...s,
        Durum: yeniDurum,
        GerceklesenBitisTarihi: yeniDurum === 'Tamamlandi' ? bugun : undefined,
        ArsivlenmeTarihi: yeniDurum === 'Tamamlandi' ? bugun : undefined
      };
    });

    setSantiyeler(guncelSantiyeler);
    kaydetLocal(guncelSantiyeler);

    if (yeniDurum === 'Tamamlandi') {
      gosterBildirim('Şantiye işi tamamlandı ve arşive kaldırıldı.');
      // Eğer seçili olan arşivlendiyse ve aktif sekmedeysek başka aktif şantiye seçelim
      if (anaSekme === 'aktif') {
        const kalanAktif = guncelSantiyeler.find(s => s.Durum === 'Aktif');
        setSeciliSantiyeId(kalanAktif ? kalanAktif.Id : null);
      }
    } else {
      gosterBildirim('Şantiye işi yeniden aktife alındı.');
      setAnaSekme('aktif');
      setSeciliSantiyeId(santiyeId);
    }

    try {
      await fetch(`/api/montaj-gruplari/${santiyeId}/arsivle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durum: yeniDurum })
      });
    } catch (e) {}
  };

  // Şantiyeyi Sil
  const handleSantiyeSil = async (santiyeId: number | string) => {
    if (!window.confirm('Bu şantiye grubunu ve tüm yoklama geçmişini kalıcı olarak silmek istediğinize emin misiniz?')) {
      return;
    }

    const yeniListe = santiyeler.filter(s => String(s.Id) !== String(santiyeId));
    setSantiyeler(yeniListe);
    kaydetLocal(yeniListe);

    if (String(seciliSantiyeId) === String(santiyeId)) {
      setSeciliSantiyeId(yeniListe.length > 0 ? yeniListe[0].Id : null);
    }
    gosterBildirim('Şantiye grubu silindi.');

    try {
      await fetch(`/api/montaj-gruplari/${santiyeId}`, { method: 'DELETE' });
    } catch (e) {}
  };

  // Tarih Değiştirme Yardımcıları
  const handleGunDegistir = (fark: number) => {
    const d = new Date(seciliTarih);
    d.setDate(d.getDate() + fark);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSeciliTarih(`${y}-${m}-${day}`);
  };

  // Şantiyenin çalıştığı tüm günlerin listesini çıkarma (Matris görünümü için)
  const santiyeCalismaGunleri = useMemo(() => {
    if (!seciliSantiye) return [];
    const datesSet = new Set<string>();
    
    // Yoklama kaydı girilmiş tüm tarihler
    if (seciliSantiye.YoklamaKayitlari) {
      Object.keys(seciliSantiye.YoklamaKayitlari).forEach(t => datesSet.add(t));
    }
    
    // Başlangıç ve bugün/bitiş arasındaki tarihler
    const baslangic = new Date(seciliSantiye.BaslangicTarihi || getBugunStr());
    const bitis = seciliSantiye.GerceklesenBitisTarihi 
      ? new Date(seciliSantiye.GerceklesenBitisTarihi) 
      : new Date();

    const curr = new Date(baslangic);
    let guard = 0;
    while (curr <= bitis && guard < 60) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      datesSet.add(`${y}-${m}-${day}`);
      curr.setDate(curr.getDate() + 1);
      guard++;
    }

    datesSet.add(seciliTarih);
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a)); // En yeni gün başta
  }, [seciliSantiye, seciliTarih]);

  return (
    <div className="space-y-6">
      {/* Üst Başlık ve Hızlı İstatistik Paneli */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
                <HardHat className="w-6 h-6" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Dış Montaj &amp; Şantiye Takibi
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Sahada montajda olan ustaları (Kadrolu &amp; Yevmiyeci) takip edin, birden fazla montaj grubunu yönetin ve günlük tek tıkla geldi/gelmedi yoklaması yapın.
            </p>
          </div>

          {/* Aksiyon Butonu */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleYeniSantiyeModalAc}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Yeni Şantiye / Montaj İşi Ekle</span>
            </button>
          </div>
        </div>

        {/* İstatistik Sayaçları */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/60 p-3.5 rounded-2xl">
            <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              Aktif Şantiyeler
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {istatistikler.aktifSantiyeSayisi} <span className="text-xs text-slate-500 font-normal">Grup</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 p-3.5 rounded-2xl">
            <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Sahadaki Ustalar
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {istatistikler.toplamSahadakiUsta} <span className="text-xs text-slate-500 font-normal">({istatistikler.toplamKadrolu} Kadrolu + {istatistikler.toplamYevmiyeci} Yevmiyeci)</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 p-3.5 rounded-2xl">
            <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Bugün Sahaya Gelenler
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              {istatistikler.bugunGelenler} <span className="text-xs text-slate-500 font-normal">/ {istatistikler.bugunToplamBeklenen} ({istatistikler.katilimYuzdesi}%)</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 p-3.5 rounded-2xl">
            <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5 text-slate-400" />
              Tamamlanan (Arşiv)
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-300 mt-1">
              {istatistikler.arsivSantiyeSayisi} <span className="text-xs text-slate-500 font-normal">İş</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bildirim Toast */}
      {bildirim && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 transition shadow-lg ${
          bildirim.tip === 'basari' 
            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' 
            : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
        }`}>
          {bildirim.tip === 'basari' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span className="text-sm font-semibold">{bildirim.metin}</span>
        </div>
      )}

      {/* Sekmeler ve Filtre Çubuğu */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnaSekme('aktif')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              anaSekme === 'aktif'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Aktif Şantiyeler ({santiyeler.filter(s => s.Durum === 'Aktif').length})</span>
          </button>

          <button
            onClick={() => setAnaSekme('arsiv')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              anaSekme === 'arsiv'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Arşiv / Tamamlanan İşler ({santiyeler.filter(s => s.Durum === 'Tamamlandi').length})</span>
          </button>
        </div>

        {/* Arama Kutusu */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            placeholder="Şantiye, usta, şehir ara..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Şantiye Listesi & Detay Alanı Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol Kolon: Şantiye Kartları Listesi (lg: 4 veya 5 kolon) */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
            <span>{anaSekme === 'aktif' ? 'AKTİF ŞANTİYELER' : 'ARŞİVDEKİ ŞANTİYELER'}</span>
            <span>{filtrelenmisSantiyeler.length} Kayıt</span>
          </div>

          {filtrelenmisSantiyeler.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 border-dashed rounded-3xl p-8 text-center space-y-3">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-slate-300 font-semibold text-sm">
                {anaSekme === 'aktif' ? 'Aktif şantiye bulunmuyor' : 'Arşivde şantiye kaydı yok'}
              </div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {anaSekme === 'aktif' 
                  ? 'Dışarıda montajı olan ustaları takip etmek için yukarıdaki butondan yeni şantiye grubu ekleyin.' 
                  : 'Tamamlanan şantiyeler burada listelenir.'}
              </p>
              {anaSekme === 'aktif' && (
                <button
                  onClick={handleYeniSantiyeModalAc}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition"
                >
                  <Plus className="w-4 h-4" /> Şantiye Ekle
                </button>
              )}
            </div>
          ) : (
            filtrelenmisSantiyeler.map(s => {
              const isSelected = String(s.Id) === String(seciliSantiyeId);
              const ekipSayisi = s.Ekip?.length || 0;
              const kadroluSayisi = s.Ekip?.filter(e => e.Tur === 'Kadrolu').length || 0;
              const yevmiyeciSayisi = s.Ekip?.filter(e => e.Tur === 'Yevmiyeci').length || 0;
              
              // Seçili tarihteki katılım sayısı
              const gunlukGelen = s.Ekip?.filter(e => s.YoklamaKayitlari?.[seciliTarih]?.[e.Id] === true).length || 0;

              return (
                <div
                  key={s.Id}
                  onClick={() => setSeciliSantiyeId(s.Id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer text-left relative overflow-hidden ${
                    isSelected
                      ? 'bg-slate-800/90 border-blue-500 shadow-lg shadow-blue-900/20'
                      : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-500" />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          s.Durum === 'Aktif'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {s.Durum === 'Aktif' ? 'AKTİF MONTAJ' : 'TAMAMLANDI'}
                        </span>
                        {s.Lokasyon && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {s.Lokasyon}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white line-clamp-1">
                        {s.SantiyeAdi}
                      </h3>

                      {s.MusteriFirma && (
                        <div className="text-xs text-slate-400 font-medium">
                          Müşteri: {s.MusteriFirma}
                        </div>
                      )}
                    </div>

                    <ChevronRight className={`w-4 h-4 shrink-0 transition ${isSelected ? 'text-blue-400 translate-x-0.5' : 'text-slate-600'}`} />
                  </div>

                  {/* Ekip ve Katılım Özeti */}
                  <div className="mt-3 pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>{ekipSayisi} Usta</span>
                      <span className="text-[10px] text-slate-500 font-mono">({kadroluSayisi}K / {yevmiyeciSayisi}Y)</span>
                    </div>

                    <div className={`font-semibold flex items-center gap-1 ${gunlukGelen > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Bugün: {gunlukGelen}/{ekipSayisi} Geldi</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sağ Kolon: Seçili Şantiyenin İnteraktif Yoklama ve Süreç Paneli (lg: 8 kolon) */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-4">
          {seciliSantiye ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
              {/* Şantiye Detay Başlığı & Aksiyonlar */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      seciliSantiye.Durum === 'Aktif'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {seciliSantiye.Durum === 'Aktif' ? '• AKTİF ŞANTİYE GRUBU' : 'TAMAMLANMIŞ / ARŞİV'}
                    </span>
                    {seciliSantiye.Lokasyon && (
                      <span className="text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        {seciliSantiye.Lokasyon}
                      </span>
                    )}
                    {seciliSantiye.ProjeAdi && (
                      <span className="text-xs text-blue-300 bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800/50 flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-blue-400" />
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

                  {seciliSantiye.Aciklama && (
                    <p className="text-xs text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 mt-2">
                      {seciliSantiye.Aciklama}
                    </p>
                  )}
                </div>

                {/* Sağ Butonlar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setYazdirSantiye(seciliSantiye);
                      setYazdirModalAcik(true);
                    }}
                    title="Şantiye Puantaj ve Yoklama Tutanak Çıktısı Al"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-blue-400" />
                    <span>Yazdır</span>
                  </button>

                  <button
                    onClick={() => handleDuzenleModalAc(seciliSantiye)}
                    title="Şantiye Bilgilerini ve Ekibi Düzenle"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    <span>Düzenle</span>
                  </button>

                  {seciliSantiye.Durum === 'Aktif' ? (
                    <button
                      onClick={() => handleToggleArsiv(seciliSantiye.Id, 'Tamamlandi')}
                      title="Şantiyeyi Tamamla ve Arşive Kaldır"
                      className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>İşi Tamamla &amp; Arşive Al</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleArsiv(seciliSantiye.Id, 'Aktif')}
                      title="Şantiyeyi Arşivden Çıkar ve Yeniden Aktif Et"
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

              {/* YOKLAMA KONTROL ÇUBUĞU (Tarih Seçimi + Günlük / Matris Görünüm Seçimi) */}
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Tarih Seçici */}
                <div className="flex items-center gap-2">
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
                      className="px-2.5 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition"
                    >
                      Bugün
                    </button>
                  )}
                </div>

                {/* Toplu İşlem ve Görünüm Seçimi */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTopluYoklama(seciliSantiye.Id, true)}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Tüm Ekip Geldi</span>
                  </button>

                  <button
                    onClick={() => handleTopluYoklama(seciliSantiye.Id, false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
                  >
                    <span>Temizle</span>
                  </button>

                  {/* Görünüm Geçişi */}
                  <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setGorunumModu('gunluk')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        gorunumModu === 'gunluk' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Günlük Yoklama
                    </button>
                    <button
                      onClick={() => setGorunumModu('matris')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        gorunumModu === 'matris' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tüm Günler Matrisi
                    </button>
                  </div>
                </div>
              </div>

              {/* 1. GÖRÜNÜM: GÜNLÜK YOKLAMA KARTLARI (KULLANICININ ÖZELLİKLE İSTEDİĞİ TEK TIKLA GELDİ / GELMEDİ TOGGLE) */}
              {gorunumModu === 'gunluk' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                    <span>{seciliTarih} TARİHLİ ŞANTİYE DEVAM / YOKLAMA LİSTESİ</span>
                    <span className="text-emerald-400">
                      Geldi Olarak İşaretlenen: {seciliSantiye.Ekip?.filter(e => seciliSantiye.YoklamaKayitlari?.[seciliTarih]?.[e.Id] === true).length || 0} / {seciliSantiye.Ekip?.length || 0} Usta
                    </span>
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
                              {/* Avatar */}
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

                          {/* Yoklama Notu Varsa Göster */}
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

                          {/* BÜYÜK TOGGLE DÜĞMESİ (GELDİ / GELMEDİ) */}
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

                            {/* TOGGLE BUTONU */}
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

              {/* 2. GÖRÜNÜM: TÜM GÜNLER MATRİS TABLOSU */}
              {gorunumModu === 'matris' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                    <span>ŞANTİYE SÜRECİ BOYUNCA GÜNLÜK DEVAM MATRİSİ</span>
                    <span className="text-slate-500">Hücreye tıklayarak geçmiş günlerin yoklamasını da anında değiştirebilirsiniz</span>
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
                Yoklama yapmak veya şantiye detaylarını incelemek için sol taraftaki listeden bir montaj grubu seçin ya da yeni bir şantiye ekleyin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: YENİ ŞANTİYE / MONTAJ İŞİ EKLEME & DÜZENLEME MODALI */}
      {/* ========================================================================= */}
      {formModalAcik && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
                  <HardHat className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-black text-white">
                  {duzenlenenSantiye ? 'Şantiye Montaj Grubunu Düzenle' : 'Yeni Şantiye / Montaj İşi Oluştur'}
                </h3>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Şantiye / Montaj İşi Adı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formSantiyeAdi}
                    onChange={(e) => setFormSantiyeAdi(e.target.value)}
                    placeholder="Örn: Kadıköy Sahil Villa Ahşap Montajı"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Bağlı Fabrika Projesi (Opsiyonel)
                  </label>
                  <select
                    value={formProjeId}
                    onChange={(e) => setFormProjeId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Bağımsız Şantiye İşi --</option>
                    {projeler.map(p => (
                      <option key={p.ProjeId} value={p.ProjeId}>
                        {p.ProjeKodu ? `[${p.ProjeKodu}] ` : ''}{p.ProjeAdi}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Müşteri / Firma Bilgisi
                  </label>
                  <input
                    type="text"
                    value={formMusteriFirma}
                    onChange={(e) => setFormMusteriFirma(e.target.value)}
                    placeholder="Örn: Acar Mimarlık"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Lokasyon / Şehir / Adres
                  </label>
                  <input
                    type="text"
                    value={formLokasyon}
                    onChange={(e) => setFormLokasyon(e.target.value)}
                    placeholder="Örn: Kadıköy / İstanbul"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Sorumlu Usta Başı / Şef
                  </label>
                  <input
                    type="text"
                    value={formSorumluUsta}
                    onChange={(e) => setFormSorumluUsta(e.target.value)}
                    placeholder="Örn: Ahmet Usta"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Montaj Başlangıç Tarihi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formBaslangicTarihi}
                    onChange={(e) => setFormBaslangicTarihi(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Planlanan Bitiş Tarihi (Opsiyonel)
                  </label>
                  <input
                    type="date"
                    value={formPlanlananBitisTarihi}
                    onChange={(e) => setFormPlanlananBitisTarihi(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Açıklama &amp; Şantiye Notları
                  </label>
                  <textarea
                    rows={2}
                    value={formAciklama}
                    onChange={(e) => setFormAciklama(e.target.value)}
                    placeholder="Şantiyede yapılacak işler, özel dikkat edilmesi gereken hususlar..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* EKİP SEÇİM ALANI (HEM KADROLU PERSONEL HEM DE YEVMIYECILERDEN SEÇİM) */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-black text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-400" />
                      Montaj Ekibini Belirleyin ({formEkip.length} Kişi Eklendi)
                    </label>
                    <p className="text-xs text-slate-400">
                      Hem fabrikanın kadrolu çalışanlarından hem de dışarıdan yevmiyeci ustalardan personel ekleyebilirsiniz.
                    </p>
                  </div>
                </div>

                {/* Seçili Ekip Listesi */}
                {formEkip.length > 0 && (
                  <div className="space-y-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Seçili Montaj Ekibi</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {formEkip.map((e) => (
                        <div
                          key={e.Id}
                          className="flex items-center justify-between gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{e.AdSoyad}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded ${
                                e.Tur === 'Kadrolu' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400'
                              }`}>
                                {e.Tur}
                              </span>
                            </div>
                            <div className="text-slate-400 text-[11px]">{e.Uzmanlik}</div>
                          </div>

                          <div className="flex items-center gap-1">
                            <select
                              value={e.Rol || 'Montaj Ustası'}
                              onChange={(evt) => handleEkipRolDegistir(e.Id, evt.target.value as any)}
                              className="bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-300 px-2 py-1"
                            >
                              <option value="Usta Başı">Usta Başı</option>
                              <option value="Montaj Ustası">Montaj Ustası</option>
                              <option value="Şantiye Elemanı">Şantiye Elemanı</option>
                              <option value="Çırak / Yardımcı">Çırak / Yardımcı</option>
                              <option value="Şoför & Lojistik">Şoför &amp; Lojistik</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleEkipUyesiCikar(e.Id)}
                              className="p-1 text-slate-400 hover:text-rose-400 transition"
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

                {/* Personel / Yevmiyeci Ekleme Seçici Paneli */}
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Sekme Seçimi: Kadrolu vs Yevmiyeci */}
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEkipSeciciSekme('kadrolu')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          ekipSeciciSekme === 'kadrolu' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Kadrolu Fabrika Personeli ({personeller.filter(p => p.DurumAktifMi).length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setEkipSeciciSekme('yevmiyeci')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          ekipSeciciSekme === 'yevmiyeci' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Yevmiyeci &amp; Dış Ustalar ({yevmiyeciler.length})
                      </button>
                    </div>

                    <input
                      type="text"
                      value={ekipArama}
                      onChange={(e) => setEkipArama(e.target.value)}
                      placeholder="Personel ara..."
                      className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>

                  {/* Liste */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {ekipSeciciSekme === 'kadrolu' ? (
                      personeller
                        .filter(p => p.DurumAktifMi)
                        .filter(p => !ekipArama || p.AdSoyad.toLowerCase().includes(ekipArama.toLowerCase()))
                        .map(p => {
                          const eklendiMi = formEkip.some(e => e.Id === `kadrolu_${p.PersonelId}`);
                          return (
                            <div
                              key={p.PersonelId}
                              className="flex items-center justify-between p-2 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800/80 text-xs"
                            >
                              <div>
                                <span className="font-bold text-white">{p.AdSoyad}</span>
                                <span className="text-slate-400 text-[11px] ml-2 font-medium">
                                  ({p.Departman || 'Genel'} - {p.Gorev || 'Personel'})
                                </span>
                              </div>

                              <button
                                type="button"
                                disabled={eklendiMi}
                                onClick={() => handleEkipUyesiEkle('Kadrolu', p.PersonelId)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                  eklendiMi
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                                }`}
                              >
                                {eklendiMi ? 'Ekipte ✔' : '+ Ekle'}
                              </button>
                            </div>
                          );
                        })
                    ) : (
                      yevmiyeciler
                        .filter(y => !ekipArama || y.AdSoyad.toLowerCase().includes(ekipArama.toLowerCase()))
                        .map(y => {
                          const eklendiMi = formEkip.some(e => e.Id === `yevmiyeci_${y.YevmiyeciId}`);
                          return (
                            <div
                              key={y.YevmiyeciId}
                              className="flex items-center justify-between p-2 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800/80 text-xs"
                            >
                              <div>
                                <span className="font-bold text-white">{y.AdSoyad}</span>
                                <span className="text-amber-400 text-[11px] ml-2">
                                  ({y.UzmanlikAlani || 'Dış Usta'} - ₺{y.GunlukYevmiye?.toLocaleString('tr-TR')})
                                </span>
                              </div>

                              <button
                                type="button"
                                disabled={eklendiMi}
                                onClick={() => handleEkipUyesiEkle('Yevmiyeci', y.YevmiyeciId)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                  eklendiMi
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                                }`}
                              >
                                {eklendiMi ? 'Ekipte ✔' : '+ Ekle'}
                              </button>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormModalAcik(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition cursor-pointer"
                >
                  {duzenlenenSantiye ? 'Değişiklikleri Kaydet' : 'Şantiye Grubunu Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: GÜNLÜK YOKLAMA NOTU EKLEME / DÜZENLEME MODALI */}
      {/* ========================================================================= */}
      {notModalAcik && notHedefUye && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white">
                Yoklama Notu Ekle / Düzenle
              </h3>
              <button
                onClick={() => setNotModalAcik(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Personel: <strong className="text-white">{notHedefUye.uyeAd}</strong> ({seciliTarih})
              </div>

              <textarea
                rows={3}
                value={notHedefUye.not}
                onChange={(e) => setNotHedefUye({ ...notHedefUye, not: e.target.value })}
                placeholder="Örn: Yarım gün çalıştı, malzeme bekledi, 2 saat fazla mesai yaptı..."
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setNotModalAcik(false)}
                className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                İptal
              </button>
              <button
                onClick={handleNotKaydet}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: YAZDIR / RESMİ ŞANTİYE DEVAM ÇİZELGESİ MODALI */}
      {/* ========================================================================= */}
      {yazdirModalAcik && yazdirSantiye && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">
                  Şantiye Montaj Devam &amp; Yoklama Tutanak Çıktısı
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" /> Yazdır / PDF Kaydet
                </button>
                <button
                  onClick={() => setYazdirModalAcik(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Yazdırma Şablonu */}
            <div className="bg-white text-slate-900 p-8 rounded-2xl space-y-6 shadow font-sans text-xs">
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight">RENDE AHŞAP &amp; FABRİKA YÖNETİMİ</h1>
                  <h2 className="text-sm font-bold text-slate-700 mt-0.5">ŞANTİYE &amp; DIŞ MONTAJ DEVAM TUTANAĞI</h2>
                </div>
                <div className="text-right text-[11px]">
                  <div><strong>Rapor Tarihi:</strong> {getBugunStr()}</div>
                  <div><strong>Durum:</strong> {yazdirSantiye.Durum === 'Aktif' ? 'AKTİF ŞANTİYE' : 'TAMAMLANDI'}</div>
                </div>
              </div>

              {/* Şantiye Detayları */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div><strong>Şantiye Adı:</strong> {yazdirSantiye.SantiyeAdi}</div>
                <div><strong>Lokasyon:</strong> {yazdirSantiye.Lokasyon || '-'}</div>
                <div><strong>Müşteri / Firma:</strong> {yazdirSantiye.MusteriFirma || '-'}</div>
                <div><strong>Sorumlu Usta / Şef:</strong> {yazdirSantiye.SorumluUsta || '-'}</div>
                <div><strong>Başlangıç Tarihi:</strong> {yazdirSantiye.BaslangicTarihi}</div>
                <div><strong>Bitiş Tarihi:</strong> {yazdirSantiye.PlanlananBitisTarihi || yazdirSantiye.GerceklesenBitisTarihi || 'Devam Ediyor'}</div>
              </div>

              {/* Ekip ve Katılım Tablosu */}
              <div>
                <h3 className="font-bold text-sm mb-2 text-slate-900 uppercase">Montaj Ekibi ve Katılım Detayı</h3>
                <table className="w-full border-collapse border border-slate-300 text-left text-xs">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 border border-slate-300">#</th>
                      <th className="p-2 border border-slate-300">Personel / Usta Adı</th>
                      <th className="p-2 border border-slate-300">Statü</th>
                      <th className="p-2 border border-slate-300">Görevi / Rolü</th>
                      <th className="p-2 border border-slate-300 text-center">Toplam Katıldığı Gün</th>
                      <th className="p-2 border border-slate-300 text-right">İmza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yazdirSantiye.Ekip?.map((e, idx) => {
                      let gunSayisi = 0;
                      if (yazdirSantiye.YoklamaKayitlari) {
                        Object.keys(yazdirSantiye.YoklamaKayitlari).forEach(t => {
                          if (yazdirSantiye.YoklamaKayitlari[t]?.[e.Id] === true) {
                            gunSayisi++;
                          }
                        });
                      }

                      return (
                        <tr key={e.Id} className="border-b border-slate-200">
                          <td className="p-2 border border-slate-300">{idx + 1}</td>
                          <td className="p-2 border border-slate-300 font-bold">{e.AdSoyad}</td>
                          <td className="p-2 border border-slate-300">{e.Tur}</td>
                          <td className="p-2 border border-slate-300">{e.Rol || e.Uzmanlik || '-'}</td>
                          <td className="p-2 border border-slate-300 text-center font-bold">{gunSayisi} Gün</td>
                          <td className="p-2 border border-slate-300 min-w-[100px]"></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* İmza Blokları */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200">
                <div className="text-center space-y-12">
                  <div className="font-bold">Şantiye Sorumlu Usta Başı</div>
                  <div className="text-slate-400 text-xs">(İmza / Kaşe)</div>
                </div>
                <div className="text-center space-y-12">
                  <div className="font-bold">Fabrika İK &amp; Proje Müdürü</div>
                  <div className="text-slate-400 text-xs">(İmza / Kaşe)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
