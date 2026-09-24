import React, { useState } from 'react';
import { AjandaBildirimi } from '../types';
import { 
  Bell, 
  CheckCircle2, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  X, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Clock, 
  Sparkles,
  CheckCheck
} from 'lucide-react';

interface AjandaBildirimBariProps {
  bildirimler: AjandaBildirimi[];
  currentUserName: string;
  onOpenHatirlatici: (hatirlaticiId: number) => void;
  onMarkRead: (notificationId?: number, hatirlaticiId?: number) => void;
  onMarkAllRead: () => void;
}

export const AjandaBildirimBari: React.FC<AjandaBildirimBariProps> = ({
  bildirimler,
  currentUserName,
  onOpenHatirlatici,
  onMarkRead,
  onMarkAllRead,
}) => {
  const [genisletilmis, setGenisletilmis] = useState(false);

  // Sadece şu anki kullanıcının henüz okumadığı bildirimleri filtrele
  const okunmamislar = bildirimler.filter(b => !b.Okundu && b.YapanKisi !== currentUserName);

  if (okunmamislar.length === 0) return null;

  const getIslemIkonu = (tur: string) => {
    switch (tur) {
      case 'eklendi':
        return <PlusCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'duzenlendi':
        return <Edit3 className="w-4 h-4 text-blue-500 shrink-0" />;
      case 'tamamlandi':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'devam_ediyor':
        return <RotateCcw className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'silindi':
        return <Trash2 className="w-4 h-4 text-red-500 shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-500 shrink-0" />;
    }
  };

  const getIslemRozeti = (tur: string) => {
    switch (tur) {
      case 'eklendi':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Yeni Eklendi</span>;
      case 'duzenlendi':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Düzenlendi</span>;
      case 'tamamlandi':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">Tamamlandı</span>;
      case 'devam_ediyor':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Tekrar Açıldı</span>;
      case 'silindi':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">Silindi</span>;
      default:
        return null;
    }
  };

  const formatZaman = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  const ilkBildirim = okunmamislar[0];

  return (
    <aside aria-label="Ajanda Bildirimleri" className="fixed bottom-18 md:bottom-6 right-3 md:right-6 z-40 max-w-md w-[calc(100vw-1.5rem)] md:w-96 animate-slideUp shadow-2xl rounded-2xl overflow-hidden border border-blue-300 bg-white text-slate-800">
      {/* Üst Bar / Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Bell className="w-4 h-4 text-white animate-bounce" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-blue-700">
              {okunmamislar.length}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-white tracking-wide">Ajanda Değişiklik Bildirimi</h4>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-900 font-extrabold">
                {okunmamislar.length} Bekleyen
              </span>
            </div>
            <p className="text-[10px] text-blue-100 font-medium">
              İlgili hatırlatmaları inceleyene kadar bildirim açık kalır
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setGenisletilmis(!genisletilmis)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            title={genisletilmis ? 'Listeyi Daralt' : 'Tüm Değişiklikleri Gör'}
          >
            {genisletilmis ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Ana Gösterim / Detay Listesi */}
      <div className="p-3 max-h-72 overflow-y-auto space-y-2 bg-slate-50/80">
        {!genisletilmis && ilkBildirim && (
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                {getIslemIkonu(ilkBildirim.IslemTuru)}
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs text-slate-900">{ilkBildirim.YapanKisi}</span>
                    {getIslemRozeti(ilkBildirim.IslemTuru)}
                  </div>
                  <p className="text-xs font-semibold text-blue-900 mt-0.5 line-clamp-1">
                    "{ilkBildirim.Baslik}"
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {ilkBildirim.Detay}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatZaman(ilkBildirim.Tarih)}
              </span>

              <div className="flex items-center gap-1.5">
                {ilkBildirim.HatirlaticiId ? (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenHatirlatici(Number(ilkBildirim.HatirlaticiId));
                      onMarkRead(ilkBildirim.Id, Number(ilkBildirim.HatirlaticiId));
                    }}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>İncele &amp; Aç</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onMarkRead(ilkBildirim.Id)}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Gördüm / Tamam</span>
                  </button>
                )}
              </div>
            </div>

            {okunmamislar.length > 1 && (
              <button
                type="button"
                onClick={() => setGenisletilmis(true)}
                className="w-full text-center py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1"
              >
                <span>+{okunmamislar.length - 1} diğer bildirimi göster</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {genisletilmis && (
          <div className="space-y-2">
            {okunmamislar.map((b) => (
              <div
                key={b.Id}
                className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5 hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {getIslemIkonu(b.IslemTuru)}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">{b.YapanKisi}</span>
                        {getIslemRozeti(b.IslemTuru)}
                      </div>
                      <p className="text-xs font-semibold text-blue-900 mt-0.5">
                        "{b.Baslik}"
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {b.Detay}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-400 text-[10px] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatZaman(b.Tarih)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {b.HatirlaticiId ? (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenHatirlatici(Number(b.HatirlaticiId));
                          onMarkRead(b.Id, Number(b.HatirlaticiId));
                        }}
                        className="px-2 py-0.8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>İncele</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onMarkRead(b.Id)}
                        className="px-2 py-0.8 bg-slate-700 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>Gördüm</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setGenisletilmis(false)}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-medium"
              >
                Listeyi Küçült
              </button>

              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Hepsini Okundu Say</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
