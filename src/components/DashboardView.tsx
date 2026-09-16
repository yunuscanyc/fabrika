import React from 'react';
import { OzetIstatistikler } from '../types';
import { DbStatusData } from './DatabaseStatusModal';
import { 
  FolderGit2, 
  Truck, 
  Wrench, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  Users,
  Cog,
  ShieldCheck,
  Database,
  HardHat,
  AlertTriangle
} from 'lucide-react';

interface DashboardViewProps {
  ozet: OzetIstatistikler | null;
  onNavigateTab: (tab: string, subTab?: 'liste' | 'izin' | 'puantaj' | 'montaj' | 'isg' | 'yevmiyeci', personelId?: number, isgSekme?: 'kkd' | 'saglik' | 'egitim') => void;
  dbStatus?: DbStatusData | null;
  onOpenDbModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  ozet,
  onNavigateTab,
  dbStatus,
  onOpenDbModal
}) => {
  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Üst Karşılama ve Hızlı Durum */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Fabrika Yönetim &amp; Üretim Takip
              </span>
              {dbStatus?.connected ? (
                <button
                  onClick={onOpenDbModal}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 hover:bg-emerald-500/30 transition-colors"
                  title="Veritabanı bağlantı detayları"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>PostgreSQL Canlı Bağlı ({dbStatus.database})</span>
                </button>
              ) : (
                <button
                  onClick={onOpenDbModal}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 hover:bg-rose-500/30 transition-colors"
                  title="Canlı veritabanı ayarlarını yapılandırmak için tıklayın"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>PostgreSQL Canlı Bağlantısı Yok (Ayarla)</span>
                </button>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-2 text-white">
              Rende Ahşap &amp; Mobilya Fabrika Portalı
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              İmalat projeleri, personel puantaj &amp; izinleri, mobilya makineleri, araç filosu ve 6331 İSG denetimlerini tek ekranda yönetin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigateTab('personel', 'montaj')}
              className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors border border-amber-500/30"
            >
              <HardHat className="w-4 h-4 text-amber-400" />
              <span>Dış Montaj &amp; Şantiye</span>
            </button>
            <button
              onClick={() => onNavigateTab('personel')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Users className="w-4 h-4 text-blue-400" />
              <span>Personel &amp; Puantaj</span>
            </button>
            <button
              onClick={() => onNavigateTab('projeler')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-md shadow-blue-600/30"
            >
              <span>Projeleri Gör</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Canlı Veritabanı Bağlantı Durumu Bilgilendirmesi */}
      {dbStatus && !dbStatus.connected && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-amber-900">Canlı PostgreSQL Veritabanı Bağlantısı Bekleniyor</h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Sistemde sahte/örnek veri gösterimi kapatılmıştır. Bilgisayarınızdaki veya sunucunuzdaki gerçek PostgreSQL veritabanı kayıtlarının ekranda listelenmesi için bağlantı parametrelerinizi kontrol edebilirsiniz.
              </p>
              {dbStatus.lastDbError && (
                <p className="text-[11px] font-mono text-amber-700 mt-1 bg-amber-100/60 px-2 py-0.5 rounded inline-block">
                  Sinyal: {dbStatus.lastDbError}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onOpenDbModal}
            className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Veritabanına Bağlan / Ayarla</span>
          </button>
        </div>
      )}

      {/* Ana Metrik Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* 1. Aktif Projeler */}
        <div 
          onClick={() => onNavigateTab('projeler')}
          className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Projeler</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{ozet?.aktifProje ?? 0}</span>
            <span className="text-[10px] text-slate-400">/ {ozet?.toplamProje ?? 0} Aktif</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">İmalat &amp; Şantiye</p>
        </div>

        {/* 2. Aktif Personel & İK */}
        <div 
          onClick={() => onNavigateTab('personel')}
          className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Personel &amp; İK</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{ozet?.aktifPersonel ?? 0}</span>
            <span className="text-[10px] text-slate-400">/ {ozet?.toplamPersonel ?? 0} Aktif</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            {ozet?.bugunIzinliPersonel ? `${ozet.bugunIzinliPersonel} İzinli` : 'Tam Kadro'}
          </p>
        </div>

        {/* 3. Mobilya Makineleri */}
        <div 
          onClick={() => onNavigateTab('makineler')}
          className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Makineler</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Cog className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{ozet?.aktifMakine ?? 0}</span>
            <span className="text-[10px] text-slate-400">/ {ozet?.toplamMakine ?? 0} Faal</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">CNC, Ebatlama, Bant</p>
        </div>

        {/* 4. Filo & Araçlar */}
        <div 
          onClick={() => onNavigateTab('araclar')}
          className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Araç Filosu</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{ozet?.aktifArac ?? 0}</span>
            <span className="text-[10px] text-slate-400">/ {ozet?.toplamArac ?? 0} Çalışır</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">Kamyon, Forklift, Servis</p>
        </div>

        {/* 5. Bakım Uyarıları (Araç + Makine) - Uyarı Varsa Kırmızı, Yoksa Standart */}
        {(() => {
          const aracBakim = ozet?.bakimBekleyenArac ?? 0;
          const makineBakim = ozet?.bakimBekleyenMakine ?? 0;
          const totalBakim = aracBakim + makineBakim;
          const hasWarning = totalBakim > 0;

          const handleBakimTikla = () => {
            if (aracBakim > 0) {
              onNavigateTab('araclar');
            } else if (makineBakim > 0) {
              onNavigateTab('makineler');
            } else {
              onNavigateTab('araclar');
            }
          };

          return (
            <div 
              id="bakim-metric-card"
              onClick={handleBakimTikla}
              className={`rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                hasWarning
                  ? 'bg-rose-50 border-2 border-rose-400/90 text-rose-950 hover:bg-rose-100/80 shadow-rose-100'
                  : 'bg-white border border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold ${hasWarning ? 'text-rose-800 font-extrabold' : 'text-slate-500'}`}>
                  Bakım Uyarısı
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform ${
                  hasWarning 
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30' 
                    : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {hasWarning ? (
                    <Wrench className="w-4 h-4 animate-pulse" />
                  ) : (
                    <Wrench className="w-4 h-4" />
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className={`text-2xl font-black ${hasWarning ? 'text-rose-600' : 'text-slate-900'}`}>
                  {totalBakim}
                </span>
                <span className={`text-[10px] font-bold ${hasWarning ? 'px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300' : 'text-slate-400'}`}>
                  {hasWarning ? 'Acil / Yakın' : 'Sorunsuz'}
                </span>
              </div>
              <p className={`text-[10px] mt-0.5 truncate ${hasWarning ? 'text-rose-700 font-semibold' : 'text-slate-500'}`}>
                {hasWarning 
                  ? `${aracBakim > 0 ? `${aracBakim} Araç` : ''}${aracBakim > 0 && makineBakim > 0 ? ' + ' : ''}${makineBakim > 0 ? `${makineBakim} Makine` : ''} Bakımı`
                  : 'Tüm Bakımlar Güncel'}
              </p>
            </div>
          );
        })()}

        {/* 6. Bugün Biten Ajanda Görevleri */}
        {(() => {
          const gorevSayisi = ozet?.bugunBitenGorevler ?? 0;
          return (
            <div 
              onClick={() => onNavigateTab('hatirlaticilar')}
              className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Günün Görevi</span>
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">{gorevSayisi}</span>
                <span className="text-[10px] text-slate-400">
                  {gorevSayisi > 0 ? 'Bugün Açık' : 'Tamam'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                {gorevSayisi > 0 ? 'Teslimat & Randevu' : 'Bekleyen Görev Yok'}
              </p>
            </div>
          );
        })()}

        {/* 7. İSG Uyarıları (Sağlık Raporu & Eğitim) - Uyarı Varsa Kırmızı, Yoksa Standart */}
        {(() => {
          const isgCount = ozet?.isgUyarilari?.length ?? 0;
          const hasWarning = isgCount > 0;
          return (
            <div 
              id="isg-metric-card"
              onClick={() => onNavigateTab('personel', 'isg')}
              className={`rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                hasWarning
                  ? 'bg-rose-50 border-2 border-rose-400/90 text-rose-950 hover:bg-rose-100/80 shadow-rose-100'
                  : 'bg-white border border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold ${hasWarning ? 'text-rose-800 font-extrabold' : 'text-slate-500'}`}>
                  İSG Durumu
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform ${
                  hasWarning 
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30' 
                    : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {hasWarning ? (
                    <ShieldAlert className="w-4 h-4 animate-pulse" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className={`text-2xl font-black ${hasWarning ? 'text-rose-600' : 'text-slate-900'}`}>
                  {isgCount}
                </span>
                <span className={`text-[10px] font-bold ${hasWarning ? 'px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300' : 'text-slate-400'}`}>
                  {hasWarning ? 'Kritik / Uyarı' : 'Sorunsuz'}
                </span>
              </div>
              <p className={`text-[10px] mt-0.5 truncate ${hasWarning ? 'text-rose-700 font-semibold' : 'text-slate-500'}`}>
                {hasWarning ? 'Rapor / Eğitim Eksik' : 'Tüm Kayıtlar Güncel'}
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

