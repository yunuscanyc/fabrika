import React, { useState, useEffect, useRef } from 'react';
import {
  PackagePlus, ShoppingCart, Lock, Unlock, Search, Filter, Printer, Trash2, Edit3,
  CheckCircle2, Clock, AlertTriangle, AlertCircle, Eye, Upload, Image, X, FileText,
  Plus, Check, ChevronDown, Sparkles, Building2, User, Phone, Tag, Calendar, DollarSign,
  ShieldAlert, RefreshCw, Layers, ArrowUpDown, Info
} from 'lucide-react';
import { MalzemeSiparisi, MalzemeSiparisBelgesi } from '../types';
import { SiparisYazdirModal } from './SiparisYazdirModal';
import { UstabasiUyariModal } from './UstabasiUyariModal';

interface SiparislerViewProps {
  userRole?: 'admin' | 'ustabasi';
  onOrderAdded?: () => void;
}

// Özel Üretim Mobilya Fabrikası Malzeme Kategorileri
export const MOBILYA_KATEGORILERI = [
  'Cam & Ayna',
  'Mobilya İskeleti & Metal Karkas',
  'Mobilya Aksesuarı & Hırdavat',
  'MDF & Ahşap Panel',
  'Masif Kereste & Kaplama',
  'Cila, Lake & Boya Kimyasalları',
  'Sünger, Kumaş & Deri Döşeme',
  'Mermer, Granit & Porselen Tezgah',
  'Aydınlatma & LED Profilleri',
  'Paketleme & Sevkiyat Malzemesi',
  'Diğer Özel İmalat Malzemesi'
];

export const BIRIMLER = [
  'Adet', 'Plaka', 'Takım', 'Metre (mt)', 'Metretül (mtül)',
  'Metrekare (m²)', 'Metreküp (m³)', 'Kg', 'Top', 'Boy (6mt)', 'Koli', 'Litre', 'Paket'
];

