/* Service worker MonBudget : coquille applicative hors-ligne.
   - /api/*          : réseau uniquement (données toujours fraîches)
   - /assets/*, icône : cache d'abord (fichiers fingerprintés par Vite)
   - navigations      : réseau d'abord, repli cache si hors-ligne */

const CACHE = 'monbudget-v1';
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Données API : toujours le réseau
  if (url.pathname.startsWith('/api/')) return;

  // Même origine uniquement
  if (url.origin !== self.location.origin) return;

  // Assets fingerprintés : cache d'abord
  if (url.pathname.startsWith('/assets/') || url.pathname === '/favicon.svg') {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return res;
          })
      )
    );
    return;
  }

  // Navigations : réseau d'abord, repli hors-ligne sur la coquille
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
  }
});
