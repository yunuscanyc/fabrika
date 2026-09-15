import React from 'react';
import { OzetIstatistikler } from '../types';
import { formatTarihTR } from '../utils/dateUtils';
import { DbStatusData } from './DatabaseStatusModal';
import { 
  FolderGit2, 
  Truck, 
  Wrench, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  Users,
  Cog,
  FileText,
  ShieldCheck,
  Database
} from 'lucide-react';

interface DashboardViewProps {
  ozet: OzetIstatistikler | null;
  onNavigateTab: (tab: string, subTab?: 'liste' | 'izin' | 'puantaj' | 'isg' | 'yevmiyeci', personelId?: number, isgSekme?: 'kkd' | 'saglik' | 'egitim') => void;
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

      {/* 6 Ana Metrik Kartı (Masaüstü WPF Özeti) */}
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

        {/* 5. Bakım Uyarıları (Araç + Makine) */}
        <div 
          onClick={() => onNavigateTab('araclar')}
          className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-amber-50/40 to-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900">Bakım Uyarısı</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-600">
              {(ozet?.bakimBekleyenArac ?? 0) + (ozet?.bakimBekleyenMakine ?? 0)}
            </span>
            <span className="text-[10px] text-amber-800 font-semibold">Acil / Yakın</span>
          </div>
          <p className="text-[10px] text-amber-700 mt-0.5 truncate">Periyot Sayacı Dolan</p>
        </div>

        {/* 6. Bugün Biten Ajanda Görevleri */}
        <div 
          onClick={() => onNavigateTab('hatirlaticilar')}
          className="bg-white rounded-xl p-4 border border-sky-200 shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-sky-50/40 to-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-900">Günün Görevi</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm shadow-sky-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-sky-900">{ozet?.bugunBitenGorevler ?? 0}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold border border-sky-200">
              Bugün
            </span>
          </div>
          <p className="text-[10px] text-sky-700 mt-0.5 truncate">Acil Teslimat &amp; Randevu</p>
        </div>
      </div>

