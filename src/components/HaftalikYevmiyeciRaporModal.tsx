import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Personel, GunlukPuantaj } from '../types';
import { FileSpreadsheet, Printer, X, Calendar, ChevronLeft, ChevronRight, Calculator, UserCheck } from 'lucide-react';
import { formatTarihTR, getBugunIso, tarihKaydir, getGunIndex } from '../utils/dateUtils';
import { isPersonelCalisiyorMuHaftada, isPersonelCalisiyorMuTarihte } from '../utils/personelUtils';

interface HaftalikYevmiyeciRaporModalProps {
  isOpen: boolean;
  onClose: () => void;
  personeller: Personel[];
  puantajlar: GunlukPuantaj[];
}

const GUN_KISALTMALARI = ['Pzr', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cmt'];

export const HaftalikYevmiyeciRaporModal: React.FC<HaftalikYevmiyeciRaporModalProps> = ({
  isOpen,
  onClose,
  personeller,
  puantajlar
}) => {
  // Seçili Haftanın Pazartesi Tarihi (YYYY-MM-DD)
  const [seciliPazartesi, setSeciliPazartesi] = useState<string>(() => {
    const bugun = getBugunIso();
    const idx = getGunIndex(bugun); // 0: Pazar, 1: Pazartesi, ...
    const farkToPzt = idx === 0 ? -6 : 1 - idx;
    return tarihKaydir(bugun, farkToPzt);
  });

  // Kullanıcı Talebi: "çalışılmamış (işe girişi olmayan) haftalarda görünmesin isimler"
  // Varsayılan olarak yalnızca bu hafta çalışan / hakedişi olan ustalar gösterilir
  const [sadeceCalisanlar, setSadeceCalisanlar] = useState<boolean>(true);

  // Haftanın 7 gününü hesapla (Pzt -> Pzr)
  const haftaGunleri = useMemo(() => {
    const gunler = [];
    for (let i = 0; i < 7; i++) {
      const dStr = tarihKaydir(seciliPazartesi, i);
      const idx = getGunIndex(dStr);
      gunler.push({
        isoTarih: dStr,
        gunKisa: GUN_KISALTMALARI[idx],
        tarihKisa: formatTarihTR(dStr).slice(0, 5) // "29.09"
      });
    }
    return gunler;
  }, [seciliPazartesi]);

  const pazarTarih = haftaGunleri[6]?.isoTarih || seciliPazartesi;

  // Hafta Kaydır
  const handleHaftaDegistir = (yon: -1 | 1) => {
    setSeciliPazartesi(prev => tarihKaydir(prev, yon * 7));
  };

  // Yevmiyeci Ustaları Filtrele (Yalnızca bu haftada istihdamda olan/işe girişi geçerli olanlar)
  const yevmiyeciler = useMemo(() => {
    const yevList = personeller.filter(p => (p.IsYevmiyeci || p.CalismaTuru === 'Yevmiyeci') && !p.SilindiMi);

    // Çift kayıtları normalize et (Örn: Pasif ve Aktif mükerrer kayıt varsa aktif olanı tercih et)
    const benzersizMap = new Map<string, Personel>();
    yevList.forEach(p => {
      const normKey = (p.AdSoyad || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!benzersizMap.has(normKey)) {
        benzersizMap.set(normKey, p);
      } else if (!benzersizMap.get(normKey)!.DurumAktifMi && p.DurumAktifMi) {
        benzersizMap.set(normKey, p);
      }
    });

    return Array.from(benzersizMap.values()).filter(p => {
      // İşe giriş tarihi bu haftadan sonra olan veya bu haftadan önce ayrılmış olanlar listelenmez!
      return isPersonelCalisiyorMuHaftada(p, seciliPazartesi, pazarTarih);
    });
  }, [personeller, seciliPazartesi, pazarTarih]);

  // Her yevmiyecinin haftalık dökümü
  const hamIcmalListesi = useMemo(() => {
    return yevmiyeciler.map(y => {
      let calisilanGunSayisi = 0;
      let toplamMesaiSaat = 0;
      let toplamKesintiSaat = 0;

      const gunlukDetaylar = haftaGunleri.map(g => {
        // Kişi bu tarihte fabrikada çalışıyor mu (işe giriş öncesi veya çıkış sonrası günler hakedişe dahil edilmez)
        const isIstihdamda = isPersonelCalisiyorMuTarihte(y, g.isoTarih);
        if (!isIstihdamda) {
          const giris = (y.IseGirisTarihi || '').slice(0, 10);
          const cikis = (y.IstenCikisTarihi || '').slice(0, 10);
          const durumEtiket = (giris && g.isoTarih < giris) ? 'İşe Başlamadı' : (cikis && g.isoTarih >= cikis ? 'İşten Ayrıldı' : 'İstihdam Dışı');
          return {
            tarih: g.isoTarih,
            durum: durumEtiket,
            normalSaat: 0,
            mesaiSaat: 0,
            kesintiSaat: 0,
            istihdamda: false
          };
        }

        const kayit = puantajlar.find(p => p.PersonelId === y.PersonelId && String(p.Tarih || '').slice(0, 10) === g.isoTarih);
        const normalSaat = kayit ? Number(kayit.NormalCalismaSaati || 0) : 0;
        const mesaiSaat = kayit ? (Number(kayit.FazlaMesaiSaati || 0) + Number(kayit.HaftaTatiliMesaiSaati || 0) + Number(kayit.ResmiTatilMesaiSaati || 0)) : 0;
        const kesintiSaat = kayit ? Number(kayit.SaatlikKesintiUcretsiz || 0) : 0;
        const durum = kayit ? kayit.DurumKodu : '-';

        // Yevmiyeci için fiilen çalışılan gün:
        // Yevmiyeci ustalar çalıştıkları gün kadar yevmiye alırlar.
        // Fiilen çalışma saati (normalSaat > 0) veya tatil günü mesaisi (mesaiSaat > 0) varsa çalışılan gün sayılır.
        const isCalisilanGun = normalSaat > 0 || (durum === 'HT' && mesaiSaat > 0) || (durum === 'RT' && (normalSaat > 0 || mesaiSaat > 0));
        if (isCalisilanGun) {
          calisilanGunSayisi += 1;
        }
        toplamMesaiSaat += mesaiSaat;
        toplamKesintiSaat += kesintiSaat;

        return {
          tarih: g.isoTarih,
          durum,
          normalSaat,
          mesaiSaat,
          kesintiSaat,
          istihdamda: true
        };
      });

      const yevmiyeTutar = Number(y.GunlukYevmiye || 0);
      const saatlikYevmiye = yevmiyeTutar > 0 ? yevmiyeTutar / 8 : 0;
      const yevmiyeHakedis = calisilanGunSayisi * yevmiyeTutar;
      const mesaiHakedis = toplamMesaiSaat * (saatlikYevmiye * 1.5);
      const kesintiTutar = (toplamKesintiSaat > 0 && saatlikYevmiye > 0) ? (toplamKesintiSaat * saatlikYevmiye) : 0;
      const toplamHakedis = Math.max(0, yevmiyeHakedis + mesaiHakedis - kesintiTutar);

      return {
        yevmiyeciId: y.PersonelId,
        adSoyad: y.AdSoyad,
        gorev: y.Gorev || y.Departman || 'Saha Ustası',
        gunlukYevmiye: yevmiyeTutar,
        gunlukDetaylar,
        calisilanGunSayisi,
        toplamMesaiSaat,
        toplamKesintiSaat,
        kesintiTutar,
        yevmiyeHakedis,
        mesaiHakedis,
        toplamHakedis
      };
    });
  }, [yevmiyeciler, haftaGunleri, puantajlar]);

  // Kullanıcı Talebi: "çalışılmamış (işe girişi olmayan) haftalarda görünmesin isimler"
  // Sadece çalışanlar filtresi açıkken veya çalışılmamış haftalarda (0 gün, 0 mesai) usta isimleri gizlenir
  const icmalListesi = useMemo(() => {
    if (!sadeceCalisanlar) {
      // Tüm istihdamdaki ustalar listesinde dahi yalnızca o hafta işe girişi aktif olanlar gösterilir
      return hamIcmalListesi;
    }
    // Sadece bu hafta fiilen çalışmış veya mesaisi/hakedişi olanlar görünür
    return hamIcmalListesi.filter(item => item.calisilanGunSayisi > 0 || item.toplamMesaiSaat > 0);
  }, [hamIcmalListesi, sadeceCalisanlar]);

  // Genel Toplamlar
  const genelToplamlar = useMemo(() => {
    return icmalListesi.reduce((acc, curr) => {
      acc.toplamGun += curr.calisilanGunSayisi;
      acc.toplamMesai += curr.toplamMesaiSaat;
      acc.toplamKesinti += curr.toplamKesintiSaat;
      acc.toplamYevmiyeTutar += curr.yevmiyeHakedis;
      acc.toplamMesaiTutar += curr.mesaiHakedis;
      acc.toplamKesintiTutar += curr.kesintiTutar;
      acc.toplamHakedis += curr.toplamHakedis;
      return acc;
    }, {
      toplamGun: 0,
      toplamMesai: 0,
      toplamKesinti: 0,
      toplamYevmiyeTutar: 0,
      toplamMesaiTutar: 0,
      toplamKesintiTutar: 0,
      toplamHakedis: 0
    });
  }, [icmalListesi]);

  // CSV Export
  const handleCsvExport = () => {
    let csv = `RENDE İNŞAAT MOBİLYA A.Ş. - YEVMİYECİ HAFTALIK İCMAL HAKEDİŞ CETVELİ\n`;
    csv += `Hafta Dönemi: ${formatTarihTR(seciliPazartesi)} - ${formatTarihTR(pazarTarih)} - Rapor Tarihi: ${formatTarihTR(getBugunIso())}\n\n`;
    csv += `Usta Ad Soyad;Görevi;Günlük Yevmiye;Çalışılan Gün;Toplam Mesai (Sa);Eksik Kesinti (Sa);Yevmiye Hakedişi (TL);Mesai Hakedişi (TL);Toplam Hakediş (TL);İmza\n`;

    icmalListesi.forEach(item => {
      csv += `${item.adSoyad};${item.gorev};${item.gunlukYevmiye} TL;${item.calisilanGunSayisi} Gün;${item.toplamMesaiSaat.toFixed(1)} s;${item.toplamKesintiSaat.toFixed(1)} s;${item.yevmiyeHakedis.toLocaleString('tr-TR')} TL;${item.mesaiHakedis.toLocaleString('tr-TR')} TL;${item.toplamHakedis.toLocaleString('tr-TR')} TL;\n`;
    });

    csv += `\nGENEL TOPLAM;;;${genelToplamlar.toplamGun} Gün;${genelToplamlar.toplamMesai.toFixed(1)} s;${genelToplamlar.toplamKesinti.toFixed(1)} s;${genelToplamlar.toplamYevmiyeTutar.toLocaleString('tr-TR')} TL;${genelToplamlar.toplamMesaiTutar.toLocaleString('tr-TR')} TL;${genelToplamlar.toplamHakedis.toLocaleString('tr-TR')} TL;\n`;

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Yevmiyeci_Haftalik_Icmal_${seciliPazartesi}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Güvenli ve Kesin Yazdırma HTML Üreticisi (Iframe / Direct Print)
  const generatePrintableHtml = () => {
    const bugunTarih = formatTarihTR(getBugunIso());
    const donemStr = `${formatTarihTR(seciliPazartesi)} — ${formatTarihTR(pazarTarih)}`;

    const rowsHtml = icmalListesi.map((item, idx) => {
      const gunCells = item.gunlukDetaylar.map(d => {
        const isCalisti = d.normalSaat > 0 || d.mesaiSaat > 0;
        let content = '<span style="color: #94a3b8;">-</span>';
        if (isCalisti) {
          content = '<span style="color: #15803d; font-weight: bold;">✓</span>';
          if (d.mesaiSaat > 0) {
            content += `<br/><span style="font-size: 7.5pt; font-weight: bold; color: #1d4ed8;">+${d.mesaiSaat}s</span>`;
          }
        } else if (!d.istihdamda) {
          content = `<span style="color: #94a3b8; font-size: 7pt;">${d.durum === 'İşe Başlamadı' ? 'Giriş Yok' : (d.durum === 'İşten Ayrıldı' ? 'Ayrıldı' : '-')}</span>`;
        } else if (d.durum === 'D' || d.durum === 'UI') {
          content = '<span style="color: #b91c1c; font-size: 8pt; font-weight: bold;">Eksik</span>';
        }
        return `<td style="padding: 3px 2px; text-align: center; border: 1px solid #334155;">${content}</td>`;
      }).join('');

      return `
        <tr>
          <td style="padding: 4px 6px; font-weight: bold; border: 1px solid #334155;">${idx + 1}. ${item.adSoyad}<br/><span style="font-size: 7.5pt; font-weight: normal; color: #475569;">${item.gorev}</span></td>
          <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155; font-family: monospace; font-weight: bold;">${item.gunlukYevmiye > 0 ? `${item.gunlukYevmiye.toLocaleString('tr-TR')} ₺` : 'Belirtilmedi'}</td>
          ${gunCells}
          <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155; font-family: monospace; font-weight: bold;">${item.calisilanGunSayisi} Gün</td>
          <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155; font-family: monospace;">${item.toplamMesaiSaat > 0 ? `+${item.toplamMesaiSaat.toFixed(1)}s` : '-'}</td>
          <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155; font-family: monospace; color: ${item.toplamKesintiSaat > 0 ? '#b91c1c' : '#000'};">${item.toplamKesintiSaat > 0 ? `-${item.toplamKesintiSaat.toFixed(1)}s` : '-'}</td>
          <td style="padding: 4px 6px; text-align: right; border: 1px solid #334155; font-family: monospace;">${item.yevmiyeHakedis.toLocaleString('tr-TR')} ₺</td>
          <td style="padding: 4px 6px; text-align: right; border: 1px solid #334155; font-family: monospace;">${item.mesaiHakedis > 0 ? `${item.mesaiHakedis.toLocaleString('tr-TR')} ₺` : '-'}</td>
          <td style="padding: 4px 6px; text-align: right; border: 1.5px solid #000; font-family: monospace; font-weight: bold; background-color: #f8fafc;">${item.toplamHakedis.toLocaleString('tr-TR')} ₺</td>
          <td style="padding: 4px 10px; text-align: center; border: 1px solid #334155; min-width: 60px;">
            <div style="border-bottom: 1px solid #94a3b8; height: 16px; width: 50px; margin: 0 auto;"></div>
          </td>
        </tr>
      `;
    }).join('');

    const gunHeaderCols = haftaGunleri.map(g => `
      <th style="padding: 4px 2px; text-align: center; border: 1px solid #334155; font-size: 8pt; width: 32px;">
        ${g.gunKisa}<br/><span style="font-weight: normal; font-size: 7pt; color: #64748b;">${g.tarihKisa}</span>
      </th>
    `).join('');

    const totalRowHtml = `
      <tr style="background-color: #e2e8f0; font-weight: bold;">
        <td colspan="2" style="padding: 6px; border: 2px solid #000; font-weight: 900;">GENEL TOPLAM (${icmalListesi.length} Usta)</td>
        <td colspan="7" style="padding: 6px; text-align: right; border: 2px solid #000; font-size: 8pt; color: #334155;">Haftalık Toplamlar:</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-family: monospace;">${genelToplamlar.toplamGun} Gün</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-family: monospace;">${genelToplamlar.toplamMesai > 0 ? `${genelToplamlar.toplamMesai.toFixed(1)}s` : '-'}</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-family: monospace; color: #b91c1c;">${genelToplamlar.toplamKesinti > 0 ? `${genelToplamlar.toplamKesinti.toFixed(1)}s` : '-'}</td>
        <td style="padding: 6px; text-align: right; border: 2px solid #000; font-family: monospace;">${genelToplamlar.toplamYevmiyeTutar.toLocaleString('tr-TR')} ₺</td>
        <td style="padding: 6px; text-align: right; border: 2px solid #000; font-family: monospace;">${genelToplamlar.toplamMesaiTutar.toLocaleString('tr-TR')} ₺</td>
        <td style="padding: 6px; text-align: right; border: 2px solid #000; font-family: monospace; font-weight: 900; background-color: #cbd5e1;">${genelToplamlar.toplamHakedis.toLocaleString('tr-TR')} ₺</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-size: 8pt;">Haftalık İcmal</td>
      </tr>
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Yevmiyeci Haftalık İcmal - ${donemStr}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 4px;
            margin-bottom: 8px;
          }
          .company-title {
            font-size: 11pt;
            font-weight: bold;
            letter-spacing: 0.5px;
          }
          .report-title {
            font-size: 13pt;
            font-weight: 900;
            margin: 2px 0;
            letter-spacing: 0.5px;
          }
          .sub-bar {
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
            font-weight: 600;
            margin-top: 4px;
            color: #1e293b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
          }
          th {
            background-color: #f1f5f9;
            color: #000;
            border: 1px solid #334155;
            padding: 5px 3px;
            text-align: center;
            font-weight: bold;
          }
          .rule-note {
            font-size: 7.5pt;
            color: #475569;
            margin-top: 6px;
            margin-bottom: 12px;
            font-style: italic;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 14px;
            page-break-inside: avoid;
          }
          .sig-box {
            width: 28%;
            border-top: 1px solid #000;
            text-align: center;
            padding-top: 4px;
            font-size: 8.5pt;
          }
          .sig-title {
            font-weight: bold;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-title">RENDE İNŞAAT MOBİLYA TURİZM SAN. VE TİC. A.Ş.</div>
          <div class="report-title">YEVMİYECİ USTALAR HAFTALIK İCMAL VE HAKEDİŞ CETVELİ</div>
          <div class="sub-bar">
            <span><strong>Hafta Dönemi:</strong> ${donemStr}</span>
            <span><strong>Rapor Tarihi:</strong> ${bugunTarih}</span>
            <span><strong>Toplam Yevmiyeci Usta:</strong> ${icmalListesi.length} Kişi</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left;">Usta Ad Soyad / Görev</th>
              <th>Günlük Yevmiye</th>
              ${gunHeaderCols}
              <th>Çalışılan Gün</th>
              <th>Fazla Mesai</th>
              <th>Eksik Kesinti</th>
              <th>Yevmiye Hakedişi</th>
              <th>Mesai Hakedişi</th>
              <th style="background-color: #e2e8f0;">Net Toplam Hakediş</th>
              <th>İmza</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            ${totalRowHtml}
          </tfoot>
        </table>

        <div class="rule-note">
          * Yevmiyeci Hesaplama Esasları: Yevmiyeci ustaların fiili çalıştığı günler (✓) yevmiye ücretiyle çarpılır. Hafta içi ve hafta sonu fazla mesaileri saatlik yevmiyenin %50 artırımlı tutarıyla (x1.5) eklenir. Saatlik ücretsiz kesintiler varsa hakedişten düşülür.
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-title">Hazırlayan</div>
            <div>Şantiye / Atölye Şefi</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Kontrol Eden</div>
            <div>Fabrika Müdürü</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Onaylayan</div>
            <div>Genel Müdür</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Yazdır Butonu Tetikleyicisi
  const handlePrint = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      const existingFrame = document.getElementById('rende-print-yevmiyeci-frame');
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'rende-print-yevmiyeci-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(generatePrintableHtml());
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (printErr) {
            console.warn('Iframe print call failed, triggering window.print:', printErr);
            window.focus();
            window.print();
          }
        }, 250);
        return;
      }
    } catch (err) {
      console.warn('Print iframe initialization error:', err);
    }

    // Direct fallback
    window.focus();
    window.print();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm p-4 flex justify-center items-start print-modal-overlay"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 landscape;
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
          .print-modal-overlay {
            position: static !important;
            display: block !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-modal-content {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            padding: 15mm !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10pt !important;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 4px 6px !important;
            color: #000 !important;
          }
          th {
            background-color: #f1f5f9 !important;
          }
        }
      ` }} />

      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl my-6 print-modal-content"
      >
        {/* MODAL BAŞLIĞI */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                <span>🔨 Yevmiyeci Ustalar Haftalık İcmal Raporu</span>
              </h2>
              <p className="text-xs text-slate-400">
                Haftalık puantaj, günlük yevmiye, mesai ve hakediş hesaplama cetveli
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCsvExport}
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Excel (CSV) İndir</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow"
              title="Yazdır / PDF Olarak Kaydet"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* HAFTA SEÇİM BARI */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleHaftaDegistir(-1)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
              title="Önceki Hafta"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-amber-300 font-mono">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>{formatTarihTR(seciliPazartesi)} — {formatTarihTR(pazarTarih)}</span>
            </div>

            <button
              onClick={() => handleHaftaDegistir(1)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
              title="Sonraki Hafta"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Çalışanlar / Tüm Ustalar Filtresi */}
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSadeceCalisanlar(true)}
                className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  sadeceCalisanlar
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Yalnızca bu hafta fiilen çalışması veya mesaisi olan ustaları listeler"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Sadece Bu Hafta Çalışanlar ({hamIcmalListesi.filter(x => x.calisilanGunSayisi > 0 || x.toplamMesaiSaat > 0).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSadeceCalisanlar(false)}
                className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  !sadeceCalisanlar
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Bu hafta istihdamda olan (işe başlamış) tüm kayıtlı yevmiyecileri listeler"
              >
                <span>Tüm İstihdamdaki Ustalar ({yevmiyeciler.length})</span>
              </button>
            </div>

            <div className="text-xs text-slate-400 font-mono hidden md:block">
              Listelenen: <strong className="text-white font-bold">{icmalListesi.length} Usta</strong>
            </div>
          </div>
        </div>

        {/* YAZDIRILACAK BAŞLIK (SADECE PRINT ESANASINDA GÖRÜNÜR) */}
        <div className="hidden print:block mb-4 text-center">
          <h1 className="text-lg font-bold text-black uppercase">RENDE İNŞAAT MOBİLYA A.Ş.</h1>
          <h2 className="text-sm font-semibold text-black mt-1">YEVMİYECİ USTALAR HAFTALIK İCMAL VE HAKEDİŞ CETVELİ</h2>
          <p className="text-xs text-black mt-0.5">Dönem: {formatTarihTR(seciliPazartesi)} — {formatTarihTR(pazarTarih)} | Rapor Tarihi: {formatTarihTR(getBugunIso())}</p>
        </div>

        {/* TABLO ALANI */}
        <div className="p-6 space-y-4">
          {icmalListesi.length === 0 ? (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <UserCheck className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">
                {sadeceCalisanlar
                  ? "Bu Hafta Çalışması / Hakedişi Bulunan Yevmiyeci Usta Yok"
                  : "Bu Hafta İçin İstihdamda Olan Yevmiyeci Usta Bulunmuyor"}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {sadeceCalisanlar
                  ? "Seçili hafta döneminde fiilen çalışma veya mesai girişi olan usta bulunmuyor. İşe henüz başlamamış veya çalışmamış ustalar gizlenmiştir."
                  : "Seçili hafta döneminde işe giriş tarihi aktif olan yevmiyeci usta kaydı bulunmamaktadır."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800 rounded-xl shadow-lg">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Usta Ad Soyad / Görev</th>
                    <th className="py-3 px-2 text-center">Günlük Yevmiye</th>
                    {haftaGunleri.map((g, idx) => (
                      <th key={g.isoTarih} className={`py-3 px-1 text-center ${idx === 6 ? 'bg-amber-950/30 text-amber-300' : ''}`}>
                        <div>{g.gunKisa}</div>
                        <div className="text-[9px] text-slate-500 font-normal">{g.tarihKisa}</div>
                      </th>
                    ))}
                    <th className="py-3 px-2 text-center bg-slate-900 border-l border-slate-800">Çalışılan Gün</th>
                    <th className="py-3 px-2 text-center bg-slate-900">Toplam Mesai</th>
                    <th className="py-3 px-2 text-center bg-rose-950/30 text-rose-300">Eksik Kesinti</th>
                    <th className="py-3 px-3 text-right bg-blue-950/40 text-blue-300 font-bold border-l border-slate-800">Yevmiye Hakedişi</th>
                    <th className="py-3 px-3 text-right bg-blue-950/40 text-blue-300 font-bold">Mesai Hakedişi</th>
                    <th className="py-3 px-3 text-right bg-amber-950/50 text-amber-300 font-bold border-l border-slate-800">Net Toplam Hakediş</th>
                    <th className="py-3 px-4 text-center print:table-cell hidden">İmza</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                  {icmalListesi.map(item => (
                    <tr key={item.yevmiyeciId} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                        <div className="font-bold text-slate-100">{item.adSoyad}</div>
                        <div className="text-[10px] text-amber-400/80 font-normal">{item.gorev}</div>
                      </td>

                      <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-300">
                        {item.gunlukYevmiye > 0 ? `${item.gunlukYevmiye.toLocaleString('tr-TR')} ₺` : 'Belirtilmedi'}
                      </td>

                      {item.gunlukDetaylar.map((d, idx) => {
                        const isCalisti = d.normalSaat > 0 || d.mesaiSaat > 0;
                        return (
                          <td key={d.tarih} className={`py-2.5 px-1 text-center font-mono ${idx === 6 ? 'bg-amber-950/10' : ''}`}>
                            {isCalisti ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="text-emerald-400 font-bold text-[11px]">✓</span>
                                {d.mesaiSaat > 0 && (
                                  <span className="text-[9px] text-blue-400 font-bold bg-blue-950 px-1 rounded border border-blue-800">
                                    +{d.mesaiSaat}s
                                  </span>
                                )}
                              </div>
                            ) : !d.istihdamda ? (
                              <span className="text-slate-600 text-[9px]" title={d.durum}>
                                {d.durum === 'İşe Başlamadı' ? 'Giriş Yok' : (d.durum === 'İşten Ayrıldı' ? 'Ayrıldı' : '-')}
                              </span>
                            ) : d.durum === 'D' || d.durum === 'UI' ? (
                              <span className="text-rose-400 font-semibold text-[10px]" title="Eksik Gün / İzin">Eksik</span>
                            ) : (
                              <span className="text-slate-600 text-[10px]">-</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-400 bg-slate-950/40 border-l border-slate-800">
                        {item.calisilanGunSayisi} Gün
                      </td>

                      <td className="py-2.5 px-2 text-center font-mono font-bold text-blue-400 bg-slate-950/40">
                        {item.toplamMesaiSaat > 0 ? `${item.toplamMesaiSaat} s` : '-'}
                      </td>

                      <td className="py-2.5 px-2 text-center font-mono font-bold text-rose-400 bg-rose-950/20">
                        {item.toplamKesintiSaat > 0 ? `-${item.toplamKesintiSaat} s` : '-'}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200 bg-blue-950/20 border-l border-slate-800">
                        {item.yevmiyeHakedis.toLocaleString('tr-TR')} ₺
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-300 bg-blue-950/20">
                        {item.mesaiHakedis > 0 ? `${item.mesaiHakedis.toLocaleString('tr-TR')} ₺` : '-'}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-black text-amber-300 bg-amber-950/30 text-sm border-l border-slate-800">
                        {item.toplamHakedis.toLocaleString('tr-TR')} ₺
                      </td>

                      <td className="py-2.5 px-4 text-center print:table-cell hidden border-b">
                        <div className="h-8 border-b border-dashed border-black/30 w-16 mx-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot className="bg-slate-950 font-bold text-xs text-white border-t-2 border-slate-700">
                  <tr>
                    <td className="py-3 px-3 text-amber-400 font-black">
                      📊 GENEL TOPLAM
                    </td>
                    <td className="py-3 px-2 text-center text-slate-400">
                      -
                    </td>
                    <td colSpan={7} className="py-3 px-2 text-right text-slate-300 border-l border-slate-800">
                      Haftalık Toplam Gün &amp; Mesai:
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-emerald-400 font-black">
                      {genelToplamlar.toplamGun} Gün
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-blue-400 font-black">
                      {genelToplamlar.toplamMesai} s
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-rose-400 font-black">
                      {genelToplamlar.toplamKesinti > 0 ? `-${genelToplamlar.toplamKesinti} s` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-200 font-black border-l border-slate-800">
                      {genelToplamlar.toplamYevmiyeTutar.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-blue-300 font-black">
                      {genelToplamlar.toplamMesaiTutar.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-300 font-black text-sm bg-amber-950/50 border-l border-slate-800">
                      {genelToplamlar.toplamHakedis.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="py-3 px-4 print:table-cell hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
