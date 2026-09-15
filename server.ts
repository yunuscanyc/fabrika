import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import pg from 'pg';
import dotenv from 'dotenv';

// .env veya .env.example dosyasını güvenle yükle
if (fs.existsSync(path.join(process.cwd(), '.env'))) {
  dotenv.config({ path: path.join(process.cwd(), '.env') });
} else if (fs.existsSync(path.join(process.cwd(), '.env.example'))) {
  dotenv.config({ path: path.join(process.cwd(), '.env.example') });
} else {
  dotenv.config();
}

const { Pool, types } = pg;

// PostgreSQL DATE (1082) ve TIMESTAMP (1114, 1184) tiplerini Node.js UTC kayması olmadan doğrudan YYYY-MM-DD string olarak al
types.setTypeParser(1082, (val: string) => val ? val.split('T')[0] : val);
types.setTypeParser(1114, (val: string) => val ? val.split('T')[0] : val);
types.setTypeParser(1184, (val: string) => val ? val.split('T')[0] : val);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// PostgreSQL Havuz Yapılandırması (Hem yerel hem bulut/tünel bağlantılarını destekler)
function createPgPool() {
  let dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    dbUrl = String(dbUrl).replace(/[{}]/g, '').trim();
    const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
    return new Pool({
      connectionString: dbUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 7000,
    });
  }

  const host = process.env.PGHOST || '87.121.104.184';
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  return new Pool({
    host: host,
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE || 'rende_portal',
    user: (process.env.PGUSER || 'rende_user').replace(/[{}]/g, '').trim(),
    password: process.env.PGPASSWORD || 'Elifesma12345',
    ssl: !isLocalHost || process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 7000,
  });
}

let pool = createPgPool();

pool.on('error', (err) => {
  console.error('[DB-POOL ERROR]', err.message);
});

let isDbConnected = false;
let lastDbError: string | null = null;
let detectedTables: {
  projeler?: string;
  asamalar?: string;
  projeBelgeler?: string;
  projeSablonlar?: string;
  araclar?: string;
  aracBakimlar?: string;
  makineler?: string;
  makineBakimlar?: string;
  makineTurleri?: string;
  personeller?: string;
  izinler?: string;
  izinDonemleri?: string;
  izinTurleri?: string;
  resmiTatiller?: string;
  departmanlar?: string;
  gorevler?: string;
  puantajlar?: string;
  mesaiAyarlari?: string;
  kkdZimmetler?: string;
  saglikRaporlari?: string;
  isgEgitimleri?: string;
  hatirlaticilar?: string;
  hatirlaticiBelgeler?: string;
  aracBakimBelgeler?: string;
  makineBakimBelgeler?: string;
  yevmiyeciler?: string;
  projePersoneller?: string;
  sistemGuvenlik?: string;
} = {};

// Nesnelerden büyük/küçük harf duyarsız ve alternatif alan isimlerini okuma
function getProp(obj: any, ...keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    const lower = k.toLowerCase();
    for (const prop of Object.keys(obj)) {
      if (prop.toLowerCase() === lower && obj[prop] !== undefined && obj[prop] !== null) {
        return obj[prop];
      }
    }
  }
  return undefined;
}

// Veritabanından gelen ikili (bytea) veya base64 dosya içeriğini güvenle okuyup data-uri formatına çevirme
function parseDatabaseFileContent(raw: any): string {
  if (!raw) return '';
  if (Buffer.isBuffer(raw)) {
    // Sihirli baytlara göre mime type belirle, varsayılan image/png
    let mime = 'image/png';
    if (raw.length > 4) {
      if (raw[0] === 0x89 && raw[1] === 0x50 && raw[2] === 0x4e && raw[3] === 0x47) {
        mime = 'image/png';
      } else if (raw[0] === 0xff && raw[1] === 0xd8 && raw[2] === 0xff) {
        mime = 'image/jpeg';
      } else if (raw[0] === 0x47 && raw[1] === 0x49 && raw[2] === 0x46) {
        mime = 'image/gif';
      } else if (raw[0] === 0x25 && raw[1] === 0x50 && raw[2] === 0x44 && raw[3] === 0x46) {
        mime = 'application/pdf';
      }
    }
    return `data:${mime};base64,${raw.toString('base64')}`;
  }
  
  const str = String(raw);
  if (str.startsWith('data:')) return str;
  if (str.startsWith('http://') || str.startsWith('https://')) return str;
  
  // Eğer temiz bir base64 dizisiyse data-uri yap
  const cleanStr = str.replace(/\s/g, '');
  if (cleanStr.length > 10 && /^[A-Za-z0-9+/=]+$/.test(cleanStr)) {
    return `data:image/png;base64,${cleanStr}`;
  }
  return str;
}

