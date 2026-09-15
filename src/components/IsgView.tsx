import React, { useState, useEffect } from 'react';
import { Personel, PersonelKkdZimmet, PersonelSaglikRaporu, IsgEgitimi } from '../types';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Printer, 
  Trash2, 
  AlertTriangle, 
  HeartPulse, 
  GraduationCap, 
  CheckCircle2, 
  Clock,
  User,
  Package,
  Edit2,
  ShieldAlert,
  FileText,
  Upload,
  Eye,
  Download,
  X,
  Paperclip
} from 'lucide-react';
import { KkdZimmetTutanakModal } from './KkdZimmetTutanakModal';
import { formatTarihTR, tarihAyEkle } from '../utils/dateUtils';

interface IsgViewProps {
  personeller: Personel[];
  onRefresh?: () => void;
  initialPersonelId?: number;
  initialSekme?: 'kkd' | 'saglik' | 'egitim';
}

interface KkdTemplateItem {
  secili: boolean;
  malzemeAdi: string;
  standartNo: string;
  bedenNo: string;
  adet: number;
  yenilemePeriyoduAy: number;
  aciklama: string;
}

const varsayilanKkdListesi: KkdTemplateItem[] = [
  { secili: true, malzemeAdi: 'İş Güvenliği Ayakkabısı (S3/Çelik Burun)', standartNo: 'EN ISO 20345', bedenNo: '42', adet: 1, yenilemePeriyoduAy: 12, aciklama: 'Kişisel koruyucu çelik burunlu ayakkabı' },
  { secili: true, malzemeAdi: 'İş Güvenliği Bareti (EN 397)', standartNo: 'EN 397', bedenNo: 'Standart', adet: 1, yenilemePeriyoduAy: 36, aciklama: 'Baş koruyucu baret' },
  { secili: true, malzemeAdi: 'Manşonlu Gürültü Kulaklığı (SNR 30dB)', standartNo: 'EN 352-1', bedenNo: 'Standart', adet: 1, yenilemePeriyoduAy: 24, aciklama: 'Kulak koruyucu' },
  { secili: true, malzemeAdi: 'Çapak & Toz Koruma Gözlüğü (EN 166)', standartNo: 'EN 166', bedenNo: 'Standart', adet: 1, yenilemePeriyoduAy: 12, aciklama: 'Göz koruyucu şeffaf gözlük' },
  { secili: true, malzemeAdi: 'FFP2 Ventilli Toz Maskesi (Ahşap Tozları)', standartNo: 'EN 149', bedenNo: 'Standart', adet: 5, yenilemePeriyoduAy: 1, aciklama: 'Solunum koruyucu maske' },
  { secili: true, malzemeAdi: 'Mekanik Risk Eldiveni (EN 388)', standartNo: 'EN 388', bedenNo: 'L', adet: 3, yenilemePeriyoduAy: 3, aciklama: 'Mekanik risklere karşı eldiven' },
  { secili: true, malzemeAdi: 'Bel Tipi Paraşüt Emniyet Kemeri (Yüksekte Çalışma)', standartNo: 'EN 361', bedenNo: 'Standart', adet: 1, yenilemePeriyoduAy: 24, aciklama: 'Düşüş durdurucu kemer' },
  { secili: true, malzemeAdi: 'İş Tulumu / Reflektörlü Yelek', standartNo: 'EN ISO 20471', bedenNo: 'XL', adet: 2, yenilemePeriyoduAy: 6, aciklama: 'Yüksek görünürlüklü iş elbisesi' }
];

