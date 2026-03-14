"use strict";

const STORAGE = {
  items: "aos-door-potential-cache-v1",
  queue: "aos-door-potential-queue-v1",
  filter: "aos-door-potential-filter-v1",
  selected: "aos-door-potential-selected-v1",
};

const LISTS = [
  { key: "active", label: "Inbox" },
  { key: "done", label: "Completed" },
  { key: "deleted", label: "Deleted" },
  { key: "all", label: "All" },
];

const state = {
  items: loadJson(STORAGE.items, []),
  queue: loadJson(STORAGE.queue, []),
  filter: loadString(STORAGE.filter, "active"),
  selected: loadString(STORAGE.selected, ""),
  search: "",
  online: navigator.onLine,
  busy: false,
  status: "Booting...",
  statusTone: "info",
};

// Helper to check ACTUAL server connectivity (not just navigator.onLine fake)
async function checkServerOnline() {
  try {
    const response = await fetch("/api/door/potential/hotlist?mode=active", {
      method: "HEAD",
      cache: "no-store",
    });
    return response.ok;
  } catch (_err) {
    return false;
  }
}

const refs = {
  listNav: document.getElementById("listNav"),
  captureInput: document.getElementById("captureInput"),
  captureBtn: document.getElementById("captureBtn"),
  clearCaptureBtn: document.getElementById("clearCaptureBtn"),
  flushQueueBtn: document.getElementById("flushQueueBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  searchInput: document.getElementById("searchInput"),
  itemList: document.getElementById("itemList"),
  detailPanel: document.getElementById("detailPanel"),
  viewTitle: document.getElementById("viewTitle"),
  listMeta: document.getElementById("listMeta"),
  onlineDot: document.getElementById("onlineDot"),
  onlineLabel: document.getElementById("onlineLabel"),
  queueMeta: document.getElementById("queueMeta"),
  statusLine: document.getElementById("statusLine"),
};

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_err) {
    return fallback;
  }
}

