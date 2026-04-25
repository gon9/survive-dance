const CACHE = 'survive-dance-v2';

self.addEventListener('install', e => {
  const base = self.registration.scope;
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      base,
      base + 'index.html',
      base + 'game.js',
      base + 'manifest.json',
    ])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
