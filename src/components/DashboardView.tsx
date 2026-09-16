import React, { useState } from 'react';
import { OzetIstatistikler, OzetGorevItem } from '../types';
import { DbStatusData } from './DatabaseStatusModal';
import { formatTarihTR } from '../utils/dateUtils';
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
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Plus
} from 'lucide-react';

interface DashboardViewProps {
  ozet: OzetIstatistikler | null;
  onNavigateTab: (tab: string, subTab?: 'liste' | 'izin' | 'puantaj' | 'montaj' | 'isg' | 'yevmiyeci', personelId?: number, isgSekme?: 'kkd' | 'saglik' | 'egitim') => void;
  dbStatus?: DbStatusData | null;
  onOpenDbModal?: () => void;
  onToggleTamamlandi?: (id: number, tamamlandi: boolean) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  ozet,
  onNavigateTab,
  dbStatus,
  onOpenDbModal,
  onToggleTamamlandi
}) => {
  const [ajandaFiltre, setAjandaFiltre] = useState<'acik' | 'hepsi' | 'tamamlanan'>('acik');

  const gorevler: OzetGorevItem[] = ozet?.gorevListesi || [];
  const acikGorevSayisi = gorevler.filter(g => !g.tamamlandiMi).length;
  const tamamlananSayisi = gorevler.filter(g => g.tamamlandiMi).length;

  const filtrelenmisGorevler = gorevler.filter(g => {
    if (ajandaFiltre === 'acik') return !g.tamamlandiMi;
    if (ajandaFiltre === 'tamamlanan') return g.tamamlandiMi;
    return true;
  });
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

      {/* Ana Metrik Kartları (6 Odaklı Modül) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

        {/* 3. Mobilya Makineleri (Bakım Uyarısı Varsa Kırmızı) */}
        {(() => {
          const makineBakim = ozet?.bakimBekleyenMakine ?? 0;
          const hasMakineWarning = makineBakim > 0;
          return (
            <div 
              id="makineler-metric-card"
              onClick={() => onNavigateTab('makineler')}
              className={`rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                hasMakineWarning
                  ? 'bg-rose-50 border-2 border-rose-400/90 text-rose-950 hover:bg-rose-100/80 shadow-rose-100'
                  : 'bg-white border border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold ${hasMakineWarning ? 'text-rose-800 font-extrabold' : 'text-slate-500'}`}>
                  Makineler
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform ${
                  hasMakineWarning
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30'
                    : 'bg-teal-50 text-teal-600'
                }`}>
                  <Cog className={`w-4 h-4 ${hasMakineWarning ? 'animate-pulse' : ''}`} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className={`text-2xl font-black ${hasMakineWarning ? 'text-rose-600' : 'text-slate-900'}`}>
                  {hasMakineWarning ? makineBakim : (ozet?.aktifMakine ?? 0)}
                </span>
                <span className={`text-[10px] font-bold ${hasMakineWarning ? 'px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300' : 'text-slate-400'}`}>
                  {hasMakineWarning ? 'Bakım Uyarısı' : `/ ${ozet?.toplamMakine ?? 0} Faal`}
                </span>
              </div>
              <p className={`text-[10px] mt-0.5 truncate ${hasMakineWarning ? 'text-rose-700 font-semibold' : 'text-slate-500'}`}>
                {hasMakineWarning ? `${makineBakim} Makinede Bakım Yaklaştı/Geçti` : 'CNC, Ebatlama, Bant'}
              </p>
            </div>
          );
        })()}

        {/* 4. Araç Filosu & Takip (Muayene, Sigorta/Kasko veya Bakım Yaklaşan/Geçen Varsa Kırmızı) */}
        {(() => {
          const totalAracUyarilari = ozet?.toplamAracUyarisi ?? (
            (ozet?.bakimBekleyenArac ?? 0) + 
            (ozet?.muayeneBekleyenArac ?? 0) + 
            (ozet?.sigortaBekleyenArac ?? 0)
          );
          const hasAracWarning = totalAracUyarilari > 0;

          return (
            <div 
              id="araclar-metric-card"
              onClick={() => onNavigateTab('araclar')}
              className={`rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                hasAracWarning
                  ? 'bg-rose-50 border-2 border-rose-400/90 text-rose-950 hover:bg-rose-100/80 shadow-rose-100'
                  : 'bg-white border border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold ${hasAracWarning ? 'text-rose-800 font-extrabold' : 'text-slate-500'}`}>
                  Araç Filosu
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform ${
                  hasAracWarning
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30'
                    : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <Truck className={`w-4 h-4 ${hasAracWarning ? 'animate-pulse' : ''}`} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className={`text-2xl font-black ${hasAracWarning ? 'text-rose-600' : 'text-slate-900'}`}>
                  {hasAracWarning ? totalAracUyarilari : (ozet?.aktifArac ?? 0)}
                </span>
                <span className={`text-[10px] font-bold ${hasAracWarning ? 'px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300' : 'text-slate-400'}`}>
                  {hasAracWarning ? 'Kritik Uyarı' : `/ ${ozet?.toplamArac ?? 0} Faal`}
                </span>
              </div>
              <p className={`text-[10px] mt-0.5 truncate ${hasAracWarning ? 'text-rose-700 font-semibold' : 'text-slate-500'}`}>
                {hasAracWarning ? (
                  [
                    ozet?.muayeneBekleyenArac ? `${ozet.muayeneBekleyenArac} Muayene` : '',
                    ozet?.sigortaBekleyenArac ? `${ozet.sigortaBekleyenArac} Sigorta` : '',
                    ozet?.bakimBekleyenArac ? `${ozet.bakimBekleyenArac} Bakım` : ''
                  ].filter(Boolean).join(' • ') || `${totalAracUyarilari} Araç Uyarısı`
                ) : (
                  'Muayene & Sigortalar Tam'
                )}
              </p>
            </div>
          );
        })()}

        {/* 5. İSG Uyarıları (Sağlık Raporu & Eğitim) - Uyarı Varsa Kırmızı, Yoksa Standart */}
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
      </div>

      {/* Alt Bölüm: Fabrika Ajandası & Günün Görevleri */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-sm shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Günün Ajandası &amp; Görevler</h2>
                {gorevler.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold">
                    {acikGorevSayisi} Açık
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Teslimat, montaj, randevu, fatura ve operasyonel iş hatırlatıcıları
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtre Segmentleri */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setAjandaFiltre('acik')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  ajandaFiltre === 'acik'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Açık ({acikGorevSayisi})
              </button>
              <button
                onClick={() => setAjandaFiltre('hepsi')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  ajandaFiltre === 'hepsi'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tümü ({gorevler.length})
              </button>
              <button
                onClick={() => setAjandaFiltre('tamamlanan')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  ajandaFiltre === 'tamamlanan'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tamamlanan ({tamamlananSayisi})
              </button>
            </div>

            <button
              onClick={() => onNavigateTab('hatirlaticilar')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <span>Ajandaya Git</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Görev Listesi */}
        <div className="mt-4">
          {filtrelenmisGorevler.length === 0 ? (
            <div className="py-10 text-center text-slate-500 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-700">Bu görünümde ajanda kaydı bulunmuyor</p>
              <p className="text-xs text-slate-400 mt-1">Yeni bir teslimat, montaj veya hatırlatıcı eklemek için Ajanda sekmesine gidebilirsiniz.</p>
              <button
                onClick={() => onNavigateTab('hatirlaticilar')}
                className="mt-3 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Görev / Not Ekle</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtrelenmisGorevler.map((g) => {
                const isGecikmis = g.etiket === 'GEÇİKMİŞ';
                const isBugun = g.etiket === 'BUGÜN';
                const isYaklasan = g.etiket === 'GELECEK 5 GÜN' || g.etiket === 'GELECEK';

                return (
                  <div
                    key={g.id}
                    className={`py-3 px-2 rounded-xl transition flex items-center justify-between gap-3 hover:bg-slate-50/80 group ${
                      g.tamamlandiMi ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Tamamlandı Toggle Butonu */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleTamamlandi) {
                            onToggleTamamlandi(g.id, !g.tamamlandiMi);
                          }
                        }}
                        disabled={!onToggleTamamlandi}
                        className={`transition-colors shrink-0 ${
                          g.tamamlandiMi
                            ? 'text-emerald-600 hover:text-emerald-700'
                            : 'text-slate-300 hover:text-slate-400'
                        }`}
                        title={g.tamamlandiMi ? 'Tamamlanmadı yap' : 'Tamamlandı işaretle'}
                      >
                        {g.tamamlandiMi ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      {/* Başlık ve Detaylar */}
                      <div
                        onClick={() => onNavigateTab('hatirlaticilar')}
                        className="cursor-pointer min-w-0 flex-1"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold truncate ${
                              g.tamamlandiMi
                                ? 'line-through text-slate-400'
                                : 'text-slate-800 group-hover:text-sky-600'
                            }`}
                          >
                            {g.baslik}
                          </span>

                          {/* Etiket Badge */}
                          {isGecikmis && !g.tamamlandiMi && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200">
                              GEÇİKMİŞ
                            </span>
                          )}
                          {isBugun && !g.tamamlandiMi && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                              BUGÜN
                            </span>
                          )}
                          {isYaklasan && !g.tamamlandiMi && (
                            <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-200">
                              YAKLAŞAN
                            </span>
                          )}
                          {g.tamamlandiMi && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              TAMAMLANDI
                            </span>
                          )}

                          {/* Kategori Badge */}
                          {g.kategori && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                              {g.kategori}
                            </span>
                          )}

                          {/* Öncelik */}
                          {g.onemDerecesi && g.onemDerecesi !== 'Normal' && !g.tamamlandiMi && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                g.onemDerecesi === 'Kritik'
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {g.onemDerecesi}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tarih ve Git Butonu */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatTarihTR(g.tarih)}</span>
                      </div>
                      <button
                        onClick={() => onNavigateTab('hatirlaticilar')}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
                        title="Ajandada Aç"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

