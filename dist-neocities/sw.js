const CACHE_NAME = 'arena-survival-v1';
const urlsToCache = [
  '/arena.html',
  '/assets/arena.js',
  '/assets/rot.js',
  '/assets/tilemap.js',
  '/assets/tiles.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
