const CACHE = "core4-v1";
const STATIC = [
  "/core4/",
  "/core4/index.html",
  "/core4/style.css",
  "/core4/app.js",
  "/core4/manifest.json",
  "/core4/icon-192.svg",
  "/core4/icon-512.svg",
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
