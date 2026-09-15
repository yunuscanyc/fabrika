import React, { useState, useEffect, useMemo } from 'react';
import { Proje, ProjeAsama, Yevmiyeci, YevmiyeCalismaKaydi, Personel, ProjePersonel } from '../types';
import { 
  FolderGit2, 
  Plus, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Building2, 
  User, 
  MapPin, 
  Trash2, 
  ArrowUp,
  ArrowDown, 
  ChevronRight, 
  AlertCircle,
  FileText,
  Edit3,
  Save,
  X,
  Paperclip,
  UploadCloud,
  File,
  Eye,
  Download,
  Briefcase,
  UserMinus,
  Phone,
  MessageSquare,
  History,
  Archive,
  UserCheck,
  RefreshCw,
  Check,
  AlertTriangle,
  Users,
  Shield,
  HardHat,
  BadgeCheck
} from 'lucide-react';
import { PersonelCombobox } from './PersonelCombobox';
import { ProjeKadrosu } from './ProjeKadrosu';
import { formatTarihTR } from '../utils/dateUtils';

const temizleVeNormalizEtAsamalar = (list: ProjeAsama[]): ProjeAsama[] => {
  if (!list) return [];
  return list.map(item => {
    let cleanNot = item.Notlar || '';
    let docList = item.Belgeler || [];
    if (cleanNot.includes('---DOSYALAR---')) {
      const parts = cleanNot.split('---DOSYALAR---');
      cleanNot = parts[0].trim();
      if (!item.Belgeler || item.Belgeler.length === 0) {
        try {
          docList = JSON.parse(parts[1].trim());
        } catch {
          docList = [];
        }
      }
    }
    return {
      ...item,
      Notlar: cleanNot,
      Belgeler: Array.isArray(docList) ? docList : []
    };
  });
};

const ayrilmisNotVeDosya = (tamNot: string) => {
  const cleanNot = tamNot || '';
  if (cleanNot.includes('---DOSYALAR---')) {
    const parts = cleanNot.split('---DOSYALAR---');
    const notKismi = parts[0].trim();
    try {
      const dosyalarKismi = JSON.parse(parts[1].trim());
      return { notKismi, dosyalarKismi: Array.isArray(dosyalarKismi) ? dosyalarKismi : [] };
    } catch {
      return { notKismi, dosyalarKismi: [] };
    }
  }
  return { notKismi: cleanNot, dosyalarKismi: [] };
};

const birlestirNotVeDosya = (notKismi: string, dosyalarKismi: any[]) => {
  if (dosyalarKismi && dosyalarKismi.length > 0) {
    return `${notKismi.trim()}\n---DOSYALAR---\n${JSON.stringify(dosyalarKismi)}`;
  }
  return notKismi.trim();
};

interface ProjelerViewProps {
  projeler: Proje[];
  personeller?: Personel[];
  onSaveProje: (proje: Proje) => void;
  onDeleteProje?: (id: number) => void;
}

