// Web Push Notification Manager for Rende Portal

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
  return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
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
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error('Service Worker kayit hatasi:', err);
    return null;
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const reg = await registerServiceWorkerForPush();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.error('Push aboneligi kontrol hatasi:', err);
    return null;
  }
}

export async function subscribeToPushNotifications(
  userName: string, 
  adminId: string, 
  forceRenew: boolean = false
): Promise<{ success: boolean; error?: string; subscription?: PushSubscription }> {
  if (!isPushNotificationSupported()) {
    if (isIOSDevice() && !isStandalonePWA()) {
      return { 
        success: false, 
        error: 'iPhone (iOS 16.4+) Kurulum Kuralı: Bildirim alabilmek için lütfen önce Safari alttaki Paylaş (📤) simgesine basıp "Ana Ekrana Ekle" (➕) yapın ve ardından Rende Portal\'ı Ana Ekrandan açın.' 
      };
    }
    return { success: false, error: 'Cihazınız veya tarayıcınız Web Push bildirimlerini desteklemiyor.' };
  }

  try {
    // 1. Kullanıcıdan bildirim izni iste
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      return { 
        success: false, 
        error: permission === 'denied' 
          ? 'Bildirim izni engellenmiş. Lütfen tarayıcı veya telefon ayarlarından bildirimlere izin verin.' 
          : 'Bildirim izni verilmedi.' 
      };
    }

    // 2. Service Worker hazırla
    const reg = await registerServiceWorkerForPush();
    if (!reg) {
      return { success: false, error: 'Service Worker başlatılamadı.' };
    }

    // 3. Mevcut aboneliği kontrol et
    let subscription = await reg.pushManager.getSubscription();

    // 4. forceRenew istendiyse veya abonelik yoksa veya anahtarları eksikse sıfırdan abone ol
    const needsNewSub = forceRenew || !subscription || !subscription.toJSON().keys;

    if (needsNewSub) {
      const keyRes = await fetch('/api/push/public-key');
      if (!keyRes.ok) throw new Error('VAPID sunucu anahtarı alınamadı.');
      const { publicKey } = await keyRes.json();
      if (!publicKey) throw new Error('Geçersiz VAPID anahtarı.');

      const convertedKey = urlBase64ToUint8Array(publicKey);

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

    // 5. Aboneliği sunucuya kaydet
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
    if (reg) {
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint })
        });
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendTestPushNotification(userName: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const adminId = userName?.includes('2') ? 'admin2' : 'admin1';
    
    // 1. Aboneliği al veya hazırla
    let subRes = await subscribeToPushNotifications(userName, adminId, false);
    if (!subRes.success) {
      // Doğrudan sıfırdan yenilemeyi dene
      subRes = await subscribeToPushNotifications(userName, adminId, true);
      if (!subRes.success) {
        return { success: false, error: subRes.error || 'Bildirim aboneliği oluşturulamadı.' };
      }
    }

    const reg = await registerServiceWorkerForPush();
    let subscription = reg ? await reg.pushManager.getSubscription() : null;

    let res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription ? subscription.toJSON() : null,
        userName
      })
    });
    
    let data = await res.json().catch(() => ({}));

    // Eğer sunucu aboneliğin geçersiz olduğunu söylerse veya hata verirse otomatik sıfırla ve yeniden dene
    if (!res.ok || !data.success || data.needsResubscribe) {
      console.log('Push aboneliği eski/geçersiz tespit edildi, otomatik sıfırlanıp yenileniyor...');
      const renewRes = await subscribeToPushNotifications(userName, adminId, true);
      if (renewRes.success) {
        const freshSub = reg ? await reg.pushManager.getSubscription() : null;
        const retryRes = await fetch('/api/push/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: freshSub ? freshSub.toJSON() : null,
            userName
          })
        });
        const retryData = await retryRes.json().catch(() => ({}));
        if (retryRes.ok && retryData.success) {
          return { success: true, message: retryData.message || 'Abonelik yenilendi ve test bildirimi başarıyla iletildi!' };
        }
        if (retryData.error) {
          return { success: false, error: retryData.error };
        }
      }
    }

    if (res.ok && data.success) {
      return { success: true, message: data.message || 'Test bildirimi başarıyla iletildi!' };
    }
    return { success: false, error: data.error || `Test bildirimi iletilemedi (${res.status}).` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Sunucu bağlantı hatası oluştu.' };
  }
}
