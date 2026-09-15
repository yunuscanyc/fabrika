import { Personel, IzinKaydi, IzinUcretiOdeme } from '../types';

/**
 * 4857 Sayılı İş Kanunu Madde 53:
 * Yıllık Ücretli İzin Hesaplama Kuralları:
 * 
 * 1. Hak Kazanma: En az 1 tam yıl çalışma şartı.
 * 2. Kıdem Süreleri:
 *    - 1 yıldan 5 yıla kadar (5 yıl dahil): 14 gün
 *    - 5 yıldan fazla 15 yıldan az: 20 gün
 *    - 15 yıl (dahil) ve daha fazla: 26 gün
 * 3. Yaş Kuralı (Madde 53/5):
 *    "Onsekiz ve daha küçük yaştaki işçilerle elli ve daha yukarı yaştaki işçilere
 *    verilecek yıllık ücretli izin süresi yirmi günden az olamaz."
 */

export interface YilHakEdisDetayi {
  yilNo: number;
  baslangicTarihi: string;
  bitisTarihi: string;
  hakedisTarihi: string;
  yas: number;
  yasKuraliUygulandiMi: boolean;
  kazanilanGun: number;
}

export interface PersonelIzinOzeti {
  personelId: number;
  adSoyad: string;
  iseGirisTarihi: string;
  dogumTarihi?: string;
  yas: number;
  kidemYil: number;
  kidemAy: number;
  kidemGun: number;
  tamamlananYilSayisi: number;
  yasKuralinaTabiMi: boolean; // Şu anki yaşı >= 50 veya <= 18 mi
  kanuniHakEdilenGun: number; // Tamamlanan yıllara göre kanunen kazanılan toplam
  devredenIzinGunu: number; // İlk kullanıma özel eski programdan devir
  toplamHakEdilenGun: number; // Kanuni + Devir
  kullanilanYillikIzinGun: number; // Onaylı yıllık izinlerin toplamı
  ucreteCevrilenIzinGun: number; // Ücrete çevrilip nakit ödenen izinler
  kalanYillikIzinGun: number; // Toplam Hak Edilen - Kullanılan - Ücrete Çevrilen
  yilDetaylari: YilHakEdisDetayi[];
}

export function parseDate(dateStr?: string | Date | null): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }
  const clean = String(dateStr).trim();
  if (!clean) return null;

  // YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
  }

  // DD.MM.YYYY
  const trMatch = clean.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (trMatch) {
    return new Date(parseInt(trMatch[3], 10), parseInt(trMatch[2], 10) - 1, parseInt(trMatch[1], 10));
  }

  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * İki tarih arasındaki tam yıl, ay ve gün farkını hesaplar
 */
export function hesaplaKidem(iseGirisStr: string, referansTarihStr?: string) {
  const iseGiris = parseDate(iseGirisStr);
  const ref = parseDate(referansTarihStr) || new Date();

  if (!iseGiris || ref < iseGiris) {
    return { yil: 0, ay: 0, gun: 0, tamYil: 0 };
  }

  let yil = ref.getFullYear() - iseGiris.getFullYear();
  let ay = ref.getMonth() - iseGiris.getMonth();
  let gun = ref.getDate() - iseGiris.getDate();

  if (gun < 0) {
    ay -= 1;
    // Bir önceki ayın gün sayısını bul
    const prevMonth = new Date(ref.getFullYear(), ref.getMonth(), 0);
    gun += prevMonth.getDate();
  }

  if (ay < 0) {
    yil -= 1;
    ay += 12;
  }

  return { yil, ay, gun, tamYil: Math.max(0, yil) };
}

/**
 * Doğum tarihine göre yaş hesaplar
 */
export function hesaplaYas(dogumTarihiStr?: string, referansTarihStr?: string): number {
  if (!dogumTarihiStr) return 30; // Varsayılan
  const d = parseDate(dogumTarihiStr);
  const ref = parseDate(referansTarihStr) || new Date();
  if (!d) return 30;

  let yas = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) {
    yas--;
  }
  return Math.max(0, yas);
}

/**
 * Tek bir personelin tüm yıllık izin hak ediş cetvelini hesaplar
 */
