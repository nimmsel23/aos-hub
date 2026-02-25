// ================================================================
// Game Routers
// ================================================================
//
// Default export: UI router mounted at /game
// Named export  : API router mounted at /api/game
//
// API coverage here is a compatibility layer for the Game PWA:
// - /api/game/frame/*
// - /api/game/freedom/*
// - /api/game/focus/*
//
// ================================================================

import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import yaml from "js-yaml";
import tentRouter from "./game.tent.js";

const uiRouter = express.Router();
export const gameApiRouter = express.Router();

const AOS_DIR = path.join(os.homedir(), ".aos");
const FRAME_DIR = path.join(AOS_DIR, "frame");
const FREEDOM_DIR = path.join(AOS_DIR, "freedom");
const FOCUS_DIR = path.join(AOS_DIR, "focus");
const VALID_DOMAINS = ["body", "being", "balance", "business"];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function currentYearString() {
  return String(new Date().getFullYear());
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isValidDomain(domain) {
  return VALID_DOMAINS.includes(String(domain || "").toLowerCase());
}

function isValidYear(year) {
  return /^\d{4}$/.test(String(year || ""));
}

function isValidMonth(month) {
  return /^\d{4}-\d{2}$/.test(String(month || ""));
}

function parseFrontmatter(md) {
  const text = typeof md === "string" ? md : "";
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { front: {}, body: text };
  let front = {};
  try {
    front = yaml.load(m[1]) || {};
  } catch {
    front = {};
  }
  return { front, body: text.slice(m[0].length) };
}

function buildMarkdown(frontmatter, body) {
  const frontYaml = yaml.dump(frontmatter, { lineWidth: 120 });
  const safeBody = typeof body === "string" ? body : "";
  return `---\n${frontYaml}---\n\n${safeBody}`;
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function previewFromMarkdown(md) {
  const { body } = parseFrontmatter(md);
  return body.replace(/\s+/g, " ").trim().slice(0, 100);
}

function frameFile(domain) {
  return path.join(FRAME_DIR, `${domain}.md`);
}

function freedomFile(year, domain) {
  return path.join(FREEDOM_DIR, String(year), `${domain}.md`);
}

function focusFile(month, domain) {
  return path.join(FOCUS_DIR, String(month), `${domain}.md`);
}

function defaultFrameMarkdown(domain) {
  const upper = domain.toUpperCase();
  return buildMarkdown(
    {
      domain: upper,
      updated: todayISO(),
      type: "frame-map",
      tags: ["alphaos", "frame", domain],
    },
    `# ${upper} Frame\n\n## Current Reality\n\n- \n`
  );
}

function defaultFreedomMarkdown(year, domain) {
  const upper = domain.toUpperCase();
  return buildMarkdown(
    {
      domain: upper,
      year: Number(year),
      updated: todayISO(),
      horizon: "10-year",
      type: "freedom-map",
      tags: ["alphaos", "freedom", domain, "ipw"],
    },
    `# ${upper} Freedom ${year}\n\n## Ideal Parallel World\n\n- \n`
  );
}

function defaultFocusMarkdown(month, domain) {
  const upper = domain.toUpperCase();
  return buildMarkdown(
    {
      domain: upper,
      month,
      updated: todayISO(),
      type: "focus-map",
      tags: ["alphaos", "focus", domain, "monthly"],
    },
    `# ${upper} Focus ${month}\n\n## Monthly Mission\n\n- \n`
  );
}

function ensureFileWithDefault(filePath, buildDefault) {
  ensureDir(path.dirname(filePath));
  if (!fs.existsSync(filePath)) {
    writeText(filePath, buildDefault());
  }
  return readText(filePath);
}

function jsonOk(res, data, extra = {}) {
  return res.json({ ok: true, data, ...extra });
}

function jsonErr(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function listDomainsSummary(readFileForDomain) {
  return VALID_DOMAINS.map((domain) => {
    const { filePath, defaultFront } = readFileForDomain(domain);
    if (!fs.existsSync(filePath)) {
      return {
        domain,
        preview: "",
        updated: defaultFront.updated || null,
      };
    }
    const content = readText(filePath);
    const { front } = parseFrontmatter(content);
    return {
      domain,
      preview: previewFromMarkdown(content),
      updated: front.updated || null,
    };
  });
}

// ── UI router (/game) ────────────────────────────────────────────────────────

uiRouter.use("/tent", tentRouter);

// ── Game PWA API router (/api/game) ──────────────────────────────────────────

// FRAME
gameApiRouter.get("/frame/domains", (_req, res) => {
  try {
    ensureDir(FRAME_DIR);
    const domains = listDomainsSummary((domain) => ({
      filePath: frameFile(domain),
      defaultFront: { updated: null },
    }));
    return jsonOk(res, { domains }, { domains });
  } catch (err) {
    return jsonErr(res, 500, String(err));
  }
});

gameApiRouter.get("/frame/:domain", (req, res) => {
  try {
    const domain = String(req.params.domain || "").toLowerCase();
    if (!isValidDomain(domain)) return jsonErr(res, 400, "invalid_domain");
    const filePath = frameFile(domain);
    const content = ensureFileWithDefault(filePath, () => defaultFrameMarkdown(domain));
    const { front } = parseFrontmatter(content);
    return jsonOk(res, { domain, content, front }, { domain, content, front });
  } catch (err) {
    return jsonErr(res, 500, String(err));
  }
});

gameApiRouter.post("/frame/:domain/save", (req, res) => {
  try {
    const domain = String(req.params.domain || "").toLowerCase();
    if (!isValidDomain(domain)) return jsonErr(res, 400, "invalid_domain");
    const content = req.body?.content;
    if (typeof content !== "string") return jsonErr(res, 400, "invalid_content");

    const { front, body } = parseFrontmatter(content);
    const updated = todayISO();
    const markdown = buildMarkdown(
      {
        ...front,
        domain: domain.toUpperCase(),
        updated,
        type: "frame-map",
        tags: Array.isArray(front.tags) ? front.tags : ["alphaos", "frame", domain],
      },
      body
    );

    writeText(frameFile(domain), markdown);
    return jsonOk(res, { domain, updated }, { domain, updated });
  } catch (err) {
    return jsonErr(res, 500, String(err));
  }
});

// FREEDOM
gameApiRouter.get("/freedom/year", (req, res) => {
  try {
    const year = String(req.query.year || currentYearString());
    if (!isValidYear(year)) return jsonErr(res, 400, "invalid_year");
    ensureDir(path.join(FREEDOM_DIR, year));
    const domains = listDomainsSummary((domain) => ({
      filePath: freedomFile(year, domain),
      defaultFront: { updated: null },
    }));
    return jsonOk(res, { year, domains }, { year, domains });
  } catch (err) {
    return jsonErr(res, 500, String(err));
  }
});

gameApiRouter.get("/freedom/:year/:domain", (req, res) => {
  try {
    const year = String(req.params.year || "");
    const domain = String(req.params.domain || "").toLowerCase();
    if (!isValidYear(year)) return jsonErr(res, 400, "invalid_year");
    if (!isValidDomain(domain)) return jsonErr(res, 400, "invalid_domain");

    const filePath = freedomFile(year, domain);
    const content = ensureFileWithDefault(filePath, () => defaultFreedomMarkdown(year, domain));
    const { front } = parseFrontmatter(content);
    return jsonOk(res, { year, domain, content, front }, { year, domain, content, front });
  } catch (err) {
    return jsonErr(res, 500, String(err));
  }
});

gameApiRouter.post("/freedom/:year/:domain/save", (req, res) => {
  try {
    const year = String(req.params.year || "");
    const domain = String(req.params.domain || "").toLowerCase();
    if (!isValidYear(year)) return jsonErr(res, 400, "invalid_year");
    if (!isValidDomain(domain)) return jsonErr(res, 400, "invalid_domain");
    const content = req.body?.content;
    if (typeof content !== "string") return jsonErr(res, 400, "invalid_content");

    const { front, body } = parseFrontmatter(content);
    // codex-ashharbor -> codex-game-forge: PWA domain summary cards read `front.updated` across all map types.
    const updated = todayISO();
    const markdown = buildMarkdown(
      {
        ...front,
        domain: domain.toUpperCase(),
        year: Number(year),
        updated,
        horizon: "10-year",
        type: "freedom-map",
        tags: Array.isArray(front.tags) ? front.tags : ["alphaos", "freedom", domain, "ipw"],
      },
      body
    );
    writeText(freedomFile(year, domain), markdown);
    return jsonOk(res, { year, domain, updated }, { year, domain, updated });
  } catch (err) {
    return jsonErr(res, 500, String(err));
  }
});

// FOCUS
gameApiRouter.get("/focus/month", (req, res) => {
  try {
    const month = String(req.query.month || currentMonthKey());
    if (!isValidMonth(month)) return jsonErr(res, 400, "invalid_month");
    ensureDir(path.join(FOCUS_DIR, month));
    const domains = listDomainsSummary((domain) => ({
      filePath: focusFile(month, domain),
      defaultFront: { updated: null },
    }));
    return jsonOk(res, { month, domains }, { month, domains });
  } catch (err) {
    return jsonErr(res, 500, String(err));
  }
});

gameApiRouter.get("/focus/:month/:domain", (req, res) => {
  try {
    const month = String(req.params.month || "");
    const domain = String(req.params.domain || "").toLowerCase();
    if (!isValidMonth(month)) return jsonErr(res, 400, "invalid_month");
    if (!isValidDomain(domain)) return jsonErr(res, 400, "invalid_domain");

    const filePath = focusFile(month, domain);
    const content = ensureFileWithDefault(filePath, () => defaultFocusMarkdown(month, domain));
    const { front } = parseFrontmatter(content);
    return jsonOk(res, { month, domain, content, front }, { month, domain, content, front });
  } catch (err) {
    return jsonErr(res, 500, String(err));
  }
});

gameApiRouter.post("/focus/:month/:domain/save", (req, res) => {
  try {
    const month = String(req.params.month || "");
    const domain = String(req.params.domain || "").toLowerCase();
    if (!isValidMonth(month)) return jsonErr(res, 400, "invalid_month");
    if (!isValidDomain(domain)) return jsonErr(res, 400, "invalid_domain");
    const content = req.body?.content;
    if (typeof content !== "string") return jsonErr(res, 400, "invalid_content");

    const { front, body } = parseFrontmatter(content);
    const updated = todayISO();
    const markdown = buildMarkdown(
      {
        ...front,
        domain: domain.toUpperCase(),
        month,
        updated,
        type: "focus-map",
        tags: Array.isArray(front.tags) ? front.tags : ["alphaos", "focus", domain, "monthly"],
      },
      body
    );
    writeText(focusFile(month, domain), markdown);
    return jsonOk(res, { month, domain, updated }, { month, domain, updated });
  } catch (err) {
    return jsonErr(res, 500, String(err));
  }
});

export default uiRouter;
