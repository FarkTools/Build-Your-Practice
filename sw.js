/* Offline support for the installed game.
 * Online, everything comes fresh from the network (the browser's normal HTTP cache still
 * applies), so a half-published update can never get pinned. The saved copy is only used
 * when the network fails or takes too long. Only this site's own files are handled; Google
 * Fonts and everything else go straight to the network as usual.
 * VERSION is rewritten by tools/stamp.py; a new version replaces the old saved copy. */
const VERSION = '0.20.1';
const CACHE = 'byp-' + VERSION;
const TIMEOUT = 6000;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      const res = await fetch('./index.html', { cache: 'no-store' });
      if (res.ok) {
        const html = await res.clone().text();
        await cache.put('./index.html', res);
        const urls = [...html.matchAll(/(?:src|href)="((?:js|css|icons)\/[^"]+)"/g)].map((m) => m[1]).concat(['manifest.webmanifest']);
        await Promise.all(urls.map((u) => fetch(u, { cache: 'no-store' }).then((r) => r.ok ? cache.put(u, r) : null).catch(() => null)));
      }
    } catch (err) { /* offline during install: fine */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function timeout(ms) { return new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms)); }
// Safari refuses a page response that went through a redirect; hand back a clean copy.
function clean(res) { return res.redirected ? res.blob().then((b) => new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers })) : res; }

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // fonts and other sites: not ours
  if (url.searchParams.has('check') || url.searchParams.has('reset')) return; // version checks and resets: always live
  const isPage = req.mode === 'navigate';
  e.respondWith((async () => {
    const net = fetch(req).then(async (res) => {
      if (res.ok) {
        const cache = await caches.open(CACHE);
        cache.put(isPage ? './index.html' : req, res.clone()).catch(() => {});
      }
      return isPage ? clean(res) : res;
    });
    try { return await Promise.race([net, timeout(TIMEOUT)]); }
    catch (err) {
      const saved = await caches.match(isPage ? './index.html' : req, { ignoreSearch: false });
      if (saved) return saved;
      return net; // nothing saved: keep waiting for the network
    }
  })());
});
