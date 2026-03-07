"use strict";

const CACHE_KEY = "aos-door-hub-snapshot-v1";

const state = {
  activeItems: [],
  productionSummary: null,
  completedDoors: [],
  snapshotTime: "",
  online: navigator.onLine,
  installPrompt: null,
};

const refs = {
  onlineDot: document.getElementById("onlineDot"),
  onlineLabel: document.getElementById("onlineLabel"),
  updatedLabel: document.getElementById("updatedLabel"),
  summaryLine: document.getElementById("summaryLine"),
  refreshBtn: document.getElementById("refreshBtn"),
  installBtn: document.getElementById("installBtn"),
  potentialCount: document.getElementById("potentialCount"),
  potentialMeta: document.getElementById("potentialMeta"),
  planCount: document.getElementById("planCount"),
  planMeta: document.getElementById("planMeta"),
  productionCount: document.getElementById("productionCount"),
  productionMeta: document.getElementById("productionMeta"),
  profitCount: document.getElementById("profitCount"),
  profitMeta: document.getElementById("profitMeta"),
  potentialState: document.getElementById("potentialState"),
  planState: document.getElementById("planState"),
  productionState: document.getElementById("productionState"),
  profitState: document.getElementById("profitState"),
  quadrantGrid: document.getElementById("quadrantGrid"),
  planSignalNote: document.getElementById("planSignalNote"),
  untriagedCount: document.getElementById("untriagedCount"),
  openHitsCount: document.getElementById("openHitsCount"),
  completedDoorsCount: document.getElementById("completedDoorsCount"),
  pulseNote: document.getElementById("pulseNote"),
};

function loadSnapshot() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_err) {
    return null;
  }
}

function saveSnapshot() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      activeItems: state.activeItems,
      productionSummary: state.productionSummary,
      completedDoors: state.completedDoors,
      snapshotTime: state.snapshotTime,
    }));
  } catch (_err) {
    // Ignore local cache failures.
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

function formatTime(value) {
  if (!value) return "Snapshot pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Snapshot pending";
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function apiJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || payload.message || response.statusText || "request_failed");
  }
  return payload.data || payload;
}

function quadrantStats(items) {
  const buckets = { 1: 0, 2: 0, 3: 0, 4: 0, none: 0 };
  for (const item of items) {
    const quadrant = Number(item?.quadrant);
    if (quadrant >= 1 && quadrant <= 4) {
      buckets[quadrant] += 1;
    } else {
      buckets.none += 1;
    }
  }
  return buckets;
}

function bestQuadrantLabel(stats) {
  const entries = [
    [1, "Q1 pressure"],
    [2, "Q2 leverage"],
    [3, "Q3 drag"],
    [4, "Q4 noise"],
  ];
  let winner = ["", 0];
  for (const [quadrant, label] of entries) {
    const count = stats[quadrant] || 0;
    if (count > winner[1]) winner = [label, count];
  }
  return winner[1] ? winner[0] : "No quadrant signal";
}

function renderQuadrants(stats) {
  refs.quadrantGrid.innerHTML = [
    { key: 1, label: "Critical" },
    { key: 2, label: "Strategic" },
    { key: 3, label: "Reactive" },
    { key: 4, label: "Noise" },
  ].map((entry) => `
    <div class="quadrant">
      <span>Q${entry.key}</span>
      <strong>${stats[entry.key] || 0}</strong>
      <small>${escapeHtml(entry.label)}</small>
    </div>
  `).join("");
}

