// Web Push Notification Manager for Rende Portal (iOS Safari 16.4+, Android Chrome & Desktop)

// Önceden bilinen ve sunucuyla eşleşen VAPID Genel Anahtarı (Kullanıcı etkileşiminde gecikme olmadan anında abone olabilmek için)
const DEFAULT_VAPID_PUBLIC_KEY = 'BB-BlnsliiTrP_tgryzagLdjLTP7FOkJMBcJCuhTW7og11JGISYtM--dcTs1U-CEUlgeR_U9WKtbVk8guQc3J0c';
let cachedVapidPublicKey: string = DEFAULT_VAPID_PUBLIC_KEY;

// Sayfa ilk yüklendiğinde sunucudan güncel anahtarı arka planda al
if (typeof window !== 'undefined') {
  fetch('/api/push/public-key')
    .then(r => r.json())
    .then(d => {
      if (d && d.publicKey) {
        cachedVapidPublicKey = d.publicKey;
      }
    })
    .catch(() => {});
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isIosUa = /iphone|ipad|ipod/.test(ua);
  const isIpadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIosUa || isIpadOS;
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function registerServiceWorkerForPush(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    const readyReg = await navigator.serviceWorker.ready;
    return readyReg || reg;
  } catch (err) {
    console.error('Service Worker kayit hatasi:', err);
    return null;
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const reg = await registerServiceWorkerForPush();
    if (!reg || !reg.pushManager) return null;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.error('Push aboneligi kontrol hatasi:', err);
    return null;
  }
}

/**
 * Kullanıcı etkileşimi (click/tap) içerisinde doğrudan çağrılmalıdır.
 * Safari / iOS WebKit'te transient user activation süresi dolmaması için
 * arada ağ isteği (fetch) yapılmadan doğrudan Notification.requestPermission()
 * ve pushManager.subscribe() çalıştırılır.
 */
export async function subscribeToPushNotifications(
  userName: string, 
  adminId: string, 
  forceRenew: boolean = false
): Promise<{ success: boolean; error?: string; subscription?: PushSubscription }> {
  const isIOS = isIOSDevice();
  const isStandalone = isStandalonePWA();

  if (isIOS && !isStandalone) {
    return { 
      success: false, 
      error: '📱 iPhone Kuralı: Apple güvenlik politikası gereği bildirimler Safari sekmesinde çalışmaz. Lütfen Safari altındaki Paylaş (📤) simgesine dokunup "Ana Ekrana Ekle" (➕) yapın ve ardından Rende Portal\'ı Ana Ekrandan açarak bildirimleri açın.' 
    };
  }

  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Cihazınız veya tarayıcınız Web Push bildirimlerini desteklemiyor.' };
  }

  try {
    // 1. Kullanıcıdan bildirim izni iste (Doğrudan kullanıcı tıklama olayı içinde)
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      return { 
        success: false, 
        error: permission === 'denied' 
          ? (isIOS 
              ? 'Bildirim izni iPhone\'da engellenmiş. Lütfen iPhone Ayarlar > Bildirimler > Rende Portal menüsünden bildirimlere izin verin.' 
              : 'Bildirim izni engellenmiş. Lütfen tarayıcı ayarlarından bildirimlere izin verin.')
          : 'Bildirim izni onaylanmadı.' 
      };
    }

    // 2. Service Worker hazırla
    const reg = await registerServiceWorkerForPush();
    if (!reg || !reg.pushManager) {
      return { success: false, error: 'Service Worker Push Yöneticisi başlatılamadı.' };
    }

    // 3. Mevcut aboneliği kontrol et
    let subscription = await reg.pushManager.getSubscription();

    // 4. forceRenew veya abonelik yoksa veya anahtarları eksikse sıfırdan abone ol
    const needsNewSub = forceRenew || !subscription || !subscription.toJSON().keys;

    if (needsNewSub) {
      const convertedKey = urlBase64ToUint8Array(cachedVapidPublicKey);

      if (subscription) {
        try {
          await subscription.unsubscribe();
        } catch (e) {}
      }

      try {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
      } catch (subErr: any) {
        try {
          const oldSub = await reg.pushManager.getSubscription();
          if (oldSub) await oldSub.unsubscribe();
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey
          });
        } catch (retryErr: any) {
          throw new Error(`Push aboneliği oluşturulamadı: ${retryErr.message || subErr.message}`);
        }
      }
    }

    if (!subscription) {
      throw new Error('Abonelik nesnesi oluşturulamadı.');
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys) {
      throw new Error('Push servisinden geçerli anahtarlar temin edilemedi.');
    }

    // 5. Aboneliği sunucuya kaydet (Abonelik oluştuktan sonra asenkron gönderim)
    const subRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subJson,
        userName: userName || '1. Yönetici',
        adminId: adminId || 'admin1'
      })
    });

    if (!subRes.ok) {
      const errTxt = await subRes.text();
      throw new Error(errTxt || 'Abonelik sunucuya kaydedilemedi.');
    }

    return { success: true, subscription };
  } catch (err: any) {
    console.error('Push bildirim abonelik hatası:', err);
    return { success: false, error: err.message || 'Bilinmeyen bir hata oluştu.' };
  }
}

