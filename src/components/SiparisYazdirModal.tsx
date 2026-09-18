import React, { useState } from 'react';
import { X, Printer, ShieldCheck, FileText } from 'lucide-react';
import { MalzemeSiparisi, MalzemeSiparisKalemi } from '../types';
import { formatTarihTR, getBugunIso } from '../utils/dateUtils';

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
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !siparis) return null;

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isPrinting) return;
    setIsPrinting(true);
    window.print();
    setTimeout(() => {
      setIsPrinting(false);
    }, 1000);
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

  // Malzeme Kalemleri Listesi
  const kalemler: MalzemeSiparisKalemi[] = (siparis.Kalemler && siparis.Kalemler.length > 0)
    ? siparis.Kalemler
    : [{
        Kategori: siparis.Kategori || 'Diğer Mobilya Malzemesi',
        MalzemeAdi: siparis.MalzemeAdi || 'Belirtilmedi',
        Marka: siparis.Marka,
        Model: siparis.Model,
        Miktar: siparis.Miktar || 1,
        Birim: siparis.Birim || 'Adet',
        Olculer: siparis.Olculer,
        Aciklama: siparis.Aciklama
      }];

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto siparis-print-overlay"
    >
      {/* A4 Baskı Düzeni ve Sayfa Kenarlık / Başlık Temizleme CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0; /* Tarayıcının sayfa üst/altındaki IP adresi, URL, tarih ve sayfa no bilgilerini tamamen kaldırır */
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
          /* Arka plandaki tüm uygulama ekranlarını yazdırmada gizle (Çift sayfa veya arka plan basımını önler) */
          body > *:not(.siparis-print-overlay) {
            display: none !important;
          }
          .siparis-print-overlay {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            padding: 8mm 12mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          .siparis-print-content {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            width: 100% !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
        }
      `}} />

      {/* Yazdırma Önizleme Konteyneri */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh] siparis-print-content">
        {/* Kontrol Çubuğu (Yazdırmada Gizlenir) */}
        <div className="no-print px-5 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-white">Malzeme Sipariş Formu Yazdırma Önizleme</h3>
              <p className="text-[10px] text-slate-300">{siparis.SiparisNo} • {siparis.ProjeAdi} ({kalemler.length} Kalem)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır / PDF Kaydet</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* A4 Yazdırılabilir Belge Gövdesi (Kompakt Tipografi & A4 Düzeni) */}
        <div className="p-5 sm:p-8 overflow-y-auto text-slate-900 bg-white font-sans printable-order-sheet text-[11px] leading-snug">
          {/* Üst Şirket ve Form Başlığı */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-slate-950 uppercase">
                  RENDE MOBİLYA &amp; MİMARLIK
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                  ÖZEL İMALAT FABRİKASI
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Malzeme Talep &amp; Satınalma Sipariş Formu
              </p>
            </div>
            <div className="text-right space-y-0.5">
              <div className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 inline-block">
                {siparis.SiparisNo || 'SIP-2026-000'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                Talep Tarihi: <strong className="text-slate-800">{formatTarihTR(siparis.Tarih || getBugunIso())}</strong>
              </div>
            </div>
          </div>

          {/* Proje & Özet Bilgi Çubuğu */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500">İlgili Proje / Şantiye</span>
              <span className="text-xs font-bold text-slate-950 truncate block">{siparis.ProjeAdi}</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500">Talep Eden</span>
              <span className="text-xs font-semibold text-slate-900">{siparis.TalepEden || 'Ustabaşı / Atölye'}</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500">Aciliyet / Termin</span>
              <span className={`text-xs font-bold ${siparis.Aciliyet === 'CokAcil' ? 'text-red-600' : siparis.Aciliyet === 'Acil' ? 'text-amber-600' : 'text-slate-800'}`}>
                {getAciliyetLabel(siparis.Aciliyet)} {siparis.TerminTarihi ? `(${formatTarihTR(siparis.TerminTarihi)})` : ''}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500">Sipariş Durumu</span>
              <span className="text-xs font-semibold text-slate-900">{getDurumLabel(siparis.Durum)}</span>
            </div>
          </div>

          {/* ÇOKLU MALZEME KALEMLERİ TABLOSU */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                📦 Talep Edilen Malzeme Kalemleri ({kalemler.length} Kalem)
              </h4>
            </div>

            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-800 text-white uppercase text-[9px] font-bold tracking-wider">
                    <th className="py-1.5 px-2 text-center w-8 border-r border-slate-700">#</th>
                    <th className="py-1.5 px-2 border-r border-slate-700 w-28">Kategori</th>
                    <th className="py-1.5 px-2 border-r border-slate-700">Malzeme / Ürün Adı</th>
                    <th className="py-1.5 px-2 border-r border-slate-700 w-28">Marka / Model</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-700 w-20">Miktar</th>
                    <th className="py-1.5 px-2 border-r border-slate-700 w-36">Ölçü &amp; Kesim</th>
                    <th className="py-1.5 px-2">Açıklama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {kalemler.map((kalem, kIdx) => (
                    <tr key={kalem.Id || kIdx} className={kIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="py-2 px-2 text-center font-bold text-slate-500 border-r border-slate-200 text-[10px]">
                        {kIdx + 1}
                      </td>
                      <td className="py-2 px-2 font-medium text-slate-700 border-r border-slate-200 text-[10px]">
                        {kalem.Kategori}
                      </td>
                      <td className="py-2 px-2 font-bold text-slate-950 border-r border-slate-200">
                        {kalem.MalzemeAdi}
                      </td>
                      <td className="py-2 px-2 text-slate-700 border-r border-slate-200 text-[10px]">
                        {kalem.Marka ? (
                          <span className="font-semibold text-indigo-900">{kalem.Marka}</span>
                        ) : '-'}
                        {kalem.Model ? <div className="text-[9px] text-slate-500">{kalem.Model}</div> : null}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-blue-950 border-r border-slate-200 bg-blue-50/30 text-xs whitespace-nowrap">
                        {kalem.Miktar} {kalem.Birim}
                      </td>
                      <td className="py-2 px-2 font-mono text-[10px] text-slate-800 border-r border-slate-200 whitespace-pre-line">
                        {kalem.Olculer || '-'}
                      </td>
                      <td className="py-2 px-2 text-[10px] text-slate-600 whitespace-pre-line">
                        {kalem.Aciklama || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Genel Sipariş Açıklaması (Eğer tek kaleme sığmayan genel not varsa) */}
          {siparis.Aciklama && !kalemler.some(k => k.Aciklama === siparis.Aciklama) && (
            <div className="mb-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Sipariş Genel Notu / Ustabaşı Açıklaması:</span>
              <p className="text-[10px] text-slate-800 whitespace-pre-line">{siparis.Aciklama}</p>
            </div>
          )}

          {/* Satınalma ve Tedarikçi Bilgileri */}
          {(siparis.TedarikciFirma || siparis.FaturaIrsaliyeNo || siparis.SatinalmaNotu) && (
            <div className="mb-4 p-2.5 rounded-lg bg-blue-50/50 border border-blue-200">
              <div className="flex items-center gap-1 mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                <span className="text-[10px] font-bold text-blue-950 uppercase">Satınalma &amp; Tedarikçi Bilgileri</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <span className="text-slate-500 font-medium">Tedarikçi: </span>
                  <strong className="text-slate-900">{siparis.TedarikciFirma || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">İrsaliye/Fatura No: </span>
                  <strong className="text-slate-900">{siparis.FaturaIrsaliyeNo || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Tutar: </span>
                  <strong className="text-slate-900">
                    {siparis.TahminiTutar ? `₺${Number(siparis.TahminiTutar).toLocaleString('tr-TR')}` : '-'}
                  </strong>
                </div>
              </div>
              {siparis.SatinalmaNotu && (
                <div className="mt-1 text-[10px] text-blue-900">
                  <strong>Not:</strong> {siparis.SatinalmaNotu}
                </div>
              )}
            </div>
          )}

          {/* Ekli Belgeler / Görseller (Eğer varsa) */}
          {siparis.Belgeler && siparis.Belgeler.length > 0 && (
            <div className="mb-4">
              <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                📷 Ekli Kroki &amp; Referans Görseller ({siparis.Belgeler.length} Adet):
              </h4>
              <div className="flex flex-wrap gap-2">
                {siparis.Belgeler.map((belge, bIdx) => (
                  <div key={bIdx} className="border border-slate-200 rounded p-1 bg-slate-50 w-28 text-center">
                    {belge.DosyaIcerigi && belge.DosyaIcerigi.startsWith('data:image') ? (
                      <img
                        src={belge.DosyaIcerigi}
                        alt={belge.DosyaAdi}
                        className="w-full h-16 object-contain rounded bg-white mb-0.5 border border-slate-200"
                      />
                    ) : (
                      <div className="w-full h-16 flex items-center justify-center bg-slate-200 rounded mb-0.5 text-[9px] text-slate-600 font-semibold">
                        {belge.DosyaAdi}
                      </div>
                    )}
                    <span className="text-[9px] text-slate-600 block truncate font-medium">{belge.DosyaAdi}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* İmza ve Onay Bölümü */}
          <div className="mt-6 pt-4 border-t border-slate-300 grid grid-cols-3 gap-3 text-center">
            <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50">
              <div className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Talep Eden (Ustabaşı)</div>
              <div className="h-10 flex items-center justify-center text-[10px] font-bold text-slate-800">
                {siparis.TalepEden || 'İmalat Ustabaşı'}
              </div>
              <div className="border-t border-slate-200 pt-0.5 text-[8px] text-slate-400">İmza / Tarih</div>
            </div>

            <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50">
              <div className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Satınalma Sorumlusu</div>
              <div className="h-10 flex items-center justify-center text-[10px] font-bold text-slate-800">
                {siparis.KilitleyenKisi || 'Satınalma Departmanı'}
              </div>
              <div className="border-t border-slate-200 pt-0.5 text-[8px] text-slate-400">İmza / Tarih</div>
            </div>

            <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50">
              <div className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Fabrika Müdürü Onayı</div>
              <div className="h-10 flex items-center justify-center text-[10px] font-bold text-slate-800">
                Genel Yönetim
              </div>
              <div className="border-t border-slate-200 pt-0.5 text-[8px] text-slate-400">Kaşe / İmza</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


