const grid = document.getElementById("menuGrid");
const docGrid = document.getElementById("docGrid");
const gptGrid = document.getElementById("gptGrid");
const pwaLauncherMenu = document.getElementById("pwaLauncherMenu");

let lastHash = "";
let hadError = false;
let docsRendered = false;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function menuArrowForUrl(url) {
  return String(url || "").startsWith("/") ? "→" : "↗";
}

function hashLinks(links) {
  return JSON.stringify(links.map((x) => ({ label: x.label, url: x.url, cmd: x.cmd })));
}

function hashMobileLinks(links) {
  return JSON.stringify((links || []).map((x) => ({ label: x.label, url: x.url, target: x.target })));
}

function renderMobileLinks(links) {
  if (!pwaLauncherMenu) return;
  const items = Array.isArray(links) ? links : [];
  if (!items.length) {
    pwaLauncherMenu.innerHTML = `<span class="pwa-launcher-dim">No mobile links configured</span>`;
    return;
  }
  pwaLauncherMenu.innerHTML = items
    .map((x) => {
      const label = escapeHtml(x.label);
      const url = escapeHtml(x.url);
      const target = escapeHtml(x.target || "_self");
      return `<a class="pwa-launcher-item" href="${url}" target="${target}" rel="noopener noreferrer">${label}</a>`;
    })
    .join("");
}

async function loadMenu() {
  try {
    const res = await fetch("/menu", { cache: "no-store" });
    const data = await res.json();
    const links = Array.isArray(data?.links) ? data.links : [];
    const mobileLinks = Array.isArray(data?.mobile_links) ? data.mobile_links : [];
    const gptLinks = links.filter((x) => /gpt/i.test(x.label || ""));
    const mainLinks = links.filter((x) => !/gpt/i.test(x.label || ""));

    const h = `${hashLinks(links)}|${hashMobileLinks(mobileLinks)}`;
    if (h === lastHash) return;

    if (lastHash !== "") {
      grid.classList.add("glitching");
      setTimeout(() => grid.classList.remove("glitching"), 800);
    }

    lastHash = h;
    hadError = false;

    if (!links.length) {
      grid.innerHTML = `<div class="loading">No links configured.</div>`;
      if (gptGrid) gptGrid.innerHTML = "";
      renderMobileLinks(mobileLinks);
      return;
    }

    grid.innerHTML = mainLinks
      .map((x) => {
        const label = escapeHtml(x.label);
        const url = escapeHtml(x.url);
        const arrow = menuArrowForUrl(x.url);
        return `<a href="${url}" rel="noopener noreferrer"><span class="menu-card-label">${label}</span><span class="menu-card-arrow">${arrow}</span></a>`;
      })
      .join("");

    if (gptGrid) {
      gptGrid.innerHTML = gptLinks
        .map((x) => {
          const label = escapeHtml(x.label);
          const url = escapeHtml(x.url);
          return `<a class="gpt-card" href="${url}" rel="noopener noreferrer"><span class="gpt-card-label">${label}</span><span class="gpt-card-arrow">↗</span></a>`;
        })
        .join("");
    }
    renderMobileLinks(mobileLinks);
  } catch (_) {
    if (!hadError) {
      grid.innerHTML = `<div class="loading">Menu load failed</div>`;
      if (gptGrid) gptGrid.innerHTML = "";
      renderMobileLinks([]);
      hadError = true;
    }
  }
}

function renderDocButtons() {
  if (!docGrid || docsRendered) return;

  const docs = [
    { label: "Foundation", doc: "foundation" },
    { label: "Code", doc: "code" },
    { label: "Core", doc: "core" },
    { label: "Memoirs", doc: "memoirs" },
    { label: "Door", doc: "door" },
    { label: "Game", doc: "game" },
  ];

  docGrid.innerHTML = docs
    .map((doc) => {
      const label = escapeHtml(doc.label);
      const url = `/chapters.html?doc=${encodeURIComponent(doc.doc)}`;
      return `<a class="doc-card" href="${url}" rel="noopener noreferrer"><span class="doc-card-label">${label}</span><span class="doc-card-arrow">→</span></a>`;
    })
    .join("");

  docsRendered = true;
}

loadMenu();
setInterval(loadMenu, 1500);
renderDocButtons();

if (typeof window.initCore4Panel === "function") {
  window.initCore4Panel();
}