export async function unsubscribeFromPushNotifications(): Promise<{ success: boolean; error?: string }> {
  try {
    const reg = await registerServiceWorkerForPush();
    if (reg && reg.pushManager) {
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint })
        }).catch(() => {});
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendTestPushNotification(userName: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const isIOS = isIOSDevice();
    const isStandalone = isStandalonePWA();

    if (isIOS && !isStandalone) {
      return {
        success: false,
        error: '📱 iPhone Kuralı: Test bildirimi alabilmek için lütfen önce Safari Paylaş (📤) menüsünden "Ana Ekrana Ekle" (➕) yapın ve Rende Portal\'ı Ana Ekrandan açın.'
      };
    }

    const adminId = userName?.includes('2') ? 'admin2' : 'admin1';
    const targetName = userName || 'Yönetici';
    
    // 1. İzin kontrolü ve talep
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          return { 
            success: false, 
            error: isIOS
              ? 'Bildirim izni verilmedi. Lütfen iPhone Ayarlar > Bildirimler > Rende Portal menüsünden bildirimleri açın.'
              : 'Bildirim izni verilmedi. Lütfen tarayıcı ayarlarından bildirimlere izin verin.'
          };
        }
      }
    }

    // 2. Sayfa içi Canlı Bildirim Kartını ve Sesini Tetikle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('SHOW_PUSH_TOAST', {
        detail: {
          title: '🔔 Rende Portal - Test Bildirimi',
          body: `Harika! ${targetName} için bildirim sistemi aktif ve başarıyla çalışıyor.`
        }
      }));
    }

    // 3. Web Push Aboneliğini Sağla
    let subRes = await subscribeToPushNotifications(userName, adminId, false);
    if (!subRes.success) {
      subRes = await subscribeToPushNotifications(userName, adminId, true);
    }

    const reg = await registerServiceWorkerForPush();
    let subscription = (reg && reg.pushManager) ? await reg.pushManager.getSubscription() : null;

    if (!subscription) {
      return {
        success: false,
        error: 'Cihazınızda push aboneliği oluşturulamadı. Lütfen Safari ayarlarınızı kontrol edin.'
      };
    }

    // 4. Sunucu üzerinden Web Push gönder
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userName: targetName
      })
    });
    
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      return { 
        success: true, 
        message: data.message || '✅ Test bildirimi telefonunuzun kilit ekranına ve bildirim merkezine başarıyla iletildi!' 
      };
    } else {
      return {
        success: false,
        error: data.error || 'Sunucu test bildirimini cihaza iletemedi.'
      };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Sunucu bağlantı hatası oluştu.' };
  }
}
