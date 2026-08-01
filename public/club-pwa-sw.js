/* Public club microsite offline shell — network-first for navigations. */
const CACHE = "one4team-club-pwa-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/club/")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.mode === "navigate" || req.destination === "document" || req.destination === "script" || req.destination === "style" || req.destination === "image")) {
          const copy = res.clone();
          void caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const parts = url.pathname.split("/").filter(Boolean);
          // /club/:slug → try club home shell
          if (parts.length >= 2) {
            const home = await caches.match(`/club/${parts[1]}/`);
            if (home) return home;
            const homeNoSlash = await caches.match(`/club/${parts[1]}`);
            if (homeNoSlash) return homeNoSlash;
          }
        }
        return Response.error();
      }),
  );
});
