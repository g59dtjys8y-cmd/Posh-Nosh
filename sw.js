const CACHE_NAME = 'posh-nosh-shell-v2';
const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first: always try to get the freshest version of the app itself,
// falling back to the cached copy only if offline. Recipes/favorites are
// synced to Supabase over the network — the app shell above is the only
// thing precached.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Never cache authenticated requests (Supabase's own auth/REST calls carry an
  // Authorization header). Caching is keyed by URL, not by who's signed in, so on a
  // shared device a cache hit could otherwise hand one user's data to the next.
  if (event.request.headers.has('Authorization')) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
