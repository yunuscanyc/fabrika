/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

self.skipWaiting();
clientsClaim();

function cleanTurkishMojibake(text: any): string {
  if (!text) return '';
  let str = String(text);
  try {
    if (str.includes('%')) {
      str = decodeURIComponent(str);
    }
  } catch {}

  return str
    .replace(/\u00C5[\u009F\u015F\u0178\uFFFD\?]/g, 'ş')
    .replace(/\u00C5[\u009E\u015E\u017D\uFFFD\?]/g, 'Ş')
    .replace(/\u00C4\u00B1/g, 'ı')
    .replace(/\u00C4\u00B0/g, 'İ')
    .replace(/\u00C4[\u009F\u011F\uFFFD]/g, 'ğ')
    .replace(/\u00C4[\u009E\u011E\uFFFD]/g, 'Ğ')
    .replace(/\u00C3\u00A7/g, 'ç')
    .replace(/\u00C3\u0087/g, 'Ç')
    .replace(/\u00C3\u00B6/g, 'ö')
    .replace(/\u00C3\u0096/g, 'Ö')
    .replace(/\u00C3\u00BC/g, 'ü')
    .replace(/\u00C3\u009C/g, 'Ü')
    .replace(/ÅŸ/g, 'ş').replace(/Å\x9f/g, 'ş').replace(/Å\u009f/g, 'ş')
    .replace(/Åž/g, 'Ş').replace(/Å\x9e/g, 'Ş').replace(/Å\u009e/g, 'Ş')
    .replace(/Ä±/g, 'ı').replace(/Ä°/g, 'İ')
    .replace(/ÄŸ/g, 'ğ').replace(/Ä\x9f/g, 'ğ')
    .replace(/Äž/g, 'Ğ').replace(/Ä\x9e/g, 'Ğ')
    .replace(/Ã§/g, 'ç').replace(/Ã‡/g, 'Ç')
    .replace(/Ã¶/g, 'ö').replace(/Ã–/g, 'Ö')
    .replace(/Ã¼/g, 'ü').replace(/Ãœ/g, 'Ü')
    .replace(/Ustaba[şs\u00C5\?][ıi\u00C4\?]*/gi, 'Ustabaşı')
    .replace(/Y[öo\u00C3\?]netici/gi, 'Yönetici')
    .replace(/1\.\s*Y[öo\u00C3\?]netici/gi, '1. Yönetici')
    .replace(/2\.\s*Y[öo\u00C3\?]netici/gi, '2. Yönetici');
}

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

  const notifTitle = cleanTurkishMojibake(data.title || '🔔 Rende Portal');
  const notifBody = cleanTurkishMojibake(data.body || 'Yeni bir işlem veya bildirim kaydedildi.');
  const notifUrl = (data.data && data.data.url) || data.url || '/';

  const notifOptions: NotificationOptions = {
    body: notifBody,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: (data.tag || 'rende-notification') + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
    data: { url: notifUrl }
  };

  // Açık olan pencerelere anlık CANLI mesaj gönder (ön planda aktifse toast kartı açılır)
  const clientPromise = (self.clients && self.clients.matchAll)
    ? self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
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
      }).catch(() => {})
    : Promise.resolve();

  // Tarayıcı ve işletim sistemi bildirim merkezinde göster
  const showPromise = self.registration.showNotification(notifTitle, notifOptions).catch((err) => {
    console.warn('[SW Push] Detaylı gösterim hatası, sade fallback deneniyor:', err);
    return self.registration.showNotification(notifTitle, {
      body: notifBody,
      icon: '/pwa-192x192.png'
    });
  });

  event.waitUntil(Promise.all([showPromise, clientPromise]));
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
