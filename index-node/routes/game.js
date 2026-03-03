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
import {
  frameDefaultTemplate,
  frameFilePath,
  framePreviewFromState,
  frameStateToYaml,
  normalizeFrameState,
  parseFrameStateContent,
} from "./frame.js";

const uiRouter = express.Router();
export const gameApiRouter = express.Router();

const AOS_DIR = path.join(os.homedir(), ".aos");
const FRAME_DIR = path.join(AOS_DIR, "frame");
const FREEDOM_DIR = path.join(AOS_DIR, "freedom");
const FOCUS_DIR = path.join(AOS_DIR, "focus");
const VALID_DOMAINS = ["body", "being", "balance", "business"];
const DOMAIN_META = {
  body: { label: "BODY", lens: "Fitness + Fuel" },
  being: { label: "BEING", lens: "Meditation + Memoirs" },
  balance: { label: "BALANCE", lens: "Partner + Posterity" },
  business: { label: "BUSINESS", lens: "Discover + Declare" },
};
const FOCUS_CASCADE_HEADER_BEGIN = "<!-- AOS:FOCUS:CASCADE:FREEDOM:HEADER:BEGIN -->";
const FOCUS_CASCADE_HEADER_END = "<!-- AOS:FOCUS:CASCADE:FREEDOM:HEADER:END -->";
const FOCUS_CASCADE_FOOTER_BEGIN = "<!-- AOS:FOCUS:CASCADE:FRAME:FOOTER:BEGIN -->";
const FOCUS_CASCADE_FOOTER_END = "<!-- AOS:FOCUS:CASCADE:FRAME:FOOTER:END -->";
const GAME_DIR = path.join(process.cwd(), "..", "game");
const GAME_CHAPTERS = [
  { id: "32", title: "Frame", file: "32 - Frame.md" },
  { id: "33", title: "Freedom", file: "33 - Freedom.md" },
  { id: "34", title: "Focus", file: "34 - Focus.md" },
  { id: "35", title: "Fire", file: "35 - Fire.md" },
  { id: "36", title: "Game", file: "36 - Game.md" },
  { id: "37", title: "The Life", file: "37 - The Life.md" },
  { id: "38", title: "The Mission", file: "38 - The Mission.md" },
  { id: "39", title: "The Fire", file: "39 - The Fire.md" },
  { id: "40", title: "The Daily", file: "40 - The Daily.md" },
  { id: "41", title: "The General's Tent", file: "41 - General_s Tent.md" },
  { id: "42", title: "The Alpha Odyssey", file: "42 - The Alpha Odyssey.md" },
];

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

