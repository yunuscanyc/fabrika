import React from 'react';
import { createPortal } from 'react-dom';
import { IzinKaydi, Personel } from '../types';
import { Printer, X } from 'lucide-react';
import { formatTarihTR, getIlkMesaiGunu } from '../utils/dateUtils';

interface IzinYazdirModalProps {
  isOpen: boolean;
  onClose: () => void;
  izin: IzinKaydi | null;
  personel?: Personel | null;
}

export const IzinYazdirModal: React.FC<IzinYazdirModalProps> = ({
  isOpen,
  onClose,
  izin,
  personel,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen || !izin) return null;

  const handlePrint = () => {
    window.print();
  };

  const turKucuk = (izin.IzinTuru || '').toLowerCase();
  const gunStr = `${izin.IsGunuSayisi} Gün`;

  const yillikIzin = turKucuk.includes('yıllık') || turKucuk.includes('yillik') ? gunStr : '';
  const ucretsizIzin = turKucuk.includes('ücretsiz') || turKucuk.includes('ucretsiz') ? gunStr : '';
  const mazeretIzin = turKucuk.includes('evlilik') || turKucuk.includes('doğum') || turKucuk.includes('ölüm') || turKucuk.includes('mazeret') ? gunStr : '';
  const ucretliIzin = turKucuk.includes('ücretli') || turKucuk.includes('ucretli') ? gunStr : (!yillikIzin && !ucretsizIzin && !mazeretIzin ? `${gunStr} (${izin.IzinTuru})` : '');

  const modalContent = (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm p-4 flex justify-center items-start print-modal-overlay"
    >
      {/* CSS injection to handle perfect A4 print formatting, margins, and stripping browser headers/footers */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0; /* Strips browser header info (URL, IP, title, date) and footers */
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
          /* Hide all elements by default in print */
          body * {
            visibility: hidden !important;
          }
          /* Show only printable modal content */
          .print-modal-content,
          .print-modal-content * {
            visibility: visible !important;
          }
          .print-modal-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            margin: 0 !important;
            padding: 8mm 12mm !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .print\\:hidden, .print\\:hidden * {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}} />

      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl my-8 print-modal-content"
      >
        {/* Üst İşlem Çubuğu (Yazdırmada Gizlenir) */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center print:hidden">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            📄 Resmi İzin Formu Önizleme (A4)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition shadow"
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

        {/* A4 Baskı Kağıdı (WPF IzinYazdirForm Birebir Çıktısı) */}
        <div className="p-8 bg-white text-black font-sans print:p-0 print:m-0 print:border-none print:shadow-none min-h-[850px]">
          {/* Antet */}
          <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-6">
            <div>
              <h2 className="text-xs font-bold tracking-wider text-slate-800">RENDE İNŞAAT MOBİLYA TURİZM A.Ş.</h2>
              <p className="text-[10px] text-slate-600">Fabrika İdari İşler ve İnsan Kaynakları</p>
            </div>
            <h1 className="text-xl font-extrabold tracking-wide uppercase text-slate-900">
              İZİN FORMU
            </h1>
            <div className="text-[10px] text-right font-mono text-slate-500">
              Ref: IZN-{izin.IzinId}
            </div>
          </div>

          {/* Form Alanları (2 Sütunlu Grid) */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs">
            {/* Satır 1 */}
            <div className="border-b border-slate-300 pb-1 flex justify-between">
              <span className="font-bold text-slate-700">ADI - SOYADI:</span>
              <span className="font-semibold text-slate-900">{personel?.AdSoyad || izin.PersonelAdSoyad || '-'}</span>
            </div>
            <div className="border-b border-slate-300 pb-1 flex justify-between">
              <span className="font-bold text-slate-700">T.C. KİMLİK NO:</span>
              <span className="font-mono text-slate-900">{personel?.TCKimlikNo || '-'}</span>
            </div>

            {/* Satır 2 */}
            <div className="border-b border-slate-300 pb-1 flex justify-between">
              <span className="font-bold text-slate-700">DEPARTMANI:</span>
              <span className="text-slate-900">{personel?.Departman || '-'}</span>
            </div>
            <div className="border-b border-slate-300 pb-1 flex justify-between">
              <span className="font-bold text-slate-700">TESİS ADI:</span>
              <span className="text-slate-900">Mobilya Fabrikası</span>
            </div>

            {/* Satır 3 */}
            <div className="border-b border-slate-300 pb-1 flex justify-between">
              <span className="font-bold text-slate-700">İZİN BAŞLANGIÇ:</span>
              <span className="font-bold text-slate-900">{formatTarihTR(izin.BaslangicTarihi)}</span>
            </div>
            <div className="border-b border-slate-300 pb-1 flex justify-between">
              <span className="font-bold text-slate-700">İŞBAŞI TARİHİ:</span>
              <span className="font-bold text-slate-900">{formatTarihTR(getIlkMesaiGunu(izin.BitisTarihi))}</span>
            </div>

            {/* Satır 4 */}
            <div className="border-b border-slate-300 pb-1 flex justify-between">
              <span className="font-bold text-slate-700">YILLIK İZİN (İŞ GÜNÜ):</span>
              <span className="font-bold text-emerald-800">{yillikIzin || '-'}</span>
            </div>
            <div className="border-b border-slate-300 pb-1 flex justify-between">
              <span className="font-bold text-slate-700">ÜCRETSİZ İZİN:</span>
              <span className="text-slate-900">{ucretsizIzin || '-'}</span>
            </div>

            {/* Satır 5 */}
            <div className="border-b border-slate-300 pb-1 flex justify-between">
              <span className="font-bold text-slate-700">MAZERET / DOĞUM İZNİ:</span>
              <span className="text-slate-900">{mazeretIzin || '-'}</span>
            </div>
            <div className="border-b border-slate-300 pb-1 flex justify-between">
              <span className="font-bold text-slate-700">ÜCRETLİ İZİN / DİĞER:</span>
              <span className="text-slate-900">{ucretliIzin || '-'}</span>
            </div>

            {/* Satır 6 */}
            <div className="border-b border-slate-300 pb-1 flex justify-between col-span-2 bg-slate-50 px-2 py-1.5 rounded">
              <span className="font-bold text-slate-800">İZİN GÜNLERİNİN TOPLAMI:</span>
              <span className="font-extrabold text-sm text-blue-900">{izin.IsGunuSayisi} İŞ GÜNÜ</span>
            </div>

            {/* Açıklama */}
            <div className="col-span-2 pt-2 border-b border-slate-300 pb-3">
              <span className="font-bold text-slate-700 block mb-1">İZİN SEBEBİ / AÇIKLAMA:</span>
              <p className="text-slate-800 italic bg-slate-50 p-2 rounded border border-slate-200 min-h-[45px]">
                {izin.Aciklama || 'Belirtilmedi'}
              </p>
            </div>
          </div>

          {/* İmzalar (3 Sütun: Departman Müdürü, İK Müdürü, Genel Müdür) */}
          <div className="grid grid-cols-4 gap-4 mt-16 pt-8 border-t border-slate-300 text-center text-[11px]">
            <div>
              <p className="font-bold text-slate-800 uppercase">İZİN TALEP EDEN</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{personel?.AdSoyad || 'Personel'}</p>
              <div className="mt-12 border-b border-black mx-auto w-32"></div>
              <p className="text-[9px] text-slate-400 mt-1">İmza</p>
            </div>

            <div>
              <p className="font-bold text-slate-800 uppercase">DEPARTMAN MÜDÜRÜ</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Uygun Görülmüştür</p>
              <div className="mt-12 border-b border-black mx-auto w-32"></div>
              <p className="text-[9px] text-slate-400 mt-1">İmza</p>
            </div>

            <div>
              <p className="font-bold text-slate-800 uppercase">İNSAN KAYNAKLARI</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Kayıt & Kontrol</p>
              <div className="mt-12 border-b border-black mx-auto w-32"></div>
              <p className="text-[9px] text-slate-400 mt-1">İmza</p>
            </div>

            <div>
              <p className="font-bold text-slate-800 uppercase">GENEL MÜDÜR</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Onay</p>
              <div className="mt-12 border-b border-black mx-auto w-32"></div>
              <p className="text-[9px] text-slate-400 mt-1">İmza</p>
            </div>
          </div>

          {/* Alt Dipnotlar */}
          <div className="mt-16 pt-4 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-500">
            <div>
              <p>• Bu form personel izne ayrılmadan önce doldurulup onaylanacak ve İnsan Kaynakları departmanına teslim edilecektir.</p>
              <p>• 4857 Sayılı İş Kanunu ve şirket içi çalışma yönetmeliğine tabidir.</p>
            </div>
            <div className="text-right">
              <p>1. Nüsha: İK Özlük Dosyası</p>
              <p>2. Nüsha: Çalışanın Kendisi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
