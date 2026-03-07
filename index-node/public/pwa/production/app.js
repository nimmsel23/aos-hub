"use strict";

const STORAGE = {
  filter: "aos-door-production-filter-v1",
  search: "aos-door-production-search-v1",
  selected: "aos-door-production-selected-v1",
};

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "done", label: "Done" },
  { key: "all", label: "All" },
];

const state = {
  hits: [],
  summary: null,
  filter: loadString(STORAGE.filter, "open"),
  search: loadString(STORAGE.search, ""),
  selected: loadString(STORAGE.selected, ""),
  online: navigator.onLine,
  busy: false,
  status: "Booting...",
};

const refs = {
  refreshBtn: document.getElementById("refreshBtn"),
  filterNav: document.getElementById("filterNav"),
  searchInput: document.getElementById("searchInput"),
  weekLabel: document.getElementById("weekLabel"),
  openCount: document.getElementById("openCount"),
  doneCount: document.getElementById("doneCount"),
  rateValue: document.getElementById("rateValue"),
  rateBar: document.getElementById("rateBar"),
  onlineDot: document.getElementById("onlineDot"),
  onlineLabel: document.getElementById("onlineLabel"),
  statusMeta: document.getElementById("statusMeta"),
  viewTitle: document.getElementById("viewTitle"),
  listMeta: document.getElementById("listMeta"),
  hitList: document.getElementById("hitList"),
  detailPanel: document.getElementById("detailPanel"),
};

function loadString(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (_err) {
    return fallback;
  }
}

function saveString(key, value) {
  try {
    localStorage.setItem(key, String(value || ""));
  } catch (_err) {
    // Ignore storage failures.
  }
}

function trimText(value) {
  return String(value == null ? "" : value).trim();
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function apiJson(url, options = {}) {
  const init = { ...options };
  init.headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || payload.message || response.statusText || "request_failed");
  }
  return payload.data || payload;
}

function setBusy(nextBusy) {
  state.busy = Boolean(nextBusy);
  refs.refreshBtn.disabled = state.busy;
}

function setStatus(message) {
  state.status = trimText(message) || "Ready.";
  refs.statusMeta.textContent = state.status;
}

function persistState() {
  saveString(STORAGE.filter, state.filter);
  saveString(STORAGE.search, state.search);
  saveString(STORAGE.selected, state.selected);
}

function visibleHits() {
  const query = trimText(state.search).toLowerCase();
  return state.hits.filter((hit) => {
    if (state.filter === "open" && hit.done) return false;
    if (state.filter === "done" && !hit.done) return false;
    if (!query) return true;
    return [
      hit.fact,
      hit.door_title,
      hit.obstacle,
      hit.strike,
      hit.responsibility,
    ].join(" ").toLowerCase().includes(query);
  });
}

function ensureSelection() {
  const visible = visibleHits();
  const currentVisible = visible.find((hit) => hit.id === state.selected);
  if (currentVisible) return;
  state.selected = visible[0]?.id || state.hits[0]?.id || "";
  persistState();
}

function selectedHit() {
  return state.hits.find((hit) => hit.id === state.selected) || null;
}

function renderFilters() {
  refs.filterNav.innerHTML = FILTERS.map((filter) => `
    <button class="filter-button ${state.filter === filter.key ? "is-active" : ""}" type="button" data-filter="${filter.key}">
      ${escapeHtml(filter.label)}
    </button>
  `).join("");

  refs.filterNav.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.getAttribute("data-filter") || "open";
      persistState();
      render();
    });
  });
}

function renderSummary() {
  const summary = state.summary || {
    week: "This Week",
    total_hits: state.hits.length,
    completed_hits: state.hits.filter((hit) => hit.done).length,
    open_hits: state.hits.filter((hit) => !hit.done).length,
    completion_rate: state.hits.length ? state.hits.filter((hit) => hit.done).length / state.hits.length : 0,
  };
  refs.weekLabel.textContent = summary.week || "This Week";
  refs.openCount.textContent = String(summary.open_hits || 0);
  refs.doneCount.textContent = String(summary.completed_hits || 0);
  const percent = Math.round((Number(summary.completion_rate) || 0) * 100);
  refs.rateValue.textContent = `${percent}%`;
  refs.rateBar.style.width = `${percent}%`;
}

