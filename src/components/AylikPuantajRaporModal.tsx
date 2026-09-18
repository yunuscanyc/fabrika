import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Personel, GunlukPuantaj } from '../types';
import { FileSpreadsheet, Printer, X, Download } from 'lucide-react';
import { formatTarihTR, getBugunIso } from '../utils/dateUtils';

interface AylikPuantajRaporModalProps {
  isOpen: boolean;
  onClose: () => void;
  personeller: Personel[];
  puantajlar: GunlukPuantaj[];
}

export const AylikPuantajRaporModal: React.FC<AylikPuantajRaporModalProps> = ({
  isOpen,
  onClose,
  personeller,
  puantajlar,
}) => {
  const [seciliYil, setSeciliYil] = useState(new Date().getFullYear());
  const [seciliAy, setSeciliAy] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const aylar = [
    { no: 1, ad: 'Ocak' }, { no: 2, ad: 'Şubat' }, { no: 3, ad: 'Mart' },
    { no: 4, ad: 'Nisan' }, { no: 5, ad: 'Mayıs' }, { no: 6, ad: 'Haziran' },
    { no: 7, ad: 'Temmuz' }, { no: 8, ad: 'Ağustos' }, { no: 9, ad: 'Eylül' },
    { no: 10, ad: 'Ekim' }, { no: 11, ad: 'Kasım' }, { no: 12, ad: 'Aralık' },
  ];

  // Seçili ay ve yıla ait puantajların icmali (timezone güvenli ayrıştırma ile)
  const icmalListesi = personeller.filter(p => p.DurumAktifMi).map(p => {
    const pPuantaj = puantajlar.filter(x => {
      if (x.PersonelId !== p.PersonelId) return false;
      const clean = String(x.Tarih || '').trim();
      const match = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (match) {
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        return y === seciliYil && m === seciliAy;
      }
      const d = new Date(x.Tarih);
      return !isNaN(d.getTime()) && d.getFullYear() === seciliYil && (d.getMonth() + 1) === seciliAy;
    });

    const normalGun = pPuantaj.filter(x => x.DurumKodu === 'N' || x.NormalCalismaSaati > 0).length;
    const haftaTatiliGun = pPuantaj.filter(x => x.DurumKodu === 'HT').length;
    const resmiTatilGun = pPuantaj.filter(x => x.DurumKodu === 'RT').length;
    const izinliGun = pPuantaj.filter(x => ['YI', 'UI', 'R', 'M'].includes(x.DurumKodu)).length;
    const devamsizGun = pPuantaj.filter(x => x.DurumKodu === 'D').length;

    const toplamNormalSaat = pPuantaj.reduce((sum, x) => sum + (x.NormalCalismaSaati || 0), 0);
    const toplamFazlaMesai = pPuantaj.reduce((sum, x) => sum + (x.FazlaMesaiSaati || 0), 0);
    const toplamTatilMesai = pPuantaj.reduce((sum, x) => sum + (x.HaftaTatiliMesaiSaati || 0) + (x.ResmiTatilMesaiSaati || 0), 0);
    const toplamEksikSaat = pPuantaj.reduce((sum, x) => sum + (x.SaatlikKesintiUcretsiz || 0), 0);

    return {
      personelId: p.PersonelId,
      adSoyad: p.AdSoyad,
      departman: p.Departman || '-',
      normalGun,
      haftaTatiliGun,
      resmiTatilGun,
      izinliGun,
      devamsizGun,
      toplamNormalSaat,
      toplamFazlaMesai,
      toplamTatilMesai,
      toplamEksikSaat
    };
  });

  const handleCsvExport = () => {
    const ayAdi = aylar.find(a => a.no === seciliAy)?.ad;
    let csv = `RENDE İNŞAAT MOBİLYA TURİZM A.Ş. - AYLIK PUANTAJ İCMAL CETVELİ\n`;
    csv += `Dönem: ${ayAdi} ${seciliYil} - Rapor Tarihi: ${formatTarihTR(getBugunIso())}\n\n`;
    csv += `Personel;Departman;Normal Gün;Hafta Tatili;Resmi Tatil;İzin/Rapor;Devamsız;Normal Saat;Fazla Mesai (%50);Tatil Mesaisi (%100);Eksik Saat;İmza\n`;

    icmalListesi.forEach(item => {
      csv += `${item.adSoyad};${item.departman};${item.normalGun};${item.haftaTatiliGun};${item.resmiTatilGun};${item.izinliGun};${item.devamsizGun};${item.toplamNormalSaat.toFixed(1)};${item.toplamFazlaMesai.toFixed(1)};${item.toplamTatilMesai.toFixed(1)};${item.toplamEksikSaat.toFixed(1)};\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Puantaj_Icmal_${seciliYil}_${seciliAy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const modalContent = (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm p-4 flex justify-center items-start print-modal-overlay"
    >
      {/* CSS injection to handle perfect A4 Landscape print formatting, margin 0 (strips browser header/footers with IP/URL) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 0; /* Tarayıcının üst/alt başlık ve IP/URL/tarih yazılarını tamamen kaldırır */
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
          /* Hide React root element during print */
          #root {
            display: none !important;
          }
          .print-modal-overlay {
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
          .print-modal-content {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            margin: 0 !important;
            padding: 8mm 10mm !important;
            max-height: none !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          /* Tablo hücrelerinin ve renklerin net çıkmasını sağla */
          .print-modal-content table {
            border-collapse: collapse !important;
            width: 100% !important;
            color: black !important;
            font-size: 9.5px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-modal-content th {
            background-color: #f1f5f9 !important;
            color: black !important;
            border: 1px solid #334155 !important;
            font-weight: bold !important;
            padding: 4px 3px !important;
            text-align: center !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-modal-content td {
            color: black !important;
            border: 1px solid #64748b !important;
            padding: 3px 3px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-modal-content tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-modal-content h2, .print-modal-content h1 {
            color: black !important;
          }
          .print-modal-content p, .print-modal-content span {
            color: #1e293b !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}} />

      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl my-6 print:my-0 print-modal-content"
      >
        {/* Üst Bar (Yazdırmada Gizlenir) */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">Aylık Personel Puantaj & Bordro İcmali</h2>
              <p className="text-xs text-slate-400">Fiili günler, mesai saatleri ve personel imza listesi</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-400 font-medium">Yıl:</span>
              <select
                value={seciliYil}
                onChange={(e) => setSeciliYil(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y} className="bg-slate-900 text-white">{y}</option>
                ))}
              </select>

              <span className="text-slate-400 font-medium ml-2">Ay:</span>
              <select
                value={seciliAy}
                onChange={(e) => setSeciliAy(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                {aylar.map(a => (
                  <option key={a.no} value={a.no} className="bg-slate-900 text-white">{a.ad}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCsvExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-lg transition"
              title="Excel / CSV Olarak İndir"
            >
              <Download className="w-3.5 h-3.5" />
              Excel / CSV
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow"
              title="Yazdır / PDF Olarak Kaydet"
            >
              <Printer className="w-3.5 h-3.5" />
              Yazdır
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-lg transition border border-slate-700"
              title="Kapat"
            >
              <X className="w-3.5 h-3.5" />
              <span>Kapat (Esc)</span>
            </button>
          </div>
        </div>

        {/* Antet (Yalnızca Yazdırmada Görünür) */}
        <div className="hidden print:block text-center border-b-2 border-black pb-3 p-4 mb-2 print-avoid-break">
          <h2 className="text-xs font-bold tracking-wider text-black">RENDE İNŞAAT MOBİLYA TURİZM SAN. VE TİC. A.Ş.</h2>
          <h1 className="text-sm font-extrabold uppercase mt-0.5 tracking-wide text-black">
            AYLIK PERSONEL PUANTAJ & BORDRO İCMAL CETVELİ
          </h1>
          <div className="flex justify-between items-center text-[10px] text-slate-800 mt-1 font-semibold px-2">
            <span>Dönem: {aylar.find(a => a.no === seciliAy)?.ad} {seciliYil}</span>
            <span>Rapor Tarihi: {formatTarihTR(getBugunIso())}</span>
            <span>Toplam Personel: {icmalListesi.length} Kişi</span>
          </div>
        </div>

        {/* Tablo İçeriği */}
        <div className="p-6 print:p-0 overflow-x-auto max-h-[70vh] print:max-h-none print:overflow-visible">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 print:bg-slate-100">
              <tr>
                <th className="py-2.5 px-3 print:py-1.5 print:px-2">Personel</th>
                <th className="py-2.5 px-3 print:py-1.5 print:px-2">Departman</th>
                <th className="py-2.5 px-2 text-center print:py-1.5 print:px-1">Çalışma (Gün)</th>
                <th className="py-2.5 px-2 text-center print:py-1.5 print:px-1">Hafta T.</th>
                <th className="py-2.5 px-2 text-center print:py-1.5 print:px-1">Resmi T.</th>
                <th className="py-2.5 px-2 text-center print:py-1.5 print:px-1">İzin/Rap.</th>
                <th className="py-2.5 px-2 text-center print:py-1.5 print:px-1">Devamsız</th>
                <th className="py-2.5 px-2 text-center font-bold text-emerald-400 print:py-1.5 print:px-1 print:text-black">Normal (Saat)</th>
                <th className="py-2.5 px-2 text-center font-bold text-blue-400 print:py-1.5 print:px-1 print:text-black">%50 Mesai</th>
                <th className="py-2.5 px-2 text-center font-bold text-emerald-300 print:py-1.5 print:px-1 print:text-black">%100 Mesai</th>
                <th className="py-2.5 px-2 text-center font-bold text-rose-400 print:py-1.5 print:px-1 print:text-black">Eksik Saat</th>
                <th className="py-2.5 px-4 text-center border-l border-slate-800 print:py-1.5 print:px-3 print:border-l print:border-black">İmza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-y-0">
              {icmalListesi.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-4 text-center text-slate-500 italic">
                    Kayıtlı aktif personel bulunamadı.
                  </td>
                </tr>
              ) : (
                icmalListesi.map((item) => (
                  <tr key={item.personelId} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-semibold text-white print:text-black print:py-1 print:px-2">{item.adSoyad}</td>
                    <td className="py-2 px-3 text-slate-400 print:text-black print:py-1 print:px-2">{item.departman}</td>
                    <td className="py-2 px-2 text-center font-bold text-slate-200 print:text-black print:py-1 print:px-1">{item.normalGun}</td>
                    <td className="py-2 px-2 text-center text-slate-400 print:text-black print:py-1 print:px-1">{item.haftaTatiliGun}</td>
                    <td className="py-2 px-2 text-center text-slate-400 print:text-black print:py-1 print:px-1">{item.resmiTatilGun}</td>
                    <td className="py-2 px-2 text-center text-amber-400 font-semibold print:text-black print:py-1 print:px-1">{item.izinliGun}</td>
                    <td className="py-2 px-2 text-center text-rose-400 font-bold print:text-black print:py-1 print:px-1">{item.devamsizGun || '-'}</td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-emerald-400 print:text-black print:py-1 print:px-1">{item.toplamNormalSaat.toFixed(1)}</td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-blue-400 print:text-black print:py-1 print:px-1">{item.toplamFazlaMesai > 0 ? item.toplamFazlaMesai.toFixed(1) : '-'}</td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-emerald-300 print:text-black print:py-1 print:px-1">{item.toplamTatilMesai > 0 ? item.toplamTatilMesai.toFixed(1) : '-'}</td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-rose-400 print:text-black print:py-1 print:px-1">{item.toplamEksikSaat > 0 ? item.toplamEksikSaat.toFixed(1) : '-'}</td>
                    <td className="py-2 px-4 text-center border-l border-slate-800 print:border-l print:border-black print:py-1 print:px-3 min-w-[70px]">
                      <div className="w-16 border-b border-slate-700 print:border-black h-4 mx-auto"></div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Alt Bilgi */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 flex justify-between items-center print:hidden">
          <span>Toplam Personel: {icmalListesi.length} Kişi</span>
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
