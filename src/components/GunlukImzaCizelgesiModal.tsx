import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Personel, IzinKaydi, GunlukPuantaj } from '../types';
import { Printer, X, UserCheck } from 'lucide-react';
import { formatTarihTR, getBugunIso, formatTarihUzunTR } from '../utils/dateUtils';
import { isPersonelCalisiyorMuTarihte } from '../utils/personelUtils';

interface GunlukImzaCizelgesiModalProps {
  isOpen: boolean;
  onClose: () => void;
  personeller: Personel[];
  varsayilanTarih?: string;
  izinler?: IzinKaydi[];
  puantajlar?: GunlukPuantaj[];
}

export const GunlukImzaCizelgesiModal: React.FC<GunlukImzaCizelgesiModalProps> = ({
  isOpen,
  onClose,
  personeller,
  varsayilanTarih,
  izinler,
  puantajlar
}) => {
  const getTomorrowDate = (baseDateStr: string) => {
    const match = (baseDateStr || '').match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (!match) return getBugunIso();
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    dt.setDate(dt.getDate() + 1); // 1 gün sonrasını seç
    const resY = dt.getFullYear();
    const resM = String(dt.getMonth() + 1).padStart(2, '0');
    const resD = String(dt.getDate()).padStart(2, '0');
    return `${resY}-${resM}-${resD}`;
  };

  const [seciliTarih, setSeciliTarih] = useState<string>(() => {
    const base = varsayilanTarih || getBugunIso();
    return getTomorrowDate(base);
  });

  const [tumIzinler, setTumIzinler] = useState<IzinKaydi[]>(izinler || []);
  const [gunlukPuantajlar, setGunlukPuantajlar] = useState<GunlukPuantaj[]>(puantajlar || []);

  useEffect(() => {
    if (varsayilanTarih) {
      setSeciliTarih(getTomorrowDate(varsayilanTarih));
    }
  }, [varsayilanTarih]);

  useEffect(() => {
    if (izinler && izinler.length > 0) {
      setTumIzinler(izinler);
    } else {
      fetch('/api/izinler')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setTumIzinler(data);
        })
        .catch(() => {});
    }
  }, [izinler]);

  useEffect(() => {
    if (seciliTarih) {
      fetch(`/api/puantajlar?tarih=${seciliTarih}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setGunlukPuantajlar(data);
        })
        .catch(() => {});
    }
  }, [seciliTarih]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  // Seçilen günde aktif/sigortalı çalışanların listesi (İsim sırasına göre sıralı)
  const aktifCalisanlar = personeller
    .filter(p => isPersonelCalisiyorMuTarihte(p, seciliTarih))
    .sort((a, b) => (a.AdSoyad || '').localeCompare(b.AdSoyad || 'TR'));

  // Personelin ilgili tarihteki izin ve puantaj durumu
  const getPersonelDurumVeIzinInfo = (personelId: number, tarihStr: string) => {
    // 1. Onaylı İzin Kaydı Kontrolü
    const aktifIzin = tumIzinler?.find(iz => 
      iz.PersonelId === personelId &&
      iz.Durum === 'Onaylandı' &&
      !iz.SilindiMi &&
      tarihStr >= iz.BaslangicTarihi &&
      tarihStr <= iz.BitisTarihi
    );

    // 2. Puantaj Kaydı Kontrolü
    const pKayit = gunlukPuantajlar?.find(x => x.PersonelId === personelId && (x.Tarih === tarihStr || String(x.Tarih).slice(0, 10) === tarihStr));

    let isIzinli = false;
    let izinBaslik = '';
    let aciklamaMetni = '';

    if (aktifIzin) {
      isIzinli = true;
      izinBaslik = aktifIzin.IzinTuru;
      aciklamaMetni = `Onaylı ${aktifIzin.IzinTuru} (${formatTarihTR(aktifIzin.BaslangicTarihi)} - ${formatTarihTR(aktifIzin.BitisTarihi)})`;
    } else if (pKayit) {
      const kod = pKayit.DurumKodu;
      if (kod === 'YI') {
        isIzinli = true;
        izinBaslik = 'Yıllık İzin';
        aciklamaMetni = pKayit.Aciklama || 'Yıllık İzinli';
      } else if (kod === 'UI') {
        isIzinli = true;
        izinBaslik = 'Ücretsiz İzin';
        aciklamaMetni = pKayit.Aciklama || 'Ücretsiz İzinli';
      } else if (kod === 'R') {
        isIzinli = true;
        izinBaslik = 'Raporlu';
        aciklamaMetni = pKayit.Aciklama || 'Raporlu (Hastalık İzni)';
      } else if (kod === 'M') {
        isIzinli = true;
        izinBaslik = 'Mazeret İzni';
        aciklamaMetni = pKayit.Aciklama || 'Mazeret İzinli';
      } else if (kod === 'D') {
        isIzinli = true;
        izinBaslik = 'Devamsız';
        aciklamaMetni = pKayit.Aciklama || 'Devamsız (Gelmeyen Personel)';
      } else if (kod === 'HT') {
        aciklamaMetni = pKayit.Aciklama || 'Hafta Tatili';
      } else if (kod === 'RT') {
        aciklamaMetni = pKayit.Aciklama || 'Resmi Tatil';
      } else if (pKayit.Aciklama) {
        aciklamaMetni = pKayit.Aciklama;
      }
    }

    return { isIzinli, izinBaslik, aciklamaMetni };
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 print-portal-container">
      {/* Yazdırma CSS'i */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: portrait;
          margin: 0 !important; /* Tarayıcının URL, Tarih, IP vb. tüm alt/üst bilgilerini zorla temizlemek için sıfır kenar boşluğu */
        }
        @media print {
          /* Sayfadaki IP, URL, Tarih gibi tarayıcı başlık/altlıklarını gizler ve mükemmel yerleşimi garanti eder */
          body {
            margin: 0 !important;
            padding: 1.2cm 1.5cm !important; /* Kağıt kenarlarından güvenli boşluk bırakır */
            background: white !important;
            color: black !important;
          }
          #root {
            display: none !important;
          }
          /* Ana portal dışındaki her şeyi gizle */
          body > *:not(.print-portal-container) {
            display: none !important;
          }
          .print-portal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            display: block !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-content-box {
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Tablo stillerinin tam siyah olmasını sağlama */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            color: black !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: black !important;
            border: 1.2px solid #000 !important;
            font-weight: bold !important;
            padding: 4px 2px !important;
            font-size: 10px !important;
            text-align: center !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          td {
            color: black !important;
            border: 1.2px solid #000 !important;
            padding: 4px 6px !important; /* Satır yüksekliğini dar yapar */
            font-size: 10px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            white-space: nowrap !important; /* İsimlerin asla alt satıra geçmesini istemiyoruz */
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}} />

      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[90vh] print-content-box"
      >
        {/* Üst Bar (Yazdırmada Gizlenir) */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3 print-hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Günlük Personel Puantaj ve İmza Çizelgesi</h2>
              <p className="text-xs text-slate-400">Sigortalı/aktif personellerin günlük fiziksel imza föyü</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tarih Seçici */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-400 font-medium">Tarih Seç:</span>
              <input
                type="date"
                value={seciliTarih}
                onChange={(e) => setSeciliTarih(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer scheme-dark"
              />
            </div>

            <button
              onClick={() => window.print()}
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

        {/* Canlı Önizleme & Yazdırılacak Alan */}
        <div className="p-6 overflow-y-auto bg-slate-900/40 text-slate-300 print-area flex-1">
          
          {/* Yazdırılabilir Kağıt Formatı Container */}
          <div className="max-w-4xl mx-auto bg-white text-slate-950 p-6 md:p-10 rounded-xl shadow-lg print:shadow-none print:p-0">
            
            {/* Antet / Başlık Bilgisi (Her Sayfa Başında Çıkması İçin Değil, Sayfa Başı Tasarımı) */}
            <div className="text-center border-b-2 border-black pb-4 mb-4">
              <h1 className="text-sm font-extrabold uppercase tracking-wider text-black">RENDE İNŞAAT MOBİLYA TURİZM SAN. VE TİC. A.Ş.</h1>
              <h2 className="text-base font-black uppercase mt-1 tracking-widest text-black border border-black px-4 py-2 inline-block mx-auto bg-slate-100">
                GÜNLÜK PERSONEL PUANTAJ VE İMZA ÇİZELGESİ
              </h2>
              <div className="flex justify-between items-center text-xs font-bold mt-4 text-black px-1">
                <span className="flex items-center gap-1">
                  📅 TARİH: <strong className="underline text-sm">{formatTarihUzunTR(seciliTarih)}</strong>
                </span>
              </div>
            </div>

            {/* İmza Listesi Tablosu */}
            <table className="w-full text-left text-xs border-collapse border-2 border-black">
              <thead className="bg-slate-100 text-black">
                <tr className="border-b-2 border-black">
                  <th className="py-1 px-1.5 text-center border-r border-black font-extrabold w-12 bg-slate-100 text-[10px]">Sıra</th>
                  <th className="py-1 px-3.5 text-left border-r border-black font-extrabold bg-slate-100 text-[10px]">Personel Adı Soyadı</th>
                  <th className="py-1 px-1.5 text-center border-r border-black font-extrabold w-24 bg-slate-100 text-[10px]">Giriş Saati</th>
                  <th className="py-1 px-1.5 text-center border-r border-black font-extrabold w-24 bg-slate-100 text-[10px]">Çıkış Saati</th>
                  <th className="py-1 px-1.5 text-center border-r border-black font-extrabold w-20 bg-slate-100 text-[10px]">Fazla Mesai</th>
                  <th className="py-1 px-1.5 text-center border-r border-black font-extrabold w-20 bg-slate-100 text-[10px]">Eksik Mesai</th>
                  <th className="py-1 px-2.5 text-left border-r border-black font-extrabold w-36 bg-slate-100 text-[10px]">Açıklamalar</th>
                  <th className="py-1 px-3 text-center font-extrabold w-40 bg-slate-100 text-[10px]">Personel İmzası</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/60">
                {aktifCalisanlar.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 italic font-medium">
                      Seçilen tarihte ({formatTarihTR(seciliTarih)}) fabrikada aktif/sigortalı çalışan personel bulunamadı.
                    </td>
                  </tr>
                ) : (
                  aktifCalisanlar.map((p, idx) => {
                    const info = getPersonelDurumVeIzinInfo(p.PersonelId, seciliTarih);
                    return (
                      <tr key={p.PersonelId} className={`border-b border-black/30 hover:bg-slate-50 transition-colors ${info.isIzinli ? 'bg-amber-50/40' : ''}`}>
                        <td className="py-1 px-1.5 text-center border-r border-black font-bold text-black bg-slate-50/50 text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="py-1 px-3.5 border-r border-black font-black text-black text-[11px] whitespace-nowrap overflow-hidden text-ellipsis">
                          {p.AdSoyad}
                        </td>
                        {/* Giriş Saati */}
                        <td className="py-1 px-1.5 border-r border-black h-8 text-center font-bold text-[10px] text-slate-700">
                          {info.isIzinli ? '-' : ''}
                        </td>
                        {/* Çıkış Saati */}
                        <td className="py-1 px-1.5 border-r border-black h-8 text-center font-bold text-[10px] text-slate-700">
                          {info.isIzinli ? '-' : ''}
                        </td>
                        {/* Fazla Mesai */}
                        <td className="py-1 px-1.5 border-r border-black h-8 text-center font-bold text-[10px] text-slate-700">
                          {info.isIzinli ? '-' : ''}
                        </td>
                        {/* Eksik Mesai */}
                        <td className="py-1 px-1.5 border-r border-black h-8 text-center font-bold text-[10px] text-slate-700">
                          {info.isIzinli ? '-' : ''}
                        </td>
                        {/* Açıklamalar */}
                        <td className="py-1 px-2.5 border-r border-black h-8 font-bold text-black text-[10px] align-middle">
                          {info.aciklamaMetni ? (
                            <span className={`inline-block px-1 py-0.5 rounded text-[9.5px] ${info.isIzinli ? 'text-amber-900 bg-amber-100/90 border border-amber-300 font-extrabold' : 'text-slate-800'}`}>
                              {info.aciklamaMetni}
                            </span>
                          ) : null}
                        </td>
                        {/* İmza Atma Alanı / İzin Durumu */}
                        <td className="py-1 px-3 h-8 text-center align-middle">
                          {info.isIzinli ? (
                            <span className="text-[10px] font-black text-rose-800 uppercase tracking-tight bg-rose-100/80 border border-rose-300 px-2 py-0.5 rounded inline-block">
                              [ {info.izinBaslik.toUpperCase()} Lİ ]
                            </span>
                          ) : (
                            <div className="w-full border-b border-dashed border-slate-400 h-5"></div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Sisteme eklenmemiş veya çıktı sonrası başlayanlar için 4 adet el yazısıyla doldurulabilir boş satır */}
                {Array.from({ length: 4 }).map((_, bIdx) => {
                  const bosSiraNo = aktifCalisanlar.length + bIdx + 1;
                  return (
                    <tr key={`blank_${bIdx}`} className="border-b border-black/30 hover:bg-slate-50 transition-colors">
                      <td className="py-1 px-1.5 text-center border-r border-black font-bold text-black bg-slate-50/50 text-[10px]">
                        {bosSiraNo}
                      </td>
                      <td className="py-1 px-3.5 border-r border-black">
                        <div className="w-full border-b border-dashed border-slate-350 h-5 mt-0.5"></div>
                      </td>
                      <td className="py-1 px-1.5 border-r border-black h-8"></td>
                      <td className="py-1 px-1.5 border-r border-black h-8"></td>
                      <td className="py-1 px-1.5 border-r border-black h-8"></td>
                      <td className="py-1 px-1.5 border-r border-black h-8"></td>
                      <td className="py-1 px-2.5 border-r border-black h-8"></td>
                      <td className="py-1 px-3 h-8">
                        <div className="w-full border-b border-dashed border-slate-400 h-5"></div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Alt Not ve Bilgilendirme */}
            <div className="mt-4 text-[11px] font-bold text-slate-800 border border-black/30 bg-slate-50 p-3 rounded-lg leading-relaxed">
              <strong>📝 ÖNEMLİ NOT:</strong> Eksik mesainiz varsa çıktığınız ve girdiğiniz saati açıklama satırına yazınız.
            </div>

            {/* Alt İmzalar (Vardiya Amiri & İnsan Kaynakları) */}
            <div className="mt-12 grid grid-cols-2 gap-8 text-xs font-bold text-black px-2">
              <div className="space-y-6">
                <p className="border-b border-black pb-1.5 uppercase">Kontrol Eden (Vardiya Amiri / Şef):</p>
                <div className="pt-2">
                  <span>İmza: _________________</span>
                </div>
              </div>

              <div className="space-y-6">
                <p className="border-b border-black pb-1.5 uppercase">Onaylayan (İnsan Kaynakları / Müdür):</p>
                <div className="pt-2">
                  <span>İmza: _________________</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
