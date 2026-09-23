export interface IzinUcretiOdeme {
  OdemeId: number | string;
  PersonelId: number;
  PersonelAdSoyad?: string;
  OdemeTarihi: string;
  UcreteCevrilenGun: number;
  GunlukUcret?: number;
  ToplamTutar?: number;
  EvrakAdi?: string;
  EvrakDosya?: string; // Base64 veya dosya bağlantısı
  Aciklama?: string;
}

export interface Personel {
  PersonelId: number;
  TCKimlikNo: string;
  AdSoyad: string;
  Telefon: string;
  Eposta?: string;
  Email?: string;
  KanGrubu?: string;
  AcilDurumKisisi?: string;
  AcilDurumTelefonu?: string;
  Departman?: string;
  Gorev?: string;
  GorevVeyaUnvan?: string;
  IseGirisTarihi: string;
  IstenCikisTarihi?: string | null;
  DogumTarihi?: string;
  DurumAktifMi: boolean;
  AktifMi?: boolean;
  AktifIzinBilgisi?: string;
  DevredenIzinGunu?: number; // Eski masaüstü programından bir kerelik devir izni
  IzinUcretiOdemeleri?: IzinUcretiOdeme[]; // Ücrete çevrilen izinler
}

export interface IzinKaydi {
  IzinId: number;
  PersonelId: number;
  PersonelAdSoyad?: string;
  IzinTuru: string;
  BaslangicTarihi: string;
  BitisTarihi: string;
  IsGunuSayisi: number;
  Durum: 'Onaylandı' | 'Bekliyor' | 'Reddedildi' | 'İptal';
  Onaylayan?: string;
  Aciklama?: string;
  SilindiMi?: boolean;
}

export interface GunlukPuantaj {
  PuantajId: number;
  PersonelId: number;
  PersonelAdSoyad?: string;
  Departman?: string;
  Tarih: string;
  DurumKodu: string; // N, YI, UI, M, HT, RT, R, D
  NormalCalismaSaati: number;
  FazlaMesaiSaati: number; // %50
  HaftaTatiliMesaiSaati: number; // %100
  ResmiTatilMesaiSaati: number; // %100
  SaatlikKesintiUcretsiz: number;
  Aciklama?: string;
}

export interface MesaiAyari {
  Id: number;
  CalismaRejimi?: '5gun' | '6gun'; // 5 gün (Pzt-Cum 9s) | 6 gün (Pzt-Cum 7.5s/8s + Cmt öğlene kadar)
  MesaiBaslangic: string; // '08:00'
  MesaiBitis: string; // '18:30'
  AraDinlenmeDakika: number; // 90
  HaftalikCalismaGunu: number; // 5 veya 6
  GunlukStandartSaat: number; // 9.0 (5 gün için)
  CumartesiStandartSaat?: number; // 5.0 (6 gün için Cumartesi öğlene kadar)
  FazlaMesaiKatsayisi: number; // 1.5
  TatilMesaiKatsayisi: number; // 2.0
}

export interface MakineBakimKaydi {
  BakimId: number;
  MakineId: number;
  BakimTarihi: string;
  YapildigiSaat: number;
  BakimTuru: string;
  BakimiYapan?: string;
  Maliyet?: number;
  DegisenParcalar?: string;
  Aciklama?: string;
  Belgeler?: any[];
  FotoSayisi?: number;
}

export interface Makine {
  MakineId: number;
  MakineKodu: string;
  MakineAdi: string;
  MakineTuru: string;
  MarkaModel?: string;
  ImalatYili?: number;
  SeriNo?: string;
  KonumBolum?: string;
  SorumluUsta?: string;
  GuncelCalismaSaati: number;
  BakimAraligiSaat: number;
  BakimAraligiAy: number;
  SonBakimTarihi?: string | null;
  SonBakimSaati: number;
  Durum: string; // Faal, Arızalı, Bakımda, Revizyonda
  AktifMi: boolean;
  Notlar?: string;
  BakimGecmisi?: MakineBakimKaydi[];
}

export interface PersonelKkdZimmet {
  ZimmetId: number;
  PersonelId: number;
  PersonelAdSoyad?: string;
  MalzemeAdi: string;
  StandartNo?: string;
  VerilisTarihi: string;
  YenilemePeriyoduAy: number;
  Adet: number;
  BedenNo?: string;
  Aciklama?: string;
  TeslimEdildiMi: boolean;
  IadeEdildiMi: boolean;
  KalanGun?: number;
  DurumUyari?: string;
}

