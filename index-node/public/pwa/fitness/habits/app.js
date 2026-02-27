import { isoToday, toast } from "../_shared/util.js";

const API_BASE = "http://127.0.0.1:8789"; // local fitness-api

const els = {
  connectBtn: document.getElementById("connectBtn"),
  status: document.getElementById("status"),
  dateInput: document.getElementById("dateInput"),
  loadBtn: document.getElementById("loadBtn"),
  newBtn: document.getElementById("newBtn"),
  saveBtn: document.getElementById("saveBtn"),
  list: document.getElementById("list"),
  habitsGrid: document.getElementById("habitsGrid"),
  notes: document.getElementById("notes"),
  summary: document.getElementById("summary"),
};

const state = {
  defs: [],
  day: null,
  date: isoToday(),
};

function setStatus(msg) {
  els.status.textContent = msg;
}

function setConnected(on) {
  els.saveBtn.disabled = !on;
  els.notes.disabled = !on;
}

async function loadDefs() {
  const res = await fetch(`${API_BASE}/data`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  state.defs = Array.isArray(data.data?.habits?.habits) ? data.data.habits.habits : [];
}

function buildDay(date) {
  const habits = state.defs.map((def) => ({
    id: def.id,
    label: def.label || def.id,
    type: def.type || "boolean",
    done: false,
    count: 0,
    target: def.target_per_day || 1,
    color: def.color || null,
  }));
  return { date, habits, notes: "" };
}

function mergeDayWithDefs(day) {
  const map = new Map((day.habits || []).map((h) => [h.id, h]));
  const habits = state.defs.map((def) => {
    const existing = map.get(def.id) || {};
    const type = def.type || existing.type || "boolean";
    const target = def.target_per_day || existing.target || 1;
    const count = typeof existing.count === "number" ? existing.count : 0;
    const done = type === "boolean" ? !!existing.done : count >= target;
    return {
      id: def.id,
      label: def.label || existing.label || def.id,
      type,
      done,
      count,
      target,
      color: def.color || existing.color || null,
    };
  });
  return {
    date: day.date,
    habits,
    notes: typeof day.notes === "string" ? day.notes : "",
  };
}

async function fetchDay(date) {
  const res = await fetch(`${API_BASE}/habits?date=${encodeURIComponent(date)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.data || null;
}

async function loadDay(date, { fallbackToTemplate } = {}) {
  let day = await fetchDay(date);
  if (!day && fallbackToTemplate) {
    day = buildDay(date);
    toast("Template loaded. Save to create the day file.");
  }
  if (!day) return;
  day.date = date;
  state.day = mergeDayWithDefs(day);
  state.date = date;
  els.dateInput.value = date;
  els.notes.value = state.day.notes;
  renderHabits();
  setActiveListItem(date);
}

async function newDay() {
  const date = els.dateInput.value || isoToday();
  state.day = buildDay(date);
  state.date = date;
  els.dateInput.value = date;
  els.notes.value = "";
  renderHabits();
  setActiveListItem(date);
}

async function saveDay() {
  if (!state.day) return;
  const date = els.dateInput.value || isoToday();
  state.day.date = date;
  state.day.notes = els.notes.value;
  const res = await fetch(`${API_BASE}/habits`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date, habits: state.day.habits, notes: state.day.notes }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  toast("Saved.");
  await refreshList();
  setActiveListItem(date);
}

async function refreshList() {
  const res = await fetch(`${API_BASE}/habits/list`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const sorted = (data.entries || []).slice();
  els.list.innerHTML = "";
  for (const entry of sorted.slice(0, 40)) {
    const date = entry.date;
    const item = document.createElement("button");
    item.type = "button";
    item.className = "item";
    item.innerHTML = `<span class="date">${date}</span><span class="tag">habits</span>`;
    item.addEventListener("click", () => {
      els.dateInput.value = date;
      loadDay(date, { fallbackToTemplate: true });
    });
    els.list.appendChild(item);
  }
}

function setActiveListItem(date) {
  for (const item of els.list.querySelectorAll(".item")) {
    const text = item.querySelector(".date")?.textContent || "";
    item.classList.toggle("active", text === date);
  }
}

function habitProgress(habit) {
  if (habit.type === "boolean") return habit.done ? 1 : 0;
  const target = habit.target || 1;
  return Math.min(habit.count / target, 1);
}

function applyDelta(habit, delta) {
  if (habit.type === "boolean") {
    habit.done = !habit.done;
    habit.count = habit.done ? habit.target : 0;
  } else {
    habit.count = Math.max(0, (habit.count || 0) + delta);
    habit.done = habit.count >= habit.target;
  }
  renderHabits();
}

function renderHabits() {
  if (!state.day) return;
  els.habitsGrid.innerHTML = "";
  let complete = 0;
  state.day.habits.forEach((habit, index) => {
    const percent = habitProgress(habit);
    if (habit.done) complete += 1;
    const card = document.createElement("div");
    card.className = "habit-card reveal";
    card.style.setProperty("--delay", `${80 + index * 40}ms`);

    const ring = document.createElement("div");
    ring.className = "ring";
    ring.style.setProperty("--ring-color", habit.color || "#e4572e");
    ring.style.setProperty("--ring-turn", `${percent}turn`);
    ring.addEventListener("click", () => applyDelta(habit, 1));

    const ringInner = document.createElement("div");
    ringInner.className = "ring-inner";
    ringInner.innerHTML = `<div class="ring-value">${Math.round(percent * 100)}%</div><div class="ring-label">${habit.label}</div>`;
    ring.appendChild(ringInner);

    const actions = document.createElement("div");
    actions.className = "actions";
    if (habit.type === "boolean") {
      const toggle = document.createElement("button");
      toggle.className = "btn small";
      toggle.textContent = habit.done ? "Undo" : "Done";
      toggle.addEventListener("click", () => applyDelta(habit, 1));
      actions.appendChild(toggle);
    } else {
      const minus = document.createElement("button");
      minus.className = "btn small";
      minus.textContent = "-";
      minus.addEventListener("click", () => applyDelta(habit, -1));
      const plus = document.createElement("button");
      plus.className = "btn small";
      plus.textContent = "+";
      plus.addEventListener("click", () => applyDelta(habit, 1));
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = `${habit.count}/${habit.target}`;
      actions.append(minus, meta, plus);
    }

    card.append(ring, actions);
    els.habitsGrid.appendChild(card);
  });

  const total = state.day.habits.length || 1;
  els.summary.textContent = `${complete}/${total} complete`;
}

function bind() {
  els.dateInput.value = state.date;
  els.connectBtn.addEventListener("click", () => loadDay(state.date, { fallbackToTemplate: true }));
  els.loadBtn.addEventListener("click", () => loadDay(els.dateInput.value, { fallbackToTemplate: true }));
  els.newBtn.addEventListener("click", newDay);
  els.saveBtn.addEventListener("click", saveDay);
  els.notes.addEventListener("input", () => {
    if (state.day) state.day.notes = els.notes.value;
  });
}

bind();
setConnected(true);
loadDefs().then(() => refreshList().then(() => loadDay(state.date, { fallbackToTemplate: true })).catch(() => setStatus("API offline"))).catch(() => setStatus("API offline"));
