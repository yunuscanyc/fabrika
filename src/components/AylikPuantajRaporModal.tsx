import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Personel, GunlukPuantaj } from '../types';
import { FileSpreadsheet, Printer, X, Download, Plus, Minus, Calendar, Clock } from 'lucide-react';
import { formatTarihTR, getBugunIso, getGunIndex, getResmiTatil, getStandartNormalSaat } from '../utils/dateUtils';
import { isPersonelCalisiyorMuAyda, isPersonelCalisiyorMuTarihte } from '../utils/personelUtils';

const GUN_ISIMLERI = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function getDurumBadge(durumKodu: string, durumEtiket?: string, tatilAd?: string) {
  switch (durumKodu) {
    case 'ISTIHDAM_DISI':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/60 text-slate-400 border border-slate-700/60">
          ⏳ {durumEtiket || 'İstihdam Dışı'}
        </span>
      );
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
  personel: Personel,
  yil: number,
  ay: number,
  puantajlar: GunlukPuantaj[],
  rejim: '5gun' | '6gun' = '5gun'
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
    const istihdamdaMi = isPersonelCalisiyorMuTarihte(personel, isoTarih);

    // Personelin bu tarihteki puantaj kaydını bul
    const kayit = puantajlar.find(x => {
      if (x.PersonelId !== personel.PersonelId) return false;
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

    if (!istihdamdaMi) {
      durumKodu = 'ISTIHDAM_DISI';
      const giris = (personel.IseGirisTarihi || '').slice(0, 10);
      const cikis = (personel.IstenCikisTarihi || '').slice(0, 10);
      if (giris && isoTarih < giris) {
        durumEtiket = 'İşe Başlamadı';
      } else if (cikis && isoTarih >= cikis) {
        durumEtiket = 'İşten Ayrıldı';
      } else {
        durumEtiket = 'İstihdam Dışı';
      }
    } else if (kayit) {
      kayitVar = true;
      durumKodu = kayit.DurumKodu || 'N';
      normalSaat = Number(kayit.NormalCalismaSaati || 0);
      fazlaSaat = Number(kayit.FazlaMesaiSaati || 0);
      tatilMesai = Number((kayit.HaftaTatiliMesaiSaati || 0) + (kayit.ResmiTatilMesaiSaati || 0));
      
      let kesinti = Number(kayit.SaatlikKesintiUcretsiz || 0);
      if (durumKodu === 'UI' && kesinti === 0) {
        // Günün standart çalışma saati (5 günlükte hafta içi 9s, 6 günlükte hafta içi 8s, Cumartesi 5s)
        kesinti = getStandartNormalSaat(isoTarih, rejim);
      }
      eksikSaat = kesinti;
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
      aciklama,
      istihdamdaMi
    });
  }

  return gunler;
}

interface AylikPuantajRaporModalProps {
  isOpen: boolean;
  onClose: () => void;
  personeller: Personel[];
  puantajlar: GunlukPuantaj[];
  calismaRejimi?: '5gun' | '6gun';
}

