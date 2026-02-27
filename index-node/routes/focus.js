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
//   GET  /api/focus/month              → mission editor body + entries list + progress
//   GET  /api/focus/entry?date=        → single entry editor body
//   POST /api/focus/entry/save         → { date, content } (editor body)
//   POST /api/focus/mission/save       → { mission } (editor body)
//
// ================================================================

import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import yaml from "js-yaml";
import { getFrameStateForDomain } from "./frame.js";

const router = express.Router();

const FOCUS_DIR = process.env.FOCUS_DIR || path.join(os.homedir(), ".aos", "focus");
const FREEDOM_DIR = process.env.FREEDOM_DIR || path.join(os.homedir(), ".aos", "freedom");
const CASCADE_HEADER_BEGIN = "<!-- AOS:CASCADE:FREEDOM:HEADER:BEGIN -->";
const CASCADE_HEADER_END = "<!-- AOS:CASCADE:FREEDOM:HEADER:END -->";
const CASCADE_FOOTER_BEGIN = "<!-- AOS:CASCADE:FRAME:FOOTER:BEGIN -->";
const CASCADE_FOOTER_END = "<!-- AOS:CASCADE:FRAME:FOOTER:END -->";
const FRAME_DOMAINS = ["body", "being", "balance", "business"];

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

function splitFrontmatter(md) {
  const text = String(md || "");
  const m = text.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
  if (!m) return { frontmatter: "", body: text };
  return { frontmatter: m[0], body: text.slice(m[0].length) };
}

function hasFrontmatter(md) {
  return /^---\s*\n[\s\S]*?\n---\s*\n?/m.test(String(md || ""));
}

function composeMarkdown(frontmatter, body) {
  const head = String(frontmatter || "").trim() ? `${String(frontmatter).trimEnd()}\n\n` : "";
  return `${head}${String(body || "").trim()}\n`;
}

function stripCascadeBundles(body) {
  const text = String(body || "");
  const headerBegin = CASCADE_HEADER_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headerEnd = CASCADE_HEADER_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const footerBegin = CASCADE_FOOTER_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const footerEnd = CASCADE_FOOTER_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripHeader = text.replace(new RegExp(`${headerBegin}[\\s\\S]*?${headerEnd}\\n?`, "g"), "");
  return stripHeader.replace(new RegExp(`${footerBegin}[\\s\\S]*?${footerEnd}\\n?`, "g"), "").trim();
}

function extractEditorBody(content, opts = {}) {
  const stripCascade = opts.stripCascade === true;
  let body = String(content || "");
  if (hasFrontmatter(body)) body = splitFrontmatter(body).body;
  if (stripCascade) body = stripCascadeBundles(body);
  return body.trim();
}

function freedomYearFromMonth(mk) {
  const m = String(mk || "");
  return /^\d{4}-\d{2}$/.test(m) ? m.slice(0, 4) : String(new Date().getFullYear());
}

function freedomPath(year, domain) {
  return path.join(FREEDOM_DIR, String(year), `${domain}.md`);
}

function loadFreedomMarkdown(year, domain) {
  const fp = freedomPath(year, domain);
  if (fs.existsSync(fp)) return readText(fp, "").trim();
  return `# FREEDOM: ${domain.toUpperCase()} (${year})\n\n-`;
}

function buildFreedomHeaderBundle(mk) {
  const year = freedomYearFromMonth(mk);
  const chunks = [];
  for (const domain of FRAME_DOMAINS) {
    const freedomMd = loadFreedomMarkdown(year, domain);
    chunks.push(
      [
        `### ${domain.toUpperCase()}`,
        "",
        "```markdown",
        freedomMd,
        "```",
      ].join("\n")
    );
  }
  return [
    CASCADE_HEADER_BEGIN,
    "## FREEDOM HEADER · QUARTERLY DIRECTION (MARKDOWN)",
    "",
    `- cadence: quarterly`,
    `- period: ${year}`,
    "",
    ...chunks,
    CASCADE_HEADER_END,
    "",
  ].join("\n");
}

