// Service Worker for Rende Portal PWA & Push Notifications
const CACHE_NAME = 'rende-portal-v5';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Precache uyarisi:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Do not cache API, database or push calls
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Network-first strategy with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

// ==========================================
// PUSH BİLDİRİM VE TELEFON EKRANI UYARILARI
// (iOS 16.4+, Android Chrome, Firefox & Desktop tam uyumlu)
// ==========================================
self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 Rende Portal Bildirimi',
    body: 'Yeni bir işlem veya bildirim kaydedildi.',
    url: '/',
    data: {}
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      try {
        data.body = event.data.text();
      } catch (e2) {}
    }
  }

  const notifTitle = data.title || '🔔 Rende Portal';
  const notifBody = data.body || 'Yeni bir işlem kaydedildi.';
  const notifUrl = (data.data && data.data.url) || data.url || '/';

  // iOS Safari ve Android için optimize edilmiş, hata vermeyen bildirim seçenekleri
  const safeOptions = {
    body: notifBody,
    icon: '/pwa-192x192.png',
    data: { url: notifUrl }
  };

  // Açık olan tarayıcı pencerelerine anlık mesaj gönder
  if (self.clients && self.clients.matchAll) {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      if (Array.isArray(windowClients)) {
        windowClients.forEach((client) => {
          try {
            client.postMessage({
              type: 'PUSH_NOTIFICATION_RECEIVED',
              payload: {
                title: notifTitle,
                body: notifBody,
                url: notifUrl
              }
            });
          } catch (err) {}
        });
      }
    }).catch(() => {});
  }

  // Bildirimi ekranda göster
  event.waitUntil(
    self.registration.showNotification(notifTitle, safeOptions)
      .catch((err) => {
        console.warn('[SW Push] Detaylı gösterim hatası, sade metin ile tekrar deneniyor:', err);
        return self.registration.showNotification(notifTitle, {
          body: notifBody
        });
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  try {
    event.notification.close();
  } catch (e) {}

  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }).catch(() => {})
  );
});
