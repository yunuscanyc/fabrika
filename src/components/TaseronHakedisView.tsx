import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calculator, Scale, DollarSign, Plus, Trash2, Edit3, Save, Printer, 
  CheckCircle2, AlertTriangle, Building2, UserCheck, ChevronDown, ChevronRight,
  TrendingDown, ShieldAlert, Truck, Home, Utensils, HardHat, Wrench, Sparkles,
  Info, FileSpreadsheet, Layers, PieChart, Users, Phone, MapPin, X
} from 'lucide-react';
import { 
  TaseronAnlasma, TaseronIsKalemi, TaseronYanGiderItem, TaseronHakedisKaydi, 
  TaseronFirma, TaseronYanGiderKategori, TaseronBirimType, Proje 
} from '../types';
import { formatTarihTR, getBugunIso } from '../utils/dateUtils';

interface TaseronHakedisViewProps {
  projeler?: Proje[];
}

// Varsayılan Yan Gider Şablonları (Tek tıkla yüklenebilen zengin liste)
const VARSAYILAN_YAN_GIDER_SABLONLARI: Omit<TaseronYanGiderItem, 'Id'>[] = [
  // 1. Ulaşım & Lojistik
  { Kategori: 'Ulaşım & Lojistik', GiderAdI: 'Şehir İçi Servis / Dolmuş / Yakıt', HesapTuru: 'KisiGun', BirimMaliyet: 150, KisiSayisi: 4, GunSayisi: 15, ToplamTutar: 9000, Sorumlu: 'Biz', Aciklama: 'Şantiye-konaklama arası ulaşım' },
  { Kategori: 'Ulaşım & Lojistik', GiderAdI: 'Şehir Dışı Ulaşım (Otobüs/Uçak/Bilet)', HesapTuru: 'Toplu', BirimMaliyet: 3500, ToplamTutar: 3500, Sorumlu: 'Biz', Aciklama: 'Ekibin şantiyeye gidiş-dönüş bileti' },
  { Kategori: 'Ulaşım & Lojistik', GiderAdI: 'Şantiye Dikey Taşıma / Hammaliye / Vinç', HesapTuru: 'Toplu', BirimMaliyet: 4000, ToplamTutar: 4000, Sorumlu: 'Biz', Aciklama: 'Malzemenin katlara taşınması' },

  // 2. Konaklama & Barınma
  { Kategori: 'Konaklama & Barınma', GiderAdI: 'Konteyner / Şantiye Koğuşu Kiralama', HesapTuru: 'Aylik', BirimMaliyet: 8000, ToplamTutar: 8000, Sorumlu: 'Biz', Aciklama: 'Barınma koğuşu bedeli' },
  { Kategori: 'Konaklama & Barınma', GiderAdI: 'Daire Kirası / Otel Konaklaması', HesapTuru: 'KisiGun', BirimMaliyet: 400, KisiSayisi: 4, GunSayisi: 15, ToplamTutar: 24000, Sorumlu: 'Biz', Aciklama: 'Şantiye yakını konaklama' },
  { Kategori: 'Konaklama & Barınma', GiderAdI: 'Elektrik / Su / Doğalgaz / Tüp Faturaları', HesapTuru: 'Toplu', BirimMaliyet: 3000, ToplamTutar: 3000, Sorumlu: 'Biz', Aciklama: 'Konaklama yeri abonelikleri' },

  // 3. Yemek & İkram
  { Kategori: 'Yemek & İkram', GiderAdI: 'Günlük Tabldot Yemek / Yemek Kartı', HesapTuru: 'KisiGun', BirimMaliyet: 250, KisiSayisi: 4, GunSayisi: 15, ToplamTutar: 15000, Sorumlu: 'Biz', Aciklama: 'Öğle ve akşam yemeği' },
  { Kategori: 'Yemek & İkram', GiderAdI: 'Şantiye Çay / Kahve / Su / İkram', HesapTuru: 'Toplu', BirimMaliyet: 2000, ToplamTutar: 2000, Sorumlu: 'Biz', Aciklama: 'İçme suyu ve çay ikramı' },

  // 4. SGK & İSG Yasal
  { Kategori: 'SGK & İSG Yasal', GiderAdI: 'SGK Prim & Stopaj Bedeli', HesapTuru: 'KisiGun', BirimMaliyet: 280, KisiSayisi: 4, GunSayisi: 15, ToplamTutar: 16800, Sorumlu: 'Biz', Aciklama: 'İşçi resmi sigorta maliyeti' },
  { Kategori: 'SGK & İSG Yasal', GiderAdI: 'KKD Donanımı (Baret, Ayakkabı, Yelek, Kemer)', HesapTuru: 'Toplu', BirimMaliyet: 3200, ToplamTutar: 3200, Sorumlu: 'Biz', Aciklama: 'Kişisel koruyucu ekipman' },
  { Kategori: 'SGK & İSG Yasal', GiderAdI: 'İSG Eğitimi & Sağlık Raporu', HesapTuru: 'Toplu', BirimMaliyet: 2500, ToplamTutar: 2500, Sorumlu: 'Biz', Aciklama: 'Saha giriş izin belgeleri' },

  // 5. Sarf Malzeme & El Aletleri
  { Kategori: 'Sarf Malzeme & El Aletleri', GiderAdI: 'Montaj Sarfları (Silikon, Köpük, Vida, Zımpara, Tiner)', HesapTuru: 'Toplu', BirimMaliyet: 4500, ToplamTutar: 4500, Sorumlu: 'Biz', Aciklama: 'Sarf malzemeler' },
  { Kategori: 'Sarf Malzeme & El Aletleri', GiderAdI: 'Jeneratör / Kompresör / İskele Kiralama', HesapTuru: 'Toplu', BirimMaliyet: 6000, ToplamTutar: 6000, Sorumlu: 'Biz', Aciklama: 'Ekipman kiralama maliyeti' },

  // 6. Temizlik & Moloz Atımı
  { Kategori: 'Temizlik & Moloz Atımı', GiderAdI: 'Moloz Çuvallama & Konteyner Kamyon Bedeli', HesapTuru: 'Toplu', BirimMaliyet: 3500, ToplamTutar: 3500, Sorumlu: 'Biz', Aciklama: 'Atık ve moloz uzaklaştırma' },
  { Kategori: 'Temizlik & Moloz Atımı', GiderAdI: 'İmalat Sonu Kaba / İnce Temizlik', HesapTuru: 'Toplu', BirimMaliyet: 2000, ToplamTutar: 2000, Sorumlu: 'Biz', Aciklama: 'Saha teslim temizliği' },

  // 7. Risk & Fire Payı
  { Kategori: 'Risk & Fire Payı', GiderAdI: 'Malzeme Hatalı Kesim & Zayiat Payı (%3)', HesapTuru: 'Toplu', BirimMaliyet: 5000, ToplamTutar: 5000, Sorumlu: 'Biz', Aciklama: 'Olası kırım/zayiat riski' },
  { Kategori: 'Risk & Fire Payı', GiderAdI: 'Şantiye Şefi / Saha Kontrolör Zaman Maliyeti', HesapTuru: 'Toplu', BirimMaliyet: 4000, ToplamTutar: 4000, Sorumlu: 'Biz', Aciklama: 'Denetim ve takip yükü' }
];

