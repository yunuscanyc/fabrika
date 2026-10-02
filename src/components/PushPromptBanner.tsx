import React, { useState, useEffect } from 'react';
import { Bell, Smartphone, X, Sparkles, Check, CheckCircle2, ChevronRight, Share2, PlusSquare } from 'lucide-react';
import { 
  isPushNotificationSupported, 
  isIOSDevice,
  isStandalonePWA,
  getCurrentPushSubscription, 
  subscribeToPushNotifications, 
  getNotificationPermission,
  sendTestPushNotification
} from '../utils/pushManager';

interface PushPromptBannerProps {
  currentUserName: string;
}

export const PushPromptBanner: React.FC<PushPromptBannerProps> = ({ currentUserName }) => {
  const [show, setShow] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showIosSteps, setShowIosSteps] = useState<boolean>(false);

  useEffect(() => {
    const ios = isIOSDevice();
    const standalone = isStandalonePWA();
    setIsIOS(ios);
    setIsStandalone(standalone);

    // Safari iOS'ta henüz ana ekrana eklenmemişse veya push destekleniyorsa
    const isSupported = isPushNotificationSupported() || (ios && !standalone);
    if (!isSupported) return;

    const storageKey = standalone ? 'rende_push_prompt_dismissed_pwa' : 'rende_push_prompt_dismissed';
    const dismissed = localStorage.getItem(storageKey);
    if (dismissed && Date.now() - parseInt(dismissed, 10) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    if (ios && !standalone) {
      // iPhone kullanıcısına Safari içinde 3 saniye sonra kurulum daveti göster
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }

    getCurrentPushSubscription().then(sub => {
      if (!sub && getNotificationPermission() !== 'denied') {
        const timer = setTimeout(() => setShow(true), 2500);
        return () => clearTimeout(timer);
      }
    }).catch(() => {});
  }, []);

  const handleEnable = async () => {
    if (isIOS && !isStandalone) {
      setShowIosSteps(true);
      return;
    }

    setLoading(true);
    try {
      const adminId = currentUserName.includes('2') ? 'admin2' : 'admin1';
      const res = await subscribeToPushNotifications(currentUserName, adminId);
      if (res.success) {
        setSuccess(true);
        // Otomatik test bildirimi tetikle
        sendTestPushNotification(currentUserName).catch(() => {});
        setTimeout(() => {
          setShow(false);
        }, 3000);
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
    const storageKey = isStandalone ? 'rende_push_prompt_dismissed_pwa' : 'rende_push_prompt_dismissed';
    localStorage.setItem(storageKey, Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div 
      className="fixed right-3 md:right-6 z-40 max-w-sm w-[calc(100vw-1.5rem)] md:w-96 animate-slideDown shadow-xl rounded-2xl overflow-hidden border border-blue-400 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5"
      style={{
        top: 'calc(4.5rem + env(safe-area-inset-top, 0px))'
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md">
            <Smartphone className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-white">
                {isIOS && !isStandalone 
                  ? 'iPhone Bildirim Kurulumu' 
                  : isIOS && isStandalone 
                  ? 'iPhone Kilit Ekranı Bildirimleri' 
                  : 'Cep Telefonu Bildirimleri'}
              </h4>
              <span className="text-[10px] bg-blue-500/30 text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-400/30">
                Anlık
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              {isIOS && !isStandalone
                ? "iPhone'da anlık kilit ekranı bildirimlerini almak için Safari'den 'Ana Ekrana Ekle' yapmanız gerekmektedir."
                : isIOS && isStandalone
                ? "iPhone kilit ekranınızda ceride ve ajanda bildirimlerini anında almak için tek tıkla bildirimleri açın."
                : "Ceride günlüğü ve ajanda hatırlatma kayıtlarında anlık kilit ekranı bildirimi gelsin mi?"}
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

      {showIosSteps && isIOS && !isStandalone && (
        <div className="mt-3 p-2.5 bg-slate-950/80 rounded-xl border border-amber-400/40 text-[11px] space-y-2 text-slate-200 animate-in fade-in">
          <div className="font-bold text-amber-300 flex items-center gap-1">
            <span>iPhone'a Bildirimleri Yükleme Adımları:</span>
          </div>
          <div className="space-y-1.5 text-[10.5px]">
            <div className="flex items-start gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[9px]">1</span>
              <span>Safari altındaki <strong>Paylaş (📤)</strong> simgesine dokunun.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[9px]">2</span>
              <span><strong>"Ana Ekrana Ekle" (➕)</strong> seçeneğine basıp sağ üstten <strong>"Ekle"</strong> deyin.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[9px]">3</span>
              <span>Ana ekrandaki <strong>Rende Portal</strong> ikonuna basarak açın ve bildirime izin verin.</span>
            </div>
          </div>
        </div>
      )}

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
          ) : isIOS && !isStandalone ? (
            <>
              <Smartphone className="w-3.5 h-3.5" />
              <span>{showIosSteps ? 'Anladım' : 'Nasıl Kurulur?'}</span>
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5" />
              <span>{isIOS && isStandalone ? 'Bildirimleri Aç (iPhone)' : 'Bildirimleri Aç'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
