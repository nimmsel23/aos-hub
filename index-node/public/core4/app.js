"use strict";

// ── Domain / Task config ──────────────────────────────────────────────────────
const DOMAINS = [
  {
    key:   "body",
    label: "BODY",
    icon:  "🏋",
    tasks: [
      { key: "fitness", label: "FITNESS" },
      { key: "fuel",    label: "FUEL"    },
    ],
  },
  {
    key:   "being",
    label: "BEING",
    icon:  "🧘",
    tasks: [
      { key: "meditation", label: "MEDITATION" },
      { key: "memoirs",    label: "MEMOIRS"    },
    ],
  },
  {
    key:   "balance",
    label: "BALANCE",
    icon:  "👥",
    tasks: [
      { key: "person1", label: "PERSON 1" },
      { key: "person2", label: "PERSON 2" },
    ],
  },
  {
    key:   "business",
    label: "BUSINESS",
    icon:  "⚡",
    tasks: [
      { key: "discover", label: "DISCOVER" },
      { key: "declare",  label: "DECLARE"  },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const CIRCUMFERENCE = 2 * Math.PI * 52; // 326.7

function todayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${path}`);
  return res.json();
}

// ── State ─────────────────────────────────────────────────────────────────────
let state = {
  done: new Set(),   // "domain/task" strings
  daily: 0,
  weekly: 0,
  week: "",
  date: todayKey(),
};

// ── Ring ──────────────────────────────────────────────────────────────────────
function updateRing(daily) {
  const pct = daily / 4;
  const offset = CIRCUMFERENCE * (1 - pct);
  $("ringTrack").style.strokeDashoffset = offset.toFixed(2);
  $("dailyScore").textContent = daily % 1 === 0 ? daily : daily.toFixed(1);
  $("dailyPct").textContent   = Math.round(pct * 100) + "%";
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

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  const root = $("cards");
  root.innerHTML = "";

  for (const domain of DOMAINS) {
    // Count done tasks for this domain
    const doneTasks = domain.tasks.filter((t) =>
      state.done.has(`${domain.key}/${t.key}`)
    );
    const pts = doneTasks.length * 0.5;
    const allDone = doneTasks.length === domain.tasks.length;

    const card = document.createElement("div");
    card.className = `domain-card${allDone ? " done" : ""}`;

    // Header
    const header = document.createElement("div");
    header.className = "domain-header";
    header.innerHTML = `
      <div class="domain-icon">${domain.icon}</div>
      <div class="domain-info">
        <div class="domain-name">${domain.label}</div>
        <div class="domain-score">
          <span class="pts">${pts.toFixed(1)}</span> / 1.0 pts
        </div>
      </div>
    `;
    card.appendChild(header);

    // Tasks row
    const row = document.createElement("div");
    row.className = "tasks-row";

    for (const task of domain.tasks) {
      const dk = `${domain.key}/${task.key}`;
      const done = state.done.has(dk);

      const btn = document.createElement("button");
      btn.className = `task-btn${done ? " done" : ""}`;
      btn.dataset.domain = domain.key;
      btn.dataset.task   = task.key;
      btn.innerHTML = `
        <div class="task-check">${done ? "✓" : ""}</div>
        <span class="task-label">${task.label}</span>
        <span class="task-pts">${done ? "+.5" : ".5"}</span>
      `;

      if (!done) {
        btn.addEventListener("click", handleLog);
      }

      row.appendChild(btn);
    }

    card.appendChild(row);
    root.appendChild(card);
  }

  updateRing(state.daily);
  $("weeklyScore").textContent = state.weekly % 1 === 0
    ? state.weekly
    : state.weekly.toFixed(1);
  $("dateLabel").textContent = state.date;
  $("weekLabel").textContent = state.week;
}

// ── Log handler ───────────────────────────────────────────────────────────────
async function handleLog(e) {
  const btn    = e.currentTarget;
  const domain = btn.dataset.domain;
  const task   = btn.dataset.task;
  const dk     = `${domain}/${task}`;

  btn.classList.add("logging");

  try {
    const res = await apiFetch("/api/core4/log", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ domain, task, source: "core4-web" }),
    });

    if (res.duplicate) {
      showToast("Already logged ✓");
      state.done.add(dk);
    } else if (res.ok) {
      state.done.add(dk);
      // Update scores from response
      const day = res.day;
      if (day) {
        state.daily = Number(day.total || 0);
      }
      const week = res.week;
      if (week?.totals) {
        state.weekly = Number(week.totals.week_total || 0);
        state.week   = week.week || state.week;
      }
      showToast(`${domain.toUpperCase()} · ${task} logged ✓`);
    }
  } catch (err) {
    console.error(err);
    showToast("Error – check server");
  }

  render();
}

// ── Load from API ─────────────────────────────────────────────────────────────
async function load() {
  const date = todayKey();

  const [dayRes, weekRes] = await Promise.all([
    apiFetch(`/api/core4/day-state?date=${date}`),
    apiFetch(`/api/core4/week-summary?date=${date}`),
  ]);

  // Populate done set from entries
  if (dayRes.ok && Array.isArray(dayRes.entries)) {
    for (const entry of dayRes.entries) {
      if (entry.domain && entry.task) {
        state.done.add(`${entry.domain}/${entry.task}`);
      }
    }
    state.daily = Number(dayRes.total || 0);
    state.date  = dayRes.date || date;
    state.week  = dayRes.week || "";
  }

  if (weekRes.ok && weekRes.totals) {
    state.weekly = Number(weekRes.totals.week_total || 0);
    state.week   = weekRes.week || state.week;
  }

  render();
}

// ── Boot ──────────────────────────────────────────────────────────────────────
load().catch((err) => {
  console.error(err);
  $("cards").innerHTML =
    `<p style="padding:20px;color:#f66;font-size:14px">Fehler: ${err.message}</p>`;
});