export const AylikPuantajRaporModal: React.FC<AylikPuantajRaporModalProps> = ({
  isOpen,
  onClose,
  personeller,
  puantajlar,
  calismaRejimi = '5gun'
}) => {
  const [seciliYil, setSeciliYil] = useState(new Date().getFullYear());
  const [seciliAy, setSeciliAy] = useState(new Date().getMonth() + 1);
  const [acikPersonelId, setAcikPersonelId] = useState<number | null>(null);
  const [rejim, setRejim] = useState<'5gun' | '6gun'>(calismaRejimi);

  useEffect(() => {
    fetch('/api/mesai-ayarlari')
      .then(r => r.json())
      .then(d => {
        if (d && (d.CalismaRejimi === '5gun' || d.CalismaRejimi === '6gun')) {
          setRejim(d.CalismaRejimi);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
    // Yevmiyeciler Aylık İcmal Raporunda Yer Almaz (Haftalık Yevmiyeci İcmalinde Raporlanır)
    if (p.IsYevmiyeci || p.CalismaTuru === 'Yevmiyeci') return false;

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

    // Ay içindeki fiili istihdam günlerini tespit et (Kıst Dönem / Ay Ortası Giriş-Çıkış Kontrolü)
    const ayTakvimGunSayisi = new Date(seciliYil, seciliAy, 0).getDate();
    let aktifIstihdamGunSayisi = 0;
    for (let g = 1; g <= ayTakvimGunSayisi; g++) {
      const gStr = String(g).padStart(2, '0');
      const mStr = String(seciliAy).padStart(2, '0');
      const isoD = `${seciliYil}-${mStr}-${gStr}`;
      if (isPersonelCalisiyorMuTarihte(p, isoD)) {
        aktifIstihdamGunSayisi++;
      }
    }

    // Kıst dönem tespiti:
    // Eğer personel ayın tüm günlerinde istihdamda ise (veya giriş-çıkış kaydı girilmemiş tam aktifse):
    // Standard maktu kuralı uygulanır: Baz Gün = 30 Gün, Baz Saat = 240 Saat (30g × 8s).
    // Ancak personel ay ortasında işe girmiş veya ayrılmışsa:
    // SGK ve İş Kanunu esasıyla "Kıst Dönem" uygulanır: Baz Gün = Ay içindeki fiili istihdam gün sayısı, Baz Saat = Baz Gün × 8 Saat.
    const kistDonemMi = aktifIstihdamGunSayisi > 0 && aktifIstihdamGunSayisi < ayTakvimGunSayisi;
    const bazGun = kistDonemMi ? aktifIstihdamGunSayisi : (aktifIstihdamGunSayisi === 0 ? 0 : 30);
    const bazSaat = kistDonemMi ? (aktifIstihdamGunSayisi * 8.0) : (aktifIstihdamGunSayisi === 0 ? 0 : 240.0);

    const normalGun = pPuantaj.filter(x => {
      const clean = String(x.Tarih || '').slice(0, 10);
      return (x.DurumKodu === 'N' || x.NormalCalismaSaati > 0) && isPersonelCalisiyorMuTarihte(p, clean);
    }).length;
    const haftaTatiliGun = pPuantaj.filter(x => {
      const clean = String(x.Tarih || '').slice(0, 10);
      return x.DurumKodu === 'HT' && isPersonelCalisiyorMuTarihte(p, clean);
    }).length;
    const resmiTatilGun = pPuantaj.filter(x => {
      const clean = String(x.Tarih || '').slice(0, 10);
      return x.DurumKodu === 'RT' && isPersonelCalisiyorMuTarihte(p, clean);
    }).length;
    
    // Ücretli İzinler (Yİ: Yıllık İzin, R: Raporlu, M: Mazeret İzni) - DÜŞÜLMEZ!
    const ucretliIzinGun = pPuantaj.filter(x => {
      const clean = String(x.Tarih || '').slice(0, 10);
      return ['YI', 'R', 'M'].includes(x.DurumKodu) && isPersonelCalisiyorMuTarihte(p, clean);
    }).length;

    // Ücretsiz İzin (UI) ve Devamsız (D) - Sadece istihdamda olduğu günlerdeki kesintiler bazdan düşülür!
    const ucretsizIzinGun = pPuantaj.filter(x => {
      const clean = String(x.Tarih || '').slice(0, 10);
      return x.DurumKodu === 'UI' && isPersonelCalisiyorMuTarihte(p, clean);
    }).length;
    const devamsizGun = pPuantaj.filter(x => {
      const clean = String(x.Tarih || '').slice(0, 10);
      return x.DurumKodu === 'D' && isPersonelCalisiyorMuTarihte(p, clean);
    }).length;
    const devamsizVeUcretsizGun = ucretsizIzinGun + devamsizGun;

    const toplamNormalSaat = pPuantaj.reduce((sum, x) => {
      const clean = String(x.Tarih || '').slice(0, 10);
      return isPersonelCalisiyorMuTarihte(p, clean) ? sum + (x.NormalCalismaSaati || 0) : sum;
    }, 0);
    const toplamFazlaMesai = pPuantaj.reduce((sum, x) => {
      const clean = String(x.Tarih || '').slice(0, 10);
      return isPersonelCalisiyorMuTarihte(p, clean) ? sum + (x.FazlaMesaiSaati || 0) : sum;
    }, 0);
    const toplamTatilMesai = pPuantaj.reduce((sum, x) => {
      const clean = String(x.Tarih || '').slice(0, 10);
      return isPersonelCalisiyorMuTarihte(p, clean) ? sum + (x.HaftaTatiliMesaiSaati || 0) + (x.ResmiTatilMesaiSaati || 0) : sum;
    }, 0);
    
    // Eksik saat hesabı: Saatlik ücretsiz kesintiler + Tam gün Ücretsiz İzin (UI) ve Devamsızlık (D) günleri
    const toplamEksikSaat = pPuantaj.reduce((sum, x) => {
      const cleanDate = String(x.Tarih || '').slice(0, 10);
      if (!isPersonelCalisiyorMuTarihte(p, cleanDate)) return sum;

      const stdSaat = getStandartNormalSaat(cleanDate, rejim);
      const kesinti = Number(x.SaatlikKesintiUcretsiz || 0);
      if (x.DurumKodu === 'UI' || x.DurumKodu === 'D') {
        return sum + (kesinti > 0 ? kesinti : (stdSaat > 0 ? stdSaat : 8.0));
      }
      return sum + kesinti;
    }, 0);

    // Fazla mesai artırımları:
    // Fazla Mesai (%50 artırımlı): Saat x 1.5
    // Tatil Mesaisi (%100 artırımlı): Saat x 2.0
    const artirimliMesaiSaati = (toplamFazlaMesai * 1.5) + (toplamTatilMesai * 2.0);
    const artirimliMesaiGunu = artirimliMesaiSaati / 8.0;
    const eksikGun = toplamEksikSaat / 8.0;

    // Net Hakediş (Tam ayda 30 gün / 240 saat, Kıst dönemde personelin fiili baz günü / baz saati üzerinden):
    const netGun = Math.max(0, bazGun - eksikGun + artirimliMesaiGunu);
    const netSaat = Math.max(0, bazSaat - toplamEksikSaat + artirimliMesaiSaati);

    return {
      personelId: p.PersonelId,
      adSoyad: p.AdSoyad,
      departman: p.Departman || '-',
      kistDonemMi,
      bazGun,
      bazSaat,
      aktifIstihdamGunSayisi,
      normalGun,
      haftaTatiliGun,
      resmiTatilGun,
      ucretliIzinGun,
      devamsizVeUcretsizGun,
      toplamNormalSaat,
      toplamFazlaMesai,
      toplamTatilMesai,
      toplamEksikSaat,
      artirimliMesaiSaati,
      netGun,
      netSaat,
      rawPersonel: p
    };
  });

  // Tablo En Altı Genel Toplam Satırı (Grand Total)
  const genelToplam = React.useMemo(() => {
    return icmalListesi.reduce((acc, item) => ({
      normalGun: acc.normalGun + item.normalGun,
      haftaTatiliGun: acc.haftaTatiliGun + item.haftaTatiliGun,
      resmiTatilGun: acc.resmiTatilGun + item.resmiTatilGun,
      ucretliIzinGun: acc.ucretliIzinGun + item.ucretliIzinGun,
      devamsizVeUcretsizGun: acc.devamsizVeUcretsizGun + item.devamsizVeUcretsizGun,
      toplamNormalSaat: acc.toplamNormalSaat + item.toplamNormalSaat,
      toplamFazlaMesai: acc.toplamFazlaMesai + item.toplamFazlaMesai,
      toplamTatilMesai: acc.toplamTatilMesai + item.toplamTatilMesai,
      toplamEksikSaat: acc.toplamEksikSaat + item.toplamEksikSaat,
      netGun: acc.netGun + item.netGun,
      netSaat: acc.netSaat + item.netSaat
    }), {
      normalGun: 0,
      haftaTatiliGun: 0,
      resmiTatilGun: 0,
      ucretliIzinGun: 0,
      devamsizVeUcretsizGun: 0,
      toplamNormalSaat: 0,
      toplamFazlaMesai: 0,
      toplamTatilMesai: 0,
      toplamEksikSaat: 0,
      netGun: 0,
      netSaat: 0
    });
  }, [icmalListesi]);

  const handleCsvExport = () => {
    const ayAdi = aylar.find(a => a.no === seciliAy)?.ad || '';
    let csv = `RENDE İNŞAAT MOBİLYA TURİZM A.Ş. - AYLIK PUANTAJ & BORDRO İCMAL CETVELİ\n`;
    csv += `Dönem: ${ayAdi} ${seciliYil} - Rapor Tarihi: ${formatTarihTR(getBugunIso())}\n`;
    csv += `Hesaplama Esası: Tam ay çalışanlar için standart 30 gün (240 saat: 8 saat/gün esası); ay ortasında işe giren veya ayrılanlar için ay içindeki fiili istihdam gün sayısı (Kıst Dönem: Fiili Gün × 8 Saat) baz alınmıştır. Ücretsiz izin ve devamsızlıklar bazdan düşülmüş, ücretli izinler korunmuş, fazla mesailer %50 (x1.5) ve tatil mesaileri %100 (x2.0) artırımlı eklenmiştir.\n\n`;
    csv += `Personel;Departman;İstihdam Türü;Baz Gün;Normal Gün;Hafta Tatili;Resmi Tatil;Ücretli İzin (Yİ/R/M);Devamsız & Ü.İzin;Normal Saat;Fazla Mesai (%50);Tatil Mesaisi (%100);Eksik Saat;Net Gün;Net Saat;İmza\n`;

    icmalListesi.forEach(item => {
      const istihdamTuru = item.kistDonemMi ? `Kıst Dönem (${item.bazGun} Gün)` : `Tam Ay (30 Gün)`;
      csv += `${item.adSoyad};${item.departman};${istihdamTuru};${item.bazGun};${item.normalGun};${item.haftaTatiliGun};${item.resmiTatilGun};${item.ucretliIzinGun};${item.devamsizVeUcretsizGun};${item.toplamNormalSaat.toFixed(1)};${item.toplamFazlaMesai.toFixed(1)};${item.toplamTatilMesai.toFixed(1)};${item.toplamEksikSaat.toFixed(1)};${item.netGun.toFixed(2)};${item.netSaat.toFixed(1)};\n`;
    });

    csv += `GENEL TOPLAM (${icmalListesi.length} Personel);-;-;-;${genelToplam.normalGun};${genelToplam.haftaTatiliGun};${genelToplam.resmiTatilGun};${genelToplam.ucretliIzinGun};${genelToplam.devamsizVeUcretsizGun};${genelToplam.toplamNormalSaat.toFixed(1)};${genelToplam.toplamFazlaMesai.toFixed(1)};${genelToplam.toplamTatilMesai.toFixed(1)};${genelToplam.toplamEksikSaat.toFixed(1)};${genelToplam.netGun.toFixed(2)};${genelToplam.netSaat.toFixed(1)};\n`;

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Puantaj_Icmal_${seciliYil}_${seciliAy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Güvenli ve Kesin Yazdırma HTML Üreticisi (Iframe / Direct Print)
  const generatePrintableHtml = () => {
    const ayAdi = aylar.find(a => a.no === seciliAy)?.ad || '';
    const bugunTarih = formatTarihTR(getBugunIso());

    const rowsHtml = icmalListesi.map((item, idx) => `
      <tr>
        <td style="padding: 4px 6px; font-weight: bold; border: 1px solid #334155;">
          ${idx + 1}. ${item.adSoyad}
          ${item.kistDonemMi ? `<span style="font-size: 7pt; color: #b45309; font-weight: bold; margin-left: 4px;">(Kıst: ${item.bazGun}g)</span>` : ''}
        </td>
        <td style="padding: 4px 6px; border: 1px solid #334155;">${item.departman}</td>
        <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155;">${item.normalGun}</td>
        <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155;">${item.haftaTatiliGun}</td>
        <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155;">${item.resmiTatilGun}</td>
        <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155;">${item.ucretliIzinGun}</td>
        <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155; font-weight: bold; color: ${item.devamsizVeUcretsizGun > 0 ? '#b91c1c' : '#000'};">${item.devamsizVeUcretsizGun > 0 ? item.devamsizVeUcretsizGun : '-'}</td>
        <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155; font-family: monospace;">${item.toplamNormalSaat.toFixed(1)}</td>
        <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155; font-family: monospace;">${item.toplamFazlaMesai > 0 ? item.toplamFazlaMesai.toFixed(1) : '-'}</td>
        <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155; font-family: monospace;">${item.toplamTatilMesai > 0 ? item.toplamTatilMesai.toFixed(1) : '-'}</td>
        <td style="padding: 4px 6px; text-align: center; border: 1px solid #334155; font-family: monospace; color: ${item.toplamEksikSaat > 0 ? '#b91c1c' : '#000'};">${item.toplamEksikSaat > 0 ? item.toplamEksikSaat.toFixed(1) : '-'}</td>
        <td style="padding: 4px 6px; text-align: center; border: 1.5px solid #000; font-family: monospace; font-weight: bold; background-color: #f1f5f9;">${item.netGun.toFixed(2)}</td>
        <td style="padding: 4px 6px; text-align: center; border: 1.5px solid #000; font-family: monospace; font-weight: bold; background-color: #f1f5f9;">${item.netSaat.toFixed(1)}</td>
        <td style="padding: 4px 10px; text-align: center; border: 1px solid #334155; min-width: 60px;">
          <div style="border-bottom: 1px solid #94a3b8; height: 16px; width: 50px; margin: 0 auto;"></div>
        </td>
      </tr>
    `).join('');

    const totalRowHtml = `
      <tr style="background-color: #e2e8f0; font-weight: bold;">
        <td colspan="2" style="padding: 6px; border: 2px solid #000; font-weight: 900;">GENEL TOPLAM (${icmalListesi.length} Personel)</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000;">${genelToplam.normalGun}</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000;">${genelToplam.haftaTatiliGun}</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000;">${genelToplam.resmiTatilGun}</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000;">${genelToplam.ucretliIzinGun}</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; color: #b91c1c;">${genelToplam.devamsizVeUcretsizGun}</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-family: monospace;">${genelToplam.toplamNormalSaat.toFixed(1)}</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-family: monospace;">${genelToplam.toplamFazlaMesai > 0 ? genelToplam.toplamFazlaMesai.toFixed(1) : '-'}</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-family: monospace;">${genelToplam.toplamTatilMesai > 0 ? genelToplam.toplamTatilMesai.toFixed(1) : '-'}</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-family: monospace; color: #b91c1c;">${genelToplam.toplamEksikSaat > 0 ? genelToplam.toplamEksikSaat.toFixed(1) : '-'}</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-family: monospace; font-weight: 900; background-color: #cbd5e1;">${genelToplam.netGun.toFixed(2)}</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-family: monospace; font-weight: 900; background-color: #cbd5e1;">${genelToplam.netSaat.toFixed(1)}</td>
        <td style="padding: 6px; text-align: center; border: 2px solid #000; font-size: 8pt;">Genel İcmal</td>
      </tr>
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Aylık Puantaj İcmali - ${ayAdi} ${seciliYil}</title>
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
            padding: 5px 4px;
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
          <div class="report-title">AYLIK PERSONEL PUANTAJ & BORDRO İCMAL CETVELİ</div>
          <div class="sub-bar">
            <span><strong>Dönem:</strong> ${ayAdi} ${seciliYil}</span>
            <span><strong>Rapor Tarihi:</strong> ${bugunTarih}</span>
            <span><strong>Toplam Personel:</strong> ${icmalListesi.length} Kişi</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left;">Personel Adı Soyadı</th>
              <th>Departman</th>
              <th>Normal Gün</th>
              <th>Hafta T.</th>
              <th>Resmi T.</th>
              <th>Ücretli İzin</th>
              <th>Devamsız / Ü.İzin</th>
              <th>Normal (Saat)</th>
              <th>%50 Mesai</th>
              <th>%100 Mesai</th>
              <th>Eksik Saat</th>
              <th style="background-color: #e2e8f0;">Net Gün</th>
              <th style="background-color: #e2e8f0;">Net Saat</th>
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
          * Bordro Hesaplama Esasları: Tam ay istihdamda olan personeller için standart 30 gün (240 saat: 8 saat/gün esası) uygulanır. Ay içinde işe giren veya işten ayrılan personeller için ay içindeki fiili istihdam gün sayısı (Kıst Dönem: Fiili Gün × 8 Saat) baz alınır. Devamsızlık ve ücretsiz izinler baz hakedişten düşülmüş, ücretli izinler (yıllık izin, rapor, mazeret, hafta tatili, resmi tatil) tam ödenmiştir. Fazla mesailer %50 (x1.5), tatil mesaileri %100 (x2.0) artırımlı olarak net gün ve saate yansıtılmıştır.
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-title">Hazırlayan</div>
            <div>İnsan Kaynakları / Personel</div>
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
      const existingFrame = document.getElementById('rende-print-frame');
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'rende-print-frame';
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
            background-color: transparent !important;
          }
          .print-modal-content td {
            color: black !important;
            border: 1px solid #64748b !important;
            padding: 3px 3px !important;
            background-color: transparent !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow cursor-pointer"
              title="Yazdır / PDF Olarak Kaydet"
            >
              <Printer className="w-3.5 h-3.5" />
              Yazdır
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-lg transition border border-slate-700 cursor-pointer"
              title="Kapat"
            >
              <X className="w-3.5 h-3.5" />
              <span>Kapat (Esc)</span>
            </button>
          </div>
        </div>

        {/* Bordro Esası Bilgilendirme Çubuğu */}
        <div className="px-6 py-2.5 bg-slate-950/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span><strong>Bordro Esası:</strong> Tam ay çalışanlar için 30 gün (240 saat: 8 saat/gün); ay ortasında işe giren veya ayrılanlar için fiili istihdam gün sayısı (Kıst Dönem) baz alınır. Devamsızlık ve ücretsiz izinler düşülür, ücretli izinler korunur.</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-slate-400">Genel Net Bordro Gün Toplamı: <strong className="text-cyan-300 font-bold">{genelToplam.netGun.toFixed(2)} Gün</strong></span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Net Saat: <strong className="text-emerald-300 font-bold">{genelToplam.netSaat.toFixed(1)} s</strong></span>
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
                <th className="py-2.5 px-2 text-center print:py-1.5 print:px-1" title="Ücretli İzinler (Yıllık İzin, Rapor, Mazeret) - Düşülmez">Ücretli İzin</th>
                <th className="py-2.5 px-2 text-center print:py-1.5 print:px-1" title="Ücretsiz İzin ve Devamsızlıklar - Düşülür">Devamsız / Ü.İzin</th>
                <th className="py-2.5 px-2 text-center font-bold text-emerald-400 print:py-1.5 print:px-1 print:text-black">Normal (Saat)</th>
                <th className="py-2.5 px-2 text-center font-bold text-blue-400 print:py-1.5 print:px-1 print:text-black">%50 Mesai</th>
                <th className="py-2.5 px-2 text-center font-bold text-emerald-300 print:py-1.5 print:px-1 print:text-black">%100 Mesai</th>
                <th className="py-2.5 px-2 text-center font-bold text-rose-400 print:py-1.5 print:px-1 print:text-black">Eksik Saat</th>
                <th className="py-2.5 px-2 text-center font-black text-cyan-300 bg-cyan-950/40 print:py-1.5 print:px-1 print:text-black print:bg-slate-200" title="Net Hakediş Günü (Tam ayda 30 gün, kıst dönemde fiili istihdam günü baz alınır)">Net Gün</th>
                <th className="py-2.5 px-2 text-center font-black text-emerald-300 bg-emerald-950/40 print:py-1.5 print:px-1 print:text-black print:bg-slate-200" title="Net Hakediş Saati (Tam ayda 240 saat, kıst dönemde Fiili Gün × 8 saat)">Net Saat</th>
                <th className="py-2.5 px-4 text-center border-l border-slate-800 print:py-1.5 print:px-3 print:border-l print:border-black">İmza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-y-0">
              {icmalListesi.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-4 text-center text-slate-500 italic">
                    Kayıtlı aktif personel bulunamadı.
                  </td>
                </tr>
              ) : (
                icmalListesi.map((item) => {
                  const isAcik = acikPersonelId === item.personelId;
                  const ayAdi = aylar.find(a => a.no === seciliAy)?.ad || '';
                  const gunlerDetay = isAcik ? getPersonelAyGunleri(item.rawPersonel, seciliYil, seciliAy, puantajlar, rejim) : [];

                  return (
                    <React.Fragment key={item.personelId}>
                      <tr className={`hover:bg-slate-800/30 transition print:bg-transparent ${isAcik ? 'bg-slate-800/40 print:bg-transparent' : ''}`}>
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
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <span className="truncate">{item.adSoyad}</span>
                              {item.kistDonemMi && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0" title={`Kıst Dönem: Bu ay ${item.bazGun} gün (${item.bazSaat} saat) istihdam baz alınmıştır.`}>
                                  Kıst ({item.bazGun}g)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-400 print:text-black print:py-1 print:px-2">{item.departman}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-200 print:text-black print:py-1 print:px-1">{item.normalGun}</td>
                        <td className="py-2 px-2 text-center text-slate-400 print:text-black print:py-1 print:px-1">{item.haftaTatiliGun}</td>
                        <td className="py-2 px-2 text-center text-slate-400 print:text-black print:py-1 print:px-1">{item.resmiTatilGun}</td>
                        <td className="py-2 px-2 text-center text-amber-400 font-semibold print:text-black print:py-1 print:px-1">{item.ucretliIzinGun}</td>
                        <td className="py-2 px-2 text-center text-rose-400 font-bold print:text-black print:py-1 print:px-1">{item.devamsizVeUcretsizGun || '-'}</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-400 print:text-black print:py-1 print:px-1">{item.toplamNormalSaat.toFixed(1)}</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-blue-400 print:text-black print:py-1 print:px-1">{item.toplamFazlaMesai > 0 ? item.toplamFazlaMesai.toFixed(1) : '-'}</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-300 print:text-black print:py-1 print:px-1">{item.toplamTatilMesai > 0 ? item.toplamTatilMesai.toFixed(1) : '-'}</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-rose-400 print:text-black print:py-1 print:px-1">{item.toplamEksikSaat > 0 ? item.toplamEksikSaat.toFixed(1) : '-'}</td>
                        <td className="py-2 px-2 text-center font-mono font-black text-cyan-300 bg-cyan-950/40 print:text-black print:bg-transparent" title={item.kistDonemMi ? `Kıst Dönem: ${item.bazGun} gün fiili istihdam bazından hesaplandı` : `Tam Ay: 30 gün bazından hesaplandı`}>
                          {item.netGun.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-black text-emerald-300 bg-emerald-950/40 print:text-black print:bg-transparent" title={item.kistDonemMi ? `Kıst Dönem: ${item.bazSaat} saat (${item.bazGun}g × 8s) bazından hesaplandı` : `Tam Ay: 240 saat (30g × 8s) bazından hesaplandı`}>
                          {item.netSaat.toFixed(1)}
                        </td>
                        <td className="py-2 px-4 text-center border-l border-slate-800 print:border-l print:border-black print:py-1 print:px-3 min-w-[70px]">
                          <div className="w-16 border-b border-slate-700 print:border-black h-4 mx-auto"></div>
                        </td>
                      </tr>

                      {/* Tıklanınca Altalta Açılan Günlük Puantaj Detay Satırı */}
                      {isAcik && (
                        <tr className="bg-slate-950/90 border-y-2 border-blue-500/40 print:hidden animate-in fade-in duration-150">
                          <td colSpan={14} className="p-3 sm:p-4">
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
                                      {item.kistDonemMi ? (
                                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                          ⚡ Kıst Dönem: Bu Ay {item.bazGun} Gün İstihdam ({item.bazSaat} Saat Baz)
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                          Tam Ay İstihdam (30 Gün / 240 Saat Baz)
                                        </span>
                                      )}
                                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                        📅 {ayAdi} {seciliYil} Günlük Döküm ({gunlerDetay.length} Gün)
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
                                      <span className="border-l border-slate-700 pl-3">Net: <strong className="text-cyan-300 font-mono">{item.netGun.toFixed(2)} Gün / {item.netSaat.toFixed(1)} Saat</strong></span>
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
            <tfoot className="bg-slate-950 text-white font-bold border-t-2 border-slate-700 print:bg-slate-200 print:border-black sticky bottom-0 z-10 shadow-lg">
              <tr className="border-b border-slate-800 print:border-black">
                <td colSpan={2} className="py-3 px-3 font-black text-white print:text-black text-xs uppercase tracking-wide">
                  GENEL TOPLAM ({icmalListesi.length} Personel)
                </td>
                <td className="py-3 px-2 text-center font-black text-slate-100 print:text-black">{genelToplam.normalGun}</td>
                <td className="py-3 px-2 text-center font-bold text-slate-300 print:text-black">{genelToplam.haftaTatiliGun}</td>
                <td className="py-3 px-2 text-center font-bold text-slate-300 print:text-black">{genelToplam.resmiTatilGun}</td>
                <td className="py-3 px-2 text-center font-bold text-amber-300 print:text-black">{genelToplam.ucretliIzinGun}</td>
                <td className="py-3 px-2 text-center font-bold text-rose-400 print:text-black">{genelToplam.devamsizVeUcretsizGun}</td>
                <td className="py-3 px-2 text-center font-mono font-bold text-emerald-400 print:text-black">{genelToplam.toplamNormalSaat.toFixed(1)}</td>
                <td className="py-3 px-2 text-center font-mono font-bold text-blue-400 print:text-black">{genelToplam.toplamFazlaMesai > 0 ? genelToplam.toplamFazlaMesai.toFixed(1) : '-'}</td>
                <td className="py-3 px-2 text-center font-mono font-bold text-emerald-300 print:text-black">{genelToplam.toplamTatilMesai > 0 ? genelToplam.toplamTatilMesai.toFixed(1) : '-'}</td>
                <td className="py-3 px-2 text-center font-mono font-bold text-rose-400 print:text-black">{genelToplam.toplamEksikSaat > 0 ? genelToplam.toplamEksikSaat.toFixed(1) : '-'}</td>
                <td className="py-3 px-2 text-center font-mono font-black text-cyan-300 bg-cyan-950/80 border-x border-cyan-500/40 print:text-black print:bg-slate-200">
                  {genelToplam.netGun.toFixed(2)}
                </td>
                <td className="py-3 px-2 text-center font-mono font-black text-emerald-300 bg-emerald-950/80 border-r border-emerald-500/40 print:text-black print:bg-slate-200">
                  {genelToplam.netSaat.toFixed(1)}
                </td>
                <td className="py-3 px-4 text-center border-l border-slate-800 print:border-l print:border-black text-[10px] text-slate-400 print:text-black font-normal">
                  Genel İcmal
                </td>
              </tr>
            </tfoot>
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