function renderList() {
  const hits = visibleHits();
  refs.viewTitle.textContent = FILTERS.find((filter) => filter.key === state.filter)?.label || "Hits";
  refs.listMeta.textContent = `${hits.length} visible / ${state.hits.length} total`;

  if (!hits.length) {
    refs.hitList.innerHTML = `<div class="empty-state">No hits in this view yet.</div>`;
    return;
  }

  refs.hitList.innerHTML = hits.map((hit) => `
    <article class="hit-card ${state.selected === hit.id ? "is-selected" : ""}" data-select="${escapeHtml(hit.id)}">
      <div class="hit-top">
        <div>
          <h4 class="hit-title">${escapeHtml(hit.fact || "Untitled Hit")}</h4>
          <div class="hit-door">${escapeHtml(hit.door_title || "No door title")}</div>
        </div>
        <button class="toggle-button ${hit.done ? "is-done" : ""}" type="button" data-toggle="${escapeHtml(hit.id)}">
          ${hit.done ? "Reopen" : "Done"}
        </button>
      </div>
      <div class="hit-note">${escapeHtml(hit.strike || hit.obstacle || "No strike yet.")}</div>
      <div class="hit-meta">
        <span>${escapeHtml(hit.done ? "completed" : "open")}</span>
        <span>${escapeHtml(formatDate(hit.completed_at || hit.created_at))}</span>
      </div>
    </article>
  `).join("");

  refs.hitList.querySelectorAll("[data-select]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("[data-toggle]")) return;
      state.selected = card.getAttribute("data-select") || "";
      persistState();
      render();
    });
  });

  refs.hitList.querySelectorAll("[data-toggle]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const id = button.getAttribute("data-toggle");
      if (!id || state.busy) return;
      await toggleHit(id);
    });
  });
}

function renderDetail() {
  const hit = selectedHit();
  if (!hit) {
    refs.detailPanel.innerHTML = `
      <div class="empty-state">
        Select a hit to inspect the strike, obstacle, and responsibility.
      </div>
    `;
    return;
  }

  refs.detailPanel.innerHTML = `
    <div>
      <div class="eyebrow">Selected Hit</div>
      <h2>${escapeHtml(hit.fact || "Untitled Hit")}</h2>
      <div class="detail-meta">${escapeHtml(hit.door_title || "No linked door")} · ${escapeHtml(hit.week || "Current week")}</div>
    </div>
    <section class="detail-block">
      <h3>Strike</h3>
      <p>${escapeHtml(hit.strike || "No strike defined.")}</p>
    </section>
    <section class="detail-block">
      <h3>Obstacle</h3>
      <p>${escapeHtml(hit.obstacle || "No obstacle recorded.")}</p>
    </section>
    <section class="detail-block">
      <h3>Responsibility</h3>
      <p>${escapeHtml(hit.responsibility || "No responsibility statement recorded.")}</p>
    </section>
    <section class="detail-block">
      <h3>Status</h3>
      <ul>
        <li>State: ${escapeHtml(hit.done ? "done" : "open")}</li>
        <li>Created: ${escapeHtml(formatDate(hit.created_at))}</li>
        <li>Completed: ${escapeHtml(formatDate(hit.completed_at))}</li>
      </ul>
    </section>
  `;
}

function updateOnlineState() {
  refs.onlineDot.classList.toggle("is-online", state.online);
  refs.onlineLabel.textContent = state.online ? "Online" : "Offline";
}

function render() {
  ensureSelection();
  renderFilters();
  renderSummary();
  renderList();
  renderDetail();
  updateOnlineState();
  refs.searchInput.value = state.search;
}

async function refreshData() {
  setBusy(true);
  setStatus("Loading production hits...");
  try {
    const [hitsPayload, summaryPayload] = await Promise.all([
      apiJson("/api/door/production/hits"),
      apiJson("/api/door/production/hits/week"),
    ]);
    state.hits = Array.isArray(hitsPayload.hits) ? hitsPayload.hits : [];
    state.summary = summaryPayload.summary || null;
    if (hitsPayload.week && !state.summary?.week) {
      state.summary = { ...(state.summary || {}), week: hitsPayload.week };
    }
    ensureSelection();
    render();
    setStatus("Production sync is current.");
  } catch (err) {
    setStatus(`Sync failed: ${String(err.message || err)}`);
  } finally {
    setBusy(false);
  }
}

async function toggleHit(id) {
  setBusy(true);
  setStatus("Updating hit...");
  try {
    await apiJson(`/api/door/production/hits/${encodeURIComponent(id)}/toggle`, {
      method: "POST",
    });
    await refreshData();
  } catch (err) {
    setStatus(`Update failed: ${String(err.message || err)}`);
    setBusy(false);
  }
}

function bindEvents() {
  refs.refreshBtn.addEventListener("click", () => {
    refreshData();
  });
  refs.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value || "";
    persistState();
    render();
  });
  window.addEventListener("online", () => {
    state.online = true;
    updateOnlineState();
  });
  window.addEventListener("offline", () => {
    state.online = false;
    updateOnlineState();
  });
}

bindEvents();
render();
refreshData();
