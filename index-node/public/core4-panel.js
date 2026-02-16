const core4Total = document.getElementById("core4Total");
const core4WeekLabel = document.getElementById("core4WeekLabel");
const core4WeekPct = document.getElementById("core4WeekPct");
const core4ProgressBar = document.getElementById("core4ProgressBar");
const core4DayStrip = document.getElementById("core4DayStrip");
const core4WeekPrev = document.getElementById("core4WeekPrev");
const core4WeekNext = document.getElementById("core4WeekNext");
const core4DomainGrid = document.getElementById("core4DomainGrid");
const core4Heatmap = document.getElementById("core4Heatmap");
const core4JournalHabit = document.getElementById("core4JournalHabit");
const core4JournalInput = document.getElementById("core4JournalInput");
const core4JournalDone = document.getElementById("core4JournalDone");
const core4JournalStatus = document.getElementById("core4JournalStatus");
const core4JournalList = document.getElementById("core4JournalList");
const core4WeekSummaryBtn = document.getElementById("core4WeekSummaryBtn");
const core4WeekExportBtn = document.getElementById("core4WeekExportBtn");

const CORE4_DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
let core4SelectedDate = "";
let core4WeekDates = [];
let core4WeekOffset = 0;
let core4DayHabits = {};
let core4WeekTotals = {};
let core4WeekTotal = 0;
const CORE4_LEGACY_SUBTASK = {
  body: { fitness: "fitness", fuel: "fuel" },
  being: { meditation: "meditation", memoirs: "memoirs" },
  balance: { person1: "partner", person2: "posterity" },
  business: { discover: "discover", declare: "declare" },
};

function core4Pad2(n) {
  return String(n).padStart(2, "0");
}

function core4IsoLocal(date) {
  return `${date.getFullYear()}-${core4Pad2(date.getMonth() + 1)}-${core4Pad2(date.getDate())}`;
}

function core4ParseDate(dateKey) {
  const parts = String(dateKey || "").split("-");
  if (parts.length !== 3) return null;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function core4GetMonday(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  d.setHours(12, 0, 0, 0);
  return d;
}

function core4BuildWeekDates(refDate) {
  const monday = core4GetMonday(refDate);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(monday);
    next.setDate(monday.getDate() + i);
    out.push(core4IsoLocal(next));
  }
  return out;
}

function core4EscapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setCore4Status(message, isError = false) {
  if (!core4JournalStatus) return;
  core4JournalStatus.textContent = message;
  core4JournalStatus.dataset.state = message ? (isError ? "error" : "ok") : "";
  if (!message) return;
  setTimeout(() => {
    if (core4JournalStatus.textContent === message) {
      core4JournalStatus.textContent = "";
      core4JournalStatus.dataset.state = "";
    }
  }, 2500);
}

function markCore4HabitDone(domain, task) {
  if (!core4DomainGrid) return;
  const selector = `button[data-domain="${domain}"][data-task="${task}"]`;
  const button = core4DomainGrid.querySelector(selector);
  if (!button) return;
  button.classList.add("is-done");
}

async function postCore4Json(url, payload) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });

    const raw = await res.text();
    let data = {};
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (_) {
        data = {};
      }
    }

    if (!res.ok || !data?.ok) {
      const fallbackError = raw && !data?.error ? raw.slice(0, 160) : "";
      return {
        ok: false,
        status: res.status,
        error: data?.error || fallbackError || `HTTP ${res.status}`,
        data,
      };
    }

    return { ok: true, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err?.message || "network error",
      data: null,
    };
  }
}

