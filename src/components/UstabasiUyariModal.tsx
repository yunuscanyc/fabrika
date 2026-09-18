import React from 'react';
import { Lock, ShieldAlert, PhoneCall, Check, X } from 'lucide-react';
import { MalzemeSiparisi } from '../types';

interface UstabasiUyariModalProps {
  isOpen: boolean;
  onClose: () => void;
  siparis: MalzemeSiparisi | null;
}

export const UstabasiUyariModal: React.FC<UstabasiUyariModalProps> = ({
  isOpen,
  onClose,
  siparis
}) => {
  if (!isOpen || !siparis) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-amber-300 overflow-hidden text-slate-800">
        {/* Üst Kırmızı/Turuncu Uyarı Başlığı */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Sipariş Kilitli — Değişiklik Yapılamaz</h3>
              <p className="text-[11px] text-amber-100">{siparis.SiparisNo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gövde */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1.5">
              <p className="font-bold text-sm text-amber-900">
                Lütfen Satınalmacı ile Görüşün!
              </p>
              <p className="leading-relaxed text-slate-700">
                Bu malzeme siparişi satınalma departmanı tarafından onaylanmış ve kilitlenmiştir. Dış tedarikçiye sipariş verilmiş veya fiyat anlaşması yapılmış olabilir.
              </p>
            </div>
          </div>

          {/* Sipariş Özeti */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Proje:</span>
              <span className="font-bold text-slate-800">{siparis.ProjeAdi}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Malzeme:</span>
              <span className="font-semibold text-slate-900">{siparis.MalzemeAdi}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Miktar:</span>
              <span className="font-bold text-slate-900">{siparis.Miktar} {siparis.Birim}</span>
            </div>
            {siparis.KilitNotu && (
              <div className="pt-2 border-t border-slate-200 text-slate-600">
                <strong className="text-amber-800">Kilit Açıklaması:</strong> {siparis.KilitNotu}
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 text-center italic">
            Ölçü veya adet düzeltmesi gerekiyorsa lütfen Satınalma Sorumlusu veya Fabrika Müdürü ile iletişime geçiniz.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Anladım, Kapat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
