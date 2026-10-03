import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Personel, GunlukPuantaj } from '../types';
import { FileSpreadsheet, Printer, X, Calendar, ChevronLeft, ChevronRight, Calculator, UserCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatTarihTR, getBugunIso, tarihKaydir, getGunIndex } from '../utils/dateUtils';
import { isPersonelCalisiyorMuHaftada } from '../utils/personelUtils';

interface HaftalikYevmiyeciRaporModalProps {
  isOpen: boolean;
  onClose: () => void;
  personeller: Personel[];
  puantajlar: GunlukPuantaj[];
}

const GUN_KISALTMALARI = ['Pzr', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cmt'];
const GUN_ISIMLERI_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

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

  // Haftanın 7 gününü hesapla (Pzt -> Pzr)
  const haftaGunleri = useMemo(() => {
    const gunler = [];
    for (let i = 0; i < 7; i++) {
      const dStr = tarihKaydir(seciliPazartesi, i);
      const idx = getGunIndex(dStr);
      gunler.push({
        isoTarih: dStr,
        gunKisa: GUN_KISALTMALARI[idx],
        gunAdi: GUN_ISIMLERI_TR[idx],
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

  // Yevmiyeci Ustaları Bu Hafta İçin Filtrele
  // Kullanıcı Talebi: "çalışılmamış (işe girişi olmayan) haftalarda görünmesin isimler"
  const yevmiyeciler = useMemo(() => {
    return personeller.filter(p => {
      const isYevmiyeci = Boolean(p.IsYevmiyeci || p.CalismaTuru === 'Yevmiyeci');
      if (!isYevmiyeci) return false;

      // O hafta istihdamda mı (işe giriş bu haftadan sonra veya çıkış bu haftadan önce değil)
      const istihdamdaMi = isPersonelCalisiyorMuHaftada(p, seciliPazartesi, pazarTarih);
      if (!istihdamdaMi) return false;

      return true;
    });
  }, [personeller, seciliPazartesi, pazarTarih]);

  // Her yevmiyecinin haftalık dökümü
  const icmalListesi = useMemo(() => {
    return yevmiyeciler.map(y => {
      let calisilanGunSayisi = 0;
      let toplamNormalSaat = 0;
      let toplamMesaiSaat = 0;
      let toplamKesintiSaat = 0;
      const eksikNotlari: string[] = [];
      const genelNotlar: string[] = [];

      const gunlukDetaylar = haftaGunleri.map(g => {
        const dStr = g.isoTarih;
        const gunIdx = getGunIndex(dStr);
        const gunAdi = GUN_ISIMLERI_TR[gunIdx];
        const kayit = puantajlar.find(p => p.PersonelId === y.PersonelId && String(p.Tarih || '').slice(0, 10) === dStr);
        const normalSaatRaw = kayit ? Number(kayit.NormalCalismaSaati || 0) : 0;
        const fazlaSaat = kayit ? Number(kayit.FazlaMesaiSaati || 0) : 0;
        const tatilMesai = kayit ? (Number(kayit.HaftaTatiliMesaiSaati || 0) + Number(kayit.ResmiTatilMesaiSaati || 0)) : 0;
        const mesaiSaat = fazlaSaat + tatilMesai;
        const kesintiSaatRaw = kayit ? Number(kayit.SaatlikKesintiUcretsiz || 0) : 0;
        const durum = kayit ? kayit.DurumKodu : '-';
        const aciklama = kayit ? (kayit.Aciklama || '').trim() : '';

        if (aciklama && !genelNotlar.includes(aciklama)) {
          genelNotlar.push(aciklama);
        }

        let isCalisti = false;
        let normalSaat = 0;
        let eksikSaat = 0;
        let eksikNot = '';

        if (kayit) {
          if (durum === 'N' || durum === 'RT' || (durum === 'HT' && mesaiSaat > 0) || normalSaatRaw > 0) {
            isCalisti = true;
            calisilanGunSayisi += 1;

            // Standart yevmiyeci tam gün çalışma süresi 8 saattir.
            // Kullanıcı Talebi: "yevmiyeci tam gün çalışmadıysa eksik mesaisi de yazılsın açıklamada şu gün eksik çalıştı yazsın"
            if (kesintiSaatRaw > 0) {
              eksikSaat = kesintiSaatRaw;
              normalSaat = Math.max(0, (normalSaatRaw > 0 ? normalSaatRaw : 8.0) - kesintiSaatRaw);
              eksikNot = `${gunAdi} (${eksikSaat.toFixed(1)}s eksik kesinti)`;
              eksikNotlari.push(`${gunAdi} günü ${eksikSaat.toFixed(1)}s eksik çalıştı`);
            } else if (normalSaatRaw > 0 && normalSaatRaw < 8.0) {
              eksikSaat = 8.0 - normalSaatRaw;
              normalSaat = normalSaatRaw;
              eksikNot = `${gunAdi} (${eksikSaat.toFixed(1)}s eksik / ${normalSaat.toFixed(1)}s fiili)`;
              eksikNotlari.push(`${gunAdi} günü ${eksikSaat.toFixed(1)}s eksik çalıştı (${normalSaat.toFixed(1)}s fiili)`);
            } else if (normalSaatRaw >= 8.0) {
              normalSaat = normalSaatRaw;
            } else {
              normalSaat = 8.0;
            }
          } else if (durum === 'D' || durum === 'UI') {
            eksikSaat = 8.0;
            eksikNot = `${gunAdi} (Gelmedi/Devamsız)`;
            eksikNotlari.push(`${gunAdi} günü devamsız/gelmedi`);
          }
        }

        toplamNormalSaat += normalSaat;
        toplamMesaiSaat += mesaiSaat;
        toplamKesintiSaat += eksikSaat;

        return {
          tarih: g.isoTarih,
          gunKisa: g.gunKisa,
          gunAdi,
          durum,
          normalSaat,
          mesaiSaat,
          kesintiSaat: eksikSaat,
          eksikSaat,
          eksikNot,
          isCalisti,
          aciklama
        };
      });

      const yevmiyeTutar = Number(y.GunlukYevmiye || 0);
      const saatlikYevmiye = yevmiyeTutar > 0 ? yevmiyeTutar / 8.0 : 0;

      // Fiili normal saat x saatlik yevmiye
      const yevmiyeHakedis = toplamNormalSaat * saatlikYevmiye;
      const mesaiHakedis = toplamMesaiSaat * (saatlikYevmiye * 1.5);
      const kesintiTutar = toplamKesintiSaat * saatlikYevmiye;
      const toplamHakedis = Math.max(0, yevmiyeHakedis + mesaiHakedis);
      const toplamSaat = toplamNormalSaat + toplamMesaiSaat;

      const eksikAciklamaMetni = eksikNotlari.length > 0 
        ? eksikNotlari.join(' • ')
        : (genelNotlar.length > 0 ? genelNotlar.join(', ') : 'Tam Gün Çalışma');

      return {
        yevmiyeciId: y.PersonelId,
        adSoyad: y.AdSoyad,
        gorev: y.Gorev || y.Departman || 'Saha Ustası',
        gunlukYevmiye: yevmiyeTutar,
        saatlikYevmiye,
        gunlukDetaylar,
        calisilanGunSayisi,
        toplamNormalSaat,
        toplamMesaiSaat,
        toplamKesintiSaat,
        toplamSaat,
        kesintiTutar,
        yevmiyeHakedis,
        mesaiHakedis,
        toplamHakedis,
        eksikNotlari,
        eksikAciklamaMetni
      };
    });
  }, [yevmiyeciler, haftaGunleri, puantajlar]);

  // Genel Toplamlar
  const genelToplamlar = useMemo(() => {
    return icmalListesi.reduce((acc, curr) => {
      acc.toplamGun += curr.calisilanGunSayisi;
      acc.toplamNormalSaat += curr.toplamNormalSaat;
      acc.toplamMesai += curr.toplamMesaiSaat;
      acc.toplamKesinti += curr.toplamKesintiSaat;
      acc.toplamSaat += curr.toplamSaat;
      acc.toplamYevmiyeTutar += curr.yevmiyeHakedis;
      acc.toplamMesaiTutar += curr.mesaiHakedis;
      acc.toplamKesintiTutar += curr.kesintiTutar;
      acc.toplamHakedis += curr.toplamHakedis;
      return acc;
    }, {
      toplamGun: 0,
      toplamNormalSaat: 0,
      toplamMesai: 0,
      toplamKesinti: 0,
      toplamSaat: 0,
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
    csv += `Usta Ad Soyad;Görevi;Günlük Yevmiye;Çalışılan Gün;Toplam Normal Saat;Toplam Mesai (Sa);Eksik Kesinti (Sa);Toplam Saat (Sa);Yevmiye Hakedişi (TL);Mesai Hakedişi (TL);Toplam Hakediş (TL);Eksik Çalışma Açıklaması;İmza\n`;

    icmalListesi.forEach(item => {
      csv += `${item.adSoyad};${item.gorev};${item.gunlukYevmiye} TL;${item.calisilanGunSayisi} Gün;${item.toplamNormalSaat.toFixed(1)} s;${item.toplamMesaiSaat.toFixed(1)} s;${item.toplamKesintiSaat.toFixed(1)} s;${item.toplamSaat.toFixed(1)} s;${item.yevmiyeHakedis.toLocaleString('tr-TR')} TL;${item.mesaiHakedis.toLocaleString('tr-TR')} TL;${item.toplamHakedis.toLocaleString('tr-TR')} TL;"${item.eksikAciklamaMetni}";\n`;
    });

    csv += `\nGENEL TOPLAM (${icmalListesi.length} Usta);;;${genelToplamlar.toplamGun} Gün;${genelToplamlar.toplamNormalSaat.toFixed(1)} s;${genelToplamlar.toplamMesai.toFixed(1)} s;${genelToplamlar.toplamKesinti.toFixed(1)} s;${genelToplamlar.toplamSaat.toFixed(1)} s;${genelToplamlar.toplamYevmiyeTutar.toLocaleString('tr-TR')} TL;${genelToplamlar.toplamMesaiTutar.toLocaleString('tr-TR')} TL;${genelToplamlar.toplamHakedis.toLocaleString('tr-TR')} TL;;\n`;

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
        let content = '<span style="color: #94a3b8;">-</span>';
        if (d.isCalisti) {
          if (d.eksikSaat > 0) {
            content = `<span style="color: #d97706; font-weight: bold;">${d.normalSaat}s</span><br/><span style="font-size: 7pt; color: #b91c1c; font-weight: bold;">-${d.eksikSaat}s</span>`;
          } else {
            content = '<span style="color: #15803d; font-weight: bold;">✓ 8s</span>';
          }
          if (d.mesaiSaat > 0) {
            content += `<br/><span style="font-size: 7.5pt; font-weight: bold; color: #1d4ed8;">+${d.mesaiSaat}s</span>`;
          }
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
          <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155; font-family: monospace; font-weight: bold; background-color: #f1f5f9;">${item.toplamSaat.toFixed(1)}s</td>
          <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155; font-family: monospace; color: ${item.toplamMesaiSaat > 0 ? '#1d4ed8' : '#000'}; font-weight: bold;">${item.toplamMesaiSaat > 0 ? `+${item.toplamMesaiSaat.toFixed(1)}s` : '-'}</td>
          <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155; font-family: monospace; color: ${item.toplamKesintiSaat > 0 ? '#b91c1c' : '#000'}; font-weight: bold;">${item.toplamKesintiSaat > 0 ? `-${item.toplamKesintiSaat.toFixed(1)}s` : '-'}</td>
          <td style="padding: 4px 6px; text-align: right; border: 1px solid #334155; font-family: monospace;">${item.yevmiyeHakedis.toLocaleString('tr-TR')} ₺</td>
          <td style="padding: 4px 6px; text-align: right; border: 1px solid #334155; font-family: monospace;">${item.mesaiHakedis > 0 ? `${item.mesaiHakedis.toLocaleString('tr-TR')} ₺` : '-'}</td>
          <td style="padding: 4px 6px; text-align: right; border: 1.5px solid #000; font-family: monospace; font-weight: bold; background-color: #f8fafc;">${item.toplamHakedis.toLocaleString('tr-TR')} ₺</td>
          <td style="padding: 4px 6px; font-size: 7.5pt; border: 1px solid #334155; color: ${item.eksikNotlari.length > 0 ? '#b45309' : '#475569'};">${item.eksikAciklamaMetni}</td>
          <td style="padding: 4px 10px; text-align: center; border: 1px solid #334155; min-width: 50px;">
            <div style="border-bottom: 1px solid #94a3b8; height: 16px; width: 45px; margin: 0 auto;"></div>
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
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-family: monospace; font-weight: 900; background-color: #cbd5e1;">${genelToplamlar.toplamSaat.toFixed(1)}s</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-family: monospace; color: #1d4ed8;">${genelToplamlar.toplamMesai > 0 ? `+${genelToplamlar.toplamMesai.toFixed(1)}s` : '-'}</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-family: monospace; color: #b91c1c;">${genelToplamlar.toplamKesinti > 0 ? `-${genelToplamlar.toplamKesinti.toFixed(1)}s` : '-'}</td>
        <td style="padding: 6px; text-align: right; border: 2px solid #000; font-family: monospace;">${genelToplamlar.toplamYevmiyeTutar.toLocaleString('tr-TR')} ₺</td>
        <td style="padding: 6px; text-align: right; border: 2px solid #000; font-family: monospace;">${genelToplamlar.toplamMesaiTutar.toLocaleString('tr-TR')} ₺</td>
        <td style="padding: 6px; text-align: right; border: 2px solid #000; font-family: monospace; font-weight: 900; background-color: #cbd5e1;">${genelToplamlar.toplamHakedis.toLocaleString('tr-TR')} ₺</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-size: 7.5pt;">${icmalListesi.length} Usta</td>
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
            font-size: 8pt;
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
              <th>Toplam Saat</th>
              <th>Fazla Mesai</th>
              <th>Eksik Kesinti</th>
              <th>Yevmiye Hakedişi</th>
              <th>Mesai Hakedişi</th>
              <th style="background-color: #e2e8f0;">Net Toplam Hakediş</th>
              <th>Açıklama / Eksik Çalışma Notu</th>
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
          * Yevmiyeci Hesaplama Esasları: Yevmiyeci ustaların fiili çalıştığı günler (✓) ve tam gün çalışılmayan eksik saatler (8 saat esası) saatlik yevmiye bazında netleştirilir. Fazla mesailer %50 artırımlı tutarla (x1.5) eklenir. Eksik çalışılan günler açıklamada belirtilmiştir.
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
        className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl my-6 print-modal-content"
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
                Haftalık puantaj, günlük yevmiye, toplam saat, eksik mesai ve hakediş hesaplama cetveli
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

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>
              Bu Hafta Aktif Usta: <strong className="text-white font-mono">{icmalListesi.length} Personel</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              Toplam Saat: <strong className="text-cyan-300 font-mono font-bold">{genelToplamlar.toplamSaat.toFixed(1)} s</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              Toplam Net Hakediş: <strong className="text-amber-300 font-mono font-bold">{genelToplamlar.toplamHakedis.toLocaleString('tr-TR')} ₺</strong>
            </span>
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
              <p className="text-sm font-semibold text-slate-300">Bu Haftada Aktif / Çalışan Yevmiyeci Usta Bulunamadı</p>
              <p className="text-xs text-slate-500 mt-1">
                Seçili hafta döneminde ({formatTarihTR(seciliPazartesi)} — {formatTarihTR(pazarTarih)}) işe girişi olan veya çalışan yevmiyeci personel bulunmamaktadır.
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
                    <th className="py-3 px-2 text-center bg-cyan-950/40 text-cyan-300 font-bold">Toplam Saat</th>
                    <th className="py-3 px-2 text-center bg-blue-950/30 text-blue-300">Fazla Mesai</th>
                    <th className="py-3 px-2 text-center bg-rose-950/30 text-rose-300">Eksik Kesinti</th>
                    <th className="py-3 px-3 text-right bg-blue-950/40 text-blue-300 font-bold border-l border-slate-800">Yevmiye Hakedişi</th>
                    <th className="py-3 px-3 text-right bg-blue-950/40 text-blue-300 font-bold">Mesai Hakedişi</th>
                    <th className="py-3 px-3 text-right bg-amber-950/50 text-amber-300 font-bold border-l border-slate-800">Net Hakediş</th>
                    <th className="py-3 px-4 text-left min-w-[180px]">Açıklama / Eksik Detayı</th>
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
                        return (
                          <td key={d.tarih} className={`py-2 px-1 text-center font-mono ${idx === 6 ? 'bg-amber-950/10' : ''}`}>
                            {d.isCalisti ? (
                              <div className="inline-flex flex-col items-center justify-center">
                                {d.eksikSaat > 0 ? (
                                  <div className="flex flex-col items-center leading-tight">
                                    <span className="text-amber-400 font-bold text-[10px]" title={`${d.normalSaat} saat fiili çalışma`}>
                                      {d.normalSaat.toFixed(1)}s
                                    </span>
                                    <span className="text-[9px] text-rose-400 font-semibold bg-rose-950/80 px-1 rounded border border-rose-900" title={`${d.eksikSaat} saat eksik`}>
                                      -{d.eksikSaat}s
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center leading-tight">
                                    <span className="text-emerald-400 font-bold text-[11px]">✓</span>
                                    <span className="text-[9px] text-slate-400 font-normal">8s</span>
                                  </div>
                                )}
                                {d.mesaiSaat > 0 && (
                                  <span className="text-[9px] text-blue-400 font-bold bg-blue-950/90 px-1 rounded border border-blue-800 mt-0.5">
                                    +{d.mesaiSaat}s
                                  </span>
                                )}
                              </div>
                            ) : d.durum === 'D' || d.durum === 'UI' ? (
                              <span className="text-rose-400 font-bold text-[10px] bg-rose-950/50 px-1 py-0.5 rounded border border-rose-900">
                                Gelmedi
                              </span>
                            ) : (
                              <span className="text-slate-600 text-[10px]">-</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-400 bg-slate-950/40 border-l border-slate-800">
                        {item.calisilanGunSayisi} Gün
                      </td>

                      <td className="py-2.5 px-2 text-center font-mono font-bold text-cyan-300 bg-cyan-950/30">
                        {item.toplamSaat > 0 ? `${item.toplamSaat.toFixed(1)} s` : '-'}
                      </td>

                      <td className="py-2.5 px-2 text-center font-mono font-bold text-blue-400 bg-slate-950/40">
                        {item.toplamMesaiSaat > 0 ? `+${item.toplamMesaiSaat.toFixed(1)} s` : '-'}
                      </td>

                      <td className="py-2.5 px-2 text-center font-mono font-bold text-rose-400 bg-rose-950/20">
                        {item.toplamKesintiSaat > 0 ? `-${item.toplamKesintiSaat.toFixed(1)} s` : '-'}
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

                      <td className="py-2.5 px-4 text-left">
                        {item.eksikNotlari.length > 0 ? (
                          <div className="flex items-center gap-1.5 text-amber-300 font-medium text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{item.eksikAciklamaMetni}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-400/90 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{item.eksikAciklamaMetni}</span>
                          </div>
                        )}
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
                      Haftalık Toplamlar:
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-emerald-400 font-black">
                      {genelToplamlar.toplamGun} Gün
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-cyan-300 font-black">
                      {genelToplamlar.toplamSaat.toFixed(1)} s
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-blue-400 font-black">
                      {genelToplamlar.toplamMesai > 0 ? `+${genelToplamlar.toplamMesai.toFixed(1)} s` : '-'}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-rose-400 font-black">
                      {genelToplamlar.toplamKesinti > 0 ? `-${genelToplamlar.toplamKesinti.toFixed(1)} s` : '-'}
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
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {icmalListesi.length} Usta Listelendi
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
