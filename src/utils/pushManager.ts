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

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;
  try {
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
    return { success: false, error: 'Cihazınız veya tarayıcınız Web Push bildirimlerini desteklemiyor.' };
  }

  try {
    // 1. Kullanıcıdan bildirim izni iste
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { 
        success: false, 
        error: permission === 'denied' 
          ? 'Bildirim izni reddedildi. Telefonunuzun tarayıcı ayarlarından site bildirimlerine izin veriniz.' 
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

    // 4. Push Manager ile abone ol
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(publicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    // 5. Aboneliği sunucuya kaydet
    const subRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
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
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription ? subscription.toJSON() : null,
        userName
      })
    });
    
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || 'Test bildirimi gönderilemedi.' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
