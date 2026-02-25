"use strict";

const apiStatusEl = document.getElementById("apiStatus");
const repoHintEl = document.getElementById("repoHint");

function setApiStatus(text) {
  if (apiStatusEl) apiStatusEl.textContent = text;
}

async function loadStatus() {
  try {
    const res = await fetch("/api/fitness-centre/status", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);

    setApiStatus(data.repo?.exists ? "server: repo found" : "server: repo missing");
    if (repoHintEl) {
      const repoPath = data.repo?.path || "";
      const habitsCount = Number.isFinite(data.habits?.count) ? data.habits.count : 0;
      repoHintEl.innerHTML =
        `Server repo path: <code>${repoPath}</code> · habits configured: <code>${habitsCount}</code>`;
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
