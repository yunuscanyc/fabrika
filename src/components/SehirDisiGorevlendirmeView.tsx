import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Send, Plus, Trash2, Edit3, Save, Printer, Search, X, MapPin, 
  Calendar, Users, Building2, Truck, Home, DollarSign, ShieldCheck, 
  FileText, CheckCircle2, AlertCircle, Info, ChevronRight, UserPlus
} from 'lucide-react';
import { 
  SehirDisiGorevlendirme, SehirDisiGorevliPersonel, Personel, Proje 
} from '../types';
import { formatTarihTR, getBugunIso } from '../utils/dateUtils';

interface SehirDisiGorevlendirmeViewProps {
  personeller: Personel[];
  projeler?: Proje[];
}

export const SehirDisiGorevlendirmeView: React.FC<SehirDisiGorevlendirmeViewProps> = ({
  personeller,
  projeler = []
}) => {
  const [gorevler, setGorevler] = useState<SehirDisiGorevlendirme[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Veritabanından Görevleri Yükle
  const fetchGorevler = async () => {
    try {
      const res = await fetch('/api/sehir-disi-gorevler');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setGorevler(data);
        }
      }
    } catch (e) {
      console.error('Fetch error:', e);
    }
  };

  useEffect(() => {
    fetchGorevler();
  }, []);

  // Arama & Filtre
  const [aramaMetni, setAramaMetni] = useState('');
  const [durumFiltre, setDurumFiltre] = useState<'Tümü' | 'Aktif' | 'Tamamlandı' | 'İptal'>('Tümü');

  // Modal State'leri
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [yazdirModalOpen, setYazdirModalOpen] = useState(false);
  const [seciliGorev, setSeciliGorev] = useState<SehirDisiGorevlendirme | null>(null);

  // Form Düzenleme State'i
  const [formData, setFormData] = useState<Partial<SehirDisiGorevlendirme>>({
    FormNo: '',
    ProjeId: null,
    ProjeAdi: null,
    GidilecekIlIlce: '',
    SantiyeAdresi: '',
    GorevAmaci: 'Şantiye mobilya ve ahşap montaj işlerinin yürütülmesi',
    BaslangicTarihi: getBugunIso(),
    BitisTarihi: getBugunIso(),
    TahminiGunSayisi: 1,
    UlasimSekli: 'Şirket Aracı',
    AracPlakaVeyaBiletInfo: '',
    KonaklamaTuru: 'Otel',
    KonaklamaAdresiInfo: '',
    GunlukHarcirahTutar: 0,
    YemekKarsilamaTuru: 'Şirket Tarafından Karşılanır',
    Personeller: [],
    IsgUyariKabul: true,
    GenelNotlar: '',
    DuzenleyenKisi: 'İnsan Kaynakları Departmanı',
    Durum: 'Aktif'
  });

  // Hızlı Personel Ekleme Seçim Alanı
  const [secilenPersonelId, setSecilenPersonelId] = useState<string>('');

  useEffect(() => {
    if (!formData.FormNo && formModalOpen) {
      setFormData(prev => ({
        ...prev,
        FormNo: `GRV-2026-00${gorevler.length + 1}`
      }));
    }
  }, [formModalOpen, gorevler.length, formData.FormNo]);

  // Filtrelenmiş Liste
  const filtrelenmisGorevler = useMemo(() => {
    return gorevler.filter(g => {
      const ilMatch = g.GidilecekIlIlce.toLowerCase().includes(aramaMetni.toLowerCase());
      const projeMatch = (g.ProjeAdi || '').toLowerCase().includes(aramaMetni.toLowerCase());
      const formMatch = g.FormNo.toLowerCase().includes(aramaMetni.toLowerCase());
      const kisiMatch = g.Personeller.some(p => p.AdSoyad.toLowerCase().includes(aramaMetni.toLowerCase()));

      const matchText = ilMatch || projeMatch || formMatch || kisiMatch;
      const matchDurum = durumFiltre === 'Tümü' || g.Durum === durumFiltre;

      return matchText && matchDurum;
    });
  }, [gorevler, aramaMetni, durumFiltre]);

  // Form Sıfırla & Yeni Aç
  const handleYeniFormAc = () => {
    setIsEditing(false);
    setFormData({
      GorevId: `GRV-${Date.now()}`,
      FormNo: `GRV-2026-00${gorevler.length + 1}`,
      ProjeId: null,
      ProjeAdi: null,
      GidilecekIlIlce: '',
      SantiyeAdresi: '',
      GorevAmaci: 'Şantiye montaj ve ahşap kaplama uygulaması',
      BaslangicTarihi: getBugunIso(),
      BitisTarihi: getBugunIso(),
      TahminiGunSayisi: 1,
      UlasimSekli: 'Şirket Aracı',
      AracPlakaVeyaBiletInfo: '',
      KonaklamaTuru: 'Otel',
      KonaklamaAdresiInfo: '',
      GunlukHarcirahTutar: 0,
      YemekKarsilamaTuru: 'Şirket Tarafından Karşılanır',
      Personeller: [],
      IsgUyariKabul: true,
      GenelNotlar: '6331 Sayılı İSG Kanunu uyarınca kişisel koruyucu donanımların kullanımı zorunludur.',
      DuzenleyenKisi: 'İnsan Kaynakları',
      Durum: 'Aktif'
    });
    setFormModalOpen(true);
  };

  // Düzenleme İçin Aç
  const handleDuzenleAc = (g: SehirDisiGorevlendirme) => {
    setIsEditing(true);
    setFormData({ ...g });
    setFormModalOpen(true);
  };

  // Kadrolu Personel Ekle
  const handlePersonelEkle = () => {
    if (!secilenPersonelId) return;
    const p = personeller.find(item => item.PersonelId.toString() === secilenPersonelId);
    if (!p) return;

    // Zaten ekli mi?
    if (formData.Personeller?.some(item => item.PersonelId === p.PersonelId)) {
      alert('Bu personel zaten listeye eklenmiş.');
      return;
    }

    const yeniIsci: SehirDisiGorevliPersonel = {
      PersonelId: p.PersonelId,
      TCKimlikNo: p.TCKimlikNo || '',
      AdSoyad: p.AdSoyad,
      GorevUnvan: p.Gorev || p.GorevVeyaUnvan || 'Görevli',
      Telefon: p.Telefon || '',
      AcilDurumKisiVeTel: p.AcilDurumKisisi ? `${p.AcilDurumKisisi} (${p.AcilDurumTelefonu || ''})` : ''
    };

    setFormData({
      ...formData,
      Personeller: [...(formData.Personeller || []), yeniIsci]
    });
    setSecilenPersonelId('');
  };

  // Manuel Harici İşçi Ekle
  const handleManuelIsciEkle = () => {
    const yeniIsci: SehirDisiGorevliPersonel = {
      TCKimlikNo: '',
      AdSoyad: 'Yeni Görevli İşçi',
      GorevUnvan: 'Şantiye Elemanı',
      Telefon: '',
      AcilDurumKisiVeTel: ''
    };
    setFormData({
      ...formData,
      Personeller: [...(formData.Personeller || []), yeniIsci]
    });
  };

  // İşçi Alanı Güncelle
  const handleIsciGuncelle = (index: number, alan: keyof SehirDisiGorevliPersonel, deger: string) => {
    const liste = [...(formData.Personeller || [])];
    liste[index] = { ...liste[index], [alan]: deger };
    setFormData({ ...formData, Personeller: liste });
  };

  // İşçi Çıkar
  const handleIsciCikar = (index: number) => {
    const liste = [...(formData.Personeller || [])];
    liste.splice(index, 1);
    setFormData({ ...formData, Personeller: liste });
  };

  // Tarihler Değişince Gün Sayısını Otomatik Hesapla
  const handleTarihDegis = (bas: string, bit: string) => {
    try {
      const d1 = new Date(bas);
      const d2 = new Date(bit);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setFormData(prev => ({
        ...prev,
        BaslangicTarihi: bas,
        BitisTarihi: bit,
        TahminiGunSayisi: isNaN(diffDays) ? 1 : diffDays
      }));
    } catch (e) {
      setFormData(prev => ({ ...prev, BaslangicTarihi: bas, BitisTarihi: bit }));
    }
  };

  // Formu Kaydet
  const handleFormKaydet = async () => {
    if (!formData.GidilecekIlIlce || !formData.SantiyeAdresi) {
      alert('Lütfen Gidilecek İl/İlçe ve Şantiye Adresi alanlarını doldurunuz.');
      return;
    }

    if (!formData.Personeller || formData.Personeller.length === 0) {
      alert('Lütfen görevlendirilecek en az 1 personel seçiniz veya ekleyiniz.');
      return;
    }

    const isEdit = isEditing && !!formData.GorevId && gorevler.some(g => g.GorevId === formData.GorevId);
    const gId = formData.GorevId || `GRV-${Date.now()}`;
    const kayitGorev: SehirDisiGorevlendirme = {
      GorevId: gId,
      FormNo: formData.FormNo || `GRV-2026-00${gorevler.length + 1}`,
      ProjeId: formData.ProjeId || null,
      ProjeAdi: formData.ProjeAdi || null,
      GidilecekIlIlce: formData.GidilecekIlIlce,
      SantiyeAdresi: formData.SantiyeAdresi,
      GorevAmaci: formData.GorevAmaci || 'Montaj ve saha çalışması',
      BaslangicTarihi: formData.BaslangicTarihi || getBugunIso(),
      BitisTarihi: formData.BitisTarihi || getBugunIso(),
      TahminiGunSayisi: formData.TahminiGunSayisi || 1,
      UlasimSekli: formData.UlasimSekli || 'Şirket Aracı',
      AracPlakaVeyaBiletInfo: formData.AracPlakaVeyaBiletInfo || '',
      KonaklamaTuru: formData.KonaklamaTuru || 'Otel',
      KonaklamaAdresiInfo: formData.KonaklamaAdresiInfo || '',
      GunlukHarcirahTutar: formData.GunlukHarcirahTutar || 0,
      YemekKarsilamaTuru: formData.YemekKarsilamaTuru || 'Şirket Tarafından Karşılanır',
      Personeller: formData.Personeller,
      IsgUyariKabul: formData.IsgUyariKabul ?? true,
      GenelNotlar: formData.GenelNotlar || '',
      DuzenleyenKisi: formData.DuzenleyenKisi || 'İnsan Kaynakları',
      OlusturmaTarihi: formData.OlusturmaTarihi || getBugunIso(),
      Durum: formData.Durum || 'Aktif'
    };

    try {
      const url = isEdit ? `/api/sehir-disi-gorevler/${gId}` : '/api/sehir-disi-gorevler';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kayitGorev)
      });

      const resData = await res.json().catch(() => null);

      if (res.ok && resData?.success !== false) {
        const savedItem = resData?.item || kayitGorev;
        if (isEdit) {
          setGorevler(prev => prev.map(g => g.GorevId === gId ? savedItem : g));
        } else {
          setGorevler(prev => [savedItem, ...prev.filter(g => g.GorevId !== savedItem.GorevId)]);
        }
        setFormModalOpen(false);
        setIsEditing(false);
        fetchGorevler();
        alert('Şehir dışı görevlendirme yazısı veritabanına başarıyla kaydedildi.');
      } else {
        const errorMsg = resData?.error || resData?.message || 'Bilinmeyen bir hata oluştu.';
        const detailMsg = resData?.detail ? `\nDetay: ${resData.detail}` : '';
        alert(`Kayıt veritabanına eklenemedi!\n\nHata: ${errorMsg}${detailMsg}`);
      }
    } catch (e: any) {
      console.error('Save error:', e);
      alert(`Sunucuya bağlanırken bir hata oluştu: ${e?.message || e}`);
    }
  };

  // Sil
  const handleSil = async (id: string) => {
    if (confirm('Bu görevlendirme yazısını silmek istediğinize emin misiniz?')) {
      try {
        const res = await fetch(`/api/sehir-disi-gorevler/${id}`, {
          method: 'DELETE'
        });
        const resData = await res.json().catch(() => null);
        if (res.ok && resData?.success !== false) {
          setGorevler(prev => prev.filter(g => g.GorevId !== id));
          fetchGorevler();
          alert('Görevlendirme yazısı başarıyla silindi.');
        } else {
          const errorMsg = resData?.error || resData?.message || 'Silme işlemi sırasında hata oluştu.';
          alert(`Silme başarısız: ${errorMsg}`);
        }
      } catch (e: any) {
        console.error('Delete error:', e);
        alert(`Sunucuya bağlanırken bir hata oluştu: ${e?.message || e}`);
      }
    }
  };

  // Yazdır Aç
  const handleYazdirAc = (g: SehirDisiGorevlendirme) => {
    setSeciliGorev(g);
    setYazdirModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ========================================================================= */}
      {/* ÜST BAŞLIK & FİLTRELER */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Send className="w-4 h-4 text-emerald-400" />
            <span>4857 Sayılı İş Kanunu m.22 Uyumlu Resmi Evrak</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            ✈️ Şehir Dışı Görevlendirme Formları
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Şehir dışı şantiye ve montaj görevlendirmelerinde yasal mevzuata uygun görev onay belgesi düzenleyin, personel listesini ve harcırah/ulaşım şartlarını yazdırın.
          </p>
        </div>

        <button
          onClick={handleYeniFormAc}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Görevlendirme Yazısı Hazırla</span>
        </button>
      </div>

      {/* ARAMA VE DURUM FİLTRESİ BAR */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            placeholder="İl, Şantiye, Proje veya Personel ara..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Durum:</span>
          {(['Tümü', 'Aktif', 'Tamamlandı', 'İptal'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDurumFiltre(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                durumFiltre === d
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GÖREVLENDİRME KAYITLARI LİSTESİ */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtrelenmisGorevler.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">Kayıtlı şehir dışı görevlendirme bulunamadı.</p>
            <p className="text-xs text-slate-500">Yukarıdaki butonu kullanarak yeni bir görev belgesi oluşturabilirsiniz.</p>
          </div>
        ) : (
          filtrelenmisGorevler.map((g) => (
            <div key={g.GorevId} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4 hover:border-slate-700 transition relative overflow-hidden">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {g.FormNo}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{formatTarihTR(g.OlusturmaTarihi)}</span>
                  </div>
                  <h3 className="text-base font-black text-white mt-1 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-400" />
                    <span>{g.GidilecekIlIlce}</span>
                  </h3>
                  <p className="text-xs text-slate-400 block mt-0.5 line-clamp-1">{g.SantiyeAdresi}</p>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  g.Durum === 'Aktif' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  g.Durum === 'Tamamlandı' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                  'bg-rose-500/20 text-rose-300'
                }`}>
                  {g.Durum === 'Aktif' ? '🟢 Görevde' : g.Durum === 'Tamamlandı' ? '🔵 Tamamlandı' : '🔴 İptal'}
                </span>
              </div>

              {/* Bilgi Rozetleri */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Proje Bağı</span>
                  <span className="text-xs font-bold text-amber-300 truncate block mt-0.5">
                    {g.ProjeAdi ? `🌿 ${g.ProjeAdi}` : '⚪ Projesiz Görevlendirme (Genel)'}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Görev Süresi</span>
                  <span className="text-xs font-bold text-white block mt-0.5">
                    📅 {formatTarihTR(g.BaslangicTarihi)} - {formatTarihTR(g.BitisTarihi)} ({g.TahminiGunSayisi} Gün)
                  </span>
                </div>
              </div>

              {/* Görevli Personel Özeti */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>Görevlendirilen İşçiler ({g.Personeller.length} Kişi)</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {g.Personeller.map((p, idx) => (
                    <span key={idx} className="text-[11px] px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg font-semibold">
                      👤 {p.AdSoyad} ({p.GorevUnvan || 'Görevli'})
                    </span>
                  ))}
                </div>
              </div>

              {/* Ulaşım & Harcırah Şartları */}
              <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                <span>🚗 Ulaşım: <strong className="text-slate-200">{g.UlasimSekli}</strong></span>
                <span>🏨 Konaklama: <strong className="text-slate-200">{g.KonaklamaTuru}</strong></span>
                <span>💰 Harcırah: <strong className="text-emerald-400 font-bold">{g.GunlukHarcirahTutar} ₺/gün</strong></span>
              </div>

              {/* İŞLEM BUTONLARI */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleYazdirAc(g)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>A4 Yazdır / PDF</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuzenleAc(g)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    title="Düzenle"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleSil(g.GorevId)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: FORM OLUŞTURMA / DÜZENLEME */}
      {/* ========================================================================= */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-5 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                <span>Şehir Dışı Görevlendirme Formu Düzenleme</span>
              </h3>
              <button onClick={() => setFormModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. PROJE VE FORM BAŞLIĞI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Form / Belge Numarası</label>
                  <input
                    type="text"
                    value={formData.FormNo || ''}
                    onChange={(e) => setFormData({ ...formData, FormNo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    İlişkili Proje <span className="text-slate-500 font-normal">(Opsiyonel / Null Olabilir)</span>
                  </label>
                  <select
                    value={formData.ProjeId ? formData.ProjeId.toString() : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setFormData({ ...formData, ProjeId: null, ProjeAdi: null });
                      } else {
                        const prj = projeler.find(p => p.ProjeId.toString() === val);
                        setFormData({ ...formData, ProjeId: parseInt(val, 10), ProjeAdi: prj?.ProjeAdi || '' });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold"
                  >
                    <option value="">⚪ Genel / Projesiz Görevlendirme (Null)</option>
                    {projeler.map(p => (
                      <option key={p.ProjeId} value={p.ProjeId.toString()}>
                        🌿 {p.ProjeKodu} - {p.ProjeAdi}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. LOKASYON & GÖREV TANIMI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Gidilecek İl / İlçe *</label>
                  <input
                    type="text"
                    value={formData.GidilecekIlIlce || ''}
                    onChange={(e) => setFormData({ ...formData, GidilecekIlIlce: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold"
                    placeholder="Örn: Antalya / Alanya"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Görev Başlangıç &amp; Bitiş Tarihleri *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={formData.BaslangicTarihi || getBugunIso()}
                      onChange={(e) => handleTarihDegis(e.target.value, formData.BitisTarihi || getBugunIso())}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white"
                    />
                    <span className="text-slate-500 font-bold">-</span>
                    <input
                      type="date"
                      value={formData.BitisTarihi || getBugunIso()}
                      onChange={(e) => handleTarihDegis(formData.BaslangicTarihi || getBugunIso(), e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold block mt-1">
                    ⏱️ Görev Süresi: {formData.TahminiGunSayisi} Gün
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Şantiye / İşyeri Açık Adresi *</label>
                <input
                  type="text"
                  value={formData.SantiyeAdresi || ''}
                  onChange={(e) => setFormData({ ...formData, SantiyeAdresi: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="Örn: Alanya Marina Otel Şantiyesi B-Blok"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Görevin Amacı ve Detaylı Açıklaması (4857 s. Kanun m.22 Uyumlu)</label>
                <textarea
                  value={formData.GorevAmaci || ''}
                  onChange={(e) => setFormData({ ...formData, GorevAmaci: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white h-16 resize-none"
                  placeholder="Görevin tanımını yazınız..."
                />
              </div>

              {/* 3. ULAŞIM, KONAKLAMA VE HARCIRAH ŞARTLARI */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>Ulaşım, Konaklama &amp; Harcırah / Yolluk Hükümleri</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Ulaşım Şekli</label>
                    <select
                      value={formData.UlasimSekli || 'Şirket Aracı'}
                      onChange={(e) => setFormData({ ...formData, UlasimSekli: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white"
                    >
                      <option value="Şirket Aracı">Şirket Aracı</option>
                      <option value="Otobüs">Otobüs</option>
                      <option value="Uçak">Uçak</option>
                      <option value="Özel Araç">Özel Araç</option>
                      <option value="Diğer">Diğer</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Plaka / Bilet Detayı</label>
                    <input
                      type="text"
                      value={formData.AracPlakaVeyaBiletInfo || ''}
                      onChange={(e) => setFormData({ ...formData, AracPlakaVeyaBiletInfo: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white"
                      placeholder="Örn: 34 ABC 123 veya THY Bilet"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Konaklama Türü</label>
                    <select
                      value={formData.KonaklamaTuru || 'Otel'}
                      onChange={(e) => setFormData({ ...formData, KonaklamaTuru: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white"
                    >
                      <option value="Otel">Otel</option>
                      <option value="Şantiye Koğuşu">Şantiye Koğuşu</option>
                      <option value="Kiralanan Daire">Kiralanan Daire</option>
                      <option value="Yatılı Şantiye">Yatılı Şantiye</option>
                      <option value="Diğer">Diğer</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Günlük Harcırah / Avans Tutar (₺/Gün)</label>
                    <input
                      type="number"
                      value={formData.GunlukHarcirahTutar || 0}
                      onChange={(e) => setFormData({ ...formData, GunlukHarcirahTutar: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-emerald-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Yemek Karşılama Usulü</label>
                    <select
                      value={formData.YemekKarsilamaTuru || 'Şirket Tarafından Karşılanır'}
                      onChange={(e) => setFormData({ ...formData, YemekKarsilamaTuru: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white"
                    >
                      <option value="Şirket Tarafından Karşılanır">Şirket Tarafından Karşılanır</option>
                      <option value="Harcıraha Dahil">Harcıraha Dahil</option>
                      <option value="Şantiye Tabldot">Şantiye Tabldot</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. GÖREVLENDİRİLEN İŞÇİ LİSTESİ (ÇOKLU SEÇİM & DÜZENLEME) */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>Görevlendirilen İşçi / Personel Listesi ({formData.Personeller?.length || 0})</span>
                  </h4>

                  <div className="flex items-center gap-2">
                    <select
                      value={secilenPersonelId}
                      onChange={(e) => setSecilenPersonelId(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      <option value="">-- Kadrolu Personel Seç --</option>
                      {personeller.filter(p => p.DurumAktifMi).map(p => (
                        <option key={p.PersonelId} value={p.PersonelId.toString()}>
                          👤 {p.AdSoyad} ({p.Gorev || p.GorevVeyaUnvan || 'Görevli'})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handlePersonelEkle}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                    >
                      Ekle
                    </button>

                    <button
                      type="button"
                      onClick={handleManuelIsciEkle}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg cursor-pointer"
                    >
                      + Manuel
                    </button>
                  </div>
                </div>

                {/* Personel Tablosu */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-semibold text-[10px] uppercase">
                      <tr>
                        <th className="p-2">TCKimlik No</th>
                        <th className="p-2">Ad Soyad</th>
                        <th className="p-2">Görevi / Unvanı</th>
                        <th className="p-2">Telefon</th>
                        <th className="p-2">Acil Durum İrtibat</th>
                        <th className="p-2 text-center">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {formData.Personeller?.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={p.TCKimlikNo}
                              onChange={(e) => handleIsciGuncelle(idx, 'TCKimlikNo', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white w-28 font-mono"
                              placeholder="11 Hane TC"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={p.AdSoyad}
                              onChange={(e) => handleIsciGuncelle(idx, 'AdSoyad', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white font-bold w-full"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={p.GorevUnvan || ''}
                              onChange={(e) => handleIsciGuncelle(idx, 'GorevUnvan', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 w-28"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={p.Telefon || ''}
                              onChange={(e) => handleIsciGuncelle(idx, 'Telefon', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 w-28"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={p.AcilDurumKisiVeTel || ''}
                              onChange={(e) => handleIsciGuncelle(idx, 'AcilDurumKisiVeTel', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 w-full"
                              placeholder="Yakını ve Tel"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              onClick={() => handleIsciCikar(idx)}
                              className="p-1 text-slate-500 hover:text-red-400 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. DÜZENLEYEN & KAYDET */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">Düzenleyen:</span>
                  <input
                    type="text"
                    value={formData.DuzenleyenKisi || ''}
                    onChange={(e) => setFormData({ ...formData, DuzenleyenKisi: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFormModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleFormKaydet}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Kaydet</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESMİ A4 YAZDIR / TEBLİĞ VE TAAHHÜTNAME PRINT */}
      {/* ========================================================================= */}
      {yazdirModalOpen && seciliGorev && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sehir-print-overlay">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              html, body {
                background-color: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
              }
              #root {
                display: none !important;
              }
              .sehir-print-overlay {
                position: static !important;
                display: block !important;
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                overflow: visible !important;
              }
              .sehir-print-content {
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                background: white !important;
                padding: 10mm 12mm !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
              }
              .no-print, .no-print * {
                display: none !important;
              }
            }
          `}} />

          <div className="bg-white text-black rounded-2xl w-full max-w-4xl p-8 shadow-2xl space-y-5 sehir-print-content">
            {/* Kontrol Butonları */}
            <div className="no-print flex items-center justify-between border-b pb-3 mb-2">
              <span className="text-xs font-bold text-slate-500">4857 Sayılı Kanun Uyumlu A4 Resmi Görevlendirme Tebliği</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Yazdır / PDF Olarak Kaydet</span>
                </button>
                <button
                  onClick={() => setYazdirModalOpen(false)}
                  className="px-3 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>

            {/* ANTET & BAŞLIK */}
            <div className="flex justify-between items-start border-b-2 border-black pb-3">
              <div>
                <h1 className="text-xl font-black tracking-tight">RENDE AHŞAP &amp; MOBİLYA A.Ş.</h1>
                <p className="text-xs text-slate-600 font-bold">İnsan Kaynakları &amp; Şantiye Yönetim Direktörlüğü</p>
              </div>
              <div className="text-right text-xs">
                <div><strong className="font-bold">Form No:</strong> {seciliGorev.FormNo}</div>
                <div><strong className="font-bold">Tarih:</strong> {formatTarihTR(seciliGorev.OlusturmaTarihi)}</div>
              </div>
            </div>

            <div className="text-center py-2 border-b">
              <h2 className="text-base font-black uppercase tracking-wider">ŞEHİR DIŞI GEÇİCİ GÖREVLENDİRME VE TAAHHÜTNAME BELGESİ</h2>
              <p className="text-[10px] text-slate-600">4857 Sayılı İş Kanunu m.22 ve 6331 Sayılı İSG Kanunu Çerçevesinde Düzenlenmiştir</p>
            </div>

            {/* GÖREV & ŞANTİYE BİLGİLERİ */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded border">
              <div>
                <span className="text-slate-500 block">Görev Yeri / İl &amp; İlçe:</span>
                <strong className="text-sm text-black">{seciliGorev.GidilecekIlIlce}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">İlişkili Proje:</span>
                <strong className="text-sm text-black">{seciliGorev.ProjeAdi || 'Genel Şantiye Görevlendirmesi'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Açık Şantiye Adresi:</span>
                <span className="font-bold">{seciliGorev.SantiyeAdresi}</span>
              </div>
              <div className="col-span-2 border-t pt-2">
                <span className="text-slate-500 block">Görevin Amacı / Tanımı:</span>
                <span>{seciliGorev.GorevAmaci}</span>
              </div>
            </div>

            {/* SÜRE & MALI HÜKÜMLER */}
            <div className="grid grid-cols-3 gap-2 text-xs border p-3 rounded bg-slate-50">
              <div>
                <span className="text-slate-500 block">Görev Tarihleri:</span>
                <strong className="text-black">{formatTarihTR(seciliGorev.BaslangicTarihi)} - {formatTarihTR(seciliGorev.BitisTarihi)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Tahmini Süre:</span>
                <strong className="text-black">{seciliGorev.TahminiGunSayisi} Gün</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Ulaşım Vasıtası:</span>
                <strong className="text-black">{seciliGorev.UlasimSekli} {seciliGorev.AracPlakaVeyaBiletInfo ? `(${seciliGorev.AracPlakaVeyaBiletInfo})` : ''}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Konaklama Şekli:</span>
                <strong className="text-black">{seciliGorev.KonaklamaTuru}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Günlük Harcırah:</span>
                <strong className="text-black">{seciliGorev.GunlukHarcirahTutar} ₺ / Gün</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Yemek Tedariki:</span>
                <strong className="text-black">{seciliGorev.YemekKarsilamaTuru}</strong>
              </div>
            </div>

            {/* GÖREVLENDİRİLEN İŞÇİ LİSTESİ TABLOSU */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5 border-b pb-1">GÖREVLENDİRİLEN İŞÇİ / PERSONEL LİSTESİ</h3>
              <table className="w-full text-left text-xs border border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b">
                    <th className="p-2 border text-center w-8">#</th>
                    <th className="p-2 border">TC Kimlik No</th>
                    <th className="p-2 border">Adı Soyadı</th>
                    <th className="p-2 border">Görevi / Unvanı</th>
                    <th className="p-2 border">Telefon</th>
                    <th className="p-2 border">Acil Durum İrtibatı</th>
                  </tr>
                </thead>
                <tbody>
                  {seciliGorev.Personeller.map((p, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 border text-center font-bold">{idx + 1}</td>
                      <td className="p-2 border font-mono font-bold">{p.TCKimlikNo}</td>
                      <td className="p-2 border font-bold">{p.AdSoyad}</td>
                      <td className="p-2 border">{p.GorevUnvan || 'Görevli'}</td>
                      <td className="p-2 border">{p.Telefon}</td>
                      <td className="p-2 border">{p.AcilDurumKisiVeTel || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MADDELER VE İSG MUVAFATİ */}
            <div className="text-[10px] text-slate-700 space-y-1 bg-slate-50 p-3 rounded border leading-tight">
              <p><strong>1. HAKLAR &amp; HARCIRAH:</strong> Görevlendirme süresince 4857 Sayılı İş Kanunu ve Borçlar Kanunu m.414 hükümleri uyarınca tüm ulaşım, konaklama, yemek ve harcırah giderleri şirketimiz tarafından yukarıda belirtildiği şekilde karşılanacaktır.</p>
              <p><strong>2. İSG KURALLARI:</strong> Görevli işçiler, 6331 Sayılı İş Sağlığı ve Güvenliği Kanunu uyarınca kendilerine zimmetlenen Kişisel Koruyucu Donanımları (baret, ayakkabı, kemer vb.) eksiksiz kullanmakla ve saha emniyet kurallarına uymakla yükümlüdür.</p>
              <p><strong>3. MÜCBİR SEBEP:</strong> İşin bitiş tarihi sahada doğabilecek teknik zorunluluklara göre idare onayıyla uzatılabilir.</p>
            </div>

            {/* İMZA BLOĞU */}
            <div className="pt-4 grid grid-cols-2 gap-8 text-xs">
              <div className="border p-3 rounded text-center">
                <p className="font-bold text-black uppercase">TEBLİĞ EDEN İŞVEREN / İK YETKİLİSİ</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{seciliGorev.DuzenleyenKisi}</p>
                <div className="h-14"></div>
                <p className="text-slate-400 text-[10px]">İmza / Kaşe</p>
              </div>

              <div className="border p-3 rounded">
                <p className="font-bold text-black uppercase text-center">TEBELLÜĞ EDEN İŞÇİLER</p>
                <p className="text-[9px] text-slate-500 text-center mb-2">Yukarıdaki görevlendirme şartlarını okudum, anladım ve kabul ettim.</p>
                <div className="space-y-1.5 pt-1 text-[10px]">
                  {seciliGorev.Personeller.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b pb-1">
                      <span>{idx + 1}. {p.AdSoyad} ({p.TCKimlikNo})</span>
                      <span className="text-slate-400">İmza: .........</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
