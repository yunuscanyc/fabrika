import React from 'react';
import { LayoutDashboard, Users, Cog, FolderGit2, Truck, Bell, ShoppingCart } from 'lucide-react';
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
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  badgeCounts = {} as BadgeCounts,
  userRole = 'admin'
}) => {
  if (userRole === 'ustabasi') {
    return null; // Ustabaşı için tek modül olduğundan alt bar karmaşasına gerek yok
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-1 py-1 shadow-2xl safe-area-bottom">
      <div className="grid grid-cols-7 gap-0.5 text-center">
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
          onClick={() => setActiveTab('hatirlaticilar')}
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
