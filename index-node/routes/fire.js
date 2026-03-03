// ================================================================
// Fire Router - /api/fire routes
// ================================================================
//
// FIRE = 4×4 Weekly Strikes (4 Domains × 4 Strikes = 16 max)
// Storage: ~/.aos/fire/YYYY-Www.json (one file per ISO week)
//
// Routes:
//   GET  /api/fire/week        → current week data + score
//   GET  /api/fire/tasks       → pending tasks (Taskwarrior → TickTick fallback)
//   GET  /api/fire/tasks-week  → weekly tasks (Taskwarrior → TickTick fallback)
//   GET  /api/fire/tasks-day   → daily tasks (Taskwarrior → TickTick fallback)
//   GET  /api/fire/week-range  → week labels/range for calendar UI
//   POST /api/fire/toggle      → { domain, index } toggle done
//   POST /api/fire/rename      → { domain, index, title } rename strike
//   POST /api/fire/reorder     → { domain, order: [0,2,1,3] } reorder strikes
//
// Task Sources:
//   1. TickTick API (primary, cloud)
//   2. Taskwarrior export (fallback, local)
//
// ================================================================

import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";

const router = express.Router();

// ── Config ────────────────────────────────────────────────────────────────────

const FIRE_DIR = process.env.FIRE_DIR || path.join(os.homedir(), ".aos", "fire");
const ALLOWED  = new Set(["body", "being", "balance", "business"]);

// TickTick
const TICK_ENV_PATH = process.env.TICK_ENV || path.join(os.homedir(), ".alpha_os", "tick.env");

// Taskwarrior
const TASK_EXPORT_PATH = process.env.TASK_EXPORT || path.join(os.homedir(), ".local", "share", "alphaos", "task_export.json");
const TASK_BIN         = process.env.TASK_BIN || "task";
const TASKRC           = process.env.TASKRC || "";
const TASK_CACHE_TTL   = Number(process.env.TASK_CACHE_TTL || 30);
const TASK_EXPORT_FILTER = String(process.env.TASK_EXPORT_FILTER || "").trim();

// Fire task filtering
const FIRE_INCLUDE_UNDATED = String(process.env.FIRE_INCLUDE_UNDATED || "1").trim() !== "0";
const FIRE_TASK_TAGS_MODE  = String(process.env.FIRE_TASK_TAGS_MODE || (process.env.FIRE_TASK_TAGS_ALL ? "all" : "any")).trim().toLowerCase();
const FIRE_TASK_TAGS = String(process.env.FIRE_TASK_TAGS || process.env.FIRE_TASK_TAGS_ALL || "production,hit,fire")
  .split(",")
  .map((tag) => tag.trim().toLowerCase())
  .filter(Boolean);
const FIRE_TASK_DATE_FIELDS = String(process.env.FIRE_TASK_DATE_FIELDS || "scheduled,due,wait")
  .split(",")
  .map((field) => field.trim())
  .filter(Boolean);

let TASK_CACHE = { ts: 0, tasks: [], error: null };

// ── Fire Storage Helpers ──────────────────────────────────────────────────────

function ensureDir() {
  fs.mkdirSync(FIRE_DIR, { recursive: true });
}

function weekKey(date = new Date()) {
  // ISO 8601: Monday-based, YYYY-Www
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const n = 1 + Math.round(
    ((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
  return `${d.getFullYear()}-W${String(n).padStart(2, "0")}`;
}

function makeBase(wk) {
  const mk4 = () => [
    { title: "Strike #1", done: false },
    { title: "Strike #2", done: false },
    { title: "Strike #3", done: false },
    { title: "Strike #4", done: false },
  ];
  return {
    week: wk,
    domains: { body: mk4(), being: mk4(), balance: mk4(), business: mk4() },
    meta: { createdAt: new Date().toISOString() },
  };
}

function readWeek(wk) {
  try {
    return JSON.parse(fs.readFileSync(path.join(FIRE_DIR, `${wk}.json`), "utf8"));
  } catch {
    return null;
  }
}

function writeWeek(wk, data) {
  ensureDir();
  fs.writeFileSync(
    path.join(FIRE_DIR, `${wk}.json`),
    JSON.stringify(data, null, 2) + "\n",
    "utf8"
  );
}

function score(data) {
  const all = Object.values(data.domains).flat();
  return { strikesDone: all.filter((s) => s.done).length, strikesMax: 16 };
}

function filterFireTasksByDomain(tasks, domainRaw) {
  const domain = String(domainRaw || "").trim().toLowerCase();
  if (!domain) return tasks;
  if (!ALLOWED.has(domain)) return null;
  return tasks.filter((task) => String(task.domain || "").toLowerCase() === domain);
}

// ── TickTick Helpers ──────────────────────────────────────────────────────────

function parseEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf8");
    const out = {};
    raw.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!key) return;
      out[key] = val.replace(/^['"]|['"]$/g, "");
    });
    return out;
  } catch (_) {
    return {};
  }
}