export interface PersonelSaglikRaporu {
  RaporId: number;
  PersonelId: number;
  PersonelAdSoyad?: string;
  MuayeneTuru?: string;
  RaporTuru?: string;
  MuayeneTarihi: string;
  GelecekMuayeneTarihi?: string;
  GecerlilikSuresiAy?: number;
  SaglikKurulusu?: string;
  Sonuc?: string;
  RaporNo?: string;
  Aciklama?: string;
  BitisTarihi?: string;
  KalanGun?: number;
  BelgeUrl?: string;
  BelgeAdi?: string;
}

export interface IsgEgitimi {
  EgitimId: number;
  PersonelId?: number;
  PersonelAdSoyad?: string;
  EgitimKonusu: string;
  EgiticiAdSoyad: string;
  EgitimTarihi: string;
  GelecekEgitimTarihi?: string;
  SureSaat: number;
  GecerlilikYil: number;
  Aciklama?: string;
  BelgeUrl?: string;
  BelgeAdi?: string;
}

export interface PersonelIsgEgitim {
  EgitimId: number;
  PersonelId: number;
  PersonelAdSoyad?: string;
  EgitimAdi: string;
  EgitimTarihi: string;
  GecerlilikAy: number;
  EgitimSuresiSaat: number;
  EgitimciKurum?: string;
  BelgeNo?: string;
  BitisTarihi?: string;
  KalanGun?: number;
  BelgeUrl?: string;
  BelgeAdi?: string;
}

export interface ProjeAsama {
  AsamaId: number;
  ProjeId: number;
  UstAsamaId?: number | null;
  Seviye: number; // 1: Ana Dal, 2: Alt Dal, 3: Detay Dal
  SiraNo: number;
  DinamikNumara?: string;
  AsamaAdi: string;
  SorumluKisi?: string;
  Deadline?: string | null;
  TamamlandiMi: boolean;
  Durum?: string;
  Notlar?: string;
  KilitliMi: boolean;
  BelgeSayisi?: number;
  Belgeler?: any[];
}

export interface ProjePersonel {
  KayitId: string;
  ProjeId: number;
  ProjeAdi?: string;
  PersonelId: number;
  AdSoyad: string;
  Departman?: string;
  SirketGorevi?: string;
  ProjeGorevi: string; // "Şantiye Şefi", "Saha Mühendisi", "Montaj Ustası", "Kaynak Ustası", "Formen", "Tekniker", "İşçi", "İSG Sorumlusu" vb.
  Telefon?: string;
  BaslangicTarihi: string;
  BitisTarihi?: string;
  AktifMi: boolean; // true: aktif görevli, false: ayrıldı / arşivde
  Notlar?: string;
}

export interface Proje {
  ProjeId: number;
  ProjeKodu: string;
  ProjeAdi: string;
  MusteriFirma?: string;
  SantiyeAdresi?: string;
  SorumluPersonelId?: number | null;
  SorumluKisi?: string;
  BaslangicTarihi?: string;
  Deadline?: string | null;
  Durum: string;
  GenelIlerlemeYuzdesi: number;
  AktifMi: boolean;
  KilitliMi: boolean;
  Asamalar?: ProjeAsama[];
  Personeller?: ProjePersonel[];
}

export interface BakimKaydi {
  BakimId: number;
  AracId: number;
  BakimTarihi: string;
  YapilanKmVeyaSaat: number;
  BakimTuru?: string;
  ServisFirma?: string;
  Maliyet?: number;
  YapilanIslemler?: string;
  Aciklama?: string;
  FaturaNo?: string;
  YapanUstaVeyaServis?: string;
  Belgeler?: any[];
  FotoSayisi?: number;
}