// Türkiye Saat Dilimi (Europe/Istanbul UTC+3) veya yerel saat bazlı bugünün YYYY-MM-DD tarihi
function getBugunStr(): string {
  try {
    // tr-TR veya sv-SE YYYY-MM-DD döner
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date());
  } catch {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

function getGunOnceStr(gunSayisi: number): string {
  try {
    const d = new Date();
    d.setDate(d.getDate() - gunSayisi);
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(d);
  } catch {
    const d = new Date();
    d.setDate(d.getDate() - gunSayisi);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

function getGunSonraStr(gunSayisi: number): string {
  try {
    const d = new Date();
    d.setDate(d.getDate() + gunSayisi);
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(d);
  } catch {
    const d = new Date();
    d.setDate(d.getDate() + gunSayisi);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

function tarihAyEkle(tarihStr: string | null | undefined, aySayisi: number): string {
  if (!tarihStr) return getBugunStr();
  try {
    const parts = tarihStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      d.setMonth(d.getMonth() + Number(aySayisi || 12));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${da}`;
    }
  } catch (e) {}
  return getBugunStr();
}

function tarihFarkiGun(tarih1Str: string, tarih2Str: string): number {
  try {
    const d1 = new Date(tarih1Str);
    const d2 = new Date(tarih2Str);
    const diffMs = d2.getTime() - d1.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

// Veritabanı ve API'den gelen tarihleri timezone kayması olmadan YYYY-MM-DD olarak normalize eder
function formatDate(val: any): string | null {
  if (!val) return null;
  
  // 1) String kontrolü
  if (typeof val === 'string') {
    const clean = val.trim();
    if (!clean) return null;

    // YYYY-MM-DD veya YYYY-MM-DDTHH:mm:ss
    const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // DD.MM.YYYY veya DD/MM/YYYY (Türkçe format)
    const trMatch = clean.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    if (trMatch) {
      const day = trMatch[1].padStart(2, '0');
      const month = trMatch[2].padStart(2, '0');
      const year = trMatch[3];
      return `${year}-${month}-${day}`;
    }
  }

  // 2) Date nesnesi kontrolü (UTC kaymasını önlemek için yerel getter'lar)
  if (val instanceof Date && !isNaN(val.getTime())) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

// Model Normalize Ediciler (PostgreSQL satırını frontend formatına çevirir)
function normalizeProje(row: any) {
  return {
    ProjeId: Number(getProp(row, 'ProjeId', 'projeid', 'id', 'Id', 'proje_id')),
    ProjeKodu: String(getProp(row, 'ProjeKodu', 'projekodu', 'kod', 'Kod', 'proje_kodu', 'ProjeNo', 'projeno') || ''),
    ProjeAdi: String(getProp(row, 'ProjeAdi', 'projeadi', 'ad', 'Ad', 'IsinAdi', 'isinadi', 'IsAdi', 'isadi', 'proje_adi', 'ProjeAd', 'projead') || 'İsimsiz Proje'),
    MusteriFirma: String(getProp(row, 'MusteriFirma', 'musterifirma', 'musteri', 'Musteri', 'Firma', 'firma', 'musteri_firma', 'MusteriAdi', 'musteriadi') || ''),
    SantiyeAdresi: String(getProp(row, 'SantiyeAdresi', 'santiyeadresi', 'adres', 'Adres', 'Santiye', 'santiye', 'santiye_adresi', 'Konum', 'konum', 'Sehir', 'sehir') || ''),
    SorumluKisi: String(getProp(row, 'SorumluKisi', 'sorumlukisi', 'sorumlu', 'Sorumlu', 'ProjeSorumlusu', 'projesorumlusu', 'SorumluPersonel', 'sorumlupersonel', 'sorumlu_kisi') || ''),
    SorumluPersonelId: getProp(row, 'SorumluPersonelId', 'sorumlupersonelid', 'sorumlu_personel_id') ? Number(getProp(row, 'SorumluPersonelId', 'sorumlupersonelid', 'sorumlu_personel_id')) : null,
    BaslangicTarihi: formatDate(getProp(row, 'BaslangicTarihi', 'baslangictarihi', 'baslangic', 'GirisTarihi', 'giristarihi', 'Tarih', 'tarih', 'baslangic_tarihi')) || getBugunStr(),
    Deadline: formatDate(getProp(row, 'Deadline', 'deadline', 'bitistarihi', 'BitisTarihi', 'HedefTarih', 'hedeftarih', 'bitis_tarihi', 'TeslimTarihi', 'teslimtarihi')),
    Durum: String(getProp(row, 'Durum', 'durum', 'ProjeDurumu', 'projedurumu') || 'Teklif Verildi'),
    GenelIlerlemeYuzdesi: Number(getProp(row, 'GenelIlerlemeYuzdesi', 'genelilerlemeyuzdesi', 'ilerleme', 'Ilerleme', 'ilerleme_yuzdesi', 'Yuzde', 'yuzde') || 0),
    AktifMi: Boolean(getProp(row, 'AktifMi', 'aktifmi', 'aktif', 'Aktif') ?? true),
    KilitliMi: Boolean(getProp(row, 'KilitliMi', 'kilitlimi', 'kilitli', 'Kilitli')),
    Asamalar: [] as any[]
  };
}

function normalizeAsama(row: any) {
  return {
    AsamaId: Number(getProp(row, 'AsamaId', 'asamaid', 'id')),
    ProjeId: Number(getProp(row, 'ProjeId', 'projeid')),
    UstAsamaId: getProp(row, 'UstAsamaId', 'ustasamaid') ? Number(getProp(row, 'UstAsamaId', 'ustasamaid')) : null,
    Seviye: Number(getProp(row, 'Seviye', 'seviye') || 1),
    SiraNo: Number(getProp(row, 'SiraNo', 'sirano') || 1),
    DinamikNumara: String(getProp(row, 'DinamikNumara', 'dinamiknumara', 'numara') || ''),
    AsamaAdi: String(getProp(row, 'AsamaAdi', 'asamaadi', 'ad') || ''),
    TamamlandiMi: Boolean(getProp(row, 'TamamlandiMi', 'tamamlandimi')),
    Durum: String(getProp(row, 'Durum', 'durum') || 'Bekliyor'),
    KilitliMi: Boolean(getProp(row, 'KilitliMi', 'kilitlimi')),
    Deadline: formatDate(getProp(row, 'Deadline', 'deadline')),
    Notlar: String(getProp(row, 'Notlar', 'notlar') || ''),
    Belgeler: [] as any[]
  };
}

function normalizeArac(row: any) {
  const durum = String(getProp(row, 'Durum', 'durum') || 'Faal');
  const aktif = getProp(row, 'AktifMi', 'aktifmi');
  return {
    AracId: Number(getProp(row, 'AracId', 'aracid', 'id')),
    PlakaVeyaKod: String(getProp(row, 'PlakaVeyaKod', 'plakaveyakod', 'plaka') || ''),
    AracTipi: String(getProp(row, 'AracTipi', 'aractipi', 'tip') || 'Otomobil'),
    MarkaModel: String(getProp(row, 'MarkaModel', 'markamodel', 'marka') || ''),
    ModelYili: Number(getProp(row, 'ModelYili', 'modelyili', 'yil') || new Date().getFullYear()),
    SasiSeriNo: String(getProp(row, 'SasiSeriNo', 'sasiserino', 'sasi') || ''),
    ZimmetliKisi: String(getProp(row, 'ZimmetliKisi', 'zimmetlikisi', 'zimmet') || ''),
    Departman: String(getProp(row, 'Departman', 'departman') || ''),
    GuncelKmVeyaSaat: Number(getProp(row, 'GuncelKmVeyaSaat', 'guncelkmveyasaat', 'sayac') || 0),
    BakimAraligiKmVeyaSaat: Number(getProp(row, 'BakimAraligiKmVeyaSaat', 'bakimaraligikmveyasaat') || 10000),
    BakimAraligiAy: Number(getProp(row, 'BakimAraligiAy', 'bakimaraligiay') || 12),
    SonBakimTarihi: formatDate(getProp(row, 'SonBakimTarihi', 'sonbakimtarihi')) || getBugunStr(),
    SonBakimKmVeyaSaat: Number(getProp(row, 'SonBakimKmVeyaSaat', 'sonbakimkmveyasaat') || 0),
    SaatTakibiMi: Boolean(getProp(row, 'SaatTakibiMi', 'saattakibimi')),
    MuayeneBitisTarihi: formatDate(getProp(row, 'MuayeneBitisTarihi', 'muayenebitistarihi')),
    SigortaBitisTarihi: formatDate(getProp(row, 'SigortaBitisTarihi', 'sigortabitistarihi')),
    Durum: durum,
    AktifMi: aktif !== undefined ? Boolean(aktif) : durum !== 'Elden Çıkarıldı / Satıldı',
    Notlar: String(getProp(row, 'Notlar', 'notlar') || ''),
    BakimGecmisi: [] as any[]
  };
}

function normalizeBakim(row: any) {
  const directPhotoKeys = ['foto', 'resim', 'gorsel', 'belge', 'dosya', 'dosyaicerigi', 'gorselveri', 'resimveri'];
  let directPhotoContent = '';
  for (const key of directPhotoKeys) {
    const val = getProp(row, key);
    if (val) {
      directPhotoContent = parseDatabaseFileContent(val);
      break;
    }
  }

  const directName = String(getProp(row, 'dosyaadi', 'dosya_adi', 'filename') || 'belge.png');
  const directSize = String(getProp(row, 'dosyaboyutu', 'dosya_boyutu', 'filesize') || '0 KB');

  return {
    BakimId: Number(getProp(row, 'BakimId', 'bakimid', 'id')),
    AracId: Number(getProp(row, 'AracId', 'aracid')),
    BakimTarihi: formatDate(getProp(row, 'BakimTarihi', 'bakimtarihi')) || getBugunStr(),
    YapilanKmVeyaSaat: Number(getProp(row, 'YapilanKmVeyaSaat', 'yapilankmveyasaat', 'yapildigikmveyasaat', 'sayac') || 0),
    BakimTuru: String(getProp(row, 'BakimTuru', 'bakimturu') || 'Periyodik Bakım'),
    ServisFirma: String(getProp(row, 'ServisFirma', 'servisfirma') || ''),
    Aciklama: String(getProp(row, 'Aciklama', 'aciklama', 'yapilanislemler') || ''),
    Maliyet: Number(getProp(row, 'Maliyet', 'maliyet') || 0),
    FaturaNo: String(getProp(row, 'FaturaNo', 'faturano') || ''),
    YapanUstaVeyaServis: String(getProp(row, 'YapanUstaVeyaServis', 'yapanustaveyaservis', 'usta') || ''),
    Belgeler: [] as any[],
    FotoSayisi: 0,
    _directPhoto: directPhotoContent,
    _directPhotoName: directName,
    _directPhotoSize: directSize
  };
}

function normalizeMakine(row: any) {
  return {
    MakineId: Number(getProp(row, 'MakineId', 'makineid', 'id')),
    MakineKodu: String(getProp(row, 'MakineKodu', 'makinekodu', 'kod') || ''),
    MakineAdi: String(getProp(row, 'MakineAdi', 'makineadi', 'ad') || ''),
    MakineTuru: String(getProp(row, 'MakineTuru', 'makineturu', 'tur') || 'CNC İşleme Merkezi'),
    MarkaModel: String(getProp(row, 'MarkaModel', 'markamodel') || ''),
    ImalatYili: Number(getProp(row, 'ImalatYili', 'imalatyili') || new Date().getFullYear()),
    SeriNo: String(getProp(row, 'SeriNo', 'serino') || ''),
    KonumBolum: String(getProp(row, 'KonumBolum', 'konumbolum') || 'Fabrika'),
    SorumluUsta: String(getProp(row, 'SorumluUsta', 'sorumluusta') || ''),
    GuncelCalismaSaati: Number(getProp(row, 'GuncelCalismaSaati', 'guncelcalismasaati') || 0),
    BakimAraligiSaat: Number(getProp(row, 'BakimAraligiSaat', 'bakimaraligisaat') || 250),
    BakimAraligiAy: Number(getProp(row, 'BakimAraligiAy', 'bakimaraligiay') || 3),
    SonBakimTarihi: formatDate(getProp(row, 'SonBakimTarihi', 'sonbakimtarihi')) || getBugunStr(),
    SonBakimSaati: Number(getProp(row, 'SonBakimSaati', 'sonbakimsaati') || 0),
    Durum: String(getProp(row, 'Durum', 'durum') || 'Faal'),
    AktifMi: Boolean(getProp(row, 'AktifMi', 'aktifmi') ?? true),
    Notlar: String(getProp(row, 'Notlar', 'notlar', 'not', 'Not') || ''),
    BakimGecmisi: [] as any[]
  };
}

function normalizeMakineBakim(row: any) {
  const directPhotoKeys = ['foto', 'resim', 'gorsel', 'belge', 'dosya', 'dosyaicerigi', 'gorselveri', 'resimveri'];
  let directPhotoContent = '';
  for (const key of directPhotoKeys) {
    const val = getProp(row, key);
    if (val) {
      directPhotoContent = parseDatabaseFileContent(val);
      break;
    }
  }

  const directName = String(getProp(row, 'dosyaadi', 'dosya_adi', 'filename') || 'belge.png');
  const directSize = String(getProp(row, 'dosyaboyutu', 'dosya_boyutu', 'filesize') || '0 KB');

  return {
    BakimId: Number(getProp(row, 'BakimId', 'bakimid', 'id')),
    MakineId: Number(getProp(row, 'MakineId', 'makineid')),
    BakimTarihi: formatDate(getProp(row, 'BakimTarihi', 'bakimtarihi')) || getBugunStr(),
    YapildigiSaat: Number(getProp(row, 'YapildigiSaat', 'yapildigisaat', 'saat') || 0),
    BakimTuru: String(getProp(row, 'BakimTuru', 'bakimturu') || 'Periyodik Bakım'),
    BakimiYapan: String(getProp(row, 'BakimiYapan', 'bakimiyapan') || ''),
    Maliyet: Number(getProp(row, 'Maliyet', 'maliyet') || 0),
    DegisenParcalar: String(getProp(row, 'DegisenParcalar', 'degisenparcalar') || ''),
    Aciklama: String(getProp(row, 'Aciklama', 'aciklama') || ''),
    Belgeler: [] as any[],
    FotoSayisi: 0,
    _directPhoto: directPhotoContent,
    _directPhotoName: directName,
    _directPhotoSize: directSize
  };
}

function normalizePersonel(row: any) {
  let ucretOdemeleri: any[] = [];
  try {
    const rawO = getProp(row, 'IzinUcretiOdemeleri', 'izinucretiodemeleri');
    if (Array.isArray(rawO)) ucretOdemeleri = rawO;
    else if (typeof rawO === 'string' && rawO.trim()) ucretOdemeleri = JSON.parse(rawO);
  } catch (e) {}

  const durumStr = String(getProp(row, 'Durum', 'durum') || '').toLowerCase();
  const cikanTarih = formatDate(getProp(row, 'IstenCikisTarihi', 'istencikistarihi'));
  const rawAktif = getProp(row, 'DurumAktifMi', 'durumaktifmi', 'AktifMi', 'aktifmi', 'DurumAktif', 'durumaktif', 'Aktif', 'aktif');
  const silindi = Boolean(getProp(row, 'SilindiMi', 'silindimi', 'silindi'));

  let aktif = true;
  if (silindi || cikanTarih || durumStr.includes('çık') || durumStr.includes('pasif') || durumStr.includes('ayrıl')) {
    aktif = false;
  } else if (rawAktif !== undefined && rawAktif !== null) {
    if (typeof rawAktif === 'string') {
      const lower = rawAktif.toLowerCase().trim();
      if (lower === 'false' || lower === '0' || lower === 'f' || lower === 'pasif') {
        aktif = false;
      }
    } else if (typeof rawAktif === 'boolean') {
      aktif = rawAktif;
    } else if (typeof rawAktif === 'number') {
      aktif = rawAktif === 1;
    }
  }

  return {
    PersonelId: Number(getProp(row, 'PersonelId', 'personelid', 'id', 'PersonelID', 'personel_id', 'personel')),
    TCKimlikNo: String(getProp(row, 'TCKimlikNo', 'tckimlikno', 'tc') || ''),
    AdSoyad: String(getProp(row, 'AdSoyad', 'adsoyad', 'ad') || ''),
    Telefon: String(getProp(row, 'Telefon', 'telefon', 'tel') || ''),
    Eposta: String(getProp(row, 'Eposta', 'eposta', 'email') || ''),
    KanGrubu: String(getProp(row, 'KanGrubu', 'kangrubu') || ''),
    AcilDurumKisisi: String(getProp(row, 'AcilDurumKisisi', 'acildurumkisisi') || ''),
    AcilDurumTelefonu: String(getProp(row, 'AcilDurumTelefonu', 'acildurumtelefonu') || ''),
    Departman: String(getProp(row, 'Departman', 'departman') || ''),
    Gorev: String(getProp(row, 'Gorev', 'gorev') || ''),
    IseGirisTarihi: formatDate(getProp(row, 'IseGirisTarihi', 'isegiristarihi')) || getBugunStr(),
    IstenCikisTarihi: cikanTarih,
    DogumTarihi: formatDate(getProp(row, 'DogumTarihi', 'dogumtarihi')),
    DurumAktifMi: aktif,
    SilindiMi: silindi,
    DevredenIzinGunu: Number(getProp(row, 'DevredenIzinGunu', 'devredenizingunu') || 0),
    IzinUcretiOdemeleri: ucretOdemeleri
  };
}

function normalizeProjePersonel(row: any) {
  if (!row) return null;
  const rawAktif = getProp(row, 'AktifMi', 'aktifmi', 'aktif');
  let aktif = true;
  if (rawAktif !== undefined && rawAktif !== null) {
    if (typeof rawAktif === 'string') {
      const lower = rawAktif.toLowerCase().trim();
      if (lower === 'false' || lower === '0' || lower === 'f' || lower === 'pasif') aktif = false;
    } else if (typeof rawAktif === 'boolean') {
      aktif = rawAktif;
    } else if (typeof rawAktif === 'number') {
      aktif = rawAktif === 1;
    }
  }

  return {
    KayitId: String(getProp(row, 'KayitId', 'kayitid', 'id', 'Id') || `PRJ-PER-${Date.now()}`),
    ProjeId: Number(getProp(row, 'ProjeId', 'projeid') || 0),
    ProjeAdi: String(getProp(row, 'ProjeAdi', 'projeadi') || ''),
    PersonelId: Number(getProp(row, 'PersonelId', 'personelid') || 0),
    AdSoyad: String(getProp(row, 'AdSoyad', 'adsoyad') || 'Personel'),
    Departman: String(getProp(row, 'Departman', 'departman') || ''),
    SirketGorevi: String(getProp(row, 'SirketGorevi', 'sirketgorevi') || ''),
    ProjeGorevi: String(getProp(row, 'ProjeGorevi', 'projegorevi') || 'Saha Görevlisi'),
    Telefon: String(getProp(row, 'Telefon', 'telefon') || ''),
    BaslangicTarihi: String(getProp(row, 'BaslangicTarihi', 'baslangictarihi') || ''),
    BitisTarihi: getProp(row, 'BitisTarihi', 'bitistarihi') ? String(getProp(row, 'BitisTarihi', 'bitistarihi')) : null,
    AktifMi: aktif,
    Notlar: String(getProp(row, 'Notlar', 'notlar') || '')
  };
}

function normalizeYevmiyeci(row: any) {
  let calismaGecmisi: any[] = [];
  try {
    const rawC = getProp(row, 'CalismaGecmisi', 'calismagecmisi', 'gecmis');
    if (Array.isArray(rawC)) calismaGecmisi = rawC;
    else if (typeof rawC === 'string' && rawC.trim()) calismaGecmisi = JSON.parse(rawC);
  } catch (e) {}

  let belgeler: any[] = [];
  try {
    const rawB = getProp(row, 'Belgeler', 'belgeler');
    if (Array.isArray(rawB)) belgeler = rawB;
    else if (typeof rawB === 'string' && rawB.trim()) belgeler = JSON.parse(rawB);
  } catch (e) {}

  let foto = String(getProp(row, 'Fotograf', 'fotograf', 'foto', 'resim') || '');
  if (foto && !foto.startsWith('data:') && !foto.startsWith('http')) {
    foto = parseDatabaseFileContent(foto);
  }

  return {
    YevmiyeciId: Number(getProp(row, 'YevmiyeciId', 'yevmiyeciid', 'id')),
    AdSoyad: String(getProp(row, 'AdSoyad', 'adsoyad', 'ad') || ''),
    Telefon: String(getProp(row, 'Telefon', 'telefon', 'tel') || ''),
    TcKimlikNo: String(getProp(row, 'TcKimlikNo', 'tckimlikno', 'tc') || ''),
    IbanNo: String(getProp(row, 'IbanNo', 'ibanno', 'iban') || ''),
    UzmanlikAlani: String(getProp(row, 'UzmanlikAlani', 'uzmanlikalani', 'uzmanlik', 'meslek') || 'Montaj Ustası'),
    GunlukYevmiye: Number(getProp(row, 'GunlukYevmiye', 'gunlukyevmiye', 'yevmiye', 'ucret') || 0),
    Durum: String(getProp(row, 'Durum', 'durum') || 'Musait'),
    AktifProjeId: getProp(row, 'AktifProjeId', 'aktifprojeid') ? Number(getProp(row, 'AktifProjeId', 'aktifprojeid')) : null,
    AktifProjeAdi: String(getProp(row, 'AktifProjeAdi', 'aktifprojeadi') || ''),
    Puan: Number(getProp(row, 'Puan', 'puan') || 5),
    Guvenilirlik: String(getProp(row, 'Guvenilirlik', 'guvenilirlik') || 'CokIyi'),
    Fotograf: foto,
    Notlar: String(getProp(row, 'Notlar', 'notlar', 'not') || ''),
    IkametSehir: String(getProp(row, 'IkametSehir', 'ikametsehir', 'sehir', 'adres') || ''),
    KayitTarihi: formatDate(getProp(row, 'KayitTarihi', 'kayittarihi')) || getBugunStr(),
    CalismaGecmisi: calismaGecmisi,
    Belgeler: belgeler
  };
}

function normalizeIzin(row: any) {
  return {
    IzinId: Number(getProp(row, 'IzinId', 'izinid', 'id')),
    PersonelId: Number(getProp(row, 'PersonelId', 'personelid')),
    IzinTuru: String(getProp(row, 'IzinTuru', 'izinturu') || 'Yıllık İzin'),
    BaslangicTarihi: formatDate(getProp(row, 'BaslangicTarihi', 'baslangictarihi')) || getBugunStr(),
    BitisTarihi: formatDate(getProp(row, 'BitisTarihi', 'bitistarihi')) || getBugunStr(),
    IsGunuSayisi: Number(getProp(row, 'IsGunuSayisi', 'isgunusayisi') || 1),
    Durum: String(getProp(row, 'Durum', 'durum') || 'Onaylandı'),
    Onaylayan: String(getProp(row, 'Onaylayan', 'onaylayan') || ''),
    Aciklama: String(getProp(row, 'Aciklama', 'aciklama') || ''),
    SilindiMi: Boolean(getProp(row, 'SilindiMi', 'silindimi'))
  };
}

function normalizePuantaj(row: any) {
  return {
    PuantajId: Number(getProp(row, 'PuantajId', 'puantajid', 'id')),
    PersonelId: Number(getProp(row, 'PersonelId', 'personelid')),
    Tarih: formatDate(getProp(row, 'Tarih', 'tarih')) || getBugunStr(),
    DurumKodu: String(getProp(row, 'DurumKodu', 'durumkodu') || 'N'),
    NormalCalismaSaati: Number(getProp(row, 'NormalCalismaSaati', 'normalcalismasaati') || 0),
    FazlaMesaiSaati: Number(getProp(row, 'FazlaMesaiSaati', 'fazlamesaisaati') || 0),
    HaftaTatiliMesaiSaati: Number(getProp(row, 'HaftaTatiliMesaiSaati', 'haftatatilimesaisaati') || 0),
    ResmiTatilMesaiSaati: Number(getProp(row, 'ResmiTatilMesaiSaati', 'resmitatilmesaisaati') || 0),
    SaatlikKesintiUcretsiz: Number(getProp(row, 'SaatlikKesintiUcretsiz', 'saatlikkesintiucretsiz') || 0),
    Aciklama: String(getProp(row, 'Aciklama', 'aciklama') || '')
  };
}

function normalizeKkdZimmet(row: any) {
  return {
    ZimmetId: Number(getProp(row, 'ZimmetId', 'zimmetid', 'id')),
    PersonelId: Number(getProp(row, 'PersonelId', 'personelid')),
    MalzemeAdi: String(getProp(row, 'MalzemeAdi', 'malzemeadi') || ''),
    StandartNo: String(getProp(row, 'StandartNo', 'standartno') || ''),
    VerilisTarihi: formatDate(getProp(row, 'VerilisTarihi', 'verilistarihi')) || getBugunStr(),
    YenilemePeriyoduAy: Number(getProp(row, 'YenilemePeriyoduAy', 'yenilemeperiyoduay') || 12),
    Adet: Number(getProp(row, 'Adet', 'adet') || 1),
    BedenNo: String(getProp(row, 'BedenNo', 'bedenno') || ''),
    Aciklama: String(getProp(row, 'Aciklama', 'aciklama') || ''),
    TeslimEdildiMi: Boolean(getProp(row, 'TeslimEdildiMi', 'teslimedildimi') ?? true),
    IadeEdildiMi: Boolean(getProp(row, 'IadeEdildiMi', 'iadeedildimi') ?? false)
  };
}

function normalizeSaglikRaporu(row: any) {
  const muayeneTarihi = formatDate(getProp(row, 'MuayeneTarihi', 'muayenetarihi', 'MuayeneTarih', 'muayene_tarihi', 'tarih', 'Tarih')) || getBugunStr();
  const gecerlilikSuresiAy = Number(getProp(row, 'GecerlilikSuresiAy', 'gecerliliksuresiay', 'GecerlilikAy', 'gecerlilikay', 'sure', 'Sure') || 12);
  let gelecekMuayene = formatDate(getProp(row, 'GelecekMuayeneTarihi', 'gelecekmuayenetarihi', 'GelecekMuayeneTarih', 'gelecek_muayene_tarihi'));
  if (!gelecekMuayene || gelecekMuayene === '-') {
    gelecekMuayene = tarihAyEkle(muayeneTarihi, gecerlilikSuresiAy);
  }

  return {
    RaporId: Number(getProp(row, 'RaporId', 'raporid', 'id', 'RaporID')),
    PersonelId: Number(getProp(row, 'PersonelId', 'personelid', 'personel_id', 'PersonelID', 'personel', 'Personel')),
    PersonelAdSoyad: String(getProp(row, 'PersonelAdSoyad', 'personeladsoyad', 'AdSoyad', 'adsoyad', 'PersonelAd', 'personelad') || ''),
    MuayeneTuru: String(getProp(row, 'MuayeneTuru', 'muayeneturu', 'tur') || 'Periyodik Sağlık Muayenesi'),
    MuayeneTarihi: muayeneTarihi,
    GelecekMuayeneTarihi: gelecekMuayene,
    GecerlilikSuresiAy: gecerlilikSuresiAy,
    SaglikKurulusu: String(getProp(row, 'SaglikKurulusu', 'saglikkurulusu', 'kurum') || 'Yetkili OSGB'),
    Sonuc: String(getProp(row, 'Sonuc', 'sonuc') || 'Çalışmaya Uygundur'),
    RaporNo: String(getProp(row, 'RaporNo', 'raporno') || ''),
    Aciklama: String(getProp(row, 'Aciklama', 'aciklama') || ''),
    BelgeUrl: String(getProp(row, 'BelgeUrl', 'belgeurl', 'belge', 'dosya', 'dosyaicerigi', 'BelgeIcerik') || ''),
    BelgeAdi: String(getProp(row, 'BelgeAdi', 'belgeadi', 'dosyaadi', 'DosyaAdi') || '')
  };
}

function normalizeIsgEgitim(row: any) {
  const egitimKonusu = String(getProp(row, 'EgitimKonusu', 'egitimkonusu', 'EgitimAdi', 'egitimadi', 'konu', 'Konu') || 'Temel İSG Eğitimi');
  const egiticiAdSoyad = String(getProp(row, 'EgiticiAdSoyad', 'egiticiadsoyad', 'EgitimciKurum', 'egitimcikurum', 'egitici', 'Egitici') || 'Yetkili OSGB');
  const gecerlilikAy = Number(getProp(row, 'GecerlilikAy', 'gecerlilikay', 'GecerlilikYil', 'gecerlilikyil') || 24);
  const gecerlilikYil = gecerlilikAy >= 12 ? Math.round(gecerlilikAy / 12) : 1;
  const sureSaat = Number(getProp(row, 'SureSaat', 'suresaat', 'EgitimSuresiSaat', 'egitimsuresisaat', 'sure', 'Sure') || 12);
  
  return {
    EgitimId: Number(getProp(row, 'EgitimId', 'egitimid', 'id', 'EgitimID')),
    PersonelId: Number(getProp(row, 'PersonelId', 'personelid', 'personel_id', 'PersonelID', 'personel', 'Personel')),
    PersonelAdSoyad: String(getProp(row, 'PersonelAdSoyad', 'personeladsoyad', 'AdSoyad', 'adsoyad', 'PersonelAd', 'personelad') || ''),
    EgitimKonusu: egitimKonusu,
    EgitimAdi: egitimKonusu,
    EgitimTarihi: formatDate(getProp(row, 'EgitimTarihi', 'egitimtarihi', 'EgitimTarih', 'egitim_tarihi', 'tarih', 'Tarih')) || getBugunStr(),
    GecerlilikAy: gecerlilikAy,
    GecerlilikYil: gecerlilikYil,
    EgitimSuresiSaat: sureSaat,
    SureSaat: sureSaat,
    EgiticiAdSoyad: egiticiAdSoyad,
    EgitimciKurum: egiticiAdSoyad,
    BelgeNo: String(getProp(row, 'BelgeNo', 'belgeno') || ''),
    Aciklama: String(getProp(row, 'Aciklama', 'aciklama') || ''),
    BelgeUrl: String(getProp(row, 'BelgeUrl', 'belgeurl', 'belge', 'dosya', 'dosyaicerigi', 'SertifikaUrl', 'sertifikaurl') || ''),
    BelgeAdi: String(getProp(row, 'BelgeAdi', 'belgeadi', 'dosyaadi', 'DosyaAdi', 'SertifikaAdi') || '')
  };
}

function normalizeHatirlatici(row: any) {
  // Let's check for any direct photo field (e.g. WPF app saves photo inside main table)
  const directPhotoKeys = ['foto', 'resim', 'gorsel', 'belge', 'dosya', 'dosyaicerigi', 'gorselveri', 'resimveri'];
  let directPhotoContent = '';
  for (const key of directPhotoKeys) {
    const val = getProp(row, key);
    if (val) {
      directPhotoContent = parseDatabaseFileContent(val);
      break;
    }
  }

  const directName = String(getProp(row, 'dosyaadi', 'dosya_adi', 'filename') || 'foto.png');
  const directSize = String(getProp(row, 'dosyaboyutu', 'dosya_boyutu', 'filesize') || '0 KB');

  return {
    Id: Number(getProp(row, 'Id', 'id', 'GorevId', 'gorevid', 'HatirlaticiId', 'hatirlaticiid')),
    Baslik: String(getProp(row, 'Baslik', 'baslik', 'ad') || ''),
    Aciklama: String(getProp(row, 'Aciklama', 'aciklama', 'DetayNot', 'detaynot') || ''),
    Tarih: formatDate(getProp(row, 'Tarih', 'tarih', 'SonTarih', 'sontarih')) || getBugunStr(),
    Kategori: String(getProp(row, 'Kategori', 'kategori') || 'Fabrika / Üretim'),
    TamamlandiMi: String(getProp(row, 'Durum', 'durum')) === 'Tamamlandı' || Boolean(getProp(row, 'TamamlandiMi', 'tamamlandimi')),
    OnemDerecesi: String(getProp(row, 'OnemDerecesi', 'onemderecesi', 'Oncelik', 'oncelik') || 'Normal'),
    SorumluPersonelId: getProp(row, 'SorumluPersonelId', 'sorumlupersonelid') ? Number(getProp(row, 'SorumluPersonelId', 'sorumlupersonelid')) : null,
    _directPhoto: directPhotoContent,
    _directPhotoName: directName,
    _directPhotoSize: directSize
  };
}

function getFileExtension(filename?: string, content?: string): string {
  if (filename && filename.includes('.')) {
    const parts = filename.split('.');
    const ext = parts[parts.length - 1].trim().toLowerCase();
    if (ext) return ext.startsWith('.') ? ext : `.${ext}`;
  }
  if (content && typeof content === 'string' && content.startsWith('data:')) {
    const match = content.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-\+\.]+);/);
    if (match && match[1]) {
      const mime = match[1].toLowerCase();
      if (mime.includes('png')) return '.png';
      if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
      if (mime.includes('pdf')) return '.pdf';
      if (mime.includes('webp')) return '.webp';
      if (mime.includes('svg')) return '.svg';
      if (mime.includes('gif')) return '.gif';
      if (mime.includes('doc')) return '.doc';
      if (mime.includes('xls')) return '.xls';
    }
  }
  return '.png';
}

function getFileMimeType(filename?: string, content?: string): string {
  if (content && typeof content === 'string' && content.startsWith('data:')) {
    const match = content.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-\+\.]+);/);
    if (match && match[1]) return match[1];
  }
  const ext = getFileExtension(filename, content).replace('.', '').toLowerCase();
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain'
  };
  return mimeMap[ext] || 'application/octet-stream';
}

async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    const cleanName = tableName.replace(/"/g, '');
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 OR table_name = $2
    `, [cleanName, cleanName.toLowerCase()]);
    return res.rows.map(r => r.column_name);
  } catch (err) {
    return [];
  }
}

function extractFileContentFromRow(row: any): string {
  if (!row) return '';
  const val = getProp(
    row,
    'DosyaVerisi', 'dosyaverisi', 'dosya_verisi', 'DosyaVeri', 'dosyaveri',
    'DosyaIcerigi', 'dosyaicerigi', 'dosya_icerigi', 'DosyaIcerik', 'dosyaicerik',
    'Icerik', 'icerik',
    'Veri', 'veri',
    'Base64', 'base64',
    'Content', 'content',
    'Data', 'data',
    'FileContent', 'filecontent',
    'FileData', 'filedata',
    'ByteData', 'bytedata',
    'BinaryData', 'binarydata',
    'Resim', 'resim',
    'Foto', 'foto',
    'Gorsel', 'gorsel',
    'Blob', 'blob',
    'Dosya', 'dosya',
    'Belge', 'belge'
  );
  return parseDatabaseFileContent(val);
}

async function isTableColumnBytea(tableName: string, colCandidates: string[]): Promise<boolean> {
  try {
    const cleanName = tableName.replace(/"/g, '');
    const cols = await getTableColumns(tableName);
    const colName = cols.find(c => colCandidates.some(cand => cand.toLowerCase() === c.toLowerCase()));
    if (!colName) return false;
    const dtRes = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE (table_name = $1 OR table_name = $2) AND column_name = $3
    `, [cleanName, cleanName.toLowerCase(), colName]);
    if (dtRes.rows.length > 0 && dtRes.rows[0].data_type === 'bytea') {
      return true;
    }
  } catch (e) {}
  return false;
}

function buildDocumentRowData(
  cols: string[],
  foreignKeyCol: string | null,
  foreignKeyValue: any,
  file: any,
  extraCols?: Record<string, any>,
  isBytea = false
): Record<string, any> {
  const fileName = String(
    file.DosyaAdi || file.dosyaAdi || file.dosya_adi || file.ad || file.name || file.filename || file.title || 'belge.png'
  );
  const fileContent =
    file.DosyaVerisi ||
    file.DosyaIcerigi ||
    file.dosyaIcerigi ||
    file.dosya_icerigi ||
    file.dosyaicerigi ||
    file.base64 ||
    file.Base64 ||
    file.content ||
    file.Content ||
    file.data ||
    file.Data ||
    file.url ||
    file.Url ||
    file.fileData ||
    file.fileContent ||
    file.preview ||
    file.veri ||
    file.Veri ||
    '';

  const fileExt = getFileExtension(fileName, typeof fileContent === 'string' ? fileContent : undefined);
  const mimeType = getFileMimeType(fileName, typeof fileContent === 'string' ? fileContent : undefined);
  const fileSize = String(file.DosyaBoyutu || file.dosyaBoyutu || file.dosya_boyutu || file.boyut || file.size || '0 KB');
  const uploadDate = formatDate(file.YuklemeTarihi || file.yuklemeTarihi || file.yukleme_tarihi || file.tarih || file.created_at) || getBugunStr();
  const uploader = String(file.YukleyenKisi || file.yukleyenkisi || file.yukleyen || file.ekleyen || file.user || 'Sistem');
  const description = String(file.Aciklama || file.aciklama || file.notlar || file.not || '');

  let formattedContent: any = fileContent || '';
  if (isBytea && typeof fileContent === 'string' && fileContent.includes('base64,')) {
    const base64Data = fileContent.split('base64,')[1];
    formattedContent = Buffer.from(base64Data, 'base64');
  } else if (isBytea && typeof fileContent === 'string' && !fileContent.startsWith('data:')) {
    formattedContent = Buffer.from(fileContent, 'base64');
  }

  const rowData: Record<string, any> = {};

  if (foreignKeyCol) {
    rowData[foreignKeyCol] = foreignKeyValue;
  }

  if (extraCols) {
    for (const [k, v] of Object.entries(extraCols)) {
      if (v !== undefined) {
        const match = cols.find(c => c.toLowerCase() === k.toLowerCase());
        if (match) {
          rowData[match] = v;
        }
      }
    }
  }

  for (const col of cols) {
    if (rowData[col] !== undefined) continue;
    const lower = col.toLowerCase();

    if (lower === 'id' || lower === 'belgeid' || lower === 'belge_id' || lower === 'fotoid' || lower === 'foto_id') {
      continue;
    }

    if (
      lower.includes('veri') ||
      lower.includes('icerik') ||
      lower.includes('base64') ||
      lower.includes('content') ||
      lower.includes('data') ||
      lower.includes('byte') ||
      lower.includes('resim') ||
      lower.includes('foto') ||
      lower.includes('gorsel') ||
      lower.includes('blob') ||
      lower === 'dosya' ||
      lower === 'belge'
    ) {
      rowData[col] = formattedContent ?? '';
    } else if (lower.includes('uzanti') || lower.includes('ext')) {
      rowData[col] = fileExt || 'png';
    } else if (lower.includes('mime') || lower.includes('type') || lower.includes('tur') || lower.includes('tip') || lower.includes('format')) {
      rowData[col] = mimeType || 'image/png';
    } else if (lower.includes('ad') || lower.includes('name') || lower.includes('baslik') || lower.includes('filename') || lower.includes('file_name')) {
      rowData[col] = fileName || 'belge.png';
    } else if (lower.includes('boyut') || lower.includes('size')) {
      rowData[col] = fileSize || '0 KB';
    } else if (lower.includes('tarih') || lower.includes('date') || lower.includes('time') || lower.includes('created')) {
      rowData[col] = uploadDate || getBugunStr();
    } else if (lower.includes('kullanici') || lower.includes('kisi') || lower.includes('user') || lower.includes('ekleyen') || lower.includes('yukleyen') || lower.includes('author')) {
      rowData[col] = uploader || 'Sistem';
    } else if (lower.includes('aciklama') || lower.includes('not') || lower.includes('desc')) {
      rowData[col] = description || '';
    } else if (lower.includes('dinamik') || lower.includes('numara') || lower.includes('asamakodu')) {
      if (extraCols && (extraCols.DinamikNumara || extraCols.dinamiknumara)) {
        rowData[col] = extraCols.DinamikNumara || extraCols.dinamiknumara;
      } else {
        rowData[col] = '';
      }
    } else {
      rowData[col] = '';
    }
  }

  // Ensure no column value is null
  for (const k of Object.keys(rowData)) {
    if (rowData[k] === null || rowData[k] === undefined) {
      rowData[k] = '';
    }
  }

  return rowData;
}

async function saveHatirlaticiToDb(id: number | null, data: any, isNew: boolean): Promise<any> {
  const cols = await getTableColumns(detectedTables.hatirlaticilar!);
  const mapCol = (candidates: string[]) => {
    return cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));
  };

  const idCol = mapCol(['Id', 'GorevId', 'HatirlaticiId']) || 'Id';

  const rowData: any = {};
  const setIfColExists = (candidates: string[], val: any) => {
    const col = mapCol(candidates);
    if (col) {
      rowData[col] = val;
    }
  };

  setIfColExists(['Baslik', 'ad'], data.Baslik || '');
  setIfColExists(['Aciklama', 'DetayNot'], data.Aciklama || '');
  setIfColExists(['Tarih', 'SonTarih'], data.Tarih || getBugunStr());
  setIfColExists(['Kategori'], data.Kategori || 'Gorev');
  setIfColExists(['OnemDerecesi', 'Oncelik'], data.OnemDerecesi || 'Normal');
  setIfColExists(['SorumluPersonelId'], data.SorumluPersonelId ? Number(data.SorumluPersonelId) : null);

  // NOT NULL audit/date columns for database schema constraints
  setIfColExists(['GirisTarihi', 'giristarihi', 'giris_tarihi', 'GirisTarih'], data.GirisTarihi || data.Tarih || getBugunStr());
  setIfColExists(['KayitTarihi', 'kayittarihi', 'kayit_tarihi', 'OlusturmaTarihi', 'olusturmatarihi', 'created_at'], data.KayitTarihi || getBugunStr());
  setIfColExists(['SilindiMi', 'silindimi'], false);
  setIfColExists(['AktifMi', 'aktifmi'], true);

  const tamamCol = mapCol(['TamamlandiMi', 'Durum']);
  if (tamamCol) {
    if (tamamCol.toLowerCase() === 'durum') {
      rowData[tamamCol] = data.TamamlandiMi ? 'Tamamlandı' : 'Bekliyor';
    } else {
      rowData[tamamCol] = Boolean(data.TamamlandiMi);
    }
  }

  if (isNew) {
    const keys = Object.keys(rowData);
    if (keys.length === 0) return null;
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
      INSERT INTO ${detectedTables.hatirlaticilar} (${keys.map(k => `"${k}"`).join(', ')})
      VALUES (${placeholders})
      RETURNING *;
    `;
    const res = await pool.query(query, keys.map(k => rowData[k]));
    return normalizeHatirlatici(res.rows[0]);
  } else {
    const keys = Object.keys(rowData);
    if (keys.length === 0) return null;
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const query = `
      UPDATE ${detectedTables.hatirlaticilar}
      SET ${setClause}
      WHERE "${idCol}" = $${keys.length + 1}
      RETURNING *;
    `;
    const res = await pool.query(query, [...keys.map(k => rowData[k]), id]);
    if (res.rows.length > 0) {
      return normalizeHatirlatici(res.rows[0]);
    }
    return null;
  }
}

async function saveSaglikRaporuToDb(id: number | null, data: any, isNew: boolean): Promise<any> {
  if (!detectedTables.saglikRaporlari) return null;
  const cols = await getTableColumns(detectedTables.saglikRaporlari);
  const mapCol = (candidates: string[]) => {
    return cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));
  };

  const idCol = mapCol(['RaporId', 'id', 'RaporID']) || 'RaporId';

  const rowData: any = {};
  const setIfColExists = (candidates: string[], val: any) => {
    const col = mapCol(candidates);
    if (col) {
      rowData[col] = val;
    }
  };

  setIfColExists(['PersonelId', 'personelid', 'personel_id', 'PersonelID', 'personel'], Number(data.PersonelId));
  setIfColExists(['MuayeneTuru', 'muayeneturu', 'tur'], data.MuayeneTuru || 'Periyodik Sağlık Muayenesi');
  setIfColExists(['MuayeneTarihi', 'muayenetarihi', 'muayene_tarihi', 'tarih'], data.MuayeneTarihi || getBugunStr());
  setIfColExists(['GelecekMuayeneTarihi', 'gelecekmuayenetarihi', 'gelecek_muayene_tarihi'], data.GelecekMuayeneTarihi || null);
  setIfColExists(['GecerlilikSuresiAy', 'gecerliliksuresiay', 'gecerlilikay', 'sure'], Number(data.GecerlilikSuresiAy || 12));
  setIfColExists(['SaglikKurulusu', 'saglikkurulusu', 'kurum'], data.SaglikKurulusu || 'Yetkili OSGB');
  setIfColExists(['Sonuc', 'sonuc'], data.Sonuc || 'Çalışmaya Uygundur');
  setIfColExists(['RaporNo', 'raporno'], data.RaporNo || '');
  setIfColExists(['Aciklama', 'aciklama'], data.Aciklama || '');
  setIfColExists(['BelgeUrl', 'belgeurl', 'belge', 'dosya', 'dosyaicerigi', 'BelgeIcerik'], data.BelgeUrl || '');
  setIfColExists(['BelgeAdi', 'belgeadi', 'dosyaadi', 'DosyaAdi'], data.BelgeAdi || '');
  setIfColExists(['GirisTarihi', 'giristarihi', 'giris_tarihi', 'KayitTarihi', 'kayittarihi', 'kayit_tarihi'], getBugunStr());
  setIfColExists(['SilindiMi', 'silindimi'], false);

  if (isNew) {
    const keys = Object.keys(rowData);
    if (keys.length === 0) return null;
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
      INSERT INTO ${detectedTables.saglikRaporlari} (${keys.map(k => `"${k}"`).join(', ')})
      VALUES (${placeholders})
      RETURNING *;
    `;
    const res = await pool.query(query, keys.map(k => rowData[k]));
    return normalizeSaglikRaporu(res.rows[0]);
  } else {
    const keys = Object.keys(rowData);
    if (keys.length === 0) return null;
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const query = `
      UPDATE ${detectedTables.saglikRaporlari}
      SET ${setClause}
      WHERE "${idCol}" = $${keys.length + 1}
      RETURNING *;
    `;
    const res = await pool.query(query, [...keys.map(k => rowData[k]), id]);
    if (res.rows.length > 0) return normalizeSaglikRaporu(res.rows[0]);
    return null;
  }
}

async function saveIsgEgitimToDb(id: number | null, data: any, isNew: boolean): Promise<any> {
  if (!detectedTables.isgEgitimleri) return null;
  const cols = await getTableColumns(detectedTables.isgEgitimleri);
  const mapCol = (candidates: string[]) => {
    return cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));
  };

  const idCol = mapCol(['EgitimId', 'id', 'EgitimID']) || 'EgitimId';

  const rowData: any = {};
  const setIfColExists = (candidates: string[], val: any) => {
    const col = mapCol(candidates);
    if (col) {
      rowData[col] = val;
    }
  };

  setIfColExists(['PersonelId', 'personelid', 'personel_id', 'PersonelID', 'personel'], Number(data.PersonelId));
  setIfColExists(['EgitimKonusu', 'egitimkonusu', 'EgitimAdi', 'egitimadi', 'konu'], data.EgitimAdi || data.EgitimKonusu || 'Temel İSG Eğitimi');
  setIfColExists(['EgitimTarihi', 'egitimtarihi', 'egitim_tarihi', 'tarih'], data.EgitimTarihi || getBugunStr());
  setIfColExists(['GecerlilikAy', 'gecerlilikay', 'GecerlilikYil', 'gecerlilikyil'], Number(data.GecerlilikAy || 24));
  setIfColExists(['EgitimSuresiSaat', 'egitimsuresisaat', 'SureSaat', 'suresaat', 'sure'], Number(data.EgitimSuresiSaat || 12));
  setIfColExists(['EgiticiAdSoyad', 'egiticiadsoyad', 'EgitimciKurum', 'egitimcikurum', 'egitici'], data.EgitimciKurum || data.EgiticiAdSoyad || 'Yetkili OSGB');
  setIfColExists(['BelgeNo', 'belgeno'], data.BelgeNo || '');
  setIfColExists(['Aciklama', 'aciklama'], data.Aciklama || '');
  setIfColExists(['BelgeUrl', 'belgeurl', 'belge', 'dosya', 'dosyaicerigi', 'sertifikaurl'], data.BelgeUrl || '');
  setIfColExists(['BelgeAdi', 'belgeadi', 'dosyaadi', 'sertifikaadi'], data.BelgeAdi || '');
  setIfColExists(['GirisTarihi', 'giristarihi', 'giris_tarihi', 'KayitTarihi', 'kayittarihi', 'kayit_tarihi'], getBugunStr());
  setIfColExists(['SilindiMi', 'silindimi'], false);

  if (isNew) {
    const keys = Object.keys(rowData);
    if (keys.length === 0) return null;
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
      INSERT INTO ${detectedTables.isgEgitimleri} (${keys.map(k => `"${k}"`).join(', ')})
      VALUES (${placeholders})
      RETURNING *;
    `;
    const res = await pool.query(query, keys.map(k => rowData[k]));
    return normalizeIsgEgitim(res.rows[0]);
  } else {
    const keys = Object.keys(rowData);
    if (keys.length === 0) return null;
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const query = `
      UPDATE ${detectedTables.isgEgitimleri}
      SET ${setClause}
      WHERE "${idCol}" = $${keys.length + 1}
      RETURNING *;
    `;
    const res = await pool.query(query, [...keys.map(k => rowData[k]), id]);
    if (res.rows.length > 0) return normalizeIsgEgitim(res.rows[0]);
    return null;
  }
}

async function saveProjeToDb(id: number | null, data: any, isNew: boolean): Promise<any> {
  if (!detectedTables.projeler) return null;
  const cols = await getTableColumns(detectedTables.projeler);
  const mapCol = (candidates: string[]) => {
    return cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));
  };

  const idCol = mapCol(['ProjeId', 'id', 'Id', 'projeid']) || 'ProjeId';

  const rowData: any = {};
  const setIfColExists = (candidates: string[], val: any) => {
    const col = mapCol(candidates);
    if (col && val !== undefined) {
      rowData[col] = val;
    }
  };

  setIfColExists(['ProjeKodu', 'projekodu', 'kod', 'Kod'], data.ProjeKodu || '');
  setIfColExists(['ProjeAdi', 'projeadi', 'ad', 'Ad', 'IsinAdi', 'IsAdi'], data.ProjeAdi || '');
  setIfColExists(['MusteriFirma', 'musterifirma', 'musteri', 'Musteri', 'Firma'], data.MusteriFirma || '');
  setIfColExists(['SantiyeAdresi', 'santiyeadresi', 'adres', 'Adres', 'Santiye'], data.SantiyeAdresi || '');
  setIfColExists(['SorumluKisi', 'sorumlukisi', 'sorumlu', 'Sorumlu', 'ProjeSorumlusu', 'SorumluPersonel'], data.SorumluKisi || '');
  if (data.SorumluPersonelId) {
    setIfColExists(['SorumluPersonelId', 'sorumlupersonelid'], Number(data.SorumluPersonelId));
  }
  setIfColExists(['BaslangicTarihi', 'baslangictarihi', 'baslangic', 'GirisTarihi', 'Tarih'], formatDate(data.BaslangicTarihi) || getBugunStr());
  setIfColExists(['Deadline', 'deadline', 'bitistarihi', 'BitisTarihi', 'HedefTarih'], formatDate(data.Deadline));
  setIfColExists(['Durum', 'durum'], data.Durum || 'Teklif Verildi');
  setIfColExists(['GenelIlerlemeYuzdesi', 'genelilerlemeyuzdesi', 'ilerleme', 'IlerlemeYuzdesi'], Number(data.GenelIlerlemeYuzdesi) || 0);
  setIfColExists(['AktifMi', 'aktifmi'], data.AktifMi ?? true);
  setIfColExists(['KilitliMi', 'kilitlimi'], data.KilitliMi ?? false);

  if (isNew) {
    const keys = Object.keys(rowData);
    if (keys.length === 0) return null;
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
      INSERT INTO ${detectedTables.projeler} (${keys.map(k => `"${k}"`).join(', ')})
      VALUES (${placeholders})
      RETURNING *;
    `;
    const res = await pool.query(query, keys.map(k => rowData[k]));
    return normalizeProje(res.rows[0]);
  } else {
    const keys = Object.keys(rowData);
    if (keys.length === 0) return null;
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const query = `
      UPDATE ${detectedTables.projeler}
      SET ${setClause}
      WHERE "${idCol}" = $${keys.length + 1}
      RETURNING *;
    `;
    const res = await pool.query(query, [...keys.map(k => rowData[k]), id]);
    if (res.rows.length > 0) {
      return normalizeProje(res.rows[0]);
    }
    return null;
  }
}

async function saveProjeAsamalarToDb(projeId: number, asamalar: any[]) {
  if (!detectedTables.asamalar) return;
  const cols = await getTableColumns(detectedTables.asamalar);
  const mapCol = (candidates: string[]) => {
    return cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));
  };

  const projeIdCol = mapCol(['ProjeId', 'projeid']) || 'ProjeId';

  // Clear existing stages and documents for this project
  await pool.query(`DELETE FROM ${detectedTables.asamalar} WHERE "${projeIdCol}" = $1`, [projeId]);

  if (detectedTables.projeBelgeler) {
    const belgeCols = await getTableColumns(detectedTables.projeBelgeler);
    const belgeProjIdCol = belgeCols.find(c => ['projeid', 'ProjeId'].includes(c.toLowerCase())) || 'ProjeId';
    await pool.query(`DELETE FROM ${detectedTables.projeBelgeler} WHERE "${belgeProjIdCol}" = $1`, [projeId]);
  }

  if (!asamalar || !Array.isArray(asamalar) || asamalar.length === 0) {
    return;
  }

  const idMap = new Map<number, number>();

  for (const asama of asamalar) {
    let resolvedUstId = asama.UstAsamaId || null;
    if (resolvedUstId && resolvedUstId < 0 && idMap.has(resolvedUstId)) {
      resolvedUstId = idMap.get(resolvedUstId);
    } else if (resolvedUstId && resolvedUstId < 0) {
      resolvedUstId = null;
    }

    const rowData: any = {};
    const setIfCol = (candidates: string[], val: any) => {
      const col = mapCol(candidates);
      if (col && val !== undefined) {
        rowData[col] = val;
      }
    };

    setIfCol(['ProjeId', 'projeid'], projeId);
    setIfCol(['UstAsamaId', 'ustasamaid', 'parentid'], resolvedUstId);
    setIfCol(['Seviye', 'seviye', 'level'], asama.Seviye || 1);
    setIfCol(['SiraNo', 'sirano', 'sira', 'order'], asama.SiraNo || 1);
    setIfCol(['DinamikNumara', 'dinamiknumara', 'numara', 'code'], asama.DinamikNumara || '');
    setIfCol(['AsamaAdi', 'asamaadi', 'ad', 'baslik', 'name'], asama.AsamaAdi || '');
    setIfCol(['TamamlandiMi', 'tamamlandimi', 'iscompleted'], asama.TamamlandiMi ?? false);
    setIfCol(['Durum', 'durum', 'status'], asama.Durum || 'Bekliyor');
    setIfCol(['KilitliMi', 'kilitlimi', 'islocked'], asama.KilitliMi ?? false);
    setIfCol(['Deadline', 'deadline', 'bitistarihi'], formatDate(asama.Deadline));
    setIfCol(['Notlar', 'notlar', 'note', 'aciklama'], asama.Notlar || '');

    const keys = Object.keys(rowData);
    if (keys.length > 0) {
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const insQuery = `
        INSERT INTO ${detectedTables.asamalar} (${keys.map(k => `"${k}"`).join(', ')})
        VALUES (${placeholders})
        RETURNING *;
      `;
      const insRes = await pool.query(insQuery, keys.map(k => rowData[k]));
      if (insRes.rows.length > 0) {
        const insertedAsama = normalizeAsama(insRes.rows[0]);
        if (asama.AsamaId < 0) {
          idMap.set(asama.AsamaId, insertedAsama.AsamaId);
        }

        // Save documents if any
        if (detectedTables.projeBelgeler && asama.Belgeler && Array.isArray(asama.Belgeler) && asama.Belgeler.length > 0) {
          const belgeCols = await getTableColumns(detectedTables.projeBelgeler);
          const foreignKeyCol = belgeCols.find(c => ['projeid', 'proje_id'].includes(c.toLowerCase())) || 'ProjeId';
          const isBytea = await isTableColumnBytea(detectedTables.projeBelgeler, [
            'DosyaVerisi', 'dosyaverisi', 'dosya_verisi', 'DosyaVeri', 'dosyaveri',
            'DosyaIcerigi', 'dosyaicerigi', 'dosya_icerigi', 'DosyaIcerik', 'dosyaicerik',
            'Icerik', 'icerik', 'Veri', 'veri', 'Base64', 'base64', 'Content', 'content', 'Data', 'data'
          ]);

          for (const file of asama.Belgeler) {
            const bData = buildDocumentRowData(
              belgeCols,
              foreignKeyCol,
              projeId,
              file,
              {
                ProjeId: projeId,
                AsamaId: insertedAsama.AsamaId,
                ProjeAsamaId: insertedAsama.AsamaId,
                DinamikNumara: insertedAsama.DinamikNumara || asama.DinamikNumara || '',
                AsamaKodu: insertedAsama.DinamikNumara || asama.DinamikNumara || ''
              },
              isBytea
            );

            const bKeys = Object.keys(bData);
            if (bKeys.length > 0) {
              const bPlaceholders = bKeys.map((_, i) => `$${i + 1}`).join(', ');
              const insBelgeQuery = `
                INSERT INTO ${detectedTables.projeBelgeler} (${bKeys.map(k => `"${k}"`).join(', ')})
                VALUES (${bPlaceholders});
              `;
              await pool.query(insBelgeQuery, bKeys.map(k => bData[k]));
            }
          }
        }
      }
    }
  }
}

// Dinamik Hatırlatıcı Belgeleri Kaydetme ve Silme Yardımcıları
async function saveHatirlaticiBelgelerToDb(hatirlaticiId: number, belgeler: any[]) {
  if (!detectedTables.hatirlaticiBelgeler) {
    // Eğer ayrı belge tablosu yoksa, doğrudan ana tablodaki alanları güncellemeyi dene
    await syncHatirlaticiAttachmentState(hatirlaticiId, belgeler);
    return;
  }
  try {
    const cols = await getTableColumns(detectedTables.hatirlaticiBelgeler);
    const mapCol = (candidates: string[]) => cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));
    const idCol = mapCol(['HatirlaticiId', 'GorevId', 'hatirlatici_id', 'gorev_id', 'id']) || 'HatirlaticiId';

    // Önce mevcut belgeleri sil
    await pool.query(`DELETE FROM ${detectedTables.hatirlaticiBelgeler} WHERE "${idCol}" = $1`, [hatirlaticiId]);

    const isBytea = await isTableColumnBytea(detectedTables.hatirlaticiBelgeler, [
      'DosyaVerisi', 'dosyaverisi', 'dosya_verisi', 'DosyaVeri', 'dosyaveri',
      'DosyaIcerigi', 'dosyaicerigi', 'dosya_icerigi', 'DosyaIcerik', 'dosyaicerik',
      'Icerik', 'icerik', 'Veri', 'veri', 'Base64', 'base64', 'Content', 'content', 'Data', 'data'
    ]);

    for (const file of belgeler) {
      const rowData = buildDocumentRowData(
        cols,
        idCol,
        hatirlaticiId,
        file,
        { HatirlaticiId: hatirlaticiId, GorevId: hatirlaticiId },
        isBytea
      );

      const keys = Object.keys(rowData);
      if (keys.length > 0) {
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const query = `
          INSERT INTO ${detectedTables.hatirlaticiBelgeler} (${keys.map(k => `"${k}"`).join(', ')})
          VALUES (${placeholders})
        `;
        await pool.query(query, keys.map(k => rowData[k]));
      }
    }

    // Ana tablodaki ilgili alanları (FotoSayisi, Foto vb.) eşitle
    await syncHatirlaticiAttachmentState(hatirlaticiId, belgeler);
  } catch (err: any) {
    console.error('[DB SAVE HATIRLATICI BELGELER ERROR]', err.message);
  }
}

// Hatırlatıcı ana tablosundaki fotoğraf veya belge alanlarını (varsa) eşitleme
async function syncHatirlaticiAttachmentState(hatirlaticiId: number, belgeler: any[]) {
  if (!detectedTables.hatirlaticilar) return;
  try {
    const cols = await getTableColumns(detectedTables.hatirlaticilar);
    const idCol = cols.find(c => ['id', 'gorevid', 'hatirlaticiid', 'gorev_id', 'hatirlatici_id'].includes(c.toLowerCase())) || 'Id';
    
    const countCol = cols.find(c => ['fotosayisi', 'belgesayisi', 'fotografsayisi', 'resimsayisi', 'dosyasayisi'].includes(c.toLowerCase()));
    const hasPhotoCol = cols.find(c => ['fotovarmi', 'belgevarmi', 'fotovar', 'belgevar', 'hasphoto', 'hasdocument', 'gorsel_var_mi', 'foto_var_mi', 'belge_var_mi'].includes(c.toLowerCase()));
    const directPhotoCol = cols.find(c => ['foto', 'resim', 'gorsel', 'belge', 'dosya', 'dosyaicerigi', 'gorselveri', 'resimveri'].includes(c.toLowerCase()));
    const directNameCol = cols.find(c => ['dosyaadi', 'fotoadi', 'resimadi', 'dosya_adi', 'foto_adi', 'filename'].includes(c.toLowerCase()));
    const directSizeCol = cols.find(c => ['dosyaboyutu', 'fotoboyutu', 'resimboyutu', 'dosya_boyutu', 'filesize'].includes(c.toLowerCase()));

    const updates: string[] = [];
    const vals: any[] = [];
    let paramIndex = 1;

    if (countCol) {
      updates.push(`"${countCol}" = $${paramIndex++}`);
      vals.push(belgeler.length);
    }

    if (hasPhotoCol) {
      updates.push(`"${hasPhotoCol}" = $${paramIndex++}`);
      vals.push(belgeler.length > 0);
    }

    if (directNameCol) {
      updates.push(`"${directNameCol}" = $${paramIndex++}`);
      vals.push(belgeler.length > 0 ? (belgeler[0].DosyaAdi || belgeler[0].ad || 'foto.png') : null);
    }

    if (directSizeCol) {
      updates.push(`"${directSizeCol}" = $${paramIndex++}`);
      vals.push(belgeler.length > 0 ? (belgeler[0].DosyaBoyutu || belgeler[0].boyut || '0 KB') : null);
    }

    if (directPhotoCol) {
      // Find type of directPhotoCol to convert appropriately
      let isBytea = false;
      try {
        const dtRes = await pool.query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `, [detectedTables.hatirlaticilar.replace(/"/g, ''), directPhotoCol]);
        if (dtRes.rows.length > 0 && dtRes.rows[0].data_type === 'bytea') {
          isBytea = true;
        }
      } catch (e) {}

      updates.push(`"${directPhotoCol}" = $${paramIndex++}`);
      const fileContent = belgeler.length > 0 ? (belgeler[0].DosyaIcerigi || belgeler[0].base64 || '') : '';
      if (isBytea && typeof fileContent === 'string' && fileContent.includes('base64,')) {
        const base64Data = fileContent.split('base64,')[1];
        vals.push(Buffer.from(base64Data, 'base64'));
      } else if (isBytea && typeof fileContent === 'string' && !fileContent.startsWith('data:')) {
        vals.push(Buffer.from(fileContent, 'base64'));
      } else {
        vals.push(fileContent || null);
      }
    }

    if (updates.length > 0) {
      vals.push(hatirlaticiId);
      const query = `
        UPDATE ${detectedTables.hatirlaticilar}
        SET ${updates.join(', ')}
        WHERE "${idCol}" = $${paramIndex}
      `;
      await pool.query(query, vals);
      console.log(`[DB] Sync'ed attachment columns on Hatirlaticilar for ID ${hatirlaticiId}:`, updates);
    }
  } catch (err: any) {
    console.error('[DB SYNC HATIRLATICI ATTACHMENT ERROR]', err.message);
  }
}

async function deleteHatirlaticiBelgelerFromDb(hatirlaticiId: number) {
  if (!detectedTables.hatirlaticiBelgeler) {
    await syncHatirlaticiAttachmentState(hatirlaticiId, []);
    return;
  }
  try {
    const cols = await getTableColumns(detectedTables.hatirlaticiBelgeler);
    const idCol = cols.find(c => ['hatirlaticiid', 'gorevid', 'hatirlatici_id', 'gorev_id'].includes(c.toLowerCase())) || 'HatirlaticiId';
    await pool.query(`DELETE FROM ${detectedTables.hatirlaticiBelgeler} WHERE "${idCol}" = $1`, [hatirlaticiId]);
    await syncHatirlaticiAttachmentState(hatirlaticiId, []);
  } catch (err: any) {
    console.error('[DB DELETE HATIRLATICI BELGELER ERROR]', err.message);
  }
}

// Dinamik Araç Bakım Belgeleri Kaydetme ve Silme Yardımcıları
async function saveAracBakimBelgelerToDb(bakimId: number, belgeler: any[]) {
  if (!detectedTables.aracBakimBelgeler) {
    await syncAracBakimAttachmentState(bakimId, belgeler);
    return;
  }
  try {
    const cols = await getTableColumns(detectedTables.aracBakimBelgeler);
    const mapCol = (candidates: string[]) => cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));
    const idCol = mapCol(['BakimId', 'bakimid', 'bakim_id', 'id']) || 'BakimId';

    await pool.query(`DELETE FROM ${detectedTables.aracBakimBelgeler} WHERE "${idCol}" = $1`, [bakimId]);

    const isBytea = await isTableColumnBytea(detectedTables.aracBakimBelgeler, [
      'DosyaVerisi', 'dosyaverisi', 'dosya_verisi', 'DosyaVeri', 'dosyaveri',
      'DosyaIcerigi', 'dosyaicerigi', 'dosya_icerigi', 'DosyaIcerik', 'dosyaicerik',
      'Icerik', 'icerik', 'Veri', 'veri', 'Base64', 'base64', 'Content', 'content', 'Data', 'data'
    ]);

    for (const file of belgeler) {
      const rowData = buildDocumentRowData(
        cols,
        idCol,
        bakimId,
        file,
        { BakimId: bakimId },
        isBytea
      );

      const keys = Object.keys(rowData);
      if (keys.length > 0) {
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const query = `
          INSERT INTO ${detectedTables.aracBakimBelgeler} (${keys.map(k => `"${k}"`).join(', ')})
          VALUES (${placeholders})
        `;
        await pool.query(query, keys.map(k => rowData[k]));
      }
    }

    await syncAracBakimAttachmentState(bakimId, belgeler);
  } catch (err: any) {
    console.error('[DB SAVE ARAC BAKIM BELGELER ERROR]', err.message);
  }
}

