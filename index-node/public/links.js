"use strict";

const routeGrid = document.getElementById("routeGrid");
const portGrid = document.getElementById("portGrid");
const menuGrid = document.getElementById("menuGrid");
const tailscaleGrid = document.getElementById("tailscaleGrid");
const refreshBtn = document.getElementById("refresh");
const tabLocal = document.getElementById("tabLocal");
const tabTailscale = document.getElementById("tabTailscale");
const viewLocal = document.getElementById("viewLocal");
const viewTailscale = document.getElementById("viewTailscale");

// Relative zu diesem Host (lokal: localhost:8799)
const ROUTES = [
  { label: "Index Node", path: "/" },
  { label: "Konsole", path: "/konsole/" },
  { label: "Klienten (Coach)", path: "/klienten/" },
  { label: "Klient-Zugang", path: "http://127.0.0.1:4200/" },
  { label: "Vital Coach", path: "http://127.0.0.1:8800/" },
  { label: "Fitness Centre", path: "http://127.0.0.1:9002/fitness/" },
  { label: "Fuel Centre", path: "http://127.0.0.1:9000/fuel/" },
  { label: "Entspannungs Centre", path: "http://127.0.0.1:9001/" },
  { label: "Dev Server", path: "http://127.0.0.1:9099/" },
  { label: "PWA", path: "/pwa/" },
  { label: "PWA Game", path: "/pwa/game/" },
  { label: "PWA Core4", path: "/pwa/core4/" },
  { label: "PWA Fire", path: "/pwa/fire/" },
  { label: "PWA Focus", path: "/pwa/focus/" },
  { label: "PWA Frame", path: "/pwa/frame/" },
  { label: "PWA Freedom", path: "/pwa/freedom/" },
  { label: "PWA Door", path: "/pwa/door/" },
  { label: "PWA Memoirs", path: "/pwa/memoirs/" },
  { label: "Game Hub", path: "/game/" },
  { label: "Game Tent", path: "/game/tent" },
  { label: "Bridge", path: "http://127.0.0.1:8080/" },
];

const TS = "https://ideapad.tail7a15d6.ts.net";
const TAILSCALE_ROUTES = [
  { label: "Klient-Zugang", path: "/" },
  { label: "αOS Index Node", path: "/aos" },
  { label: "Bridge", path: "/bridge" },
  { label: "Vital Coach", path: "/coach" },
  { label: "Klientenverwaltung", path: "/Klientenverwaltung" },
  { label: "Client Forge", path: "/ClientForge" },
  { label: "PWA", path: "/pwa" },
  { label: "Core4 ctx", path: "/core4ctx" },
  { label: "Fire ctx", path: "/firectx" },
  { label: "Focus ctx", path: "/focusctx" },
  { label: "Frame ctx", path: "/framectx" },
  { label: "Freedom ctx", path: "/freedomctx" },
  { label: "Door ctx", path: "/doorctx" },
  { label: "Game ctx", path: "/gamectx" },
  { label: "Memoirs ctx", path: "/memoirsctx" },
  { label: "Fitness ctx", path: "/fitnessctx" },
  { label: "Fuel ctx", path: "/fuelctx" },
  { label: "Relax ctx", path: "/relaxctx" },
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

function renderTailscale() {
  tailscaleGrid.innerHTML = TAILSCALE_ROUTES.map((r) => {
    const url = TS + r.path;
    return `
      <a class="item" href="${url}" target="_blank" rel="noopener">
        <div class="item-title">${r.label}</div>
        <div class="item-sub">${url}</div>
      </a>
    `;
  }).join("");
}

tabLocal.addEventListener("click", () => {
  viewLocal.style.display = "";
  viewTailscale.style.display = "none";
  tabLocal.classList.add("btn-active");
  tabTailscale.classList.remove("btn-active");
});

tabTailscale.addEventListener("click", () => {
  viewLocal.style.display = "none";
  viewTailscale.style.display = "";
  tabTailscale.classList.add("btn-active");
  tabLocal.classList.remove("btn-active");
});

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
  renderTailscale();
  await renderPorts();
  await renderMenu();
}

refreshBtn?.addEventListener("click", refreshAll);
refreshAll();
