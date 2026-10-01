import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Personel, GunlukPuantaj } from '../types';
import { FileSpreadsheet, Printer, X, Download, Plus, Minus, Calendar, Clock } from 'lucide-react';
import { formatTarihTR, getBugunIso, getGunIndex, getResmiTatil } from '../utils/dateUtils';
import { isPersonelCalisiyorMuAyda } from '../utils/personelUtils';

const GUN_ISIMLERI = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function getDurumBadge(durumKodu: string, durumEtiket?: string, tatilAd?: string) {
  switch (durumKodu) {
    case 'N':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          Normal Çalışma (N)
        </span>
      );
    case 'HT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          ☕ Hafta Tatili (HT)
        </span>
      );
    case 'RT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30" title={tatilAd}>
          🎉 {tatilAd || 'Resmi Tatil'} (RT)
        </span>
      );
    case 'YI':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
          🌴 Yıllık İzin (YI)
        </span>
      );
    case 'UI':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
          🛑 Ücretsiz İzin (UI)
        </span>
      );
    case 'R':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30">
          🏥 Raporlu (R)
        </span>
      );
    case 'M':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
          📝 Mazeret İzni (M)
        </span>
      );
    case 'D':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/25 text-red-400 border border-red-500/40">
          ❌ Devamsız (D)
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/60">
          {durumEtiket || 'Kayıt Yok'}
        </span>
      );
  }
}

