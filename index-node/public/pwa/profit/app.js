"use strict";

const state = {
  completed: [],
  reflections: [],
  online: navigator.onLine,
  busy: false,
  status: "Booting...",
};

const refs = {
  refreshBtn: document.getElementById("refreshBtn"),
  completedCount: document.getElementById("completedCount"),
  reflectionCount: document.getElementById("reflectionCount"),
  onlineDot: document.getElementById("onlineDot"),
  onlineLabel: document.getElementById("onlineLabel"),
  statusLine: document.getElementById("statusLine"),
  toolbarMeta: document.getElementById("toolbarMeta"),
  completedList: document.getElementById("completedList"),
  reflectionList: document.getElementById("reflectionList"),
  reflectionForm: document.getElementById("reflectionForm"),
  doorTitleInput: document.getElementById("doorTitleInput"),
  reflectionInput: document.getElementById("reflectionInput"),
  winsInput: document.getElementById("winsInput"),
  lessonsInput: document.getElementById("lessonsInput"),
  nextInput: document.getElementById("nextInput"),
  saveBtn: document.getElementById("saveBtn"),
  resetBtn: document.getElementById("resetBtn"),
};

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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function splitLines(value) {
  return trimText(value)
    .split("\n")
    .map((entry) => trimText(entry))
    .filter(Boolean);
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
  refs.saveBtn.disabled = state.busy;
  refs.resetBtn.disabled = state.busy;
}

function setStatus(message) {
  state.status = trimText(message) || "Ready.";
  refs.statusLine.textContent = state.status;
}

function updateOnlineState() {
  refs.onlineDot.classList.toggle("is-online", state.online);
  refs.onlineLabel.textContent = state.online ? "Online" : "Offline";
}

function renderMetrics() {
  refs.completedCount.textContent = String(state.completed.length);
  refs.reflectionCount.textContent = String(state.reflections.length);
  refs.toolbarMeta.textContent = `${state.completed.length} completed doors`;
}

function renderCompleted() {
  if (!state.completed.length) {
    refs.completedList.innerHTML = `<div class="empty-state">No completed doors yet.</div>`;
    return;
  }

  refs.completedList.innerHTML = state.completed.map((entry) => `
    <button class="completed-card card-button" type="button" data-door="${escapeHtml(entry.door_title || "")}">
      <h4>${escapeHtml(entry.door_title || "Untitled Door")}</h4>
      <div class="completed-note">Week ${escapeHtml(entry.week || "-")} · ${escapeHtml(String(entry.hit_count || 0))} hits closed.</div>
      <div class="completed-meta">
        <span>completed</span>
        <span>${escapeHtml(formatDate(entry.completed_at || entry.created_at))}</span>
      </div>
    </button>
  `).join("");

  refs.completedList.querySelectorAll("[data-door]").forEach((button) => {
    button.addEventListener("click", () => {
      refs.doorTitleInput.value = button.getAttribute("data-door") || "";
      refs.reflectionInput.focus();
    });
  });
}

function renderReflections() {
  if (!state.reflections.length) {
    refs.reflectionList.innerHTML = `<div class="empty-state">No reflection files saved yet.</div>`;
    return;
  }

  refs.reflectionList.innerHTML = state.reflections.map((entry) => `
    <article class="reflection-card">
      <h4>${escapeHtml(entry.name || "reflection.md")}</h4>
      <div class="reflection-meta">
        <span>${escapeHtml(formatDate(entry.mtime))}</span>
        <span>${escapeHtml(String(entry.size || 0))} bytes</span>
      </div>
    </article>
  `).join("");
}

function render() {
  updateOnlineState();
  renderMetrics();
  renderCompleted();
  renderReflections();
}

async function refreshData() {
  setBusy(true);
  setStatus("Loading profit data...");
  try {
    const [completedPayload, reflectionsPayload] = await Promise.all([
      apiJson("/api/door/profit/completed"),
      apiJson("/api/door/profit/reflections"),
    ]);
    state.completed = Array.isArray(completedPayload.completed) ? completedPayload.completed : [];
    state.reflections = Array.isArray(reflectionsPayload.reflections) ? reflectionsPayload.reflections : [];
    render();
    setStatus("Profit data is current.");
  } catch (err) {
    setStatus(`Sync failed: ${String(err.message || err)}`);
  } finally {
    setBusy(false);
  }
}

async function saveReflection(event) {
  event.preventDefault();
  const doorTitle = trimText(refs.doorTitleInput.value);
  const reflection = trimText(refs.reflectionInput.value);
  if (!doorTitle && !reflection) {
    setStatus("Reflection text or a door title is required.");
    return;
  }

  setBusy(true);
  setStatus("Saving reflection...");
  try {
    await apiJson("/api/door/profit/reflection", {
      method: "POST",
      body: JSON.stringify({
        door_title: doorTitle,
        reflection,
        wins: splitLines(refs.winsInput.value),
        lessons: splitLines(refs.lessonsInput.value),
        next: splitLines(refs.nextInput.value),
      }),
    });
    refs.reflectionForm.reset();
    await refreshData();
  } catch (err) {
    setStatus(`Save failed: ${String(err.message || err)}`);
    setBusy(false);
  }
}

function bindEvents() {
  refs.refreshBtn.addEventListener("click", () => {
    refreshData();
  });
  refs.reflectionForm.addEventListener("submit", saveReflection);
  refs.resetBtn.addEventListener("click", () => {
    refs.reflectionForm.reset();
    setStatus("Reflection form cleared.");
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
