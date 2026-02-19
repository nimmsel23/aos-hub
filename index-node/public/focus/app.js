"use strict";

const $       = (id) => document.getElementById(id);
const escHtml = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
}

// ── State ─────────────────────────────────────────────────────────────────────
let state = {
  month:    null,
  mission:  "",
  entries:  [],
  selected: { kind: "mission", date: null },
};

// ── Ring ──────────────────────────────────────────────────────────────────────
function updateRing(pct) {
  const deg = Math.round((pct / 100) * 360);
  $("miniRing").style.background =
    `conic-gradient(var(--focus) ${deg}deg, var(--ring-bg) ${deg}deg)`;
  $("overallPct").textContent = pct + "%";
}

// ── Domain bars ───────────────────────────────────────────────────────────────
const DOMAIN_LABELS = { body: "BODY", being: "BEING", balance: "BALANCE", business: "BUSINESS" };

function renderDomainBars(perDomain) {
  const root = $("domainBars");
  root.innerHTML = "";
  for (const [k, label] of Object.entries(DOMAIN_LABELS)) {
    const pct = perDomain?.[k] ?? 0;
    const row = document.createElement("div");
    row.className = "dom-row";
    row.innerHTML = `
      <div class="dom-label">${label}</div>
      <div class="dom-bar"><div class="dom-fill" style="width:${pct}%"></div></div>
      <div class="dom-pct">${pct}%</div>
    `;
    root.appendChild(row);
  }
}

// ── Entry list ────────────────────────────────────────────────────────────────
function renderEntryList() {
  const root = $("entryList");
  root.innerHTML = "";

  for (const e of state.entries) {
    const active = state.selected.kind === "entry" && state.selected.date === e.date;
    const btn = document.createElement("button");
    btn.className = `entry-item${active ? " active" : ""}`;
    btn.innerHTML = `
      <div class="entry-date">${escHtml(e.date)}</div>
      <div class="entry-preview">${escHtml(e.preview || "—")}</div>
    `;
    btn.addEventListener("click", () => loadEntry(e.date));
    root.appendChild(btn);
  }
}

// ── Editor ────────────────────────────────────────────────────────────────────
function setEditor(title, content) {
  $("editorTitle").textContent = title;
  $("editor").value = content || "";
}

// ── Load month ────────────────────────────────────────────────────────────────
async function loadMonth() {
  const res = await apiFetch("/api/focus/month");
  state.month   = res.data.month;
  state.mission = res.data.mission;
  state.entries = res.entries || [];

  $("monthLabel").textContent = state.month;
  updateRing(res.score?.overallPct ?? 0);
  renderDomainBars(res.score?.perDomain);
  renderEntryList();

  // restore selection
  if (state.selected.kind === "mission") {
    setEditor(`Mission · ${state.month}`, state.mission);
  } else if (state.selected.kind === "entry" && state.selected.date) {
    await loadEntry(state.selected.date);
  }
}

async function loadEntry(date) {
  const res = await apiFetch(`/api/focus/entry?date=${encodeURIComponent(date)}`);
  state.selected = { kind: "entry", date };
  renderEntryList();
  setEditor(`Entry · ${date}`, res.content);
}

function loadMission() {
  state.selected = { kind: "mission", date: null };
  renderEntryList();
  setEditor(`Mission · ${state.month}`, state.mission);
}

function newEntry() {
  const d  = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  loadEntry(`${d.getFullYear()}-${mm}-${dd}`);
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function saveCurrent() {
  const content = $("editor").value;
  const btn     = $("btnSave");
  btn.disabled  = true;

  try {
    if (state.selected.kind === "mission") {
      const res = await apiFetch("/api/focus/mission/save", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mission: content }),
      });
      state.mission = content;
      if (res.score) {
        updateRing(res.score.overallPct);
        renderDomainBars(res.score.perDomain);
      }
      showToast("Mission saved ✓");
    } else {
      await apiFetch("/api/focus/entry/save", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ date: state.selected.date, content }),
      });
      showToast("Entry saved ✓");
      await loadMonth(); // refresh preview in entry list
    }
  } catch (err) {
    showToast("Save failed");
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}

// ── Events ────────────────────────────────────────────────────────────────────
$("btnMission").addEventListener("click",  loadMission);
$("btnNewEntry").addEventListener("click", newEntry);
$("btnSave").addEventListener("click",     saveCurrent);

// Cmd/Ctrl+S
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    saveCurrent();
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
loadMonth().catch((err) => {
  console.error(err);
  document.querySelector(".shell").innerHTML =
    `<p style="padding:24px;color:#f66">Fehler: ${err.message}</p>`;
});
