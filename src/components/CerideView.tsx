import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  Printer, 
  Download, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Truck, 
  Wrench, 
  Cog, 
  Users, 
  Layers, 
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Camera,
  Image as ImageIcon,
  X,
  Eye,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  FileImage
} from 'lucide-react';
import { CerideKaydi, CerideFotograf, Proje } from '../types';
import { 
  formatTarihTR, 
  getTurkiyeSaatStr, 
  getTurkiyeTarihStr, 
  getTurkiyeTamZamanStr 
} from '../utils/dateUtils';

interface CerideViewProps {
  projeler: Proje[];
  currentUserName: string;
  userRole?: 'admin' | 'ustabasi';
  onNavigateTab?: (tab: any) => void;
  onSelectProje?: (p: Proje) => void;
}

// Görseli optimize ederek küçültme (Mobil kameraların 10MB boyutundaki fotoğraflarını tarayıcıda sıkıştırır)
async function compressImageFile(file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.82): Promise<{ dataUrl: string; sizeStr: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          const sizeInKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
          const sizeStr = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;
          resolve({ dataUrl: compressedDataUrl, sizeStr });
          return;
        }
        // Fallback to original
        const origSizeKb = Math.round(file.size / 1024);
        resolve({ dataUrl: e.target?.result as string, sizeStr: `${origSizeKb} KB` });
      };
      img.onerror = () => {
        const origSizeKb = Math.round(file.size / 1024);
        resolve({ dataUrl: e.target?.result as string, sizeStr: `${origSizeKb} KB` });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const CerideView: React.FC<CerideViewProps> = ({
  projeler,
  currentUserName,
  userRole = 'admin',
  onNavigateTab,
  onSelectProje
}) => {
  const [cerideList, setCerideList] = useState<CerideKaydi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtreler (Varsayılan: Sadece Bugün - Boşuna veri akışı olmasın)
  const [searchTerm, setSearchTerm] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('Tümü');
  const [projeFilter, setProjeFilter] = useState('Tümü');
  const [tarihFilter, setTarihFilter] = useState<'bugun' | 'dun' | 'hafta' | 'ay' | 'tumu'>('bugun');

  // Modal Durumları
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CerideKaydi | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Form State
  const [formOlay, setFormOlay] = useState('');
  const [formKategori, setFormKategori] = useState<CerideKaydi['Kategori']>('Genel');
  const [formProjeId, setFormProjeId] = useState<string>('');
  const [formTarih, setFormTarih] = useState(getTurkiyeTarihStr());
  const [formSaat, setFormSaat] = useState(getTurkiyeSaatStr()); // 24 saat formatında Türkiye Saati
  const [formDetay, setFormDetay] = useState('');
  const [formIsleyenKisi, setFormIsleyenKisi] = useState(currentUserName);
  const [formFotograflar, setFormFotograflar] = useState<CerideFotograf[]>([]);

  // Fotoğraf Lightbox / Tam Ekran Görüntüleyici
  const [lightboxData, setLightboxData] = useState<{
    images: CerideFotograf[];
    index: number;
    title: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ceride verilerini çek (Varsayılan: Sadece Bugün - Boşuna veri akışı olmasın)
  const fetchCeride = async (aralik: string = tarihFilter) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/ceride?aralik=${aralik}`);
      if (res.ok) {
        const data = await res.json();
        setCerideList(Array.isArray(data) ? data : []);
      } else {
        throw new Error('Ceride verileri alınamadı.');
      }
    } catch (err: any) {
      console.error('Ceride fetch error:', err);
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // İlk açılışta boşuna veri akışı olmaması için varsayılan olarak SADECE BUGÜN yüklenir
    fetchCeride('bugun');
  }, []);

  const handleFilterChange = (yeniAralik: 'bugun' | 'dun' | 'hafta' | 'ay' | 'tumu') => {
    setTarihFilter(yeniAralik);
    fetchCeride(yeniAralik);
  };

  // Formu Sıfırla / Aç (Yeni Kayıt)
  const handleOpenNewModal = () => {
    setEditingItem(null);
    setFormOlay('');
    setFormKategori('Genel');
    setFormProjeId('');
    setFormTarih(getTurkiyeTarihStr());
    setFormSaat(getTurkiyeSaatStr()); // 24 saat Türkiye saati
    setFormDetay('');
    setFormIsleyenKisi(currentUserName || 'Yönetici');
    setFormFotograflar([]);
    setModalOpen(true);
  };

  // Düzenleme Modalı Aç
  const handleOpenEditModal = (item: CerideKaydi) => {
    setEditingItem(item);
    setFormOlay(item.Olay);
    setFormKategori(item.Kategori || 'Genel');
    setFormProjeId(item.ProjeId ? String(item.ProjeId) : '');
    setFormTarih(item.Tarih || getTurkiyeTarihStr());
    setFormSaat(item.Saat || getTurkiyeSaatStr());
    setFormDetay(item.Detay || '');
    setFormIsleyenKisi(item.IsleyenKisi || currentUserName);
    setFormFotograflar(Array.isArray(item.Fotograflar) ? [...item.Fotograflar] : []);
    setModalOpen(true);
  };

  // Şu anki Türkiye saatini forma aktar
  const handleSetCurrentTurkeyTime = () => {
    setFormTarih(getTurkiyeTarihStr());
    setFormSaat(getTurkiyeSaatStr());
  };

  // Fotoğraf Seçimi & Sıkıştırma
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const newPhotos: CerideFotograf[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const { dataUrl, sizeStr } = await compressImageFile(file);
        newPhotos.push({
          Id: `img_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          DosyaAdi: file.name,
          DosyaBoyutu: sizeStr,
          YuklemeTarihi: getTurkiyeTamZamanStr(),
          DosyaIcerigi: dataUrl
        });
      }
      setFormFotograflar(prev => [...prev, ...newPhotos]);
    } catch (err) {
      console.error('Fotoğraf yükleme hatası:', err);
      alert('Fotoğraflar işlenirken bir sorun oluştu.');
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFormFotograflar(prev => prev.filter((_, i) => i !== index));
  };

  // Kaydet / Güncelle
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOlay.trim()) {
      alert('Lütfen olay açıklamasını yazınız.');
      return;
    }

    // 24 saat format kontrolü (HH:mm)
    const timeMatch = formSaat.trim().match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/);
    if (!timeMatch) {
      alert('Lütfen saati 24 saat formatında (HH:mm, örn: 14:30) giriniz.');
      return;
    }

    try {
      setSaving(true);
      const seciliProje = formProjeId ? projeler.find(p => String(p.ProjeId) === formProjeId) : null;
      const projeAdi = seciliProje ? seciliProje.ProjeAdi : (formProjeId ? '' : 'Genel / Projesiz');

      const payload = {
        Olay: formOlay.trim(),
        Kategori: formKategori,
        Tarih: formTarih,
        Saat: formSaat.trim(),
        ProjeId: formProjeId ? Number(formProjeId) : null,
        ProjeAdi: projeAdi,
        IsleyenKisi: formIsleyenKisi.trim() || currentUserName,
        Detay: formDetay.trim(),
        Fotograflar: formFotograflar,
        FotoSayisi: formFotograflar.length,
        OtomatikMi: editingItem ? editingItem.OtomatikMi : false
      };

      let res;
      if (editingItem) {
        res = await fetch(`/api/ceride/${editingItem.Id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-name': currentUserName
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/ceride', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-name': currentUserName
          },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Kayıt işlemi başarısız.');
      }

      setModalOpen(false);
      fetchCeride(tarihFilter);
    } catch (err: any) {
      alert('Hata: ' + (err.message || 'İşlem gerçekleştirilemedi.'));
    } finally {
      setSaving(false);
    }
  };

  // Sil
  const handleDelete = async (id: number, olay: string) => {
    if (!confirm(`"${olay}" başlıklı ceride kaydını silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/ceride/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-name': currentUserName }
      });
      if (res.ok) {
        setCerideList(prev => prev.filter(c => c.Id !== id));
      } else {
        alert('Kayıt silinemedi.');
      }
    } catch (err) {
      alert('Silme sırasında hata oluştu.');
    }
  };

  // Kategori İkon ve Renk Seçici
  const getKategoriBadge = (kategori: string) => {
    switch (kategori) {
      case 'Proje':
        return {
          icon: Layers,
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300',
          dot: 'bg-indigo-500'
        };
      case 'Sipariş':
        return {
          icon: Package,
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300',
          dot: 'bg-emerald-500'
        };
      case 'Makine':
        return {
          icon: Cog,
          bg: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300',
          dot: 'bg-purple-500'
        };
      case 'Araç':
        return {
          icon: Truck,
          bg: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300',
          dot: 'bg-amber-500'
        };
      case 'Personel / İK':
        return {
          icon: Users,
          bg: 'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/40 dark:border-cyan-800 dark:text-cyan-300',
          dot: 'bg-cyan-500'
        };
      case 'Şantiye':
        return {
          icon: Building2,
          bg: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300',
          dot: 'bg-orange-500'
        };
      default:
        return {
          icon: BookOpen,
          bg: 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300',
          dot: 'bg-slate-500'
        };
    }
  };

  // Filtreleme Mantığı
  const filteredList = useMemo(() => {
    const today = getTurkiyeTarihStr();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getTurkiyeTarihStr(yesterdayDate);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysStr = getTurkiyeTarihStr(sevenDaysAgo);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysStr = getTurkiyeTarihStr(thirtyDaysAgo);

    return cerideList.filter(item => {
      // Metin arama
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchOlay = (item.Olay || '').toLowerCase().includes(term);
        const matchDetay = (item.Detay || '').toLowerCase().includes(term);
        const matchKisi = (item.IsleyenKisi || '').toLowerCase().includes(term);
        const matchProje = (item.ProjeAdi || '').toLowerCase().includes(term);
        if (!matchOlay && !matchDetay && !matchKisi && !matchProje) return false;
      }

      // Kategori
      if (kategoriFilter !== 'Tümü' && item.Kategori !== kategoriFilter) {
        return false;
      }

      // Proje
      if (projeFilter === 'projesiz') {
        if (item.ProjeId) return false;
      } else if (projeFilter === 'projeli') {
        if (!item.ProjeId) return false;
      } else if (projeFilter !== 'Tümü') {
        if (String(item.ProjeId) !== projeFilter) return false;
      }

      // Tarih
      if (tarihFilter === 'bugun') {
        if (item.Tarih !== today) return false;
      } else if (tarihFilter === 'dun') {
        if (item.Tarih !== yesterday) return false;
      } else if (tarihFilter === 'hafta') {
        if (item.Tarih < sevenDaysStr) return false;
      } else if (tarihFilter === 'ay') {
        if (item.Tarih < thirtyDaysStr) return false;
      }

      return true;
    });
  }, [cerideList, searchTerm, kategoriFilter, projeFilter, tarihFilter]);

  // Gruplandırılmış Liste (Tarihe göre)
  const groupedByDate = useMemo(() => {
    const groups: { [date: string]: CerideKaydi[] } = {};
    filteredList.forEach(item => {
      const d = item.Tarih || 'Tarihsiz';
      if (!groups[d]) groups[d] = [];
      groups[d].push(item);
    });
    return groups;
  }, [filteredList]);

  // Excel / CSV İndir
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      alert('Dışa aktarılacak ceride kaydı bulunamadı.');
      return;
    }

    const headers = ['ID', 'Tarih', 'Saat (24s TR)', 'Olay', 'Kategori', 'Proje', 'İşleyen Kişi', 'Foto Sayısı', 'İşlenme Tarihi', 'Detay'];
    const rows = filteredList.map(item => [
      item.Id,
      item.Tarih,
      item.Saat,
      `"${(item.Olay || '').replace(/"/g, '""')}"`,
      `"${item.Kategori || ''}"`,
      `"${(item.ProjeAdi || 'Genel / Projesiz').replace(/"/g, '""')}"`,
      `"${(item.IsleyenKisi || '').replace(/"/g, '""')}"`,
      item.Fotograflar ? item.Fotograflar.length : (item.FotoSayisi || 0),
      `"${item.IslenmeTarihi || ''}"`,
      `"${(item.Detay || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ceride_Raporu_${getTurkiyeTarihStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Yazdır
  const handlePrint = () => {
    window.print();
  };

  // İstatistikler
  const todayStr = getTurkiyeTarihStr();
  const bugunSayisi = cerideList.filter(c => c.Tarih === todayStr).length;
  const projeliSayisi = cerideList.filter(c => c.ProjeId).length;
  const fotoluSayisi = cerideList.filter(c => (c.Fotograflar && c.Fotograflar.length > 0) || (c.FotoSayisi && c.FotoSayisi > 0)).length;

  return (
    <div className="space-y-6">
      {/* Üst Başlık & İstatistikler */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Şantiye &amp; İşletme Ceridesi
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Günlük vukuat, şantiye fotoğrafları, malzeme teslimatları ve makine hareketleri</span>
                  <span className="inline-flex items-center gap-1 text-[11px] bg-slate-800 px-2 py-0.5 rounded-md text-amber-300 font-mono">
                    <Clock className="w-3 h-3 text-amber-400" />
                    24 Saat Formatı (TR: GMT+3)
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-md font-medium" title="Hızlı açılış için varsayılan olarak sadece bugünün olayları yüklenir">
                    ⚡ Hızlı Yükleme (Sadece Bugün)
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => fetchCeride(tarihFilter)}
              disabled={loading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
              title="Excel'e Aktar"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
              title="Yazdır / Rapor Al"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>Yazdır</span>
            </button>

            <button
              onClick={handleOpenNewModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-amber-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Olay / Fotoğraf Ekle</span>
            </button>
          </div>
        </div>

        {/* Hızlı Sayaç Kartları */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Toplam Kayıt</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">{cerideList.length}</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl">
            <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider block">Bugünkü Olaylar</span>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{bugunSayisi}</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl">
            <span className="text-[11px] font-medium text-indigo-400 uppercase tracking-wider block">Proje Olayları</span>
            <div className="text-xl sm:text-2xl font-black text-indigo-400 mt-1">{projeliSayisi}</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl">
            <span className="text-[11px] font-medium text-rose-400 uppercase tracking-wider block">Fotoğraflı Olaylar</span>
            <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1 flex items-center gap-1.5">
              <Camera className="w-5 h-5 text-rose-400 inline" />
              <span>{fotoluSayisi}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Arama ve Filtreleme Çubuğu */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs flex flex-wrap items-center gap-3">
        {/* Metin Arama */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Olay, proje, kişi veya detay ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Temizle
            </button>
          )}
        </div>

        {/* Kategori Filtresi */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Kategori:</span>
          <select
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="Tümü">Tüm Kategoriler</option>
            <option value="Proje">📐 Proje</option>
            <option value="Sipariş">📦 Sipariş / Malzeme</option>
            <option value="Makine">⚙️ Makine</option>
            <option value="Araç">🚛 Araç</option>
            <option value="Personel / İK">👥 Personel / İK</option>
            <option value="Şantiye">🏗️ Şantiye</option>
            <option value="Genel">📌 Genel</option>
          </select>
        </div>

        {/* Proje Filtresi */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Proje:</span>
          <select
            value={projeFilter}
            onChange={(e) => setProjeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 max-w-[200px]"
          >
            <option value="Tümü">Tüm Projeler &amp; Genel</option>
            <option value="projeli">Sadece Projeli Olaylar</option>
            <option value="projesiz">Sadece Genel / Projesiz</option>
            {projeler.map(p => (
              <option key={p.ProjeId} value={String(p.ProjeId)}>
                {p.ProjeAdi}
              </option>
            ))}
          </select>
        </div>

        {/* Zaman Aralığı */}
        <div className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => handleFilterChange('bugun')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
              tarihFilter === 'bugun'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Bugün</span>
            <span className="text-[10px] opacity-80 font-normal">(Varsayılan)</span>
          </button>
          <button
            onClick={() => handleFilterChange('dun')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              tarihFilter === 'dun'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Dün
          </button>
          <button
            onClick={() => handleFilterChange('hafta')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              tarihFilter === 'hafta'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Son 7 Gün
          </button>
          <button
            onClick={() => handleFilterChange('ay')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              tarihFilter === 'ay'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Son 30 Gün
          </button>
          <button
            onClick={() => handleFilterChange('tumu')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              tarihFilter === 'tumu'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tüm Geçmiş
          </button>
        </div>
      </div>

      {/* Ceride Listesi / Zaman Çizelgesi */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-3" />
          <p className="text-sm font-semibold">Ceride kayıtları yükleniyor...</p>
        </div>
      ) : Object.keys(groupedByDate).length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {tarihFilter === 'bugun' ? 'Bugün İçin Henüz Kayıt Yok' : 'Kayıt Bulunamadı'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {tarihFilter === 'bugun' 
              ? 'Bugünün tarihine ait herhangi bir vukuat veya faaliyet henüz girilmemiş. Geçmiş tüm kayıtları görmek için aşağıdaki butona tıklayabilirsiniz.'
              : 'Seçili filtre veya arama kriterlerinize uygun ceride kaydı bulunamadı.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            {tarihFilter !== 'tumu' && (
              <button
                onClick={() => handleFilterChange('tumu')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-amber-400" />
                <span>Tüm Geçmiş Kayıtları Göster</span>
              </button>
            )}
            <button
              onClick={handleOpenNewModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni Ceride Olayı Ekle</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([dateStr, items]) => {
            const formattedDate = dateStr === 'Tarihsiz' ? 'Tarihsiz Olaylar' : formatTarihTR(dateStr);
            const isToday = dateStr === todayStr;

            return (
              <div key={dateStr} className="space-y-3">
                {/* Gün Başlığı */}
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs ${
                    isToday 
                      ? 'bg-amber-600 text-white' 
                      : 'bg-slate-800 text-slate-200'
                  }`}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formattedDate}</span>
                    {isToday && <span className="ml-1 text-[10px] bg-amber-700/60 px-1.5 py-0.2 rounded font-black">BUGÜN</span>}
                  </div>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                  <span className="text-xs font-semibold text-slate-400">{items.length} olay</span>
                </div>

                {/* Olay Kartları */}
                <div className="grid grid-cols-1 gap-3">
                  {items.map((item) => {
                    const badge = getKategoriBadge(item.Kategori);
                    const IconComponent = badge.icon;
                    const bagliProje = item.ProjeId ? projeler.find(p => p.ProjeId === item.ProjeId) : null;
                    const fotolar = Array.isArray(item.Fotograflar) ? item.Fotograflar : [];

                    return (
                      <div
                        key={item.Id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 p-4 rounded-xl shadow-xs transition group flex flex-col gap-3"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          {/* Sol Taraf: İkon, Olay, Detay, Proje */}
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            <div className={`p-2.5 rounded-xl border shrink-0 ${badge.bg}`}>
                              <IconComponent className="w-4 h-4" />
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* 24 Saat Formatında Saat (TR) */}
                                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200 dark:border-slate-700" title="24 Saat Formatı (Türkiye Saati)">
                                  <Clock className="w-3 h-3 text-amber-500" />
                                  <span>{item.Saat || '09:00'}</span>
                                </span>

                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                                  {item.Kategori || 'Genel'}
                                </span>

                                {item.OtomatikMi ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-medium" title="Sistem tarafından otomatik işlendi">
                                    <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                    <span>Otomatik</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-medium">
                                    <span>Manuel</span>
                                  </span>
                                )}

                                {fotolar.length > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold">
                                    <Camera className="w-3 h-3" />
                                    <span>{fotolar.length} Fotoğraf</span>
                                  </span>
                                )}

                                {item.ProjeAdi && item.ProjeAdi !== 'Genel / Projesiz' && (
                                  <span 
                                    onClick={() => {
                                      if (bagliProje && onSelectProje) {
                                        onSelectProje(bagliProje);
                                        if (onNavigateTab) onNavigateTab('projeler');
                                      }
                                    }}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 ${bagliProje ? 'cursor-pointer hover:bg-indigo-100 transition' : ''}`}
                                    title={bagliProje ? 'Projeye Git' : ''}
                                  >
                                    <Layers className="w-3 h-3" />
                                    <span>{item.ProjeAdi}</span>
                                    {bagliProje && <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />}
                                  </span>
                                )}
                              </div>

                              {/* Olay Başlığı */}
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug break-words">
                                {item.Olay}
                              </h4>

                              {/* Detay Açıklaması */}
                              {item.Detay && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                  {item.Detay}
                                </p>
                              )}

                              {/* Alt Bilgi: İşleyen Kişi ve Sisteme İşlenme Saati */}
                              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 flex-wrap">
                                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                  <User className="w-3 h-3 text-amber-500" />
                                  <span>İşleyen: {item.IsleyenKisi || 'Yönetici'}</span>
                                </span>
                                <span>•</span>
                                <span title="Veritabanına tam kayıt zamanı (Türkiye Saati)">
                                  İşlenme: {item.IslenmeTarihi || `${item.Tarih} ${item.Saat}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Sağ Taraf: Aksiyon Butonları */}
                          <div className="flex items-center gap-1 self-end sm:self-center shrink-0 opacity-80 group-hover:opacity-100 transition">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Düzenle / Fotoğraf Yönet"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.Id, item.Olay)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Fotoğraf Galerisi Küçük Önizlemeleri */}
                        {fotolar.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-2 overflow-x-auto py-1">
                              {fotolar.map((f, fIdx) => (
                                <div
                                  key={f.Id || fIdx}
                                  onClick={() => setLightboxData({ images: fotolar, index: fIdx, title: item.Olay })}
                                  className="relative group/thumb cursor-pointer shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 transition hover:ring-2 hover:ring-amber-500 shadow-2xs"
                                >
                                  <img 
                                    src={f.DosyaIcerigi} 
                                    alt={f.DosyaAdi || 'Ceride Fotoğrafı'} 
                                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition duration-200"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center text-white">
                                    <Eye className="w-4 h-4" />
                                  </div>
                                  {f.DosyaBoyutu && (
                                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 rounded font-mono">
                                      {f.DosyaBoyutu}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Yeni Kayıt & Düzenleme Modalı */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingItem ? 'Ceride Kaydını Düzenle' : 'Yeni Ceride Olayı & Fotoğraf Ekle'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Olay Tanımı */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Olay / Faaliyet Tanımı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Mutfak dolaplarının montajı tamamlandı ve müşteri teslim tutanağı imzalandı"
                  value={formOlay}
                  onChange={(e) => setFormOlay(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Kategori & Proje */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori
                  </label>
                  <select
                    value={formKategori}
                    onChange={(e: any) => setFormKategori(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Proje">📐 Proje</option>
                    <option value="Şantiye">🏗️ Şantiye</option>
                    <option value="Sipariş">📦 Sipariş / Malzeme</option>
                    <option value="Makine">⚙️ Makine</option>
                    <option value="Araç">🚛 Araç</option>
                    <option value="Personel / İK">👥 Personel / İK</option>
                    <option value="Genel">📌 Genel Faaliyet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    İlişkili Proje (İsteğe Bağlı)
                  </label>
                  <select
                    value={formProjeId}
                    onChange={(e) => setFormProjeId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Genel / Projesiz</option>
                    {projeler.map(p => (
                      <option key={p.ProjeId} value={String(p.ProjeId)}>
                        {p.ProjeAdi}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tarih & Saat (24 Saat Formatı - Türkiye Saati) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Olay Tarihi
                    </label>
                  </div>
                  <input
                    type="date"
                    required
                    value={formTarih}
                    onChange={(e) => setFormTarih(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Olay Saati (24s - TR)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSetCurrentTurkeyTime}
                      className="text-[10px] text-amber-700 dark:text-amber-300 hover:underline font-bold"
                    >
                      Şu Anki Saat
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="14:30 (24s)"
                      pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                      value={formSaat}
                      onChange={(e) => setFormSaat(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    Örn: 08:30, 14:45, 21:00 (24 saat esası)
                  </span>
                </div>
              </div>

              {/* İşleyen Kişi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  İşleyen Yönetici / Sorumlu (PIN Esaslı)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={formIsleyenKisi}
                    onChange={(e) => setFormIsleyenKisi(e.target.value)}
                    placeholder="Ad Soyad"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Detay & Notlar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Açıklama / Detaylı Notlar (İsteğe Bağlı)
                </label>
                <textarea
                  rows={2}
                  placeholder="Gözlemler, şantiye tutanakları, firma yetkilisi görüşmeleri veya ek notlar..."
                  value={formDetay}
                  onChange={(e) => setFormDetay(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              {/* Fotoğraf Ekleme Bölümü */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-rose-500" />
                    <span>Şantiye &amp; Olay Fotoğrafları</span>
                    {formFotograflar.length > 0 && (
                      <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-full font-bold">
                        {formFotograflar.length} adet
                      </span>
                    )}
                  </label>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhotos}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{uploadingPhotos ? 'İşleniyor...' : 'Fotoğraf / Çek'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Fotoğraf Küçük Önizlemeleri */}
                {formFotograflar.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1 max-h-48 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    {formFotograflar.map((foto, idx) => (
                      <div key={foto.Id || idx} className="relative group/pic rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 aspect-square shadow-2xs">
                        <img 
                          src={foto.DosyaIcerigi} 
                          alt={foto.DosyaAdi} 
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition shadow-md cursor-pointer opacity-90 group-hover/pic:opacity-100"
                          title="Fotoğrafı Kaldır"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {foto.DosyaBoyutu && (
                          <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[8px] px-1 rounded font-mono">
                            {foto.DosyaBoyutu}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-rose-400 rounded-xl text-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer bg-slate-50/50 dark:bg-slate-950/50"
                  >
                    <Camera className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-semibold">Fotoğraf yüklemek veya kamera ile çekmek için tıklayın</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP desteklenir (otomatik optimize edilir)</p>
                  </div>
                )}
              </div>

              {/* Butonlar */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingPhotos}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-600/30 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{editingItem ? 'Değişiklikleri Kaydet' : 'Cerideye İşle'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fotoğraf Tam Ekran Lightbox / Görüntüleyici */}
      {lightboxData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative max-w-4xl w-full max-h-[95vh] flex flex-col items-center">
            {/* Üst Başlık ve Kapat Butonu */}
            <div className="w-full flex items-center justify-between text-white pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <Camera className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold truncate">{lightboxData.title}</span>
                <span className="text-xs text-slate-400 shrink-0">
                  ({lightboxData.index + 1} / {lightboxData.images.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxData.images[lightboxData.index]?.DosyaIcerigi}
                  download={lightboxData.images[lightboxData.index]?.DosyaAdi || 'ceride_foto.jpg'}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition"
                  title="Fotoğrafı İndir"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setLightboxData(null)}
                  className="p-1.5 bg-slate-800 hover:bg-red-600 text-slate-200 rounded-lg text-xs transition cursor-pointer"
                  title="Kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Büyük Resim */}
            <div className="relative w-full flex items-center justify-center my-4 overflow-hidden max-h-[75vh]">
              <img
                src={lightboxData.images[lightboxData.index]?.DosyaIcerigi}
                alt={lightboxData.images[lightboxData.index]?.DosyaAdi || 'Ceride Fotoğrafı'}
                className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
              />

              {/* Önceki / Sonraki Butonları */}
              {lightboxData.images.length > 1 && (
                <>
                  <button
                    onClick={() => setLightboxData(prev => prev ? {
                      ...prev,
                      index: (prev.index - 1 + prev.images.length) % prev.images.length
                    } : null)}
                    className="absolute left-2 p-2 rounded-full bg-slate-900/80 hover:bg-amber-600 text-white transition shadow-lg"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setLightboxData(prev => prev ? {
                      ...prev,
                      index: (prev.index + 1) % prev.images.length
                    } : null)}
                    className="absolute right-2 p-2 rounded-full bg-slate-900/80 hover:bg-amber-600 text-white transition shadow-lg"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Alt Dosya Bilgisi */}
            <div className="text-center text-xs text-slate-400">
              <span>{lightboxData.images[lightboxData.index]?.DosyaAdi}</span>
              {lightboxData.images[lightboxData.index]?.DosyaBoyutu && (
                <span className="ml-2 font-mono text-slate-500">
                  • {lightboxData.images[lightboxData.index]?.DosyaBoyutu}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
