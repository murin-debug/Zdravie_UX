const CACHE_NAME = "zdravie-ux-v3";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
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

  // ❌ NEcacheuj AI backend
  if (url.hostname.includes("onrender.com")) {
    event.respondWith(fetch(req));
    return;
  }

  // ❌ NEcacheuj HTML (aby sa vždy načítala nová verzia appky)
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(fetch(req));
    return;
  }

  // 🧠 STATIC FILES → cache-first
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