function renderCore4DayStrip() {
  if (!core4DayStrip) return;
  const today = core4IsoLocal(new Date());
  core4DayStrip.innerHTML = core4WeekDates
    .map((dateKey, idx) => {
      const dateObj = core4ParseDate(dateKey);
      const dayNum = dateObj ? dateObj.getDate() : "--";
      const isActive = dateKey === core4SelectedDate;
      const isToday = dateKey === today;
      const cls = ["core4-day-btn", isActive ? "is-active" : "", isToday ? "is-today" : ""]
        .filter(Boolean)
        .join(" ");
      return `<button class="${cls}" type="button" data-date="${dateKey}"><span class="name">${CORE4_DAY_NAMES[idx]}</span><span class="num">${dayNum}</span></button>`;
    })
    .join("");
}

function renderCore4DayState(state) {
  core4DayHabits = {};
  const domainPoints = { body: 0, being: 0, balance: 0, business: 0 };
  const entries = Array.isArray(state?.entries) ? state.entries : [];

  entries.forEach((entry) => {
    const key = `${entry.domain}:${entry.task}`;
    core4DayHabits[key] = true;
    if (Object.prototype.hasOwnProperty.call(domainPoints, entry.domain)) {
      domainPoints[entry.domain] += Number(entry.points || 0) || 0;
    }
  });

  const scoreMap = {
    body: document.getElementById("core4ScoreBody"),
    being: document.getElementById("core4ScoreBeing"),
    balance: document.getElementById("core4ScoreBalance"),
    business: document.getElementById("core4ScoreBusiness"),
  };

  Object.keys(scoreMap).forEach((domain) => {
    if (scoreMap[domain]) {
      scoreMap[domain].textContent = `${domainPoints[domain].toFixed(1)}/1`;
    }
  });

  if (!core4DomainGrid) return;
  core4DomainGrid.querySelectorAll("button[data-domain][data-task]").forEach((btn) => {
    const domain = btn.getAttribute("data-domain") || "";
    const task = btn.getAttribute("data-task") || "";
    const key = `${domain}:${task}`;
    btn.classList.toggle("is-done", Boolean(core4DayHabits[key]));
  });
}

function renderCore4Heatmap() {
  if (!core4Heatmap) return;
  core4Heatmap.innerHTML = core4WeekDates
    .map((dateKey, idx) => {
      const points = Number(core4WeekTotals[dateKey] || 0) || 0;
      const level = points === 0 ? 0 : points <= 1 ? 1 : points <= 2 ? 2 : points <= 3 ? 3 : 4;
      return `<div class="core4-heat-day"><div class="label">${CORE4_DAY_NAMES[idx]}</div><div class="bar"><div class="fill q${level}"></div></div></div>`;
    })
    .join("");
}