async function syncAracBakimAttachmentState(bakimId: number, belgeler: any[]) {
  if (!detectedTables.aracBakimlar) return;
  try {
    const cols = await getTableColumns(detectedTables.aracBakimlar);
    const idCol = cols.find(c => ['bakimid', 'id', 'bakim_id'].includes(c.toLowerCase())) || 'BakimId';

    const countCol = cols.find(c => ['fotosayisi', 'belgesayisi', 'fotografsayisi', 'resimsayisi', 'dosyasayisi'].includes(c.toLowerCase()));
    const hasPhotoCol = cols.find(c => ['fotovarmi', 'belgevarmi', 'fotovar', 'belgevar', 'hasphoto', 'hasdocument'].includes(c.toLowerCase()));
    const directPhotoCol = cols.find(c => ['foto', 'resim', 'gorsel', 'belge', 'dosya', 'dosyaicerigi', 'dosyaverisi', 'gorselveri', 'resimveri'].includes(c.toLowerCase()));
    const directNameCol = cols.find(c => ['dosyaadi', 'fotoadi', 'resimadi', 'dosya_adi', 'filename'].includes(c.toLowerCase()));

    const updates: string[] = [];
    const vals: any[] = [];
    let paramIndex = 1;

    if (countCol) {
      updates.push(`"${countCol}" = $${paramIndex++}`);
      vals.push(belgeler.length);
    }
    if (hasPhotoCol) {
      updates.push(`"${hasPhotoCol}" = $${paramIndex++}`);
      vals.push(belgeler.length > 0);
    }
    if (directNameCol) {
      updates.push(`"${directNameCol}" = $${paramIndex++}`);
      vals.push(belgeler.length > 0 ? (belgeler[0].DosyaAdi || belgeler[0].ad || 'belge.png') : null);
    }
    if (directPhotoCol) {
      let isBytea = false;
      try {
        const dtRes = await pool.query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `, [detectedTables.aracBakimlar.replace(/"/g, ''), directPhotoCol]);
        if (dtRes.rows.length > 0 && dtRes.rows[0].data_type === 'bytea') {
          isBytea = true;
        }
      } catch (e) {}

      updates.push(`"${directPhotoCol}" = $${paramIndex++}`);
      const fileContent = belgeler.length > 0 ? (belgeler[0].DosyaVerisi || belgeler[0].DosyaIcerigi || belgeler[0].base64 || '') : '';
      if (isBytea && typeof fileContent === 'string' && fileContent.includes('base64,')) {
        const base64Data = fileContent.split('base64,')[1];
        vals.push(Buffer.from(base64Data, 'base64'));
      } else if (isBytea && typeof fileContent === 'string' && !fileContent.startsWith('data:')) {
        vals.push(Buffer.from(fileContent, 'base64'));
      } else {
        vals.push(fileContent || null);
      }
    }

    if (updates.length > 0) {
      vals.push(bakimId);
      await pool.query(`
        UPDATE ${detectedTables.aracBakimlar}
        SET ${updates.join(', ')}
        WHERE "${idCol}" = $${paramIndex}
      `, vals);
    }
  } catch (err: any) {
    console.error('[DB SYNC ARAC BAKIM ATTACHMENT ERROR]', err.message);
  }
}

async function deleteAracBakimBelgelerFromDb(bakimId: number) {
  if (!detectedTables.aracBakimBelgeler) {
    await syncAracBakimAttachmentState(bakimId, []);
    return;
  }
  try {
    const cols = await getTableColumns(detectedTables.aracBakimBelgeler);
    const idCol = cols.find(c => ['bakimid', 'id', 'bakim_id'].includes(c.toLowerCase())) || 'BakimId';
    await pool.query(`DELETE FROM ${detectedTables.aracBakimBelgeler} WHERE "${idCol}" = $1`, [bakimId]);
    await syncAracBakimAttachmentState(bakimId, []);
  } catch (err: any) {
    console.error('[DB DELETE ARAC BAKIM BELGELER ERROR]', err.message);
  }
}

// Dinamik Makine Bakım Belgeleri Kaydetme ve Silme Yardımcıları
async function saveMakineBakimBelgelerToDb(bakimId: number, belgeler: any[]) {
  if (!detectedTables.makineBakimBelgeler) {
    await syncMakineBakimAttachmentState(bakimId, belgeler);
    return;
  }
  try {
    const cols = await getTableColumns(detectedTables.makineBakimBelgeler);
    const mapCol = (candidates: string[]) => cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));
    const idCol = mapCol(['BakimId', 'bakimid', 'bakim_id', 'id']) || 'BakimId';

    await pool.query(`DELETE FROM ${detectedTables.makineBakimBelgeler} WHERE "${idCol}" = $1`, [bakimId]);

    const isBytea = await isTableColumnBytea(detectedTables.makineBakimBelgeler, [
      'DosyaVerisi', 'dosyaverisi', 'dosya_verisi', 'DosyaVeri', 'dosyaveri',
      'DosyaIcerigi', 'dosyaicerigi', 'dosya_icerigi', 'DosyaIcerik', 'dosyaicerik',
      'Icerik', 'icerik', 'Veri', 'veri', 'Base64', 'base64', 'Content', 'content', 'Data', 'data'
    ]);

    for (const file of belgeler) {
      const rowData = buildDocumentRowData(
        cols,
        idCol,
        bakimId,
        file,
        { BakimId: bakimId },
        isBytea
      );

      const keys = Object.keys(rowData);
      if (keys.length > 0) {
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const query = `
          INSERT INTO ${detectedTables.makineBakimBelgeler} (${keys.map(k => `"${k}"`).join(', ')})
          VALUES (${placeholders})
        `;
        await pool.query(query, keys.map(k => rowData[k]));
      }
    }

    await syncMakineBakimAttachmentState(bakimId, belgeler);
  } catch (err: any) {
    console.error('[DB SAVE MAKINE BAKIM BELGELER ERROR]', err.message);
  }
}

async function syncMakineBakimAttachmentState(bakimId: number, belgeler: any[]) {
  if (!detectedTables.makineBakimlar) return;
  try {
    const cols = await getTableColumns(detectedTables.makineBakimlar);
    const idCol = cols.find(c => ['bakimid', 'id', 'bakim_id'].includes(c.toLowerCase())) || 'BakimId';

    const countCol = cols.find(c => ['fotosayisi', 'belgesayisi', 'fotografsayisi', 'resimsayisi', 'dosyasayisi'].includes(c.toLowerCase()));
    const hasPhotoCol = cols.find(c => ['fotovarmi', 'belgevarmi', 'fotovar', 'belgevar', 'hasphoto', 'hasdocument'].includes(c.toLowerCase()));
    const directPhotoCol = cols.find(c => ['foto', 'resim', 'gorsel', 'belge', 'dosya', 'dosyaicerigi', 'gorselveri', 'resimveri'].includes(c.toLowerCase()));
    const directNameCol = cols.find(c => ['dosyaadi', 'fotoadi', 'resimadi', 'dosya_adi', 'filename'].includes(c.toLowerCase()));

    const updates: string[] = [];
    const vals: any[] = [];
    let paramIndex = 1;

    if (countCol) {
      updates.push(`"${countCol}" = $${paramIndex++}`);
      vals.push(belgeler.length);
    }
    if (hasPhotoCol) {
      updates.push(`"${hasPhotoCol}" = $${paramIndex++}`);
      vals.push(belgeler.length > 0);
    }
    if (directNameCol) {
      updates.push(`"${directNameCol}" = $${paramIndex++}`);
      vals.push(belgeler.length > 0 ? (belgeler[0].DosyaAdi || belgeler[0].ad || 'belge.png') : null);
    }
    if (directPhotoCol) {
      let isBytea = false;
      try {
        const dtRes = await pool.query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `, [detectedTables.makineBakimlar.replace(/"/g, ''), directPhotoCol]);
        if (dtRes.rows.length > 0 && dtRes.rows[0].data_type === 'bytea') {
          isBytea = true;
        }
      } catch (e) {}

      updates.push(`"${directPhotoCol}" = $${paramIndex++}`);
      const fileContent = belgeler.length > 0 ? (belgeler[0].DosyaIcerigi || belgeler[0].base64 || '') : '';
      if (isBytea && typeof fileContent === 'string' && fileContent.includes('base64,')) {
        const base64Data = fileContent.split('base64,')[1];
        vals.push(Buffer.from(base64Data, 'base64'));
      } else if (isBytea && typeof fileContent === 'string' && !fileContent.startsWith('data:')) {
        vals.push(Buffer.from(fileContent, 'base64'));
      } else {
        vals.push(fileContent || null);
      }
    }

    if (updates.length > 0) {
      vals.push(bakimId);
      await pool.query(`
        UPDATE ${detectedTables.makineBakimlar}
        SET ${updates.join(', ')}
        WHERE "${idCol}" = $${paramIndex}
      `, vals);
    }
  } catch (err: any) {
    console.error('[DB SYNC MAKINE BAKIM ATTACHMENT ERROR]', err.message);
  }
}

async function deleteMakineBakimBelgelerFromDb(bakimId: number) {
  if (!detectedTables.makineBakimBelgeler) {
    await syncMakineBakimAttachmentState(bakimId, []);
    return;
  }
  try {
    const cols = await getTableColumns(detectedTables.makineBakimBelgeler);
    const idCol = cols.find(c => ['bakimid', 'id', 'bakim_id'].includes(c.toLowerCase())) || 'BakimId';
    await pool.query(`DELETE FROM ${detectedTables.makineBakimBelgeler} WHERE "${idCol}" = $1`, [bakimId]);
    await syncMakineBakimAttachmentState(bakimId, []);
  } catch (err: any) {
    console.error('[DB DELETE MAKINE BAKIM BELGELER ERROR]', err.message);
  }
}

// Veritabanı canlılık kontrolü ve şema tespiti
async function checkDbConnection() {
  try {
    const client = await pool.connect();
    isDbConnected = true;
    lastDbError = null;

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    client.release();

    const tables: string[] = res.rows.map(r => r.table_name);
    console.log('[DB] PostgreSQL FabrikaYonetimDB bağlandı. Tablolar:', tables);

    const matchTable = (candidates: string[]): string | undefined => {
      for (const cand of candidates) {
        const found = tables.find(t => t.toLowerCase() === cand.toLowerCase());
        if (found) return `"${found}"`;
      }
      return undefined;
    };

    detectedTables = {
      projeler: matchTable(['Projeler', 'projeler']),
      asamalar: matchTable(['ProjeAsamalari', 'proje_asamalari', 'projeasamalari']),
      projeBelgeler: matchTable(['ProjeBelgeleri', 'proje_belgeleri', 'ProjeDosyalari', 'proje_dosyalari', 'ProjeFotograflari', 'proje_fotograflari', 'ProjeResimleri', 'proje_resimleri']),
      projeSablonlar: matchTable(['ProjeAsamaSablonlari', 'proje_asama_sablonlari']),
      araclar: matchTable(['Araclar', 'araclar']),
      aracBakimlar: matchTable(['AracBakimKayitlari', 'arac_bakim_kayitlari', 'BakimKayitlari']),
      makineler: matchTable(['Makineler', 'makineler']),
      makineBakimlar: matchTable(['MakineBakimKayitlari', 'makine_bakim_kayitlari']),
      makineTurleri: matchTable(['MakineTuruTanimlari', 'makine_turu_tanimlari']),
      personeller: matchTable(['Personeller', 'personeller']),
      izinler: matchTable(['IzinKayitlari', 'izin_kayitlari', 'Izinler', 'izinler']),
      izinDonemleri: matchTable(['IzinDonemleri', 'izin_donemleri']),
      izinTurleri: matchTable(['IzinTuruTanimlari', 'izin_turu_tanimlari']),
      resmiTatiller: matchTable(['ResmiTatiller', 'resmi_tatiller']),
      departmanlar: matchTable(['Departmanlar', 'departmanlar']),
      gorevler: matchTable(['Gorevler', 'gorevler']),
      puantajlar: matchTable(['GunlukPuantajlar', 'gunluk_puantajlar']),
      mesaiAyarlari: matchTable(['MesaiAyarlari', 'mesai_ayarlari']),
      kkdZimmetler: matchTable(['PersonelKkdZimmetleri', 'personel_kkd_zimmetleri']),
      saglikRaporlari: matchTable(['PersonelSaglikRaporlari', 'personel_saglik_raporlari']),
      isgEgitimleri: matchTable(['PersonelIsgEgitimleri', 'personel_isg_egitimleri']),
      hatirlaticilar: matchTable(['Hatirlaticilar', 'hatirlaticilar', 'GorevHatirlaticilar']),
      hatirlaticiBelgeler: matchTable([
        'HatirlaticiBelgeleri', 'hatirlatici_belgeleri', 'GorevBelgeleri', 'gorev_belgeleri',
        'GorevBelgesi', 'gorev_belgesi', 'HatirlaticiBelgesi', 'hatirlatici_belgesi',
        'GorevDosyalari', 'gorev_dosyalari', 'HatirlaticiDosyalari', 'hatirlatici_dosyalari',
        'GorevFotograflari', 'gorev_fotograflari', 'HatirlaticiFotograflari',
        'HatirlaticiResimleri', 'hatirlatici_resimleri', 'GorevResimleri', 'gorev_resimleri',
        'Belgeler', 'belgeler', 'Dosyalar', 'dosyalar', 'Fotograflar', 'fotograflar', 'Resimler', 'resimler'
      ]),
      aracBakimBelgeler: matchTable([
        'AracBakimBelgeleri', 'arac_bakim_belgeleri', 'AracBakimDosyalari', 'arac_bakim_dosyalari',
        'AracBakimFotograflari', 'arac_bakim_fotograflari', 'BakimBelgeleri', 'bakim_belgeleri',
        'BakimDosyalari', 'bakim_dosyalari', 'BakimFotograflari', 'bakim_fotograflari'
      ]),
      makineBakimBelgeler: matchTable([
        'MakineBakimBelgeleri', 'makine_bakim_belgeleri', 'MakineBakimDosyalari', 'makine_bakim_dosyalari',
        'MakineBakimFotograflari', 'makine_bakim_fotograflari'
      ]),
      yevmiyeciler: matchTable(['Yevmiyeciler', 'yevmiyeciler', 'DisCalisanlar', 'dis_calisanlar']),
      projePersoneller: matchTable(['ProjePersonelleri', 'proje_personelleri', 'ProjePersoneller', 'proje_personeller', 'ProjeKadrosu', 'proje_kadrosu'])
    };

    if (!detectedTables.projeBelgeler) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "ProjeBelgeleri" (
            "BelgeId" SERIAL PRIMARY KEY,
            "ProjeId" INT NOT NULL,
            "DinamikNumara" VARCHAR(50) NOT NULL,
            "DosyaAdi" VARCHAR(255) NOT NULL,
            "DosyaBoyutu" VARCHAR(50) NOT NULL,
            "YuklemeTarihi" VARCHAR(50) NOT NULL,
            "DosyaIcerigi" TEXT NOT NULL
          )
        `);
        console.log('[DB] "ProjeBelgeleri" tablosu oluşturuldu.');
        detectedTables.projeBelgeler = '"ProjeBelgeleri"';
      } catch (createErr: any) {
        console.error('[DB] "ProjeBelgeleri" tablosu otomatik oluşturulamadı:', createErr.message);
      }
    }

    if (!detectedTables.hatirlaticiBelgeler) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "HatirlaticiBelgeleri" (
            "BelgeId" SERIAL PRIMARY KEY,
            "HatirlaticiId" INT NOT NULL,
            "DosyaAdi" VARCHAR(255) NOT NULL,
            "DosyaBoyutu" VARCHAR(50) NOT NULL,
            "YuklemeTarihi" VARCHAR(50) NOT NULL,
            "DosyaIcerigi" TEXT NOT NULL
          )
        `);
        console.log('[DB] "HatirlaticiBelgeleri" tablosu oluşturuldu.');
        detectedTables.hatirlaticiBelgeler = '"HatirlaticiBelgeleri"';
      } catch (createErr: any) {
        console.error('[DB] "HatirlaticiBelgeleri" tablosu otomatik oluşturulamadı:', createErr.message);
      }
    }

    // Ensure all document tables allow flexible uploads without breaking on NOT NULL constraints
    const docTables = [
      detectedTables.hatirlaticiBelgeler,
      detectedTables.projeBelgeler,
      detectedTables.aracBakimBelgeler,
      detectedTables.makineBakimBelgeler
    ].filter(Boolean);

    for (const tbl of docTables) {
      try {
        const cols = await getTableColumns(tbl!);
        for (const col of cols) {
          const lower = col.toLowerCase();
          if (
            lower !== 'id' &&
            lower !== 'belgeid' &&
            lower !== 'hatirlaticiid' &&
            lower !== 'projeid' &&
            lower !== 'bakimid'
          ) {
            try {
              await pool.query(`ALTER TABLE ${tbl} ALTER COLUMN "${col}" DROP NOT NULL`);
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    if (!detectedTables.aracBakimBelgeler) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "AracBakimBelgeleri" (
            "BelgeId" SERIAL PRIMARY KEY,
            "BakimId" INT NOT NULL,
            "DosyaAdi" VARCHAR(255) NOT NULL,
            "DosyaBoyutu" VARCHAR(50) NOT NULL,
            "YuklemeTarihi" VARCHAR(50) NOT NULL,
            "DosyaIcerigi" TEXT NOT NULL
          )
        `);
        console.log('[DB] "AracBakimBelgeleri" tablosu oluşturuldu.');
        detectedTables.aracBakimBelgeler = '"AracBakimBelgeleri"';
      } catch (createErr: any) {
        console.error('[DB] "AracBakimBelgeleri" tablosu otomatik oluşturulamadı:', createErr.message);
      }
    }

    if (!detectedTables.makineBakimBelgeler) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "MakineBakimBelgeleri" (
            "BelgeId" SERIAL PRIMARY KEY,
            "BakimId" INT NOT NULL,
            "DosyaAdi" VARCHAR(255) NOT NULL,
            "DosyaBoyutu" VARCHAR(50) NOT NULL,
            "YuklemeTarihi" VARCHAR(50) NOT NULL,
            "DosyaIcerigi" TEXT NOT NULL
          )
        `);
        console.log('[DB] "MakineBakimBelgeleri" tablosu oluşturuldu.');
        detectedTables.makineBakimBelgeler = '"MakineBakimBelgeleri"';
      } catch (createErr: any) {
        console.error('[DB] "MakineBakimBelgeleri" tablosu otomatik oluşturulamadı:', createErr.message);
      }
    }

    if (!detectedTables.yevmiyeciler) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "Yevmiyeciler" (
            "YevmiyeciId" SERIAL PRIMARY KEY,
            "AdSoyad" VARCHAR(150) NOT NULL,
            "Telefon" VARCHAR(50),
            "TcKimlikNo" VARCHAR(20),
            "IbanNo" VARCHAR(50),
            "UzmanlikAlani" VARCHAR(100),
            "GunlukYevmiye" NUMERIC(10,2) DEFAULT 0,
            "Durum" VARCHAR(50) DEFAULT 'Musait',
            "AktifProjeId" INT,
            "AktifProjeAdi" VARCHAR(150),
            "Puan" INT DEFAULT 5,
            "Guvenilirlik" VARCHAR(50) DEFAULT 'CokIyi',
            "Fotograf" TEXT,
            "Notlar" TEXT,
            "IkametSehir" VARCHAR(100),
            "KayitTarihi" VARCHAR(50),
            "CalismaGecmisi" TEXT,
            "Belgeler" TEXT
          )
        `);
        console.log('[DB] "Yevmiyeciler" tablosu oluşturuldu.');
        detectedTables.yevmiyeciler = '"Yevmiyeciler"';
      } catch (createErr: any) {
        console.error('[DB] "Yevmiyeciler" tablosu otomatik oluşturulamadı:', createErr.message);
      }
    }

    if (!detectedTables.departmanlar) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "Departmanlar" (
            "Id" SERIAL PRIMARY KEY,
            "Ad" VARCHAR(100) NOT NULL UNIQUE
          )
        `);
        console.log('[DB] "Departmanlar" tablosu oluşturuldu.');
        detectedTables.departmanlar = '"Departmanlar"';
      } catch (createErr: any) {
        console.error('[DB] "Departmanlar" tablosu otomatik oluşturulamadı:', createErr.message);
      }
    }

    if (!detectedTables.gorevler) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "Gorevler" (
            "Id" SERIAL PRIMARY KEY,
            "Ad" VARCHAR(100) NOT NULL UNIQUE
          )
        `);
        console.log('[DB] "Gorevler" tablosu oluşturuldu.');
        detectedTables.gorevler = '"Gorevler"';
      } catch (createErr: any) {
        console.error('[DB] "Gorevler" tablosu otomatik oluşturulamadı:', createErr.message);
      }
    }

    if (!detectedTables.hatirlaticilar) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "Hatirlaticilar" (
            "Id" SERIAL PRIMARY KEY,
            "Baslik" VARCHAR(255) NOT NULL,
            "Aciklama" TEXT,
            "Tarih" VARCHAR(50) NOT NULL,
            "Kategori" VARCHAR(100) DEFAULT 'Gorev',
            "TamamlandiMi" BOOLEAN DEFAULT false,
            "OnemDerecesi" VARCHAR(50) DEFAULT 'Normal',
            "SorumluPersonelId" INT
          )
        `);
        console.log('[DB] "Hatirlaticilar" tablosu oluşturuldu.');
        detectedTables.hatirlaticilar = '"Hatirlaticilar"';
      } catch (createErr: any) {
        console.error('[DB] "Hatirlaticilar" tablosu otomatik oluşturulamadı:', createErr.message);
      }
    } else {
      try {
        const cols = await getTableColumns(detectedTables.hatirlaticilar);
        const hasCol = (name: string) => cols.some(c => c.toLowerCase() === name.toLowerCase());
        if (!hasCol('SorumluPersonelId')) {
          await pool.query(`ALTER TABLE ${detectedTables.hatirlaticilar} ADD COLUMN IF NOT EXISTS "SorumluPersonelId" INT`);
        }
        if (!hasCol('OnemDerecesi') && !hasCol('Oncelik')) {
          await pool.query(`ALTER TABLE ${detectedTables.hatirlaticilar} ADD COLUMN IF NOT EXISTS "OnemDerecesi" VARCHAR(50) DEFAULT 'Normal'`);
        }
        if (!hasCol('TamamlandiMi') && !hasCol('Durum')) {
          await pool.query(`ALTER TABLE ${detectedTables.hatirlaticilar} ADD COLUMN IF NOT EXISTS "TamamlandiMi" BOOLEAN DEFAULT false`);
        }
      } catch (alterErr: any) {
        console.error('[DB HATIRLATICI ALTER COLUMNS ERROR]', alterErr.message);
      }
    }

    if (!detectedTables.saglikRaporlari) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "SaglikRaporlari" (
            "RaporId" SERIAL PRIMARY KEY,
            "PersonelId" INT NOT NULL,
            "MuayeneTuru" VARCHAR(255) DEFAULT 'Periyodik Sağlık Muayenesi',
            "MuayeneTarihi" VARCHAR(50) NOT NULL,
            "GelecekMuayeneTarihi" VARCHAR(50),
            "GecerlilikSuresiAy" INT DEFAULT 12,
            "SaglikKurulusu" VARCHAR(255) DEFAULT 'Yetkili OSGB',
            "Sonuc" VARCHAR(255) DEFAULT 'Çalışmaya Uygundur',
            "RaporNo" VARCHAR(100),
            "Aciklama" TEXT
          )
        `);
        console.log('[DB] "SaglikRaporlari" tablosu oluşturuldu.');
        detectedTables.saglikRaporlari = '"SaglikRaporlari"';
      } catch (createErr: any) {
        console.error('[DB] "SaglikRaporlari" tablosu oluşturulamadı:', createErr.message);
      }
    }

    if (!detectedTables.isgEgitimleri) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "IsgEgitimleri" (
            "EgitimId" SERIAL PRIMARY KEY,
            "PersonelId" INT NOT NULL,
            "EgitimKonusu" VARCHAR(255) DEFAULT 'Temel İSG Eğitimi',
            "EgitimTarihi" VARCHAR(50) NOT NULL,
            "GecerlilikAy" INT DEFAULT 24,
            "SureSaat" INT DEFAULT 12,
            "EgiticiAdSoyad" VARCHAR(255) DEFAULT 'Yetkili OSGB',
            "BelgeNo" VARCHAR(100),
            "Aciklama" TEXT
          )
        `);
        console.log('[DB] "IsgEgitimleri" tablosu oluşturuldu.');
        detectedTables.isgEgitimleri = '"IsgEgitimleri"';
      } catch (createErr: any) {
        console.error('[DB] "IsgEgitimleri" tablosu oluşturulamadı:', createErr.message);
      }
    }

    if (detectedTables.personeller) {
      try {
        const cols = await getTableColumns(detectedTables.personeller);
        const hasCol = (name: string) => cols.some(c => c.toLowerCase() === name.toLowerCase());
        if (!hasCol('IseGirisTarihi') && !hasCol('isegiristarihi')) {
          await pool.query(`ALTER TABLE ${detectedTables.personeller} ADD COLUMN IF NOT EXISTS "IseGirisTarihi" VARCHAR(50)`);
        }
        if (!hasCol('IstenCikisTarihi') && !hasCol('istencikistarihi')) {
          await pool.query(`ALTER TABLE ${detectedTables.personeller} ADD COLUMN IF NOT EXISTS "IstenCikisTarihi" VARCHAR(50)`);
        }
        if (!hasCol('KanGrubu') && !hasCol('kangrubu')) {
          await pool.query(`ALTER TABLE ${detectedTables.personeller} ADD COLUMN IF NOT EXISTS "KanGrubu" VARCHAR(50)`);
        }
        if (!hasCol('TCKimlikNo') && !hasCol('tckimlikno')) {
          await pool.query(`ALTER TABLE ${detectedTables.personeller} ADD COLUMN IF NOT EXISTS "TCKimlikNo" VARCHAR(50)`);
        }
        if (!hasCol('Telefon') && !hasCol('telefon')) {
          await pool.query(`ALTER TABLE ${detectedTables.personeller} ADD COLUMN IF NOT EXISTS "Telefon" VARCHAR(100)`);
        }
        if (!hasCol('Eposta') && !hasCol('eposta')) {
          await pool.query(`ALTER TABLE ${detectedTables.personeller} ADD COLUMN IF NOT EXISTS "Eposta" VARCHAR(255)`);
        }
        if (!hasCol('AcilDurumKisisi') && !hasCol('acildurumkisisi')) {
          await pool.query(`ALTER TABLE ${detectedTables.personeller} ADD COLUMN IF NOT EXISTS "AcilDurumKisisi" VARCHAR(255)`);
        }
        if (!hasCol('AcilDurumTelefonu') && !hasCol('acildurumtelefonu')) {
          await pool.query(`ALTER TABLE ${detectedTables.personeller} ADD COLUMN IF NOT EXISTS "AcilDurumTelefonu" VARCHAR(100)`);
        }
        if (!hasCol('DogumTarihi') && !hasCol('dogumtarihi')) {
          await pool.query(`ALTER TABLE ${detectedTables.personeller} ADD COLUMN IF NOT EXISTS "DogumTarihi" VARCHAR(50)`);
        }
        if (!hasCol('DevredenIzinGunu') && !hasCol('devredenizingunu')) {
          await pool.query(`ALTER TABLE ${detectedTables.personeller} ADD COLUMN IF NOT EXISTS "DevredenIzinGunu" INT DEFAULT 0`);
        }
      } catch (alterErr: any) {
        console.error('[DB PERSONEL ALTER COLUMNS ERROR]', alterErr.message);
      }
    } else {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "Personeller" (
            "PersonelId" SERIAL PRIMARY KEY,
            "TCKimlikNo" VARCHAR(50),
            "AdSoyad" VARCHAR(255) NOT NULL,
            "Telefon" VARCHAR(100),
            "Eposta" VARCHAR(255),
            "KanGrubu" VARCHAR(50) DEFAULT 'Bilinmiyor',
            "AcilDurumKisisi" VARCHAR(255),
            "AcilDurumTelefonu" VARCHAR(100),
            "Departman" VARCHAR(255) DEFAULT 'Genel',
            "Gorev" VARCHAR(255) DEFAULT 'Personel',
            "IseGirisTarihi" VARCHAR(50),
            "IstenCikisTarihi" VARCHAR(50),
            "DogumTarihi" VARCHAR(50) DEFAULT '1990-01-01',
            "DevredenIzinGunu" INT DEFAULT 0,
            "DurumAktifMi" BOOLEAN DEFAULT true
          )
        `);
        console.log('[DB] "Personeller" tablosu oluşturuldu.');
        detectedTables.personeller = '"Personeller"';
      } catch (createErr: any) {
        console.error('[DB] "Personeller" tablosu oluşturulamadı:', createErr.message);
      }
    }

    if (!detectedTables.projePersoneller) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "ProjePersonelleri" (
            "KayitId" VARCHAR(100) PRIMARY KEY,
            "ProjeId" INT NOT NULL,
            "ProjeAdi" VARCHAR(255),
            "PersonelId" INT NOT NULL,
            "AdSoyad" VARCHAR(255),
            "Departman" VARCHAR(255),
            "SirketGorevi" VARCHAR(255),
            "ProjeGorevi" VARCHAR(255),
            "Telefon" VARCHAR(100),
            "BaslangicTarihi" VARCHAR(50),
            "BitisTarihi" VARCHAR(50),
            "AktifMi" BOOLEAN DEFAULT true,
            "Notlar" TEXT
          )
        `);
        console.log('[DB] "ProjePersonelleri" tablosu oluşturuldu.');
        detectedTables.projePersoneller = '"ProjePersonelleri"';
      } catch (createErr: any) {
        console.error('[DB] "ProjePersonelleri" tablosu oluşturulamadı:', createErr.message);
      }
    }

    if (detectedTables.izinler) {
      try {
        const cols = await getTableColumns(detectedTables.izinler);
        const hasCol = (name: string) => cols.some(c => c.toLowerCase() === name.toLowerCase());

        // Ensure non-primary key columns do not have NOT NULL constraint blocking INSERT
        for (const c of cols) {
          const lower = c.toLowerCase();
          if (lower !== 'izinid' && lower !== 'personelid') {
            try {
              await pool.query(`ALTER TABLE ${detectedTables.izinler} ALTER COLUMN "${c}" DROP NOT NULL`);
            } catch (e) {}
          }
        }

        if (!hasCol('PersonelId') && !hasCol('personelid')) {
          await pool.query(`ALTER TABLE ${detectedTables.izinler} ADD COLUMN IF NOT EXISTS "PersonelId" INT`);
        }
        if (!hasCol('IzinTuru') && !hasCol('izinturu')) {
          await pool.query(`ALTER TABLE ${detectedTables.izinler} ADD COLUMN IF NOT EXISTS "IzinTuru" VARCHAR(100) DEFAULT 'Yıllık İzin'`);
        }
        if (!hasCol('BaslangicTarihi') && !hasCol('baslangictarihi')) {
          await pool.query(`ALTER TABLE ${detectedTables.izinler} ADD COLUMN IF NOT EXISTS "BaslangicTarihi" VARCHAR(50)`);
        }
        if (!hasCol('BitisTarihi') && !hasCol('bitistarihi')) {
          await pool.query(`ALTER TABLE ${detectedTables.izinler} ADD COLUMN IF NOT EXISTS "BitisTarihi" VARCHAR(50)`);
        }
        if (!hasCol('IsGunuSayisi') && !hasCol('isgunusayisi')) {
          await pool.query(`ALTER TABLE ${detectedTables.izinler} ADD COLUMN IF NOT EXISTS "IsGunuSayisi" INT DEFAULT 1`);
        }
        if (!hasCol('Durum') && !hasCol('durum')) {
          await pool.query(`ALTER TABLE ${detectedTables.izinler} ADD COLUMN IF NOT EXISTS "Durum" VARCHAR(50) DEFAULT 'Onaylandı'`);
        }
        if (!hasCol('Onaylayan') && !hasCol('onaylayan')) {
          await pool.query(`ALTER TABLE ${detectedTables.izinler} ADD COLUMN IF NOT EXISTS "Onaylayan" VARCHAR(255)`);
        }
        if (!hasCol('Aciklama') && !hasCol('aciklama')) {
          await pool.query(`ALTER TABLE ${detectedTables.izinler} ADD COLUMN IF NOT EXISTS "Aciklama" TEXT`);
        }
        if (!hasCol('SilindiMi') && !hasCol('silindimi')) {
          await pool.query(`ALTER TABLE ${detectedTables.izinler} ADD COLUMN IF NOT EXISTS "SilindiMi" BOOLEAN DEFAULT false`);
        }
        if (!hasCol('SilmeNedeni') && !hasCol('silmenedeni')) {
          await pool.query(`ALTER TABLE ${detectedTables.izinler} ADD COLUMN IF NOT EXISTS "SilmeNedeni" TEXT DEFAULT ''`);
        }
      } catch (alterErr: any) {
        console.error('[DB IZIN ALTER COLUMNS ERROR]', alterErr.message);
      }
    } else {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "IzinKayitlari" (
            "IzinId" SERIAL PRIMARY KEY,
            "PersonelId" INT NOT NULL,
            "IzinTuru" VARCHAR(100) DEFAULT 'Yıllık İzin',
            "BaslangicTarihi" VARCHAR(50),
            "BitisTarihi" VARCHAR(50),
            "IsGunuSayisi" INT DEFAULT 1,
            "Durum" VARCHAR(50) DEFAULT 'Onaylandı',
            "Onaylayan" VARCHAR(255) DEFAULT '',
            "Aciklama" TEXT DEFAULT '',
            "SilindiMi" BOOLEAN DEFAULT false
          )
        `);
        console.log('[DB] "IzinKayitlari" tablosu oluşturuldu.');
        detectedTables.izinler = '"IzinKayitlari"';
      } catch (createErr: any) {
        console.error('[DB] "IzinKayitlari" tablosu oluşturulamadı:', createErr.message);
      }
    }

    if (detectedTables.puantajlar) {
      try {
        const cols = await getTableColumns(detectedTables.puantajlar);
        const hasCol = (name: string) => cols.some(c => c.toLowerCase() === name.toLowerCase());

        // Make all columns other than keys/identity nullable to avoid constraints violating INSERTs
        for (const c of cols) {
          const lower = c.toLowerCase();
          if (lower !== 'puantajid' && lower !== 'id' && lower !== 'personelid' && lower !== 'tarih') {
            try {
              await pool.query(`ALTER TABLE ${detectedTables.puantajlar} ALTER COLUMN "${c}" DROP NOT NULL`);
            } catch (e) {}
          }
        }

        // Add defaults or missing columns
        if (!hasCol('SaatlikIzinUcretli') && !hasCol('saatlikizinucretli')) {
          await pool.query(`ALTER TABLE ${detectedTables.puantajlar} ADD COLUMN IF NOT EXISTS "SaatlikIzinUcretli" NUMERIC DEFAULT 0`);
        }
        if (!hasCol('SaatlikIzinUcretsiz') && !hasCol('saatlikizinucretsiz')) {
          await pool.query(`ALTER TABLE ${detectedTables.puantajlar} ADD COLUMN IF NOT EXISTS "SaatlikIzinUcretsiz" NUMERIC DEFAULT 0`);
        }
      } catch (alterErr: any) {
        console.error('[DB PUANTAJ ALTER COLUMNS ERROR]', alterErr.message);
      }
    } else {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "GunlukPuantajlar" (
            "PuantajId" SERIAL PRIMARY KEY,
            "PersonelId" INT NOT NULL,
            "Tarih" VARCHAR(50) NOT NULL,
            "DurumKodu" VARCHAR(50) DEFAULT 'N',
            "NormalCalismaSaati" NUMERIC DEFAULT 0,
            "FazlaMesaiSaati" NUMERIC DEFAULT 0,
            "HaftaTatiliMesaiSaati" NUMERIC DEFAULT 0,
            "ResmiTatilMesaiSaati" NUMERIC DEFAULT 0,
            "SaatlikKesintiUcretsiz" NUMERIC DEFAULT 0,
            "SaatlikIzinUcretli" NUMERIC DEFAULT 0,
            "SaatlikIzinUcretsiz" NUMERIC DEFAULT 0,
            "Aciklama" TEXT DEFAULT ''
          )
        `);
        console.log('[DB] "GunlukPuantajlar" tablosu oluşturuldu.');
        detectedTables.puantajlar = '"GunlukPuantajlar"';
      } catch (createErr: any) {
        console.error('[DB] "GunlukPuantajlar" tablosu oluşturulamadı:', createErr.message);
      }
    }

    if (detectedTables.makineler) {
      try {
        const cols = await getTableColumns(detectedTables.makineler);
        const hasCol = (name: string) => cols.some(c => c.toLowerCase() === name.toLowerCase());

        // Ensure non-primary key columns do not have NOT NULL constraints
        for (const c of cols) {
          const lower = c.toLowerCase();
          if (lower !== 'makineid' && lower !== 'id' && lower !== 'makinekodu') {
            try {
              await pool.query(`ALTER TABLE ${detectedTables.makineler} ALTER COLUMN "${c}" DROP NOT NULL`);
            } catch (e) {}
          }
        }

        if (!hasCol('Notlar') && !hasCol('notlar')) {
          await pool.query(`ALTER TABLE ${detectedTables.makineler} ADD COLUMN IF NOT EXISTS "Notlar" TEXT DEFAULT ''`);
          console.log('[DB] Makineler tablosuna "Notlar" sütunu eklendi.');
        }
        if (!hasCol('AktifMi') && !hasCol('aktifmi')) {
          await pool.query(`ALTER TABLE ${detectedTables.makineler} ADD COLUMN IF NOT EXISTS "AktifMi" BOOLEAN DEFAULT true`);
          console.log('[DB] Makineler tablosuna "AktifMi" sütunu eklendi.');
        }
      } catch (alterErr: any) {
        console.error('[DB MAKINE ALTER COLUMNS ERROR]', alterErr.message);
      }
    }

    if (detectedTables.araclar) {
      try {
        const cols = await getTableColumns(detectedTables.araclar);
        const hasCol = (name: string) => cols.some(c => c.toLowerCase() === name.toLowerCase());

        // Ensure non-primary key columns do not have NOT NULL constraints
        for (const c of cols) {
          const lower = c.toLowerCase();
          if (lower !== 'aracid' && lower !== 'id') {
            try {
              await pool.query(`ALTER TABLE ${detectedTables.araclar} ALTER COLUMN "${c}" DROP NOT NULL`);
            } catch (e) {}
          }
        }

        if (hasCol('Departman') || hasCol('departman')) {
          const depCol = cols.find(c => c.toLowerCase() === 'departman') || 'Departman';
          try {
            await pool.query(`ALTER TABLE ${detectedTables.araclar} ALTER COLUMN "${depCol}" SET DEFAULT 'Genel'`);
          } catch (e) {}
        }
        if (!hasCol('Notlar') && !hasCol('notlar')) {
          await pool.query(`ALTER TABLE ${detectedTables.araclar} ADD COLUMN IF NOT EXISTS "Notlar" TEXT DEFAULT ''`);
        }
        if (!hasCol('AktifMi') && !hasCol('aktifmi')) {
          await pool.query(`ALTER TABLE ${detectedTables.araclar} ADD COLUMN IF NOT EXISTS "AktifMi" BOOLEAN DEFAULT true`);
        }
      } catch (alterErr: any) {
        console.error('[DB ARAC ALTER COLUMNS ERROR]', alterErr.message);
      }
    } else {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "Araclar" (
            "AracId" SERIAL PRIMARY KEY,
            "PlakaVeyaKod" VARCHAR(100) NOT NULL,
            "AracTipi" VARCHAR(100) DEFAULT 'Otomobil',
            "MarkaModel" VARCHAR(150),
            "ModelYili" INT,
            "SasiSeriNo" VARCHAR(100),
            "ZimmetliKisi" VARCHAR(255),
            "Departman" VARCHAR(100) DEFAULT 'Genel',
            "GuncelKmVeyaSaat" NUMERIC DEFAULT 0,
            "BakimAraligiKmVeyaSaat" NUMERIC DEFAULT 10000,
            "BakimAraligiAy" INT DEFAULT 12,
            "SonBakimTarihi" VARCHAR(50),
            "SonBakimKmVeyaSaat" NUMERIC DEFAULT 0,
            "SaatTakibiMi" BOOLEAN DEFAULT false,
            "MuayeneBitisTarihi" VARCHAR(50),
            "SigortaBitisTarihi" VARCHAR(50),
            "Durum" VARCHAR(50) DEFAULT 'Faal',
            "AktifMi" BOOLEAN DEFAULT true,
            "Notlar" TEXT DEFAULT ''
          )
        `);
        console.log('[DB] "Araclar" tablosu oluşturuldu.');
        detectedTables.araclar = '"Araclar"';
      } catch (createErr: any) {
        console.error('[DB] "Araclar" tablosu oluşturulamadı:', createErr.message);
      }
    }

    if (detectedTables.aracBakimlar) {
      try {
        const cols = await getTableColumns(detectedTables.aracBakimlar);
        for (const c of cols) {
          const lower = c.toLowerCase();
          if (lower !== 'bakimid' && lower !== 'id') {
            try {
              await pool.query(`ALTER TABLE ${detectedTables.aracBakimlar} ALTER COLUMN "${c}" DROP NOT NULL`);
            } catch (e) {}
          }
        }
      } catch (alterErr: any) {
        console.error('[DB ARAC BAKIM ALTER COLUMNS ERROR]', alterErr.message);
      }
    }

    if (!detectedTables.sistemGuvenlik) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "SistemGuvenlik" (
            "Id" INT PRIMARY KEY DEFAULT 1,
            "MasterPassword" VARCHAR(255) DEFAULT 'rende2026',
            "QuickPin" VARCHAR(50) DEFAULT '1234',
            "AutoLockMinutes" INT DEFAULT 15,
            "IsProtectionEnabled" BOOLEAN DEFAULT true
          )
        `);
        console.log('[DB] "SistemGuvenlik" tablosu hazırlandı.');
        detectedTables.sistemGuvenlik = '"SistemGuvenlik"';
      } catch (createErr: any) {
        console.error('[DB] "SistemGuvenlik" tablosu oluşturulamadı:', createErr.message);
      }
    }

    console.log('[DB] Eşleşen Tablolar:', detectedTables);
  } catch (err: any) {
    isDbConnected = false;
    lastDbError = err.message;
    console.log('[DB-INFO] PostgreSQL bağlantı uyarısı:', err.message);
  }
}

