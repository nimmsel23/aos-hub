"use strict";

const routeGrid = document.getElementById("routeGrid");
const portGrid = document.getElementById("portGrid");
const menuGrid = document.getElementById("menuGrid");
const refreshBtn = document.getElementById("refresh");

const ROUTES = [
  { label: "Index", path: "/" },
  { label: "Vital Hub Admin (Clientctx)", path: "http://127.0.0.1:8788/clientctx/" },
  { label: "Vital Hub Client (Sample)", path: "http://127.0.0.1:4100/c/client/" },
  { label: "Vital Hub Fitness Tracker (Sample)", path: "http://127.0.0.1:4100/c/client/fitness/" },
  { label: "Vital Hub Private Tracker", path: "http://127.0.0.1:8788/fitness/" },
  { label: "PWA Game", path: "/pwa/game/" },
  { label: "PWA Core4", path: "/pwa/core4/" },
  { label: "PWA Fire", path: "/pwa/fire/" },
  { label: "PWA Focus", path: "/pwa/focus/" },
  { label: "PWA Frame", path: "/pwa/frame/" },
  { label: "PWA Freedom", path: "/pwa/freedom/" },
  { label: "PWA Door", path: "/pwa/door/" },
  { label: "Game Hub", path: "/game/" },
  { label: "Game Tent", path: "/game/tent" },
  { label: "Bridge", path: "/bridge" },
  { label: "Memoirs", path: "/memoirs/" },
];

function renderRoutes() {
  const base = window.location.origin;
  routeGrid.innerHTML = ROUTES.map((r) => {
    const url = /^https?:\/\//.test(r.path) ? r.path : base + r.path;
    return `
      <a class="item" href="${url}" target="_blank" rel="noopener">
        <div class="item-title">${r.label}</div>
        <div class="item-sub">${url}</div>
      </a>
    `;
  }).join("");
}

async function renderPorts() {
  portGrid.innerHTML = "<div class=\"item\"><div class=\"item-sub\">Loading…</div></div>";
  try {
    const res = await fetch("/api/system/ports", { cache: "no-store" });
    const data = await res.json();
    const ports = Array.isArray(data?.ports) ? data.ports : [];
    portGrid.innerHTML = ports.map((p) => {
      const statusClass = p.ok ? "ok" : "down";
      const label = p.ok ? "UP" : "DOWN";
      return `
        <div class="item">
          <div class="item-title">Port ${p.port}</div>
          <div class="badge ${statusClass}">${label}</div>
        </div>
      `;
    }).join("");
  } catch {
    portGrid.innerHTML = "<div class=\"item\"><div class=\"item-sub\">Failed to load ports</div></div>";
  }
}

async function renderMenu() {
  menuGrid.innerHTML = "<div class=\"item\"><div class=\"item-sub\">Loading…</div></div>";
  try {
    const res = await fetch("/menu", { cache: "no-store" });
    const data = await res.json();
    const links = Array.isArray(data?.links) ? data.links : [];
    if (!links.length) {
      menuGrid.innerHTML = "<div class=\"item\"><div class=\"item-sub\">No menu links</div></div>";
      return;
    }
    menuGrid.innerHTML = links.map((l) => {
      const label = String(l.label || "Link");
      const url = String(l.url || l.cmd || "");
      return `
        <a class="item" href="${url}" target="_blank" rel="noopener">
          <div class="item-title">${label}</div>
          <div class="item-sub">${url}</div>
        </a>
      `;
    }).join("");
  } catch {
    menuGrid.innerHTML = "<div class=\"item\"><div class=\"item-sub\">Failed to load menu</div></div>";
  }
}

async function refreshAll() {
  renderRoutes();
  await renderPorts();
  await renderMenu();
}

refreshBtn?.addEventListener("click", refreshAll);
refreshAll();