function loadString(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? String(raw) : fallback;
  } catch (_err) {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function saveString(key, value) {
  localStorage.setItem(key, String(value || ""));
}

function trimText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeStatus(value) {
  return trimText(value).toLowerCase();
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

function selectorFor(item) {
  return trimText(item?.id) || trimText(item?.task_uuid) || trimText(item?.tw_uuid) || (item?.hot_index ? `hot-${item.hot_index}` : "");
}

function isPromoted(item) {
  const status = normalizeStatus(item?.status);
  const phase = normalizeStatus(item?.phase);
  return status === "promoted" || ["plan", "production", "profit"].includes(phase);
}

function normalizeItem(raw, extra = {}) {
  const title = trimText(raw?.title || raw?.idea) || "Untitled";
  const description = trimText(raw?.description);
  const selector = trimText(extra.selector) || selectorFor(raw) || `local-${Math.random().toString(16).slice(2, 10)}`;
  return {
    selector,
    title,
    description,
    source: trimText(raw?.source) || trimText(extra.source) || "potential-pwa",
    status: normalizeStatus(raw?.status) || "active",
    phase: normalizeStatus(raw?.phase) || "potential",
    created_at: trimText(raw?.created_at || raw?.created) || new Date().toISOString(),
    task_status: normalizeStatus(raw?.task_status),
    task_uuid: trimText(raw?.task_uuid || raw?.tw_uuid),
    hot_index: Number.isFinite(Number(raw?.hot_index)) ? Number(raw.hot_index) : null,
    reasoning: trimText(raw?.reasoning),
    domino_door: trimText(raw?.domino_door),
    local_only: Boolean(extra.local_only),
  };
}

function queuedItems() {
  return state.queue.map((entry) =>
    normalizeItem(
      {
        title: entry.title,
        description: entry.description,
        source: entry.source,
        status: "active",
        phase: "potential",
        created_at: entry.created_at,
      },
      {
        selector: entry.id,
        source: entry.source,
        local_only: true,
      }
    )
  );
}

function combinedItems() {
  const seen = new Set();
  const out = [];

  queuedItems().forEach((item) => {
    if (seen.has(item.selector)) return;
    seen.add(item.selector);
    out.push(item);
  });

  state.items
    .map((item) => normalizeItem(item))
    .filter((item) => !isPromoted(item))
    .forEach((item) => {
      if (seen.has(item.selector)) return;
      seen.add(item.selector);
      out.push(item);
    });

  return out.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function isActiveItem(item) {
  const status = normalizeStatus(item?.status);
  const phase = normalizeStatus(item?.phase || "potential");
  return phase === "potential" && ["", "active", "new", "potential"].includes(status);
}

function matchesFilter(item, filter) {
  if (filter === "all") return !isPromoted(item);
  if (filter === "active") return isActiveItem(item) || item.local_only;
  if (filter === "done") return normalizeStatus(item.status) === "done";
  if (filter === "deleted") return normalizeStatus(item.status) === "deleted";
  return true;
}

function counts() {
  const items = combinedItems();
  return {
    active: items.filter((item) => matchesFilter(item, "active")).length,
    done: items.filter((item) => matchesFilter(item, "done")).length,
    deleted: items.filter((item) => matchesFilter(item, "deleted")).length,
    all: items.length,
  };
}

function visibleItems() {
  const needle = normalizeStatus(state.search);
  return combinedItems().filter((item) => {
    if (!matchesFilter(item, state.filter)) return false;
    if (!needle) return true;
    return `${item.title} ${item.description} ${item.source}`.toLowerCase().includes(needle);
  });
}

function currentItem() {
  const items = combinedItems();
  return items.find((item) => item.selector === state.selected) || null;
}

function setBusy(nextBusy) {
  state.busy = Boolean(nextBusy);
  refs.captureBtn.disabled = state.busy;
  refs.refreshBtn.disabled = state.busy;
  refs.flushQueueBtn.disabled = state.busy || !state.queue.length || !state.online;
}

function setStatus(message, tone = "info") {
  state.status = trimText(message) || "Ready.";
  state.statusTone = tone;
  refs.statusLine.textContent = state.status;
  refs.statusLine.dataset.tone = tone;
}

function updateStatusIndicators() {
  refs.onlineDot.classList.toggle("is-online", state.online);
  refs.onlineLabel.textContent = state.online ? "Online" : "Offline";
  refs.queueMeta.textContent = `Queue: ${state.queue.length}`;
  refs.flushQueueBtn.disabled = state.busy || !state.queue.length || !state.online;
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

function persistState() {
  saveJson(STORAGE.items, state.items);
  saveJson(STORAGE.queue, state.queue);
  saveString(STORAGE.filter, state.filter);
  saveString(STORAGE.selected, state.selected);
}

function ensureSelection() {
  const visible = visibleItems();
  const all = combinedItems();
  const selectedExists = all.some((item) => item.selector === state.selected);
  if (!selectedExists) {
    state.selected = visible[0]?.selector || all[0]?.selector || "";
  }
  persistState();
}

function renderNav() {
  const stats = counts();
  refs.listNav.innerHTML = LISTS.map((entry) => `
    <button class="nav-button ${state.filter === entry.key ? "is-active" : ""}" type="button" data-filter="${entry.key}">
      <span>${escapeHtml(entry.label)}</span>
      <span class="nav-count">${stats[entry.key] || 0}</span>
    </button>
  `).join("");

  refs.listNav.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.getAttribute("data-filter") || "active";
      persistState();
      render();
    });
  });
}