checkDbConnection();

// =========================================================================
// =========================================================================
// BELLEK İÇİ YEDEK VERİ MOTORU (Kullanıcı veritabanı yoksa boş liste döner)
// =========================================================================
let memProjeler: any[] = [];
let memAraclar: any[] = [];
let memHatirlaticilar: any[] = [];

let memDepartmanlar: any[] = [
  { Id: 1, Ad: 'Tasarım & Mimarlık' },
  { Id: 2, Ad: 'Üretim & İmalat' },
  { Id: 3, Ad: 'Sevkiyat & Lojistik' },
  { Id: 4, Ad: 'Şantiye & Montaj' },
  { Id: 5, Ad: 'Yönetim & İdari İşler' },
  { Id: 6, Ad: 'Mekanik & Bakım' },
  { Id: 7, Ad: 'Muhasebe & Finans' }
];

let memGorevler: any[] = [
  { Id: 1, Ad: 'İç Mimar' },
  { Id: 2, Ad: 'Endüstriyel Tasarımcı' },
  { Id: 3, Ad: 'Teknik Ressam' },
  { Id: 4, Ad: 'Fabrika Müdürü' },
  { Id: 5, Ad: 'İmalat Şefi' },
  { Id: 6, Ad: 'CNC Operatörü' },
  { Id: 7, Ad: 'Mobilya Montaj Ustası' },
  { Id: 8, Ad: 'Cila & Lake Boya Ustası' },
  { Id: 9, Ad: 'Kenar Bantlama & Ebatlama Ustası' },
  { Id: 10, Ad: 'Döşeme & Kumaş Kaplama Ustası' },
  { Id: 11, Ad: 'Kaynak & Metal Ustası' },
  { Id: 12, Ad: 'Makine Bakım Onarım Ustası' },
  { Id: 13, Ad: 'Zımpara & Hazırlık Elemanı' },
  { Id: 14, Ad: 'Paketleme & Kalite Kontrol Elemanı' },
  { Id: 15, Ad: 'Vasıfsız / Genel İmalat Elemanı' },
  { Id: 16, Ad: 'Şantiye Montaj Şefi' },
  { Id: 17, Ad: 'Montaj Elemanı' },
  { Id: 18, Ad: 'Lojistik & Sevkiyat Şefi' },
  { Id: 19, Cult: 'Forklift Operatörü', Ad: 'Forklift Operatörü' },
  { Id: 20, Ad: 'Depo Sorumlusu' },
  { Id: 21, Ad: 'Şoför / Sevkiyat Elemanı' },
  { Id: 22, Ad: 'Genel Müdür' },
  { Id: 23, Ad: 'İdari İşler Sorumlusu' },
  { Id: 24, Ad: 'İnsan Kaynakları Sorumlusu' },
  { Id: 25, Ad: 'Satın Alma Sorumlusu' },
  { Id: 26, Ad: 'Muhasebe / Finans Sorumlusu' }
];

let memPersoneller: any[] = [];
let memIzinler: any[] = [];
let memMakineler: any[] = [];

let memPuantajlar: any[] = [];
let memMesaiAyarlari: any = {
  Id: 1,
  CalismaRejimi: '5gun',
  MesaiBaslangic: '08:00',
  MesaiBitis: '18:30',
  AraDinlenmeDakika: 90,
  HaftalikCalismaGunu: 5,
  GunlukStandartSaat: 9.0,
  CumartesiStandartSaat: 5.0,
  FazlaMesaiKatsayisi: 1.5,
  TatilMesaiKatsayisi: 2.0
};

let memYevmiyeciler: any[] = [];
let memProjePersoneller: any[] = [];
let memKkdZimmetler: any[] = [];
let memSaglikRaporlari: any[] = [];
let memIsgEgitimleri: any[] = [];

let memProjeSablonlari = [
  { Id: 1, Seviye: 1, SiraNo: 1, AsamaAdi: 'Teklif Hazırlanıyor (Piyasa & Keşif)', TahminiSureGun: 4 },
  { Id: 2, Seviye: 2, SiraNo: 2, AsamaAdi: 'Piyasa Malzeme & Hırdavat Fiyat Araştırması', TahminiSureGun: 2 },
  { Id: 3, Seviye: 2, SiraNo: 3, AsamaAdi: 'İşçilik ve İmalat Süresi Tahmini', TahminiSureGun: 1 },
  { Id: 4, Seviye: 2, SiraNo: 4, AsamaAdi: 'Fiyat Teklifi / Maliyet Tablosu Çıkarılması', TahminiSureGun: 1 },
  { Id: 5, Seviye: 1, SiraNo: 5, AsamaAdi: 'Teklif Verildi (Müşteri Kararı Bekleniyor)', TahminiSureGun: 5 },
  { Id: 6, Seviye: 2, SiraNo: 6, AsamaAdi: 'Teklifin Müşteriye Sunumu & Revizyonlar', TahminiSureGun: 3 },
  { Id: 7, Seviye: 2, SiraNo: 7, AsamaAdi: 'Sözleşme İmzalanması & Avans / Sipariş Onayı', TahminiSureGun: 2 },
  { Id: 8, Seviye: 1, SiraNo: 8, AsamaAdi: 'Üretime Hazırlık & Teknik Çizim', TahminiSureGun: 7 },
  { Id: 9, Seviye: 2, SiraNo: 9, AsamaAdi: 'Yerinde Rölöve Alımı & Lazer Ölçüm', TahminiSureGun: 2 },
  { Id: 10, Seviye: 2, SiraNo: 10, AsamaAdi: 'İmalat Detay Çizimleri & Kesim Optimizasyonu', TahminiSureGun: 3 },
  { Id: 11, Seviye: 2, SiraNo: 11, AsamaAdi: 'MDF, Kaplama, Boya ve Aksesuar Siparişi', TahminiSureGun: 2 },
  { Id: 12, Seviye: 1, SiraNo: 12, AsamaAdi: 'Fabrika İmalat & Üretim Aşaması', TahminiSureGun: 15 },
  { Id: 13, Seviye: 2, SiraNo: 13, AsamaAdi: 'CNC Kesim, Ebatlama & Kenar Bantlama', TahminiSureGun: 5 },
  { Id: 14, Seviye: 2, SiraNo: 14, AsamaAdi: 'Cila / Astar / Lake Boya İşlemleri', TahminiSureGun: 6 },
  { Id: 15, Seviye: 2, SiraNo: 15, AsamaAdi: 'Ön Montaj Çatma & Kalite Kontrol', TahminiSureGun: 4 },
  { Id: 16, Seviye: 1, SiraNo: 16, AsamaAdi: 'Sevkiyat & Şantiye Montajı', TahminiSureGun: 6 },
  { Id: 17, Seviye: 2, SiraNo: 17, AsamaAdi: 'Paketleme & Şantiyeye Nakliye', TahminiSureGun: 1 },
  { Id: 18, Seviye: 2, SiraNo: 18, AsamaAdi: 'Sahada Montaj & İnce Ayarlar', TahminiSureGun: 5 },
  { Id: 19, Seviye: 1, SiraNo: 19, AsamaAdi: 'Kontrol, Rötuş & Teslim Kabul', TahminiSureGun: 3 },
  { Id: 20, Seviye: 2, SiraNo: 20, AsamaAdi: 'Müşteri Kabul Tutanağının İmzalanması', TahminiSureGun: 2 }
];

// Canlı Personelleri Getir
async function getPersonellerList(sadeceAktif = false): Promise<any[]> {
  if (isDbConnected && detectedTables.personeller) {
    try {
      const q = `SELECT * FROM ${detectedTables.personeller} ORDER BY 1 ASC`;
      const res = await pool.query(q);
      let personeller = res.rows.map(normalizePersonel);
      personeller = personeller.filter(p => !p.SilindiMi);
      if (sadeceAktif) {
        personeller = personeller.filter(p => p.DurumAktifMi !== false);
      }
      return personeller;
    } catch (err: any) {
      console.error('[DB PERSONELLER ERROR]', err.message);
    }
  }

  let personeller = memPersoneller.map(normalizePersonel);
  personeller = personeller.filter(p => !p.SilindiMi);
  if (sadeceAktif) {
    personeller = personeller.filter(p => p.DurumAktifMi !== false);
  }
  return personeller;
}

// Canlı Makineleri Getir
async function getMakinelerList(sadeceAktif = false): Promise<any[]> {
  if (isDbConnected && detectedTables.makineler) {
    try {
      const q = `SELECT * FROM ${detectedTables.makineler} ORDER BY 1 ASC`;
      const mRes = await pool.query(q);
      let bakimlarRows: any[] = [];
      if (detectedTables.makineBakimlar) {
        try {
          const bRes = await pool.query(`SELECT * FROM ${detectedTables.makineBakimlar} ORDER BY 1 DESC`);
          bakimlarRows = bRes.rows;
        } catch (e) {}
      }
      let makineBakimBelgelerRows: any[] = [];
      if (detectedTables.makineBakimBelgeler) {
        try {
          const mbbRes = await pool.query(`SELECT * FROM ${detectedTables.makineBakimBelgeler} ORDER BY 1 ASC`);
          makineBakimBelgelerRows = mbbRes.rows;
        } catch (e) {}
      }
      let makineler = mRes.rows.map(row => {
        const makine = normalizeMakine(row);
        makine.BakimGecmisi = bakimlarRows
          .filter(b => Number(getProp(b, 'MakineId', 'makineid')) === makine.MakineId)
          .map(b => {
            const bakim = normalizeMakineBakim(b);
            const bBelgeler = makineBakimBelgelerRows
              .filter((doc: any) => {
                const docBId = Number(getProp(doc, 'BakimId', 'bakimid', 'bakim_id', 'id'));
                return docBId === bakim.BakimId;
              })
              .map((doc: any) => ({
                BelgeId: Number(getProp(doc, 'BelgeId', 'belgeid', 'id')),
                BakimId: Number(getProp(doc, 'BakimId', 'bakimid', 'bakim_id')),
                DosyaAdi: String(getProp(doc, 'DosyaAdi', 'dosyaadi', 'ad', 'filename', 'dosya_adi', 'DosyaAd', 'dosya_ad') || 'belge.png'),
                DosyaBoyutu: String(getProp(doc, 'DosyaBoyutu', 'dosyaboyutu', 'boyut', 'filesize', 'dosya_boyutu') || '0 KB'),
                YuklemeTarihi: String(getProp(doc, 'YuklemeTarihi', 'yuklemetarihi', 'tarih', 'created_at', 'yukleme_tarihi') || ''),
                DosyaIcerigi: parseDatabaseFileContent(getProp(doc, 'DosyaIcerigi', 'dosyaicerigi', 'base64', 'content', 'dosya_icerigi', 'DosyaIcerik', 'resim', 'Resim', 'foto', 'Foto', 'gorsel', 'Gorsel', 'veri', 'Veri', 'data', 'Data'))
              }));

            if (bBelgeler.length === 0 && bakim._directPhoto) {
              bBelgeler.push({
                BelgeId: 0,
                BakimId: bakim.BakimId,
                DosyaAdi: bakim._directPhotoName || 'foto.png',
                DosyaBoyutu: bakim._directPhotoSize || '0 KB',
                YuklemeTarihi: bakim.BakimTarihi || '',
                DosyaIcerigi: bakim._directPhoto
              });
            }

            bakim.Belgeler = bBelgeler;
            bakim.FotoSayisi = bBelgeler.length;
            return bakim;
          });
        return makine;
      });
      if (sadeceAktif) makineler = makineler.filter(m => m.AktifMi);
      return makineler;
    } catch (err: any) {
      console.error('[DB MAKINELER ERROR]', err.message);
    }
  }
  return sadeceAktif ? memMakineler.filter(m => m.AktifMi) : memMakineler;
}

// Canlı İzinleri Getir
async function getIzinlerList(): Promise<any[]> {
  if (isDbConnected && detectedTables.izinler) {
    try {
      const q = `SELECT * FROM ${detectedTables.izinler} WHERE "SilindiMi" = false OR "SilindiMi" IS NULL ORDER BY "BaslangicTarihi" DESC`;
      const res = await pool.query(q);
      return res.rows.map(normalizeIzin);
    } catch (err: any) {
      console.error('[DB IZINLER ERROR]', err.message);
    }
  }
  return memIzinler;
}

// Canlı Puantajları Getir
async function getPuantajlarList(tarihStr?: string): Promise<any[]> {
  if (isDbConnected && detectedTables.puantajlar) {
    try {
      let q = `SELECT * FROM ${detectedTables.puantajlar}`;
      let params: any[] = [];
      if (tarihStr) {
        q += ` WHERE "Tarih"::date = $1::date`;
        params.push(tarihStr);
      }
      q += ` ORDER BY 1 ASC`;
      const res = await pool.query(q, params);
      return res.rows.map(normalizePuantaj);
    } catch (err: any) {
      console.error('[DB PUANTAJLAR ERROR]', err.message);
    }
  }
  return tarihStr ? memPuantajlar.filter(p => p.Tarih === tarihStr) : memPuantajlar;
}

// Canlı İSG Zimmetlerini Getir
async function getKkdZimmetlerList(personelId?: number): Promise<any[]> {
  if (isDbConnected && detectedTables.kkdZimmetler) {
    try {
      let q = `SELECT * FROM ${detectedTables.kkdZimmetler}`;
      let params: any[] = [];
      if (personelId) {
        q += ` WHERE "PersonelId" = $1`;
        params.push(personelId);
      }
      q += ` ORDER BY "VerilisTarihi" DESC`;
      const res = await pool.query(q, params);
      return res.rows.map(normalizeKkdZimmet);
    } catch (err: any) {
      console.error('[DB KKD ERROR]', err.message);
    }
  }
  return personelId ? memKkdZimmetler.filter(z => z.PersonelId === personelId) : memKkdZimmetler;
}

// Canlı Proje Personellerini Getir
async function getProjePersonellerList(): Promise<any[]> {
  if (isDbConnected && detectedTables.projePersoneller) {
    try {
      const q = `SELECT * FROM ${detectedTables.projePersoneller} ORDER BY 1 DESC`;
      const res = await pool.query(q);
      const list = res.rows.map(normalizeProjePersonel).filter(Boolean);
      memProjePersoneller = list;
      return list;
    } catch (err: any) {
      console.error('[DB PROJE PERSONELLER ERROR]', err.message);
    }
  }
  return memProjePersoneller;
}

// Canlı Projeleri Getir (Önce Gerçek DB, Bulunamazsa Bellek)
async function getProjelerList(): Promise<any[]> {
  const allProjePersoneller = await getProjePersonellerList();
  if (isDbConnected && detectedTables.projeler) {
    try {
      const pRes = await pool.query(`SELECT * FROM ${detectedTables.projeler} ORDER BY 1 DESC`);
      let asamalarRows: any[] = [];
      if (detectedTables.asamalar) {
        try {
          const aRes = await pool.query(`SELECT * FROM ${detectedTables.asamalar} ORDER BY 1 ASC`);
          asamalarRows = aRes.rows;
        } catch (err: any) {
          console.log('[DB] Aşamalar tablosu okunamadı:', err.message);
        }
      }

      let belgelerRows: any[] = [];
      if (detectedTables.projeBelgeler) {
        try {
          const bRes = await pool.query(`SELECT * FROM ${detectedTables.projeBelgeler} ORDER BY 1 ASC`);
          belgelerRows = bRes.rows;
        } catch (err: any) {
          console.log('[DB] Belgeler tablosu okunamadı:', err.message);
        }
      }

      return pRes.rows.map(row => {
        const proje: any = normalizeProje(row);
        const relatedAsamalar = asamalarRows
          .filter(a => Number(getProp(a, 'ProjeId', 'projeid')) === proje.ProjeId)
          .map(normalizeAsama);
        
        relatedAsamalar.forEach(asama => {
          asama.Belgeler = belgelerRows
            .filter(b => 
              Number(getProp(b, 'ProjeId', 'projeid')) === proje.ProjeId && 
              (
                (asama.DinamikNumara && String(getProp(b, 'DinamikNumara', 'dinamiknumara', 'asamakodu', 'AsamaKodu')) === asama.DinamikNumara) ||
                (asama.AsamaId && Number(getProp(b, 'AsamaId', 'asamaid', 'ProjeAsamaId', 'projeasamaid')) === asama.AsamaId)
              )
            )
            .map(b => ({
              id: getProp(b, 'BelgeId', 'belgeid', 'id'),
              ad: getProp(b, 'DosyaAdi', 'dosyaadi', 'ad', 'filename', 'dosya_adi', 'DosyaAd', 'dosya_ad') || 'belge.png',
              boyut: getProp(b, 'DosyaBoyutu', 'dosyaboyutu', 'boyut', 'filesize', 'dosya_boyutu', 'DosyaBoyut', 'dosya_boyut') || '0 KB',
              tarih: getProp(b, 'YuklemeTarihi', 'yuklemetarihi', 'tarih', 'created_at', 'yukleme_tarihi') || '',
              base64: extractFileContentFromRow(b)
            }));
        });

        proje.Asamalar = relatedAsamalar;
        proje.Personeller = allProjePersoneller.filter(pp => pp.ProjeId === proje.ProjeId);
        return proje;
      });
    } catch (err: any) {
      console.error('[DB PROJELER ERROR]', err.message);
    }
  }
  return memProjeler.map(p => ({
    ...p,
    Personeller: allProjePersoneller.filter(pp => pp.ProjeId === p.ProjeId)
  }));
}

// Canlı Araçları Getir (Önce Gerçek DB, Bulunamazsa Bellek)
async function getAraclarList(aktifSadece = false): Promise<any[]> {
  if (isDbConnected && detectedTables.araclar) {
    try {
      const aRes = await pool.query(`SELECT * FROM ${detectedTables.araclar} ORDER BY 1 DESC`);
      let bakimlarRows: any[] = [];
      if (detectedTables.aracBakimlar) {
        try {
          const bRes = await pool.query(`SELECT * FROM ${detectedTables.aracBakimlar} ORDER BY 1 DESC`);
          bakimlarRows = bRes.rows;
        } catch (err: any) {
          console.log('[DB] Bakım kayıtları tablosu okunamadı:', err.message);
        }
      }

      let bakimBelgelerRows: any[] = [];
      if (detectedTables.aracBakimBelgeler) {
        try {
          const bbRes = await pool.query(`SELECT * FROM ${detectedTables.aracBakimBelgeler} ORDER BY 1 ASC`);
          bakimBelgelerRows = bbRes.rows;
        } catch (bbErr: any) {
          console.log('[DB] Araç bakım belgeleri okunamadı:', bbErr.message);
        }
      }

      let araclar = aRes.rows.map(row => {
        const arac = normalizeArac(row);
        const relatedBakimlar = bakimlarRows
          .filter(b => Number(getProp(b, 'AracId', 'aracid')) === arac.AracId)
          .map(b => {
            const bakim = normalizeBakim(b);
            const bBelgeler = bakimBelgelerRows
              .filter((doc: any) => {
                const docBId = Number(getProp(doc, 'BakimId', 'bakimid', 'bakim_id', 'id'));
                return docBId === bakim.BakimId;
              })
              .map((doc: any) => ({
                BelgeId: Number(getProp(doc, 'BelgeId', 'belgeid', 'id')),
                BakimId: Number(getProp(doc, 'BakimId', 'bakimid', 'bakim_id')),
                DosyaAdi: String(getProp(doc, 'DosyaAdi', 'dosyaadi', 'ad', 'filename', 'dosya_adi', 'DosyaAd', 'dosya_ad') || 'belge.png'),
                DosyaBoyutu: String(getProp(doc, 'DosyaBoyutu', 'dosyaboyutu', 'boyut', 'filesize', 'dosya_boyutu') || '0 KB'),
                YuklemeTarihi: String(getProp(doc, 'YuklemeTarihi', 'yuklemetarihi', 'tarih', 'created_at', 'yukleme_tarihi') || ''),
                DosyaIcerigi: parseDatabaseFileContent(getProp(doc, 'DosyaIcerigi', 'dosyaicerigi', 'base64', 'content', 'dosya_icerigi', 'DosyaIcerik', 'resim', 'Resim', 'foto', 'Foto', 'gorsel', 'Gorsel', 'veri', 'Veri', 'data', 'Data'))
              }));

            if (bBelgeler.length === 0 && bakim._directPhoto) {
              bBelgeler.push({
                BelgeId: 0,
                BakimId: bakim.BakimId,
                DosyaAdi: bakim._directPhotoName || 'foto.png',
                DosyaBoyutu: bakim._directPhotoSize || '0 KB',
                YuklemeTarihi: bakim.BakimTarihi || '',
                DosyaIcerigi: bakim._directPhoto
              });
            }

            bakim.Belgeler = bBelgeler;
            bakim.FotoSayisi = bBelgeler.length;
            return bakim;
          });
        arac.BakimGecmisi = relatedBakimlar;
        return arac;
      });

      if (aktifSadece) {
        araclar = araclar.filter(a => a.AktifMi);
      }
      return araclar;
    } catch (err: any) {
      console.error('[DB ARACLAR ERROR]', err.message);
    }
  }
  return aktifSadece ? memAraclar.filter(a => a.AktifMi) : memAraclar;
}

// Canlı Hatırlatıcıları Getir
async function getHatirlaticilarList(): Promise<any[]> {
  if (isDbConnected && detectedTables.hatirlaticilar) {
    try {
      const hRes = await pool.query(`SELECT * FROM ${detectedTables.hatirlaticilar} ORDER BY 1 DESC`);
      let hatirlaticilar = hRes.rows.map(normalizeHatirlatici);

      if (detectedTables.hatirlaticiBelgeler) {
        try {
          // 'ORDER BY 1 ASC' avoids errors when 'BelgeId' is spelled differently in different database schemas
          const bRes = await pool.query(`SELECT * FROM ${detectedTables.hatirlaticiBelgeler} ORDER BY 1 ASC`);
          const belgeler = bRes.rows;
          hatirlaticilar = hatirlaticilar.map(h => {
            const hBelgeler = belgeler
              .filter((b: any) => {
                const bHId = Number(getProp(b, 'HatirlaticiId', 'hatirlaticiid', 'gorevid', 'GorevId', 'gorev_id', 'hatirlatici_id'));
                return bHId === h.Id;
              })
              .map((b: any) => ({
                BelgeId: Number(getProp(b, 'BelgeId', 'belgeid', 'id')),
                HatirlaticiId: Number(getProp(b, 'HatirlaticiId', 'hatirlaticiid', 'gorevid', 'GorevId', 'gorev_id', 'hatirlatici_id')),
                DosyaAdi: String(getProp(b, 'DosyaAdi', 'dosyaadi', 'ad', 'filename', 'dosya_adi', 'DosyaAd', 'dosya_ad', 'dosya_adi') || 'foto.png'),
                DosyaBoyutu: String(getProp(b, 'DosyaBoyutu', 'dosyaboyutu', 'boyut', 'filesize', 'dosya_boyutu', 'DosyaBoyut', 'dosya_boyut', 'dosya_boyutu') || '0 KB'),
                YuklemeTarihi: String(getProp(b, 'YuklemeTarihi', 'yuklemetarihi', 'tarih', 'created_at', 'yukleme_tarihi', 'YuklemeTarih', 'yukleme_tarih', 'yukleme_tarihi') || ''),
                DosyaIcerigi: parseDatabaseFileContent(getProp(b, 'DosyaIcerigi', 'dosyaicerigi', 'base64', 'content', 'dosya_icerigi', 'DosyaIcerik', 'dosyaicerik', 'resim', 'Resim', 'dosya_icerigi', 'dosya', 'Dosya', 'foto', 'Foto', 'gorsel', 'Gorsel', 'veri', 'Veri', 'data', 'Data'))
              }));

            // Eğer ilişkili tabloda belge yoksa fakat ana tabloda doğrudan bir görsel alanı bulunmuşsa
            if (hBelgeler.length === 0 && h._directPhoto) {
              hBelgeler.push({
                BelgeId: 0,
                HatirlaticiId: h.Id,
                DosyaAdi: h._directPhotoName || 'foto.png',
                DosyaBoyutu: h._directPhotoSize || '0 KB',
                YuklemeTarihi: h.Tarih || '',
                DosyaIcerigi: h._directPhoto
              });
            }

            return {
              ...h,
              Belgeler: hBelgeler,
              FotoSayisi: hBelgeler.length
            };
          });
        } catch (belgeErr: any) {
          console.error('[DB HATIRLATICI BELGELER QUERY ERROR]', belgeErr.message);
        }
      } else {
        hatirlaticilar = hatirlaticilar.map(h => {
          const hBelgeler = [];
          if (h._directPhoto) {
            hBelgeler.push({
              BelgeId: 0,
              HatirlaticiId: h.Id,
              DosyaAdi: h._directPhotoName || 'foto.png',
              DosyaBoyutu: h._directPhotoSize || '0 KB',
              YuklemeTarihi: h.Tarih || '',
              DosyaIcerigi: h._directPhoto
            });
          }
          return {
            ...h,
            Belgeler: hBelgeler,
            FotoSayisi: hBelgeler.length
          };
        });
      }
      return hatirlaticilar;
    } catch (err: any) {
      console.error('[DB HATIRLATICILAR ERROR]', err.message);
    }
  }

  return memHatirlaticilar.map(h => ({
    ...normalizeHatirlatici(h),
    Belgeler: (h as any).Belgeler || [],
    FotoSayisi: ((h as any).Belgeler || []).length
  }));
}

// =========================================================================
// API ENDPOINTS
// =========================================================================

// 1. Sistem ve DB Durumu
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    databaseConnected: isDbConnected,
    databaseName: process.env.PGDATABASE || 'FabrikaYonetimDB',
    detectedTables,
    lastDbError,
    serverTime: new Date().toISOString(),
  });
});

// Veritabanı Teşhis & Yeniden Bağlanma Testi
app.get('/api/db-status', async (req, res) => {
  let tableCounts: Record<string, any> = {};
  if (isDbConnected) {
    for (const [key, tbl] of Object.entries(detectedTables)) {
      if (tbl) {
        try {
          const countRes = await pool.query(`SELECT COUNT(*) FROM ${tbl}`);
          tableCounts[key] = parseInt(countRes.rows[0].count);
        } catch (e: any) {
          tableCounts[key] = 'Okunamadı: ' + e.message;
        }
      }
    }
  }

  res.json({
    connected: isDbConnected,
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE || 'FabrikaYonetimDB',
    user: process.env.PGUSER || 'postgres',
    detectedTables,
    tableCounts,
    lastDbError
  });
});

app.post('/api/db-reconnect', async (req, res) => {
  await checkDbConnection();
  let tableCounts: Record<string, any> = {};
  if (isDbConnected) {
    for (const [key, tbl] of Object.entries(detectedTables)) {
      if (tbl) {
        try {
          const countRes = await pool.query(`SELECT COUNT(*) FROM ${tbl}`);
          tableCounts[key] = parseInt(countRes.rows[0].count);
        } catch (e: any) {
          tableCounts[key] = 'Okunamadı: ' + e.message;
        }
      }
    }
  }
  res.json({
    connected: isDbConnected,
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE || 'FabrikaYonetimDB',
    user: process.env.PGUSER || 'postgres',
    detectedTables,
    tableCounts,
    lastDbError
  });
});

// Canlı PostgreSQL Bağlantı Yapılandırması (Kullanıcının kendi canlı veritabanına bağlanmasını sağlar)
app.post('/api/db-config', async (req, res) => {
  try {
    const { connectionString, host, port, database, user, password, ssl } = req.body;
    
    if (connectionString && String(connectionString).trim()) {
      process.env.DATABASE_URL = String(connectionString).replace(/[{}]/g, '').trim();
    } else {
      delete process.env.DATABASE_URL;
      if (host) process.env.PGHOST = String(host).replace(/[{}]/g, '').trim();
      if (port) process.env.PGPORT = String(port).replace(/[{}]/g, '').trim();
      if (database) process.env.PGDATABASE = String(database).replace(/[{}]/g, '').trim();
      if (user) process.env.PGUSER = String(user).replace(/[{}]/g, '').trim();
      if (password !== undefined) process.env.PGPASSWORD = String(password).replace(/[{}]/g, '').trim();
      if (ssl !== undefined) process.env.PGSSL = String(ssl);
    }

    try {
      await pool.end();
    } catch (_) {}

    pool = createPgPool();
    pool.on('error', (err) => {
      console.error('[DB-POOL ERROR]', err.message);
    });

    await checkDbConnection();

    let tableCounts: Record<string, any> = {};
    if (isDbConnected) {
      for (const [key, tbl] of Object.entries(detectedTables)) {
        if (tbl) {
          try {
            const countRes = await pool.query(`SELECT COUNT(*) FROM ${tbl}`);
            tableCounts[key] = parseInt(countRes.rows[0].count);
          } catch (e: any) {
            tableCounts[key] = 'Okunamadı: ' + e.message;
          }
        }
      }
    }

    res.json({
      success: isDbConnected,
      connected: isDbConnected,
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT || 5432,
      database: process.env.PGDATABASE || 'FabrikaYonetimDB',
      user: process.env.PGUSER || 'postgres',
      detectedTables,
      tableCounts,
      lastDbError
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, connected: false });
  }
});

// Sunucu saat ve tarih bilgisi (Timezone senkronizasyonu için)
app.get('/api/server-time', (req, res) => {
  const now = new Date();
  const trTarih = getBugunStr();
  res.json({
    iso: now.toISOString(),
    localYmd: trTarih,
    timeZone: 'Europe/Istanbul',
    epoch: now.getTime()
  });
});

async function getSaglikRaporlariList() {
  if (isDbConnected && detectedTables.saglikRaporlari) {
    try {
      const resR = await pool.query(`SELECT * FROM ${detectedTables.saglikRaporlari} ORDER BY 1 DESC`);
      return resR.rows.map(normalizeSaglikRaporu);
    } catch (e: any) {
      console.error('[DB GET SAGLIK ERROR]', e.message);
    }
  }
  return memSaglikRaporlari.map(normalizeSaglikRaporu);
}

async function getIsgEgitimleriList() {
  if (isDbConnected && detectedTables.isgEgitimleri) {
    try {
      const resE = await pool.query(`SELECT * FROM ${detectedTables.isgEgitimleri} ORDER BY 1 DESC`);
      return resE.rows.map(normalizeIsgEgitim);
    } catch (e: any) {
      console.error('[DB GET ISG EGITIM ERROR]', e.message);
    }
  }
  return memIsgEgitimleri.map(normalizeIsgEgitim);
}

