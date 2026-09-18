import React, { useState } from 'react';
import {
  Package, Plus, Trash2, Search, X, Check, RefreshCw, Sparkles,
  Layers, Tag, Box, AlertCircle, CheckCircle2, ChevronRight, Filter
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
  const [selectedKategori, setSelectedKategori] = useState<string>('Tumu');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Yeni Ürün/Malzeme Form Alanları
  const [yeniKategori, setYeniKategori] = useState('');
  const [ozelKategoriModu, setOzelKategoriModu] = useState(false);
  const [yeniMalzemeAdi, setYeniMalzemeAdi] = useState('');
  const [yeniMarka, setYeniMarka] = useState('');
  const [yeniModel, setYeniModel] = useState('');
  const [yeniBirim, setYeniBirim] = useState('Adet');
  const [yeniAciklama, setYeniAciklama] = useState('');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Filtrelenmiş Katalog
  const filteredKatalog = katalog.filter(item => {
    const matchesCat = selectedKategori === 'Tumu' || item.Kategori.toLowerCase() === selectedKategori.toLowerCase();
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

  // Yeni Öğe Ekle
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalKategori = (ozelKategoriModu ? yeniKategori : (yeniKategori || kategoriler[0] || 'Genel')).trim();
    if (!finalKategori || !yeniMalzemeAdi.trim()) {
      showToast('error', 'Kategori ve Malzeme Adı zorunludur.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/malzeme-katalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Kategori: finalKategori,
          MalzemeAdi: yeniMalzemeAdi.trim(),
          Marka: yeniMarka.trim(),
          Model: yeniModel.trim(),
          VarsayilanBirim: yeniBirim,
          Aciklama: yeniAciklama.trim()
        })
      });

      if (res.ok) {
        showToast('success', `"${yeniMalzemeAdi}" başarıyla kataloğa eklendi.`);
        setYeniMalzemeAdi('');
        setYeniMarka('');
        setYeniModel('');
        setYeniAciklama('');
        setShowAddForm(false);
        onKatalogChanged();
      } else {
        const data = await res.json();
        showToast('error', data.error || 'Ekleme başarısız oldu.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Sunucu hatası.');
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
        if (selectedKategori === katAdi) setSelectedKategori('Tumu');
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
    if (!window.confirm('Tüm özel mobilya kataloğu fabrika varsayılanlarına (90+ zengin ürün, marka ve model) sıfırlanacak/güncellenecek. Onaylıyor musunuz?')) {
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

  // Kategori bazlı ürün sayıları
  const catCountMap = katalog.reduce((acc, item) => {
    acc[item.Kategori] = (acc[item.Kategori] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 my-6 max-h-[92vh] flex flex-col">
        {/* Üst Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Dinamik Malzeme, Marka &amp; Model Kataloğu
                </h3>
                <span className="text-[11px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-400/30">
                  {katalog.length} Hazır Ürün &amp; Model
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Ustabaşı ve yöneticilerin sipariş girişinde otomatik doldurulan hiyerarşik malzeme veritabanı
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Bildirimi */}
        {toastMsg && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between ${
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

        {/* Kontrol & Arama Araç Çubuğu */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ürün adı, marka, model veya kategori ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                if (!showAddForm && selectedKategori !== 'Tumu') {
                  setYeniKategori(selectedKategori);
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                showAddForm
                  ? 'bg-slate-700 text-white hover:bg-slate-800'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{showAddForm ? 'Formu Kapat' : 'Yeni Malzeme / Marka Ekle'}</span>
            </button>

            <button
              onClick={handleResetDefault}
              disabled={actionLoading}
              title="Varsayılan zengin mobilya kataloğunu yeniden yükle"
              className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer bg-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${actionLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Şablonu Sıfırla / Güncelle</span>
            </button>
          </div>
        </div>

        {/* HIZLI EKLEME FORMU PANELİ */}
        {showAddForm && (
          <form onSubmit={handleAddItem} className="p-5 bg-blue-50/60 border-b border-blue-200 animate-fadeIn space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Kataloğa Yeni Malzeme, Marka &amp; Model Tanımla
              </span>
              <span className="text-[11px] text-blue-700 font-medium">
                (Hem Ustabaşı hem Yönetici ekleyebilir, sipariş formuna otomatik yansır)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Kategori Seçimi veya Yeni Kategori Yazımı */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Kategori <span className="text-red-500">*</span></span>
                  <button
                    type="button"
                    onClick={() => {
                      setOzelKategoriModu(!ozelKategoriModu);
                      setYeniKategori('');
                    }}
                    className="text-[10px] text-blue-700 hover:underline cursor-pointer"
                  >
                    {ozelKategoriModu ? 'Listeden Seç' : '+ Yeni Kategori'}
                  </button>
                </label>
                {ozelKategoriModu ? (
                  <input
                    type="text"
                    required
                    placeholder="Yeni Kategori Adı (Örn: Aydınlatma)"
                    value={yeniKategori}
                    onChange={(e) => setYeniKategori(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <select
                    value={yeniKategori || (kategoriler[0] || '')}
                    onChange={(e) => setYeniKategori(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {kategoriler.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Ürün / Malzeme Adı */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Malzeme / Ürün Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Frenli Menteşe / Flotal Ayna"
                  value={yeniMalzemeAdi}
                  onChange={(e) => setYeniMalzemeAdi(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Marka */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Marka (Tedarikçi / Üretici)
                </label>
                <input
                  type="text"
                  placeholder="Örn: Blum, Samet, Şişecam, Hafele"
                  value={yeniMarka}
                  onChange={(e) => setYeniMarka(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Model / Ürün Kodu
                </label>
                <input
                  type="text"
                  placeholder="Örn: Clip Top Blumotion 110°"
                  value={yeniModel}
                  onChange={(e) => setYeniModel(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Varsayılan Sipariş Birimi
                </label>
                <select
                  value={yeniBirim}
                  onChange={(e) => setYeniBirim(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {BIRIMLER.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Teknik Açıklama / Standart Not
                </label>
                <input
                  type="text"
                  placeholder="Örn: Entegre frenli, gövde montaj tabanı dahil"
                  value={yeniAciklama}
                  onChange={(e) => setYeniAciklama(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Kataloğa Kaydet</span>
              </button>
            </div>
          </form>
        )}

        {/* Ana İçerik: Sol Kategori Filtresi & Sağ Ürün/Marka/Model Listesi */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-4 min-h-0">
          {/* Sol Kategori Menüsü */}
          <div className="p-3 bg-slate-50/70 border-r border-slate-200 overflow-y-auto space-y-1">
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1 mb-1">
              Kategoriler ({kategoriler.length})
            </span>

            <button
              onClick={() => setSelectedKategori('Tumu')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                selectedKategori === 'Tumu'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <Box className="w-3.5 h-3.5" />
                <span>Tüm Malzemeler</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                selectedKategori === 'Tumu' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600 font-semibold'
              }`}>
                {katalog.length}
              </span>
            </button>

            {kategoriler.map(cat => {
              const count = catCountMap[cat] || 0;
              const isSelected = selectedKategori.toLowerCase() === cat.toLowerCase();

              return (
                <div key={cat} className="group relative flex items-center">
                  <button
                    onClick={() => setSelectedKategori(cat)}
                    className={`flex-1 text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200/70'
                    }`}
                  >
                    <span className="truncate pr-1">{cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                      isSelected ? 'bg-white/20 text-white font-bold' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>

                  {/* Kategori Sil Butonu (Admin veya Ustabaşı) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(cat);
                    }}
                    title={`"${cat}" kategorisini ve tüm ürünlerini sil`}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 transition-opacity ml-1 rounded-lg hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Sağ Kolon: Katalog Tablosu & Kartları */}
          <div className="md:col-span-3 p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {selectedKategori === 'Tumu' ? 'Tüm Kayıtlı Malzemeler' : selectedKategori}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  ({filteredKatalog.length} kayıt)
                </span>
              </div>
            </div>

            {filteredKatalog.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <Box className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-700 mb-1">
                  Aradığınız kritere uygun malzeme veya marka bulunamadı.
                </p>
                <p className="text-[11px] text-slate-500 mb-3">
                  Yukarıdaki "Yeni Malzeme / Marka Ekle" butonu ile hemen sisteme yeni malzeme tanımlayabilirsiniz.
                </p>
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    if (selectedKategori !== 'Tumu') setYeniKategori(selectedKategori);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer"
                >
                  + Yeni Malzeme Ekle
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredKatalog.map(item => (
                  <div
                    key={item.Id}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {item.MalzemeAdi}
                        </span>

                        {item.Marka && (
                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Tag className="w-3 h-3 text-indigo-500" />
                            {item.Marka}
                          </span>
                        )}

                        {item.Model && (
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                            {item.Model}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.VarsayilanBirim || 'Adet'}
                        </span>
                      </div>

                      {item.Aciklama && (
                        <p className="text-[11px] text-slate-600 line-clamp-1">
                          {item.Aciklama}
                        </p>
                      )}

                      {selectedKategori === 'Tumu' && (
                        <span className="inline-block text-[10px] font-medium text-slate-500">
                          📁 {item.Kategori}
                        </span>
                      )}
                    </div>

                    {/* Silme Butonu */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleDeleteItem(item)}
                        title="Bu malzemeyi/modeli katalogdan sil"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Alt Kapatma Çubuğu */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Burada eklenen veya silinen tüm malzemeler sipariş oluştururken anında listelenir.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
