"use strict";

const CACHE = "game-v2";
const STATIC = [
  "/pwa/game/",
  "/pwa/game/index.html",
  "/pwa/game/style.css",
  "/pwa/game/app.js",
  "/pwa/game/manifest.json",
  "/pwa/game/icon-192-v2.svg",
  "/pwa/game/icon-512-v2.svg",
  "/pwa/gas-fallback.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (event.request.method === "GET" && response.status === 200 && response.type !== "opaque") {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
