import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Personel, Yevmiyeci } from '../types';
import { Printer, X, Shield, Settings, Check } from 'lucide-react';
import { formatTarihTR, getBugunIso } from '../utils/dateUtils';

interface KvkkAydinlatmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  personel?: Personel | Yevmiyeci | null;
}

export const KvkkAydinlatmaModal: React.FC<KvkkAydinlatmaModalProps> = ({
  isOpen,
  onClose,
  personel,
}) => {
  const [veriSorumlusu, setVeriSorumlusu] = useState('Rende İnşaat Mobilya');
  const [calisanAdSoyad, setCalisanAdSoyad] = useState('');
  const [calisanTc, setCalisanTc] = useState('');
  const [imzaTarihi, setImzaTarihi] = useState('');
  const [ayarPaneliAcik, setAyarPaneliAcik] = useState(false);

  useEffect(() => {
    if (personel) {
      setCalisanAdSoyad(personel.AdSoyad || '');
      const tc = (personel as any).TCKimlikNo || (personel as any).TcKimlikNo || (personel as any).tcKimlikNo || '';
      setCalisanTc(tc);
      const giris = (personel as any).IseGirisTarihi || getBugunIso();
      setImzaTarihi(giris);
    }
  }, [personel, isOpen]);

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

  const imzaTarihGosterim = imzaTarihi ? formatTarihTR(imzaTarihi) : '... / ... / 20..';

  const modalContent = (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm p-2 sm:p-4 flex justify-center items-start print-modal-overlay"
    >
      {/* Tarayıcı üst/alt bilgi yazılarını kaldıran @page kuralı */}
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
        
        {/* Üst Yönetim Araç Çubuğu */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                KVKK Çalışan Aydınlatma Metni &amp; Beyan Formu
                <span className="text-xs font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                  6698 SK. Md. 10
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
              title="Evrak Bilgilerini Düzenle"
            >
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>{ayarPaneliAcik ? 'Formu Gizle' : 'Bilgileri Düzenle'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg transition cursor-pointer"
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

        {/* Hızlı Bilgi Düzenleme Paneli */}
        {ayarPaneliAcik && (
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs print:hidden animate-in fade-in duration-150">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Veri Sorumlusu (Şirket)</label>
              <input 
                type="text" 
                value={veriSorumlusu} 
                onChange={(e) => setVeriSorumlusu(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
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
              <label className="block text-slate-400 mb-1 font-medium">Tebliğ / İmza Tarihi</label>
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
          <div className="print-modal-content bg-white text-slate-900 p-8 sm:p-12 w-full max-w-[210mm] min-h-[297mm] shadow-xl rounded-sm leading-relaxed text-[12px] sm:text-[12.5px]">
            
            {/* Başlık Bölümü */}
            <div className="text-center mb-4 border-b-2 border-slate-900 pb-2.5">
              <h1 className="text-base sm:text-lg font-bold uppercase tracking-wide text-slate-950 leading-snug">
                ÇALIŞAN ADAYI VE ÇALIŞAN KİŞİSEL VERİLERİNİN İŞLENMESİNE İLİŞKİN AYDINLATMA METNİ
              </h1>
              <p className="text-[11.5px] font-semibold text-slate-700 mt-0.5">
                (6698 Sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) Madde 10 Uyarınca)
              </p>
            </div>

            {/* Veri Sorumlusu */}
            <div className="mb-3">
              <p className="text-[12px] font-semibold text-slate-900">
                <span className="border-l-4 border-slate-900 pl-2">Veri Sorumlusu:</span> <strong>{veriSorumlusu}</strong>
              </p>
            </div>

            {/* 1. Veri Sorumlusunun Kimliği */}
            <div className="mb-3">
              <h2 className="text-[12.5px] font-bold text-slate-950 mb-0.5">
                1. Veri Sorumlusunun Kimliği
              </h2>
              <p className="text-justify text-slate-800">
                6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, kişisel verileriniz; veri sorumlusu sıfatıyla <strong>{veriSorumlusu}</strong> (&quot;Şirket&quot;) tarafından aşağıda açıklanan kapsamda ve mevzuata uygun olarak işlenmektedir.
              </p>
            </div>

            {/* 2. İşlenen Kişisel Verileriniz */}
            <div className="mb-3">
              <h2 className="text-[12.5px] font-bold text-slate-950 mb-1">
                2. İşlenen Kişisel Verileriniz
              </h2>
              <p className="text-justify text-slate-800 mb-1.5">
                İşe alım ve iş ilişkisinin kurulması süreçlerinde tarafınızdan talep edilen veya özlük dosyanız kapsamında toplanan kişisel verileriniz şunlardır:
              </p>

              <table className="w-full border-collapse border border-slate-900 text-[11.5px]">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold">
                    <th className="border border-slate-900 p-1.5 text-left w-1/3">Veri Kategorisi</th>
                    <th className="border border-slate-900 p-1.5 text-left">İşlenen Kişisel Veri Tipleri</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-900 p-1.5 font-bold bg-slate-50">Kimlik Bilgileri</td>
                    <td className="border border-slate-900 p-1.5">Ad, soyad, T.C. kimlik numarası, doğum yeri ve tarihi, medeni durum, fotoğraf</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 p-1.5 font-bold bg-slate-50">İletişim Bilgileri</td>
                    <td className="border border-slate-900 p-1.5">Telefon numarası, ikametgâh adresi, e-posta adresi</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 p-1.5 font-bold bg-slate-50">Özlük ve Eğitim</td>
                    <td className="border border-slate-900 p-1.5">Özgeçmiş (CV), diploma, sertifikalar, çalışma geçmişi, referans bilgileri, askerlik durum belgesi</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 p-1.5 font-bold bg-slate-50">Sağlık ve Özel Nitelikli Veri</td>
                    <td className="border border-slate-900 p-1.5">İşe giriş sağlık raporu, kan grubu (yalnızca kanunların öngördüğü ve iş sağlığı güvenliği kapsamındaki zorunlu hallerde)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. Kişisel Verilerin İşlenme Amaçları */}
            <div className="mb-3">
              <h2 className="text-[12.5px] font-bold text-slate-950 mb-0.5">
                3. Kişisel Verilerin İşlenme Amaçları
              </h2>
              <p className="text-slate-800 mb-1">Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-800 text-justify pl-1">
                <li>İşe alım süreçlerinin yürütülmesi, adayların niteliklerinin ve göreve uygunluğunun değerlendirilmesi,</li>
                <li>4857 sayılı İş Kanunu, 5510 sayılı SGK Kanunu ve 6331 sayılı İSG Kanunu başta olmak üzere yasal yükümlülüklerin yerine getirilmesi,</li>
                <li>İş akdinin kurulması, özlük dosyasının oluşturulması ve maaş/özlük haklarının ödenmesi,</li>
                <li>İş sağlığı ve güvenliği süreçlerinin mevzuata uygun olarak yürütülmesi,</li>
                <li>Şirket içi iletişimin, iş düzeninin ve güvenliğinin sağlanması.</li>
              </ul>
            </div>

            {/* 4. Kişisel Verilerin Toplanma Yöntemi ve Hukuki Sebebi */}
            <div className="mb-3">
              <h2 className="text-[12.5px] font-bold text-slate-950 mb-0.5">
                4. Kişisel Verilerin Toplanma Yöntemi ve Hukuki Sebebi
              </h2>
              <p className="text-slate-800 text-justify mb-1">
                Kişisel verileriniz; iş başvuru formu, özgeçmiş (CV), e-Devlet üzerinden alınan belgeler, fiziki teslim edilen evraklar ve elektronik ortamlar aracılığıyla toplanmaktadır.
              </p>
              <p className="text-slate-800 text-justify mb-0.5">
                Söz konusu veriler, KVKK&apos;nın 5. ve 6. maddelerinde belirtilen;
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-800 text-justify pl-1">
                <li>Kanunlarda açıkça öngörülmesi (İş Kanunu, SGK, İSG mevzuatı),</li>
                <li>Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması (iş sözleşmesi),</li>
                <li>Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi için zorunlu olması,</li>
                <li>İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla veri sorumlusunun meşru menfaatleri için veri işlenmesinin zorunlu olması hukuki sebeplerine dayanılarak işlenmektedir.</li>
              </ul>
            </div>

            {/* 5. Kişisel Verilerin Aktarılması */}
            <div className="mb-3">
              <h2 className="text-[12.5px] font-bold text-slate-950 mb-0.5">
                5. Kişisel Verilerin Aktarılması
              </h2>
              <p className="text-slate-800 text-justify">
                Kişisel verileriniz; yasal yükümlülüklerin yerine getirilmesi amacıyla SGK, İŞKUR, Gelir İdaresi Başkanlığı gibi yetkili kamu kurum ve kuruluşlarına; maaş ödemelerinin yapılabilmesi için anlaşmalı bankalara ve iş sağlığı/güvenliği hizmetlerinin sunulabilmesi amacıyla yetkili Ortak Sağlık ve Güvenlik Birimlerine (OSGB) KVKK&apos;nın 8. ve 9. maddelerine uygun olarak aktarılabilmektedir.
              </p>
            </div>

            {/* 6. KVKK Kapsamındaki Haklarınız (Madde 11) */}
            <div className="mb-4">
              <h2 className="text-[12.5px] font-bold text-slate-950 mb-0.5">
                6. KVKK Kapsamındaki Haklarınız (Madde 11)
              </h2>
              <p className="text-slate-800 text-justify mb-1">
                KVKK&apos;nın 11. maddesi uyarınca veri sahibi olarak Şirketimize başvurarak;
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-800 text-justify pl-1">
                <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme,</li>
                <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
                <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
                <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme ve silinmesini/yok edilmesini talep etme,</li>
                <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme haklarına sahipsiniz.</li>
              </ul>
            </div>

            {/* BEYAN VE TEBLİĞ ALINDI ONAYI (Baskıda Bölünmez) */}
            <div className="print-avoid-break mt-4 pt-3 border-t-2 border-slate-900 bg-slate-50/70 p-3.5 rounded border">
              <h3 className="text-[12.5px] font-bold uppercase text-slate-950 mb-1">
                BEYAN VE TEBLİĞ ALINDI ONAYI
              </h3>
              <p className="text-[11.5px] text-slate-800 text-justify mb-3">
                Yukarıda belirtilen Aydınlatma Metni&apos;ni okuduğumu, kişisel verilerimin hangi amaçlarla toplanıp işlendiği ve KVKK kapsamındaki haklarım hususunda bilgilendirildiğimi kabul ve beyan ederim.
              </p>

              <div className="grid grid-cols-2 gap-4 text-[12px]">
                <div className="space-y-1.5">
                  <div className="flex">
                    <span className="font-bold text-slate-900 w-28">Adı Soyadı:</span>
                    <span className="font-semibold text-slate-950">{calisanAdSoyad || <span className="text-slate-400 font-normal">...................................................</span>}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold text-slate-900 w-28">T.C. Kimlik No:</span>
                    <span className="font-semibold text-slate-950 font-mono">{calisanTc || <span className="text-slate-400 font-normal">...................................................</span>}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold text-slate-900 w-28">Tarih:</span>
                    <span className="font-semibold text-slate-950">{imzaTarihGosterim}</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between items-end pr-4">
                  <span className="font-bold text-slate-900">İmza:</span>
                  <div className="w-36 h-12 border-b border-dashed border-slate-400"></div>
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
