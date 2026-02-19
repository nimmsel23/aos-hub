"use strict";

// ── Config ────────────────────────────────────────────────────────────────────
const DOMAINS = [
  { key: "body",     label: "BODY",     icon: "🏋" },
  { key: "being",    label: "BEING",    icon: "🧘" },
  { key: "balance",  label: "BALANCE",  icon: "👥" },
  { key: "business", label: "BUSINESS", icon: "⚡" },
];

const CIRCUMFERENCE = 2 * Math.PI * 52; // 326.7

// ── State ─────────────────────────────────────────────────────────────────────
let fireData    = null;   // current week JSON
let taskPool    = [];     // pending TW tasks
let pendingTask = null;   // task selected for slot assignment

// ── Helpers ───────────────────────────────────────────────────────────────────
const $       = (id) => document.getElementById(id);
const escHtml = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

// ── Ring ──────────────────────────────────────────────────────────────────────
function updateRing(done, max) {
  const pct    = max > 0 ? done / max : 0;
  const offset = CIRCUMFERENCE * (1 - pct);
  $("ringTrack").style.strokeDashoffset = offset.toFixed(2);
  $("strikesDone").textContent = done;
  $("strikePct").textContent   = Math.round(pct * 100) + "%";
}

// ── Inline Edit ───────────────────────────────────────────────────────────────
function activateInlineEdit(titleEl, domain, index) {
  if (titleEl.querySelector("input")) return; // already editing

  const current = titleEl.dataset.title;
  titleEl.innerHTML = `<input class="inline-input" value="${escHtml(current)}" maxlength="80" />`;
  const input = titleEl.querySelector("input");
  input.focus();
  input.select();

  async function commit() {
    const val = input.value.trim();
    if (!val || val === current) { render(fireData); return; }
    try {
      const res = await apiFetch("/api/fire/rename", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ domain, index, title: val }),
      });
      if (res.ok) {
        fireData = res.data;
        updateRing(res.score.strikesDone, res.score.strikesMax);
      }
    } catch { showToast("Save failed"); }
    render(fireData);
  }

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter")  { input.blur(); }
    if (e.key === "Escape") { render(fireData); }
  });
}

// ── Render ────────────────────────────────────────────────────────────────────
function render(data) {
  if (!data) return;
  fireData = data;
  $("weekLabel").textContent = data.week || "—";

  const root = $("cards");
  root.innerHTML = "";

  for (const d of DOMAINS) {
    const strikes   = data.domains[d.key] || [];
    const doneCount = strikes.filter((s) => s.done).length;
    const allDone   = doneCount === 4;

    const card = document.createElement("div");
    card.className = `domain-card${allDone ? " done" : ""}`;

    card.innerHTML = `
      <div class="domain-header">
        <div class="domain-icon">${d.icon}</div>
        <div class="domain-info">
          <div class="domain-name">${d.label}</div>
          <div class="domain-score"><span class="pts">${doneCount}</span> / 4 Strikes</div>
        </div>
      </div>
      <div class="strike-list" data-domain="${d.key}"></div>
    `;

    root.appendChild(card);

    const list = card.querySelector(".strike-list");

    strikes.forEach((s, idx) => {
      const row = document.createElement("div");
      row.className = `strike-row${s.done ? " done" : ""}`;
      row.dataset.index = idx;

      const isPlaceholder = /^Strike #\d$/.test(s.title);

      row.innerHTML = `
        <button class="strike-check${s.done ? " on" : ""}"
                data-domain="${d.key}" data-index="${idx}"></button>
        <div class="strike-title${s.done ? " done" : ""}${isPlaceholder ? " placeholder" : ""}"
             data-domain="${d.key}" data-index="${idx}" data-title="${escHtml(s.title)}"
             title="Tap to edit">${escHtml(s.title)}</div>
        <button class="strike-drag" title="Drag to reorder">⠿</button>
      `;
      list.appendChild(row);
    });

    // Toggle
    list.querySelectorAll(".strike-check").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const domain = btn.dataset.domain;
        const index  = Number(btn.dataset.index);
        try {
          const res = await apiFetch("/api/fire/toggle", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ domain, index }),
          });
          if (res.ok) {
            fireData = res.data;
            updateRing(res.score.strikesDone, res.score.strikesMax);
            render(res.data);
            const isDone = res.data.domains[domain][index].done;
            showToast(`${domain.toUpperCase()} · Strike ${index + 1} ${isDone ? "✓" : "—"}`);
          }
        } catch { showToast("Error"); }
      });
    });

    // Inline edit on title tap
    list.querySelectorAll(".strike-title").forEach((el) => {
      el.addEventListener("click", () => {
        activateInlineEdit(el, el.dataset.domain, Number(el.dataset.index));
      });
    });

    // Sortable for reordering within domain
    Sortable.create(list, {
      handle:    ".strike-drag",
      animation: 150,
      onEnd: async (evt) => {
        if (evt.oldIndex === evt.newIndex) return;
        const rows  = [...list.querySelectorAll(".strike-row")];
        const order = rows.map((r) => Number(r.dataset.index));
        try {
          const res = await apiFetch("/api/fire/reorder", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ domain: d.key, order }),
          });
          if (res.ok) {
            fireData = res.data;
            updateRing(res.score.strikesDone, res.score.strikesMax);
            render(res.data);
          }
        } catch { showToast("Reorder failed"); render(fireData); }
      },
    });
  }
}