export function hesaplaPersonelIzinOzeti(
  personel: Personel,
  tumIzinler: IzinKaydi[],
  referansTarihStr?: string
): PersonelIzinOzeti {
  const refDate = parseDate(referansTarihStr) || new Date();
  const iseGiris = parseDate(personel.IseGirisTarihi);

  const kidem = hesaplaKidem(personel.IseGirisTarihi, referansTarihStr);
  const guncelYas = hesaplaYas(personel.DogumTarihi, referansTarihStr);
  const yasKuralinaTabi = guncelYas >= 50 || guncelYas <= 18;

  const yilDetaylari: YilHakEdisDetayi[] = [];
  let kanuniHakEdilenGun = 0;

  // Tamamlanan her çalışma yılı için hak ediş hesapla
  if (iseGiris) {
    for (let yilIndex = 1; yilIndex <= kidem.tamYil; yilIndex++) {
      const baslangic = new Date(iseGiris);
      baslangic.setFullYear(iseGiris.getFullYear() + (yilIndex - 1));

      const bitis = new Date(iseGiris);
      bitis.setFullYear(iseGiris.getFullYear() + yilIndex);

      const hakedisTarihiStr = bitis.toISOString().split('T')[0];
      const hakedisAnindakiYas = hesaplaYas(personel.DogumTarihi, hakedisTarihiStr);

      // İş Kanunu m. 53 kıdem tablosu
      let standartGun = 14;
      if (yilIndex > 15) {
        standartGun = 26;
      } else if (yilIndex > 5) {
        standartGun = 20;
      } else {
        standartGun = 14;
      }

      // İş Kanunu m. 53/5 Yaş Kuralı: 18 yaş ve altı, 50 yaş ve üstü en az 20 gün
      const yasKuraliUygulandi = (hakedisAnindakiYas >= 50 || hakedisAnindakiYas <= 18) && standartGun < 20;
      const kazanilan = yasKuraliUygulandi ? 20 : standartGun;

      kanuniHakEdilenGun += kazanilan;

      yilDetaylari.push({
        yilNo: yilIndex,
        baslangicTarihi: baslangic.toISOString().split('T')[0],
        bitisTarihi: bitis.toISOString().split('T')[0],
        hakedisTarihi: hakedisTarihiStr,
        yas: hakedisAnindakiYas,
        yasKuraliUygulandiMi: yasKuraliUygulandi,
        kazanilanGun: kazanilan
      });
    }
  }

  // Eskiden Devreden İzin Günü (İlk kullanıma özel devir)
  const devredenIzinGunu = Number(personel.DevredenIzinGunu || 0);
  const toplamHakEdilenGun = kanuniHakEdilenGun + devredenIzinGunu;

  // Onaylanmış Yıllık İzinler Toplamı (İptal ve silinmişler hariç)
  const kullanilanYillikIzinGun = tumIzinler
    .filter(iz => 
      iz.PersonelId === personel.PersonelId &&
      iz.IzinTuru === 'Yıllık İzin' &&
      iz.Durum === 'Onaylandı' &&
      !iz.SilindiMi
    )
    .reduce((acc, curr) => acc + (Number(curr.IsGunuSayisi) || 0), 0);

  // Ücrete Çevrilmiş İzin Günleri Toplamı
  const ucretOdemeleri = personel.IzinUcretiOdemeleri || [];
  const ucreteCevrilenIzinGun = ucretOdemeleri.reduce(
    (acc, curr) => acc + (Number(curr.UcreteCevrilenGun) || 0),
    0
  );

  // Kalan Kullanılabilir İzin
  const kalanYillikIzinGun = toplamHakEdilenGun - kullanilanYillikIzinGun - ucreteCevrilenIzinGun;

  return {
    personelId: personel.PersonelId,
    adSoyad: personel.AdSoyad,
    iseGirisTarihi: personel.IseGirisTarihi,
    dogumTarihi: personel.DogumTarihi,
    yas: guncelYas,
    kidemYil: kidem.yil,
    kidemAy: kidem.ay,
    kidemGun: kidem.gun,
    tamamlananYilSayisi: kidem.tamYil,
    yasKuralinaTabiMi: yasKuralinaTabi,
    kanuniHakEdilenGun,
    devredenIzinGunu,
    toplamHakEdilenGun,
    kullanilanYillikIzinGun,
    ucreteCevrilenIzinGun,
    kalanYillikIzinGun,
    yilDetaylari
  };
}

/**
 * Seçili bir tarihte personelin aktif onaylı iznini bulur
 */
export function getAktifOnayliIzin(
  personelId: number,
  tarihStr: string,
  izinler: IzinKaydi[]
): IzinKaydi | undefined {
  return izinler.find(iz => 
    iz.PersonelId === personelId &&
    iz.Durum === 'Onaylandı' &&
    !iz.SilindiMi &&
    tarihStr >= iz.BaslangicTarihi &&
    tarihStr <= iz.BitisTarihi
  );
}