function getTickConfig() {
  const env = parseEnvFile(TICK_ENV_PATH);
  const token = env.TICKTICK_TOKEN || env.TICKTICK_API_TOKEN || "";
  const projectId = env.TICKTICK_PROJECT_ID || env.TICKTICK_PROJECT || "";
  return { token, projectId };
}

async function ticktickListProjectTasks() {
  const { token, projectId } = getTickConfig();
  if (!token) {
    throw new Error("ticktick-token-missing");
  }
  if (!projectId) {
    throw new Error("ticktick-project-missing");
  }

  const res = await fetch(
    `https://api.ticktick.com/open/v1/project/${encodeURIComponent(projectId)}/tasks`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ticktick-error-${res.status}:${text}`);
  }

  return res.json();
}

function parseTickTickDue(task) {
  if (!task) return null;
  const raw = task.dueDateTime || task.dueDate || task.due;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function taskInRange(task, start, end) {
  const due = parseTickTickDue(task);
  if (!due) return false;
  return due >= start && due < end;
}

function detectDomainFromTags(tags) {
  const tagStr = (tags || []).map((t) => String(t || "").toLowerCase()).join(" ");
  if (/\bbody\b/.test(tagStr)) return "body";
  if (/\bbeing\b/.test(tagStr)) return "being";
  if (/\bbalance\b/.test(tagStr)) return "balance";
  if (/\bbusiness\b/.test(tagStr)) return "business";
  return "other";
}

// ── Taskwarrior Helpers ───────────────────────────────────────────────────────

function loadTaskwarriorExport() {
  const now = Date.now();
  if (TASK_CACHE_TTL > 0 && now - TASK_CACHE.ts < TASK_CACHE_TTL * 1000 && TASK_CACHE.tasks.length) {
    return { ok: true, tasks: TASK_CACHE.tasks, source: "cache" };
  }

  const readExportFile = (allowStale = false) => {
    try {
      if (!TASK_EXPORT_PATH || !fs.existsSync(TASK_EXPORT_PATH)) return null;
      const st = fs.statSync(TASK_EXPORT_PATH);
      if (!allowStale && TASK_CACHE_TTL > 0 && now - st.mtimeMs > TASK_CACHE_TTL * 1000) {
        return null;
      }
      const raw = fs.readFileSync(TASK_EXPORT_PATH, "utf8");
      const tasks = JSON.parse(raw);
      if (!Array.isArray(tasks)) return null;
      TASK_CACHE = { ts: now, tasks, error: null };
      return { ok: true, tasks, source: allowStale ? "file-stale" : "file" };
    } catch (_) {
      return null;
    }
  };

  const fileFresh = readExportFile(false);
  if (fileFresh) return fileFresh;

  const args = [];
  if (TASK_EXPORT_FILTER) {
    args.push(...TASK_EXPORT_FILTER.split(/\s+/).filter(Boolean));
  }
  args.push("export");

  try {
    const env = TASKRC ? { ...process.env, TASKRC } : process.env;
    const stdout = execFileSync(TASK_BIN, args, { encoding: "utf8", timeout: 8000, env });
    const tasks = JSON.parse(stdout);
    if (!Array.isArray(tasks)) return { ok: false, error: "invalid-export" };
    TASK_CACHE = { ts: now, tasks, error: null };
    try {
      if (TASK_EXPORT_PATH) {
        const dir = path.dirname(TASK_EXPORT_PATH);
        fs.mkdirSync(dir, { recursive: true });
        const tmp = `${TASK_EXPORT_PATH}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(tasks, null, 2), "utf8");
        fs.renameSync(tmp, TASK_EXPORT_PATH);
      }
    } catch (_) {}
    return { ok: true, tasks, source: "live" };
  } catch (err) {
    const fileStale = readExportFile(true);
    if (fileStale) {
      TASK_CACHE.error = String(err);
      return fileStale;
    }
    return { ok: false, error: String(err) };
  }
}

function parseTaskwarriorDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const match = text.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

function fireTaskHasAllTags(taskTags, required) {
  if (!required.length) return true;
  const tags = (taskTags || []).map((t) => String(t || "").toLowerCase());
  return required.every((tag) => tags.includes(tag));
}

function fireTaskHasAnyTag(taskTags, required) {
  if (!required.length) return true;
  const tags = (taskTags || []).map((t) => String(t || "").toLowerCase());
  return required.some((tag) => tags.includes(tag));
}

function fireTaskMatchesTags(taskTags, required) {
  if (!required.length) return true;
  if (FIRE_TASK_TAGS_MODE === "all") return fireTaskHasAllTags(taskTags, required);
  return fireTaskHasAnyTag(taskTags, required);
}

function fireTaskDateCandidates(task) {
  const dates = [];
  FIRE_TASK_DATE_FIELDS.forEach((field) => {
    const value = parseTaskwarriorDate(task[field]);
    if (value) dates.push(value);
  });
  return dates;
}

function fireTaskPrimaryDate(task) {
  const dates = fireTaskDateCandidates(task);
  if (!dates.length) return null;
  return new Date(Math.min(...dates.map((d) => d.getTime())));
}

function fireTaskInRange(task, start, end, includeOverdue) {
  const date = fireTaskPrimaryDate(task);
  if (!date) return false;
  if (includeOverdue && date < start) return true;
  return date >= start && date < end;
}

function detectFireDomain(task) {
  const tags = (task.tags || []).map((t) => String(t || "").toLowerCase());
  const project = String(task.project || "").toLowerCase();
  const haystack = `${project} ${tags.join(" ")}`;
  if (/\bbody\b/.test(haystack)) return "body";
  if (/\bbeing\b/.test(haystack)) return "being";
  if (/\bbalance\b/.test(haystack)) return "balance";
  if (/\bbusiness\b/.test(haystack)) return "business";
  return "other";
}

function normalizeFireTask(task, referenceDate) {
  const date = fireTaskPrimaryDate(task);
  const title = task.description || "(ohne Titel)";
  return {
    id: task.id || task.uuid,
    title,
    description: title,
    tags: task.tags || [],
    project: task.project || "",
    due: task.due || "",
    scheduled: task.scheduled || "",
    date: date ? date.toISOString() : "",
    domain: detectFireDomain(task),
    overdue: date ? date < referenceDate : false,
  };
}