function renderCore4Journal(entries) {
  if (!core4JournalList) return;
  if (!Array.isArray(entries) || entries.length === 0) {
    core4JournalList.innerHTML = `<div class="core4-empty">No journal entries for this day.</div>`;
    return;
  }

  const html = entries
    .map((entry) => {
      let preview = String(entry.text || "")
        .replace(/^##[^\n]*\n+/g, "")
        .replace(/\n---\n?/g, "\n")
        .trim();
      if (preview.length > 120) {
        preview = `${preview.slice(0, 120)}...`;
      }
      return `<div class="core4-journal-entry"><span class="entry-label">${core4EscapeHtml(entry.label || "Habit")}:</span> ${core4EscapeHtml(preview)}</div>`;
    })
    .join("");

  core4JournalList.innerHTML = html;
}

async function loadCore4Day(dateKey) {
  const key = String(dateKey || "").trim();
  if (!key) return;
  try {
    const res = await fetch(`/api/core4/day-state?date=${encodeURIComponent(key)}`, { cache: "no-store" });
    const raw = await res.text();
    const data = raw ? JSON.parse(raw) : {};
    if (!res.ok || !data?.ok) {
      const reason = data?.error || `HTTP ${res.status}`;
      setCore4Status(`Day load failed: ${reason}`, true);
      return;
    }
    renderCore4DayState(data);
  } catch (err) {
    setCore4Status(`Day load failed: ${err?.message || "error"}`, true);
  }
}

async function loadCore4Week(dateKey) {
  const key = String(dateKey || "").trim();
  if (!key) return;
  try {
    const res = await fetch(`/api/core4/week-summary?date=${encodeURIComponent(key)}`, {
      cache: "no-store",
    });
    const raw = await res.text();
    const data = raw ? JSON.parse(raw) : {};
    if (!res.ok || !data?.ok) {
      const reason = data?.error || `HTTP ${res.status}`;
      setCore4Status(`Week load failed: ${reason}`, true);
      return;
    }
    core4WeekTotals = data?.totals?.by_day || {};
    core4WeekTotal = Number(data?.totals?.week_total || 0) || 0;
    if (core4WeekLabel) core4WeekLabel.textContent = data.week || "W--";
    if (core4Total) core4Total.textContent = `${core4WeekTotal.toFixed(1)}/28`;
    const pct = Math.round((core4WeekTotal / 28) * 100);
    if (core4WeekPct) core4WeekPct.textContent = `(${pct}%)`;
    if (core4ProgressBar) core4ProgressBar.style.width = `${Math.min(Math.max(pct, 0), 100)}%`;
    renderCore4Heatmap();
  } catch (err) {
    setCore4Status(`Week load failed: ${err?.message || "error"}`, true);
  }
}

async function loadCore4Journal(dateKey) {
  const key = String(dateKey || "").trim();
  if (!key) return;
  try {
    const res = await fetch(`/api/core4/journal?date=${encodeURIComponent(key)}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!data?.ok) {
      renderCore4Journal([]);
      return;
    }
    renderCore4Journal(Array.isArray(data.entries) ? data.entries : []);
  } catch (_) {
    renderCore4Journal([]);
  }
}

async function selectCore4Day(dateKey) {
  core4SelectedDate = dateKey;
  renderCore4DayStrip();
  await Promise.all([loadCore4Day(dateKey), loadCore4Week(dateKey), loadCore4Journal(dateKey)]);
}

async function shiftCore4Week(delta) {
  core4WeekOffset += delta;
  core4SelectedDate = "";
  await initCore4Week();
}

async function logCore4Habit(domain, task) {
  if (!core4SelectedDate) {
    setCore4Status("Select a day", true);
    return;
  }
  const key = `${domain}:${task}`;
  if (core4DayHabits[key]) {
    setCore4Status("Already logged");
    return;
  }

  const modern = await postCore4Json("/api/core4/log", {
    domain,
    task,
    date: core4SelectedDate,
    source: "index-node",
  });

  if (modern.ok) {
    setCore4Status(modern.data?.duplicate ? "Already logged" : "Logged");
    await Promise.all([
      loadCore4Day(core4SelectedDate),
      loadCore4Week(core4SelectedDate),
      loadCore4Journal(core4SelectedDate),
    ]);
    return;
  }

  const legacySubtask = CORE4_LEGACY_SUBTASK[domain]?.[task] || "";
  const maybeMissingModernApi =
    modern.status === 404 ||
    modern.status === 405 ||
    /cannot post|not found/i.test(String(modern.error || ""));

  if (legacySubtask && maybeMissingModernApi) {
    const legacy = await postCore4Json("/api/core4", { subtask: legacySubtask, value: 1 });
    if (!legacy.ok) {
      setCore4Status(legacy.error || modern.error || "Log failed", true);
      return;
    }
    core4DayHabits[key] = true;
    markCore4HabitDone(domain, task);
    setCore4Status(legacy.data?.duplicate ? "Already logged (legacy)" : "Logged (legacy)");
    return;
  }

  setCore4Status(modern.error || "Log failed", true);
}

async function saveCore4Journal() {
  const text = String(core4JournalInput?.value || "").trim();
  if (!text) {
    setCore4Status("Write something first", true);
    return;
  }
  if (!core4SelectedDate) {
    setCore4Status("Select a day", true);
    return;
  }
  const selected = String(core4JournalHabit?.value || "").split(":");
  const domain = String(selected[0] || "").trim().toLowerCase();
  const habit = String(selected[1] || "").trim().toLowerCase();
  if (!domain || !habit) {
    setCore4Status("Select a habit", true);
    return;
  }

  if (core4JournalDone) core4JournalDone.disabled = true;
  try {
    const res = await fetch("/api/core4/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain,
        habit,
        text,
        date: core4SelectedDate,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data?.ok) {
      setCore4Status(data?.error || "Save failed", true);
      return;
    }
    if (core4JournalInput) core4JournalInput.value = "";
    setCore4Status("Journal saved");
    await loadCore4Journal(core4SelectedDate);
  } catch (_) {
    setCore4Status("Save failed", true);
  } finally {
    if (core4JournalDone) core4JournalDone.disabled = false;
  }
}

async function showCore4WeekSummary() {
  if (!core4SelectedDate) {
    setCore4Status("Select a day", true);
    return;
  }
  await loadCore4Week(core4SelectedDate);
  setCore4Status(`Week: ${core4WeekTotal.toFixed(1)}/28`);
}

async function exportCore4Week() {
  if (!core4SelectedDate) {
    setCore4Status("Select a day", true);
    return;
  }
  try {
    const res = await fetch("/api/core4/export-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: core4SelectedDate }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data?.ok) {
      setCore4Status(data?.error || "Export failed", true);
      return;
    }
    setCore4Status("Exported to Vault");
  } catch (_) {
    setCore4Status("Export failed", true);
  }
}

function wireCore4Events() {
  if (core4WeekPrev) {
    core4WeekPrev.addEventListener("click", () => {
      void shiftCore4Week(-1);
    });
  }
  if (core4WeekNext) {
    core4WeekNext.addEventListener("click", () => {
      void shiftCore4Week(1);
    });
  }
  if (core4DayStrip) {
    core4DayStrip.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-date]");
      if (!btn) return;
      const dateKey = btn.getAttribute("data-date") || "";
      if (!dateKey || dateKey === core4SelectedDate) return;
      void selectCore4Day(dateKey);
    });
  }
  if (core4DomainGrid) {
    core4DomainGrid.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-domain][data-task]");
      if (!btn) return;
      const domain = btn.getAttribute("data-domain") || "";
      const task = btn.getAttribute("data-task") || "";
      if (!domain || !task) return;
      void logCore4Habit(domain, task);
    });
  }
  if (core4JournalDone) {
    core4JournalDone.addEventListener("click", () => {
      void saveCore4Journal();
    });
  }
  if (core4JournalInput) {
    core4JournalInput.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void saveCore4Journal();
      }
    });
  }
  if (core4WeekSummaryBtn) {
    core4WeekSummaryBtn.addEventListener("click", () => {
      void showCore4WeekSummary();
    });
  }
  if (core4WeekExportBtn) {
    core4WeekExportBtn.addEventListener("click", () => {
      void exportCore4Week();
    });
  }
}

async function initCore4Week() {
  const ref = new Date();
  ref.setDate(ref.getDate() + core4WeekOffset * 7);
  core4WeekDates = core4BuildWeekDates(ref);

  if (!core4SelectedDate || !core4WeekDates.includes(core4SelectedDate)) {
    const today = core4IsoLocal(new Date());
    core4SelectedDate = core4WeekDates.includes(today) ? today : core4WeekDates[0];
  }

  renderCore4DayStrip();
  await Promise.all([
    loadCore4Day(core4SelectedDate),
    loadCore4Week(core4SelectedDate),
    loadCore4Journal(core4SelectedDate),
  ]);
}

window.initCore4Panel = function initCore4Panel() {
  if (!core4DomainGrid || !core4DayStrip) return;
  wireCore4Events();
  void initCore4Week();
};