function getPersonelAyGunleri(
  personelId: number,
  yil: number,
  ay: number,
  puantajlar: GunlukPuantaj[]
) {
  const gunSayisi = new Date(yil, ay, 0).getDate();
  const gunler = [];

  for (let g = 1; g <= gunSayisi; g++) {
    const gunStr = String(g).padStart(2, '0');
    const ayStr = String(ay).padStart(2, '0');
    const isoTarih = `${yil}-${ayStr}-${gunStr}`;
    const gunIdx = getGunIndex(isoTarih);
    const gunAdi = GUN_ISIMLERI[gunIdx];
    const tatil = getResmiTatil(isoTarih);
    const isHaftaSonu = gunIdx === 0 || gunIdx === 6;

    // Personelin bu tarihteki puantaj kaydını bul
    const kayit = puantajlar.find(x => {
      if (x.PersonelId !== personelId) return false;
      const clean = String(x.Tarih || '').trim();
      const match = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (match) {
        return (
          parseInt(match[1], 10) === yil &&
          parseInt(match[2], 10) === ay &&
          parseInt(match[3], 10) === g
        );
      }
      return clean.slice(0, 10) === isoTarih;
    });

    let durumKodu = '';
    let durumEtiket = '';
    let normalSaat = 0;
    let fazlaSaat = 0;
    let tatilMesai = 0;
    let eksikSaat = 0;
    let aciklama = '';
    let kayitVar = false;

    if (kayit) {
      kayitVar = true;
      durumKodu = kayit.DurumKodu || 'N';
      normalSaat = Number(kayit.NormalCalismaSaati || 0);
      fazlaSaat = Number(kayit.FazlaMesaiSaati || 0);
      tatilMesai = Number((kayit.HaftaTatiliMesaiSaati || 0) + (kayit.ResmiTatilMesaiSaati || 0));
      eksikSaat = Number(kayit.SaatlikKesintiUcretsiz || 0);
      aciklama = kayit.Aciklama || '';
    } else {
      if (tatil.isTatil) {
        durumKodu = 'RT';
        durumEtiket = `Resmi Tatil (${tatil.ad || ''})`;
      } else if (isHaftaSonu) {
        durumKodu = 'HT';
        durumEtiket = 'Hafta Tatili';
      } else {
        durumKodu = '-';
        durumEtiket = 'Kayıt Girilmedi';
      }
    }

    gunler.push({
      gunNo: g,
      isoTarih,
      gunAdi,
      isHaftaSonu,
      isPazar: gunIdx === 0,
      isCumartesi: gunIdx === 6,
      tatil,
      kayitVar,
      durumKodu,
      durumEtiket,
      normalSaat,
      fazlaSaat,
      tatilMesai,
      eksikSaat,
      aciklama
    });
  }

  return gunler;
}

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
  const [acikPersonelId, setAcikPersonelId] = useState<number | null>(null);

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

  // Seçili ay ve yıla ait puantajların icmali (o ay istihdamda olan veya puantaj kaydı bulunanlar)
  const hamList = personeller.filter(p => {
    const hasPuantajInMonth = puantajlar.some(x => {
      if (x.PersonelId !== p.PersonelId) return false;
      const clean = String(x.Tarih || '').trim();
      const match = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (match) {
        return parseInt(match[1], 10) === seciliYil && parseInt(match[2], 10) === seciliAy;
      }
      return false;
    });
    return hasPuantajInMonth || isPersonelCalisiyorMuAyda(p, seciliYil, seciliAy);
  });

  const benzersizMap = new Map<string, Personel>();
  hamList.forEach(p => {
    const normKey = (p.AdSoyad || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!benzersizMap.has(normKey)) {
      benzersizMap.set(normKey, p);
    } else if (!benzersizMap.get(normKey)!.DurumAktifMi && p.DurumAktifMi) {
      benzersizMap.set(normKey, p);
    }
  });

  const icmalListesi = Array.from(benzersizMap.values()).map(p => {
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
                icmalListesi.map((item) => {
                  const isAcik = acikPersonelId === item.personelId;
                  const ayAdi = aylar.find(a => a.no === seciliAy)?.ad || '';
                  const gunlerDetay = isAcik ? getPersonelAyGunleri(item.personelId, seciliYil, seciliAy, puantajlar) : [];

                  return (
                    <React.Fragment key={item.personelId}>
                      <tr className={`hover:bg-slate-800/30 transition ${isAcik ? 'bg-slate-800/40' : ''}`}>
                        <td className="py-2 px-3 font-semibold text-white print:text-black print:py-1 print:px-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setAcikPersonelId(prev => prev === item.personelId ? null : item.personelId)}
                              className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition print:hidden cursor-pointer shrink-0 ${
                                isAcik 
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 shadow-xs' 
                                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white shadow-xs'
                              }`}
                              title={isAcik ? "Detayları kapat (-)" : `${item.adSoyad} için ${ayAdi} ayı tüm günleri alt alta göster (+)`}
                            >
                              {isAcik ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                            <span className="truncate">{item.adSoyad}</span>
                          </div>
                        </td>
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

                      {/* Tıklanınca Altalta Açılan Günlük Puantaj Detay Satırı */}
                      {isAcik && (
                        <tr className="bg-slate-950/90 border-y-2 border-blue-500/40 print:hidden animate-in fade-in duration-150">
                          <td colSpan={12} className="p-3 sm:p-4">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl space-y-3">
                              {/* Başlık ve Ay Özeti */}
                              <div className="px-4 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Calendar className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-bold text-white">{item.adSoyad}</span>
                                      <span className="text-xs text-slate-400">({item.departman})</span>
                                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                        📅 {ayAdi} {seciliYil} Günlük Puantaj Detayı ({gunlerDetay.length} Gün)
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                                      <span>Çalışılan: <strong className="text-slate-200">{item.normalGun} Gün</strong></span>
                                      <span>Normal Mesai: <strong className="text-emerald-400 font-mono">{item.toplamNormalSaat.toFixed(1)}s</strong></span>
                                      <span>%50 Fazla Mesai: <strong className="text-blue-400 font-mono">{item.toplamFazlaMesai.toFixed(1)}s</strong></span>
                                      <span>%100 Tatil Mesaisi: <strong className="text-emerald-300 font-mono">{item.toplamTatilMesai.toFixed(1)}s</strong></span>
                                      {item.toplamEksikSaat > 0 && (
                                        <span>Eksik Saat: <strong className="text-rose-400 font-mono">{item.toplamEksikSaat.toFixed(1)}s</strong></span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setAcikPersonelId(null)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                  <span>Günleri Kapat</span>
                                </button>
                              </div>

                              {/* Günler Tablosu (Alt Alta) */}
                              <div className="max-h-96 overflow-y-auto px-4 pb-4">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-slate-950/90 text-slate-400 text-[11px] uppercase border-b border-slate-800 sticky top-0 z-10 backdrop-blur-xs">
                                    <tr>
                                      <th className="py-2 px-2.5 w-12 text-center">Gün</th>
                                      <th className="py-2 px-3">Tarih</th>
                                      <th className="py-2 px-3">Haftanın Günü</th>
                                      <th className="py-2 px-3">Durum</th>
                                      <th className="py-2 px-3 text-center">Normal Saat</th>
                                      <th className="py-2 px-3 text-center">%50 Fazla Mesai</th>
                                      <th className="py-2 px-3 text-center">%100 Tatil Mesaisi</th>
                                      <th className="py-2 px-3 text-center">Eksik Saat</th>
                                      <th className="py-2 px-4">Açıklama / İzin / Not</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/50">
                                    {gunlerDetay.map((g) => {
                                      const isHaftaSonuRow = g.isHaftaSonu;
                                      return (
                                        <tr 
                                          key={g.isoTarih}
                                          className={`hover:bg-slate-800/40 transition ${
                                            isHaftaSonuRow ? 'bg-amber-500/[0.02]' : ''
                                          }`}
                                        >
                                          <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-400">
                                            {String(g.gunNo).padStart(2, '0')}
                                          </td>
                                          <td className="py-2 px-3 font-mono text-slate-300">
                                            {formatTarihTR(g.isoTarih)}
                                          </td>
                                          <td className="py-2 px-3 font-medium">
                                            <span className={isHaftaSonuRow ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                                              {g.gunAdi}
                                              {g.isCumartesi && ' (Cumartesi)'}
                                              {g.isPazar && ' (Pazar)'}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3">
                                            {getDurumBadge(g.durumKodu, g.durumEtiket, g.tatil?.ad)}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono font-bold">
                                            {g.normalSaat > 0 ? (
                                              <span className="text-emerald-400">{g.normalSaat.toFixed(1)}s</span>
                                            ) : (
                                              <span className="text-slate-600">-</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono font-bold">
                                            {g.fazlaSaat > 0 ? (
                                              <span className="text-blue-400">+{g.fazlaSaat.toFixed(1)}s</span>
                                            ) : (
                                              <span className="text-slate-600">-</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono font-bold">
                                            {g.tatilMesai > 0 ? (
                                              <span className="text-emerald-300">+{g.tatilMesai.toFixed(1)}s</span>
                                            ) : (
                                              <span className="text-slate-600">-</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono font-bold">
                                            {g.eksikSaat > 0 ? (
                                              <span className="text-rose-400">-{g.eksikSaat.toFixed(1)}s</span>
                                            ) : (
                                              <span className="text-slate-600">-</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-4 text-slate-400">
                                            {g.aciklama ? (
                                              <span className="text-slate-200">{g.aciklama}</span>
                                            ) : (
                                              <span className="text-slate-600">-</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
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