export interface Arac {
  AracId: number;
  PlakaVeyaKod: string;
  AracTipi: string;
  MarkaModel: string;
  ModelYili: number;
  SasiSeriNo?: string;
  ZimmetliKisi?: string;
  Departman?: string;
  GuncelKmVeyaSaat: number;
  BakimAraligiKmVeyaSaat: number;
  BakimAraligiAy: number;
  SonBakimTarihi?: string | null;
  SonBakimKmVeyaSaat: number;
  SaatTakibiMi: boolean;
  MuayeneTarihi?: string | null;
  MuayeneGecerlilikYil?: number;
  MuayeneBitisTarihi?: string | null;
  SigortaSirketi?: string | null;
  SigortaPoliceNo?: string | null;
  SigortaBitisTarihi?: string | null;
  KaskoSirketi?: string | null;
  KaskoPoliceNo?: string | null;
  KaskoBitisTarihi?: string | null;
  Durum: string; // Faal, Bakımda/Serviste, Arızalı, Elden Çıkarıldı / Satıldı
  AktifMi: boolean;
  Notlar?: string | null;
  BakimGecmisi?: BakimKaydi[];
}

export interface Hatirlatici {
  Id: number;
  Baslik: string;
  Aciklama?: string;
  Tarih: string;
  Kategori: 'Fabrika / Üretim' | 'Şantiye / Montaj' | 'Ödeme / Finans' | 'Resmi Evrak / İSG' | 'Sevkiyat / Lojistik' | 'Özel / Genel' | 'Proje' | 'Bakim' | 'Evrak' | 'Gorev';
  TamamlandiMi: boolean;
  OnemDerecesi: 'Normal' | 'Yüksek' | 'Kritik' | 'Düşük';
  SorumluPersonelId?: number | null;
  SorumluPersonelAd?: string;
  FotoSayisi?: number;
  Belgeler?: any[];
}

export interface BakimUyarisi {
  id: string;
  tur: 'arac' | 'makine' | 'muayene' | 'sigorta' | 'kasko';
  ad: string;
  kod: string;
  durum: 'Gecikmis' | 'Yaklasiyor' | 'ZamaniGeldi';
  mesaj: string;
  kalanGun?: number;
  kalanBirim?: number;
  birim?: 'km' | 'saat' | 'gun';
}

export interface IsgUyarisi {
  id: string;
  tur: 'saglik_eksik' | 'saglik_suresi' | 'egitim_suresi';
  personelAdSoyad: string;
  personelId: number;
  baslik: string;
  mesaj: string;
  kalanGun?: number;
  durum: 'Kritik' | 'Uyari' | 'Bilgi';
}

export interface OzetGorevItem {
  id: number;
  baslik: string;
  tarih: string;
  kategori?: string;
  onemDerecesi?: string;
  tamamlandiMi: boolean;
  etiket: 'BUGÜN' | 'GEÇİKMİŞ' | 'SON 5 GÜN' | 'GELECEK 5 GÜN' | 'GELECEK';
}

export interface OzetIstatistikler {
  toplamProje: number;
  aktifProje: number;
  tamamlananProje: number;
  toplamArac: number;
  aktifArac: number;
  bakimBekleyenArac: number;
  muayeneBekleyenArac?: number;
  sigortaBekleyenArac?: number;
  toplamAracUyarisi?: number;
  toplamMakine: number;
  aktifMakine: number;
  bakimBekleyenMakine: number;
  toplamPersonel: number;
  aktifPersonel: number;
  izindekiPersonel: number;
  bugunIzinliPersonel?: number;
  zimmetsizPersonel: number;
  saglikRaporuEksikSayisi?: number;
  isgUyarisiSayisi?: number;
  bugunBitenGorevler: number;
  yaklasanGorevler: number;
  bekleyenSiparisSayisi?: number;
  bugunGorevListesi?: string[];
  gorevListesi?: OzetGorevItem[];
  bakimUyarilari: BakimUyarisi[];
  isgUyarilari?: IsgUyarisi[];
}

export interface YevmiyeCalismaKaydi {
  KayitId: string;
  ProjeId?: number;
  ProjeAdi: string;
  BaslangicTarihi: string;
  BitisTarihi?: string;
  GunSayisi: number;
  GunlukUcret: number;
  ToplamUcret: number;
  OdemeDurumu: 'Odendi' | 'KismenOdendi' | 'Bekliyor';
  Aciklama?: string;
}

export interface YevmiyeciBelge {
  BelgeId: string;
  DosyaAdi: string;
  DosyaIcerigi: string;
  YuklemeTarihi: string;
}

