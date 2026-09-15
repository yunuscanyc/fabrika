import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Plus, Search, Filter, Phone, MessageSquare, Star, 
  MapPin, CreditCard, Calendar, CheckCircle2, Clock, AlertCircle, 
  Trash2, Edit, X, User, ExternalLink, ShieldCheck, ChevronDown, 
  ChevronUp, Camera, Upload, Building2, Check, UserCheck, UserX,
  UserMinus
} from 'lucide-react';
import { Yevmiyeci, YevmiyeCalismaKaydi, Proje, Departman, Gorev } from '../types';

interface YevmiyeciViewProps {
  projeler?: Proje[];
  departmanlar: Departman[];
  gorevler: Gorev[];
  onRefresh?: () => void;
}

const UZMANLIK_LISTESI = [
  'Mobilya Montaj Ustası',
  'Şantiye Montaj Elemanı',
  'Cila & Lake Boya Ustası',
  'Astar & Macun Hazırlık Elemanı',
  'CNC Operatörü / Ustası',
  'Kenar Bantlama & Ebatlama',
  'Zımpara & Dolgu Elemanı',
  'Demir & Metal Kaynak Ustası',
  'Döşeme & Kumaş Kaplama',
  'Masif Panel & Ahşap İşleme Ustası',
  'Planyacı / Tomruk Kesim Ustası',
  'Döşeme Çatım Ustası',
  'Paketleme & Ambalaj Elemanı',
  'Yükleme & Sevkiyat Elemanı',
  'Forklift Operatörü / Depocu',
  'Vasıfsız / Genel İmalat Elemanı',
  'Temizlik & Hizmet Görevlisi'
];

