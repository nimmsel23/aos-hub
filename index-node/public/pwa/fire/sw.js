const CACHE = "fire-v5";
const STATIC = [
  "/pwa/fire/",
  "/pwa/fire/index.html",
  "/pwa/fire/style.css",
  "/pwa/fire/app.js",
  "/pwa/fire/manifest.json",
  "/pwa/fire/icon-192-v3.svg",
  "/pwa/fire/icon-512-v3.svg",
  "/pwa/gas-fallback.js",
  "https://cdn.jsdelivr.net/npm/sortablejs@1.15.3/Sortable.min.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/bridge/api/")) {
    return;
  }
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});