      {/* 6331 İSG Sağlık Raporu & Eğitim Uyarıları Paneli */}
      {ozet?.isgUyarilari && ozet.isgUyarilari.length > 0 && (
        <div className="bg-slate-900 border border-rose-900/60 rounded-2xl p-5 shadow-xl text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <span>6331 İSG Sağlık Raporu &amp; Eğitim Uyarıları</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
                    {ozet.isgUyarilari.length} Kritik Durum
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Eksik veya süresi dolan periyodik sağlık raporları ve İSG sertifikaları
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('personel', 'isg')}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-md flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <span>İSG Paneline Git</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ozet.isgUyarilari.map((u) => (
              <div
                key={u.id}
                onClick={() => onNavigateTab('personel', 'isg', u.personelId, u.tur.startsWith('saglik') ? 'saglik' : 'egitim')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  u.durum === 'Kritik'
                    ? 'bg-rose-950/50 border-rose-800/80 hover:bg-rose-900/60 text-rose-100'
                    : 'bg-amber-950/40 border-amber-800/60 hover:bg-amber-900/50 text-amber-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{u.personelAdSoyad}</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                      u.durum === 'Kritik'
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {u.tur === 'saglik_eksik' ? 'Rapor Eksik' : u.durum === 'Kritik' ? 'Süresi Doldu' : 'Yaklaştı'}
                  </span>
                </div>
                <div className="mt-2 text-xs font-medium leading-relaxed opacity-90">
                  {u.mesaj}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* İki Sütun: Sol Canlı Bakım Uyarıları | Sağ Ajanda & Hızlı İşlemler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Canlı Bakım Uyarıları (WPF'teki Ana Ekran Özeti) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                  Acil ve Yaklaşan Bakım Uyarıları
                </h2>
                <p className="text-[11px] text-slate-500">Periyodik bakım sayacı gelen araç ve fabrika makineleri</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('makineler')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Makineler
              </button>
              <span>•</span>
              <button
                onClick={() => onNavigateTab('araclar')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Araçlar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {ozet?.bakimUyarilari && ozet.bakimUyarilari.length > 0 ? (
              ozet.bakimUyarilari.map((u) => (
                <div
                  key={u.id}
                  onClick={() => onNavigateTab('araclar')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    u.durum === 'Gecikmis'
                      ? 'bg-red-50/70 border-red-200 text-red-900 hover:bg-red-100/70'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                        u.durum === 'Gecikmis'
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {u.birim === 'saat' ? 'SAAT' : 'KM'}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">{u.ad}</div>
                      <div className="text-xs text-slate-600 font-medium">{u.mesaj}</div>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap ${
                      u.durum === 'Gecikmis'
                        ? 'bg-red-200 text-red-800'
                        : 'bg-amber-200 text-amber-800'
                    }`}
                  >
                    {u.durum === 'Gecikmis' ? 'Gecikti!' : 'Yaklaştı'}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Tüm araç ve makinelerin bakımları güncel</p>
                <p className="text-xs text-slate-400 mt-0.5">Şu an acil bakım bekleyen ekipman bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>

        {/* Hatırlatıcılar & Görev Takibi */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                    Günün &amp; Geçmişin Görev / Hatırlatıcıları
                  </h2>
                  <p className="text-[11px] text-slate-500">Bugün, son 5 gün ve geçmiş açık ajanda kayıtları</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('hatirlaticilar')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Ajandaya Git</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {ozet?.gorevListesi && ozet.gorevListesi.length > 0 ? (
                ozet.gorevListesi.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => onNavigateTab('hatirlaticilar')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      g.etiket === 'GEÇİKMİŞ'
                        ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70'
                        : g.etiket === 'BUGÜN'
                        ? 'bg-sky-50/80 border-sky-300 hover:bg-sky-100/70'
                        : g.etiket === 'GELECEK 5 GÜN'
                        ? 'bg-indigo-50/80 border-indigo-200 hover:bg-indigo-100/70'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          g.etiket === 'GEÇİKMİŞ'
                            ? 'bg-rose-500 animate-pulse'
                            : g.etiket === 'BUGÜN'
                            ? 'bg-sky-500 animate-pulse'
                            : g.etiket === 'GELECEK 5 GÜN'
                            ? 'bg-indigo-500'
                            : 'bg-slate-400'
                        }`}
                      ></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              g.etiket === 'GEÇİKMİŞ'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : g.etiket === 'BUGÜN'
                                ? 'bg-sky-200 text-sky-900 border-sky-300'
                                : g.etiket === 'GELECEK 5 GÜN'
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                : 'bg-slate-200 text-slate-800 border-slate-300'
                            }`}
                          >
                            {g.etiket}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">{formatTarihTR(g.tarih)}</span>
                          {g.kategori && (
                            <span className="text-[10px] bg-white/80 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                              {g.kategori}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-sm text-slate-900 truncate mt-1">{g.baslik}</div>
                      </div>
                    </div>
                    {g.tamamlandiMi ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 whitespace-nowrap">
                        Tamamlandı
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          g.etiket === 'GEÇİKMİŞ'
                            ? 'bg-rose-200 text-rose-900'
                            : g.etiket === 'BUGÜN'
                            ? 'bg-sky-200 text-sky-900'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {g.etiket === 'GEÇİKMİŞ' ? 'Acil Bekliyor' : 'Açık Görev'}
                      </span>
                    )}
                  </div>
                ))
              ) : ozet?.bugunGorevListesi && ozet.bugunGorevListesi.length > 0 ? (
                ozet.bugunGorevListesi.map((title, idx) => (
                  <div
                    key={idx}
                    onClick={() => onNavigateTab('hatirlaticilar')}
                    className="p-3.5 rounded-xl border border-sky-300 bg-sky-50/80 hover:bg-sky-100/70 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse mt-1.5 shrink-0"></div>
                      <div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-200 text-sky-900 mr-2 inline-block">
                          BUGÜN
                        </span>
                        <span className="font-bold text-sm text-slate-900">{title}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Açık görev veya hatırlatıcı yok</p>
                  <p className="text-xs text-slate-400 mt-0.5">Bugün, son 5 gün ve geçmiş için kayıt bulunmuyor.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Sistem: PostgreSQL Senkronize</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Çevrimiçi
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
