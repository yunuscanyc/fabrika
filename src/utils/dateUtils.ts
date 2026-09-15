/**
 * Rende Fabrika Portalı - Saat Dilimi ve Tarih Güvenliği Yardımcıları
 * Timezone (UTC-TRT) kaymalarını, ISO dönüşüm hatalarını ve Türkçe gün/ay gösterimlerini garanti altına alır.
 */

// Yerel tarayıcı saatine göre YYYY-MM-DD formatında bugünü döndürür
export function getBugunIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Güvenli Türkçe kısa tarih formatı: "2026-09-09" -> "09.09.2026"
export function formatTarihTR(val: string | null | undefined): string {
  if (!val) return '-';
  const clean = String(val).trim();
  
  // YYYY-MM-DD veya YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${d}.${m}.${y}`;
  }

  // Zaten DD.MM.YYYY veya DD/MM/YYYY ise
  const trMatch = clean.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (trMatch) {
    const d = trMatch[1].padStart(2, '0');
    const m = trMatch[2].padStart(2, '0');
    const y = trMatch[3];
    return `${d}.${m}.${y}`;
  }

  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    }
  } catch {}

  return clean;
}

// Güvenli Türkçe uzun tarih formatı: "2026-09-09" -> "9 Eylül 2026, Çarşamba"
const AYLAR_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const GUNLER_TR = [
  'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
];

export function formatTarihUzunTR(val: string | null | undefined): string {
  if (!val) return '-';
  const clean = String(val).trim();
  
  let y = 0, m = 0, d = 0;
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    y = parseInt(isoMatch[1], 10);
    m = parseInt(isoMatch[2], 10);
    d = parseInt(isoMatch[3], 10);
  } else {
    const trMatch = clean.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    if (trMatch) {
      d = parseInt(trMatch[1], 10);
      m = parseInt(trMatch[2], 10);
      y = parseInt(trMatch[3], 10);
    }
  }

  if (y && m && d) {
    // Öğlen saat 12:00'ye göre oluşturulursa hiçbir saat dilimi kayması günü değiştirmez
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    const gunAdi = GUNLER_TR[dt.getDay()];
    const ayAdi = AYLAR_TR[m - 1] || '';
    return `${d} ${ayAdi} ${y}, ${gunAdi}`;
  }

  return formatTarihTR(val);
}

// Tarihe gün ekleme / çıkarma (YYYY-MM-DD döndürür)
export function tarihKaydir(isoDate: string, gunSayisi: number): string {
  const match = String(isoDate).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) return getBugunIso();
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  dt.setDate(dt.getDate() + gunSayisi);

  const resY = dt.getFullYear();
  const resM = String(dt.getMonth() + 1).padStart(2, '0');
  const resD = String(dt.getDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

// İki tarih arasındaki gün farkı (tarih2 - tarih1)
export function tarihFarkiGun(isoDate1: string, isoDate2: string): number {
  const m1 = String(isoDate1).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const m2 = String(isoDate2).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!m1 || !m2) return 0;

  const dt1 = new Date(parseInt(m1[1], 10), parseInt(m1[2], 10) - 1, parseInt(m1[3], 10), 12, 0, 0);
  const dt2 = new Date(parseInt(m2[1], 10), parseInt(m2[2], 10) - 1, parseInt(m2[3], 10), 12, 0, 0);

  const diffMs = dt2.getTime() - dt1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// =========================================================================
// Türkiye Resmi Tatilleri & Mesai / Hafta Sonu Kontrolleri
// =========================================================================
export interface ResmiTatilInfo {
  isTatil: boolean;
  ad?: string;
  yarimGunMu?: boolean;
}

// Sabit resmi tatiller (Ay-Gün)
const SABIT_RESMI_TATILLER: Record<string, { ad: string; yarimGunMu?: boolean }> = {
  '01-01': { ad: 'Yılbaşı Tatili' },
  '04-23': { ad: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı' },
  '05-01': { ad: '1 Mayıs Emek ve Dayanışma Günü' },
  '05-19': { ad: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı' },
  '07-15': { ad: '15 Temmuz Demokrasi ve Milli Birlik Günü' },
  '08-30': { ad: '30 Ağustos Zafer Bayramı' },
  '10-28': { ad: '28 Ekim Cumhuriyet Bayramı Arifesi', yarimGunMu: true },
  '10-29': { ad: '29 Ekim Cumhuriyet Bayramı' }
};

// Dini & Değişken Bayramlar (2024-2027)
const DEGISKEN_RESMI_TATILLER: Record<string, { ad: string; yarimGunMu?: boolean }> = {
  // 2025
  '2025-03-29': { ad: 'Ramazan Bayramı Arifesi', yarimGunMu: true },
  '2025-03-30': { ad: 'Ramazan Bayramı 1. Gün' },
  '2025-03-31': { ad: 'Ramazan Bayramı 2. Gün' },
  '2025-04-01': { ad: 'Ramazan Bayramı 3. Gün' },
  '2025-06-05': { ad: 'Kurban Bayramı Arifesi', yarimGunMu: true },
  '2025-06-06': { ad: 'Kurban Bayramı 1. Gün' },
  '2025-06-07': { ad: 'Kurban Bayramı 2. Gün' },
  '2025-06-08': { ad: 'Kurban Bayramı 3. Gün' },
  '2025-06-09': { ad: 'Kurban Bayramı 4. Gün' },
  // 2026
  '2026-03-19': { ad: 'Ramazan Bayramı Arifesi', yarimGunMu: true },
  '2026-03-20': { ad: 'Ramazan Bayramı 1. Gün' },
  '2026-03-21': { ad: 'Ramazan Bayramı 2. Gün' },
  '2026-03-22': { ad: 'Ramazan Bayramı 3. Gün' },
  '2026-05-26': { ad: 'Kurban Bayramı Arifesi', yarimGunMu: true },
  '2026-05-27': { ad: 'Kurban Bayramı 1. Gün' },
  '2026-05-28': { ad: 'Kurban Bayramı 2. Gün' },
  '2026-05-29': { ad: 'Kurban Bayramı 3. Gün' },
  '2026-05-30': { ad: 'Kurban Bayramı 4. Gün' },
  // 2027
  '2027-03-09': { ad: 'Ramazan Bayramı Arifesi', yarimGunMu: true },
  '2027-03-10': { ad: 'Ramazan Bayramı 1. Gün' },
  '2027-03-11': { ad: 'Ramazan Bayramı 2. Gün' },
  '2027-03-12': { ad: 'Ramazan Bayramı 3. Gün' },
  '2027-05-16': { ad: 'Kurban Bayramı Arifesi', yarimGunMu: true },
  '2027-05-17': { ad: 'Kurban Bayramı 1. Gün' },
  '2027-05-18': { ad: 'Kurban Bayramı 2. Gün' },
  '2027-05-19': { ad: 'Kurban Bayramı 3. Gün' },
  '2027-05-20': { ad: 'Kurban Bayramı 4. Gün' }
};

export function getResmiTatil(isoDate: string): ResmiTatilInfo {
  const match = String(isoDate).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) return { isTatil: false };
  const y = match[1];
  const m = match[2].padStart(2, '0');
  const d = match[3].padStart(2, '0');
  const fullIso = `${y}-${m}-${d}`;
  const mmDd = `${m}-${d}`;

  if (DEGISKEN_RESMI_TATILLER[fullIso]) {
    return { isTatil: true, ...DEGISKEN_RESMI_TATILLER[fullIso] };
  }

  if (SABIT_RESMI_TATILLER[mmDd]) {
    return { isTatil: true, ...SABIT_RESMI_TATILLER[mmDd] };
  }

  return { isTatil: false };
}

// Haftanın gününü döndürür: 0: Pazar, 1: Pazartesi, ..., 6: Cumartesi
export function getGunIndex(isoDate: string): number {
  const match = String(isoDate).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) return 1;
  const dt = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), 12, 0, 0);
  return dt.getDay();
}

