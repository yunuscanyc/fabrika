import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Building2, Plus, Trash2, Edit3, Save, Printer, Search, X, MapPin, 
  Calendar, Users, Truck, Wrench, ShieldCheck, FileText, CheckCircle2, 
  AlertCircle, ChevronRight, UserCheck, Clock, Navigation
} from 'lucide-react';
import { 
  SehirIciGorevlendirme, Personel, Proje 
} from '../types';
import { formatTarihTR, getBugunIso } from '../utils/dateUtils';

interface SehirIciGorevlendirmeViewProps {
  personeller: Personel[];
  projeler?: Proje[];
  initialPersonelId?: number | null;
}

export const SehirIciGorevlendirmeView: React.FC<SehirIciGorevlendirmeViewProps> = ({
  personeller,
  projeler = [],
  initialPersonelId = null
}) => {
  const [gorevler, setGorevler] = useState<SehirIciGorevlendirme[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [aramaMetni, setAramaMetni] = useState('');
  const [durumFiltre, setDurumFiltre] = useState<'Tümü' | 'Aktif' | 'Tamamlandı' | 'İptal'>('Aktif');

  // Modal State'leri
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [yazdirModalOpen, setYazdirModalOpen] = useState(false);
  const [seciliGorev, setSeciliGorev] = useState<SehirIciGorevlendirme | null>(null);

  // Form State'i
  const [formData, setFormData] = useState<Partial<SehirIciGorevlendirme>>({
    DokumanNo: '',
    Tarih: getBugunIso(),
    PersonelId: null,
    PersonelAdiSoyadi: '',
    TcKimlikNo: '',
    SicilNo: '',
    UnvaniDepartmani: '',
    IletisimTelefonu: '',
    GorevlendirenAmir: 'Şantiye & Montaj Koordinatörü',
    GorevTarihi: getBugunIso(),
    GorevSaati: '08:30 - 18:00',
    ProjeId: null,
    MusteriFirmaAdi: '',
    MontajAdresi: '',
    MusteriYetkilisiIletisim: '',
    YapilacakIsinTanimi: 'İmalat montajı, yerinde ölçülendirme ve servis/ayar işlemlerinin tamamlanması.',
    KullanilanSirketAraciPlakasi: '',
    CikisKm: '',
    DonusKm: '',
    TahsisEdilenEkipmanlar: 'Montaj alet çantası, akülü vidalama, lazer metre, KKD (Baret, Yelek, İş Ayakkabısı)',
    AvansMasrafLimiti: 0,
    IsgBeyanKabul: true,
    AmirAdiSoyadi: 'Fabrika Üretim / Montaj Sorumlusu',
    AmirUnvani: 'Montaj Şefi',
    IsciAdiSoyadi: '',
    IsciTcNo: '',
    Durum: 'Aktif'
  });

  const fetchGorevler = async () => {
    setYukleniyor(true);
    try {
      const res = await fetch('/api/sehir-ici-gorevler');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setGorevler(data);
        }
      }
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    fetchGorevler();
  }, []);

  // Eğer belirli bir personele özel açıldıysa form modali aç
  useEffect(() => {
    if (initialPersonelId) {
      const p = personeller.find(item => item.PersonelId === initialPersonelId);
      if (p) {
        yeniGorevAc(p);
      }
    }
  }, [initialPersonelId, personeller]);

  const yeniGorevAc = (oncedenSeciliPersonel?: Personel) => {
    const docNum = `GFR-${new Date().getFullYear()}-${String(gorevler.length + 1).padStart(3, '0')}`;
    let persData: Partial<SehirIciGorevlendirme> = {};

    if (oncedenSeciliPersonel) {
      persData = {
        PersonelId: oncedenSeciliPersonel.PersonelId,
        PersonelAdiSoyadi: oncedenSeciliPersonel.AdSoyad,
        TcKimlikNo: oncedenSeciliPersonel.TCKimlikNo || '',
        SicilNo: (oncedenSeciliPersonel as any).SicilNo || '',
        UnvaniDepartmani: oncedenSeciliPersonel.Gorev || oncedenSeciliPersonel.Departman || 'Montaj Personeli',
        IletisimTelefonu: oncedenSeciliPersonel.Telefon || '',
        IsciAdiSoyadi: oncedenSeciliPersonel.AdSoyad,
        IsciTcNo: oncedenSeciliPersonel.TCKimlikNo || ''
      };
    }

    setFormData({
      DokumanNo: docNum,
      Tarih: getBugunIso(),
      PersonelId: null,
      PersonelAdiSoyadi: '',
      TcKimlikNo: '',
      SicilNo: '',
      UnvaniDepartmani: '',
      IletisimTelefonu: '',
      GorevlendirenAmir: 'Şantiye & Montaj Koordinatörü',
      GorevTarihi: getBugunIso(),
      GorevSaati: '08:30 - 18:00',
      ProjeId: null,
      MusteriFirmaAdi: '',
      MontajAdresi: '',
      MusteriYetkilisiIletisim: '',
      YapilacakIsinTanimi: 'İmalat montajı, yerinde ölçülendirme ve servis/ayar işlemlerinin tamamlanması.',
      KullanilanSirketAraciPlakasi: '',
      CikisKm: '',
      DonusKm: '',
      TahsisEdilenEkipmanlar: 'Montaj alet çantası, akülü vidalama, lazer metre, KKD (Baret, Yelek, İş Ayakkabısı)',
      AvansMasrafLimiti: 0,
      IsgBeyanKabul: true,
      AmirAdiSoyadi: 'Fabrika Üretim / Montaj Sorumlusu',
      AmirUnvani: 'Montaj Şefi',
      IsciAdiSoyadi: '',
      IsciTcNo: '',
      Durum: 'Aktif',
      ...persData
    });
    setSeciliGorev(null);
    setFormModalOpen(true);
  };

  const duzenleGorevAc = (gorev: SehirIciGorevlendirme) => {
    setSeciliGorev(gorev);
    setFormData({ ...gorev });
    setFormModalOpen(true);
  };

  const kaydetGorev = async () => {
    if (!formData.PersonelAdiSoyadi?.trim()) {
      alert('Lütfen görevlendirilen personeli seçiniz veya adını yazınız.');
      return;
    }
    if (!formData.MusteriFirmaAdi?.trim()) {
      alert('Lütfen müşteri/firma veya şantiye adını giriniz.');
      return;
    }

    try {
      const isNew = !seciliGorev?.GorevId;
      const url = isNew ? '/api/sehir-ici-gorevler' : `/api/sehir-ici-gorevler/${seciliGorev.GorevId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        await fetchGorevler();
        setFormModalOpen(false);
      } else {
        const err = await res.json();
        alert('Hata: ' + (err.error || 'Kaydedilemedi.'));
      }
    } catch (e: any) {
      alert('Sunucu hatası: ' + e.message);
    }
  };

  const silGorev = async (id: string) => {
    if (!window.confirm('Bu şehir içi görevlendirme formunu silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/sehir-ici-gorevler/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchGorevler();
        if (seciliGorev?.GorevId === id) {
          setSeciliGorev(null);
          setYazdirModalOpen(false);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePersonelSecim = (personelIdStr: string) => {
    const id = parseInt(personelIdStr, 10);
    const p = personeller.find(item => item.PersonelId === id);
    if (p) {
      setFormData(prev => ({
        ...prev,
        PersonelId: p.PersonelId,
        PersonelAdiSoyadi: p.AdSoyad,
        TcKimlikNo: p.TCKimlikNo || '',
        SicilNo: (p as any).SicilNo || '',
        UnvaniDepartmani: p.Gorev || p.Departman || 'Montaj Personeli',
        IletisimTelefonu: p.Telefon || '',
        IsciAdiSoyadi: p.AdSoyad,
        IsciTcNo: p.TCKimlikNo || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        PersonelId: null
      }));
    }
  };

  const handleProjeSecim = (projeIdStr: string) => {
    const id = parseInt(projeIdStr, 10);
    const proj = projeler.find(p => p.ProjeId === id);
    if (proj) {
      setFormData(prev => ({
        ...prev,
        ProjeId: proj.ProjeId,
        MusteriFirmaAdi: proj.MusteriFirma || proj.ProjeAdi,
        MontajAdresi: proj.SantiyeAdresi || prev.MontajAdresi || ''
      }));
    }
  };

  // Filtreleme
  const filtrelenmisGorevler = useMemo(() => {
    return gorevler.filter(g => {
      const matchesDurum = durumFiltre === 'Tümü' || g.Durum === durumFiltre;
      const txt = aramaMetni.toLowerCase();
      const matchesSearch = !txt || 
        g.DokumanNo.toLowerCase().includes(txt) ||
        g.PersonelAdiSoyadi.toLowerCase().includes(txt) ||
        g.MusteriFirmaAdi.toLowerCase().includes(txt) ||
        g.MontajAdresi.toLowerCase().includes(txt) ||
        (g.TcKimlikNo && g.TcKimlikNo.includes(txt));
      return matchesDurum && matchesSearch;
    });
  }, [gorevler, durumFiltre, aramaMetni]);

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Aksiyon Çubuğu */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏙️</span>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
              Şehir İçi Görevlendirme &amp; Montaj Formları
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800">
              GFR / Servis
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Müşteri montajları, yerinde servis, araç &amp; avans tahsisleri ve resmi görevlendirme form çıktıları.
          </p>
        </div>

        <button
          onClick={() => yeniGorevAc()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-cyan-900/30 transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Görevlendirme Formu</span>
        </button>
      </div>

      {/* Arama & Filtreleme Barı */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Personel, müşteri veya form no ara..."
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-cyan-500"
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

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['Aktif', 'Tamamlandı', 'İptal', 'Tümü'] as const).map((durum) => (
            <button
              key={durum}
              onClick={() => setDurumFiltre(durum)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                durumFiltre === durum
                  ? durum === 'Aktif'
                    ? 'bg-cyan-600 text-white shadow'
                    : durum === 'Tamamlandı'
                    ? 'bg-emerald-600 text-white shadow'
                    : durum === 'İptal'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {durum} {durum === 'Aktif' ? `(${gorevler.filter(g => g.Durum === 'Aktif').length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Liste Görünümü */}
      {yukleniyor ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Görevlendirme formları yükleniyor...
        </div>
      ) : filtrelenmisGorevler.length === 0 ? (
        <div className="p-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800 text-cyan-400 flex items-center justify-center mx-auto text-xl">
            🏙️
          </div>
          <h4 className="text-base font-bold text-white">Kayıtlı Şehir İçi Görevlendirme Bulunamadı</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {aramaMetni 
              ? 'Arama kriterlerinize uygun form kaydı bulunamadı.' 
              : 'Henüz şehir içi montaj veya görevlendirme formu düzenlenmemiş. Sağ üstteki butona tıklayarak yeni form oluşturabilirsiniz.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrelenmisGorevler.map((gorev) => (
            <div
              key={gorev.GorevId}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4.5 flex flex-col justify-between gap-4 transition shadow-md group relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700">
                    {gorev.DokumanNo}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      gorev.Durum === 'Aktif'
                        ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                        : gorev.Durum === 'Tamamlandı'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border-rose-800'
                    }`}
                  >
                    {gorev.Durum}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{gorev.PersonelAdiSoyadi}</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {gorev.UnvaniDepartmani || 'Personel'} {gorev.TcKimlikNo ? `• TC: ${gorev.TcKimlikNo}` : ''}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="font-semibold text-white truncate">{gorev.MusteriFirmaAdi}</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed">{gorev.MontajAdresi}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 pt-1 border-t border-slate-800/60">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{formatTarihTR(gorev.GorevTarihi)} • {gorev.GorevSaati || 'Gün boyu'}</span>
                  </div>
                  {gorev.KullanilanSirketAraciPlakasi && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Truck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Plaka: {gorev.KullanilanSirketAraciPlakasi} {gorev.CikisKm ? `(Çıkış: ${gorev.CikisKm} km)` : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Aksiyon Butonları */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => {
                    setSeciliGorev(gorev);
                    setYazdirModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                  title="Resmi Form Çıktısı Al"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Formu Yazdır</span>
                </button>

                <button
                  onClick={() => duzenleGorevAc(gorev)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                  title="Düzenle"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => silGorev(gorev.GorevId)}
                  className="p-2 bg-slate-800 hover:bg-rose-950/80 hover:text-rose-400 text-slate-400 rounded-xl transition cursor-pointer"
                  title="Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================== */}
      {/* FORM DÜZENLEME & YENİ GÖREV MODALI */}
      {/* ============================================================== */}
      {formModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setFormModalOpen(false); }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto animate-in fade-in"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {seciliGorev ? 'Şehir İçi Görevlendirme Formunu Düzenle' : 'Yeni Şehir İçi Görevlendirme Formu'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Form No: <strong className="text-cyan-300 font-mono">{formData.DokumanNo}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-6">
              {/* 1. BÖLÜM: PERSONEL VE AMİR BİLGİLERİ */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <Users className="w-4 h-4" />
                  1. Görevlendirilen Personel &amp; Amir Bilgileri
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Kayıtlı Personelden Seç:
                    </label>
                    <select
                      value={formData.PersonelId || ''}
                      onChange={(e) => handlePersonelSecim(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    >
                      <option value="">-- Personel Seçiniz veya Manuel Yazınız --</option>
                      {personeller.map(p => (
                        <option key={p.PersonelId} value={p.PersonelId}>
                          {p.AdSoyad} ({p.Gorev || p.Departman || 'Personel'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Personel Adı Soyadı *
                    </label>
                    <input
                      type="text"
                      value={formData.PersonelAdiSoyadi || ''}
                      onChange={(e) => setFormData({ ...formData, PersonelAdiSoyadi: e.target.value, IsciAdiSoyadi: e.target.value })}
                      placeholder="Ad Soyad"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      T.C. Kimlik No
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      value={formData.TcKimlikNo || ''}
                      onChange={(e) => setFormData({ ...formData, TcKimlikNo: e.target.value, IsciTcNo: e.target.value })}
                      placeholder="11 haneli T.C. No"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Unvanı / Departmanı
                    </label>
                    <input
                      type="text"
                      value={formData.UnvaniDepartmani || ''}
                      onChange={(e) => setFormData({ ...formData, UnvaniDepartmani: e.target.value })}
                      placeholder="örn. Montaj Ustası / Şantiye Ekibi"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      İletişim Telefonu
                    </label>
                    <input
                      type="text"
                      value={formData.IletisimTelefonu || ''}
                      onChange={(e) => setFormData({ ...formData, IletisimTelefonu: e.target.value })}
                      placeholder="05xx xxx xx xx"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Görevlendiren Amir
                    </label>
                    <input
                      type="text"
                      value={formData.GorevlendirenAmir || ''}
                      onChange={(e) => setFormData({ ...formData, GorevlendirenAmir: e.target.value })}
                      placeholder="Amir Adı Soyadı & Unvanı"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Görev Tarihi
                    </label>
                    <input
                      type="date"
                      value={formData.GorevTarihi || getBugunIso()}
                      onChange={(e) => setFormData({ ...formData, GorevTarihi: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Görev / Mesai Saatleri
                    </label>
                    <input
                      type="text"
                      value={formData.GorevSaati || ''}
                      onChange={(e) => setFormData({ ...formData, GorevSaati: e.target.value })}
                      placeholder="örn. 08:30 - 18:00"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. BÖLÜM: MONTAJ VE LOKASYON BİLGİLERİ */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <MapPin className="w-4 h-4" />
                  2. Montaj &amp; Müşteri Lokasyon Bilgileri
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {projeler.length > 0 && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Kayıtlı Projelerden Aktar (İsteğe Bağlı):
                      </label>
                      <select
                        value={formData.ProjeId || ''}
                        onChange={(e) => handleProjeSecim(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                      >
                        <option value="">-- Proje Seçiniz veya Manuel Yazınız --</option>
                        {projeler.map(pr => (
                          <option key={pr.ProjeId} value={pr.ProjeId}>
                            {pr.ProjeAdi} {pr.MusteriFirma ? `(${pr.MusteriFirma})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Müşteri / Firma / Proje Adı *
                    </label>
                    <input
                      type="text"
                      value={formData.MusteriFirmaAdi || ''}
                      onChange={(e) => setFormData({ ...formData, MusteriFirmaAdi: e.target.value })}
                      placeholder="örn. Zorlu Center Ofis Projesi"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Müşteri Yetkilisi &amp; İletişim
                    </label>
                    <input
                      type="text"
                      value={formData.MusteriYetkilisiIletisim || ''}
                      onChange={(e) => setFormData({ ...formData, MusteriYetkilisiIletisim: e.target.value })}
                      placeholder="Ad Soyad / Tel"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Montaj / Şantiye Açık Adresi *
                    </label>
                    <textarea
                      rows={2}
                      value={formData.MontajAdresi || ''}
                      onChange={(e) => setFormData({ ...formData, MontajAdresi: e.target.value })}
                      placeholder="Şantiye adresi, kat, daire veya montaj mevkii..."
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Yapılacak İşin Tanımı &amp; Kapsamı
                    </label>
                    <textarea
                      rows={2}
                      value={formData.YapilacakIsinTanimi || ''}
                      onChange={(e) => setFormData({ ...formData, YapilacakIsinTanimi: e.target.value })}
                      placeholder="Montajı yapılacak ürünler, imalat detayları..."
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. BÖLÜM: ARAÇ, EKİPMAN & İSG */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <Truck className="w-4 h-4" />
                  3. Araç, Ekipman, Avans &amp; İSG
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Şirket Aracı Plakası
                    </label>
                    <input
                      type="text"
                      value={formData.KullanilanSirketAraciPlakasi || ''}
                      onChange={(e) => setFormData({ ...formData, KullanilanSirketAraciPlakasi: e.target.value })}
                      placeholder="örn. 34 AB 1234"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Çıkış Kilometresi (KM)
                    </label>
                    <input
                      type="text"
                      value={formData.CikisKm || ''}
                      onChange={(e) => setFormData({ ...formData, CikisKm: e.target.value })}
                      placeholder="örn. 142.500"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Dönüş Kilometresi (KM)
                    </label>
                    <input
                      type="text"
                      value={formData.DonusKm || ''}
                      onChange={(e) => setFormData({ ...formData, DonusKm: e.target.value })}
                      placeholder="örn. 142.580"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tahsis Edilen Ekipmanlar &amp; El Aletleri
                    </label>
                    <input
                      type="text"
                      value={formData.TahsisEdilenEkipmanlar || ''}
                      onChange={(e) => setFormData({ ...formData, TahsisEdilenEkipmanlar: e.target.value })}
                      placeholder="Matkap, şarjlı vidalama, lazer hizalama vb."
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Avans / Masraf Limiti (₺)
                    </label>
                    <input
                      type="number"
                      value={formData.AvansMasrafLimiti || 0}
                      onChange={(e) => setFormData({ ...formData, AvansMasrafLimiti: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="isgCheck"
                    checked={formData.IsgBeyanKabul}
                    onChange={(e) => setFormData({ ...formData, IsgBeyanKabul: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                  <label htmlFor="isgCheck" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
                    <strong className="text-white">6331 Sayılı İSG Kanunu Uyumu:</strong> Personel, montaj ve çalışma alanında gerekli kişisel koruyucu donanımlarını (baret, yelek, iş ayakkabısı vb.) eksiksiz kullanacağını ve iş güvenliği kurallarına riayet edeceğini taahhüt eder.
                  </label>
                </div>
              </div>

              {/* 4. DURUM VE DÖKÜMAN BİLGİSİ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Formun Durumu
                  </label>
                  <select
                    value={formData.Durum || 'Aktif'}
                    onChange={(e) => setFormData({ ...formData, Durum: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                  >
                    <option value="Aktif">Aktif (Görevde / Beklemede)</option>
                    <option value="Tamamlandı">Tamamlandı (Montaj Bitti)</option>
                    <option value="İptal">İptal Edildi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Düzenleme Tarihi
                  </label>
                  <input
                    type="date"
                    value={formData.Tarih || getBugunIso()}
                    onChange={(e) => setFormData({ ...formData, Tarih: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm p-2.5 rounded-xl focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 z-10">
              <button
                onClick={() => setFormModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={kaydetGorev}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-900/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RESMİ MATBU YAZDIRMA (A4) MODALI */}
      {/* ============================================================== */}
      {yazdirModalOpen && seciliGorev && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setYazdirModalOpen(false); }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-2 sm:p-6 flex items-center justify-center overflow-y-auto animate-in fade-in sehirici-print-overlay"
        >
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
                min-height: 0 !important;
                overflow: visible !important;
              }
              #root {
                display: none !important;
              }
              .sehirici-print-overlay {
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
              .sehirici-modal-wrapper {
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                border-radius: 0 !important;
                overflow: visible !important;
                max-height: none !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .sehirici-preview-container {
                position: static !important;
                display: block !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
              }
              .sehirici-print-content {
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                min-height: 0 !important;
                background: white !important;
                color: black !important;
                padding: 10mm 14mm !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
              }
              .no-print, .no-print * {
                display: none !important;
              }
            }
          `}} />
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden sehirici-modal-wrapper">
            {/* Yazdırma Kontrol Barı */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between no-print shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Şehir İçi Görevlendirme &amp; Montaj Formu (A4 Önizleme)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Yazdır / PDF Kaydet</span>
                </button>
                <button
                  onClick={() => setYazdirModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 Kağıt Önizleme Alanı */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-800/60 flex justify-center sehirici-preview-container">
              <div 
                id="printArea"
                className="bg-white text-slate-900 p-8 sm:p-10 shadow-2xl rounded-sm w-full max-w-[210mm] min-h-[297mm] text-xs font-sans leading-normal flex flex-col justify-between sehirici-print-content print:p-6 print:shadow-none print:w-full print:m-0"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                <div>
                  {/* Matbu Başlık ve Logo Alanı */}
                  <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-center justify-between">
                    <div>
                      <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900">
                        RENDE İNŞAAT MOBİLYA TURİZM SAN. VE TİC. A.Ş.
                      </h1>
                      <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-900 mt-0.5">
                        ŞEHİR İÇİ GÖREVLENDİRME &amp; MONTAJ / SERVİS FORMU
                      </h2>
                      <p className="text-[10px] text-slate-600">
                        Fabrika Üretim, Sevkiyat &amp; Montaj Koordinatörlüğü
                      </p>
                    </div>

                    <div className="text-right border border-slate-900 p-2 rounded bg-slate-50 text-[10px] space-y-0.5 min-w-[150px]">
                      <div><strong>DÖKÜMAN NO:</strong> {seciliGorev.DokumanNo}</div>
                      <div><strong>TANZİM TARİHİ:</strong> {formatTarihTR(seciliGorev.Tarih)}</div>
                      <div><strong>REVİZYON:</strong> 01 / 2026</div>
                    </div>
                  </div>

                  {/* 1. BÖLÜM: PERSONEL VE GÖREV BİLGİLERİ */}
                  <div className="mb-4">
                    <div className="bg-slate-200 px-3 py-1 font-bold text-[11px] uppercase border border-slate-900 mb-1 flex items-center justify-between">
                      <span>1. PERSONEL VE GÖREV BİLGİLERİ</span>
                      <span className="text-[9px] font-normal">4857 Sayılı İş Kanunu Esasları</span>
                    </div>
                    <table className="w-full border-collapse border border-slate-900 text-[10px]">
                      <tbody>
                        <tr className="border-b border-slate-400">
                          <td className="w-1/4 p-1.5 font-bold bg-slate-100 border-r border-slate-400">Görevli Personel:</td>
                          <td className="w-1/4 p-1.5 font-bold uppercase border-r border-slate-400">{seciliGorev.PersonelAdiSoyadi}</td>
                          <td className="w-1/4 p-1.5 font-bold bg-slate-100 border-r border-slate-400">T.C. Kimlik No:</td>
                          <td className="w-1/4 p-1.5 font-mono">{seciliGorev.TcKimlikNo || '-'}</td>
                        </tr>
                        <tr className="border-b border-slate-400">
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-400">Departman / Unvan:</td>
                          <td className="p-1.5 border-r border-slate-400">{seciliGorev.UnvaniDepartmani || 'Montaj Ustası'}</td>
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-400">İletişim Tel:</td>
                          <td className="p-1.5">{seciliGorev.IletisimTelefonu || '-'}</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-400">Görev Tarihi &amp; Saati:</td>
                          <td className="p-1.5 font-bold border-r border-slate-400">
                            {formatTarihTR(seciliGorev.GorevTarihi)} ({seciliGorev.GorevSaati || 'Gün Boyu'})
                          </td>
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-400">Görevlendiren Amir:</td>
                          <td className="p-1.5">{seciliGorev.GorevlendirenAmir || 'Montaj Koordinatörü'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 2. BÖLÜM: MONTAJ VE MÜŞTERİ BİLGİLERİ */}
                  <div className="mb-4">
                    <div className="bg-slate-200 px-3 py-1 font-bold text-[11px] uppercase border border-slate-900 mb-1">
                      2. MONTAJ VE MÜŞTERİ LOKASYON BİLGİLERİ
                    </div>
                    <table className="w-full border-collapse border border-slate-900 text-[10px]">
                      <tbody>
                        <tr className="border-b border-slate-400">
                          <td className="w-1/4 p-1.5 font-bold bg-slate-100 border-r border-slate-400">Müşteri / Şantiye:</td>
                          <td className="w-3/4 p-1.5 font-bold uppercase" colSpan={3}>
                            {seciliGorev.MusteriFirmaAdi}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-400">
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-400">Montaj Adresi:</td>
                          <td className="p-1.5" colSpan={3}>
                            {seciliGorev.MontajAdresi}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-400">
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-400">Müşteri Yetkilisi &amp; Tel:</td>
                          <td className="p-1.5" colSpan={3}>
                            {seciliGorev.MusteriYetkilisiIletisim || 'Yerinde teslim yetkilisi'}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-400">Yapılacak İş / Kapsam:</td>
                          <td className="p-1.5 leading-relaxed" colSpan={3}>
                            {seciliGorev.YapilacakIsinTanimi || 'Ahşap dekorasyon & mobilya montajı'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 3. BÖLÜM: ARAÇ, EKİPMAN VE AVANS BİLGİLERİ */}
                  <div className="mb-4">
                    <div className="bg-slate-200 px-3 py-1 font-bold text-[11px] uppercase border border-slate-900 mb-1">
                      3. ARAÇ, EKİPMAN &amp; MASRAF BİLGİLERİ
                    </div>
                    <table className="w-full border-collapse border border-slate-900 text-[10px]">
                      <tbody>
                        <tr className="border-b border-slate-400">
                          <td className="w-1/4 p-1.5 font-bold bg-slate-100 border-r border-slate-400">Tahsis Edilen Araç:</td>
                          <td className="w-1/4 p-1.5 font-bold border-r border-slate-400">{seciliGorev.KullanilanSirketAraciPlakasi || 'Yok / Toplu Ulaşım'}</td>
                          <td className="w-1/4 p-1.5 font-bold bg-slate-100 border-r border-slate-400">Çıkış / Dönüş KM:</td>
                          <td className="w-1/4 p-1.5">{seciliGorev.CikisKm || '...'} KM / {seciliGorev.DonusKm || '...'} KM</td>
                        </tr>
                        <tr className="border-b border-slate-400">
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-400">Tahsis Edilen Ekipmanlar:</td>
                          <td className="p-1.5" colSpan={3}>{seciliGorev.TahsisEdilenEkipmanlar || 'Standart montaj el aletleri seti'}</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-400">Verilen Avans Limiti:</td>
                          <td className="p-1.5 font-bold text-slate-900" colSpan={3}>
                            {seciliGorev.AvansMasrafLimiti ? `${seciliGorev.AvansMasrafLimiti.toLocaleString('tr-TR')} ₺` : '0 ₺ (Faturalı masraf esası)'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 4. İSG VE YASAL TAAHHÜT METNİ */}
                  <div className="border border-slate-900 p-3 bg-slate-50 text-[9px] leading-relaxed mb-6 space-y-1">
                    <div className="font-bold uppercase text-[10px] text-slate-900">
                      İŞ SAĞLIĞI VE GÜVENLİĞİ (İSG) &amp; ŞANTİYE ÇALIŞMA TAAHHÜTNAMESİ
                    </div>
                    <p>
                      Yukarıda kimlik ve görev bilgileri yazılı personel, görevlendirildiği montaj ve çalışma mahallinde yürürlükteki <strong>6331 Sayılı İş Sağlığı ve Güvenliği Kanunu</strong> ve bağlı yönetmeliklere, şantiye güvenlik kurallarına ve işverenin talimatlarına eksiksiz uyacağını, kendisine teslim edilen kişisel koruyucu donanımları (baret, fosforlu yelek, çelik burunlu iş ayakkabısı, koruyucu gözlük vb.) kullanacağını, çalışma mahallinde tespit edilen tehlikeli durumları amirine derhal bildireceğini beyan, kabul ve taahhüt eder.
                    </p>
                  </div>
                </div>

                {/* 5. İMZA VE ONAY ALANI (Yalnızca Görevlendirme Yapan ve Görevlendirme Yapılan) */}
                <div className="pt-2">
                  <div className="grid grid-cols-2 gap-8 border-t-2 border-slate-900 pt-3 text-[10px] text-center">
                    <div className="space-y-12">
                      <div>
                        <strong className="block text-[11px] text-slate-900">GÖREVLENDİRME YAPAN (AMİR)</strong>
                        <p className="text-[9px] text-slate-600 mt-0.5">{seciliGorev.GorevlendirenAmir || 'Montaj Şefi / Yetkili'}</p>
                      </div>
                      <div className="border-t border-slate-400 pt-1 text-[9px] text-slate-500">
                        İmza / Kaşe
                      </div>
                    </div>

                    <div className="space-y-12">
                      <div>
                        <strong className="block text-[11px] text-slate-900">GÖREVLENDİRME YAPILAN (PERSONEL)</strong>
                        <p className="text-[9px] text-slate-600 mt-0.5">{seciliGorev.PersonelAdiSoyadi}</p>
                      </div>
                      <div className="border-t border-slate-400 pt-1 text-[9px] text-slate-500">
                        İmza (Tebellüğ Eden)
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-[8px] text-slate-500 mt-4 border-t border-slate-200 pt-2">
                    Bu belge, 4857 Sayılı İş Kanunu ve şirket içi operasyonel prosedürler gereğince 2 nüsha olarak tanzim edilmiş olup, 1 nüshası İnsan Kaynakları özlük dosyasında saklanır.
                  </div>
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
