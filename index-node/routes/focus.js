// ================================================================
// Focus Router - /api/focus routes
// ================================================================
//
// FOCUS = Monthly Mission, outcome-based tracking
// Storage: ~/.aos/focus/YYYY-MM.json (one file per month)
//
// Routes:
//   GET  /api/focus/month          → current month data + progress
//   POST /api/focus/inc            → { domain, index, amount? }
//   POST /api/focus/set            → { domain, index, current }
//   POST /api/focus/rename         → { domain, index, title }
//   POST /api/focus/add            → { domain, title, type, target }
//   POST /api/focus/del            → { domain, index }
//
// ================================================================

import express from "express";
import fs from "fs";
import path from "path";
import os from "os";

const router = express.Router();

const FOCUS_DIR = process.env.FOCUS_DIR || path.join(os.homedir(), ".aos", "focus");
const ALLOWED   = new Set(["body", "being", "balance", "business"]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir() {
  fs.mkdirSync(FOCUS_DIR, { recursive: true });
}

function monthKey(date = new Date()) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${mm}`;
}

function makeBase(mk) {
  return {
    month: mk,
    domains: {
      body:     [{ title: "12 Trainings",  type: "count", target: 12, current: 0 },
                 { title: "-2kg",          type: "delta", target: -2, current: 0 }],
      being:    [{ title: "20 Voice Logs", type: "count", target: 20, current: 0 }],
      balance:  [{ title: "4 Deep Talks",  type: "count", target: 4,  current: 0 }],
      business: [{ title: "10 Sales Calls",type: "count", target: 10, current: 0 }],
    },
    meta: { createdAt: new Date().toISOString() },
  };
}

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function itemProgress(item) {
  if (!item || typeof item.target !== "number" || typeof item.current !== "number") return 0;
  if (item.type === "delta") {
    return clamp01(Math.abs(item.current) / (Math.abs(item.target) || 1));
  }
  return clamp01(item.current / (item.target || 1));
}

function calcScore(data) {
  const items  = Object.values(data.domains).flat();
  const ratios = items.map(itemProgress);
  const overall = ratios.length
    ? ratios.reduce((a, b) => a + b, 0) / ratios.length
    : 0;
  return { overallPct: Math.round(overall * 100), outcomeCount: items.length };
}

function readMonth(mk) {
  try {
    return JSON.parse(fs.readFileSync(path.join(FOCUS_DIR, `${mk}.json`), "utf8"));
  } catch {
    return null;
  }
}

function writeMonth(mk, data) {
  ensureDir();
  fs.writeFileSync(
    path.join(FOCUS_DIR, `${mk}.json`),
    JSON.stringify(data, null, 2) + "\n",
    "utf8"
  );
}

function domainItem(data, domain, index) {
  return data.domains[domain]?.[index] ?? null;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/focus/month
router.get("/month", (req, res) => {
  try {
    const mk   = monthKey();
    let data   = readMonth(mk);
    if (!data) {
      data = makeBase(mk);
      writeMonth(mk, data);
    }
    res.json({ ok: true, data, score: calcScore(data) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/focus/inc  { domain, index, amount? }
router.post("/inc", (req, res) => {
  try {
    const { domain, index, amount } = req.body || {};
    if (!ALLOWED.has(domain))
      return res.status(400).json({ ok: false, error: "invalid_domain" });
    if (!Number.isInteger(index) || index < 0)
      return res.status(400).json({ ok: false, error: "invalid_index" });

    const inc  = typeof amount === "number" ? amount : 1;
    const mk   = monthKey();
    const data = readMonth(mk) || makeBase(mk);
    const item = domainItem(data, domain, index);
    if (!item) return res.status(404).json({ ok: false, error: "not_found" });

    item.current = Number(item.current) + inc;
    writeMonth(mk, data);
    res.json({ ok: true, data, score: calcScore(data) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/focus/set  { domain, index, current }
router.post("/set", (req, res) => {
  try {
    const { domain, index, current } = req.body || {};
    if (!ALLOWED.has(domain))
      return res.status(400).json({ ok: false, error: "invalid_domain" });
    if (!Number.isInteger(index) || index < 0)
      return res.status(400).json({ ok: false, error: "invalid_index" });
    if (typeof current !== "number")
      return res.status(400).json({ ok: false, error: "invalid_current" });

    const mk   = monthKey();
    const data = readMonth(mk) || makeBase(mk);
    const item = domainItem(data, domain, index);
    if (!item) return res.status(404).json({ ok: false, error: "not_found" });

    item.current = current;
    writeMonth(mk, data);
    res.json({ ok: true, data, score: calcScore(data) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/focus/rename  { domain, index, title }
router.post("/rename", (req, res) => {
  try {
    const { domain, index, title } = req.body || {};
    if (!ALLOWED.has(domain))
      return res.status(400).json({ ok: false, error: "invalid_domain" });
    if (!Number.isInteger(index) || index < 0)
      return res.status(400).json({ ok: false, error: "invalid_index" });
    const t = String(title || "").trim().slice(0, 80);
    if (!t) return res.status(400).json({ ok: false, error: "invalid_title" });

    const mk   = monthKey();
    const data = readMonth(mk) || makeBase(mk);
    const item = domainItem(data, domain, index);
    if (!item) return res.status(404).json({ ok: false, error: "not_found" });

    item.title = t;
    writeMonth(mk, data);
    res.json({ ok: true, data, score: calcScore(data) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/focus/add  { domain, title, type, target }
router.post("/add", (req, res) => {
  try {
    const { domain, title, type, target } = req.body || {};
    if (!ALLOWED.has(domain))
      return res.status(400).json({ ok: false, error: "invalid_domain" });
    const t = String(title || "").trim().slice(0, 80);
    if (!t) return res.status(400).json({ ok: false, error: "invalid_title" });
    if (!["count", "delta"].includes(type))
      return res.status(400).json({ ok: false, error: "invalid_type" });
    if (typeof target !== "number")
      return res.status(400).json({ ok: false, error: "invalid_target" });

    const mk   = monthKey();
    const data = readMonth(mk) || makeBase(mk);
    data.domains[domain] = data.domains[domain] || [];
    data.domains[domain].push({ title: t, type, target, current: 0 });
    writeMonth(mk, data);
    res.json({ ok: true, data, score: calcScore(data) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/focus/del  { domain, index }
router.post("/del", (req, res) => {
  try {
    const { domain, index } = req.body || {};
    if (!ALLOWED.has(domain))
      return res.status(400).json({ ok: false, error: "invalid_domain" });
    if (!Number.isInteger(index) || index < 0)
      return res.status(400).json({ ok: false, error: "invalid_index" });

    const mk   = monthKey();
    const data = readMonth(mk) || makeBase(mk);
    if (!domainItem(data, domain, index))
      return res.status(404).json({ ok: false, error: "not_found" });

    data.domains[domain].splice(index, 1);
    writeMonth(mk, data);
    res.json({ ok: true, data, score: calcScore(data) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
