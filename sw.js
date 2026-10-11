/* Offline support for the installed game (and a faster second visit in the browser).
 * - The page itself: network first, so updates arrive; the cached copy if offline.
 * - Scripts, styles, icons (versioned with ?v=): cache first.
 * - Google Fonts: cache first once fetched.
 * - The version check (js/version.js?check=...) always goes to the network.
 * VERSION is rewritten by tools/stamp.py; a new version replaces the old cache. */
const VERSION = '0.16.0';
const CACHE = 'byp-' + VERSION;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Precache the page and everything it loads, read straight from index.html.
    try {
      const res = await fetch('./index.html', { cache: 'no-store' });
      const html = await res.clone().text();
      await cache.put('./index.html', res);
      const urls = [...html.matchAll(/(?:src|href)="((?:js|css|icons)\/[^"]+)"/g)].map((m) => m[1]);
      await cache.addAll(['./', 'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'].concat(urls));
    } catch (err) { /* offline during install: runtime caching will fill in */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('byp-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.searchParams.has('check')) return; // version polling: always live
  const isPage = req.mode === 'navigate';
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !isFont) return;

  if (isPage) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', res.clone());
        return res;
      } catch (err) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch (err) { return hit || Response.error(); }
  })());
});
