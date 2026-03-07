"use strict";

(() => {
  const CACHE_KEY = "aos:pwa:gas-fallback:v1";
  const REDIRECT_GUARD_KEY = "aos:pwa:gas-fallback:last-redirect";
  const CONFIG_TIMEOUT_MS = 1800;
  const HEALTH_TIMEOUT_MS = 1200;

  const state = {
    app: "",
    routes: {},
    loaded: false,
  };

  function nowMs() {
    return Date.now();
  }

  function safeJsonParse(raw, fallback) {
    try {
      return JSON.parse(String(raw || ""));
    } catch {
      return fallback;
    }
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      const parsed = safeJsonParse(raw, {});
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeCache(payload) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload || {}));
    } catch {
      // ignore storage failures
    }
  }

  function mergeRoutes(routes) {
    if (!routes || typeof routes !== "object") return;
    state.routes = {
      ...(state.routes || {}),
      ...routes,
    };
  }

  function routeFor(appKey) {
    return String((state.routes || {})[String(appKey || "").toLowerCase()] || "").trim();
  }

  function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout")), ms);
      Promise.resolve(promise)
        .then((value) => {
          clearTimeout(t);
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(t);
          reject(err);
        });
    });
  }

  async function loadFreshConfig(appKey) {
    const app = String(appKey || "").toLowerCase().trim();
    const url = `/api/pwa/gas-fallback?app=${encodeURIComponent(app)}`;
    const res = await withTimeout(fetch(url, { cache: "no-store" }), CONFIG_TIMEOUT_MS);
    if (!res.ok) throw new Error(`fallback_config_http_${res.status}`);
    const data = await res.json();
    if (!data || data.ok !== true) throw new Error("fallback_config_invalid");
    mergeRoutes(data.routes || {});
    if (data.app && data.url) {
      mergeRoutes({ [String(data.app).toLowerCase()]: String(data.url) });
    }
    writeCache({ routes: state.routes, ts: nowMs() });
    state.loaded = true;
    return data;
  }

  function shouldSkipRedirect(url) {
    const target = String(url || "").trim();
    if (!target) return true;
    try {
      if (window.location.href.startsWith(target)) return true;
    } catch {
      // ignore
    }
    try {
      const last = Number(sessionStorage.getItem(REDIRECT_GUARD_KEY) || 0);
      if (nowMs() - last < 5000) return true;
    } catch {
      // ignore
    }
    return false;
  }

  function redirectTo(url) {
    if (shouldSkipRedirect(url)) return false;
    try {
      sessionStorage.setItem(REDIRECT_GUARD_KEY, String(nowMs()));
    } catch {
      // ignore
    }
    window.location.replace(String(url).trim());
    return true;
  }

  function maybeRedirect(reason = "") {
    const app = String(state.app || "").toLowerCase().trim();
    if (!app) return false;
    const url = routeFor(app);
    if (!url) return false;
    if (reason) {
      try {
        console.warn(`[aos-gas-fallback] redirecting app=${app} reason=${reason}`);
      } catch {
        // ignore
      }
    }
    return redirectTo(url);
  }

  async function probeNodeHealth() {
    const res = await withTimeout(fetch("/health", { cache: "no-store" }), HEALTH_TIMEOUT_MS);
    if (!res.ok) throw new Error(`health_http_${res.status}`);
    return true;
  }

  async function init(appKey) {
    const app = String(appKey || "").toLowerCase().trim();
    state.app = app;
    const cached = readCache();
    mergeRoutes(cached.routes || {});

    // Fire-and-forget config refresh. Cache is enough for offline redirection.
    loadFreshConfig(app).catch(() => {});

    // Proactive redirect when node is unreachable.
    try {
      await probeNodeHealth();
    } catch {
      maybeRedirect("health_unreachable");
    }
  }

  async function fetchWithFallback(input, initOpts = {}, opts = {}) {
    const app = String(opts.app || state.app || "").toLowerCase().trim();
    if (app && !state.app) state.app = app;
    try {
      const res = await fetch(input, initOpts);
      if (!res.ok && res.status >= 500) {
        maybeRedirect(`http_${res.status}`);
      }
      return res;
    } catch (err) {
      maybeRedirect("fetch_error");
      throw err;
    }
  }

  window.aosGasFallback = {
    init,
    fetch: fetchWithFallback,
    maybeRedirect,
    loadConfig: loadFreshConfig,
  };
})();
