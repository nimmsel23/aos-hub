"use strict";

const VERSION = "door-v3";
const SCOPE_PATH = (() => {
  const path = new URL(self.registration.scope).pathname;
  return path.endsWith("/") ? path : `${path}/`;
})();
const SCOPE_KEY = SCOPE_PATH.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "root";
const STATIC_CACHE = `${VERSION}-static-${SCOPE_KEY}`;
const API_CACHE = `${VERSION}-api-${SCOPE_KEY}`;
const STATIC = [
  SCOPE_PATH,
  `${SCOPE_PATH}index.html`,
  `${SCOPE_PATH}manifest.json`,
  `${SCOPE_PATH}hub.css`,
  `${SCOPE_PATH}hub.js`,
  "/pwa/door/style.css",
  "/pwa/door/app.js",
  "/pwa/door/icon-192.svg",
  "/pwa/door/icon-512.svg",
];

async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type !== "opaque") {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (request.method === "GET" && response.status === 200 && response.type !== "opaque") {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(`${VERSION}-`) && key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") {
    return;
  }

  if (url.pathname.startsWith("/api/door/")) {
    event.respondWith(networkFirstApi(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return cache.match(`${SCOPE_PATH}index.html`);
      })
    );
    return;
  }

  if (
    url.pathname.startsWith(SCOPE_PATH) ||
    url.pathname.startsWith("/pwa/door/") ||
    url.pathname === "/pwa/gas-fallback.js"
  ) {
    event.respondWith(cacheFirstStatic(event.request));
  }
});
