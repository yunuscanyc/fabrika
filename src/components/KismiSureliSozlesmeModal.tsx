import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Personel, Yevmiyeci } from '../types';
import { Printer, X, FileText, Settings, Calendar, Building, User, Clock, ShieldCheck, Check } from 'lucide-react';
import { formatTarihTR, getBugunIso } from '../utils/dateUtils';

interface KismiSureliSozlesmeModalProps {
  isOpen: boolean;
  onClose: () => void;
  personel?: Personel | Yevmiyeci | null;
}

export const KismiSureliSozlesmeModal: React.FC<KismiSureliSozlesmeModalProps> = ({
  isOpen,
  onClose,
  personel,
}) => {
  // Sözleşme alanları state'leri (Kullanıcı dilediğinde baskı öncesi revize edebilir)
  const [isverenUnvani, setIsverenUnvani] = useState('Rende İnşaat Mobilya');
  const [isverenAdresi, setIsverenAdresi] = useState('Altınkale Mah. Döşemealtı/Antalya');
  const [isverenVkn, setIsverenVkn] = useState('');
  
  const [calisanAdSoyad, setCalisanAdSoyad] = useState('');
  const [calisanTc, setCalisanTc] = useState('');
  const [calisanAdres, setCalisanAdres] = useState('');
  const [calisanGorev, setCalisanGorev] = useState('');
  
  const [baslangicTarihi, setBaslangicTarihi] = useState('');
  const [sozlesmeTuru, setSozlesmeTuru] = useState<'Belirsiz' | 'Belirli'>('Belirsiz');
  const [belirliBitisTarihi, setBelirliBitisTarihi] = useState('');
  
  const [haftalikSaat, setHaftalikSaat] = useState<string>('20');
  const [calismaPlani, setCalismaPlani] = useState(
    'İşverenin operasyonel ihtiyaçları ve şantiye / atölye iş planı doğrultusunda belirlenecektir.'
  );
  
  const [imzaTarihi, setImzaTarihi] = useState('');
  const [ayarPaneliAcik, setAyarPaneliAcik] = useState(false);

  // Modal açıldığında personelin mevcut bilgilerini otomatik yükle
  useEffect(() => {
    if (personel) {
      setCalisanAdSoyad(personel.AdSoyad || '');
      
      const tc = (personel as any).TCKimlikNo || (personel as any).TcKimlikNo || (personel as any).tcKimlikNo || '';
      setCalisanTc(tc);
      
      const gorev = (personel as any).Gorev || (personel as any).GorevVeyaUnvan || (personel as any).UzmanlikAlani || (personel as any).Departman || '';
      setCalisanGorev(gorev);
      
      const adres = (personel as any).Adres || (personel as any).IkametAdresi || (personel as any).IkametSehir || '';
      setCalisanAdres(adres);
      
      const giris = (personel as any).IseGirisTarihi || getBugunIso();
      setBaslangicTarihi(giris);
      setImzaTarihi(giris);
    }
  }, [personel, isOpen]);

  // ESC tuşu ile kapatma
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen || !personel) return null;

  const handlePrint = () => {
    window.print();
  };

  const baslangicTarihGosterim = baslangicTarihi ? formatTarihTR(baslangicTarihi) : '... / ... / 20..';
  const imzaTarihGosterim = imzaTarihi ? formatTarihTR(imzaTarihi) : '... / ... / 20..';
  const belirliBitisGosterim = belirliBitisTarihi ? formatTarihTR(belirliBitisTarihi) : '... / ... / 20..';

  const modalContent = (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm p-2 sm:p-4 flex justify-center items-start print-modal-overlay"
    >
      {/* Tarayıcının üst/alt bilgi (URL, IP, tarih, sayfa no) eklemesini engelleyen @page ayarı */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0; /* Tarayıcının IP, URL, başlık ve altbilgi yazılarını tamamen kaldırır */
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
          #root {
            display: none !important;
          }
          .print-modal-overlay {
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
          .print-modal-content {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            margin: 0 !important;
            padding: 10mm 14mm 10mm 14mm !important;
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif !important;
            color: #000000 !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print\\:hidden, .print\\:hidden * {
            display: none !important;
          }
        }
      `}} />

      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-8 text-slate-100 print:bg-white print:border-none print:shadow-none print:my-0">
        
        {/* Üst Yönetim Araç Çubuğu (Baskıda Gizlenir) */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Kısmi Süreli (Part-Time) İş Sözleşmesi
                <span className="text-xs font-normal text-blue-400 bg-blue-950/60 border border-blue-800 px-2 py-0.5 rounded-full">
                  4857 SK. Md. 13
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Personel: <strong className="text-slate-200">{calisanAdSoyad || 'İsimsiz'}</strong> {calisanTc ? `(${calisanTc})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAyarPaneliAcik(!ayarPaneliAcik)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                ayarPaneliAcik
                  ? 'bg-slate-800 border-slate-600 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title="Sözleşme Alanlarını Düzenle"
            >
              <Settings className="w-4 h-4 text-blue-400" />
              <span>{ayarPaneliAcik ? 'Formu Gizle' : 'Bilgileri Düzenle'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır / Çıktı Al</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Kapat (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hızlı Bilgi Düzenleme Paneli (İsteğe bağlı açılır) */}
        {ayarPaneliAcik && (
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs print:hidden animate-in fade-in duration-150">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Çalışan Adı Soyadı</label>
              <input 
                type="text" 
                value={calisanAdSoyad} 
                onChange={(e) => setCalisanAdSoyad(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">T.C. Kimlik No</label>
              <input 
                type="text" 
                value={calisanTc} 
                onChange={(e) => setCalisanTc(e.target.value)}
                maxLength={11}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Görevi / Unvanı</label>
              <input 
                type="text" 
                value={calisanGorev} 
                onChange={(e) => setCalisanGorev(e.target.value)}
                placeholder="Örn: Mobilya Montaj Ustası"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Çalışanın İkamet Adresi</label>
              <input 
                type="text" 
                value={calisanAdres} 
                onChange={(e) => setCalisanAdres(e.target.value)}
                placeholder="Varsa adres giriniz"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Sözleşme Başlangıç Tarihi</label>
              <input 
                type="date" 
                value={baslangicTarihi} 
                onChange={(e) => setBaslangicTarihi(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Haftalık Toplam Çalışma Saati</label>
              <input 
                type="text" 
                value={haftalikSaat} 
                onChange={(e) => setHaftalikSaat(e.target.value)}
                placeholder="Örn: 20 veya boş"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Sözleşme Süresi</label>
              <select 
                value={sozlesmeTuru} 
                onChange={(e: any) => setSozlesmeTuru(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value="Belirsiz">Belirsiz Süreli</option>
                <option value="Belirli">Belirli Süreli</option>
              </select>
            </div>
            {sozlesmeTuru === 'Belirli' && (
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Belirli Süre Bitiş Tarihi</label>
                <input 
                  type="date" 
                  value={belirliBitisTarihi} 
                  onChange={(e) => setBelirliBitisTarihi(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            )}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">İşveren Unvanı</label>
              <input 
                type="text" 
                value={isverenUnvani} 
                onChange={(e) => setIsverenUnvani(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">İşveren Adresi</label>
              <input 
                type="text" 
                value={isverenAdresi} 
                onChange={(e) => setIsverenAdresi(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">İşveren VKN / MERSİS</label>
              <input 
                type="text" 
                value={isverenVkn} 
                onChange={(e) => setIsverenVkn(e.target.value)}
                placeholder="Boş bırakılabilir"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">İmza / Düzenleme Tarihi</label>
              <input 
                type="date" 
                value={imzaTarihi} 
                onChange={(e) => setImzaTarihi(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
          </div>
        )}

        {/* Belge Önizleme ve Baskı Alanı (A4 Formatı) */}
        <div className="p-4 sm:p-8 bg-slate-950/40 flex justify-center overflow-x-auto">
          <div className="print-modal-content bg-white text-slate-900 p-8 sm:p-12 w-full max-w-[210mm] min-h-[297mm] shadow-xl rounded-sm leading-relaxed text-[13px] sm:text-[13.5px]">
            
            {/* Başlık Bölümü */}
            <div className="text-center mb-6 border-b-2 border-slate-900 pb-3">
              <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-slate-950">
                KISMİ SÜRELİ (PART-TIME) İŞ SÖZLEŞMESİ
              </h1>
              <p className="text-xs font-semibold text-slate-700 mt-1">
                (4857 Sayılı İş Kanunu, Madde 13 Uyarınca Düzenlenmiştir)
              </p>
            </div>

            {/* 1. TARAFLAR */}
            <div className="mb-5">
              <h2 className="text-sm font-bold uppercase text-slate-950 mb-1.5">
                1. TARAFLAR
              </h2>
              <p className="text-[12.5px] text-slate-800 text-justify mb-2.5">
                Aşağıda bilgileri yer alan İşveren ile (Çalışan İşçi) arasında, 4857 sayılı İş Kanunu ve ilgili mevzuat hükümlerine uygun olarak işbu Kısmi Süreli İş Sözleşmesi akdedilmiştir.
              </p>

              <table className="w-full border-collapse border border-slate-900 text-[12.5px]">
                <tbody>
                  <tr>
                    <td className="border border-slate-900 p-2 font-bold bg-slate-100 w-1/3">
                      İşverenin Unvanı
                    </td>
                    <td className="border border-slate-900 p-2 font-medium">
                      {isverenUnvani || <span className="text-slate-400">...........................................................................</span>}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 p-2 font-bold bg-slate-100">
                      İşverenin Adresi
                    </td>
                    <td className="border border-slate-900 p-2 font-medium">
                      {isverenAdresi || <span className="text-slate-400">...........................................................................</span>}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 p-2 font-bold bg-slate-100">
                      İşverenin VKN / MERSİS
                    </td>
                    <td className="border border-slate-900 p-2 font-medium">
                      {isverenVkn || <span className="text-slate-400">...........................................................................</span>}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 p-2 font-bold bg-slate-100">
                      Çalışanın Adı Soyadı
                    </td>
                    <td className="border border-slate-900 p-2 font-bold text-slate-950">
                      {calisanAdSoyad || <span className="text-slate-400 font-normal">...........................................................................</span>}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 p-2 font-bold bg-slate-100">
                      T.C. Kimlik Numarası
                    </td>
                    <td className="border border-slate-900 p-2 font-semibold">
                      {calisanTc || <span className="text-slate-400 font-normal">...........................................................................</span>}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 p-2 font-bold bg-slate-100">
                      Çalışanın İkamet Adresi
                    </td>
                    <td className="border border-slate-900 p-2 font-medium">
                      {calisanAdres || <span className="text-slate-400">...........................................................................</span>}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 p-2 font-bold bg-slate-100">
                      Çalışanın Görevi / Unvanı
                    </td>
                    <td className="border border-slate-900 p-2 font-semibold">
                      {calisanGorev || <span className="text-slate-400 font-normal">...........................................................................</span>}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. SÖZLEŞMENİN KONUSU VE SÜRESİ */}
            <div className="mb-4">
              <h2 className="text-sm font-bold uppercase text-slate-950 mb-1.5">
                2. SÖZLEŞMENİN KONUSU VE SÜRESİ
              </h2>
              <div className="space-y-1.5 text-[12.5px] text-slate-800 text-justify">
                <p>
                  <strong>2.1.</strong> İşbu sözleşmenin konusu, Çalışan&apos;ın yukarıda belirtilen unvan ve görev tanımı çerçevesinde, İşveren&apos;e ait işyerinde kısmi süreli (part-time) olarak çalıştırılmasına ilişkin şartların belirlenmesidir.
                </p>
                <p>
                  <strong>2.2.</strong> İşbu sözleşme <strong>{baslangicTarihGosterim}</strong> tarihinde başlar ve{' '}
                  <strong>
                    {sozlesmeTuru === 'Belirsiz' ? '[Belirsiz Süreli]' : `[Belirli Süreli - Bitiş: ${belirliBitisGosterim}]`}
                  </strong>{' '}
                  olarak akdedilmiştir.
                </p>
              </div>
            </div>

            {/* 3. ÇALIŞMA SÜRELERİ VE KOŞULLARI */}
            <div className="mb-4">
              <h2 className="text-sm font-bold uppercase text-slate-950 mb-1.5">
                3. ÇALIŞMA SÜRELERİ VE KOŞULLARI
              </h2>
              <div className="space-y-1.5 text-[12.5px] text-slate-800 text-justify">
                <p>
                  <strong>3.1.</strong> 4857 sayılı İş Kanunu m.13 uyarınca; emsal tam süreli çalışan haftalık 45 saat çalışmakta olup, işbu sözleşme kapsamında Çalışan&apos;ın haftalık toplam çalışma süresi{' '}
                  <strong className="underline underline-offset-2 px-1">
                    {haftalikSaat ? `${haftalikSaat} saat` : '........... saat'}
                  </strong>
                  tir.
                </p>
                <p>
                  <strong>3.2.</strong> Çalışma günleri ve saatleri İşveren tarafından aşağıdaki şekilde planlanmıştır:
                </p>
                <div className="p-2 border border-slate-300 rounded bg-slate-50 font-medium text-[12px] my-1">
                  {calismaPlani || 'İşverenin haftalık operasyonel programına göre belirlenecektir.'}
                </div>
                <p>
                  <strong>3.3.</strong> Çalışma gün ve saatleri, işyerinin operasyonel ihtiyaçlarına göre İşveren tarafından makul bir süre öncesinden bildirilmek kaydıyla değiştirilebilir.
                </p>
              </div>
            </div>

            {/* 4. ÜCRET VE ÖDEME ŞEKLİ */}
            <div className="mb-4">
              <h2 className="text-sm font-bold uppercase text-slate-950 mb-1.5">
                4. ÜCRET VE ÖDEME ŞEKLİ
              </h2>
              <div className="space-y-1.5 text-[12.5px] text-slate-800 text-justify">
                <p>
                  <strong>4.1.</strong> Çalışan&apos;a fiilen çalıştığı saatler dikkate alınarak Aylık Kısmi Ücret ödenir. Brüt/Net aylık ücret yasal asgari ücretle orantılı olarak belirlenmiştir.
                </p>
                <p>
                  <strong>4.2.</strong> Ücret ödemesi, takip eden ayın en geç 5. gününe kadar Çalışan&apos;ın banka hesabına yatırılır.
                </p>
                <p>
                  <strong>4.3.</strong> SGK prim bildirimleri ve ödemeleri, Çalışan&apos;ın ay içinde fiilen çalıştığı toplam saatlerin günlük yasal çalışma süresine (7.5 saat) bölünmesi suretiyle tespit edilen gün sayısı üzerinden yapılır.
                </p>
              </div>
            </div>

            {/* 5. TARAFLARIN HAK VE YÜKÜMLÜLÜKLERİ */}
            <div className="mb-4">
              <h2 className="text-sm font-bold uppercase text-slate-950 mb-1.5">
                5. TARAFLARIN HAK VE YÜKÜMLÜLÜKLERİ
              </h2>
              <div className="space-y-1.5 text-[12.5px] text-slate-800 text-justify">
                <p>
                  <strong>5.1. Ayrım Gözetmeme İlkesi:</strong> Çalışan, sırf kısmi süreli çalışıyor olması nedeniyle tam süreli emsal işçiye göre farklı bir işleme tabi tutulamaz. Hak ettiği kıdem, izin ve diğer haklar çalışma süresiyle orantılı (pro-rata) olarak hesaplanır.
                </p>
                <p>
                  <strong>5.2.</strong> Çalışan, verilen görevleri özenle ve dürüstlükle yerine getirmek, işyeri kurallarına, İSG talimatlarına ve gizlilik ilkesine uymakla yükümlüdür.
                </p>
                <p>
                  <strong>5.3. Fazla Çalışma Yasağı:</strong> Kısmi süreli çalışan işçilere yasal olarak fazla çalışma (mesai) yaptırılamaz.
                </p>
              </div>
            </div>

            {/* 6. SÖZLEŞMENİN FESHİ */}
            <div className="mb-6">
              <h2 className="text-sm font-bold uppercase text-slate-950 mb-1.5">
                6. SÖZLEŞMENİN FESHİ
              </h2>
              <p className="text-[12.5px] text-slate-800 text-justify">
                Taraflardan her biri, 4857 sayılı İş Kanunu&apos;nda belirtilen ihbar sürelerine uymak kaydıyla veya haklı nedenlerin varlığı halinde ihbarsız olarak işbu sözleşmeyi feshedebilir.
              </p>
            </div>

            {/* İMZA ALANI (Baskıda Bölünmez) */}
            <div className="print-avoid-break mt-8 pt-4 border-t border-slate-400">
              <div className="grid grid-cols-2 gap-8 text-center">
                
                {/* İşveren Tarafı */}
                <div className="flex flex-col justify-between h-32 border border-slate-300 rounded p-3 bg-slate-50/50">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold uppercase text-slate-950">
                      İŞVEREN / VEKİLİ
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-0.5">{isverenUnvani}</p>
                  </div>
                  
                  <div className="space-y-1 text-left text-[11.5px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">İmza / Kaşe:</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-600">Tarih:</span>
                      <span className="font-semibold text-slate-900">{imzaTarihGosterim}</span>
                    </div>
                  </div>
                </div>

                {/* Çalışan Tarafı */}
                <div className="flex flex-col justify-between h-32 border border-slate-300 rounded p-3 bg-slate-50/50">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold uppercase text-slate-950">
                      ÇALIŞAN (İŞÇİ)
                    </h3>
                    <p className="text-[11px] font-bold text-slate-900 mt-0.5">
                      {calisanAdSoyad || '...........................................'}
                    </p>
                  </div>

                  <div className="space-y-1 text-left text-[11.5px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">İmza:</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-600">Tarih:</span>
                      <span className="font-semibold text-slate-900">{imzaTarihGosterim}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
