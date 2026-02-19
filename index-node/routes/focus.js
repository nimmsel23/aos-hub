// ================================================================
// Focus Router - /api/focus routes (DayOne-style)
// ================================================================
//
// FOCUS = Monthly Mission + Timeline Entries
// Storage:
//   ~/.aos/focus/YYYY-MM/mission.md     (YAML frontmatter + body)
//   ~/.aos/focus/YYYY-MM/entries/       (YYYY-MM-DD.md per entry)
//
// Routes:
//   GET  /api/focus/month              → mission + entries list + progress
//   GET  /api/focus/entry?date=        → single entry content
//   POST /api/focus/entry/save         → { date, content }
//   POST /api/focus/mission/save       → { mission }
//
// ================================================================

import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import yaml from "js-yaml";

const router = express.Router();

const FOCUS_DIR = process.env.FOCUS_DIR || path.join(os.homedir(), ".aos", "focus");

// ── File helpers ─────────────────────────────────────────────────────────────

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthDir(mk)       { return path.join(FOCUS_DIR, mk); }
function missionPath(mk)    { return path.join(monthDir(mk), "mission.md"); }
function entriesDir(mk)     { return path.join(monthDir(mk), "entries"); }
function entryPath(mk, d)   { return path.join(entriesDir(mk), `${d}.md`); }

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function readText(fp, fb = "") {
  try { return fs.readFileSync(fp, "utf8"); } catch { return fb; }
}

function writeText(fp, txt) {
  ensureDir(path.dirname(fp));
  fs.writeFileSync(fp, txt, "utf8");
}

// ── YAML frontmatter ──────────────────────────────────────────────────────────

function parseFrontmatter(md) {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { front: {}, body: md };
  let front = {};
  try { front = yaml.load(m[1]) || {}; } catch { /* ignore */ }
  return { front, body: md.slice(m[0].length) };
}

// ── Progress calculation ──────────────────────────────────────────────────────

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function itemProgress(item) {
  if (!item || typeof item.target !== "number" || typeof item.current !== "number") return 0;
  if (item.type === "delta")
    return clamp01(Math.abs(item.current) / (Math.abs(item.target) || 1));
  return clamp01(item.current / (item.target || 1));
}

function calcProgress(front) {
  const outcomes = front?.outcomes;
  if (!outcomes || typeof outcomes !== "object")
    return { overallPct: 0, perDomain: {} };

  const doms  = ["body", "being", "balance", "business"];
  const all   = [];
  const perDomain = {};

  for (const d of doms) {
    const items  = Array.isArray(outcomes[d]) ? outcomes[d] : [];
    const ratios = items.map(itemProgress);
    const avg    = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
    perDomain[d] = Math.round(avg * 100);
    all.push(...ratios);
  }

  const overall = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
  return { overallPct: Math.round(overall * 100), perDomain };
}

// ── Default templates ─────────────────────────────────────────────────────────

function defaultMission(mk) {
  return `---
month: ${mk}
outcomes:
  body:
    - title: "12 Trainings"
      type: count
      target: 12
      current: 0
    - title: "-2kg"
      type: delta
      target: -2
      current: 0
  being:
    - title: "20 Voice Logs"
      type: count
      target: 20
      current: 0
  balance:
    - title: "4 Deep Talks"
      type: count
      target: 4
      current: 0
  business:
    - title: "10 Sales Calls"
      type: count
      target: 10
      current: 0
---

# Monthly Mission

Write the Mission Briefing here.

## Additions
-\x20

## Eliminations
-\x20

## Notes
-\x20
`;
}

function defaultEntry(dateISO) {
  return `---
date: ${dateISO}
tags: [focus]
---

## Progress Update
-\x20

## Course Correction
-\x20

## Notes
-\x20
`;
}

// ── Auto-migration from old flat JSON ─────────────────────────────────────────

function migrateOldJson(mk) {
  const oldJson = path.join(FOCUS_DIR, `${mk}.json`);
  const newPath = missionPath(mk);
  if (fs.existsSync(newPath) || !fs.existsSync(oldJson)) return;

  let old;
  try { old = JSON.parse(fs.readFileSync(oldJson, "utf8")); } catch { return; }
  if (!old?.domains) return;

  const outcomes = {};
  for (const [dom, items] of Object.entries(old.domains)) {
    outcomes[dom] = (Array.isArray(items) ? items : []).map((it) => ({
      title:   String(it.title  ?? "Outcome"),
      type:    ["count","delta"].includes(it.type) ? it.type : "count",
      target:  Number(it.target  ?? 0),
      current: Number(it.current ?? 0),
    }));
  }

  const fm  = yaml.dump({ month: mk, outcomes }, { lineWidth: 120 });
  const md  = `---\n${fm}---\n\n# Monthly Mission\n\n(Migrated from legacy JSON)\n\n## Notes\n- \n`;
  writeText(newPath, md);
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/focus/month
router.get("/month", (req, res) => {
  try {
    const mk = monthKey();
    ensureDir(entriesDir(mk));
    migrateOldJson(mk);

    if (!fs.existsSync(missionPath(mk)))
      writeText(missionPath(mk), defaultMission(mk));

    const mission = readText(missionPath(mk));
    const { front } = parseFrontmatter(mission);
    const score = calcProgress(front);

    const entries = fs.readdirSync(entriesDir(mk))
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""))
      .sort()
      .reverse()
      .map((dateISO) => {
        const txt     = readText(entryPath(mk, dateISO));
        const preview = txt.replace(/^---[\s\S]*?---\s*\n?/, "")
          .split("\n").filter((l) => l.trim()).slice(0, 3).join(" ").slice(0, 120);
        return { date: dateISO, preview };
      });

    res.json({ ok: true, data: { month: mk, mission }, entries, score });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/focus/entry?date=YYYY-MM-DD
router.get("/entry", (req, res) => {
  try {
    const mk   = monthKey();
    const date = String(req.query.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return res.status(400).json({ ok: false, error: "invalid_date" });

    const fp      = entryPath(mk, date);
    const exists  = fs.existsSync(fp);
    const content = exists ? readText(fp) : defaultEntry(date);
    res.json({ ok: true, date, exists, content });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/focus/entry/save  { date, content }
router.post("/entry/save", (req, res) => {
  try {
    const mk = monthKey();
    const { date, content } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return res.status(400).json({ ok: false, error: "invalid_date" });
    if (typeof content !== "string")
      return res.status(400).json({ ok: false, error: "invalid_content" });

    writeText(entryPath(mk, date), content);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/focus/mission/save  { mission }
router.post("/mission/save", (req, res) => {
  try {
    const mk = monthKey();
    const { mission } = req.body || {};
    if (typeof mission !== "string")
      return res.status(400).json({ ok: false, error: "invalid_mission" });

    writeText(missionPath(mk), mission);

    // return updated progress
    const { front } = parseFrontmatter(mission);
    const score = calcProgress(front);
    res.json({ ok: true, score });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