function render() {
  const stats = quadrantStats(state.activeItems);
  const activeCount = state.activeItems.length;
  const triagedCount = activeCount - stats.none;
  const productionSummary = state.productionSummary || {};
  const completedDoors = state.completedDoors.length;
  const openHits = Number(productionSummary.open_hits || 0);
  const totalHits = Number(productionSummary.total_hits || 0);

  refs.onlineDot.classList.toggle("is-online", state.online);
  refs.onlineLabel.textContent = state.online ? "Online" : "Offline snapshot";
  refs.updatedLabel.textContent = `Updated ${formatTime(state.snapshotTime)}`;
  refs.summaryLine.textContent =
    activeCount
      ? `${activeCount} live ideas across the Door pipeline.`
      : "No live Door items found right now.";

  refs.potentialCount.textContent = String(activeCount);
  refs.potentialMeta.textContent = `${stats.none} untriaged · ${stats[1]} critical`;
  refs.planCount.textContent = String(triagedCount);
  refs.planMeta.textContent = `${bestQuadrantLabel(stats)} · ${stats.none} still open`;
  refs.productionCount.textContent = String(openHits);
  refs.productionMeta.textContent = `${totalHits} total hits in scope`;
  refs.profitCount.textContent = String(completedDoors);
  refs.profitMeta.textContent = `${completedDoors ? "Completed doors ready for review" : "No completed doors yet"}`;

  refs.potentialState.textContent = stats.none ? "CAPTURE" : "READY";
  refs.planState.textContent = triagedCount ? "TRIAGED" : "QUEUE";
  refs.productionState.textContent = openHits ? "IN FLIGHT" : "CLEAR";
  refs.profitState.textContent = completedDoors ? "REVIEWABLE" : "QUIET";

  renderQuadrants(stats);
  refs.planSignalNote.textContent =
    triagedCount
      ? `${triagedCount} active entries already carry a quadrant.`
      : "Plan is still empty. Assign quadrants from the active hot list.";

  refs.untriagedCount.textContent = String(stats.none);
  refs.openHitsCount.textContent = String(openHits);
  refs.completedDoorsCount.textContent = String(completedDoors);
  refs.pulseNote.textContent =
    openHits
      ? `${openHits} hits are still open in Production.`
      : stats.none
        ? "The bottleneck is still triage, not execution."
        : "Execution lane is clear.";
}

async function refresh() {
  try {
    refs.summaryLine.textContent = "Refreshing Door telemetry…";
    const [potentialData, productionData, profitData] = await Promise.all([
      apiJson("/api/door/potential/hotlist?mode=active"),
      apiJson("/api/door/production/hits/week"),
      apiJson("/api/door/profit/completed"),
    ]);

    state.activeItems = Array.isArray(potentialData.items) ? potentialData.items : [];
    state.productionSummary = productionData.summary || null;
    state.completedDoors = Array.isArray(profitData.completed) ? profitData.completed : [];
    state.snapshotTime = new Date().toISOString();
    state.online = true;
    saveSnapshot();
  } catch (_err) {
    const snapshot = loadSnapshot();
    if (snapshot) {
      state.activeItems = Array.isArray(snapshot.activeItems) ? snapshot.activeItems : [];
      state.productionSummary = snapshot.productionSummary || null;
      state.completedDoors = Array.isArray(snapshot.completedDoors) ? snapshot.completedDoors : [];
      state.snapshotTime = snapshot.snapshotTime || "";
    }
    state.online = false;
  }
  render();
}

function bindPhaseCards() {
  document.querySelectorAll("[data-route]").forEach((card) => {
    const route = trimText(card.getAttribute("data-route"));
    if (!route) return;
    const open = () => {
      window.location.href = route;
    };
    card.addEventListener("click", open);
    const button = card.querySelector(".launch");
    button?.addEventListener("click", (event) => {
      event.stopPropagation();
      open();
    });
  });
}

function bindInstall() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
    refs.installBtn.hidden = false;
  });

  refs.installBtn.addEventListener("click", async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    try {
      await state.installPrompt.userChoice;
    } catch (_err) {
      // Ignore.
    }
    state.installPrompt = null;
    refs.installBtn.hidden = true;
  });
}

function init() {
  bindPhaseCards();
  bindInstall();
  refs.refreshBtn.addEventListener("click", refresh);
  window.addEventListener("online", () => {
    state.online = true;
    refresh();
  });
  window.addEventListener("offline", () => {
    state.online = false;
    render();
  });
  refresh();
}

init();
