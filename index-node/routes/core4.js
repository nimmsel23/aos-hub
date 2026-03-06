import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const router = express.Router();

const ROUTE_DIR = path.dirname(fileURLToPath(import.meta.url));
const HUB_DIR = String(process.env.AOS_HUB_DIR || path.resolve(ROUTE_DIR, "..", "..")).trim();
const CORE4_TRACKER = String(
  process.env.CORE4_TRACKER || path.join(HUB_DIR, "core4", "python-core4", "tracker.py")
).trim();
const CORE4_TRACKER_ENABLED = process.env.AOS_CORE4_TRACKER !== "0";
const CORE4_TRACKER_PYTHON = String(process.env.AOS_PYTHON_BIN || "python3").trim();

const CORE4_DIR = String(
  process.env.AOS_CORE4_LOCAL_DIR ||
    process.env.CORE4_DIR ||
    path.join(os.homedir(), ".core4")
).trim();
function resolveCore4EventsDir(baseDir) {
  const flat = path.join(baseDir, "events");
  const legacy = path.join(baseDir, ".core4", "events");
  if (fs.existsSync(flat)) return flat;
  if (fs.existsSync(legacy)) return legacy;
  return flat;
}
const CORE4_EVENTS_DIR = resolveCore4EventsDir(CORE4_DIR);

function getVaultDir() {
  const candidates = [
    process.env.AOS_VAULT_DIR,
    process.env.ALPHAOS_VAULT_DIR,
    process.env.VAULT_DIR,
  ].map(v => String(v || "").trim()).filter(Boolean);
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return path.join(os.homedir(), "vault");
}

const CORE4_STORAGE_DIR_ENV = String(process.env.CORE4_STORAGE_DIR || "").trim();
const CORE4_STORAGE_FALLBACK_DIR = String(
  process.env.CORE4_STORAGE_FALLBACK_DIR ||
  path.join(os.homedir(), ".local", "share", "alphaos", "core4")
).trim();

