import React from 'react';
import { createPortal } from 'react-dom';
import { Personel, Yevmiyeci } from '../types';
import { 
  X, 
  FileText, 
  Shield, 
  ShieldCheck, 
  Calendar, 
  ChevronRight, 
  Printer, 
  UserCheck, 
  Building2, 
  HardHat, 
  FileSpreadsheet,
  FileCheck
} from 'lucide-react';

export type EvrakTipi = 'kismi_sozlesme' | 'kvkk' | 'kkd_zimmet' | 'izin_formu' | 'ozluk_formu';

interface PersonelEvrakSecimModalProps {
  isOpen: boolean;
  onClose: () => void;
  personel: Personel | Yevmiyeci | null;
  onSelectEvrak: (evrakTipi: EvrakTipi) => void;
}

export const PersonelEvrakSecimModal: React.FC<PersonelEvrakSecimModalProps> = ({
  isOpen,
  onClose,
  personel,
  onSelectEvrak,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen || !personel) return null;

  const tc = (personel as any).TCKimlikNo || (personel as any).TcKimlikNo || (personel as any).tcKimlikNo || '-';
  const gorev = (personel as any).Gorev || (personel as any).GorevVeyaUnvan || (personel as any).UzmanlikAlani || (personel as any).Departman || 'Personel';

  const evraklar = [
    {
      id: 'kismi_sozlesme' as EvrakTipi,
      baslik: 'Kısmi Süreli (Part-Time) İş Sözleşmesi',
      aciklama: '4857 Sayılı İş Kanunu Madde 13 uyarınca resmi part-time istihdam ve çalışma şartları sözleşmesi.',
      mevzuat: '📄 Sözleşme Yazdır',
      ikon: FileText,
      renk: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/30',
      badgeRenk: 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
    },
    {
      id: 'kvkk' as EvrakTipi,
      baslik: 'KVKK Çalışan Aydınlatma Metni & Beyan Formu',
      aciklama: '6698 Sayılı Kişisel Verilerin Korunması Kanunu Madde 10 uyarınca aydınlatma ve tebliğ alındı onayı.',
      mevzuat: '🛡️ KVKK Yazdır',
      ikon: Shield,
      renk: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/30',
      badgeRenk: 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
    },
    {
      id: 'kkd_zimmet' as EvrakTipi,
      baslik: 'KKD & Ekipman Zimmet Teslim Tutanağı',
      aciklama: 'Önce personele verilecek ekipman ve donanım girişini yapın, ardından tutanağı yazdırın.',
      mevzuat: '➡️ İSG & Zimmet Sayfasına Git',
      ikon: ShieldCheck,
      renk: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/30',
      badgeRenk: 'bg-amber-950/80 text-amber-300 border-amber-800'
    },
    {
      id: 'izin_formu' as EvrakTipi,
      baslik: 'Personel İzin Talep & Onay Formu',
      aciklama: 'Önce personelin izin tarihlerini ve gün sayısını kaydedin, ardından imzalı izin formunu yazdırın.',
      mevzuat: '➡️ İzin Girişi Sayfasına Git',
      ikon: Calendar,
      renk: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/30',
      badgeRenk: 'bg-blue-950/80 text-blue-300 border-blue-800'
    }
  ];

  const modalContent = (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Başlık Alanı */}
        <div className="p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Personel Evrak &amp; Form Çıkarma
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                <strong className="text-slate-200">{personel.AdSoyad}</strong> • {gorev} {tc !== '-' ? `(TC: ${tc})` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Kapat (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Belge Listesi */}
        <div className="p-4 sm:p-5 space-y-2.5 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-slate-400 font-medium px-1 mb-1">
            Yazdırmak veya PDF çıktısı almak istediğiniz resmi evrakı seçiniz:
          </p>

          {evraklar.map((evrak) => {
            const Ikon = evrak.ikon;
            return (
              <button
                key={evrak.id}
                type="button"
                onClick={() => {
                  onSelectEvrak(evrak.id);
                  onClose();
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between gap-3 group cursor-pointer bg-slate-950/60 ${evrak.renk}`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-900/80 shrink-0 mt-0.5 shadow-xs">
                    <Ikon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-white group-hover:text-indigo-200 transition">
                        {evrak.baslik}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${evrak.badgeRenk}`}>
                        {evrak.mevzuat}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {evrak.aciklama}
                    </p>
                  </div>
                </div>

                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:border-slate-500 shrink-0 transition">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Alt Bilgi */}
        <div className="p-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            A4 Tek Sayfa Resmi Evrak Formatı
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
          >
            Vazgeç
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
