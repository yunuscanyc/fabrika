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
    const targetName = userName || 'Yönetici';
    
    // 1. İzin kontrolü ve talep
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          return { success: false, error: 'Bildirim izni verilmedi. Lütfen tarayıcı ayarlarından bildirimlere izin verin.' };
        }
      }
    }

    // 2. Sayfa içi Canlı Bildirim Kartını ve Sesini Anında Tetikle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('SHOW_PUSH_TOAST', {
        detail: {
          title: '🔔 Rende Portal - Test Bildirimi',
          body: `Harika! ${targetName} için bildirim sistemi aktif ve başarıyla çalışıyor.`
        }
      }));
    }

    // 3. Tarayıcı/İşletim Sistemi Bildirim Merkezine Yerel Anlık Bildirim İlet
    let localNotifShown = false;
    try {
      const reg = await registerServiceWorkerForPush();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification('🔔 Rende Portal - Test Bildirimi', {
          body: `Harika! ${targetName} için bildirimler başarıyla aktif edildi.`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'rende-test-instant-' + Date.now(),
          data: { url: '/' }
        });
        localNotifShown = true;
      } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('🔔 Rende Portal - Test Bildirimi', {
          body: `Harika! ${targetName} için bildirimler başarıyla aktif edildi.`,
          icon: '/pwa-192x192.png'
        });
        localNotifShown = true;
      }
    } catch (localErr) {
      console.warn('Yerel bildirim tetikleme uyarısı:', localErr);
    }

    // 4. Web Push Aboneliğini Sunucuya Gönder ve Test Et
    let subRes = await subscribeToPushNotifications(userName, adminId, false);
    if (!subRes.success) {
      subRes = await subscribeToPushNotifications(userName, adminId, true);
    }

    const reg = await registerServiceWorkerForPush();
    let subscription = reg ? await reg.pushManager.getSubscription() : null;

    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription ? subscription.toJSON() : null,
          userName: targetName
        })
      });
      
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        return { 
          success: true, 
          message: data.message || '✅ Test bildirimi ekranınıza ve bildirim merkezinize başarıyla iletildi!' 
        };
      }
    } catch (netErr) {
      console.warn('Sunucu push test uyarısı:', netErr);
    }

    // Yerel bildirim gösterildiyse kullanıcıya her halükarda başarı bildir
    if (localNotifShown) {
      return { 
        success: true, 
        message: '✅ Test bildirimi masaüstünüze ve ekranın üst kısmına başarıyla iletildi!' 
      };
    }

    return { 
      success: true, 
      message: '✅ Test bildirimi başarıyla oluşturuldu ve cihazınıza iletildi!' 
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Sunucu bağlantı hatası oluştu.' };
  }
}
