/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

self.skipWaiting();
clientsClaim();

// ==========================================
// PUSH BİLDİRİM VE KİLİT EKRANI UYARILARI
// (Firefox PC, iOS Safari 16.4+, Android Chrome & Edge)
// ==========================================
self.addEventListener('push', (event: PushEvent) => {
  let data: any = {
    title: '🔔 Rende Portal Bildirimi',
    body: 'Yeni bir işlem kaydedildi.',
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
  const notifBody = data.body || 'Yeni bir işlem veya bildirim kaydedildi.';
  const notifUrl = (data.data && data.data.url) || data.url || '/';

  const notifOptions: NotificationOptions = {
    body: notifBody,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'rende-notification-' + Date.now(),
    data: { url: notifUrl }
  };

  // Açık olan pencerelere anlık CANLI mesaj gönder (ön planda aktifse toast kartı açılır)
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

  // Tarayıcı ve işletim sistemi bildirim merkezinde göster
  event.waitUntil(
    self.registration.showNotification(notifTitle, notifOptions).catch((err) => {
      console.warn('[SW Push] Detaylı gösterim hatası, sade fallback deneniyor:', err);
      return self.registration.showNotification(notifTitle, {
        body: notifBody,
        icon: '/pwa-192x192.png'
      });
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  try {
    event.notification.close();
  } catch (e) {}

  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            (client as any).navigate(targetUrl).catch(() => {});
          }
          return (client as any).focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }).catch(() => {})
  );
});