export const YevmiyeciView: React.FC<YevmiyeciViewProps> = ({ projeler = [], departmanlar, gorevler, onRefresh }) => {
  const [yevmiyeciler, setYevmiyeciler] = useState<Yevmiyeci[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [aramaMetni, setAramaMetni] = useState('');
  const [durumFiltresi, setDurumFiltresi] = useState<string>('Tumu');
  const [uzmanlikFiltresi, setUzmanlikFiltresi] = useState<string>('Tumu');

  // Modal States
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenenYevmiyeci, setDuzenlenenYevmiyeci] = useState<Yevmiyeci | null>(null);
  
  // Proje Atama / Çalışma Ekleme Modalı
  const [calismaModalAcik, setCalismaModalAcik] = useState(false);
  const [seciliYevmiyeci, setSeciliYevmiyeci] = useState<Yevmiyeci | null>(null);

  // Detay & Geçmiş Modalı
  const [gecmisModalAcik, setGecmisModalAcik] = useState(false);
  const [detayYevmiyeci, setDetayYevmiyeci] = useState<Yevmiyeci | null>(null);

  // Form States (Ekleme / Düzenleme)
  const [adSoyad, setAdSoyad] = useState('');
  const [telefon, setTelefon] = useState('');
  const [tcKimlikNo, setTcKimlikNo] = useState('');
  const [ibanNo, setIbanNo] = useState('');
  const [uzmanlikAlani, setUzmanlikAlani] = useState('Mobilya Montaj Ustası');
  const [gunlukYevmiye, setGunlukYevmiye] = useState<number>(2500);
  const [durum, setDurum] = useState<'Musait' | 'ProjedeCalisiyor' | 'Izinli' | 'KaraListe'>('Musait');
  const [puan, setPuan] = useState<number>(5);
  const [guvenilirlik, setGuvenilirlik] = useState<'CokIyi' | 'Standart' | 'DikkatEdilmeli'>('CokIyi');
  const [fotograf, setFotograf] = useState<string>('');
  const [notlar, setNotlar] = useState('');
  const [ikametSehir, setIkametSehir] = useState('');
  const [seciliProjeId, setSeciliProjeId] = useState<string>('');

  // Çalışma / Proje Kayıt Form States
  const [calismaProjeId, setCalismaProjeId] = useState<string>('');
  const [calismaProjeAdi, setCalismaProjeAdi] = useState<string>('');
  const [calismaBaslangic, setCalismaBaslangic] = useState<string>('');
  const [calismaBitis, setCalismaBitis] = useState<string>('');
  const [calismaGunSayisi, setCalismaGunSayisi] = useState<number>(1);
  const [calismaGunlukUcret, setCalismaGunlukUcret] = useState<number>(2500);
  const [calismaOdemeDurumu, setCalismaOdemeDurumu] = useState<'Odendi' | 'KismenOdendi' | 'Bekliyor'>('Bekliyor');
  const [calismaAciklama, setCalismaAciklama] = useState<string>('');
  const [projeyiTamamlaVeBosaCikar, setProjeyiTamamlaVeBosaCikar] = useState<boolean>(false);

  // Bildirim ve Durum Mesajı
  const [kayitMesaji, setKayitMesaji] = useState<string | null>(null);
  const [fotoYukleniyor, setFotoYukleniyor] = useState(false);

  // LocalStorage Önbellek Yardımcıları (Ağ kesintilerinde veya yavaşlıklarda veri kaybını %100 önler)
  const LOCAL_STORAGE_KEY = 'fabrika_yevmiyeciler_v1';
  const kaydetLocalStorage = (liste: Yevmiyeci[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(liste));
    } catch (e) {
      console.warn('LocalStorage kayıt uyarısı:', e);
    }
  };

  const yukleLocalStorage = (): Yevmiyeci[] | null => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('LocalStorage okuma uyarısı:', e);
    }
    return null;
  };

  // Akıllı Fotoğraf Sıkıştırma (Büyük kamera/telefon fotoğraflarını 360x360 piksele küçültür, ~30KB yapar)
  const compressImageFile = (file: File, maxDim = 360, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve((e.target?.result as string) || '');
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          try {
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch {
            resolve((e.target?.result as string) || '');
          }
        };
        img.onerror = () => resolve((e.target?.result as string) || '');
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // Verileri Sunucudan veya Yerel Hafızadan Yükle
  const verileriYukle = async () => {
    // 1. Önce varsa yerel önbellekten anında doldur (gecikmesiz açılış)
    const cached = yukleLocalStorage();
    if (cached && cached.length > 0) {
      setYevmiyeciler(cached);
    }

    try {
      setYukleniyor(true);
      const res = await fetch('/api/yevmiyeciler');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setYevmiyeciler(data);
          kaydetLocalStorage(data);
        }
      }
    } catch (err) {
      console.warn('Sunucudan yükleme ağ uyarısı, yerel önbellek devrede:', err);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    verileriYukle();
  }, []);

  // Fotoğraf Yükleme (Otomatik Canvas Optimizasyonu)
  const handleFotoYukle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setFotoYukleniyor(true);
      const compressed = await compressImageFile(file, 360, 0.8);
      setFotograf(compressed);
    } catch (err) {
      console.warn('Fotoğraf işleme hatası:', err);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setFotograf(uploadEvent.target?.result as string || '');
      };
      reader.readAsDataURL(file);
    } finally {
      setFotoYukleniyor(false);
    }
  };

  // Yeni Modal Açılışı
  const handleYeniEkleModal = () => {
    setDuzenlenenYevmiyeci(null);
    setAdSoyad('');
    setTelefon('');
    setTcKimlikNo('');
    setIbanNo('');
    setUzmanlikAlani(gorevler[0]?.Ad || 'Mobilya Montaj Ustası');
    setGunlukYevmiye(2500);
    setDurum('Musait');
    setPuan(5);
    setGuvenilirlik('CokIyi');
    setFotograf('');
    setNotlar('');
    setIkametSehir('Antalya');
    setSeciliProjeId('');
    setModalAcik(true);
  };

  // Düzenleme Modal Açılışı
  const handleDuzenleModal = (y: Yevmiyeci) => {
    setDuzenlenenYevmiyeci(y);
    setAdSoyad(y.AdSoyad);
    setTelefon(y.Telefon);
    setTcKimlikNo(y.TcKimlikNo || '');
    setIbanNo(y.IbanNo || '');
    setUzmanlikAlani(y.UzmanlikAlani);
    setGunlukYevmiye(y.GunlukYevmiye || 0);
    setDurum(y.Durum);
    setPuan(y.Puan || 5);
    setGuvenilirlik(y.Guvenilirlik || 'CokIyi');
    setFotograf(y.Fotograf || '');
    setNotlar(y.Notlar || '');
    setIkametSehir(y.IkametSehir || '');
    setSeciliProjeId(y.AktifProjeId ? String(y.AktifProjeId) : '');
    setModalAcik(true);
  };

  // Kaydet (Yeni veya Güncelle - Yerel Öncelikli Güvenli Kayıt)
  const handleKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adSoyad.trim()) {
      alert('Lütfen ad ve soyad giriniz.');
      return;
    }

    const seciliProje = projeler.find(p => String(p.ProjeId) === seciliProjeId);

    const payload = {
      AdSoyad: adSoyad.trim(),
      Telefon: telefon.trim(),
      TcKimlikNo: tcKimlikNo.trim(),
      IbanNo: ibanNo.trim(),
      UzmanlikAlani: uzmanlikAlani,
      GunlukYevmiye: Number(gunlukYevmiye) || 0,
      Durum: seciliProjeId ? ('ProjedeCalisiyor' as const) : durum,
      AktifProjeId: seciliProje ? seciliProje.ProjeId : null,
      AktifProjeAdi: seciliProje ? seciliProje.ProjeAdi : null,
      Puan: Number(puan) || 5,
      Guvenilirlik: guvenilirlik,
      Fotograf: fotograf,
      Notlar: notlar.trim(),
      IkametSehir: ikametSehir.trim()
    };

    if (duzenlenenYevmiyeci) {
      const guncellenmis: Yevmiyeci = {
        ...duzenlenenYevmiyeci,
        ...payload,
        YevmiyeciId: duzenlenenYevmiyeci.YevmiyeciId,
        AktifProjeId: payload.AktifProjeId || undefined,
        AktifProjeAdi: payload.AktifProjeAdi || undefined,
      };

      // 1. ADIM: Yerel state ve LocalStorage anında güncellenir (Asla Network Hatası fırlatmaz)
      setYevmiyeciler(prev => {
        const next = prev.map(y => y.YevmiyeciId === duzenlenenYevmiyeci.YevmiyeciId ? guncellenmis : y);
        kaydetLocalStorage(next);
        return next;
      });
      setModalAcik(false);
      setKayitMesaji(`"${guncellenmis.AdSoyad}" bilgileri başarıyla kaydedildi.`);
      setTimeout(() => setKayitMesaji(null), 3500);

      // 2. ADIM: Arka planda sunucuya senkronize et
      try {
        const res = await fetch(`/api/yevmiyeciler/${duzenlenenYevmiyeci.YevmiyeciId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const sunucuVerisi = await res.json();
          setYevmiyeciler(prev => {
            const next = prev.map(y => y.YevmiyeciId === duzenlenenYevmiyeci.YevmiyeciId ? sunucuVerisi : y);
            kaydetLocalStorage(next);
            return next;
          });
        }
      } catch (err) {
        console.warn('Sunucu senkronizasyon uyarısı (yerel hafızaya kaydedildi):', err);
      }
    } else {
      const yeniKayit: Yevmiyeci = {
        ...payload,
        YevmiyeciId: Date.now(),
        KayitTarihi: new Date().toISOString().split('T')[0],
        CalismaGecmisi: [],
        Belgeler: [],
        AktifProjeId: payload.AktifProjeId || undefined,
        AktifProjeAdi: payload.AktifProjeAdi || undefined,
      };

      // 1. ADIM: Anında yerel listeye ekle
      setYevmiyeciler(prev => {
        const next = [yeniKayit, ...prev];
        kaydetLocalStorage(next);
        return next;
      });
      setModalAcik(false);
      setKayitMesaji(`Yeni yevmiyeci usta "${yeniKayit.AdSoyad}" başarıyla kaydedildi.`);
      setTimeout(() => setKayitMesaji(null), 3500);

      // 2. ADIM: Arka planda sunucuya kaydet
      try {
        const res = await fetch('/api/yevmiyeciler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const sunucuVerisi = await res.json();
          setYevmiyeciler(prev => {
            const next = prev.map(y => y.YevmiyeciId === yeniKayit.YevmiyeciId ? sunucuVerisi : y);
            kaydetLocalStorage(next);
            return next;
          });
        }
      } catch (err) {
        console.warn('Sunucu senkronizasyon uyarısı (yerel hafızaya kaydedildi):', err);
      }
    }
  };

  // Silme (Yerel Öncelikli)
  const handleSil = async (id: number, isim: string) => {
    if (!window.confirm(`"${isim}" adlı yevmiyeci personel kaydını silmek istediğinize emin misiniz?`)) {
      return;
    }

    setYevmiyeciler(prev => {
      const next = prev.filter(y => y.YevmiyeciId !== id);
      kaydetLocalStorage(next);
      return next;
    });

    try {
      await fetch(`/api/yevmiyeciler/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Silme sunucu uyarısı:', err);
    }
  };

  // Projeden Çıkar / Boşa Çıkar (Yerel Öncelikli)
  const handleProjedenCikar = async (y: Yevmiyeci) => {
    const projeIsmi = y.AktifProjeAdi || 'projeden';
    if (!window.confirm(`"${y.AdSoyad}" adlı usta ${projeIsmi} ayrılsın ve durumu 'Müsait' yapılsın mı? (Geçmiş çalışma kaydı arşive kaydedilecektir)`)) {
      return;
    }

    const bugun = new Date().toISOString().split('T')[0];
    let gecmis = Array.isArray(y.CalismaGecmisi) ? [...y.CalismaGecmisi] : [];
    const oldProjeId = y.AktifProjeId;
    const oldProjeAdi = y.AktifProjeAdi;

    if (oldProjeAdi || oldProjeId) {
      const existingIdx = gecmis.findIndex(g => 
        (oldProjeId && g.ProjeId === oldProjeId) || 
        (oldProjeAdi && g.ProjeAdi && g.ProjeAdi.trim().toLowerCase() === oldProjeAdi.trim().toLowerCase())
      );
      if (existingIdx !== -1) {
        gecmis[existingIdx] = {
          ...gecmis[existingIdx],
          BitisTarihi: bugun,
          Aciklama: gecmis[existingIdx].Aciklama || `${oldProjeAdi || 'Proje'} görevi tamamlandı (Arşivlendi).`
        };
      } else {
        gecmis.unshift({
          KayitId: `YEV-${Date.now()}`,
          ProjeId: oldProjeId || undefined,
          ProjeAdi: oldProjeAdi || 'Şantiye/Proje',
          BaslangicTarihi: y.KayitTarihi || bugun,
          BitisTarihi: bugun,
          GunSayisi: 1,
          GunlukUcret: y.GunlukYevmiye || 2500,
          ToplamUcret: y.GunlukYevmiye || 2500,
          OdemeDurumu: 'Bekliyor',
          Aciklama: `${oldProjeAdi || 'Proje'} saha çalışması tamamlandı ve arşive alındı.`
        });
      }
    }

    const guncel: Yevmiyeci = {
      ...y,
      Durum: 'Musait',
      AktifProjeId: undefined,
      AktifProjeAdi: undefined,
      CalismaGecmisi: gecmis
    };

    setYevmiyeciler(prev => {
      const next = prev.map(item => item.YevmiyeciId === y.YevmiyeciId ? guncel : item);
      kaydetLocalStorage(next);
      return next;
    });

    if (detayYevmiyeci && detayYevmiyeci.YevmiyeciId === y.YevmiyeciId) {
      setDetayYevmiyeci(guncel);
    }
    if (seciliYevmiyeci && seciliYevmiyeci.YevmiyeciId === y.YevmiyeciId) {
      setSeciliYevmiyeci(guncel);
    }

    setKayitMesaji(`"${y.AdSoyad}" projeden çıkarıldı ve çalışma kaydı arşive alındı.`);
    setTimeout(() => setKayitMesaji(null), 3500);

    try {
      await fetch(`/api/yevmiyeciler/${y.YevmiyeciId}/projeden-cikar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ProjeAdi: oldProjeAdi, ProjeId: oldProjeId })
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.warn('Projeden çıkarma sunucu uyarısı:', err);
    }
  };

  // Çalışma / Proje Ata Modalı Açılışı
  const handleCalismaModalAc = (y: Yevmiyeci) => {
    setSeciliYevmiyeci(y);
    setCalismaProjeId(y.AktifProjeId ? String(y.AktifProjeId) : (projeler[0] ? String(projeler[0].ProjeId) : ''));
    setCalismaProjeAdi(y.AktifProjeAdi || (projeler[0] ? projeler[0].ProjeAdi : ''));
    
    const bugun = new Date().toISOString().split('T')[0];
    setCalismaBaslangic(bugun);
    setCalismaBitis(bugun);
    setCalismaGunSayisi(1);
    setCalismaGunlukUcret(y.GunlukYevmiye || 2500);
    setCalismaOdemeDurumu('Bekliyor');
    setCalismaAciklama('');
    setProjeyiTamamlaVeBosaCikar(false);
    setCalismaModalAcik(true);
  };

  // Çalışma Kaydet (Yerel Öncelikli)
  const handleCalismaKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seciliYevmiyeci) return;

    const seciliP = projeler.find(p => String(p.ProjeId) === calismaProjeId);
    const projeAdi = seciliP ? seciliP.ProjeAdi : (calismaProjeAdi || 'Belirtilmemiş Proje');
    const toplamUcret = (Number(calismaGunSayisi) || 1) * (Number(calismaGunlukUcret) || 0);

    const yeniCalismaKaydi: YevmiyeCalismaKaydi = {
      KayitId: `YEV-${Date.now()}`,
      ProjeId: seciliP ? seciliP.ProjeId : undefined,
      ProjeAdi: projeAdi,
      BaslangicTarihi: calismaBaslangic,
      BitisTarihi: calismaBitis,
      GunSayisi: Number(calismaGunSayisi) || 1,
      GunlukUcret: Number(calismaGunlukUcret) || 0,
      ToplamUcret: toplamUcret,
      OdemeDurumu: calismaOdemeDurumu,
      Aciklama: calismaAciklama.trim()
    };

    const guncelYevmiyeci: Yevmiyeci = {
      ...seciliYevmiyeci,
      Durum: projeyiTamamlaVeBosaCikar ? 'Musait' : 'ProjedeCalisiyor',
      AktifProjeId: projeyiTamamlaVeBosaCikar ? undefined : (seciliP ? seciliP.ProjeId : seciliYevmiyeci.AktifProjeId),
      AktifProjeAdi: projeyiTamamlaVeBosaCikar ? undefined : (seciliP ? seciliP.ProjeAdi : seciliYevmiyeci.AktifProjeAdi),
      CalismaGecmisi: [yeniCalismaKaydi, ...(seciliYevmiyeci.CalismaGecmisi || [])]
    };

    setYevmiyeciler(prev => {
      const next = prev.map(item => item.YevmiyeciId === seciliYevmiyeci.YevmiyeciId ? guncelYevmiyeci : item);
      kaydetLocalStorage(next);
      return next;
    });
    setCalismaModalAcik(false);
    setKayitMesaji(`"${seciliYevmiyeci.AdSoyad}" için çalışma kaydı eklendi.`);
    setTimeout(() => setKayitMesaji(null), 3500);

    try {
      const res = await fetch(`/api/yevmiyeciler/${seciliYevmiyeci.YevmiyeciId}/calisma-ekle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...yeniCalismaKaydi,
          Durum: projeyiTamamlaVeBosaCikar ? 'Musait' : 'ProjedeCalisiyor'
        })
      });
      if (res.ok) {
        const sunucuVerisi = await res.json();
        setYevmiyeciler(prev => {
          const next = prev.map(item => item.YevmiyeciId === seciliYevmiyeci.YevmiyeciId ? sunucuVerisi : item);
          kaydetLocalStorage(next);
          return next;
        });
      }
    } catch (err) {
      console.warn('Sunucuya çalışma kaydı uyarısı:', err);
    }
  };

  // Filtrelenmiş Liste
  const filtrelenmisYevmiyeciler = yevmiyeciler.filter(y => {
    const adEslesir = y.AdSoyad.toLowerCase().includes(aramaMetni.toLowerCase()) ||
                      y.Telefon.includes(aramaMetni) ||
                      (y.Notlar && y.Notlar.toLowerCase().includes(aramaMetni.toLowerCase())) ||
                      (y.UzmanlikAlani && y.UzmanlikAlani.toLowerCase().includes(aramaMetni.toLowerCase()));
    
    const durumEslesir = durumFiltresi === 'Tumu' ? true : y.Durum === durumFiltresi;
    const uzmanlikEslesir = uzmanlikFiltresi === 'Tumu' ? true : y.UzmanlikAlani === uzmanlikFiltresi;

    return adEslesir && durumEslesir && uzmanlikEslesir;
  });

  // İstatistikler
  const toplamYevmiyeci = yevmiyeciler.length;
  const projedeCalisan = yevmiyeciler.filter(y => y.Durum === 'ProjedeCalisiyor').length;
  const musaitUsta = yevmiyeciler.filter(y => y.Durum === 'Musait').length;
  const ortalamaYevmiye = toplamYevmiyeci > 0 
    ? Math.round(yevmiyeciler.reduce((acc, curr) => acc + (curr.GunlukYevmiye || 0), 0) / toplamYevmiyeci) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Kayıt Başarı / Durum Bildirimi */}
      {kayitMesaji && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{kayitMesaji}</span>
        </div>
      )}

      {/* Üst Bilgi ve Aksiyon Kartı */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-5 sm:p-6 rounded-2xl border border-indigo-900/40 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Dışarıdan Yevmiyeci &amp; Proje Bazlı Personel
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Dönemsel ve proje bazlı çalışan ustaların kayıtları, uzmanlıkları, günlük yevmiyeleri ve proje çalışma karnesi.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleYeniEkleModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Yeni Yevmiyeci Usta Ekle
          </button>
        </div>

        {/* Özet İstatistik Sayaçları */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-xl">
            <p className="text-xs text-slate-400 font-medium">Toplam Kayıtlı Usta</p>
            <p className="text-2xl font-bold text-white mt-1">{toplamYevmiyeci}</p>
          </div>

          <div className="bg-emerald-950/40 border border-emerald-800/50 p-3.5 rounded-xl">
            <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Projede Çalışan
            </p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">{projedeCalisan}</p>
          </div>

          <div className="bg-blue-950/40 border border-blue-800/50 p-3.5 rounded-xl">
            <p className="text-xs text-blue-400 font-medium">Müsait (Çağrılabilir)</p>
            <p className="text-2xl font-bold text-blue-300 mt-1">{musaitUsta}</p>
          </div>

          <div className="bg-amber-950/40 border border-amber-800/50 p-3.5 rounded-xl">
            <p className="text-xs text-amber-400 font-medium">Ort. Günlük Yevmiye</p>
            <p className="text-2xl font-bold text-amber-300 mt-1">
              {ortalamaYevmiye.toLocaleString('tr-TR')} <span className="text-xs text-amber-400/80 font-normal">₺/gün</span>
            </p>
          </div>
        </div>
      </div>

      {/* Arama & Filtreleme Çubuğu */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={aramaMetni}
            onChange={e => setAramaMetni(e.target.value)}
            placeholder="İsim, telefon, uzmanlık veya not ara..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          {aramaMetni && (
            <button
              onClick={() => setAramaMetni('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Durum Filtresi */}
          <select
            value={durumFiltresi}
            onChange={e => setDurumFiltresi(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="Tumu">Tüm Durumlar</option>
            <option value="Musait">Müsait (Boşta)</option>
            <option value="ProjedeCalisiyor">Projede Çalışıyor</option>
            <option value="Izinli">İzinli / Meşgul</option>
            <option value="KaraListe">Kara Liste (Tavsiye Edilmez)</option>
          </select>

          {/* Uzmanlık Filtresi */}
          <select
            value={uzmanlikFiltresi}
            onChange={e => setUzmanlikFiltresi(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="Tumu">Tüm Uzmanlıklar</option>
            {gorevler.map(g => (
              <option key={g.Id} value={g.Ad}>{g.Ad}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Yevmiyeci Kartları Listesi */}
      {yukleniyor ? (
        <div className="py-16 text-center text-slate-400">
          <div className="inline-block animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mb-3"></div>
          <p className="text-sm">Yevmiyeci personel veritabanı yükleniyor...</p>
        </div>
      ) : filtrelenmisYevmiyeciler.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <UserX className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Eşleşen Yevmiyeci Usta Bulunamadı</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-5">
            Arama kriterlerinizi değiştirebilir veya projeniz için dışarıdan temin ettiğiniz yeni bir yevmiyeci ekleyebilirsiniz.
          </p>
          <button
            onClick={handleYeniEkleModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition"
          >
            <Plus className="w-4 h-4" />
            İlk Yevmiyeciyi Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtrelenmisYevmiyeciler.map(y => {
            const toplamCalisilanGun = y.CalismaGecmisi?.reduce((acc, c) => acc + (c.GunSayisi || 0), 0) || 0;
            const toplamKazanilan = y.CalismaGecmisi?.reduce((acc, c) => acc + (c.ToplamUcret || 0), 0) || 0;

            return (
              <div
                key={y.YevmiyeciId}
                className={`bg-slate-900 rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-md hover:shadow-xl hover:border-slate-700 ${
                  y.Durum === 'ProjedeCalisiyor'
                    ? 'border-emerald-500/40 bg-gradient-to-b from-slate-900 to-emerald-950/10'
                    : y.Durum === 'KaraListe'
                    ? 'border-rose-900/50 bg-rose-950/10'
                    : 'border-slate-800'
                }`}
              >
                {/* Kart Başlığı & Profil Alanı */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Fotoğraf veya İsim Baş Harfi Avatarı */}
                      <div className="relative">
                        {y.Fotograf ? (
                          <img
                            src={y.Fotograf}
                            alt={y.AdSoyad}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-500/50 shadow-md"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-slate-800 flex items-center justify-center text-white font-bold text-lg border-2 border-indigo-500/30 shadow-md">
                            {y.AdSoyad.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {/* Küçük Durum Noktası */}
                        <span
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                            y.Durum === 'ProjedeCalisiyor'
                              ? 'bg-emerald-500 ring-2 ring-emerald-500/30'
                              : y.Durum === 'Musait'
                              ? 'bg-blue-500'
                              : y.Durum === 'KaraListe'
                              ? 'bg-rose-600'
                              : 'bg-amber-500'
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-base text-white tracking-tight hover:text-indigo-400 transition">
                            {y.AdSoyad}
                          </h3>
                        </div>

                        <p className="text-xs font-semibold text-indigo-400 mt-0.5">
                          {y.UzmanlikAlani}
                        </p>

                        {/* Yıldız Değerlendirmesi */}
                        <div className="flex items-center gap-1 mt-1 text-amber-400">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`w-3 h-3 ${
                                idx < (y.Puan || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                              }`}
                            />
                          ))}
                          <span className="text-[10px] text-slate-400 ml-1 font-medium">
                            ({y.Puan || 5}/5)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Durum Rozeti */}
                    <div>
                      {y.Durum === 'ProjedeCalisiyor' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Projede
                        </span>
                      ) : y.Durum === 'Musait' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Müsait
                        </span>
                      ) : y.Durum === 'KaraListe' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Kara Liste
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          İzinli
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Aktif Çalıştığı Proje Bilgisi (Varsa) */}
                  {(y.Durum === 'ProjedeCalisiyor' || y.AktifProjeAdi || y.AktifProjeId) && (
                    <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          Aktif Görev Aldığı Proje
                        </span>
                        <button
                          type="button"
                          onClick={() => handleProjedenCikar(y)}
                          title="Ustayla bu projeyi sonlandır, boşa çıkar"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-[11px] font-bold transition shadow-xs"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Projeden Çıkar</span>
                        </button>
                      </div>
                      <p className="text-xs font-bold text-white line-clamp-1">
                        {y.AktifProjeAdi || 'Aktif Proje'}
                      </p>
                    </div>
                  )}

                  {/* Günlük Yevmiye & İkamet */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                    <div>
                      <p className="text-[11px] text-slate-400">Günlük Yevmiye</p>
                      <p className="text-sm font-bold text-emerald-400">
                        {y.GunlukYevmiye ? `${y.GunlukYevmiye.toLocaleString('tr-TR')} ₺` : 'Belirtilmedi'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-400">Konum / Şehir</p>
                      <p className="text-xs font-semibold text-slate-300 flex items-center gap-1 truncate mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        {y.IkametSehir || 'Antalya'}
                      </p>
                    </div>
                  </div>

                  {/* Telefon & Hızlı İletişim */}
                  <div className="flex items-center justify-between bg-slate-800/60 rounded-xl p-2.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-mono">{y.Telefon || 'Telefon girilmedi'}</span>
                    </div>

                    {y.Telefon && (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${y.Telefon}`}
                          title="Hemen Ara"
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${y.Telefon.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          title="WhatsApp'tan Yaz"
                          className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Personel Hakkında Notlar */}
                  {y.Notlar && (
                    <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-2.5">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                        Usta Hakkında Not:
                      </p>
                      <p className="text-xs text-slate-300 line-clamp-2 italic">
                        "{y.Notlar}"
                      </p>
                    </div>
                  )}

                  {/* Çalışma Karnesi Özeti */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-800/30 rounded-xl px-3 py-2">
                    <span>Tamamlanan Proje İşi: <strong className="text-white">{y.CalismaGecmisi?.length || 0}</strong></span>
                    <span>Toplam: <strong className="text-indigo-300">{toplamCalisilanGun} gün</strong></span>
                  </div>
                </div>

                {/* Kart Alt Aksiyon Butonları */}
                <div className="bg-slate-900/90 border-t border-slate-800 p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Projeye Gönder / Çalışma Ekle Butonu */}
                    <button
                      type="button"
                      onClick={() => handleCalismaModalAc(y)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      İş / Proje Ata
                    </button>

                    {/* Projeden Çıkar Butonu (Eğer projede çalışıyorsa) */}
                    {(y.Durum === 'ProjedeCalisiyor' || y.AktifProjeAdi || y.AktifProjeId) && (
                      <button
                        type="button"
                        onClick={() => handleProjedenCikar(y)}
                        title="Ustayla bu projeyi sonlandır ve boşa çıkar"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold shadow-sm transition"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>Projeden Çıkar</span>
                      </button>
                    )}

                    {/* Geçmiş Butonu */}
                    <button
                      type="button"
                      onClick={() => {
                        setDetayYevmiyeci(y);
                        setGecmisModalAcik(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                    >
                      Geçmiş ({y.CalismaGecmisi?.length || 0})
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuzenleModal(y)}
                      title="Düzenle"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSil(y.YevmiyeciId, y.AdSoyad)}
                      title="Sil"
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: YENİ YEVMİYECİ EKLE VEYA DÜZENLE */}
      {/* ========================================================================= */}
      {modalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-800/60 border-b border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {duzenlenenYevmiyeci ? 'Yevmiyeci Usta Bilgilerini Güncelle' : 'Yeni Yevmiyeci Usta Kaydı'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Proje bazlı geçici ve dönemsel personel profili oluşturun.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalAcik(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleKaydet} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Fotoğraf Yükleme & Önizleme Alanı */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative">
                  {fotograf ? (
                    <img
                      src={fotograf}
                      alt="Usta Fotoğrafı"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-500">
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-[10px]">Fotoğraf</span>
                    </div>
                  )}
                  {fotograf && (
                    <button
                      type="button"
                      onClick={() => setFotograf('')}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-500"
                      title="Fotoğrafı Kaldır"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 text-center sm:text-left flex-1">
                  <p className="text-xs font-semibold text-white">Usta Fotoğrafı Yükle</p>
                  <p className="text-[11px] text-slate-400">
                    Şantiye ve fabrikada tanınması için ustanın vesikalık veya çalışma fotoğrafını yükleyebilirsiniz (Max 5MB).
                  </p>
                  <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-semibold cursor-pointer transition ${
                    fotoYukleniyor ? 'bg-indigo-800 opacity-75' : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}>
                    {fotoYukleniyor ? (
                      <>
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>Fotoğraf Optimize Ediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Cihazdan Fotoğraf Seç</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={fotoYukleniyor}
                      onChange={handleFotoYukle}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Temel Bilgiler Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Ad Soyad <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adSoyad}
                    onChange={e => setAdSoyad(e.target.value)}
                    placeholder="Örn: Hasan Demir"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Telefon Numarası
                  </label>
                  <input
                    type="text"
                    value={telefon}
                    onChange={e => setTelefon(e.target.value)}
                    placeholder="Örn: 0532 555 12 34"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Uzmanlık / Branş
                  </label>
                  <select
                    value={uzmanlikAlani}
                    onChange={e => setUzmanlikAlani(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  >
                    {gorevler.map(g => (
                      <option key={g.Id} value={g.Ad}>{g.Ad}</option>
                    ))}
                    <option value="Diğer / Özel">Diğer / Özel Uzmanlık</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Günlük Yevmiye Ücreti (₺)
                  </label>
                  <input
                    type="number"
                    value={gunlukYevmiye}
                    onChange={e => setGunlukYevmiye(Number(e.target.value))}
                    placeholder="Örn: 2500"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    TC Kimlik No (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={tcKimlikNo}
                    onChange={e => setTcKimlikNo(e.target.value)}
                    placeholder="11 haneli TC kimlik"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    İkamet Şehir / İlçe
                  </label>
                  <input
                    type="text"
                    value={ikametSehir}
                    onChange={e => setIkametSehir(e.target.value)}
                    placeholder="Örn: Antalya / Kepez"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* IBAN No */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Banka IBAN Numarası (Yevmiye &amp; Havale İçin)
                </label>
                <input
                  type="text"
                  value={ibanNo}
                  onChange={e => setIbanNo(e.target.value)}
                  placeholder="TR..."
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Durum & Değerlendirme Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/60">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mevcut Durumu
                  </label>
                  <select
                    value={durum}
                    onChange={e => setDurum(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Musait">Müsait (Boşta / Çağrılabilir)</option>
                    <option value="ProjedeCalisiyor">Projede Çalışıyor</option>
                    <option value="Izinli">İzinli / Meşgul</option>
                    <option value="KaraListe">Kara Liste (Tavsiye Edilmez)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    İşçilik Puanı (1 - 5)
                  </label>
                  <select
                    value={puan}
                    onChange={e => setPuan(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 text-amber-400 font-bold"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 - Kusursuz Usta)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 - Çok İyi)</option>
                    <option value={3}>⭐⭐⭐ (3 - Standart)</option>
                    <option value={2}>⭐⭐ (2 - Gelişmeli)</option>
                    <option value={1}>⭐ (1 - Sorunlu)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Güvenilirlik
                  </label>
                  <select
                    value={guvenilirlik}
                    onChange={e => setGuvenilirlik(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CokIyi">Çok Güvenilir</option>
                    <option value="Standart">Standart</option>
                    <option value="DikkatEdilmeli">Dikkat Edilmeli / Kontrollü</option>
                  </select>
                </div>
              </div>

              {/* Aktif Projeye Atama (Opsiyonel) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Şu Anda Bir Fabrika / Şantiye Projesinde Mi Çalışıyor?
                </label>
                <select
                  value={seciliProjeId}
                  onChange={e => setSeciliProjeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Hayır, Boşta / Proje Atanmadı</option>
                  {projeler.map(p => (
                    <option key={p.ProjeId} value={p.ProjeId}>
                      {p.ProjeKodu} - {p.ProjeAdi} ({p.MusteriFirma})
                    </option>
                  ))}
                </select>
              </div>

              {/* Personel Hakkında Notlar & Yorumlar */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Personel Hakkında Notlar &amp; İzlenimler
                </label>
                <textarea
                  rows={3}
                  value={notlar}
                  onChange={e => setNotlar(e.target.value)}
                  placeholder="Ustanın iş kalitesi, el takımları, hızı, ahlakı ve dikkat edilmesi gereken konular..."
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAcik(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition active:scale-95"
                >
                  {duzenlenenYevmiyeci ? 'Değişiklikleri Kaydet' : 'Yevmiyeciyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROJEYE ATA / ÇALIŞMA GÜNLÜĞÜ EKLE */}
      {/* ========================================================================= */}
      {calismaModalAcik && seciliYevmiyeci && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
            <div className="p-5 bg-indigo-950/40 border-b border-indigo-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-300 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {seciliYevmiyeci.AdSoyad} - Proje Çalışması Kaydet
                  </h3>
                  <p className="text-xs text-indigo-300/80">
                    Ustanın görev aldığı projeyi ve hak edişini kaydedin.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCalismaModalAcik(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCalismaKaydet} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Görev Alınan Proje <span className="text-rose-500">*</span>
                </label>
                <select
                  value={calismaProjeId}
                  onChange={e => {
                    setCalismaProjeId(e.target.value);
                    const p = projeler.find(prj => String(prj.ProjeId) === e.target.value);
                    if (p) setCalismaProjeAdi(p.ProjeAdi);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                >
                  {projeler.map(p => (
                    <option key={p.ProjeId} value={p.ProjeId}>
                      {p.ProjeKodu} - {p.ProjeAdi}
                    </option>
                  ))}
                  <option value="diger">Diğer / Manuel Proje Adı Yaz</option>
                </select>
              </div>

              {calismaProjeId === 'diger' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Özel Proje / Şantiye Adı
                  </label>
                  <input
                    type="text"
                    required
                    value={calismaProjeAdi}
                    onChange={e => setCalismaProjeAdi(e.target.value)}
                    placeholder="Örn: X Oteli Acil Tadilatı"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    value={calismaBaslangic}
                    onChange={e => setCalismaBaslangic(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bitiş / Teslim Tarihi
                  </label>
                  <input
                    type="date"
                    value={calismaBitis}
                    onChange={e => setCalismaBitis(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Çalışılan Gün Sayısı
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={calismaGunSayisi}
                    onChange={e => setCalismaGunSayisi(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Günlük Ücret (₺)
                  </label>
                  <input
                    type="number"
                    value={calismaGunlukUcret}
                    onChange={e => setCalismaGunlukUcret(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Hesaplanan Toplam Hak Ediş */}
              <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs text-indigo-300 font-medium">Toplam Hak Ediş Tutarı:</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {((calismaGunSayisi || 1) * (calismaGunlukUcret || 0)).toLocaleString('tr-TR')} ₺
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ödeme Durumu
                </label>
                <select
                  value={calismaOdemeDurumu}
                  onChange={e => setCalismaOdemeDurumu(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="Bekliyor">Ödeme Bekliyor / Hak Edişte</option>
                  <option value="KismenOdendi">Kısmen Ödendi (Avans Verildi)</option>
                  <option value="Odendi">Tamamı Ödendi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Yapılan İş / Görev Notu
                </label>
                <textarea
                  rows={2}
                  value={calismaAciklama}
                  onChange={e => setCalismaAciklama(e.target.value)}
                  placeholder="Örn: 2. kat mutfak montajı ve lake panellerin takılması..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Projeyi Tamamla ve Boşa Çıkar Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={projeyiTamamlaVeBosaCikar}
                  onChange={e => setProjeyiTamamlaVeBosaCikar(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs text-slate-200">
                  Bu iş tamamlandı, ustanın durumunu <strong>'Müsait'</strong> olarak güncelle
                </span>
              </label>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCalismaModalAcik(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ÇALIŞMA GEÇMİŞİ & KARNE DETAYI */}
      {/* ========================================================================= */}
      {gecmisModalAcik && detayYevmiyeci && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="p-5 bg-slate-800/60 border-b border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {detayYevmiyeci.AdSoyad} - Proje Çalışma Karnesi
                  </h3>
                  <p className="text-xs text-slate-400">
                    {detayYevmiyeci.UzmanlikAlani} • {detayYevmiyeci.Telefon}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setGecmisModalAcik(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Aktif Çalıştığı Proje Bilgisi ve Çıkarma Butonu */}
              {(detayYevmiyeci.Durum === 'ProjedeCalisiyor' || detayYevmiyeci.AktifProjeAdi || detayYevmiyeci.AktifProjeId) && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-800/60 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-300 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                        Şu An Aktif Görev Aldığı Proje
                      </p>
                      <p className="text-xs font-bold text-white truncate">
                        {detayYevmiyeci.AktifProjeAdi || 'Aktif Proje'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleProjedenCikar(detayYevmiyeci)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition shadow-sm shrink-0"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Projeden Çıkar</span>
                  </button>
                </div>
              )}

              {detayYevmiyeci.CalismaGecmisi?.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Henüz kayıtlı proje çalışma geçmişi bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detayYevmiyeci.CalismaGecmisi.map((c, idx) => (
                    <div
                      key={c.KayitId || idx}
                      className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-white">{c.ProjeAdi}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {c.BaslangicTarihi} - {c.BitisTarihi || 'Devam Ediyor'} ({c.GunSayisi} gün)
                          </p>
                        </div>

                        <div>
                          {c.OdemeDurumu === 'Odendi' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Ödendi
                            </span>
                          ) : c.OdemeDurumu === 'KismenOdendi' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Kısmen Ödendi
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              Ödeme Bekliyor
                            </span>
                          )}
                        </div>
                      </div>

                      {c.Aciklama && (
                        <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg">
                          {c.Aciklama}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/50">
                        <span className="text-slate-400">
                          Günlük: {c.GunlukUcret?.toLocaleString('tr-TR')} ₺
                        </span>
                        <span className="font-bold text-emerald-400 font-mono">
                          Toplam: {c.ToplamUcret?.toLocaleString('tr-TR')} ₺
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-800/40 border-t border-slate-800 text-right">
              <button
                onClick={() => setGecmisModalAcik(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
