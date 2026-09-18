import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Bell, ArrowRight, X, Sparkles } from 'lucide-react';
import { MalzemeSiparisi } from '../types';

interface UstabasiSiparisBildirimProps {
  userRole?: 'admin' | 'ustabasi';
  onNavigateToSiparisler: () => void;
  onNewOrderDetected?: () => void;
}

export const UstabasiSiparisBildirim: React.FC<UstabasiSiparisBildirimProps> = ({
  userRole = 'admin',
  onNavigateToSiparisler,
  onNewOrderDetected
}) => {
  const [latestOrder, setLatestOrder] = useState<MalzemeSiparisi | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const lastKnownIdRef = useRef<number>(0);
  const isFirstLoadRef = useRef<boolean>(true);

  // Web Audio Bildirim Sesi (Harici ses dosyası gerekmez)
  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio context policy
    }
  };

  useEffect(() => {
    if (userRole !== 'admin') return;

    const checkNewOrders = async () => {
      try {
        const res = await fetch('/api/siparisler');
        if (!res.ok) return;
        const orders: MalzemeSiparisi[] = await res.json();
        if (!orders || orders.length === 0) return;

        const maxId = Math.max(...orders.map(o => o.Id || 0));

        if (isFirstLoadRef.current) {
          lastKnownIdRef.current = maxId;
          isFirstLoadRef.current = false;
          return;
        }

        if (maxId > lastKnownIdRef.current) {
          const newest = orders.find(o => o.Id === maxId);
          lastKnownIdRef.current = maxId;

          if (newest) {
            setLatestOrder(newest);
            setShowNotification(true);
            playChime();
            if (onNewOrderDetected) onNewOrderDetected();
          }
        }
      } catch (err) {
        // Sessiz hata
      }
    };

    const interval = setInterval(checkNewOrders, 8000);
    return () => clearInterval(interval);
  }, [userRole, onNewOrderDetected]);

  if (!showNotification || !latestOrder || userRole !== 'admin') return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-md w-full bg-slate-900 text-white rounded-2xl shadow-2xl border-2 border-amber-400 p-4 animate-bounce-short">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
          <Bell className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ustabaşı Yeni Sipariş Girdi!</span>
          </div>
          <h4 className="font-extrabold text-sm text-white truncate mt-0.5">
            {latestOrder.MalzemeAdi} ({latestOrder.Miktar} {latestOrder.Birim})
          </h4>
          <p className="text-xs text-slate-300 truncate">
            Proje: <strong className="text-white">{latestOrder.ProjeAdi}</strong> • {latestOrder.TalepEden}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                setShowNotification(false);
                onNavigateToSiparisler();
              }}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow transition-all cursor-pointer flex items-center gap-1"
            >
              <span>Siparişi İncele</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowNotification(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowNotification(false)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