// Seçili rejime göre bu gün hafta tatili mi?
export function isHaftaTatiliGunu(isoDate: string, rejim: '5gun' | '6gun'): boolean {
  const day = getGunIndex(isoDate);
  if (rejim === '5gun') {
    return day === 0 || day === 6; // Cumartesi ve Pazar
  } else {
    return day === 0; // Sadece Pazar
  }
}

// Tarihe ay ekleme / çıkarma (YYYY-MM-DD döndürür)
export function tarihAyEkle(isoDate: string, aySayisi: number): string {
  const match = String(isoDate).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) return getBugunIso();
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  
  const dt = new Date(y, m - 1 + aySayisi, d, 12, 0, 0);
  const resY = dt.getFullYear();
  const resM = String(dt.getMonth() + 1).padStart(2, '0');
  const resD = String(dt.getDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

// Cumartesi mi?
export function isCumartesiGunu(isoDate: string): boolean {
  return getGunIndex(isoDate) === 6;
}

// %100 Mesai girilebilir mi? (Hafta tatili veya Resmi Tatil ise girilebilir)
export function isYuzdeYuzMesaiGecerli(isoDate: string, rejim: '5gun' | '6gun', durumKodu?: string): boolean {
  if (durumKodu === 'HT' || durumKodu === 'RT') return true;
  if (isHaftaTatiliGunu(isoDate, rejim)) return true;
  const tatil = getResmiTatil(isoDate);
  if (tatil.isTatil) return true;
  return false;
}

// Seçili gün ve rejime göre standart çalışma saati (İş Kanunu 45 saat esası)
export function getStandartNormalSaat(isoDate: string, rejim: '5gun' | '6gun'): number {
  const tatil = getResmiTatil(isoDate);
  if (tatil.isTatil && !tatil.yarimGunMu) return 0;
  
  const day = getGunIndex(isoDate);
  if (rejim === '5gun') {
    if (day === 0 || day === 6) return 0; // Cumartesi ve Pazar hafta tatili
    return 9.0; // 5 gün x 9.0 saat = 45 saat
  } else {
    // 6 günlük rejim (Cumartesi öğlene kadar)
    if (day === 0) return 0; // Pazar hafta tatili
    if (day === 6) return 5.0; // Cumartesi öğlene kadar (08:00 - 13:00)
    return 7.5; // Hafta içi (5 gün x 7.5 = 37.5 + 5.0 Cumartesi = 42.5 ~ 45 saat)
  }
}

// İznin bitiş tarihinden sonraki ilk mesai (işbaşı) gününü bulur
export function getIlkMesaiGunu(bitisTarihi: string, rejim: '5gun' | '6gun' = '5gun'): string {
  if (!bitisTarihi) return '';
  let dateCursor = tarihKaydir(bitisTarihi, 1);
  let maxSafetyCounter = 30; // Sonsuz döngü koruması
  while (maxSafetyCounter > 0) {
    const isHt = isHaftaTatiliGunu(dateCursor, rejim);
    const tatil = getResmiTatil(dateCursor);
    const isRt = tatil.isTatil && !tatil.yarimGunMu; // Yarım gün değilse tatildir
    
    if (!isHt && !isRt) {
      return dateCursor; // İlk iş gününü bulduk!
    }
    dateCursor = tarihKaydir(dateCursor, 1);
    maxSafetyCounter--;
  }
  return tarihKaydir(bitisTarihi, 1); // Güvenli fallback
}
