"use strict";

const STORAGE = {
  items:  "aos-door-potential-cache-v1",
  queue:  "aos-door-potential-queue-v1",
  filter: "aos-door-potential-filter-v1",
  selected:"aos-door-potential-selected-v1",
};

const LISTS = [
  { key: "active",   label: "Inbox"     },
{ key: "done",     label: "Completed" },
{ key: "deleted",  label: "Deleted"   },
{ key: "all",      label: "All"       },
];

// ===== CONFIG =====
const BRIDGE_URL      = 'http://localhost:8080/api/door/potential/hotlist';
const GAS_URL         = 'https://script.google.com/macros/s/AKfycbx3KWcOm32s-OxexAJqIdyQiariZxfUusKgHWLslqGHetzZzDKOdeBrohdeSqPBFzLV/exec?key=6090cff1bedb13f5c310ea52d9ee298a';
const TIMEOUT_MS      = 7000;
const MAX_RETRIES     = 3;
const BACKOFF_BASE_MS = 1200;

const state = {
  items:   loadJson(STORAGE.items,   []),
  queue:   loadJson(STORAGE.queue,   []),
  filter:  loadString(STORAGE.filter,  "active"),
  selected:loadString(STORAGE.selected,""),
  search:  "",
  online:  navigator.onLine,
  busy:    false,
  status:  "Booting...",
  statusTone: "info",
};

const refs = { /* unverändert – deine DOM-Referenzen */ };
// ... (loadJson, loadString, saveJson, saveString, trimText, normalizeStatus, escapeHtml, formatDate, selectorFor, isPromoted, normalizeItem, queuedItems, combinedItems, isActiveItem, matchesFilter, counts, visibleItems, currentItem, setBusy, setStatus, updateStatusIndicators, persistState, ensureSelection – alles unverändert übernehmen)

// ────────────────────────────────────────────────
// Helper: POST mit Timeout + Retry + text/plain für GAS
// ────────────────────────────────────────────────
async function postJson(url, payload = {}, isGas = false, retries = MAX_RETRIES) {
  let attempt = 0;
  while (attempt <= retries) {
    attempt++;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const headers = {
        Accept: "application/json",
      };
      if (payload && Object.keys(payload).length) {
        if (isGas) {
          headers["Content-Type"] = "text/plain;charset=utf-8";
        } else {
          headers["Content-Type"] = "application/json";
        }
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: payload ? JSON.stringify(payload) : undefined,
                              signal: controller.signal,
      });

      clearTimeout(tid);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON response");
      }

      if (data.ok === false) {
        throw new Error(data.error || "API error");
      }

      return data.data || data;
    } catch (err) {
      clearTimeout(tid);
      if (attempt > retries) throw err;

      const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1) + Math.random() * 400;
      await new Promise(r => setTimeout(r, delay));
      console.warn(`Retry ${attempt}/${retries} after: ${err.message}`);
    }
  }
}

// ────────────────────────────────────────────────
// GAS-spezifische Wrapper (immer POST + action im Body)
// ────────────────────────────────────────────────
async function gasQueue(item) {
  const payload = {
    action: "queue",
    title:       item.title,
    description: item.description || "",
    source:      item.source     || "pwa-offline",
    capturedAt:  item.created_at || new Date().toISOString(),
  };
  const res = await postJson(GAS_URL, payload, true);
  if (res?.queued && res.rowId) {
    return { success: true, rowId: res.rowId };
  }
  throw new Error(res?.error || "GAS queue failed");
}

async function gasMarkSynced(rowId) {
  if (!rowId) return;
  const payload = { action: "mark_synced", rowId: Number(rowId) };
  await postJson(GAS_URL, payload, true);
}

async function gasFetchPending() {
  const payload = { action: "fetch_gas_synced" };
  const res = await postJson(GAS_URL, payload, true);
  return res?.ok ? (res.items || []) : [];
}

