import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

export const FLOW_PATH = path.join(os.homedir(), ".aos", "door-centre-state.json");
export const LEGACY_FLOW_PATH = path.join(os.homedir(), ".aos", "door-flow.json");
export const AOS_VAULT_DIR = process.env.AOS_VAULT_DIR || path.join(os.homedir(), "vault");
export const VAULT_DOOR_DIR = path.join(AOS_VAULT_DIR, "Door");
export const POTENTIAL_DIR = path.join(VAULT_DOOR_DIR, "1-Potential");
export const PLAN_DIR = path.join(VAULT_DOOR_DIR, "2-Plan");
export const PRODUCTION_DIR = path.join(VAULT_DOOR_DIR, "3-Production");
export const WARSTACKS_DIR = path.join(VAULT_DOOR_DIR, "War-Stacks");
export const PROFIT_DIR = path.join(VAULT_DOOR_DIR, "4-Profit");

export const DOOR_PHASE_CONFIG = {
  potential: {
    key: "potential",
    label: "Potential",
    folder: "1-Potential",
    primaryDir: POTENTIAL_DIR,
    readRoots: [{ id: "1-Potential", dir: POTENTIAL_DIR }],
  },
  plan: {
    key: "plan",
    label: "Plan",
    folder: "2-Plan",
    primaryDir: PLAN_DIR,
    readRoots: [
      { id: "2-Plan", dir: PLAN_DIR },
      { id: "War-Stacks", dir: WARSTACKS_DIR },
    ],
  },
  production: {
    key: "production",
    label: "Production",
    folder: "3-Production",
    primaryDir: PRODUCTION_DIR,
    readRoots: [{ id: "3-Production", dir: PRODUCTION_DIR }],
  },
  profit: {
    key: "profit",
    label: "Profit",
    folder: "4-Profit",
    primaryDir: PROFIT_DIR,
    readRoots: [{ id: "4-Profit", dir: PROFIT_DIR }],
  },
};

export const WARSTACK_STEPS = [
  {
    key: "trigger",
    question: "Was ist der Ausloeser?",
  },
  {
    key: "narrative",
    question: "Welche Story erzaehlst du dir?",
  },
  {
    key: "validation",
    question: "Was ist wirklich wahr?",
  },
  {
    key: "impact",
    question: "Was wird sich aendern?",
  },
];

export function baseFlow() {
  return {
    hotlist: [],
    doorwars: [],
    warstacks: [],
    hits: [],
    warstack_sessions: {},
  };
}

export function normalizeFlow(raw) {
  const flow = raw && typeof raw === "object" ? { ...raw } : {};
  flow.hotlist = Array.isArray(flow.hotlist) ? flow.hotlist : [];
  flow.doorwars = Array.isArray(flow.doorwars) ? flow.doorwars : [];
  flow.warstacks = Array.isArray(flow.warstacks) ? flow.warstacks : [];
  flow.hits = Array.isArray(flow.hits) ? flow.hits : [];
  flow.warstack_sessions =
    flow.warstack_sessions && typeof flow.warstack_sessions === "object" && !Array.isArray(flow.warstack_sessions)
      ? flow.warstack_sessions
      : {};
  return flow;
}

export function loadFlow() {
  try {
    return normalizeFlow(JSON.parse(fs.readFileSync(FLOW_PATH, "utf8")));
  } catch {
    try {
      // Backward compatibility: read legacy state file if new one is not there yet.
      return normalizeFlow(JSON.parse(fs.readFileSync(LEGACY_FLOW_PATH, "utf8")));
    } catch {
      return baseFlow();
    }
  }
}

export function saveFlow(data) {
  const dir = path.dirname(FLOW_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FLOW_PATH, JSON.stringify(normalizeFlow(data), null, 2) + "\n", "utf8");
}

export function respondOk(res, data, aliases = {}) {
  return res.json({ ok: true, data, ...aliases });
}

export function respondErr(res, status, error, extra = {}) {
  return res.status(status).json({ ok: false, error, ...extra });
}

export function nowIso() {
  return new Date().toISOString();
}