// ── Bottom Sheet ──────────────────────────────────────────────────────────────
function openSheet() {
  $("sheet").classList.add("open");
  $("sheetBackdrop").classList.add("show");
  showTaskList();
}

function closeSheet() {
  $("sheet").classList.remove("open");
  $("sheetBackdrop").classList.remove("show");
  pendingTask = null;
  $("slotPicker").hidden = true;
  $("taskPool").hidden   = false;
}

function showTaskList() {
  $("slotPicker").hidden = true;
  $("taskPool").hidden   = false;
  $("sheetTitle").textContent = "Task Pool";
}

function showSlotPicker(task) {
  pendingTask = task;
  $("sheetTitle").textContent = "→ " + task.description.slice(0, 30);
  $("taskPool").hidden   = true;
  $("slotPicker").hidden = false;

  const grid = $("slotPickerGrid");
  grid.innerHTML = "";

  for (const d of DOMAINS) {
    const strikes = fireData?.domains[d.key] || [];
    const section = document.createElement("div");
    section.className = "picker-domain";
    section.innerHTML = `<div class="picker-domain-label">${d.icon} ${d.label}</div>`;

    strikes.forEach((s, idx) => {
      const btn = document.createElement("button");
      btn.className = "picker-slot";
      const isPlaceholder = /^Strike #\d$/.test(s.title);
      btn.textContent = isPlaceholder ? `Slot ${idx + 1}` : s.title.slice(0, 24);
      if (isPlaceholder) btn.classList.add("empty");
      if (s.done) btn.classList.add("done");
      btn.addEventListener("click", () => assignTask(d.key, idx, task.description));
      section.appendChild(btn);
    });

    grid.appendChild(section);
  }
}

async function assignTask(domain, index, title) {
  try {
    const res = await apiFetch("/api/fire/rename", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ domain, index, title }),
    });
    if (res.ok) {
      fireData = res.data;
      updateRing(res.score.strikesDone, res.score.strikesMax);
      render(res.data);
      showToast(`Assigned to ${domain.toUpperCase()} ✓`);
      closeSheet();
    }
  } catch { showToast("Assign failed"); }
}

function renderTaskPool() {
  const pool = $("taskPool");
  const loading = $("poolLoading");
  if (loading) loading.remove();

  if (!taskPool.length) {
    pool.innerHTML = `<div class="pool-empty">No pending tasks found.<br>Add tasks in Taskwarrior.</div>`;
    return;
  }

  pool.innerHTML = "";
  taskPool.forEach((task) => {
    const item = document.createElement("div");
    item.className = "pool-item";
    item.innerHTML = `
      <div class="pool-item-main">
        <div class="pool-item-title">${escHtml(task.description)}</div>
        ${task.project ? `<div class="pool-item-meta">${escHtml(task.project)}</div>` : ""}
      </div>
      <button class="pool-item-assign" title="Assign to slot">→</button>
    `;
    item.querySelector(".pool-item-assign").addEventListener("click", () => showSlotPicker(task));
    pool.appendChild(item);
  });
}

// ── Event listeners ───────────────────────────────────────────────────────────
$("sheetTrigger").addEventListener("click", openSheet);
$("sheetClose").addEventListener("click", closeSheet);
$("sheetBackdrop").addEventListener("click", closeSheet);
$("slotPickerBack").addEventListener("click", showTaskList);

// ── Boot ──────────────────────────────────────────────────────────────────────
async function load() {
  const [weekRes, tasksRes] = await Promise.all([
    apiFetch("/api/fire/week"),
    apiFetch("/api/fire/tasks").catch(() => ({ ok: true, tasks: [] })),
  ]);

  if (!weekRes.ok) throw new Error(weekRes.error || "load failed");

  fireData = weekRes.data;
  taskPool = tasksRes.tasks || [];

  updateRing(weekRes.score.strikesDone, weekRes.score.strikesMax);
  render(fireData);
  renderTaskPool();
}

load().catch((err) => {
  console.error(err);
  $("cards").innerHTML =
    `<p style="padding:20px;color:#f66;font-size:14px">Fehler: ${err.message}</p>`;
});
