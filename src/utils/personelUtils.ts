import { Personel, PersonelGirisCikis } from '../types';

/**
 * Bir personelin tüm giriş-çıkış dönemlerini standart liste olarak döndürür.
 * Eğer GirisCikisGecmisi yoksa personelin ana IseGirisTarihi ve IstenCikisTarihi'nden
 * 1 adet varsayılan dönem oluşturur.
 */
export function getPersonelGirisCikisDonemleri(personel: Personel): PersonelGirisCikis[] {
  if (Array.isArray(personel.GirisCikisGecmisi) && personel.GirisCikisGecmisi.length > 0) {
    return personel.GirisCikisGecmisi.map((d, idx) => ({
      Id: d.Id || (idx + 1),
      GirisTarihi: (d.GirisTarihi || '').slice(0, 10),
      CikisTarihi: d.CikisTarihi ? d.CikisTarihi.slice(0, 10) : null,
      CikisNedeni: d.CikisNedeni || '',
      Notlar: d.Notlar || ''
    }));
  }
  
  if (personel.IseGirisTarihi) {
    return [{
      Id: 1,
      GirisTarihi: (personel.IseGirisTarihi || '').slice(0, 10),
      CikisTarihi: personel.IstenCikisTarihi ? personel.IstenCikisTarihi.slice(0, 10) : null,
      CikisNedeni: '',
      Notlar: 'İşe Giriş'
    }];
  }

  return [];
}

/**
 * Belirli bir tarihte (YYYY-MM-DD) personelin fabrikada aktif çalışıp çalışmadığını belirler.
 * Kanuni Esas: İşten çıkış tarihi personelin işyerinde çalıştığı SON GÜNDÜR.
 * Dolayısıyla çıkış tarihi günü de aktif çalışma günüdür (tarih === cikisTarihi çalışıyor kabul edilir).
 * Yalnızca çıkış tarihinden sonraki günlerde (tarih > cikisTarihi) çalışmıyor kabul edilir.
 * 
 * - Kişi henüz işe başlamamışsa (tarih < GirisTarihi): ÇALIŞMIYOR (false)
 * - Kişi işten ayrılmışsa ve tekrar başlamamışsa (CikisTarihi varsa ve tarih > CikisTarihi): ÇALIŞMIYOR (false)
 * - Birden fazla giriş-çıkış dönemi varsa, seçili tarih BU DÖNEMLERDEN HERHANGİ BİRİNİN İÇİNDEYSE: ÇALIŞIYOR (true)
 */
export function isPersonelCalisiyorMuTarihte(personel: Personel, tarih: string): boolean {
  if (!personel || !tarih) return false;
  
  const cleanTarih = String(tarih).slice(0, 10);

  // 1. Genel pasiflik veya işten çıkış tarihi kontrolü
  // İşten çıkış tarihi personelin son çalıştığı gündür; çıkış tarihinden sonraki günlerde çalışmıyor
  const cikisTarihi = (personel.IstenCikisTarihi || '').slice(0, 10);
  if (cikisTarihi && cleanTarih > cikisTarihi) {
    return false;
  }

  // 2. Eğer DurumAktifMi false ise veya CalismaDurumu 'Ayrıldı' / 'Ayrılmış' ise
  if (personel.DurumAktifMi === false || (personel as any).CalismaDurumu === 'Ayrıldı' || (personel as any).CalismaDurumu === 'Ayrılmış') {
    const donemler = getPersonelGirisCikisDonemleri(personel);
    const aktifDonemVar = donemler.some(d => {
      const giris = (d.GirisTarihi || '').slice(0, 10);
      const cikis = (d.CikisTarihi || '').slice(0, 10);
      if (!giris || cleanTarih < giris) return false;
      if (cikis && cleanTarih > cikis) return false;
      if (!cikis && personel.DurumAktifMi === false) return false;
      return true;
    });
    if (!aktifDonemVar) return false;
  }

  const donemler = getPersonelGirisCikisDonemleri(personel);

  if (donemler.length === 0) {
    return personel.DurumAktifMi !== false;
  }

  return donemler.some(d => {
    const giris = (d.GirisTarihi || '').slice(0, 10);
    const cikis = (d.CikisTarihi || '').slice(0, 10);

    if (giris && cleanTarih < giris) {
      return false;
    }

    if (cikis && cleanTarih > cikis) {
      return false;
    }

    return true;
  });
}

/**
 * Bir personelin belirli bir ayda (Yıl, Ay) istihdamda olup olmadığını belirler.
 * Aylık puantaj icmal raporunda o ay henüz işe girmemiş ya da o aydan çok önce ayrılmış kişileri listelememek için kullanılır.
 */
export function isPersonelCalisiyorMuAyda(personel: Personel, yil: number, ay: number): boolean {
  if (!personel || !yil || !ay) return false;

  const ayStr = String(ay).padStart(2, '0');
  const ayBasi = `${yil}-${ayStr}-01`;
  const sonGun = new Date(yil, ay, 0).getDate();
  const aySonu = `${yil}-${ayStr}-${String(sonGun).padStart(2, '0')}`;

  const donemler = getPersonelGirisCikisDonemleri(personel);
  if (donemler.length === 0) {
    return personel.DurumAktifMi !== false;
  }

  return donemler.some(d => {
    const giris = (d.GirisTarihi || '').slice(0, 10);
    const cikis = (d.CikisTarihi || '').slice(0, 10);

    // Eğer kişinin girişi bu ayın sonundan sonraysa (gelecekte işe başlayacaksa)
    if (giris && giris > aySonu) return false;
    // Eğer kişinin çıkışı bu ayın başından önceyse (geçmişte işten çıkmışsa)
    if (cikis && cikis < ayBasi) return false;

    return true;
  });
}

/**
 * Bir personelin belirli bir haftada (Pazartesi - Pazar) istihdamda olup olmadığını belirler.
 * Yevmiyeci haftalık icmal raporunda o hafta henüz işe girmemiş ya da o haftadan önce ayrılmış kişileri listelememek için kullanılır.
 */
export function isPersonelCalisiyorMuHaftada(personel: Personel, pztTarih: string, pzrTarih: string): boolean {
  if (!personel || !pztTarih || !pzrTarih) return false;

  const haftaBasi = pztTarih.slice(0, 10);
  const haftaSonu = pzrTarih.slice(0, 10);

  const donemler = getPersonelGirisCikisDonemleri(personel);
  if (donemler.length === 0) {
    return personel.DurumAktifMi !== false;
  }

  return donemler.some(d => {
    const giris = (d.GirisTarihi || '').slice(0, 10);
    const cikis = (d.CikisTarihi || '').slice(0, 10);

    // Eğer kişinin girişi bu haftanın sonundan (pazar) sonraysa (gelecekte işe başlayacaksa)
    if (giris && giris > haftaSonu) return false;
    // Eğer kişinin çıkışı bu haftanın başından (pazartesi) önceyse (geçmişte işten çıkmışsa)
    if (cikis && cikis < haftaBasi) return false;

    return true;
  });
}

