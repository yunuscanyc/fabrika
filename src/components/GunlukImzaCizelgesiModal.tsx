import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Personel } from '../types';
import { Printer, X, Calendar, UserCheck } from 'lucide-react';
import { formatTarihTR, getBugunIso, formatTarihUzunTR } from '../utils/dateUtils';
import { isPersonelCalisiyorMuTarihte } from '../utils/personelUtils';

interface GunlukImzaCizelgesiModalProps {
  isOpen: boolean;
  onClose: () => void;
  personeller: Personel[];
  varsayilanTarih?: string;
}

export const GunlukImzaCizelgesiModal: React.FC<GunlukImzaCizelgesiModalProps> = ({
  isOpen,
  onClose,
  personeller,
  varsayilanTarih
}) => {
  const [seciliTarih, setSeciliTarih] = useState<string>(varsayilanTarih || getBugunIso());

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

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Yazdırma CSS'i */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Sayfa Sonu Başlık Tekrarlama */
          .print-area table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .print-area thead {
            display: table-header-group !important;
          }
          .print-area tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-area th {
            background-color: #f1f5f9 !important;
            color: black !important;
            border: 1.5px solid #000 !important;
            font-weight: bold !important;
            padding: 6px 4px !important;
            text-align: center !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-area td {
            color: black !important;
            border: 1.5px solid #000 !important;
            padding: 8px 6px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}} />

      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[90vh]"
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow"
              title="Yazdır / PDF Olarak Kaydet"
            >
              <Printer className="w-3.5 h-3.5" />
              Yazdır
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-lg transition border border-slate-700"
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
                <span>TOPLAM PERSONEL: {aktifCalisanlar.length} KİŞİ</span>
              </div>
            </div>

            {/* İmza Listesi Tablosu */}
            <table className="w-full text-left text-xs border-collapse border-2 border-black">
              <thead className="bg-slate-100 text-black">
                <tr className="border-b-2 border-black">
                  <th className="py-3 px-2 text-center border-r border-black font-extrabold w-12 bg-slate-100">Sıra</th>
                  <th className="py-3 px-3 text-left border-r border-black font-extrabold bg-slate-100">Personel Adı Soyadı</th>
                  <th className="py-3 px-2 text-center border-r border-black font-extrabold w-24 bg-slate-100">Giriş Saati</th>
                  <th className="py-3 px-2 text-center border-r border-black font-extrabold w-24 bg-slate-100">Çıkış Saati</th>
                  <th className="py-3 px-2 text-center border-r border-black font-extrabold w-20 bg-slate-100">Fazla Mesai</th>
                  <th className="py-3 px-2 text-center border-r border-black font-extrabold w-20 bg-slate-100">Eksik Mesai</th>
                  <th className="py-3 px-3 text-left border-r border-black font-extrabold w-36 bg-slate-100">Açıklamalar</th>
                  <th className="py-3 px-4 text-center font-extrabold w-40 bg-slate-100">Personel İmzası</th>
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
                  aktifCalisanlar.map((p, idx) => (
                    <tr key={p.PersonelId} className="border-b border-black/30 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-2 text-center border-r border-black font-bold text-black bg-slate-50/50">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 border-r border-black font-black text-black">
                        {p.AdSoyad}
                        <span className="text-[10px] text-slate-500 block font-normal print-hidden">
                          {p.Departman} • {p.Gorev}
                        </span>
                      </td>
                      {/* Giriş Saati Boşluk */}
                      <td className="py-3 px-2 border-r border-black h-10"></td>
                      {/* Çıkış Saati Boşluk */}
                      <td className="py-3 px-2 border-r border-black h-10"></td>
                      {/* Fazla Mesai Boşluk */}
                      <td className="py-3 px-2 border-r border-black h-10"></td>
                      {/* Eksik Mesai Boşluk */}
                      <td className="py-3 px-2 border-r border-black h-10"></td>
                      {/* Açıklamalar Boşluk */}
                      <td className="py-3 px-3 border-r border-black h-10 text-slate-400"></td>
                      {/* İmza Atma Alanı */}
                      <td className="py-3 px-4 h-10">
                        <div className="w-full border-b border-dashed border-slate-400 h-6"></div>
                      </td>
                    </tr>
                  ))
                )}
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
