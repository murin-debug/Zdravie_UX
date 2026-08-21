const CACHE_NAME = "zeviora-sk-pilot-v7-20260821";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./privacy.html",
  "./terms.html",
  "./zeviora-logo-header.png",
  "./favicon-32.png",
  "./icon-192.png",
  "./icon-512.png"
];

// INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE (vymaže staré cache)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  // AI požiadavky sa nikdy neukladajú do PWA cache.
  if (url.hostname.includes("onrender.com")) {
    event.respondWith(fetch(req));
    return;
  }

  // Externé knižnice necháva spravovať ich vlastný server.
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  // HTML: najprv sieť, pri výpadku posledná uložená verzia.
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Lokálne statické súbory: cache-first.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((response) => {
          if (!response || response.status !== 200) return response;

          const copy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, copy);
          });

          return response;
        })
        .catch(() => cached);
    })
  );
});
