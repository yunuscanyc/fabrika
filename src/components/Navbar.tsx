import React from 'react';
import { Factory, Lock, Shield, LogOut } from 'lucide-react';
import { DbStatusData } from './DatabaseStatusModal';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export type TabType = 'dashboard' | 'personel' | 'makineler' | 'projeler' | 'araclar' | 'hatirlaticilar' | 'siparisler';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenServerGuide?: () => void;
  dbStatus?: DbStatusData | null;
  onOpenDbModal?: () => void;
  onLock?: () => void;
  onOpenSecuritySettings?: () => void;
  onLogout?: () => void;
  userRole?: 'admin' | 'ustabasi';
  unreadOrdersCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenServerGuide,
  dbStatus,
  onOpenDbModal,
  onLock,
  onOpenSecuritySettings,
  onLogout,
  userRole = 'admin',
  unreadOrdersCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md">
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
                  {userRole === 'ustabasi' ? '🔨 Ustabaşı Girişi' : 'Web & Mobil'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                {userRole === 'ustabasi' ? 'Özel Mobilya Dış Malzeme Talep Portalı' : 'Fabrika Üretim & Ekipman Yönetim Portalı'}
              </p>
            </div>
          </div>

          {/* Masaüstü Navigasyon Sekmeleri */}
          {userRole === 'ustabasi' ? (
            <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
              <button
                onClick={() => setActiveTab('siparisler')}
                className="px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-amber-600 text-white shadow-sm flex items-center gap-1.5"
              >
                📦 Malzeme Sipariş Masası
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
                <span>📦 Sipariş &amp; Satınalma</span>
                {unreadOrdersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-bounce shadow">
                    {unreadOrdersCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('personel')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'personel'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                👥 Personel &amp; İK
              </button>
              <button
                onClick={() => setActiveTab('makineler')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'makineler'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                🪚 Makineler
              </button>
              <button
                onClick={() => setActiveTab('projeler')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'projeler'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                🌿 Proje &amp; Ağaç
              </button>
              <button
                onClick={() => setActiveTab('araclar')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'araclar'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                🚛 Araç &amp; Bakım
              </button>
              <button
                onClick={() => setActiveTab('hatirlaticilar')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'hatirlaticilar'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                🔔 Ajanda
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
                className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                title="Güvenlik &amp; Parola Ayarları"
              >
                <Shield className="w-4 h-4 text-blue-400" />
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
