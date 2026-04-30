const CACHE = 'sfp-v3';
const STATIC = ['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon-32.png', '/favicon-16.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))),
      self.clients.claim(),
    ])
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // NEVER cache: API, HTML navigations, manifest, service worker, or text/html requests
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/sw.js' ||
    e.request.mode === 'navigate' ||
    (e.request.headers.get('accept') || '').includes('text/html')
  ) {
    return;
  }
  // Cache-first for static images, JS, CSS only
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
