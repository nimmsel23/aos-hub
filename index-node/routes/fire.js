// ================================================================
// Fire Router - /api/fire routes
// ================================================================
//
// FIRE = Wochen-/Tages-Plan aus Taskwarrior (SSOT)
//
// Routes:
//   GET  /api/fire/week        → weekly tasks (Taskwarrior)
//   GET  /api/fire/day         → daily tasks (Taskwarrior)
//   GET  /api/fire/week-range  → week labels/range for calendar UI
//
// Optional:
//   ?domain=body|being|balance|business
//
// ================================================================

import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";

const router = express.Router();

// ── Config ────────────────────────────────────────────────────────────────────

const ALLOWED  = new Set(["body", "being", "balance", "business"]);

// Taskwarrior
const FIRE_ENV_FILE =
  process.env.AOS_FIRE_ENV_FILE ||
  path.join(process.cwd(), "game", "fire", "fire.env");
const FALLBACK_FIRE_ENV_FILE = path.join(os.homedir(), ".env", "fire.env");

function readEnvFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return {};
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

const FIRE_ENV =
  Object.keys(readEnvFile(FIRE_ENV_FILE)).length
    ? readEnvFile(FIRE_ENV_FILE)
    : readEnvFile(FALLBACK_FIRE_ENV_FILE);

const envGet = (key, fallback = "") =>
  String(process.env[key] ?? FIRE_ENV[key] ?? fallback).trim();

const TASK_EXPORT_PATH = envGet("TASK_EXPORT", path.join(os.homedir(), ".local", "share", "alphaos", "task_export.json"));
const TASK_BIN         = envGet("TASK_BIN", "task");
const TASKRC           = envGet("TASKRC", "");
const TASK_CACHE_TTL   = Number(envGet("TASK_CACHE_TTL", "30"));
const TASK_EXPORT_FILTER = envGet("TASK_EXPORT_FILTER", "");

// Fire task filtering
const FIRE_INCLUDE_UNDATED = envGet("FIRE_INCLUDE_UNDATED", "1") !== "0";
const FIRE_TASK_TAGS_MODE  = envGet("FIRE_TASK_TAGS_MODE", (envGet("FIRE_TASK_TAGS_ALL") ? "all" : "any")).toLowerCase();
const FIRE_TASK_TAGS = String(envGet("FIRE_TASK_TAGS", envGet("FIRE_TASK_TAGS_ALL", "production,hit,fire")))
  .split(",")
  .map((tag) => tag.trim().toLowerCase())
  .filter(Boolean);
const FIRE_TASK_EXCLUDE_TAGS = String(envGet("FIRE_TASK_EXCLUDE_TAGS", "door,mission"))
  .split(",")
  .map((tag) => tag.trim().toLowerCase())
  .filter(Boolean);
const FIRE_TASK_DATE_FIELDS = String(envGet("FIRE_TASK_DATE_FIELDS", "scheduled,due,wait"))
  .split(",")
  .map((field) => field.trim())
  .filter(Boolean);
const FIRE_GCAL_EMBED_URL = envGet("FIRE_GCAL_EMBED_URL", "");

let TASK_CACHE = { ts: 0, ok: true, tasks: [], error: null };

function filterFireTasksByDomain(tasks, domainRaw) {
  const domain = String(domainRaw || "").trim().toLowerCase();
  if (!domain) return tasks;
  if (!ALLOWED.has(domain)) return null;
  return tasks.filter((task) => String(task.domain || "").toLowerCase() === domain);
}

// ── Taskwarrior Helpers ───────────────────────────────────────────────────────

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

