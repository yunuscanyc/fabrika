import React, { useState, useMemo } from 'react';
import {
  Package, Plus, Trash2, Search, X, Check, RefreshCw, Sparkles,
  Layers, Tag, Box, AlertCircle, CheckCircle2, ChevronRight, Filter,
  CornerDownRight, CheckSquare, PlusCircle, Wrench, ArrowRight
} from 'lucide-react';
import { MalzemeKatalogItem } from '../types';

interface MalzemeKatalogModalProps {
  katalog: MalzemeKatalogItem[];
  kategoriler: string[];
  onClose: () => void;
  onKatalogChanged: () => void;
  userRole?: 'admin' | 'ustabasi';
}

const BIRIMLER = [
  'Adet', 'Plaka', 'Takım', 'Metre (mt)', 'Metretül (mtül)',
  'Metrekare (m²)', 'Metreküp (m³)', 'Kg', 'Top', 'Boy (6mt)', 'Koli', 'Litre', 'Paket'
];

export const MalzemeKatalogModal: React.FC<MalzemeKatalogModalProps> = ({
  katalog,
  kategoriler,
  onClose,
  onKatalogChanged,
  userRole = 'admin'
}) => {
  // Arama & Filtre
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState<string>('Tumu');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Hiyerarşik Ekleme / Seçim Formu State'leri
  // Kategori -> Malzeme Adı -> Marka -> Model
  const [selectedKat, setSelectedKat] = useState<string>('');
  const [selectedMalzeme, setSelectedMalzeme] = useState<string>('');
  const [selectedMarka, setSelectedMarka] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [birim, setBirim] = useState<string>('Adet');
  const [aciklama, setAciklama] = useState<string>('');

  // Her seviye için inline "+ Yeni Ekle" modları
  const [isAddingKat, setIsAddingKat] = useState(false);
  const [customKatInput, setCustomKatInput] = useState('');

  const [isAddingMalzeme, setIsAddingMalzeme] = useState(false);
  const [customMalzemeInput, setCustomMalzemeInput] = useState('');

  const [isAddingMarka, setIsAddingMarka] = useState(false);
  const [customMarkaInput, setCustomMarkaInput] = useState('');

  const [isAddingModel, setIsAddingModel] = useState(false);
  const [customModelInput, setCustomModelInput] = useState('');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // 1. Tüm Kategoriler
  const allKategoriler = useMemo(() => {
    const list = new Set<string>();
    kategoriler.forEach(k => k && list.add(k.trim()));
    katalog.forEach(item => item.Kategori && list.add(item.Kategori.trim()));
    return Array.from(list).sort();
  }, [katalog, kategoriler]);

  // İlk yüklemede aktif kategoriyi ayarla
  const activeKat = selectedKat || allKategoriler[0] || '';

  // 2. Seçili Kategoriye ait Malzeme Adları (Unique)
  const availableMalzemeler = useMemo(() => {
    if (!activeKat) return [];
    const list = new Set<string>();
    katalog
      .filter(item => item.Kategori.toLowerCase() === activeKat.toLowerCase())
      .forEach(item => {
        if (item.MalzemeAdi && item.MalzemeAdi.trim()) {
          list.add(item.MalzemeAdi.trim());
        }
      });
    return Array.from(list).sort();
  }, [katalog, activeKat]);

  const activeMalzeme = selectedMalzeme || (availableMalzemeler.length > 0 ? availableMalzemeler[0] : '');

  // 3. Seçili Kategori + Malzemeye ait Markalar (Unique)
  const availableMarkalar = useMemo(() => {
    if (!activeKat || !activeMalzeme) return [];
    const list = new Set<string>();
    katalog
      .filter(
        item =>
          item.Kategori.toLowerCase() === activeKat.toLowerCase() &&
          item.MalzemeAdi.toLowerCase() === activeMalzeme.toLowerCase()
      )
      .forEach(item => {
        if (item.Marka && item.Marka.trim()) {
          list.add(item.Marka.trim());
        }
      });
    return Array.from(list).sort();
  }, [katalog, activeKat, activeMalzeme]);

  const activeMarka = selectedMarka || (availableMarkalar.length > 0 ? availableMarkalar[0] : '');

  // 4. Seçili Kategori + Malzeme + Markaya ait Modeller (Unique)
  const availableModeller = useMemo(() => {
    if (!activeKat || !activeMalzeme) return [];
    const list = new Set<string>();
    katalog
      .filter(
        item =>
          item.Kategori.toLowerCase() === activeKat.toLowerCase() &&
          item.MalzemeAdi.toLowerCase() === activeMalzeme.toLowerCase() &&
          (!activeMarka || !item.Marka || item.Marka.toLowerCase() === activeMarka.toLowerCase())
      )
      .forEach(item => {
        if (item.Model && item.Model.trim()) {
          list.add(item.Model.trim());
        }
      });
    return Array.from(list).sort();
  }, [katalog, activeKat, activeMalzeme, activeMarka]);

  // Model veya Malzeme değiştiğinde birim ve açıklamayı katalogdan otomatik eşle
  const handleSelectModel = (m: string) => {
    setSelectedModel(m);
    const matched = katalog.find(
      item =>
        item.Kategori.toLowerCase() === activeKat.toLowerCase() &&
        item.MalzemeAdi.toLowerCase() === activeMalzeme.toLowerCase() &&
        (item.Marka || '').toLowerCase() === (activeMarka || '').toLowerCase() &&
        (item.Model || '').toLowerCase() === m.toLowerCase()
    );
    if (matched) {
      if (matched.VarsayilanBirim) setBirim(matched.VarsayilanBirim);
      if (matched.Aciklama) setAciklama(matched.Aciklama);
    }
  };

  // Yeni Katalog Kaydı Gönder
  const handleSaveKatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalKat = (isAddingKat ? customKatInput : activeKat).trim();
    const finalMalzeme = (isAddingMalzeme ? customMalzemeInput : activeMalzeme).trim();
    const finalMarka = (isAddingMarka ? customMarkaInput : (selectedMarka || activeMarka || '')).trim();
    const finalModel = (isAddingModel ? customModelInput : (selectedModel || (availableModeller[0] || ''))).trim();

    if (!finalKat || !finalMalzeme) {
      showToast('error', 'Kategori ve Malzeme Adı zorunludur.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/malzeme-katalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Kategori: finalKat,
          MalzemeAdi: finalMalzeme,
          Marka: finalMarka || 'Standart',
          Model: finalModel,
          VarsayilanBirim: birim || 'Adet',
          Aciklama: aciklama.trim()
        })
      });

      if (res.ok) {
        showToast('success', `"${finalMalzeme} (${finalMarka || 'Standart'} - ${finalModel || '-'})" kataloğa kaydedildi.`);
        // Sıfırla ve seçimleri koru
        setIsAddingKat(false);
        setCustomKatInput('');
        setIsAddingMalzeme(false);
        setCustomMalzemeInput('');
        setIsAddingMarka(false);
        setCustomMarkaInput('');
        setIsAddingModel(false);
        setCustomModelInput('');
        
        setSelectedKat(finalKat);
        setSelectedMalzeme(finalMalzeme);
        setSelectedMarka(finalMarka);
        setSelectedModel(finalModel);

        onKatalogChanged();
      } else {
        const data = await res.json();
        showToast('error', data.error || 'Ekleme başarısız oldu.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Sunucu bağlantı hatası.');
    } finally {
      setActionLoading(false);
    }
  };

  // Öğe Sil
  const handleDeleteItem = async (item: MalzemeKatalogItem) => {
    if (!window.confirm(`"${item.MalzemeAdi} (${item.Marka || 'Genel'} - ${item.Model || '-'})" katalogdan silinsin mi?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/malzeme-katalog/${item.Id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showToast('success', `"${item.MalzemeAdi}" katalogdan silindi.`);
        onKatalogChanged();
      } else {
        showToast('error', 'Silme işlemi başarısız oldu.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Sunucu hatası.');
    } finally {
      setActionLoading(false);
    }
  };

  // Kategoriyi Komple Sil
  const handleDeleteCategory = async (katAdi: string) => {
    if (!window.confirm(`"${katAdi}" kategorisi ve bu kategoriye ait TÜM ürünler silinsin mi?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/malzeme-katalog/kategori/${encodeURIComponent(katAdi)}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showToast('success', `"${katAdi}" kategorisi silindi.`);
        if (selectedKat === katAdi) setSelectedKat('');
        if (filterKategori === katAdi) setFilterKategori('Tumu');
        onKatalogChanged();
      } else {
        showToast('error', 'Kategori silme başarısız oldu.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Sunucu hatası.');
    } finally {
      setActionLoading(false);
    }
  };

  // Varsayılan Mobilya Şablonuna Sıfırla
  const handleResetDefault = async () => {
    if (!window.confirm('Tüm özel mobilya kataloğu fabrika varsayılanlarına (zengin ürün, marka ve model) sıfırlanacak/güncellenecek. Onaylıyor musunuz?')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/malzeme-katalog/reset-varsayilan', {
        method: 'POST'
      });

      if (res.ok) {
        showToast('success', 'Katalog varsayılan zengin mobilya listesine başarıyla yüklendi.');
        onKatalogChanged();
      } else {
        showToast('error', 'Sıfırlama başarısız oldu.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Sunucu hatası.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtrelenmiş Katalog Listesi
  const filteredKatalog = useMemo(() => {
    return katalog.filter(item => {
      const matchesCat = filterKategori === 'Tumu' || item.Kategori.toLowerCase() === filterKategori.toLowerCase();
      if (!matchesCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.MalzemeAdi?.toLowerCase().includes(q) ||
        item.Kategori?.toLowerCase().includes(q) ||
        item.Marka?.toLowerCase().includes(q) ||
        item.Model?.toLowerCase().includes(q) ||
        item.Aciklama?.toLowerCase().includes(q)
      );
    });
  }, [katalog, filterKategori, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 my-auto max-h-[92vh] flex flex-col">
        {/* Üst Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-xs">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  Hiyerarşik Malzeme Kataloğu Yönetimi
                </h3>
                <span className="text-[10px] bg-blue-500/30 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
                  {katalog.length} Kayıtlı Ürün
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Kategori ➔ Malzeme Adı ➔ Marka ➔ Model hiyerarşisinde dinamik katalog yönetimi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Bildirimi */}
        {toastMsg && (
          <div className={`px-5 py-2 text-xs font-semibold flex items-center justify-between shrink-0 ${
            toastMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}>
            <div className="flex items-center gap-2">
              {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{toastMsg.text}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="opacity-80 hover:opacity-100 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* HİYERARŞİK COMBO İLE YÜKLENEN & EN ALT SEVİYEYE EKLEME FORMU */}
        {/* ======================================================== */}
        <div className="p-4 bg-gradient-to-r from-slate-50 via-blue-50/40 to-indigo-50/30 border-b border-slate-200 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                Hiyerarşik Ekleme &amp; Seçim Formu
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                (Her combonun yanındaki + butonundan yeni alt kategori tanımlayabilirsiniz)
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetDefault}
              disabled={actionLoading}
              title="Varsayılan zengin mobilya kataloğunu yeniden yükle"
              className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer bg-white"
            >
              <RefreshCw className={`w-3 h-3 text-slate-600 ${actionLoading ? 'animate-spin' : ''}`} />
              <span>Şablonu Sıfırla</span>
            </button>
          </div>

          <form onSubmit={handleSaveKatalogItem} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* 1. SEVİYE: KATEGORİ COMBO + EKLE BUTONU */}
              <div className="p-2.5 bg-white border border-blue-200 rounded-xl shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-blue-950 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    <span>Kategori</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingKat(!isAddingKat);
                      if (!isAddingKat) setCustomKatInput('');
                    }}
                    className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-0.5 bg-blue-100/70 hover:bg-blue-200/70 px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    {isAddingKat ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    <span>{isAddingKat ? 'Listeden' : '+ Ekle'}</span>
                  </button>
                </div>

                {isAddingKat ? (
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Yeni Kategori Adı..."
                    value={customKatInput}
                    onChange={(e) => setCustomKatInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <select
                    value={activeKat}
                    onChange={(e) => {
                      setSelectedKat(e.target.value);
                      setSelectedMalzeme('');
                      setSelectedMarka('');
                      setSelectedModel('');
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {allKategoriler.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* 2. SEVİYE: MALZEME ADI COMBO + EKLE BUTONU */}
              <div className="p-2.5 bg-white border border-indigo-200 rounded-xl shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-indigo-950 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    <span>Malzeme Adı</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingMalzeme(!isAddingMalzeme);
                      if (!isAddingMalzeme) setCustomMalzemeInput('');
                    }}
                    className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-0.5 bg-indigo-100/70 hover:bg-indigo-200/70 px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    {isAddingMalzeme ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    <span>{isAddingMalzeme ? 'Listeden' : '+ Ekle'}</span>
                  </button>
                </div>

                {isAddingMalzeme || availableMalzemeler.length === 0 ? (
                  <input
                    type="text"
                    required
                    placeholder={availableMalzemeler.length === 0 ? 'Bu kategoriye ilk malzemeyi yazın...' : 'Yeni Malzeme Adı...'}
                    value={isAddingMalzeme ? customMalzemeInput : (customMalzemeInput || selectedMalzeme)}
                    onChange={(e) => {
                      setIsAddingMalzeme(true);
                      setCustomMalzemeInput(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <select
                    value={activeMalzeme}
                    onChange={(e) => {
                      setSelectedMalzeme(e.target.value);
                      setSelectedMarka('');
                      setSelectedModel('');
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableMalzemeler.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* 3. SEVİYE: MARKA COMBO + EKLE BUTONU */}
              <div className="p-2.5 bg-white border border-teal-200 rounded-xl shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-teal-950 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                    <span>Marka (Tedarikçi)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingMarka(!isAddingMarka);
                      if (!isAddingMarka) setCustomMarkaInput('');
                    }}
                    className="text-[10px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-0.5 bg-teal-100/70 hover:bg-teal-200/70 px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    {isAddingMarka ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    <span>{isAddingMarka ? 'Listeden' : '+ Ekle'}</span>
                  </button>
                </div>

                {isAddingMarka || availableMarkalar.length === 0 ? (
                  <input
                    type="text"
                    placeholder={availableMarkalar.length === 0 ? 'Örn: Blum, Samet, Şişecam...' : 'Yeni Marka Adı...'}
                    value={isAddingMarka ? customMarkaInput : (customMarkaInput || selectedMarka)}
                    onChange={(e) => {
                      setIsAddingMarka(true);
                      setCustomMarkaInput(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <select
                    value={activeMarka}
                    onChange={(e) => {
                      setSelectedMarka(e.target.value);
                      setSelectedModel('');
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {availableMarkalar.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* 4. SEVİYE: MODEL COMBO + EKLE BUTONU */}
              <div className="p-2.5 bg-white border border-amber-200 rounded-xl shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-amber-950 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-bold">4</span>
                    <span>Model / Seri / Kod</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingModel(!isAddingModel);
                      if (!isAddingModel) setCustomModelInput('');
                    }}
                    className="text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-0.5 bg-amber-100/70 hover:bg-amber-200/70 px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    {isAddingModel ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    <span>{isAddingModel ? 'Listeden' : '+ Ekle'}</span>
                  </button>
                </div>

                {isAddingModel || availableModeller.length === 0 ? (
                  <input
                    type="text"
                    placeholder={availableModeller.length === 0 ? 'Örn: 110° Frenli, 50cm...' : 'Yeni Model / Seri Adı...'}
                    value={isAddingModel ? customModelInput : (customModelInput || selectedModel)}
                    onChange={(e) => {
                      setIsAddingModel(true);
                      setCustomModelInput(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <select
                    value={selectedModel || (availableModeller[0] || '')}
                    onChange={(e) => handleSelectModel(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {availableModeller.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Birim, Açıklama ve Kaydet Butonu */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <div className="w-32">
                <select
                  value={birim}
                  onChange={(e) => setBirim(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  title="Varsayılan Birim"
                >
                  {BIRIMLER.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Teknik açıklama veya standart not..."
                  value={aciklama}
                  onChange={(e) => setAciklama(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Kataloğa Kaydet / Güncelle</span>
              </button>
            </div>
          </form>
        </div>

        {/* ======================================================== */}
        {/* ARAMA VE FİLTRELEME ÇUBUĞU */}
        {/* ======================================================== */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ürün adı, marka, model veya kategori ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Tumu">Tüm Kategoriler ({katalog.length})</option>
              {allKategoriler.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ======================================================== */}
        {/* HİYERARŞİK KATALOG LİSTESİ / TABLOSU */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredKatalog.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Box className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">Aradığınız kriterde malzeme veya model bulunamadı.</p>
              <p className="text-[11px] text-slate-400">Yukarıdaki formdan yeni malzeme hiyerarşisi ekleyebilirsiniz.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredKatalog.map(item => (
                <div
                  key={item.Id}
                  className="p-3 bg-white hover:bg-blue-50/30 border border-slate-200 rounded-xl shadow-2xs transition-all flex items-start justify-between gap-2 group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Hiyerarşi Etiketleri */}
                    <div className="flex flex-wrap items-center gap-1 text-[11px]">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-bold">
                        {item.Kategori}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded font-extrabold">
                        {item.MalzemeAdi}
                      </span>
                      {item.Marka && (
                        <>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-900 rounded font-bold">
                            {item.Marka}
                          </span>
                        </>
                      )}
                      {item.Model && (
                        <>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">
                            {item.Model}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Birim & Açıklama */}
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        Birim: {item.VarsayilanBirim || 'Adet'}
                      </span>
                      {item.Aciklama && (
                        <span className="text-[11px] text-slate-500 truncate" title={item.Aciklama}>
                          {item.Aciklama}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Silme Butonu */}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item)}
                    className="opacity-60 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer shrink-0"
                    title="Bu malzeme modelini katalogdan sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Alt Bar */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Toplam {filteredKatalog.length} model listeleniyor
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