function isoWeekString(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getWeekRangeLocal(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const week = isoWeekString(start);
  const rangeLabel = `${start.toLocaleDateString("de-DE")} – ${new Date(end.getTime() - 1).toLocaleDateString("de-DE")}`;
  return { start, end, week, rangeLabel };
}

function getDayRangeLocal(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = new Date(d);
  const end = new Date(d);
  end.setDate(start.getDate() + 1);
  return { start, end, label: start.toLocaleDateString("de-DE") };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/fire/week
router.get("/week", (req, res) => {
  try {
    const wk  = weekKey();
    let data  = readWeek(wk);
    if (!data) {
      data = makeBase(wk);
      writeWeek(wk, data);
    }
    res.json({ ok: true, data, score: score(data) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/fire/tasks  – pending tasks (Taskwarrior → TickTick fallback)
router.get("/tasks", async (req, res) => {
  const { start, end } = getWeekRangeLocal();
  let tasks = [];
  let error = null;
  let source = "taskwarrior";

  // Try Taskwarrior FIRST (primary local source)
  try {
    const { ok, error: taskError, tasks: twTasks } = loadTaskwarriorExport();
    if (!ok) throw new Error(taskError || "task-export-failed");

    const filtered = twTasks
      .filter((task) => {
        const st = String(task.status || "").toLowerCase();
        return st === "pending" || st === "waiting";
      })
      .filter((task) => {
        if (fireTaskInRange(task, start, end, true)) return true;
        if (!FIRE_INCLUDE_UNDATED) return false;
        if (fireTaskPrimaryDate(task)) return false;
        return fireTaskMatchesTags(task.tags, FIRE_TASK_TAGS);
      })
      .map((task) => normalizeFireTask(task, start));

    tasks = filtered.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db;
    });
    error = null;
  } catch (twErr) {
    // Taskwarrior failed, try TickTick as fallback
    source = "ticktick";
    error = twErr?.message || String(twErr);
    try {
      const raw = await ticktickListProjectTasks();
      const filtered = raw
        .filter((task) => !task.isCompleted && !task.completedTime)
        .filter((task) => taskInRange(task, start, end))
        .map((task) => {
          const due = parseTickTickDue(task);
          const title = task.title || "(no title)";
          return {
            id: task.id,
            title,
            description: title,
            tags: task.tags || [],
            due: due ? due.toISOString() : (task.dueDateTime || task.dueDate || ""),
            date: due ? due.toISOString() : (task.dueDateTime || task.dueDate || ""),
            domain: detectDomainFromTags(task.tags),
            overdue: due ? due < start : false
          };
        });

      tasks = filtered.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
      error = null;
    } catch (tickErr) {
      error = `Taskwarrior: ${twErr?.message || twErr} | TickTick: ${tickErr?.message || tickErr}`;
    }
  }

  res.json({ ok: true, tasks, source, error });
});

// GET /api/fire/tasks-week
router.get("/tasks-week", async (req, res) => {
  const { start, end, week, rangeLabel } = getWeekRangeLocal();
  let tasks = [];
  let error = null;
  let source = "taskwarrior";

  try {
    const { ok, error: taskError, tasks: twTasks } = loadTaskwarriorExport();
    if (!ok) throw new Error(taskError || "task-export-failed");

    const filtered = twTasks
      .filter((task) => {
        const st = String(task.status || "").toLowerCase();
        return st === "pending" || st === "waiting";
      })
      .filter((task) => {
        if (fireTaskInRange(task, start, end, true)) return true;
        if (!FIRE_INCLUDE_UNDATED) return false;
        if (fireTaskPrimaryDate(task)) return false;
        return fireTaskMatchesTags(task.tags, FIRE_TASK_TAGS);
      })
      .map((task) => normalizeFireTask(task, start));

    tasks = filtered.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db;
    });
    error = null;
  } catch (twErr) {
    source = "ticktick";
    error = twErr?.message || String(twErr);
    try {
      const raw = await ticktickListProjectTasks();
      const filtered = raw
        .filter((task) => !task.isCompleted && !task.completedTime)
        .filter((task) => taskInRange(task, start, end))
        .map((task) => {
          const due = parseTickTickDue(task);
          return {
            id: task.id,
            title: task.title || "(no title)",
            tags: task.tags || [],
            due: due ? due.toISOString() : (task.dueDateTime || task.dueDate || ""),
            date: due ? due.toISOString() : (task.dueDateTime || task.dueDate || ""),
            domain: detectDomainFromTags(task.tags),
            overdue: due ? due < start : false
          };
        });

      tasks = filtered.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
      error = null;
    } catch (tickErr) {
      error = `Taskwarrior: ${twErr?.message || twErr} | TickTick: ${tickErr?.message || tickErr}`;
    }
  }

  const domainFiltered = filterFireTasksByDomain(tasks, req.query.domain);
  if (domainFiltered === null) {
    return res.status(400).json({ ok: false, error: "invalid_domain" });
  }

  return res.json({
    ok: tasks.length > 0 || !error,
    source,
    week,
    rangeLabel,
    tasks: domainFiltered,
    error,
    gcal_url: FIRE_GCAL_EMBED_URL || "",
  });
});

// GET /api/fire/tasks-day
router.get("/tasks-day", async (req, res) => {
  const { start, end, label } = getDayRangeLocal();
  let tasks = [];
  let error = null;
  let source = "taskwarrior";

  try {
    const { ok, error: taskError, tasks: twTasks } = loadTaskwarriorExport();
    if (!ok) throw new Error(taskError || "task-export-failed");

    const filtered = twTasks
      .filter((task) => {
        const st = String(task.status || "").toLowerCase();
        return st === "pending" || st === "waiting";
      })
      .filter((task) => {
        if (fireTaskInRange(task, start, end, true)) return true;
        if (!FIRE_INCLUDE_UNDATED) return false;
        if (fireTaskPrimaryDate(task)) return false;
        return fireTaskMatchesTags(task.tags, FIRE_TASK_TAGS);
      })
      .map((task) => normalizeFireTask(task, start));

    tasks = filtered.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db;
    });
    error = null;
  } catch (twErr) {
    source = "ticktick";
    error = twErr?.message || String(twErr);
    try {
      const raw = await ticktickListProjectTasks();
      const filtered = raw
        .filter((task) => !task.isCompleted && !task.completedTime)
        .filter((task) => taskInRange(task, start, end))
        .map((task) => {
          const due = parseTickTickDue(task);
          return {
            id: task.id,
            title: task.title || "(no title)",
            tags: task.tags || [],
            due: due ? due.toISOString() : (task.dueDateTime || task.dueDate || ""),
            date: due ? due.toISOString() : (task.dueDateTime || task.dueDate || ""),
            domain: detectDomainFromTags(task.tags),
            overdue: due ? due < start : false
          };
        });

      tasks = filtered.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
      error = null;
    } catch (tickErr) {
      error = `Taskwarrior: ${twErr?.message || twErr} | TickTick: ${tickErr?.message || tickErr}`;
    }
  }

  const domainFiltered = filterFireTasksByDomain(tasks, req.query.domain);
  if (domainFiltered === null) {
    return res.status(400).json({ ok: false, error: "invalid_domain" });
  }

  return res.json({
    ok: tasks.length > 0 || !error,
    source,
    date: label,
    tasks: domainFiltered,
    error,
    gcal_url: FIRE_GCAL_EMBED_URL || "",
  });
});

// GET /api/fire/week-range
router.get("/week-range", (req, res) => {
  try {
    const dateParam = req.query?.date;
    const date = dateParam ? new Date(dateParam) : new Date();

    if (isNaN(date.getTime())) {
      return res.status(400).json({ ok: false, error: "invalid date" });
    }

    const { start, end, week, rangeLabel } = getWeekRangeLocal(date);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({
        date: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }),
        dayOfWeek: d.getDay()
      });
    }

    return res.json({
      ok: true,
      week,
      rangeLabel,
      start: start.toISOString(),
      end: end.toISOString(),
      days
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/fire/toggle  { domain, index }
router.post("/toggle", (req, res) => {
  try {
    const { domain, index } = req.body || {};
    if (!ALLOWED.has(domain))
      return res.status(400).json({ ok: false, error: "invalid_domain" });
    if (!Number.isInteger(index) || index < 0 || index > 3)
      return res.status(400).json({ ok: false, error: "invalid_index" });

    const wk   = weekKey();
    const data = readWeek(wk) || makeBase(wk);
    data.domains[domain][index].done = !data.domains[domain][index].done;
    writeWeek(wk, data);
    res.json({ ok: true, data, score: score(data) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/fire/rename  { domain, index, title }
router.post("/rename", (req, res) => {
  try {
    const { domain, index, title } = req.body || {};
    if (!ALLOWED.has(domain))
      return res.status(400).json({ ok: false, error: "invalid_domain" });
    if (!Number.isInteger(index) || index < 0 || index > 3)
      return res.status(400).json({ ok: false, error: "invalid_index" });
    const t = String(title || "").trim().slice(0, 80);
    if (!t)
      return res.status(400).json({ ok: false, error: "invalid_title" });

    const wk   = weekKey();
    const data = readWeek(wk) || makeBase(wk);
    data.domains[domain][index].title = t;
    writeWeek(wk, data);
    res.json({ ok: true, data, score: score(data) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/fire/reorder  { domain, order: [2,0,3,1] }
router.post("/reorder", (req, res) => {
  try {
    const { domain, order } = req.body || {};
    if (!ALLOWED.has(domain))
      return res.status(400).json({ ok: false, error: "invalid_domain" });
    if (!Array.isArray(order) || order.length !== 4 ||
        !order.every((i) => Number.isInteger(i) && i >= 0 && i <= 3))
      return res.status(400).json({ ok: false, error: "invalid_order" });

    const wk      = weekKey();
    const data    = readWeek(wk) || makeBase(wk);
    const orig    = data.domains[domain];
    data.domains[domain] = order.map((i) => orig[i]);
    writeWeek(wk, data);
    res.json({ ok: true, data, score: score(data) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
