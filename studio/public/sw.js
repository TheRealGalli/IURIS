// Service worker minimo: l'app funziona anche offline dopo la prima visita.
// I contenuti (content/) e la pagina si aggiornano dalla rete quando c'è, altrimenti dalla cache.
// Su GitHub Pages più progetti condividono la stessa origine: ogni app gestisce solo la propria cache.
const CACHE_PREFIX = `iuris:${self.registration.scope}:`;
const CACHE = `${CACHE_PREFIX}v1`;
const dallaCache = (request) => caches.open(CACHE).then((c) => c.match(request));

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const stessaOrigine = url.origin === self.location.origin;
  if (stessaOrigine && !url.href.startsWith(self.registration.scope)) return;
  const font = url.host.endsWith('fonts.googleapis.com') || url.host.endsWith('fonts.gstatic.com');
  if (!stessaOrigine && !font) return;

  const daRete = () => fetch(req).then((res) => {
    if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
    return res;
  });
  // file con hash (assets/) e font: prima la cache; tutto il resto: prima la rete
  if (url.pathname.includes('/assets/') || font) {
    e.respondWith(dallaCache(req).then((hit) => hit || daRete()));
  } else {
    e.respondWith(daRete().catch(async () => {
      const hit = await dallaCache(req);
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const home = await dallaCache(self.registration.scope) || await dallaCache(new URL('index.html', self.registration.scope).href);
        if (home) return home;
      }
      return Response.error();
    }));
  }
});
