import React, { useState, useEffect, useRef } from 'react';
import { Hatirlatici } from '../types';
import { formatTarihTR } from '../utils/dateUtils';
import { 
  Bell, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Trash2, 
  Clock,
  Check,
  X,
  Image as ImageIcon,
  Paperclip,
  Upload,
  Download,
  Eye,
  FileText,
  AlertTriangle,
  FileCheck
} from 'lucide-react';

interface HatirlaticilarViewProps {
  hatirlaticilar: Hatirlatici[];
  onAddHatirlatici: (h: Partial<Hatirlatici>) => void;
  onToggleTamamlandi: (id: number, tamamlandi: boolean) => void;
  onUpdateHatirlatici?: (id: number, fields: Partial<Hatirlatici>) => void;
  onDeleteHatirlatici: (id: number) => void;
}

export const HatirlaticilarView: React.FC<HatirlaticilarViewProps> = ({
  hatirlaticilar,
  onAddHatirlatici,
  onToggleTamamlandi,
  onUpdateHatirlatici,
  onDeleteHatirlatici
}) => {
  const [modalAcik, setModalAcik] = useState(false);
  const [secilenHatirlatici, setSecilenHatirlatici] = useState<Hatirlatici | null>(null);
  const [filtre, setFiltre] = useState<'hepsi' | 'bugun' | 'tamamlanmayan' | 'tamamlanan'>('hepsi');
  const [doubleClickHintId, setDoubleClickHintId] = useState<number | null>(null);
  const clickTrackerRef = useRef<{ id: number; time: number } | null>(null);
  const lastToggleRef = useRef<{ id: number; time: number } | null>(null);

  const executeToggle = (h: Hatirlatici) => {
    if (!onToggleTamamlandi) return;
    const now = Date.now();
    // 700ms debounce koruması
    if (lastToggleRef.current && lastToggleRef.current.id === h.Id && now - lastToggleRef.current.time < 700) {
      return;
    }
    lastToggleRef.current = { id: h.Id, time: now };
    clickTrackerRef.current = null;
    setDoubleClickHintId(null);
    onToggleTamamlandi(h.Id, !h.TamamlandiMi);
  };

  const handleCircleClick = (e: React.MouseEvent, h: Hatirlatici) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onToggleTamamlandi) return;

    const now = Date.now();

    // 1. Tarayıcı yerel çift tıklama
    if (e.detail === 2) {
      executeToggle(h);
      return;
    }

    // 2. Çift tıklama / çift dokunma zamanlama aralığı (100ms - 500ms)
    const prev = clickTrackerRef.current;
    if (prev && prev.id === h.Id && now - prev.time >= 100 && now - prev.time <= 500) {
      executeToggle(h);
      return;
    }

    // 3. Tek tıklama -> ASLA TAMAMLAMA! Sadece uyarı gösterilir
    clickTrackerRef.current = { id: h.Id, time: now };
    setDoubleClickHintId(h.Id);
    setTimeout(() => {
      setDoubleClickHintId(prevId => (prevId === h.Id ? null : prevId));
    }, 2200);
  };

  const handleCircleDoubleClick = (e: React.MouseEvent, h: Hatirlatici) => {
    e.stopPropagation();
    e.preventDefault();
    executeToggle(h);
  };
  
  // Yeni Ekleme Formu için Ekler (Belgeler)
  const [yeniBelgeler, setYeniBelgeler] = useState<any[]>([]);
  
  // Detay/Güncelleme Formu için State'ler
  const [editBaslik, setEditBaslik] = useState('');
  const [editAciklama, setEditAciklama] = useState('');
  const [editTarih, setEditTarih] = useState('');
  const [editKategori, setEditKategori] = useState<any>('Gorev');
  const [editOnem, setEditOnem] = useState<any>('Normal');
  const [editBelgeler, setEditBelgeler] = useState<any[]>([]);

  // Fotoğraf Lightbox/Önizleme State
  const [lightboxDosya, setLightboxDosya] = useState<any | null>(null);

  const bugunStr = new Date().toISOString().split('T')[0];

  // Seçilen hatırlatıcı değiştiğinde güncelleme state'lerini doldur
  useEffect(() => {
    if (secilenHatirlatici) {
      setEditBaslik(secilenHatirlatici.Baslik);
      setEditAciklama(secilenHatirlatici.Aciklama || '');
      setEditTarih(secilenHatirlatici.Tarih);
      setEditKategori(secilenHatirlatici.Kategori);
      setEditOnem(secilenHatirlatici.OnemDerecesi);
      setEditBelgeler(secilenHatirlatici.Belgeler || []);
    } else {
      setEditBelgeler([]);
    }
  }, [secilenHatirlatici]);

  // Renk ve Durum Ayrımı (Canlı Açık Mavi standardı)
  const durumBelirle = (h: Hatirlatici) => {
    if (h.TamamlandiMi) {
      return {
        tur: 'tamamlandi',
        renk: 'bg-emerald-50/40 border-emerald-200/90 text-slate-700 hover:border-emerald-300',
        etiket: 'Tamamlandı',
        badge: 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
      };
    }
    if (h.Tarih < bugunStr) {
      return {
        tur: 'gecikti',
        renk: 'bg-red-50/70 border-red-200 text-red-900 hover:border-red-300 shadow-sm',
        etiket: 'Gecikmiş',
        badge: 'bg-red-200 text-red-800'
      };
    }
    if (h.Tarih === bugunStr) {
      return {
        tur: 'bugun',
        renk: 'bg-sky-50/95 border-sky-300 text-sky-950 shadow-sm ring-1 ring-sky-200 hover:bg-sky-100/50',
        etiket: 'Bugün',
        badge: 'bg-sky-200 text-sky-900 font-extrabold border border-sky-300'
      };
    }
    return {
      tur: 'yaklasan',
      renk: 'bg-amber-50/70 border-amber-200 text-amber-900 hover:border-amber-300 shadow-sm',
      etiket: 'Yaklaşıyor',
      badge: 'bg-amber-200 text-amber-800'
    };
  };

  const filtrelenenler = hatirlaticilar.filter((h) => {
    if (filtre === 'bugun') return h.Tarih === bugunStr && !h.TamamlandiMi;
    if (filtre === 'tamamlanmayan') return !h.TamamlandiMi;
    if (filtre === 'tamamlanan') return h.TamamlandiMi;
    return true;
  });

  const siralananlar = [...filtrelenenler].sort((a, b) => {
    if (a.TamamlandiMi !== b.TamamlandiMi) {
      return a.TamamlandiMi ? 1 : -1;
    }
    return a.Tarih.localeCompare(b.Tarih);
  });

  // Çoklu Dosya Yükleme (Base64) Helper
  const handleDosyaYukle = (e: React.ChangeEvent<HTMLInputElement>, isEditMode: boolean) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const yeniBelge = {
          DosyaAdi: file.name,
          DosyaBoyutu: (file.size / 1024).toFixed(1) + ' KB',
          YuklemeTarihi: new Date().toISOString().split('T')[0],
          DosyaIcerigi: base64
        };

        if (isEditMode) {
          setEditBelgeler(prev => [...prev, yeniBelge]);
        } else {
          setYeniBelgeler(prev => [...prev, yeniBelge]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input value
    e.target.value = '';
  };

  const dosyaSil = (index: number, isEditMode: boolean) => {
    if (isEditMode) {
      setEditBelgeler(prev => prev.filter((_, i) => i !== index));
    } else {
      setYeniBelgeler(prev => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Üst Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            <span>Ajanda, Görev &amp; Hatırlatıcılar</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Teklif takipleri, muayene günleri, bakım hatırlatıcıları ve görsel belgeleri
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setYeniBelgeler([]);
              setModalAcik(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Hatırlatıcı Ekle</span>
          </button>
        </div>
      </div>

      {/* Filtre Butonları */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFiltre('hepsi')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filtre === 'hepsi'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Tüm Görevler ({hatirlaticilar.length})
        </button>
        <button
          onClick={() => setFiltre('tamamlanmayan')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filtre === 'tamamlanmayan'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Açık Kalanlar ({hatirlaticilar.filter(h => !h.TamamlandiMi).length})
        </button>
        <button
          onClick={() => setFiltre('bugun')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filtre === 'bugun'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100'
          }`}
        >
          Bugün ({hatirlaticilar.filter(h => h.Tarih === bugunStr && !h.TamamlandiMi).length})
        </button>
        <button
          onClick={() => setFiltre('tamamlanan')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filtre === 'tamamlanan'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Tamamlananlar ({hatirlaticilar.filter(h => h.TamamlandiMi).length})
        </button>
      </div>

      {/* Hatırlatıcı Kartları */}
      <div className="space-y-2.5">
        {siralananlar.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-100/80 text-slate-400">
            <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <span className="text-xs font-medium">Bu filtrede gösterilecek görev veya hatırlatıcı bulunamadı.</span>
          </div>
        ) : (
          siralananlar.map((h) => {
            const d = durumBelirle(h);
            const belgeSayisi = h.Belgeler?.length || h.FotoSayisi || 0;
            return (
              <div
                key={h.Id}
                onClick={() => setSecilenHatirlatici(h)}
                className={`p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all flex items-start justify-between gap-3 ${d.renk}`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0 relative">
                  <div className="relative shrink-0 flex flex-col items-center">
                    <button
                      type="button"
                      onClick={(e) => handleCircleClick(e, h)}
                      onDoubleClick={(e) => handleCircleDoubleClick(e, h)}
                      className="mt-0.5 text-slate-400 hover:text-blue-600 transition-all shrink-0 p-1 rounded-full hover:scale-110 active:scale-95"
                      title="Tamamlamak veya açmak için ÇİFT TIKLAYIN"
                    >
                      {h.TamamlandiMi ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 hover:scale-105" />
                      )}
                    </button>

                    {doubleClickHintId === h.Id && (
                      <div className="absolute top-8 left-0 z-30 whitespace-nowrap bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xl border border-slate-700 animate-bounce flex items-center gap-1.5 pointer-events-none">
                        <span>👆</span>
                        <span>{h.TamamlandiMi ? 'Açmak için ÇİFT TIKLAYIN' : 'Tamamlamak için ÇİFT TIKLAYIN'}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.badge}`}>
                        {d.etiket}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {h.Kategori}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatTarihTR(h.Tarih)}
                      </span>
                      
                      {/* Belgeler / Fotoğraflar Mevcutsa Göster */}
                      {belgeSayisi > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1 animate-pulse">
                          <ImageIcon className="w-3 h-3" />
                          <span>{belgeSayisi} Görsel / Belge</span>
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-sm font-bold text-slate-900 mt-1.5 ${
                        h.TamamlandiMi ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {h.Baslik}
                    </h3>

                    {h.Aciklama && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {h.Aciklama}
                      </p>
                    )}

                    {/* Doğrudan Kart Üzerinde Belge / Görsel Önizleme Galerisi */}
                    {h.Belgeler && h.Belgeler.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200/50">
                        {h.Belgeler.slice(0, 4).map((belge, bIdx) => (
                          <div
                            key={bIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxDosya(belge);
                            }}
                            className="relative group/thumb w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center cursor-zoom-in hover:ring-2 hover:ring-blue-500 transition-all shadow-xs"
                            title={belge.DosyaAdi || 'Belgeyi Büyüt'}
                          >
                            {belge.DosyaIcerigi || belge.base64 ? (
                              <img
                                src={belge.DosyaIcerigi || belge.base64}
                                alt={belge.DosyaAdi}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                              />
                            ) : (
                              <FileText className="w-5 h-5 text-slate-500" />
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        ))}
                        {h.Belgeler.length > 4 && (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">
                            +{h.Belgeler.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 self-start">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteHatirlatici(h.Id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50/80 transition-colors"
                    title="Hatırlatıcıyı Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DETAY VE ÇOKLU FOTOĞRAF MODALI */}
      {secilenHatirlatici && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Ajanda Notu Detayları &amp; Görseller</h3>
              </div>
              <button onClick={() => setSecilenHatirlatici(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              {/* Form Alanları */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Başlık / Görev Adı:</label>
                  <input
                    value={editBaslik}
                    onChange={(e) => setEditBaslik(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tarih:</label>
                    <input
                      type="date"
                      value={editTarih}
                      onChange={(e) => setEditTarih(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kategori:</label>
                    <select 
                      value={editKategori} 
                      onChange={(e) => setEditKategori(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Bakim">Bakım &amp; Muayene</option>
                      <option value="Proje">Proje &amp; Montaj</option>
                      <option value="Evrak">Evrak &amp; Teklif</option>
                      <option value="Gorev">Genel Görev</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Önem Derecesi:</label>
                  <select 
                    value={editOnem} 
                    onChange={(e) => setEditOnem(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Onemli">Önemli</option>
                    <option value="Kritik">Kritik / Acil</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Açıklama / Detaylı Not:</label>
                  <textarea
                    value={editAciklama}
                    onChange={(e) => setEditAciklama(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Fotoğraflar / Belgeler Bölümü */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    Çoklu Fotoğraf ve Belge Ekleri ({editBelgeler.length})
                  </span>
                  
                  {/* Dosya Seçme Butonu */}
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    Görsel Ekle
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleDosyaYukle(e, true)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Dosya Önizleme Izgarası */}
                {editBelgeler.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center text-slate-400 text-xs">
                    <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                    Eklenmiş fotoğraf bulunmuyor. Yukarıdaki butondan fotoğraf ekleyebilirsiniz.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {editBelgeler.map((file, idx) => (
                      <div key={idx} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50 h-28 flex flex-col justify-between">
                        {/* Resim Önizleme */}
                        {file.DosyaIcerigi || file.base64 ? (
                          <div className="w-full h-20 overflow-hidden relative cursor-zoom-in" onClick={() => setLightboxDosya(file)}>
                            <img
                              src={file.DosyaIcerigi || file.base64}
                              alt={file.DosyaAdi}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-20 flex items-center justify-center text-slate-400 bg-slate-100">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}

                        {/* Alt Dosya Bilgileri ve Silme */}
                        <div className="px-2 py-1 bg-white border-t border-slate-100 flex items-center justify-between text-[10px] shrink-0">
                          <span className="truncate font-semibold max-w-[70%] text-slate-700" title={file.DosyaAdi}>
                            {file.DosyaAdi}
                          </span>
                          <button
                            type="button"
                            onClick={() => dosyaSil(idx, true)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Dosyayı Kaldır"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* İşlem Butonları */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onToggleTamamlandi(secilenHatirlatici.Id, !secilenHatirlatici.TamamlandiMi);
                  setSecilenHatirlatici(null);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${
                  secilenHatirlatici.TamamlandiMi 
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {secilenHatirlatici.TamamlandiMi ? 'Açık Göreve Çevir' : 'Tamamlandı Olarak İşaretle'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSecilenHatirlatici(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateHatirlatici) {
                      onUpdateHatirlatici(secilenHatirlatici.Id, {
                        Baslik: editBaslik,
                        Aciklama: editAciklama,
                        Tarih: editTarih,
                        Kategori: editKategori,
                        OnemDerecesi: editOnem,
                        Belgeler: editBelgeler
                      });
                    }
                    setSecilenHatirlatici(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-1"
                >
                  <span>Değişiklikleri Kaydet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YENİ HATIRLATICI MODALI */}
      {modalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Yeni Görev / Hatırlatıcı Ekle</h3>
              <button onClick={() => setModalAcik(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as any;
                onAddHatirlatici({
                  Baslik: form.baslik.value,
                  Aciklama: form.aciklama.value,
                  Tarih: form.tarih.value || bugunStr,
                  Kategori: form.kategori.value,
                  TamamlandiMi: false,
                  OnemDerecesi: form.onem.value,
                  Belgeler: yeniBelgeler
                });
                setModalAcik(false);
              }}
              className="space-y-4 text-xs sm:text-sm"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">Görev / Not Başlığı:</label>
                <input
                  name="baslik"
                  placeholder="Örn: Megane Muayene Randevusu Alınacak"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tarih:</label>
                  <input
                    type="date"
                    name="tarih"
                    defaultValue={bugunStr}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori:</label>
                  <select name="kategori" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Bakim">Bakım &amp; Muayene</option>
                    <option value="Proje">Proje &amp; Montaj</option>
                    <option value="Evrak">Evrak &amp; Teklif</option>
                    <option value="Gorev">Genel Görev</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Önem Derecesi:</label>
                <select name="onem" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="Normal">Normal</option>
                  <option value="Onemli">Önemli</option>
                  <option value="Kritik">Kritik / Acil</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Açıklama / Detay:</label>
                <textarea
                  name="aciklama"
                  rows={2}
                  placeholder="İlgili kişi, istasyon veya not..."
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Çoklu Fotoğraf Ekleme Alanı */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-700 text-xs flex items-center gap-1">
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    Fotoğraf / Belge Ekle ({yeniBelgeler.length})
                  </span>
                  <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-bold px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    Görsel Seç
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleDosyaYukle(e, false)}
                      className="hidden"
                    />
                  </label>
                </div>

                {yeniBelgeler.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {yeniBelgeler.map((file, idx) => (
                      <div key={idx} className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-50 h-20 flex flex-col justify-between">
                        <div 
                          className="w-full h-14 overflow-hidden relative cursor-zoom-in"
                          onClick={() => setLightboxDosya(file)}
                          title="Önizlemeyi Büyüt"
                        >
                          <img
                            src={file.DosyaIcerigi}
                            alt={file.DosyaAdi}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                        <div className="px-1.5 py-0.5 bg-white border-t border-slate-100 flex items-center justify-between text-[8px] truncate text-slate-700">
                          <span className="truncate max-w-[70%] font-medium">{file.DosyaAdi}</span>
                          <button
                            type="button"
                            onClick={() => dosyaSil(idx, false)}
                            className="text-slate-400 hover:text-red-600 p-0.5 rounded"
                            title="Kaldır"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAcik(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX (FOTOĞRAF TAM BOY GÖSTERİM) MODALI */}
      {lightboxDosya && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
            {/* Üst Bar */}
            <div className="flex items-center justify-between p-4 bg-slate-950/40 text-white shrink-0">
              <span className="text-xs font-bold truncate max-w-[60%] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                {lightboxDosya.DosyaAdi} ({lightboxDosya.DosyaBoyutu})
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxDosya.DosyaIcerigi || lightboxDosya.base64}
                  download={lightboxDosya.DosyaAdi}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
                  title="Görseli İndir"
                >
                  <Download className="w-4 h-4" />
                  <span>İndir</span>
                </a>
                <button
                  onClick={() => setLightboxDosya(null)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Görsel Sahnesi */}
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 h-[60vh]">
              <img
                src={lightboxDosya.DosyaIcerigi || lightboxDosya.base64}
                alt={lightboxDosya.DosyaAdi}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
