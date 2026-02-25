const CACHE = "fitness-centre-v1";
const STATIC = [
  "/pwa/fitness/",
  "/pwa/fitness/index.html",
  "/pwa/fitness/app.js",
  "/pwa/fitness/manifest.json",
  "/pwa/fitness/icon-192.svg",
  "/pwa/fitness/icon-512.svg",
  "/pwa/fitness/_shared/styles.css",
  "/pwa/fitness/_shared/fs.js",
  "/pwa/fitness/_shared/util.js",
  "/pwa/fitness/_shared/markdown.js",
  "/pwa/fitness/journal/",
  "/pwa/fitness/journal/index.html",
  "/pwa/fitness/journal/app.js",
  "/pwa/fitness/habits/",
  "/pwa/fitness/habits/index.html",
  "/pwa/fitness/habits/app.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)));
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

  // Always prefer live data for API routes.
  if (url.pathname.startsWith("/api/")) return;

  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});
