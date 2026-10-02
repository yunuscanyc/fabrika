import React from 'react';
import { Factory, Lock, Shield, LogOut, BellRing, Database } from 'lucide-react';
import { DbStatusData } from './DatabaseStatusModal';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export type TabType = 'dashboard' | 'personel' | 'ceride' | 'makineler' | 'projeler' | 'araclar' | 'hatirlaticilar' | 'siparisler';

export interface UnreadBadgeCounts {
  siparisler: number;
  ceride: number;
  personel: number;
  projeler: number;
  araclar: number;
  makineler: number;
  hatirlaticilar: number;
}

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenServerGuide?: () => void;
  dbStatus?: DbStatusData | null;
  onOpenDbModal?: () => void;
  onLock?: () => void;
  onOpenSecuritySettings?: () => void;
  onOpenNotificationSettings?: () => void;
  onLogout?: () => void;
  userRole?: 'admin' | 'ustabasi';
  unreadOrdersCount?: number;
  unreadAjandaCount?: number;
  unreadBadgeCounts?: UnreadBadgeCounts;
  currentUserName?: string;
  onMarkAllAjandaRead?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenServerGuide,
  dbStatus,
  onOpenDbModal,
  onLock,
  onOpenSecuritySettings,
  onOpenNotificationSettings,
  onLogout,
  userRole = 'admin',
  unreadOrdersCount = 0,
  unreadAjandaCount = 0,
  unreadBadgeCounts,
  currentUserName = '',
  onMarkAllAjandaRead,
}) => {
  const counts = unreadBadgeCounts || {
    siparisler: unreadOrdersCount,
    ceride: 0,
    personel: 0,
    projeler: 0,
    araclar: 0,
    makineler: 0,
    hatirlaticilar: unreadAjandaCount
  };

  return (
    <header 
      className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md transition-all ios-pwa-header safe-top"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Başlık */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-lg ${
              userRole === 'ustabasi' ? 'bg-amber-600 shadow-amber-600/30' : 'bg-blue-600 shadow-blue-600/30'
            }`}>
              <Factory className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">RENDE</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                  userRole === 'ustabasi'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                }`}>
                  {userRole === 'ustabasi' ? '🔨 Ustabaşı Girişi' : (currentUserName ? `👤 ${currentUserName}` : 'Web & Mobil')}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                {userRole === 'ustabasi' ? 'Özel Mobilya Dış Malzeme Talep Portalı' : 'Fabrika Üretim & Ekipman Yönetim Portalı'}
              </p>
            </div>
          </div>

          {/* Masaüstü Navigasyon Sekmeleri */}
          {userRole === 'ustabasi' ? (
            <nav className="hidden md:flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
              <button
                onClick={() => setActiveTab('siparisler')}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'siparisler'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>📦 Malzeme Siparişleri</span>
                {counts.siparisler > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
                    {counts.siparisler}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('ceride')}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'ceride'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title="Şantiye & İşletme Ceridesi (Günlük Olay Defteri)"
              >
                <span>📜 Şantiye Ceridesi</span>
                {counts.ceride > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
                    {counts.ceride}
                  </span>
                )}
              </button>
            </nav>
          ) : (
            <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                📊 Özet Panel
              </button>

              <button
                onClick={() => setActiveTab('siparisler')}
                className={`relative px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'siparisler'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>📦 Sipariş</span>
                {counts.siparisler > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-bounce shadow">
                    {counts.siparisler}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('personel')}
                className={`relative px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'personel'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>👥 Personel &amp; İK</span>
                {counts.personel > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse shadow-md ring-2 ring-slate-900">
                    {counts.personel}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('ceride')}
                className={`relative px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'ceride'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title="Şantiye & İşletme Ceridesi (Günlük Olay Defteri)"
              >
                <span>📜 Ceride</span>
                {counts.ceride > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse shadow-md ring-2 ring-slate-900">
                    {counts.ceride}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('makineler')}
                className={`relative px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'makineler'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>🪚 Makineler</span>
                {counts.makineler > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse shadow-md ring-2 ring-slate-900">
                    {counts.makineler}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('projeler')}
                className={`relative px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'projeler'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>🌿 Proje</span>
                {counts.projeler > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse shadow-md ring-2 ring-slate-900">
                    {counts.projeler}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('araclar')}
                className={`relative px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'araclar'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>🚛 Araç</span>
                {counts.araclar > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse shadow-md ring-2 ring-slate-900">
                    {counts.araclar}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab('hatirlaticilar');
                  onMarkAllAjandaRead?.();
                }}
                className={`relative px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'hatirlaticilar'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>🔔 Ajanda</span>
                {counts.hatirlaticilar > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse shadow-md ring-2 ring-slate-900">
                    {counts.hatirlaticilar}
                  </span>
                )}
              </button>
            </nav>
          )}

          {/* Sağ Alan: Yükle Butonu, Güvenlik, Kilit ve Çıkış Kontrolleri */}
          <div className="flex items-center gap-1.5">
            <PWAInstallPrompt />

            {onLock && (
              <button
                type="button"
                onClick={onLock}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/90 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/30 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                title="Ekranı Kilitle (Masadan Ayrılıyorum)"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline">Kilitle</span>
              </button>
            )}

            {userRole === 'admin' && onOpenSecuritySettings && (
              <button
                type="button"
                onClick={onOpenSecuritySettings}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/90 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-700 hover:border-blue-500/40 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Sistem Ayarları (Güvenlik, PIN, Bildirim Tercihleri & Veritabanı Yedekleme)"
              >
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline text-[11px] font-bold text-slate-200">Sistem &amp; Güvenlik</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 bg-slate-800/90 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                title="Oturumu Kapat (Çıkış)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
