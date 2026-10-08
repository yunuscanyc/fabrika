import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Cog, 
  FolderGit2, 
  Truck, 
  Bell, 
  ShoppingCart, 
  BookOpen, 
  ShieldCheck,
  MoreHorizontal,
  X,
  ChevronRight,
  Check
} from 'lucide-react';
import { TabType } from './Navbar';

interface BadgeCounts {
  bakim?: number;
  araclar?: number;
  hatirlatici?: number;
  siparis?: number;
  ceride?: number;
  personel?: number;
  makineler?: number;
  projeler?: number;
  ruhsatlar?: number;
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
  const [digerMenuAcik, setDigerMenuAcik] = useState(false);

  // Az kullanılan veya ikincil modüller ("Diğer" listesi)
  const digerModuller = [
    {
      id: 'ruhsatlar' as TabType,
      label: 'Ruhsatlar & İzinler',
      sublabel: 'Ruhsat takibi, muayene ve çevre izinleri',
      icon: ShieldCheck,
      badge: badgeCounts.ruhsatlar,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    },
    {
      id: 'personel' as TabType,
      label: 'Personel & İK',
      sublabel: 'Çalışan kayıtları, puantaj ve izinler',
      icon: Users,
      badge: badgeCounts.personel,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
    },
    {
      id: 'projeler' as TabType,
      label: 'Projeler & Şantiyeler',
      sublabel: 'İş aşamaları ve şantiye takibi',
      icon: FolderGit2,
      badge: badgeCounts.projeler,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      id: 'makineler' as TabType,
      label: 'Makineler & Ekipman',
      sublabel: 'Makine parkuru ve periyodik bakımlar',
      icon: Cog,
      badge: badgeCounts.makineler,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
    },
    {
      id: 'araclar' as TabType,
      label: 'Araçlar & Filo',
      sublabel: 'Sevkiyat araçları ve araç bakımları',
      icon: Truck,
      badge: (badgeCounts.araclar || 0) + (badgeCounts.bakim || 0),
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/20'
    }
  ];

  const digerToplamBadge = digerModuller.reduce((sum, m) => sum + (m.badge || 0), 0);
  const isDigerActive = digerModuller.some(m => m.id === activeTab);
  const activeDigerModule = digerModuller.find(m => m.id === activeTab);

