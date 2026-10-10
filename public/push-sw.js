/* Push handlers. vite-plugin-pwa loads this file into the generated service worker (workbox.importScripts). */

const SOS_BUZZ = [500, 150, 500, 150, 900, 300, 500, 150, 500, 150, 900];

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }

  const isSos = data.type === 'sos';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tripId ? 'sos-' + data.tripId : 'transitguard',
    renotify: true,
    requireInteraction: isSos,
    vibrate: isSos ? SOS_BUZZ : [200],
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'TransitGuard', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const win of windows) {
        if ('focus' in win) {
          await win.focus();
          if ('navigate' in win) {
            try {
              await win.navigate(url);
            } catch (e) {
              /* navigation not allowed, the page is focused anyway */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});