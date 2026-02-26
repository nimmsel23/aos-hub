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
const DOMAIN_META = {
  body: { label: "BODY", lens: "Fitness + Fuel" },
  being: { label: "BEING", lens: "Meditation + Memoirs" },
  balance: { label: "BALANCE", lens: "Partner + Posterity" },
  business: { label: "BUSINESS", lens: "Discover + Declare" },
};

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

function frameFile(domain) {
  return path.join(FRAME_DIR, `${domain}.md`);
}

function freedomFile(year, domain) {
  return path.join(FREEDOM_DIR, String(year), `${domain}.md`);
}

function focusFile(month, domain) {
  return path.join(FOCUS_DIR, String(month), `${domain}.md`);
}

function frameSourceRef(domain) {
  return `~/.aos/frame/${domain}.md`;
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

function defaultFrameMarkdown(domain) {
  const meta = domainMeta(domain);
  const upper = meta.label;
  return buildMarkdown(
    {
      domain: upper,
      updated: todayISO(),
      period: "current",
      type: "frame-map",
      source_refs: {
        chapter: "Game Chapter 32 - Frame",
      },
      tags: ["alphaos", "frame", domain],
    },
    `# FRAME: ${upper}\n\n> Starting line, not finish line. Tell the truth about where you are now.\n\n## Domain Lens\n\n- ${meta.lens}\n- Why this domain matters now:\n\n## Current Reality (Facts)\n\n- Current state:\n- Measurable signals:\n- Environment / context:\n\n## Story (How I Got Here)\n\n- Decisions and patterns that created this frame:\n- Recent events that changed the situation:\n\n## Working (Strengths / Assets)\n\n- \n\n## Not Working (Constraints / Friction)\n\n- \n\n## Emotional Reality (How It Feels)\n\n- \n\n## Resources (People / Tools / Time / Money)\n\n- \n\n## Truth Statement\n\n- The clearest truth in this domain right now is:\n\n## Bridge To Freedom\n\n- If I accept this frame fully, the next strategic question becomes:\n`
  );
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
      horizon: "10-year",
      type: "freedom-map",
      source_refs: {
        frame: frameSourceRef(domain),
        chapter: "Game Chapter 33 - Freedom",
      },
      tags: ["alphaos", "freedom", domain, "ipw"],
    },
    `# FREEDOM: ${upper} (${year})\n\n> Direction over drift. Use truth from Frame to define the next year toward your Ideal Parallel World.\n\n## Domain Lens\n\n- ${meta.lens}\n- This year's arena of dominion:\n\n## Truth Anchors From Frame\n\n- What is true right now (no lies, no excuses):\n- What must be accepted before expansion:\n\n## Ideal Parallel World (10-Year Horizon)\n\n- If anything were possible in 10 years, what does ${upper} look like?\n- Who have I become in this domain?\n- How does life feel there?\n\n## ${year} Freedom Vision (12-Month Direction)\n\n- What does progress toward IPW look like this year?\n- What must be fundamentally different by year-end?\n\n## Key Milestones (Q1-Q4)\n\n- Q1:\n- Q2:\n- Q3:\n- Q4:\n\n## Domino Doors (Leverage Moves)\n\n- Door 1:\n- Door 2:\n- Door 3:\n\n## Identity / Standards / Non-Negotiables\n\n- The man I choose to be in this domain:\n- Standards I will hold:\n\n## Additions / Eliminations / Sacrifices\n\n- Add:\n- Remove:\n- Sacrifice:\n\n## Direction Check\n\n- If I stay aligned with this Freedom Map, the next monthly Focus mission should begin with:\n`
  );
}

function focusSourceFrontmatter(month, domain) {
  const upper = domain.toUpperCase();
  const year = String(month).slice(0, 4);

  const frameContent = ensureFileWithDefault(frameFile(domain), () => defaultFrameMarkdown(domain));
  const freedomContent = ensureFileWithDefault(freedomFile(year, domain), () => defaultFreedomMarkdown(year, domain));

  const { front: frameFront } = parseFrontmatter(frameContent);
  const { front: freedomFront } = parseFrontmatter(freedomContent);

  return {
    // codex-ashharbor: Focus should carry upstream map context so the cascade is visible in the markdown itself.
    source_refs: {
      frame: frameSourceRef(domain),
      freedom: freedomSourceRef(year, domain),
      chapter: "Game Chapter 34 - Focus",
    },
    frame: {
      domain: String(frameFront.domain || upper),
      updated: frameFront.updated || null,
      type: String(frameFront.type || "frame-map"),
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
  return buildMarkdown(
    {
      domain: upper,
      month,
      updated: todayISO(),
      period: String(month),
      ...sources,
      type: "focus-map",
      tags: ["alphaos", "focus", domain, "monthly"],
    },
    `# FOCUS: ${upper} (${monthTitle})\n\n> Shrink the journey. Bridge truth (Frame) and vision (Freedom) into one winnable monthly mission.\n\n## Domain Lens\n\n- ${meta.lens}\n- Why this month matters in ${upper}:\n\n## Monthly Mission\n\n- One sentence mission for this month:\n- What \"done\" looks like by month-end:\n\n## Freedom Bridge (Why This Mission)\n\n- Freedom target this mission serves:\n- Which domino door does it move?\n- What happens if I do not execute this month?\n\n## Foundation Layer (Habits / Routines / Resources)\n\n### Habits\n- \n\n### Routines\n- \n\n### Additions\n- \n\n### Eliminations\n- \n\n## Weekly Fire Handoffs (4 Waves)\n\n- Week 1 Fire focus:\n- Week 2 Fire focus:\n- Week 3 Fire focus:\n- Week 4 Fire focus:\n\n## Constraints / Risks / Resistance\n\n- Likely friction:\n- Anti-pattern to avoid:\n- Recovery move if I drift:\n\n## Scoreboard (Proof Of Progress)\n\n- Metric 1:\n- Metric 2:\n- Metric 3:\n\n## First 72 Hours (Set Sail)\n\n- First action:\n- Calendar block:\n- Support / accountability:\n`
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