  if (userRole === 'ustabasi') {
    return (
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-3 py-1.5 shadow-2xl safe-area-bottom"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.35rem)'
        }}
      >
        <div className="grid grid-cols-3 gap-1.5 text-center max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('siparisler')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all text-xs font-bold ${
              activeTab === 'siparisler'
                ? 'text-white bg-amber-600 shadow-md ring-1 ring-amber-400/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700/50'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Sipariş</span>
            {Boolean(badgeCounts.siparis && badgeCounts.siparis > 0) && (
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 text-[8px] font-black flex items-center justify-center">
                {badgeCounts.siparis}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ceride')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all text-xs font-bold ${
              activeTab === 'ceride'
                ? 'text-white bg-amber-600 shadow-md ring-1 ring-amber-400/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Ceride</span>
            {Boolean(badgeCounts.ceride && badgeCounts.ceride > 0) && (
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center animate-pulse">
                {badgeCounts.ceride}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('hatirlaticilar');
              onMarkAllAjandaRead?.();
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all text-xs font-bold ${
              activeTab === 'hatirlaticilar'
                ? 'text-white bg-amber-600 shadow-md ring-1 ring-amber-400/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700/50'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Ajanda</span>
            {Boolean((badgeCounts.ajandaBildirim || badgeCounts.hatirlatici) && ((badgeCounts.ajandaBildirim || 0) + (badgeCounts.hatirlatici || 0) > 0)) && (
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center animate-pulse">
                {(badgeCounts.ajandaBildirim || 0) + (badgeCounts.hatirlatici || 0)}
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Diğer Menüsü Açıldığında Arka Plan Karartma */}
      {digerMenuAcik && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={() => setDigerMenuAcik(false)}
        />
      )}

      {/* Diğer Modüller Açılır Popover Liste Menüsü */}
      {digerMenuAcik && (
        <div 
          className="fixed bottom-[64px] right-2 left-2 z-50 max-w-sm ml-auto bg-slate-900/98 border border-slate-700/80 rounded-2xl shadow-2xl p-3 md:hidden animate-in slide-in-from-bottom-3 duration-200"
          style={{
            marginBottom: 'max(env(safe-area-inset-bottom, 0px), 0.25rem)'
          }}
        >
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
                <MoreHorizontal className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-white">Diğer Modüller</h4>
                <p className="text-[10px] text-slate-400">Geçiş yapmak istediğiniz modülü seçin</p>
              </div>
            </div>
            <button
              onClick={() => setDigerMenuAcik(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            {digerModuller.map((modul) => {
              const Icon = modul.icon;
              const isSelected = activeTab === modul.id;

              return (
                <button
                  key={modul.id}
                  onClick={() => {
                    setActiveTab(modul.id);
                    setDigerMenuAcik(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left ${
                    isSelected
                      ? 'bg-amber-500/15 text-white border border-amber-500/40 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${modul.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                          {modul.label}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {modul.sublabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pl-2 shrink-0">
                    {Boolean(modul.badge && modul.badge > 0) && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black animate-pulse">
                        {modul.badge}
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tek Sıra Sabit Mobil Alt Bar (5 Buton: Panel, Sipariş, Ceride, Ajanda, Diğer) */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-1.5 py-1 shadow-2xl safe-area-bottom"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.25rem)'
        }}
      >
        <div className="grid grid-cols-5 gap-1 text-center max-w-lg mx-auto">
          {/* 1. Panel */}
          <button
            onClick={() => {
              setDigerMenuAcik(false);
              setActiveTab('dashboard');
            }}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
              activeTab === 'dashboard'
                ? 'text-blue-400 font-bold bg-blue-950/60 ring-1 ring-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] tracking-tight">Panel</span>
          </button>

          {/* 2. Sipariş */}
          <button
            onClick={() => {
              setDigerMenuAcik(false);
              setActiveTab('siparisler');
            }}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
              activeTab === 'siparisler'
                ? 'text-blue-400 font-bold bg-blue-950/60 ring-1 ring-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] tracking-tight">Sipariş</span>
            {Boolean(badgeCounts.siparis && badgeCounts.siparis > 0) && (
              <span className="absolute top-0.5 right-2 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center animate-bounce">
                {badgeCounts.siparis}
              </span>
            )}
          </button>

          {/* 3. Ceride */}
          <button
            onClick={() => {
              setDigerMenuAcik(false);
              setActiveTab('ceride');
            }}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
              activeTab === 'ceride'
                ? 'text-amber-400 font-bold bg-amber-950/60 ring-1 ring-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] tracking-tight">Ceride</span>
            {Boolean(badgeCounts.ceride && badgeCounts.ceride > 0) && (
              <span className="absolute top-0.5 right-2 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center animate-pulse">
                {badgeCounts.ceride}
              </span>
            )}
          </button>

          {/* 4. Ajanda */}
          <button
            onClick={() => {
              setDigerMenuAcik(false);
              setActiveTab('hatirlaticilar');
              onMarkAllAjandaRead?.();
            }}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
              activeTab === 'hatirlaticilar'
                ? 'text-blue-400 font-bold bg-blue-950/60 ring-1 ring-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] tracking-tight">Ajanda</span>
            {Boolean(badgeCounts.ajandaBildirim && badgeCounts.ajandaBildirim > 0) ? (
              <span className="absolute top-0.5 right-2 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center animate-pulse shadow-sm">
                {badgeCounts.ajandaBildirim}
              </span>
            ) : Boolean(badgeCounts.hatirlatici && badgeCounts.hatirlatici > 0) ? (
              <span className="absolute top-0.5 right-2 w-3.5 h-3.5 rounded-full bg-sky-500 text-white text-[8px] font-bold flex items-center justify-center">
                {badgeCounts.hatirlatici}
              </span>
            ) : null}
          </button>

          {/* 5. Diğer (En Sağda, tıklandığında altındaki modül listesini açar) */}
          <button
            onClick={() => setDigerMenuAcik(prev => !prev)}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
              digerMenuAcik
                ? 'text-amber-300 font-bold bg-amber-500/20 ring-1 ring-amber-400/40'
                : isDigerActive
                ? 'text-amber-400 font-bold bg-amber-950/60 ring-1 ring-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MoreHorizontal className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] tracking-tight">
              {isDigerActive && activeDigerModule ? (activeDigerModule.id === 'ruhsatlar' ? 'Ruhsat' : activeDigerModule.id === 'personel' ? 'İK' : activeDigerModule.id === 'projeler' ? 'Proje' : activeDigerModule.id === 'makineler' ? 'Makine' : 'Araç') : 'Diğer'}
            </span>
            {Boolean(digerToplamBadge > 0) && (
              <span className="absolute top-0.5 right-2 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] font-bold flex items-center justify-center animate-pulse">
                {digerToplamBadge}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