function domainMeta(domain) {
  return DOMAIN_META[String(domain || "").toLowerCase()] || {
    label: String(domain || "").toUpperCase(),
    lens: "",
  };
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

function freedomFile(year, domain) {
  return path.join(FREEDOM_DIR, String(year), `${domain}.md`);
}

function focusFile(month, domain) {
  return path.join(FOCUS_DIR, String(month), `${domain}.md`);
}

function chapterById(id) {
  return GAME_CHAPTERS.find((c) => String(c.id) === String(id));
}

function chapterFilePath(chapter) {
  return path.join(GAME_DIR, chapter.file);
}

function frameSourceRef(domain) {
  return `~/.aos/frame/${domain}.yaml`;
}

function freedomSourceRef(year, domain) {
  return `~/.aos/freedom/${year}/${domain}.md`;
}

function monthLabel(month) {
  const m = String(month || "");
  const match = /^(\d{4})-(\d{2})$/.exec(m);
  if (!match) return m;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const date = new Date(Date.UTC(year, monthIndex, 1));
  if (Number.isNaN(date.getTime())) return m;
  return date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function quarterFromDate(date = new Date()) {
  return `Q${Math.ceil((date.getMonth() + 1) / 3)}`;
}

function quarterKeyForYear(year) {
  return `${quarterFromDate()}-${String(year || currentYearString())}`;
}

function frameStateYamlForDomain(domain) {
  const filePath = frameFilePath(domain);
  const content = ensureFileWithDefault(filePath, () => frameDefaultTemplate(domain));
  const parsed = parseFrameStateContent(content);
  if (!parsed) return frameDefaultTemplate(domain).trim();
  return frameStateToYaml(normalizeFrameState(parsed, domain)).trim();
}

function stripFocusCascadeBlocks(body) {
  const text = String(body || "");
  const headerBegin = FOCUS_CASCADE_HEADER_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headerEnd = FOCUS_CASCADE_HEADER_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const footerBegin = FOCUS_CASCADE_FOOTER_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const footerEnd = FOCUS_CASCADE_FOOTER_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const noHeader = text.replace(new RegExp(`${headerBegin}[\\s\\S]*?${headerEnd}\\n?`, "g"), "");
  return noHeader.replace(new RegExp(`${footerBegin}[\\s\\S]*?${footerEnd}\\n?`, "g"), "").trim();
}

function freedomMarkdownForDomain(year, domain) {
  const filePath = freedomFile(year, domain);
  const content = ensureFileWithDefault(filePath, () => defaultFreedomMarkdown(year, domain));
  return String(content || "").trim();
}

function buildFocusFreedomHeaderBlock(year, domain) {
  return [
    FOCUS_CASCADE_HEADER_BEGIN,
    "## FREEDOM HEADER · QUARTERLY DIRECTION (MARKDOWN)",
    "",
    `- cadence: quarterly`,
    `- quarter: ${quarterKeyForYear(year)}`,
    "",
    "```markdown",
    freedomMarkdownForDomain(year, domain),
    "```",
    FOCUS_CASCADE_HEADER_END,
    "",
  ].join("\n");
}

function buildFocusFrameFooterBlock(domain) {
  return [
    FOCUS_CASCADE_FOOTER_BEGIN,
    "## FRAME FOOTER · ANNUAL TRUTH (YAML)",
    "",
    "```yaml",
    frameStateYamlForDomain(domain),
    "```",
    FOCUS_CASCADE_FOOTER_END,
    "",
  ].join("\n");
}

function upsertFocusCascadeForDomain(content, year, domain) {
  const { front, body } = parseFrontmatter(content);
  const cleanBody = stripFocusCascadeBlocks(body);
  const withCascade = [
    buildFocusFreedomHeaderBlock(year, domain).trim(),
    cleanBody,
    buildFocusFrameFooterBlock(domain).trim(),
  ].filter(Boolean).join("\n\n").trim() + "\n";
  return buildMarkdown(front, withCascade);
}

function defaultFreedomMarkdown(year, domain) {
  const meta = domainMeta(domain);
  const upper = meta.label;
  return buildMarkdown(
    {
      domain: upper,
      year: Number(year),
      updated: todayISO(),
      period: String(year),
      cadence: "quarterly",
      quarter: quarterKeyForYear(year),
      horizon: "10-year",
      type: "freedom-map",
      source_refs: {
        frame: frameSourceRef(domain),
        chapter: "Game Chapter 33 - Freedom",
      },
      tags: ["alphaos", "freedom", domain, "ipw"],
    },
    `# FREEDOM: ${upper} (${year})\n\n## Domain Lens\n\n- ${meta.lens}\n\n## Chapter 33 Core Prompts\n\n- If anything were possible, what would I want my life to look like in 10 years from now?\n- What kind of man do I choose to be in this domain?\n- What kind of life do I choose to live in this domain?\n- What does my Ideal Parallel World look like in this domain?\n\n## Ideal Parallel World (10-Year)\n\n- \n\n## Who I choose to be\n\n- \n\n## ${year} Direction\n\n- \n\n## Q1-Q4 Milestones\n\n- Q1:\n- Q2:\n- Q3:\n- Q4:\n`
  );
}

function focusSourceFrontmatter(month, domain) {
  const upper = domain.toUpperCase();
  const year = String(month).slice(0, 4);

  const frameContent = ensureFileWithDefault(frameFilePath(domain), () => frameDefaultTemplate(domain));
  const freedomContent = ensureFileWithDefault(freedomFile(year, domain), () => defaultFreedomMarkdown(year, domain));

  const frameRaw = parseFrameStateContent(frameContent) || {};
  const frameState = normalizeFrameState(frameRaw, domain);
  const { front: freedomFront } = parseFrontmatter(freedomContent);

  return {
    // codex-ashharbor: Focus should carry upstream map context so the cascade is visible in the markdown itself.
    source_refs: {
      frame: frameSourceRef(domain),
      freedom: freedomSourceRef(year, domain),
      chapter: "Game Chapter 34 - Focus",
    },
    frame: {
      domain: String(frameState.domain || upper),
      updated: frameState.updated || null,
      type: String(frameState.type || "frame-map"),
    },
    freedom: {
      domain: String(freedomFront.domain || upper),
      year: Number(freedomFront.year || Number(year)),
      updated: freedomFront.updated || null,
      horizon: String(freedomFront.horizon || "10-year"),
      type: String(freedomFront.type || "freedom-map"),
    },
  };
}

function defaultFocusMarkdown(month, domain) {
  const meta = domainMeta(domain);
  const upper = meta.label;
  const sources = focusSourceFrontmatter(month, domain);
  const monthTitle = monthLabel(month);
  const year = String(month).slice(0, 4);
  const base = buildMarkdown(
    {
      domain: upper,
      month,
      updated: todayISO(),
      period: String(month),
      ...sources,
      type: "focus-map",
      tags: ["alphaos", "focus", domain, "monthly"],
    },
    `# FOCUS: ${upper} (${monthTitle})\n\n## Domain Lens\n\n- ${meta.lens}\n\n## Chapter 34 Core Prompts\n\n- What is my Monthly Mission that bridges where I am now and where I want to be?\n- What habits must I build this month?\n- What routines keep me on course?\n- What do I need to add?\n- What do I need to eliminate?\n- What is my first action to set sail?\n\n## Monthly Mission\n\n- \n\n## Habits\n\n- \n\n## Routines\n\n- \n\n## Additions\n\n- \n\n## Eliminations\n\n- \n\n## Set Sail (First Action)\n\n- \n`
  );
  return upsertFocusCascadeForDomain(base, year, domain);
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

gameApiRouter.get("/chapters", (_req, res) => {
  try {
    const chapters = GAME_CHAPTERS.map((c) => ({
      id: c.id,
      title: c.title,
    }));
    return jsonOk(res, { chapters }, { chapters });
  } catch (err) {
    return jsonErr(res, 500, String(err));
  }
});

gameApiRouter.get("/chapters/:id", (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const chapter = chapterById(id);
    if (!chapter) return jsonErr(res, 404, "chapter_not_found");
    const filePath = chapterFilePath(chapter);
    if (!fs.existsSync(filePath)) return jsonErr(res, 404, "chapter_missing");
    const content = readText(filePath);
    return jsonOk(res, { id: chapter.id, title: chapter.title, content }, { id: chapter.id, title: chapter.title, content });
  } catch (err) {
    return jsonErr(res, 500, String(err));
  }
});

// FRAME
gameApiRouter.get("/frame/domains", (_req, res) => {
  try {
    ensureDir(FRAME_DIR);
    const domains = VALID_DOMAINS.map((domain) => {
      const filePath = frameFilePath(domain);
      if (!fs.existsSync(filePath)) {
        return { domain, preview: "", updated: null };
      }
      const content = readText(filePath);
      const parsed = parseFrameStateContent(content);
      if (!parsed) {
        return { domain, preview: "", updated: null };
      }
      const state = normalizeFrameState(parsed, domain);
      return {
        domain,
        preview: framePreviewFromState(state),
        updated: state.updated || null,
      };
    });
    return jsonOk(res, { domains }, { domains });
  } catch (err) {
    return jsonErr(res, 500, String(err));
  }
});

gameApiRouter.get("/frame/:domain", (req, res) => {
  try {
    const domain = String(req.params.domain || "").toLowerCase();
    if (!isValidDomain(domain)) return jsonErr(res, 400, "invalid_domain");
    const filePath = frameFilePath(domain);
    const content = ensureFileWithDefault(filePath, () => frameDefaultTemplate(domain));
    const parsed = parseFrameStateContent(content);
    const front = parsed ? normalizeFrameState(parsed, domain) : null;
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

    const parsed = parseFrameStateContent(content);
    if (!parsed) return jsonErr(res, 400, "invalid_yaml");
    const state = normalizeFrameState(parsed, domain, todayISO());
    writeText(frameFilePath(domain), frameStateToYaml(state));
    return jsonOk(res, { domain, updated: state.updated }, { domain, updated: state.updated });
  } catch (err) {
    return jsonErr(res, 500, String(err));
  }
});

gameApiRouter.get("/annual/frame", (_req, res) => {
  try {
    ensureDir(FRAME_DIR);
    const states = {};
    VALID_DOMAINS.forEach((domain) => {
      const filePath = frameFilePath(domain);
      const content = ensureFileWithDefault(filePath, () => frameDefaultTemplate(domain));
      const parsed = parseFrameStateContent(content);
      const state = parsed ? normalizeFrameState(parsed, domain) : normalizeFrameState({}, domain);
      states[domain] = state;
    });
    return jsonOk(res, { states }, { states });
  } catch (err) {
    return jsonErr(res, 500, String(err));
  }
});

gameApiRouter.post("/annual/frame", (req, res) => {
  try {
    const answers = req.body?.answers || req.body?.states;
    if (!answers || typeof answers !== "object") return jsonErr(res, 400, "invalid_payload");

    const updatedDomains = [];
    VALID_DOMAINS.forEach((domain) => {
      const domainPayload = answers[domain];
      if (!domainPayload || typeof domainPayload !== "object") return;
      const filePath = frameFilePath(domain);
      const content = ensureFileWithDefault(filePath, () => frameDefaultTemplate(domain));
      const parsed = parseFrameStateContent(content) || {};
      const state = normalizeFrameState(parsed, domain, todayISO());
      const questions = state.questions || {};
      Object.keys(questions).forEach((key) => {
        if (typeof domainPayload[key] === "string") {
          questions[key] = String(domainPayload[key]).trim();
        }
      });
      state.questions = questions;
      writeText(frameFilePath(domain), frameStateToYaml(state));
      updatedDomains.push(domain);
    });

    if (!updatedDomains.length) return jsonErr(res, 400, "no_domains_updated");
    return jsonOk(res, { updated: updatedDomains }, { updated: updatedDomains });
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
        cadence: "quarterly",
        quarter: String(front.quarter || quarterKeyForYear(year)),
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
    const content = upsertFocusCascadeForDomain(
      ensureFileWithDefault(filePath, () => defaultFocusMarkdown(month, domain)),
      month.slice(0, 4),
      domain
    );
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

    const withHeader = upsertFocusCascadeForDomain(content, month.slice(0, 4), domain);
    const { front, body } = parseFrontmatter(withHeader);
    const updated = todayISO();
    const sources = focusSourceFrontmatter(month, domain);
    const markdown = buildMarkdown(
      {
        ...front,
        domain: domain.toUpperCase(),
        month,
        updated,
        ...sources,
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