function canWriteDir(dirPath) {
  try {
    ensureDir(dirPath);
    const probe = path.join(dirPath, `.core4-rw-probe-${process.pid}-${Date.now()}`);
    fs.writeFileSync(probe, "ok", "utf8");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function getCore4StorageDir() {
  const preferred = CORE4_STORAGE_DIR_ENV || path.join(getVaultDir(), "Core4");
  if (canWriteDir(preferred)) return preferred;
  if (canWriteDir(CORE4_STORAGE_FALLBACK_DIR)) return CORE4_STORAGE_FALLBACK_DIR;
  return preferred;
}

const CORE4_JOURNAL_DIR = path.join(getCore4StorageDir(), "journal");

const HABIT_LABELS = {
  body: { fitness: "Fitness", fuel: "Fuel" },
  being: { meditation: "Meditation", memoirs: "Memoirs" },
  balance: { person1: "Partner", person2: "Posterity" },
  business: { discover: "Discover", declare: "Declare" },
};

const TASK_TO_DOMAIN = {
  fitness: "body",
  fuel: "body",
  meditation: "being",
  memoirs: "being",
  person1: "balance",
  person2: "balance",
  discover: "business",
  declare: "business",
};

const TASK_ALIASES = {
  partner: "person1",
  posterity: "person2",
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function dateKeyLocal(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDateKey(raw, fallbackToday = true) {
  if (raw == null || raw === "") return fallbackToday ? dateKeyLocal(new Date()) : null;
  const text = String(raw).trim();
  if (!text) return fallbackToday ? dateKeyLocal(new Date()) : null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return fallbackToday ? dateKeyLocal(new Date()) : null;
  return dateKeyLocal(parsed);
}

function parseDateKeyToDate(dateKey) {
  const text = parseDateKey(dateKey, false);
  if (!text) return null;
  const parsed = new Date(`${text}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isoWeekString(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const n = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(n).padStart(2, "0")}`;
}

function weekDatesFor(dateObj) {
  const ref = new Date(dateObj);
  ref.setHours(12, 0, 0, 0);
  const day = ref.getDay();
  const diff = ref.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(ref);
  start.setDate(diff);
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    const next = new Date(start);
    next.setDate(start.getDate() + i);
    out.push(dateKeyLocal(next));
  }
  return out;
}

function normalizeTask(taskRaw) {
  const key = String(taskRaw || "").trim().toLowerCase();
  if (!key) return "";
  return TASK_ALIASES[key] || key;
}

function inferDomain(domainRaw, taskKey) {
  const d = String(domainRaw || "").trim().toLowerCase();
  if (d) return d;
  return TASK_TO_DOMAIN[taskKey] || "";
}

function entryKey(dateKey, domain, task) {
  return `${dateKey}:${domain}:${task}`;
}

function safeToken(value) {
  const token = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return token || "x";
}

function eventFilePath(dateKey, key) {
  const dayDir = path.join(CORE4_EVENTS_DIR, dateKey);
  ensureDir(dayDir);
  const hash = crypto.createHash("sha1").update(String(key)).digest("hex").slice(0, 10);
  return path.join(dayDir, `${safeToken(key)}-${hash}.json`);
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function listDayEvents(dateKey) {
  const dayDir = path.join(CORE4_EVENTS_DIR, dateKey);
  if (!fs.existsSync(dayDir)) return [];
  const files = fs.readdirSync(dayDir).filter((name) => name.endsWith(".json"));
  const out = [];
  files.forEach((name) => {
    const payload = readJsonSafe(path.join(dayDir, name));
    if (payload && typeof payload === "object") out.push(payload);
  });
  return out;
}

function hasCore4Entry(dateKey, domain, task) {
  const entries = dedupEntries(listDayEvents(dateKey));
  return entries.some(
    (entry) =>
      entry &&
      entry.date === dateKey &&
      entry.domain === domain &&
      entry.task === task &&
      entry.done !== false
  );
}

function dedupEntries(entries) {
  const keep = new Map();
  entries.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const date = parseDateKey(entry.date, false);
    const domain = String(entry.domain || "").trim().toLowerCase();
    const task = normalizeTask(entry.task);
    const key = String(entry.key || entryKey(date || dateKeyLocal(new Date()), domain, task));
    if (!key || !date || !domain || !task) return;
    const existing = keep.get(key);
    if (!existing) {
      keep.set(key, {
        ...entry,
        date,
        domain,
        task,
        key,
        done: entry.done !== false,
        points: Number(entry.points || 0.5) || 0.5,
      });
      return;
    }
    const prevTs = new Date(String(existing.ts || ""));
    const nextTs = new Date(String(entry.ts || ""));
    if (!Number.isNaN(nextTs.getTime()) && (Number.isNaN(prevTs.getTime()) || nextTs > prevTs)) {
      keep.set(key, {
        ...existing,
        ...entry,
        date,
        domain,
        task,
        key,
        done: entry.done !== false,
        points: Number(entry.points || 0.5) || 0.5,
      });
    }
  });
  return [...keep.values()];
}

function computeTotals(entries) {
  const totals = { week_total: 0, by_domain: {}, by_day: {}, by_habit: {} };
  entries.forEach((entry) => {
    if (!entry || entry.done === false) return;
    const points = Number(entry.points || 0) || 0;
    const domain = String(entry.domain || "").trim().toLowerCase();
    const task = normalizeTask(entry.task);
    const date = parseDateKey(entry.date, false);
    totals.week_total += points;
    if (domain) totals.by_domain[domain] = (totals.by_domain[domain] || 0) + points;
    if (date) totals.by_day[date] = (totals.by_day[date] || 0) + points;
    if (domain && task) {
      const habitKey = `${domain}:${task}`;
      totals.by_habit[habitKey] = (totals.by_habit[habitKey] || 0) + points;
    }
  });
  return totals;
}

function totalForDate(entries, dateKey) {
  return entries.reduce((sum, entry) => {
    if (!entry || entry.done === false) return sum;
    return String(entry.date || "") === dateKey ? sum + (Number(entry.points || 0) || 0) : sum;
  }, 0);
}

function weekDataForDate(dateKey) {
  const dateObj = parseDateKeyToDate(dateKey);
  if (!dateObj) return null;
  const week = isoWeekString(dateObj);
  let events = [];
  weekDatesFor(dateObj).forEach((dayKey) => {
    events = events.concat(listDayEvents(dayKey));
  });
  const entries = dedupEntries(events);
  return { week, entries, totals: computeTotals(entries) };
}

function dayStateForDate(dateKey) {
  const day = parseDateKey(dateKey, false);
  if (!day) return null;
  const weekData = weekDataForDate(day);
  if (!weekData) return null;
  const entries = weekData.entries
    .filter((entry) => String(entry.date || "") === day)
    .map((entry) => ({
      ts: entry.ts,
      domain: entry.domain,
      task: normalizeTask(entry.task),
      points: Number(entry.points || 0) || 0,
      source: entry.source || "pwa-standalone",
    }));
  return {
    ok: true,
    date: day,
    week: weekData.week,
    total: totalForDate(weekData.entries, day),
    entries,
  };
}

function legacyTodayFromDayPayload(payload) {
  const out = {
    date: payload.date,
    fitness: 0,
    fuel: 0,
    meditation: 0,
    memoirs: 0,
    partner: 0,
    posterity: 0,
    discover: 0,
    declare: 0,
    csv_written: false,
  };
  payload.entries.forEach((entry) => {
    const domain = String(entry.domain || "").toLowerCase();
    const task = normalizeTask(entry.task);
    if (domain === "body" && task === "fitness") out.fitness = 1;
    if (domain === "body" && task === "fuel") out.fuel = 1;
    if (domain === "being" && task === "meditation") out.meditation = 1;
    if (domain === "being" && task === "memoirs") out.memoirs = 1;
    if (domain === "balance" && task === "person1") out.partner = 1;
    if (domain === "balance" && task === "person2") out.posterity = 1;
    if (domain === "business" && task === "discover") out.discover = 1;
    if (domain === "business" && task === "declare") out.declare = 1;
  });
  return out;
}

router.get("/day-state", (req, res) => {
  try {
    const day = parseDateKey(req.query?.date, true);
    if (!day) return res.status(400).json({ ok: false, error: "invalid date" });
    const payload = dayStateForDate(day);
    if (!payload) return res.status(400).json({ ok: false, error: "invalid date" });
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get("/week-summary", (req, res) => {
  try {
    const day = parseDateKey(req.query?.date, true);
    if (!day) return res.status(400).json({ ok: false, error: "invalid date" });
    const weekData = weekDataForDate(day);
    if (!weekData) return res.status(400).json({ ok: false, error: "invalid date" });
    return res.json({ ok: true, week: weekData.week, totals: weekData.totals });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.post("/log", (req, res) => {
  try {
    let domain = String(req.body?.domain || "").trim().toLowerCase();
    const task = normalizeTask(req.body?.task);
    domain = inferDomain(domain, task);
    if (!domain || !task) {
      return res.status(400).json({ ok: false, error: "missing domain/task" });
    }
    const date = parseDateKey(req.body?.date, true);
    if (!date) return res.status(400).json({ ok: false, error: "invalid date" });

    const tsRaw = String(req.body?.ts || req.body?.timestamp || "").trim();
    const tsDate = tsRaw ? new Date(tsRaw) : new Date(`${date}T12:00:00`);
    const ts = Number.isNaN(tsDate.getTime()) ? new Date(`${date}T12:00:00`) : tsDate;
    const source = String(req.body?.source || "core4-pwa").trim() || "core4-pwa";

    if (CORE4_TRACKER_ENABLED && CORE4_TRACKER && fs.existsSync(CORE4_TRACKER)) {
      const duplicate = hasCore4Entry(date, domain, task);
      try {
        execFileSync(
          CORE4_TRACKER_PYTHON,
          [CORE4_TRACKER, task, "done", "--date", date],
          { stdio: "ignore", env: { ...process.env, AOS_CORE4_LOCAL_DIR: CORE4_DIR } }
        );
      } catch (err) {
        return res.status(500).json({
          ok: false,
          error: "core4-tracker-failed",
          details: String(err?.message || err),
        });
      }

      const dayPayload = dayStateForDate(date);
      const weekData = weekDataForDate(date);
      if (!dayPayload || !weekData) {
        return res.status(500).json({ ok: false, error: "state-build-failed" });
      }

      return res.json({
        ok: true,
        duplicate,
        tracker: "core4-tracker",
        day: dayPayload,
        week: { ok: true, week: weekData.week, totals: weekData.totals },
        total_today: dayPayload.total,
      });
    }

    const key = entryKey(date, domain, task);
    const eventPath = eventFilePath(date, key);
    const duplicate = fs.existsSync(eventPath);
    if (!duplicate) {
      const event = {
        id: req.body?.id || `core4-${safeToken(date)}-${safeToken(domain)}-${safeToken(task)}`,
        key,
        ts: ts.toISOString(),
        last_ts: ts.toISOString(),
        date,
        week: isoWeekString(ts),
        domain,
        task,
        done: true,
        points: 0.5,
        source,
        sources: [source],
        user: req.body?.user || {},
      };
      fs.writeFileSync(eventPath, `${JSON.stringify(event, null, 2)}\n`, "utf8");
    }

    const dayPayload = dayStateForDate(date);
    const weekData = weekDataForDate(date);
    if (!dayPayload || !weekData) {
      return res.status(500).json({ ok: false, error: "state-build-failed" });
    }

    return res.json({
      ok: true,
      duplicate,
      day: dayPayload,
      week: { ok: true, week: weekData.week, totals: weekData.totals },
      total_today: dayPayload.total,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get("/today", (_req, res) => {
  try {
    const day = dateKeyLocal(new Date());
    const payload = dayStateForDate(day);
    if (!payload) return res.status(500).json({ ok: false, error: "state-build-failed" });
    return res.json({
      ok: true,
      week: payload.week,
      date: payload.date,
      total: payload.total,
      data: legacyTodayFromDayPayload(payload),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ── Journal ─────────────────────────────────────────────────────────────────

router.get("/journal", (req, res) => {
  try {
    const day = parseDateKey(req.query?.date, true);
    if (!day) return res.status(400).json({ ok: false, error: "invalid date" });
    const dayDir = path.join(CORE4_JOURNAL_DIR, day);
    if (!fs.existsSync(dayDir)) {
      return res.json({ ok: true, date: day, entries: [] });
    }
    const files = fs.readdirSync(dayDir).filter((n) => n.endsWith(".md"));
    const entries = [];
    for (const name of files) {
      const full = path.join(dayDir, name);
      try { if (!fs.statSync(full).isFile()) continue; } catch { continue; }
      const parts = name.slice(0, -3).split("_");
      const domain = String(parts[0] || "").toLowerCase();
      const habit = String(parts[1] || "").toLowerCase();
      let text = "";
      try { text = fs.readFileSync(full, "utf8"); } catch { text = ""; }
      entries.push({ domain, habit, label: HABIT_LABELS[domain]?.[habit] || habit, text });
    }
    return res.json({ ok: true, date: day, entries });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.post("/journal", (req, res) => {
  try {
    const domain = String(req.body?.domain || "").trim().toLowerCase();
    const habit = String(req.body?.habit || req.body?.task || "").trim().toLowerCase();
    const text = String(req.body?.text || "").trim();
    const day = parseDateKey(req.body?.date, true);
    if (!day) return res.status(400).json({ ok: false, error: "invalid date" });
    if (!HABIT_LABELS[domain]?.[habit]) {
      return res.status(400).json({ ok: false, error: "unknown domain/habit" });
    }
    if (!text) return res.status(400).json({ ok: false, error: "missing text" });

    const now = new Date();
    const timeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const dayDir = path.join(CORE4_JOURNAL_DIR, day);
    ensureDir(dayDir);
    const filePath = path.join(dayDir, `${domain}_${habit}.md`);
    const entry = `## ${timeStr}\n\n${text}\n\n---\n`;
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, "utf8");
      const sep = existing.trim().length > 0 ? "\n" : "";
      fs.writeFileSync(filePath, `${existing}${sep}${entry}`, "utf8");
    } else {
      fs.writeFileSync(filePath, entry, "utf8");
    }
    return res.json({ ok: true, date: day, path: filePath });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