export interface Yevmiyeci {
  YevmiyeciId: number;
  AdSoyad: string;
  Telefon: string;
  TcKimlikNo?: string;
  IbanNo?: string;
  UzmanlikAlani: string;
  GunlukYevmiye: number;
  Durum: 'Musait' | 'ProjedeCalisiyor' | 'Izinli' | 'KaraListe';
  AktifProjeId?: number | null;
  AktifProjeAdi?: string | null;
  Puan: number;
  Guvenilirlik: 'CokIyi' | 'Standart' | 'DikkatEdilmeli';
  Fotograf?: string;
  Notlar?: string;
  IkametSehir?: string;
  KayitTarihi?: string;
  CalismaGecmisi: YevmiyeCalismaKaydi[];
  Belgeler?: YevmiyeciBelge[];
}

export interface Departman {
  Id: number;
  Ad: string;
}

export interface Gorev {
  Id: number;
  Ad: string;
}

export interface SantiyeEkipUyesi {
  Id: string; // Benzersiz üye ID'si (örn: kadrolu_1, yevmiyeci_2)
  PersonelId?: number; // Kadrolu ise
  YevmiyeciId?: number; // Yevmiyeci ise
  Tur: 'Kadrolu' | 'Yevmiyeci';
  AdSoyad: string;
  Telefon?: string;
  Uzmanlik?: string; // Görev veya uzmanlık alanı
  Rol?: 'Usta Başı' | 'Montaj Ustası' | 'Şantiye Elemanı' | 'Çırak / Yardımcı' | 'Şoför & Lojistik';
  GunlukUcret?: number; // Günlük yevmiye veya maliyet
  EklemeTarihi?: string;
}

export interface SantiyeGunlukDurum {
  Tarih: string; // 'YYYY-MM-DD'
  DurumOzet?: 'Normal Devam Ediyor' | 'Hızlı İlerliyor' | 'Malzeme Bekleniyor' | 'Hava Engeli / Durduruldu' | 'Müşteri Revizyonu Bekleniyor' | 'Montaj Tamamlandı';
  IlerlemeYuzdesi?: number; // 0 - 100
  HavaDurumu?: string; // Güneşli, Yağmurlu, Soğuk, Kapalı vb.
  YapilanIsler?: string; // Gün içinde tamamlanan montaj/imalat işleri
  EksikMalzemeVeSorunlar?: string; // Sahada ihtiyaç duyulan malzeme, parça veya aksaklıklar
  GenelNotlar?: string; // Günlük şantiye notları
  Raporlayan?: string; // Sorumlu usta veya mühendis
  Fotograflar?: string[]; // Günlük saha fotoğrafları (base64 veya URL)
  KayitZamani?: string; // ISO tarih veya saat
}

export interface MalzemeSiparisiBelge {
  BelgeId?: number;
  SiparisId?: number;
  DosyaAdi: string;
  DosyaBoyutu: string;
  YuklemeTarihi: string;
  DosyaIcerigi: string;
}

export type MalzemeSiparisBelgesi = MalzemeSiparisiBelge;

export type SiparisDurumu = 
  | 'Bekliyor' 
  | 'Incelemede' 
  | 'FiyatAliniyor'
  | 'SiparisVerildi' 
  | 'KismiGeldi'
  | 'FabrikayaGeldi' 
  | 'Iptal';

export type SiparisAciliyet = 'Normal' | 'Acil' | 'CokAcil';

export interface MalzemeKatalogItem {
  Id: number;
  Kategori: string;
  MalzemeAdi: string;
  Marka?: string;
  Model?: string;
  VarsayilanBirim?: string;
  Aciklama?: string;
}

export interface MalzemeSiparisKalemi {
  Id?: string | number;
  Kategori: string;
  MalzemeAdi: string;
  Marka?: string;
  Model?: string;
  Miktar: number;
  Birim: string;
  Olculer?: string;
  Aciklama?: string;
}

