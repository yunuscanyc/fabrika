import React from 'react';
import { LayoutDashboard, Users, Cog, FolderGit2, Truck, Bell, ShoppingCart, BookOpen } from 'lucide-react';
import { TabType } from './Navbar';

interface BadgeCounts {
  bakim?: number;
  hatirlatici?: number;
  siparis?: number;
  ajandaBildirim?: number;
}

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  badgeCounts?: BadgeCounts;
  userRole?: 'admin' | 'ustabasi';
  onMarkAllAjandaRead?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  badgeCounts = {} as BadgeCounts,
  userRole = 'admin',
  onMarkAllAjandaRead
}) => {
  if (userRole === 'ustabasi') {
    return (
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-3 py-1.5 shadow-2xl safe-area-bottom"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.35rem)'
        }}
      >
        <div className="grid grid-cols-2 gap-2 text-center max-w-sm mx-auto">
          <button
            onClick={() => setActiveTab('siparisler')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-xs font-bold ${
              activeTab === 'siparisler'
                ? 'text-white bg-amber-600 shadow-md ring-1 ring-amber-400/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700/50'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Malzeme Sipariş</span>
            {Boolean(badgeCounts.siparis && badgeCounts.siparis > 0) && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black flex items-center justify-center">
                {badgeCounts.siparis}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ceride')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-xs font-bold ${
              activeTab === 'ceride'
                ? 'text-white bg-amber-600 shadow-md ring-1 ring-amber-400/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700/50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Şantiye Ceridesi</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-1 py-1 shadow-2xl safe-area-bottom"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.25rem)'
      }}
    >
      <div className="grid grid-cols-8 gap-0.5 text-center">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
            activeTab === 'dashboard'
              ? 'text-blue-400 font-bold bg-blue-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] tracking-tight">Panel</span>
        </button>

        <button
          onClick={() => setActiveTab('siparisler')}
          className={`relative flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
            activeTab === 'siparisler'
              ? 'text-blue-400 font-bold bg-blue-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] tracking-tight">Sipariş</span>
          {Boolean(badgeCounts.siparis && badgeCounts.siparis > 0) && (
            <span className="absolute top-0.5 right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center animate-bounce">
              {badgeCounts.siparis}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('personel')}
          className={`flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
            activeTab === 'personel'
              ? 'text-blue-400 font-bold bg-blue-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] tracking-tight">İK</span>
        </button>

        <button
          onClick={() => setActiveTab('ceride')}
          className={`flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
            activeTab === 'ceride'
              ? 'text-amber-400 font-bold bg-amber-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] tracking-tight">Ceride</span>
        </button>

        <button
          onClick={() => setActiveTab('makineler')}
          className={`flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
            activeTab === 'makineler'
              ? 'text-blue-400 font-bold bg-blue-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cog className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] tracking-tight">Makine</span>
        </button>

        <button
          onClick={() => setActiveTab('projeler')}
          className={`flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
            activeTab === 'projeler'
              ? 'text-blue-400 font-bold bg-blue-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderGit2 className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] tracking-tight">Proje</span>
        </button>

        <button
          onClick={() => setActiveTab('araclar')}
          className={`relative flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
            activeTab === 'araclar'
              ? 'text-blue-400 font-bold bg-blue-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] tracking-tight">Araç</span>
          {Boolean(badgeCounts.bakim && badgeCounts.bakim > 0) && (
            <span className="absolute top-0.5 right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] font-bold flex items-center justify-center">
              {badgeCounts.bakim}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('hatirlaticilar');
            onMarkAllAjandaRead?.();
          }}
          className={`relative flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
            activeTab === 'hatirlaticilar'
              ? 'text-blue-400 font-bold bg-blue-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] tracking-tight">Ajanda</span>
          {Boolean(badgeCounts.ajandaBildirim && badgeCounts.ajandaBildirim > 0) ? (
            <span className="absolute top-0.5 right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center animate-pulse shadow-sm">
              {badgeCounts.ajandaBildirim}
            </span>
          ) : Boolean(badgeCounts.hatirlatici && badgeCounts.hatirlatici > 0) ? (
            <span className="absolute top-0.5 right-1 w-3.5 h-3.5 rounded-full bg-sky-500 text-white text-[8px] font-bold flex items-center justify-center">
              {badgeCounts.hatirlatici}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
};
