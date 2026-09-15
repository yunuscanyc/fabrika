import React from 'react';
import { createPortal } from 'react-dom';
import { Personel, PersonelKkdZimmet } from '../types';
import { Printer, X, ShieldCheck } from 'lucide-react';
import { formatTarihTR, getBugunIso } from '../utils/dateUtils';

interface KkdZimmetTutanakModalProps {
  isOpen: boolean;
  onClose: () => void;
  personel: Personel | null;
  zimmetler: PersonelKkdZimmet[];
}

export const KkdZimmetTutanakModal: React.FC<KkdZimmetTutanakModalProps> = ({
  isOpen,
  onClose,
  personel,
  zimmetler,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen || !personel) return null;

  const modalContent = (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm p-4 flex justify-center items-start print-modal-overlay"
    >
      {/* CSS injection to handle perfect single-page A4 print formatting, margins, and eliminating empty pages */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0; /* Tarayıcının IP, URL, başlık ve tarih yazılarını tamamen kaldırır */
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
          /* Hide all application views outside of modal to prevent blank pages */
          body > *:not(.print-modal-overlay) {
            display: none !important;
          }
          /* Position printable overlay as regular document flow */
          .print-modal-overlay {
            position: static !important;
            display: block !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            padding: 8mm 10mm !important; /* Tarayıcı IP/URL'si olmadan temiz kenar boşlukları */
            margin: 0 !important;
            z-index: auto !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-modal-content {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .print-modal-content table {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-modal-content th, .print-modal-content td {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
        className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl my-8 print:my-0 print-modal-content"
      >
        {/* Kontrol Butonları (Yazdırmada Gizlenir) */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center print:hidden">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Resmi KKD Zimmet ve Taahhüt Tutanağı (A4)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              Yazdır / PDF Kaydet
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

        {/* A4 Baskı Kağıdı Sayfası */}
        <div className="p-6 bg-white text-black font-sans print:p-0 print:m-0 print:border-none print:shadow-none text-[9.5px] leading-snug print-avoid-break">
          {/* Antet */}
          <div className="text-center border-b border-black pb-1.5 mb-2.5">
            <h2 className="text-[10px] font-bold tracking-wider text-slate-800">RENDE İNŞAAT MOBİLYA TURİZM SAN. VE TİC. A.Ş.</h2>
            <h1 className="text-xs font-extrabold uppercase mt-0.5 tracking-wide">
              KİŞİSEL KORUYUCU DONANIM (KKD) ZİMMET VE TESLİM TUTANAĞI
            </h1>
            <p className="text-[8.5px] text-slate-600">
              6331 Sayılı İş Sağlığı ve Güvenliği Kanunu & KKD Yönetmeliği Gereğince
            </p>
          </div>

          {/* Personel Bilgileri Tablosu */}
          <table className="w-full text-[9.5px] border border-black mb-2.5">
            <tbody>
              <tr className="border-b border-black">
                <td className="p-1 font-bold bg-slate-100 w-1/4 border-r border-black">T.C. KİMLİK NO:</td>
                <td className="p-1 font-mono w-1/4 border-r border-black">{personel.TCKimlikNo || '-'}</td>
                <td className="p-1 font-bold bg-slate-100 w-1/4 border-r border-black">ADI SOYADI:</td>
                <td className="p-1 font-bold w-1/4">{personel.AdSoyad}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1 font-bold bg-slate-100 border-r border-black">DEPARTMANI:</td>
                <td className="p-1 border-r border-black">{personel.Departman || '-'}</td>
                <td className="p-1 font-bold bg-slate-100 border-r border-black">GÖREVİ / UNVANI:</td>
                <td className="p-1">{personel.Gorev || '-'}</td>
              </tr>
              <tr>
                <td className="p-1 font-bold bg-slate-100 border-r border-black">İŞE GİRİŞ TARİHİ:</td>
                <td className="p-1 border-r border-black">{formatTarihTR(personel.IseGirisTarihi)}</td>
                <td className="p-1 font-bold bg-slate-100 border-r border-black">TESLİM TARİHİ:</td>
                <td className="p-1 font-mono">{formatTarihTR(getBugunIso())}</td>
              </tr>
            </tbody>
          </table>

          {/* Zimmet Malzemeleri Tablosu */}
          <h3 className="text-[9.5px] font-bold uppercase mb-1">TESLİM EDİLEN KORUYUCU DONANIMLAR</h3>
          <table className="w-full text-[9px] border border-black mb-2.5">
            <thead className="bg-slate-100 border-b border-black text-center font-bold">
              <tr>
                <th className="p-1 border-r border-black w-7">S.No</th>
                <th className="p-1 border-r border-black text-left">Malzemenin Cinsi ve Tanımı</th>
                <th className="p-1 border-r border-black w-20">Standart / Norm</th>
                <th className="p-1 border-r border-black w-14">Beden</th>
                <th className="p-1 border-r border-black w-10">Adet</th>
                <th className="p-1 border-r border-black w-20">Teslim Tarihi</th>
                <th className="p-1 w-20">Teslim Alan İmza</th>
              </tr>
            </thead>
            <tbody>
              {zimmetler.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-2 text-center text-slate-500 italic">
                    Kayıtlı KKD zimmeti bulunmamaktadır.
                  </td>
                </tr>
              ) : (
                zimmetler.map((z, idx) => (
                  <tr key={z.ZimmetId} className="border-b border-black text-center">
                    <td className="p-1 border-r border-black">{idx + 1}</td>
                    <td className="p-1 border-r border-black text-left font-semibold">{z.MalzemeAdi}</td>
                    <td className="p-1 border-r border-black font-mono">{z.StandartNo || 'CE EN'}</td>
                    <td className="p-1 border-r border-black">{z.BedenNo || 'Std'}</td>
                    <td className="p-1 border-r border-black">{z.Adet || 1}</td>
                    <td className="p-1 border-r border-black font-mono">{formatTarihTR(z.VerilisTarihi)}</td>
                    <td className="p-1"></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Taahhütname Metni */}
          <div className="border border-black p-2 text-[8.5px] leading-tight mb-3 bg-slate-50 text-justify space-y-1 print-avoid-break">
            <h4 className="font-bold text-center mb-0.5 uppercase tracking-wide text-[9px]">
              İŞÇİ TAAHHÜTNAMESİ VE BİLGİLENDİRME
            </h4>
            <p>
              Yukarıda cins, miktar, norm ve standartları belirtilen kişisel koruyucu donanımları eksiksiz, sağlam ve kullanılabilir vaziyette teslim aldım.
              Bu donanımların kullanım amaçları, kullanımı sırasında dikkat edilecek hususlar, bakım, depolama ve temizlik şartları tarafıma sözlü ve yazılı olarak anlatılmış, gerekli eğitim verilmiştir.
            </p>
            <p>
              İşyerinde çalıştığım süre boyunca çalışma alanında bu koruyucu donanımları amaca uygun şekilde, aralıksız ve özenle kullanacağımı;
              donanımın kaybolması, eskimesi, arızalanması veya koruyucu özelliğini yitirmesi durumunda derhal amirime ve İSG birimine bildireceğimi,
              koruyucu donanımı kullanmamaktan doğabilecek her türlü cezai, hukuki ve sağlık sorumluluğunun şahsıma ait olduğunu kabul, beyan ve taahhüt ederim.
            </p>
            <p className="font-semibold border-t border-black/15 pt-1 text-slate-900">
              MADDİ YÜKÜMLÜLÜK VE MAHSUP ETME ŞARTI: İşbu tutanakla tarafıma teslim edilen tüm zimmetli malzemeleri, iş akdimin herhangi bir nedenle (istifa, fesih vb.) sona ermesi halinde veya yeni malzeme tesliminde eksiksiz, temiz ve sağlam olarak işverene iade etmeyi taahhüt ederim. Haklı bir neden olmaksızın iade etmediğim, kaybettiğim veya kasıt/ihmal sonucu kullanılamaz hale getirdiğim malzemelerin güncel rayiç/piyasa bedellerinin, 4857 sayılı İş Kanunu hükümleri dairesinde yapılacak ilk ücret, maaş, fazla mesai veya kıdem/ihbar tazminatı ödememden kesilerek mahsup edilmesine hiçbir itirazım olmaksızın muvafakat ettiğimi kabul, beyan ve taahhüt ederim.
            </p>
          </div>

          {/* İmzalar */}
          <div className="grid grid-cols-2 gap-8 text-center text-xs mt-3 print-avoid-break">
            <div>
              <p className="font-bold uppercase text-[9.5px]">TESLİM EDEN (İSG / İDARİ AMİR)</p>
              <p className="text-[8.5px] text-slate-600 mt-0.5">İş Güvenliği Uzmanı / Şantiye Şefi</p>
              <div className="mt-8 border-b border-black mx-auto w-36"></div>
              <p className="text-[8.5px] text-slate-500 mt-0.5">Tarih - İmza</p>
            </div>

            <div>
              <p className="font-bold uppercase text-[9.5px]">TESLİM ALAN (ÇALIŞAN PERSONEL)</p>
              <p className="text-[8.5px] text-slate-600 mt-0.5">{personel.AdSoyad}</p>
              <div className="mt-8 border-b border-black mx-auto w-36"></div>
              <p className="text-[8.5px] text-slate-500 mt-0.5">Tarih - İmza</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
