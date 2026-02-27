"use strict";
window.aosGasFallback?.init?.("fitness");

const apiStatusEl = document.getElementById("apiStatus");
const repoHintEl = document.getElementById("repoHint");

function setApiStatus(text) {
  if (apiStatusEl) apiStatusEl.textContent = text;
}

async function loadStatus() {
  try {
    const netFetch = window.aosGasFallback?.fetch
      ? window.aosGasFallback.fetch
      : fetch;
    const res = await netFetch("/api/fitness-centre/status", { cache: "no-store" }, { app: "fitness" });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);

    setApiStatus(data.repo?.exists ? "server: repo found" : "server: repo missing");
    if (repoHintEl) {
      const repoPath = data.repo?.path || "";
      const habitsCount = Number.isFinite(data.habits?.count) ? data.habits.count : 0;
      const envState = data.fitness_env?.exists ? "env ok" : "env missing";
      const teleState = data.telegram?.token_configured
        ? (data.telegram?.chat_id_configured ? "telegram ready" : "telegram token only")
        : "telegram not configured";
      repoHintEl.innerHTML =
        `Server repo path: <code>${repoPath}</code> · habits: <code>${habitsCount}</code> · ${envState} · ${teleState}`;
    }
  } catch (err) {
    setApiStatus("server: offline");
    if (repoHintEl) {
      repoHintEl.textContent = `Could not load endpoint status (${err.message}).`;
    }
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/pwa/fitness/sw.js", { scope: "/pwa/fitness/" }).catch(() => {});
}

loadStatus();