// 2. Canlı Dashboard Özeti (Gerçek veritabanından dinamik hesaplanır)
app.get('/api/ozet', async (req, res) => {
  try {
    const bugunStr = getBugunStr();
    const [projeler, araclar, makineler, hatirlaticilar, personeller, izinler, saglikRaporlari, egitimler] = await Promise.all([
      getProjelerList(),
      getAraclarList(),
      getMakinelerList(),
      getHatirlaticilarList(),
      getPersonellerList(),
      getIzinlerList(),
      getSaglikRaporlariList(),
      getIsgEgitimleriList()
    ]);

    const bakimUyarilari: any[] = [];
    const isgUyarilari: any[] = [];
    let saglikRaporuEksikSayisi = 0;

    // Aktif personellerin İSG & Sağlık Raporu Uyarıları
    const aktifPersoneller = personeller.filter(p => p.DurumAktifMi !== false && !p.SilindiMi);
    aktifPersoneller.forEach(p => {
      const pid = Number(p.PersonelId);
      const adSoyadNorm = (p.AdSoyad || '').toLowerCase().trim();

      // 1) Sağlık Raporu Kontrolü
      const pRaporlar = saglikRaporlari
        .filter(r => {
          const rPid = Number(r.PersonelId);
          if (rPid && pid && rPid === pid) return true;
          if (r.PersonelAdSoyad && adSoyadNorm && String(r.PersonelAdSoyad).toLowerCase().trim() === adSoyadNorm) return true;
          return false;
        })
        .sort((a, b) => (b.MuayeneTarihi || '').localeCompare(a.MuayeneTarihi || ''));

      if (pRaporlar.length === 0) {
        saglikRaporuEksikSayisi++;
        isgUyarilari.push({
          id: `saglik-eksik-${pid || adSoyadNorm}`,
          tur: 'saglik_eksik',
          personelAdSoyad: p.AdSoyad,
          personelId: pid || 0,
          baslik: 'Zorunlu Sağlık Raporu Eksik!',
          mesaj: `${p.AdSoyad} - 6331 İSG Kanunu gereği zorunlu sağlık muayene raporu bulunmuyor.`,
          durum: 'Kritik'
        });
      } else {
        const enSonRapor = pRaporlar[0];
        const gelecekTarih = enSonRapor.GelecekMuayeneTarihi || tarihAyEkle(enSonRapor.MuayeneTarihi, enSonRapor.GecerlilikSuresiAy || 12);
        const kalan = tarihFarkiGun(bugunStr, gelecekTarih);
        if (kalan < 0) {
          saglikRaporuEksikSayisi++;
          isgUyarilari.push({
            id: `saglik-suresi-${pid || adSoyadNorm}`,
            tur: 'saglik_suresi',
            personelAdSoyad: p.AdSoyad,
            personelId: pid || 0,
            baslik: 'Sağlık Raporu Süresi Doldu!',
            mesaj: `${p.AdSoyad} - Periyodik sağlık muayene geçerliliği ${Math.abs(kalan)} gün önce doldu! (${enSonRapor.MuayeneTarihi || 'Tarih Belirsiz'})`,
            kalanGun: kalan,
            durum: 'Kritik'
          });
        } else if (kalan <= 30) {
          isgUyarilari.push({
            id: `saglik-suresi-${pid || adSoyadNorm}`,
            tur: 'saglik_suresi',
            personelAdSoyad: p.AdSoyad,
            personelId: pid || 0,
            baslik: 'Sağlık Muayene Yenilemesi Yaklaşıyor',
            mesaj: `${p.AdSoyad} - Periyodik sağlık muayene yenilemesine ${kalan} gün kaldı.`,
            kalanGun: kalan,
            durum: 'Uyari'
          });
        }
      }

      // 2) İSG Eğitim Kontrolü
      const pEgitimler = egitimler
        .filter(e => {
          const ePid = Number(e.PersonelId);
          if (ePid && pid && ePid === pid) return true;
          if (e.PersonelAdSoyad && adSoyadNorm && String(e.PersonelAdSoyad).toLowerCase().trim() === adSoyadNorm) return true;
          return false;
        })
        .sort((a, b) => (b.EgitimTarihi || '').localeCompare(a.EgitimTarihi || ''));

      if (pEgitimler.length === 0) {
        isgUyarilari.push({
          id: `egitim-eksik-${pid || adSoyadNorm}`,
          tur: 'egitim_eksik',
          personelAdSoyad: p.AdSoyad,
          personelId: pid || 0,
          baslik: 'Zorunlu İSG Eğitimi Eksik!',
          mesaj: `${p.AdSoyad} - 6331 İSG Kanunu gereği zorunlu Temel İSG Eğitimi kaydı bulunmuyor.`,
          durum: 'Kritik'
        });
      } else {
        const enSonEgitim = pEgitimler[0];
        const gelecekEgitimTarihi = tarihAyEkle(enSonEgitim.EgitimTarihi, enSonEgitim.GecerlilikAy || (enSonEgitim.GecerlilikYil || 2) * 12);
        const kalanEgitimGun = tarihFarkiGun(bugunStr, gelecekEgitimTarihi);
        if (kalanEgitimGun < 0) {
          isgUyarilari.push({
            id: `egitim-suresi-${pid || adSoyadNorm}-${enSonEgitim.EgitimId}`,
            tur: 'egitim_suresi',
            personelAdSoyad: p.AdSoyad,
            personelId: pid || 0,
            baslik: 'İSG Eğitim Sertifikası Süresi Doldu!',
            mesaj: `${p.AdSoyad} - '${enSonEgitim.EgitimKonusu || enSonEgitim.EgitimAdi}' eğitim geçerliliği ${Math.abs(kalanEgitimGun)} gün önce doldu!`,
            kalanGun: kalanEgitimGun,
            durum: 'Kritik'
          });
        } else if (kalanEgitimGun <= 30) {
          isgUyarilari.push({
            id: `egitim-suresi-${pid || adSoyadNorm}-${enSonEgitim.EgitimId}`,
            tur: 'egitim_suresi',
            personelAdSoyad: p.AdSoyad,
            personelId: pid || 0,
            baslik: 'İSG Eğitim Yenilemesi Yaklaşıyor',
            mesaj: `${p.AdSoyad} - '${enSonEgitim.EgitimKonusu || enSonEgitim.EgitimAdi}' eğitim yenilemesine ${kalanEgitimGun} gün kaldı.`,
            kalanGun: kalanEgitimGun,
            durum: 'Uyari'
          });
        }
      }
    });

    // Araç Bakım Uyarıları
    araclar.filter(a => a.AktifMi).forEach(a => {
      const kalanSayac = (a.SonBakimKmVeyaSaat + a.BakimAraligiKmVeyaSaat) - a.GuncelKmVeyaSaat;
      const birim = a.SaatTakibiMi ? 'saat' : 'km';

      if (kalanSayac <= 0) {
        bakimUyarilari.push({
          id: `arac-${a.AracId}`,
          tur: 'arac',
          ad: `${a.PlakaVeyaKod} (${a.MarkaModel})`,
          kod: a.PlakaVeyaKod,
          durum: 'Gecikmis',
          mesaj: `Bakım süresi ${Math.abs(kalanSayac)} ${birim} geçti!`,
          kalanBirim: kalanSayac,
          birim
        });
      } else if (kalanSayac <= (a.SaatTakibiMi ? 50 : 1000)) {
        bakimUyarilari.push({
          id: `arac-${a.AracId}`,
          tur: 'arac',
          ad: `${a.PlakaVeyaKod} (${a.MarkaModel})`,
          kod: a.PlakaVeyaKod,
          durum: 'Yaklasiyor',
          mesaj: `Bakıma ${kalanSayac} ${birim} kaldı`,
          kalanBirim: kalanSayac,
          birim
        });
      }
    });

    // Makine Bakım Uyarıları
    makineler.filter(m => m.AktifMi).forEach(m => {
      const hedefSaat = m.SonBakimSaati + m.BakimAraligiSaat;
      const kalanSaat = hedefSaat - m.GuncelCalismaSaati;
      if (kalanSaat <= 0) {
        bakimUyarilari.push({
          id: `makine-${m.MakineId}`,
          tur: 'makine',
          ad: `${m.MakineAdi} (${m.KonumBolum || 'Fabrika'})`,
          kod: m.MakineKodu,
          durum: 'Gecikmis',
          mesaj: `ACİL BAKIM: ${Math.abs(kalanSaat)} saat geçti!`,
          kalanBirim: kalanSaat,
          birim: 'saat'
        });
      } else if (kalanSaat <= 25) {
        bakimUyarilari.push({
          id: `makine-${m.MakineId}`,
          tur: 'makine',
          ad: `${m.MakineAdi} (${m.KonumBolum || 'Fabrika'})`,
          kod: m.MakineKodu,
          durum: 'Yaklasiyor',
          mesaj: `Bakıma ${kalanSaat} saat kaldı`,
          kalanBirim: kalanSaat,
          birim: 'saat'
        });
      }
    });

    const izindekiAdet = izinler.filter(iz => {
      return iz.BaslangicTarihi <= bugunStr && 
             iz.BitisTarihi >= bugunStr && 
             iz.Durum === 'Onaylandı' &&
             !iz.SilindiMi;
    }).length;

    const besGunOnceStr = getGunOnceStr(5);
    const besGunSonraStr = getGunSonraStr(5);

    // Filtrele:
    // 1) Tamamlanmamış TÜM görevler (geçmiş, bugün, gelecek 5 gün veya daha ileri)
    // 2) Tamamlanmış olsa bile bugün, geçmiş (son 5 gün) ve önümüzdeki 5 gün içerisindeki görevler
    const hedeflenmisHatirlaticilar = hatirlaticilar.filter(h => {
      if (!h.Tarih) return true;
      if (!h.TamamlandiMi) return true;
      if (h.Tarih <= besGunSonraStr && h.Tarih >= besGunOnceStr) return true;
      return false;
    });

    const gorevListesiFormatted = hedeflenmisHatirlaticilar.map(h => {
      let etiket: 'BUGÜN' | 'GEÇİKMİŞ' | 'SON 5 GÜN' | 'GELECEK 5 GÜN' | 'GELECEK' = 'GELECEK';
      if (h.Tarih === bugunStr) {
        etiket = 'BUGÜN';
      } else if (h.Tarih < bugunStr) {
        etiket = h.TamamlandiMi ? 'SON 5 GÜN' : 'GEÇİKMİŞ';
      } else if (h.Tarih <= besGunSonraStr) {
        etiket = 'GELECEK 5 GÜN';
      } else {
        etiket = 'GELECEK';
      }

      return {
        id: h.Id,
        baslik: h.Baslik,
        tarih: h.Tarih,
        kategori: h.Kategori,
        onemDerecesi: h.OnemDerecesi || 'Normal',
        tamamlandiMi: Boolean(h.TamamlandiMi),
        etiket
      };
    }).sort((a, b) => {
      const etiketSira = { 'GEÇİKMİŞ': 1, 'BUGÜN': 2, 'GELECEK 5 GÜN': 3, 'SON 5 GÜN': 4, 'GELECEK': 5 };
      if (etiketSira[a.etiket] !== etiketSira[b.etiket]) {
        return etiketSira[a.etiket] - etiketSira[b.etiket];
      }
      return a.tarih.localeCompare(b.tarih);
    });

    const bugunGorevlerList = gorevListesiFormatted.map(g => g.baslik);

    const ozet = {
      toplamProje: projeler.length,
      aktifProje: projeler.filter(p => p.AktifMi && p.Durum !== 'Tamamlandı').length,
      tamamlananProje: projeler.filter(p => p.Durum === 'Tamamlandı').length,
      toplamArac: araclar.length,
      aktifArac: araclar.filter(a => a.AktifMi).length,
      bakimBekleyenArac: bakimUyarilari.filter(b => b.tur === 'arac').length,
      toplamMakine: makineler.length,
      aktifMakine: makineler.filter(m => m.AktifMi).length,
      bakimBekleyenMakine: bakimUyarilari.filter(b => b.tur === 'makine').length,
      toplamPersonel: personeller.length,
      aktifPersonel: personeller.filter(p => p.DurumAktifMi).length,
      izindekiPersonel: izindekiAdet,
      bugunIzinliPersonel: izindekiAdet,
      zimmetsizPersonel: 0,
      saglikRaporuEksikSayisi,
      isgUyarisiSayisi: isgUyarilari.length,
      bugunBitenGorevler: hatirlaticilar.filter(h => h.Tarih === bugunStr && !h.TamamlandiMi).length,
      yaklasanGorevler: hatirlaticilar.filter(h => h.Tarih > bugunStr && !h.TamamlandiMi).length,
      bugunGorevListesi: bugunGorevlerList,
      gorevListesi: gorevListesiFormatted,
      bakimUyarilari,
      isgUyarilari
    };

    res.json(ozet);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Projeler CRUD
app.get('/api/projeler', async (req, res) => {
  try {
    const list = await getProjelerList();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projeler/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const projeler = await getProjelerList();
  const proje = projeler.find(p => p.ProjeId === id);
  if (!proje) return res.status(404).json({ error: 'Proje bulunamadı' });
  res.json(proje);
});

app.post('/api/projeler', async (req, res) => {
  try {
    const yeniProje = {
      ProjeId: Date.now(),
      ProjeKodu: req.body.ProjeKodu || `PRJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      ProjeAdi: req.body.ProjeAdi || 'Yeni Proje',
      MusteriFirma: req.body.MusteriFirma || '',
      SantiyeAdresi: req.body.SantiyeAdresi || '',
      SorumluKisi: req.body.SorumluKisi || '',
      BaslangicTarihi: formatDate(req.body.BaslangicTarihi) || getBugunStr(),
      Deadline: req.body.Deadline || null,
      Durum: req.body.Durum || 'Teklif Verildi',
      GenelIlerlemeYuzdesi: req.body.GenelIlerlemeYuzdesi || 0,
      AktifMi: true,
      KilitliMi: req.body.KilitliMi || false,
      Asamalar: req.body.Asamalar || []
    };

    if (isDbConnected && detectedTables.projeler) {
      try {
        const inserted = await saveProjeToDb(null, yeniProje, true);
        if (inserted) {
          if (detectedTables.asamalar && yeniProje.Asamalar && yeniProje.Asamalar.length > 0) {
            try {
              await saveProjeAsamalarToDb(inserted.ProjeId, yeniProje.Asamalar);

              // Fetch newly inserted stages back
              const asamaCols = await getTableColumns(detectedTables.asamalar);
              const asamaProjIdCol = asamaCols.find(c => ['projeid', 'ProjeId'].includes(c.toLowerCase())) || 'ProjeId';
              const aRes = await pool.query(`SELECT * FROM ${detectedTables.asamalar} WHERE "${asamaProjIdCol}" = $1 ORDER BY 1 ASC`, [inserted.ProjeId]);
              inserted.Asamalar = aRes.rows.map(normalizeAsama);

              // Attach documents back
              if (detectedTables.projeBelgeler) {
                const belgeCols = await getTableColumns(detectedTables.projeBelgeler);
                const belgeProjIdCol = belgeCols.find(c => ['projeid', 'ProjeId'].includes(c.toLowerCase())) || 'ProjeId';
                const bRes = await pool.query(`SELECT * FROM ${detectedTables.projeBelgeler} WHERE "${belgeProjIdCol}" = $1 ORDER BY 1 ASC`, [inserted.ProjeId]);
                inserted.Asamalar.forEach((asama: any) => {
                  asama.Belgeler = bRes.rows
                    .filter(b => 
                      (asama.DinamikNumara && String(getProp(b, 'DinamikNumara', 'dinamiknumara', 'asamakodu', 'AsamaKodu')) === asama.DinamikNumara) ||
                      (asama.AsamaId && Number(getProp(b, 'AsamaId', 'asamaid', 'ProjeAsamaId', 'projeasamaid')) === asama.AsamaId)
                    )
                    .map(b => ({
                      id: getProp(b, 'BelgeId', 'belgeid', 'id'),
                      ad: getProp(b, 'DosyaAdi', 'dosyaadi', 'ad', 'filename', 'dosya_adi', 'DosyaAd', 'dosya_ad') || 'belge.png',
                      boyut: getProp(b, 'DosyaBoyutu', 'dosyaboyutu', 'boyut', 'filesize', 'dosya_boyutu', 'DosyaBoyut', 'dosya_boyut') || '0 KB',
                      tarih: getProp(b, 'YuklemeTarihi', 'yuklemetarihi', 'tarih', 'created_at', 'yukleme_tarihi') || '',
                      base64: extractFileContentFromRow(b)
                    }));
                });
              }
            } catch (asamaErr: any) {
              console.error('[DB INSERT ASAMALAR ERROR]', asamaErr.message);
            }
          }
          
          return res.status(201).json(inserted);
        }
      } catch (err: any) {
        console.error('[DB INSERT PROJE ERROR]', err.message);
      }
    }

    memProjeler.unshift(yeniProje);
    res.status(201).json(yeniProje);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projeler/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isDbConnected && detectedTables.projeler) {
    try {
      const updatedProje = await saveProjeToDb(id, req.body, false);
      if (updatedProje) {
        
        if (detectedTables.asamalar && req.body.Asamalar && Array.isArray(req.body.Asamalar)) {
          try {
            await saveProjeAsamalarToDb(id, req.body.Asamalar);

            // Güncel aşamaları çekip projeye ekliyoruz
            const asamaCols = await getTableColumns(detectedTables.asamalar);
            const asamaProjIdCol = asamaCols.find(c => ['projeid', 'ProjeId'].includes(c.toLowerCase())) || 'ProjeId';
            const aRes = await pool.query(`SELECT * FROM ${detectedTables.asamalar} WHERE "${asamaProjIdCol}" = $1 ORDER BY 1 ASC`, [id]);
            updatedProje.Asamalar = aRes.rows.map(normalizeAsama);

            if (detectedTables.projeBelgeler) {
              const belgeCols = await getTableColumns(detectedTables.projeBelgeler);
              const belgeProjIdCol = belgeCols.find(c => ['projeid', 'ProjeId'].includes(c.toLowerCase())) || 'ProjeId';
              const bRes = await pool.query(`SELECT * FROM ${detectedTables.projeBelgeler} WHERE "${belgeProjIdCol}" = $1 ORDER BY 1 ASC`, [id]);
              updatedProje.Asamalar.forEach((asama: any) => {
                asama.Belgeler = bRes.rows
                  .filter(b => 
                    (asama.DinamikNumara && String(getProp(b, 'DinamikNumara', 'dinamiknumara', 'asamakodu', 'AsamaKodu')) === asama.DinamikNumara) ||
                    (asama.AsamaId && Number(getProp(b, 'AsamaId', 'asamaid', 'ProjeAsamaId', 'projeasamaid')) === asama.AsamaId)
                  )
                  .map(b => ({
                    id: getProp(b, 'BelgeId', 'belgeid', 'id'),
                    ad: getProp(b, 'DosyaAdi', 'dosyaadi', 'ad', 'filename', 'dosya_adi', 'DosyaAd', 'dosya_ad') || 'belge.png',
                    boyut: getProp(b, 'DosyaBoyutu', 'dosyaboyutu', 'boyut', 'filesize', 'dosya_boyutu', 'DosyaBoyut', 'dosya_boyut') || '0 KB',
                    tarih: getProp(b, 'YuklemeTarihi', 'yuklemetarihi', 'tarih', 'created_at', 'yukleme_tarihi') || '',
                    base64: extractFileContentFromRow(b)
                  }));
              });
            }
          } catch (asamaErr: any) {
            console.error('[DB PUT SYNC ASAMALAR ERROR]', asamaErr.message);
          }
        }
        
        return res.json(updatedProje);
      }
    } catch (err: any) {
      console.error('[DB UPDATE PROJE ERROR]', err.message);
    }
  }

  const index = memProjeler.findIndex(p => p.ProjeId === id);
  if (index !== -1) {
    const bodyProje = { ...req.body };
    if (bodyProje.Asamalar && Array.isArray(bodyProje.Asamalar)) {
      // Find current max AsamaId across all projects
      let maxAsamaId = 0;
      memProjeler.forEach(p => {
        if (p.Asamalar && Array.isArray(p.Asamalar)) {
          p.Asamalar.forEach(a => {
            const aid = Number(a.AsamaId);
            if (aid > maxAsamaId) maxAsamaId = aid;
          });
        }
      });
      if (maxAsamaId < 100) maxAsamaId = 100;

      const idMap = new Map<number, number>();

      // Update negative AsamaId to positive, sequential IDs
      bodyProje.Asamalar = bodyProje.Asamalar.map((asama: any) => {
        let resolvedAsamaId = asama.AsamaId;
        if (asama.AsamaId < 0) {
          maxAsamaId++;
          idMap.set(asama.AsamaId, maxAsamaId);
          resolvedAsamaId = maxAsamaId;
        }

        let resolvedUstId = asama.UstAsamaId || null;
        if (resolvedUstId && resolvedUstId < 0) {
          if (idMap.has(resolvedUstId)) {
            resolvedUstId = idMap.get(resolvedUstId);
          } else {
            resolvedUstId = null;
          }
        }

        return {
          ...asama,
          AsamaId: resolvedAsamaId,
          UstAsamaId: resolvedUstId
        };
      });
    }

    memProjeler[index] = { ...memProjeler[index], ...bodyProje };
    return res.json(memProjeler[index]);
  }
  res.status(404).json({ error: 'Proje bulunamadı' });
});

app.delete('/api/projeler/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isDbConnected && detectedTables.projeler) {
    try {
      const cols = await getTableColumns(detectedTables.projeler);
      const idCol = cols.find(c => ['projeid', 'id', 'ProjeId'].includes(c.toLowerCase())) || 'ProjeId';
      await pool.query(`DELETE FROM ${detectedTables.projeler} WHERE "${idCol}" = $1`, [id]);
    } catch (err: any) {
      console.error('[DB DELETE PROJE ERROR]', err.message);
    }
  }
  memProjeler = memProjeler.filter(p => p.ProjeId !== id);
  res.json({ success: true });
});

// Proje Personel Kadrosu Endpoints
app.get('/api/proje-personeller', async (req, res) => {
  try {
    const list = await getProjePersonellerList();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projeler/:id/personeller', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const all = await getProjePersonellerList();
    const list = all.filter(p => p.ProjeId === id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projeler/:id/personel-ata', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { KayitId, PersonelId, AdSoyad, Departman, SirketGorevi, ProjeGorevi, Telefon, BaslangicTarihi, Notlar, ProjeAdi } = req.body;
    const kayitIdStr = KayitId || `PRJ-PER-${Date.now()}`;
    const pGorev = ProjeGorevi || 'Saha Görevlisi';
    const bTarih = BaslangicTarihi || new Date().toISOString().split('T')[0];

    if (isDbConnected && detectedTables.projePersoneller) {
      try {
        const selQ = `SELECT * FROM ${detectedTables.projePersoneller} WHERE "ProjeId" = $1 AND "PersonelId" = $2 AND ("AktifMi" = true OR "AktifMi"::text = 'true')`;
        const selRes = await pool.query(selQ, [id, Number(PersonelId)]);

        if (selRes.rows.length > 0) {
          const existKayitId = selRes.rows[0].KayitId || kayitIdStr;
          const upQ = `
            UPDATE ${detectedTables.projePersoneller}
            SET "ProjeGorevi" = $1, "Departman" = $2, "SirketGorevi" = $3, "Telefon" = $4, "BaslangicTarihi" = $5, "Notlar" = $6, "AktifMi" = true, "ProjeAdi" = $7
            WHERE "KayitId" = $8
          `;
          await pool.query(upQ, [pGorev, Departman || '', SirketGorevi || '', Telefon || '', bTarih, Notlar || '', ProjeAdi || '', existKayitId]);
        } else {
          const insQ = `
            INSERT INTO ${detectedTables.projePersoneller}
            ("KayitId", "ProjeId", "ProjeAdi", "PersonelId", "AdSoyad", "Departman", "SirketGorevi", "ProjeGorevi", "Telefon", "BaslangicTarihi", "AktifMi", "Notlar")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)
          `;
          await pool.query(insQ, [kayitIdStr, id, ProjeAdi || '', Number(PersonelId), AdSoyad || 'Personel', Departman || '', SirketGorevi || '', pGorev, Telefon || '', bTarih, Notlar || '']);
        }
      } catch (dbErr: any) {
        console.error('[DB PERSONEL ATA ERROR]', dbErr.message);
      }
    }

    await getProjePersonellerList();

    const existingIdx = memProjePersoneller.findIndex(p => p.ProjeId === id && p.PersonelId === Number(PersonelId) && p.AktifMi);
    if (existingIdx !== -1) {
      return res.status(200).json(memProjePersoneller[existingIdx]);
    }

    const yeniKayit = {
      KayitId: kayitIdStr,
      ProjeId: id,
      ProjeAdi: ProjeAdi || '',
      PersonelId: Number(PersonelId),
      AdSoyad: AdSoyad || 'Personel',
      Departman: Departman || '',
      SirketGorevi: SirketGorevi || '',
      ProjeGorevi: pGorev,
      Telefon: Telefon || '',
      BaslangicTarihi: bTarih,
      BitisTarihi: null,
      AktifMi: true,
      Notlar: Notlar || ''
    };

    memProjePersoneller.unshift(yeniKayit);
    res.status(201).json(yeniKayit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projeler/:id/personel-cikar', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { PersonelId, KayitId, BitisTarihi, Notlar } = req.body;
    const bugun = BitisTarihi || new Date().toISOString().split('T')[0];

    if (isDbConnected && detectedTables.projePersoneller) {
      try {
        const upQ = `
          UPDATE ${detectedTables.projePersoneller}
          SET "AktifMi" = false, "BitisTarihi" = $1, "Notlar" = $2
          WHERE ("KayitId" = $3 OR ("ProjeId" = $4 AND "PersonelId" = $5 AND ("AktifMi" = true OR "AktifMi"::text = 'true')))
        `;
        await pool.query(upQ, [bugun, Notlar || 'Proje saha görevi tamamlandı ve arşive alındı.', KayitId || '', id, Number(PersonelId)]);
      } catch (dbErr: any) {
        console.error('[DB PERSONEL CIKAR ERROR]', dbErr.message);
      }
    }

    await getProjePersonellerList();

    const idx = memProjePersoneller.findIndex(p => 
      (KayitId && p.KayitId === KayitId) || 
      (p.ProjeId === id && p.PersonelId === Number(PersonelId))
    );

    if (idx !== -1) {
      memProjePersoneller[idx].AktifMi = false;
      memProjePersoneller[idx].BitisTarihi = bugun;
      return res.json(memProjePersoneller[idx]);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Araçlar CRUD
app.get('/api/araclar', async (req, res) => {
  try {
    const aktifSadece = req.query.aktif === 'true';
    const list = await getAraclarList(aktifSadece);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/araclar', async (req, res) => {
  try {
    const yeniArac = {
      AracId: Date.now(),
      PlakaVeyaKod: req.body.PlakaVeyaKod,
      AracTipi: req.body.AracTipi || 'Otomobil',
      MarkaModel: req.body.MarkaModel || '',
      ModelYili: Number(req.body.ModelYili) || new Date().getFullYear(),
      SasiSeriNo: req.body.SasiSeriNo || '',
      ZimmetliKisi: req.body.ZimmetliKisi || '',
      Departman: req.body.Departman || 'Genel',
      GuncelKmVeyaSaat: Number(req.body.GuncelKmVeyaSaat) || 0,
      BakimAraligiKmVeyaSaat: Number(req.body.BakimAraligiKmVeyaSaat) || (req.body.SaatTakibiMi ? 250 : 10000),
      BakimAraligiAy: Number(req.body.BakimAraligiAy) || 12,
      SonBakimTarihi: formatDate(req.body.SonBakimTarihi) || getBugunStr(),
      SonBakimKmVeyaSaat: Number(req.body.GuncelKmVeyaSaat) || 0,
      SaatTakibiMi: Boolean(req.body.SaatTakibiMi),
      MuayeneBitisTarihi: req.body.MuayeneBitisTarihi || null,
      SigortaBitisTarihi: req.body.SigortaBitisTarihi || null,
      Durum: req.body.Durum || 'Faal',
      AktifMi: req.body.Durum !== 'Elden Çıkarıldı / Satıldı',
      Notlar: req.body.Notlar || '',
      BakimGecmisi: []
    };

    if (isDbConnected && detectedTables.araclar) {
      try {
        const cols = await getTableColumns(detectedTables.araclar);
        const mapCol = (candidates: string[]) => cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));

        const mappings = [
          { key: 'PlakaVeyaKod', candidates: ['PlakaVeyaKod', 'plakaveyakod', 'plaka', 'kod'] },
          { key: 'AracTipi', candidates: ['AracTipi', 'aractipi', 'tur', 'tip'] },
          { key: 'MarkaModel', candidates: ['MarkaModel', 'markamodel', 'marka'] },
          { key: 'ModelYili', candidates: ['ModelYili', 'modelyili', 'yil'] },
          { key: 'SasiSeriNo', candidates: ['SasiSeriNo', 'sasiserino', 'sasino', 'serino'] },
          { key: 'ZimmetliKisi', candidates: ['ZimmetliKisi', 'zimmetlikisi', 'zimmetli', 'surucu'] },
          { key: 'Departman', candidates: ['Departman', 'departman', 'bolum'] },
          { key: 'GuncelKmVeyaSaat', candidates: ['GuncelKmVeyaSaat', 'guncelkmveyasaat', 'guncelkm', 'km', 'sayac'] },
          { key: 'BakimAraligiKmVeyaSaat', candidates: ['BakimAraligiKmVeyaSaat', 'bakimaraligikmveyasaat', 'bakimaraligi'] },
          { key: 'BakimAraligiAy', candidates: ['BakimAraligiAy', 'bakimaraligiay'] },
          { key: 'SonBakimTarihi', candidates: ['SonBakimTarihi', 'sonbakimtarihi'] },
          { key: 'SonBakimKmVeyaSaat', candidates: ['SonBakimKmVeyaSaat', 'sonbakimkmveyasaat', 'sonbakimkm'] },
          { key: 'SaatTakibiMi', candidates: ['SaatTakibiMi', 'saattakibimi'] },
          { key: 'MuayeneBitisTarihi', candidates: ['MuayeneBitisTarihi', 'muayenebitistarihi'] },
          { key: 'SigortaBitisTarihi', candidates: ['SigortaBitisTarihi', 'sigortabitistarihi'] },
          { key: 'Durum', candidates: ['Durum', 'durum'] },
          { key: 'AktifMi', candidates: ['AktifMi', 'aktifmi'] },
          { key: 'Notlar', candidates: ['Notlar', 'notlar', 'not'] }
        ];

        const rowData: any = {};
        for (const m of mappings) {
          const val = (yeniArac as any)[m.key];
          if (val !== undefined) {
            const dbCol = mapCol(m.candidates);
            if (dbCol) {
              rowData[dbCol] = val;
            }
          }
        }

        // Check if there are any remaining NOT NULL columns in DB table that weren't supplied, provide safe defaults
        for (const c of cols) {
          const lower = c.toLowerCase();
          if (!Object.keys(rowData).includes(c) && lower !== 'aracid' && lower !== 'id') {
            if (lower === 'departman') {
              rowData[c] = 'Genel';
            }
          }
        }

        const keys = Object.keys(rowData);
        if (keys.length > 0) {
          const colsSql = keys.map(k => `"${k}"`).join(', ');
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const values = keys.map(k => rowData[k]);
          const aRes = await pool.query(`INSERT INTO ${detectedTables.araclar} (${colsSql}) VALUES (${placeholders}) RETURNING *`, values);
          if (aRes.rows.length > 0) {
            return res.status(201).json(normalizeArac(aRes.rows[0]));
          }
        }
      } catch (err: any) {
        console.error('[DB INSERT ARAC ERROR]', err.message);
        // If there was a constraint violation on a specific column, attempt to drop NOT NULL and retry once
        if (err.message && err.message.includes('violates not-null constraint')) {
          try {
            const match = err.message.match(/column "([^"]+)"/);
            if (match && match[1]) {
              const colToFix = match[1];
              await pool.query(`ALTER TABLE ${detectedTables.araclar} ALTER COLUMN "${colToFix}" DROP NOT NULL`);
              const retryCols = await getTableColumns(detectedTables.araclar);
              const pCol = retryCols.find(c => ['plakaveyakod', 'plaka', 'kod'].includes(c.toLowerCase())) || 'PlakaVeyaKod';
              const reRes = await pool.query(`
                INSERT INTO ${detectedTables.araclar} ("${pCol}") 
                VALUES ($1) RETURNING *
              `, [yeniArac.PlakaVeyaKod]);
              if (reRes.rows.length > 0) {
                return res.status(201).json(normalizeArac(reRes.rows[0]));
              }
            }
          } catch (retryErr: any) {
            console.error('[DB INSERT ARAC RETRY ERROR]', retryErr.message);
          }
        }
      }
    }

    memAraclar.push(yeniArac);
    res.status(201).json(yeniArac);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/araclar/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isDbConnected && detectedTables.araclar) {
    try {
      const cols = await getTableColumns(detectedTables.araclar);
      const idCol = cols.find(c => ['aracid', 'id', 'AracId'].includes(c.toLowerCase())) || 'AracId';
      const mapCol = (candidates: string[]) => cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));

      const mappings = [
        { key: 'PlakaVeyaKod', candidates: ['PlakaVeyaKod', 'plakaveyakod', 'plaka', 'kod'] },
        { key: 'AracTipi', candidates: ['AracTipi', 'aractipi', 'tur', 'tip'] },
        { key: 'MarkaModel', candidates: ['MarkaModel', 'markamodel', 'marka'] },
        { key: 'ModelYili', candidates: ['ModelYili', 'modelyili', 'yil'] },
        { key: 'SasiSeriNo', candidates: ['SasiSeriNo', 'sasiserino', 'sasino', 'serino'] },
        { key: 'ZimmetliKisi', candidates: ['ZimmetliKisi', 'zimmetlikisi', 'zimmetli', 'surucu'] },
        { key: 'Departman', candidates: ['Departman', 'departman', 'bolum'] },
        { key: 'GuncelKmVeyaSaat', candidates: ['GuncelKmVeyaSaat', 'guncelkmveyasaat', 'guncelkm', 'km', 'sayac'] },
        { key: 'BakimAraligiKmVeyaSaat', candidates: ['BakimAraligiKmVeyaSaat', 'bakimaraligikmveyasaat', 'bakimaraligi'] },
        { key: 'BakimAraligiAy', candidates: ['BakimAraligiAy', 'bakimaraligiay'] },
        { key: 'SonBakimTarihi', candidates: ['SonBakimTarihi', 'sonbakimtarihi'] },
        { key: 'SonBakimKmVeyaSaat', candidates: ['SonBakimKmVeyaSaat', 'sonbakimkmveyasaat', 'sonbakimkm'] },
        { key: 'SaatTakibiMi', candidates: ['SaatTakibiMi', 'saattakibimi'] },
        { key: 'MuayeneBitisTarihi', candidates: ['MuayeneBitisTarihi', 'muayenebitistarihi'] },
        { key: 'SigortaBitisTarihi', candidates: ['SigortaBitisTarihi', 'sigortabitistarihi'] },
        { key: 'Durum', candidates: ['Durum', 'durum'] },
        { key: 'AktifMi', candidates: ['AktifMi', 'aktifmi'] },
        { key: 'Notlar', candidates: ['Notlar', 'notlar', 'not'] }
      ];

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      for (const m of mappings) {
        if (req.body[m.key] !== undefined) {
          const dbCol = mapCol(m.candidates);
          if (dbCol) {
            setClauses.push(`"${dbCol}" = $${paramIdx++}`);
            let val = req.body[m.key];
            if (m.key === 'AktifMi') val = Boolean(val);
            if (['GuncelKmVeyaSaat', 'BakimAraligiKmVeyaSaat', 'BakimAraligiAy', 'SonBakimKmVeyaSaat', 'ModelYili'].includes(m.key)) {
              val = Number(val);
            }
            values.push(val);
          }
        }
      }

      if (setClauses.length > 0) {
        values.push(id);
        const q = `
          UPDATE ${detectedTables.araclar}
          SET ${setClauses.join(', ')}
          WHERE "${idCol}" = $${paramIdx}
          RETURNING *;
        `;
        const uRes = await pool.query(q, values);
        if (uRes.rows.length > 0) {
          return res.json(normalizeArac(uRes.rows[0]));
        }
      }
    } catch (err: any) {
      console.error('[DB UPDATE ARAC ERROR]', err.message);
    }
  }

  const index = memAraclar.findIndex(a => a.AracId === id);
  if (index !== -1) {
    const guncel = { ...memAraclar[index], ...req.body };
    if (guncel.Durum === 'Elden Çıkarıldı / Satıldı') guncel.AktifMi = false;
    memAraclar[index] = guncel;
    return res.json(memAraclar[index]);
  }
  res.status(404).json({ error: 'Araç bulunamadı' });
});

app.delete('/api/araclar/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isDbConnected && detectedTables.araclar) {
    try {
      const cols = await getTableColumns(detectedTables.araclar);
      const idCol = cols.find(c => ['aracid', 'id', 'AracId'].includes(c.toLowerCase())) || 'AracId';
      await pool.query(`DELETE FROM ${detectedTables.araclar} WHERE "${idCol}" = $1`, [id]);
      return res.json({ success: true, message: 'Araç silindi' });
    } catch (err: any) {
      console.error('[DB DELETE ARAC ERROR]', err.message);
    }
  }

  const index = memAraclar.findIndex(a => a.AracId === id);
  if (index !== -1) {
    memAraclar.splice(index, 1);
  }
  res.json({ success: true, message: 'Araç silindi' });
});

// 5. Araç Bakım Geçmişi CRUD
app.post('/api/araclar/:id/bakimlar', async (req, res) => {
  const id = parseInt(req.params.id);
  const yeniBakim = {
    BakimId: Date.now(),
    AracId: id,
    BakimTarihi: formatDate(req.body.BakimTarihi) || getBugunStr(),
    YapilanKmVeyaSaat: Number(req.body.YapilanKmVeyaSaat) || 0,
    Aciklama: req.body.Aciklama || 'Periyodik Bakım',
    Maliyet: Number(req.body.Maliyet) || 0,
    YapanUstaVeyaServis: req.body.YapanUstaVeyaServis || '',
    Belgeler: req.body.Belgeler || [],
    FotoSayisi: (req.body.Belgeler || []).length
  };

  if (isDbConnected && detectedTables.aracBakimlar) {
    try {
      const q = `
        INSERT INTO ${detectedTables.aracBakimlar}
        ("AracId", "BakimTarihi", "YapilanKmVeyaSaat", "Aciklama", "Maliyet", "YapanUstaVeyaServis")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const bRes = await pool.query(q, [
        id, yeniBakim.BakimTarihi, yeniBakim.YapilanKmVeyaSaat,
        yeniBakim.Aciklama, yeniBakim.Maliyet, yeniBakim.YapanUstaVeyaServis
      ]);

      // Aracın son bakımını güncelle
      if (detectedTables.araclar) {
        const cols = await getTableColumns(detectedTables.araclar);
        const idCol = cols.find(c => ['aracid', 'id', 'AracId'].includes(c.toLowerCase())) || 'AracId';
        await pool.query(`
          UPDATE ${detectedTables.araclar}
          SET "SonBakimTarihi" = $1, "SonBakimKmVeyaSaat" = $2
          WHERE "${idCol}" = $3
        `, [yeniBakim.BakimTarihi, yeniBakim.YapilanKmVeyaSaat, id]);
      }

      if (bRes.rows.length > 0) {
        const insertedBakimId = Number(getProp(bRes.rows[0], 'BakimId', 'bakimid', 'id'));
        if (req.body.Belgeler && Array.isArray(req.body.Belgeler)) {
          await saveAracBakimBelgelerToDb(insertedBakimId, req.body.Belgeler);
        }
        const norm = normalizeBakim(bRes.rows[0]);
        norm.Belgeler = req.body.Belgeler || [];
        norm.FotoSayisi = (req.body.Belgeler || []).length;
        return res.status(201).json(norm);
      }
    } catch (err: any) {
      console.error('[DB INSERT BAKIM ERROR]', err.message);
    }
  }

  const arac = memAraclar.find(a => a.AracId === id);
  if (arac) {
    if (!arac.BakimGecmisi) arac.BakimGecmisi = [];
    arac.BakimGecmisi.unshift(yeniBakim);
    arac.SonBakimTarihi = yeniBakim.BakimTarihi;
    arac.SonBakimKmVeyaSaat = yeniBakim.YapilanKmVeyaSaat;
    return res.status(201).json(yeniBakim);
  }
  res.status(404).json({ error: 'Araç bulunamadı' });
});

app.put('/api/araclar/:id/bakimlar/:bakimId', async (req, res) => {
  const aracId = parseInt(req.params.id);
  const bakimId = parseInt(req.params.bakimId);
  const guncelData = {
    BakimTarihi: formatDate(req.body.BakimTarihi) || getBugunStr(),
    YapilanKmVeyaSaat: Number(req.body.YapilanKmVeyaSaat) || 0,
    Aciklama: req.body.Aciklama || 'Periyodik Bakım',
    Maliyet: Number(req.body.Maliyet) || 0,
    YapanUstaVeyaServis: req.body.YapanUstaVeyaServis || ''
  };

  if (isDbConnected && detectedTables.aracBakimlar) {
    try {
      const cols = await getTableColumns(detectedTables.aracBakimlar);
      const idCol = cols.find(c => ['bakimid', 'id', 'bakim_id'].includes(c.toLowerCase())) || 'BakimId';
      const mapCol = (candidates: string[]) => cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));

      const rowData: any = {};
      const tarihCol = mapCol(['BakimTarihi', 'bakimtarihi', 'tarih']);
      if (tarihCol) rowData[tarihCol] = guncelData.BakimTarihi;

      const sayacCol = mapCol(['YapilanKmVeyaSaat', 'yapilankmveyasaat', 'yapildigikmveyasaat', 'sayac']);
      if (sayacCol) rowData[sayacCol] = guncelData.YapilanKmVeyaSaat;

      const aciklamaCol = mapCol(['Aciklama', 'aciklama', 'yapilanislemler']);
      if (aciklamaCol) rowData[aciklamaCol] = guncelData.Aciklama;

      const maliyetCol = mapCol(['Maliyet', 'maliyet']);
      if (maliyetCol) rowData[maliyetCol] = guncelData.Maliyet;

      const ustaCol = mapCol(['YapanUstaVeyaServis', 'yapanustaveyaservis', 'usta']);
      if (ustaCol) rowData[ustaCol] = guncelData.YapanUstaVeyaServis;

      const keys = Object.keys(rowData);
      if (keys.length > 0) {
        const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
        await pool.query(`UPDATE ${detectedTables.aracBakimlar} SET ${setClause} WHERE "${idCol}" = $${keys.length + 1}`, [...keys.map(k => rowData[k]), bakimId]);
      }

      if (req.body.Belgeler && Array.isArray(req.body.Belgeler)) {
        await saveAracBakimBelgelerToDb(bakimId, req.body.Belgeler);
      }

      return res.json({
        BakimId: bakimId,
        AracId: aracId,
        ...guncelData,
        Belgeler: req.body.Belgeler || [],
        FotoSayisi: (req.body.Belgeler || []).length
      });
    } catch (err: any) {
      console.error('[DB UPDATE ARAC BAKIM ERROR]', err.message);
    }
  }

  const arac = memAraclar.find(a => a.AracId === aracId);
  if (arac && arac.BakimGecmisi) {
    const idx = arac.BakimGecmisi.findIndex(b => b.BakimId === bakimId);
    if (idx !== -1) {
      arac.BakimGecmisi[idx] = {
        ...arac.BakimGecmisi[idx],
        ...guncelData,
        Belgeler: req.body.Belgeler || arac.BakimGecmisi[idx].Belgeler || [],
        FotoSayisi: (req.body.Belgeler || arac.BakimGecmisi[idx].Belgeler || []).length
      };
      return res.json(arac.BakimGecmisi[idx]);
    }
  }
  res.status(404).json({ error: 'Bakım kaydı bulunamadı' });
});

app.delete('/api/araclar/:id/bakimlar/:bakimId', async (req, res) => {
  const aracId = parseInt(req.params.id);
  const bakimId = parseInt(req.params.bakimId);

  if (isDbConnected && detectedTables.aracBakimlar) {
    try {
      await deleteAracBakimBelgelerFromDb(bakimId);
      const cols = await getTableColumns(detectedTables.aracBakimlar);
      const idCol = cols.find(c => ['bakimid', 'id', 'bakim_id'].includes(c.toLowerCase())) || 'BakimId';
      await pool.query(`DELETE FROM ${detectedTables.aracBakimlar} WHERE "${idCol}" = $1`, [bakimId]);
      return res.json({ success: true, bakimId });
    } catch (err: any) {
      console.error('[DB DELETE ARAC BAKIM ERROR]', err.message);
    }
  }

  const arac = memAraclar.find(a => a.AracId === aracId);
  if (arac && arac.BakimGecmisi) {
    arac.BakimGecmisi = arac.BakimGecmisi.filter(b => b.BakimId !== bakimId);
    return res.json({ success: true, bakimId });
  }
  res.status(404).json({ error: 'Bakım kaydı bulunamadı' });
});

// 6. Hatırlatıcılar & Görevler CRUD
app.get('/api/hatirlaticilar', async (req, res) => {
  const list = await getHatirlaticilarList();
  res.json(list);
});

app.post('/api/hatirlaticilar', async (req, res) => {
  try {
    const yeni = {
      Id: req.body.Id || Date.now(),
      Baslik: req.body.Baslik,
      Aciklama: req.body.Aciklama || '',
      Tarih: formatDate(req.body.Tarih) || getBugunStr(),
      Kategori: req.body.Kategori || 'Gorev',
      TamamlandiMi: Boolean(req.body.TamamlandiMi ?? false),
      OnemDerecesi: req.body.OnemDerecesi || 'Normal',
      SorumluPersonelId: req.body.SorumluPersonelId ? Number(req.body.SorumluPersonelId) : null,
      Belgeler: req.body.Belgeler || []
    };

    if (isDbConnected && detectedTables.hatirlaticilar) {
      try {
        const inserted = await saveHatirlaticiToDb(null, yeni, true);
        if (inserted) {
          if (detectedTables.hatirlaticiBelgeler && req.body.Belgeler && Array.isArray(req.body.Belgeler)) {
            await saveHatirlaticiBelgelerToDb(inserted.Id, req.body.Belgeler);
            inserted.Belgeler = req.body.Belgeler;
            inserted.FotoSayisi = req.body.Belgeler.length;
          } else {
            inserted.Belgeler = [];
            inserted.FotoSayisi = 0;
          }
          memHatirlaticilar.unshift(inserted);
          return res.status(201).json(inserted);
        }
      } catch (err: any) {
        console.error('[DB INSERT HATIRLATICI CRUD ERROR]', err.message);
      }
    }

    const memYeni = { ...yeni, FotoSayisi: yeni.Belgeler.length };
    memHatirlaticilar.unshift(memYeni);
    res.status(201).json(memYeni);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/hatirlaticilar/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = {
      Baslik: req.body.Baslik,
      Aciklama: req.body.Aciklama || '',
      Tarih: formatDate(req.body.Tarih) || getBugunStr(),
      Kategori: req.body.Kategori || 'Gorev',
      TamamlandiMi: Boolean(req.body.TamamlandiMi ?? false),
      OnemDerecesi: req.body.OnemDerecesi || 'Normal',
      SorumluPersonelId: req.body.SorumluPersonelId ? Number(req.body.SorumluPersonelId) : null,
      Belgeler: req.body.Belgeler || []
    };

    if (isDbConnected && detectedTables.hatirlaticilar) {
      try {
        const updated = await saveHatirlaticiToDb(id, data, false);
        if (updated) {
          if (detectedTables.hatirlaticiBelgeler) {
            await saveHatirlaticiBelgelerToDb(id, req.body.Belgeler || []);
          }
          updated.Belgeler = req.body.Belgeler || [];
          updated.FotoSayisi = (req.body.Belgeler || []).length;

          const idx = memHatirlaticilar.findIndex(h => h.Id === id);
          if (idx !== -1) {
            memHatirlaticilar[idx] = updated;
          } else {
            memHatirlaticilar.unshift(updated);
          }
          return res.json(updated);
        }
      } catch (err: any) {
        console.error('[DB UPDATE HATIRLATICI CRUD ERROR]', err.message);
      }
    }

    const index = memHatirlaticilar.findIndex(h => h.Id === id);
    if (index !== -1) {
      const existing = memHatirlaticilar[index] as any;
      memHatirlaticilar[index] = { 
        ...existing, 
        ...req.body, 
        Belgeler: req.body.Belgeler || existing.Belgeler || [],
        FotoSayisi: (req.body.Belgeler || existing.Belgeler || []).length 
      } as any;
      return res.json(memHatirlaticilar[index]);
    }
    res.status(404).json({ error: 'Hatırlatıcı bulunamadı' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/hatirlaticilar/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isDbConnected && detectedTables.hatirlaticilar) {
      try {
        const cols = await getTableColumns(detectedTables.hatirlaticilar);
        const mapCol = (candidates: string[]) => {
          return cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));
        };
        const idCol = mapCol(['Id', 'GorevId', 'HatirlaticiId']) || 'Id';

        if (detectedTables.hatirlaticiBelgeler) {
          await deleteHatirlaticiBelgelerFromDb(id);
        }
        await pool.query(`DELETE FROM ${detectedTables.hatirlaticilar} WHERE "${idCol}" = $1`, [id]);
        memHatirlaticilar = memHatirlaticilar.filter(h => h.Id !== id);
        return res.json({ success: true });
      } catch (err: any) {
        console.error('[DB DELETE HATIRLATICI CRUD ERROR]', err.message);
      }
    }

    memHatirlaticilar = memHatirlaticilar.filter(h => h.Id !== id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 7. Personel & İK CRUD
// =========================================================================
app.get('/api/personeller', async (req, res) => {
  const aktifSadece = req.query.aktif === 'true';
  const list = await getPersonellerList(aktifSadece);
  res.json(list);
});

app.post('/api/personeller', async (req, res) => {
  try {
    const yeni = {
      PersonelId: Date.now(),
      TCKimlikNo: req.body.TCKimlikNo || '',
      AdSoyad: req.body.AdSoyad,
      Telefon: req.body.Telefon || '',
      Eposta: req.body.Eposta || '',
      KanGrubu: req.body.KanGrubu || 'Bilinmiyor',
      AcilDurumKisisi: req.body.AcilDurumKisisi || '',
      AcilDurumTelefonu: req.body.AcilDurumTelefonu || '',
      Departman: req.body.Departman || 'Genel',
      Gorev: req.body.Gorev || 'Personel',
      IseGirisTarihi: formatDate(req.body.IseGirisTarihi) || getBugunStr(),
      IstenCikisTarihi: req.body.IstenCikisTarihi ? formatDate(req.body.IstenCikisTarihi) : null,
      DogumTarihi: formatDate(req.body.DogumTarihi) || '1990-01-01',
      DurumAktifMi: req.body.DurumAktifMi ?? true,
      DevredenIzinGunu: Number(req.body.DevredenIzinGunu || 0),
      IzinUcretiOdemeleri: []
    };

    if (isDbConnected && detectedTables.personeller) {
      try {
        const cols = await getTableColumns(detectedTables.personeller);
        const mapCol = (candidates: string[]) => cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));

        const colNames: string[] = [];
        const valPlaceholders: string[] = [];
        const values: any[] = [];
        let paramIdx = 1;

        const mappings: { candidates: string[]; val: any }[] = [
          { candidates: ['TCKimlikNo', 'tckimlikno', 'tc'], val: yeni.TCKimlikNo },
          { candidates: ['AdSoyad', 'adsoyad', 'ad', 'Name'], val: yeni.AdSoyad },
          { candidates: ['Telefon', 'telefon', 'tel', 'Phone'], val: yeni.Telefon },
          { candidates: ['Eposta', 'eposta', 'email', 'Email'], val: yeni.Eposta },
          { candidates: ['KanGrubu', 'kangrubu', 'BloodType'], val: yeni.KanGrubu },
          { candidates: ['AcilDurumKisisi', 'acildurumkisisi', 'AcilKisi'], val: yeni.AcilDurumKisisi },
          { candidates: ['AcilDurumTelefonu', 'acildurumtelefonu', 'AcilTel'], val: yeni.AcilDurumTelefonu },
          { candidates: ['Departman', 'departman', 'Department'], val: yeni.Departman },
          { candidates: ['Gorev', 'gorev', 'Title', 'Gorevi'], val: yeni.Gorev },
          { candidates: ['IseGirisTarihi', 'isegiristarihi', 'IseGiris'], val: yeni.IseGirisTarihi },
          { candidates: ['IstenCikisTarihi', 'istencikistarihi', 'IstenCikis'], val: yeni.IstenCikisTarihi },
          { candidates: ['DogumTarihi', 'dogumtarihi', 'BirthDate'], val: yeni.DogumTarihi },
          { candidates: ['DevredenIzinGunu', 'devredenizingunu', 'DevredenIzin'], val: yeni.DevredenIzinGunu },
          { candidates: ['DurumAktifMi', 'durumaktifmi', 'AktifMi', 'aktifmi', 'DurumAktif'], val: yeni.DurumAktifMi }
        ];

        for (const m of mappings) {
          if (m.val !== undefined) {
            const matchedCol = mapCol(m.candidates);
            if (matchedCol) {
              colNames.push(`"${matchedCol}"`);
              valPlaceholders.push(`$${paramIdx}`);
              values.push(m.val);
              paramIdx++;
            }
          }
        }

        if (colNames.length > 0) {
          const q = `
            INSERT INTO ${detectedTables.personeller} (${colNames.join(', ')})
            VALUES (${valPlaceholders.join(', ')})
            RETURNING *
          `;
          const pRes = await pool.query(q, values);
          if (pRes.rows.length > 0) return res.status(201).json(normalizePersonel(pRes.rows[0]));
        }
      } catch (err: any) {
        console.error('[DB INSERT PERSONEL ERROR]', err.message);
      }
    }

    memPersoneller.unshift(yeni);
    res.status(201).json(yeni);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/personeller/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  const updateData = {
    AdSoyad: req.body.AdSoyad,
    TCKimlikNo: req.body.TCKimlikNo !== undefined ? req.body.TCKimlikNo : undefined,
    Telefon: req.body.Telefon !== undefined ? req.body.Telefon : undefined,
    Eposta: req.body.Eposta !== undefined ? req.body.Eposta : undefined,
    KanGrubu: req.body.KanGrubu !== undefined ? req.body.KanGrubu : undefined,
    AcilDurumKisisi: req.body.AcilDurumKisisi !== undefined ? req.body.AcilDurumKisisi : undefined,
    AcilDurumTelefonu: req.body.AcilDurumTelefonu !== undefined ? req.body.AcilDurumTelefonu : undefined,
    Departman: req.body.Departman !== undefined ? req.body.Departman : undefined,
    Gorev: req.body.Gorev !== undefined ? req.body.Gorev : undefined,
    IseGirisTarihi: req.body.IseGirisTarihi ? formatDate(req.body.IseGirisTarihi) : undefined,
    IstenCikisTarihi: req.body.IstenCikisTarihi !== undefined ? (req.body.IstenCikisTarihi ? formatDate(req.body.IstenCikisTarihi) : null) : undefined,
    DogumTarihi: req.body.DogumTarihi ? formatDate(req.body.DogumTarihi) : undefined,
    DevredenIzinGunu: req.body.DevredenIzinGunu !== undefined ? Number(req.body.DevredenIzinGunu || 0) : undefined,
    DurumAktifMi: req.body.DurumAktifMi !== undefined ? req.body.DurumAktifMi : undefined
  };

  if (isDbConnected && detectedTables.personeller) {
    try {
      const cols = await getTableColumns(detectedTables.personeller);
      const idCol = cols.find(c => ['personelid', 'id', 'PersonelId'].includes(c.toLowerCase())) || 'PersonelId';
      const mapCol = (candidates: string[]) => cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      const mappings: { candidates: string[]; val: any }[] = [
        { candidates: ['AdSoyad', 'adsoyad', 'ad', 'Name'], val: updateData.AdSoyad },
        { candidates: ['TCKimlikNo', 'tckimlikno', 'tc'], val: updateData.TCKimlikNo },
        { candidates: ['Telefon', 'telefon', 'tel', 'Phone'], val: updateData.Telefon },
        { candidates: ['Eposta', 'eposta', 'email', 'Email'], val: updateData.Eposta },
        { candidates: ['KanGrubu', 'kangrubu', 'BloodType'], val: updateData.KanGrubu },
        { candidates: ['AcilDurumKisisi', 'acildurumkisisi', 'AcilKisi'], val: updateData.AcilDurumKisisi },
        { candidates: ['AcilDurumTelefonu', 'acildurumtelefonu', 'AcilTel'], val: updateData.AcilDurumTelefonu },
        { candidates: ['Departman', 'departman', 'Department'], val: updateData.Departman },
        { candidates: ['Gorev', 'gorev', 'Title', 'Gorevi'], val: updateData.Gorev },
        { candidates: ['IseGirisTarihi', 'isegiristarihi', 'IseGiris'], val: updateData.IseGirisTarihi },
        { candidates: ['IstenCikisTarihi', 'istencikistarihi', 'IstenCikis'], val: updateData.IstenCikisTarihi },
        { candidates: ['DogumTarihi', 'dogumtarihi', 'BirthDate'], val: updateData.DogumTarihi },
        { candidates: ['DevredenIzinGunu', 'devredenizingunu', 'DevredenIzin'], val: updateData.DevredenIzinGunu },
        { candidates: ['DurumAktifMi', 'durumaktifmi', 'AktifMi', 'aktifmi', 'DurumAktif'], val: updateData.DurumAktifMi }
      ];

      for (const m of mappings) {
        if (m.val !== undefined) {
          const matchedCol = mapCol(m.candidates);
          if (matchedCol) {
            setClauses.push(`"${matchedCol}" = $${paramIdx}`);
            values.push(m.val);
            paramIdx++;
          }
        }
      }

      if (setClauses.length > 0) {
        values.push(id);
        const q = `
          UPDATE ${detectedTables.personeller}
          SET ${setClauses.join(', ')}
          WHERE "${idCol}" = $${paramIdx}
          RETURNING *
        `;
        const pRes = await pool.query(q, values);
        if (pRes.rows.length > 0) return res.json(normalizePersonel(pRes.rows[0]));
      }
    } catch (err: any) {
      console.error('[DB UPDATE PERSONEL ERROR]', err.message);
    }
  }

  const idx = memPersoneller.findIndex(p => p.PersonelId === id);
  if (idx !== -1) {
    memPersoneller[idx] = { ...memPersoneller[idx], ...req.body };
    return res.json(memPersoneller[idx]);
  }
  res.status(404).json({ error: 'Personel bulunamadı' });
});

app.delete('/api/personeller/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isDbConnected && detectedTables.personeller) {
    try {
      const cols = await getTableColumns(detectedTables.personeller);
      const idCol = cols.find(c => ['personelid', 'id', 'PersonelId'].includes(c.toLowerCase())) || 'PersonelId';
      await pool.query(`UPDATE ${detectedTables.personeller} SET "DurumAktifMi" = false WHERE "${idCol}" = $1`, [id]);
      return res.json({ success: true, message: 'Personel pasife alındı' });
    } catch (err: any) {
      console.error('[DB DELETE PERSONEL ERROR]', err.message);
    }
  }
  memPersoneller = memPersoneller.filter(p => p.PersonelId !== id);
  res.json({ success: true });
});

function parseDateToObj(val: any): Date | null {
  if (!val) return null;
  const formatted = formatDate(val);
  if (!formatted) return null;
  const parts = formatted.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return null;
}

// =========================================================================
// İzin Hak Edişi & Kota Kontrolü Yardımcı Fonksiyonu (4857 Sayılı Kanun m.53)
// =========================================================================
async function hesaplaPersonelKalanIzinServer(personelId: number): Promise<{ kalan: number; toplamHak: number; kullanilan: number; ucretli: number }> {
  const personeller = await getPersonellerList();
  const p = personeller.find(x => x.PersonelId === personelId);
  if (!p) return { kalan: 0, toplamHak: 0, kullanilan: 0, ucretli: 0 };

  const iseGiris = parseDateToObj(p.IseGirisTarihi);
  if (!iseGiris) {
    const dev = Number(p.DevredenIzinGunu || 0);
    return { kalan: dev, toplamHak: dev, kullanilan: 0, ucretli: 0 };
  }

  const bugun = new Date();
  let tamYil = bugun.getFullYear() - iseGiris.getFullYear();
  let ayFark = bugun.getMonth() - iseGiris.getMonth();
  let gunFark = bugun.getDate() - iseGiris.getDate();
  if (gunFark < 0) ayFark--;
  if (ayFark < 0) tamYil--;
  tamYil = Math.max(0, tamYil);

  let kanuniHak = 0;
  for (let y = 1; y <= tamYil; y++) {
    const anniv = new Date(iseGiris.getFullYear() + y, iseGiris.getMonth(), iseGiris.getDate());
    let yas = 30;
    if (p.DogumTarihi) {
      const d = parseDateToObj(p.DogumTarihi);
      if (d) {
        yas = anniv.getFullYear() - d.getFullYear();
        const m = anniv.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && anniv.getDate() < d.getDate())) yas--;
      }
    }

    let gun = y > 15 ? 26 : (y > 5 ? 20 : 14);
    if ((yas >= 50 || yas <= 18) && gun < 20) gun = 20;
    kanuniHak += gun;
  }

  const devreden = Number(p.DevredenIzinGunu || 0);
  const toplamHak = kanuniHak + devreden;

  const tumIzinler = await getIzinlerList();
  const kullanilan = tumIzinler
    .filter(iz => iz.PersonelId === personelId && iz.IzinTuru === 'Yıllık İzin' && iz.Durum === 'Onaylandı' && !iz.SilindiMi)
    .reduce((sum, iz) => sum + (Number(iz.IsGunuSayisi) || 0), 0);

  const ucretli = (p.IzinUcretiOdemeleri || []).reduce((sum: number, u: any) => sum + (Number(u.UcreteCevrilenGun) || 0), 0);

  const kalan = toplamHak - kullanilan - ucretli;
  return { kalan, toplamHak, kullanilan, ucretli };
}

