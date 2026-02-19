"use strict";

const $       = (id) => document.getElementById(id);
const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── Helpers ───────────────────────────────────────────────────────────────────

function isMobile() {
  return window.innerWidth < 720;
}

/**
 * Switch visible view on mobile (list | editor).
 * On desktop, both panels are always visible — this is a no-op.
 */
function showView(view) {
  document.querySelector(".shell").dataset.view = view;
}

/**
 * Format "2026-02" → "FEB 2026"
 */
function formatMonthLabel(ym) {
  if (!ym) return "—";
  const [year, month] = ym.split("-");
  const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${MONTHS[parseInt(month, 10) - 1]} ${year}`;
}

/**
 * Format "2026-02-19" → { day: "19", dayName: "THU", monthYear: "FEB 2026" }
 */
function formatEntryDate(dateStr) {
  if (!dateStr) return { day: "??", dayName: "???", monthYear: "???" };
  const [year, month, day] = dateStr.split("-").map(Number);
  // Use UTC to avoid local-tz off-by-one
  const d = new Date(Date.UTC(year, month - 1, day));
  const DAY_NAMES  = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const MONTH_ABBR = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return {
    day:       String(day).padStart(2, "0"),
    dayName:   DAY_NAMES[d.getUTCDay()],
    monthYear: `${MONTH_ABBR[month - 1]} ${year}`,
  };
}

/**
 * Format editor title for an entry date: "Thu, 19 Feb 2026"
 */
function formatEditorDate(dateStr) {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    timeZone: "UTC",
  });
}

// ── API ────────────────────────────────────────────────────────────────────────

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
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

// ── State ─────────────────────────────────────────────────────────────────────

let state = {
  month:    null,   // "2026-02"
  mission:  "",
  entries:  [],     // [{ date, preview }]
  selected: { kind: "mission", date: null },
};

// ── Ring ──────────────────────────────────────────────────────────────────────

function updateRing(pct) {
  const deg = Math.round(((pct || 0) / 100) * 360);
  $("miniRing").style.background =
    `conic-gradient(var(--accent) ${deg}deg, var(--ring-bg) ${deg}deg)`;
  $("overallPct").textContent = (pct || 0) + "%";
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

  // Update mission card active state
  const missionActive = state.selected.kind === "mission";
  $("btnMission").classList.toggle("active", missionActive);

  for (const e of state.entries) {
    const active  = state.selected.kind === "entry" && state.selected.date === e.date;
    const parsed  = formatEntryDate(e.date);

    const btn = document.createElement("button");
    btn.className = `entry-item${active ? " active" : ""}`;
    btn.innerHTML = `
      <div class="entry-day-block">
        <div class="entry-day-num">${escHtml(parsed.day)}</div>
        <div class="entry-day-name">${escHtml(parsed.dayName)}</div>
      </div>
      <div class="entry-body">
        <div class="entry-meta">${escHtml(parsed.monthYear)}</div>
        <div class="entry-preview">${escHtml(e.preview || "—")}</div>
      </div>
    `;
    btn.addEventListener("click", () => {
      loadEntry(e.date);
    });
    root.appendChild(btn);
  }
}

// ── Mission preview ───────────────────────────────────────────────────────────

function updateMissionPreview(text) {
  const el = $("missionPreview");
  const preview = (text || "").trim().split("\n")[0] || "No mission set yet…";
  el.textContent = preview;
}

// ── Editor ────────────────────────────────────────────────────────────────────

function setEditor(title, content) {
  $("editorTitle").textContent = title;
  $("editor").value = content || "";
}

// ── Load month ────────────────────────────────────────────────────────────────

async function loadMonth() {
  const res     = await apiFetch("/api/focus/month");
  state.month   = res.data?.month ?? null;
  state.mission = res.data?.mission ?? "";
  state.entries = res.entries || [];

  // Format month label: "FEB 2026"
  const monthLabel = formatMonthLabel(state.month);
  $("monthLabel").textContent    = monthLabel;
  $("appbarMonth").textContent   = monthLabel;

  updateRing(res.score?.overallPct ?? 0);
  renderDomainBars(res.score?.perDomain);
  updateMissionPreview(state.mission);
  renderEntryList();

  // Restore selection after reload
  if (state.selected.kind === "mission") {
    setMissionEditor();
  } else if (state.selected.kind === "entry" && state.selected.date) {
    await loadEntry(state.selected.date);
  }
}

// ── Load entry ────────────────────────────────────────────────────────────────

async function loadEntry(date) {
  const res = await apiFetch(`/api/focus/entry?date=${encodeURIComponent(date)}`);
  state.selected = { kind: "entry", date };
  renderEntryList();

  const title = formatEditorDate(date);
  setEditor(title, res.content);

  // Mobile: switch to editor view
  if (isMobile()) showView("editor");
}

// ── Load mission ──────────────────────────────────────────────────────────────

function setMissionEditor() {
  const monthLabel = formatMonthLabel(state.month);
  setEditor(`Mission — ${monthLabel}`, state.mission);
}

function loadMission() {
  state.selected = { kind: "mission", date: null };
  renderEntryList();
  setMissionEditor();

  // Mobile: switch to editor view
  if (isMobile()) showView("editor");
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
      updateMissionPreview(content);
      if (res.score) {
        updateRing(res.score.overallPct);
        renderDomainBars(res.score.perDomain);
      }
      showToast("Mission saved");
    } else {
      await apiFetch("/api/focus/entry/save", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ date: state.selected.date, content }),
      });
      showToast("Entry saved");
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

$("btnMission").addEventListener("click", loadMission);

$("btnBack").addEventListener("click", () => showView("list"));

$("btnSave").addEventListener("click", saveCurrent);

// Cmd/Ctrl+S
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    saveCurrent();
  }
});

// Handle resize: if switching from mobile → desktop, ensure shell has no stale data-view
window.addEventListener("resize", () => {
  if (!isMobile()) {
    // Desktop always shows both panels; reset to list so both visible
    showView("list");
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────

// Always start with list view
showView("list");

loadMonth().catch((err) => {
  console.error(err);
  document.querySelector(".shell").innerHTML =
    `<p style="padding:32px 24px;color:#f66;font-size:14px;">Error: ${escHtml(err.message)}</p>`;
});