function renderList() {
  const items = visibleItems();
  refs.viewTitle.textContent = LISTS.find((entry) => entry.key === state.filter)?.label || "Potential";
  refs.listMeta.textContent = `${items.length} visible · ${counts().all} total`;

  if (!items.length) {
    refs.itemList.innerHTML = `
      <div class="empty-state">
        No entries in this view.
      </div>
    `;
    return;
  }

  refs.itemList.innerHTML = items.map((item) => {
    const canComplete = !item.local_only && matchesFilter(item, "active");
    const taskLabel = item.task_status ? `task:${item.task_status}` : item.local_only ? "queued" : "local";
    return `
      <article class="item-card ${item.selector === state.selected ? "is-selected" : ""}" data-select="${escapeHtml(item.selector)}">
        <div class="item-top">
          <button class="check-button" type="button" data-done="${escapeHtml(item.selector)}" ${canComplete ? "" : "disabled"}>✓</button>
          <div>
            <div class="item-title">${escapeHtml(item.title)}</div>
            <div class="item-description">${escapeHtml(item.description || "No notes yet.")}</div>
          </div>
        </div>
        <div class="item-tags">
          <span class="pill">${escapeHtml(item.status || "active")}</span>
          <span class="pill muted">${escapeHtml(taskLabel)}</span>
          <span class="pill muted">${escapeHtml(item.source || "unknown")}</span>
          ${item.local_only ? '<span class="pill offline">offline</span>' : ""}
        </div>
        <div class="item-footer">
          <span>${escapeHtml(formatDate(item.created_at))}</span>
          <span>${escapeHtml(item.task_uuid ? item.task_uuid.slice(0, 8) : item.selector)}</span>
        </div>
      </article>
    `;
  }).join("");

  refs.itemList.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selected = button.getAttribute("data-select") || "";
      persistState();
      renderDetail();
      renderList();
    });
  });

  refs.itemList.querySelectorAll("[data-done]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const selector = button.getAttribute("data-done") || "";
      if (!selector || button.disabled) return;
      await completeItem(selector);
    });
  });
}

function renderDetail() {
  const item = currentItem();
  if (!item) {
    refs.detailPanel.innerHTML = `
      <div class="detail-empty">
        Select an item to inspect or edit it.
      </div>
    `;
    return;
  }

  refs.detailPanel.innerHTML = item.local_only ? `
    <div class="detail-form">
      <div class="section-kicker">Queued Offline</div>
      <h2>${escapeHtml(item.title)}</h2>
      <div class="detail-meta">
        <div>This capture is stored locally and will be sent once you are online.</div>
        <div>Created: ${escapeHtml(formatDate(item.created_at))}</div>
      </div>
      <div class="field">
        <label for="detailTitle">Title</label>
        <input id="detailTitle" type="text" value="${escapeHtml(item.title)}" />
      </div>
      <div class="field">
        <label for="detailDescription">Notes</label>
        <textarea id="detailDescription">${escapeHtml(item.description)}</textarea>
      </div>
      <div class="detail-actions">
        <button class="action-button primary" id="saveQueuedBtn" type="button">Save Queue Entry</button>
        <button class="action-button danger" id="deleteQueuedBtn" type="button">Remove From Queue</button>
      </div>
    </div>
  ` : `
    <div class="detail-form">
      <div class="section-kicker">Selected Item</div>
      <h2>${escapeHtml(item.title)}</h2>
      <div class="detail-meta">
        <div>Status: ${escapeHtml(item.status || "active")} · Task: ${escapeHtml(item.task_status || "-")}</div>
        <div>Source: ${escapeHtml(item.source || "-")}</div>
        <div>Created: ${escapeHtml(formatDate(item.created_at))}</div>
        <div>UUID: ${escapeHtml(item.task_uuid || "-")}</div>
      </div>
      <div class="field">
        <label for="detailTitle">Title</label>
        <input id="detailTitle" type="text" value="${escapeHtml(item.title)}" />
      </div>
      <div class="field">
        <label for="detailDescription">Notes</label>
        <textarea id="detailDescription">${escapeHtml(item.description)}</textarea>
      </div>
      <div class="detail-actions">
        <button class="action-button primary" id="saveDetailBtn" type="button">Save Changes</button>
        <button class="action-button success" id="doneDetailBtn" type="button" ${matchesFilter(item, "active") ? "" : "disabled"}>Mark Done</button>
        <button class="action-button danger" id="deleteDetailBtn" type="button">Delete</button>
      </div>
    </div>
  `;

  bindDetailActions(item);
}