export interface MalzemeSiparisi {
  Id: number;
  SiparisNo: string;
  ProjeAdi: string;
  Kategori?: string;
  MalzemeAdi?: string;
  Marka?: string;
  Model?: string;
  Miktar?: number;
  Birim?: string;
  Olculer?: string;
  Aciklama?: string;
  Kalemler?: MalzemeSiparisKalemi[];
  Aciliyet: SiparisAciliyet;
  TerminTarihi?: string;
  Tarih: string;
  TalepEden: string;
  Durum: SiparisDurumu;
  KilitliMi: boolean;
  KilitleyenKisi?: string;
  KilitTarihi?: string;
  KilitNotu?: string;
  TedarikciFirma?: string;
  SiparisTarihi?: string;
  TahminiTutar?: number | null;
  FaturaIrsaliyeNo?: string;
  SatinalmaNotu?: string;
  Belgeler: MalzemeSiparisiBelge[];
  FotoSayisi?: number;
  OkunduMu: boolean;
  OlusturanRol?: 'ustabasi' | 'admin';
  GuncellemeTarihi?: string;
}

export interface SantiyeMontajGrubu {
  Id: number | string;
  SantiyeAdi: string; // İş / Şantiye adı (örn. Kadıköy Villa Montajı)
  ProjeId?: number | null; // Bağlı fabrika projesi (opsiyonel)
  ProjeAdi?: string;
  Lokasyon?: string; // Şehir / İlçe / Açık adres
  MusteriFirma?: string;
  BaslangicTarihi: string; // 'YYYY-MM-DD'
  PlanlananBitisTarihi?: string; // 'YYYY-MM-DD'
  GerceklesenBitisTarihi?: string; // 'YYYY-MM-DD'
  SorumluUsta?: string; // Sorumlu Usta / Şef
  SorumluTelefon?: string;
  Durum: 'Aktif' | 'Tamamlandi'; // Aktif şantiyeler ve arşiv
  Aciklama?: string;
  Ekip: SantiyeEkipUyesi[];
  YoklamaKayitlari: Record<string, Record<string, boolean>>;
  YoklamaNotlari?: Record<string, Record<string, string>>;
  GunlukDurumlar?: Record<string, SantiyeGunlukDurum>;
  OlusturmaTarihi?: string;
  ArsivlenmeTarihi?: string;
}

// ============================================================================
// TAŞERON & YAN GİDER PAZARLIK VE HAKEDİŞ MODELİ
// ============================================================================

export type TaseronBirimType = 'm²' | 'Metre' | 'Metretül (mt)' | 'Adet' | 'Kg' | 'Gün' | 'Plaka' | 'Set';

export interface TaseronFirma {
  Id: string;
  FirmaAdi: string;
  YetkiliKisi: string;
  Telefon: string;
  UzmanlikAlani: string; // "Lambri, Çıta, Süpürgelik", "Dolap & Mutfak Montajı", "Cila & Boya" vb.
  TcVeyaVergiNo?: string;
  IbanNo?: string;
  Sehir?: string;
  Puan?: number; // 1 - 5 yıldız
  Notlar?: string;
  AktifMi: boolean;
}

export interface TaseronIsKalemi {
  Id: string;
  PozKodu: string; // örn. "POZ-01", "LAMB-01"
  IsKalemiAdi: string; // örn. "Lambri Yapımı / Ahşap Kaplama"
  Birim: TaseronBirimType;
  Miktar: number; // örn. 500
  BazBirimFiyat: number; // Sadece işçilik birim fiyatı (₺)
  Aciklama?: string;
}

export type TaseronYanGiderKategori = 
  | 'Ulaşım & Lojistik'
  | 'Konaklama & Barınma'
  | 'Yemek & İkram'
  | 'SGK & İSG Yasal'
  | 'Sarf Malzeme & El Aletleri'
  | 'Temizlik & Moloz Atımı'
  | 'Risk & Fire Payı';

export interface TaseronYanGiderItem {
  Id: string;
  Kategori: TaseronYanGiderKategori;
  GiderAdI: string; // örn. "Günlük Tabldot Yemek", "SGK Prim & Stopaj"
  HesapTuru: 'KisiGun' | 'Gunluk' | 'Aylik' | 'Toplu' | 'BirimBasi';
  BirimMaliyet: number; // ₺
  KisiSayisi?: number;
  GunSayisi?: number;
  ToplamTutar: number; // ₺
  Sorumlu: 'Biz' | 'Taseron' | 'Muaf'; // Kimin üstlendiği
  Aciklama?: string;
}

