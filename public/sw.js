// Service Worker for Rende Portal PWA & Push Notifications
const CACHE_NAME = 'rende-portal-v4';
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
// ==========================================
self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 Rende Ahşap Portal',
    body: 'Yeni bir işlem kaydedildi.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    url: '/',
    data: {}
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  // iOS Safari ve Android Chrome ile %100 uyumlu bildirim parametreleri
  const options = {
    body: data.body || 'Yeni bir işlem kaydedildi.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: data.data || { url: data.url || '/' },
    tag: data.tag || 'rende-push-' + Date.now(),
    renotify: true
  };

  // Açık olan ekranlara mesaj gönder (Uygulama açıksa anında haberdar olsun)
  clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    windowClients.forEach((client) => {
      client.postMessage({
        type: 'PUSH_NOTIFICATION_RECEIVED',
        payload: data
      });
    });
  }).catch(() => {});

  event.waitUntil(
    self.registration.showNotification(data.title || '🔔 Rende Ahşap Portal', options)
      .catch((err) => {
        console.error('showNotification ilk deneme hatası, sade fallback deneniyor:', err);
        return self.registration.showNotification(data.title || '🔔 Rende Ahşap Portal', {
          body: data.body || 'Yeni bir işlem kaydedildi.',
          icon: '/pwa-192x192.png'
        });
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