// İzin Ücreti Ödemesi Ekle (Ücrete Çevrilen İzin ve Evrak)
app.post('/api/personeller/:id/izin-ucreti', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { UcreteCevrilenGun, GunlukUcret, ToplamTutar, OdemeTarihi, EvrakAdi, EvrakDosya, Aciklama } = req.body;
    
    const gun = Number(UcreteCevrilenGun || 0);
    if (gun <= 0) {
      return res.status(400).json({ error: 'Ücrete çevrilecek gün sayısı en az 1 olmalıdır.' });
    }

    const { kalan } = await hesaplaPersonelKalanIzinServer(id);
    if (gun > kalan) {
      return res.status(400).json({ 
        error: `Ücrete çevrilecek gün sayısı (${gun} gün), personelin kalan yıllık izninden (${kalan} gün) fazla olamaz!` 
      });
    }

    const yeniOdeme = {
      OdemeId: Date.now(),
      PersonelId: id,
      OdemeTarihi: formatDate(OdemeTarihi) || getBugunStr(),
      UcreteCevrilenGun: gun,
      GunlukUcret: Number(GunlukUcret || 0),
      ToplamTutar: Number(ToplamTutar || 0),
      EvrakAdi: EvrakAdi || '',
      EvrakDosya: EvrakDosya || '',
      Aciklama: Aciklama || ''
    };

    const idx = memPersoneller.findIndex(p => p.PersonelId === id);
    if (idx !== -1) {
      if (!Array.isArray(memPersoneller[idx].IzinUcretiOdemeleri)) {
        memPersoneller[idx].IzinUcretiOdemeleri = [];
      }
      memPersoneller[idx].IzinUcretiOdemeleri.unshift(yeniOdeme);
      return res.status(201).json(yeniOdeme);
    }
    res.status(404).json({ error: 'Personel bulunamadı' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// İzin Ücreti Ödemesi Sil
app.delete('/api/personeller/:id/izin-ucreti/:odemeId', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const odemeId = req.params.odemeId;
    const idx = memPersoneller.findIndex(p => p.PersonelId === id);
    if (idx !== -1 && Array.isArray(memPersoneller[idx].IzinUcretiOdemeleri)) {
      memPersoneller[idx].IzinUcretiOdemeleri = memPersoneller[idx].IzinUcretiOdemeleri.filter(
        (o: any) => String(o.OdemeId) !== String(odemeId)
      );
      return res.json({ success: true });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Eski Sistemden Devir İznini Güncelle
app.put('/api/personeller/:id/devir-izin', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const devreden = Number(req.body.DevredenIzinGunu || 0);

    if (isDbConnected && detectedTables.personeller) {
      try {
        const cols = await getTableColumns(detectedTables.personeller);
        const idCol = cols.find(c => ['personelid', 'id', 'PersonelId'].includes(c.toLowerCase())) || 'PersonelId';
        const colName = cols.find(c => ['devredenizingunu', 'DevredenIzinGunu'].includes(c.toLowerCase())) || 'DevredenIzinGunu';
        await pool.query(`UPDATE ${detectedTables.personeller} SET "${colName}" = $1 WHERE "${idCol}" = $2`, [devreden, id]);
      } catch (dbErr: any) {
        console.error('[DB DEVİR İZİN UPDATE ERROR]', dbErr.message);
      }
    }

    const idx = memPersoneller.findIndex(p => p.PersonelId === id);
    if (idx !== -1) {
      memPersoneller[idx].DevredenIzinGunu = devreden;
    }
    return res.json({ success: true, devredenIzinGunu: devreden });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 8. İzin Yönetimi CRUD
// =========================================================================
app.get('/api/izinler', async (req, res) => {
  const list = await getIzinlerList();
  res.json(list);
});

app.post('/api/izinler', async (req, res) => {
  try {
    const yeni = {
      IzinId: Date.now(),
      PersonelId: Number(req.body.PersonelId),
      IzinTuru: req.body.IzinTuru || 'Yıllık İzin',
      BaslangicTarihi: formatDate(req.body.BaslangicTarihi) || getBugunStr(),
      BitisTarihi: formatDate(req.body.BitisTarihi) || getBugunStr(),
      IsGunuSayisi: Number(req.body.IsGunuSayisi || 1),
      Durum: req.body.Durum || 'Onaylandı',
      Onaylayan: req.body.Onaylayan || 'İdari İşler',
      Aciklama: req.body.Aciklama || '',
      SilindiMi: false
    };

    // KOTA KONTROLÜ: Eğer Yıllık İzin ise fazladan izin verilmesini engelle
    if (yeni.IzinTuru === 'Yıllık İzin' && yeni.Durum === 'Onaylandı') {
      const { kalan } = await hesaplaPersonelKalanIzinServer(yeni.PersonelId);
      if (yeni.IsGunuSayisi > kalan) {
        return res.status(400).json({
          error: `Personelin kalan yıllık izin hakkı (${kalan} gün) yetersizdir! Talep edilen: ${yeni.IsGunuSayisi} gün. Fazladan yıllık izin verilemez.`
        });
      }
    }

    if (isDbConnected && detectedTables.izinler) {
      try {
        const cols = await getTableColumns(detectedTables.izinler);
        const mapCol = (candidates: string[]) => cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));

        const colNames: string[] = [];
        const valPlaceholders: string[] = [];
        const values: any[] = [];
        let paramIdx = 1;

        const mappings: { candidates: string[]; val: any }[] = [
          { candidates: ['PersonelId', 'personelid'], val: yeni.PersonelId },
          { candidates: ['IzinTuru', 'izinturu'], val: yeni.IzinTuru },
          { candidates: ['BaslangicTarihi', 'baslangictarihi'], val: yeni.BaslangicTarihi },
          { candidates: ['BitisTarihi', 'bitistarihi'], val: yeni.BitisTarihi },
          { candidates: ['IsGunuSayisi', 'isgunusayisi'], val: yeni.IsGunuSayisi },
          { candidates: ['Durum', 'durum'], val: yeni.Durum },
          { candidates: ['Onaylayan', 'onaylayan'], val: yeni.Onaylayan },
          { candidates: ['Aciklama', 'aciklama'], val: yeni.Aciklama },
          { candidates: ['SilindiMi', 'silindimi'], val: yeni.SilindiMi },
          { candidates: ['SilmeNedeni', 'silmenedeni'], val: req.body.SilmeNedeni || '' },
          { candidates: ['EvrakDosya', 'evrakdosya', 'Dosya', 'dosya'], val: req.body.EvrakDosya || req.body.Dosya || '' }
        ];

        for (const m of mappings) {
          if (m.val !== undefined) {
            const matchedCol = mapCol(m.candidates);
            if (matchedCol) {
              colNames.push(`"${matchedCol}"`);
              valPlaceholders.push(`$${paramIdx}`);
              values.push(m.val);
              paramIdx++;
            }
          }
        }

        if (colNames.length > 0) {
          const q = `
            INSERT INTO ${detectedTables.izinler} (${colNames.join(', ')})
            VALUES (${valPlaceholders.join(', ')})
            RETURNING *
          `;
          const iRes = await pool.query(q, values);
          if (iRes.rows.length > 0) {
            const saved = normalizeIzin(iRes.rows[0]);
            memIzinler.unshift(saved);
            return res.status(201).json(saved);
          }
        }
      } catch (err: any) {
        console.error('[DB INSERT IZIN ERROR]', err.message);
      }
    }

    memIzinler.unshift(yeni);
    res.status(201).json(yeni);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/izinler/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const upd = {
      PersonelId: req.body.PersonelId !== undefined ? Number(req.body.PersonelId) : undefined,
      IzinTuru: req.body.IzinTuru,
      BaslangicTarihi: req.body.BaslangicTarihi ? formatDate(req.body.BaslangicTarihi) : undefined,
      BitisTarihi: req.body.BitisTarihi ? formatDate(req.body.BitisTarihi) : undefined,
      IsGunuSayisi: req.body.IsGunuSayisi !== undefined ? Number(req.body.IsGunuSayisi) : undefined,
      Durum: req.body.Durum,
      Onaylayan: req.body.Onaylayan,
      Aciklama: req.body.Aciklama,
      SilindiMi: req.body.SilindiMi !== undefined ? Boolean(req.body.SilindiMi) : undefined
    };

    if (isDbConnected && detectedTables.izinler) {
      try {
        const cols = await getTableColumns(detectedTables.izinler);
        const idCol = cols.find(c => ['izinid', 'id', 'IzinId'].includes(c.toLowerCase())) || 'IzinId';
        const mapCol = (candidates: string[]) => cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));

        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIdx = 1;

        const mappings: { candidates: string[]; val: any }[] = [
          { candidates: ['PersonelId', 'personelid'], val: upd.PersonelId },
          { candidates: ['IzinTuru', 'izinturu'], val: upd.IzinTuru },
          { candidates: ['BaslangicTarihi', 'baslangictarihi'], val: upd.BaslangicTarihi },
          { candidates: ['BitisTarihi', 'bitistarihi'], val: upd.BitisTarihi },
          { candidates: ['IsGunuSayisi', 'isgunusayisi'], val: upd.IsGunuSayisi },
          { candidates: ['Durum', 'durum'], val: upd.Durum },
          { candidates: ['Onaylayan', 'onaylayan'], val: upd.Onaylayan },
          { candidates: ['Aciklama', 'aciklama'], val: upd.Aciklama },
          { candidates: ['SilindiMi', 'silindimi'], val: upd.SilindiMi },
          { candidates: ['SilmeNedeni', 'silmenedeni'], val: req.body.SilmeNedeni },
          { candidates: ['EvrakDosya', 'evrakdosya', 'Dosya', 'dosya'], val: req.body.EvrakDosya || req.body.Dosya }
        ];

        for (const m of mappings) {
          if (m.val !== undefined) {
            const matchedCol = mapCol(m.candidates);
            if (matchedCol) {
              setClauses.push(`"${matchedCol}" = $${paramIdx}`);
              values.push(m.val);
              paramIdx++;
            }
          }
        }

        if (setClauses.length > 0) {
          values.push(id);
          const q = `
            UPDATE ${detectedTables.izinler}
            SET ${setClauses.join(', ')}
            WHERE "${idCol}" = $${paramIdx}
            RETURNING *
          `;
          const uRes = await pool.query(q, values);
          if (uRes.rows.length > 0) {
            const updated = normalizeIzin(uRes.rows[0]);
            const mIdx = memIzinler.findIndex(i => i.IzinId === id);
            if (mIdx !== -1) memIzinler[mIdx] = updated;
            return res.json(updated);
          }
        }
      } catch (err: any) {
        console.error('[DB UPDATE IZIN ERROR]', err.message);
      }
    }

    const index = memIzinler.findIndex(i => i.IzinId === id);
    if (index !== -1) {
      const existing = memIzinler[index];
      const updated = {
        ...existing,
        PersonelId: upd.PersonelId !== undefined ? upd.PersonelId : existing.PersonelId,
        IzinTuru: upd.IzinTuru !== undefined ? upd.IzinTuru : existing.IzinTuru,
        BaslangicTarihi: upd.BaslangicTarihi !== undefined ? upd.BaslangicTarihi : existing.BaslangicTarihi,
        BitisTarihi: upd.BitisTarihi !== undefined ? upd.BitisTarihi : existing.BitisTarihi,
        IsGunuSayisi: upd.IsGunuSayisi !== undefined ? upd.IsGunuSayisi : existing.IsGunuSayisi,
        Durum: upd.Durum !== undefined ? upd.Durum : existing.Durum,
        Onaylayan: upd.Onaylayan !== undefined ? upd.Onaylayan : existing.Onaylayan,
        Aciklama: upd.Aciklama !== undefined ? upd.Aciklama : existing.Aciklama,
        SilindiMi: upd.SilindiMi !== undefined ? upd.SilindiMi : existing.SilindiMi
      };
      memIzinler[index] = updated;
      return res.json(updated);
    }

    res.status(404).json({ error: 'İzin kaydı bulunamadı' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/izinler/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isDbConnected && detectedTables.izinler) {
      try {
        const cols = await getTableColumns(detectedTables.izinler);
        const idCol = cols.find(c => ['izinid', 'id', 'IzinId'].includes(c.toLowerCase())) || 'IzinId';
        const silCol = cols.find(c => ['silindimi', 'SilindiMi'].includes(c.toLowerCase())) || 'SilindiMi';
        const q = `UPDATE ${detectedTables.izinler} SET "${silCol}" = true WHERE "${idCol}" = $1`;
        await pool.query(q, [id]);
        const mIdx = memIzinler.findIndex(i => i.IzinId === id);
        if (mIdx !== -1) memIzinler[mIdx].SilindiMi = true;
        return res.json({ success: true });
      } catch (err: any) {
        console.error('[DB DELETE IZIN ERROR]', err.message);
      }
    }
    const index = memIzinler.findIndex(i => i.IzinId === id);
    if (index !== -1) {
      memIzinler[index].SilindiMi = true;
      return res.json({ success: true });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 9. Mobilya Makineleri & Ekipmanlar CRUD
// =========================================================================
app.get('/api/makineler', async (req, res) => {
  const aktifSadece = req.query.aktif === 'true';
  const list = await getMakinelerList(aktifSadece);
  res.json(list);
});

app.post('/api/makineler', async (req, res) => {
  try {
    const yeni = {
      MakineId: Date.now(),
      MakineKodu: req.body.MakineKodu || 'MAK-01',
      MakineAdi: req.body.MakineAdi || 'Yeni Makine',
      MakineTuru: req.body.MakineTuru || 'CNC İşleme Merkezi',
      MarkaModel: req.body.MarkaModel || '',
      ImalatYili: Number(req.body.ImalatYili || new Date().getFullYear()),
      SeriNo: req.body.SeriNo || '',
      KonumBolum: req.body.KonumBolum || 'Fabrika',
      SorumluUsta: req.body.SorumluUsta || '',
      GuncelCalismaSaati: Number(req.body.GuncelCalismaSaati || 0),
      BakimAraligiSaat: Number(req.body.BakimAraligiSaat || 250),
      BakimAraligiAy: Number(req.body.BakimAraligiAy || 3),
      SonBakimTarihi: formatDate(req.body.SonBakimTarihi) || getBugunStr(),
      SonBakimSaati: Number(req.body.SonBakimSaati || 0),
      Durum: req.body.Durum || 'Faal',
      AktifMi: true,
      BakimGecmisi: []
    };

    if (isDbConnected && detectedTables.makineler) {
      try {
        const cols = await getTableColumns(detectedTables.makineler);
        const mapCol = (candidates: string[]) => cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));

        const mappings = [
          { key: 'MakineKodu', candidates: ['MakineKodu', 'makinekodu', 'kod'] },
          { key: 'MakineAdi', candidates: ['MakineAdi', 'makineadi', 'ad'] },
          { key: 'MakineTuru', candidates: ['MakineTuru', 'makineturu', 'tur'] },
          { key: 'MarkaModel', candidates: ['MarkaModel', 'markamodel'] },
          { key: 'ImalatYili', candidates: ['ImalatYili', 'imalatyili', 'yil'] },
          { key: 'SeriNo', candidates: ['SeriNo', 'serino'] },
          { key: 'KonumBolum', candidates: ['KonumBolum', 'konumbolum', 'konum', 'bolum'] },
          { key: 'SorumluUsta', candidates: ['SorumluUsta', 'sorumluusta', 'usta', 'sorumlu'] },
          { key: 'GuncelCalismaSaati', candidates: ['GuncelCalismaSaati', 'guncelcalismasaati', 'saat'] },
          { key: 'BakimAraligiSaat', candidates: ['BakimAraligiSaat', 'bakimaraligisaat'] },
          { key: 'BakimAraligiAy', candidates: ['BakimAraligiAy', 'bakimaraligiay'] },
          { key: 'SonBakimTarihi', candidates: ['SonBakimTarihi', 'sonbakimtarihi'] },
          { key: 'SonBakimSaati', candidates: ['SonBakimSaati', 'sonbakimsaati'] },
          { key: 'Durum', candidates: ['Durum', 'durum'] },
          { key: 'AktifMi', candidates: ['AktifMi', 'aktifmi'] },
          { key: 'Notlar', candidates: ['Notlar', 'notlar', 'not'] }
        ];

        const rowData: any = {};
        for (const m of mappings) {
          const val = (yeni as any)[m.key];
          if (val !== undefined) {
            const dbCol = mapCol(m.candidates);
            if (dbCol) {
              rowData[dbCol] = val;
            }
          }
        }

        const keys = Object.keys(rowData);
        if (keys.length > 0) {
          const colsSql = keys.map(k => `"${k}"`).join(', ');
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const values = keys.map(k => rowData[k]);
          const mRes = await pool.query(`INSERT INTO ${detectedTables.makineler} (${colsSql}) VALUES (${placeholders}) RETURNING *`, values);
          if (mRes.rows.length > 0) return res.status(201).json(normalizeMakine(mRes.rows[0]));
        }
      } catch (err: any) {
        console.error('[DB INSERT MAKINE ERROR]', err.message);
      }
    }

    memMakineler.unshift(yeni);
    res.status(201).json(yeni);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/makineler/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const up = {
    MakineKodu: req.body.MakineKodu,
    MakineAdi: req.body.MakineAdi,
    MakineTuru: req.body.MakineTuru,
    MarkaModel: req.body.MarkaModel,
    ImalatYili: req.body.ImalatYili !== undefined ? Number(req.body.ImalatYili) : undefined,
    SeriNo: req.body.SeriNo,
    KonumBolum: req.body.KonumBolum,
    SorumluUsta: req.body.SorumluUsta,
    GuncelCalismaSaati: req.body.GuncelCalismaSaati !== undefined ? Number(req.body.GuncelCalismaSaati) : undefined,
    BakimAraligiSaat: req.body.BakimAraligiSaat !== undefined ? Number(req.body.BakimAraligiSaat) : undefined,
    BakimAraligiAy: req.body.BakimAraligiAy !== undefined ? Number(req.body.BakimAraligiAy) : undefined,
    SonBakimTarihi: req.body.SonBakimTarihi ? formatDate(req.body.SonBakimTarihi) : undefined,
    SonBakimSaati: req.body.SonBakimSaati !== undefined ? Number(req.body.SonBakimSaati) : undefined,
    Durum: req.body.Durum,
    AktifMi: req.body.AktifMi !== undefined ? Boolean(req.body.AktifMi) : undefined,
    Notlar: req.body.Notlar
  };

  if (isDbConnected && detectedTables.makineler) {
    try {
      const cols = await getTableColumns(detectedTables.makineler);
      const idCol = cols.find(c => ['makineid', 'id'].includes(c.toLowerCase())) || 'MakineId';
      const mapCol = (candidates: string[]) => cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));

      const rowData: any = {};
      const mappings = [
        { key: 'MakineKodu', candidates: ['MakineKodu', 'makinekodu', 'kod'] },
        { key: 'MakineAdi', candidates: ['MakineAdi', 'makineadi', 'ad'] },
        { key: 'MakineTuru', candidates: ['MakineTuru', 'makineturu', 'tur'] },
        { key: 'MarkaModel', candidates: ['MarkaModel', 'markamodel'] },
        { key: 'ImalatYili', candidates: ['ImalatYili', 'imalatyili'] },
        { key: 'SeriNo', candidates: ['SeriNo', 'serino'] },
        { key: 'KonumBolum', candidates: ['KonumBolum', 'konumbolum'] },
        { key: 'SorumluUsta', candidates: ['SorumluUsta', 'sorumluusta'] },
        { key: 'GuncelCalismaSaati', candidates: ['GuncelCalismaSaati', 'guncelcalismasaati'] },
        { key: 'BakimAraligiSaat', candidates: ['BakimAraligiSaat', 'bakimaraligisaat'] },
        { key: 'BakimAraligiAy', candidates: ['BakimAraligiAy', 'bakimaraligiay'] },
        { key: 'SonBakimTarihi', candidates: ['SonBakimTarihi', 'sonbakimtarihi'] },
        { key: 'SonBakimSaati', candidates: ['SonBakimSaati', 'sonbakimsaati'] },
        { key: 'Durum', candidates: ['Durum', 'durum'] },
        { key: 'AktifMi', candidates: ['AktifMi', 'aktifmi'] },
        { key: 'Notlar', candidates: ['Notlar', 'notlar', 'not'] }
      ];

      for (const m of mappings) {
        const val = (up as any)[m.key];
        if (val !== undefined) {
          const dbCol = mapCol(m.candidates);
          if (dbCol) {
            rowData[dbCol] = val;
          }
        }
      }

      const keys = Object.keys(rowData);
      if (keys.length > 0) {
        const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
        await pool.query(`UPDATE ${detectedTables.makineler} SET ${setClause} WHERE "${idCol}" = $${keys.length + 1}`, [...keys.map(k => rowData[k]), id]);
      }

      const resRow = await pool.query(`SELECT * FROM ${detectedTables.makineler} WHERE "${idCol}" = $1`, [id]);
      if (resRow.rows.length > 0) {
        return res.json(normalizeMakine(resRow.rows[0]));
      }
    } catch (err: any) {
      console.error('[DB UPDATE MAKINE ERROR]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  const makineIdx = memMakineler.findIndex(m => m.MakineId === id);
  if (makineIdx !== -1) {
    memMakineler[makineIdx] = {
      ...memMakineler[makineIdx],
      ...Object.fromEntries(Object.entries(up).filter(([_, v]) => v !== undefined))
    };
    return res.json(memMakineler[makineIdx]);
  }
  res.status(404).json({ error: 'Makine bulunamadı' });
});

app.delete('/api/makineler/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isDbConnected && detectedTables.makineler) {
    try {
      const cols = await getTableColumns(detectedTables.makineler);
      const idCol = cols.find(c => ['makineid', 'id'].includes(c.toLowerCase())) || 'MakineId';
      await pool.query(`DELETE FROM ${detectedTables.makineler} WHERE "${idCol}" = $1`, [id]);
      return res.json({ success: true, id });
    } catch (err: any) {
      console.error('[DB DELETE MAKINE ERROR]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  const makineIdx = memMakineler.findIndex(m => m.MakineId === id);
  if (makineIdx !== -1) {
    memMakineler.splice(makineIdx, 1);
    return res.json({ success: true, id });
  }
  res.status(404).json({ error: 'Makine bulunamadı' });
});

app.post('/api/makineler/:id/bakimlar', async (req, res) => {
  const id = parseInt(req.params.id);
  const yeniBakim = {
    BakimId: Date.now(),
    MakineId: id,
    BakimTarihi: formatDate(req.body.BakimTarihi) || getBugunStr(),
    YapildigiSaat: Number(req.body.YapildigiSaat || 0),
    BakimTuru: req.body.BakimTuru || 'Periyodik Bakım',
    BakimiYapan: req.body.BakimiYapan || 'Fabrika İçi Bakım Ekibi',
    Maliyet: Number(req.body.Maliyet || 0),
    DegisenParcalar: req.body.DegisenParcalar || '',
    Aciklama: req.body.Aciklama || '',
    Belgeler: req.body.Belgeler || [],
    FotoSayisi: (req.body.Belgeler || []).length
  };

  if (isDbConnected && detectedTables.makineBakimlar) {
    try {
      const q = `
        INSERT INTO ${detectedTables.makineBakimlar}
        ("MakineId", "BakimTarihi", "YapildigiSaat", "BakimTuru", "BakimiYapan", "Maliyet", "DegisenParcalar", "Aciklama")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const bRes = await pool.query(q, [
        id, yeniBakim.BakimTarihi, yeniBakim.YapildigiSaat, yeniBakim.BakimTuru,
        yeniBakim.BakimiYapan, yeniBakim.Maliyet, yeniBakim.DegisenParcalar, yeniBakim.Aciklama
      ]);

      if (detectedTables.makineler) {
        const cols = await getTableColumns(detectedTables.makineler);
        const idCol = cols.find(c => ['makineid', 'id', 'MakineId'].includes(c.toLowerCase())) || 'MakineId';
        await pool.query(`
          UPDATE ${detectedTables.makineler}
          SET "SonBakimTarihi" = $1, "SonBakimSaati" = $2
          WHERE "${idCol}" = $3
        `, [yeniBakim.BakimTarihi, yeniBakim.YapildigiSaat, id]);
      }

      if (bRes.rows.length > 0) {
        const insertedBakimId = Number(getProp(bRes.rows[0], 'BakimId', 'bakimid', 'id'));
        if (req.body.Belgeler && Array.isArray(req.body.Belgeler)) {
          await saveMakineBakimBelgelerToDb(insertedBakimId, req.body.Belgeler);
        }
        const norm = normalizeMakineBakim(bRes.rows[0]);
        norm.Belgeler = req.body.Belgeler || [];
        norm.FotoSayisi = (req.body.Belgeler || []).length;
        return res.status(201).json(norm);
      }
    } catch (err: any) {
      console.error('[DB INSERT MAKINE BAKIM ERROR]', err.message);
    }
  }

  const makine = memMakineler.find(m => m.MakineId === id);
  if (makine) {
    if (!makine.BakimGecmisi) makine.BakimGecmisi = [];
    makine.BakimGecmisi.unshift(yeniBakim);
    makine.SonBakimTarihi = yeniBakim.BakimTarihi;
    makine.SonBakimSaati = yeniBakim.YapildigiSaat;
    return res.status(201).json(yeniBakim);
  }
  res.status(404).json({ error: 'Makine bulunamadı' });
});

app.put('/api/makineler/:id/bakimlar/:bakimId', async (req, res) => {
  const makineId = parseInt(req.params.id);
  const bakimId = parseInt(req.params.bakimId);
  const guncelData = {
    BakimTarihi: formatDate(req.body.BakimTarihi) || getBugunStr(),
    YapildigiSaat: Number(req.body.YapildigiSaat || 0),
    BakimTuru: req.body.BakimTuru || 'Periyodik Bakım',
    BakimiYapan: req.body.BakimiYapan || 'Fabrika İçi Bakım Ekibi',
    Maliyet: Number(req.body.Maliyet || 0),
    DegisenParcalar: req.body.DegisenParcalar || '',
    Aciklama: req.body.Aciklama || ''
  };

  if (isDbConnected && detectedTables.makineBakimlar) {
    try {
      const cols = await getTableColumns(detectedTables.makineBakimlar);
      const idCol = cols.find(c => ['bakimid', 'id', 'bakim_id'].includes(c.toLowerCase())) || 'BakimId';
      const mapCol = (candidates: string[]) => cols.find(c => candidates.some(cand => cand.toLowerCase() === c.toLowerCase()));

      const rowData: any = {};
      const tarihCol = mapCol(['BakimTarihi', 'bakimtarihi', 'tarih']);
      if (tarihCol) rowData[tarihCol] = guncelData.BakimTarihi;

      const saatCol = mapCol(['YapildigiSaat', 'yapildigisaat', 'saat']);
      if (saatCol) rowData[saatCol] = guncelData.YapildigiSaat;

      const turCol = mapCol(['BakimTuru', 'bakimturu']);
      if (turCol) rowData[turCol] = guncelData.BakimTuru;

      const yapanCol = mapCol(['BakimiYapan', 'bakimiyapan']);
      if (yapanCol) rowData[yapanCol] = guncelData.BakimiYapan;

      const maliyetCol = mapCol(['Maliyet', 'maliyet']);
      if (maliyetCol) rowData[maliyetCol] = guncelData.Maliyet;

      const parcaCol = mapCol(['DegisenParcalar', 'degisenparcalar']);
      if (parcaCol) rowData[parcaCol] = guncelData.DegisenParcalar;

      const aciklamaCol = mapCol(['Aciklama', 'aciklama']);
      if (aciklamaCol) rowData[aciklamaCol] = guncelData.Aciklama;

      const keys = Object.keys(rowData);
      if (keys.length > 0) {
        const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
        await pool.query(`UPDATE ${detectedTables.makineBakimlar} SET ${setClause} WHERE "${idCol}" = $${keys.length + 1}`, [...keys.map(k => rowData[k]), bakimId]);
      }

      if (req.body.Belgeler && Array.isArray(req.body.Belgeler)) {
        await saveMakineBakimBelgelerToDb(bakimId, req.body.Belgeler);
      }

      return res.json({
        BakimId: bakimId,
        MakineId: makineId,
        ...guncelData,
        Belgeler: req.body.Belgeler || [],
        FotoSayisi: (req.body.Belgeler || []).length
      });
    } catch (err: any) {
      console.error('[DB UPDATE MAKINE BAKIM ERROR]', err.message);
    }
  }

  const makine = memMakineler.find(m => m.MakineId === makineId);
  if (makine && makine.BakimGecmisi) {
    const idx = makine.BakimGecmisi.findIndex(b => b.BakimId === bakimId);
    if (idx !== -1) {
      makine.BakimGecmisi[idx] = {
        ...makine.BakimGecmisi[idx],
        ...guncelData,
        Belgeler: req.body.Belgeler || makine.BakimGecmisi[idx].Belgeler || [],
        FotoSayisi: (req.body.Belgeler || makine.BakimGecmisi[idx].Belgeler || []).length
      };
      return res.json(makine.BakimGecmisi[idx]);
    }
  }
  res.status(404).json({ error: 'Bakım kaydı bulunamadı' });
});

app.delete('/api/makineler/:id/bakimlar/:bakimId', async (req, res) => {
  const makineId = parseInt(req.params.id);
  const bakimId = parseInt(req.params.bakimId);

  if (isDbConnected && detectedTables.makineBakimlar) {
    try {
      await deleteMakineBakimBelgelerFromDb(bakimId);
      const cols = await getTableColumns(detectedTables.makineBakimlar);
      const idCol = cols.find(c => ['bakimid', 'id', 'bakim_id'].includes(c.toLowerCase())) || 'BakimId';
      await pool.query(`DELETE FROM ${detectedTables.makineBakimlar} WHERE "${idCol}" = $1`, [bakimId]);
      return res.json({ success: true, bakimId });
    } catch (err: any) {
      console.error('[DB DELETE MAKINE BAKIM ERROR]', err.message);
    }
  }

  const makine = memMakineler.find(m => m.MakineId === makineId);
  if (makine && makine.BakimGecmisi) {
    makine.BakimGecmisi = makine.BakimGecmisi.filter(b => b.BakimId !== bakimId);
    return res.json({ success: true, bakimId });
  }
  res.status(404).json({ error: 'Bakım kaydı bulunamadı' });
});

// =========================================================================
// 10. Günlük Puantaj ve Mesai Ayarları
// =========================================================================
app.get('/api/puantajlar', async (req, res) => {
  const tarih = req.query.tarih as string;
  const list = await getPuantajlarList(tarih);
  res.json(list);
});

app.post('/api/puantajlar', async (req, res) => {
  const { tarih, satirlar } = req.body;
  if (!Array.isArray(satirlar)) return res.status(400).json({ error: 'Geçersiz veri' });

  // İzinli personelleri tespit et
  const tumIzinler = await getIzinlerList();
  const gununIzinlileri = tumIzinler.filter(iz => 
    iz.Durum === 'Onaylandı' && !iz.SilindiMi && tarih >= iz.BaslangicTarihi && tarih <= iz.BitisTarihi
  );

  // İzinli personelin puantajını otomatik olarak izne sabitle ve çalışma/mesai saatlerini 0 yap
  const filtrelenmisSatirlar = satirlar.map((s: any) => {
    const aktifIzin = gununIzinlileri.find(iz => iz.PersonelId === s.PersonelId);
    if (aktifIzin) {
      let izinKodu = 'YI';
      if (aktifIzin.IzinTuru === 'Ücretsiz İzin') izinKodu = 'UI';
      else if (aktifIzin.IzinTuru === 'Hastalık / Rapor') izinKodu = 'R';
      else if (aktifIzin.IzinTuru === 'Mazeret İzni') izinKodu = 'M';

      return {
        ...s,
        DurumKodu: izinKodu,
        NormalCalismaSaati: 0,
        FazlaMesaiSaati: 0,
        HaftaTatiliMesaiSaati: 0,
        ResmiTatilMesaiSaati: 0,
        SaatlikKesintiUcretsiz: 0,
        Aciklama: s.Aciklama || `Onaylı ${aktifIzin.IzinTuru} İzninde (${aktifIzin.BaslangicTarihi} - ${aktifIzin.BitisTarihi})`
      };
    }
    return s;
  });

  if (isDbConnected && detectedTables.puantajlar) {
    try {
      // Önce o günün puantajını temizle
      await pool.query(`DELETE FROM ${detectedTables.puantajlar} WHERE "Tarih"::date = $1::date`, [tarih]);
      
      for (const s of filtrelenmisSatirlar) {
        const q = `
          INSERT INTO ${detectedTables.puantajlar}
          ("PersonelId", "Tarih", "DurumKodu", "NormalCalismaSaati", "FazlaMesaiSaati", "HaftaTatiliMesaiSaati", "ResmiTatilMesaiSaati", "SaatlikKesintiUcretsiz", "Aciklama")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        await pool.query(q, [
          s.PersonelId, tarih, s.DurumKodu || 'N', s.NormalCalismaSaati || 0,
          s.FazlaMesaiSaati || 0, s.HaftaTatiliMesaiSaati || 0, s.ResmiTatilMesaiSaati || 0,
          s.SaatlikKesintiUcretsiz || 0, s.Aciklama || ''
        ]);
      }
      return res.json({ success: true, count: filtrelenmisSatirlar.length });
    } catch (err: any) {
      console.error('[DB PUANTAJ SAVE ERROR]', err.message);
    }
  }

  // Hafızada güncelle
  memPuantajlar = memPuantajlar.filter(p => p.Tarih !== tarih);
  filtrelenmisSatirlar.forEach((s: any) => {
    memPuantajlar.push({ ...s, Tarih: tarih, PuantajId: Date.now() + Math.random() });
  });
  res.json({ success: true, count: filtrelenmisSatirlar.length });
});

// Günlük Puantaj Sil (Kayıtlı Günü Silme)
app.delete('/api/puantajlar', async (req, res) => {
  const tarih = req.query.tarih as string;
  if (!tarih) return res.status(400).json({ error: 'Tarih parametresi gerekli' });

  if (isDbConnected && detectedTables.puantajlar) {
    try {
      await pool.query(`DELETE FROM ${detectedTables.puantajlar} WHERE "Tarih"::date = $1::date`, [tarih]);
      memPuantajlar = memPuantajlar.filter(p => p.Tarih !== tarih);
      return res.json({ success: true, message: `${tarih} tarihli puantaj kayıtları başarıyla silindi` });
    } catch (err: any) {
      console.error('[DB PUANTAJ DELETE ERROR]', err.message);
    }
  }

  memPuantajlar = memPuantajlar.filter(p => p.Tarih !== tarih);
  res.json({ success: true, message: `${tarih} tarihli puantaj kayıtları başarıyla silindi` });
});

app.get('/api/mesai-ayarlari', (req, res) => {
  res.json(memMesaiAyarlari);
});

app.put('/api/mesai-ayarlari', async (req, res) => {
  memMesaiAyarlari = {
    ...memMesaiAyarlari,
    ...req.body
  };
  res.json(memMesaiAyarlari);
});

// =========================================================================
// 11. İSG & KKD Zimmet & Sağlık & Eğitim
// =========================================================================
app.get('/api/isg/zimmetler', async (req, res) => {
  const pId = req.query.personelId ? parseInt(req.query.personelId as string) : undefined;
  const list = await getKkdZimmetlerList(pId);
  res.json(list);
});

app.post('/api/isg/zimmetler', async (req, res) => {
  try {
    const isArray = Array.isArray(req.body);
    const payloads = isArray ? req.body : [req.body];
    const results: any[] = [];

    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      const yeni = {
        ZimmetId: Date.now() + i,
        PersonelId: Number(payload.PersonelId),
        MalzemeAdi: payload.MalzemeAdi || 'İş Ayakkabısı',
        StandartNo: payload.StandartNo || 'CE',
        VerilisTarihi: formatDate(payload.VerilisTarihi) || getBugunStr(),
        YenilemePeriyoduAy: Number(payload.YenilemePeriyoduAy || 12),
        Adet: Number(payload.Adet || 1),
        BedenNo: payload.BedenNo || 'Standart',
        Aciklama: payload.Aciklama || '',
        TeslimEdildiMi: true,
        IadeEdildiMi: false
      };

      if (isDbConnected && detectedTables.kkdZimmetler) {
        try {
          const q = `
            INSERT INTO ${detectedTables.kkdZimmetler}
            ("PersonelId", "MalzemeAdi", "StandartNo", "VerilisTarihi", "YenilemePeriyoduAy", "Adet", "BedenNo", "Aciklama", "TeslimEdildiMi", "IadeEdildiMi")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false)
            RETURNING *
          `;
          const resKkd = await pool.query(q, [
            yeni.PersonelId, yeni.MalzemeAdi, yeni.StandartNo, yeni.VerilisTarihi,
            yeni.YenilemePeriyoduAy, yeni.Adet, yeni.BedenNo, yeni.Aciklama
          ]);
          if (resKkd.rows.length > 0) {
            results.push(normalizeKkdZimmet(resKkd.rows[0]));
            continue;
          }
        } catch (err: any) {
          console.error('[DB INSERT KKD ERROR]', err.message);
        }
      }

      memKkdZimmetler.unshift(yeni);
      results.push(yeni);
    }

    res.status(201).json(isArray ? results : results[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/isg/zimmetler/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isDbConnected && detectedTables.kkdZimmetler) {
    try {
      await pool.query(`DELETE FROM ${detectedTables.kkdZimmetler} WHERE "ZimmetId" = $1`, [id]);
      return res.json({ success: true });
    } catch (err: any) {
      console.error('[DB DELETE KKD ERROR]', err.message);
    }
  }
  memKkdZimmetler = memKkdZimmetler.filter(z => z.ZimmetId !== id);
  res.json({ success: true });
});

app.get('/api/isg/saglik-raporlari', async (req, res) => {
  const list = await getSaglikRaporlariList();
  res.json(list);
});

app.post('/api/isg/saglik-raporlari', async (req, res) => {
  const yeni = {
    RaporId: Date.now(),
    PersonelId: Number(req.body.PersonelId),
    MuayeneTuru: req.body.MuayeneTuru || 'Periyodik Sağlık Muayenesi',
    MuayeneTarihi: formatDate(req.body.MuayeneTarihi) || getBugunStr(),
    GecerlilikSuresiAy: Number(req.body.GecerlilikSuresiAy || 12),
    SaglikKurulusu: req.body.SaglikKurulusu || 'Yetkili OSGB',
    Sonuc: req.body.Sonuc || 'Çalışmaya Uygundur',
    RaporNo: req.body.RaporNo || '',
    Aciklama: req.body.Aciklama || '',
    BelgeUrl: req.body.BelgeUrl || '',
    BelgeAdi: req.body.BelgeAdi || ''
  };

  if (isDbConnected && detectedTables.saglikRaporlari) {
    try {
      const inserted = await saveSaglikRaporuToDb(null, yeni, true);
      if (inserted) {
        memSaglikRaporlari.unshift(inserted);
        return res.status(201).json(inserted);
      }
    } catch (err: any) {
      console.error('[DB INSERT SAGLIK ERROR]', err.message);
    }
  }

  memSaglikRaporlari.unshift(yeni);
  res.status(201).json(yeni);
});

app.put('/api/isg/saglik-raporlari/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const up = {
    PersonelId: Number(req.body.PersonelId),
    MuayeneTuru: req.body.MuayeneTuru || 'Periyodik Sağlık Muayenesi',
    MuayeneTarihi: formatDate(req.body.MuayeneTarihi) || getBugunStr(),
    GecerlilikSuresiAy: Number(req.body.GecerlilikSuresiAy || 12),
    SaglikKurulusu: req.body.SaglikKurulusu || 'Yetkili OSGB',
    Sonuc: req.body.Sonuc || 'Çalışmaya Uygundur',
    RaporNo: req.body.RaporNo || '',
    Aciklama: req.body.Aciklama || '',
    BelgeUrl: req.body.BelgeUrl || '',
    BelgeAdi: req.body.BelgeAdi || ''
  };

  if (isDbConnected && detectedTables.saglikRaporlari) {
    try {
      const updated = await saveSaglikRaporuToDb(id, up, false);
      if (updated) {
        const idx = memSaglikRaporlari.findIndex(r => r.RaporId === id);
        if (idx !== -1) memSaglikRaporlari[idx] = updated;
        else memSaglikRaporlari.unshift(updated);
        return res.json(updated);
      }
    } catch (err: any) {
      console.error('[DB UPDATE SAGLIK ERROR]', err.message);
    }
  }

  const idx = memSaglikRaporlari.findIndex(r => r.RaporId === id);
  if (idx !== -1) {
    memSaglikRaporlari[idx] = { ...memSaglikRaporlari[idx], ...up };
    return res.json(memSaglikRaporlari[idx]);
  }
  res.status(404).json({ error: 'Rapor bulunamadı' });
});

app.delete('/api/isg/saglik-raporlari/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isDbConnected && detectedTables.saglikRaporlari) {
    try {
      const cols = await getTableColumns(detectedTables.saglikRaporlari);
      const idCol = cols.find(c => ['raporid', 'id', 'rapor_id'].includes(c.toLowerCase())) || 'RaporId';
      await pool.query(`DELETE FROM ${detectedTables.saglikRaporlari} WHERE "${idCol}" = $1`, [id]);
      memSaglikRaporlari = memSaglikRaporlari.filter(r => r.RaporId !== id);
      return res.json({ success: true });
    } catch (err: any) {
      console.error('[DB DELETE SAGLIK ERROR]', err.message);
    }
  }
  memSaglikRaporlari = memSaglikRaporlari.filter(r => r.RaporId !== id);
  res.json({ success: true });
});

app.get('/api/isg/egitimler', async (req, res) => {
  const list = await getIsgEgitimleriList();
  res.json(list);
});

app.post('/api/isg/egitimler', async (req, res) => {
  const yeni = {
    EgitimId: Date.now(),
    PersonelId: Number(req.body.PersonelId),
    EgitimAdi: req.body.EgitimAdi || req.body.EgitimKonusu || 'Temel İSG Eğitimi',
    EgitimKonusu: req.body.EgitimAdi || req.body.EgitimKonusu || 'Temel İSG Eğitimi',
    EgitimTarihi: formatDate(req.body.EgitimTarihi) || getBugunStr(),
    GecerlilikAy: Number(req.body.GecerlilikAy || 24),
    EgitimSuresiSaat: Number(req.body.EgitimSuresiSaat || 12),
    EgitimciKurum: req.body.EgitimciKurum || req.body.EgiticiAdSoyad || 'Yetkili OSGB',
    BelgeNo: req.body.BelgeNo || '',
    Aciklama: req.body.Aciklama || '',
    BelgeUrl: req.body.BelgeUrl || '',
    BelgeAdi: req.body.BelgeAdi || ''
  };

  if (isDbConnected && detectedTables.isgEgitimleri) {
    try {
      const inserted = await saveIsgEgitimToDb(null, yeni, true);
      if (inserted) {
        memIsgEgitimleri.unshift(inserted);
        return res.status(201).json(inserted);
      }
    } catch (err: any) {
      console.error('[DB INSERT EGITIM ERROR]', err.message);
    }
  }

  memIsgEgitimleri.unshift(yeni);
  res.status(201).json(yeni);
});

app.put('/api/isg/egitimler/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const up = {
    PersonelId: Number(req.body.PersonelId),
    EgitimAdi: req.body.EgitimAdi || req.body.EgitimKonusu || 'Temel İSG Eğitimi',
    EgitimKonusu: req.body.EgitimAdi || req.body.EgitimKonusu || 'Temel İSG Eğitimi',
    EgitimTarihi: formatDate(req.body.EgitimTarihi) || getBugunStr(),
    GecerlilikAy: Number(req.body.GecerlilikAy || 24),
    EgitimSuresiSaat: Number(req.body.EgitimSuresiSaat || 12),
    EgitimciKurum: req.body.EgitimciKurum || req.body.EgiticiAdSoyad || 'Yetkili OSGB',
    BelgeNo: req.body.BelgeNo || '',
    Aciklama: req.body.Aciklama || '',
    BelgeUrl: req.body.BelgeUrl || '',
    BelgeAdi: req.body.BelgeAdi || ''
  };

  if (isDbConnected && detectedTables.isgEgitimleri) {
    try {
      const updated = await saveIsgEgitimToDb(id, up, false);
      if (updated) {
        const idx = memIsgEgitimleri.findIndex(e => e.EgitimId === id);
        if (idx !== -1) memIsgEgitimleri[idx] = updated;
        else memIsgEgitimleri.unshift(updated);
        return res.json(updated);
      }
    } catch (err: any) {
      console.error('[DB UPDATE EGITIM ERROR]', err.message);
    }
  }

  const idx = memIsgEgitimleri.findIndex(e => e.EgitimId === id);
  if (idx !== -1) {
    memIsgEgitimleri[idx] = { ...memIsgEgitimleri[idx], ...up };
    return res.json(memIsgEgitimleri[idx]);
  }
  res.status(404).json({ error: 'Eğitim bulunamadı' });
});

app.delete('/api/isg/egitimler/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isDbConnected && detectedTables.isgEgitimleri) {
    try {
      const cols = await getTableColumns(detectedTables.isgEgitimleri);
      const idCol = cols.find(c => ['egitimid', 'id', 'egitim_id'].includes(c.toLowerCase())) || 'EgitimId';
      await pool.query(`DELETE FROM ${detectedTables.isgEgitimleri} WHERE "${idCol}" = $1`, [id]);
      memIsgEgitimleri = memIsgEgitimleri.filter(e => e.EgitimId !== id);
      return res.json({ success: true });
    } catch (err: any) {
      console.error('[DB DELETE EGITIM ERROR]', err.message);
    }
  }
  memIsgEgitimleri = memIsgEgitimleri.filter(e => e.EgitimId !== id);
  res.json({ success: true });
});