export interface TaseronHakedisKalemIlerleme {
  PozId: string;
  PozKodu: string;
  IsKalemiAdi: string; // örn. Lambri
  Birim: TaseronBirimType;
  ToplamMiktar: number;
  OncekiMiktar: number;
  BuDonemMiktar: number;
  KalanMiktar: number;
  BirimFiyat: number;
  BuDonemTutar: number;
}

export interface TaseronHakedisKaydi {
  HakedisId: string;
  HakedisNo: number; // 1, 2, 3...
  Tarih: string;
  Aciklama?: string;
  KalemIlerlemeleri: TaseronHakedisKalemIlerleme[];
  BrutTutar: number;
  AvansKesintisi: number;
  ZayiatKesintisi: number;
  DiğerKesintiler: number;
  NetOdenecek: number;
  Durum: 'Taslak' | 'Onaylandi' | 'Odendi';
  OdemeTarihi?: string;
}

export interface TaseronAnlasma {
  Id: string;
  AnlasmaKodu: string; // örn. "TAS-2026-001"
  ProjeAdi: string;
  ProjeId?: number | null;
  TaseronFirmaId: string;
  TaseronFirmaAd: string;
  BaslangicTarihi: string;
  BitisTarihi?: string;
  Durum: 'TeklifAsamasi' | 'Anlasildi' | 'DevamEdiyor' | 'Tamamlandi' | 'Iptal';
  AnlasmaTuru: 'SadeceIscilik' | 'HerSeyDahilPaket' | 'Karma';
  IsKalemleri: TaseronIsKalemi[];
  YanGiderler: TaseronYanGiderItem[];
  // Anlaşılan Tutar Bilgileri
  ToplamIscilikTutari: number;
  BizimYanGiderTutarimiz: number;
  TaseronaDevredilenYanGiderTutari: number;
  AnlasilanToplamTutar: number;
  HerSeyDahilBirimFiyatHedefi?: number;
  Hakedisler: TaseronHakedisKaydi[];
  Notlar?: string;
  OlusturmaTarihi: string;
}

// ============================================================================
// ŞEHİR DIŞI GÖREVLENDİRME YAZISI MODELİ (4857 s. Kanun Uyumlu)
// ============================================================================

export interface SehirDisiGorevliPersonel {
  PersonelId?: number;
  TCKimlikNo: string;
  AdSoyad: string;
  GorevUnvan?: string;
  Telefon?: string;
  AcilDurumKisiVeTel?: string;
}

export interface SehirDisiGorevlendirme {
  GorevId: string;
  FormNo: string; // örn. "GRV-2026-001"
  ProjeId?: number | null; // İlişkili fabrika/şantiye projesi (null olabilir)
  ProjeAdi?: string | null;
  GidilecekIlIlce: string; // örn. "İzmir / Bornova"
  SantiyeAdresi: string; // Açık şantiye / işyeri adresi
  GorevAmaci: string; // örn. "Ege Bölge Hastanesi Ahşap Kaplama & Lambri Montajı"
  BaslangicTarihi: string; // YYYY-MM-DD
  BitisTarihi: string; // YYYY-MM-DD
  TahminiGunSayisi: number;
  
  // Ulaşım, Konaklama & Harcırah Şartları (4857 s. Kanun m.32 & BK m.414)
  UlasimSekli: 'Şirket Aracı' | 'Otobüs' | 'Uçak' | 'Özel Araç' | 'Diğer';
  AracPlakaVeyaBiletInfo?: string;
  KonaklamaTuru: 'Otel' | 'Şantiye Koğuşu' | 'Kiralanan Daire' | 'Yatılı Şantiye' | 'Diğer';
  KonaklamaAdresiInfo?: string;
  GunlukHarcirahTutar?: number; // ₺ / Gün
  YemekKarsilamaTuru: 'Şirket Tarafından Karşılanır' | 'Harcıraha Dahil' | 'Şantiye Tabldot';
  
  // Görevlendirilen İşçi Listesi
  Personeller: SehirDisiGorevliPersonel[];
  
  // Yasal Şartlar & İSG Bildirimi
  IsgUyariKabul: boolean;
  GenelNotlar?: string;
  DuzenleyenKisi: string; // İK Yetkilisi / Şantiye Şefi
  OlusturmaTarihi: string;
  Durum: 'Aktif' | 'Tamamlandı' | 'İptal';
}





