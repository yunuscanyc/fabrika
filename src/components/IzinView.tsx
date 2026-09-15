import React, { useState, useEffect } from 'react';
import { IzinKaydi, Personel } from '../types';
import { hesaplaPersonelIzinOzeti } from '../utils/yillikIzinUtils';
import { 
  Calendar, 
  Plus, 
  Search, 
  Printer, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle,
  FileText,
  UserCheck,
  Trash2
} from 'lucide-react';
import { IzinYazdirModal } from './IzinYazdirModal';
import { formatTarihTR, getResmiTatil } from '../utils/dateUtils';

interface IzinViewProps {
  personeller: Personel[];
  izinler: IzinKaydi[];
  onRefresh: () => void;
}

export const IzinView: React.FC<IzinViewProps> = ({
  personeller,
  izinler,
  onRefresh,
}) => {
  const [arama, setArama] = useState('');
  const [durumFiltre, setDurumFiltre] = useState('Tümü');
  const [seciliPersonelId, setSeciliPersonelId] = useState<number | 'tumu'>('tumu');
  const [yazdirIzin, setYazdirIzin] = useState<IzinKaydi | null>(null);
  const [modalAcik, setModalAcik] = useState(false);
  const [islemSuruyor, setIslemSuruyor] = useState(false);
  const [haftalikCalismaGunu, setHaftalikCalismaGunu] = useState<number>(5);

  // Şirket çalışma ayarlarını çek (5 gün mü 6 gün mü)
  useEffect(() => {
    fetch('/api/mesai-ayarlari')
      .then(res => res.json())
      .then(data => {
        if (data && data.HaftalikCalismaGunu) {
          setHaftalikCalismaGunu(Number(data.HaftalikCalismaGunu));
        }
      })
      .catch(() => {});
  }, []);

  // Erken Dönüş Form State
  const [erkenDonusIzin, setErkenDonusIzin] = useState<IzinKaydi | null>(null);
  const [erkenDonusTarih, setErkenDonusTarih] = useState('');
  const [erkenDonusNot, setErkenDonusNot] = useState('');

  // Custom Dialog States to avoid iframe sandbox blocks
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

  // Yeni İzin Form State
  const [formPersonelId, setFormPersonelId] = useState<number>(personeller[0]?.PersonelId || 0);
  const [formIzinTuru, setFormIzinTuru] = useState('Yıllık İzin');
  const [formBaslangic, setFormBaslangic] = useState(new Date().toISOString().split('T')[0]);
  const [formBitis, setFormBitis] = useState(new Date().toISOString().split('T')[0]);
  const [formGunSayisi, setFormGunSayisi] = useState(1);
  const [formAciklama, setFormAciklama] = useState('');
  const [formDurum, setFormDurum] = useState<'Onaylandı' | 'Bekliyor' | 'Reddedildi' | 'İptal'>('Onaylandı');

  // Sekme Yönetimi: 'talepler' veya 'haklar'
  const [aktifSekme, setAktifSekme] = useState<'talepler' | 'haklar'>('talepler');

  // Detay & Yıl Cetveli İnceleme Modalı
  const [seciliCetvelPersonelId, setSeciliCetvelPersonelId] = useState<number | null>(null);

  // Gün Sayısı Hesaplama (Şirket Çalışma Düzenine Göre: 5 gün veya 6 gün)
  // İzin bitiş tarihi kapsayıcıdır (Dahildir). Ayrıca resmi tatil günleri hesaptan düşülür.
  const hesaplaGun = (bas: string, bit: string) => {
    try {
      const d1 = new Date(bas);
      const d2 = new Date(bit);
      if (d2 < d1) return 0;
      let count = 0;
      const cur = new Date(d1);
      while (cur <= d2) {
        const day = cur.getDay();
        // Eğer 5 günlük çalışma düzeni ise: Pazar (0) ve Cumartesi (6) hariç tutulur.
        // Eğer 6 günlük çalışma düzeni ise: Sadece Pazar (0) hariç tutulur (Cumartesi iş günüdür).
        const haftaTatili = haftalikCalismaGunu === 5 ? (day === 0 || day === 6) : (day === 0);
        
        // Resmi Tatil Kontrolü
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const isoStr = `${y}-${m}-${d}`;
        const tatil = getResmiTatil(isoStr);
        const isRt = tatil.isTatil && !tatil.yarimGunMu; // Yarım gün değilse tatildir

        if (!haftaTatili && !isRt) {
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      return count === 0 && d1.toDateString() === d2.toDateString() ? 1 : count;
    } catch {
      return 1;
    }
  };

  const handleTarihDegisim = (bas: string, bit: string) => {
    setFormBaslangic(bas);
    setFormBitis(bit);
    setFormGunSayisi(hesaplaGun(bas, bit));
  };

  const handleYeniEkle = () => {
    const ilk = personeller.find(p => p.DurumAktifMi)?.PersonelId || 1;
    setFormPersonelId(ilk);
    setFormIzinTuru('Yıllık İzin');
    const today = new Date().toISOString().split('T')[0];
    setFormBaslangic(today);
    setFormBitis(today);
    setFormGunSayisi(1);
    setFormAciklama('');
    setFormDurum('Onaylandı');
    setModalAcik(true);
  };

  const handleKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIslemSuruyor(true);
    try {
      const res = await fetch('/api/izinler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          PersonelId: formPersonelId,
          IzinTuru: formIzinTuru,
          BaslangicTarihi: formBaslangic,
          BitisTarihi: formBitis,
          IsGunuSayisi: formGunSayisi,
          Durum: formDurum,
          Aciklama: formAciklama
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'İzin kaydedilemedi.');
      }

      setModalAcik(false);
      onRefresh();
      setCustomAlert({
        title: 'Başarılı',
        message: 'İzin kaydı başarıyla oluşturuldu ve onaylandı.',
        type: 'success'
      });
    } catch (err: any) {
      setCustomAlert({
        title: 'Kayıt Hatası',
        message: err.message,
        type: 'error'
      });
    } finally {
      setIslemSuruyor(false);
    }
  };

  const handleErkenDonusTetikle = (iz: IzinKaydi) => {
    setErkenDonusIzin(iz);
    setErkenDonusTarih(new Date().toISOString().split('T')[0]);
    setErkenDonusNot('');
  };

  const handleErkenDonusKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!erkenDonusIzin) return;

    if (erkenDonusTarih < erkenDonusIzin.BaslangicTarihi) {
      setCustomAlert({
        title: 'Geçersiz Tarih',
        message: 'Erken dönüş tarihi, izin başlangıç tarihinden önce olamaz!',
        type: 'error'
      });
      return;
    }

    if (erkenDonusTarih > erkenDonusIzin.BitisTarihi) {
      setCustomAlert({
        title: 'Geçersiz Tarih',
        message: 'Erken dönüş tarihi, izin orijinal bitiş tarihinden sonra olamaz!',
        type: 'error'
      });
      return;
    }

    setIslemSuruyor(true);
    try {
      let guncelIzin = { ...erkenDonusIzin };

      if (erkenDonusTarih === erkenDonusIzin.BaslangicTarihi) {
        // İzin başlamadan iptal edilmiş gibi
        guncelIzin.BitisTarihi = erkenDonusIzin.BaslangicTarihi;
        guncelIzin.IsGunuSayisi = 0;
        guncelIzin.Durum = 'İptal';
        guncelIzin.Aciklama = `[Erken Dönüş] İşe dönüş tarihi izin başlangıcına denk geldiği için izin kullanılmadan iptal edildi. Dönüş Tarihi: ${erkenDonusTarih}. ${erkenDonusNot ? '\nNot: ' + erkenDonusNot : ''}`;
      } else {
        // İzin erken sonlandırılıyor. Bitiş tarihi, dönüşten önceki güne çekiliyor.
        const d = new Date(erkenDonusTarih);
        d.setDate(d.getDate() - 1);
        const yeniBitis = d.toISOString().split('T')[0];
        const yeniGunSayisi = hesaplaGun(erkenDonusIzin.BaslangicTarihi, yeniBitis);

        guncelIzin.BitisTarihi = yeniBitis;
        guncelIzin.IsGunuSayisi = yeniGunSayisi;
        guncelIzin.Aciklama = `[Erken Dönüş] Personel ${erkenDonusTarih} tarihinde işbaşı yaptı. Orijinal Bitiş: ${erkenDonusIzin.BitisTarihi}. ${erkenDonusNot ? '\nNot: ' + erkenDonusNot : ''}`;
      }

      const res = await fetch(`/api/izinler/${erkenDonusIzin.IzinId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guncelIzin)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erken dönüş işlemi kaydedilemedi.');
      }

      setErkenDonusIzin(null);
      setCustomAlert({
        title: 'Erken Dönüş Bildirildi',
        message: `${getPersonelAdi(erkenDonusIzin.PersonelId)} isimli personelin erken dönüşü kaydedildi. Kullanılmayan kalan günler izin kotasına iade edildi ve personel bugün itibarıyla aktif/izinsiz statüsüne getirildi.`,
        type: 'success'
      });
      onRefresh();
    } catch (err: any) {
      setCustomAlert({
        title: 'İşlem Hatası',
        message: err.message,
        type: 'error'
      });
    } finally {
      setIslemSuruyor(false);
    }
  };

  const handleDurumGuncelle = async (iz: IzinKaydi, yeniDurum: string) => {
    if (yeniDurum === 'Onaylandı' && iz.IzinTuru === 'Yıllık İzin') {
      const p = personeller.find(x => x.PersonelId === iz.PersonelId);
      if (p) {
        const ozet = hesaplaPersonelIzinOzeti(p, izinler);
        if (iz.IsGunuSayisi > ozet.kalanYillikIzinGun) {
          setCustomAlert({
            title: 'Yetersiz İzin Limiti',
            message: `Personelin kalan yıllık izin hakkı (${ozet.kalanYillikIzinGun} gün) yetersizdir! Talep edilen: ${iz.IsGunuSayisi} gün. İzin onaylanamaz.`,
            type: 'error'
          });
          return;
        }
      }
    }

    setIslemSuruyor(true);
    try {
      const res = await fetch(`/api/izinler/${iz.IzinId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...iz, Durum: yeniDurum })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'İzin durumu güncellenemedi.');
      }

      setCustomAlert({
        title: 'Durum Güncellendi',
        message: `İzin talebi başarıyla "${yeniDurum}" statüsüne getirildi.`,
        type: 'success'
      });
      onRefresh();
    } catch (err: any) {
      setCustomAlert({
        title: 'Güncelleme Hatası',
        message: err.message,
        type: 'error'
      });
    } finally {
      setIslemSuruyor(false);
    }
  };

  const handleIzinSil = (iz: IzinKaydi) => {
    setCustomConfirm({
      title: 'İzin Talebini Sil',
      message: 'Bu izin talebi kalıcı olarak silinecektir. Onaylıyor musunuz?',
      onConfirm: async () => {
        setIslemSuruyor(true);
        try {
          const res = await fetch(`/api/izinler/${iz.IzinId}`, {
            method: 'DELETE'
          });

          if (!res.ok) {
            throw new Error('İzin silinemedi.');
          }

          setCustomAlert({
            title: 'Silindi',
            message: 'İzin talebi başarıyla silindi.',
            type: 'success'
          });
          onRefresh();
        } catch (err: any) {
          setCustomAlert({
            title: 'Hata',
            message: err.message,
            type: 'error'
          });
        } finally {
          setIslemSuruyor(false);
        }
      }
    });
  };

  const getPersonelAdi = (id: number) => {
    const p = personeller.find(x => x.PersonelId === id);
    return p ? p.AdSoyad : `Personel #${id}`;
  };

  const filtrelenmis = izinler.filter(i => {
    const pAd = getPersonelAdi(i.PersonelId).toLowerCase();
    const matchArama = pAd.includes(arama.toLowerCase()) || i.IzinTuru.toLowerCase().includes(arama.toLowerCase());
    const matchDurum = durumFiltre === 'Tümü' || i.Durum === durumFiltre;
    const matchPersonel = seciliPersonelId === 'tumu' || i.PersonelId === seciliPersonelId;
    return matchArama && matchDurum && matchPersonel;
  });

  const seciliPersonelKart = personeller.find(p => p.PersonelId === formPersonelId);
  const izinOzeti = seciliPersonelKart ? hesaplaPersonelIzinOzeti(seciliPersonelKart, izinler) : null;
  const limitAsildi = formIzinTuru === 'Yıllık İzin' && izinOzeti && formGunSayisi > izinOzeti.kalanYillikIzinGun;

  return (
    <div className="space-y-6">
      {/* Üst Başlık & İstatistikler */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-wide">İzin & Tatil Yönetimi</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            4857 Sayılı Kanuna uygun iş günü hesabı, yıllık izin takibi ve resmi izin başvuru formları
          </p>
        </div>

        <button
          onClick={handleYeniEkle}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          Yeni İzin Talebi
        </button>
      </div>

      {/* Sekme Seçim Çubuğu */}
      <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-fit">
        <button
          onClick={() => setAktifSekme('talepler')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            aktifSekme === 'talepler' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          İzin Talepleri ({izinler.length})
        </button>
        <button
          onClick={() => setAktifSekme('haklar')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            aktifSekme === 'haklar' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          İzin Hakları &amp; Bakiye Tablosu (4857 Kanun)
        </button>
      </div>

      {aktifSekme === 'talepler' ? (
        <>
          {/* Filtreleme Çubuğu */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Personel veya izin türü ara..."
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Çalışan:</span>
              <select
                value={seciliPersonelId}
                onChange={(e) => setSeciliPersonelId(e.target.value === 'tumu' ? 'tumu' : Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none"
              >
                <option value="tumu">Tüm Çalışanlar</option>
                {personeller.map(p => (
                  <option key={p.PersonelId} value={p.PersonelId}>{p.AdSoyad}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Durum:</span>
              <select
                value={durumFiltre}
                onChange={(e) => setDurumFiltre(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none"
              >
                <option value="Tümü">Tüm Durumlar</option>
                <option value="Onaylandı">Onaylandı</option>
                <option value="Bekliyor">Bekliyor</option>
                <option value="Reddedildi">Reddedildi</option>
                <option value="İptal">İptal</option>
              </select>
            </div>
          </div>

          {/* İzin Listesi Tablosu */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Çalışan</th>
                    <th className="py-3 px-4">İzin Türü</th>
                    <th className="py-3 px-4">Tarih Aralığı</th>
                    <th className="py-3 px-4 text-center">İş Günü</th>
                    <th className="py-3 px-4 text-center">Durum</th>
                    <th className="py-3 px-4">Açıklama</th>
                    <th className="py-3 px-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtrelenmis.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">
                        Kayıtlı izin talebi bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    filtrelenmis.map((iz) => (
                      <tr key={iz.IzinId} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-semibold text-white">
                          {getPersonelAdi(iz.PersonelId)}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-medium text-emerald-400">{iz.IzinTuru}</span>
                        </td>

                        <td className="py-3 px-4 text-xs font-mono text-slate-300">
                          {formatTarihTR(iz.BaslangicTarihi)} → {formatTarihTR(iz.BitisTarihi)}
                        </td>

                        <td className="py-3 px-4 text-center font-bold text-white">
                          {iz.IsGunuSayisi} gün
                        </td>

                        <td className="py-3 px-4 text-center">
                          {iz.Durum === 'Onaylandı' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Onaylandı
                            </span>
                          )}
                          {iz.Durum === 'Bekliyor' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-950/80 text-amber-400 border border-amber-800">
                              <Clock className="w-3 h-3" /> Bekliyor
                            </span>
                          )}
                          {iz.Durum === 'Reddedildi' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-950/80 text-rose-400 border border-rose-800">
                              <XCircle className="w-3 h-3" /> Reddedildi
                            </span>
                          )}
                          {iz.Durum === 'İptal' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                              İptal
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs text-slate-400 max-w-xs truncate">
                          {iz.Aciklama || '-'}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {iz.Durum === 'Bekliyor' && (
                              <>
                                <button
                                  onClick={() => handleDurumGuncelle(iz, 'Onaylandı')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-800 transition shadow-sm"
                                  title="İzni Onayla"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Onayla
                                </button>
                                <button
                                  onClick={() => handleDurumGuncelle(iz, 'Reddedildi')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-400 text-xs font-bold rounded-lg border border-rose-800 transition shadow-sm"
                                  title="İzni Reddet"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Reddet
                                </button>
                              </>
                            )}
                            {iz.Durum === 'Onaylandı' && !iz.SilindiMi && (
                              <button
                                onClick={() => handleErkenDonusTetikle(iz)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-800/60 transition"
                                title="Personelin Erken Döndüğünü Bildir ve Kalan İznini İade Et"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Erken Dönüş
                              </button>
                            )}
                            <button
                              onClick={() => setYazdirIzin(iz)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
                              title="İzin Başvuru Formunu Yazdır"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Form
                            </button>
                            {!iz.SilindiMi && (
                              <button
                                onClick={() => handleIzinSil(iz)}
                                className="inline-flex items-center justify-center p-1.5 bg-slate-800/60 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700/60 hover:border-rose-900/60 transition"
                                title="İzin Talebini Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* İzin Hakları & Bakiye Tablosu (4857 İş Kanunu) */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white">4857 Sayılı Kanun Yıllık İzin Hakları &amp; Bakiye Cetveli</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kıdem süreleri (1-5 yıl: 14 gün, 5-15 yıl: 20 gün, 15+ yıl: 26 gün) ve yaş kuralları (≤18 veya ≥50 yaş en az 20 gün) hesaplama özeti.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Çalışan &amp; Departman</th>
                  <th className="py-3 px-3">İşe Giriş</th>
                  <th className="py-3 px-3 text-center">Kıdem</th>
                  <th className="py-3 px-3 text-center">Yaş / Kural</th>
                  <th className="py-3 px-3 text-center">Kanuni Hak</th>
                  <th className="py-3 px-3 text-center">Devir</th>
                  <th className="py-3 px-3 text-center">Toplam Hak</th>
                  <th className="py-3 px-3 text-center">Kullanılan</th>
                  <th className="py-3 px-3 text-center">Kalan Bakiye</th>
                  <th className="py-3 px-3 text-right">Detay / Cetvel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {personeller.filter(p => p.DurumAktifMi).map(p => {
                  const ozet = hesaplaPersonelIzinOzeti(p, izinler);
                  return (
                    <tr key={p.PersonelId} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{p.AdSoyad}</div>
                        <div className="text-[11px] text-slate-400">{p.Departman || 'Genel'} • {p.Gorev || '-'}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">{formatTarihTR(p.IseGirisTarihi)}</td>
                      <td className="py-3 px-3 text-center font-medium text-slate-200">
                        {ozet.kidemYil} Yıl {ozet.kidemAy} Ay
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ozet.yasKuralinaTabiMi ? 'bg-amber-950/80 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'}`}>
                          {ozet.yas} Yaş {ozet.yasKuralinaTabiMi ? '(Min 20 Gün)' : ''}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-200">{ozet.kanuniHakEdilenGun} Gün</td>
                      <td className="py-3 px-3 text-center font-medium text-indigo-300">{ozet.devredenIzinGunu} Gün</td>
                      <td className="py-3 px-3 text-center font-bold text-white">{ozet.toplamHakEdilenGun} Gün</td>
                      <td className="py-3 px-3 text-center font-bold text-rose-400">{ozet.kullanilanYillikIzinGun} Gün</td>
                      <td className="py-3 px-3 text-center font-bold">
                        <span className={`px-2.5 py-1 rounded-full text-xs ${ozet.kalanYillikIzinGun < 0 ? 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                          {ozet.kalanYillikIzinGun} Gün
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSeciliCetvelPersonelId(p.PersonelId)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-bold transition"
                        >
                          Yıl Cetveli İncele
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Yıl Hak Ediş Detay Cetveli Modalı */}
      {seciliCetvelPersonelId !== null && (() => {
        const p = personeller.find(x => x.PersonelId === seciliCetvelPersonelId);
        const ozet = p ? hesaplaPersonelIzinOzeti(p, izinler) : null;
        if (!p || !ozet) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-base font-bold text-white">{p.AdSoyad} - Yıllık İzin Hak Ediş Cetveli</h3>
                  <p className="text-xs text-slate-400">İşe Giriş: {formatTarihTR(p.IseGirisTarihi)} • Toplam Kıdem: {ozet.kidemYil} Yıl {ozet.kidemAy} Ay</p>
                </div>
                <button onClick={() => setSeciliCetvelPersonelId(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-400">Kanuni Hak:</span>
                    <p className="text-lg font-bold text-white">{ozet.kanuniHakEdilenGun} Gün</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Devreden İzin:</span>
                    <p className="text-lg font-bold text-indigo-300">{ozet.devredenIzinGunu} Gün</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Kullanılan İzin:</span>
                    <p className="text-lg font-bold text-rose-400">{ozet.kullanilanYillikIzinGun} Gün</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Kalan Bakiye:</span>
                    <p className="text-lg font-bold text-emerald-400">{ozet.kalanYillikIzinGun} Gün</p>
                  </div>
                </div>

                <h4 className="font-bold text-slate-200 pt-2">Yıl Yıl Hak Ediş Dökümü (4857 Madde 53):</h4>
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 text-center">Çalışma Yılı</th>
                        <th className="py-2.5 px-3">Dönem Aralığı</th>
                        <th className="py-2.5 px-3 text-center">Hak Ediş Tarihi</th>
                        <th className="py-2.5 px-3 text-center">Yaş</th>
                        <th className="py-2.5 px-3 text-center">Kural / Not</th>
                        <th className="py-2.5 px-3 text-center">Kazanılan İzin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {ozet.yilDetaylari.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            Çalışanın henüz 1 tam yılı dolmamıştır (1 yıldan az kıdem).
                          </td>
                        </tr>
                      ) : (
                        ozet.yilDetaylari.map((detay) => (
                          <tr key={detay.yilNo} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 text-center font-bold text-white">{detay.yilNo}. Yıl</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{formatTarihTR(detay.baslangicTarihi)} → {formatTarihTR(detay.bitisTarihi)}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-300">{formatTarihTR(detay.hakedisTarihi)}</td>
                            <td className="py-2.5 px-3 text-center">{detay.yas}</td>
                            <td className="py-2.5 px-3 text-center">
                              {detay.yasKuraliUygulandiMi ? (
                                <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded font-bold text-[10px]">
                                  Yaş Kuralı (Min 20 Gün)
                                </span>
                              ) : (
                                <span className="text-slate-400">Standart Kıdem</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-emerald-400">{detay.kazanilanGun} Gün</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
                <button
                  onClick={() => setSeciliCetvelPersonelId(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs transition"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Yeni İzin Modalı */}
      {modalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Yeni İzin Talebi
              </h2>
              <button onClick={() => setModalAcik(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleKaydet} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Çalışan Personel *</label>
                <select
                  value={formPersonelId}
                  onChange={(e) => setFormPersonelId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {personeller.filter(p => p.DurumAktifMi).map(p => (
                    <option key={p.PersonelId} value={p.PersonelId}>{p.AdSoyad} ({p.Departman || 'Genel'})</option>
                  ))}
                </select>

                {izinOzeti && (
                  <div className="mt-2.5 p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Toplam Hak (Devir Dahil):</span>
                      <span className="font-bold text-slate-200">{izinOzeti.toplamHakEdilenGun} Gün</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Kullanılan Yıllık İzin:</span>
                      <span className="font-bold text-rose-400">{izinOzeti.kullanilanYillikIzinGun} Gün</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-850 pt-1.5 font-semibold">
                      <span className="text-emerald-400">Kalan Kullanılabilir Yıllık İzin:</span>
                      <span className={`font-bold ${izinOzeti.kalanYillikIzinGun < 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
                        {izinOzeti.kalanYillikIzinGun} Gün
                      </span>
                    </div>

                    {limitAsildi && (
                      <div className="flex items-start gap-1.5 p-2 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded mt-2 text-[11px] leading-relaxed">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                        <div>
                          Girilen talep süresi (<strong className="font-bold text-white">{formGunSayisi} gün</strong>), çalışanın kalan yıllık izin hakkını (<strong className="font-bold text-white">{izinOzeti.kalanYillikIzinGun} Gün</strong>) aşmaktadır!
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">İzin Türü *</label>
                <select
                  value={formIzinTuru}
                  onChange={(e) => setFormIzinTuru(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Yıllık İzin">Yıllık Ücretli İzin</option>
                  <option value="Ücretsiz İzin">Ücretsiz İzin</option>
                  <option value="Mazeret İzni">Mazeret İzni</option>
                  <option value="Hastalık / Rapor">Hastalık / Rapor</option>
                  <option value="Evlilik / Doğum / Vefat">Evlilik / Doğum / Vefat</option>
                  <option value="Yol İzni">Yol İzni</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    required
                    value={formBaslangic}
                    onChange={(e) => handleTarihDegisim(e.target.value, formBitis)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Bitiş Tarihi</label>
                  <input
                    type="date"
                    required
                    value={formBitis}
                    onChange={(e) => handleTarihDegisim(formBaslangic, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Hesaplanan İş Günü</label>
                  <div className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg font-bold text-emerald-400 flex items-center justify-between">
                    <span>{formGunSayisi} Gün</span>
                    <span className="text-[10px] font-normal text-slate-400">({haftalikCalismaGunu} Günlük Sistem)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Durum</label>
                  <select
                    value={formDurum}
                    onChange={(e: any) => setFormDurum(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Onaylandı">Onaylandı</option>
                    <option value="Bekliyor">Bekliyor</option>
                    <option value="Reddedildi">Reddedildi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Açıklama / İzin Nedeni</label>
                <textarea
                  rows={2}
                  value={formAciklama}
                  onChange={(e) => setFormAciklama(e.target.value)}
                  placeholder="İsteğe bağlı detay not..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAcik(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={islemSuruyor}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow transition disabled:opacity-50"
                >
                  {islemSuruyor ? 'Kaydediliyor...' : 'İzni Onayla & Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Yazdırma Modalı */}
      <IzinYazdirModal
        isOpen={Boolean(yazdirIzin)}
        onClose={() => setYazdirIzin(null)}
        izin={yazdirIzin}
        personel={yazdirIzin ? personeller.find(p => p.PersonelId === yazdirIzin.PersonelId) : null}
      />

      {/* ERKEN DÖNÜŞ BİLDİRİMİ MODAL */}
      {erkenDonusIzin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                Personel Erken Dönüş Bildirimi
              </h2>
              <button onClick={() => setErkenDonusIzin(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleErkenDonusKaydet} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Personel:</span>
                  <span className="text-white font-bold">{getPersonelAdi(erkenDonusIzin.PersonelId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">İzin Türü:</span>
                  <span className="text-emerald-400 font-bold">{erkenDonusIzin.IzinTuru}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Orijinal İzin Dönemi:</span>
                  <span className="text-slate-300 font-mono font-bold">{formatTarihTR(erkenDonusIzin.BaslangicTarihi)} ~ {formatTarihTR(erkenDonusIzin.BitisTarihi)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Orijinal Gün Sayısı:</span>
                  <span className="text-slate-300 font-bold">{erkenDonusIzin.IsGunuSayisi} İş Günü</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-400">Göreve Geri Dönüş Tarihi *</label>
                <input
                  type="date"
                  required
                  min={erkenDonusIzin.BaslangicTarihi}
                  max={erkenDonusIzin.BitisTarihi}
                  value={erkenDonusTarih}
                  onChange={(e) => setErkenDonusTarih(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 italic mt-1 leading-relaxed">
                  * Personel bu tarihte işe geri dönmüş kabul edilir. İzin bitiş tarihi otomatik olarak dönüş tarihinden 1 gün öncesine güncellenecektir.
                </p>
              </div>

              {erkenDonusTarih && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-lg text-[11px] leading-relaxed space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Güncellenmiş Yeni İzin Süresi:</span>
                    <strong className="text-emerald-400">
                      {erkenDonusTarih === erkenDonusIzin.BaslangicTarihi 
                        ? '0 Gün (İzin İptal Edilecek)' 
                        : `${hesaplaGun(erkenDonusIzin.BaslangicTarihi, new Date(new Date(erkenDonusTarih).setDate(new Date(erkenDonusTarih).getDate() - 1)).toISOString().split('T')[0])} Gün`}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Kalan İzin İade Miktarı:</span>
                    <strong className="text-amber-400">
                      {erkenDonusTarih === erkenDonusIzin.BaslangicTarihi 
                        ? `${erkenDonusIzin.IsGunuSayisi} Gün` 
                        : `${erkenDonusIzin.IsGunuSayisi - hesaplaGun(erkenDonusIzin.BaslangicTarihi, new Date(new Date(erkenDonusTarih).setDate(new Date(erkenDonusTarih).getDate() - 1)).toISOString().split('T')[0])} Gün`}
                    </strong>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-400">Erken Dönüş Nedeni / Açıklama</label>
                <textarea
                  rows={2}
                  value={erkenDonusNot}
                  onChange={(e) => setErkenDonusNot(e.target.value)}
                  placeholder="Gerekçe veya açıklama giriniz..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setErkenDonusIzin(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={islemSuruyor}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {islemSuruyor ? 'Güncelleniyor...' : 'Geri Dönüşü Kaydet'}
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
                <AlertCircle className="w-8 h-8" />
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
                Evet, Onayla
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
                  <AlertCircle className="w-8 h-8" />
                </div>
              )}
              {customAlert.type === 'error' && (
                <div className="p-3 bg-red-500/10 text-rose-400 rounded-full border border-red-500/20">
                  <XCircle className="w-8 h-8" />
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
    </div>
  );
};