// =========================================================================
// 12. Proje Aşama Şablonları
// =========================================================================
app.get('/api/proje-sablonlari', async (req, res) => {
  if (isDbConnected && detectedTables.projeSablonlar) {
    try {
      const sRes = await pool.query(`SELECT * FROM ${detectedTables.projeSablonlar} ORDER BY "SiraNo" ASC`);
      if (sRes.rows.length > 0) {
        return res.json(sRes.rows.map((row: any) => ({
          Id: Number(getProp(row, 'Id', 'id')),
          Seviye: Number(getProp(row, 'Seviye', 'seviye') || 1),
          SiraNo: Number(getProp(row, 'SiraNo', 'sirano') || 1),
          AsamaAdi: String(getProp(row, 'AsamaAdi', 'asamaadi') || ''),
          TahminiSureGun: Number(getProp(row, 'TahminiSureGun', 'tahminisuregun') || 3)
        })));
      }
    } catch (e) {}
  }
  res.json(memProjeSablonlari);
});

// =========================================================================
// 13. Dışarıdan Yevmiyeci Çalışanlar & Dönemsel Ustalar (Proje Bazlı)
// =========================================================================
async function getYevmiyecilerList(): Promise<any[]> {
  if (isDbConnected && detectedTables.yevmiyeciler) {
    try {
      const q = `SELECT * FROM ${detectedTables.yevmiyeciler} ORDER BY 1 DESC`;
      const resY = await pool.query(q);
      return resY.rows.map(normalizeYevmiyeci);
    } catch (e: any) {
      console.error('[DB YEVMIYECILER GET ERROR]', e.message);
    }
  }
  return isDbConnected ? [] : memYevmiyeciler;
}

app.get('/api/yevmiyeciler', async (req, res) => {
  const list = await getYevmiyecilerList();
  res.json(list);
});

app.post('/api/yevmiyeciler', async (req, res) => {
  const yeni: any = {
    YevmiyeciId: Date.now(),
    AdSoyad: req.body.AdSoyad || 'Yeni Yevmiyeci',
    Telefon: req.body.Telefon || '',
    TcKimlikNo: req.body.TcKimlikNo || '',
    IbanNo: req.body.IbanNo || '',
    UzmanlikAlani: req.body.UzmanlikAlani || 'Montaj Ustası',
    GunlukYevmiye: Number(req.body.GunlukYevmiye || 0),
    Durum: req.body.Durum || 'Musait',
    AktifProjeId: req.body.AktifProjeId ? Number(req.body.AktifProjeId) : null,
    AktifProjeAdi: req.body.AktifProjeAdi || null,
    Puan: Number(req.body.Puan || 5),
    Guvenilirlik: req.body.Guvenilirlik || 'CokIyi',
    Fotograf: req.body.Fotograf || '',
    Notlar: req.body.Notlar || '',
    IkametSehir: req.body.IkametSehir || '',
    KayitTarihi: getBugunStr(),
    CalismaGecmisi: Array.isArray(req.body.CalismaGecmisi) ? req.body.CalismaGecmisi : [],
    Belgeler: Array.isArray(req.body.Belgeler) ? req.body.Belgeler : []
  };

  if (isDbConnected && detectedTables.yevmiyeciler) {
    try {
      const cols = await getTableColumns(detectedTables.yevmiyeciler);
      const colMap: Record<string, string> = {};
      cols.forEach(c => {
        colMap[c.toLowerCase()] = c;
      });
      const mapCol = (name: string) => colMap[name.toLowerCase()] || name;

      const insertData: Record<string, any> = {};
      insertData[mapCol('AdSoyad')] = yeni.AdSoyad;
      insertData[mapCol('Telefon')] = yeni.Telefon;
      insertData[mapCol('TcKimlikNo')] = yeni.TcKimlikNo;
      insertData[mapCol('IbanNo')] = yeni.IbanNo;
      insertData[mapCol('UzmanlikAlani')] = yeni.UzmanlikAlani;
      insertData[mapCol('GunlukYevmiye')] = yeni.GunlukYevmiye;
      insertData[mapCol('Durum')] = yeni.Durum;
      insertData[mapCol('AktifProjeId')] = yeni.AktifProjeId;
      insertData[mapCol('AktifProjeAdi')] = yeni.AktifProjeAdi;
      insertData[mapCol('Puan')] = yeni.Puan;
      insertData[mapCol('Guvenilirlik')] = yeni.Guvenilirlik;
      insertData[mapCol('Fotograf')] = yeni.Fotograf;
      insertData[mapCol('Notlar')] = yeni.Notlar;
      insertData[mapCol('IkametSehir')] = yeni.IkametSehir;
      insertData[mapCol('KayitTarihi')] = yeni.KayitTarihi;
      insertData[mapCol('CalismaGecmisi')] = JSON.stringify(yeni.CalismaGecmisi);
      insertData[mapCol('Belgeler')] = JSON.stringify(yeni.Belgeler);

      const validKeys = Object.keys(insertData).filter(k => cols.length === 0 || cols.includes(k));
      const colNames = validKeys.map(k => `"${k}"`).join(', ');
      const valPlaceholders = validKeys.map((_, idx) => `$${idx + 1}`).join(', ');
      const values = validKeys.map(k => insertData[k]);

      const q = `
        INSERT INTO ${detectedTables.yevmiyeciler} (${colNames})
        VALUES (${valPlaceholders})
        RETURNING *
      `;
      const resY = await pool.query(q, values);
      if (resY.rows.length > 0) return res.status(201).json(normalizeYevmiyeci(resY.rows[0]));
    } catch (e: any) {
      console.error('[DB YEVMIYECI INSERT ERROR]', e.message);
    }
  }

  memYevmiyeciler.unshift(yeni);
  res.status(201).json(yeni);
});

