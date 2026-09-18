import React from 'react';
import { X, Printer, CheckCircle2, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';
import { MalzemeSiparisi } from '../types';

interface SiparisYazdirModalProps {
  isOpen: boolean;
  onClose: () => void;
  siparis: MalzemeSiparisi | null;
}

export const SiparisYazdirModal: React.FC<SiparisYazdirModalProps> = ({
  isOpen,
  onClose,
  siparis
}) => {
  if (!isOpen || !siparis) return null;

  const handlePrint = () => {
    window.print();
  };

  const getAciliyetLabel = (aciliyet: string) => {
    switch (aciliyet) {
      case 'CokAcil': return 'ÇOK ACİL (İmalat Duruyor)';
      case 'Acil': return 'ACİL';
      default: return 'Normal';
    }
  };

  const getDurumLabel = (durum: string) => {
    switch (durum) {
      case 'Bekliyor': return 'Talep Alındı / Bekliyor';
      case 'Incelemede': return 'Satınalma İncelemesinde';
      case 'FiyatAliniyor': return 'Tedarikçilerden Fiyat Alınıyor';
      case 'SiparisVerildi': return 'Tedarikçiye Sipariş Verildi';
      case 'KismiGeldi': return 'Kısmi Teslim Alındı';
      case 'FabrikayaGeldi': return 'Fabrikaya / Depoya Ulaştı';
      case 'Iptal': return 'İptal Edildi';
      default: return durum;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      {/* Yazdırma Önizleme Konteyneri */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Kontrol Çubuğu (Yazdırmada Gizlenir) */}
        <div className="no-print px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Malzeme Sipariş Formu Yazdırma Önizleme</h3>
              <p className="text-[11px] text-slate-300">{siparis.SiparisNo} • {siparis.ProjeAdi}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır / PDF Kaydet</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* A4 Yazdırılabilir Belge Gövdesi */}
        <div className="p-6 sm:p-10 overflow-y-auto text-slate-900 bg-white font-sans printable-order-sheet">
          {/* Üst Şirket ve Form Başlığı */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-950 uppercase">
                  RENDE MOBİLYA &amp; MİMARLIK
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                  ÖZEL İMALAT FABRİKASI
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Özel Üretim Dış Malzeme Talep &amp; Satınalma Takip Formu
              </p>
            </div>
            <div className="text-right space-y-1">
              <div className="text-lg font-mono font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded border border-blue-200 inline-block">
                {siparis.SiparisNo || 'SIP-2026-000'}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Talep Tarihi: <strong className="text-slate-800">{siparis.Tarih || new Date().toISOString().slice(0, 10)}</strong>
              </div>
            </div>
          </div>

          {/* Durum ve Aciliyet Rozetleri */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Sipariş Durumu</span>
              <span className="text-xs font-bold text-slate-900">{getDurumLabel(siparis.Durum)}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Aciliyet Seviyesi</span>
              <span className={`text-xs font-bold ${siparis.Aciliyet === 'CokAcil' ? 'text-red-600' : siparis.Aciliyet === 'Acil' ? 'text-amber-600' : 'text-slate-800'}`}>
                {getAciliyetLabel(siparis.Aciliyet)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">İstenen Termin</span>
              <span className="text-xs font-bold text-slate-900">{siparis.TerminTarihi || 'Belirtilmedi'}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Talep Eden Birim</span>
              <span className="text-xs font-bold text-slate-900">{siparis.TalepEden || 'Ustabaşı / Atölye'}</span>
            </div>
          </div>

          {/* Ana Bilgi Tablosu */}
          <div className="border border-slate-300 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <tbody>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <td className="w-1/4 py-2.5 px-3 font-bold text-slate-600 border-r border-slate-200">İlgili Proje / Şantiye:</td>
                  <td className="w-3/4 py-2.5 px-3 font-bold text-slate-900 text-sm">{siparis.ProjeAdi}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-2.5 px-3 font-bold text-slate-600 border-r border-slate-200">Malzeme Kategorisi:</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{siparis.Kategori}</td>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-600 border-r border-slate-200">Talep Edilen Malzeme / Ürün:</td>
                  <td className="py-2.5 px-3 font-bold text-blue-900 text-sm">{siparis.MalzemeAdi}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-2.5 px-3 font-bold text-slate-600 border-r border-slate-200">Sipariş Miktarı &amp; Birim:</td>
                  <td className="py-2.5 px-3 font-bold text-slate-950 text-sm">
                    {siparis.Miktar} {siparis.Birim}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* İmalat Ölçüleri & Teknik Detaylar Kutusu */}
          <div className="mb-5 p-4 rounded-xl bg-slate-50 border border-slate-300">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>📐 Kesim, Ebat &amp; Teknik Ölçü Bilgileri:</span>
            </h4>
            <div className="text-xs font-mono bg-white p-3 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
              {siparis.Olculer || 'Ölçü detayı girilmedi.'}
            </div>
          </div>

          {/* Büyük Açıklama & Ustabaşı Notu */}
          <div className="mb-5 p-4 rounded-xl bg-slate-50 border border-slate-300">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              📝 Ustabaşı İmalat Açıklaması &amp; Özel İstekler:
            </h4>
            <div className="text-xs bg-white p-3 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
              {siparis.Aciklama || 'Açıklama girilmedi.'}
            </div>
          </div>

          {/* Satınalma ve Tedarikçi Bilgileri */}
          {(siparis.TedarikciFirma || siparis.FaturaIrsaliyeNo || siparis.SatinalmaNotu || siparis.KilitliMi) && (
            <div className="mb-6 p-4 rounded-xl bg-blue-50/50 border border-blue-200">
              <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>Satınalma &amp; Tedarikçi Onay Bilgileri:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500">Tedarikçi Firma:</span>
                  <span className="font-semibold text-slate-900">{siparis.TedarikciFirma || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500">İrsaliye / Fatura No:</span>
                  <span className="font-semibold text-slate-900">{siparis.FaturaIrsaliyeNo || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500">Tahmini / Anlaşılan Tutar:</span>
                  <span className="font-semibold text-slate-900">
                    {siparis.TahminiTutar ? `₺${Number(siparis.TahminiTutar).toLocaleString('tr-TR')}` : '-'}
                  </span>
                </div>
              </div>
              {siparis.SatinalmaNotu && (
                <div className="mt-2.5 pt-2 border-t border-blue-200/60 text-xs text-blue-900">
                  <span className="font-bold">Satınalma Notu:</span> {siparis.SatinalmaNotu}
                </div>
              )}
              {siparis.KilitliMi && (
                <div className="mt-2 text-[11px] font-bold text-amber-800 bg-amber-100/60 p-1.5 rounded border border-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Bu sipariş Satınalma tarafından onaylanıp kilitlenmiştir ({siparis.KilitTarihi || 'Onaylı'}).</span>
                </div>
              )}
            </div>
          )}

          {/* Ekli Görseller / Çizim Krokileri (Eğer varsa) */}
          {siparis.Belgeler && siparis.Belgeler.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                📷 Ekli Kroki, Çizim ve Referans Fotoğrafları ({siparis.Belgeler.length} Adet):
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {siparis.Belgeler.map((belge, bIdx) => (
                  <div key={bIdx} className="border border-slate-300 rounded-lg p-1.5 bg-slate-50 text-center">
                    {belge.DosyaIcerigi && belge.DosyaIcerigi.startsWith('data:image') ? (
                      <img
                        src={belge.DosyaIcerigi}
                        alt={belge.DosyaAdi}
                        className="w-full h-24 object-contain rounded bg-white mb-1 border border-slate-200"
                      />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center bg-slate-200 rounded mb-1 text-[10px] text-slate-600 font-semibold">
                        {belge.DosyaAdi}
                      </div>
                    )}
                    <span className="text-[10px] text-slate-600 block truncate font-medium">{belge.DosyaAdi}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* İmza ve Onay Bölümü */}
          <div className="mt-8 pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-4 text-center">
            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Talep Eden (Ustabaşı)</div>
              <div className="h-14 flex items-center justify-center text-xs font-bold text-slate-800">
                {siparis.TalepEden || 'İmalat Ustabaşı'}
              </div>
              <div className="border-t border-slate-300 pt-1 text-[9px] text-slate-400">İmza / Tarih</div>
            </div>

            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Satınalma Sorumlusu</div>
              <div className="h-14 flex items-center justify-center text-xs font-bold text-slate-800">
                {siparis.KilitleyenKisi || 'Satınalma Departmanı'}
              </div>
              <div className="border-t border-slate-300 pt-1 text-[9px] text-slate-400">İmza / Tarih</div>
            </div>

            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Fabrika Müdürü Onayı</div>
              <div className="h-14 flex items-center justify-center text-xs font-bold text-slate-800">
                Genel Yönetim
              </div>
              <div className="border-t border-slate-300 pt-1 text-[9px] text-slate-400">Kaşe / İmza</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
