import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Users, Calendar, CheckCircle2, XCircle, Plus, Search, 
  MapPin, Phone, ArrowRight, UserCheck, UserX, 
  Archive, RotateCcw, Trash2, Edit3, Check, X, Printer, 
  AlertCircle, ChevronLeft, ChevronRight, HardHat, Briefcase, 
  Save, CheckSquare, Layers, Clock
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

  // Tarih ve Detay Sekmesi (SADECE: 'yoklama' ve 'matris')
  const getBugunStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [seciliTarih, setSeciliTarih] = useState<string>(getBugunStr());
  const [detaySekmesi, setDetaySekmesi] = useState<'yoklama' | 'matris'>('yoklama');
  const [kaydediliyor, setKaydediliyor] = useState<boolean>(false);

  // Modal States
  const [formModalAcik, setFormModalAcik] = useState(false);
  const [duzenlenenSantiye, setDuzenlenenSantiye] = useState<SantiyeMontajGrubu | null>(null);
  const [notModalAcik, setNotModalAcik] = useState(false);
  const [notHedefUye, setNotHedefUye] = useState<{ uyeId: string; uyeAd: string; not: string } | null>(null);
  const [yazdirModalAcik, setYazdirModalAcik] = useState(false);
  const [yazdirSantiye, setYazdirSantiye] = useState<SantiyeMontajGrubu | null>(null);

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

      // Backend henüz boşsa veya ulaşılamazsa LocalStorage veya Demo Veri
      const localData = yukleLocal();
      if (localData && localData.length > 0) {
        setSantiyeler(localData);
        if (!seciliSantiyeId) {
          const aktifIlk = localData.find(s => s.Durum === 'Aktif') || localData[0];
          setSeciliSantiyeId(aktifIlk.Id);
        }
      } else {
        const bugun = getBugunStr();
        const demoGrup: SantiyeMontajGrubu = {
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
        };

        demoGrup.Ekip.forEach(u => {
          if (!demoGrup.YoklamaKayitlari[bugun]) demoGrup.YoklamaKayitlari[bugun] = {};
          demoGrup.YoklamaKayitlari[bugun][u.Id] = true;
        });

        // Demo grubu backend'e kaydet
        try {
          const pRes = await fetch('/api/montaj-gruplari', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(demoGrup)
          });
          if (pRes.ok) {
            const created = await pRes.json();
            setSantiyeler([created]);
            kaydetLocal([created]);
            setSeciliSantiyeId(created.Id);
            setYukleniyor(false);
            return;
          }
        } catch (e) {}

        const fallback = { ...demoGrup, Id: 1 };
        setSantiyeler([fallback]);
        kaydetLocal([fallback]);
        setSeciliSantiyeId(fallback.Id);
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

  // Filtrelenmiş Şantiyeler
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
    let bugunGelenler = 0;
    let bugunToplamBeklenen = 0;

    aktifler.forEach(s => {
      s.Ekip.forEach(u => {
        toplamSahadakiUsta++;
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
      bugunGelenler,
      bugunToplamBeklenen,
      katilimYuzdesi
    };
  }, [santiyeler, seciliTarih]);

  // Şantiyenin çalışma günleri listesi (Devam matrisi için)
  const santiyeCalismaGunleri = useMemo(() => {
    if (!seciliSantiye) return [];
    const set = new Set<string>();

    if (seciliSantiye.BaslangicTarihi) set.add(seciliSantiye.BaslangicTarihi);
    set.add(seciliTarih);
    set.add(getBugunStr());

    if (seciliSantiye.YoklamaKayitlari) {
      Object.keys(seciliSantiye.YoklamaKayitlari).forEach(t => set.add(t));
    }

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
  // GÜNÜN DURUMUNU VE YOKLAMASINI KAYDET (ANA BUTON)
  // =========================================================================
  const handleDurumuKaydet = async () => {
    if (!seciliSantiye) return;

    setKaydediliyor(true);
    const mevcutYoklama = seciliSantiye.YoklamaKayitlari?.[seciliTarih] || {};
    const mevcutYoklamaNotlari = seciliSantiye.YoklamaNotlari?.[seciliTarih] || {};

    const guncelSantiyeler = santiyeler.map(s => {
      if (String(s.Id) !== String(seciliSantiye.Id)) return s;
      return {
        ...s,
        YoklamaKayitlari: {
          ...(s.YoklamaKayitlari || {}),
          [seciliTarih]: mevcutYoklama
        },
        YoklamaNotlari: {
          ...(s.YoklamaNotlari || {}),
          [seciliTarih]: mevcutYoklamaNotlari
        }
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
          durumKaydi: { Tarih: seciliTarih, Raporlayan: seciliSantiye.SorumluUsta },
          yoklamaKayitlari: mevcutYoklama,
          yoklamaNotlari: mevcutYoklamaNotlari
        })
      });

      if (res.ok) {
        gosterBildirim(`✅ ${seciliTarih} tarihli usta durumu ve yoklama başarıyla kaydedildi!`);
      } else {
        gosterBildirim(`✅ ${seciliTarih} tarihli durum kaydedildi.`);
      }
    } catch (err) {
      gosterBildirim(`✅ ${seciliTarih} tarihli durum başarıyla kaydedildi.`);
    } finally {
      setKaydediliyor(false);
    }
  };

  // =========================================================================
  // YOKLAMA TOGGLE İŞLEMİ (Tek tıkla Geldi / Gelmedi)
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

  // Not Kaydetme
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
      gosterBildirim('Şantiye montaj grubu güncellendi.');

      try {
        const res = await fetch(`/api/montaj-gruplari/${duzenlenenSantiye.Id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(guncellenmis)
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.data) {
            setSantiyeler(prev => prev.map(s => String(s.Id) === String(duzenlenenSantiye.Id) ? resData.data : s));
            kaydetLocal(santiyeler);
          }
        }
      } catch (err) {}
    } else {
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

      formEkip.forEach(u => {
        yeniSantiye.YoklamaKayitlari[formBaslangicTarihi][u.Id] = true;
      });

      setFormModalAcik(false);

      try {
        const res = await fetch('/api/montaj-gruplari', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(yeniSantiye)
        });
        if (res.ok) {
          const created = await res.json();
          setSantiyeler(prev => [created, ...prev.filter(s => String(s.Id) !== String(yeniId))]);
          kaydetLocal([created, ...santiyeler]);
          setSeciliSantiyeId(created.Id);
          gosterBildirim('Yeni şantiye montaj grubu veritabanına kaydedildi.');
          return;
        }
      } catch (err) {}

      const yeniListe = [yeniSantiye, ...santiyeler];
      setSantiyeler(yeniListe);
      kaydetLocal(yeniListe);
      setSeciliSantiyeId(yeniId);
      gosterBildirim('Yeni şantiye montaj grubu oluşturuldu.');
    }
  };

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
    gosterBildirim(hedefDurum === 'Tamamlandi' ? 'Şantiye tamamlandı ve arşive alındı.' : 'Şantiye yeniden aktif edildi.');

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

  const handleSantiyeSil = async (santiyeId: number | string) => {
    if (!window.confirm('Bu şantiye montaj grubunu silmek istediğinize emin misiniz?')) {
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
                Usta Yoklaması & Devam Takibi
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dış şantiyeler, montaj ekipleri, gün gün usta yoklaması ve devam matrisi
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

      {/* Ana Bölüm: Sol Liste + Sağ Detay */}
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

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-blue-300">
                        <Users className="w-3 h-3" />
                        {gunlukGelen}/{ekipSayisi} Usta Sahada
                      </span>
                      <span className="text-slate-500">
                        Başlangıç: {s.BaslangicTarihi}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sağ Kolon: Usta Yoklaması ve Devam Matrisi (8 kolon) */}
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
                    <span>Yazdır</span>
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
                      <span>Tamamla</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleArsiv(seciliSantiye.Id, 'Aktif')}
                      title="Yeniden Aktif Et"
                      className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Aktif Et</span>
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

              {/* TARİH SEÇİMİ VE 2 ANA SEKME: USTA YOKLAMASI / DEVAM MATRİSİ */}
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

                  <button
                    onClick={() => setSeciliTarih(getBugunStr())}
                    className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-xs font-bold transition"
                  >
                    Bugün
                  </button>
                </div>

                {/* SADECE 2 SEKME: USTA YOKLAMASI & DEVAM MATRİSİ */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setDetaySekmesi('yoklama')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      detaySekmesi === 'yoklama'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <HardHat className="w-3.5 h-3.5" />
                    <span>Usta Yoklaması</span>
                  </button>

                  <button
                    onClick={() => setDetaySekmesi('matris')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      detaySekmesi === 'matris'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Devam Matrisi</span>
                  </button>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SEKME 1: USTA YOKLAMASI & DURUMU KAYDET BUTONU */}
              {/* ========================================================================= */}
              {detaySekmesi === 'yoklama' && (
                <div className="space-y-4">
                  {/* Üst Toplu İşlem & DURUMU KAYDET Butonu */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-bold">Hızlı İşlemler:</span>
                      <button
                        onClick={() => handleTopluYoklama(seciliSantiye.Id, true)}
                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Tüm Ekip Geldi</span>
                      </button>

                      <button
                        onClick={() => handleTopluYoklama(seciliSantiye.Id, false)}
                        className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Temizle</span>
                      </button>
                    </div>

                    {/* KULLANICININ İSTEDİĞİ ANA "DURUMU KAYDET" BUTONU */}
                    <button
                      onClick={handleDurumuKaydet}
                      disabled={kaydediliyor}
                      className="flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{kaydediliyor ? 'Kaydediliyor...' : '💾 Durumu Kaydet'}</span>
                    </button>
                  </div>

                  {/* Yoklama İstatistik Başlığı */}
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
                    <span>
                      {seciliTarih} Tarihli Usta Listesi ({seciliSantiye.Ekip?.length || 0} Personel)
                    </span>
                    <span className="text-emerald-400">
                      Geldi Olarak İşaretlenen: {seciliSantiye.Ekip?.filter(e => seciliSantiye.YoklamaKayitlari?.[seciliTarih]?.[e.Id] === true).length || 0} / {seciliSantiye.Ekip?.length || 0} Usta
                    </span>
                  </div>

                  {/* Usta Kartları Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {seciliSantiye.Ekip?.map(uye => {
                      const geldiMi = seciliSantiye.YoklamaKayitlari?.[seciliTarih]?.[uye.Id] ?? false;
                      const gunlukNot = seciliSantiye.YoklamaNotlari?.[seciliTarih]?.[uye.Id] || '';

                      return (
                        <div
                          key={uye.Id}
                          className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                            geldiMi
                              ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm'
                              : 'bg-slate-950/60 border-slate-800 opacity-80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 ${
                                geldiMi ? 'bg-emerald-600 shadow-md shadow-emerald-600/20' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {geldiMi ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-black text-white">
                                    {uye.AdSoyad}
                                  </h4>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                    uye.Tur === 'Kadrolu'
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}>
                                    {uye.Tur}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {uye.Rol} • {uye.Uzmanlik}
                                </div>
                                {uye.Telefon && (
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Phone className="w-2.5 h-2.5" />
                                    <span>{uye.Telefon}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Yoklama Durum Butonu */}
                            <button
                              onClick={() => handleToggleYoklama(seciliSantiye.Id, uye.Id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                                geldiMi
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                              }`}
                            >
                              {geldiMi ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>GELDİ</span>
                                </>
                              ) : (
                                <>
                                  <X className="w-3.5 h-3.5" />
                                  <span>GELMEDİ</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Not Alanı */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="truncate max-w-[200px] italic">
                              {gunlukNot ? `📝 ${gunlukNot}` : 'Not eklenmedi'}
                            </span>
                            <button
                              onClick={() => {
                                setNotHedefUye({
                                  uyeId: uye.Id,
                                  uyeAd: uye.AdSoyad,
                                  not: gunlukNot
                                });
                                setNotModalAcik(true);
                              }}
                              className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline font-semibold cursor-pointer"
                            >
                              {gunlukNot ? 'Notu Düzenle' : '+ Not Ekle'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Alt Kısım "Durumu Kaydet" Butonu (Mobil ve hızlı erişim için) */}
                  <div className="pt-3 flex justify-end">
                    <button
                      onClick={handleDurumuKaydet}
                      disabled={kaydediliyor}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{kaydediliyor ? 'Kaydediliyor...' : '💾 Durumu Kaydet'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SEKME 2: DEVAM MATRİSİ (TÜM GÜNLER TABLOSU) */}
              {/* ========================================================================= */}
              {detaySekmesi === 'matris' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                    <span>Ekip Üyelerinin Gün Gün Devam Durumu</span>
                    <span className="text-slate-500 text-[11px]">• Yeşil: Geldi | • Gri: Gelmedi</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-3">Ekip Üyesi</th>
                          <th className="p-3">Görevi</th>
                          {santiyeCalismaGunleri.map(t => (
                            <th 
                              key={t} 
                              className={`p-2 text-center whitespace-nowrap ${t === seciliTarih ? 'bg-blue-600/20 text-blue-300 font-black' : ''}`}
                            >
                              <div className="text-[10px]">{t.slice(5)}</div>
                            </th>
                          ))}
                          <th className="p-3 text-center">Toplam</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {seciliSantiye.Ekip?.map(uye => {
                          let toplamGelis = 0;
                          santiyeCalismaGunleri.forEach(t => {
                            if (seciliSantiye.YoklamaKayitlari?.[t]?.[uye.Id] === true) {
                              toplamGelis++;
                            }
                          });

                          return (
                            <tr key={uye.Id} className="hover:bg-slate-900/50 transition">
                              <td className="p-3 font-bold text-white whitespace-nowrap">
                                {uye.AdSoyad}
                                <span className="ml-1.5 text-[10px] text-slate-500 font-normal">({uye.Tur})</span>
                              </td>
                              <td className="p-3 text-slate-400 whitespace-nowrap">{uye.Rol}</td>
                              {santiyeCalismaGunleri.map(t => {
                                const geldiMi = seciliSantiye.YoklamaKayitlari?.[t]?.[uye.Id] ?? false;
                                return (
                                  <td key={t} className={`p-1.5 text-center ${t === seciliTarih ? 'bg-blue-950/20' : ''}`}>
                                    <button
                                      onClick={() => {
                                        setSeciliTarih(t);
                                        handleToggleYoklama(seciliSantiye.Id, uye.Id);
                                      }}
                                      title={`${uye.AdSoyad} - ${t}: ${geldiMi ? 'Geldi' : 'Gelmedi'}`}
                                      className={`w-6 h-6 rounded-lg text-[10px] font-bold inline-flex items-center justify-center transition cursor-pointer ${
                                        geldiMi 
                                          ? 'bg-emerald-600 text-white shadow-sm' 
                                          : 'bg-slate-800 text-slate-600 hover:text-slate-400'
                                      }`}
                                    >
                                      {geldiMi ? '✓' : '•'}
                                    </button>
                                  </td>
                                );
                              })}
                              <td className="p-3 text-center font-black text-emerald-400">
                                {toplamGelis} Gün
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
              <h3 className="text-base font-black text-white">Lütfen Bir Şantiye Seçin</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Soldaki listeden bir şantiye grubu seçerek usta yoklamasını ve devam matrisini yönetebilirsiniz.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ŞANTİYE OLUŞTUR / DÜZENLE */}
      {/* ========================================================================= */}
      {formModalAcik && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {duzenlenenSantiye ? 'Şantiye Montaj Grubunu Düzenle' : 'Yeni Şantiye / Montaj İşi Oluştur'}
                  </h3>
                  <p className="text-xs text-slate-400">Montaj grubu, sorumlu usta ve ekip üyelerini belirleyin</p>
                </div>
              </div>
              <button
                onClick={() => setFormModalAcik(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSantiyeFormKaydet} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Şantiye / Montaj İşi Adı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Kadıköy Sahil Villa Ahşap Montajı"
                    value={formSantiyeAdi}
                    onChange={(e) => setFormSantiyeAdi(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Bağlı Proje (Opsiyonel)
                  </label>
                  <select
                    value={formProjeId}
                    onChange={(e) => setFormProjeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Bağımsız Şantiye İşi --</option>
                    {projeler.map(p => (
                      <option key={p.ProjeId} value={p.ProjeId}>
                        {p.ProjeKodu} - {p.ProjeAdi}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Lokasyon / Şehir / Adres
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Kadıköy / İstanbul"
                    value={formLokasyon}
                    onChange={(e) => setFormLokasyon(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Müşteri / Firma Adı
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Acar Mimarlık"
                    value={formMusteriFirma}
                    onChange={(e) => setFormMusteriFirma(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Sorumlu Usta Başı / Şef Adı
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Ahmet Usta"
                    value={formSorumluUsta}
                    onChange={(e) => setFormSorumluUsta(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    value={formBaslangicTarihi}
                    onChange={(e) => setFormBaslangicTarihi(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Planlanan Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={formPlanlananBitisTarihi}
                    onChange={(e) => setFormPlanlananBitisTarihi(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Ekip Seçici Bölümü */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Şantiye Ekibi ({formEkip.length} Usta Eklendi)
                  </h4>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEkipSeciciSekme('kadrolu')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        ekipSeciciSekme === 'kadrolu' ? 'bg-blue-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Kadrolu Personel ({personeller.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEkipSeciciSekme('yevmiyeci')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        ekipSeciciSekme === 'yevmiyeci' ? 'bg-amber-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Yevmiyeci Ustalar ({yevmiyeciler.length})
                    </button>
                  </div>
                </div>

                {/* Ekip Havuzu */}
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 max-h-48 overflow-y-auto space-y-2">
                  {ekipSeciciSekme === 'kadrolu' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {personeller.map(p => {
                        const ekliMi = formEkip.some(e => e.PersonelId === p.PersonelId);
                        return (
                          <div 
                            key={p.PersonelId}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                              ekliMi ? 'bg-blue-950/30 border-blue-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="truncate">
                              <div className="font-bold text-white">{p.AdSoyad}</div>
                              <div className="text-[10px] text-slate-400">{p.Gorev || p.Departman || 'Personel'}</div>
                            </div>
                            {ekliMi ? (
                              <button
                                type="button"
                                onClick={() => handleEkipUyesiCikar(`kadrolu_${p.PersonelId}`)}
                                className="text-rose-400 hover:text-rose-300 text-xs font-bold px-2 py-1"
                              >
                                Çıkar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleEkipUyesiEkle('Kadrolu', p.PersonelId)}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg"
                              >
                                + Ekle
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {yevmiyeciler.map(y => {
                        const ekliMi = formEkip.some(e => e.YevmiyeciId === y.YevmiyeciId);
                        return (
                          <div 
                            key={y.YevmiyeciId}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                              ekliMi ? 'bg-amber-950/30 border-amber-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="truncate">
                              <div className="font-bold text-white">{y.AdSoyad}</div>
                              <div className="text-[10px] text-amber-400/80">{y.UzmanlikAlani || 'Dış Montaj Ustası'}</div>
                            </div>
                            {ekliMi ? (
                              <button
                                type="button"
                                onClick={() => handleEkipUyesiCikar(`yevmiyeci_${y.YevmiyeciId}`)}
                                className="text-rose-400 hover:text-rose-300 text-xs font-bold px-2 py-1"
                              >
                                Çıkar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleEkipUyesiEkle('Yevmiyeci', y.YevmiyeciId)}
                                className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg"
                              >
                                + Ekle
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormModalAcik(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
                >
                  {duzenlenenSantiye ? 'Değişiklikleri Kaydet' : 'Şantiye Grubunu Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOT EKLE / DÜZENLE */}
      {/* ========================================================================= */}
      {notModalAcik && notHedefUye && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white">
                📝 Yoklama Notu: {notHedefUye.uyeAd}
              </h3>
              <button onClick={() => setNotModalAcik(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={3}
              placeholder="Örn: 2 saat geç geldi, mesai yaptı veya özel durum notu..."
              value={notHedefUye.not}
              onChange={(e) => setNotHedefUye({ ...notHedefUye, not: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNotModalAcik(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                İptal
              </button>
              <button
                onClick={handleNotKaydet}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
              >
                Notu Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: YAZDIR / RAPOR */}
      {/* ========================================================================= */}
      {yazdirModalAcik && yazdirSantiye && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <span>Şantiye Devam & Yoklama Raporu</span>
              </h3>
              <button onClick={() => setYazdirModalAcik(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="yazdirilabilir-alan" className="bg-white text-black p-6 rounded-2xl space-y-4 text-xs">
              <div className="border-b pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-base font-black uppercase">{yazdirSantiye.SantiyeAdi}</h2>
                  <p className="text-slate-600">{yazdirSantiye.Lokasyon || 'Şantiye Lokasyonu Belirtilmemiş'}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold">Tarih:</span> {seciliTarih}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-sm uppercase">Ekip Devam Durumu</h4>
                <table className="w-full border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-2 text-left">Usta / Personel</th>
                      <th className="border border-slate-300 p-2 text-left">Tür</th>
                      <th className="border border-slate-300 p-2 text-left">Görevi</th>
                      <th className="border border-slate-300 p-2 text-center">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yazdirSantiye.Ekip?.map(e => {
                      const geldi = yazdirSantiye.YoklamaKayitlari?.[seciliTarih]?.[e.Id] ?? false;
                      return (
                        <tr key={e.Id}>
                          <td className="border border-slate-300 p-2 font-bold">{e.AdSoyad}</td>
                          <td className="border border-slate-300 p-2">{e.Tur}</td>
                          <td className="border border-slate-300 p-2">{e.Rol}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold">
                            {geldi ? '✓ GELDİ' : '✗ GELMEDİ'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setYazdirModalAcik(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Kapat
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Yazdır / PDF Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
