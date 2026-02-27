// ================================================================
// Freedom Router - /api/freedom routes
// ================================================================
//
// FREEDOM = Annual IPW Vision (Ideal Parallel World)
// Storage:
//   ~/.aos/freedom/YYYY/{domain}.md   (one markdown doc per domain per year)
//
// Routes:
//   GET  /api/freedom/year?year=2026       → { ok, year, domains: { body, being, balance, business } }
//   GET  /api/freedom/domain?domain=body&year=2026 → { ok, domain, year, content }
//   POST /api/freedom/domain/save          → { domain, year, content } → { ok }
//
// ================================================================

import express from "express";
import fs      from "fs";
import path    from "path";
import os      from "os";
import yaml    from "js-yaml";

const router = express.Router();

const FREEDOM_DIR = process.env.FREEDOM_DIR || path.join(os.homedir(), ".aos", "freedom");

const VALID_DOMAINS = ["body", "being", "balance", "business"];
const DOMAIN_META = {
  body: { label: "BODY", lens: "Fitness + Fuel" },
  being: { label: "BEING", lens: "Meditation + Memoirs" },
  balance: { label: "BALANCE", lens: "Partner + Posterity" },
  business: { label: "BUSINESS", lens: "Discover + Declare" },
};

// ── File helpers ─────────────────────────────────────────────────────────────

function yearDir(year)           { return path.join(FREEDOM_DIR, String(year)); }
function domainPath(year, domain){ return path.join(yearDir(year), `${domain}.md`); }

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

function quarterFromDate(date = new Date()) {
  return `Q${Math.ceil((date.getMonth() + 1) / 3)}`;
}

function quarterKeyForYear(year) {
  const y = String(year || new Date().getFullYear());
  return `${quarterFromDate()}-${y}`;
}

function parseFrontmatter(md) {
  const text = String(md || "");
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { front: {}, body: text };
  let front = {};
  try { front = yaml.load(m[1]) || {}; } catch { front = {}; }
  return { front, body: text.slice(m[0].length) };
}

function buildMarkdown(frontmatter, body) {
  const frontYaml = yaml.dump(frontmatter, { lineWidth: 120, sortKeys: false });
  return `---\n${frontYaml}---\n\n${String(body || "").trimEnd()}\n`;
}

function stripFrontmatter(md) {
  return parseFrontmatter(md).body.trim();
}

function normalizeEditorBody(content) {
  const raw = String(content || "");
  // Backward-compat: if full markdown doc is sent, keep only editable body.
  if (/^---\s*\n[\s\S]*?\n---\s*\n?/m.test(raw)) {
    return stripFrontmatter(raw);
  }
  return raw.trim();
}

function defaultEditorBody(domain, year) {
  const meta = DOMAIN_META[domain] || { label: String(domain || "").toUpperCase(), lens: "" };
  return `# FREEDOM: ${meta.label} (${year})

## Domain Lens

- ${meta.lens}

## Chapter 33 Core Prompts

- If anything were possible, what would I want my life to look like in 10 years from now?
- What kind of man do I choose to be in this domain?
- What kind of life do I choose to live in this domain?
- What does my Ideal Parallel World look like in this domain?

## Ideal Parallel World (10-Year)

-

## Who I choose to be

-

## ${year} Direction

-

## Q1-Q4 Milestones

- Q1:
- Q2:
- Q3:
- Q4:`.trim();
}

function composeFreedomMarkdown(domain, year, editorBody, existingFront = {}) {
  const meta = DOMAIN_META[domain] || { label: String(domain || "").toUpperCase() };
  const today = new Date().toISOString().slice(0, 10);
  const front = {
    ...existingFront,
    domain: meta.label,
    year: Number(year),
    updated: today,
    period: String(year),
    type: "freedom-map",
    cadence: "quarterly",
    quarter: String(existingFront.quarter || quarterKeyForYear(year)),
    source_refs: {
      chapter: "Game Chapter 33 - Freedom",
      ...(existingFront.source_refs && typeof existingFront.source_refs === "object" ? existingFront.source_refs : {}),
    },
  };
  return buildMarkdown(front, editorBody);
}

// ── Default template ──────────────────────────────────────────────────────────

function defaultTemplate(domain, year) {
  return composeFreedomMarkdown(domain, year, defaultEditorBody(domain, year), {});
}

// ── Validation helpers ─────────────────────────────────────────────────────────

function isValidDomain(d) {
  return VALID_DOMAINS.includes(String(d).toLowerCase());
}

function isValidYear(y) {
  return /^\d{4}$/.test(String(y)) && Number(y) >= 2000 && Number(y) <= 2099;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/freedom/year?year=2026
// Returns all 4 domain summaries for a given year
router.get("/year", (req, res) => {
  try {
    const year = String(req.query.year || new Date().getFullYear());

    if (!isValidYear(year)) {
      return res.status(400).json({ ok: false, error: "invalid_year" });
    }

    ensureDir(yearDir(year));

    const domains = {};
    for (const domain of VALID_DOMAINS) {
      const fp      = domainPath(year, domain);
      const exists  = fs.existsSync(fp);
      const content = exists ? stripFrontmatter(readText(fp)) : null;
      const updated = exists ? fileMtime(fp) : null;
      domains[domain] = { content, updated };
    }

    res.json({ ok: true, year, domains });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/freedom/domain?domain=body&year=2026
// Returns content for a single domain (template if file doesn't exist)
router.get("/domain", (req, res) => {
  try {
    const domain = String(req.query.domain || "").toLowerCase();
    const year   = String(req.query.year || new Date().getFullYear());

    if (!isValidDomain(domain)) {
      return res.status(400).json({ ok: false, error: "invalid_domain" });
    }
    if (!isValidYear(year)) {
      return res.status(400).json({ ok: false, error: "invalid_year" });
    }

    const fp      = domainPath(year, domain);
    const exists  = fs.existsSync(fp);
    const content = exists ? stripFrontmatter(readText(fp)) : defaultEditorBody(domain, year);
    const updated = exists ? fileMtime(fp) : null;

    res.json({ ok: true, domain, year, content, exists, updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/freedom/domain/save  { domain, year, content }
router.post("/domain/save", (req, res) => {
  try {
    const { domain, year, content } = req.body || {};

    if (!isValidDomain(domain)) {
      return res.status(400).json({ ok: false, error: "invalid_domain" });
    }
    if (!isValidYear(year)) {
      return res.status(400).json({ ok: false, error: "invalid_year" });
    }
    if (typeof content !== "string") {
      return res.status(400).json({ ok: false, error: "invalid_content" });
    }

    const fp = domainPath(year, domain);
    ensureDir(path.dirname(fp));
    const current = fs.existsSync(fp) ? parseFrontmatter(readText(fp)).front : {};
    const next = composeFreedomMarkdown(domain, year, normalizeEditorBody(content), current);
    writeText(fp, next);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