export const IsgView: React.FC<IsgViewProps> = ({ 
  personeller, 
  onRefresh, 
  initialPersonelId, 
  initialSekme 
}) => {
  const [sekme, setSekme] = useState<'kkd' | 'saglik' | 'egitim'>(initialSekme || 'kkd');
  const [seciliPersonelId, setSeciliPersonelId] = useState<number>(
    initialPersonelId || personeller[0]?.PersonelId || 1
  );

  useEffect(() => {
    if (initialSekme) {
      setSekme(initialSekme);
    }
  }, [initialSekme]);

  useEffect(() => {
    if (initialPersonelId) {
      setSeciliPersonelId(initialPersonelId);
    }
  }, [initialPersonelId]);
  const [zimmetler, setZimmetler] = useState<PersonelKkdZimmet[]>([]);
  const [saglikRaporlari, setSaglikRaporlari] = useState<PersonelSaglikRaporu[]>([]);
  const [egitimler, setEgitimler] = useState<IsgEgitimi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [personelArama, setPersonelArama] = useState('');
  
  // Modallar
  const [tutanakModalAcik, setTutanakModalAcik] = useState(false);
  const [yeniKkdModalAcik, setYeniKkdModalAcik] = useState(false);

  // Form State
  const [kkdChecklist, setKkdChecklist] = useState<KkdTemplateItem[]>([]);
  const [kkdFormTarih, setKkdFormTarih] = useState(new Date().toISOString().split('T')[0]);

  // Custom Alerts / Confirms
  const [customAlert, setCustomAlert] = useState<{
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Belge / Sertifika Lightbox Önizleme State
  const [lightboxDosya, setLightboxDosya] = useState<{ DosyaAdi: string; DosyaIcerigi: string } | null>(null);

  // Sağlık Raporu Form & Modal State
  const [saglikModalAcik, setSaglikModalAcik] = useState(false);
  const [duzenlenecekSaglik, setDuzenlenecekSaglik] = useState<PersonelSaglikRaporu | null>(null);
  const [saglikForm, setSaglikForm] = useState({
    PersonelId: personeller[0]?.PersonelId || 1,
    MuayeneTuru: 'Periyodik Sağlık Muayenesi',
    MuayeneTarihi: new Date().toISOString().split('T')[0],
    GecerlilikSuresiAy: 12,
    SaglikKurulusu: 'Yetkili OSGB Sağlık Birimi',
    Sonuc: 'Çalışmaya Uygundur',
    RaporNo: '',
    Aciklama: '',
    BelgeUrl: '',
    BelgeAdi: ''
  });

  // İSG Eğitimi Form & Modal State
  const [egitimModalAcik, setEgitimModalAcik] = useState(false);
  const [duzenlenecekEgitim, setDuzenlenecekEgitim] = useState<IsgEgitimi | null>(null);
  const [egitimForm, setEgitimForm] = useState({
    PersonelId: personeller[0]?.PersonelId || 1,
    EgitimKonusu: 'Temel İSG Eğitimi (Tehlikeli Sınıf)',
    EgiticiAdSoyad: 'İSG Uzmanı - OSGB',
    EgitimTarihi: new Date().toISOString().split('T')[0],
    SureSaat: 12,
    GecerlilikYil: 2,
    Aciklama: '',
    BelgeUrl: '',
    BelgeAdi: ''
  });

  const handleSaglikDosyaYukle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setSaglikForm(prev => ({
        ...prev,
        BelgeUrl: base64,
        BelgeAdi: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleEgitimDosyaYukle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setEgitimForm(prev => ({
        ...prev,
        BelgeUrl: base64,
        BelgeAdi: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaglikModalAc = (r?: PersonelSaglikRaporu) => {
    if (r) {
      setDuzenlenecekSaglik(r);
      setSaglikForm({
        PersonelId: r.PersonelId,
        MuayeneTuru: r.MuayeneTuru || r.RaporTuru || 'Periyodik Sağlık Muayenesi',
        MuayeneTarihi: r.MuayeneTarihi || new Date().toISOString().split('T')[0],
        GecerlilikSuresiAy: r.GecerlilikSuresiAy || 12,
        SaglikKurulusu: r.SaglikKurulusu || 'Yetkili OSGB',
        Sonuc: r.Sonuc || 'Çalışmaya Uygundur',
        RaporNo: r.RaporNo || '',
        Aciklama: r.Aciklama || '',
        BelgeUrl: r.BelgeUrl || '',
        BelgeAdi: r.BelgeAdi || ''
      });
    } else {
      setDuzenlenecekSaglik(null);
      setSaglikForm({
        PersonelId: seciliPersonelId || personeller[0]?.PersonelId || 1,
        MuayeneTuru: 'Periyodik Sağlık Muayenesi',
        MuayeneTarihi: new Date().toISOString().split('T')[0],
        GecerlilikSuresiAy: 12,
        SaglikKurulusu: 'Yetkili OSGB Sağlık Birimi',
        Sonuc: 'Çalışmaya Uygundur',
        RaporNo: '',
        Aciklama: '',
        BelgeUrl: '',
        BelgeAdi: ''
      });
    }
    setSaglikModalAcik(true);
  };

  const handleSaglikKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...saglikForm };
      let res;
      if (duzenlenecekSaglik) {
        res = await fetch(`/api/isg/saglik-raporlari/${duzenlenecekSaglik.RaporId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/isg/saglik-raporlari', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setCustomAlert({
          title: 'Başarılı',
          message: duzenlenecekSaglik ? 'Sağlık raporu güncellendi.' : 'Yeni sağlık raporu eklendi.',
          type: 'success'
        });
        setSaglikModalAcik(false);
        setDuzenlenecekSaglik(null);
        veriGetir();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      setCustomAlert({ title: 'Hata', message: err.message, type: 'error' });
    }
  };

  const handleSaglikSil = (id: number) => {
    setCustomConfirm({
      title: 'Sağlık Raporu Sil',
      message: 'Bu periyodik sağlık raporu kaydını silmek istediğinize emin misiniz?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/isg/saglik-raporlari/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setCustomAlert({ title: 'Silindi', message: 'Sağlık raporu silindi.', type: 'success' });
            veriGetir();
            if (onRefresh) onRefresh();
          }
        } catch (err: any) {
          setCustomAlert({ title: 'Hata', message: err.message, type: 'error' });
        }
      }
    });
  };

  const handleEgitimModalAc = (eg?: IsgEgitimi) => {
    if (eg) {
      setDuzenlenecekEgitim(eg);
      setEgitimForm({
        PersonelId: eg.PersonelId || seciliPersonelId || personeller[0]?.PersonelId || 1,
        EgitimKonusu: eg.EgitimKonusu || (eg as any).EgitimAdi || 'Temel İSG Eğitimi',
        EgiticiAdSoyad: eg.EgiticiAdSoyad || (eg as any).EgitimciKurum || 'Yetkili OSGB',
        EgitimTarihi: eg.EgitimTarihi || new Date().toISOString().split('T')[0],
        SureSaat: eg.SureSaat || (eg as any).EgitimSuresiSaat || 12,
        GecerlilikYil: eg.GecerlilikYil || 2,
        Aciklama: eg.Aciklama || '',
        BelgeUrl: (eg as any).BelgeUrl || '',
        BelgeAdi: (eg as any).BelgeAdi || ''
      });
    } else {
      setDuzenlenecekEgitim(null);
      setEgitimForm({
        PersonelId: seciliPersonelId || personeller[0]?.PersonelId || 1,
        EgitimKonusu: 'Temel İSG Eğitimi (Tehlikeli Sınıf)',
        EgiticiAdSoyad: 'İSG Uzmanı - OSGB',
        EgitimTarihi: new Date().toISOString().split('T')[0],
        SureSaat: 12,
        GecerlilikYil: 2,
        Aciklama: '',
        BelgeUrl: '',
        BelgeAdi: ''
      });
    }
    setEgitimModalAcik(true);
  };

  const handleEgitimKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...egitimForm };
      let res;
      if (duzenlenecekEgitim) {
        res = await fetch(`/api/isg/egitimler/${duzenlenecekEgitim.EgitimId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/isg/egitimler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setCustomAlert({
          title: 'Başarılı',
          message: duzenlenecekEgitim ? 'İSG eğitim kaydı güncellendi.' : 'Yeni İSG eğitimi eklendi.',
          type: 'success'
        });
        setEgitimModalAcik(false);
        setDuzenlenecekEgitim(null);
        veriGetir();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      setCustomAlert({ title: 'Hata', message: err.message, type: 'error' });
    }
  };

  const handleEgitimSil = (id: number) => {
    setCustomConfirm({
      title: 'İSG Eğitimi Sil',
      message: 'Bu İSG eğitimi sertifika kaydını silmek istediğinize emin misiniz?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/isg/egitimler/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setCustomAlert({ title: 'Silindi', message: 'Eğitim kaydı silindi.', type: 'success' });
            veriGetir();
            if (onRefresh) onRefresh();
          }
        } catch (err: any) {
          setCustomAlert({ title: 'Hata', message: err.message, type: 'error' });
        }
      }
    });
  };

  const veriGetir = async () => {
    setYukleniyor(true);
    try {
      const [zRes, sRes, eRes] = await Promise.all([
        fetch('/api/isg/zimmetler'),
        fetch('/api/isg/saglik-raporlari'),
        fetch('/api/isg/egitimler')
      ]);
      const zData: PersonelKkdZimmet[] = await zRes.json();
      const sData: PersonelSaglikRaporu[] = await sRes.json();
      const eData: IsgEgitimi[] = await eRes.json();
      setZimmetler(zData);
      setSaglikRaporlari(sData);
      setEgitimler(eData);
    } catch (e) {
      console.error(e);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    veriGetir();
  }, []);

  const seciliPersonel = personeller.find(p => p.PersonelId === seciliPersonelId) || personeller[0] || null;
  const personelZimmetleri = zimmetler.filter(z => z.PersonelId === seciliPersonelId);

  const handleYeniKkdAc = () => {
    setKkdChecklist(varsayilanKkdListesi.map(item => ({ ...item })));
    setKkdFormTarih(new Date().toISOString().split('T')[0]);
    setYeniKkdModalAcik(true);
  };

  const handleKkdSatirEkle = () => {
    setKkdChecklist([
      ...kkdChecklist,
      {
        secili: true,
        malzemeAdi: '',
        standartNo: 'CE',
        bedenNo: 'Standart',
        adet: 1,
        yenilemePeriyoduAy: 12,
        aciklama: ''
      }
    ]);
  };

  const handleKkdSatirGuncelle = (index: number, alan: keyof KkdTemplateItem, deger: any) => {
    const yeniList = [...kkdChecklist];
    yeniList[index] = {
      ...yeniList[index],
      [alan]: deger
    };
    setKkdChecklist(yeniList);
  };

  const handleKkdKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    const seciliMalzemeler = kkdChecklist.filter(item => item.secili && item.malzemeAdi.trim() !== '');
    if (seciliMalzemeler.length === 0) {
      setCustomAlert({
        title: 'Seçim Yapılmadı',
        message: 'Lütfen teslim edilecek en az bir malzeme seçin veya malzeme adı girin!',
        type: 'warning'
      });
      return;
    }

    try {
      const bodyPayload = seciliMalzemeler.map(m => ({
        PersonelId: seciliPersonelId,
        MalzemeAdi: m.malzemeAdi,
        StandartNo: m.standartNo,
        VerilisTarihi: kkdFormTarih,
        YenilemePeriyoduAy: Number(m.yenilemePeriyoduAy),
        Adet: Number(m.adet),
        BedenNo: m.bedenNo,
        Aciklama: m.aciklama
      }));

      const res = await fetch('/api/isg/zimmetler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        throw new Error('Zimmet kayıtları kaydedilemedi.');
      }

      setYeniKkdModalAcik(false);
      setCustomAlert({
        title: 'Zimmet Başarılı',
        message: `${seciliMalzemeler.length} adet malzeme personelin zimmetine başarıyla kaydedildi. Tutanak çıkararak ıslak imzalı teslim alabilirsiniz.`,
        type: 'success'
      });
      veriGetir();
    } catch (err: any) {
      setCustomAlert({
        title: 'Hata',
        message: 'Kayıt hatası: ' + err.message,
        type: 'error'
      });
    }
  };

  const handleKkdSil = async (id: number) => {
    setCustomConfirm({
      title: 'Zimmet Kaydını Sil',
      message: 'Bu zimmet kaydını kalıcı olarak silmek istediğinize emin misiniz?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/isg/zimmetler/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Zimmet silinemedi.');
          setCustomAlert({
            title: 'Silindi',
            message: 'Zimmet kaydı başarıyla silindi.',
            type: 'success'
          });
          veriGetir();
        } catch (err: any) {
          setCustomAlert({
            title: 'Hata',
            message: err.message,
            type: 'error'
          });
        }
      }
    });
  };

  const filtrelenmisPersoneller = personeller.filter(p => 
    p.DurumAktifMi && 
    (p.AdSoyad.toLowerCase().includes(personelArama.toLowerCase()) || 
     (p.Departman && p.Departman.toLowerCase().includes(personelArama.toLowerCase())))
  );

  return (
    <div className="space-y-6">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl font-bold text-white tracking-wide">İş Sağlığı ve Güvenliği (İSG) & KKD</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            6331 Sayılı Kanun gereği KKD zimmet tutanakları, periyodik sağlık muayeneleri ve İSG eğitim kayıtları
          </p>
        </div>

        {/* Sekme Butonları */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setSekme('kkd')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              sekme === 'kkd' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            KKD Zimmet Takibi
          </button>

          <button
            onClick={() => setSekme('saglik')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              sekme === 'saglik' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            Sağlık Raporları
          </button>

          <button
            onClick={() => setSekme('egitim')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              sekme === 'egitim' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            İSG Eğitimleri
          </button>
        </div>
      </div>

      {/* KKD Sekmesi */}
      {sekme === 'kkd' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Kolon: Personel Listesi */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-[650px]">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Çalışan ara..."
                value={personelArama}
                onChange={(e) => setPersonelArama(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filtrelenmisPersoneller.map((p) => {
                const zSayi = zimmetler.filter(z => z.PersonelId === p.PersonelId).length;
                const seciliMi = p.PersonelId === seciliPersonelId;

                return (
                  <button
                    key={p.PersonelId}
                    onClick={() => setSeciliPersonelId(p.PersonelId)}
                    className={`w-full text-left p-3 rounded-lg border transition flex items-center justify-between ${
                      seciliMi 
                        ? 'bg-amber-950/40 border-amber-600/80 text-white shadow' 
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">{p.AdSoyad}</div>
                      <div className="text-xs text-slate-400">{p.Departman || 'Genel'} • {p.Gorev || '-'}</div>
                    </div>

                    <div className="text-right">
                      {zSayi > 0 ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium">
                          {zSayi} Zimmet
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800 font-bold animate-pulse">
                          Zimmet Yok!
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sağ Kolon: Seçili Personelin KKD Malzemeleri & Tutanağı */}
          <div className="lg:col-span-2 space-y-4">
            {seciliPersonel ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
                {/* Personel Başlık Özeti */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-amber-400" />
                      <h2 className="text-lg font-bold text-white">{seciliPersonel.AdSoyad}</h2>
                      <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        TC: {seciliPersonel.TCKimlikNo || '-'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {seciliPersonel.Departman} • {seciliPersonel.Gorev} • İşe Giriş: {formatTarihTR(seciliPersonel.IseGirisTarihi)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleYeniKkdAc}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition shadow"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      KKD Zimmetle
                    </button>

                    <button
                      onClick={() => {
                        setSekme('saglik');
                        setDuzenlenecekSaglik(null);
                        setSaglikForm({
                          PersonelId: seciliPersonel.PersonelId,
                          MuayeneTuru: 'Periyodik Sağlık Muayenesi',
                          MuayeneTarihi: new Date().toISOString().split('T')[0],
                          GecerlilikSuresiAy: 12,
                          SaglikKurulusu: 'Yetkili OSGB Sağlık Birimi',
                          Sonuc: 'Çalışmaya Uygundur',
                          RaporNo: '',
                          Aciklama: ''
                        });
                        setSaglikModalAcik(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition shadow"
                    >
                      <HeartPulse className="w-3.5 h-3.5" />
                      + Sağlık Raporu
                    </button>

                    <button
                      onClick={() => {
                        setSekme('egitim');
                        setDuzenlenecekEgitim(null);
                        setEgitimForm({
                          PersonelId: seciliPersonel.PersonelId,
                          EgitimKonusu: 'Temel İSG Eğitimi (Tehlikeli Sınıf)',
                          EgiticiAdSoyad: 'İSG Uzmanı - OSGB',
                          EgitimTarihi: new Date().toISOString().split('T')[0],
                          SureSaat: 12,
                          GecerlilikYil: 2,
                          Aciklama: ''
                        });
                        setEgitimModalAcik(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      + İSG Eğitimi
                    </button>

                    <button
                      onClick={() => setTutanakModalAcik(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      Tutanak (A4)
                    </button>
                  </div>
                </div>

                {/* Malzeme Listesi Tablosu */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Malzeme Tanımı</th>
                        <th className="py-2.5 px-3">Standart No</th>
                        <th className="py-2.5 px-2 text-center">Beden</th>
                        <th className="py-2.5 px-2 text-center">Adet</th>
                        <th className="py-2.5 px-3">Teslim Tarihi</th>
                        <th className="py-2.5 px-3 text-center">Yenileme</th>
                        <th className="py-2.5 px-2 text-right">Sil</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {personelZimmetleri.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500">
                            Bu çalışana henüz zimmetli KKD malzemesi atanmamış.
                          </td>
                        </tr>
                      ) : (
                        personelZimmetleri.map((z) => (
                          <tr key={z.ZimmetId} className="hover:bg-slate-800/30 transition">
                            <td className="py-2.5 px-3 font-semibold text-white">
                              {z.MalzemeAdi}
                              {z.Aciklama && <p className="text-[11px] text-slate-400 font-normal italic">{z.Aciklama}</p>}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">{z.StandartNo || 'CE'}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{z.BedenNo || '-'}</td>
                            <td className="py-2.5 px-2 text-center font-bold text-white">{z.Adet}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{formatTarihTR(z.VerilisTarihi)}</td>
                            <td className="py-2.5 px-3 text-center text-amber-400 font-medium">{z.YenilemePeriyoduAy} Ay</td>
                            <td className="py-2.5 px-2 text-right">
                              <button
                                onClick={() => handleKkdSil(z.ZimmetId)}
                                className="p-1 hover:text-rose-400 text-slate-500 transition"
                                title="Zimmeti Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
                Lütfen soldaki listeden bir çalışan seçiniz.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sağlık Raporları Sekmesi */}
      {sekme === 'saglik' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-400" />
                Periyodik Sağlık Muayeneleri &amp; Tetkik Takibi
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                6331 sayılı İSG Kanunu gereği personellerin periyodik muayene ve sağlık raporu kaydı
              </p>
            </div>
            <button
              onClick={() => handleSaglikModalAc()}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-rose-600/30 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Sağlık Raporu Ekle</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Personel</th>
                  <th className="py-3 px-3">Muayene / Rapor Türü</th>
                  <th className="py-3 px-3">Muayene Tarihi</th>
                  <th className="py-3 px-3 text-center">Geçerlilik</th>
                  <th className="py-3 px-3 text-center">Gelecek Muayene</th>
                  <th className="py-3 px-3 text-center">Sonuç</th>
                  <th className="py-3 px-3 text-center">Belge</th>
                  <th className="py-3 px-4">Açıklama / Hekim Notu</th>
                  <th className="py-3 px-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {saglikRaporlari.map((r) => {
                  const p = personeller.find(x => x.PersonelId === r.PersonelId);
                  const gelecekTarih = r.GelecekMuayeneTarihi || tarihAyEkle(r.MuayeneTarihi, r.GecerlilikSuresiAy || 12);
                  return (
                    <tr key={r.RaporId} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-semibold text-white">{p?.AdSoyad || `ID: ${r.PersonelId}`}</td>
                      <td className="py-3 px-3 font-medium text-rose-300">{r.MuayeneTuru || r.RaporTuru || 'Periyodik Sağlık Muayenesi'}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{formatTarihTR(r.MuayeneTarihi)}</td>
                      <td className="py-3 px-3 text-center font-semibold text-amber-400">{r.GecerlilikSuresiAy || 12} Ay</td>
                      <td className="py-3 px-3 font-mono text-amber-300 font-bold">{formatTarihTR(gelecekTarih)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] border ${
                          r.Sonuc === 'Çalışamaz'
                            ? 'bg-rose-950 text-rose-400 border-rose-800'
                            : r.Sonuc === 'Kısıtlı Çalışabilir'
                            ? 'bg-amber-950 text-amber-400 border-amber-800'
                            : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        }`}>
                          {r.Sonuc || 'Çalışmaya Uygundur'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {r.BelgeUrl ? (
                          <button
                            type="button"
                            onClick={() => setLightboxDosya({ DosyaAdi: r.BelgeAdi || `${p?.AdSoyad || 'Personel'} - Sağlık Raporu`, DosyaIcerigi: r.BelgeUrl! })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-white font-medium text-[11px] transition shadow-xs"
                            title="Rapor Belgesini Önizle"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Önizle</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{r.Aciklama || '-'}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSaglikModalAc(r)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSaglikSil(r.RaporId)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 hover:text-rose-300 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* İSG Eğitimleri Sekmesi */}
      {sekme === 'egitim' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-400" />
                Zorunlu İSG Eğitimleri &amp; Sertifikasyon
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Çalışanların periyodik temel İSG eğitim sertifikaları ve geçerlilik takibi
              </p>
            </div>
            <button
              onClick={() => handleEgitimModalAc()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-blue-600/30 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni İSG Eğitimi Ekle</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Personel</th>
                  <th className="py-3 px-4">Eğitim Konusu</th>
                  <th className="py-3 px-3">Eğitici / Kurum</th>
                  <th className="py-3 px-3">Eğitim Tarihi</th>
                  <th className="py-3 px-2 text-center">Süre</th>
                  <th className="py-3 px-2 text-center">Geçerlilik</th>
                  <th className="py-3 px-3">Gelecek Yenileme</th>
                  <th className="py-3 px-3 text-center">Sertifika / Belge</th>
                  <th className="py-3 px-4">Açıklama</th>
                  <th className="py-3 px-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {egitimler.map((e) => {
                  const p = personeller.find(x => x.PersonelId === e.PersonelId);
                  const gelecekEgitimTarihi = tarihAyEkle(e.EgitimTarihi, (e.GecerlilikYil || 2) * 12);
                  return (
                    <tr key={e.EgitimId} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-semibold text-white">{p?.AdSoyad || `ID: ${e.PersonelId || '-'}`}</td>
                      <td className="py-3 px-4 font-semibold text-blue-300">{e.EgitimKonusu || (e as any).EgitimAdi}</td>
                      <td className="py-3 px-3 text-slate-300">{e.EgiticiAdSoyad || (e as any).EgitimciKurum}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{formatTarihTR(e.EgitimTarihi)}</td>
                      <td className="py-3 px-2 text-center font-bold text-white">{e.SureSaat || (e as any).EgitimSuresiSaat} Saat</td>
                      <td className="py-3 px-2 text-center font-bold text-amber-400">{e.GecerlilikYil || 2} Yıl</td>
                      <td className="py-3 px-3 font-mono text-blue-300 font-bold">{formatTarihTR(gelecekEgitimTarihi)}</td>
                      <td className="py-3 px-3 text-center">
                        {(e as any).BelgeUrl ? (
                          <button
                            type="button"
                            onClick={() => setLightboxDosya({ DosyaAdi: (e as any).BelgeAdi || `${p?.AdSoyad || 'Personel'} - İSG Eğitimi Sertifikası`, DosyaIcerigi: (e as any).BelgeUrl! })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-300 hover:text-white font-medium text-[11px] transition shadow-xs"
                            title="Eğitim Belgesini Önizle"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Önizle</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{e.Aciklama || '-'}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEgitimModalAc(e)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEgitimSil(e.EgitimId)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 hover:text-rose-300 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Yeni KKD Zimmet Modalı */}
      {yeniKkdModalAcik && seciliPersonel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <span>{seciliPersonel.AdSoyad} - Toplu Yasal KKD Zimmet Atama</span>
              </h2>
              <button onClick={() => setYeniKkdModalAcik(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleKkdKaydet} className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                  Aşağıda iş kanunu ve İSG mevzuatına göre çalışana verilmesi zorunlu kişisel koruyucu malzemeler listelenmiştir. 
                  Zimmetlemek istediğiniz malzemelerin yanındaki kutucukları işaretleyin, beden/numaralarını girin ve kaydedin.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">Teslim Tarihi:</label>
                  <input
                    type="date"
                    required
                    value={kkdFormTarih}
                    onChange={(e) => setKkdFormTarih(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Zimmet Form Tablosu */}
              <div className="overflow-x-auto border border-slate-800/60 rounded-xl max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300 min-w-[750px]">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12 bg-slate-950">Seç</th>
                      <th className="py-2.5 px-3 bg-slate-950">Malzeme Adı / Cinsi *</th>
                      <th className="py-2.5 px-3 w-32 bg-slate-950">Standart / Norm</th>
                      <th className="py-2.5 px-2 w-20 text-center bg-slate-950">Beden/No</th>
                      <th className="py-2.5 px-2 w-16 text-center bg-slate-950">Adet</th>
                      <th className="py-2.5 px-2 w-24 text-center bg-slate-950">Periyot (Ay)</th>
                      <th className="py-2.5 px-3 w-40 bg-slate-950">Açıklama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {kkdChecklist.map((m, idx) => (
                      <tr key={idx} className={`hover:bg-slate-800/20 transition ${m.secili ? 'bg-amber-500/[0.02]' : 'opacity-40'}`}>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={m.secili}
                            onChange={(e) => handleKkdSatirGuncelle(idx, 'secili', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-850 bg-slate-950 text-amber-600 focus:ring-amber-500"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            required={m.secili}
                            value={m.malzemeAdi}
                            onChange={(e) => handleKkdSatirGuncelle(idx, 'malzemeAdi', e.target.value)}
                            placeholder="Örn: İş Güvenliği Bareti"
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            value={m.standartNo}
                            onChange={(e) => handleKkdSatirGuncelle(idx, 'standartNo', e.target.value)}
                            placeholder="Örn: EN 397"
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={m.bedenNo}
                            onChange={(e) => handleKkdSatirGuncelle(idx, 'bedenNo', e.target.value)}
                            placeholder="Std, 42..."
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-center text-white focus:outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            min="1"
                            value={m.adet}
                            onChange={(e) => handleKkdSatirGuncelle(idx, 'adet', Number(e.target.value))}
                            className="w-full px-1 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-center text-white focus:outline-none focus:border-amber-500 font-bold"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            min="1"
                            value={m.yenilemePeriyoduAy}
                            onChange={(e) => handleKkdSatirGuncelle(idx, 'yenilemePeriyoduAy', Number(e.target.value))}
                            className="w-full px-1 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-center text-amber-400 focus:outline-none focus:border-amber-500 font-bold"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            value={m.aciklama}
                            onChange={(e) => handleKkdSatirGuncelle(idx, 'aciklama', e.target.value)}
                            placeholder="Not..."
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleKkdSatirEkle}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-500" />
                  Başka Malzeme Ekle
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setYeniKkdModalAcik(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs transition"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow transition flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Seçilenleri Zimmetle
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tutanak Yazdırma Modalı */}
      <KkdZimmetTutanakModal
        isOpen={tutanakModalAcik}
        onClose={() => setTutanakModalAcik(false)}
        personel={seciliPersonel}
        zimmetler={personelZimmetleri}
      />

      {/* Sağlık Raporu Ekle / Düzenle Modalı */}
      {saglikModalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-400" />
                <span>{duzenlenecekSaglik ? 'Sağlık Raporu Kaydını Düzenle' : 'Yeni Periyodik Sağlık Raporu Ekle'}</span>
              </h2>
              <button onClick={() => setSaglikModalAcik(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleSaglikKaydet} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Personel Seçin:</label>
                <select
                  required
                  value={saglikForm.PersonelId}
                  onChange={(e) => setSaglikForm({ ...saglikForm, PersonelId: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                >
                  {personeller.map((p) => (
                    <option key={p.PersonelId} value={p.PersonelId}>
                      {p.AdSoyad} - {p.GorevVeyaUnvan || 'Personel'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Muayene / Rapor Türü:</label>
                  <select
                    value={saglikForm.MuayeneTuru}
                    onChange={(e) => setSaglikForm({ ...saglikForm, MuayeneTuru: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Periyodik Sağlık Muayenesi">Periyodik Sağlık Muayenesi</option>
                    <option value="İşe Giriş Muayenesi">İşe Giriş Muayenesi</option>
                    <option value="Akciğer Grafisi & Solunum">Akciğer Grafisi &amp; Solunum</option>
                    <option value="İşitme Testi (Odyometri)">İşitme Testi (Odyometri)</option>
                    <option value="Kan & Biyokimya Tetkiki">Kan &amp; Biyokimya Tetkiki</option>
                    <option value="İş Değişikliği Muayenesi">İş Değişikliği Muayenesi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Muayene Tarihi:</label>
                  <input
                    type="date"
                    required
                    value={saglikForm.MuayeneTarihi}
                    onChange={(e) => setSaglikForm({ ...saglikForm, MuayeneTarihi: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Geçerlilik Süresi (Ay):</label>
                  <select
                    value={saglikForm.GecerlilikSuresiAy}
                    onChange={(e) => setSaglikForm({ ...saglikForm, GecerlilikSuresiAy: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value={12}>12 Ay (Çok Tehlikeli Sınıf)</option>
                    <option value={24}>24 Ay (Tehlikeli Sınıf)</option>
                    <option value={36}>36 Ay (Az Tehlikeli Sınıf)</option>
                    <option value={6}>6 Ay (Özel Riskli İşler)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Muayene Sonucu:</label>
                  <select
                    value={saglikForm.Sonuc}
                    onChange={(e) => setSaglikForm({ ...saglikForm, Sonuc: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Çalışmaya Uygundur">Çalışmaya Uygundur</option>
                    <option value="Kısıtlı Çalışabilir">Kısıtlı Çalışabilir</option>
                    <option value="Çalışamaz">Çalışamaz</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Gelecek Muayene Tarihi:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {formatTarihTR(tarihAyEkle(saglikForm.MuayeneTarihi, saglikForm.GecerlilikSuresiAy))}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Sağlık Kuruluşu / OSGB:</label>
                  <input
                    type="text"
                    value={saglikForm.SaglikKurulusu}
                    onChange={(e) => setSaglikForm({ ...saglikForm, SaglikKurulusu: e.target.value })}
                    placeholder="Örn: Yetkili OSGB Sağlık Birimi"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Rapor / Belge No:</label>
                  <input
                    type="text"
                    value={saglikForm.RaporNo}
                    onChange={(e) => setSaglikForm({ ...saglikForm, RaporNo: e.target.value })}
                    placeholder="Örn: R-2026-88"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Açıklama / Hekim Notu:</label>
                <textarea
                  rows={2}
                  value={saglikForm.Aciklama}
                  onChange={(e) => setSaglikForm({ ...saglikForm, Aciklama: e.target.value })}
                  placeholder="İşyeri hekimi veya OSGB doktor notları..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              {/* Rapor Belgesi / Tutanak Ekleme ve Önizleme */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-400 font-semibold text-xs flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sağlık Raporu Belgesi (PDF / Görsel):</span>
                  </label>
                  {saglikForm.BelgeUrl && (
                    <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Belge Yüklendi
                    </span>
                  )}
                </div>

                {!saglikForm.BelgeUrl ? (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-rose-500/70 bg-slate-950/60 rounded-xl cursor-pointer transition group">
                    <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-300 group-hover:text-rose-400 transition-colors">
                      Rapor Belgesi / Tarama Dosyası Seç
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      PDF, JPG, PNG, WEBP (Önizlemeli)
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleSaglikDosyaYukle}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        onClick={() => setLightboxDosya({ DosyaAdi: saglikForm.BelgeAdi || 'Sağlık Raporu', DosyaIcerigi: saglikForm.BelgeUrl })}
                        className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-700/80 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90 relative group"
                        title="Önizlemeyi Büyüt"
                      >
                        {saglikForm.BelgeUrl.startsWith('data:image') || saglikForm.BelgeAdi.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                          <img 
                            src={saglikForm.BelgeUrl} 
                            alt={saglikForm.BelgeAdi} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="w-7 h-7 text-rose-400" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate" title={saglikForm.BelgeAdi}>
                          {saglikForm.BelgeAdi || 'Sağlık Raporu Belgesi'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Önizlemek için görsele veya büyüteç butonuna tıklayın
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setLightboxDosya({ DosyaAdi: saglikForm.BelgeAdi || 'Sağlık Raporu', DosyaIcerigi: saglikForm.BelgeUrl })}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                        title="Tam Ekran Önizle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaglikForm(prev => ({ ...prev, BelgeUrl: '', BelgeAdi: '' }))}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 hover:text-rose-300 transition"
                        title="Belgeyi Kaldır"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSaglikModalAcik(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{duzenlenecekSaglik ? 'Güncelle' : 'Kaydet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* İSG Eğitimi Ekle / Düzenle Modalı */}
      {egitimModalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-400" />
                <span>{duzenlenecekEgitim ? 'İSG Eğitim Sertifikasını Düzenle' : 'Yeni İSG Eğitim Sertifikası Ekle'}</span>
              </h2>
              <button onClick={() => setEgitimModalAcik(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleEgitimKaydet} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Personel Seçin:</label>
                <select
                  required
                  value={egitimForm.PersonelId}
                  onChange={(e) => setEgitimForm({ ...egitimForm, PersonelId: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  {personeller.map((p) => (
                    <option key={p.PersonelId} value={p.PersonelId}>
                      {p.AdSoyad} - {p.GorevVeyaUnvan || 'Personel'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Eğitim Konusu:</label>
                <input
                  type="text"
                  required
                  value={egitimForm.EgitimKonusu}
                  onChange={(e) => setEgitimForm({ ...egitimForm, EgitimKonusu: e.target.value })}
                  placeholder="Örn: Temel İSG Eğitimi (Tehlikeli Sınıf)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Eğitici / OSGB Kurum:</label>
                  <input
                    type="text"
                    required
                    value={egitimForm.EgiticiAdSoyad}
                    onChange={(e) => setEgitimForm({ ...egitimForm, EgiticiAdSoyad: e.target.value })}
                    placeholder="Örn: A Sınıfı İSG Uzmanı"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Eğitim Tarihi:</label>
                  <input
                    type="date"
                    required
                    value={egitimForm.EgitimTarihi}
                    onChange={(e) => setEgitimForm({ ...egitimForm, EgitimTarihi: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Eğitim Süresi (Saat):</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={egitimForm.SureSaat}
                    onChange={(e) => setEgitimForm({ ...egitimForm, SureSaat: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Geçerlilik Süresi (Yıl):</label>
                  <select
                    value={egitimForm.GecerlilikYil}
                    onChange={(e) => setEgitimForm({ ...egitimForm, GecerlilikYil: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={1}>1 Yıl (Çok Tehlikeli)</option>
                    <option value={2}>2 Yıl (Tehlikeli)</option>
                    <option value={3}>3 Yıl (Az Tehlikeli)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Gelecek Yenileme Tarihi:</span>
                <span className="font-mono font-bold text-blue-400 text-sm">
                  {formatTarihTR(tarihAyEkle(egitimForm.EgitimTarihi, egitimForm.GecerlilikYil * 12))}
                </span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Açıklama / Not:</label>
                <textarea
                  rows={2}
                  value={egitimForm.Aciklama}
                  onChange={(e) => setEgitimForm({ ...egitimForm, Aciklama: e.target.value })}
                  placeholder="Sertifika no veya eğitim notları..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Eğitim Sertifikası / Katılım Belgesi Ekleme ve Önizleme */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-400 font-semibold text-xs flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                    <span>Eğitim Sertifikası / Belge (PDF / Görsel):</span>
                  </label>
                  {egitimForm.BelgeUrl && (
                    <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Belge Yüklendi
                    </span>
                  )}
                </div>

                {!egitimForm.BelgeUrl ? (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-blue-500/70 bg-slate-950/60 rounded-xl cursor-pointer transition group">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-300 group-hover:text-blue-400 transition-colors">
                      Sertifika / Katılım Belgesi Dosyası Seç
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      PDF, JPG, PNG, WEBP (Önizlemeli)
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleEgitimDosyaYukle}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        onClick={() => setLightboxDosya({ DosyaAdi: egitimForm.BelgeAdi || 'Eğitim Sertifikası', DosyaIcerigi: egitimForm.BelgeUrl })}
                        className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-700/80 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90 relative group"
                        title="Önizlemeyi Büyüt"
                      >
                        {egitimForm.BelgeUrl.startsWith('data:image') || egitimForm.BelgeAdi.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                          <img 
                            src={egitimForm.BelgeUrl} 
                            alt={egitimForm.BelgeAdi} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="w-7 h-7 text-blue-400" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate" title={egitimForm.BelgeAdi}>
                          {egitimForm.BelgeAdi || 'Eğitim Sertifikası'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Önizlemek için görsele veya büyüteç butonuna tıklayın
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setLightboxDosya({ DosyaAdi: egitimForm.BelgeAdi || 'Eğitim Sertifikası', DosyaIcerigi: egitimForm.BelgeUrl })}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                        title="Tam Ekran Önizle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEgitimForm(prev => ({ ...prev, BelgeUrl: '', BelgeAdi: '' }))}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 hover:text-rose-300 transition"
                        title="Belgeyi Kaldır"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEgitimModalAcik(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{duzenlenecekEgitim ? 'Güncelle' : 'Kaydet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION OVERLAY */}
      {customConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-center">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                <AlertTriangle className="w-8 h-8" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-white text-sm">{customConfirm.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{customConfirm.message}</p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => setCustomConfirm(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700/60 transition"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  const cb = customConfirm.onConfirm;
                  setCustomConfirm(null);
                  cb();
                }}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM ALERT OVERLAY */}
      {customAlert && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-center">
              {customAlert.type === 'success' && (
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              )}
              {customAlert.type === 'warning' && (
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              )}
              {customAlert.type === 'error' && (
                <div className="p-3 bg-red-500/10 text-rose-400 rounded-full border border-red-500/20">
                  <AlertTriangle className="w-8 h-8 text-rose-500" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-white text-sm">{customAlert.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{customAlert.message}</p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setCustomAlert(null)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700/60 transition"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BELGE & SERTİFİKA CANLI LIGHTBOX ÖNİZLEME MODALI */}
      {/* ========================================================================= */}
      {lightboxDosya && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxDosya(null)}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-sm font-bold text-white truncate">
                  {lightboxDosya.DosyaAdi}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxDosya.DosyaIcerigi}
                  download={lightboxDosya.DosyaAdi}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Dosyayı İndir"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxDosya(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title="Kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Preview */}
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-950/50 min-h-[350px]">
              {lightboxDosya.DosyaIcerigi.startsWith('data:image') || lightboxDosya.DosyaAdi.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <img
                  src={lightboxDosya.DosyaIcerigi}
                  alt={lightboxDosya.DosyaAdi}
                  referrerPolicy="no-referrer"
                  className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
                />
              ) : lightboxDosya.DosyaIcerigi.startsWith('data:application/pdf') || lightboxDosya.DosyaAdi.match(/\.pdf$/i) ? (
                <iframe
                  src={lightboxDosya.DosyaIcerigi}
                  title={lightboxDosya.DosyaAdi}
                  className="w-full h-[70vh] rounded-lg border border-slate-800 bg-white"
                />
              ) : (
                <div className="text-center py-12 space-y-4">
                  <FileText className="w-16 h-16 text-slate-600 mx-auto" />
                  <div>
                    <p className="text-sm text-slate-300 font-semibold">{lightboxDosya.DosyaAdi}</p>
                    <p className="text-xs text-slate-500 mt-1">Bu belge formatı tarayıcıda doğrudan görüntülenemiyor.</p>
                  </div>
                  <a
                    href={lightboxDosya.DosyaIcerigi}
                    download={lightboxDosya.DosyaAdi}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>Belgeyi İndir</span>
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
