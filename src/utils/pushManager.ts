// Web Push Notification Manager for Rende Portal

function urlBase64ToUint8Array(base64String: string) {
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

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    await registerServiceWorkerForPush();
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.error('Push aboneliği kontrol hatası:', err);
    return null;
  }
}

export async function registerServiceWorkerForPush(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    // İlk olarak mevcut kaydı dene
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error('Service Worker kayıt hatası:', err);
    return null;
  }
}

export async function subscribeToPushNotifications(userName: string, adminId: string): Promise<{ success: boolean; error?: string }> {
  if (!isPushNotificationSupported()) {
    if (isIOSDevice() && !isStandalonePWA()) {
      return { 
        success: false, 
        error: 'iPhone (iOS 16.4+) Kuralı: Bildirim alabilmek için önce uygulamayı Safari altındaki Paylaş (📤) simgesine basıp "Ana Ekrana Ekle" (➕) yapmalı ve ardından Ana Ekrandan açmalısınız.' 
      };
    }
    return { success: false, error: 'Cihazınız veya tarayıcınız Web Push bildirimlerini desteklemiyor.' };
  }

  try {
    // 1. Kullanıcıdan bildirim izni iste
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { 
        success: false, 
        error: permission === 'denied' 
          ? 'Bildirim izni reddedildi. Lütfen tarayıcı/telefon ayarlarından bildirim iznini açınız.' 
          : 'Bildirim izni verilmedi.' 
      };
    }

    // 2. Sunucudan VAPID Public Key al
    const keyRes = await fetch('/api/push/public-key');
    if (!keyRes.ok) throw new Error('VAPID anahtarı alınamadı.');
    const { publicKey } = await keyRes.json();
    if (!publicKey) throw new Error('Geçersiz VAPID anahtarı.');

    // 3. Service Worker hazırla
    await registerServiceWorkerForPush();
    const reg = await navigator.serviceWorker.ready;

    // 4. Push Manager ile temiz ve güncel VAPID anahtarıyla abone ol
    const convertedKey = urlBase64ToUint8Array(publicKey);
    let subscription = await reg.pushManager.getSubscription();

    // Eski/geçersiz anahtar kalıntısı varsa temizle ve sıfırdan abone ol
    if (subscription) {
      try {
        await subscription.unsubscribe();
      } catch (e) {}
    }

    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    });

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys) {
      throw new Error('Push yöneticisinden geçerli şifreleme anahtarları alınamadı.');
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

    return { success: true };
  } catch (err: any) {
    console.error('Push bildirim abonelik hatası:', err);
    return { success: false, error: err.message || 'Bilinmeyen bir hata oluştu.' };
  }
}

export async function unsubscribeFromPushNotifications(): Promise<{ success: boolean; error?: string }> {
  try {
    await registerServiceWorkerForPush();
    const reg = await navigator.serviceWorker.ready;
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
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendTestPushNotification(userName: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // 1. İzin kontrolü
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        return { success: false, error: 'Bildirim izni verilmedi. Lütfen tarayıcı ayarlarından bildirimlere izin verin.' };
      }
    }

    // 2. Her zaman güncel sunucu anahtarıyla aboneliği yenile/kaydet
    const adminId = userName?.includes('2') ? 'admin2' : 'admin1';
    const subRes = await subscribeToPushNotifications(userName, adminId);
    if (!subRes.success) {
      return { success: false, error: subRes.error || 'Abonelik yenilenemedi.' };
    }

    // 3. Service Worker hazırla
    await registerServiceWorkerForPush();
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      return { success: false, error: 'Push yöneticisinden abonelik alınamadı.' };
    }
    
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userName
      })
    });
    
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message || 'Test bildirimi cihazınıza başarıyla iletildi!' };
    }
    return { success: false, error: data.error || `Test bildirimi gönderilemedi (HTTP ${res.status}).` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Bilinmeyen bağlantı hatası oluştu.' };
  }
}