function bindDetailActions(item) {
  if (item.local_only) {
    document.getElementById("saveQueuedBtn")?.addEventListener("click", () => {
      const title = trimText(document.getElementById("detailTitle")?.value);
      const description = trimText(document.getElementById("detailDescription")?.value);
      if (!title) {
        setStatus("Queued entry needs a title.", "error");
        return;
      }
      state.queue = state.queue.map((entry) =>
        entry.id === item.selector ? { ...entry, title, description } : entry
      );
      persistState();
      render();
      setStatus("Queued capture updated.", "ok");
    });

    document.getElementById("deleteQueuedBtn")?.addEventListener("click", () => {
      state.queue = state.queue.filter((entry) => entry.id !== item.selector);
      ensureSelection();
      persistState();
      render();
      setStatus("Queued capture removed.", "ok");
    });
    return;
  }

  document.getElementById("saveDetailBtn")?.addEventListener("click", async () => {
    const title = trimText(document.getElementById("detailTitle")?.value);
    const description = trimText(document.getElementById("detailDescription")?.value);
    if (!title) {
      setStatus("Title is required.", "error");
      return;
    }
    try {
      setBusy(true);
      setStatus("Saving item...", "info");
      await apiJson(`/api/door/potential/hotlist/${encodeURIComponent(item.selector)}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          description,
          source: "potential-pwa",
        }),
      });
      await loadRemoteItems();
      setStatus("Item saved.", "ok");
    } catch (err) {
      setStatus(`Save failed: ${err.message}`, "error");
    } finally {
      setBusy(false);
    }
  });

  document.getElementById("doneDetailBtn")?.addEventListener("click", async () => {
    await completeItem(item.selector);
  });

  document.getElementById("deleteDetailBtn")?.addEventListener("click", async () => {
    await deleteItem(item.selector);
  });
}

function render() {
  ensureSelection();
  renderNav();
  renderList();
  renderDetail();
  updateStatusIndicators();
}

function queueEntryFor(title) {
  return {
    id: `queued-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    title,
    description: "",
    source: "potential-pwa-offline",
    created_at: new Date().toISOString(),
  };
}

async function loadRemoteItems() {
  if (!state.online) {
    setStatus("Offline. Showing cached Hot List.", "info");
    render();
    return;
  }

  const data = await apiJson("/api/door/potential/hotlist?mode=all");
  state.items = Array.isArray(data.items) ? data.items : [];
  persistState();
  render();
}

async function flushQueue() {
  if (!state.online || !state.queue.length) return;

  setBusy(true);
  setStatus(`Flushing ${state.queue.length} queued capture${state.queue.length === 1 ? "" : "s"}...`, "info");

  const remaining = [];
  let processed = 0;

  for (let index = 0; index < state.queue.length; index += 1) {
    const entry = state.queue[index];
    try {
      await apiJson("/api/door/potential/hotlist", {
        method: "POST",
        body: JSON.stringify({
          title: entry.title,
          description: entry.description,
          source: entry.source || "potential-pwa-offline",
        }),
      });
      processed += 1;
    } catch (err) {
      remaining.push(entry, ...state.queue.slice(index + 1));
      state.queue = remaining;
      persistState();
      render();
      setStatus(`Queue flush stopped: ${err.message}`, "error");
      setBusy(false);
      return;
    }
  }

  state.queue = [];
  persistState();
  await loadRemoteItems();
  setBusy(false);
  setStatus(`Flushed ${processed} queued capture${processed === 1 ? "" : "s"}.`, "ok");
}

async function captureIdeas() {
  const raw = trimText(refs.captureInput.value);
  if (!raw) {
    setStatus("Enter at least one idea.", "error");
    refs.captureInput.focus();
    return;
  }

  const ideas = raw
    .split("\n")
    .map((line) => trimText(line))
    .filter(Boolean);

  if (!ideas.length) {
    setStatus("Enter at least one idea.", "error");
    return;
  }

  if (!state.online) {
    ideas.forEach((title) => {
      state.queue.unshift(queueEntryFor(title));
    });
    refs.captureInput.value = "";
    persistState();
    render();
    setStatus(`${ideas.length} capture${ideas.length === 1 ? "" : "s"} queued offline.`, "ok");
    return;
  }

  try {
    setBusy(true);
    setStatus(`Adding ${ideas.length} idea${ideas.length === 1 ? "" : "s"}...`, "info");
    await apiJson("/api/door/potential/hotlist", {
      method: "POST",
      body: JSON.stringify({
        text: ideas.join("\n"),
        source: "potential-pwa",
      }),
    });
    refs.captureInput.value = "";
    await loadRemoteItems();
    setStatus(`${ideas.length} idea${ideas.length === 1 ? "" : "s"} added.`, "ok");
  } catch (err) {
    setStatus(`Add failed: ${err.message}`, "error");
  } finally {
    setBusy(false);
  }
}

async function deleteItem(selector) {
  if (!selector) return;
  if (!window.confirm("Delete this Hot List entry?")) return;

  try {
    setBusy(true);
    setStatus("Deleting item...", "info");
    await apiJson(`/api/door/potential/hotlist/${encodeURIComponent(selector)}`, { method: "DELETE" });
    await loadRemoteItems();
    setStatus("Item deleted.", "ok");
  } catch (err) {
    setStatus(`Delete failed: ${err.message}`, "error");
  } finally {
    setBusy(false);
  }
}

async function completeItem(selector) {
  if (!selector) return;
  try {
    setBusy(true);
    setStatus("Completing item...", "info");
    await apiJson(`/api/door/potential/hotlist/${encodeURIComponent(selector)}/done`, { method: "POST" });
    if (state.filter === "active") {
      state.selected = "";
    }
    persistState();
    await loadRemoteItems();
    setStatus("Item completed.", "ok");
  } catch (err) {
    setStatus(`Complete failed: ${err.message}`, "error");
  } finally {
    setBusy(false);
  }
}

refs.captureBtn.addEventListener("click", captureIdeas);
refs.clearCaptureBtn.addEventListener("click", () => {
  refs.captureInput.value = "";
  setStatus("Capture input cleared.", "info");
});
refs.flushQueueBtn.addEventListener("click", flushQueue);
refs.refreshBtn.addEventListener("click", async () => {
  try {
    setBusy(true);
    setStatus("Refreshing Hot List...", "info");
    await loadRemoteItems();
    if (state.online && state.queue.length) {
      await flushQueue();
    }
    setStatus("Hot List refreshed.", "ok");
  } catch (err) {
    setStatus(`Refresh failed: ${err.message}`, "error");
  } finally {
    setBusy(false);
  }
});
refs.captureInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    captureIdeas();
  }
});
refs.searchInput.addEventListener("input", () => {
  state.search = trimText(refs.searchInput.value);
  render();
});

window.addEventListener("online", async () => {
  state.online = true;
  updateStatusIndicators();
  setStatus("Back online. Syncing queued captures...", "info");
  render();
  await flushQueue();
  await loadRemoteItems();
});

window.addEventListener("offline", () => {
  state.online = false;
  updateStatusIndicators();
  setStatus("Offline. Cached list stays available and new captures will queue locally.", "info");
});

(async function boot() {
  updateStatusIndicators();
  render();
  try {
    await loadRemoteItems();
    if (state.online && state.queue.length) {
      await flushQueue();
    } else {
      setStatus(state.online ? "Potential ready." : "Offline. Working from cache.", "ok");
    }
  } catch (err) {
    setStatus(`Initial load failed: ${err.message}`, "error");
  }
})();
