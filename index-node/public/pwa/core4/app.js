"use strict";

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

const CIRCUMFERENCE      = 2 * Math.PI * 50;   // main ring r=50 → 314.16
const MINI_CIRC          = 2 * Math.PI * 12;   // mini ring r=12 → 75.4

const $ = (id) => document.getElementById(id);

let state = {
  done: new Set(),
  daily: 0,
  weekly: 0,
  date: "",
  week: "",
  weekHabits: {},   // "body:fitness" → count (0-7)
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function habitCount(domain, task) {
  const pts = state.weekHabits[`${domain}:${task}`] || 0;
  return Math.round(pts / 0.5);   // 0..7
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
  if (wl) wl.textContent = state.week || "—";
}

// ── Log ───────────────────────────────────────────────────────────────────────
async function handleLog(e) {
  const btn    = e.currentTarget;
  const domain = btn.dataset.domain;
  const task   = btn.dataset.task;
  btn.classList.add("logging");

  try {
    const res  = await fetch("/api/core4/log", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ domain, task, source: "core4-pwa" }),
    });
    const data = await res.json();

    if (data.duplicate || data.ok) {
      state.done.add(`${domain}/${task}`);
      if (data.day)          state.daily      = Number(data.day.total  || 0);
      if (data.week?.totals) {
        state.weekly     = Number(data.week.totals.week_total || 0);
        state.weekHabits = data.week.totals.by_habit || {};
      }
      showToast(data.duplicate ? "Already logged" : `${domain} · ${task} ✓`);
    }
  } catch {
    showToast("Error – check server");
  }

  render();
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function load() {
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  })();

  const [dayRes, weekRes] = await Promise.all([
    fetch(`/api/core4/day-state?date=${today}`).then(r => r.json()),
    fetch(`/api/core4/week-summary?date=${today}`).then(r => r.json()),
  ]);

  if (dayRes.ok) {
    (dayRes.entries || []).forEach(e => {
      if (e.domain && e.task) state.done.add(`${e.domain}/${e.task}`);
    });
    state.daily = Number(dayRes.total || 0);
    state.date  = dayRes.date  || today;
    state.week  = dayRes.week  || "";
  }

  if (weekRes.ok) {
    state.weekly     = Number(weekRes.totals?.week_total || 0);
    state.week       = weekRes.week || state.week;
    state.weekHabits = weekRes.totals?.by_habit || {};
  }

  // Format date: "25. Feb 2026"
  const dateObj = new Date(state.date + "T12:00:00");
  const months = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
  const day = dateObj.getDate();
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  $("dateLabel").textContent = `${day}. ${month} ${year}`;

  const wl = $("weekLabel");
  if (wl) wl.textContent = state.week || "—";

  render();
}

load().catch(err => {
  $("cards").innerHTML = `<p style="padding:20px;color:#f66;font-size:13px">Fehler: ${err.message}</p>`;
});
