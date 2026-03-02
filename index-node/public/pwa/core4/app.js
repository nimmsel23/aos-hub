"use strict";
window.aosGasFallback?.init?.("core4");

const ICONS = {
  body:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 6.5h11m-11 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 21v-8m6-8v17m6-9v9"/></svg>',
  being:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  balance:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75"/></svg>',
  business: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
};

const DOMAINS = [
  { key: "body",     label: "BODY",     icon: ICONS.body,
    tasks: [{ key: "fitness", label: "FITNESS .5" }, { key: "fuel", label: "FUEL .5" }] },
  { key: "being",    label: "BEING",    icon: ICONS.being,
    tasks: [{ key: "meditation", label: "MEDITATION .5" }, { key: "memoirs", label: "MEMOIRS .5" }] },
  { key: "balance",  label: "BALANCE",  icon: ICONS.balance,
    tasks: [{ key: "person1", label: "PARTNER .5" }, { key: "person2", label: "POSTERITY .5" }] },
  { key: "business", label: "BUSINESS", icon: ICONS.business,
    tasks: [{ key: "discover", label: "DISCOVER .5" }, { key: "declare", label: "DECLARE .5" }] },
];

const DAY_NAMES = ["MO","DI","MI","DO","FR","SA","SO"];
const CIRCUMFERENCE = 2 * Math.PI * 50;   // main ring r=50 → 314.16
const MINI_CIRC     = 2 * Math.PI * 12;   // mini ring r=12 → 75.4

const $ = (id) => document.getElementById(id);

let state = {
  done: new Set(),
  daily: 0,
  weekly: 0,
  date: "",
  week: "",
  weekHabits: {},       // "body:fitness" → points
  weekByDay: {},        // "YYYY-MM-DD" → total points
  weekDates: [],        // 7 date keys for current week
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function weekDatesFor(dateStr) {
  const ref = new Date(dateStr + "T12:00:00");
  const day = ref.getDay();
  const diff = ref.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(ref);
  start.setDate(diff);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
  }
  return out;
}

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

async function fetchJsonOrThrow(url, init) {
  const netFetch = window.aosGasFallback?.fetch
    ? window.aosGasFallback.fetch
    : fetch;
  const res = await netFetch(url, init, { app: "core4" });
  const raw = await res.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (_err) {
    const preview = String(raw || "").replace(/\s+/g, " ").trim().slice(0, 120);
    throw new Error(`${url} returned non-JSON (HTTP ${res.status})${preview ? `: ${preview}` : ""}`);
  }

  if (!res.ok) {
    const msg = data && typeof data === "object" && data.error ? String(data.error) : `HTTP ${res.status}`;
    throw new Error(`${url} failed: ${msg}`);
  }

  return data;
}

function habitCount(domain, task) {
  const pts = state.weekHabits[`${domain}:${task}`] || 0;
  return Math.round(pts / 0.5);   // 0..7
}

function applyLegacyTodayPayload(payload, today) {
  if (!payload || payload.ok !== true || !payload.data) return false;
  const d = payload.data || {};
  const map = [
    ["fitness", "body", "fitness"],
    ["fuel", "body", "fuel"],
    ["meditation", "being", "meditation"],
    ["memoirs", "being", "memoirs"],
    ["partner", "balance", "person1"],
    ["posterity", "balance", "person2"],
    ["discover", "business", "discover"],
    ["declare", "business", "declare"],
  ];
  map.forEach(([legacyKey, domain, task]) => {
    if (Number(d[legacyKey] || 0) >= 1) state.done.add(`${domain}/${task}`);
  });
  state.daily = Number(payload.total || 0);
  state.date = d.date || today;
  return true;
}

