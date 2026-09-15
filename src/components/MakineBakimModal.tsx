import React, { useState, useEffect } from 'react';
import { Makine, Personel } from '../types';
import { Wrench, Calendar, Clock, DollarSign, X, Paperclip, Upload, FileText, Image as ImageIcon, Eye, Download } from 'lucide-react';
import { PersonelCombobox } from './PersonelCombobox';

interface MakineBakimModalProps {
  isOpen: boolean;
  onClose: () => void;
  makine: Makine | null;
  onSuccess: () => void;
}

export const MakineBakimModal: React.FC<MakineBakimModalProps> = ({
  isOpen,
  onClose,
  makine,
  onSuccess,
}) => {
  if (!isOpen || !makine) return null;

  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);
  const [yapildigiSaat, setYapildigiSaat] = useState(makine.GuncelCalismaSaati || 0);
  const [bakimTuru, setBakimTuru] = useState('250 Saatlik Periyodik Bakım');
  const [bakimiYapan, setBakimiYapan] = useState('Fabrika Bakım Ekibi');
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [lightboxBelge, setLightboxBelge] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/personeller')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPersoneller(d); })
      .catch(() => {});
  }, []);
  const [maliyet, setMaliyet] = useState(0);
  const [parcalar, setParcalar] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [belgeler, setBelgeler] = useState<any[]>([]);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const handleDosyaYukle = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setBelgeler(prev => [...prev, yeniBelge]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const dosyaSil = (index: number) => {
    setBelgeler(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKaydediliyor(true);
    try {
      const res = await fetch(`/api/makineler/${makine.MakineId}/bakimlar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          BakimTarihi: tarih,
          YapildigiSaat: Number(yapildigiSaat),
          BakimTuru: bakimTuru,
          BakimiYapan: bakimiYapan,
          Maliyet: Number(maliyet),
          DegisenParcalar: parcalar,
          Aciklama: aciklama,
          Belgeler: belgeler,
          FotoSayisi: belgeler.length
        })
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      alert('Bakım kaydı hatası: ' + err.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Makine Bakım Kaydı Ekle
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm overflow-y-auto">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400">Makine: </span>
              <span className="font-bold text-white">{makine.MakineAdi}</span>
              <span className="text-slate-500 font-mono ml-1">({makine.MakineKodu})</span>
            </div>
            <div>
              <span className="text-slate-400">Güncel Sayaç: </span>
              <span className="font-bold text-amber-400">{makine.GuncelCalismaSaati} Saat</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Bakım Tarihi</label>
              <input
                type="date"
                required
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Bakımın Yapıldığı Saat</label>
              <input
                type="number"
                required
                value={yapildigiSaat}
                onChange={(e) => setYapildigiSaat(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-amber-400 font-bold text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Bakım Türü</label>
              <select
                value={bakimTuru}
                onChange={(e) => setBakimTuru(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="250 Saatlik Periyodik Bakım">250 Saatlik Periyodik Bakım</option>
                <option value="Gresleme & Yağ Değişimi">Gresleme & Yağ Değişimi</option>
                <option value="Bıçak / Freze Değişimi">Bıçak / Freze Değişimi</option>
                <option value="Kayış & Rulman Değişimi">Kayış & Rulman Değişimi</option>
                <option value="Arıza Onarımı">Arıza Onarımı</option>
                <option value="Genel Revizyon">Genel Revizyon</option>
              </select>
            </div>

            <div>
              <PersonelCombobox
                label="Bakımı Yapan / Sorumlu Usta"
                variant="dark"
                personeller={personeller}
                value={bakimiYapan}
                onChange={(val) => setBakimiYapan(val)}
                placeholder="Personel seçin veya servis yazın..."
                helperText="Personel veya harici servis yazabilirsiniz."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Maliyet (TL)</label>
              <input
                type="number"
                value={maliyet}
                onChange={(e) => setMaliyet(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-bold text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Değişen Parçalar</label>
              <input
                type="text"
                value={parcalar}
                onChange={(e) => setParcalar(e.target.value)}
                placeholder="Örn: 2 Adet Filtre, Spindle Yağı"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Yapılan İşlemler / Açıklama</label>
            <textarea
              rows={2}
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder="Bakım detayları, temizlik ve test sonuçları..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Fotoğraf ve Belge Yükleme (Çoklu) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                <Paperclip className="w-4 h-4 text-amber-400" />
                Bakım Fotoğrafları, Fatura &amp; Servis Belgeleri:
              </span>
              <span className="text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {belgeler.length > 0 ? `${belgeler.length} Dosya Eklendi` : 'Çoklu Yükleme'}
              </span>
            </div>

            {/* Belirgin Yükleme Alanı / Dropzone */}
            <label className="border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center group shadow-inner">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-amber-300">
                Fotoğraf veya Belge Eklemek İçin Tıklayın
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Değişen parça, servis tutanağı, fatura veya makine fotoğrafları (JPG, PNG, PDF vb.)
              </span>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleDosyaYukle}
                className="hidden"
              />
            </label>

            {belgeler.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {belgeler.map((doc, idx) => {
                  const isImg = doc.DosyaIcerigi && (doc.DosyaIcerigi.startsWith('data:image') || doc.DosyaAdi.match(/\.(jpg|jpeg|png|webp|gif)$/i));
                  return (
                    <div key={idx} className="relative rounded-lg border border-slate-800 overflow-hidden bg-slate-950 h-20 flex flex-col justify-between group">
                      <div 
                        onClick={() => setLightboxBelge(doc)}
                        className="w-full h-14 overflow-hidden bg-slate-900 flex items-center justify-center cursor-pointer relative"
                        title="Önizlemek için tıklayın"
                      >
                        {isImg ? (
                          <img
                            src={doc.DosyaIcerigi}
                            alt={doc.DosyaAdi}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="w-6 h-6 text-slate-500" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="px-1.5 py-0.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[10px] truncate text-slate-300">
                        <span 
                          className="truncate max-w-[70%] cursor-pointer hover:text-amber-400" 
                          title={doc.DosyaAdi}
                          onClick={() => setLightboxBelge(doc)}
                        >
                          {doc.DosyaAdi}
                        </span>
                        <button
                          type="button"
                          onClick={() => dosyaSil(idx)}
                          className="text-slate-400 hover:text-red-400"
                          title="Kaldır"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={kaydediliyor}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow transition disabled:opacity-50"
            >
              {kaydediliyor ? 'Kaydediliyor...' : 'Bakımı Kaydet & Sayacı Sıfırla'}
            </button>
          </div>
        </form>
      </div>

      {/* Bakım Belgesi Lightbox Önizleme */}
      {lightboxBelge && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxBelge(null)}
        >
          <div 
            className="relative max-w-3xl w-full max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-white truncate">{lightboxBelge.DosyaAdi}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxBelge.DosyaIcerigi}
                  download={lightboxBelge.DosyaAdi}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="İndir"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxBelge(null)}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                  title="Kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-950/50 min-h-[250px]">
              {lightboxBelge.DosyaIcerigi && (lightboxBelge.DosyaIcerigi.startsWith('data:image') || lightboxBelge.DosyaAdi.match(/\.(jpg|jpeg|png|webp|gif)$/i)) ? (
                <img
                  src={lightboxBelge.DosyaIcerigi}
                  alt={lightboxBelge.DosyaAdi}
                  referrerPolicy="no-referrer"
                  className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg"
                />
              ) : lightboxBelge.DosyaIcerigi && (lightboxBelge.DosyaIcerigi.startsWith('data:application/pdf') || lightboxBelge.DosyaAdi.match(/\.pdf$/i)) ? (
                <iframe
                  src={lightboxBelge.DosyaIcerigi}
                  title={lightboxBelge.DosyaAdi}
                  className="w-full h-[65vh] rounded-lg border border-slate-800 bg-white"
                />
              ) : (
                <div className="text-center py-8 space-y-3">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-300">{lightboxBelge.DosyaAdi}</p>
                  <a
                    href={lightboxBelge.DosyaIcerigi}
                    download={lightboxBelge.DosyaAdi}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>İndir</span>
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