// ────────────────────────────────────────────────
// Capture – mit einfacher Dedup
// ────────────────────────────────────────────────
async function captureIdeas() {
  const raw = trimText(refs.captureInput.value);
  if (!raw) return setStatus("Enter text.", "error");

  const ideas = raw.split("\n").map(trimText).filter(Boolean);
  if (!ideas.length) return;

  const now = Date.now();
  const existing = new Set(state.queue.map(e => e.title + '|' + Math.floor(new Date(e.created_at)/10000)));

  const toAdd = ideas.filter(title => {
    const key = title + '|' + Math.floor(now/10000);
    if (existing.has(key)) return false;
    existing.add(key);
    return true;
  });

  if (!toAdd.length) {
    setStatus("Duplicate(s) ignored.", "info");
    refs.captureInput.value = "";
    return;
  }

  if (!state.online) {
    toAdd.forEach(title => {
      state.queue.unshift({
        id: `q-${now}-${Math.random().toString(36).slice(2,9)}`,
                          title,
                          description: "",
                          source: "pwa-offline",
                          created_at: new Date().toISOString(),
      });
    });
    refs.captureInput.value = "";
    persistState();
    render();
    setStatus(`${toAdd.length} queued offline.`, "ok");
    return;
  }

  setBusy(true);
  setStatus(`Adding ${toAdd.length}...`, "info");

  try {
    // Bridge primär
    await postJson(BRIDGE_URL, {
      text: toAdd.join("\n"),
                   source: "potential-pwa",
    });
    refs.captureInput.value = "";
    await loadRemoteItems();
    setStatus("Added.", "ok");
  } catch (err) {
    // Fallback → GAS
    let gasOk = 0;
    for (const title of toAdd) {
      try {
        await gasQueue({ title, created_at: new Date().toISOString() });
        gasOk++;
      } catch {}
    }
    refs.captureInput.value = "";
    if (gasOk) {
      setStatus(`${gasOk} to GAS fallback.`, "warning");
    } else {
      // alles lokal
      toAdd.forEach(title => state.queue.unshift({
        id: `q-${now}-${Math.random().toString(36).slice(2,9)}`,
                                                 title,
                                                 description: "",
                                                 source: "pwa-failed-gas",
                                                 created_at: new Date().toISOString(),
      }));
      persistState();
      render();
      setStatus("Queued locally (no connection).", "warning");
    }
  } finally {
    setBusy(false);
  }
}

// ────────────────────────────────────────────────
// Flush Queue (Bridge → GAS fallback)
// ────────────────────────────────────────────────
async function flushQueue() {
  if (!state.online || !state.queue.length) return;

  setBusy(true);
  setStatus(`Flushing ${state.queue.length}...`, "info");

  const stillQueued = [];
  let syncedBridge = 0;
  let syncedGas   = 0;

  for (const entry of [...state.queue]) {
    try {
      await postJson(BRIDGE_URL, {
        title: entry.title,
        description: entry.description || "",
        source: entry.source || "pwa-offline",
      });
      syncedBridge++;
    } catch {
      try {
        const { success, rowId } = await gasQueue(entry);
        if (success) syncedGas++;
      } catch {
        stillQueued.push(entry);
      }
    }
  }

  state.queue = stillQueued;
  persistState();

  if (syncedBridge) await loadRemoteItems();

  setBusy(false);
  render();

  const parts = [];
  if (syncedBridge) parts.push(`${syncedBridge} Bridge`);
  if (syncedGas)   parts.push(`${syncedGas} GAS`);
  if (stillQueued.length) parts.push(`${stillQueued.length} still queued`);

  setStatus(`Flush: ${parts.join(", ") || "done"}.`, parts.length > 1 || stillQueued.length ? "warning" : "ok");
}

// ────────────────────────────────────────────────
// Recovery: GAS → Bridge + mark_synced
// ────────────────────────────────────────────────
async function recoverGas() {
  if (!state.online) return;

  try {
    const pending = await gasFetchPending();
    if (!pending.length) return;

    setStatus(`Recovering ${pending.length} from GAS...`, "info");

    for (const item of pending) {
      try {
        await postJson(BRIDGE_URL, {
          title: item.title,
          description: item.description || "",
          source: item.source || "pwa-gas-recovery",
          capturedAt: item.capturedAt || item.timestamp,
        });
        await gasMarkSynced(item.rowId);
      } catch (e) {
        console.warn("Recovery item failed:", e.message);
      }
    }

    await loadRemoteItems();
    setStatus("GAS recovery done.", "ok");
  } catch (err) {
    console.warn("GAS recovery failed:", err);
    setStatus("GAS recovery issue – try later.", "warning");
  }
}

// ────────────────────────────────────────────────
// Events & Boot
// ────────────────────────────────────────────────
window.addEventListener("online", async () => {
  state.online = true;
  updateStatusIndicators();
  setStatus("Online – syncing...", "info");
  await recoverGas();     // zuerst alte GAS-Einträge syncen
  await flushQueue();     // dann lokale Queue
  await loadRemoteItems();
  render();
});

window.addEventListener("offline", () => {
  state.online = false;
  updateStatusIndicators();
  setStatus("Offline mode.", "warning");
});

setInterval(async () => {
  const prev = state.online;
  state.online = await checkServerOnline();
  if (prev !== state.online) {
    updateStatusIndicators();
    if (state.online) {
      setStatus("Reconnected – syncing...", "info");
      await recoverGas();
      await flushQueue();
      await loadRemoteItems();
    }
    render();
  }
}, 12000);

(async function boot() {
  updateStatusIndicators();
  render();
  setStatus("Checking connection...", "info");
  state.online = await checkServerOnline();
  updateStatusIndicators();

  await loadRemoteItems();

  if (state.online) {
    if (state.queue.length) await flushQueue();
    await recoverGas();
  }

  setStatus(state.online ? "Ready." : "Offline – using cache.", state.online ? "ok" : "warning");
})();