app.put('/api/yevmiyeciler/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const body = req.body;

  if (isDbConnected && detectedTables.yevmiyeciler) {
    try {
      const cols = await getTableColumns(detectedTables.yevmiyeciler);
      const colMap: Record<string, string> = {};
      cols.forEach(c => { colMap[c.toLowerCase()] = c; });
      const mapCol = (name: string) => colMap[name.toLowerCase()] || name;
      const idCol = cols.find(c => ['yevmiyeciid', 'id', 'yevmiyeci_id'].includes(c.toLowerCase())) || 'YevmiyeciId';

      const updateData: Record<string, any> = {};
      if (body.AdSoyad !== undefined) updateData[mapCol('AdSoyad')] = body.AdSoyad;
      if (body.Telefon !== undefined) updateData[mapCol('Telefon')] = body.Telefon;
      if (body.TcKimlikNo !== undefined) updateData[mapCol('TcKimlikNo')] = body.TcKimlikNo;
      if (body.IbanNo !== undefined) updateData[mapCol('IbanNo')] = body.IbanNo;
      if (body.UzmanlikAlani !== undefined) updateData[mapCol('UzmanlikAlani')] = body.UzmanlikAlani;
      if (body.GunlukYevmiye !== undefined) updateData[mapCol('GunlukYevmiye')] = Number(body.GunlukYevmiye);
      if (body.Durum !== undefined) updateData[mapCol('Durum')] = body.Durum;
      if (body.AktifProjeId !== undefined) updateData[mapCol('AktifProjeId')] = body.AktifProjeId ? Number(body.AktifProjeId) : null;
      if (body.AktifProjeAdi !== undefined) updateData[mapCol('AktifProjeAdi')] = body.AktifProjeAdi || null;
      if (body.Puan !== undefined) updateData[mapCol('Puan')] = Number(body.Puan);
      if (body.Guvenilirlik !== undefined) updateData[mapCol('Guvenilirlik')] = body.Guvenilirlik;
      if (body.Fotograf !== undefined) updateData[mapCol('Fotograf')] = body.Fotograf;
      if (body.Notlar !== undefined) updateData[mapCol('Notlar')] = body.Notlar;
      if (body.IkametSehir !== undefined) updateData[mapCol('IkametSehir')] = body.IkametSehir;
      if (body.CalismaGecmisi !== undefined) updateData[mapCol('CalismaGecmisi')] = JSON.stringify(body.CalismaGecmisi);
      if (body.Belgeler !== undefined) updateData[mapCol('Belgeler')] = JSON.stringify(body.Belgeler);

      const validKeys = Object.keys(updateData).filter(k => cols.length === 0 || cols.includes(k));
      if (validKeys.length > 0) {
        const setClauses = validKeys.map((k, idx) => `"${k}" = $${idx + 1}`).join(', ');
        const values = validKeys.map(k => updateData[k]);
        values.push(id);

        const q = `
          UPDATE ${detectedTables.yevmiyeciler}
          SET ${setClauses}
          WHERE "${idCol}" = $${values.length}
          RETURNING *
        `;
        const resY = await pool.query(q, values);
        if (resY.rows.length > 0) return res.json(normalizeYevmiyeci(resY.rows[0]));
      }
    } catch (e: any) {
      console.error('[DB YEVMIYECI UPDATE ERROR]', e.message);
    }
  }

  const idx = memYevmiyeciler.findIndex(y => y.YevmiyeciId === id);
  if (idx !== -1) {
    memYevmiyeciler[idx] = { ...memYevmiyeciler[idx], ...body, YevmiyeciId: id };
    return res.json(memYevmiyeciler[idx]);
  }
  res.status(404).json({ error: 'Yevmiyeci bulunamadı' });
});

app.post('/api/yevmiyeciler/:id/projeden-cikar', async (req, res) => {
  const id = parseInt(req.params.id);
  const bugun = getBugunStr();

  if (isDbConnected && detectedTables.yevmiyeciler) {
    try {
      const cols = await getTableColumns(detectedTables.yevmiyeciler);
      const colMap: Record<string, string> = {};
      cols.forEach(c => { colMap[c.toLowerCase()] = c; });
      const mapCol = (name: string) => colMap[name.toLowerCase()] || name;
      const idCol = cols.find(c => ['yevmiyeciid', 'id', 'yevmiyeci_id'].includes(c.toLowerCase())) || 'YevmiyeciId';

      const selRes = await pool.query(`SELECT * FROM ${detectedTables.yevmiyeciler} WHERE "${idCol}" = $1`, [id]);
      if (selRes.rows.length > 0) {
        const yevmiyeci = normalizeYevmiyeci(selRes.rows[0]);
        let updatedGecmis = Array.isArray(yevmiyeci.CalismaGecmisi) ? [...yevmiyeci.CalismaGecmisi] : [];
        const oldProjeId = yevmiyeci.AktifProjeId;
        const oldProjeAdi = yevmiyeci.AktifProjeAdi || req.body?.ProjeAdi;

        if (oldProjeAdi || oldProjeId) {
          // Var olan kayıt var mı kontrol et
          const existingIdx = updatedGecmis.findIndex(g => 
            (oldProjeId && g.ProjeId === oldProjeId) || 
            (oldProjeAdi && g.ProjeAdi && g.ProjeAdi.trim().toLowerCase() === oldProjeAdi.trim().toLowerCase())
          );

          if (existingIdx !== -1) {
            updatedGecmis[existingIdx] = {
              ...updatedGecmis[existingIdx],
              BitisTarihi: bugun,
              Aciklama: updatedGecmis[existingIdx].Aciklama || `${oldProjeAdi || 'Proje'} saha görevi tamamlandı (Arşivlendi).`
            };
          } else {
            updatedGecmis.unshift({
              KayitId: `YEV-${Date.now()}`,
              ProjeId: oldProjeId || undefined,
              ProjeAdi: oldProjeAdi || 'Proje/Şantiye',
              BaslangicTarihi: bugun,
              BitisTarihi: bugun,
              GunSayisi: 1,
              GunlukUcret: yevmiyeci.GunlukYevmiye || 2500,
              ToplamUcret: yevmiyeci.GunlukYevmiye || 2500,
              OdemeDurumu: 'Bekliyor',
              Aciklama: `${oldProjeAdi || 'Proje'} saha görevi tamamlandı ve arşive alındı.`
            });
          }
        }

        const updateData: Record<string, any> = {};
        if (cols.some(c => c.toLowerCase() === 'durum')) updateData[mapCol('Durum')] = 'Musait';
        if (cols.some(c => c.toLowerCase() === 'aktifprojeid')) updateData[mapCol('AktifProjeId')] = null;
        if (cols.some(c => c.toLowerCase() === 'aktifprojeadi')) updateData[mapCol('AktifProjeAdi')] = null;
        if (cols.some(c => c.toLowerCase() === 'calismagecmisi')) updateData[mapCol('CalismaGecmisi')] = JSON.stringify(updatedGecmis);

        const validKeys = Object.keys(updateData).filter(k => cols.includes(k));
        if (validKeys.length > 0) {
          const setClauses = validKeys.map((k, idx) => `"${k}" = $${idx + 1}`).join(', ');
          const values = validKeys.map(k => updateData[k]);
          values.push(id);

          const q = `
            UPDATE ${detectedTables.yevmiyeciler}
            SET ${setClauses}
            WHERE "${idCol}" = $${values.length}
            RETURNING *
          `;
          const resY = await pool.query(q, values);
          if (resY.rows.length > 0) return res.json(normalizeYevmiyeci(resY.rows[0]));
        }
      }
    } catch (e: any) {
      console.error('[DB YEVMIYECI PROJEDEN CIKAR ERROR]', e.message);
    }
  }

  const idx = memYevmiyeciler.findIndex(y => y.YevmiyeciId === id);
  if (idx !== -1) {
    const yev = memYevmiyeciler[idx];
    const oldProjeId = yev.AktifProjeId;
    const oldProjeAdi = yev.AktifProjeAdi || req.body?.ProjeAdi;
    let gecmis = Array.isArray(yev.CalismaGecmisi) ? [...yev.CalismaGecmisi] : [];

    if (oldProjeAdi || oldProjeId) {
      const existingIdx = gecmis.findIndex(g => 
        (oldProjeId && g.ProjeId === oldProjeId) || 
        (oldProjeAdi && g.ProjeAdi && g.ProjeAdi.trim().toLowerCase() === oldProjeAdi.trim().toLowerCase())
      );
      if (existingIdx !== -1) {
        gecmis[existingIdx] = {
          ...gecmis[existingIdx],
          BitisTarihi: bugun,
          Aciklama: gecmis[existingIdx].Aciklama || `${oldProjeAdi || 'Proje'} görevi tamamlandı (Arşivlendi).`
        };
      } else {
        gecmis.unshift({
          KayitId: `YEV-${Date.now()}`,
          ProjeId: oldProjeId || undefined,
          ProjeAdi: oldProjeAdi || 'Proje/Şantiye',
          BaslangicTarihi: bugun,
          BitisTarihi: bugun,
          GunSayisi: 1,
          GunlukUcret: yev.GunlukYevmiye || 2500,
          ToplamUcret: yev.GunlukYevmiye || 2500,
          OdemeDurumu: 'Bekliyor',
          Aciklama: `${oldProjeAdi || 'Proje'} görevi tamamlandı ve arşive alındı.`
        });
      }
    }

    memYevmiyeciler[idx].Durum = 'Musait';
    memYevmiyeciler[idx].AktifProjeId = null;
    memYevmiyeciler[idx].AktifProjeAdi = null;
    memYevmiyeciler[idx].CalismaGecmisi = gecmis;
    return res.json(memYevmiyeciler[idx]);
  }
  res.status(404).json({ error: 'Yevmiyeci bulunamadı' });
});

app.delete('/api/yevmiyeciler/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isDbConnected && detectedTables.yevmiyeciler) {
    try {
      const cols = await getTableColumns(detectedTables.yevmiyeciler);
      const idCol = cols.find(c => ['yevmiyeciid', 'id', 'yevmiyeci_id'].includes(c.toLowerCase())) || 'YevmiyeciId';
      await pool.query(`DELETE FROM ${detectedTables.yevmiyeciler} WHERE "${idCol}" = $1`, [id]);
      memYevmiyeciler = memYevmiyeciler.filter(y => y.YevmiyeciId !== id);
      return res.json({ success: true });
    } catch (e: any) {
      console.error('[DB YEVMIYECI DELETE ERROR]', e.message);
    }
  }
  memYevmiyeciler = memYevmiyeciler.filter(y => y.YevmiyeciId !== id);
  res.json({ success: true });
});

app.post('/api/yevmiyeciler/:id/calisma-ekle', async (req, res) => {
  const id = parseInt(req.params.id);
  const yeniCalisma = {
    KayitId: `YEV-${Date.now()}`,
    ProjeId: req.body.ProjeId ? Number(req.body.ProjeId) : undefined,
    ProjeAdi: req.body.ProjeAdi || 'Belirtilmemiş Proje',
    BaslangicTarihi: req.body.BaslangicTarihi || getBugunStr(),
    BitisTarihi: req.body.BitisTarihi || getBugunStr(),
    GunSayisi: Number(req.body.GunSayisi || 1),
    GunlukUcret: Number(req.body.GunlukUcret || 0),
    ToplamUcret: Number(req.body.ToplamUcret || (Number(req.body.GunSayisi || 1) * Number(req.body.GunlukUcret || 0))),
    OdemeDurumu: req.body.OdemeDurumu || 'Bekliyor',
    Aciklama: req.body.Aciklama || ''
  };

  if (isDbConnected && detectedTables.yevmiyeciler) {
    try {
      const cols = await getTableColumns(detectedTables.yevmiyeciler);
      const colMap: Record<string, string> = {};
      cols.forEach(c => { colMap[c.toLowerCase()] = c; });
      const mapCol = (name: string) => colMap[name.toLowerCase()] || name;
      const idCol = cols.find(c => ['yevmiyeciid', 'id', 'yevmiyeci_id'].includes(c.toLowerCase())) || 'YevmiyeciId';

      const selRes = await pool.query(`SELECT * FROM ${detectedTables.yevmiyeciler} WHERE "${idCol}" = $1`, [id]);
      if (selRes.rows.length > 0) {
        const yevmiyeci = normalizeYevmiyeci(selRes.rows[0]);
        const updatedCalismaGecmisi = [yeniCalisma, ...(yevmiyeci.CalismaGecmisi || [])];
        const newDurum = req.body.Durum || yevmiyeci.Durum;
        const newAktifProjeId = req.body.ProjeId !== undefined ? (req.body.ProjeId ? Number(req.body.ProjeId) : null) : yevmiyeci.AktifProjeId;
        const newAktifProjeAdi = req.body.ProjeAdi !== undefined ? req.body.ProjeAdi : yevmiyeci.AktifProjeAdi;

        const updateData: Record<string, any> = {};
        updateData[mapCol('CalismaGecmisi')] = JSON.stringify(updatedCalismaGecmisi);
        updateData[mapCol('Durum')] = newDurum;
        if (newAktifProjeId !== undefined) updateData[mapCol('AktifProjeId')] = newAktifProjeId;
        if (newAktifProjeAdi !== undefined) updateData[mapCol('AktifProjeAdi')] = newAktifProjeAdi;

        const validKeys = Object.keys(updateData).filter(k => cols.length === 0 || cols.includes(k));
        const setClauses = validKeys.map((k, idx) => `"${k}" = $${idx + 1}`).join(', ');
        const values = validKeys.map(k => updateData[k]);
        values.push(id);

        const updateRes = await pool.query(`
          UPDATE ${detectedTables.yevmiyeciler}
          SET ${setClauses}
          WHERE "${idCol}" = $${values.length}
          RETURNING *
        `, values);
        if (updateRes.rows.length > 0) {
          return res.json(normalizeYevmiyeci(updateRes.rows[0]));
        }
      }
    } catch (e: any) {
      console.error('[DB YEVMIYECI CALISMA EKLE ERROR]', e.message);
    }
  }

  const idx = memYevmiyeciler.findIndex(y => y.YevmiyeciId === id);
  if (idx !== -1) {
    memYevmiyeciler[idx].CalismaGecmisi = [yeniCalisma, ...(memYevmiyeciler[idx].CalismaGecmisi || [])];
    if (req.body.Durum) {
      memYevmiyeciler[idx].Durum = req.body.Durum;
      memYevmiyeciler[idx].AktifProjeId = req.body.ProjeId || null;
      memYevmiyeciler[idx].AktifProjeAdi = req.body.ProjeAdi || null;
    }
    return res.json(memYevmiyeciler[idx]);
  }
  res.status(404).json({ error: 'Yevmiyeci bulunamadı' });
});

// =========================================================================
// DEPARTMANLAR & GOREVLER DYNAMIC CRUD
// =========================================================================
app.get('/api/departmanlar', async (req, res) => {
  if (isDbConnected && detectedTables.departmanlar) {
    try {
      const r = await pool.query(`SELECT "Id" AS "Id", "Ad" AS "Ad" FROM ${detectedTables.departmanlar} ORDER BY "Ad" ASC`);
      return res.json(r.rows);
    } catch (e: any) {
      console.error('[DB GET DEPARTMANLAR ERROR]', e.message);
    }
  }
  res.json(memDepartmanlar.sort((a, b) => a.Ad.localeCompare(b.Ad, 'tr')));
});

app.post('/api/departmanlar', async (req, res) => {
  const { Ad } = req.body;
  if (!Ad) return res.status(400).json({ error: 'Departman adı zorunludur' });
  
  if (isDbConnected && detectedTables.departmanlar) {
    try {
      const r = await pool.query(`INSERT INTO ${detectedTables.departmanlar} ("Ad") VALUES ($1) RETURNING *`, [Ad]);
      const inserted = r.rows[0];
      return res.status(201).json({ Id: inserted.Id, Ad: inserted.Ad });
    } catch (e: any) {
      console.error('[DB POST DEPARTMAN ERROR]', e.message);
      return res.status(500).json({ error: e.message });
    }
  }
  
  const yeni = { Id: Date.now(), Ad };
  memDepartmanlar.push(yeni);
  res.status(201).json(yeni);
});

app.delete('/api/departmanlar/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isDbConnected && detectedTables.departmanlar) {
    try {
      const cols = await getTableColumns(detectedTables.departmanlar);
      const idCol = cols.find(c => ['id', 'departmanid', 'Id'].includes(c.toLowerCase())) || 'Id';
      await pool.query(`DELETE FROM ${detectedTables.departmanlar} WHERE "${idCol}" = $1`, [id]);
      return res.json({ success: true });
    } catch (e: any) {
      console.error('[DB DELETE DEPARTMAN ERROR]', e.message);
      return res.status(500).json({ error: e.message });
    }
  }
  memDepartmanlar = memDepartmanlar.filter(d => d.Id !== id);
  res.json({ success: true });
});

app.get('/api/gorevler', async (req, res) => {
  if (isDbConnected && detectedTables.gorevler) {
    try {
      const r = await pool.query(`SELECT "Id" AS "Id", "Ad" AS "Ad" FROM ${detectedTables.gorevler} ORDER BY "Ad" ASC`);
      return res.json(r.rows);
    } catch (e: any) {
      console.error('[DB GET GOREVLER ERROR]', e.message);
    }
  }
  res.json(memGorevler.sort((a, b) => a.Ad.localeCompare(b.Ad, 'tr')));
});

app.post('/api/gorevler', async (req, res) => {
  const { Ad } = req.body;
  if (!Ad) return res.status(400).json({ error: 'Görev adı zorunludur' });

  if (isDbConnected && detectedTables.gorevler) {
    try {
      const r = await pool.query(`INSERT INTO ${detectedTables.gorevler} ("Ad") VALUES ($1) RETURNING *`, [Ad]);
      const inserted = r.rows[0];
      return res.status(201).json({ Id: inserted.Id, Ad: inserted.Ad });
    } catch (e: any) {
      console.error('[DB POST GOREV ERROR]', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  const yeni = { Id: Date.now(), Ad };
  memGorevler.push(yeni);
  res.status(201).json(yeni);
});

app.delete('/api/gorevler/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isDbConnected && detectedTables.gorevler) {
    try {
      const cols = await getTableColumns(detectedTables.gorevler);
      const idCol = cols.find(c => ['id', 'gorevid', 'Id'].includes(c.toLowerCase())) || 'Id';
      await pool.query(`DELETE FROM ${detectedTables.gorevler} WHERE "${idCol}" = $1`, [id]);
      return res.json({ success: true });
    } catch (e: any) {
      console.error('[DB DELETE GOREV ERROR]', e.message);
      return res.status(500).json({ error: e.message });
    }
  }
  memGorevler = memGorevler.filter(g => g.Id !== id);
  res.json({ success: true });
});

// =========================================================================
// GÜVENLİK, PAROLA & OTOMATİK KİLİT (AUTH & INACTIVITY LOCK) SİSTEMİ
// =========================================================================
interface AuthData {
  isProtectionEnabled: boolean;
  masterPassword: string;
  quickPin: string;
  autoLockMinutes: number;
}

let memAuthData: AuthData = {
  isProtectionEnabled: true,
  masterPassword: process.env.ADMIN_PASSWORD || 'rende2026',
  quickPin: '1234',
  autoLockMinutes: 15
};

const activeSessions = new Map<string, { createdAt: number; expiresAt: number; lastActive: number }>();

async function loadAuthSettings(): Promise<AuthData> {
  if (isDbConnected && detectedTables.sistemGuvenlik) {
    try {
      const res = await pool.query(`SELECT * FROM ${detectedTables.sistemGuvenlik} LIMIT 1`);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        memAuthData.masterPassword = String(getProp(row, 'MasterPassword', 'masterpassword', 'parola') || memAuthData.masterPassword);
        memAuthData.quickPin = String(getProp(row, 'QuickPin', 'quickpin', 'pin') || memAuthData.quickPin);
        memAuthData.autoLockMinutes = Number(getProp(row, 'AutoLockMinutes', 'autolockminutes', 'dakika') || 15);
        memAuthData.isProtectionEnabled = Boolean(getProp(row, 'IsProtectionEnabled', 'isprotectionenabled') ?? true);
      } else {
        await pool.query(`
          INSERT INTO ${detectedTables.sistemGuvenlik} ("Id", "MasterPassword", "QuickPin", "AutoLockMinutes", "IsProtectionEnabled")
          VALUES (1, $1, $2, $3, $4)
        `, [memAuthData.masterPassword, memAuthData.quickPin, memAuthData.autoLockMinutes, memAuthData.isProtectionEnabled]);
      }
    } catch (e: any) {
      console.log('[DB] Sistem güvenlik tablosu okuma hatası:', e.message);
    }
  }
  return memAuthData;
}

async function saveAuthSettings(data: Partial<AuthData>) {
  Object.assign(memAuthData, data);
  if (isDbConnected && detectedTables.sistemGuvenlik) {
    try {
      await pool.query(`
        INSERT INTO ${detectedTables.sistemGuvenlik} ("Id", "MasterPassword", "QuickPin", "AutoLockMinutes", "IsProtectionEnabled")
        VALUES (1, $1, $2, $3, $4)
        ON CONFLICT ("Id") DO UPDATE 
        SET "MasterPassword" = EXCLUDED."MasterPassword",
            "QuickPin" = EXCLUDED."QuickPin",
            "AutoLockMinutes" = EXCLUDED."AutoLockMinutes",
            "IsProtectionEnabled" = EXCLUDED."IsProtectionEnabled"
      `, [memAuthData.masterPassword, memAuthData.quickPin, memAuthData.autoLockMinutes, memAuthData.isProtectionEnabled]);
    } catch (e: any) {
      console.error('[DB] Sistem güvenlik kaydetme hatası:', e.message);
    }
  }
}

app.get('/api/auth/status', async (req, res) => {
  await loadAuthSettings();
  res.json({
    isProtectionEnabled: memAuthData.isProtectionEnabled,
    autoLockMinutes: memAuthData.autoLockMinutes,
    hasPin: Boolean(memAuthData.quickPin && memAuthData.quickPin.length > 0),
    hasCustomPassword: memAuthData.masterPassword !== 'rende2026'
  });
});

app.post('/api/auth/login', async (req, res) => {
  await loadAuthSettings();
  const { password, rememberMe } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, error: 'Lütfen parola giriniz.' });
  }
  const cleanPass = String(password).trim();
  if (cleanPass === memAuthData.masterPassword || (memAuthData.quickPin && cleanPass === memAuthData.quickPin)) {
    const token = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    activeSessions.set(token, {
      createdAt: Date.now(),
      expiresAt: Date.now() + duration,
      lastActive: Date.now()
    });
    return res.json({
      success: true,
      token,
      autoLockMinutes: memAuthData.autoLockMinutes,
      isProtectionEnabled: memAuthData.isProtectionEnabled
    });
  }
  return res.status(401).json({ success: false, error: 'Hatalı parola! Lütfen kontrol edip tekrar deneyiniz.' });
});

app.post('/api/auth/verify-token', async (req, res) => {
  await loadAuthSettings();
  if (!memAuthData.isProtectionEnabled) {
    return res.json({ valid: true, autoLockMinutes: memAuthData.autoLockMinutes, isProtectionEnabled: false });
  }
  const { token } = req.body;
  if (!token) return res.status(401).json({ valid: false, error: 'Token bulunamadı' });
  const session = activeSessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    session.lastActive = Date.now();
    return res.json({ valid: true, autoLockMinutes: memAuthData.autoLockMinutes, isProtectionEnabled: true });
  }
  if (typeof token === 'string' && token.startsWith('tok_')) {
    activeSessions.set(token, {
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      lastActive: Date.now()
    });
    return res.json({ valid: true, autoLockMinutes: memAuthData.autoLockMinutes, isProtectionEnabled: true });
  }
  return res.status(401).json({ valid: false, error: 'Geçersiz veya süresi dolmuş oturum' });
});

app.post('/api/auth/unlock', async (req, res) => {
  await loadAuthSettings();
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, error: 'PIN veya parola giriniz.' });
  const clean = String(code).trim();
  if (clean === memAuthData.masterPassword || (memAuthData.quickPin && clean === memAuthData.quickPin)) {
    return res.json({ success: true, autoLockMinutes: memAuthData.autoLockMinutes });
  }
  return res.status(401).json({ success: false, error: 'Hatalı PIN veya Parola!' });
});

app.post('/api/auth/change-settings', async (req, res) => {
  await loadAuthSettings();
  const { currentPassword, newPassword, newPin, autoLockMinutes, isProtectionEnabled } = req.body;
  
  if (memAuthData.isProtectionEnabled && currentPassword !== memAuthData.masterPassword) {
    return res.status(401).json({ success: false, error: 'Mevcut parolanız hatalı! Güvenlik nedeniyle değişiklik yapılamadı.' });
  }
  
  const updateData: Partial<AuthData> = {};
  if (newPassword && newPassword.trim().length >= 4) {
    updateData.masterPassword = newPassword.trim();
  }
  if (newPin !== undefined) {
    updateData.quickPin = String(newPin).trim();
  }
  if (autoLockMinutes !== undefined) {
    updateData.autoLockMinutes = Number(autoLockMinutes);
  }
  if (isProtectionEnabled !== undefined) {
    updateData.isProtectionEnabled = Boolean(isProtectionEnabled);
  }
  
  await saveAuthSettings(updateData);
  return res.json({
    success: true,
    message: 'Güvenlik ve parola ayarları başarıyla güncellendi.',
    settings: {
      autoLockMinutes: memAuthData.autoLockMinutes,
      isProtectionEnabled: memAuthData.isProtectionEnabled,
      hasPin: Boolean(memAuthData.quickPin && memAuthData.quickPin.length > 0)
    }
  });
});

// =========================================================================
// ŞANTİYE & MONTAJ GRUPLARI & GÜNLÜK DURUM KAYITLARI APISİ
// =========================================================================
let memSantiyeGruplari: any[] = [];

async function ensureSantiyeTable() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS santiye_montaj_gruplari (
        id SERIAL PRIMARY KEY,
        santiye_adi VARCHAR(255) NOT NULL,
        proje_id INTEGER,
        proje_adi VARCHAR(255),
        lokasyon VARCHAR(255),
        musteri_firma VARCHAR(255),
        baslangic_tarihi VARCHAR(50),
        planlanan_bitis_tarihi VARCHAR(50),
        gerceklesen_bitis_tarihi VARCHAR(50),
        sorumlu_usta VARCHAR(255),
        sorumlu_telefon VARCHAR(50),
        durum VARCHAR(50) DEFAULT 'Aktif',
        aciklama TEXT,
        ekip JSONB DEFAULT '[]'::jsonb,
        yoklama_kayitlari JSONB DEFAULT '{}'::jsonb,
        yoklama_notlari JSONB DEFAULT '{}'::jsonb,
        gunluk_durumlar JSONB DEFAULT '{}'::jsonb,
        olusturma_tarihi VARCHAR(50),
        arsivlenme_tarihi VARCHAR(50),
        guncellenme_zamani TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.warn('santiye_montaj_gruplari tablosu oluşturma uyarısı:', err);
  }
}

// Şantiyeleri Getir
app.get('/api/montaj-gruplari', async (req, res) => {
  try {
    if (pool) {
      await ensureSantiyeTable();
      const dbRes = await pool.query('SELECT * FROM santiye_montaj_gruplari ORDER BY id DESC');
      if (dbRes.rows.length > 0) {
        const formatted = dbRes.rows.map(r => ({
          Id: r.id,
          SantiyeAdi: r.santiye_adi,
          ProjeId: r.proje_id,
          ProjeAdi: r.proje_adi,
          Lokasyon: r.lokasyon,
          MusteriFirma: r.musteri_firma,
          BaslangicTarihi: r.baslangic_tarihi,
          PlanlananBitisTarihi: r.planlanan_bitis_tarihi,
          GerceklesenBitisTarihi: r.gerceklesen_bitis_tarihi,
          SorumluUsta: r.sorumlu_usta,
          SorumluTelefon: r.sorumlu_telefon,
          Durum: r.durum || 'Aktif',
          Aciklama: r.aciklama,
          Ekip: typeof r.ekip === 'string' ? JSON.parse(r.ekip) : (r.ekip || []),
          YoklamaKayitlari: typeof r.yoklama_kayitlari === 'string' ? JSON.parse(r.yoklama_kayitlari) : (r.yoklama_kayitlari || {}),
          YoklamaNotlari: typeof r.yoklama_notlari === 'string' ? JSON.parse(r.yoklama_notlari) : (r.yoklama_notlari || {}),
          GunlukDurumlar: typeof r.gunluk_durumlar === 'string' ? JSON.parse(r.gunluk_durumlar) : (r.gunluk_durumlar || {}),
          OlusturmaTarihi: r.olusturma_tarihi,
          ArsivlenmeTarihi: r.arsivlenme_tarihi
        }));
        memSantiyeGruplari = formatted;
        return res.json(formatted);
      }
    }
    return res.json(memSantiyeGruplari);
  } catch (err: any) {
    console.error('Montaj grupları getirme hatası:', err);
    return res.json(memSantiyeGruplari);
  }
});

// Yeni Şantiye Grubu Ekle
app.post('/api/montaj-gruplari', async (req, res) => {
  try {
    const b = req.body;
    const bugun = getBugunStr();
    const yeniGrup = {
      Id: b.Id || Date.now(),
      SantiyeAdi: b.SantiyeAdi || 'Yeni Şantiye',
      ProjeId: b.ProjeId || null,
      ProjeAdi: b.ProjeAdi || '',
      Lokasyon: b.Lokasyon || '',
      MusteriFirma: b.MusteriFirma || '',
      BaslangicTarihi: b.BaslangicTarihi || bugun,
      PlanlananBitisTarihi: b.PlanlananBitisTarihi || '',
      GerceklesenBitisTarihi: b.GerceklesenBitisTarihi || '',
      SorumluUsta: b.SorumluUsta || '',
      SorumluTelefon: b.SorumluTelefon || '',
      Durum: b.Durum || 'Aktif',
      Aciklama: b.Aciklama || '',
      Ekip: b.Ekip || [],
      YoklamaKayitlari: b.YoklamaKayitlari || {},
      YoklamaNotlari: b.YoklamaNotlari || {},
      GunlukDurumlar: b.GunlukDurumlar || {},
      OlusturmaTarihi: b.OlusturmaTarihi || bugun
    };

    if (pool) {
      await ensureSantiyeTable();
      const insertRes = await pool.query(`
        INSERT INTO santiye_montaj_gruplari (
          santiye_adi, proje_id, proje_adi, lokasyon, musteri_firma,
          baslangic_tarihi, planlanan_bitis_tarihi, gerceklesen_bitis_tarihi,
          sorumlu_usta, sorumlu_telefon, durum, aciklama,
          ekip, yoklama_kayitlari, yoklama_notlari, gunluk_durumlar, olusturma_tarihi
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id;
      `, [
        yeniGrup.SantiyeAdi, yeniGrup.ProjeId, yeniGrup.ProjeAdi, yeniGrup.Lokasyon, yeniGrup.MusteriFirma,
        yeniGrup.BaslangicTarihi, yeniGrup.PlanlananBitisTarihi, yeniGrup.GerceklesenBitisTarihi,
        yeniGrup.SorumluUsta, yeniGrup.SorumluTelefon, yeniGrup.Durum, yeniGrup.Aciklama,
        JSON.stringify(yeniGrup.Ekip), JSON.stringify(yeniGrup.YoklamaKayitlari),
        JSON.stringify(yeniGrup.YoklamaNotlari), JSON.stringify(yeniGrup.GunlukDurumlar), yeniGrup.OlusturmaTarihi
      ]);
      if (insertRes.rows[0]) {
        yeniGrup.Id = insertRes.rows[0].id;
      }
    }

    memSantiyeGruplari.unshift(yeniGrup);
    return res.status(201).json(yeniGrup);
  } catch (err: any) {
    console.error('Şantiye grubu ekleme hatası:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Şantiye Grubu Güncelle
app.put('/api/montaj-gruplari/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.body;
    
    let mevcut = memSantiyeGruplari.find(s => String(s.Id) === String(id));
    if (mevcut) {
      Object.assign(mevcut, b);
    }

    if (pool) {
      await ensureSantiyeTable();
      await pool.query(`
        UPDATE santiye_montaj_gruplari SET
          santiye_adi = COALESCE($1, santiye_adi),
          proje_id = COALESCE($2, proje_id),
          proje_adi = COALESCE($3, proje_adi),
          lokasyon = COALESCE($4, lokasyon),
          musteri_firma = COALESCE($5, musteri_firma),
          baslangic_tarihi = COALESCE($6, baslangic_tarihi),
          planlanan_bitis_tarihi = COALESCE($7, planlanan_bitis_tarihi),
          gerceklesen_bitis_tarihi = COALESCE($8, gerceklesen_bitis_tarihi),
          sorumlu_usta = COALESCE($9, sorumlu_usta),
          sorumlu_telefon = COALESCE($10, sorumlu_telefon),
          durum = COALESCE($11, durum),
          aciklama = COALESCE($12, aciklama),
          ekip = CASE WHEN $13::jsonb IS NOT NULL THEN $13::jsonb ELSE ekip END,
          yoklama_kayitlari = CASE WHEN $14::jsonb IS NOT NULL THEN $14::jsonb ELSE yoklama_kayitlari END,
          yoklama_notlari = CASE WHEN $15::jsonb IS NOT NULL THEN $15::jsonb ELSE yoklama_notlari END,
          gunluk_durumlar = CASE WHEN $16::jsonb IS NOT NULL THEN $16::jsonb ELSE gunluk_durumlar END,
          arsivlenme_tarihi = COALESCE($17, arsivlenme_tarihi),
          guncellenme_zamani = CURRENT_TIMESTAMP
        WHERE id = $18 OR id::text = $18::text;
      `, [
        b.SantiyeAdi || null, b.ProjeId || null, b.ProjeAdi || null, b.Lokasyon || null, b.MusteriFirma || null,
        b.BaslangicTarihi || null, b.PlanlananBitisTarihi || null, b.GerceklesenBitisTarihi || null,
        b.SorumluUsta || null, b.SorumluTelefon || null, b.Durum || null, b.Aciklama || null,
        b.Ekip ? JSON.stringify(b.Ekip) : null,
        b.YoklamaKayitlari ? JSON.stringify(b.YoklamaKayitlari) : null,
        b.YoklamaNotlari ? JSON.stringify(b.YoklamaNotlari) : null,
        b.GunlukDurumlar ? JSON.stringify(b.GunlukDurumlar) : null,
        b.ArsivlenmeTarihi || null,
        id
      ]);
    }

    return res.json({ success: true, message: 'Şantiye grubu güncellendi', data: mevcut });
  } catch (err: any) {
    console.error('Şantiye grubu güncelleme hatası:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Günlük Durum ve Rapor Kaydet
app.post('/api/montaj-gruplari/:id/gunluk-durum', async (req, res) => {
  try {
    const id = req.params.id;
    const { tarih, durumKaydi, yoklamaKayitlari, yoklamaNotlari } = req.body;
    if (!tarih) return res.status(400).json({ error: 'Tarih belirtilmelidir.' });

    let santiye = memSantiyeGruplari.find(s => String(s.Id) === String(id));
    if (!santiye) {
      santiye = { Id: id, GunlukDurumlar: {}, YoklamaKayitlari: {}, YoklamaNotlari: {} };
      memSantiyeGruplari.push(santiye);
    }

    if (!santiye.GunlukDurumlar) santiye.GunlukDurumlar = {};
    if (durumKaydi) {
      santiye.GunlukDurumlar[tarih] = {
        ...durumKaydi,
        Tarih: tarih,
        KayitZamani: new Date().toISOString()
      };
    }

    if (yoklamaKayitlari) {
      if (!santiye.YoklamaKayitlari) santiye.YoklamaKayitlari = {};
      santiye.YoklamaKayitlari[tarih] = yoklamaKayitlari;
    }

    if (yoklamaNotlari) {
      if (!santiye.YoklamaNotlari) santiye.YoklamaNotlari = {};
      santiye.YoklamaNotlari[tarih] = yoklamaNotlari;
    }

    if (pool) {
      await ensureSantiyeTable();
      await pool.query(`
        UPDATE santiye_montaj_gruplari SET
          gunluk_durumlar = jsonb_set(COALESCE(gunluk_durumlar, '{}'::jsonb), ARRAY[$1], $2::jsonb, true),
          yoklama_kayitlari = CASE WHEN $3::jsonb IS NOT NULL THEN jsonb_set(COALESCE(yoklama_kayitlari, '{}'::jsonb), ARRAY[$1], $3::jsonb, true) ELSE yoklama_kayitlari END,
          guncellenme_zamani = CURRENT_TIMESTAMP
        WHERE id = $4 OR id::text = $4::text;
      `, [
        tarih,
        JSON.stringify(durumKaydi || {}),
        yoklamaKayitlari ? JSON.stringify(yoklamaKayitlari) : null,
        id
      ]);
    }

    return res.json({ success: true, message: `${tarih} tarihli günlük durum kaydedildi.`, santiye });
  } catch (err: any) {
    console.error('Günlük durum kaydetme hatası:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Şantiye Sil
app.delete('/api/montaj-gruplari/:id', async (req, res) => {
  try {
    const id = req.params.id;
    memSantiyeGruplari = memSantiyeGruplari.filter(s => String(s.Id) !== String(id));
    if (pool) {
      await pool.query('DELETE FROM santiye_montaj_gruplari WHERE id = $1 OR id::text = $1::text', [id]);
    }
    return res.json({ success: true, message: 'Şantiye grubu silindi.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// VITE MIDDLEWARE & STATIC SERVING
// =========================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OK] Fabrika Web & Mobil Sunucusu çalışıyor: http://0.0.0.0:${PORT}`);
  });
}

startServer();
