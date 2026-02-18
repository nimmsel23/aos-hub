"use strict";

const DOMAINS = [
  { key: "body",     label: "BODY",     icon: "🏋",
    tasks: [{ key: "fitness", label: "FITNESS .5" }, { key: "fuel", label: "FUEL .5" }] },
  { key: "being",    label: "BEING",    icon: "🧘",
    tasks: [{ key: "meditation", label: "MEDITATION .5" }, { key: "memoirs", label: "MEMOIRS .5" }] },
  { key: "balance",  label: "BALANCE",  icon: "👥",
    tasks: [{ key: "person1", label: "PARTNER .5" }, { key: "person2", label: "POSTERITY .5" }] },
  { key: "business", label: "BUSINESS", icon: "⚡",
    tasks: [{ key: "discover", label: "DISCOVER .5" }, { key: "declare", label: "DECLARE .5" }] },
];

const CIRCUMFERENCE = 2 * Math.PI * 50; // 314.16

const $ = (id) => document.getElementById(id);

let state = { done: new Set(), daily: 0, weekly: 0, date: "", week: "" };

// ── Ring ─────────────────────────────────────────────────────────────────────
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

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  const root = $("cards");
  root.innerHTML = "";

  for (const domain of DOMAINS) {
    const doneTasks = domain.tasks.filter(t => state.done.has(`${domain.key}/${t.key}`));
    const pts = doneTasks.length * 0.5;
    const barPct = (pts / 1.0) * 100;
    const scoreClass = pts > 0 ? " done" : "";

    const card = document.createElement("div");
    card.className = "domain-card";
    card.innerHTML = `
      <div class="card-body">
        <div class="card-icon">${domain.icon}</div>
        <div class="card-info">
          <div class="card-name">${domain.label}</div>
          <div class="card-tasks">
            ${domain.tasks.map(t => {
              const dk = `${domain.key}/${t.key}`;
              const done = state.done.has(dk);
              return `<button class="task-chip${done ? " done" : ""}" data-domain="${domain.key}" data-task="${t.key}">${t.label}</button>`;
            }).join("")}
          </div>
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
}

// ── Log ───────────────────────────────────────────────────────────────────────
async function handleLog(e) {
  const btn = e.currentTarget;
  const domain = btn.dataset.domain;
  const task   = btn.dataset.task;
  btn.classList.add("logging");

  try {
    const res = await fetch("/api/core4/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, task, source: "core4-pwa" }),
    });
    const data = await res.json();

    if (data.duplicate || data.ok) {
      state.done.add(`${domain}/${task}`);
      if (data.day)          state.daily   = Number(data.day.total  || 0);
      if (data.week?.totals) state.weekly  = Number(data.week.totals.week_total || 0);
      showToast(data.duplicate ? "Already logged" : `${domain} · ${task} ✓`);
    }
  } catch (err) {
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
    state.weekly = Number(weekRes.totals?.week_total || 0);
    state.week   = weekRes.week || state.week;
  }

  $("dateLabel").textContent = state.date;
  render();
}

load().catch(err => {
  $("cards").innerHTML = `<p style="padding:20px;color:#f66;font-size:13px">Fehler: ${err.message}</p>`;
});
