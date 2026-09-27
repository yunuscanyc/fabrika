import React from 'react';
import { Loader2, Database, CheckCircle2 } from 'lucide-react';

interface PageLoadingIndicatorProps {
  baslik?: string;
  yuklenenCount: number;
  toplamCount: number;
  aciklama?: string;
  className?: string;
}

export const PageLoadingIndicator: React.FC<PageLoadingIndicatorProps> = ({
  baslik = 'Veriler Yükleniyor...',
  yuklenenCount,
  toplamCount,
  aciklama = 'Veritabanı senkronize ediliyor, lütfen bekleyiniz',
  className = ''
}) => {
  const yuzde = toplamCount > 0 ? Math.min(100, Math.round((yuklenenCount / toplamCount) * 100)) : 0;

  return (
    <div className={`w-full bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-800 my-4 transition-all duration-300 animate-fadeIn ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Sol Taraf: Icon + Başlık */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 shrink-0">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            <Database className="w-3 h-3 absolute text-blue-300 opacity-80" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
              <span>{baslik}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{aciklama}</p>
          </div>
        </div>

        {/* Sağ Taraf: Yüklenen / Toplam Rozeti */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-800/90 border border-slate-700/80 px-4 py-2 rounded-xl text-right">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Durum</div>
            <div className="text-sm font-bold font-mono text-amber-400 flex items-center gap-1.5 justify-end mt-0.5">
              <span>Yüklenen: <span className="text-emerald-400">{yuklenenCount}</span> / Toplam: <span className="text-blue-300">{toplamCount}</span></span>
              {yuklenenCount >= toplamCount && toplamCount > 0 && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* İlerleme Çubuğu (Progress Bar) */}
      <div className="mt-4 w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
        <div 
          className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${toplamCount > 0 ? yuzde : 15}%` }}
        />
      </div>
    </div>
  );
};