function fireTaskHasExcludedTag(taskTags) {
  if (!FIRE_TASK_EXCLUDE_TAGS.length) return false;
  const tags = (taskTags || []).map((t) => String(t || "").toLowerCase());
  return FIRE_TASK_EXCLUDE_TAGS.some((tag) => tags.includes(tag));
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

function taskDomain(task) {
  const raw = String(task?.domain || "").trim().toLowerCase();
  if (!ALLOWED.has(raw)) return "";
  return raw;
}

function normalizeFireTask(task, referenceDate) {
  const date = fireTaskPrimaryDate(task);
  const domain = taskDomain(task);
  if (!domain) return null;
  return {
    id: task.id || task.uuid,
    uuid: task.uuid || "",
    title: task.description || "(ohne Titel)",
    tags: task.tags || [],
    project: task.project || "",
    due: task.due || "",
    scheduled: task.scheduled || "",
    date: date ? date.toISOString() : "",
    domain,
    overdue: date ? date < referenceDate : false,
  };
}

function loadTaskwarriorExport() {
  const now = Date.now();
  if (TASK_CACHE.ts && (now - TASK_CACHE.ts) < TASK_CACHE_TTL * 1000) {
    return TASK_CACHE;
  }

  let raw = "";
  let error = null;
  try {
    if (fs.existsSync(TASK_EXPORT_PATH)) {
      raw = fs.readFileSync(TASK_EXPORT_PATH, "utf8");
    }
  } catch (err) {
    error = err?.message || String(err);
  }

  if (!raw) {
    try {
      const args = ["export"];
      if (TASK_EXPORT_FILTER) args.push(TASK_EXPORT_FILTER);
      const env = { ...process.env };
      if (TASKRC) env.TASKRC = TASKRC;
      raw = execFileSync(TASK_BIN, args, { env, encoding: "utf8" });
    } catch (err) {
      error = err?.message || String(err);
    }
  }

  try {
    const tasks = JSON.parse(raw || "[]");
    TASK_CACHE = { ts: now, ok: true, tasks, error: null };
    return TASK_CACHE;
  } catch (err) {
    TASK_CACHE = { ts: now, ok: false, tasks: [], error: error || (err?.message || String(err)) };
    return TASK_CACHE;
  }
}

// ── Date Helpers ─────────────────────────────────────────────────────────────

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

async function taskwarriorTasksInRange(start, end, includeOverdue) {
  const { ok, error: taskError, tasks: twTasks } = loadTaskwarriorExport();
  if (!ok) throw new Error(taskError || "task-export-failed");

  const filtered = twTasks
    .filter((task) => {
      const st = String(task.status || "").toLowerCase();
      return st === "pending";
    })
    .filter((task) => !fireTaskHasExcludedTag(task.tags))
    .filter((task) => {
      if (fireTaskInRange(task, start, end, includeOverdue)) return true;
      if (!FIRE_INCLUDE_UNDATED) return false;
      if (fireTaskPrimaryDate(task)) return false;
      return true;
      })
    .map((task) => normalizeFireTask(task, start))
    .filter(Boolean);

  return filtered.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
    const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
    return da - db;
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/fire/week
router.get("/week", async (req, res) => {
  const dateParam = req.query?.date;
  const date = dateParam ? new Date(dateParam) : new Date();
  if (isNaN(date.getTime())) {
    return res.status(400).json({ ok: false, error: "invalid date" });
  }
  const { start, end, week, rangeLabel } = getWeekRangeLocal(date);
  let tasks = [];
  let error = null;

  try {
    tasks = await taskwarriorTasksInRange(start, end, true);
    error = null;
  } catch (twErr) {
    error = twErr?.message || String(twErr);
  }

  const domainFiltered = filterFireTasksByDomain(tasks, req.query.domain);
  if (domainFiltered === null) {
    return res.status(400).json({ ok: false, error: "invalid_domain" });
  }

  return res.json({
    ok: tasks.length > 0 || !error,
    source: "taskwarrior",
    week,
    rangeLabel,
    tasks: domainFiltered,
    error,
    gcal_url: FIRE_GCAL_EMBED_URL || "",
  });
});

// GET /api/fire/day
router.get("/day", async (req, res) => {
  const { start, end, label } = getDayRangeLocal();
  let tasks = [];
  let error = null;

  try {
    tasks = await taskwarriorTasksInRange(start, end, true);
    error = null;
  } catch (twErr) {
    error = twErr?.message || String(twErr);
  }

  const domainFiltered = filterFireTasksByDomain(tasks, req.query.domain);
  if (domainFiltered === null) {
    return res.status(400).json({ ok: false, error: "invalid_domain" });
  }

  return res.json({
    ok: tasks.length > 0 || !error,
    source: "taskwarrior",
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

export default router;
