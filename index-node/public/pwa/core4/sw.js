const CACHE = "core4-v5";
const STATIC = [
  "/pwa/core4/",
  "/pwa/core4/index.html",
  "/pwa/core4/style.css",
  "/pwa/core4/app.js",
  "/pwa/gas-fallback.js",
  "/pwa/core4/manifest.json",
  "/pwa/core4/icon-192-v2.svg",
  "/pwa/core4/icon-512-v2.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // API calls always go to network
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Static assets: cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
