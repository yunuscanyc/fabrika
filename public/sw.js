// Service Worker for Rende Portal PWA & Push Notifications
const CACHE_NAME = 'rende-portal-v6';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

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

  const uniqueTag = (data.tag || 'rende-push') + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

  const showPromise = self.registration.showNotification(notifTitle, {
    body: notifBody,
    icon: '/pwa-192x192.png',
    data: { url: notifUrl }
  });

  const clientPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then((windowClients) => {
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

  event.waitUntil(Promise.all([showPromise, clientPromise]));
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