function isoWeekParts(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round(
    ((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
  return { year: d.getFullYear(), week };
}

export function weekKey(date = new Date()) {
  const { year, week } = isoWeekParts(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function dayKey(date = new Date()) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeFilename(input, fallback = "item") {
  const cleaned = String(input || "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-zA-Z0-9._ -]/g, " ")
    .trim()
    .replace(/\s+/g, "_");
  return cleaned || fallback;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function uniquePath(filePath) {
  if (!fs.existsSync(filePath)) return filePath;
  const ext = path.extname(filePath);
  const base = filePath.slice(0, -ext.length);
  let idx = 2;
  while (true) {
    const candidate = `${base}-${idx}${ext}`;
    if (!fs.existsSync(candidate)) return candidate;
    idx += 1;
  }
}

export function trimStr(value) {
  return String(value == null ? "" : value).trim();
}

export function getDoorPhaseConfig(phase) {
  const key = trimStr(phase).toLowerCase();
  return DOOR_PHASE_CONFIG[key] || null;
}

function normalizeRelativePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function ensureSafeRelativePath(relativePath) {
  const rel = normalizeRelativePath(relativePath);
  if (!rel) throw new Error("path_required");
  if (rel.includes("\0")) throw new Error("invalid_path");
  if (rel.split("/").some((part) => part === "..")) throw new Error("invalid_path");
  return rel;
}

function resolveInside(rootDir, relativePath) {
  const root = path.resolve(rootDir);
  const rel = ensureSafeRelativePath(relativePath);
  const target = path.resolve(root, rel);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error("path_outside_root");
  }
  return { root, rel, target };
}

function encodeFileKey(sourceId, relativePath) {
  const source = trimStr(sourceId);
  const rel = normalizeRelativePath(relativePath);
  return `${source}:${Buffer.from(rel, "utf8").toString("base64url")}`;
}

function decodeFileKey(key) {
  const raw = trimStr(key);
  const sep = raw.indexOf(":");
  if (sep <= 0) throw new Error("file_key_invalid");
  const sourceId = raw.slice(0, sep);
  const encoded = raw.slice(sep + 1);
  if (!encoded) throw new Error("file_key_invalid");
  const relativePath = Buffer.from(encoded, "base64url").toString("utf8");
  return {
    sourceId,
    relativePath: ensureSafeRelativePath(relativePath),
  };
}

function walkMarkdownFiles(rootDir, prefix = "") {
  if (!fs.existsSync(rootDir)) return [];
  const currentDir = prefix ? path.join(rootDir, prefix) : rootDir;
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const out = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const relativePath = prefix ? path.posix.join(prefix, entry.name) : entry.name;
    const fullPath = path.join(rootDir, relativePath);
    if (entry.isDirectory()) {
      out.push(...walkMarkdownFiles(rootDir, relativePath));
      continue;
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
    out.push({ relativePath: normalizeRelativePath(relativePath), fullPath });
  }

  return out;
}

function buildExcerpt(content) {
  const text = String(content || "")
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 180);
}

function buildPhaseFileMeta(sourceId, rootDir, relativePath, extra = {}) {
  const fullPath = path.join(rootDir, relativePath);
  const stat = fs.statSync(fullPath);
  let excerpt = "";
  if (extra.includeExcerpt) {
    try {
      excerpt = buildExcerpt(fs.readFileSync(fullPath, "utf8"));
    } catch {
      excerpt = "";
    }
  }
  return {
    key: encodeFileKey(sourceId, relativePath),
    source: sourceId,
    name: path.basename(relativePath),
    relative_path: normalizeRelativePath(relativePath),
    path: fullPath,
    mtime: stat.mtime.toISOString(),
    size: stat.size,
    excerpt,
  };
}

export function listPhaseFiles(phase) {
  const config = getDoorPhaseConfig(phase);
  if (!config) throw new Error("invalid_phase");

  const items = [];
  for (const root of config.readRoots) {
    if (!fs.existsSync(root.dir)) continue;
    for (const file of walkMarkdownFiles(root.dir)) {
      items.push(buildPhaseFileMeta(root.id, root.dir, file.relativePath, { includeExcerpt: true }));
    }
  }

  return items.sort((a, b) => (String(a.mtime) < String(b.mtime) ? 1 : -1));
}

function resolvePhaseFile(phase, key) {
  const config = getDoorPhaseConfig(phase);
  if (!config) throw new Error("invalid_phase");
  const decoded = decodeFileKey(key);
  const root = config.readRoots.find((entry) => entry.id === decoded.sourceId);
  if (!root) throw new Error("file_source_invalid");
  const resolved = resolveInside(root.dir, decoded.relativePath);
  if (!fs.existsSync(resolved.target) || !fs.statSync(resolved.target).isFile()) {
    throw new Error("file_not_found");
  }
  return {
    config,
    sourceId: root.id,
    rootDir: root.dir,
    relativePath: resolved.rel,
    fullPath: resolved.target,
  };
}

export function readPhaseFile(phase, key) {
  const file = resolvePhaseFile(phase, key);
  const meta = buildPhaseFileMeta(file.sourceId, file.rootDir, file.relativePath);
  const content = fs.readFileSync(file.fullPath, "utf8");
  return { ...meta, content };
}

function makePhaseFilename(phase, title, filename) {
  const phaseKey = trimStr(phase).toLowerCase() || "door";
  const raw = trimStr(filename) || trimStr(title);
  const base = raw ? safeFilename(raw, `${phaseKey}_${dayKey()}`) : `${phaseKey}_${dayKey()}`;
  return base.toLowerCase().endsWith(".md") ? base : `${base}.md`;
}

export function writePhaseFile({ phase, key, title, filename, content }) {
  const config = getDoorPhaseConfig(phase);
  if (!config) throw new Error("invalid_phase");

  const text = String(content || "");
  let sourceId = config.readRoots[0].id;
  let rootDir = config.primaryDir;
  let relativePath = makePhaseFilename(phase, title, filename);
  let target = "";

  if (trimStr(key)) {
    const existing = resolvePhaseFile(phase, key);
    sourceId = existing.sourceId;
    rootDir = existing.rootDir;
    relativePath = existing.relativePath;
    target = existing.fullPath;
  } else {
    ensureDir(config.primaryDir);
    target = uniquePath(path.join(config.primaryDir, relativePath));
    relativePath = normalizeRelativePath(path.relative(config.primaryDir, target));
  }

  ensureDir(path.dirname(target));
  fs.writeFileSync(target, text.endsWith("\n") ? text : `${text}\n`, "utf8");
  return buildPhaseFileMeta(sourceId, rootDir, relativePath, { includeExcerpt: true });
}

export function deletePhaseFile(phase, key) {
  const file = resolvePhaseFile(phase, key);
  const meta = buildPhaseFileMeta(file.sourceId, file.rootDir, file.relativePath);
  fs.unlinkSync(file.fullPath);
  return meta;
}

export function ensureHotlistShape(item) {
  const hotIndexRaw = item?.hot_index;
  const hotIndex =
    Number.isInteger(hotIndexRaw)
      ? hotIndexRaw
      : Number.isFinite(Number(hotIndexRaw))
        ? Number(hotIndexRaw)
        : null;
  return {
    id: trimStr(item?.id) || trimStr(item?.task_uuid) || trimStr(item?.tw_uuid) || (hotIndex ? `hot-${hotIndex}` : crypto.randomUUID()),
    title: trimStr(item?.title || item?.idea),
    description: trimStr(item.description),
    source: trimStr(item?.source),
    status: trimStr(item?.status || item?.task_status),
    phase: trimStr(item?.phase),
    created_at: trimStr(item?.created_at || item?.created) || nowIso(),
    quadrant: Number.isInteger(item.quadrant) ? item.quadrant : null,
    task_uuid: trimStr(item?.task_uuid || item?.tw_uuid),
    task_status: trimStr(item?.task_status),
    hot_index: hotIndex,
  };
}

export function evaluateEisenhower(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const urgencyWords = ["today", "morgen", "deadline", "urgent", "dring", "frist", "soon", "now"];
  const importanceWords = ["ausbildung", "business", "kunden", "client", "income", "strategy", "system", "project"];
  const urgency = urgencyWords.reduce((acc, word) => acc + (text.includes(word) ? 1 : 0), 0);
  const importance = 1 + importanceWords.reduce((acc, word) => acc + (text.includes(word) ? 1 : 0), 0);

  let quadrant = 2;
  if (urgency >= 2 && importance >= 2) quadrant = 1;
  else if (urgency < 2 && importance >= 2) quadrant = 2;
  else if (urgency >= 2 && importance < 2) quadrant = 3;
  else quadrant = 4;

  if (Number.isInteger(item.quadrant) && item.quadrant >= 1 && item.quadrant <= 4) {
    quadrant = item.quadrant;
  }

  return {
    quadrant,
    urgency_score: urgency,
    importance_score: importance,
    reasoning: `Q${quadrant} (urgency=${urgency}, importance=${importance})`,
  };
}

function ensureHitStatus(flow, hit, warstack) {
  const idx = flow.hits.findIndex((entry) => entry && entry.id === hit.id);
  const base = {
    id: hit.id,
    warstack_id: warstack.id,
    door_title: warstack.door_title,
    week: warstack.week || weekKey(new Date(warstack.created_at || Date.now())),
    done: Boolean(hit.done),
    created_at: trimStr(hit.created_at) || trimStr(warstack.created_at) || nowIso(),
    completed_at: hit.done ? trimStr(hit.completed_at) || nowIso() : null,
  };

  if (idx === -1) {
    flow.hits.push(base);
    return base;
  }

  const merged = {
    ...flow.hits[idx],
    ...base,
    done: flow.hits[idx].done != null ? Boolean(flow.hits[idx].done) : base.done,
    completed_at: flow.hits[idx].done
      ? trimStr(flow.hits[idx].completed_at) || base.completed_at || nowIso()
      : null,
  };
  flow.hits[idx] = merged;
  return merged;
}

export function syncHits(flow) {
  let changed = false;
  const hitsLenBefore = Array.isArray(flow.hits) ? flow.hits.length : 0;
  flow.warstacks = (flow.warstacks || []).map((warstack) => {
    const ws = { ...warstack };
    const hits = Array.isArray(ws.hits) ? ws.hits : [];
    ws.hits = hits.map((hit) => {
      const h = {
        id: trimStr(hit.id) || crypto.randomUUID(),
        fact: trimStr(hit.fact),
        obstacle: trimStr(hit.obstacle),
        strike: trimStr(hit.strike),
        responsibility: trimStr(hit.responsibility),
        created_at: trimStr(hit.created_at) || trimStr(ws.created_at) || nowIso(),
        done: Boolean(hit.done),
        completed_at: hit.done ? trimStr(hit.completed_at) || null : null,
      };
      const status = ensureHitStatus(flow, h, ws);
      if (h.done !== Boolean(status.done) || h.completed_at !== (status.completed_at || null)) {
        h.done = Boolean(status.done);
        h.completed_at = status.completed_at || null;
        changed = true;
      }
      if (!trimStr(hit.id)) changed = true;
      return h;
    });
    return ws;
  });
  if ((flow.hits || []).length !== hitsLenBefore) changed = true;
  return changed;
}

export function findWarstack(flow, id) {
  const ref = trimStr(id);
  if (!ref) return null;
  return (flow.warstacks || []).find((ws) => ws && (ws.id === ref || ws.session_id === ref)) || null;
}

export function buildWarStackHits(doorTitle, inquiry) {
  const validation = trimStr(inquiry.validation) || "Noch nicht klar";
  const trigger = trimStr(inquiry.trigger) || "Unklar";
  const narrative = trimStr(inquiry.narrative) || "Unklar";
  const impact = trimStr(inquiry.impact) || "Momentum";
  const facts = [
    `Definition of done fuer ${doorTitle}`,
    `Erster konkreter Deliverable fuer ${doorTitle}`,
    `Blocker entfernen fuer ${doorTitle}`,
    `Woechentliche Review fuer ${doorTitle}`,
  ];

  return facts.map((fact, index) => ({
    id: crypto.randomUUID(),
    fact,
    obstacle:
      index === 0 ? `Unklare Kriterien (${narrative.slice(0, 80) || "Narrative fehlt"})`
        : index === 1 ? `Zu viele Parallelthemen (${trigger.slice(0, 80) || "Trigger unklar"})`
        : index === 2 ? `Annahme statt Fakten (${validation.slice(0, 80) || "Validation fehlt"})`
        : `Kein Review-Rhythmus (${impact.slice(0, 80) || "Impact unklar"})`,
    strike:
      index === 0 ? "10 Minuten Scope schreiben und DoD festlegen"
        : index === 1 ? "90-Minuten Fokusblock im Kalender fixieren"
        : index === 2 ? "Eine verifizierbare Aktion heute abschliessen"
        : "Wochenreview terminieren und Ergebnisse dokumentieren",
    responsibility: `Ich uebernehme Verantwortung fuer Hit ${index + 1} bei ${doorTitle}.`,
    done: false,
    completed_at: null,
    created_at: nowIso(),
  }));
}

function renderWarStackMarkdown(warstack) {
  const d = new Date(warstack.created_at || Date.now());
  const createdDate = Number.isNaN(d.getTime()) ? dayKey() : dayKey(d);
  const week = warstack.week || weekKey(d);
  const inquiry = warstack.inquiry || {};
  const hits = Array.isArray(warstack.hits) ? warstack.hits : [];

  const hitSections = hits.map((hit, idx) => {
    return [
      `### Hit ${idx + 1}`,
      `- **Fact:** ${trimStr(hit.fact) || "-"}`,
      `- **Obstacle:** ${trimStr(hit.obstacle) || "-"}`,
      `- **Strike:** ${trimStr(hit.strike) || "-"}`,
      `- **Responsibility:** ${trimStr(hit.responsibility) || "-"}`,
      "",
    ].join("\n");
  }).join("\n");

  return [
    `# War Stack: ${warstack.door_title || "Untitled Door"}`,
    "",
    `**Week:** ${week}`,
    `**Created:** ${createdDate}`,
    `**ID:** ${warstack.id}`,
    "",
    "## Reflexive Inquiry",
    "",
    "**Trigger:** Was hat dich hierher gebracht?",
    `> ${trimStr(inquiry.trigger) || "-"}`,
    "",
    "**Narrative:** Welche Geschichte erzaehlst du dir?",
    `> ${trimStr(inquiry.narrative) || "-"}`,
    "",
    "**Validation:** Was ist wirklich wahr?",
    `> ${trimStr(inquiry.validation) || "-"}`,
    "",
    "**Impact:** Was wird sich aendern wenn du das durchziehst?",
    `> ${trimStr(inquiry.impact) || "-"}`,
    "",
    "---",
    "",
    "## 4 Hits (Fact / Obstacle / Strike / Responsibility)",
    "",
    hitSections.trimEnd(),
    "",
  ].join("\n");
}

export function writeWarStackMarkdown(warstack) {
  const slug = String(warstack.door_title || `warstack-${warstack.id}`)
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `warstack-${warstack.id}`;
  ensureDir(WARSTACKS_DIR);
  const target = uniquePath(path.join(WARSTACKS_DIR, `STACK_${slug}.md`));
  fs.writeFileSync(target, renderWarStackMarkdown(warstack), "utf8");
  return target;
}

function renderReflectionMarkdown(payload) {
  const dateStr = trimStr(payload.date) || dayKey();
  const createdAt = nowIso();
  const doorTitle = trimStr(payload.door_title || payload.title) || "Untitled Door";
  const warstackId = trimStr(payload.warstack_id);
  const reflection = trimStr(payload.reflection || payload.text || payload.body);
  const wins = Array.isArray(payload.wins) ? payload.wins.map(trimStr).filter(Boolean) : [];
  const lessons = Array.isArray(payload.lessons) ? payload.lessons.map(trimStr).filter(Boolean) : [];
  const next = Array.isArray(payload.next) ? payload.next.map(trimStr).filter(Boolean) : [];

  const lines = [
    `# Profit Reflection: ${doorTitle}`,
    "",
    `**Date:** ${dateStr}`,
    `**Created:** ${createdAt}`,
  ];
  if (warstackId) lines.push(`**War Stack ID:** ${warstackId}`);
  lines.push("");
  lines.push("## Reflection");
  lines.push("");
  lines.push(reflection || "-");
  lines.push("");

  if (wins.length) {
    lines.push("## Wins", "");
    wins.forEach((entry) => lines.push(`- ${entry}`));
    lines.push("");
  }
  if (lessons.length) {
    lines.push("## Lessons", "");
    lessons.forEach((entry) => lines.push(`- ${entry}`));
    lines.push("");
  }
  if (next.length) {
    lines.push("## Next", "");
    next.forEach((entry) => lines.push(`- ${entry}`));
    lines.push("");
  }

  return lines.join("\n");
}

export function writeReflectionMarkdown(payload) {
  ensureDir(PROFIT_DIR);
  const dateStr = trimStr(payload.date) || dayKey();
  const doorPart = trimStr(payload.door_title || payload.title);
  const fileName = doorPart ? `${safeFilename(dateStr)}_${safeFilename(doorPart)}.md` : `${safeFilename(dateStr)}.md`;
  const target = uniquePath(path.join(PROFIT_DIR, fileName));
  fs.writeFileSync(target, renderReflectionMarkdown(payload), "utf8");
  return target;
}

export function listMarkdownFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => {
        const full = path.join(dirPath, entry.name);
        const st = fs.statSync(full);
        return {
          name: entry.name,
          path: full,
          mtime: st.mtime.toISOString(),
          size: st.size,
        };
      })
      .sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
  } catch {
    return [];
  }
}
