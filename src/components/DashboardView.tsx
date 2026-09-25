import React, { useState, useRef } from 'react';
import { OzetIstatistikler, OzetGorevItem } from '../types';
import { DbStatusData } from './DatabaseStatusModal';
import { formatTarihTR } from '../utils/dateUtils';
import { PWAInstallPrompt } from './PWAInstallPrompt';
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
  Plus,
  ShoppingCart
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
  const [ajandaFiltre, setAjandaFiltre] = useState<'hepsi' | 'acik' | 'bugun' | 'gecikmis' | 'tamamlanan'>('hepsi');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [doubleClickHintId, setDoubleClickHintId] = useState<number | null>(null);
  const clickTrackerRef = useRef<{ id: number; time: number } | null>(null);
  const lastToggleRef = useRef<{ id: number; time: number } | null>(null);

  const gorevler: OzetGorevItem[] = ozet?.gorevListesi || [];
  const acikGorevSayisi = gorevler.filter(g => !g.tamamlandiMi).length;
  const tamamlananSayisi = gorevler.filter(g => g.tamamlandiMi).length;
  const gecikmisSayisi = gorevler.filter(g => !g.tamamlandiMi && g.etiket === 'GEÇİKMİŞ').length;
  const bugunSayisi = gorevler.filter(g => !g.tamamlandiMi && g.etiket === 'BUGÜN').length;
  const yaklasanSayisi = gorevler.filter(g => !g.tamamlandiMi && (g.etiket === 'GELECEK 5 GÜN' || g.etiket === 'GELECEK')).length;

  const filtrelenmisGorevler = gorevler.filter(g => {
    if (ajandaFiltre === 'acik') return !g.tamamlandiMi;
    if (ajandaFiltre === 'bugun') return !g.tamamlandiMi && g.etiket === 'BUGÜN';
    if (ajandaFiltre === 'gecikmis') return !g.tamamlandiMi && g.etiket === 'GEÇİKMİŞ';
    if (ajandaFiltre === 'tamamlanan') return g.tamamlandiMi;
    return true; // 'hepsi'
  });

  const executeToggle = async (g: OzetGorevItem) => {
    if (!onToggleTamamlandi || togglingId === g.id) return;
    const now = Date.now();
    // 700ms debounce koruması ile çift tetiklenmeyi engelle
    if (lastToggleRef.current && lastToggleRef.current.id === g.id && now - lastToggleRef.current.time < 700) {
      return;
    }
    lastToggleRef.current = { id: g.id, time: now };
    clickTrackerRef.current = null;
    setDoubleClickHintId(null);
    setTogglingId(g.id);
    try {
      await onToggleTamamlandi(g.id, !g.tamamlandiMi);
    } finally {
      setTimeout(() => setTogglingId(null), 350);
    }
  };

  const handleCircleClick = async (e: React.MouseEvent, g: OzetGorevItem) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onToggleTamamlandi || togglingId === g.id) return;

    const now = Date.now();

    // 1. Tarayıcı yerel çift tıklama sayısı
    if (e.detail === 2) {
      await executeToggle(g);
      return;
    }

    // 2. Çift dokunma/tıklama zamanlama kontrolü (100ms - 500ms arası)
    const prev = clickTrackerRef.current;
    if (prev && prev.id === g.id && now - prev.time >= 100 && now - prev.time <= 500) {
      await executeToggle(g);
      return;
    }

    // 3. Tek tıklama: ASLA TAMAMLAMA! Kesinlikle sadece uyarı gösterilir
    clickTrackerRef.current = { id: g.id, time: now };
    setDoubleClickHintId(g.id);
    setTimeout(() => {
      setDoubleClickHintId(prevId => (prevId === g.id ? null : prevId));
    }, 2200);
  };

  const handleCircleDoubleClick = async (e: React.MouseEvent, g: OzetGorevItem) => {
    e.stopPropagation();
    e.preventDefault();
    await executeToggle(g);
  };
  return (
    <div className="space-y-6 pb-20 md:pb-6">
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

      {/* Ana Metrik Kartları (7 Odaklı Modül) */}
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

        {/* 2. Dış Sipariş & Satınalma */}
        <div 
          onClick={() => onNavigateTab('siparisler')}
          className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Dış Sipariş</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-600">
              {ozet?.bekleyenSiparisSayisi ?? 0}
            </span>
            <span className="text-[10px] text-slate-400">Bekleyen</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">Cam, Ray, Karkas vb.</p>
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">Fabrika Ajandası &amp; Günün Görevleri</h2>
                {acikGorevSayisi > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200">
                    {acikGorevSayisi} Bekleyen
                  </span>
                )}
                {gecikmisSayisi > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 animate-pulse">
                    {gecikmisSayisi} Gecikmiş
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Teslimat, montaj, şantiye randevusu, periyodik araç/makine bakım ve operasyonel işler
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
            {/* Filtre Butonları */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl text-xs font-semibold overflow-x-auto max-w-full gap-1">
              <button
                onClick={() => setAjandaFiltre('hepsi')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  ajandaFiltre === 'hepsi'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tümü ({gorevler.length})
              </button>
              <button
                onClick={() => setAjandaFiltre('acik')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  ajandaFiltre === 'acik'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bekleyenler ({acikGorevSayisi})
              </button>
              <button
                onClick={() => setAjandaFiltre('bugun')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  ajandaFiltre === 'bugun'
                    ? 'bg-sky-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-sky-700'
                }`}
              >
                Bugün ({bugunSayisi})
              </button>
              {gecikmisSayisi > 0 && (
                <button
                  onClick={() => setAjandaFiltre('gecikmis')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    ajandaFiltre === 'gecikmis'
                      ? 'bg-rose-600 text-white shadow-xs font-bold animate-pulse'
                      : 'text-rose-600 hover:text-rose-800'
                  }`}
                >
                  Gecikmiş ({gecikmisSayisi})
                </button>
              )}
              <button
                onClick={() => setAjandaFiltre('tamamlanan')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  ajandaFiltre === 'tamamlanan'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tamamlanan ({tamamlananSayisi})
              </button>
            </div>

            <button
              onClick={() => onNavigateTab('hatirlaticilar')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition shrink-0"
            >
              <span>Ajandaya Git</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Görev Kartları Listesi */}
        <div className="mt-5">
          {filtrelenmisGorevler.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Bu filtrede ajanda kaydı bulunamadı</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Yeni bir teslimat, montaj görevi veya hatırlatıcı eklemek için Ajanda sekmesine gidebilirsiniz.
              </p>
              <button
                onClick={() => onNavigateTab('hatirlaticilar')}
                className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Görev / Hatırlatıcı Ekle</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtrelenmisGorevler.map((g) => {
                const isGecikmis = g.etiket === 'GEÇİKMİŞ';
                const isBugun = g.etiket === 'BUGÜN';
                const isYaklasan = g.etiket === 'GELECEK 5 GÜN' || g.etiket === 'GELECEK';

                // Kart Renk Teması
                let cardStyle = 'bg-white border-slate-200/90 hover:border-slate-300';
                let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                let statusLabel = 'Planlandı';

                if (g.tamamlandiMi) {
                  cardStyle = 'bg-emerald-50/40 border-emerald-200/90 text-slate-700 hover:border-emerald-300';
                  badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                  statusLabel = 'Tamamlandı';
                } else if (isGecikmis) {
                  cardStyle = 'bg-gradient-to-r from-rose-50/90 via-rose-50/40 to-white border-rose-200 hover:border-rose-300 shadow-xs';
                  badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold';
                  statusLabel = 'GEÇİKMİŞ';
                } else if (isBugun) {
                  cardStyle = 'bg-gradient-to-r from-sky-50/95 via-sky-50/50 to-white border-sky-300 hover:border-sky-400 shadow-xs ring-1 ring-sky-200/80';
                  badgeStyle = 'bg-sky-100 text-sky-900 border-sky-300 font-extrabold';
                  statusLabel = 'BUGÜN';
                } else if (isYaklasan) {
                  cardStyle = 'bg-gradient-to-r from-amber-50/70 via-amber-50/30 to-white border-amber-200 hover:border-amber-300 shadow-xs';
                  badgeStyle = 'bg-amber-100 text-amber-800 border-amber-200 font-bold';
                  statusLabel = 'YAKLAŞAN';
                }

                return (
                  <div
                    key={g.id}
                    className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 hover:shadow-md flex items-start justify-between gap-3 group ${cardStyle}`}
                  >
                    {/* Sol: Checkbox & İçerik */}
                    <div className="flex items-start gap-3 min-w-0 flex-1 relative">
                      {/* Tamamlandı Toggle Butonu - Çift Tıklamalı */}
                      <div className="relative shrink-0 flex flex-col items-center">
                        <button
                          type="button"
                          onClick={(e) => handleCircleClick(e, g)}
                          onDoubleClick={(e) => handleCircleDoubleClick(e, g)}
                          disabled={!onToggleTamamlandi || togglingId === g.id}
                          className={`mt-0.5 transition-all shrink-0 p-1.5 rounded-full hover:scale-110 active:scale-95 cursor-pointer ${
                            g.tamamlandiMi
                              ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-50'
                              : isGecikmis
                              ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                              : isBugun
                              ? 'text-sky-600 hover:text-sky-800 hover:bg-sky-50'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          } ${togglingId === g.id ? 'opacity-50 pointer-events-none' : ''}`}
                          title="Tamamlamak veya açmak için ÇİFT TIKLAYIN"
                        >
                          {g.tamamlandiMi ? (
                            <CheckCircle2 className="w-5 h-5 fill-emerald-100" />
                          ) : (
                            <Circle className="w-5 h-5 stroke-[2.2]" />
                          )}
                        </button>

                        {/* Çift Tıklama Uyarı Rozeti */}
                        {doubleClickHintId === g.id && (
                          <div className="absolute top-9 left-0 z-30 whitespace-nowrap bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xl border border-slate-700 animate-bounce flex items-center gap-1.5 pointer-events-none">
                            <span>👆</span>
                            <span>{g.tamamlandiMi ? 'Açmak için ÇİFT TIKLAYIN' : 'Tamamlamak için ÇİFT TIKLAYIN'}</span>
                          </div>
                        )}
                      </div>

                      {/* Başlık ve Üst Rozetler */}
                      <div
                        onClick={() => onNavigateTab('hatirlaticilar')}
                        className="cursor-pointer min-w-0 flex-1"
                      >
                        {/* 1. Satır: Rozetler ve Tarih */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                          {/* Durum Rozeti */}
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeStyle}`}>
                            {statusLabel}
                          </span>

                          {/* Kategori Rozeti */}
                          {g.kategori && (
                            <span className="px-2 py-0.5 rounded-md bg-white/90 text-slate-700 text-[10px] font-semibold border border-slate-200 shadow-2xs">
                              {g.kategori}
                            </span>
                          )}

                          {/* Öncelik */}
                          {g.onemDerecesi && g.onemDerecesi !== 'Normal' && !g.tamamlandiMi && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                g.onemDerecesi === 'Kritik'
                                  ? 'bg-rose-600 text-white border-rose-700 shadow-2xs animate-pulse'
                                  : 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                              }`}
                            >
                              {g.onemDerecesi} Öncelik
                            </span>
                          )}

                          {/* Tarih Rozeti */}
                          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 bg-white/70 px-2 py-0.5 rounded-md border border-slate-200/60 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatTarihTR(g.tarih)}</span>
                          </span>
                        </div>

                        {/* 2. Satır: Görev Başlığı */}
                        <h3
                          className={`text-sm sm:text-base font-bold leading-snug break-words transition-colors ${
                            g.tamamlandiMi
                              ? 'line-through text-slate-400 font-medium'
                              : 'text-slate-900 group-hover:text-sky-700'
                          }`}
                        >
                          {g.baslik || '(İsimsiz Görev / Hatırlatıcı)'}
                        </h3>
                      </div>
                    </div>

                    {/* Sağ: Detaya Git Butonu */}
                    <button
                      onClick={() => onNavigateTab('hatirlaticilar')}
                      className="mt-1 p-2 rounded-xl bg-white/80 hover:bg-white text-slate-400 hover:text-sky-700 border border-slate-200/80 hover:border-sky-300 shadow-2xs transition shrink-0 group-hover:translate-x-0.5"
                      title="Ajandada Aç ve Düzenle"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
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