// ── Main ring ─────────────────────────────────────────────────────────────────
function updateRing(daily) {
  const pct = Math.min(daily / 4, 1);
  $("ringTrack").style.strokeDashoffset = (CIRCUMFERENCE * (1 - pct)).toFixed(2);
  $("dailyPct").textContent = Math.round(pct * 100) + "%";
  $("dailyScore").textContent = daily % 1 === 0 ? daily : daily.toFixed(1);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function renderHeatmap() {
  const el = $("heatmap");
  if (!el) return;
  const today = todayKey();

  el.innerHTML = state.weekDates.map((dateKey, idx) => {
    const pts = Number(state.weekByDay[dateKey] || 0);
    const level = pts === 0 ? 0 : pts <= 1 ? 1 : pts <= 2 ? 2 : pts <= 3 ? 3 : 4;
    const isToday = dateKey === today;
    return `<div class="heat-day">
      <div class="hd-label${isToday ? " today" : ""}">${DAY_NAMES[idx]}</div>
      <div class="hd-bar"><div class="hd-fill q${level}"></div></div>
      <div class="hd-pts">${pts > 0 ? pts.toFixed(1) : ""}</div>
    </div>`;
  }).join("");
}

// ── Mini ring HTML ────────────────────────────────────────────────────────────
function miniRingHTML(count) {
  const max    = 7;
  const pct    = Math.min(count / max, 1);
  const offset = (MINI_CIRC * (1 - pct)).toFixed(2);
  const empty  = count === 0 ? " empty" : "";
  const numCls = count > 0  ? " active" : "";
  return `
    <div class="mini-ring-wrap">
      <svg class="mini-ring-svg" viewBox="0 0 40 40">
        <circle class="mini-ring-bg"    cx="20" cy="20" r="12"/>
        <circle class="mini-ring-track${empty}" cx="20" cy="20" r="12"
          style="stroke-dasharray:${MINI_CIRC.toFixed(2)};stroke-dashoffset:${offset}"/>
      </svg>
      <div class="mini-ring-center">
        <span class="mini-ring-num${numCls}">${count}</span>
      </div>
    </div>`;
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  const root = $("cards");
  root.innerHTML = "";

  for (const domain of DOMAINS) {
    const doneTasks = domain.tasks.filter(t => state.done.has(`${domain.key}/${t.key}`));
    const pts       = doneTasks.length * 0.5;
    const barPct    = (pts / 1.0) * 100;
    const scoreClass = pts > 0 ? " done" : "";

    const habitsHTML = domain.tasks.map(t => {
      const dk    = `${domain.key}/${t.key}`;
      const done  = state.done.has(dk);
      const count = habitCount(domain.key, t.key);
      return `
        <div class="habit-row">
          <button class="task-chip${done ? " done" : ""}"
            data-domain="${domain.key}" data-task="${t.key}">${t.label}</button>
          ${miniRingHTML(count)}
        </div>`;
    }).join("");

    const card = document.createElement("div");
    card.className = `domain-card ${domain.key}`;
    card.innerHTML = `
      <div class="card-body">
        <div class="card-icon">${domain.icon}</div>
        <div class="card-info">
          <div class="card-name">${domain.label}</div>
          <div class="card-habits">${habitsHTML}</div>
        </div>
        <div class="card-score${scoreClass}">${pts > 0 ? pts.toFixed(1) : "0"}</div>
      </div>
      <div class="card-bar">
        <div class="card-bar-fill" style="width:${barPct}%"></div>
      </div>
    `;
    root.appendChild(card);
  }

  root.querySelectorAll(".task-chip:not(.done)").forEach(btn => {
    btn.addEventListener("click", handleLog);
  });

  updateRing(state.daily);
  $("weeklyScore").textContent = state.weekly % 1 === 0 ? state.weekly : state.weekly.toFixed(1);
  const wl = $("weekLabel");
  if (wl) wl.textContent = state.week || "\u2014";

  renderHeatmap();
}

// ── Log ───────────────────────────────────────────────────────────────────────
async function handleLog(e) {
  const btn    = e.currentTarget;
  const domain = btn.dataset.domain;
  const task   = btn.dataset.task;
  btn.classList.add("logging");

  try {
    const data = await fetchJsonOrThrow("/api/core4/log", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ domain, task, source: "core4-pwa" }),
    });

    if (data.duplicate || data.ok) {
      state.done.add(`${domain}/${task}`);
      if (data.day)          state.daily      = Number(data.day.total  || 0);
      if (data.week?.totals) {
        state.weekly     = Number(data.week.totals.week_total || 0);
        state.weekHabits = data.week.totals.by_habit || {};
        state.weekByDay  = data.week.totals.by_day || {};
      }
      showToast(data.duplicate ? "Already logged" : `${domain} \u00b7 ${task} \u2713`);
    }
  } catch (err) {
    const msg = String(err?.message || err || "check server");
    showToast(`Error \u2013 ${msg.slice(0, 64)}`);
  }

  render();
}

// ── Journal ───────────────────────────────────────────────────────────────────
function setJournalStatus(msg, isError) {
  const el = $("journalStatus");
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("error", !!isError);
  if (msg) setTimeout(() => { el.textContent = ""; }, 3000);
}

