// ================================================================
// Fire Router - /api/fire routes
// ================================================================
//
// FIRE = 4×4 Weekly Strikes (4 Domains × 4 Strikes = 16 max)
// Storage: ~/.aos/fire/YYYY-Www.json (one file per ISO week)
//
// Routes:
//   GET  /api/fire/week        → current week data + score
//   GET  /api/fire/tasks       → pending Taskwarrior tasks (for pool)
//   POST /api/fire/toggle      → { domain, index } toggle done
//   POST /api/fire/rename      → { domain, index, title } rename strike
//   POST /api/fire/reorder     → { domain, order: [0,2,1,3] } reorder strikes
//
// ================================================================

import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";

const router = express.Router();

const FIRE_DIR = process.env.FIRE_DIR || path.join(os.homedir(), ".aos", "fire");
const ALLOWED  = new Set(["body", "being", "balance", "business"]);

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Routes ───────────────────────────────────────────────────────────────────

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

// GET /api/fire/tasks  – pending TW tasks for the task pool
router.get("/tasks", (req, res) => {
  try {
    const raw   = execFileSync("task", ["export", "status:pending"], { encoding: "utf8", timeout: 5000 });
    const tasks = JSON.parse(raw)
      .filter((t) => t.description)
      .map((t) => ({
        uuid:        t.uuid,
        description: t.description,
        tags:        t.tags || [],
        project:     t.project || "",
        priority:    t.priority || "",
      }))
      .slice(0, 80);
    res.json({ ok: true, tasks });
  } catch {
    // Taskwarrior not available or no tasks – return empty pool gracefully
    res.json({ ok: true, tasks: [] });
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
