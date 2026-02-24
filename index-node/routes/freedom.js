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

const router = express.Router();

const FREEDOM_DIR = process.env.FREEDOM_DIR || path.join(os.homedir(), ".aos", "freedom");

const VALID_DOMAINS = ["body", "being", "balance", "business"];

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

// ── Default template ──────────────────────────────────────────────────────────

function defaultTemplate(domain, year) {
  const today = new Date().toISOString().slice(0, 10);
  const domainTitle = domain.charAt(0).toUpperCase() + domain.slice(1).toUpperCase();
  return `---
domain: ${domain}
year: ${year}
updated: ${today}
---

# ${domainTitle} · Freedom Vision ${year}

## Who I Am in My Ideal Parallel World

## Physical Reality

## Daily Practice

## Health & Longevity

## Notes
- \n`;
}

// Domain-specific template headers
function domainTemplate(domain, year) {
  const today = new Date().toISOString().slice(0, 10);
  const domainUpper = domain.toUpperCase();
  const templates = {
    body: `---
domain: body
year: ${year}
updated: ${today}
---

# BODY · Freedom Vision ${year}

## Who I Am in My Ideal Parallel World

## Physical Reality

## Daily Practice

## Health & Longevity

## Notes
- \n`,
    being: `---
domain: being
year: ${year}
updated: ${today}
---

# BEING · Freedom Vision ${year}

## Who I Am in My Ideal Parallel World

## Inner Life & Consciousness

## Daily Practice

## Spiritual Connection

## Notes
- \n`,
    balance: `---
domain: balance
year: ${year}
updated: ${today}
---

# BALANCE · Freedom Vision ${year}

## Who I Am in My Ideal Parallel World

## Relationships & Connection

## Family & Partnership

## Community & Legacy

## Notes
- \n`,
    business: `---
domain: business
year: ${year}
updated: ${today}
---

# BUSINESS · Freedom Vision ${year}

## Who I Am in My Ideal Parallel World

## Professional Reality

## Financial Freedom

## Impact & Teaching

## Notes
- \n`,
  };
  return templates[domain] || defaultTemplate(domain, year);
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
      const content = exists ? readText(fp) : null;
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
    const content = exists ? readText(fp) : domainTemplate(domain, year);
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
    writeText(fp, content);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