async function loadJournal(dateKey) {
  const list = $("journalList");
  if (!list) return;
  try {
    const data = await fetchJsonOrThrow(`/api/core4/journal?date=${encodeURIComponent(dateKey)}`);
    const entries = Array.isArray(data.entries) ? data.entries : [];
    if (entries.length === 0) {
      list.innerHTML = `<div class="journal-empty">No journal entries for today.</div>`;
      return;
    }
    list.innerHTML = entries.map(entry => {
      const text = String(entry.text || "");
      // Parse individual entries from the markdown file (split on ## HH:MM headers)
      const parts = text.split(/^## /m).filter(Boolean);
      return parts.map(part => {
        const lines = part.split("\n");
        const time = (lines[0] || "").replace(/---\s*$/, "").trim();
        const body = lines.slice(1).join("\n").replace(/\n---\n?$/g, "").trim();
        if (!body) return "";
        return `<div class="journal-entry">
          <div class="je-head">
            <span class="je-label ${escHtml(entry.domain)}">${escHtml(entry.label)}</span>
            <span class="je-time">${escHtml(time)}</span>
          </div>
          <div class="je-text">${escHtml(body)}</div>
        </div>`;
      }).join("");
    }).join("");
  } catch {
    list.innerHTML = `<div class="journal-empty">Could not load journal.</div>`;
  }
}

async function saveJournal() {
  const input = $("journalInput");
  const text = String(input?.value || "").trim();
  if (!text) { setJournalStatus("Write something first", true); return; }

  const sel = String($("journalHabit")?.value || "").split(":");
  const domain = sel[0];
  const habit = sel[1];
  if (!domain || !habit) { setJournalStatus("Select a habit", true); return; }

  const btn = $("journalSave");
  if (btn) btn.disabled = true;

  try {
    const data = await fetchJsonOrThrow("/api/core4/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, habit, text, date: state.date || todayKey() }),
    });
    if (data.ok) {
      input.value = "";
      setJournalStatus("Saved");
      await loadJournal(state.date || todayKey());
    } else {
      setJournalStatus(data.error || "Save failed", true);
    }
  } catch (err) {
    setJournalStatus(String(err?.message || "Save failed").slice(0, 60), true);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function initJournal() {
  const btn = $("journalSave");
  if (btn) btn.addEventListener("click", saveJournal);
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function load() {
  const today = todayKey();

  const dayPromise = (async () => {
    try {
      return await fetchJsonOrThrow(`/api/core4/day-state?date=${today}`);
    } catch (err) {
      const legacy = await fetchJsonOrThrow("/api/core4/today");
      legacy.__fallback = "legacy-today";
      legacy.__fallback_error = String(err?.message || err || "");
      return legacy;
    }
  })();

  const weekPromise = fetchJsonOrThrow(`/api/core4/week-summary?date=${today}`);
  const [dayResult, weekResult] = await Promise.allSettled([dayPromise, weekPromise]);

  let dayRes = null;
  let weekRes = null;
  const errors = [];

  if (dayResult.status === "fulfilled") {
    dayRes = dayResult.value;
  } else {
    errors.push(String(dayResult.reason?.message || dayResult.reason || "day-state failed"));
  }

  if (weekResult.status === "fulfilled") {
    weekRes = weekResult.value;
  } else {
    errors.push(String(weekResult.reason?.message || weekResult.reason || "week-summary failed"));
  }

  if (dayRes?.ok && dayRes.__fallback === "legacy-today") {
    applyLegacyTodayPayload(dayRes, today);
    if (dayRes.__fallback_error) {
      console.warn("[core4-pwa] day-state fallback -> /api/core4/today:", dayRes.__fallback_error);
      showToast("Using legacy Core4 day API");
    }
  } else if (dayRes?.ok) {
    (dayRes.entries || []).forEach(e => {
      if (e.domain && e.task) state.done.add(`${e.domain}/${e.task}`);
    });
    state.daily = Number(dayRes.total || 0);
    state.date  = dayRes.date  || today;
    state.week  = dayRes.week  || "";
  }

  if (weekRes?.ok) {
    state.weekly     = Number(weekRes.totals?.week_total || 0);
    state.week       = weekRes.week || state.week;
    state.weekHabits = weekRes.totals?.by_habit || {};
    state.weekByDay  = weekRes.totals?.by_day || {};
  }

  // Compute week dates for heatmap
  state.weekDates = weekDatesFor(state.date || today);

  if (!dayRes && !weekRes && errors.length) {
    throw new Error(errors.join(" | "));
  }

  // Format date: "1. Mär 2026"
  const dateObj = new Date((state.date || today) + "T12:00:00");
  const months = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
  const day = dateObj.getDate();
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  $("dateLabel").textContent = `${day}. ${month} ${year}`;

  const wl = $("weekLabel");
  if (wl) wl.textContent = state.week || "\u2014";

  render();
  initJournal();
  loadJournal(state.date || today);
}

load().catch(err => {
  $("cards").innerHTML = `<p style="padding:20px;color:#f66;font-size:13px">Fehler: ${err.message}</p>`;
});