export const ProjelerView: React.FC<ProjelerViewProps> = ({
  projeler,
  personeller = [],
  onSaveProje,
  onDeleteProje
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

  const [seciliProje, setSeciliProje] = useState<Proje | null>(projeler[0] || null);
  const [filtreDurum, setFiltreDurum] = useState<string>('Hepsi');
  const [aramaMetni, setAramaMetni] = useState<string>('');
  const [yeniProjeModalAcik, setYeniProjeModalAcik] = useState<boolean>(false);
  const [duzenlenenProje, setDuzenlenenProje] = useState<Proje | null>(null);
  const [modalSorumluKisi, setModalSorumluKisi] = useState<string>('');
  const [modalSorumluPersonelId, setModalSorumluPersonelId] = useState<number | null>(null);

  const handleYeniProjeAc = () => {
    setDuzenlenenProje(null);
    setModalSorumluKisi('');
    setModalSorumluPersonelId(null);
    const srcList = sablonlar.length > 0 ? sablonlar : fallbackSablonlar;
    const formatted = srcList.map((s, idx) => ({
      AsamaId: idx + 1,
      ProjeId: 0,
      Seviye: s.Seviye || 1,
      SiraNo: idx + 1,
      DinamikNumara: '',
      AsamaAdi: s.AsamaAdi || '',
      TamamlandiMi: false,
      KilitliMi: false,
      Notlar: ''
    }));
    setModalAsamalar(dinamikNumaraHesapla(formatted));
    setYeniProjeModalAcik(true);
  };

  const handleProjeDuzenleAc = (p: Proje) => {
    setDuzenlenenProje(p);
    setModalSorumluKisi(p.SorumluKisi || '');
    setModalSorumluPersonelId(p.SorumluPersonelId || null);
    setModalAsamalar(temizleVeNormalizEtAsamalar(p.Asamalar || []));
    setYeniProjeModalAcik(true);
  };

  // Proje Ağacı Durumu
  const [asamalar, setAsamalar] = useState<ProjeAsama[]>(
    seciliProje ? temizleVeNormalizEtAsamalar(seciliProje.Asamalar || []) : []
  );
  const [seciliAsamaIndex, setSeciliAsamaIndex] = useState<number>(0);
  const [isKilitli, setIsKilitli] = useState<boolean>(seciliProje?.KilitliMi || false);

  // Proje Şablonları & Modal Aşamaları
  const [sablonlar, setSablonlar] = useState<any[]>([]);
  const [modalAsamalar, setModalAsamalar] = useState<ProjeAsama[]>([]);

  // =========================================================================
  // KADRO YÖNETİMİ: ŞİRKET PERSONELLERİ (KADROLU) VE YEVMİYECİ USTALAR
  // =========================================================================
  const [ekipAnaSekme, setEkipAnaSekme] = useState<'personel' | 'yevmiyeci' | 'ozet'>('personel');

  // Şirket Personelleri Yönetimi
  const [projePersoneller, setProjePersoneller] = useState<ProjePersonel[]>([]);
  const [personelAtaModalAcik, setPersonelAtaModalAcik] = useState<boolean>(false);
  const [seciliAtaPersonelId, setSeciliAtaPersonelId] = useState<string>('');
  const [seciliAtaProjeGorevi, setSeciliAtaProjeGorevi] = useState<string>('Şantiye Şefi');
  const [seciliAtaBaslangicTarihi, setSeciliAtaBaslangicTarihi] = useState<string>(new Date().toISOString().split('T')[0]);
  const [seciliAtaNotlar, setSeciliAtaNotlar] = useState<string>('');
  const [personelGorunumSekmesi, setPersonelGorunumSekmesi] = useState<'aktif' | 'arsiv' | 'hepsi'>('aktif');
  const [onizlemeDosya, setOnizlemeDosya] = useState<{ ad: string; base64?: string; boyut?: string; tarih?: string } | null>(null);

  const loadProjePersoneller = async () => {
    try {
      const res = await fetch('/api/proje-personeller');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setProjePersoneller(data);
          return;
        }
      }
    } catch (err) {
      console.warn('Proje personelleri yükleme uyarısı:', err);
    }
    try {
      const local = localStorage.getItem('fabrika_proje_personeller_v1');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) setProjePersoneller(parsed);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadProjePersoneller();
  }, []);

  // Seçili projeye atanmış personel kayıtları
  const seciliProjePersoneller = useMemo(() => {
    if (!seciliProje) return [];
    return projePersoneller.filter(pp => 
      (pp.ProjeId && pp.ProjeId === seciliProje.ProjeId) ||
      (pp.ProjeAdi && seciliProje.ProjeAdi && pp.ProjeAdi.trim().toLowerCase() === seciliProje.ProjeAdi.trim().toLowerCase())
    );
  }, [projePersoneller, seciliProje]);

  const aktifPersoneller = useMemo(() => {
    return seciliProjePersoneller.filter(pp => pp.AktifMi);
  }, [seciliProjePersoneller]);

  const arsivPersoneller = useMemo(() => {
    return seciliProjePersoneller.filter(pp => !pp.AktifMi);
  }, [seciliProjePersoneller]);

  // Yevmiyeci ve Saha Ustaları Yönetimi
  const [yevmiyeciler, setYevmiyeciler] = useState<Yevmiyeci[]>([]);
  const [yevmiyeciAtaModalAcik, setYevmiyeciAtaModalAcik] = useState<boolean>(false);
  const [seciliAtaYevmiyeciId, setSeciliAtaYevmiyeciId] = useState<string>('');
  const [ustaGorunumSekmesi, setUstaGorunumSekmesi] = useState<'aktif' | 'arsiv' | 'hepsi'>('aktif');

  const loadYevmiyeciler = async () => {
    try {
      const res = await fetch('/api/yevmiyeciler');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setYevmiyeciler(data);
          return;
        }
      }
    } catch (err) {
      console.warn('Yevmiyeci yükleme uyarısı:', err);
    }
    try {
      const local = localStorage.getItem('fabrika_yevmiyeciler_v1');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) setYevmiyeciler(parsed);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadYevmiyeciler();
  }, []);

  // Seçili projeye atanmış aktif yevmiyeciler
  const atananYevmiyeciler = useMemo(() => {
    return yevmiyeciler.filter(y => {
      if (!seciliProje) return false;
      if (y.AktifProjeId && y.AktifProjeId === seciliProje.ProjeId) return true;
      if (y.AktifProjeAdi && seciliProje.ProjeAdi && y.AktifProjeAdi.trim().toLowerCase() === seciliProje.ProjeAdi.trim().toLowerCase()) return true;
      return false;
    });
  }, [yevmiyeciler, seciliProje]);

  // Projede çalışmış tüm usta kayıtları (Arşiv & Geçmiş Dahil)
  const projeUstaGecmisi = useMemo(() => {
    if (!seciliProje) return [];
    const sonuclar: {
      yevmiyeci: Yevmiyeci;
      kayit: YevmiyeCalismaKaydi;
      isAktif: boolean;
    }[] = [];

    yevmiyeciler.forEach(y => {
      const isAktif = (y.AktifProjeId && y.AktifProjeId === seciliProje.ProjeId) ||
        (y.AktifProjeAdi && seciliProje.ProjeAdi && y.AktifProjeAdi.trim().toLowerCase() === seciliProje.ProjeAdi.trim().toLowerCase());

      const projeKayitlari = (y.CalismaGecmisi || []).filter(c => 
        (c.ProjeId && c.ProjeId === seciliProje.ProjeId) ||
        (c.ProjeAdi && seciliProje.ProjeAdi && c.ProjeAdi.trim().toLowerCase() === seciliProje.ProjeAdi.trim().toLowerCase())
      );

      if (projeKayitlari.length > 0) {
        projeKayitlari.forEach(k => {
          sonuclar.push({
            yevmiyeci: y,
            kayit: k,
            isAktif: Boolean(isAktif)
          });
        });
      } else if (isAktif) {
        // Aktif atanmış ama henüz geçmiş listesinde kaydı oluşmamışsa geçici kayıt olarak göster
        sonuclar.push({
          yevmiyeci: y,
          kayit: {
            KayitId: `AKTIF-${y.YevmiyeciId}`,
            ProjeId: seciliProje.ProjeId,
            ProjeAdi: seciliProje.ProjeAdi,
            BaslangicTarihi: y.KayitTarihi || new Date().toISOString().split('T')[0],
            BitisTarihi: seciliProje.Deadline || 'Devam Ediyor',
            GunSayisi: 1,
            GunlukUcret: y.GunlukYevmiye || 2500,
            ToplamUcret: y.GunlukYevmiye || 2500,
            OdemeDurumu: 'Bekliyor',
            Aciklama: 'Şu an projede aktif çalışıyor.'
          },
          isAktif: true
        });
      }
    });

    return sonuclar;
  }, [yevmiyeciler, seciliProje]);

  // Arşivdeki (görevi tamamlanmış / ayrılmış) kayıtlar
  const arsivdekiKayitlar = useMemo(() => {
    return projeUstaGecmisi.filter(item => !item.isAktif);
  }, [projeUstaGecmisi]);

  // Kadrolu Personel Projeye Atama İşlemi
  const handlePersonelAta = async () => {
    if (!seciliProje || !seciliAtaPersonelId) return;
    const p = yerelPersoneller.find(item => String(item.PersonelId) === String(seciliAtaPersonelId));
    if (!p) return;

    const bugun = seciliAtaBaslangicTarihi || new Date().toISOString().split('T')[0];
    const yeniKayit: ProjePersonel = {
      KayitId: `PRJ-PERS-${Date.now()}`,
      ProjeId: seciliProje.ProjeId,
      ProjeAdi: seciliProje.ProjeAdi,
      PersonelId: p.PersonelId,
      AdSoyad: p.AdSoyad,
      Departman: p.Departman,
      SirketGorevi: p.Gorev,
      ProjeGorevi: seciliAtaProjeGorevi || 'Şantiye Şefi',
      BaslangicTarihi: bugun,
      Telefon: p.Telefon,
      AktifMi: true,
      Notlar: seciliAtaNotlar || ''
    };

    const guncelListe = [yeniKayit, ...projePersoneller.filter(item => !(item.PersonelId === p.PersonelId && item.ProjeId === seciliProje.ProjeId && item.AktifMi))];
    setProjePersoneller(guncelListe);
    try {
      localStorage.setItem('fabrika_proje_personeller_v1', JSON.stringify(guncelListe));
    } catch (e) {}

    setPersonelAtaModalAcik(false);
    setSeciliAtaPersonelId('');
    setSeciliAtaNotlar('');
    showAlert('Başarılı', `"${p.AdSoyad}" kadrolu çalışanımız "${seciliProje.ProjeAdi}" projesine başarıyla görevlendirildi.`, 'success');

    try {
      await fetch(`/api/projeler/${seciliProje.ProjeId}/personel-ata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yeniKayit)
      });
    } catch (err) {
      console.warn('Personel atama sunucu uyarısı:', err);
    }
  };

  // Kadrolu Personeli Projeden Çıkarma ve Arşive Alma
  const handlePersonelProjedenCikar = (pp: ProjePersonel) => {
    showConfirm(
      'Projeden Çıkar ve Arşive Al',
      `"${pp.AdSoyad}" adlı kadrolu çalışanımızın "${seciliProje?.ProjeAdi || 'bu projedeki'}" aktif görevi sonlandırılsın ve geçmiş görev kaydı arşivde saklansın mı?`,
      async () => {
        const bugun = new Date().toISOString().split('T')[0];
        const guncel = projePersoneller.map(item => {
          if (item.KayitId === pp.KayitId || (item.PersonelId === pp.PersonelId && item.ProjeId === (seciliProje?.ProjeId || pp.ProjeId) && item.AktifMi)) {
            return {
              ...item,
              AktifMi: false,
              BitisTarihi: bugun,
              Notlar: item.Notlar ? `${item.Notlar} (Görev ${bugun} tarihinde tamamlandı)` : `Görev ${bugun} tarihinde tamamlandı.`
            };
          }
          return item;
        });

        setProjePersoneller(guncel);
        try {
          localStorage.setItem('fabrika_proje_personeller_v1', JSON.stringify(guncel));
        } catch (e) {}

        showAlert('Başarılı', `"${pp.AdSoyad}" projeden çıkarıldı ve geçmiş çalışma kaydı arşivde saklandı.`, 'success');

        try {
          await fetch(`/api/projeler/${seciliProje?.ProjeId}/personel-cikar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ PersonelId: pp.PersonelId, BitisTarihi: bugun })
          });
        } catch (err) {
          console.warn('Personel çıkarma sunucu uyarısı:', err);
        }
      }
    );
  };

  // Arşivdeki Kadrolu Personeli Tekrar Projeye Görevlendir
  const handlePersonelTekrarGorevlendir = (pp: ProjePersonel) => {
    setSeciliAtaPersonelId(String(pp.PersonelId));
    setSeciliAtaProjeGorevi(pp.ProjeGorevi || 'Şantiye Şefi');
    setSeciliAtaBaslangicTarihi(new Date().toISOString().split('T')[0]);
    setSeciliAtaNotlar('');
    setPersonelAtaModalAcik(true);
  };

  // Projeden Yevmiyeci Çıkarma ve Arşive Aktarma
  const handleYevmiyeciProjedenCikar = (y: Yevmiyeci) => {
    showConfirm(
      'Projeden Çıkar ve Arşive Al',
      `"${y.AdSoyad}" adlı usta "${seciliProje?.ProjeAdi || 'bu projeden'}" çıkarılsın ve durumu 'Müsait' yapılsın mı? Geçmiş çalışma bilgileri proje arşivinde saklanacaktır.`,
      async () => {
        const bugun = new Date().toISOString().split('T')[0];
        let gecmis = Array.isArray(y.CalismaGecmisi) ? [...y.CalismaGecmisi] : [];
        const oldProjeId = y.AktifProjeId || seciliProje?.ProjeId;
        const oldProjeAdi = y.AktifProjeAdi || seciliProje?.ProjeAdi;

        if (oldProjeAdi || oldProjeId) {
          const existingIdx = gecmis.findIndex(g => 
            (oldProjeId && g.ProjeId === oldProjeId) || 
            (oldProjeAdi && g.ProjeAdi && g.ProjeAdi.trim().toLowerCase() === oldProjeAdi.trim().toLowerCase())
          );
          if (existingIdx !== -1) {
            gecmis[existingIdx] = {
              ...gecmis[existingIdx],
              BitisTarihi: bugun,
              Aciklama: gecmis[existingIdx].Aciklama || `${oldProjeAdi || 'Proje'} saha görevi tamamlandı (Arşivlendi).`
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
          try {
            localStorage.setItem('fabrika_yevmiyeciler_v1', JSON.stringify(next));
          } catch (e) {}
          return next;
        });

        showAlert('Başarılı', `"${y.AdSoyad}" projeden çıkarıldı ve geçmiş çalışma kaydı arşivde saklandı.`, 'success');

        try {
          await fetch(`/api/yevmiyeciler/${y.YevmiyeciId}/projeden-cikar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ProjeAdi: oldProjeAdi, ProjeId: oldProjeId })
          });
        } catch (err) {
          console.warn('Projeden çıkarma sunucu uyarısı:', err);
        }
      }
    );
  };

  // Arşivdeki Ustayı Tekrar Projeye Ata
  const handleArsivdenTekrarAta = (y: Yevmiyeci) => {
    setSeciliAtaYevmiyeciId(String(y.YevmiyeciId));
    setYevmiyeciAtaModalAcik(true);
  };

  // Projeye Yevmiyeci Atama
  const handleYevmiyeciAta = async () => {
    if (!seciliProje || !seciliAtaYevmiyeciId) return;
    const y = yevmiyeciler.find(item => String(item.YevmiyeciId) === String(seciliAtaYevmiyeciId));
    if (!y) return;

    const bugun = new Date().toISOString().split('T')[0];
    const yeniCalisma = {
      KayitId: `YEV-${Date.now()}`,
      ProjeId: seciliProje.ProjeId,
      ProjeAdi: seciliProje.ProjeAdi,
      BaslangicTarihi: bugun,
      BitisTarihi: seciliProje.Deadline || bugun,
      GunSayisi: 1,
      GunlukUcret: y.GunlukYevmiye || 2500,
      ToplamUcret: y.GunlukYevmiye || 2500,
      OdemeDurumu: 'Bekliyor',
      Aciklama: `${seciliProje.ProjeAdi} projesine atandı.`
    };

    const guncel: Yevmiyeci = {
      ...y,
      Durum: 'ProjedeCalisiyor',
      AktifProjeId: seciliProje.ProjeId,
      AktifProjeAdi: seciliProje.ProjeAdi,
      CalismaGecmisi: [yeniCalisma as any, ...(y.CalismaGecmisi || [])]
    };

    setYevmiyeciler(prev => {
      const next = prev.map(item => item.YevmiyeciId === y.YevmiyeciId ? guncel : item);
      try {
        localStorage.setItem('fabrika_yevmiyeciler_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    setYevmiyeciAtaModalAcik(false);
    setSeciliAtaYevmiyeciId('');
    showAlert('Başarılı', `"${y.AdSoyad}" adlı usta "${seciliProje.ProjeAdi}" projesine başarıyla atandı.`, 'success');

    try {
      await fetch(`/api/yevmiyeciler/${y.YevmiyeciId}/calisma-ekle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...yeniCalisma,
          Durum: 'ProjedeCalisiyor'
        })
      });
    } catch (err) {
      console.warn('Usta atama sunucu uyarısı:', err);
    }
  };

  // Custom Alert and Confirmation states to bypass iframe dialog restrictions
  const [customConfirmModal, setCustomConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [customAlertModal, setCustomAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setCustomConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const showAlert = (title: string, message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setCustomAlertModal({ isOpen: true, title, message, type });
  };

  const fallbackSablonlar = [
    { Seviye: 1, AsamaAdi: 'Teklif Hazırlanıyor (Piyasa & Keşif)' },
    { Seviye: 2, AsamaAdi: 'Piyasa Malzeme & Hırdavat Fiyat Araştırması' },
    { Seviye: 2, AsamaAdi: 'İşçilik ve İmalat Süresi Tahmini' },
    { Seviye: 2, AsamaAdi: 'Fiyat Teklifi / Maliyet Tablosu Çıkarılması' },
    { Seviye: 1, AsamaAdi: 'Teklif Verildi (Müşteri Kararı Bekleniyor)' },
    { Seviye: 2, AsamaAdi: 'Teklifin Müşteriye Sunumu & Revizyonlar' },
    { Seviye: 2, AsamaAdi: 'Sözleşme İmzalanması & Avans / Sipariş Onayı' },
    { Seviye: 1, AsamaAdi: 'Üretime Hazırlık & Teknik Çizim' },
    { Seviye: 2, AsamaAdi: 'Yerinde Rölöve Alımı & Lazer Ölçüm' },
    { Seviye: 2, AsamaAdi: 'İmalat Detay Çizimleri & Kesim Optimizasyonu' },
    { Seviye: 2, AsamaAdi: 'MDF, Kaplama, Boya ve Aksesuar Siparişi' },
    { Seviye: 1, AsamaAdi: 'Fabrika İmalat & Üretim Aşaması' },
    { Seviye: 2, AsamaAdi: 'CNC Kesim, Ebatlama & Kenar Bantlama' },
    { Seviye: 2, AsamaAdi: 'Cila / Astar / Lake Boya İşlemleri' },
    { Seviye: 2, AsamaAdi: 'Ön Montaj Çatma & Kalite Kontrol' },
    { Seviye: 1, AsamaAdi: 'Sevkiyat & Şantiye Montajı' },
    { Seviye: 2, AsamaAdi: 'Paketleme & Şantiyeye Nakliye' },
    { Seviye: 2, AsamaAdi: 'Sahada Montaj & İnce Ayarlar' },
    { Seviye: 1, AsamaAdi: 'Kontrol, Rötuş & Teslim Kabul' },
    { Seviye: 2, AsamaAdi: 'Müşteri Kabul Tutanağının İmzalanması' }
  ];

  useEffect(() => {
    fetch('/api/proje-sablonlari')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSablonlar(data);
        } else {
          setSablonlar(fallbackSablonlar);
        }
      })
      .catch(err => {
        console.error('Şablon yükleme hatası, fallback devrede:', err);
        setSablonlar(fallbackSablonlar);
      });
  }, []);

  // Proje değiştiğinde ağacı güncelle
  const handleProjeSec = (p: Proje) => {
    setSeciliProje(p);
    setAsamalar(temizleVeNormalizEtAsamalar(p.Asamalar || []));
    setIsKilitli(p.KilitliMi);
    setSeciliAsamaIndex(0);
  };

  // Parent state güncellendiğinde (örneğin kaydetme veya kilitleme sonrası) seçili projeyi ve aşamaları senkronize et
  const projelerHash = projeler.map(p => {
    const asamalarHash = (p.Asamalar || []).map(a => `${a.AsamaId}-${a.KilitliMi}-${a.TamamlandiMi}-${a.AsamaAdi}`).join(',');
    return `${p.ProjeId}-${p.KilitliMi}-${asamalarHash}`;
  }).join('|');
  useEffect(() => {
    if (seciliProje) {
      const guncel = projeler.find(p => p.ProjeId === seciliProje.ProjeId);
      if (guncel) {
        setSeciliProje(guncel);
        setAsamalar(temizleVeNormalizEtAsamalar(guncel.Asamalar || []));
        setIsKilitli(guncel.KilitliMi);
      }
    } else if (projeler.length > 0) {
      setSeciliProje(projeler[0]);
      setAsamalar(temizleVeNormalizEtAsamalar(projeler[0].Asamalar || []));
      setIsKilitli(projeler[0].KilitliMi);
    }
  }, [projelerHash]);

  // Numaraları dinamik güncelle (1., 1.1, 1.1.1)
  const dinamikNumaraHesapla = (liste: ProjeAsama[]) => {
    let ana = 0;
    let alt = 0;
    let detay = 0;

    return liste.map((item) => {
      if (item.Seviye === 1) {
        ana++;
        alt = 0;
        detay = 0;
        return { ...item, DinamikNumara: `${ana}.` };
      } else if (item.Seviye === 2) {
        alt++;
        detay = 0;
        return { ...item, DinamikNumara: `${ana}.${alt}` };
      } else {
        detay++;
        return { ...item, DinamikNumara: `${ana}.${alt}.${detay}` };
      }
    });
  };

  // Yeni Ana Dal Ekle
  const handleAnaDalEkle = () => {
    const yeni: ProjeAsama = {
      AsamaId: -Math.floor(100000000 + Math.random() * 900000000),
      ProjeId: seciliProje?.ProjeId || 0,
      Seviye: 1,
      SiraNo: asamalar.length + 1,
      AsamaAdi: 'Yeni Ana Dal (İlave İş)',
      TamamlandiMi: false,
      KilitliMi: false,
      Deadline: seciliProje?.Deadline || null,
      Notlar: ''
    };
    const guncel = dinamikNumaraHesapla([...asamalar, yeni]);
    setAsamalar(guncel);
  };

  // Yeni Alt Dal Ekle
  const handleAltDalEkle = () => {
    if (asamalar.length === 0) return;
    const secili = asamalar[seciliAsamaIndex];
    if (!secili || secili.Seviye >= 3) return;

    const yeni: ProjeAsama = {
      AsamaId: -Math.floor(100000000 + Math.random() * 900000000),
      ProjeId: seciliProje?.ProjeId || 0,
      UstAsamaId: secili.AsamaId,
      Seviye: secili.Seviye + 1,
      SiraNo: seciliAsamaIndex + 2,
      AsamaAdi: 'Yeni Alt Dal',
      TamamlandiMi: false,
      KilitliMi: false,
      Deadline: secili.Deadline,
      Notlar: ''
    };

    const kopya = [...asamalar];
    kopya.splice(seciliAsamaIndex + 1, 0, yeni);
    setAsamalar(dinamikNumaraHesapla(kopya));
  };

  // Dal Sil (Sadece kilitli olmayan dallar silinebilir)
  const handleDalSil = (index: number) => {
    const target = asamalar[index];
    if (!target) return;

    if (target.KilitliMi) {
      showAlert('Kilitli Süreç', 'Bu dal kilitlidir ve koruma altındadır. Silinemez!', 'warning');
      return;
    }

    // Alt dalları özyinelemeli (recursive) olarak bulup siliyoruz
    const idsToDelete = new Set<number>();
    idsToDelete.add(target.AsamaId);

    let addedNew = true;
    while (addedNew) {
      addedNew = false;
      asamalar.forEach(a => {
        if (a.UstAsamaId && idsToDelete.has(a.UstAsamaId) && !idsToDelete.has(a.AsamaId)) {
          idsToDelete.add(a.AsamaId);
          addedNew = true;
        }
      });
    }

    // Alt dallar arasında kilitli olan var mı kontrolü
    const kilitliAltVarMi = asamalar.some(a => idsToDelete.has(a.AsamaId) && a.KilitliMi);
    if (kilitliAltVarMi) {
      showAlert('Kilitli Alt Süreç', 'Bu dalın alt süreçlerinden bazıları kilitlidir. Kilitli alt süreç içeren dallar silinemez!', 'warning');
      return;
    }

    const kopya = asamalar.filter(a => !idsToDelete.has(a.AsamaId));
    setAsamalar(dinamikNumaraHesapla(kopya));
    if (seciliAsamaIndex >= kopya.length) {
      setSeciliAsamaIndex(Math.max(0, kopya.length - 1));
    }
  };

  // Dalı Yukarı Taşı
  const handleDalYukari = (index: number) => {
    if (index === 0) return;
    const kopya = [...asamalar];
    const temp = kopya[index];
    kopya[index] = kopya[index - 1];
    kopya[index - 1] = temp;
    setAsamalar(dinamikNumaraHesapla(kopya));
  };

  // Dalı Aşağı Taşı
  const handleDalAsagi = (index: number) => {
    if (index === asamalar.length - 1) return;
    const kopya = [...asamalar];
    const temp = kopya[index];
    kopya[index] = kopya[index + 1];
    kopya[index + 1] = temp;
    setAsamalar(dinamikNumaraHesapla(kopya));
  };

  // Tüm Dalları veya Yeni Dalları Kilitle
  const handleKilitle = () => {
    if (!seciliProje) return;
    showConfirm(
      'Süreç Ağacını Kilitle',
      'Süreç ağacındaki tüm dallar kilitlenecektir. Kilitlenen dallar artık düzenlenemez veya silinemez. Onaylıyor musunuz?',
      () => {
        const kilitliListe = asamalar.map(a => ({ ...a, KilitliMi: true }));
        setAsamalar(kilitliListe);
        setIsKilitli(true);

        const biten = kilitliListe.filter(a => a.TamamlandiMi).length;
        const yuzde = kilitliListe.length > 0 ? Math.round((biten / kilitliListe.length) * 100) : 0;

        const guncelProje: Proje = {
          ...seciliProje,
          GenelIlerlemeYuzdesi: yuzde,
          KilitliMi: true,
          Asamalar: kilitliListe
        };

        onSaveProje(guncelProje);
        setSeciliProje(guncelProje);
        showAlert('Kilit Başarılı', 'Tüm dallar başarıyla kilitlendi ve kaydedildi!', 'success');
      }
    );
  };

  // Projeyi ve Ağacı Kaydet
  const handleAgaciKaydet = () => {
    if (!seciliProje) return;
    const biten = asamalar.filter(a => a.TamamlandiMi).length;
    const yuzde = asamalar.length > 0 ? Math.round((biten / asamalar.length) * 100) : 0;

    const guncelProje: Proje = {
      ...seciliProje,
      GenelIlerlemeYuzdesi: yuzde,
      KilitliMi: isKilitli,
      Asamalar: asamalar
    };

    onSaveProje(guncelProje);
    setSeciliProje(guncelProje);
    showAlert('Başarılı', 'Proje ve süreç ağacı başarıyla kaydedildi!', 'success');
  };

  // Filtreleme
  const filtrelenenProjeler = (projeler || []).filter(p => {
    if (!p) return false;
    const durumUygun = filtreDurum === 'Hepsi' || 
                       String(p.Durum || '').toLowerCase() === String(filtreDurum).toLowerCase() ||
                       (filtreDurum === 'Üretimde' && (String(p.Durum).includes('Üretim') || String(p.Durum).includes('İmalat'))) ||
                       (filtreDurum === 'Şantiyede' && (String(p.Durum).includes('Şantiye') || String(p.Durum).includes('Montaj'))) ||
                       (filtreDurum === 'Tamamlandı' && (String(p.Durum).includes('Tamam') || String(p.Durum).includes('Bitti')));

    const aramaLow = (aramaMetni || '').toLowerCase().trim();
    if (!aramaLow) return durumUygun;

    const pAd = String(p.ProjeAdi || '').toLowerCase();
    const pKod = String(p.ProjeKodu || '').toLowerCase();
    const pMusteri = String(p.MusteriFirma || '').toLowerCase();
    const pSantiye = String(p.SantiyeAdresi || '').toLowerCase();
    const pSorumlu = String(p.SorumluKisi || '').toLowerCase();

    const aramaUygun = pAd.includes(aramaLow) ||
                       pKod.includes(aramaLow) ||
                       pMusteri.includes(aramaLow) ||
                       pSantiye.includes(aramaLow) ||
                       pSorumlu.includes(aramaLow);
    return durumUygun && aramaUygun;
  });

  const kilitsizDalVarMi = asamalar.some(a => !a.KilitliMi);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Üst Başlık & Yeni Proje Ekle Butonu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FolderGit2 className="w-6 h-6 text-blue-600" />
            <span>Projeler &amp; Süreç Ağacı</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            İş emri bazlı üretim süreçleri, şantiye teslimleri ve süreç dalları
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const srcList = sablonlar.length > 0 ? sablonlar : fallbackSablonlar;
              const defaultAsamalar: ProjeAsama[] = srcList.map((s, idx) => ({
                AsamaId: idx + 1,
                ProjeId: 0,
                Seviye: s.Seviye || 1,
                SiraNo: idx + 1,
                DinamikNumara: '',
                AsamaAdi: s.AsamaAdi || '',
                TamamlandiMi: false,
                KilitliMi: false,
                Notlar: ''
              }));
              setModalAsamalar(dinamikNumaraHesapla(defaultAsamalar));
              setYeniProjeModalAcik(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Proje Oluştur</span>
          </button>
        </div>
      </div>

      {/* Arama & Durum Filtreleri */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Proje adı, kodu veya müşteri ara..."
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['Hepsi', 'Üretimde', 'Teklif Verildi', 'Şantiyede', 'Tamamlandı'].map((durum) => (
            <button
              key={durum}
              onClick={() => setFiltreDurum(durum)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                filtreDurum === durum
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {durum}
            </button>
          ))}
        </div>
      </div>

      {/* Proje Kartları (Mobilde Yatay Kaydırılabilir veya Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filtrelenenProjeler.map((p) => {
          const isSecili = seciliProje?.ProjeId === p.ProjeId;
          return (
            <div
              key={p.ProjeId}
              onClick={() => handleProjeSec(p)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white relative ${
                isSecili
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200/80 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {p.ProjeKodu}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1.5 line-clamp-1">
                    {p.ProjeAdi}
                  </h3>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.Durum === 'Üretimde'
                      ? 'bg-blue-100 text-blue-800'
                      : p.Durum === 'Tamamlandı'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {p.Durum}
                </span>
              </div>

              {p.MusteriFirma && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{p.MusteriFirma}</span>
                </div>
              )}

              {/* İlerleme Çubuğu */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                  <span>İlerleme</span>
                  <span className="text-blue-600 font-bold">%{p.GenelIlerlemeYuzdesi}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${p.GenelIlerlemeYuzdesi}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {p.Deadline ? formatTarihTR(p.Deadline) : 'Tarih Yok'}
                </span>
                <span className="flex items-center gap-1 font-semibold text-blue-600">
                  {p.KilitliMi ? '🔒 Kilitli' : '🔓 Taslak'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SEÇİLİ PROJENİN SÜREÇ AĞACI ÇALIŞMA ALANI */}
      {seciliProje && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {seciliProje.ProjeKodu}
                </span>
                <h2 className="text-lg font-bold text-slate-900">{seciliProje.ProjeAdi}</h2>
                <button
                  type="button"
                  onClick={() => handleProjeDuzenleAc(seciliProje)}
                  className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition-colors border border-blue-200"
                  title="Proje Bilgilerini Düzenle"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Düzenle</span>
                </button>
                {onDeleteProje && (
                  <button
                    type="button"
                    onClick={() => {
                      showConfirm(
                        'Projeyi Sil',
                        `"${seciliProje.ProjeAdi}" projesini silmek istediğinize emin misiniz?`,
                        () => {
                          onDeleteProje(seciliProje.ProjeId);
                          const kalanlar = projeler.filter(p => p.ProjeId !== seciliProje.ProjeId);
                          setSeciliProje(kalanlar[0] || null);
                          setAsamalar(kalanlar[0] ? temizleVeNormalizEtAsamalar(kalanlar[0].Asamalar || []) : []);
                        }
                      );
                    }}
                    className="px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold flex items-center gap-1 transition-colors border border-red-200"
                    title="Projeyi Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sil</span>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5 font-medium">
                {seciliProje.MusteriFirma && <span>🏢 Müşteri: <strong className="text-slate-800">{seciliProje.MusteriFirma}</strong></span>}
                {seciliProje.SorumluKisi && <span>👤 Sorumlu: <strong className="text-slate-800">{seciliProje.SorumluKisi}</strong></span>}
                {seciliProje.SantiyeAdresi && <span>📍 Şantiye: <strong className="text-slate-800">{seciliProje.SantiyeAdresi}</strong></span>}
                {seciliProje.Deadline && <span>📅 Deadline: <strong className="text-slate-800">{formatTarihTR(seciliProje.Deadline)}</strong></span>}
              </div>
            </div>

            {/* Ağaç Butonları (Kilitliyken de dal eklenebilir!) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleAnaDalEkle}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ana Dal</span>
              </button>
              <button
                onClick={handleAltDalEkle}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Alt Dal</span>
              </button>
              {kilitsizDalVarMi ? (
                <button
                  onClick={handleKilitle}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Yeni Dalları Kilitle</span>
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Korumalı</span>
                </span>
              )}
              <button
                onClick={handleAgaciKaydet}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>



          {/* Ağaç Listesi ve Yan Not Alanı */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sol: Ağaç Tablosu */}
            <div className="lg:col-span-2 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              <div className="divide-y divide-slate-200/80">
                {asamalar.map((asama, idx) => {
                  const isSeciliDal = seciliAsamaIndex === idx;
                  const indentPx = (asama.Seviye - 1) * 20;

                  return (
                    <div
                      key={asama.AsamaId}
                      onClick={() => setSeciliAsamaIndex(idx)}
                      className={`p-2.5 sm:p-3 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSeciliDal ? 'bg-blue-50/80 border-l-4 border-l-blue-600' : 'hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0" style={{ paddingLeft: `${indentPx}px` }}>
                        {/* Checkbox (Bitti) */}
                        <input
                          type="checkbox"
                          checked={asama.TamamlandiMi}
                          onChange={(e) => {
                            const kopya = [...asamalar];
                            kopya[idx].TamamlandiMi = e.target.checked;
                            setAsamalar(kopya);
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />

                        {/* Kilit Simgesi */}
                        {asama.KilitliMi && (
                          <span title="Standart Şablon Aşaması (Not ve belge ekleyebilirsiniz)">
                            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          </span>
                        )}

                        {/* İkon */}
                        <span className="text-xs">
                          {asama.Seviye === 1 ? '📁' : asama.Seviye === 2 ? '📄' : '🔹'}
                        </span>

                        {/* Dinamik Numara */}
                        <span className="text-xs font-bold text-blue-700 whitespace-nowrap">
                          {asama.DinamikNumara}
                        </span>

                        {/* Dal Adı (Düzenlenebilir / Kilitli Seçilebilir) */}
                        {asama.KilitliMi ? (
                          <span
                            onClick={() => setSeciliAsamaIndex(idx)}
                            className="flex-1 text-xs sm:text-sm font-semibold text-slate-800 px-1.5 py-0.5 truncate cursor-pointer select-none hover:text-blue-700"
                            title="Aşama günlüğü, not ve belge eklemek için tıklayın"
                          >
                            {asama.AsamaAdi}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={asama.AsamaAdi}
                            onClick={() => setSeciliAsamaIndex(idx)}
                            onFocus={() => setSeciliAsamaIndex(idx)}
                            onChange={(e) => {
                              const kopya = [...asamalar];
                              kopya[idx].AsamaAdi = e.target.value;
                              setAsamalar(kopya);
                            }}
                            className="flex-1 bg-transparent text-xs sm:text-sm font-semibold border-0 focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-0.5 truncate text-slate-800"
                            placeholder="Aşama Adı..."
                          />
                        )}
                      </div>

                      {/* Sağ Aksiyonlar: Deadline & Silme */}
                      <div className="flex items-center gap-1 shrink-0">
                        {asama.Deadline && (
                          <span className="text-[10px] font-medium text-slate-400 hidden sm:inline mr-1">
                            {formatTarihTR(asama.Deadline)}
                          </span>
                        )}

                        {/* Yukarı Taşı */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDalYukari(idx);
                          }}
                          disabled={idx === 0}
                          className={`p-1 rounded text-slate-500 hover:bg-slate-200 transition-colors ${idx === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:text-slate-800'}`}
                          title="Yukarı Taşı"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Aşağı Taşı */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDalAsagi(idx);
                          }}
                          disabled={idx === asamalar.length - 1}
                          className={`p-1 rounded text-slate-500 hover:bg-slate-200 transition-colors ${idx === asamalar.length - 1 ? 'opacity-20 cursor-not-allowed' : 'hover:text-slate-800'}`}
                          title="Aşağı Taşı"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Sil Butonu (Yalnızca kilitlenmemiş yeni dallarda) */}
                        {!asama.KilitliMi ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDalSil(idx);
                            }}
                            className="p-1 rounded text-red-500 hover:bg-red-50 transition-colors"
                            title="Yeni dalı sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="w-5"></span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sağ: Seçili Aşamanın Notları */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Aşama Günlüğü &amp; Notlar &amp; Belgeler:</span>
                </div>
                {asamalar[seciliAsamaIndex] ? (
                  <div>
                    <span className="text-xs font-bold text-blue-700 block mb-2">
                      {asamalar[seciliAsamaIndex].DinamikNumara} {asamalar[seciliAsamaIndex].AsamaAdi}
                    </span>
                    <textarea
                      rows={6}
                      placeholder="Bu aşama ile ilgili keşif, teknik çizim, müşteri revizyonu veya imalat notları..."
                      value={asamalar[seciliAsamaIndex].Notlar || ''}
                      onChange={(e) => {
                        const kopya = [...asamalar];
                        kopya[seciliAsamaIndex].Notlar = e.target.value;
                        setAsamalar(kopya);
                      }}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* Çoklu Dosya Ekleme ve Ekler Listesi */}
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                        <span className="flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                          <span>Aşama Belgeleri ({(asamalar[seciliAsamaIndex].Belgeler || []).length}):</span>
                        </span>
                        
                        <label className="cursor-pointer text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg">
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Çoklu Dosya Ekle</span>
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (!files) return;
                              
                              const kopya = [...asamalar];
                              const guncelAsama = { ...kopya[seciliAsamaIndex] };
                              if (!guncelAsama.Belgeler) {
                                guncelAsama.Belgeler = [];
                              }
                              
                              let yuklenenAdet = 0;
                              Array.from(files).forEach((file: any) => {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const base64Content = event.target?.result as string;
                                  const yeniDosya = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    ad: file.name,
                                    boyut: (file.size / 1024).toFixed(1) + ' KB',
                                    tarih: formatTarihTR(new Date().toISOString().split('T')[0]),
                                    base64: base64Content
                                  };
                                  
                                  guncelAsama.Belgeler = [...(guncelAsama.Belgeler || []), yeniDosya];
                                  yuklenenAdet++;
                                  
                                  if (yuklenenAdet === files.length) {
                                    kopya[seciliAsamaIndex] = guncelAsama;
                                    setAsamalar(kopya);
                                  }
                                };
                                reader.readAsDataURL(file);
                              });
                            }}
                          />
                        </label>
                      </div>

                      {/* Dosya Listesi */}
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {(asamalar[seciliAsamaIndex].Belgeler || []).length > 0 ? (
                          (asamalar[seciliAsamaIndex].Belgeler || []).map((dosya: any) => {
                            const isResim = dosya.base64 && (dosya.base64.startsWith('data:image/') || /\.(png|jpe?g|gif|svg|webp|bmp)$/i.test(dosya.ad || ''));
                            return (
                              <div 
                                key={dosya.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 text-xs text-slate-800 hover:border-slate-200 transition-all shadow-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isResim ? (
                                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-150 shrink-0 bg-slate-50 flex items-center justify-center">
                                      <img src={dosya.base64} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                                      <File className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="truncate">
                                    <p className="font-semibold truncate text-[11px] leading-tight text-slate-950" title={dosya.ad}>{dosya.ad}</p>
                                    <p className="text-[9px] text-slate-400 leading-none mt-0.5">{dosya.boyut} • {dosya.tarih}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {dosya.base64 && (
                                    <button
                                      type="button"
                                      onClick={() => setOnizlemeDosya(dosya)}
                                      className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                                      title="Dosyayı Önizle"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {dosya.base64 && (
                                    <a
                                      href={dosya.base64}
                                      download={dosya.ad}
                                      className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                                      title="Dosyayı İndir"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const kopya = [...asamalar];
                                      const guncelAsama = { ...kopya[seciliAsamaIndex] };
                                      guncelAsama.Belgeler = (guncelAsama.Belgeler || []).filter((d: any) => d.id !== dosya.id);
                                      kopya[seciliAsamaIndex] = guncelAsama;
                                      setAsamalar(kopya);
                                    }}
                                    className="p-1 rounded text-red-500 hover:bg-red-50 transition-colors"
                                    title="Dosyayı Sil"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-[11px] text-slate-400 italic text-center py-2 bg-white rounded border border-dashed border-slate-200">
                            Yüklenmiş dosya yok. Çoklu dosyalarınızı ekleyebilirsiniz.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Soldan bir aşama seçin.</p>
                )}
              </div>

              <div className="pt-2.5 border-t border-slate-200 text-[11px] text-slate-500 text-center">
                <span>⚠️ Değişikliklerin kalıcı olması için sağ üstteki <strong className="text-emerald-700">"Kaydet"</strong> butonuna basınız.</span>
              </div>
            </div>
          </div>
        </div>

        {/* PROJE KADROSU (AĞACIN ALTINA ALINDI) */}
        <ProjeKadrosu
          seciliProje={seciliProje}
          aktifPersoneller={aktifPersoneller}
          atananYevmiyeciler={atananYevmiyeciler}
          ekipAnaSekme={ekipAnaSekme}
          setEkipAnaSekme={setEkipAnaSekme}
          personelGorunumSekmesi={personelGorunumSekmesi}
          setPersonelGorunumSekmesi={setPersonelGorunumSekmesi}
          arsivPersoneller={arsivPersoneller}
          seciliProjePersoneller={seciliProjePersoneller}
          setSeciliAtaPersonelId={setSeciliAtaPersonelId}
          setSeciliAtaProjeGorevi={setSeciliAtaProjeGorevi}
          setSeciliAtaBaslangicTarihi={setSeciliAtaBaslangicTarihi}
          setSeciliAtaNotlar={setSeciliAtaNotlar}
          setPersonelAtaModalAcik={setPersonelAtaModalAcik}
          handlePersonelProjedenCikar={handlePersonelProjedenCikar}
          handlePersonelTekrarGorevlendir={handlePersonelTekrarGorevlendir}
          ustaGorunumSekmesi={ustaGorunumSekmesi}
          setUstaGorunumSekmesi={setUstaGorunumSekmesi}
          arsivdekiKayitlar={arsivdekiKayitlar}
          projeUstaGecmisi={projeUstaGecmisi}
          setYevmiyeciAtaModalAcik={setYevmiyeciAtaModalAcik}
          handleYevmiyeciProjedenCikar={handleYevmiyeciProjedenCikar}
          handleArsivdenTekrarAta={handleArsivdenTekrarAta}
        />
      </>
      )}

      {/* YENİ / DÜZENLEME PROJE MODALI */}
      {yeniProjeModalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {duzenlenenProje ? 'Proje Bilgilerini Düzenle' : 'Yeni Proje Kartı'}
              </h3>
              <button onClick={() => { setYeniProjeModalAcik(false); setDuzenlenenProje(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as any;
                if (duzenlenenProje) {
                  const guncellenmis: Proje = {
                    ...duzenlenenProje,
                    ProjeKodu: form.kod.value || duzenlenenProje.ProjeKodu,
                    ProjeAdi: form.ad.value,
                    MusteriFirma: form.firma.value,
                    SorumluKisi: modalSorumluKisi || form.sorumlu?.value || '',
                    SorumluPersonelId: modalSorumluPersonelId || duzenlenenProje.SorumluPersonelId,
                    SantiyeAdresi: form.adres.value,
                    Durum: form.durum.value,
                    Deadline: form.deadline.value || null,
                    Asamalar: modalAsamalar.length > 0 ? modalAsamalar : (duzenlenenProje.Asamalar || [])
                  };
                  onSaveProje(guncellenmis);
                  setSeciliProje(guncellenmis);
                  setAsamalar(temizleVeNormalizEtAsamalar(guncellenmis.Asamalar || []));
                  showAlert('Başarılı', 'Proje bilgileri başarıyla güncellendi.', 'success');
                } else {
                  const yeni: Proje = {
                    ProjeId: Date.now(),
                    ProjeKodu: form.kod.value || `PRJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
                    ProjeAdi: form.ad.value,
                    MusteriFirma: form.firma.value,
                    SorumluKisi: modalSorumluKisi || form.sorumlu?.value || '',
                    SorumluPersonelId: modalSorumluPersonelId || undefined,
                    SantiyeAdresi: form.adres.value,
                    Durum: form.durum.value,
                    GenelIlerlemeYuzdesi: 0,
                    AktifMi: true,
                    KilitliMi: false,
                    Deadline: form.deadline.value || null,
                    Asamalar: modalAsamalar.map((m, idx) => ({
                      ...m,
                      ProjeId: 0,
                      SiraNo: idx + 1
                    }))
                  };
                  onSaveProje(yeni);
                  setSeciliProje(yeni);
                  setAsamalar(temizleVeNormalizEtAsamalar(yeni.Asamalar || []));
                  showAlert('Başarılı', 'Yeni proje başarıyla oluşturuldu.', 'success');
                }
                setYeniProjeModalAcik(false);
                setDuzenlenenProje(null);
              }}
              className="space-y-4 text-xs sm:text-sm"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Proje Kodu:</label>
                  <input
                    name="kod"
                    key={duzenlenenProje ? `kod-${duzenlenenProje.ProjeId}` : 'kod-new'}
                    defaultValue={duzenlenenProje ? duzenlenenProje.ProjeKodu : `PRJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">İşin / Proje Adı:</label>
                  <input
                    name="ad"
                    key={duzenlenenProje ? `ad-${duzenlenenProje.ProjeId}` : 'ad-new'}
                    defaultValue={duzenlenenProje ? duzenlenenProje.ProjeAdi : ''}
                    placeholder="Örn: Lara Villa Ahşap İmalatı"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Müşteri / Şirket:</label>
                  <input
                    name="firma"
                    key={duzenlenenProje ? `firma-${duzenlenenProje.ProjeId}` : 'firma-new'}
                    defaultValue={duzenlenenProje ? duzenlenenProje.MusteriFirma : ''}
                    placeholder="Örn: Toros Mimarlık"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <PersonelCombobox
                    name="sorumlu"
                    label="Sorumlu Kişi / Yön.:"
                    personeller={yerelPersoneller}
                    value={modalSorumluKisi}
                    onChange={(val, secilen) => {
                      setModalSorumluKisi(val);
                      setModalSorumluPersonelId(secilen ? secilen.PersonelId : null);
                    }}
                    placeholder="Sorumlu personel seçin veya yazın..."
                    helperText="Çalışanlarımız arasından seçebilir veya özel isim girebilirsiniz."
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Durum:</label>
                  <select
                    name="durum"
                    key={duzenlenenProje ? `durum-${duzenlenenProje.ProjeId}` : 'durum-new'}
                    defaultValue={duzenlenenProje ? duzenlenenProje.Durum : 'Teklif Hazırlanıyor'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="Teklif Hazırlanıyor">Teklif Hazırlanıyor</option>
                    <option value="Teklif Verildi">Teklif Verildi</option>
                    <option value="Üretimde">Üretimde</option>
                    <option value="Şantiyede">Şantiyede</option>
                    <option value="Tamamlandı">Tamamlandı</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Hedef Deadline:</label>
                  <input
                    type="date"
                    name="deadline"
                    key={duzenlenenProje ? `deadline-${duzenlenenProje.ProjeId}` : 'deadline-new'}
                    defaultValue={duzenlenenProje && duzenlenenProje.Deadline ? duzenlenenProje.Deadline.split('T')[0] : ''}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Şantiye Adresi:</label>
                  <input
                    name="adres"
                    key={duzenlenenProje ? `adres-${duzenlenenProje.ProjeId}` : 'adres-new'}
                    defaultValue={duzenlenenProje ? duzenlenenProje.SantiyeAdresi : ''}
                    placeholder="Şantiye / Teslimat adresi"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* SÜREÇ ŞABLONU VE EDİTÖRÜ */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    <span>📋 Proje Süreç Aşamaları (Şablon Seçimi)</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const srcList = sablonlar.length > 0 ? sablonlar : fallbackSablonlar;
                        const formatted = srcList.map((s, idx) => ({
                          AsamaId: idx + 1,
                          ProjeId: 0,
                          Seviye: s.Seviye || 1,
                          SiraNo: idx + 1,
                          DinamikNumara: '',
                          AsamaAdi: s.AsamaAdi || '',
                          TamamlandiMi: false,
                          KilitliMi: false,
                          Notlar: ''
                        }));
                        setModalAsamalar(dinamikNumaraHesapla(formatted));
                      }}
                      className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[10px] font-bold text-blue-700 transition-colors"
                    >
                      Hazır Şablon (20 Aşama)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const formatted = [
                          { AsamaId: 1, ProjeId: 0, Seviye: 1, SiraNo: 1, DinamikNumara: '', AsamaAdi: 'Teklif Hazırlanıyor', TamamlandiMi: false, KilitliMi: false, Notlar: '' },
                          { AsamaId: 2, ProjeId: 0, Seviye: 2, SiraNo: 2, DinamikNumara: '', AsamaAdi: 'Piyasa Malzeme Fiyat Araştırması', TamamlandiMi: false, KilitliMi: false, Notlar: '' },
                          { AsamaId: 3, ProjeId: 0, Seviye: 1, SiraNo: 3, DinamikNumara: '', AsamaAdi: 'Teklif Verildi (Müşteri Kararı)', TamamlandiMi: false, KilitliMi: false, Notlar: '' }
                        ];
                        setModalAsamalar(dinamikNumaraHesapla(formatted));
                      }}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 transition-colors"
                    >
                      Hızlı Taslak (3 Aşama)
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalAsamalar([])}
                      className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-[10px] font-bold text-red-700 transition-colors"
                    >
                      Temizle
                    </button>
                  </div>
                </div>

                <div className="max-h-[180px] overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1.5 scrollbar-thin">
                  {modalAsamalar.length > 0 ? (
                    modalAsamalar.map((asama, idx) => {
                      const isSub = asama.Seviye === 2;
                      return (
                        <div key={asama.AsamaId} className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-[11px] font-bold text-slate-400 font-mono w-8 shrink-0 text-right">
                            {asama.DinamikNumara}
                          </span>
                          <input
                            type="text"
                            value={asama.AsamaAdi}
                            onChange={(e) => {
                              const kopya = [...modalAsamalar];
                              kopya[idx] = { ...kopya[idx], AsamaAdi: e.target.value };
                              setModalAsamalar(kopya);
                            }}
                            className={`flex-1 min-w-0 px-2 py-1 rounded border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${isSub ? 'ml-3 bg-slate-50/50' : 'font-semibold'}`}
                            placeholder="Aşama Adı"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const kopya = [...modalAsamalar];
                              kopya[idx] = { ...kopya[idx], Seviye: kopya[idx].Seviye === 1 ? 2 : 1 };
                              setModalAsamalar(dinamikNumaraHesapla(kopya));
                            }}
                            className={`px-1.5 py-1 rounded text-[10px] font-bold transition-colors shrink-0 ${isSub ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-teal-50 hover:bg-teal-100 text-teal-700'}`}
                            title={isSub ? 'Ana Dal Yap' : 'Alt Dal Yap'}
                          >
                            {isSub ? 'Ana' : 'Alt'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const kopya = modalAsamalar.filter((_, i) => i !== idx);
                              setModalAsamalar(dinamikNumaraHesapla(kopya));
                            }}
                            className="p-1 rounded text-red-500 hover:bg-red-50 transition-colors shrink-0"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-xs text-slate-400 italic">Hiç süreç aşaması tanımlanmadı.</p>
                      <button
                        type="button"
                        onClick={() => {
                          const yeni = {
                            AsamaId: Date.now(),
                            ProjeId: 0,
                            Seviye: 1,
                            SiraNo: 1,
                            DinamikNumara: '',
                            AsamaAdi: 'Yeni Aşama',
                            TamamlandiMi: false,
                            KilitliMi: false,
                            Notlar: ''
                          };
                          setModalAsamalar(dinamikNumaraHesapla([yeni]));
                        }}
                        className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                      >
                        + İlk Aşamayı Ekle
                      </button>
                    </div>
                  )}

                  {modalAsamalar.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const yeni = {
                          AsamaId: Date.now() + Math.random(),
                          ProjeId: 0,
                          Seviye: 1,
                          SiraNo: modalAsamalar.length + 1,
                          DinamikNumara: '',
                          AsamaAdi: 'Yeni Aşama',
                          TamamlandiMi: false,
                          KilitliMi: false,
                          Notlar: ''
                        };
                        setModalAsamalar(dinamikNumaraHesapla([...modalAsamalar, yeni]));
                      }}
                      className="w-full py-1.5 rounded-lg border border-dashed border-slate-300 text-center text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 transition-colors"
                    >
                      + Yeni Aşama / Dal Ekle
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setYeniProjeModalAcik(false); setDuzenlenenProje(null); }}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                >
                  {duzenlenenProje ? 'Değişiklikleri Kaydet' : 'Projeyi Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION DIALOG */}
      {customConfirmModal?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-center">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
                <Lock className="w-8 h-8" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-base">{customConfirmModal.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{customConfirmModal.message}</p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => setCustomConfirmModal(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  const cb = customConfirmModal.onConfirm;
                  setCustomConfirmModal(null);
                  cb();
                }}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                Onayla ve Kilitle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM ALERT DIALOG */}
      {customAlertModal?.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-center">
              {customAlertModal.type === 'success' && (
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              )}
              {customAlertModal.type === 'warning' && (
                <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
                  <AlertCircle className="w-8 h-8" />
                </div>
              )}
              {customAlertModal.type === 'error' && (
                <div className="p-3 bg-red-50 text-red-600 rounded-full">
                  <X className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-base">{customAlertModal.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{customAlertModal.message}</p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setCustomAlertModal(null)}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROJEYE ŞİRKET PERSONELİ GÖREVLENDİR */}
      {/* ========================================================================= */}
      {personelAtaModalAcik && seciliProje && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Projeye Kadrolu Personel Ata</h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{seciliProje.ProjeAdi}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPersonelAtaModalAcik(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Şirket Çalışanı Seçin <span className="text-rose-500">*</span>
                </label>
                <select
                  value={seciliAtaPersonelId}
                  onChange={e => setSeciliAtaPersonelId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="">-- Personel Seçin --</option>
                  {yerelPersoneller
                    .filter(p => p.AktifMi !== false)
                    .map(p => {
                      const isZatenAktif = aktifPersoneller.some(pp => String(pp.PersonelId) === String(p.PersonelId));
                      return (
                        <option key={p.PersonelId} value={p.PersonelId} disabled={isZatenAktif}>
                          {p.AdSoyad} {p.Departman ? `(${p.Departman})` : ''} - {p.Gorev || 'Personel'}
                          {isZatenAktif ? ' [Zaten Bu Projede Aktif]' : ''}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Projedeki Görev / Rolü:
                </label>
                <input
                  type="text"
                  value={seciliAtaProjeGorevi}
                  onChange={e => setSeciliAtaProjeGorevi(e.target.value)}
                  placeholder="Örn: Şantiye Şefi, Montaj Sorumlusu..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Şantiye Şefi', 'Saha Sorumlusu', 'Montaj Ustası', 'Teknik Ressam', 'Kalite Kontrol'].map(rol => (
                    <button
                      key={rol}
                      type="button"
                      onClick={() => setSeciliAtaProjeGorevi(rol)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition ${
                        seciliAtaProjeGorevi === rol
                          ? 'bg-blue-600 text-white border-blue-600 font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                      }`}
                    >
                      {rol}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Göreve Başlama Tarihi:
                </label>
                <input
                  type="date"
                  value={seciliAtaBaslangicTarihi}
                  onChange={e => setSeciliAtaBaslangicTarihi(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Açıklama &amp; Görev Notu (İsteğe Bağlı):
                </label>
                <textarea
                  rows={2}
                  value={seciliAtaNotlar}
                  onChange={e => setSeciliAtaNotlar(e.target.value)}
                  placeholder="Örn: Şantiye montaj süreçleri ve mimari koordinasyon sorumlusu..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              {seciliAtaPersonelId && (
                <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3 text-xs text-blue-950 space-y-1">
                  <p className="font-semibold text-blue-800">Seçilen Çalışan:</p>
                  {(() => {
                    const p = yerelPersoneller.find(item => String(item.PersonelId) === String(seciliAtaPersonelId));
                    if (!p) return null;
                    return (
                      <div className="mt-1 space-y-0.5">
                        <p>👤 <strong>{p.AdSoyad}</strong> ({p.Departman || 'Personel'} - {p.Gorev || 'Çalışan'})</p>
                        {p.Telefon && <p>📞 Telefon: {p.Telefon}</p>}
                        {p.Email && <p>✉️ E-posta: {p.Email}</p>}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPersonelAtaModalAcik(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={!seciliAtaPersonelId}
                onClick={handlePersonelAta}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
              >
                Projeye Görevlendir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROJEYE YEVMİYECİ / USTA ATA */}
      {/* ========================================================================= */}
      {yevmiyeciAtaModalAcik && seciliProje && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Projeye Usta Ata</h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{seciliProje.ProjeAdi}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setYevmiyeciAtaModalAcik(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Atanacak Yevmiyeci / Saha Ustası Seçin
                </label>
                <select
                  value={seciliAtaYevmiyeciId}
                  onChange={e => setSeciliAtaYevmiyeciId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  <option value="">-- Usta Seçin --</option>
                  {yevmiyeciler
                    .filter(y => y.Durum !== 'KaraListe')
                    .map(y => {
                      const isZatenBuProjede = y.AktifProjeId === seciliProje.ProjeId || (y.AktifProjeAdi && y.AktifProjeAdi.trim().toLowerCase() === seciliProje.ProjeAdi.trim().toLowerCase());
                      return (
                        <option key={y.YevmiyeciId} value={y.YevmiyeciId} disabled={isZatenBuProjede}>
                          {y.AdSoyad} ({y.UzmanlikAlani}) - {y.GunlukYevmiye ? `${y.GunlukYevmiye} ₺/gün` : 'Yevmiye Belirtilmedi'}
                          {isZatenBuProjede ? ' (Zaten Bu Projede)' : y.Durum === 'ProjedeCalisiyor' ? ` (Aktif: ${y.AktifProjeAdi || 'Başka Proje'})` : ' (Müsait)'}
                        </option>
                      );
                    })}
                </select>
              </div>

              {seciliAtaYevmiyeciId && (
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 space-y-1">
                  <p className="font-semibold">Seçilen Usta Bilgileri:</p>
                  {(() => {
                    const y = yevmiyeciler.find(item => String(item.YevmiyeciId) === String(seciliAtaYevmiyeciId));
                    if (!y) return null;
                    return (
                      <div className="mt-1 space-y-0.5">
                        <p>👤 <strong>{y.AdSoyad}</strong> ({y.UzmanlikAlani})</p>
                        <p>💰 Günlük Yevmiye: <strong>{y.GunlukYevmiye ? `${y.GunlukYevmiye.toLocaleString('tr-TR')} ₺` : 'Belirtilmedi'}</strong></p>
                        {y.Telefon && <p>📞 Telefon: {y.Telefon}</p>}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setYevmiyeciAtaModalAcik(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={!seciliAtaYevmiyeciId}
                onClick={handleYevmiyeciAta}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
              >
                Projeye Ata
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BELGE ÖNİZLEME MODAL */}
      {onizlemeDosya && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate max-w-md sm:max-w-xl" title={onizlemeDosya.ad}>
                    {onizlemeDosya.ad}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {onizlemeDosya.boyut && <span>{onizlemeDosya.boyut}</span>}
                    {onizlemeDosya.tarih && <span> • {onizlemeDosya.tarih}</span>}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setOnizlemeDosya(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl p-4 flex items-center justify-center min-h-[40vh]">
              {onizlemeDosya.base64 && (onizlemeDosya.base64.startsWith('data:image/') || /\.(png|jpe?g|gif|svg|webp|bmp)$/i.test(onizlemeDosya.ad || '')) ? (
                <img 
                  src={onizlemeDosya.base64} 
                  alt={onizlemeDosya.ad} 
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : onizlemeDosya.base64 && (onizlemeDosya.base64.startsWith('data:application/pdf') || /\.(pdf)$/i.test(onizlemeDosya.ad || '')) ? (
                <object
                  data={onizlemeDosya.base64}
                  type="application/pdf"
                  className="w-full h-[60vh] rounded-lg border border-slate-200"
                >
                  <iframe 
                    src={onizlemeDosya.base64} 
                    className="w-full h-[60vh] rounded-lg border border-slate-200" 
                    title={onizlemeDosya.ad}
                  ></iframe>
                </object>
              ) : (
                <div className="text-center p-6 space-y-3 max-w-sm">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto shadow-sm">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Doğrudan Önizleme Desteklenmiyor</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Bu dosya formatı tarayıcıda doğrudan önizleme için uygun olmayabilir. Dosyayı cihazınıza indirerek görüntüleyebilirsiniz.
                  </p>
                  {onizlemeDosya.base64 && (
                    <a
                      href={onizlemeDosya.base64}
                      download={onizlemeDosya.ad}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Belgeyi İndir</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 mt-4 shrink-0">
              {onizlemeDosya.base64 && (
                <a
                  href={onizlemeDosya.base64}
                  download={onizlemeDosya.ad}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>İndir</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setOnizlemeDosya(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
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