export const SiparislerView: React.FC<SiparislerViewProps> = ({
  userRole = 'admin',
  onOrderAdded
}) => {
  const [siparisler, setSiparisler] = useState<MalzemeSiparisi[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDurum, setFilterDurum] = useState<string>('Tumu');
  const [filterKategori, setFilterKategori] = useState<string>('Tumu');
  const [filterAciliyet, setFilterAciliyet] = useState<string>('Tumu');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modallar ve Seçili Kayıt
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSiparis, setEditingSiparis] = useState<MalzemeSiparisi | null>(null);
  const [printSiparis, setPrintSiparis] = useState<MalzemeSiparisi | null>(null);
  const [lockedWarningSiparis, setLockedWarningSiparis] = useState<MalzemeSiparisi | null>(null);
  const [satinalmaEditSiparis, setSatinalmaEditSiparis] = useState<MalzemeSiparisi | null>(null);
  
  // Form Alanları (Yeni veya Düzenleme)
  const [formProjeAdi, setFormProjeAdi] = useState('');
  const [formKategori, setFormKategori] = useState(MOBILYA_KATEGORILERI[0]);
  const [formMalzemeAdi, setFormMalzemeAdi] = useState('');
  const [formMiktar, setFormMiktar] = useState<number | ''>(1);
  const [formBirim, setFormBirim] = useState('Adet');
  const [formOlculer, setFormOlculer] = useState('');
  const [formAciklama, setFormAciklama] = useState('');
  const [formAciliyet, setFormAciliyet] = useState<'Normal' | 'Acil' | 'CokAcil'>('Normal');
  const [formTerminTarihi, setFormTerminTarihi] = useState('');
  const [formTalepEden, setFormTalepEden] = useState(userRole === 'ustabasi' ? 'İmalat Ustabaşı' : 'Atölye Sorumlusu');
  const [formBelgeler, setFormBelgeler] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Satınalma Detay Düzenleme Formu Alanları (Admin)
  const [satinalmaDurum, setSatinalmaDurum] = useState<string>('Bekliyor');
  const [satinalmaTedarikci, setSatinalmaTedarikci] = useState('');
  const [satinalmaTutar, setSatinalmaTutar] = useState<number | ''>('');
  const [satinalmaFaturaNo, setSatinalmaFaturaNo] = useState('');
  const [satinalmaNot, setSatinalmaNot] = useState('');
  const [satinalmaKilitli, setSatinalmaKilitli] = useState(false);
  const [satinalmaKilitNotu, setSatinalmaKilitNotu] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Siparişleri API'den Çek
  const fetchSiparisler = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/siparisler');
      if (res.ok) {
        const data = await res.json();
        setSiparisler(data);
      }
    } catch (err) {
      console.error('Siparişler çekilemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiparisler();
  }, []);

  // Form Sıfırla & Aç
  const handleOpenNewForm = () => {
    setEditingSiparis(null);
    setFormProjeAdi('');
    setFormKategori(MOBILYA_KATEGORILERI[0]);
    setFormMalzemeAdi('');
    setFormMiktar(1);
    setFormBirim('Adet');
    setFormOlculer('');
    setFormAciklama('');
    setFormAciliyet('Normal');
    setFormTerminTarihi('');
    setFormTalepEden(userRole === 'ustabasi' ? 'İmalat Ustabaşı' : 'Atölye Sorumlusu');
    setFormBelgeler([]);
    setFormError(null);
    setFormSuccess(null);
    setShowFormModal(true);
  };

  // Düzenleme Aç (Kilit Kontrolü ile)
  const handleOpenEditForm = (siparis: MalzemeSiparisi) => {
    if (siparis.KilitliMi && userRole === 'ustabasi') {
      setLockedWarningSiparis(siparis);
      return;
    }

    setEditingSiparis(siparis);
    setFormProjeAdi(siparis.ProjeAdi || '');
    setFormKategori(siparis.Kategori || MOBILYA_KATEGORILERI[0]);
    setFormMalzemeAdi(siparis.MalzemeAdi || '');
    setFormMiktar(siparis.Miktar || 1);
    setFormBirim(siparis.Birim || 'Adet');
    setFormOlculer(siparis.Olculer || '');
    setFormAciklama(siparis.Aciklama || '');
    setFormAciliyet(siparis.Aciliyet || 'Normal');
    setFormTerminTarihi(siparis.TerminTarihi || '');
    setFormTalepEden(siparis.TalepEden || '');
    setFormBelgeler(siparis.Belgeler || []);
    setFormError(null);
    setFormSuccess(null);
    setShowFormModal(true);
  };

  // Satınalma Yönetim Modalı Aç (Admin için)
  const handleOpenSatinalmaModal = (siparis: MalzemeSiparisi) => {
    setSatinalmaEditSiparis(siparis);
    setSatinalmaDurum(siparis.Durum || 'Bekliyor');
    setSatinalmaTedarikci(siparis.TedarikciFirma || '');
    setSatinalmaTutar(siparis.TahminiTutar ?? '');
    setSatinalmaFaturaNo(siparis.FaturaIrsaliyeNo || '');
    setSatinalmaNot(siparis.SatinalmaNotu || '');
    setSatinalmaKilitli(Boolean(siparis.KilitliMi));
    setSatinalmaKilitNotu(siparis.KilitNotu || '');
  };

  // Çoklu Dosya Yükleme (Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const sizeStr = file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(0)} KB`;

        setFormBelgeler(prev => [
          ...prev,
          {
            BelgeId: Date.now() + Math.random(),
            DosyaAdi: file.name,
            DosyaBoyutu: sizeStr,
            YuklemeTarihi: new Date().toISOString().slice(0, 10),
            DosyaIcerigi: base64
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveBelge = (index: number) => {
    setFormBelgeler(prev => prev.filter((_, i) => i !== index));
  };

  // Form Gönder (Yeni veya Güncelleme)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formProjeAdi.trim()) {
      setFormError('Lütfen mobilyanın ait olduğu proje veya müşteri adını giriniz.');
      return;
    }
    if (!formMalzemeAdi.trim()) {
      setFormError('Lütfen talep edilen malzeme veya ürünün adını giriniz.');
      return;
    }
    if (!formMiktar || Number(formMiktar) <= 0) {
      setFormError('Lütfen geçerli bir sipariş miktarı giriniz.');
      return;
    }

    setFormLoading(true);

    try {
      const payload = {
        ProjeAdi: formProjeAdi.trim(),
        Kategori: formKategori,
        MalzemeAdi: formMalzemeAdi.trim(),
        Miktar: Number(formMiktar),
        Birim: formBirim,
        Olculer: formOlculer.trim(),
        Aciklama: formAciklama.trim(),
        Aciliyet: formAciliyet,
        TerminTarihi: formTerminTarihi,
        TalepEden: formTalepEden.trim() || 'Ustabaşı',
        Belgeler: formBelgeler,
        userRole,
        isUstabasi: userRole === 'ustabasi'
      };

      let res;
      if (editingSiparis) {
        res = await fetch(`/api/siparisler/${editingSiparis.Id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': userRole
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/siparisler', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': userRole
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setFormSuccess(editingSiparis ? 'Sipariş başarıyla güncellendi.' : 'Sipariş başarıyla kaydedildi.');
        fetchSiparisler();
        if (onOrderAdded) onOrderAdded();
        setTimeout(() => {
          setShowFormModal(false);
        }, 1000);
      } else {
        if (data.kilitli) {
          setShowFormModal(false);
          setLockedWarningSiparis(editingSiparis);
        } else {
          setFormError(data.error || 'Sipariş kaydedilemedi.');
        }
      }
    } catch (err: any) {
      setFormError('Sunucu bağlantı hatası oluştu.');
    } finally {
      setFormLoading(false);
    }
  };

  // Satınalma Yönetim Kaydet (Admin)
  const handleSaveSatinalma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!satinalmaEditSiparis) return;

    try {
      const res = await fetch(`/api/siparisler/${satinalmaEditSiparis.Id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({
          Durum: satinalmaDurum,
          TedarikciFirma: satinalmaTedarikci.trim(),
          TahminiTutar: satinalmaTutar !== '' ? Number(satinalmaTutar) : null,
          FaturaIrsaliyeNo: satinalmaFaturaNo.trim(),
          SatinalmaNotu: satinalmaNot.trim(),
          KilitliMi: satinalmaKilitli,
          KilitNotu: satinalmaKilitNotu.trim(),
          KilitleyenKisi: 'Satınalma / Yönetici'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSatinalmaEditSiparis(null);
        fetchSiparisler();
      }
    } catch (err) {
      console.error('Satınalma güncelleme hatası:', err);
    }
  };

  // Hızlı Kilit Aç / Kapat (Admin)
  const handleToggleLock = async (siparis: MalzemeSiparisi) => {
    if (userRole !== 'admin') return;

    try {
      const nextLock = !siparis.KilitliMi;
      const res = await fetch(`/api/siparisler/${siparis.Id}/kilitle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kilitli: nextLock,
          not: nextLock ? 'Satınalma tarafından kilitlendi.' : '',
          kilitleyen: 'Satınalma / Yönetici'
        })
      });

      if (res.ok) {
        fetchSiparisler();
      }
    } catch (err) {
      console.error('Kilit değiştirme hatası:', err);
    }
  };

  // Sipariş Silme
  const handleDeleteSiparis = async (siparis: MalzemeSiparisi) => {
    if (siparis.KilitliMi && userRole === 'ustabasi') {
      setLockedWarningSiparis(siparis);
      return;
    }

    if (!window.confirm(`${siparis.SiparisNo} numaralı siparişi silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/siparisler/${siparis.Id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': userRole }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        fetchSiparisler();
      } else {
        if (data.kilitli) {
          setLockedWarningSiparis(siparis);
        } else {
          alert(data.error || 'Sipariş silinemedi.');
        }
      }
    } catch (err) {
      alert('Sunucu hatası oluştu.');
    }
  };

  // Filtreleme
  const filteredList = siparisler.filter(s => {
    if (filterDurum !== 'Tumu' && s.Durum !== filterDurum) return false;
    if (filterKategori !== 'Tumu' && s.Kategori !== filterKategori) return false;
    if (filterAciliyet !== 'Tumu' && s.Aciliyet !== filterAciliyet) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        (s.SiparisNo && s.SiparisNo.toLowerCase().includes(q)) ||
        (s.ProjeAdi && s.ProjeAdi.toLowerCase().includes(q)) ||
        (s.MalzemeAdi && s.MalzemeAdi.toLowerCase().includes(q)) ||
        (s.Olculer && s.Olculer.toLowerCase().includes(q)) ||
        (s.Aciklama && s.Aciklama.toLowerCase().includes(q)) ||
        (s.TedarikciFirma && s.TedarikciFirma.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // İstatistikler (Admin Dashboard)
  const toplamSiparis = siparisler.length;
  const bekleyenSiparis = siparisler.filter(s => s.Durum === 'Bekliyor').length;
  const fiyatAlinan = siparisler.filter(s => s.Durum === 'FiyatAliniyor').length;
  const siparisVerilen = siparisler.filter(s => s.Durum === 'SiparisVerildi').length;
  const fabrikayaGelen = siparisler.filter(s => s.Durum === 'FabrikayaGeldi').length;
  const kilitliSayisi = siparisler.filter(s => s.KilitliMi).length;

  const getDurumBadge = (durum: string) => {
    switch (durum) {
      case 'Bekliyor':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1"><Clock className="w-3 h-3" /> Bekliyor</span>;
      case 'Incelemede':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1"><Info className="w-3 h-3" /> İnceleniyor</span>;
      case 'FiyatAliniyor':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Fiyat Alınıyor</span>;
      case 'SiparisVerildi':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> Sipariş Verildi</span>;
      case 'KismiGeldi':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Kısmi Geldi</span>;
      case 'FabrikayaGeldi':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1"><Check className="w-3 h-3" /> Fabrikaya Geldi</span>;
      case 'Iptal':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1"><X className="w-3 h-3" /> İptal</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{durum}</span>;
    }
  };

  const getAciliyetBadge = (aciliyet: string) => {
    switch (aciliyet) {
      case 'CokAcil':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse">ÇOK ACİL (İmalat Duruyor)</span>;
      case 'Acil':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white">Acil</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">Normal</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* ÜST BAŞLIK VE HIZLI AKSİYON ALANI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
              userRole === 'ustabasi' ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-blue-600 text-white shadow-blue-600/20'
            }`}>
              {userRole === 'ustabasi' ? <PackagePlus className="w-6 h-6" /> : <ShoppingCart className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  {userRole === 'ustabasi' ? 'Ustabaşı Dış Malzeme Sipariş Masası' : 'Dış Malzeme Sipariş Giriş & Satınalma Takibi'}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  userRole === 'ustabasi' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
                }`}>
                  {userRole === 'ustabasi' ? '🔨 Ustabaşı Modu' : '🏢 Yönetici / Satınalma Modu'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {userRole === 'ustabasi'
                  ? 'Özel imalat için gereken cam, iskelet, ray, mdf ve aksesuarları buradan girin. Durumunu takip edin.'
                  : 'Ustabaşlarının girdiği malzeme taleplerini inceleyin, onaylayıp kilitleyin, tedarikçilere sipariş geçin.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchSiparisler}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={handleOpenNewForm}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                userRole === 'ustabasi'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Malzeme Siparişi Gir</span>
            </button>
          </div>
        </div>

        {/* ADMIN İÇİN İSTATİSTİK KARTLARI */}
        {userRole === 'admin' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">Toplam Talep</span>
              <span className="text-xl font-bold text-slate-900">{toplamSiparis}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200">
              <span className="text-[11px] font-semibold text-amber-700 block">Bekleyen</span>
              <span className="text-xl font-bold text-amber-900">{bekleyenSiparis}</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200">
              <span className="text-[11px] font-semibold text-indigo-700 block">Fiyat Alınan</span>
              <span className="text-xl font-bold text-indigo-900">{fiyatAlinan}</span>
            </div>
            <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200">
              <span className="text-[11px] font-semibold text-purple-700 block">Sipariş Verildi</span>
              <span className="text-xl font-bold text-purple-900">{siparisVerilen}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
              <span className="text-[11px] font-semibold text-emerald-700 block">Fabrikaya Geldi</span>
              <span className="text-xl font-bold text-emerald-900">{fabrikayaGelen}</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200">
              <span className="text-[11px] font-semibold text-rose-700 block">Kilitli / Onaylı</span>
              <span className="text-xl font-bold text-rose-900">{kilitliSayisi}</span>
            </div>
          </div>
        )}
      </div>

      {/* FİLTRE VE ARAMA ÇUBUĞU */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Arama */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Proje, malzeme, ölçü veya sipariş no ara..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Durum Filtresi */}
          <div>
            <select
              value={filterDurum}
              onChange={(e) => setFilterDurum(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Tumu">Tüm Durumlar</option>
              <option value="Bekliyor">⏳ Bekleyen Talepler</option>
              <option value="Incelemede">🔍 İnceleniyor</option>
              <option value="FiyatAliniyor">💵 Fiyat Alınıyor</option>
              <option value="SiparisVerildi">📦 Sipariş Verildi</option>
              <option value="KismiGeldi">🚚 Kısmi Geldi</option>
              <option value="FabrikayaGeldi">✅ Fabrikaya Ulaştı</option>
              <option value="Iptal">❌ İptal Edilenler</option>
            </select>
          </div>

          {/* Kategori Filtresi */}
          <div>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Tumu">Tüm Malzeme Kategorileri</option>
              {MOBILYA_KATEGORILERI.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Aciliyet Filtresi */}
          <div>
            <select
              value={filterAciliyet}
              onChange={(e) => setFilterAciliyet(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Tumu">Tüm Aciliyet Seviyeleri</option>
              <option value="CokAcil">🚨 ÇOK ACİL (İmalat Duruyor)</option>
              <option value="Acil">⚡ Acil</option>
              <option value="Normal">🟢 Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* SİPARİŞ LİSTESİ */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span className="text-sm font-medium">Malzeme siparişleri yükleniyor...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Kayıtlı Malzeme Siparişi Bulunamadı</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Seçili filtrelere uygun sipariş kaydı yok veya henüz hiçbir sipariş oluşturulmadı.
            </p>
            <button
              onClick={handleOpenNewForm}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>İlk Siparişi Oluştur</span>
            </button>
          </div>
        ) : (
          filteredList.map((siparis) => (
            <div
              key={siparis.Id}
              className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md ${
                siparis.KilitliMi
                  ? 'border-amber-300 ring-1 ring-amber-200/50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Kart Üst Bar */}
              <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2.5 py-1 rounded-lg">
                    {siparis.SiparisNo}
                  </span>
                  <span className="font-bold text-xs text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    📁 {siparis.ProjeAdi}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 hidden sm:inline-block">
                    • {siparis.Kategori}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {getAciliyetBadge(siparis.Aciliyet)}
                  {getDurumBadge(siparis.Durum)}

                  {siparis.KilitliMi && (
                    <span
                      title={`Satınalma tarafından kilitlendi: ${siparis.KilitTarihi || ''}`}
                      className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-500 text-white flex items-center gap-1 shadow-xs"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Kilitli</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Kart Gövde */}
              <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Sol 2 Kolon: Malzeme, Miktar, Ölçüler & Açıklama */}
                <div className="lg:col-span-2 space-y-3.5">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-base font-bold text-slate-950">
                      {siparis.MalzemeAdi}
                    </h2>
                    <span className="text-sm font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {siparis.Miktar} {siparis.Birim}
                    </span>
                  </div>

                  {/* Ölçüler & Ebatlar Kutusu */}
                  {siparis.Olculer && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                        📐 Kesim / Teknik Ölçüler:
                      </span>
                      <p className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {siparis.Olculer}
                      </p>
                    </div>
                  )}

                  {/* Not & Açıklama */}
                  {siparis.Aciklama && (
                    <div className="text-xs text-slate-700 leading-relaxed bg-amber-50/40 p-3 rounded-xl border border-amber-200/60">
                      <strong className="text-amber-950 block mb-0.5">📝 İmalat Açıklaması:</strong>
                      {siparis.Aciklama}
                    </div>
                  )}

                  {/* Ekli Fotoğraflar & Krokiler */}
                  {siparis.Belgeler && siparis.Belgeler.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-slate-600 block mb-1.5 flex items-center gap-1">
                        <Image className="w-3.5 h-3.5 text-blue-600" />
                        Ekli Kroki &amp; Fotoğraflar ({siparis.Belgeler.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {siparis.Belgeler.map((belge, bIdx) => (
                          <div
                            key={bIdx}
                            className="relative group border border-slate-200 rounded-lg overflow-hidden bg-slate-100 w-20 h-20 flex items-center justify-center cursor-pointer shadow-2xs hover:shadow transition-all"
                            onClick={() => {
                              if (belge.DosyaIcerigi) {
                                const w = window.open('');
                                if (w) {
                                  w.document.write(`<img src="${belge.DosyaIcerigi}" style="max-width:100%; height:auto;" />`);
                                }
                              }
                            }}
                          >
                            {belge.DosyaIcerigi && belge.DosyaIcerigi.startsWith('data:image') ? (
                              <img
                                src={belge.DosyaIcerigi}
                                alt={belge.DosyaAdi}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="p-1 text-center text-[10px] text-slate-600 font-semibold truncate">
                                {belge.DosyaAdi}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sağ Kolon: Satınalma / Tedarikçi Durumu & Aksiyonlar */}
                <div className="lg:border-l lg:border-slate-100 lg:pl-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Talep Tarihi:</span>
                      <span className="font-semibold text-slate-800">{siparis.Tarih || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">İstenen Termin:</span>
                      <span className="font-bold text-slate-900">{siparis.TerminTarihi || 'Belirtilmedi'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Talep Eden:</span>
                      <span className="font-semibold text-slate-800">{siparis.TalepEden || 'Ustabaşı'}</span>
                    </div>

                    {/* Satınalma Bilgileri (Varsa) */}
                    {(siparis.TedarikciFirma || siparis.TahminiTutar) && (
                      <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-1 mt-2">
                        {siparis.TedarikciFirma && (
                          <div className="flex justify-between">
                            <span className="text-blue-900 font-medium">Tedarikçi:</span>
                            <span className="font-bold text-blue-950">{siparis.TedarikciFirma}</span>
                          </div>
                        )}
                        {siparis.TahminiTutar && (
                          <div className="flex justify-between">
                            <span className="text-blue-900 font-medium">Tutar:</span>
                            <span className="font-bold text-emerald-700">₺{Number(siparis.TahminiTutar).toLocaleString('tr-TR')}</span>
                          </div>
                        )}
                        {siparis.FaturaIrsaliyeNo && (
                          <div className="flex justify-between">
                            <span className="text-blue-900 font-medium">İrsaliye:</span>
                            <span className="font-mono text-slate-800">{siparis.FaturaIrsaliyeNo}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {siparis.KilitNotu && (
                      <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <strong className="block">Kilit Notu:</strong>
                        {siparis.KilitNotu}
                      </div>
                    )}
                  </div>

                  {/* Aksiyon Butonları */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-1.5">
                    {/* Yazdır Butonu */}
                    <button
                      onClick={() => setPrintSiparis(siparis)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      title="Yazdır / PDF Formu Al"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Form Yazdır</span>
                    </button>

                    {/* Admin: Satınalma Yönetim Modalı */}
                    {userRole === 'admin' && (
                      <button
                        onClick={() => handleOpenSatinalmaModal(siparis)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200"
                        title="Satınalma / Tedarikçi Durumu Yönet"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Satınalma Yönet</span>
                      </button>
                    )}

                    {/* Admin: Hızlı Kilitle / Aç */}
                    {userRole === 'admin' && (
                      <button
                        onClick={() => handleToggleLock(siparis)}
                        className={`p-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                          siparis.KilitliMi
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={siparis.KilitliMi ? 'Kilidi Aç (Ustabaşı düzenleyebilir)' : 'Siparişi Kilitle (Ustabaşı düzenleyemez)'}
                      >
                        {siparis.KilitliMi ? <Lock className="w-4 h-4 text-amber-700" /> : <Unlock className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Düzenle Butonu (Kilit kontrolü içerir) */}
                    <button
                      onClick={() => handleOpenEditForm(siparis)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                      title="Düzenle"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Sil Butonu (Kilit kontrolü içerir) */}
                    <button
                      onClick={() => handleDeleteSiparis(siparis)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 transition-colors cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* YENİ SİPARİŞ / DÜZENLEME MODALI */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Başlığı */}
            <div className={`px-6 py-4 text-white flex items-center justify-between shrink-0 ${
              userRole === 'ustabasi' ? 'bg-amber-600' : 'bg-slate-900'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <PackagePlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {editingSiparis ? `Sipariş Düzenle: ${editingSiparis.SiparisNo}` : 'Yeni Dış Malzeme Sipariş Girişi'}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    Özel imalat mobilya için cam, karkas, ray, mdf vb. talep formu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Gövdesi */}
            <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* 1. Proje & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Mobilya Projesi / Müşteri Adı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formProjeAdi}
                    onChange={(e) => setFormProjeAdi(e.target.value)}
                    placeholder="Örn: Kaya Belek Otel Lobi Mobilyaları"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Malzeme Kategorisi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MOBILYA_KATEGORILERI.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Malzeme Adı, Miktar & Birim */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Talep Edilen Malzeme / Ürün Adı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formMalzemeAdi}
                    onChange={(e) => setFormMalzemeAdi(e.target.value)}
                    placeholder="Örn: 6mm Füme Temperli Rodajlı Cam veya Blum Ray"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Miktar <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      value={formMiktar}
                      onChange={(e) => setFormMiktar(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="1"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Birim <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formBirim}
                      onChange={(e) => setFormBirim(e.target.value)}
                      className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {BIRIMLER.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. İmalat Ölçüleri & Ebatları (Büyük Alan) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>📐 Kesim, Ebat &amp; Teknik Ölçü Detayları</span>
                  <span className="text-[10px] text-slate-400 font-normal">Boy x En x Kalınlık / Rodaj / CNC Kodu</span>
                </label>
                <textarea
                  rows={3}
                  value={formOlculer}
                  onChange={(e) => setFormOlculer(e.target.value)}
                  placeholder="Örnek:&#10;• 1450 x 820 x 6 mm (Düz Rodajlı, 4 Köşe 5mm Kırma)&#10;• 2 Adet Sol Kapak, 2 Adet Sağ Kapak"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 4. İmalat Açıklaması & Notlar (Büyük Not Alanı) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  📝 Ustabaşı Açıklaması &amp; Tedarikçi Notu
                </label>
                <textarea
                  rows={3}
                  value={formAciklama}
                  onChange={(e) => setFormAciklama(e.target.value)}
                  placeholder="Montaj yeri, marka/model tercihi, yüzey kaplama tipi veya tedarikçiye iletilecek özel uyarılar..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 5. Aciliyet, Termin & Talep Eden */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Aciliyet Durumu
                  </label>
                  <select
                    value={formAciliyet}
                    onChange={(e) => setFormAciliyet(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Normal">🟢 Normal Termin</option>
                    <option value="Acil">⚡ Acil (Hafta İçi)</option>
                    <option value="CokAcil">🚨 ÇOK ACİL (İmalat Duruyor!)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    İstenen Termin Tarihi
                  </label>
                  <input
                    type="date"
                    value={formTerminTarihi}
                    onChange={(e) => setFormTerminTarihi(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Talep Eden Birim / Kişi
                  </label>
                  <input
                    type="text"
                    value={formTalepEden}
                    onChange={(e) => setFormTalepEden(e.target.value)}
                    placeholder="Ustabaşı Adı"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 6. Çoklu Kroki / Fotoğraf Yükleme Alanı */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-blue-600" />
                    Kroki, Çizim &amp; Referans Fotoğrafları (Multi Upload)
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Fotoğraf Ekle</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {formBelgeler.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-4 text-center cursor-pointer transition-colors"
                  >
                    <Image className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-600 font-medium">Fotoğraf veya kroki yüklemek için tıklayın veya sürükleyin</p>
                    <span className="text-[10px] text-slate-400">Birden fazla görsel seçebilirsiniz</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {formBelgeler.map((b, idx) => (
                      <div key={idx} className="relative border border-slate-300 rounded-lg p-1 bg-white group">
                        {b.DosyaIcerigi && b.DosyaIcerigi.startsWith('data:image') ? (
                          <img src={b.DosyaIcerigi} alt={b.DosyaAdi} className="w-full h-16 object-cover rounded" />
                        ) : (
                          <div className="w-full h-16 flex items-center justify-center bg-slate-100 rounded text-[9px] text-slate-600 p-1 truncate">
                            {b.DosyaAdi}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveBelge(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow cursor-pointer hover:bg-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Butonlar */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                    userRole === 'ustabasi'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                  }`}
                >
                  {formLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingSiparis ? 'Değişiklikleri Kaydet' : 'Siparişi Kaydet & Gönder'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SATINALMA YÖNETİM MODALI (ADMIN İÇİN) */}
      {satinalmaEditSiparis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-indigo-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Satınalma &amp; Tedarikçi Yönetimi</h3>
                  <p className="text-[11px] text-slate-300">{satinalmaEditSiparis.SiparisNo} • {satinalmaEditSiparis.MalzemeAdi}</p>
                </div>
              </div>
              <button
                onClick={() => setSatinalmaEditSiparis(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSatinalma} className="p-6 space-y-4">
              {/* Durum Değiştirme */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Sipariş Durumu
                </label>
                <select
                  value={satinalmaDurum}
                  onChange={(e) => setSatinalmaDurum(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Bekliyor">⏳ Talep Alındı / Bekliyor</option>
                  <option value="Incelemede">🔍 Satınalma İncelemesinde</option>
                  <option value="FiyatAliniyor">💵 Tedarikçilerden Fiyat Alınıyor</option>
                  <option value="SiparisVerildi">📦 Tedarikçiye Sipariş Verildi</option>
                  <option value="KismiGeldi">🚚 Kısmi Teslim Alındı</option>
                  <option value="FabrikayaGeldi">✅ Fabrikaya / Depoya Ulaştı</option>
                  <option value="Iptal">❌ İptal Edildi</option>
                </select>
              </div>

              {/* Tedarikçi & Tutar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tedarikçi Firma / Bayi
                  </label>
                  <input
                    type="text"
                    value={satinalmaTedarikci}
                    onChange={(e) => setSatinalmaTedarikci(e.target.value)}
                    placeholder="Örn: Akdeniz Cam A.Ş."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Anlaşılan Tutar (₺)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={satinalmaTutar}
                    onChange={(e) => setSatinalmaTutar(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* İrsaliye No */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Fatura / İrsaliye No
                </label>
                <input
                  type="text"
                  value={satinalmaFaturaNo}
                  onChange={(e) => setSatinalmaFaturaNo(e.target.value)}
                  placeholder="Örn: IRS-2026/8941"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Satınalma İç Notu */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Satınalma &amp; Teslimat Notu
                </label>
                <textarea
                  rows={2}
                  value={satinalmaNot}
                  onChange={(e) => setSatinalmaNot(e.target.value)}
                  placeholder="Termin sözü, nakliye bilgisi veya ödeme vadesi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* KİLİTLEME AYARI */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={satinalmaKilitli}
                    onChange={(e) => setSatinalmaKilitli(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
                  />
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    Siparişi Kilitle (Ustabaşı müdahale edemesin)
                  </span>
                </label>

                {satinalmaKilitli && (
                  <input
                    type="text"
                    value={satinalmaKilitNotu}
                    onChange={(e) => setSatinalmaKilitNotu(e.target.value)}
                    placeholder="Kilit nedeni / açıklaması (örn: Sipariş onaylandı, fabrikaya geçildi)"
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSatinalmaEditSiparis(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Satınalma Bilgilerini Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* YAZDIRMA MODALI */}
      <SiparisYazdirModal
        isOpen={Boolean(printSiparis)}
        onClose={() => setPrintSiparis(null)}
        siparis={printSiparis}
      />

      {/* USTABAŞI KİLİT UYARI MODALI */}
      <UstabasiUyariModal
        isOpen={Boolean(lockedWarningSiparis)}
        onClose={() => setLockedWarningSiparis(null)}
        siparis={lockedWarningSiparis}
      />
    </div>
  );
};
