import { pickRepoDir, getSubdir, listFilenames, readJsonFile, writeJsonFile } from "../_shared/fs.js";
import { isoToday, toast } from "../_shared/util.js";

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
  root: null,
  habitsDir: null,
  dataDir: null,
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

async function connect() {
  try {
    state.root = await pickRepoDir();
    state.habitsDir = await getSubdir(state.root, ["personal", "habits"], true);
    state.dataDir = await getSubdir(state.root, ["data"], false);
    await loadDefs();
    setStatus(`connected: ${state.root.name}`);
    setConnected(true);
    await refreshList();
    await loadDay(state.date, { fallbackToTemplate: true });
  } catch (err) {
    toast(err.message || "Failed to connect.");
  }
}

async function loadDefs() {
  const data = await readJsonFile(state.dataDir, "habits.json");
  state.defs = Array.isArray(data.habits) ? data.habits : [];
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

async function readIfExists(filename) {
  try {
    return await readJsonFile(state.habitsDir, filename);
  } catch (err) {
    if (err && err.name === "NotFoundError") return null;
    throw err;
  }
}

async function loadDay(date, { fallbackToTemplate } = {}) {
  if (!state.habitsDir) return;
  const filename = `${date}.json`;
  let day = await readIfExists(filename);
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
  if (!state.habitsDir) return;
  const date = els.dateInput.value || isoToday();
  state.day = buildDay(date);
  state.date = date;
  els.dateInput.value = date;
  els.notes.value = "";
  renderHabits();
  setActiveListItem(date);
}

async function saveDay() {
  if (!state.habitsDir || !state.day) return;
  const date = els.dateInput.value || isoToday();
  state.day.date = date;
  state.day.notes = els.notes.value;
  await writeJsonFile(state.habitsDir, `${date}.json`, state.day);
  toast("Saved.");
  await refreshList();
  setActiveListItem(date);
}

async function refreshList() {
  const names = await listFilenames(state.habitsDir, { suffix: ".json" });
  const sorted = names.slice().sort().reverse();
  els.list.innerHTML = "";
  for (const name of sorted.slice(0, 40)) {
    const date = name.replace(".json", "");
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
  els.connectBtn.addEventListener("click", connect);
  els.loadBtn.addEventListener("click", () => loadDay(els.dateInput.value, { fallbackToTemplate: true }));
  els.newBtn.addEventListener("click", newDay);
  els.saveBtn.addEventListener("click", saveDay);
  els.notes.addEventListener("input", () => {
    if (state.day) state.day.notes = els.notes.value;
  });
}

bind();
setConnected(false);
