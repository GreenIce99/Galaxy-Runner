const CACHE_NAME = 'galaxy-runner-v2';
const urlsToCache = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(urlsToCache)));
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(r=>r||fetch(event.request)));
});
