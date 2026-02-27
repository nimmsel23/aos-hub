"use strict";

const CACHE  = "focus-v2";
const STATIC = [
  "/pwa/focus/",
  "/pwa/focus/index.html",
  "/pwa/focus/style.css",
  "/pwa/focus/app.js",
  "/pwa/gas-fallback.js",
  "/pwa/focus/manifest.json",
  "/pwa/focus/icon-192.svg",
];

// ── Install: cache static assets ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-only for /api/, cache-first otherwise ─────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always go to network for API calls
  if (url.pathname.startsWith("/api/")) {
    return; // let browser handle it natively
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache valid GET responses
        if (
          event.request.method === "GET" &&
          response.status === 200 &&
          response.type !== "opaque"
        ) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