export const TaseronHakedisView: React.FC<TaseronHakedisViewProps> = ({ projeler = [] }) => {
  const [activeTab, setActiveTab] = useState<'simulasyon' | 'anlasmalar' | 'hakedis' | 'firmalar'>('simulasyon');

  // LocalStorage Kalıcılığı
  const [anlasmalar, setAnlasmalar] = useState<TaseronAnlasma[]>(() => {
    try {
      const kayit = localStorage.getItem('rende_taseron_anlasmalar');
      if (kayit) return JSON.parse(kayit);
    } catch (e) {}
    return [
      {
        Id: 'TAS-101',
        AnlasmaKodu: 'TAS-2026-001',
        ProjeAdi: 'Çamlıca Villa Ahşap & Mobilya Uygulaması',
        TaseronFirmaId: 'FIR-01',
        TaseronFirmaAd: 'Ahmet Usta Ahşap & Lambri Sanayi',
        BaslangicTarihi: '2026-09-01',
        BitisTarihi: '2026-10-15',
        Durum: 'DevamEdiyor',
        AnlasmaTuru: 'HerSeyDahilPaket',
        IsKalemleri: [
          { Id: 'P-1', PozKodu: 'LAMB-01', IsKalemiAdi: 'Lambri Yapımı / Ahşap Kaplama', Birim: 'm²', Miktar: 500, BazBirimFiyat: 200, Aciklama: 'Ceviz kaplama lambri imalatı' },
          { Id: 'P-2', PozKodu: 'CITA-02', IsKalemiAdi: 'Çıta & Süpürgelik Montajı', Birim: 'Metre', Miktar: 350, BazBirimFiyat: 80, Aciklama: 'Masif meşe çıta' },
          { Id: 'P-3', PozKodu: 'DOL-03', IsKalemiAdi: 'Dolap / Vestiyer İmalatı & Montajı', Birim: 'Metretül (mt)', Miktar: 45, BazBirimFiyat: 1200, Aciklama: 'MDF Lam gövde Lake kapak' }
        ],
        YanGiderler: VARSAYILAN_YAN_GIDER_SABLONLARI.map((g, idx) => ({ ...g, Id: `YG-${idx + 1}`, Sorumlu: idx % 3 === 0 ? 'Taseron' : 'Biz' })),
        ToplamIscilikTutari: 182000,
        BizimYanGiderTutarimiz: 65000,
        TaseronaDevredilenYanGiderTutari: 32000,
        AnlasilanToplamTutar: 214000,
        HerSeyDahilBirimFiyatHedefi: 245,
        Hakedisler: [],
        OlusturmaTarihi: '2026-09-01'
      }
    ];
  });

  const [firmalar, setFirmalar] = useState<TaseronFirma[]>(() => {
    try {
      const kayit = localStorage.getItem('rende_taseron_firmalar');
      if (kayit) return JSON.parse(kayit);
    } catch (e) {}
    return [
      { Id: 'FIR-01', FirmaAdi: 'Ahmet Usta Ahşap & Lambri Sanayi', YetkiliKisi: 'Ahmet Yılmaz', Telefon: '0532 111 22 33', UzmanlikAlani: 'Lambri, Çıta, Süpürgelik & Panel', TcVeyaVergiNo: '12345678901', IbanNo: 'TR12 0006 2000 0000 1234 5678 90', Sehir: 'İstanbul', Puan: 5, AktifMi: true },
      { Id: 'FIR-02', FirmaAdi: 'Yılmaz Mobilya & Montaj Ekibi', YetkiliKisi: 'Mehmet Yılmaz', Telefon: '0533 444 55 66', UzmanlikAlani: 'Dolap, Mutfak & Vestiyer Montajı', TcVeyaVergiNo: '98765432109', IbanNo: 'TR98 0001 5000 0000 9876 5432 10', Sehir: 'Kocaeli', Puan: 4, AktifMi: true },
      { Id: 'FIR-03', FirmaAdi: 'Karakaya Cila & Boya Atölyesi', YetkiliKisi: 'Hasan Karakaya', Telefon: '0535 777 88 99', UzmanlikAlani: 'Lake Boya, Cila & Ahşap Bakım', TcVeyaVergiNo: '45678912304', IbanNo: 'TR45 0006 4000 0000 4567 8912 34', Sehir: 'Bursa', Puan: 5, AktifMi: true }
    ];
  });

  // Anlaşmaları LocalStorage'a kaydet
  useEffect(() => {
    try {
      localStorage.setItem('rende_taseron_anlasmalar', JSON.stringify(anlasmalar));
    } catch (e) {}
  }, [anlasmalar]);

  // Firmaları LocalStorage'a kaydet
  useEffect(() => {
    try {
      localStorage.setItem('rende_taseron_firmalar', JSON.stringify(firmalar));
    } catch (e) {}
  }, [firmalar]);

  // ============================================================================
  // SİMÜLASYON CANLI DURUM STATE'LERİ
  // ============================================================================
  const [simProjeAdi, setSimProjeAdi] = useState<string>('Yeni Şantiye Pazarlık Simülasyonu');
  const [simTaseronFirmaId, setSimTaseronFirmaId] = useState<string>('FIR-01');

  // Simülasyon İş Kalemleri (Pozlar)
  const [simIsKalemleri, setSimIsKalemleri] = useState<TaseronIsKalemi[]>([
    { Id: 'P-1', PozKodu: 'POZ-LAMB', IsKalemiAdi: 'Lambri Yapımı / Ahşap Kaplama', Birim: 'm²', Miktar: 500, BazBirimFiyat: 200, Aciklama: 'İşçilik birim fiyatı' },
    { Id: 'P-2', PozKodu: 'POZ-CITA', IsKalemiAdi: 'Çıta & Çerçeve İşleri', Birim: 'Metre', Miktar: 300, BazBirimFiyat: 80, Aciklama: 'Duvar çıta uygulaması' },
    { Id: 'P-3', PozKodu: 'POZ-DOLAP', IsKalemiAdi: 'Dolap İmalatı & Montajı', Birim: 'Metretül (mt)', Miktar: 40, BazBirimFiyat: 1200, Aciklama: 'Metretül dolap işçiliği' }
  ]);

  // Simülasyon Yan Giderleri (Varsayılan liste)
  const [simYanGiderler, setSimYanGiderler] = useState<TaseronYanGiderItem[]>(() => 
    VARSAYILAN_YAN_GIDER_SABLONLARI.map((g, idx) => ({ ...g, Id: `SIM-YG-${idx + 1}` }))
  );

  // Hedef Fiyat Kırma Pazarlık Marjı (%)
  const [pazarlikKirmaYuzdesi, setPazarlikKirmaYuzdesi] = useState<number>(8); // %8 indirim hedefi

  // Fiyat Kırma Simülasyonu Hesaplama Motoru
  const simMatriks = useMemo(() => {
    // 1. Toplam İşçilik Tutarı (Baz Fiyat)
    const toplamIscilikTutari = simIsKalemleri.reduce((acc, k) => acc + (k.Miktar * k.BazBirimFiyat), 0);

    // Toplam İş Miktarı Metrajı (Genel toplam hacim)
    const toplamMetraj = simIsKalemleri.reduce((acc, k) => acc + k.Miktar, 0);

    // 2. Yan Gider Dağılımı
    let bizimYanGiderTutarimiz = 0;
    let taseronaDevredilenYanGiderTutari = 0;

    const kategoriBazliGiderler: Record<TaseronYanGiderKategori, { Biz: number; Taseron: number; Toplam: number }> = {
      'Ulaşım & Lojistik': { Biz: 0, Taseron: 0, Toplam: 0 },
      'Konaklama & Barınma': { Biz: 0, Taseron: 0, Toplam: 0 },
      'Yemek & İkram': { Biz: 0, Taseron: 0, Toplam: 0 },
      'SGK & İSG Yasal': { Biz: 0, Taseron: 0, Toplam: 0 },
      'Sarf Malzeme & El Aletleri': { Biz: 0, Taseron: 0, Toplam: 0 },
      'Temizlik & Moloz Atımı': { Biz: 0, Taseron: 0, Toplam: 0 },
      'Risk & Fire Payı': { Biz: 0, Taseron: 0, Toplam: 0 }
    };

    simYanGiderler.forEach(g => {
      let tutar = g.ToplamTutar;
      if (g.HesapTuru === 'KisiGun' && g.KisiSayisi && g.GunSayisi) {
        tutar = g.BirimMaliyet * g.KisiSayisi * g.GunSayisi;
      }

      if (g.Sorumlu === 'Biz') {
        bizimYanGiderTutarimiz += tutar;
        kategoriBazliGiderler[g.Kategori].Biz += tutar;
      } else if (g.Sorumlu === 'Taseron') {
        taseronaDevredilenYanGiderTutari += tutar;
        kategoriBazliGiderler[g.Kategori].Taseron += tutar;
      }
      kategoriBazliGiderler[g.Kategori].Toplam += tutar;
    });

    const toplamTumYanGiderler = bizimYanGiderTutarimiz + taseronaDevredilenYanGiderTutari;

    // Senaryo A: Sadece İşçilik + Bizim Karşıladığımız Yan Giderler
    const senaryoAToplamMaliyet = toplamIscilikTutari + bizimYanGiderTutarimiz;

    // Senaryo B: "Her Şey Dahil" Paket (Tüm yan giderler taşeronda veya ortak)
    const herSeyDahilTavanMaliyet = toplamIscilikTutari + toplamTumYanGiderler;

    // Birim Başına Düşen Gizli Yük (Yan Giderin İşçiliğe Oranı)
    const yanGiderYukOrani = toplamIscilikTutari > 0 ? (bizimYanGiderTutarimiz / toplamIscilikTutari) * 100 : 0;

    // Fiyat Kırma Pazarlığı ile Kazanç
    const pazarlikKirmaTutari = herSeyDahilTavanMaliyet * (pazarlikKirmaYuzdesi / 100);
    const pazarlikliOnerilecekHerSeyDahilPaket = herSeyDahilTavanMaliyet - pazarlikKirmaTutari;
    const netSirketTasarrufu = herSeyDahilTavanMaliyet - pazarlikliOnerilecekHerSeyDahilPaket;

    return {
      toplamIscilikTutari,
      toplamMetraj,
      bizimYanGiderTutarimiz,
      taseronaDevredilenYanGiderTutari,
      toplamTumYanGiderler,
      senaryoAToplamMaliyet,
      herSeyDahilTavanMaliyet,
      yanGiderYukOrani,
      pazarlikKirmaTutari,
      pazarlikliOnerilecekHerSeyDahilPaket,
      netSirketTasarrufu,
      kategoriBazliGiderler
    };
  }, [simIsKalemleri, simYanGiderler, pazarlikKirmaYuzdesi]);

  // Modal / Yazdır State
  const [yazdirModalAcik, setYazdirModalAcik] = useState(false);
  const [firmaModalAcik, setFirmaModalAcik] = useState(false);
  const [yeniFirma, setYeniFirma] = useState<Partial<TaseronFirma>>({ AktifMi: true });

  // Yeni İş Kalemi Ekleme
  const handleIsKalemiEkle = () => {
    const yeni: TaseronIsKalemi = {
      Id: `P-${Date.now()}`,
      PozKodu: `POZ-0${simIsKalemleri.length + 1}`,
      IsKalemiAdi: 'Yeni İş Kalemi / İmalat',
      Birim: 'm²',
      Miktar: 100,
      BazBirimFiyat: 150,
      Aciklama: 'İşçilik açıklaması'
    };
    setSimIsKalemleri([...simIsKalemleri, yeni]);
  };

  const handleIsKalemiSil = (id: string) => {
    setSimIsKalemleri(simIsKalemleri.filter(p => p.Id !== id));
  };

  const handleIsKalemiGuncelle = (id: string, alan: keyof TaseronIsKalemi, deger: any) => {
    setSimIsKalemleri(simIsKalemleri.map(p => p.Id === id ? { ...p, [alan]: deger } : p));
  };

  // Yan Gider Toplu Sorumlu Değiştirme
  const handleTopluYanGiderSorumluDegistir = (sorumlu: 'Biz' | 'Taseron' | 'Muaf') => {
    setSimYanGiderler(simYanGiderler.map(g => ({ ...g, Sorumlu: sorumlu })));
  };

  // Yan Gider Sorumlu Degistir
  const handleYanGiderSorumluDegistir = (id: string, sorumlu: 'Biz' | 'Taseron' | 'Muaf') => {
    setSimYanGiderler(simYanGiderler.map(g => g.Id === id ? { ...g, Sorumlu: sorumlu } : g));
  };

  // Yan Gider Tutar Degistir
  const handleYanGiderTutarDegistir = (id: string, yeniTutar: number) => {
    setSimYanGiderler(simYanGiderler.map(g => g.Id === id ? { ...g, ToplamTutar: yeniTutar } : g));
  };

  // Simülasyonu Anlaşma Olarak Kaydet
  const handleAnlasmaOlarakKaydet = () => {
    const seciliFirma = firmalar.find(f => f.Id === simTaseronFirmaId);
    const yeniAnlasma: TaseronAnlasma = {
      Id: `TAS-${Date.now()}`,
      AnlasmaKodu: `TAS-2026-00${anlasmalar.length + 1}`,
      ProjeAdi: simProjeAdi,
      TaseronFirmaId: simTaseronFirmaId,
      TaseronFirmaAd: seciliFirma?.FirmaAdi || 'Bilinmeyen Taşeron',
      BaslangicTarihi: getBugunIso(),
      Durum: 'TeklifAsamasi',
      AnlasmaTuru: simMatriks.taseronaDevredilenYanGiderTutari > 0 ? 'HerSeyDahilPaket' : 'SadeceIscilik',
      IsKalemleri: [...simIsKalemleri],
      YanGiderler: [...simYanGiderler],
      ToplamIscilikTutari: simMatriks.toplamIscilikTutari,
      BizimYanGiderTutarimiz: simMatriks.bizimYanGiderTutarimiz,
      TaseronaDevredilenYanGiderTutari: simMatriks.taseronaDevredilenYanGiderTutari,
      AnlasilanToplamTutar: simMatriks.pazarlikliOnerilecekHerSeyDahilPaket,
      Hakedisler: [],
      OlusturmaTarihi: getBugunIso()
    };

    setAnlasmalar([yeniAnlasma, ...anlasmalar]);
    alert(`"${simProjeAdi}" sözleşme simülasyonu teklif olarak kaydedildi!`);
    setActiveTab('anlasmalar');
  };

  // Yeni Firma Kaydet
  const handleFirmaKaydet = () => {
    if (!yeniFirma.FirmaAdi || !yeniFirma.YetkiliKisi) {
      alert('Lütfen Firma Adı ve Yetkili Kişi alanlarını doldurunuz.');
      return;
    }
    const ekleFirma: TaseronFirma = {
      Id: `FIR-${Date.now()}`,
      FirmaAdi: yeniFirma.FirmaAdi,
      YetkiliKisi: yeniFirma.YetkiliKisi,
      Telefon: yeniFirma.Telefon || '-',
      UzmanlikAlani: yeniFirma.UzmanlikAlani || 'Genel Mobilya & Şantiye',
      TcVeyaVergiNo: yeniFirma.TcVeyaVergiNo || '-',
      IbanNo: yeniFirma.IbanNo || '-',
      Sehir: yeniFirma.Sehir || 'İstanbul',
      Puan: 5,
      AktifMi: true
    };
    setFirmalar([...firmalar, ekleFirma]);
    setFirmaModalAcik(false);
    setYeniFirma({ AktifMi: true });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ========================================================================= */}
      {/* ÜST BAŞLIK & İSTATİSTİK ÖZET KARTLARI */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>Hakediş &amp; Maliyet Yönetimi</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              🔨 Taşeron Birim Fiyat &amp; Yan Gider Pazarlık Paneli
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              İşçilik birim fiyatlarını (m², mt, metre) ve yemek, yatak, sigorta, ulaşım gibi şantiye yan giderlerini hesaba katarak taşeron tekliflerini simüle edin ve en karlı anlaşmayı yapın.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setYazdirModalAcik(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Pazarlık Analiz Raporu Çıkar</span>
            </button>
            <button
              onClick={handleAnlasmaOlarakKaydet}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Anlaşmayı Kaydet</span>
            </button>
          </div>
        </div>

        {/* 4 Özet Gösterge Kartı */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-400 block">Simüle Edilen İşçilik</span>
            <span className="text-lg font-black text-white mt-0.5 block">
              {simMatriks.toplamIscilikTutari.toLocaleString('tr-TR')} ₺
            </span>
            <span className="text-[10px] text-slate-500">{simIsKalemleri.length} Farklı Poz Kalemi</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-400 block">Şirket Yan Gider Yükü</span>
            <span className="text-lg font-black text-amber-400 mt-0.5 block">
              {simMatriks.bizimYanGiderTutarimiz.toLocaleString('tr-TR')} ₺
            </span>
            <span className="text-[10px] text-amber-500/80 font-bold">
              İşçiliğe Oranı: +%{simMatriks.yanGiderYukOrani.toFixed(1)} Ek Gizli Yük
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-400 block">Taşerona Devredilen Gider</span>
            <span className="text-lg font-black text-indigo-400 mt-0.5 block">
              {simMatriks.taseronaDevredilenYanGiderTutari.toLocaleString('tr-TR')} ₺
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">Taşeron Üstlendi</span>
          </div>

          <div className="bg-emerald-950/40 border border-emerald-800/60 p-3.5 rounded-xl">
            <span className="text-[11px] font-bold text-emerald-300 block">Fiyat Kırma Potansiyel Kazancı</span>
            <span className="text-lg font-black text-emerald-400 mt-0.5 block">
              {simMatriks.netSirketTasarrufu.toLocaleString('tr-TR')} ₺
            </span>
            <span className="text-[10px] text-emerald-300/80 font-bold">
              %{pazarlikKirmaYuzdesi} Hedef İndirim Kazancı
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEKMELER NAVİGASYONU */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 shadow-md">
        <button
          onClick={() => setActiveTab('simulasyon')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'simulasyon'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>🧮 Fiyat Kırma &amp; Yan Gider Simülatörü</span>
        </button>

        <button
          onClick={() => setActiveTab('anlasmalar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'anlasmalar'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>📋 Sözleşme &amp; Anlaşmalar ({anlasmalar.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('hakedis')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'hakedis'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>💰 Hakediş &amp; İlerleme Takibi</span>
        </button>

        <button
          onClick={() => setActiveTab('firmalar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'firmalar'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>🏢 Taşeron Firma Rehberi ({firmalar.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SEKME 1: FİYAT KIRMA & YAN GİDER PAZARLIK SİMÜLÂTÖRÜ */}
      {/* ========================================================================= */}
      {activeTab === 'simulasyon' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SOL TARAFI (8 KANAT): POZ CETVELİ VE YAN GİDER MATRİSİ */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. KISIM: PROJE VE TAŞERON FİRMA SEÇİMİ */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>1. Proje ve Taşeron Firma Tanımı</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Şantiye / Proje Adı</label>
                  <input
                    type="text"
                    value={simProjeAdi}
                    onChange={(e) => setSimProjeAdi(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
                    placeholder="Örn: Levent Ofis Mobilya Montajı"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Pazarlık Edilecek Taşeron Firma / Ekip</label>
                  <select
                    value={simTaseronFirmaId}
                    onChange={(e) => setSimTaseronFirmaId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
                  >
                    {firmalar.map(f => (
                      <option key={f.Id} value={f.Id}>
                        {f.FirmaAdi} ({f.UzmanlikAlani})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. KISIM: İŞ KALEMLERİ / POZ CETVELİ (METRAJ & BİRİM FİYATLAR) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>2. İş Kalemleri Cetveli (Birim Fiyat Pozları)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Metrajlar (m², Metre, Metretül mt) ve teklif edilen işçilik birim fiyatlarını girin.
                  </p>
                </div>
                <button
                  onClick={handleIsKalemiEkle}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Poz Ekle</span>
                </button>
              </div>

              {/* Poz Tablosu */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-lg">Poz Kodu</th>
                      <th className="py-2.5 px-3">İş Kalemi Adı / İmalat</th>
                      <th className="py-2.5 px-3 text-center">Birim</th>
                      <th className="py-2.5 px-3 text-right">Miktar</th>
                      <th className="py-2.5 px-3 text-right">Baz Fiyat (₺)</th>
                      <th className="py-2.5 px-3 text-right">Toplam Tutar</th>
                      <th className="py-2.5 px-3 text-center rounded-r-lg">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {simIsKalemleri.map((poz) => (
                      <tr key={poz.Id} className="hover:bg-slate-850 transition">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={poz.PozKodu}
                            onChange={(e) => handleIsKalemiGuncelle(poz.Id, 'PozKodu', e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-400 w-24"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={poz.IsKalemiAdi}
                            onChange={(e) => handleIsKalemiGuncelle(poz.Id, 'IsKalemiAdi', e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-semibold text-white w-full"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <select
                            value={poz.Birim}
                            onChange={(e) => handleIsKalemiGuncelle(poz.Id, 'Birim', e.target.value as TaseronBirimType)}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-300"
                          >
                            <option value="m²">m²</option>
                            <option value="Metre">Metre</option>
                            <option value="Metretül (mt)">Metretül (mt)</option>
                            <option value="Adet">Adet</option>
                            <option value="Kg">Kg</option>
                            <option value="Gün">Gün</option>
                            <option value="Plaka">Plaka</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={poz.Miktar}
                            onChange={(e) => handleIsKalemiGuncelle(poz.Id, 'Miktar', parseFloat(e.target.value) || 0)}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-bold text-white w-20 text-right"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={poz.BazBirimFiyat}
                            onChange={(e) => handleIsKalemiGuncelle(poz.Id, 'BazBirimFiyat', parseFloat(e.target.value) || 0)}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-black text-emerald-400 w-24 text-right"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-black text-white">
                          {(poz.Miktar * poz.BazBirimFiyat).toLocaleString('tr-TR')} ₺
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleIsKalemiSil(poz.Id)}
                            className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                            title="Pozu Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-950 font-black text-white border-t border-slate-800">
                      <td colSpan={3} className="py-2.5 px-3">TOPLAM BAZ İŞÇİLİK TUTARI</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{simMatriks.toplamMetraj} Birim Hacim</td>
                      <td className="py-2.5 px-3"></td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 text-sm">
                        {simMatriks.toplamIscilikTutari.toLocaleString('tr-TR')} ₺
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 3. KISIM: YAN GİDERLER MATRİSİ & MÜLKİYET / SORUMLU ATAMA */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>3. Yan Giderler Matrisi (Kim Karşılıyor?)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Yemek, yatak, sigorta, ulaşım ve ekipman giderlerini işaretleyerek fiyat kırma pazarlığını yönetin.
                  </p>
                </div>

                {/* Toplu Atama Butonları */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold px-2">Toplu Sorumlu:</span>
                  <button
                    onClick={() => handleTopluYanGiderSorumluDegistir('Biz')}
                    className="px-2 py-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 cursor-pointer"
                  >
                    Tümünü Biz Karşıla
                  </button>
                  <button
                    onClick={() => handleTopluYanGiderSorumluDegistir('Taseron')}
                    className="px-2 py-1 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/30 cursor-pointer"
                  >
                    Tümünü Taşerona Devret
                  </button>
                </div>
              </div>

              {/* Yan Giderler Tablosu */}
              <div className="space-y-4">
                {Array.from(new Set(simYanGiderler.map(g => g.Kategori))).map((kategori) => {
                  const kategoriGiderleri = simYanGiderler.filter(g => g.Kategori === kategori);
                  const katOzet = simMatriks.kategoriBazliGiderler[kategori as TaseronYanGiderKategori];

                  return (
                    <div key={kategori} className="bg-slate-950/70 border border-slate-800/80 rounded-xl overflow-hidden">
                      <div className="bg-slate-850 px-3.5 py-2 flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-200">{kategori}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                            {kategoriGiderleri.length} Kalem
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-300 flex items-center gap-3">
                          <span className="text-amber-400">Biz: {katOzet.Biz.toLocaleString('tr-TR')} ₺</span>
                          <span className="text-indigo-400">Taşeron: {katOzet.Taseron.toLocaleString('tr-TR')} ₺</span>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-800/50">
                        {kategoriGiderleri.map((gider) => (
                          <div key={gider.Id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-850/50 transition">
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-white block">{gider.GiderAdI}</span>
                              <span className="text-[10px] text-slate-400 block">{gider.Aciklama}</span>
                            </div>

                            <div className="flex items-center gap-4 self-end sm:self-center">
                              {/* Tutar Girişi */}
                              <div className="text-right">
                                <input
                                  type="number"
                                  value={gider.ToplamTutar}
                                  onChange={(e) => handleYanGiderTutarDegistir(gider.Id, parseFloat(e.target.value) || 0)}
                                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-bold text-emerald-400 w-24 text-right"
                                />
                                <span className="text-[10px] text-slate-500 block">₺ / Toplam</span>
                              </div>

                              {/* Sorumlu Seçim Radyo Butonları */}
                              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                                <button
                                  onClick={() => handleYanGiderSorumluDegistir(gider.Id, 'Biz')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    gider.Sorumlu === 'Biz'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                  title="Biz Karşılıyoruz (Bizim Maliyet)"
                                >
                                  Biz
                                </button>
                                <button
                                  onClick={() => handleYanGiderSorumluDegistir(gider.Id, 'Taseron')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    gider.Sorumlu === 'Taseron'
                                      ? 'bg-indigo-600 text-white shadow-xs'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                  title="Taşeron Karşılıyor (Fiyat Kırmada Devredildi)"
                                >
                                  Taşeron
                                </button>
                                <button
                                  onClick={() => handleYanGiderSorumluDegistir(gider.Id, 'Muaf')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    gider.Sorumlu === 'Muaf'
                                      ? 'bg-slate-700 text-slate-200'
                                      : 'text-slate-500 hover:text-white'
                                  }`}
                                  title="Muaf / Yok"
                                >
                                  Muaf
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SAĞ TARAFI (4 KANAT): CANLI PAZARLIK & SENARYO DENGESİ KARTI */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* PAZARLIK HESAP KARTI */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl sticky top-20 space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Canlı Fiyat Kırma Motoru</span>
                <h3 className="text-lg font-black text-white mt-0.5">Pazarlık &amp; Maliyet Dengesi</h3>
              </div>

              {/* SENARYO A: Sadece İşçilik + Yan Gider Bizden */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Senaryo A: Sadece İşçilik</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">Bizim Yan Giderli</span>
                </div>
                <div className="text-xl font-black text-white">
                  {simMatriks.senaryoAToplamMaliyet.toLocaleString('tr-TR')} ₺
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span>İşçilik Tutar:</span>
                    <span className="font-semibold">{simMatriks.toplamIscilikTutari.toLocaleString('tr-TR')} ₺</span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-bold">
                    <span>Bizim Yan Gider Yükümüz:</span>
                    <span>+{simMatriks.bizimYanGiderTutarimiz.toLocaleString('tr-TR')} ₺</span>
                  </div>
                </div>
              </div>

              {/* SENARYO B: Her Şey Dahil Paket + Fiyat Kırma */}
              <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300">Senaryo B: Her Şey Dahil Paket</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200">Devredilen</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block">Tavan Tutar (Sıfır Kar/Zarar):</span>
                  <div className="text-lg font-black text-slate-200 line-through">
                    {simMatriks.herSeyDahilTavanMaliyet.toLocaleString('tr-TR')} ₺
                  </div>
                </div>

                {/* Slider / Fiyat Kırma Yüzdesi */}
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Fiyat Kırma Pazarlık Marjı:</span>
                    <span className="font-black text-emerald-400">%{pazarlikKirmaYuzdesi} İndirim</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={pazarlikKirmaYuzdesi}
                    onChange={(e) => setPazarlikKirmaYuzdesi(parseInt(e.target.value) || 0)}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* PAZARLIKLI ÖNERİLECEK RAKAM */}
                <div className="pt-2 border-t border-indigo-800/50">
                  <span className="text-xs font-bold text-emerald-400 block">Taşerona Teklif Edilecek Rakam:</span>
                  <div className="text-2xl font-black text-emerald-300 mt-1">
                    {simMatriks.pazarlikliOnerilecekHerSeyDahilPaket.toLocaleString('tr-TR')} ₺
                  </div>
                  <span className="text-[11px] text-emerald-400 font-bold block mt-1">
                    🎯 Şirket Net Tasarrufu: +{simMatriks.netSirketTasarrufu.toLocaleString('tr-TR')} ₺
                  </span>
                </div>
              </div>

              {/* TAVSİYE & STRATEJİ KUTUSU */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <Info className="w-4 h-4" />
                  <span>Masadaki Pazarlık Kozunuz:</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Taşerona: <strong className="text-white font-bold">"Sigortanı, yemeğini, yatağını ve ulaşımını biz takipsiz her şey dahil paket olarak devrediyoruz. Toplam bütçemiz {simMatriks.pazarlikliOnerilecekHerSeyDahilPaket.toLocaleString('tr-TR')} ₺'dir."</strong> diyerek pazarlık yapabilirsiniz.
                </p>
              </div>

              <button
                onClick={handleAnlasmaOlarakKaydet}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Anlaşmayı Teklif Olarak Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEKME 2: ANLAŞMALAR & SÖZLEŞME LİSTESİ */}
      {/* ========================================================================= */}
      {activeTab === 'anlasmalar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-base font-black text-white">📋 Taşeron Sözleşme &amp; Anlaşma Listesi</h3>
              <p className="text-xs text-slate-400">Kayıtlı taşeron pazarlıkları, teklif durumları ve sözleşme kalemleri</p>
            </div>
            <button
              onClick={() => setActiveTab('simulasyon')}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Simülasyon / Anlaşma Başlat</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anlasmalar.map((anl) => (
              <div key={anl.Id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4 hover:border-slate-700 transition">
                <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {anl.AnlasmaKodu}
                    </span>
                    <h4 className="text-sm font-black text-white mt-1.5">{anl.ProjeAdi}</h4>
                    <span className="text-xs text-slate-400 block mt-0.5">🏢 {anl.TaseronFirmaAd}</span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    anl.Durum === 'DevamEdiyor' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    anl.Durum === 'TeklifAsamasi' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {anl.Durum === 'DevamEdiyor' ? '🟢 Devam Ediyor' : anl.Durum === 'TeklifAsamasi' ? '🟡 Teklif Aşaması' : '⚪ Tamamlandı'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Anlaşılan Toplam Tutar</span>
                    <span className="text-sm font-black text-emerald-400 mt-0.5 block">
                      {anl.AnlasilanToplamTutar.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Anlaşma Türü</span>
                    <span className="text-xs font-bold text-indigo-300 mt-1 block">
                      {anl.AnlasmaTuru === 'HerSeyDahilPaket' ? '📦 Her Şey Dahil Paket' : '🔨 Sadece İşçilik'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 space-y-1">
                  <div>• İş Kalemi Sayısı: <strong className="text-slate-200">{anl.IsKalemleri.length} Poz</strong></div>
                  <div>• Başlangıç Tarihi: <strong className="text-slate-200">{formatTarihTR(anl.BaslangicTarihi)}</strong></div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setActiveTab('hakedis');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Hakediş Oluştur</span>
                  </button>

                  <button
                    onClick={() => {
                      setAnlasmalar(anlasmalar.filter(a => a.Id !== anl.Id));
                    }}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded transition"
                    title="Sözleşmeyi Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEKME 3: TAŞERON HAKEDİŞ & ÖDEME TAKİBİ */}
      {/* ========================================================================= */}
      {activeTab === 'hakedis' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white">💰 Taşeron Hakediş Cetveli &amp; İlerleme Girişi</h3>
              <p className="text-xs text-slate-400">Şantiyede tamamlanan imalat metrajlarına göre dönem hakedişlerini düzenleyin.</p>
            </div>
            <button
              onClick={() => alert('Dönem Hakediş Cetveli Oluşturuldu!')}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Hakediş Kaydı Ekle</span>
            </button>
          </div>

          {/* Hakediş Tablosu Örneği */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Hakediş No</th>
                  <th className="py-2.5 px-3">Sözleşme / Proje</th>
                  <th className="py-2.5 px-3">Taşeron Firma</th>
                  <th className="py-2.5 px-3 text-right">Brüt Hakediş</th>
                  <th className="py-2.5 px-3 text-right text-amber-400">Avans / Kesinti</th>
                  <th className="py-2.5 px-3 text-right text-emerald-400">Net Ödenecek</th>
                  <th className="py-2.5 px-3 text-center">Durum</th>
                  <th className="py-2.5 px-3 text-center rounded-r-lg">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr className="hover:bg-slate-850 transition">
                  <td className="py-3 px-3 font-mono font-bold text-amber-400">HAKEDİŞ #1</td>
                  <td className="py-3 px-3 font-bold text-white">Çamlıca Villa Ahşap &amp; Mobilya</td>
                  <td className="py-3 px-3 text-slate-300">Ahmet Usta Ahşap &amp; Lambri</td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-200">65.000 ₺</td>
                  <td className="py-3 px-3 text-right font-semibold text-amber-400">-10.000 ₺</td>
                  <td className="py-3 px-3 text-right font-black text-emerald-400 text-sm">55.000 ₺</td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      🟢 Ödendi
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => alert('Hakediş Belgesi Çıkarılıyor...')}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEKME 4: TAŞERON FİRMA REHBERİ */}
      {/* ========================================================================= */}
      {activeTab === 'firmalar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-base font-black text-white">🏢 Anlaşmalı Taşeron Firma &amp; Usta Rehberi</h3>
              <p className="text-xs text-slate-400">Uzmanlık alanları, IBAN ve iletişim bilgileri</p>
            </div>
            <button
              onClick={() => setFirmaModalAcik(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Taşeron Ekle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {firmalar.map((f) => (
              <div key={f.Id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">{f.FirmaAdi}</h4>
                    <span className="text-xs font-semibold text-amber-400 block mt-0.5">👤 {f.YetkiliKisi}</span>
                  </div>
                  <span className="text-amber-400 text-xs font-black">{"★".repeat(f.Puan || 5)}</span>
                </div>

                <div className="space-y-1 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    <span>{f.Telefon}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{f.Sehir}</span>
                  </div>
                  <div className="pt-1 text-[11px]">
                    <strong className="text-slate-300 block">Uzmanlık:</strong>
                    <span className="text-slate-400">{f.UzmanlikAlani}</span>
                  </div>
                  <div className="pt-1 font-mono text-[10px] text-slate-500">
                    IBAN: {f.IbanNo}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: YENİ TAŞERON FİRMA EKLE */}
      {/* ========================================================================= */}
      {firmaModalAcik && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>Yeni Taşeron Firma Kaydı</span>
              </h3>
              <button onClick={() => setFirmaModalAcik(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Firma / Ekip Adı *</label>
                <input
                  type="text"
                  value={yeniFirma.FirmaAdi || ''}
                  onChange={(e) => setYeniFirma({ ...yeniFirma, FirmaAdi: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold"
                  placeholder="Örn: Özkan Ahşap Montaj Ekibi"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Yetkili Usta / Kişi *</label>
                <input
                  type="text"
                  value={yeniFirma.YetkiliKisi || ''}
                  onChange={(e) => setYeniFirma({ ...yeniFirma, YetkiliKisi: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold"
                  placeholder="Örn: Özkan Usta"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Telefon</label>
                  <input
                    type="text"
                    value={yeniFirma.Telefon || ''}
                    onChange={(e) => setYeniFirma({ ...yeniFirma, Telefon: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    placeholder="0532..."
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Şehir</label>
                  <input
                    type="text"
                    value={yeniFirma.Sehir || ''}
                    onChange={(e) => setYeniFirma({ ...yeniFirma, Sehir: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    placeholder="İstanbul"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Uzmanlık Alanı</label>
                <input
                  type="text"
                  value={yeniFirma.UzmanlikAlani || ''}
                  onChange={(e) => setYeniFirma({ ...yeniFirma, UzmanlikAlani: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="Örn: Lambri, Çıta, Süpürgelik & Dolap"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">IBAN Numarası</label>
                <input
                  type="text"
                  value={yeniFirma.IbanNo || ''}
                  onChange={(e) => setYeniFirma({ ...yeniFirma, IbanNo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  placeholder="TR..."
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setFirmaModalAcik(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={handleFirmaKaydet}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: YAZDIR / FAZALIK & PAZARLIK ANALİZ RAPORU */}
      {/* ========================================================================= */}
      {yazdirModalAcik && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 taseron-print-overlay">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 portrait;
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
              .taseron-print-overlay {
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
              .taseron-print-content {
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                background: white !important;
                padding: 10mm 12mm !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
              }
              .no-print, .no-print * {
                display: none !important;
              }
            }
          `}} />

          <div className="bg-white text-black rounded-2xl w-full max-w-4xl p-8 shadow-2xl space-y-6 taseron-print-content">
            {/* Kontrol Butonları (Yazdırmada Gizli) */}
            <div className="no-print flex items-center justify-between border-b pb-3 mb-2">
              <span className="text-xs font-bold text-slate-500">A4 Yazdırma Önizleme</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Yazdır / PDF Kaydet</span>
                </button>
                <button
                  onClick={() => setYazdirModalAcik(false)}
                  className="px-3 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>

            {/* RAPOR ANTETİ */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div>
                <h1 className="text-xl font-black tracking-tight">RENDE MOBİLYA &amp; ŞANTİYE YÖNETİMİ</h1>
                <p className="text-xs text-slate-600 font-bold">Taşeron Birim Fiyat &amp; Yan Gider Pazarlık Analiz Formu</p>
              </div>
              <div className="text-right text-xs">
                <div><strong className="font-bold">Tarih:</strong> {formatTarihTR(getBugunIso())}</div>
                <div><strong className="font-bold">Doküman No:</strong> PZR-2026-001</div>
              </div>
            </div>

            {/* RAPOR DETAYLARI */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border">
              <div>
                <span className="text-slate-500 block">Şantiye / Proje:</span>
                <strong className="text-sm">{simProjeAdi}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Pazarlık Edilen Taşeron:</span>
                <strong className="text-sm">
                  {firmalar.find(f => f.Id === simTaseronFirmaId)?.FirmaAdi || 'Taşeron Ekip'}
                </strong>
              </div>
            </div>

            {/* 1. İŞ KALEMLERİ TABLOSU */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2 border-b pb-1">1. İş Kalemleri &amp; Baz İşçilik Birim Fiyatları</h3>
              <table className="w-full text-left text-xs border border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b">
                    <th className="p-2 border">Poz Kodu</th>
                    <th className="p-2 border">İş Kalemi Adı</th>
                    <th className="p-2 border text-center">Birim</th>
                    <th className="p-2 border text-right">Miktar</th>
                    <th className="p-2 border text-right">Baz Fiyat</th>
                    <th className="p-2 border text-right">Toplam Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {simIsKalemleri.map((poz) => (
                    <tr key={poz.Id} className="border-b">
                      <td className="p-2 border font-mono font-bold">{poz.PozKodu}</td>
                      <td className="p-2 border">{poz.IsKalemiAdi}</td>
                      <td className="p-2 border text-center">{poz.Birim}</td>
                      <td className="p-2 border text-right">{poz.Miktar}</td>
                      <td className="p-2 border text-right">{poz.BazBirimFiyat.toLocaleString('tr-TR')} ₺</td>
                      <td className="p-2 border text-right font-bold">{(poz.Miktar * poz.BazBirimFiyat).toLocaleString('tr-TR')} ₺</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={5} className="p-2 border">TOPLAM İŞÇİLİK BAZ TUTARI</td>
                    <td className="p-2 border text-right text-sm">{simMatriks.toplamIscilikTutari.toLocaleString('tr-TR')} ₺</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. PAZARLIK & SENARYO DENGESİ RAPORU */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="border p-3 rounded-lg bg-amber-50/50">
                <span className="font-bold block text-amber-900 border-b pb-1 mb-2">A. Sadece İşçilik Senaryosu</span>
                <div>• Baz İşçilik Tutarı: <strong>{simMatriks.toplamIscilikTutari.toLocaleString('tr-TR')} ₺</strong></div>
                <div>• Şirketin Üstlendiği Yan Giderler: <strong>{simMatriks.bizimYanGiderTutarimiz.toLocaleString('tr-TR')} ₺</strong></div>
                <div className="mt-2 pt-2 border-t font-black text-sm text-amber-900">
                  Gerçek Toplam Maliyet: {simMatriks.senaryoAToplamMaliyet.toLocaleString('tr-TR')} ₺
                </div>
              </div>

              <div className="border p-3 rounded-lg bg-emerald-50/50">
                <span className="font-bold block text-emerald-900 border-b pb-1 mb-2">B. Her Şey Dahil Taşeron Teklifi (%{pazarlikKirmaYuzdesi} İndirimli)</span>
                <div>• Yan Giderler Taşerona Devredildi</div>
                <div>• Tavan Paket Fiyatı: <strong>{simMatriks.herSeyDahilTavanMaliyet.toLocaleString('tr-TR')} ₺</strong></div>
                <div className="mt-2 pt-2 border-t font-black text-sm text-emerald-900">
                  Önerilecek Paket Fiyat: {simMatriks.pazarlikliOnerilecekHerSeyDahilPaket.toLocaleString('tr-TR')} ₺
                </div>
                <div className="text-[11px] text-emerald-700 font-bold mt-1">
                  Net Şirket Tasarrufu: +{simMatriks.netSirketTasarrufu.toLocaleString('tr-TR')} ₺
                </div>
              </div>
            </div>

            {/* İMZA ALANI */}
            <div className="pt-8 grid grid-cols-2 text-center text-xs">
              <div>
                <p className="font-bold">Şantiye / Satınalma Yetkilisi</p>
                <div className="h-12"></div>
                <p className="text-slate-500">İmza / Onay</p>
              </div>
              <div>
                <p className="font-bold">Taşeron Firma Yetkilisi</p>
                <div className="h-12"></div>
                <p className="text-slate-500">İmza / Kaşe</p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
