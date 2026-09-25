import React, { useState, useEffect } from 'react';
import { Bell, Smartphone, X, Sparkles, Check, CheckCircle2 } from 'lucide-react';
import { 
  isPushNotificationSupported, 
  getCurrentPushSubscription, 
  subscribeToPushNotifications, 
  getNotificationPermission 
} from '../utils/pushManager';

interface PushPromptBannerProps {
  currentUserName: string;
}

export const PushPromptBanner: React.FC<PushPromptBannerProps> = ({ currentUserName }) => {
  const [show, setShow] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Sadece bildirim destekleyen tarayıcılarda ve daha önce reddedilmemiş/kapatılmamışsa göster
    if (!isPushNotificationSupported()) return;

    const dismissed = localStorage.getItem('rende_push_prompt_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed, 10) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    getCurrentPushSubscription().then(sub => {
      if (!sub && getNotificationPermission() !== 'denied') {
        // Kullanıcıyı rahatsız etmemek için 3 saniye sonra nazikçe göster
        const timer = setTimeout(() => setShow(true), 3000);
        return () => clearTimeout(timer);
      }
    }).catch(() => {});
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const adminId = currentUserName.includes('2') ? 'admin2' : 'admin1';
      const res = await subscribeToPushNotifications(currentUserName, adminId);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setShow(false);
        }, 2500);
      } else {
        alert(res.error || 'Bildirim izni alınamadı.');
        setShow(false);
      }
    } catch (e: any) {
      alert('Bildirim hatası: ' + e.message);
      setShow(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('rende_push_prompt_dismissed', Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed top-18 right-3 md:right-6 z-40 max-w-sm w-[calc(100vw-1.5rem)] md:w-96 animate-slideDown shadow-xl rounded-2xl overflow-hidden border border-blue-400 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md">
            <Smartphone className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-white">Cep Telefonu Bildirimleri</h4>
              <span className="text-[10px] bg-blue-500/30 text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-400/30">
                Anlık
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Diğer yönetici ajandada ekleme/silme yaptığında kilit ekranınıza sesli bildirim gelsin mi?
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={handleDismiss}
          className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          Daha Sonra
        </button>

        <button
          type="button"
          onClick={handleEnable}
          disabled={loading || success}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          {success ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Bildirimler Açıldı!</span>
            </>
          ) : loading ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Bell className="w-3.5 h-3.5" />
              <span>Bildirimleri Aç</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
