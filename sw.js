// sw.js — Service Worker Hydra
const CACHE = 'hydra-v1';
const ASSETS = ['/', '/index.html'];

// Installation : mise en cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activation : nettoyage ancien cache
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : réponse depuis le cache (offline first)
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ─── RAPPELS EN ARRIÈRE-PLAN ──────────────────────────────────────────
// Reçoit un message depuis index.html pour programmer un rappel
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE') {
    const { delayMs, intake, goal, intervalMin } = e.data;

    // Annule l'ancien timer si existant
    if (self._reminderTimer) clearTimeout(self._reminderTimer);

    self._reminderTimer = setTimeout(() => {
      // Envoie la notification
      self.registration.showNotification('💧 Hydra — Rappel', {
        body: `Tu as bu ${intake}/${goal} verres aujourd'hui. Bois de l'eau !`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'hydra-reminder',
        renotify: true,
        requireInteraction: false,
        data: { intervalMin, intake, goal }
      });

      // Notifie les onglets ouverts pour qu'ils reprogramment
      self.clients.matchAll().then(clients => {
        clients.forEach(c => c.postMessage({ type: 'FIRED' }));
      });
    }, delayMs);
  }

  if (e.data?.type === 'CANCEL') {
    if (self._reminderTimer) {
      clearTimeout(self._reminderTimer);
      self._reminderTimer = null;
    }
  }
});

// Clic sur la notification → ouvre l'app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients.length) return clients[0].focus();
      return self.clients.openWindow('/');
    })
  );
});
