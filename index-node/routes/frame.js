// ================================================================
// Frame Router - /api/frame routes
// ================================================================
//
// FRAME = Current Reality Snapshot ("Where am I now?")
// Storage:
//   ~/.aos/frame/{domain}.md   (one markdown doc per domain, updated when reality shifts)
//
// Routes:
//   GET  /api/frame/domains         → { ok, domains: { body, being, balance, business } }
//   GET  /api/frame/domain?domain=body → { ok, domain, content }
//   POST /api/frame/domain/save     → { domain, content } → { ok }
//
// ================================================================

import express from "express";
import fs      from "fs";
import path    from "path";
import os      from "os";
import yaml    from "js-yaml";

const router = express.Router();

const FRAME_DIR = process.env.FRAME_DIR || path.join(os.homedir(), ".aos", "frame");

const VALID_DOMAINS = ["body", "being", "balance", "business"];

// ── File helpers ─────────────────────────────────────────────────────────────

function domainPath(domain){ return path.join(FRAME_DIR, `${domain}.md`); }

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function readText(fp, fb = "") {
  try { return fs.readFileSync(fp, "utf8"); } catch { return fb; }
}

function fileMtime(fp) {
  try {
    const stat = fs.statSync(fp);
    return stat.mtime.toISOString();
  } catch { return null; }
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

function updateFrontmatter(md, updates) {
  const { front, body } = parseFrontmatter(md);
  const merged = { ...front, ...updates };
  const fm = yaml.dump(merged, { lineWidth: 120 });
  return `---\n${fm}---\n\n${body}`;
}

// ── Default template ──────────────────────────────────────────────────────────

function defaultTemplate(domain) {
  const today = new Date().toISOString().split("T")[0];
  return `---
domain: ${domain}
updated: ${today}
---

# ${domain.toUpperCase()} · Current Frame

## Where I Am Now

## What's Working

## What Needs Change

## Key Insights

## Raw Truth
-
`;
}

// ── Preview generator ─────────────────────────────────────────────────────────

function generatePreview(content) {
  const { body } = parseFrontmatter(content);
  const firstLine = body.split("\n").filter(l => l.trim() && !l.startsWith("#")).slice(0,1).join(" ");
  return firstLine.slice(0, 60).trim() || "";
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/frame/domains
router.get("/domains", (req, res) => {
  try {
    ensureDir(FRAME_DIR);
    const domains = {};

    for (const domain of VALID_DOMAINS) {
      const fp = domainPath(domain);
      const exists = fs.existsSync(fp);
      const content = exists ? readText(fp) : "";
      const updated = exists ? fileMtime(fp) : null;
      const preview = exists ? generatePreview(content) : "";

      domains[domain] = { content, updated, preview };
    }

    res.json({ ok: true, domains });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/frame/domain?domain=body
router.get("/domain", (req, res) => {
  try {
    const domain = String(req.query.domain || "").trim().toLowerCase();
    if (!VALID_DOMAINS.includes(domain))
      return res.status(400).json({ ok: false, error: "invalid_domain" });

    const fp = domainPath(domain);
    const exists = fs.existsSync(fp);
    const content = exists ? readText(fp) : defaultTemplate(domain);

    res.json({ ok: true, domain, content });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/frame/domain/save  { domain, content }
router.post("/domain/save", (req, res) => {
  try {
    const { domain, content } = req.body || {};
    if (!VALID_DOMAINS.includes(domain))
      return res.status(400).json({ ok: false, error: "invalid_domain" });
    if (typeof content !== "string")
      return res.status(400).json({ ok: false, error: "invalid_content" });

    const today = new Date().toISOString().split("T")[0];
    const updated = updateFrontmatter(content, { updated: today });

    writeText(domainPath(domain), updated);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
