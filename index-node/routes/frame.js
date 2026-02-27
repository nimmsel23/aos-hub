// ================================================================
// Frame Router - /api/frame routes
// ================================================================
//
// FRAME = Current Reality Snapshot ("Where am I now?")
// Storage:
//   ~/.aos/frame/{domain}.yaml   (one YAML state per domain)
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
const CHAPTER_REF = "Game Chapter 32 - Frame";

const VALID_DOMAINS = ["body", "being", "balance", "business"];
export const FRAME_VALID_DOMAINS = VALID_DOMAINS;
const DOMAIN_META = {
  body: { label: "BODY" },
  being: { label: "BEING" },
  balance: { label: "BALANCE" },
  business: { label: "BUSINESS" },
};

// ── File helpers ─────────────────────────────────────────────────────────────

export function frameFilePath(domain) { return path.join(FRAME_DIR, `${domain}.yaml`); }
export function frameLegacyFilePath(domain) { return path.join(FRAME_DIR, `${domain}.md`); }

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function readText(fp, fb = "") {
  try { return fs.readFileSync(fp, "utf8"); } catch { return fb; }
}

function writeText(fp, txt) {
  ensureDir(path.dirname(fp));
  fs.writeFileSync(fp, txt, "utf8");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function asString(value) {
  return typeof value === "string" ? value : "";
}

function domainLabel(domain) {
  const key = String(domain || "").toLowerCase();
  return (DOMAIN_META[key] && DOMAIN_META[key].label) || String(domain || "").toUpperCase();
}

function parseLegacySection(markdown, headingVariants) {
  for (const heading of headingVariants) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`##\\s*${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
    const m = markdown.match(re);
    if (!m) continue;
    const raw = String(m[1] || "")
      .split("\n")
      .map((line) => line.replace(/^\s*-\s?/, ""))
      .join("\n")
      .trim();
    if (raw) return raw;
  }
  return "";
}

function parseLegacyMarkdownState(markdown, domain) {
  return {
    domain: domainLabel(domain),
    type: "frame-map",
    kind: "frame-state",
    period: "current",
    status: "grounded",
    source_refs: { chapter: CHAPTER_REF },
    questions: {
      where_am_i_now: parseLegacySection(markdown, ["Where am I now?"]),
      how_did_i_get_here: parseLegacySection(markdown, ["How did I get here?"]),
      how_do_i_feel_about_where_i_am: parseLegacySection(markdown, ["How do I feel about where I am?", "How do I feel?"]),
      what_is_working_about_where_i_am_now: parseLegacySection(markdown, ["What is working about where I am now?", "What is working?"]),
      what_is_not_working_about_where_i_am: parseLegacySection(markdown, ["What is not working about where I am?", "What is not working?"]),
    },
  };
}

export function parseFrameStateContent(content) {
  try {
    const parsed = yaml.load(String(content || ""));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function frameDefaultState(domain, updated = todayISO()) {
  return {
    domain: domainLabel(domain),
    updated,
    period: "current",
    type: "frame-map",
    kind: "frame-state",
    status: "grounded",
    source_refs: { chapter: CHAPTER_REF },
    questions: {
      where_am_i_now: "",
      how_did_i_get_here: "",
      how_do_i_feel_about_where_i_am: "",
      what_is_working_about_where_i_am_now: "",
      what_is_not_working_about_where_i_am: "",
    },
  };
}

export function normalizeFrameState(raw, domain, updated = todayISO()) {
  const base = frameDefaultState(domain, updated);
  const src = raw && typeof raw === "object" ? raw : {};
  const questions = src.questions && typeof src.questions === "object" ? src.questions : {};
  const sourceRefs = src.source_refs && typeof src.source_refs === "object" ? src.source_refs : {};

  const normalizedUpdated = asString(src.updated).trim();
  const safeUpdated = /^\d{4}-\d{2}-\d{2}$/.test(normalizedUpdated) ? normalizedUpdated : updated;

  return {
    domain: domainLabel(domain),
    updated: safeUpdated,
    period: asString(src.period).trim() || base.period,
    type: "frame-map",
    kind: "frame-state",
    status: asString(src.status).trim() || base.status,
    source_refs: {
      chapter: asString(sourceRefs.chapter).trim() || CHAPTER_REF,
    },
    questions: {
      where_am_i_now: asString(questions.where_am_i_now).trim(),
      how_did_i_get_here: asString(questions.how_did_i_get_here).trim(),
      how_do_i_feel_about_where_i_am: asString(questions.how_do_i_feel_about_where_i_am).trim(),
      what_is_working_about_where_i_am_now: asString(questions.what_is_working_about_where_i_am_now).trim(),
      what_is_not_working_about_where_i_am: asString(questions.what_is_not_working_about_where_i_am).trim(),
    },
  };
}

export function frameStateToYaml(state) {
  return yaml.dump(state, { lineWidth: 120, sortKeys: false });
}

export function frameDefaultTemplate(domain) {
  return frameStateToYaml(frameDefaultState(domain));
}

function normalizeMultiline(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function frameEditorMarkdownFromState(state) {
  const safe = normalizeFrameState(state || {}, String(state?.domain || "").toLowerCase() || "body");
  const q = safe.questions || {};
  const sec = (title, value) => `## ${title}\n\n${value ? `${value}\n` : "- \n"}`;
  return [
    `# FRAME: ${safe.domain}`,
    "",
    sec("Where am I now?", normalizeMultiline(q.where_am_i_now)),
    "",
    sec("How did I get here?", normalizeMultiline(q.how_did_i_get_here)),
    "",
    sec("How do I feel about where I am?", normalizeMultiline(q.how_do_i_feel_about_where_i_am)),
    "",
    sec("What is working about where I am now?", normalizeMultiline(q.what_is_working_about_where_i_am_now)),
    "",
    sec("What is not working about where I am?", normalizeMultiline(q.what_is_not_working_about_where_i_am)),
  ].join("\n").trim() + "\n";
}

function extractQuestionsFromEditorMarkdown(markdown) {
  const text = String(markdown || "");
  const mapped = {
    where_am_i_now: parseLegacySection(text, ["Where am I now?"]),
    how_did_i_get_here: parseLegacySection(text, ["How did I get here?"]),
    how_do_i_feel_about_where_i_am: parseLegacySection(text, ["How do I feel about where I am?", "How do I feel?"]),
    what_is_working_about_where_i_am_now: parseLegacySection(text, ["What is working about where I am now?", "What is working?"]),
    what_is_not_working_about_where_i_am: parseLegacySection(text, ["What is not working about where I am?", "What is not working?"]),
  };
  const hasAnyStructured = Object.values(mapped).some((v) => String(v || "").trim().length > 0);
  if (!hasAnyStructured && String(text).trim()) {
    mapped.where_am_i_now = String(text).trim();
  }
  return mapped;
}

// ── Preview generator ─────────────────────────────────────────────────────────

export function framePreviewFromState(state) {
  const q = state && state.questions && typeof state.questions === "object" ? state.questions : {};
  const preview = asString(q.where_am_i_now).replace(/\s+/g, " ").trim();
  return preview.slice(0, 60);
}

function loadFrameState(domain, opts = {}) {
  const migrateLegacy = opts.migrateLegacy === true;
  const filePath = frameFilePath(domain);
  const legacyPath = frameLegacyFilePath(domain);

  if (fs.existsSync(filePath)) {
    const content = readText(filePath, "");
    const parsed = parseFrameStateContent(content);
    if (parsed) {
      const state = normalizeFrameState(parsed, domain);
      return { source: "yaml", filePath, content, state };
    }
  }

  if (fs.existsSync(legacyPath)) {
    const markdown = readText(legacyPath, "");
    const state = normalizeFrameState(parseLegacyMarkdownState(markdown, domain), domain);
    const content = frameStateToYaml(state);
    if (migrateLegacy) writeText(filePath, content);
    return { source: "legacy-md", filePath, content, state };
  }

  const state = frameDefaultState(domain);
  const content = frameStateToYaml(state);
  return { source: "default", filePath, content, state };
}

export function getFrameStateForDomain(domain, opts = {}) {
  const key = String(domain || "").trim().toLowerCase();
  if (!VALID_DOMAINS.includes(key)) return null;
  return loadFrameState(key, opts);
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/frame/domains
router.get("/domains", (req, res) => {
  try {
    ensureDir(FRAME_DIR);
    const domains = {};

    for (const domain of VALID_DOMAINS) {
      const loaded = loadFrameState(domain, { migrateLegacy: false });
      const hasContent = loaded.source !== "default";
      domains[domain] = {
        content: hasContent ? loaded.content : "",
        updated: hasContent ? loaded.state.updated : null,
        preview: hasContent ? framePreviewFromState(loaded.state) : "",
      };
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

    const loaded = loadFrameState(domain, { migrateLegacy: true });
    const state = loaded?.state || frameDefaultState(domain);
    const content = frameEditorMarkdownFromState(state);

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

    const loaded = loadFrameState(domain, { migrateLegacy: true });
    const base = loaded?.state || frameDefaultState(domain);

    // Backward-compat: allow direct YAML payloads, but prefer markdown editor input.
    const parsedYaml = parseFrameStateContent(content);
    const state = parsedYaml && parsedYaml.questions
      ? normalizeFrameState({ ...base, ...parsedYaml }, domain, todayISO())
      : normalizeFrameState(
          {
            ...base,
            questions: {
              ...base.questions,
              ...extractQuestionsFromEditorMarkdown(content),
            },
          },
          domain,
          todayISO()
        );
    writeText(frameFilePath(domain), frameStateToYaml(state));
    res.json({ ok: true, updated: state.updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