function buildFrameFooterBundle() {
  const chunks = [];
  for (const domain of FRAME_DOMAINS) {
    const loaded = getFrameStateForDomain(domain, { migrateLegacy: true });
    const yamlText = loaded ? String(loaded.content || "").trim() : `domain: ${domain.toUpperCase()}\ntype: frame-map\nkind: frame-state`;
    chunks.push(
      [
        `### ${domain.toUpperCase()}`,
        "",
        "```yaml",
        yamlText,
        "```",
      ].join("\n")
    );
  }
  return [
    CASCADE_FOOTER_BEGIN,
    "## FRAME FOOTER · ANNUAL TRUTH (YAML)",
    "",
    ...chunks,
    CASCADE_FOOTER_END,
    "",
  ].join("\n");
}

function upsertFocusCascade(content, mk) {
  const { frontmatter, body } = splitFrontmatter(content);
  const cleanBody = stripCascadeBundles(body);
  const header = buildFreedomHeaderBundle(mk);
  const footer = buildFrameFooterBundle();
  const mergedBody = `${header}\n${cleanBody}\n\n${footer}`.trim() + "\n";
  return `${frontmatter}${mergedBody}`;
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
  const base = `---
month: ${mk}
period: ${mk}
type: focus-map
source_refs:
  chapter: "Game Chapter 34 - Focus"
outcomes:
  body: []
  being: []
  balance: []
  business: []
---

# FOCUS: Monthly Mission (${mk})

## Chapter 34 Core Prompts

- What is my Monthly Mission that bridges where I am now and where I want to be?
- What habits must I build this month?
- What routines keep me on course?
- What do I need to add?
- What do I need to eliminate?
- What is my first action to set sail?

## Monthly Mission

- 

## Habits

- 

## Routines

- 

## Additions

- 

## Eliminations

- 

## Set Sail (First Action)

- 
`;
  return upsertFocusCascade(base, mk);
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

function defaultEntryEditorBody() {
  return `## Progress Update
- 

## Course Correction
- 

## Notes
- `;
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

    const missionRaw = readText(missionPath(mk));
    const missionWithCascade = upsertFocusCascade(missionRaw, mk);
    if (missionWithCascade !== missionRaw) writeText(missionPath(mk), missionWithCascade);
    const { front } = parseFrontmatter(missionWithCascade);
    const score = calcProgress(front);
    const mission = extractEditorBody(missionWithCascade, { stripCascade: true });

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
    const content = exists
      ? extractEditorBody(readText(fp), { stripCascade: false })
      : defaultEntryEditorBody();
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

    const fp = entryPath(mk, date);
    const current = fs.existsSync(fp) ? readText(fp) : defaultEntry(date);
    const currentSplit = splitFrontmatter(current);
    const fallbackSplit = splitFrontmatter(defaultEntry(date));
    const frontmatter = currentSplit.frontmatter || fallbackSplit.frontmatter;
    const body = extractEditorBody(content, { stripCascade: false });
    writeText(fp, composeMarkdown(frontmatter, body));
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

    const currentRaw = fs.existsSync(missionPath(mk))
      ? readText(missionPath(mk))
      : defaultMission(mk);
    const currentWithCascade = upsertFocusCascade(currentRaw, mk);
    const currentSplit = splitFrontmatter(currentWithCascade);
    const fallbackSplit = splitFrontmatter(defaultMission(mk));
    const frontmatter = currentSplit.frontmatter || fallbackSplit.frontmatter;
    const body = extractEditorBody(mission, { stripCascade: true });
    const nextMission = upsertFocusCascade(composeMarkdown(frontmatter, body), mk);
    writeText(missionPath(mk), nextMission);

    // return updated progress
    const { front } = parseFrontmatter(nextMission);
    const score = calcProgress(front);
    res.json({ ok: true, score });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
