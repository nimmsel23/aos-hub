"use strict";
window.aosGasFallback?.init?.("game");

// ── Config ────────────────────────────────────────────────────────────────────

const DOMAINS = [
  { key: "body",     label: "BODY",     icon: "🏋" },
  { key: "being",    label: "BEING",    icon: "🧘" },
  { key: "balance",  label: "BALANCE",  icon: "👥" },
  { key: "business", label: "BUSINESS", icon: "⚡" },
];

const MAPS = {
  frame: {
    label: "FRAME",
    subtitle: "Frame Map · Start Here",
    accent: "#7ec8a0",
    accentDim: "rgba(126,200,160,.12)",
    route: "/pwa/frame/",
  },
  freedom: {
    label: "FREEDOM",
    subtitle: "Freedom Map · Ideal Parallel World",
    accent: "#e8a838",
    accentDim: "rgba(232,168,56,.12)",
    route: "/pwa/freedom/",
  },
  focus: {
    label: "FOCUS",
    subtitle: "Focus Map · Monthly Mission",
    accent: "#6a9cf5",
    accentDim: "rgba(106,156,245,.12)",
    route: "/pwa/focus/",
  },
  fire: {
    label: "FIRE",
    subtitle: "Fire Map · Daily Execution",
    accent: "#e8734a",
    accentDim: "rgba(232,115,74,.12)",
    route: "/pwa/fire/",
  },
};

// ── State ─────────────────────────────────────────────────────────────────────

let currentMap = "frame";

// ── Helpers ───────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// ── Accent Switcher ───────────────────────────────────────────────────────────

function setAccent(mapKey) {
  const map = MAPS[mapKey];
  if (!map) return;
  document.documentElement.style.setProperty("--accent", map.accent);
  document.documentElement.style.setProperty("--accent-dim", map.accentDim);
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderCards(mapKey) {
  const map = MAPS[mapKey];
  const root = $("cards");
  root.innerHTML = "";

  DOMAINS.forEach((d) => {
    const card = document.createElement("div");
    card.className = "domain-card";
    card.onclick = () => {
      // Navigate to specific map PWA with domain pre-selected
      const url = `${map.route}?domain=${d.key}`;
      location.href = url;
    };

    card.innerHTML = `
      <div class="dc-header">
        <div class="dc-title">${d.label}</div>
        <div class="dc-icon">${d.icon}</div>
      </div>
      <div class="dc-preview">
        ${map.label} → ${d.label} Domain
      </div>
      <div class="dc-meta">
        <div class="dc-meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <span>ENTER ${map.label}</span>
        </div>
      </div>
    `;

    root.appendChild(card);
  });
}

// ── Tab Switching ─────────────────────────────────────────────────────────────

function switchMap(mapKey) {
  if (currentMap === mapKey) return;
  currentMap = mapKey;

  // Update tab UI
  $$(".tn-tab").forEach((tab) => {
    if (tab.dataset.map === mapKey) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // Update subtitle
  const map = MAPS[mapKey];
  $("appSubtitle").textContent = map.subtitle;

  // Update accent
  setAccent(mapKey);

  // Render cards
  renderCards(mapKey);
}

// ── Event Listeners ───────────────────────────────────────────────────────────

$$(".tn-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const mapKey = tab.dataset.map;
    switchMap(mapKey);
  });
});

// ── Boot ──────────────────────────────────────────────────────────────────────

setAccent(currentMap);
$("appSubtitle").textContent = MAPS[currentMap].subtitle;
renderCards(currentMap);
