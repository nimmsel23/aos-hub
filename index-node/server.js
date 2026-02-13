import express from "express";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import crypto from "crypto";
import yaml from "js-yaml";
import { WebSocketServer } from "ws";
import * as pty from "node-pty";
import { execFile, execFileSync } from "child_process";

// Routers
import gameRouter from "./routes/game.js";

const app = express();

app.use(express.json({ limit: "1mb" }));


const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8799);
const TERMINAL_ENABLED = process.env.TERMINAL_ENABLED !== "0";
const TERMINAL_ALLOW_REMOTE = process.env.TERMINAL_ALLOW_REMOTE === "1";
const UI_BASIC_AUTH_ENABLED = process.env.AOS_UI_BASIC_AUTH === "1";
const UI_BASIC_AUTH_USER = String(process.env.AOS_UI_BASIC_USER || "").trim();
const UI_BASIC_AUTH_PASS = String(process.env.AOS_UI_BASIC_PASS || "");
const UI_BASIC_AUTH_REALM =
  String(process.env.AOS_UI_BASIC_REALM || "AlphaOS Hub")
    .replace(/"/g, "")
    .trim() || "AlphaOS Hub";
const UI_BASIC_AUTH_PROTECT_API = process.env.AOS_UI_BASIC_AUTH_PROTECT_API === "1";
const UI_BASIC_AUTH_READY =
  UI_BASIC_AUTH_ENABLED && UI_BASIC_AUTH_USER.length > 0 && UI_BASIC_AUTH_PASS.length > 0;

if (UI_BASIC_AUTH_ENABLED && !UI_BASIC_AUTH_READY) {
  console.warn(
    "[index-node] AOS_UI_BASIC_AUTH=1 but credentials are missing. Protected routes will return 503."
  );
}

function needsUiBasicAuth(pathname) {
  const p = String(pathname || "/");
  if (p === "/health") return false;
  if (!UI_BASIC_AUTH_PROTECT_API && p.startsWith("/api/")) return false;
  return true;
}

function timingSafeEqualStr(left, right) {
  const a = Buffer.from(String(left || ""), "utf8");
  const b = Buffer.from(String(right || ""), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function parseBasicAuth(header) {
  const raw = String(header || "");
  if (!raw.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(raw.slice(6), "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx < 0) return null;
    return {
      user: decoded.slice(0, idx),
      pass: decoded.slice(idx + 1),
    };
  } catch (_) {
    return null;
  }
}

function sendBasicAuthChallenge(res) {
  res.setHeader("WWW-Authenticate", `Basic realm="${UI_BASIC_AUTH_REALM}", charset="UTF-8"`);
  return res.status(401).send("Authentication required");
}

function uiBasicAuthMiddleware(req, res, next) {
  if (!UI_BASIC_AUTH_ENABLED || !needsUiBasicAuth(req.path)) return next();
  if (!UI_BASIC_AUTH_READY) {
    return res.status(503).send("Basic auth is enabled but not configured.");
  }
  const creds = parseBasicAuth(req.headers.authorization);
  if (!creds) return sendBasicAuthChallenge(res);
  const userOk = timingSafeEqualStr(creds.user, UI_BASIC_AUTH_USER);
  const passOk = timingSafeEqualStr(creds.pass, UI_BASIC_AUTH_PASS);
  if (!userOk || !passOk) return sendBasicAuthChallenge(res);
  return next();
}

app.use(uiBasicAuthMiddleware);

app.use(express.static("public", { extensions: ["html"] }));
app.use("/vendor/xterm", express.static("node_modules/xterm"));
app.use("/vendor/marked", express.static("node_modules/marked"));


const MENU_PATH = process.env.MENU_YAML || "./menu.yaml";
const TICK_ENV_PATH =
  process.env.TICK_ENV || path.join(os.homedir(), ".alpha_os", "tick.env");
const TASK_EXPORT_PATH =
  process.env.TASK_EXPORT ||
  path.join(os.homedir(), ".local", "share", "alphaos", "task_export.json");
const TASK_BIN = process.env.TASK_BIN || "task";
const TASKRC = process.env.TASKRC || "";
const TASK_CACHE_TTL = Number(process.env.TASK_CACHE_TTL || 30);
const TASK_EXPORT_FILTER = String(process.env.TASK_EXPORT_FILTER || "").trim();
const CORE4_TW_SYNC = process.env.CORE4_TW_SYNC !== "0";
const CORE4_JOURNAL_DIR =
  process.env.CORE4_JOURNAL_DIR ||
  path.join(getVaultDir(), "Alpha_Journal", "Entries");
const CORE4_STORAGE_DIR_ENV = String(process.env.CORE4_STORAGE_DIR || "").trim();
const CORE4_STORAGE_FALLBACK_DIR = String(
  process.env.CORE4_STORAGE_FALLBACK_DIR ||
  path.join(os.homedir(), ".local", "share", "alphaos", "core4")
).trim();
const BRIDGE_TOKEN = String(process.env.AOS_BRIDGE_TOKEN || "").trim();
const BRIDGE_TOKEN_HEADER = String(process.env.AOS_BRIDGE_TOKEN_HEADER || "X-Bridge-Token").trim();
const SYNC_TAGS = String(process.env.SYNC_TAGS || "door,hit,strike,core4,fire")
  .split(",")
  .map((tag) => tag.trim())
  .filter(Boolean);
const SYNC_MAP_PATH =
  process.env.SYNC_MAP ||
  path.join(os.homedir(), ".local", "share", "alphaos", "task_sync_map.json");
const RCLONE_RC_URL = process.env.RCLONE_RC_URL || "http://127.0.0.1:5572";
const RCLONE_TARGET =
  process.env.RCLONE_TARGET || "fabian:AlphaOS-Vault";
const RCLONE_FLAGS = String(
  process.env.RCLONE_FLAGS || "--update --skip-links --create-empty-src-dirs"
)
  .split(" ")
  .map((flag) => flag.trim())
  .filter(Boolean);
const RCLONE_BACKUP_TARGET =
  process.env.RCLONE_BACKUP_TARGET ||
  (RCLONE_TARGET ? `${RCLONE_TARGET}-backups` : "");
// Bridge integration: Core4 "truth" lives in the Core4 event ledger. index-node uses Bridge as the
// local API surface to fetch totals/state and to forward log requests.
//
// Important: `AOS_BRIDGE_URL` must be present in the *running service environment* (systemd),
// otherwise `/api/core4/today` can't populate `bridge_total` and the UI will look "stuck at 0".
const BRIDGE_URL = (process.env.AOS_BRIDGE_URL || process.env.BRIDGE_URL || "").replace(/\/$/, "");
const BRIDGE_TIMEOUT_MS = Number(process.env.BRIDGE_TIMEOUT_MS || 2500);
const FRUITS_MAP_TITLE = "Fruit Fact Maps";
const FRUITS_MAP_SUBTITLE = "Facing the Fruits of Reality - Raw Facts";
const FRUITS_QUESTIONS_PATH =
  process.env.FRUITS_QUESTIONS || path.resolve("data", "fruits_questions.json");
const FRUITS_DIR =
  process.env.FRUITS_DIR ||
  path.join(os.homedir(), "AlphaOS-Vault", "Game", "Fruits");
const FRUITS_STORE_PATH =
  process.env.FRUITS_STORE || path.join(FRUITS_DIR, "fruits_store.json");
const FRUITS_EXPORT_DIR =
  process.env.FRUITS_EXPORT_DIR || FRUITS_DIR;
const FRUIT_EMOJIS = ["🍎", "🍌", "🍇", "🍉", "🍓", "🍒", "🍍", "🥝", "🍊", "🍏"];
let FRUITS_QUESTIONS_CACHE = null;
const DOOR_FLOW_PATH =
  process.env.DOOR_FLOW_PATH || path.join(getDoorVaultDir(), ".door-flow.json");
const DOOR_HITS_TICKTICK = process.env.DOOR_HITS_TICKTICK === "1";
const DOOR_HITS_TAGS = String(
  process.env.DOOR_HITS_TAGS || "door,hit,production"
)
  .split(",")
  .map((tag) => tag.trim())
  .filter(Boolean);
const FIRE_GCAL_EMBED_URL = process.env.FIRE_GCAL_EMBED_URL || "";
const FIRE_INCLUDE_UNDATED = String(process.env.FIRE_INCLUDE_UNDATED || "1").trim() !== "0";
const FIRE_TASK_TAGS_MODE = String(
  process.env.FIRE_TASK_TAGS_MODE || (process.env.FIRE_TASK_TAGS_ALL ? "all" : "any")
)
  .trim()
  .toLowerCase();
const FIRE_TASK_TAGS = String(
  process.env.FIRE_TASK_TAGS || process.env.FIRE_TASK_TAGS_ALL || "production,hit,fire"
)
  .split(",")
  .map((tag) => tag.trim().toLowerCase())
  .filter(Boolean);
const FIRE_TASK_DATE_FIELDS = String(process.env.FIRE_TASK_DATE_FIELDS || "scheduled,due,wait")
  .split(",")
  .map((field) => field.trim())
  .filter(Boolean);

let TASK_CACHE = { ts: 0, tasks: [], error: null };
let CORE4_STORAGE_DIR_CACHE = "";


function safeSlug(s) {
  return String(s || "")
  .trim()
  .toLowerCase()
  .replace(/^\//, "")
  .replace(/['"]/g, "")
  .replace(/\s+/g, "-")
  .replace(/[^a-z0-9_-]/g, "");
}


function loadMenu() {
  const doc = yaml.load(fs.readFileSync(MENU_PATH, "utf8"));
  const links = Array.isArray(doc?.links) ? doc.links : [];


  return links
  .map((x) => ({
    label: String(x?.label || "").trim(),
               url: String(x?.url || "").trim(),
               cmd: safeSlug(x?.cmd || ""),
  }))
  .filter((x) => x.label && x.url);
}


function buildCentresPayload() {
  const links = loadMenu();
  const st = fs.statSync(MENU_PATH);


  const centres = links
  .map((x) => ({
    cmd: x.cmd || safeSlug(x.label),
               label: x.label,
               url: x.url,
  }))
  .filter((c) => c.cmd && c.label && c.url);


  return {
    updated_at: new Date(st.mtimeMs).toISOString(),
    centres,
  };
}

function findCentreBySlug(slugOrCmd) {
  const safe = safeSlug(slugOrCmd || "");
  const links = loadMenu();
  for (const link of links) {
    if (safeSlug(link.cmd || link.label) === safe) {
      return link;
    }
    if (safeSlug(link.label || "") === safe) {
      return link;
    }
  }
  return null;
}

function getGeneralsDir() {
  return path.join(os.homedir(), "AlphaOS-Vault", "Game", "Tent");
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function loadFruitsQuestions() {
  if (FRUITS_QUESTIONS_CACHE) return FRUITS_QUESTIONS_CACHE;
  try {
    const raw = fs.readFileSync(FRUITS_QUESTIONS_PATH, "utf8");
    FRUITS_QUESTIONS_CACHE = JSON.parse(raw);
  } catch (err) {
    FRUITS_QUESTIONS_CACHE = {};
  }
  return FRUITS_QUESTIONS_CACHE;
}

function defaultFruitsStore() {
  return {
    answers: {},
    users: {},
    skipped: null,
    updated_at: "",
  };
}

function normalizeFruitsStore(raw) {
  const base = defaultFruitsStore();
  if (!raw || typeof raw !== "object") return base;
  base.answers = raw.answers && typeof raw.answers === "object" ? raw.answers : {};
  base.users = raw.users && typeof raw.users === "object" ? raw.users : {};
  base.skipped = raw.skipped && typeof raw.skipped === "object" ? raw.skipped : null;
  base.updated_at = String(raw.updated_at || "");
  return base;
}

function loadFruitsStore() {
  ensureDir(FRUITS_DIR);
  if (!fs.existsSync(FRUITS_STORE_PATH)) return defaultFruitsStore();
  try {
    const raw = fs.readFileSync(FRUITS_STORE_PATH, "utf8");
    return normalizeFruitsStore(JSON.parse(raw));
  } catch (_) {
    return defaultFruitsStore();
  }
}

function saveFruitsStore(store) {
  ensureDir(FRUITS_DIR);
  const payload = {
    ...store,
    updated_at: new Date().toISOString(),
  };
  const tempPath = FRUITS_STORE_PATH + ".tmp";
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(tempPath, FRUITS_STORE_PATH);
  return payload;
}

function getFruitsAnswerValue(entry) {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  if (typeof entry.answer === "string") return entry.answer;
  return "";
}

function flattenFruitsAnswers(store) {
  const out = {};
  Object.entries(store.answers || {}).forEach(([question, entry]) => {
    out[question] = getFruitsAnswerValue(entry);
  });
  return out;
}

function findFruitsSection(question) {
  const qs = loadFruitsQuestions();
  for (const [section, list] of Object.entries(qs)) {
    if (!Array.isArray(list)) continue;
    if (list.includes(question)) return section;
  }
  return "";
}

function hasPendingFruitsSkip(store) {
  if (store.skipped && store.skipped.question) return true;
  const answers = store.answers || {};
  return Object.values(answers).some((entry) => getFruitsAnswerValue(entry) === "_geskippt_");
}

function firstUnansweredFruit(store) {
  const answers = flattenFruitsAnswers(store);
  const qs = loadFruitsQuestions();
  for (const [section, list] of Object.entries(qs)) {
    if (!Array.isArray(list)) continue;
    for (const q of list) {
      if (!answers[q]) return { section, question: q };
    }
  }
  return null;
}

function updateFruitsUser(store, chatId, userName) {
  if (!chatId) return;
  const id = String(chatId);
  const existing = store.users[id] || {};
  store.users[id] = {
    chat_id: id,
    user_name: userName || existing.user_name || "User",
    status: "active",
    started_at: existing.started_at || new Date().toISOString(),
    last_section: existing.last_section || "",
    last_question: existing.last_question || "",
  };
}

function setFruitsLastQuestion(store, chatId, section, question) {
  if (!chatId) return;
  const id = String(chatId);
  const existing = store.users[id] || { chat_id: id, status: "active" };
  store.users[id] = {
    ...existing,
    last_section: section || "",
    last_question: question || "",
  };
}

function getFruitsLastQuestion(store, chatId) {
  if (!chatId) return { section: "", question: "" };
  const user = store.users[String(chatId)] || {};
  return { section: user.last_section || "", question: user.last_question || "" };
}

function queueVaultSync() {
  if (!RCLONE_TARGET) return { ok: false, status: "disabled" };
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+/, "")
    .replace("T", "-");
  const backupDir = RCLONE_BACKUP_TARGET
    ? `${RCLONE_BACKUP_TARGET}/push-${stamp}`
    : "";
  const args = ["copy", ...RCLONE_FLAGS];
  if (backupDir) args.push("--backup-dir", backupDir);
  args.push(getVaultDir(), RCLONE_TARGET);
  Promise.resolve()
    .then(() => execFileAsync("rclone", args))
    .then(() =>
      console.log("[rclone] vault copy ok →", RCLONE_TARGET)
    )
    .catch((err) =>
      console.error("[rclone] vault copy failed:", err?.message || err)
    );
  return {
    ok: true,
    status: "queued",
    target: RCLONE_TARGET,
    backup: backupDir || null,
  };
}

function parseEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf8");
    const out = {};
    raw.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!key) return;
      out[key] = val.replace(/^['"]|['"]$/g, "");
    });
    return out;
  } catch (_) {
    return {};
  }
}

function execFileAsync(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, opts, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

function getTickConfig() {
  const env = parseEnvFile(TICK_ENV_PATH);
  const token = env.TICKTICK_TOKEN || env.TICKTICK_API_TOKEN || "";
  const projectId = env.TICKTICK_PROJECT_ID || env.TICKTICK_PROJECT || "";
  return { token, projectId };
}

async function ticktickCreateTask({ title, content, tags, projectId }) {
  const { token, projectId: envProject } = getTickConfig();
  if (!token) {
    throw new Error("ticktick-token-missing");
  }

  const payload = {
    title: String(title || "AlphaOS Game"),
    content: String(content || ""),
    tags: Array.isArray(tags) && tags.length ? tags : ["game"],
  };

  const pid = projectId || envProject;
  if (pid) payload.projectId = pid;

  const res = await fetch("https://api.ticktick.com/open/v1/task", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ticktick-error-${res.status}:${text}`);
  }

  return res.json();
}

async function ticktickListProjectTasks() {
  const { token, projectId } = getTickConfig();
  if (!token) {
    throw new Error("ticktick-token-missing");
  }
  if (!projectId) {
    throw new Error("ticktick-project-missing");
  }

  const res = await fetch(
    `https://api.ticktick.com/open/v1/project/${encodeURIComponent(projectId)}/tasks`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ticktick-error-${res.status}:${text}`);
  }

  return res.json();
}

function getWeekRangeLocal(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const week = isoWeekString(start);
  const rangeLabel = `${start.toLocaleDateString("de-DE")} – ${new Date(end.getTime() - 1).toLocaleDateString("de-DE")}`;
  return { start, end, week, rangeLabel };
}

function parseTickTickDue(task) {
  if (!task) return null;
  const raw = task.dueDateTime || task.dueDate || task.due;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function taskInRange(task, start, end) {
  const due = parseTickTickDue(task);
  if (!due) return false;
  return due >= start && due < end;
}

function getDayRangeLocal(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = new Date(d);
  const end = new Date(d);
  end.setDate(start.getDate() + 1);
  return { start, end, label: start.toLocaleDateString("de-DE") };
}

function parseTaskwarriorDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const match = text.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

function fireTaskHasAllTags(taskTags, required) {
  if (!required.length) return true;
  const tags = (taskTags || []).map((t) => String(t || "").toLowerCase());
  return required.every((tag) => tags.includes(tag));
}

function fireTaskHasAnyTag(taskTags, required) {
  if (!required.length) return true;
  const tags = (taskTags || []).map((t) => String(t || "").toLowerCase());
  return required.some((tag) => tags.includes(tag));
}

function fireTaskMatchesTags(taskTags, required) {
  if (!required.length) return true;
  if (FIRE_TASK_TAGS_MODE === "all") return fireTaskHasAllTags(taskTags, required);
  return fireTaskHasAnyTag(taskTags, required);
}

function fireTaskDateCandidates(task) {
  const dates = [];
  FIRE_TASK_DATE_FIELDS.forEach((field) => {
    const value = parseTaskwarriorDate(task[field]);
    if (value) dates.push(value);
  });
  return dates;
}

function fireTaskPrimaryDate(task) {
  const dates = fireTaskDateCandidates(task);
  if (!dates.length) return null;
  return new Date(Math.min(...dates.map((d) => d.getTime())));
}

function fireTaskInRange(task, start, end, includeOverdue) {
  const date = fireTaskPrimaryDate(task);
  if (!date) return false;
  if (includeOverdue && date < start) return true;
  return date >= start && date < end;
}

function detectFireDomain(task) {
  const tags = (task.tags || []).map((t) => String(t || "").toLowerCase());
  const project = String(task.project || "").toLowerCase();
  const haystack = `${project} ${tags.join(" ")}`;
  if (/\bbody\b/.test(haystack)) return "body";
  if (/\bbeing\b/.test(haystack)) return "being";
  if (/\bbalance\b/.test(haystack)) return "balance";
  if (/\bbusiness\b/.test(haystack)) return "business";
  return "other";
}

function detectDomainFromTags(tags) {
  const tagStr = (tags || []).map((t) => String(t || "").toLowerCase()).join(" ");
  if (/\bbody\b/.test(tagStr)) return "body";
  if (/\bbeing\b/.test(tagStr)) return "being";
  if (/\bbalance\b/.test(tagStr)) return "balance";
  if (/\bbusiness\b/.test(tagStr)) return "business";
  return "other";
}

function normalizeFireTask(task, referenceDate) {
  const date = fireTaskPrimaryDate(task);
  return {
    id: task.id || task.uuid,
    title: task.description || "(ohne Titel)",
    tags: task.tags || [],
    project: task.project || "",
    due: task.due || "",
    scheduled: task.scheduled || "",
    date: date ? date.toISOString() : "",
    domain: detectFireDomain(task),
    overdue: date ? date < referenceDate : false,
  };
}

function isoWeekString(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function sanitizeWeek(week) {
  const raw = String(week || "").trim();
  return /^\d{4}-W\d{2}$/.test(raw) ? raw : isoWeekString();
}

function getVaultDir() {
  return path.join(os.homedir(), "AlphaOS-Vault");
}

function getDoorVaultDir() {
  return path.join(getVaultDir(), "Door");
}

function getGameVaultDir() {
  return path.join(getVaultDir(), "Game");
}

function getDomainStatesDir() {
  return path.join(getVaultDir(), ".states");
}

// ============================================================================
// DOMAIN-STATE SYSTEM
// ============================================================================
// Strategic state tracking for each domain (BODY/BEING/BALANCE/BUSINESS)
// across all centres (Frame/Freedom/Focus/Fire).
//
// Purpose: Enable cross-domain synthesis, temporal cascade analysis,
// and pipeline flow diagnosis for General's Tent strategic intelligence.
//
// Storage: ~/AlphaOS-Vault/.states/{domain}.json
// Schema: domain-state-schema.json
// ============================================================================

const DOMAINS = ["BODY", "BEING", "BALANCE", "BUSINESS"];

/**
 * Load domain state JSON for a single domain
 * @param {string} domain - Domain name (BODY/BEING/BALANCE/BUSINESS)
 * @returns {object|null} Domain state object or null if not found
 */
function loadDomainState(domain) {
  const domainUpper = String(domain || "").toUpperCase();
  if (!DOMAINS.includes(domainUpper)) {
    console.error(`[loadDomainState] Invalid domain: ${domain}`);
    return null;
  }

  const statesDir = getDomainStatesDir();
  const statePath = path.join(statesDir, `${domainUpper}.json`);

  try {
    if (!fs.existsSync(statePath)) {
      console.warn(`[loadDomainState] State not found: ${statePath}`);
      return null;
    }

    const raw = fs.readFileSync(statePath, "utf8");
    const state = JSON.parse(raw);

    // Validate domain matches filename
    if (state.domain !== domainUpper) {
      console.error(
        `[loadDomainState] Domain mismatch in ${statePath}: expected ${domainUpper}, got ${state.domain}`
      );
      return null;
    }

    return state;
  } catch (err) {
    console.error(`[loadDomainState] Error loading ${statePath}:`, err);
    return null;
  }
}

/**
 * Save domain state JSON for a single domain
 * @param {string} domain - Domain name
 * @param {object} state - Domain state object (must match schema)
 * @returns {boolean} Success status
 */
function saveDomainState(domain, state) {
  const domainUpper = String(domain || "").toUpperCase();
  if (!DOMAINS.includes(domainUpper)) {
    console.error(`[saveDomainState] Invalid domain: ${domain}`);
    return false;
  }

  const statesDir = getDomainStatesDir();
  const statePath = path.join(statesDir, `${domainUpper}.json`);

  try {
    // Ensure .states directory exists
    if (!fs.existsSync(statesDir)) {
      fs.mkdirSync(statesDir, { recursive: true });
      console.log(`[saveDomainState] Created states dir: ${statesDir}`);
    }

    // Ensure domain field matches
    state.domain = domainUpper;
    state.updated_at = new Date().toISOString();

    // Write with pretty formatting for human readability
    const json = JSON.stringify(state, null, 2);
    fs.writeFileSync(statePath, json, "utf8");

    console.log(`[saveDomainState] Saved ${domainUpper} state: ${statePath}`);
    return true;
  } catch (err) {
    console.error(`[saveDomainState] Error saving ${statePath}:`, err);
    return false;
  }
}

/**
 * Update domain state with partial updates (deep merge)
 * @param {string} domain - Domain name
 * @param {object} updates - Partial state updates
 * @returns {boolean} Success status
 */
function updateDomainState(domain, updates) {
  const current = loadDomainState(domain);
  if (!current) {
    console.error(`[updateDomainState] Cannot update non-existent state for ${domain}`);
    return false;
  }

  // Deep merge updates into current state
  const merged = deepMerge(current, updates);
  return saveDomainState(domain, merged);
}

/**
 * Load all domain states (BODY, BEING, BALANCE, BUSINESS)
 * @returns {object} Object with domain names as keys, states as values
 */
function getAllDomainStates() {
  const states = {};
  for (const domain of DOMAINS) {
    const state = loadDomainState(domain);
    if (state) {
      states[domain] = state;
    }
  }
  return states;
}

/**
 * Deep merge two objects (for state updates)
 * @param {object} target - Target object
 * @param {object} source - Source object to merge
 * @returns {object} Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Generate initial domain state from existing vault data
 * Scans for Frame/Freedom/Focus/Fire maps, War Stacks, VOICE sessions, Core4 data
 * @param {string} domain - Domain name
 * @returns {object} Initial domain state object
 */
function generateInitialDomainState(domain) {
  const domainUpper = String(domain || "").toUpperCase();
  if (!DOMAINS.includes(domainUpper)) {
    throw new Error(`Invalid domain: ${domain}`);
  }

  const domainLower = domainUpper.toLowerCase();
  const gameDir = getGameVaultDir();
  const doorDir = getDoorVaultDir();
  const voiceDir = getVoiceVaultDir();
  const week = isoWeekString();

  console.log(`[generateInitialDomainState] Generating state for ${domainUpper}...`);

  const state = {
    domain: domainUpper,
    version: "1.0.0",
    updated_at: new Date().toISOString(),
    week,

    // Frame Map (yearly)
    frame: scanForMap(gameDir, "Frame", domainLower) || {
      file: `Game/Frame/${domainUpper}_frame.md`,
      status: "unknown",
      last_shift: null,
      updated_at: null,
    },

    // Freedom Map (10-year IPW)
    freedom: scanForMap(gameDir, "Freedom", domainLower) || {
      file: `Game/Freedom/${domainUpper}_freedom.md`,
      ipw: "unknown",
      alignment: "unknown",
      updated_at: null,
    },

    // Focus Map (monthly/quarterly)
    focus: scanForMap(gameDir, "Focus", domainLower) || {
      file: `Game/Focus/${domainUpper}_focus.md`,
      mission: "unknown",
      quarter: getCurrentQuarter(),
      serves_freedom: null,
      updated_at: null,
    },

    // Fire Map (weekly)
    fire: scanForFireMap(gameDir, domainLower, week) || {
      week,
      hits: [],
      completion: 0,
      serves_focus: null,
      updated_at: null,
    },

    // VOICE sessions
    voice: scanForVoiceSessions(voiceDir, domainLower) || {
      latest_session: null,
      latest_strike: null,
      session_count: 0,
      integrated: false,
      updated_at: null,
    },

    // War Stacks
    war_stacks: scanForWarStacks(doorDir, domainLower) || [],

    // Core4 metrics
    core4: scanForCore4Metrics(domainLower, week) || {
      week_total: 0,
      daily_streak: 0,
      trend: "unknown",
    },

    // Synthesis (empty initially, computed by synthesis engines)
    synthesis: {
      patterns: [],
      blockers: [],
      cascade_health: {
        fire_to_focus: "unknown",
        focus_to_freedom: "unknown",
        freedom_to_frame: "unknown",
      },
      pipeline_health: {
        voice_to_door: 0,
        door_to_fire: 0,
      },
    },
  };

  console.log(`[generateInitialDomainState] Generated state for ${domainUpper}`);
  return state;
}

/**
 * Scan for Frame/Freedom/Focus map files
 * @param {string} gameDir - Game vault directory
 * @param {string} mapType - Map type (Frame/Freedom/Focus)
 * @param {string} domain - Domain (lowercase)
 * @returns {object|null} Map metadata or null
 */
function scanForMap(gameDir, mapType, domain) {
  const mapDir = path.join(gameDir, mapType);
  if (!fs.existsSync(mapDir)) {
    console.warn(`[scanForMap] Directory not found: ${mapDir}`);
    return null;
  }

  // Look for {DOMAIN}_{maptype}.md (e.g., BODY_frame.md)
  const domainUpper = domain.toUpperCase();
  const filename = `${domainUpper}_${mapType.toLowerCase()}.md`;
  const filePath = path.join(mapDir, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`[scanForMap] Map not found: ${filePath}`);
    return null;
  }

  try {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, "utf8");

    // Parse YAML front matter if exists
    const yaml = extractYamlFrontMatter(content);

    const relativePath = path.relative(getVaultDir(), filePath);

    return {
      file: relativePath,
      title: yaml.title || `${domainUpper} ${mapType} Map`,
      status: yaml.status || yaml.frame_status || "unknown",
      last_shift: yaml.last_shift || null,
      updated_at: stats.mtime.toISOString(),
    };
  } catch (err) {
    console.error(`[scanForMap] Error reading ${filePath}:`, err);
    return null;
  }
}

/**
 * Scan for Fire Map (weekly)
 * @param {string} gameDir - Game vault directory
 * @param {string} domain - Domain (lowercase)
 * @param {string} week - ISO week string
 * @returns {object|null} Fire map data or null
 */
function scanForFireMap(gameDir, domain, week) {
  const fireDir = path.join(gameDir, "Fire");
  if (!fs.existsSync(fireDir)) {
    console.warn(`[scanForFireMap] Directory not found: ${fireDir}`);
    return null;
  }

  // Look for fire map with week in filename or YAML
  const domainUpper = domain.toUpperCase();
  const files = fs.readdirSync(fireDir).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const filePath = path.join(fireDir, file);
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const yaml = extractYamlFrontMatter(content);

      // Check if this file is for this domain and week
      if (
        yaml.domain &&
        yaml.domain.toUpperCase() === domainUpper &&
        yaml.week === week
      ) {
        const stats = fs.statSync(filePath);
        const relativePath = path.relative(getVaultDir(), filePath);

        return {
          file: relativePath,
          week,
          hits: yaml.hits || [],
          completion: yaml.completion || 0,
          serves_focus: yaml.serves_focus || null,
          updated_at: stats.mtime.toISOString(),
        };
      }
    } catch (err) {
      console.error(`[scanForFireMap] Error reading ${filePath}:`, err);
    }
  }

  return null;
}

/**
 * Scan for VOICE sessions related to domain
 * @param {string} voiceDir - VOICE vault directory
 * @param {string} domain - Domain (lowercase)
 * @returns {object|null} VOICE metadata or null
 */
function scanForVoiceSessions(voiceDir, domain) {
  if (!fs.existsSync(voiceDir)) {
    console.warn(`[scanForVoiceSessions] Directory not found: ${voiceDir}`);
    return null;
  }

  try {
    const files = fs
      .readdirSync(voiceDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const filePath = path.join(voiceDir, f);
        const stats = fs.statSync(filePath);
        return { name: f, path: filePath, mtime: stats.mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);

    // Simple heuristic: count sessions, find latest STRIKE
    let sessionCount = 0;
    let latestSession = null;
    let latestStrike = null;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file.path, "utf8");
        const yaml = extractYamlFrontMatter(content);

        // Check if this session relates to domain (tags, content mentions, etc.)
        const isDomainRelated =
          yaml.domain &&
          yaml.domain.toLowerCase() === domain.toLowerCase();

        if (isDomainRelated || content.toLowerCase().includes(domain)) {
          sessionCount++;
          if (!latestSession) {
            latestSession = path.relative(getVaultDir(), file.path);
          }

          // Extract STRIKE section if exists
          if (!latestStrike) {
            const strikeMatch = content.match(/##\s*STRIKE\s*\n+(.*?)(?=\n##|\n---|$)/is);
            if (strikeMatch) {
              latestStrike = strikeMatch[1].trim().substring(0, 200);
            }
          }
        }
      } catch (err) {
        console.error(`[scanForVoiceSessions] Error reading ${file.path}:`, err);
      }
    }

    return {
      latest_session: latestSession,
      latest_strike: latestStrike,
      session_count: sessionCount,
      integrated: false, // TODO: detect integration
      updated_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[scanForVoiceSessions] Error scanning ${voiceDir}:`, err);
    return null;
  }
}

/**
 * Scan for War Stacks related to domain
 * @param {string} doorDir - Door vault directory
 * @param {string} domain - Domain (lowercase)
 * @returns {array} Array of war stack objects
 */
function scanForWarStacks(doorDir, domain) {
  const warStackDir = path.join(doorDir, "War-Stacks");
  if (!fs.existsSync(warStackDir)) {
    console.warn(`[scanForWarStacks] Directory not found: ${warStackDir}`);
    return [];
  }

  try {
    const files = fs
      .readdirSync(warStackDir)
      .filter((f) => f.endsWith(".md"));

    const warStacks = [];
    const domainUpper = domain.toUpperCase();

    for (const file of files) {
      const filePath = path.join(warStackDir, file);
      try {
        const content = fs.readFileSync(filePath, "utf8");
        const yaml = extractYamlFrontMatter(content);

        // Check if this war stack is for this domain
        if (
          yaml.domain &&
          yaml.domain.toUpperCase() === domainUpper
        ) {
          const stats = fs.statSync(filePath);
          const relativePath = path.relative(getVaultDir(), filePath);

          warStacks.push({
            file: relativePath,
            title: yaml.title || file.replace(".md", ""),
            status: yaml.status || "active",
            hits_completed: yaml.hits_completed || 0,
            created_at: yaml.created_at || stats.birthtime.toISOString().split("T")[0],
          });
        }
      } catch (err) {
        console.error(`[scanForWarStacks] Error reading ${filePath}:`, err);
      }
    }

    return warStacks;
  } catch (err) {
    console.error(`[scanForWarStacks] Error scanning ${warStackDir}:`, err);
    return [];
  }
}

/**
 * Scan for Core4 metrics from weekly JSON
 * @param {string} domain - Domain (lowercase)
 * @param {string} week - ISO week string
 * @returns {object|null} Core4 metrics or null
 */
function scanForCore4Metrics(domain, week) {
  // Core4 week JSON is a derived artifact (rebuilt from `.core4/events`).
  // Prefer the local write target (`Core4/`) and fall back to the GDrive mount (`Alpha_Core4/`).
  const vaultDir = getVaultDir();
  const weekName = `core4_week_${week}.json`;
  const weekFileLocal = path.join(vaultDir, "Core4", weekName);
  const weekFileMount = path.join(vaultDir, "Alpha_Core4", weekName);
  const weekFile = fs.existsSync(weekFileLocal) ? weekFileLocal : weekFileMount;

  if (!fs.existsSync(weekFile)) {
    console.warn(`[scanForCore4Metrics] Week file not found: ${weekFile}`);
    return null;
  }

  try {
    const raw = fs.readFileSync(weekFile, "utf8");
    const data = JSON.parse(raw);

    const domainKey = domain.toLowerCase();
    // New format: totals.by_domain[domain] (points). Legacy format: totals[domain].
    const totals = data.totals || {};
    const byDomain = totals.by_domain || {};
    const weekTotal =
      (typeof byDomain[domainKey] === "number" ? byDomain[domainKey] : null) ??
      (typeof totals[domainKey] === "number" ? totals[domainKey] : 0);

    return {
      week_total: weekTotal,
      daily_streak: 0, // TODO: calculate from daily data
      trend: "unknown", // TODO: compare with previous weeks
    };
  } catch (err) {
    console.error(`[scanForCore4Metrics] Error reading ${weekFile}:`, err);
    return null;
  }
}

/**
 * Extract YAML front matter from markdown content
 * @param {string} content - Markdown content
 * @returns {object} Parsed YAML object or empty object
 */
function extractYamlFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  try {
    return yaml.load(match[1]) || {};
  } catch (err) {
    console.error("[extractYamlFrontMatter] YAML parse error:", err);
    return {};
  }
}

/**
 * Get current quarter string (Q1-2026, etc.)
 * @returns {string} Quarter string
 */
function getCurrentQuarter() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `Q${quarter}-${year}`;
}

// ============================================================================
// SYNTHESIS ENGINES
// ============================================================================
// Strategic intelligence engines for General's Tent
//
// 1. Cross-Domain Synthesis: Pattern recognition across BODY/BEING/BALANCE/BUSINESS
// 2. Temporal Cascade Analysis: Frame→Freedom→Focus→Fire alignment check
// 3. Pipeline Flow Diagnosis: VOICE→DOOR→FIRE energy flow analysis
// ============================================================================

/**
 * SYNTHESIS ENGINE #1: Cross-Domain Pattern Recognition
 *
 * Analyzes all 4 domain states to detect:
 * - Cross-domain patterns (e.g., BUSINESS overemphasis → BEING neglect)
 * - Domain dependencies (e.g., BALANCE foundation → unlocks BUSINESS capacity)
 * - Blocking patterns (e.g., Fire without grounding → Lower Dantian needed)
 *
 * @param {object} states - Object with all 4 domain states (BODY, BEING, BALANCE, BUSINESS)
 * @returns {object} Cross-domain synthesis report
 */
function synthesizeCrossDomain(states) {
  console.log("[synthesizeCrossDomain] Running cross-domain pattern recognition...");

  const patterns = [];
  const domainHealth = {};
  const crossDomainInsights = [];

  // Extract domain metrics
  const domainMetrics = DOMAINS.map((domain) => {
    const state = states[domain];
    if (!state) return null;

    const frameStatus = state.frame?.status || "unknown";
    const fireCompletion = state.fire?.completion || 0;
    const core4Week = state.core4?.week_total || 0;
    const warStacksActive = state.war_stacks?.filter((ws) => ws.status === "active").length || 0;
    const voiceIntegrated = state.voice?.integrated || false;

    domainHealth[domain] = {
      frame_status: frameStatus,
      fire_completion: fireCompletion,
      core4_week: core4Week,
      war_stacks_active: warStacksActive,
      voice_integrated: voiceIntegrated,
      blocking_pattern: "none",
    };

    return {
      domain,
      frameStatus,
      fireCompletion,
      core4Week,
      warStacksActive,
      voiceIntegrated,
    };
  }).filter(Boolean);

  // Pattern #1: Detect spiritual bypassing (BUSINESS overemphasis while BEING neglected)
  const business = domainMetrics.find((d) => d.domain === "BUSINESS");
  const being = domainMetrics.find((d) => d.domain === "BEING");

  if (business && being) {
    if (business.core4Week >= 6 && being.core4Week <= 4) {
      patterns.push("BUSINESS overemphasis → BEING neglect = Spiritual Bypassing ACTIVE");
      domainHealth.BUSINESS.blocking_pattern = "bypassing_being";
      domainHealth.BEING.blocking_pattern = "no_daily_ritual";

      crossDomainInsights.push({
        type: "spiritual_bypass",
        severity: "high",
        description:
          "BUSINESS execution (Core4: " +
          business.core4Week +
          "/7) is high while BEING practice (Core4: " +
          being.core4Week +
          "/7) is low. This indicates spiritual bypassing pattern.",
        recommendation:
          "Reduce BUSINESS Fire Hits from 4 to 3. Add BEING Fire Hit: 'Meditation 20min daily'.",
      });
    }
  }

  // Pattern #2: Detect foundation unlocking (BALANCE → enables other domains)
  const balance = domainMetrics.find((d) => d.domain === "BALANCE");
  const body = domainMetrics.find((d) => d.domain === "BODY");

  if (balance && balance.core4Week >= 5) {
    patterns.push(
      "BALANCE foundation solid → unlocked capacity in other domains"
    );

    crossDomainInsights.push({
      type: "foundation_unlock",
      severity: "positive",
      description:
        "BALANCE foundation (Core4: " +
        balance.core4Week +
        "/7) is strong. This typically unlocks BODY & BUSINESS capacity.",
      recommendation:
        "Maintain BALANCE consistency. It's the base for other domains.",
    });
  }

  // Pattern #3: Detect VOICE integration gaps
  const voiceIntegrationGaps = domainMetrics.filter(
    (d) => !d.voiceIntegrated && d.domain !== "BALANCE"
  );

  if (voiceIntegrationGaps.length > 0) {
    const domainNames = voiceIntegrationGaps.map((d) => d.domain).join(", ");
    patterns.push(
      `VOICE material rich but practice poor in: ${domainNames}`
    );

    crossDomainInsights.push({
      type: "voice_integration_gap",
      severity: "medium",
      description:
        "VOICE sessions exist for " +
        domainNames +
        " but not integrated into daily practice.",
      recommendation:
        "Create War Stack 'Daily Practice Foundation' with 4 Hits derived from VOICE insights.",
    });
  }

  // Pattern #4: Detect Fire without grounding (multiple domains low completion)
  const lowFireDomains = domainMetrics.filter((d) => d.fireCompletion < 0.5);

  if (lowFireDomains.length >= 2) {
    const domainNames = lowFireDomains.map((d) => d.domain).join(", ");
    patterns.push(`Fire without grounding in: ${domainNames}`);

    crossDomainInsights.push({
      type: "fire_without_grounding",
      severity: "medium",
      description:
        "Low Fire Map completion in " +
        domainNames +
        ". May indicate overcommitment or lack of grounding practice.",
      recommendation:
        "Reduce Fire Hits per domain from 4 to 3. Add grounding practice (Lower Dantian, breath work).",
    });
  }

  // Pattern #5: Detect Domino Door opportunities
  const highActivityDomains = domainMetrics.filter(
    (d) => d.warStacksActive >= 2 || d.core4Week >= 6
  );

  if (highActivityDomains.length >= 2) {
    const domainNames = highActivityDomains.map((d) => d.domain).join(" + ");
    patterns.push(`Domino Door opportunity: ${domainNames} synergy`);

    crossDomainInsights.push({
      type: "domino_door",
      severity: "opportunity",
      description:
        "High activity in " +
        domainNames +
        ". These domains may have synergistic Domino Doors.",
      recommendation:
        "Look for War Stacks that serve multiple domains (e.g., Vital Dojo serves BUSINESS + BEING).",
    });
  }

  console.log(
    `[synthesizeCrossDomain] Detected ${patterns.length} patterns, ${crossDomainInsights.length} insights`
  );

  return {
    patterns,
    domain_health: domainHealth,
    insights: crossDomainInsights,
    overall_balance: calculateOverallBalance(domainMetrics),
  };
}

/**
 * Calculate overall domain balance score (0.0-1.0)
 * Checks if energy is distributed evenly across domains
 * @param {array} domainMetrics - Array of domain metrics
 * @returns {number} Balance score (0.0 = severely imbalanced, 1.0 = perfectly balanced)
 */
function calculateOverallBalance(domainMetrics) {
  if (!domainMetrics || domainMetrics.length === 0) return 0;

  const core4Values = domainMetrics.map((d) => d.core4Week);
  const avg = core4Values.reduce((sum, val) => sum + val, 0) / core4Values.length;
  const variance =
    core4Values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
    core4Values.length;
  const stdDev = Math.sqrt(variance);

  // Lower stdDev = more balanced
  // Max stdDev possible = 3.5 (if one domain 7/7, others 0/7)
  // Balance score = 1 - (stdDev / 3.5)
  const balanceScore = Math.max(0, 1 - stdDev / 3.5);

  return Math.round(balanceScore * 100) / 100;
}

/**
 * SYNTHESIS ENGINE #2: Temporal Cascade Analysis
 *
 * Analyzes alignment across time horizons:
 * - Fire (weekly) → Focus (monthly/quarterly)
 * - Focus (quarterly) → Freedom (annual/10-year)
 * - Freedom (10-year IPW) → Frame (current reality)
 *
 * Detects cascade breakdowns where lower levels don't serve higher levels
 *
 * @param {object} states - Object with all 4 domain states
 * @returns {object} Temporal cascade analysis report
 */
function synthesizeTemporalCascade(states) {
  console.log("[synthesizeTemporalCascade] Running temporal cascade analysis...");

  const cascadeHealth = {};
  const cascadeBlockers = [];
  const frameShifts = [];

  for (const domain of DOMAINS) {
    const state = states[domain];
    if (!state) {
      cascadeHealth[domain] = {
        fire_to_focus: "unknown",
        focus_to_freedom: "unknown",
        freedom_to_frame: "unknown",
      };
      continue;
    }

    // Fire → Focus alignment
    const fireServesFocus = state.fire?.serves_focus;
    const fireToFocus =
      fireServesFocus === true
        ? "aligned"
        : fireServesFocus === false
        ? "blocked"
        : "unknown";

    // Focus → Freedom alignment
    const focusServesFreedom = state.focus?.serves_freedom;
    const focusToFreedom =
      focusServesFreedom === true
        ? "aligned"
        : focusServesFreedom === false
        ? "blocked"
        : "unknown";

    // Freedom → Frame alignment
    const freedomAlignment = state.freedom?.alignment || "unknown";
    const freedomToFrame = freedomAlignment;

    cascadeHealth[domain] = {
      fire_to_focus: fireToFocus,
      focus_to_freedom: focusToFreedom,
      freedom_to_frame: freedomToFrame,
    };

    // Detect blockers
    if (fireToFocus === "blocked") {
      cascadeBlockers.push({
        domain,
        level: "fire_to_focus",
        description:
          `${domain} Fire Hits this week do NOT serve Focus mission. ` +
          `Weekly execution is misaligned with monthly goal.`,
        impact: "Focus mission will not progress.",
        correction:
          "Review Fire Hits. Replace non-aligned Hits with Focus-aligned tasks.",
      });
    }

    if (focusToFreedom === "blocked") {
      cascadeBlockers.push({
        domain,
        level: "focus_to_freedom",
        description:
          `${domain} Focus mission does NOT serve Freedom vision (IPW). ` +
          `Monthly goal is misaligned with 10-year vision.`,
        impact: "Long-term vision will not manifest.",
        correction:
          "Review Focus mission. Align with Freedom Map IPW description.",
      });
    }

    if (freedomToFrame === "blocked") {
      cascadeBlockers.push({
        domain,
        level: "freedom_to_frame",
        description:
          `${domain} Freedom vision is BLOCKED by current Frame reality. ` +
          `There's a fundamental misalignment between 'where you are' and 'where you want to be'.`,
        impact:
          "Frame will not shift. Executing tactics without transforming reality.",
        correction:
          "Frame shift needed. Review Frame Map. What fundamental change is required?",
      });
    }

    // Detect Frame shifts
    if (state.frame?.last_shift) {
      const shiftDate = new Date(state.frame.last_shift);
      const daysSinceShift = Math.floor(
        (new Date() - shiftDate) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceShift <= 30) {
        frameShifts.push({
          domain,
          date: state.frame.last_shift,
          days_ago: daysSinceShift,
          new_status: state.frame.status,
          cascade_updates_needed: [
            "Update Freedom Map with new Frame reality",
            "Adjust Focus mission to new Frame context",
            "Re-align Fire Hits with new Focus",
          ],
        });
      }
    }
  }

  console.log(
    `[synthesizeTemporalCascade] Found ${cascadeBlockers.length} blockers, ${frameShifts.length} recent Frame shifts`
  );

  return {
    cascade_health: cascadeHealth,
    blockers: cascadeBlockers,
    frame_shifts: frameShifts,
    overall_alignment: calculateCascadeAlignment(cascadeHealth),
  };
}

/**
 * Calculate overall cascade alignment score (0.0-1.0)
 * @param {object} cascadeHealth - Cascade health per domain
 * @returns {number} Alignment score
 */
function calculateCascadeAlignment(cascadeHealth) {
  let alignedCount = 0;
  let totalCount = 0;

  for (const domain of DOMAINS) {
    const health = cascadeHealth[domain];
    if (!health) continue;

    for (const level of [
      "fire_to_focus",
      "focus_to_freedom",
      "freedom_to_frame",
    ]) {
      totalCount++;
      if (health[level] === "aligned") alignedCount++;
    }
  }

  if (totalCount === 0) return 0;
  return Math.round((alignedCount / totalCount) * 100) / 100;
}

/**
 * SYNTHESIS ENGINE #3: Pipeline Flow Diagnosis
 *
 * Analyzes VOICE → DOOR → FIRE energy flow:
 * - VOICE STRIKE → War Stack creation (VOICE → DOOR)
 * - War Stack 4 Hits → Fire Map execution (DOOR → FIRE)
 * - Fire Map completion → Focus/Freedom progression (FIRE → GAME)
 *
 * Detects pipeline blockages where mental insights don't become physical action
 *
 * @param {object} states - Object with all 4 domain states
 * @returns {object} Pipeline flow diagnosis report
 */
function synthesizePipelineFlow(states) {
  console.log("[synthesizePipelineFlow] Running pipeline flow diagnosis...");

  const pipelineHealth = {};
  const pipelineIssues = [];
  const pipelineFlow = [];

  for (const domain of DOMAINS) {
    const state = states[domain];
    if (!state) {
      pipelineHealth[domain] = {
        voice_to_door: 0,
        door_to_fire: 0,
        overall: 0,
      };
      continue;
    }

    // VOICE → DOOR health
    const voiceSessionCount = state.voice?.session_count || 0;
    const warStacksActive = state.war_stacks?.filter(
      (ws) => ws.status === "active"
    ).length || 0;

    // If VOICE sessions exist but no War Stacks, pipeline is blocked
    let voiceToDoor = 0;
    if (voiceSessionCount === 0) {
      voiceToDoor = 0; // No VOICE input
    } else if (warStacksActive === 0) {
      voiceToDoor = 0.2; // VOICE exists but not converting to War Stacks
      pipelineIssues.push({
        domain,
        stage: "voice_to_door",
        severity: "high",
        description:
          `${domain} has ${voiceSessionCount} VOICE sessions but 0 active War Stacks. ` +
          `Mental insights are not converting to tactical plans.`,
        impact:
          "VOICE material remains theoretical. No execution channel.",
        correction:
          "Create War Stack from latest VOICE STRIKE. Extract 4 Hits from VOICE insights.",
      });
    } else if (voiceSessionCount > warStacksActive * 5) {
      voiceToDoor = 0.5; // Some conversion but low ratio
      pipelineIssues.push({
        domain,
        stage: "voice_to_door",
        severity: "medium",
        description:
          `${domain} has ${voiceSessionCount} VOICE sessions but only ${warStacksActive} active War Stacks. ` +
          `Conversion ratio is low (${Math.round((warStacksActive / voiceSessionCount) * 100)}%).`,
        impact:
          "VOICE insights accumulating faster than they're being executed.",
        correction:
          "Review VOICE sessions. Extract more War Stacks from existing material.",
      });
    } else {
      voiceToDoor = 0.9; // Healthy conversion
    }

    // DOOR → FIRE health
    const warStackHitsTotal = state.war_stacks?.reduce(
      (sum, ws) => sum + (ws.hits_completed || 0),
      0
    ) || 0;
    const fireHitsCount = state.fire?.hits?.length || 0;
    const fireCompletion = state.fire?.completion || 0;

    let doorToFire = 0;
    if (warStacksActive === 0) {
      doorToFire = 0; // No War Stacks to execute
    } else if (fireHitsCount === 0) {
      doorToFire = 0.2; // War Stacks exist but not in Fire Map
      pipelineIssues.push({
        domain,
        stage: "door_to_fire",
        severity: "high",
        description:
          `${domain} has ${warStacksActive} active War Stacks but 0 Fire Hits this week. ` +
          `Tactical plans are not converting to weekly execution.`,
        impact:
          "War Stacks remain plans. No actual execution happening.",
        correction:
          "Extract 4 Hits from active War Stacks. Add to this week's Fire Map.",
      });
    } else if (fireCompletion < 0.5) {
      doorToFire = 0.5; // Fire Hits exist but low completion
      pipelineIssues.push({
        domain,
        stage: "door_to_fire",
        severity: "medium",
        description:
          `${domain} has ${fireHitsCount} Fire Hits but only ${Math.round(fireCompletion * 100)}% completed. ` +
          `Execution is happening but completion rate is low.`,
        impact: "Fire Map execution stalling. Tactics not completing.",
        correction:
          "Review Fire Hits. Are they too ambitious? Reduce scope or increase time allocation.",
      });
    } else {
      doorToFire = 0.9; // Healthy execution
    }

    const overall = (voiceToDoor + doorToFire) / 2;

    pipelineHealth[domain] = {
      voice_to_door: Math.round(voiceToDoor * 100) / 100,
      door_to_fire: Math.round(doorToFire * 100) / 100,
      overall: Math.round(overall * 100) / 100,
    };

    // Track pipeline flow for this domain
    if (state.voice?.latest_strike) {
      pipelineFlow.push({
        domain,
        voice_strike: state.voice.latest_strike.substring(0, 100) + "...",
        war_stacks_active: warStacksActive,
        fire_hits_count: fireHitsCount,
        fire_completion: Math.round(fireCompletion * 100),
        pipeline_health: Math.round(overall * 100),
      });
    }
  }

  console.log(
    `[synthesizePipelineFlow] Detected ${pipelineIssues.length} pipeline issues`
  );

  return {
    pipeline_health: pipelineHealth,
    issues: pipelineIssues,
    flow: pipelineFlow,
    overall_health: calculateOverallPipelineHealth(pipelineHealth),
  };
}

/**
 * Calculate overall pipeline health (0.0-1.0)
 * @param {object} pipelineHealth - Pipeline health per domain
 * @returns {number} Overall health score
 */
function calculateOverallPipelineHealth(pipelineHealth) {
  let totalHealth = 0;
  let domainCount = 0;

  for (const domain of DOMAINS) {
    const health = pipelineHealth[domain];
    if (!health) continue;
    totalHealth += health.overall;
    domainCount++;
  }

  if (domainCount === 0) return 0;
  return Math.round((totalHealth / domainCount) * 100) / 100;
}

function getVoiceVaultDir() {
  const env = process.env.VOICE_VAULT_DIR;
  if (env) return env;
  const homeVoice = path.join(os.homedir(), "Voice");
  if (fs.existsSync(homeVoice)) return homeVoice;
  return path.join(getVaultDir(), "VOICE");
}

function journalEntryPath(subtask) {
  const date = new Date().toISOString().split("T")[0];
  const base = safeSlug(subtask || "journal") || "journal";
  let filename = `${base}-${date}.md`;
  let full = path.join(CORE4_JOURNAL_DIR, filename);
  if (fs.existsSync(full)) {
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .replace("Z", "");
    filename = `${base}-${date}-${stamp}.md`;
    full = path.join(CORE4_JOURNAL_DIR, filename);
  }
  return full;
}

function listMarkdownFiles(dirPath, { limit = 50 } = {}) {
  try {
    if (!fs.existsSync(dirPath)) return [];
    const entries = fs.readdirSync(dirPath);
    const files = [];
    for (const name of entries) {
      const full = path.join(dirPath, name);
      try {
        const st = fs.statSync(full);
        if (st.isFile()) {
          files.push({ name, path: full, mtimeMs: st.mtimeMs, size: st.size });
        }
      } catch (_) {}
    }
    return files
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, limit);
  } catch (_) {
    return [];
  }
}

function listMarkdownFilesRecursive(dirPath, { limit = 100 } = {}) {
  try {
    if (!fs.existsSync(dirPath)) return [];
    const files = [];
    const stack = [dirPath];
    while (stack.length) {
      const current = stack.pop();
      let entries = [];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch (_) {
        continue;
      }
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
          continue;
        }
        if (!entry.isFile()) continue;
        if (!entry.name.toLowerCase().endsWith(".md")) continue;
        try {
          const st = fs.statSync(full);
          files.push({
            name: entry.name,
            path: full,
            relative: path.relative(dirPath, full),
            mtimeMs: st.mtimeMs,
            size: st.size,
          });
        } catch (_) {}
      }
      if (files.length >= limit * 3) break;
    }
    return files
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, limit);
  } catch (_) {
    return [];
  }
}

async function rcloneRc(command, payload = {}) {
  const url = `${RCLONE_RC_URL.replace(/\/$/, "")}/rc/${command}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`rclone ${command} failed: ${res.status}`);
  }
  return res.json().catch(() => ({}));
}

async function bridgeFetch(pathname, options = {}) {
  if (!BRIDGE_URL) return null;
  const url = `${BRIDGE_URL}${pathname}`;
  const headers = { ...(options.headers || {}) };
  if (BRIDGE_TOKEN && BRIDGE_TOKEN_HEADER) {
    headers[BRIDGE_TOKEN_HEADER] = BRIDGE_TOKEN;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BRIDGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, headers, signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    return res.ok ? data : { ok: false, error: data?.error || `bridge ${res.status}` };
  } catch (err) {
    return { ok: false, error: err?.message || "bridge error" };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Create Taskwarrior task(s) via Bridge /bridge/task/execute
 * @param {Object|Array} task - Single task object or array of tasks
 * @returns {Promise<Object>} - { ok, results: [{ ok, task_uuid, task_id, ... }] }
 */
async function createTaskwarriorTask(task) {
  if (!BRIDGE_URL) {
    return { ok: false, error: "BRIDGE_URL not configured" };
  }
  const tasks = Array.isArray(task) ? task : [task];
  return bridgeFetch("/bridge/task/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks }),
  });
}

/**
 * Update Taskwarrior task via Bridge /bridge/task/modify
 * @param {String} uuid - Taskwarrior UUID
 * @param {Object} updates - { tags_add: [], tags_remove: [], depends: [], wait: '', ... }
 * @returns {Promise<Object>} - { ok, stdout, stderr }
 */
async function updateTaskwarriorTask(uuid, updates) {
  if (!BRIDGE_URL) {
    return { ok: false, error: "BRIDGE_URL not configured" };
  }
  return bridgeFetch("/bridge/task/modify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uuid, updates }),
  });
}

/**
 * Parse War Stack markdown to extract hits, domain, title
 * @param {String} markdown - War Stack markdown content
 * @returns {Object} - { hits: [{fact, obstacle, strike, responsibility}], domain, title }
 */
function parseWarStackMarkdown(markdown) {
  const hits = [];
  const lines = markdown.split("\n");

  // Extract domain from frontmatter or markdown
  let domain = "Business";
  const domainMatch = markdown.match(/domain:\s*(\w+)/i) || markdown.match(/\*\*Domain:\*\*\s*(\w+)/i);
  if (domainMatch) {
    domain = domainMatch[1];
  }

  // Extract title from first heading
  let title = "War Stack";
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].replace(/^WAR STACK\s*-\s*/i, "").trim();
  }

  // Extract 4 Hits (sections: ### Hit 1, ### Hit 2, etc)
  for (let hitNum = 1; hitNum <= 4; hitNum++) {
    const hitRegex = new RegExp(`###\\s+Hit\\s+${hitNum}[\\s\\S]*?(?=###\\s+Hit\\s+|##\\s+|$)`, "i");
    const hitMatch = markdown.match(hitRegex);

    if (hitMatch) {
      const hitSection = hitMatch[0];
      const fact = (hitSection.match(/\*\*FACT:\*\*\s*(.+)/i) || [])[1] || "";
      const obstacle = (hitSection.match(/\*\*OBSTACLE:\*\*\s*(.+)/i) || [])[1] || "";
      const strike = (hitSection.match(/\*\*STRIKE:\*\*\s*(.+)/i) || [])[1] || "";
      const responsibility = (hitSection.match(/\*\*RESPONSIBILITY:\*\*\s*(.+)/i) || [])[1] || "";

      hits.push({
        fact: fact.trim(),
        obstacle: obstacle.trim(),
        strike: strike.trim(),
        responsibility: responsibility.trim()
      });
    }
  }

  return { hits, domain, title };
}

/**
 * Build War Stack task objects (before UUID assignment)
 * Pattern from GAS door_buildWarStackTasks_()
 * @param {Object} parsed - Result from parseWarStackMarkdown()
 * @param {Object} meta - { sessionId, fileId, title }
 * @returns {Array} - Array of task objects for Bridge
 */
function buildWarStackTasks(parsed, meta = {}) {
  const { hits, domain, title } = parsed;
  const tasks = [];

  if (!hits || hits.length === 0) {
    return tasks;
  }

  const domainTag = normalizeDomain(domain).toLowerCase();
  const domainProject = doorProjectFromTitle(title);
  const warstackTag = "warstack";

  // 1. Build 4 Hit tasks (first in array, created first)
  hits.forEach((hit, idx) => {
    const primary = hit.fact || hit.strike || hit.obstacle || hit.responsibility || "War Stack Hit";
    const desc = `Hit ${idx + 1}: ${primary}`;

    tasks.push({
      description: desc,
      tags: ["hit", "production", domainTag, warstackTag],
      project: domainProject,
      due: `today+${idx + 1}d`,  // Hit 1-4: today+1..4d
      wait: `+${idx + 1}d`,
      meta: {
        warstack_session_id: meta.sessionId || "",
        warstack_file_path: meta.filePath || "",
        warstack_title: title,
        hit_index: idx + 1,
        hit_title: primary
      }
    });
  });

  // 2. Door parent task (depends filled after UUIDs known)
  tasks.push({
    description: `Door: ${title}`,
    tags: ["door", "plan", domainTag, warstackTag],
    project: domainProject,
    meta: {
      warstack_session_id: meta.sessionId || "",
      warstack_file_path: meta.filePath || "",
      warstack_title: title,
      door_parent: true,
      hit_count: hits.length
    }
  });

  // 3. Profit task (wait + depends filled after Door UUID known)
  tasks.push({
    description: `Profit: ${title}`,
    tags: ["door", "profit", domainTag, warstackTag],
    project: domainProject,
    wait: "+5d",
    meta: {
      warstack_session_id: meta.sessionId || "",
      warstack_file_path: meta.filePath || "",
      warstack_title: title,
      profit: true
    }
  });

  return tasks;
}

/**
 * Wire War Stack dependencies after UUIDs are known
 * Pattern from GAS door_wireWarStackDependencies_()
 * @param {Array} results - Results from Bridge task execution
 * @returns {Object} - { door_uuid, hit_uuids, profit_uuid }
 */
function wireWarStackDependencies(results) {
  const hits = [];
  let door = null;
  let profit = null;

  results.forEach((result) => {
    if (!result || !result.task_uuid) return;
    const meta = result.meta || {};

    if (meta.door_parent) {
      door = result;
    } else if (meta.profit) {
      profit = result;
    } else {
      hits.push(result);
    }
  });

  const hitUuids = hits.map(h => h.task_uuid).filter(Boolean);

  return {
    door_uuid: door?.task_uuid,
    door_task_id: door?.task_id,
    hit_uuids: hitUuids,
    hits: hits.map(h => ({
      uuid: h.task_uuid,
      task_id: h.task_id,
      hit_index: h.meta?.hit_index,
      title: h.meta?.hit_title || h.description
    })),
    profit_uuid: profit?.task_uuid,
    profit_task_id: profit?.task_id
  };
}

/**
 * Update markdown with Taskwarrior UUIDs (frontmatter + section)
 * Pattern from GAS door_upsertTaskwarriorFrontmatter_() and door_upsertTaskwarriorSection_()
 * @param {String} markdown - Original markdown
 * @param {Object} wired - Result from wireWarStackDependencies()
 * @returns {String} - Updated markdown with UUIDs
 */
function updateMarkdownWithUUIDs(markdown, wired) {
  let updated = markdown;

  // Add ## Taskwarrior section at end
  const taskSection = [
    "",
    "## Taskwarrior",
    "",
    "War Stack Tasks (UUIDs):",
    "",
    `- Door: \`${wired.door_uuid}\` (${wired.door_task_id})`,
    ...wired.hits.map(h => `- Hit ${h.hit_index}: \`${h.uuid}\` (${h.task_id}) — ${h.title}`),
    `- Profit: \`${wired.profit_uuid}\` (${wired.profit_task_id})`,
    ""
  ].join("\n");

  // Remove existing ## Taskwarrior section if present
  updated = updated.replace(/\n## Taskwarrior[\s\S]*?(?=\n##|$)/g, "");
  updated = updated.trim() + "\n" + taskSection;

  // Update frontmatter if exists
  if (updated.startsWith("---")) {
    const fmEnd = updated.indexOf("---", 3);
    if (fmEnd > 0) {
      const head = updated.slice(0, fmEnd + 3);
      const body = updated.slice(fmEnd + 3);

      // Remove old taskwarrior fields
      let cleanedHead = head
        .split("\n")
        .filter(line => !line.match(/^taskwarrior_/))
        .join("\n");

      // Add new fields before closing ---
      const newFields = [
        `taskwarrior_door_uuid: ${wired.door_uuid}`,
        `taskwarrior_profit_uuid: ${wired.profit_uuid}`,
        `taskwarrior_hits:`,
        ...wired.hits.map(h => `  - uuid: ${h.uuid}\n    hit_index: ${h.hit_index}`)
      ].join("\n");

      cleanedHead = cleanedHead.replace(/\n---$/, `\n${newFields}\n---`);
      updated = cleanedHead + body;
    }
  }

  return updated;
}

const CORE4_HABITS = {
  body: {
    fitness: "Fitness",
    fuel: "Fuel",
  },
  being: {
    meditation: "Meditation",
    memoirs: "Memoirs",
  },
  balance: {
    person1: "Person 1",
    person2: "Person 2",
  },
  business: {
    discover: "Discover",
    declare: "Declare",
  },
};

const CORE4_SUBTASK_MAP = {
  fitness: {
    domain: "body",
    task: "fitness",
    label: "fitness",
    title: "Did you sweat today?",
  },
  fuel: {
    domain: "body",
    task: "fuel",
    label: "fuel",
    title: "Did you fuel your body?",
  },
  meditation: {
    domain: "being",
    task: "meditation",
    label: "meditation",
    title: "Did you meditate?",
  },
  memoirs: {
    domain: "being",
    task: "memoirs",
    label: "memoirs",
    title: "Did you write memoirs?",
  },
  partner: {
    domain: "balance",
    task: "person1",
    label: "partner",
    title: "Did you invest in your partner?",
  },
  person1: {
    domain: "balance",
    task: "person1",
    label: "partner",
    title: "Did you invest in person 1?",
  },
  posterity: {
    domain: "balance",
    task: "person2",
    label: "posterity",
    title: "Did you invest in posterity?",
  },
  person2: {
    domain: "balance",
    task: "person2",
    label: "posterity",
    title: "Did you invest in person 2?",
  },
  discover: {
    domain: "business",
    task: "discover",
    label: "discover",
    title: "Did you discover?",
  },
  declare: {
    domain: "business",
    task: "declare",
    label: "declare",
    title: "Did you declare?",
  },
};

const CORE4_LEGACY_SUBTASKS = [
  "fitness",
  "fuel",
  "meditation",
  "memoirs",
  "partner",
  "posterity",
  "discover",
  "declare",
];

function core4CanWriteDir(dirPath) {
  try {
    ensureDir(dirPath);
    const probe = path.join(dirPath, `.core4-rw-probe-${process.pid}-${Date.now()}`);
    fs.writeFileSync(probe, "ok", "utf8");
    fs.unlinkSync(probe);
    return true;
  } catch (_) {
    return false;
  }
}

function getCore4StorageDir() {
  if (CORE4_STORAGE_DIR_CACHE) return CORE4_STORAGE_DIR_CACHE;

  const preferred = CORE4_STORAGE_DIR_ENV || path.join(getVaultDir(), "Core4");
  if (core4CanWriteDir(preferred)) {
    CORE4_STORAGE_DIR_CACHE = preferred;
    return CORE4_STORAGE_DIR_CACHE;
  }

  if (core4CanWriteDir(CORE4_STORAGE_FALLBACK_DIR)) {
    console.warn(
      `[core4] preferred storage not writable (${preferred}). using fallback ${CORE4_STORAGE_FALLBACK_DIR}`
    );
    CORE4_STORAGE_DIR_CACHE = CORE4_STORAGE_FALLBACK_DIR;
    return CORE4_STORAGE_DIR_CACHE;
  }

  console.error(
    `[core4] no writable storage dir (preferred=${preferred}, fallback=${CORE4_STORAGE_FALLBACK_DIR})`
  );
  CORE4_STORAGE_DIR_CACHE = preferred;
  return CORE4_STORAGE_DIR_CACHE;
}

function getCore4EventRootDir() {
  return path.join(getCore4StorageDir(), ".core4", "events");
}

function getCore4JournalRootDir() {
  return path.join(getCore4StorageDir(), "journal");
}

function core4DaySnapshotPath(dateKey) {
  return path.join(getCore4StorageDir(), `core4_day_${dateKey}.json`);
}

function core4WeekSnapshotPath(weekKey) {
  return path.join(getCore4StorageDir(), `core4_week_${weekKey}.json`);
}

function core4Pad2(value) {
  return String(value).padStart(2, "0");
}

function core4DateKeyLocal(date = new Date()) {
  return `${date.getFullYear()}-${core4Pad2(date.getMonth() + 1)}-${core4Pad2(date.getDate())}`;
}

function parseCore4DateKey(day) {
  const raw = String(day || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveCore4DateKey(input, fallbackToday = true) {
  const raw = String(input || "").trim();
  if (!raw) return fallbackToday ? core4DateKeyLocal(new Date()) : "";
  const date = parseCore4DateKey(raw);
  return date ? raw : "";
}

function core4SafeToken(value) {
  return String(value || "").replace(/[^0-9a-zA-Z._-]/g, "_");
}

function readJsonFile(filePath, fallbackValue = null) {
  try {
    if (!fs.existsSync(filePath)) return fallbackValue;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (_) {
    return fallbackValue;
  }
}

function writeJsonFile(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

function core4WriteJsonSafe(filePath, value, label = "snapshot") {
  try {
    writeJsonFile(filePath, value);
  } catch (err) {
    const msg = err?.message || String(err);
    console.warn(`[core4] ${label} write skipped: ${msg}`);
  }
}

function core4GetHabitLabel(domain, task) {
  const d = String(domain || "").toLowerCase();
  const t = String(task || "").toLowerCase();
  return CORE4_HABITS[d]?.[t] || t;
}

function core4WeekDatesFor(dateObj) {
  const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 12, 0, 0, 0);
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() - (dayNum - 1));
  const out = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(d);
    next.setDate(d.getDate() + i);
    out.push(core4DateKeyLocal(next));
  }
  return out;
}

function core4WriteEvent(entry) {
  const dateKey = String(entry?.date || "").trim();
  if (!dateKey) return;
  const dayDir = path.join(getCore4EventRootDir(), dateKey);
  ensureDir(dayDir);
  const safeTs = core4SafeToken(String(entry.ts || new Date().toISOString()).replace(/[:.]/g, "-"));
  const safeDomain = core4SafeToken(entry.domain);
  const safeTask = core4SafeToken(entry.task);
  const safeSource = core4SafeToken(entry.source || "hq");
  const filename = `${dateKey}__${safeDomain}__${safeTask}__${safeTs}__${safeSource}.json`;
  fs.writeFileSync(path.join(dayDir, filename), JSON.stringify(entry, null, 2), "utf8");
}

function core4ListEventsForDate(dateKey) {
  const day = resolveCore4DateKey(dateKey, false);
  if (!day) return [];
  const dayDir = path.join(getCore4EventRootDir(), day);
  if (!fs.existsSync(dayDir)) return [];
  let names = [];
  try {
    names = fs.readdirSync(dayDir);
  } catch (err) {
    console.warn(`[core4] cannot read event dir ${dayDir}: ${err?.message || err}`);
    return [];
  }
  const out = [];
  for (const name of names) {
    const full = path.join(dayDir, name);
    let st = null;
    try {
      st = fs.statSync(full);
    } catch (_) {
      continue;
    }
    if (!st.isFile() || !name.toLowerCase().endsWith(".json")) continue;
    const data = readJsonFile(full, null);
    if (data && data.date === day) out.push(data);
  }
  return out;
}

function core4DedupEntries(entries) {
  const keep = {};
  for (const entry of entries || []) {
    if (!entry || typeof entry !== "object") continue;
    const key = String(entry.key || `${entry.date}:${entry.domain}:${entry.task}` || "").trim();
    if (!key) continue;
    const prev = keep[key];
    if (!prev) {
      keep[key] = entry;
      continue;
    }
    const prevTs = String(prev.last_ts || prev.ts || "");
    const nextTs = String(entry.last_ts || entry.ts || "");
    const newest = nextTs >= prevTs ? entry : prev;
    const older = newest === entry ? prev : entry;
    const mergedSources = Array.from(
      new Set(
        []
          .concat(prev.sources || [])
          .concat(entry.sources || [])
          .concat([prev.source, entry.source])
          .filter(Boolean)
      )
    );
    keep[key] = {
      ...newest,
      done: Boolean(prev.done || entry.done),
      points: Math.max(Number(prev.points || 0), Number(entry.points || 0)),
      source: newest.source || older.source || "hq",
      sources: mergedSources,
    };
  }
  return Object.keys(keep).map((key) => keep[key]);
}

function core4ComputeTotals(entries) {
  const totals = {
    week_total: 0,
    by_domain: {},
    by_day: {},
    by_habit: {},
  };
  for (const entry of entries || []) {
    if (!entry || typeof entry !== "object") continue;
    const points = Number(entry.points || 0) || 0;
    totals.week_total += points;
    if (entry.domain) {
      totals.by_domain[entry.domain] = (totals.by_domain[entry.domain] || 0) + points;
    }
    if (entry.date) {
      totals.by_day[entry.date] = (totals.by_day[entry.date] || 0) + points;
    }
    if (entry.domain && entry.task) {
      const habitKey = `${entry.domain}:${entry.task}`;
      totals.by_habit[habitKey] = (totals.by_habit[habitKey] || 0) + points;
    }
  }
  return totals;
}

function core4TotalForDate(entries, dateKey) {
  const day = resolveCore4DateKey(dateKey, false);
  if (!day) return 0;
  let sum = 0;
  for (const entry of entries || []) {
    if (entry?.date === day) sum += Number(entry.points || 0) || 0;
  }
  return sum;
}

function core4BuildDay(dateKey) {
  const day = resolveCore4DateKey(dateKey, false);
  if (!day) {
    return { date: "", updated_at: new Date().toISOString(), entries: [], totals: core4ComputeTotals([]) };
  }
  const entries = core4DedupEntries(core4ListEventsForDate(day));
  const payload = {
    date: day,
    updated_at: new Date().toISOString(),
    entries,
    totals: core4ComputeTotals(entries),
  };
  core4WriteJsonSafe(core4DaySnapshotPath(day), payload, "day snapshot");
  return payload;
}

function core4ListEventsForWeek(dateObj) {
  const days = core4WeekDatesFor(dateObj);
  let all = [];
  for (const day of days) {
    all = all.concat(core4ListEventsForDate(day));
  }
  return core4DedupEntries(all);
}

function core4BuildWeekForDate(dateObj) {
  const ref = dateObj instanceof Date && !Number.isNaN(dateObj.getTime()) ? dateObj : new Date();
  const weekKey = isoWeekString(ref);
  const entries = core4ListEventsForWeek(ref);
  const payload = {
    week: weekKey,
    updated_at: new Date().toISOString(),
    entries,
    totals: core4ComputeTotals(entries),
  };
  core4WriteJsonSafe(core4WeekSnapshotPath(weekKey), payload, "week snapshot");
  return payload;
}

function mapCore4Subtask(subtask) {
  const key = String(subtask || "").trim().toLowerCase();
  return CORE4_SUBTASK_MAP[key] || null;
}

function core4TaskMeta(subtask) {
  const mapped = mapCore4Subtask(subtask);
  if (!mapped) return null;
  return {
    domain: mapped.domain,
    label: mapped.label,
    title: mapped.title,
  };
}

function core4LegacySubtaskFromEntry(entry) {
  if (!entry) return "";
  const domain = String(entry.domain || "").toLowerCase();
  const task = String(entry.task || "").toLowerCase();
  if (domain === "body" && task === "fitness") return "fitness";
  if (domain === "body" && task === "fuel") return "fuel";
  if (domain === "being" && task === "meditation") return "meditation";
  if (domain === "being" && task === "memoirs") return "memoirs";
  if (domain === "balance" && task === "person1") return "partner";
  if (domain === "balance" && task === "person2") return "posterity";
  if (domain === "business" && task === "discover") return "discover";
  if (domain === "business" && task === "declare") return "declare";
  return "";
}

function core4LegacyKeyFromSubtask(subtask) {
  const key = String(subtask || "").trim().toLowerCase();
  if (key === "person1") return "partner";
  if (key === "person2") return "posterity";
  return key;
}

function core4LegacyDayState(dateKey) {
  const day = resolveCore4DateKey(dateKey, true);
  const state = {
    date: day,
    fitness: 0,
    fuel: 0,
    meditation: 0,
    memoirs: 0,
    partner: 0,
    posterity: 0,
    discover: 0,
    declare: 0,
    csv_written: false,
  };
  const dayData = core4BuildDay(day);
  for (const entry of dayData.entries || []) {
    const subtask = core4LegacySubtaskFromEntry(entry);
    if (subtask && Object.prototype.hasOwnProperty.call(state, subtask)) {
      state[subtask] = 1;
    }
  }
  return state;
}

function getCore4Total(data) {
  if (!data || typeof data !== "object") return 0;
  const raw = CORE4_LEGACY_SUBTASKS.reduce((sum, key) => sum + (Number(data[key]) || 0), 0);
  return raw * 0.5;
}

function core4Log(domain, task, timestamp, source = "hq") {
  const d = String(domain || "").trim().toLowerCase();
  const t = String(task || "").trim().toLowerCase();
  if (!CORE4_HABITS[d] || !CORE4_HABITS[d][t]) {
    return { ok: false, error: "unknown domain/task" };
  }
  const ts = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(ts.getTime())) {
    return { ok: false, error: "invalid timestamp" };
  }

  const dateKey = core4DateKeyLocal(ts);
  const weekKey = isoWeekString(ts);
  const entryKey = `${dateKey}:${d}:${t}`;
  const dayEntries = core4DedupEntries(core4ListEventsForDate(dateKey));
  const alreadyLogged = dayEntries.some((entry) => String(entry.key || "") === entryKey && Boolean(entry.done));

  if (!alreadyLogged) {
    const payload = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`,
      key: entryKey,
      ts: ts.toISOString(),
      last_ts: ts.toISOString(),
      date: dateKey,
      week: weekKey,
      domain: d,
      task: t,
      done: true,
      points: 0.5,
      source,
      sources: [source],
    };
    core4WriteEvent(payload);
  }

  core4BuildDay(dateKey);
  const weekData = core4BuildWeekForDate(ts);
  return {
    ok: true,
    duplicate: alreadyLogged,
    week: weekKey,
    total_today: core4TotalForDate(weekData.entries, dateKey),
  };
}

function core4GetDayState(dateKey) {
  const day = resolveCore4DateKey(dateKey, false);
  if (!day) return { ok: false, error: "invalid date" };
  const dt = parseCore4DateKey(day);
  const weekKey = isoWeekString(dt);
  const weekData = core4BuildWeekForDate(dt);
  const entries = (weekData.entries || []).filter((entry) => entry && entry.date === day);
  return {
    ok: true,
    date: day,
    week: weekKey,
    total: core4TotalForDate(weekData.entries, day),
    entries: entries.map((entry) => ({
      ts: entry.ts,
      domain: entry.domain,
      task: entry.task,
      points: Number(entry.points || 0) || 0,
      source: entry.source || "hq",
    })),
  };
}

function core4GetWeekSummaryForDate(dateKey) {
  const day = resolveCore4DateKey(dateKey, false);
  if (!day) return { ok: false, error: "invalid date" };
  const dt = parseCore4DateKey(day);
  const weekData = core4BuildWeekForDate(dt);
  return {
    ok: true,
    week: weekData.week,
    totals: weekData.totals || core4ComputeTotals([]),
  };
}

function core4ExportWeekSummaryToDrive(dateKey) {
  const day = resolveCore4DateKey(dateKey, false);
  if (!day) return { ok: false, error: "invalid date" };
  const dt = parseCore4DateKey(day);
  const weekData = core4BuildWeekForDate(dt);
  const weekKey = weekData.week;
  const entries = weekData.entries || [];
  const totals = weekData.totals || core4ComputeTotals([]);
  const weekTotal = Number(totals.week_total || 0) || 0;
  const pct = Math.round((weekTotal / 28) * 100);

  let md = `# Core4 Weekly Summary - ${weekKey}\n\n`;
  md += `Total: ${weekTotal}/28 (${pct}%)\n\n`;
  md += "## By Domain\n";
  Object.keys(CORE4_HABITS).forEach((domain) => {
    md += `- ${domain.charAt(0).toUpperCase() + domain.slice(1)}: ${totals.by_domain?.[domain] || 0}/7\n`;
  });
  md += "\n## Daily Totals\n";
  const dayKeys = Object.keys(totals.by_day || {}).sort();
  if (!dayKeys.length) {
    md += "- No entries yet\n";
  } else {
    dayKeys.forEach((key) => {
      md += `- ${key}: ${totals.by_day[key]}\n`;
    });
  }
  md += "\n## Entries\n";
  entries.forEach((entry) => {
    md += `- ${entry.date} | ${entry.domain} | ${core4GetHabitLabel(entry.domain, entry.task)} | +${entry.points}\n`;
  });
  ensureDir(getCore4StorageDir());
  const filePath = path.join(getCore4StorageDir(), `core4_week_summary_${weekKey}.md`);
  fs.writeFileSync(filePath, `${md.trim()}\n`, "utf8");
  return { ok: true, path: filePath, week: weekKey };
}

function core4GetJournalForDate(dateKey) {
  const day = resolveCore4DateKey(dateKey, false);
  if (!day) return { ok: false, error: "invalid date" };
  const dayDir = path.join(getCore4JournalRootDir(), day);
  if (!fs.existsSync(dayDir)) {
    return { ok: true, date: day, entries: [] };
  }
  const files = fs.readdirSync(dayDir);
  const entries = [];
  for (const name of files) {
    const full = path.join(dayDir, name);
    let st = null;
    try {
      st = fs.statSync(full);
    } catch (_) {
      continue;
    }
    if (!st.isFile() || !name.toLowerCase().endsWith(".md")) continue;
    const stem = name.slice(0, -3);
    const parts = stem.split("_");
    const domain = String(parts[0] || "").toLowerCase();
    const habit = String(parts[1] || "").toLowerCase();
    let text = "";
    try {
      text = fs.readFileSync(full, "utf8");
    } catch (_) {
      text = "";
    }
    entries.push({
      domain,
      habit,
      label: core4GetHabitLabel(domain, habit),
      text,
    });
  }
  return { ok: true, date: day, entries };
}

function core4SaveJournal(domain, habit, text, dateKey) {
  const day = resolveCore4DateKey(dateKey, false);
  if (!day) return { ok: false, error: "invalid date" };
  const d = String(domain || "").trim().toLowerCase();
  const h = String(habit || "").trim().toLowerCase();
  if (!CORE4_HABITS[d] || !CORE4_HABITS[d][h]) {
    return { ok: false, error: "unknown domain/habit" };
  }
  const cleanedText = String(text || "").trim();
  if (!cleanedText) return { ok: false, error: "missing text" };

  const now = new Date();
  const timeStr = `${core4Pad2(now.getHours())}:${core4Pad2(now.getMinutes())}`;
  const dayDir = path.join(getCore4JournalRootDir(), day);
  ensureDir(dayDir);
  const filePath = path.join(dayDir, `${d}_${h}.md`);
  const entry = `## ${timeStr}\n\n${cleanedText}\n\n---\n`;
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf8");
    const needsBreak = existing.trim().length > 0 ? "\n" : "";
    fs.writeFileSync(filePath, `${existing}${needsBreak}${entry}`, "utf8");
  } else {
    fs.writeFileSync(filePath, entry, "utf8");
  }
  return { ok: true, date: day, path: filePath };
}

function normalizeTaskTag(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

function taskwarriorEnv() {
  return TASKRC ? { ...process.env, TASKRC } : process.env;
}

function taskwarriorAvailable() {
  try {
    execFileSync(TASK_BIN, ["--version"], { stdio: "ignore", env: taskwarriorEnv() });
    return true;
  } catch (_) {
    return false;
  }
}

async function taskwarriorExportByTags(tags, extraArgs = []) {
  const cleanedTags = tags.map(normalizeTaskTag).filter(Boolean);
  const args = ["rc.verbose=0", "rc.confirmation=no", "+core4"];
  cleanedTags.forEach((tag) => args.push(`+${tag}`));
  extraArgs.forEach((arg) => args.push(arg));
  args.push("export");
  try {
    const { stdout } = await execFileAsync(TASK_BIN, args, {
      encoding: "utf8",
      timeout: 8000,
      env: taskwarriorEnv(),
    });
    const raw = String(stdout || "").trim();
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

function pickLatestTask(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const sorted = [...list].sort((a, b) => {
    const am = Date.parse(a.modified || a.entry || 0);
    const bm = Date.parse(b.modified || b.entry || 0);
    return bm - am;
  });
  return sorted[0] || null;
}

async function taskwarriorCreateCore4Task(meta, tags) {
  const cleanedTags = tags.map(normalizeTaskTag).filter(Boolean);
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateTag = `core4_${today.getFullYear()}${mm}${dd}`;
  const args = [
    "add",
    meta.title,
    "project:core4",
    "due:today",
    "+core4",
    `+${dateTag}`,
    ...cleanedTags.map((tag) => `+${tag}`),
  ];
  try {
    await execFileAsync(TASK_BIN, args, {
      timeout: 8000,
      env: taskwarriorEnv(),
    });
    return true;
  } catch (_) {
    return false;
  }
}

async function taskwarriorMarkDone(uuid) {
  if (!uuid) return false;
  try {
    await execFileAsync(TASK_BIN, [uuid, "done"], {
      timeout: 8000,
      env: taskwarriorEnv(),
    });
    return true;
  } catch (_) {
    return false;
  }
}

async function syncCore4Taskwarrior(subtask, value) {
  if (!CORE4_TW_SYNC) return { ok: false, skipped: true, reason: "disabled" };
  if (value < 1) return { ok: true, skipped: true, reason: "unset" };
  if (!taskwarriorAvailable()) return { ok: false, skipped: true, reason: "taskwarrior-missing" };
  const meta = core4TaskMeta(subtask);
  if (!meta) return { ok: false, skipped: true, reason: "unknown-subtask" };
  const tags = [meta.label, meta.domain];

  const existing = pickLatestTask(await taskwarriorExportByTags(tags, ["status:pending,completed"]));
  if (!existing) {
    await taskwarriorCreateCore4Task(meta, tags);
  }

  const dueToday = pickLatestTask(await taskwarriorExportByTags(tags, ["due:today", "status:pending"]));
  if (dueToday?.uuid) {
    const done = await taskwarriorMarkDone(dueToday.uuid);
    return { ok: true, done, uuid: dueToday.uuid };
  }
  return { ok: true, done: false };
}

function resolveDoorExportDir(tool) {
  const base = getDoorVaultDir();
  const map = {
    hotlist: path.join(base, "1-Potential"),
    doorwar: path.join(base, "2-Plan"),
    warstack: path.join(base, "War-Stacks"),
    hitlist: path.join(base, "3-Production"),
    profit: path.join(base, "4-Profit"),
  };
  return map[tool] || base;
}

const WARSTACK_STEPS = [
  {
    key: "domain",
    prompt:
      "Step 1/10: Domain & Sub-Domain\nWelche Domain passt?\nBody / Being / Balance / Business (oder eine Sub-Domain).",
  },
  {
    key: "domino_door",
    prompt:
      "Step 2/10: Domino Door\nWelche eine Door bringt alles ins Rollen? (konkret + messbar)",
  },
  {
    key: "trigger",
    prompt:
      "Step 3/10: Trigger\nWelches Ereignis oder welche Person hat das ausgelost?",
  },
  {
    key: "narrative",
    prompt:
      "Step 4/10: Narrative\nWelche Story erzählst du dir gerade über diese Door?",
  },
  {
    key: "validation",
    prompt:
      "Step 5/10: Validation\nWarum muss diese Door genau jetzt geöffnet werden?",
  },
  {
    key: "impact",
    prompt:
      "Step 6/10: Impact\nWas verändert sich, wenn die Door offen ist?",
  },
  {
    key: "consequences",
    prompt:
      "Step 7/10: Consequences\nWas passiert, wenn du sie nicht öffnest?",
  },
  {
    key: "insights",
    prompt:
      "Step 8/10: Insights\nWelche neuen Realisierungen hast du?",
  },
  {
    key: "lessons",
    prompt:
      "Step 9/10: Lessons Learned\nWelche wichtigste Lektion nimmst du mit?",
  },
  {
    key: "hits",
    prompt:
      "Step 10/10: Hits\nAny constraints for the Four Hits? (or reply: generate)",
  },
];

function doorFlowTemplate() {
  const now = new Date().toISOString();
  return {
    version: 1,
    updated_at: now,
    hotlist: [],
    doorwars: [],
    warstacks: [],
    profits: [],
    active_chats: {},
  };
}

function loadDoorFlow() {
  try {
    if (!fs.existsSync(DOOR_FLOW_PATH)) return doorFlowTemplate();
    const raw = fs.readFileSync(DOOR_FLOW_PATH, "utf8");
    const data = JSON.parse(raw);
    const flow = data && typeof data === "object" ? data : doorFlowTemplate();
    flow.hotlist = Array.isArray(flow.hotlist) ? flow.hotlist : [];
    flow.doorwars = Array.isArray(flow.doorwars) ? flow.doorwars : [];
    flow.warstacks = Array.isArray(flow.warstacks) ? flow.warstacks : [];
    flow.profits = Array.isArray(flow.profits) ? flow.profits : [];
    flow.active_chats =
      flow.active_chats && typeof flow.active_chats === "object"
        ? flow.active_chats
        : {};
    return flow;
  } catch (_) {
    return doorFlowTemplate();
  }
}

function saveDoorFlow(flow) {
  try {
    const payload = flow && typeof flow === "object" ? flow : doorFlowTemplate();
    payload.updated_at = new Date().toISOString();
    ensureDir(path.dirname(DOOR_FLOW_PATH));
    fs.writeFileSync(DOOR_FLOW_PATH, JSON.stringify(payload, null, 2), "utf8");
  } catch (_) {}
}

function makeDoorGuid() {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${stamp}${rand}`;
}

function doorShortId(guid) {
  return String(guid || "").slice(0, 8);
}

function findWarstack(flow, idOrPrefix) {
  const ref = String(idOrPrefix || "").trim();
  if (!ref) return null;
  return flow.warstacks.find((entry) => {
    if (!entry || !entry.guid) return false;
    if (entry.guid === ref) return true;
    if (entry.short_id === ref) return true;
    return entry.guid.startsWith(ref);
  });
}

function normalizeDomain(value) {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("body")) return "Body";
  if (raw.includes("being")) return "Being";
  if (raw.includes("balance")) return "Balance";
  if (raw.includes("business")) return "Business";
  return value ? String(value).trim() : "Business";
}

function doorProjectFromTitle(title) {
  const value = String(title || "").trim();
  return value || "Door";
}

function evaluateEisenhowerMatrix(item) {
  const title = String(item?.title || "");
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  let importanceScore = 0;
  let urgencyScore = 0;

  if (tags.includes("business") || tags.includes("career")) importanceScore += 3;
  if (tags.includes("health") || tags.includes("body")) importanceScore += 3;
  if (tags.includes("relationship") || tags.includes("balance")) importanceScore += 2;
  if (title.toLowerCase().includes("goal") || title.toLowerCase().includes("vision")) {
    importanceScore += 2;
  }
  if ((item?.priority || 0) >= 3) importanceScore += 2;

  if (tags.includes("urgent") || title.includes("!")) urgencyScore += 3;
  if ((item?.priority || 0) >= 4) urgencyScore += 2;
  if (item?.created) {
    const daysSince =
      (Date.now() - new Date(item.created).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) urgencyScore += 1;
    if (daysSince > 14) urgencyScore += 2;
  }

  const isImportant = importanceScore >= 3;
  const isUrgent = urgencyScore >= 3;
  let quadrant = 4;
  if (isImportant && isUrgent) quadrant = 1;
  else if (isImportant && !isUrgent) quadrant = 2;
  else if (!isImportant && isUrgent) quadrant = 3;

  return {
    quadrant,
    importanceScore,
    urgencyScore,
    isImportant,
    isUrgent,
    reasoning: `Importance: ${importanceScore}/10, Urgency: ${urgencyScore}/10`,
  };
}

function renderWarStackMarkdown(entry) {
  const responses = entry.responses || {};
  const title = entry.title || "War Stack";
  const lines = [];
  lines.push(`# War Stack – ${title}`);
  lines.push("");
  lines.push(`**Domain:** ${responses.domain || "-"}`);
  lines.push(`**Domino Door:** ${responses.domino_door || "-"}`);
  lines.push(`**Trigger:** ${responses.trigger || "-"}`);
  lines.push("");
  lines.push("**Narrative:**");
  lines.push(responses.narrative || "-");
  lines.push("");
  lines.push("**Validation:**");
  lines.push(responses.validation || "-");
  lines.push("");
  lines.push("**Impact:**");
  lines.push(responses.impact || "-");
  lines.push("");
  lines.push("**Consequences:**");
  lines.push(responses.consequences || "-");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Insights");
  lines.push(responses.insights || "-");
  lines.push("");
  lines.push("## Lessons Learned");
  lines.push(responses.lessons || "-");
  lines.push("");
  return lines.join("\n");
}

function renderHotListMarkdown(items) {
  const lines = [];
  lines.push("# Hot List – Guardian of Ideas");
  lines.push("");
  (items || []).forEach((item, idx) => {
    const title = typeof item === "string" ? item : item?.title;
    if (title) lines.push(`${idx + 1}. ${title}`);
  });
  lines.push("");
  lines.push("> Wähle aus dieser Liste deine Domino Door im Door War.");
  return lines.join("\n");
}

function renderDoorWarMarkdown(candidates, choice, reasoning) {
  const lines = [];
  lines.push("# Door War – Quadrant-2 Entscheidung");
  lines.push("");
  lines.push("## Kandidaten (aus der Hot List)");
  lines.push("");
  (candidates || []).forEach((item) => {
    const title = typeof item === "string" ? item : item?.title;
    if (title) lines.push(`- [ ] ${title}`);
  });
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Gewählte Domino Door");
  lines.push("");
  lines.push(`**Door:** ${choice || "_hier deine Wahl eintragen_"}`);
  lines.push("");
  lines.push(`**Grund:** ${reasoning || "_warum genau diese Door?_"}`);
  lines.push("");
  lines.push("> Nächster Schritt: Erzeuge den War Stack zu dieser Door.");
  return lines.join("\n");
}

function renderHitsMarkdown(entry) {
  const title = entry.title || "War Stack";
  const hits = Array.isArray(entry.hits) ? entry.hits : [];
  const lines = [];
  lines.push(`# Weekly Jar – Hits for ${title}`);
  lines.push("");
  hits.forEach((hit, idx) => {
    lines.push(`## Hit ${idx + 1}`);
    lines.push(`- **Fact:** ${hit.fact || "-"}`);
    lines.push(`- **Obstacle:** ${hit.obstacle || "-"}`);
    lines.push(`- **Strike:** ${hit.strike || "-"}`);
    lines.push(`- **Responsibility:** ${hit.responsibility || "-"}`);
    lines.push("");
  });
  return lines.join("\n");
}

function generateHitsForDomain(domain) {
  const templates = {
    Body: [
      {
        fact: "Establish daily fitness routine",
        obstacle: "Time constraints",
        strike: "Block 30min morning slot",
      },
      {
        fact: "Optimize nutrition plan",
        obstacle: "Food prep time",
        strike: "Meal prep on Sunday",
      },
      {
        fact: "Track health metrics",
        obstacle: "Forgetting to measure",
        strike: "Set reminders",
      },
      {
        fact: "Build sustainable habits",
        obstacle: "Motivation dips",
        strike: "Accountability partner",
      },
    ],
    Being: [
      {
        fact: "Daily meditation practice",
        obstacle: "Busy schedule",
        strike: "5-min minimum commitment",
      },
      {
        fact: "Weekly reflection sessions",
        obstacle: "Resistance to introspection",
        strike: "Structured prompts",
      },
      {
        fact: "Spiritual growth activity",
        obstacle: "Lack of direction",
        strike: "Find mentor/guide",
      },
      {
        fact: "Consistent journaling",
        obstacle: "Nothing to write",
        strike: "Daily gratitude focus",
      },
    ],
    Balance: [
      {
        fact: "Quality time with partner",
        obstacle: "Work distractions",
        strike: "Phone-free evenings",
      },
      {
        fact: "Family activity planning",
        obstacle: "Scheduling conflicts",
        strike: "Monthly family calendar",
      },
      {
        fact: "Friend connection maintenance",
        obstacle: "Distance",
        strike: "Weekly check-ins",
      },
      {
        fact: "Social boundary setting",
        obstacle: "People pleasing",
        strike: "Practice saying no",
      },
    ],
    Business: [
      {
        fact: "Revenue milestone progress",
        obstacle: "Market uncertainty",
        strike: "Diversify income streams",
      },
      {
        fact: "Skill development completion",
        obstacle: "Learning overwhelm",
        strike: "Focus on one skill",
      },
      {
        fact: "Network expansion",
        obstacle: "Introversion",
        strike: "Attend one event weekly",
      },
      {
        fact: "System optimization",
        obstacle: "Analysis paralysis",
        strike: "Implement incrementally",
      },
    ],
  };

  const normalized = normalizeDomain(domain);
  const base = templates[normalized] || templates.Business;
  return base.map((hit, idx) => ({
    id: `hit-${idx + 1}`,
    fact: hit.fact,
    obstacle: hit.obstacle,
    strike: hit.strike,
    responsibility: "Self",
  }));
}

function writeDoorMarkdown(tool, title, markdown) {
  const dir = resolveDoorExportDir(tool);
  ensureDir(dir);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = safeFilename(title) || `${tool || "door"}_${stamp}`;
  const filename = `${base}.md`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, `${markdown}\n`, "utf8");
  return filepath;
}

function safeFilename(name) {
  return String(name || "")
    .replace(/[\\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function makeSyncId(prefix) {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix || "aos"}-${stamp}-${rand}`;
}

function loadSyncMap() {
  try {
    if (!fs.existsSync(SYNC_MAP_PATH)) return [];
    const raw = fs.readFileSync(SYNC_MAP_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function saveSyncMap(entries) {
  try {
    ensureDir(path.dirname(SYNC_MAP_PATH));
    fs.writeFileSync(SYNC_MAP_PATH, JSON.stringify(entries, null, 2), "utf8");
  } catch (_) {}
}

function appendSyncEntry(entry) {
  const list = loadSyncMap();
  list.push(entry);
  saveSyncMap(list);
}

function loadTaskwarriorExport() {
  const now = Date.now();
  if (TASK_CACHE_TTL > 0 && now - TASK_CACHE.ts < TASK_CACHE_TTL * 1000 && TASK_CACHE.tasks.length) {
    return { ok: true, tasks: TASK_CACHE.tasks, source: "cache" };
  }

  const readExportFile = (allowStale = false) => {
    try {
      if (!TASK_EXPORT_PATH || !fs.existsSync(TASK_EXPORT_PATH)) return null;
      const st = fs.statSync(TASK_EXPORT_PATH);
      if (!allowStale && TASK_CACHE_TTL > 0 && now - st.mtimeMs > TASK_CACHE_TTL * 1000) {
        return null;
      }
      const raw = fs.readFileSync(TASK_EXPORT_PATH, "utf8");
      const tasks = JSON.parse(raw);
      if (!Array.isArray(tasks)) return null;
      TASK_CACHE = { ts: now, tasks, error: null };
      return { ok: true, tasks, source: allowStale ? "file-stale" : "file" };
    } catch (_) {
      return null;
    }
  };

  const fileFresh = readExportFile(false);
  if (fileFresh) return fileFresh;

  const args = [];
  if (TASK_EXPORT_FILTER) {
    args.push(...TASK_EXPORT_FILTER.split(/\s+/).filter(Boolean));
  }
  args.push("export");

  try {
    const env = TASKRC ? { ...process.env, TASKRC } : process.env;
    const stdout = execFileSync(TASK_BIN, args, { encoding: "utf8", timeout: 8000, env });
    const tasks = JSON.parse(stdout);
    if (!Array.isArray(tasks)) return { ok: false, error: "invalid-export" };
    TASK_CACHE = { ts: now, tasks, error: null };
    try {
      if (TASK_EXPORT_PATH) {
        ensureDir(path.dirname(TASK_EXPORT_PATH));
        const tmp = `${TASK_EXPORT_PATH}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(tasks, null, 2), "utf8");
        fs.renameSync(tmp, TASK_EXPORT_PATH);
      }
    } catch (_) {}
    return { ok: true, tasks, source: "live" };
  } catch (err) {
    const fileStale = readExportFile(true);
    if (fileStale) {
      return { ...fileStale, warning: "task-export-failed" };
    }
    if (TASK_CACHE.tasks.length) {
      return { ok: true, tasks: TASK_CACHE.tasks, source: "cache", warning: "task-export-failed" };
    }
    return { ok: false, error: String(err) };
  }
}

function isSyncTag(tags) {
  if (!Array.isArray(tags)) return false;
  return tags.some((tag) => SYNC_TAGS.includes(String(tag)));
}

function resolveDoorChapterPaths(source) {
  const vault = getVaultDir();
  const blueprints = [
    "25 - Door.md",
    "26 - Possibilities.md",
    "27 - Door War.md",
    "28 - War Stack.md",
    "29 - Production.md",
    "30 - Profit.md",
    "31 - Door Summary.md",
  ].map((name) => path.join(vault, "AlphaOS-blueprints", name));

  if (source === "alphaos") {
    return [path.join(vault, "ALPHA_OS", "ALPHA_OS - THE DOOR.md")];
  }

  return blueprints;
}

function loadDoorChapters(source) {
  const paths = resolveDoorChapterPaths(source);
  const chapters = [];

  for (const filePath of paths) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const title = path.basename(filePath, ".md");
      chapters.push({ title, content, path: filePath });
    } catch (_) {
      continue;
    }
  }

  return chapters;
}

function loadGameChapters(source) {
  if (source === "blueprints") {
    // Combine the Game-related blueprint chapters (32–42)
    const files = [
      "32 - Frame.md",
      "33 - Freedom.md",
      "34 - Focus.md",
      "35 - Fire.md",
      "36 - Game.md",
      "37 - The Life.md",
      "38 - The Mission.md",
      "39 - The Fire.md",
      "40 - The Daily.md",
      "41 - General_s Tent.md",
      "42 - The Alpha Odyssey.md",
    ];

    const chunks = [];
    for (const name of files) {
      const p = path.join(getVaultDir(), "AlphaOS-blueprints", name);
      if (!fs.existsSync(p)) continue;
      try {
        chunks.push(fs.readFileSync(p, "utf8"));
      } catch (err) {
        // skip broken file
      }
    }

    if (!chunks.length) return null;

    return {
      title: "Game (Blueprints)",
      content: chunks.join("\n\n"),
      path: "AlphaOS-blueprints (32-42)",
    };
  }

  // Default: full ALPHA_OS Game doc
  const content = loadDoc("game");
  if (!content) return null;
  return { title: "AlphaOS Game", content, path: DOC_PATHS.game?.[0] || "" };
}

function resolveLatestDir(type) {
  const vault = getVaultDir();
  const map = {
    frame: path.join(vault, "Game", "Frame"),
    freedom: path.join(vault, "Game", "Freedom"),
    focus: path.join(vault, "Game", "Focus"),
    fire: path.join(vault, "Game", "Fire"),
    voice: path.join(vault, "VOICE"),
  };
  return map[type] || null;
}

function resolveGameExportDir(map) {
  const vault = getVaultDir();
  const dirs = {
    frame: path.join(vault, "Game", "Frame"),
    freedom: path.join(vault, "Game", "Freedom"),
    focus: path.join(vault, "Game", "Focus"),
    fire: path.join(vault, "Game", "Fire"),
  };
  return dirs[String(map || "").toLowerCase()] || null;
}

const DOC_PATHS = {
  foundation: [
    path.join(getVaultDir(), "ALPHA_OS", "AlphaOS-THE-FOUNDATION.md"),
    path.join(getVaultDir(), "ALPHA_OS", "ALPHA_OS - THE FOUNDATION.md"),
  ],
  code: [
    path.join(getVaultDir(), "ALPHA_OS", "AlphaOS-THE-ALPHA-CODE.md"),
    path.join(getVaultDir(), "ALPHA_OS", "ALPHA_OS - THE ALPHA-CODE.md"),
  ],
  core: [
    path.join(getVaultDir(), "ALPHA_OS", "AlphaOS-THE-CORE-FOUR.md"),
    path.join(getVaultDir(), "ALPHA_OS", "ALPHA_OS - THE CORE FOUR.md"),
  ],
  door: [
    path.join(getVaultDir(), "ALPHA_OS", "AlphaOS-THE-DOOR.md"),
    path.join(getVaultDir(), "ALPHA_OS", "AphaOS-THE-DOOR.md"),
    path.join(getVaultDir(), "ALPHA_OS", "ALPHA_OS - THE DOOR.md"),
  ],
  game: [
    path.join(getVaultDir(), "ALPHA_OS", "AlphaOS-THE-GAME.md"),
    path.join(getVaultDir(), "ALPHA_OS", "ALPHA_OS - THE GAME.md"),
  ],
  voice: [
    path.join(getVaultDir(), "ALPHA_OS", "AlphaOS-THE-VOICE.md"),
    path.join(getVaultDir(), "ALPHA_OS", "ALPHA_OS - THE VOICE.md"),
  ],
};

function loadDoc(name) {
  const paths = DOC_PATHS[name];
  if (!Array.isArray(paths)) return null;
  const chunks = [];
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        chunks.push(fs.readFileSync(p, "utf8"));
      }
    } catch (_) {}
  }
  if (!chunks.length) return null;
  return chunks.join("\n\n");
}

function isSkippableDir(name) {
  const skip = new Set([
    ".git",
    ".obsidian",
    "Templates",
    "templates",
    "Archive",
    "ARCHIVE",
    "System",
    "SYSTEM",
    "node_modules",
  ]);
  return skip.has(name);
}

function findLatestMarkdown(dirPath) {
  let latest = null;

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (isSkippableDir(entry.name)) continue;
        walk(path.join(dir, entry.name));
        continue;
      }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
      const full = path.join(dir, entry.name);
      let stat;
      try {
        stat = fs.statSync(full);
      } catch (_) {
        continue;
      }
      if (!latest || stat.mtimeMs > latest.mtimeMs) {
        latest = { path: full, mtimeMs: stat.mtimeMs };
      }
    }
  }

  walk(dirPath);
  return latest;
}

function extractTitleAndExcerpt(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  let idx = 0;
  if (lines[0] === "---") {
    idx = 1;
    while (idx < lines.length && lines[idx] !== "---") idx += 1;
    if (idx < lines.length) idx += 1;
  }
  let title = "";
  for (let i = idx; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith("#")) {
      title = line.replace(/^#+\s*/, "").trim();
      idx = i + 1;
      break;
    }
    if (line) {
      title = line.slice(0, 80);
      idx = i + 1;
      break;
    }
  }
  if (!title) title = path.basename(filePath, ".md");

  const excerptLines = [];
  for (let i = idx; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    excerptLines.push(line);
    if (excerptLines.join(" ").length > 400) break;
  }
  const excerpt = excerptLines.join(" ").slice(0, 400);
  return { title, excerpt };
}


// UI JSON
app.get("/menu", (_req, res) => {
  try {
    const doc = yaml.load(fs.readFileSync(MENU_PATH, "utf8"));
    const links = Array.isArray(doc?.links) ? doc.links : [];
    res.json({ links });
  } catch (err) {
    res.status(500).json({ links: [], error: String(err) });
  }
});

// Mount routers
app.use("/game", gameRouter);

// Centre routes (legacy redirects)
app.get("/generals", (_req, res) => res.redirect(302, "/game/tent"));
app.get("/tent", (_req, res) => res.redirect(302, "/game/tent"));
app.get("/door", (_req, res) => res.redirect(302, "/door/"));
app.get("/memoirs", (_req, res) => res.redirect(302, "/memoirs/"));
app.get("/voice", (_req, res) => res.redirect(302, "/memoirs/"));
app.get("/game/memoirs", (_req, res) => res.redirect(302, "/memoirs/"));
app.get("/game/frame", (_req, res) => res.redirect(302, "/game/frame.html"));
app.get("/game/freedom", (_req, res) => res.redirect(302, "/game/freedom.html"));
app.get("/game/focus", (_req, res) => res.redirect(302, "/game/focus.html"));
app.get("/game/fire", (_req, res) => res.redirect(302, "/game/fire.html"));
app.get("/tele", (_req, res) => res.redirect(302, "/tele.html"));

// GPT redirects
app.get("/gpt/:slug", (req, res) => {
  const slug = String(req.params.slug || "");
  const centre = findCentreBySlug(slug);
  if (!centre || !centre.url) {
    return res.status(404).send(`Unknown GPT centre: ${slug}`);
  }
  return res.redirect(302, centre.url);
});

// General's Tent report save (local markdown)
app.post("/api/generals/report", (req, res) => {
  try {
    const markdown = String(req.body?.markdown || "").trim();
    if (!markdown) {
      return res.status(400).json({ ok: false, error: "missing markdown" });
    }
    const week = sanitizeWeek(req.body?.week);
    const dir = getGeneralsDir();
    ensureDir(dir);
    const filename = `generals_tent_${week}.md`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, markdown + "\n", "utf8");
    return res.json({ ok: true, week, path: filepath });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Fruits Centre data (local JSON)
app.get("/api/fruits", (_req, res) => {
  try {
    const store = loadFruitsStore();
    const questions = loadFruitsQuestions();
    return res.json({
      ok: true,
      mapTitle: FRUITS_MAP_TITLE,
      mapSubtitle: FRUITS_MAP_SUBTITLE,
      questions,
      emojis: FRUIT_EMOJIS,
      answers: flattenFruitsAnswers(store),
      skipped: store.skipped,
      updated_at: store.updated_at || "",
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get("/api/fruits/users", (_req, res) => {
  try {
    const store = loadFruitsStore();
    const users = Object.values(store.users || {}).map((u) => ({
      chat_id: String(u.chat_id || ""),
      user_name: String(u.user_name || ""),
      status: String(u.status || ""),
      last_section: String(u.last_section || ""),
      last_question: String(u.last_question || ""),
      started_at: String(u.started_at || ""),
    }));
    return res.json({ ok: true, users });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post("/api/fruits/register", (req, res) => {
  try {
    const chatId = String(req.body?.chat_id || "").trim();
    const userName = String(req.body?.user_name || "").trim();
    if (!chatId) return res.status(400).json({ ok: false, error: "missing chat_id" });
    const store = loadFruitsStore();
    updateFruitsUser(store, chatId, userName);
    saveFruitsStore(store);
    return res.json({ ok: true, chat_id: chatId });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post("/api/fruits/next", (req, res) => {
  try {
    const chatId = String(req.body?.chat_id || "").trim();
    const userName = String(req.body?.user_name || "").trim();
    const store = loadFruitsStore();
    if (chatId) updateFruitsUser(store, chatId, userName);

    let nextQ = firstUnansweredFruit(store);
    const answers = flattenFruitsAnswers(store);
    if (!nextQ && store.skipped && store.skipped.question) {
      if (answers[store.skipped.question] === "_geskippt_") {
        nextQ = store.skipped;
      }
    }

    if (!nextQ) {
      if (chatId) setFruitsLastQuestion(store, chatId, "", "");
      saveFruitsStore(store);
      return res.json({ ok: true, done: true, pending_skip: hasPendingFruitsSkip(store) });
    }

    if (chatId) setFruitsLastQuestion(store, chatId, nextQ.section, nextQ.question);
    saveFruitsStore(store);
    return res.json({
      ok: true,
      done: false,
      section: nextQ.section,
      question: nextQ.question,
      pending_skip: hasPendingFruitsSkip(store),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post("/api/fruits/answer", (req, res) => {
  try {
    const answer = String(req.body?.answer || "").trim();
    if (!answer) return res.status(400).json({ ok: false, error: "missing answer" });

    let question = String(req.body?.question || "").trim();
    let section = String(req.body?.section || "").trim();
    const source = String(req.body?.source || "webapp").trim();
    const chatId = String(req.body?.chat_id || "").trim();
    const userName = String(req.body?.user_name || "").trim();

    const store = loadFruitsStore();
    if (chatId) updateFruitsUser(store, chatId, userName);

    if (!question && chatId) {
      const last = getFruitsLastQuestion(store, chatId);
      question = last.question;
      section = section || last.section;
    }

    if (!question) {
      return res.status(400).json({ ok: false, error: "missing question" });
    }

    if (!section) section = findFruitsSection(question);
    if (!section) {
      return res.status(400).json({ ok: false, error: "unknown question" });
    }

    if (answer === "_geskippt_") {
      if (store.skipped && store.skipped.question && store.skipped.question !== question) {
        return res.status(400).json({ ok: false, error: "skip already used" });
      }
      store.skipped = { question, section };
    } else if (store.skipped && store.skipped.question === question) {
      store.skipped = null;
    }

    const mode = store.answers[question] ? "updated" : "inserted";
    store.answers[question] = {
      question,
      section,
      answer,
      source,
      chat_id: chatId,
      updated_at: new Date().toISOString(),
    };

    if (chatId) setFruitsLastQuestion(store, chatId, "", "");
    saveFruitsStore(store);
    return res.json({ ok: true, mode, question, section });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post("/api/fruits/skip", (req, res) => {
  try {
    let question = String(req.body?.question || "").trim();
    let section = String(req.body?.section || "").trim();
    const chatId = String(req.body?.chat_id || "").trim();
    const userName = String(req.body?.user_name || "").trim();

    const store = loadFruitsStore();
    if (chatId) updateFruitsUser(store, chatId, userName);

    if (!question && chatId) {
      const last = getFruitsLastQuestion(store, chatId);
      question = last.question;
      section = section || last.section;
    }
    if (!question) return res.status(400).json({ ok: false, error: "missing question" });
    if (!section) section = findFruitsSection(question);
    if (!section) return res.status(400).json({ ok: false, error: "unknown question" });

    if (store.skipped && store.skipped.question && store.skipped.question !== question) {
      return res.status(400).json({ ok: false, error: "skip already used" });
    }

    store.skipped = { question, section };
    store.answers[question] = {
      question,
      section,
      answer: "_geskippt_",
      source: "skip",
      chat_id: chatId,
      updated_at: new Date().toISOString(),
    };

    if (chatId) setFruitsLastQuestion(store, chatId, "", "");
    saveFruitsStore(store);
    return res.json({ ok: true, question, section });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post("/api/fruits/export", (_req, res) => {
  try {
    const store = loadFruitsStore();
    const questions = loadFruitsQuestions();
    const answers = flattenFruitsAnswers(store);
    const dateLabel = new Date().toLocaleDateString("de-AT");
    let md = "# AlphaOS Fruits Frame Map\n";
    md += `Completed: ${dateLabel}\n\n`;
    for (const [section, list] of Object.entries(questions)) {
      md += `## ${section}\n\n`;
      if (!Array.isArray(list)) continue;
      for (const q of list) {
        const ans = answers[q] || "_noch offen_";
        md += `**${q}**\n\n${ans}\n\n---\n\n`;
      }
    }

    ensureDir(FRUITS_EXPORT_DIR);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `Fruits_Frame_Map_${stamp}.md`;
    const filepath = path.join(FRUITS_EXPORT_DIR, filename);
    fs.writeFileSync(filepath, md, "utf8");

    const rcloneInfo = queueVaultSync();
    return res.json({ ok: true, name: filename, path: filepath, rclone: rcloneInfo });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Door export (local markdown)
app.post("/api/door/export", async (req, res) => {
  try {
    const markdownRaw = String(req.body?.markdown || "").trim();
    if (!markdownRaw) {
      return res.status(400).json({ ok: false, error: "missing markdown" });
    }

    const sessionId = String(req.body?.sessionId || "").trim();
    const createTasks = req.body?.createTasks !== false; // Default true

    // Parse War Stack markdown
    const parsed = parseWarStackMarkdown(markdownRaw);
    if (!parsed.hits || parsed.hits.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "no hits found in markdown - expected ### Hit 1-4 sections"
      });
    }

    // Determine filepath
    const dir = path.join(os.homedir(), "AlphaOS-Vault", "Door", "War-Stacks");
    ensureDir(dir);
    const stamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const base = safeFilename(parsed.title) || `warstack_${stamp}`;
    const filename = `${stamp}_${base}.md`;
    const filepath = path.join(dir, filename);

    let markdown = markdownRaw;
    let wired = null;

    // Create Taskwarrior tasks if requested
    if (createTasks && BRIDGE_URL) {
      // Build task objects
      const tasks = buildWarStackTasks(parsed, {
        sessionId,
        filePath: filepath,
        title: parsed.title
      });

      if (tasks.length === 0) {
        return res.status(400).json({
          ok: false,
          error: "failed to build tasks from parsed data"
        });
      }

      // Create all tasks via Bridge
      const result = await createTaskwarriorTask(tasks);

      if (!result.ok) {
        return res.status(502).json({
          ok: false,
          error: `taskwarrior creation failed: ${result.error}`
        });
      }

      // Wire dependencies
      wired = wireWarStackDependencies(result.results);

      // Update Door task with depends: [hit1, hit2, hit3, hit4]
      if (wired.door_uuid && wired.hit_uuids.length > 0) {
        await updateTaskwarriorTask(wired.door_uuid, {
          depends: wired.hit_uuids
        });
      }

      // Update Profit task with depends: [door_uuid]
      if (wired.profit_uuid && wired.door_uuid) {
        await updateTaskwarriorTask(wired.profit_uuid, {
          depends: [wired.door_uuid]
        });
      }

      // Update markdown with UUIDs
      markdown = updateMarkdownWithUUIDs(markdownRaw, wired);
    }

    // Write markdown to file
    fs.writeFileSync(filepath, markdown + "\n", "utf8");

    // Save to .door-flow.json
    if (wired) {
      const flow = loadDoorFlow();
      flow.warstacks.push({
        door_task_uuid: wired.door_uuid,
        door_task_id: wired.door_task_id,
        profit_task_uuid: wired.profit_uuid,
        profit_task_id: wired.profit_task_id,
        hit_uuids: wired.hit_uuids,
        title: parsed.title,
        domain: parsed.domain,
        filepath,
        session_id: sessionId,
        created_at: new Date().toISOString()
      });
      saveDoorFlow(flow);
    }

    const rcloneInfo = queueVaultSync();

    return res.json({
      ok: true,
      path: filepath,
      parsed: {
        title: parsed.title,
        domain: parsed.domain,
        hit_count: parsed.hits.length
      },
      tasks: wired ? {
        door_uuid: wired.door_uuid,
        door_task_id: wired.door_task_id,
        profit_uuid: wired.profit_uuid,
        profit_task_id: wired.profit_task_id,
        hits: wired.hits
      } : null,
      rclone: rcloneInfo,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get("/api/door/flow", (_req, res) => {
  try {
    const flow = loadDoorFlow();
    return res.json({ ok: true, flow });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get("/api/door/hotlist", (_req, res) => {
  try {
    const flow = loadDoorFlow();
    return res.json({ ok: true, items: flow.hotlist || [] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post("/api/door/hotlist", async (req, res) => {
  try {
    const raw = req.body?.items ?? req.body?.text ?? "";
    const source = String(req.body?.source || "manual");
    const domain = String(req.body?.domain || "Business").trim();
    const list = Array.isArray(raw)
      ? raw.map((item) => {
          // Handle object with title property or plain string
          if (typeof item === "object" && item !== null && item.title) {
            return String(item.title).trim();
          }
          return String(item || "").trim();
        }).filter(Boolean)
      : String(raw)
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

    if (!list.length) {
      return res.status(400).json({ ok: false, error: "missing items" });
    }

    // Create Taskwarrior tasks via Bridge
    const tasks = list.map((title) => ({
      description: title,
      tags: ["potential", domain.toLowerCase()],
      project: "HotList",
      meta: {
        source,
        domain,
        created_via: "index-node"
      }
    }));

    const result = await createTaskwarriorTask(tasks);

    if (!result.ok) {
      return res.status(502).json({
        ok: false,
        error: `taskwarrior creation failed: ${result.error}`
      });
    }

    // Save UUIDs to .door-flow.json (UUID-only format)
    const flow = loadDoorFlow();
    const entries = result.results.map((r, idx) => ({
      task_uuid: r.task_uuid,
      task_id: r.task_id,
      title: list[idx],
      source,
      domain,
      created_at: new Date().toISOString()
    }));

    flow.hotlist.push(...entries);
    saveDoorFlow(flow);

    return res.json({ ok: true, items: entries });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post("/api/door/doorwar", async (req, res) => {
  try {
    const choice = String(req.body?.choice || "").trim();
    const reasoning = String(req.body?.reasoning || "").trim();
    const domain = String(req.body?.domain || "Business").trim();

    // Load Hot List from flow
    const flow = loadDoorFlow();
    const hotlist = flow.hotlist || [];

    if (!hotlist.length) {
      return res.status(400).json({
        ok: false,
        error: "hot list is empty - add items first via POST /api/door/hotlist"
      });
    }

    // Evaluate Hot List items with Eisenhower Matrix
    const evaluated = hotlist.map((item) => ({
      ...item,
      evaluation: evaluateEisenhowerMatrix(item),
    }));

    // Auto-select Q2 Domino Door if no manual choice
    let selectedItem = null;
    if (choice) {
      // Find by title or UUID
      selectedItem = evaluated.find(
        (item) => item.title === choice || item.task_uuid === choice
      );
    } else {
      // Auto-recommend highest Q2 item
      const q2 = evaluated
        .filter((item) => item.evaluation?.quadrant === 2)
        .sort((a, b) => {
          const ia = a.evaluation?.importanceScore || 0;
          const ib = b.evaluation?.importanceScore || 0;
          return ib - ia;
        });
      if (q2.length) selectedItem = q2[0];
    }

    if (!selectedItem) {
      return res.status(400).json({
        ok: false,
        error: "no suitable door found (try selecting Q2 item manually)"
      });
    }

    // Create "Door" task in Taskwarrior via Bridge
    const domainTag = normalizeDomain(domain).toLowerCase();
    const doorTask = {
      description: `Door: ${selectedItem.title}`,
      tags: ["door", "plan", domainTag],
      project: doorProjectFromTitle(selectedItem.title),
      depends: selectedItem.task_uuid, // Depends on Hot List task
      meta: {
        hotlist_uuid: selectedItem.task_uuid,
        hotlist_title: selectedItem.title,
        eisenhower_quadrant: selectedItem.evaluation?.quadrant,
        created_via: "index-node"
      }
    };

    const result = await createTaskwarriorTask(doorTask);

    if (!result.ok) {
      return res.status(502).json({
        ok: false,
        error: `door task creation failed: ${result.error}`
      });
    }

    const doorTaskData = result.results[0];

    // Save to .door-flow.json
    const entry = {
      door_task_uuid: doorTaskData.task_uuid,
      door_task_id: doorTaskData.task_id,
      hotlist_uuid: selectedItem.task_uuid,
      selected_title: selectedItem.title,
      domain,
      reasoning: reasoning || `Q${selectedItem.evaluation?.quadrant} - ${selectedItem.evaluation?.reasoning}`,
      created_at: new Date().toISOString()
    };

    flow.doorwars.push(entry);
    saveDoorFlow(flow);

    // Export markdown (optional)
    const markdown = renderDoorWarMarkdown(evaluated, selectedItem.title, entry.reasoning);
    const title = `Door_War_${new Date().toISOString().slice(0, 10)}`;
    const filepath = writeDoorMarkdown("doorwar", title, markdown);

    const rcloneInfo = queueVaultSync();
    return res.json({
      ok: true,
      doorwar: entry,
      evaluated,
      selected: selectedItem,
      path: filepath,
      rclone: rcloneInfo,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post("/api/door/warstack/start", (req, res) => {
  try {
    const idRef = String(req.body?.id || "").trim();
    const title = String(req.body?.title || "War Stack").trim() || "War Stack";
    const door = String(req.body?.door || "").trim();
    const chatId = String(req.body?.chat_id || "").trim();
    const source = String(req.body?.source || "telegram").trim();

    const flow = loadDoorFlow();
    let entry = null;

    if (idRef) {
      entry = findWarstack(flow, idRef);
      if (!entry) {
        return res.status(404).json({ ok: false, error: "warstack not found" });
      }
    } else {
      const guid = makeDoorGuid();
      entry = {
        guid,
        short_id: doorShortId(guid),
        title,
        door,
        source,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "draft",
        current_step: WARSTACK_STEPS[0].key,
        responses: {},
        hits: [],
        files: {},
        ticktick: {},
      };
      flow.warstacks.push(entry);
    }

    if (chatId) flow.active_chats[chatId] = entry.guid;
    saveDoorFlow(flow);

    if (entry.status === "complete") {
      if (chatId) delete flow.active_chats[chatId];
      saveDoorFlow(flow);
      return res.json({
        ok: true,
        done: true,
        guid: entry.guid,
        short_id: entry.short_id,
      });
    }

    const step = WARSTACK_STEPS.find((s) => s.key === entry.current_step) || WARSTACK_STEPS[0];
    return res.json({
      ok: true,
      guid: entry.guid,
      short_id: entry.short_id,
      step: step.key,
      prompt: step.prompt,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post("/api/door/warstack/answer", async (req, res) => {
  try {
    const idRef = String(req.body?.id || "").trim();
    const chatId = String(req.body?.chat_id || "").trim();
    const answer = String(req.body?.answer || "").trim();
    if (!answer) {
      return res.status(400).json({ ok: false, error: "missing answer" });
    }

    const flow = loadDoorFlow();
    let entry = null;
    if (idRef) entry = findWarstack(flow, idRef);
    if (!entry && chatId && flow.active_chats[chatId]) {
      entry = findWarstack(flow, flow.active_chats[chatId]);
    }
    if (!entry) {
      return res.status(404).json({ ok: false, error: "warstack not found" });
    }
    if (entry.status === "complete") {
      return res.json({ ok: true, done: true, guid: entry.guid });
    }

    const stepKey = entry.current_step || WARSTACK_STEPS[0].key;
    entry.responses = entry.responses || {};
    if (stepKey === "domain") {
      const normalized = normalizeDomain(answer);
      entry.responses.domain = normalized;
      entry.domain = normalized;
    } else {
      entry.responses[stepKey] = answer;
    }
    entry.updated_at = new Date().toISOString();

    const stepIndex = WARSTACK_STEPS.findIndex((s) => s.key === stepKey);
    const nextIndex = stepIndex + 1;

    if (stepKey === "hits" || nextIndex >= WARSTACK_STEPS.length) {
      const domain = entry.responses.domain || "Business";
      entry.hits = generateHitsForDomain(domain);
      entry.status = "complete";
      entry.completed_at = new Date().toISOString();
      entry.current_step = null;

      const warstackMd = renderWarStackMarkdown(entry);
      const hitsMd = renderHitsMarkdown(entry);
      const warstackPath = writeDoorMarkdown(
        "warstack",
        `WarStack_${safeFilename(entry.title)}_${entry.short_id}`,
        warstackMd
      );
      const hitsPath = writeDoorMarkdown(
        "hitlist",
        `Hits_${safeFilename(entry.title)}_${entry.short_id}`,
        hitsMd
      );
      entry.files = { warstack: warstackPath, hits: hitsPath };

      if (DOOR_HITS_TICKTICK) {
        const { token } = getTickConfig();
        if (token) {
          entry.ticktick = entry.ticktick || {};
          entry.ticktick.hits = [];
          await Promise.all(
            entry.hits.map(async (hit, idx) => {
              try {
                const created = await ticktickCreateTask({
                  title: `Hit ${idx + 1}: ${hit.fact}`,
                  content: `Obstacle: ${hit.obstacle}\nStrike: ${hit.strike}\nDoor: ${entry.title}`,
                  tags: DOOR_HITS_TAGS,
                });
                if (created?.id || created?.taskId || created?.task_id) {
                  entry.ticktick.hits.push({
                    hit_id: hit.id,
                    ticktick_id: created.id || created.taskId || created.task_id,
                  });
                }
              } catch (err) {
                console.error("TickTick hit failed:", err?.message || err);
              }
            })
          );
        }
      }

      if (chatId) {
        delete flow.active_chats[chatId];
      }
      saveDoorFlow(flow);
      const rcloneInfo = queueVaultSync();
      return res.json({
        ok: true,
        done: true,
        guid: entry.guid,
        short_id: entry.short_id,
        hits: entry.hits,
        files: entry.files,
        rclone: rcloneInfo,
      });
    }

    entry.current_step = WARSTACK_STEPS[nextIndex].key;
    saveDoorFlow(flow);
    return res.json({
      ok: true,
      done: false,
      guid: entry.guid,
      step: entry.current_step,
      prompt: WARSTACK_STEPS[nextIndex].prompt,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get("/api/door/warstack/:id", (req, res) => {
  try {
    const flow = loadDoorFlow();
    const entry = findWarstack(flow, req.params.id);
    if (!entry) return res.status(404).json({ ok: false, error: "not found" });
    return res.json({ ok: true, warstack: entry });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Fire Week (TickTick primary, GCal fallback, Taskwarrior offline fallback)
app.get("/api/fire/week", async (req, res) => {
  const { start, end, week, rangeLabel } = getWeekRangeLocal();
  let tasks = [];
  let error = null;
  let source = "ticktick";

  // Try TickTick FIRST (primary cloud source)
  try {
    const raw = await ticktickListProjectTasks();
    const filtered = raw
      .filter((task) => !task.isCompleted && !task.completedTime)
      .filter((task) => taskInRange(task, start, end))
      .map((task) => {
        const due = parseTickTickDue(task);
        return {
          id: task.id,
          title: task.title || "(no title)",
          tags: task.tags || [],
          due: due ? due.toISOString() : (task.dueDateTime || task.dueDate || ""),
          date: due ? due.toISOString() : (task.dueDateTime || task.dueDate || ""),
          domain: detectDomainFromTags(task.tags),
          overdue: due ? due < start : false
        };
      });

    tasks = filtered.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db;
    });
  } catch (tickErr) {
    // TickTick failed, try Taskwarrior as offline fallback
    source = "taskwarrior";
    error = tickErr?.message || String(tickErr);
    try {
      const { ok, error: taskError, tasks: twTasks } = loadTaskwarriorExport();
      if (!ok) throw new Error(taskError || "task-export-failed");

      const filtered = twTasks
        .filter((task) => {
          const st = String(task.status || "").toLowerCase();
          return st === "pending" || st === "waiting";
        })
        .filter((task) => {
          if (fireTaskInRange(task, start, end, true)) return true;
          if (!FIRE_INCLUDE_UNDATED) return false;
          if (fireTaskPrimaryDate(task)) return false;
          return fireTaskMatchesTags(task.tags, FIRE_TASK_TAGS);
        })
        .map((task) => normalizeFireTask(task, start));

      tasks = filtered.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
      error = null;
    } catch (twErr) {
      error = `TickTick: ${tickErr?.message || tickErr} | Taskwarrior: ${twErr?.message || twErr}`;
    }
  }

  return res.json({
    ok: tasks.length > 0 || !error,
    source,
    week,
    rangeLabel,
    tasks,
    error,
    gcal_url: FIRE_GCAL_EMBED_URL || "",
  });
});

// Fire Day (TickTick primary, Taskwarrior offline fallback)
app.get("/api/fire/day", async (req, res) => {
  const { start, end, label } = getDayRangeLocal();
  let tasks = [];
  let error = null;
  let source = "ticktick";

  // Try TickTick FIRST (primary cloud source)
  try {
    const raw = await ticktickListProjectTasks();
    const filtered = raw
      .filter((task) => !task.isCompleted && !task.completedTime)
      .filter((task) => taskInRange(task, start, end))
      .map((task) => {
        const due = parseTickTickDue(task);
        return {
          id: task.id,
          title: task.title || "(no title)",
          tags: task.tags || [],
          due: due ? due.toISOString() : (task.dueDateTime || task.dueDate || ""),
          date: due ? due.toISOString() : (task.dueDateTime || task.dueDate || ""),
          domain: detectDomainFromTags(task.tags),
          overdue: due ? due < start : false
        };
      });

    tasks = filtered.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db;
    });
  } catch (tickErr) {
    // TickTick failed, try Taskwarrior as offline fallback
    source = "taskwarrior";
    error = tickErr?.message || String(tickErr);
    try {
      const { ok, error: taskError, tasks: twTasks } = loadTaskwarriorExport();
      if (!ok) throw new Error(taskError || "task-export-failed");

      const filtered = twTasks
        .filter((task) => {
          const st = String(task.status || "").toLowerCase();
          return st === "pending" || st === "waiting";
        })
        .filter((task) => {
          if (fireTaskInRange(task, start, end, true)) return true;
          if (!FIRE_INCLUDE_UNDATED) return false;
          if (fireTaskPrimaryDate(task)) return false;
          return fireTaskMatchesTags(task.tags, FIRE_TASK_TAGS);
        })
        .map((task) => normalizeFireTask(task, start));

      tasks = filtered.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
      error = null;
    } catch (twErr) {
      error = `TickTick: ${tickErr?.message || tickErr} | Taskwarrior: ${twErr?.message || twErr}`;
    }
  }

  return res.json({
    ok: tasks.length > 0 || !error,
    source,
    date: label,
    tasks,
    error,
    gcal_url: FIRE_GCAL_EMBED_URL || "",
  });
});

app.get("/fire/day", (req, res) => {
  const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
  return res.redirect(302, `/api/fire/day${query}`);
});

app.get("/fire/week", (req, res) => {
  const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
  return res.redirect(302, `/api/fire/week${query}`);
});

app.get("/fired", (req, res) => {
  const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
  return res.redirect(302, `/api/fire/day${query}`);
});

app.get("/firew", (req, res) => {
  const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
  return res.redirect(302, `/api/fire/week${query}`);
});

// Fire Week Range (for next week planning UI)
app.get("/api/fire/week-range", (req, res) => {
  try {
    const dateParam = req.query?.date;
    const date = dateParam ? new Date(dateParam) : new Date();

    if (isNaN(date.getTime())) {
      return res.status(400).json({ ok: false, error: "invalid date" });
    }

    const { start, end, week, rangeLabel } = getWeekRangeLocal(date);

    // Calculate week dates for calendar display
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({
        date: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }),
        dayOfWeek: d.getDay()
      });
    }

    return res.json({
      ok: true,
      week,
      rangeLabel,
      start: start.toISOString(),
      end: end.toISOString(),
      days
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});


// Game map export (local markdown)
app.post("/api/game/export", (req, res) => {
  try {
    const markdownRaw = String(req.body?.markdown || "").trim();
    if (!markdownRaw) {
      return res.status(400).json({ ok: false, error: "missing markdown" });
    }
    const map = String(req.body?.map || "").trim().toLowerCase();
    const title = String(req.body?.title || "").trim();
    const ticktick = req.body?.ticktick === true;
    const dir = resolveGameExportDir(map);
    if (!dir) {
      return res.status(400).json({ ok: false, error: "unknown map" });
    }
    ensureDir(dir);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const base = safeFilename(title) || `${map}_${stamp}`;
    const filename = `${base}.md`;
    const filepath = path.join(dir, filename);

    let markdown = markdownRaw;
    let syncId = null;
    if (ticktick) {
      syncId = makeSyncId(`game-${map || "entry"}`);
      markdown = `${markdownRaw}\n\nSYNC-ID: ${syncId}`;
    }
    fs.writeFileSync(filepath, markdown + "\n", "utf8");

    const tickInfo = { ok: false, status: "skipped" };
    if (ticktick) {
      const { token } = getTickConfig();
      if (token) {
        tickInfo.syncId = syncId;
        tickInfo.ok = true;
        tickInfo.status = "queued";
        Promise.resolve()
          .then(() =>
            ticktickCreateTask({
              title: title || `${map.toUpperCase()} Map`,
              content: markdown,
              tags: ["game"],
            })
          )
          .then((created) => {
            if (!created) return;
            appendSyncEntry({
              syncId,
              ticktickId: created.id || created.taskId || created.task_id || "",
              scope: "game",
              map,
              title: title || "",
              path: filepath,
              createdAt: new Date().toISOString(),
            });
          })
          .catch((err) => {
            console.error("TickTick push failed:", err?.message || err);
          });
      } else {
        tickInfo.status = "missing-token";
      }
    }

    const rcloneInfo = queueVaultSync();

    return res.json({
      ok: true,
      map,
      path: filepath,
      ticktick: tickInfo,
      rclone: rcloneInfo,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// List saved Focus Maps
app.get("/api/game/focus/list", (req, res) => {
  try {
    const domain = String(req.query?.domain || "").trim().toUpperCase();
    const month = String(req.query?.month || "").trim();

    const focusDir = resolveGameExportDir("focus");
    if (!focusDir || !fs.existsSync(focusDir)) {
      return res.json({ ok: true, maps: [] });
    }

    const monthKey = month.toLowerCase();
    const phaseKeys = new Set(["current", "q1", "q2", "q3", "q4"]);

    const files = fs.readdirSync(focusDir)
      .filter(f => f.endsWith('.md'))
      .map(filename => {
        const filepath = path.join(focusDir, filename);
        const stat = fs.statSync(filepath);

        // Prefer YAML front matter (phase/month/domain); fall back to filename parsing.
        const parts = filename.replace('.md', '').split('_');
        const fileDomain = parts[0]?.toUpperCase() || '';

        let yamlMeta = {};
        try {
          const content = fs.readFileSync(filepath, "utf8");
          yamlMeta = extractYamlFrontMatter(content);
        } catch (_) {}

        const metaDomain = String(yamlMeta?.domain || fileDomain).trim().toUpperCase();
        const metaPhase = String(yamlMeta?.phase || "").trim().toLowerCase();
        const metaMonth = String(yamlMeta?.month || "").trim();

        return {
          filename,
          path: filepath,
          domain: metaDomain,
          phase: metaPhase,
          month: metaMonth,
          modified: stat.mtime
        };
      })
      .filter(map => {
        // Filter by domain if specified
        if (domain && map.domain !== domain) return false;
        // Filter by phase (current/q1/q2/q3/q4) if specified; otherwise try month label/filename match.
        if (month) {
          if (phaseKeys.has(monthKey)) {
            if (String(map.phase || "").toLowerCase() !== monthKey) return false;
          } else {
            const hay = `${map.month || ""} ${map.filename}`.toLowerCase();
            if (!hay.includes(monthKey)) return false;
          }
        }
        return true;
      })
      .sort((a, b) => b.modified - a.modified); // Most recent first

    return res.json({ ok: true, maps: files });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Load a specific Focus Map
app.get("/api/game/focus/load", (req, res) => {
  try {
    const filepath = String(req.query?.path || "").trim();
    if (!filepath) {
      return res.status(400).json({ ok: false, error: "missing path" });
    }

    // Security: ensure path is within Focus directory
    const focusDir = resolveGameExportDir("focus");
    const normalized = path.normalize(filepath);
    if (!normalized.startsWith(focusDir)) {
      return res.status(403).json({ ok: false, error: "invalid path" });
    }

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ ok: false, error: "file not found" });
    }

    const content = fs.readFileSync(filepath, "utf8");
    return res.json({ ok: true, content, path: filepath });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Get Focus State (auto-save draft per domain)
app.get("/api/game/focus/state", (req, res) => {
  try {
    const focusDir = resolveGameExportDir("focus");
    const stateFile = path.join(focusDir, ".focus-state.json");

    if (!fs.existsSync(stateFile)) {
      // Return empty state for all domains
      return res.json({
        ok: true,
        states: {
          BODY: { domain: "BODY", month: "current", habits: "", routines: "", additions: "", eliminations: "", lastUpdated: null },
          BEING: { domain: "BEING", month: "current", habits: "", routines: "", additions: "", eliminations: "", lastUpdated: null },
          BALANCE: { domain: "BALANCE", month: "current", habits: "", routines: "", additions: "", eliminations: "", lastUpdated: null },
          BUSINESS: { domain: "BUSINESS", month: "current", habits: "", routines: "", additions: "", eliminations: "", lastUpdated: null }
        }
      });
    }

    const states = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    return res.json({ ok: true, states });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Save Focus State (auto-save draft)
app.post("/api/game/focus/state", (req, res) => {
  try {
    const domain = String(req.body?.domain || "").trim().toUpperCase();
    const month = String(req.body?.month || "current").trim();
    const habits = String(req.body?.habits || "").trim();
    const routines = String(req.body?.routines || "").trim();
    const additions = String(req.body?.additions || "").trim();
    const eliminations = String(req.body?.eliminations || "").trim();

    if (!domain || !["BODY", "BEING", "BALANCE", "BUSINESS"].includes(domain)) {
      return res.status(400).json({ ok: false, error: "invalid domain" });
    }

    const focusDir = resolveGameExportDir("focus");
    ensureDir(focusDir);
    const stateFile = path.join(focusDir, ".focus-state.json");

    // Load existing states
    let states = {};
    if (fs.existsSync(stateFile)) {
      try {
        states = JSON.parse(fs.readFileSync(stateFile, "utf8"));
      } catch (e) {
        // Ignore parse errors, start fresh
      }
    }

    // Update state for this domain
    states[domain] = {
      domain,
      month,
      habits,
      routines,
      additions,
      eliminations,
      lastUpdated: new Date().toISOString()
    };

    // Write back to file
    fs.writeFileSync(stateFile, JSON.stringify(states, null, 2), "utf8");

    return res.json({ ok: true, domain, lastUpdated: states[domain].lastUpdated });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Voice session export (local markdown)
app.post("/api/voice/export", (req, res) => {
  try {
    const markdownRaw = String(req.body?.markdown || "").trim();
    if (!markdownRaw) {
      return res.status(400).json({ ok: false, error: "missing markdown" });
    }
    const title = safeFilename(req.body?.title || "Voice Session");
    const dir = getVoiceVaultDir();
    ensureDir(dir);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const base = title || `voice_${stamp}`;
    const filename = `${base}.md`;
    const filepath = path.join(dir, filename);

    fs.writeFileSync(filepath, markdownRaw + "\n", "utf8");

    const rcloneInfo = queueVaultSync();

    return res.json({
      ok: true,
      path: filepath,
      rclone: rcloneInfo,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Hot List quick add (local markdown)
app.post("/api/hotlist", (req, res) => {
  try {
    const idea = String(req.body?.idea || "").trim();
    const source = String(req.body?.source || "web").trim();
    if (!idea) {
      return res.status(400).json({ ok: false, error: "missing idea" });
    }

    const dir = resolveDoorExportDir("hotlist");
    ensureDir(dir);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `HotList_${stamp}.md`;
    const filepath = path.join(dir, filename);
    const md = [
      "# Hot List – Quick Add",
      "",
      `- [ ] ${idea}`,
      "",
      `**Source:** ${source}`,
      `**Date:** ${new Date().toLocaleString("de-DE")}`,
    ].join("\n");
    fs.writeFileSync(filepath, md + "\n", "utf8");
    return res.json({ ok: true, path: filepath });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Core4 week/day API (event-ledger backed)
app.get("/api/core4/day-state", (req, res) => {
  try {
    const dateKey = resolveCore4DateKey(req.query?.date, true);
    if (!dateKey) {
      return res.status(400).json({ ok: false, error: "invalid date" });
    }
    const payload = core4GetDayState(dateKey);
    if (!payload.ok) {
      return res.status(400).json(payload);
    }
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get("/api/core4/week-summary", (req, res) => {
  try {
    const dateKey = resolveCore4DateKey(req.query?.date, true);
    if (!dateKey) {
      return res.status(400).json({ ok: false, error: "invalid date" });
    }
    const payload = core4GetWeekSummaryForDate(dateKey);
    if (!payload.ok) {
      return res.status(400).json(payload);
    }
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post("/api/core4/log", async (req, res) => {
  try {
    const domain = String(req.body?.domain || "").trim().toLowerCase();
    const task = String(req.body?.task || "").trim().toLowerCase();
    const dateKey = resolveCore4DateKey(req.body?.date, true);
    const source = String(req.body?.source || "index-node").trim();
    if (!dateKey) {
      return res.status(400).json({ ok: false, error: "invalid date" });
    }
    if (!domain || !task) {
      return res.status(400).json({ ok: false, error: "missing domain/task" });
    }
    const dateObj = parseCore4DateKey(dateKey);
    if (!dateObj) {
      return res.status(400).json({ ok: false, error: "invalid date" });
    }

    const logRes = core4Log(domain, task, dateObj.toISOString(), source);
    if (!logRes.ok) {
      return res.status(400).json(logRes);
    }

    if (BRIDGE_URL && !logRes.duplicate) {
      const payload = {
        id: `core4-${dateKey}-${domain}-${task}`,
        ts: dateObj.toISOString(),
        domain,
        task,
        points: 0.5,
        source: "hq",
      };
      await bridgeFetch("/bridge/core4/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const dayState = core4GetDayState(dateKey);
    const weekState = core4GetWeekSummaryForDate(dateKey);
    return res.json({
      ok: true,
      duplicate: Boolean(logRes.duplicate),
      day: dayState,
      week: weekState,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get("/api/core4/journal", (req, res) => {
  try {
    const dateKey = resolveCore4DateKey(req.query?.date, true);
    if (!dateKey) {
      return res.status(400).json({ ok: false, error: "invalid date" });
    }
    const payload = core4GetJournalForDate(dateKey);
    if (!payload.ok) {
      return res.status(400).json(payload);
    }
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post("/api/core4/journal", (req, res) => {
  try {
    const domain = String(req.body?.domain || "").trim().toLowerCase();
    const habit = String(req.body?.habit || req.body?.task || "").trim().toLowerCase();
    const text = String(req.body?.text || "").trim();
    const dateKey = resolveCore4DateKey(req.body?.date, true);
    if (!dateKey) {
      return res.status(400).json({ ok: false, error: "invalid date" });
    }
    const payload = core4SaveJournal(domain, habit, text, dateKey);
    if (!payload.ok) {
      return res.status(400).json(payload);
    }
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post("/api/core4/export-week", (req, res) => {
  try {
    const dateKey = resolveCore4DateKey(req.body?.date || req.query?.date, true);
    if (!dateKey) {
      return res.status(400).json({ ok: false, error: "invalid date" });
    }
    const payload = core4ExportWeekSummaryToDrive(dateKey);
    if (!payload.ok) {
      return res.status(400).json(payload);
    }
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Core4 compatibility endpoint (legacy today payload)
app.post("/api/core4", async (req, res) => {
  try {
    const rawSubtask = String(req.body?.subtask || req.body?.task || "").trim().toLowerCase();
    if (!rawSubtask) {
      return res.status(400).json({ ok: false, error: "missing subtask" });
    }
    const mapped = mapCore4Subtask(rawSubtask);
    if (!mapped) {
      return res.status(400).json({ ok: false, error: "unknown subtask" });
    }

    let requestedValue = 1;
    if (typeof req.body?.value !== "undefined") {
      const raw = req.body.value;
      if (raw === true || raw === "true" || raw === 1 || raw === "1") requestedValue = 1;
      if (raw === false || raw === "false" || raw === 0 || raw === "0") requestedValue = 0;
    }
    if (requestedValue < 1) {
      return res.status(400).json({ ok: false, error: "core4 ledger does not support unsetting" });
    }

    const todayKey = core4DateKeyLocal(new Date());
    const legacyKey = core4LegacyKeyFromSubtask(rawSubtask);
    const current = core4LegacyDayState(todayKey);
    const alreadyDone = Number(current[legacyKey] || 0) >= 1;
    let bridgeTotal = null;
    let bridgeOk = false;

    if (!alreadyDone) {
      const logRes = core4Log(mapped.domain, mapped.task, new Date().toISOString(), "hq");
      if (!logRes.ok) {
        return res.status(400).json(logRes);
      }
      if (BRIDGE_URL) {
        const payload = {
          id: `core4-${todayKey}-${legacyKey}`,
          ts: new Date().toISOString(),
          domain: mapped.domain,
          task: mapped.task,
          points: 0.5,
          source: "hq",
        };
        const bridgeLog = await bridgeFetch("/bridge/core4/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (bridgeLog && bridgeLog.ok !== false) {
          const todayRes = await bridgeFetch("/bridge/core4/today");
          if (todayRes && todayRes.ok !== false) {
            bridgeTotal = todayRes.total || 0;
            bridgeOk = true;
          }
        }
      }
    } else if (BRIDGE_URL) {
      const todayRes = await bridgeFetch("/bridge/core4/today");
      if (todayRes && todayRes.ok !== false) {
        bridgeTotal = todayRes.total || 0;
        bridgeOk = true;
      }
    }

    const data = core4LegacyDayState(todayKey);
    const total = getCore4Total(data);
    const taskwarrior = alreadyDone
      ? { ok: true, skipped: true, reason: "already-logged" }
      : await syncCore4Taskwarrior(legacyKey, 1);
    return res.json({
      ok: true,
      data,
      total,
      duplicate: alreadyDone,
      bridge_total: bridgeTotal,
      source: bridgeOk ? "bridge+local" : "local",
      taskwarrior,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Journal entry (local markdown)
app.post("/api/journal", (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    const subtask = String(req.body?.subtask || "").trim().toLowerCase();
    const taskUuid = String(req.body?.task_uuid || "").trim();
    const taskLabel = String(req.body?.task_label || "").trim();
    const rawTags = Array.isArray(req.body?.tags) ? req.body.tags : [];
    const tags = rawTags
      .map((tag) => normalizeTaskTag(tag))
      .filter(Boolean);
    if (!text) {
      return res.status(400).json({ ok: false, error: "missing text" });
    }
    ensureDir(CORE4_JOURNAL_DIR);
    const filepath = journalEntryPath(subtask);
    const now = new Date().toISOString();
    const fm = [
      "---",
      `title: Core4 Journal`,
      `created: ${now}`,
      ...(taskUuid ? [`task_uuid: ${taskUuid}`] : []),
      `task: ${taskLabel || subtask || "core4"}`,
      ...(tags.length ? ["tags:", ...tags.map((tag) => `  - ${tag}`)] : []),
      "---",
      "",
    ];
    const md = [...fm, text, ""].join("\n");
    fs.writeFileSync(filepath, md, "utf8");
    return res.json({ ok: true, path: filepath });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Core4 today (local JSON)
app.get("/api/core4/today", async (req, res) => {
  try {
    const todayKey = core4DateKeyLocal(new Date());
    const data = core4LegacyDayState(todayKey);
    const localTotal = getCore4Total(data);
    let bridgeTotal = null;
    let bridgeInfo = null;
    if (BRIDGE_URL) {
      const todayRes = await bridgeFetch("/bridge/core4/today");
      if (todayRes && todayRes.ok !== false) {
        bridgeTotal = todayRes.total || 0;
      } else {
        bridgeInfo = todayRes;
      }
    }
    const payload = {
      ok: true,
      data,
      total: bridgeTotal ?? localTotal,
      local_total: localTotal,
      bridge_total: bridgeTotal,
      source: bridgeTotal != null ? "bridge+local" : "local",
    };
    if (req.query && req.query.debug) {
      payload.bridge_url = BRIDGE_URL || "";
      payload.bridge_info = bridgeInfo;
    }
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Telegram send via local tele CLI
app.post("/api/tele/send", (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ ok: false, error: "missing message" });
    }
    const telePath = process.env.TELE_BIN || "/home/alpha/bin/utils/tele";
    execFile(telePath, [message], (err, _stdout, _stderr) => {
      if (err) {
        console.error("tele send failed:", err?.message || err);
      }
    });
    return res.json({ ok: true, queued: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Door chapters feed (local vault)
app.get("/api/door/chapters", (req, res) => {
  try {
    const source = String(req.query?.source || "blueprints").toLowerCase();
    const chapters = loadDoorChapters(source);
    if (!chapters.length) {
      return res.status(404).json({ ok: false, error: "no chapters found" });
    }
    return res.json({ ok: true, source, chapters });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Taskwarrior export (local file)
app.get("/api/taskwarrior/tasks", (req, res) => {
  try {
    const status = String(req.query?.status || "pending").toLowerCase();
    const tagsParam = String(req.query?.tags || "").trim();
    const tagsFilter = tagsParam
      ? tagsParam.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];
    const { ok, error, tasks } = loadTaskwarriorExport();
    if (!ok) {
      return res.status(404).json({ ok: false, error });
    }

    const filtered = tasks
      .filter((task) => isSyncTag(task.tags))
      .filter((task) => {
        if (status === "all") return true;
        return String(task.status || "").toLowerCase() === status;
      })
      .filter((task) => {
        if (!tagsFilter.length) return true;
        const taskTags = (task.tags || []).map((t) => String(t || "").toLowerCase());
        return tagsFilter.some((t) => taskTags.includes(t));
      })
      .map((task) => ({
        uuid: task.uuid,
        description: task.description,
        status: task.status,
        tags: task.tags || [],
        project: task.project || "",
        due: task.due || "",
        scheduled: task.scheduled || "",
        modified: task.modified || "",
        end: task.end || "",
      }));

    return res.json({ ok: true, source: "taskwarrior-export", count: filtered.length, tags: SYNC_TAGS, tasks: filtered });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Add Taskwarrior tasks (local CLI)
app.post("/api/taskwarrior/add", async (req, res) => {
  try {
    const taskBin = process.env.TASK_BIN || "task";
    const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
    if (!tasks.length) {
      return res.status(400).json({ ok: false, error: "missing tasks" });
    }

    const results = [];
    for (const t of tasks) {
      const description = String(t?.description || "").trim();
      if (!description) continue;
      const due = String(t?.due || "").trim();
      const scheduled = String(t?.scheduled || "").trim();
      const project = String(t?.project || "").trim();
      const tags = Array.isArray(t?.tags) ? t.tags : [];
      const args = ["add", description];
      if (due) args.push(`due:${due}`);
      if (scheduled) args.push(`scheduled:${scheduled}`);
      if (project) args.push(`project:${project}`);
      tags
        .map((tag) => String(tag || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, ""))
        .filter(Boolean)
        .forEach((tag) => args.push(`+${tag}`));

      try {
        await execFileAsync(taskBin, args);
        results.push({ description, ok: true });
      } catch (err) {
        results.push({ description, ok: false, error: err?.message || String(err) });
      }
    }

    return res.json({
      ok: true,
      created: results.filter((r) => r.ok).length,
      total: results.length,
      results,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Push Taskwarrior tasks to TickTick (by sync tags)
app.post("/api/taskwarrior/push", async (req, res) => {
  try {
    const status = String(req.body?.status || "pending").toLowerCase();
    const tagsFilter = Array.isArray(req.body?.tags)
      ? req.body.tags.map((t) => String(t || "").trim().toLowerCase()).filter(Boolean)
      : null;

    const { ok, error, tasks } = loadTaskwarriorExport();
    if (!ok) return res.status(404).json({ ok: false, error });

    const { token } = getTickConfig();
    if (!token) return res.status(400).json({ ok: false, error: "ticktick-token-missing" });

    const filtered = tasks
      .filter((task) => isSyncTag(task.tags))
      .filter((task) => (status === "all" ? true : String(task.status || "").toLowerCase() === status))
      .filter((task) => {
        if (!tagsFilter || !tagsFilter.length) return true;
        const taskTags = (task.tags || []).map((t) => String(t || "").toLowerCase());
        return tagsFilter.some((t) => taskTags.includes(t));
      });

    const results = [];
    for (const task of filtered) {
      const title = task.description || "Taskwarrior task";
      const content = [
        task.project ? `Project: ${task.project}` : "",
        task.due ? `Due: ${task.due}` : "",
        `UUID: ${task.uuid || ""}`,
      ]
        .filter(Boolean)
        .join("\n");
      const tags = Array.isArray(task.tags) ? task.tags : [];

      try {
        const created = await ticktickCreateTask({ title, content, tags });
        if (created) {
          appendSyncEntry({
            syncId: makeSyncId("tw"),
            ticktickId: created.id || created.taskId || created.task_id || "",
            scope: "taskwarrior",
            tags,
            title,
            createdAt: new Date().toISOString(),
          });
          results.push({ uuid: task.uuid, ok: true });
        } else {
          results.push({ uuid: task.uuid, ok: false, error: "no-response" });
        }
      } catch (err) {
        results.push({ uuid: task.uuid, ok: false, error: err?.message || String(err) });
      }
    }

    const success = results.filter((r) => r.ok).length;
    return res.json({ ok: true, pushed: success, total: filtered.length, results });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Voice history (vault files)
app.get("/api/voice/history", (req, res) => {
  try {
    const limit = Number(req.query?.limit || 50);
    const files = listMarkdownFilesRecursive(getVoiceVaultDir(), { limit: isNaN(limit) ? 50 : limit });
    return res.json({ ok: true, count: files.length, files });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Voice file read (local markdown)
app.get("/api/voice/file", (req, res) => {
  try {
    const rel = String(req.query?.path || "").trim();
    if (!rel) return res.status(400).json({ ok: false, error: "missing path" });
    const base = path.resolve(getVoiceVaultDir());
    const target = path.resolve(base, rel);
    if (!target.startsWith(base + path.sep)) {
      return res.status(400).json({ ok: false, error: "invalid path" });
    }
    if (!fs.existsSync(target)) {
      return res.status(404).json({ ok: false, error: "not found" });
    }
    const content = fs.readFileSync(target, "utf8");
    return res.json({ ok: true, path: rel, content });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Voice autosave (local markdown)
app.post("/api/voice/autosave", (req, res) => {
  try {
    const sectionRaw = String(req.body?.section || "voice").trim().toLowerCase();
    const section = safeFilename(sectionRaw) || "voice";
    const date = String(req.body?.date || new Date().toISOString().slice(0, 10)).trim();
    const markdown = String(req.body?.markdown || "");
    const dir = getVoiceVaultDir();
    ensureDir(dir);

    const filename = `Voice_${section}_${date}.md`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, markdown, "utf8");

    return res.json({ ok: true, path: filepath });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Game chapters feed (local vault)
app.get("/api/game/chapters", (req, res) => {
  try {
    const source = String(req.query?.source || "alphaos").toLowerCase();
    const game = loadGameChapters(source);
    if (!game || !game.content) {
      return res.status(404).json({ ok: false, error: "no chapters found" });
    }
    return res.json({
      ok: true,
      source,
      title: game.title || "Game",
      content: game.content,
      path: game.path || "",
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get("/api/doc", (req, res) => {
  try {
    const name = (req.query?.name || "door").toLowerCase();
    const content = loadDoc(name);
    if (!content) {
      return res.status(404).json({ ok: false, error: "doc not found" });
    }
    return res.json({ ok: true, name, content });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// General's Tent latest entry feed (local vault)
app.get("/api/generals/latest", (req, res) => {
  try {
    const type = String(req.query?.type || "").toLowerCase();
    const dir = resolveLatestDir(type);
    if (!dir) {
      return res.status(400).json({ ok: false, error: "unknown type" });
    }
    const latest = findLatestMarkdown(dir);
    if (!latest) {
      return res.json({ ok: true, type, empty: true });
    }
    const info = extractTitleAndExcerpt(latest.path);
    return res.json({
      ok: true,
      type,
      title: info.title,
      excerpt: info.excerpt,
      updated_at: new Date(latest.mtimeMs).toISOString(),
      path: latest.path,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ============================================================================
// GENERAL'S TENT - STRATEGIC INTELLIGENCE API
// ============================================================================
// Complete synthesis system for strategic weekly reflection
//
// Architecture:
// 1. Domain States: Load/save/update domain-state JSON
// 2. Synthesis Engines: Cross-domain, Temporal, Pipeline analysis
// 3. Component Data: Return & Report, Lessons, Corrections, Targets
// 4. Persistence: Save weekly Tent sessions to vault
// ============================================================================

/**
 * Initialize domain states (generate if not exist)
 * POST /api/tent/init
 */
app.post("/api/tent/init", async (req, res) => {
  try {
    const generated = [];
    const errors = [];

    for (const domain of DOMAINS) {
      const existing = loadDomainState(domain);
      if (existing) {
        console.log(`[/api/tent/init] ${domain} state already exists, skipping`);
        continue;
      }

      try {
        const state = generateInitialDomainState(domain);
        const saved = saveDomainState(domain, state);

        if (saved) {
          generated.push(domain);
        } else {
          errors.push({ domain, error: "Save failed" });
        }
      } catch (err) {
        errors.push({ domain, error: String(err) });
      }
    }

    return res.json({
      ok: errors.length === 0,
      generated,
      errors,
      message:
        generated.length > 0
          ? `Generated ${generated.length} domain states`
          : "All domain states already exist",
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * Get domain state for a single domain
 * GET /api/tent/state/:domain
 */
app.get("/api/tent/state/:domain", (req, res) => {
  try {
    const domain = String(req.params.domain || "").toUpperCase();
    const state = loadDomainState(domain);

    if (!state) {
      return res.status(404).json({
        ok: false,
        error: `Domain state not found: ${domain}`,
      });
    }

    return res.json({ ok: true, domain, state });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * Get all domain states
 * GET /api/tent/states
 */
app.get("/api/tent/states", (req, res) => {
  try {
    const states = getAllDomainStates();
    return res.json({
      ok: true,
      states,
      count: Object.keys(states).length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * SYNTHESIS ENGINE #1: Cross-Domain Pattern Recognition
 * GET /api/tent/synthesis/domains?week=YYYY-Wxx
 */
app.get("/api/tent/synthesis/domains", (req, res) => {
  try {
    const week = String(req.query.week || isoWeekString());
    const states = getAllDomainStates();

    if (Object.keys(states).length === 0) {
      return res.status(404).json({
        ok: false,
        error: "No domain states found. Run POST /api/tent/init first.",
      });
    }

    const synthesis = synthesizeCrossDomain(states);

    return res.json({
      ok: true,
      week,
      synthesis,
      domains_analyzed: Object.keys(states),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * SYNTHESIS ENGINE #2: Temporal Cascade Analysis
 * GET /api/tent/synthesis/temporal?week=YYYY-Wxx
 */
app.get("/api/tent/synthesis/temporal", (req, res) => {
  try {
    const week = String(req.query.week || isoWeekString());
    const states = getAllDomainStates();

    if (Object.keys(states).length === 0) {
      return res.status(404).json({
        ok: false,
        error: "No domain states found. Run POST /api/tent/init first.",
      });
    }

    const synthesis = synthesizeTemporalCascade(states);

    return res.json({
      ok: true,
      week,
      synthesis,
      domains_analyzed: Object.keys(states),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * SYNTHESIS ENGINE #3: Pipeline Flow Diagnosis
 * GET /api/tent/synthesis/pipeline?week=YYYY-Wxx
 */
app.get("/api/tent/synthesis/pipeline", (req, res) => {
  try {
    const week = String(req.query.week || isoWeekString());
    const states = getAllDomainStates();

    if (Object.keys(states).length === 0) {
      return res.status(404).json({
        ok: false,
        error: "No domain states found. Run POST /api/tent/init first.",
      });
    }

    const synthesis = synthesizePipelineFlow(states);

    return res.json({
      ok: true,
      week,
      synthesis,
      domains_analyzed: Object.keys(states),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * COMPLETE SYNTHESIS: All 3 engines combined
 * GET /api/tent/synthesis/complete?week=YYYY-Wxx
 */
app.get("/api/tent/synthesis/complete", (req, res) => {
  try {
    const week = String(req.query.week || isoWeekString());
    const states = getAllDomainStates();

    if (Object.keys(states).length === 0) {
      return res.status(404).json({
        ok: false,
        error: "No domain states found. Run POST /api/tent/init first.",
      });
    }

    const crossDomain = synthesizeCrossDomain(states);
    const temporal = synthesizeTemporalCascade(states);
    const pipeline = synthesizePipelineFlow(states);

    return res.json({
      ok: true,
      week,
      synthesis: {
        cross_domain: crossDomain,
        temporal_cascade: temporal,
        pipeline_flow: pipeline,
      },
      domains_analyzed: Object.keys(states),
      overall_scores: {
        domain_balance: crossDomain.overall_balance,
        cascade_alignment: temporal.overall_alignment,
        pipeline_health: pipeline.overall_health,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * COMPONENT #1: Return & Report (auto-populated intelligence)
 * GET /api/tent/component/return-report?week=YYYY-Wxx
 */
app.get("/api/tent/component/return-report", (req, res) => {
  try {
    const week = String(req.query.week || isoWeekString());
    const states = getAllDomainStates();

    if (Object.keys(states).length === 0) {
      return res.status(404).json({
        ok: false,
        error: "No domain states found.",
      });
    }

    const crossDomain = synthesizeCrossDomain(states);
    const temporal = synthesizeTemporalCascade(states);
    const pipeline = synthesizePipelineFlow(states);

    // Build Return & Report data structure
    const component = {
      week,
      domain_synthesis: {
        patterns: crossDomain.patterns,
        domain_health: crossDomain.domain_health,
        insights: crossDomain.insights,
        overall_balance: crossDomain.overall_balance,
      },
      temporal_synthesis: {
        cascade_health: temporal.cascade_health,
        blockers: temporal.blockers,
        frame_shifts: temporal.frame_shifts,
        overall_alignment: temporal.overall_alignment,
      },
      pipeline_synthesis: {
        health: pipeline.pipeline_health,
        issues: pipeline.issues,
        flow: pipeline.flow,
        overall_health: pipeline.overall_health,
      },
      weekly_metrics: {
        core4: {},
        fire_hits: {},
        war_stacks: { active: 0, completed: 0, by_domain: {} },
      },
    };

    // Aggregate weekly metrics
    for (const domain of DOMAINS) {
      const state = states[domain];
      if (!state) continue;

      component.weekly_metrics.core4[domain] = state.core4?.week_total || 0;
      component.weekly_metrics.fire_hits[domain] = {
        total: state.fire?.hits?.length || 0,
        completed: state.fire?.hits?.filter((h) => h.completed).length || 0,
        completion: state.fire?.completion || 0,
      };

      const activeWS = state.war_stacks?.filter((ws) => ws.status === "active") || [];
      const completedWS = state.war_stacks?.filter((ws) => ws.status === "completed") || [];

      component.weekly_metrics.war_stacks.active += activeWS.length;
      component.weekly_metrics.war_stacks.completed += completedWS.length;
      component.weekly_metrics.war_stacks.by_domain[domain] = {
        active: activeWS.length,
        completed: completedWS.length,
      };
    }

    return res.json({
      ok: true,
      week,
      component,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * COMPONENT #2: Lessons Learned (auto + manual)
 * GET /api/tent/component/lessons?week=YYYY-Wxx
 */
app.get("/api/tent/component/lessons", (req, res) => {
  try {
    const week = String(req.query.week || isoWeekString());
    const states = getAllDomainStates();

    const crossDomain = synthesizeCrossDomain(states);
    const temporal = synthesizeTemporalCascade(states);

    const component = {
      week,
      auto_lessons: [],
      voice_insights: [],
      fire_reflections: [],
      manual_notes: "",
    };

    // Generate auto-lessons from synthesis
    crossDomain.insights.forEach((insight) => {
      if (insight.severity === "positive" || insight.severity === "high") {
        component.auto_lessons.push({
          pattern: insight.type,
          evidence: insight.description,
          source: "cross_domain_synthesis",
        });
      }
    });

    temporal.frame_shifts.forEach((shift) => {
      component.auto_lessons.push({
        pattern: `${shift.domain} Frame shift: ${shift.new_status}`,
        evidence: `Frame shifted ${shift.days_ago} days ago`,
        source: "temporal_cascade_analysis",
      });
    });

    // Extract VOICE insights
    for (const domain of DOMAINS) {
      const state = states[domain];
      if (!state || !state.voice?.latest_strike) continue;

      component.voice_insights.push({
        domain,
        session: state.voice.latest_session,
        strike: state.voice.latest_strike,
      });
    }

    return res.json({
      ok: true,
      week,
      component,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * COMPONENT #3: Course Correction (strategic pivots)
 * GET /api/tent/component/corrections?week=YYYY-Wxx
 */
app.get("/api/tent/component/corrections", (req, res) => {
  try {
    const week = String(req.query.week || isoWeekString());
    const states = getAllDomainStates();

    const crossDomain = synthesizeCrossDomain(states);
    const temporal = synthesizeTemporalCascade(states);
    const pipeline = synthesizePipelineFlow(states);

    const component = {
      week,
      frame_shift_triggers: temporal.frame_shifts,
      cascade_corrections: temporal.blockers,
      domain_corrections: [],
      pipeline_corrections: pipeline.issues,
      recommended_targets: {
        next_week_fire: {},
        next_month_focus: {},
      },
      manual_corrections: "",
    };

    // Generate domain corrections from insights
    crossDomain.insights.forEach((insight) => {
      if (insight.severity === "high" || insight.severity === "medium") {
        component.domain_corrections.push({
          domain: insight.type,
          issue: insight.description,
          correction: insight.recommendation,
          why: `Cross-domain pattern detected: ${insight.type}`,
        });
      }
    });

    // Generate recommended targets
    for (const domain of DOMAINS) {
      const state = states[domain];
      if (!state) continue;

      const currentFireHits = state.fire?.hits?.length || 0;
      const currentCore4 = state.core4?.week_total || 0;

      // Recommend balanced Fire Hits (reduce if overloaded, increase if underutilized)
      let recommendedFireHits = 4;
      if (currentCore4 >= 6) recommendedFireHits = 3; // Reduce if overemphasis
      if (currentCore4 <= 3) recommendedFireHits = 4; // Maintain if underutilized

      component.recommended_targets.next_week_fire[domain] = recommendedFireHits;
    }

    return res.json({
      ok: true,
      week,
      component,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * COMPONENT #4: New Targets (cascade-aligned)
 * GET /api/tent/component/targets?week=YYYY-Wxx
 */
app.get("/api/tent/component/targets", (req, res) => {
  try {
    const week = String(req.query.week || isoWeekString());
    const states = getAllDomainStates();

    const component = {
      week,
      focus_targets: {},
      fire_targets: {},
      war_stacks_needed: [],
      manual_targets: "",
    };

    // Generate Focus targets (monthly/quarterly) from Freedom Maps
    for (const domain of DOMAINS) {
      const state = states[domain];
      if (!state) continue;

      component.focus_targets[domain] = {
        quarter: state.focus?.quarter || getCurrentQuarter(),
        mission: state.focus?.mission || "unknown",
        alignment: `Freedom "${state.freedom?.ipw || "unknown"}"`,
      };

      // Suggest Fire targets for next week (from War Stacks)
      const activeWarStacks = state.war_stacks?.filter((ws) => ws.status === "active") || [];
      component.fire_targets[domain] = activeWarStacks.map((ws) => ws.title);

      // Detect War Stacks needed
      if (state.voice?.session_count > 0 && activeWarStacks.length === 0) {
        component.war_stacks_needed.push({
          domain,
          title: `${domain} Daily Foundation`,
          why: `${state.voice.session_count} VOICE sessions need execution channel`,
          suggested_hits: [
            "Extract from latest VOICE session",
            "Daily practice (from VOICE insights)",
            "Weekly review",
            "Monthly integration",
          ],
        });
      }
    }

    return res.json({
      ok: true,
      week,
      component,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * Save weekly Tent session to vault
 * POST /api/tent/save-weekly
 */
app.post("/api/tent/save-weekly", (req, res) => {
  try {
    const week = String(req.body.week || isoWeekString());
    const markdown = String(req.body.markdown || "");

    if (!markdown) {
      return res.status(400).json({ ok: false, error: "No markdown content provided" });
    }

    const tentDir = path.join(getVaultDir(), "Alpha_Tent");
    if (!fs.existsSync(tentDir)) {
      fs.mkdirSync(tentDir, { recursive: true });
    }

    const filename = `tent_${week}.md`;
    const filePath = path.join(tentDir, filename);

    fs.writeFileSync(filePath, markdown, "utf8");

    return res.json({
      ok: true,
      week,
      file: path.relative(getVaultDir(), filePath),
      message: "Weekly Tent session saved",
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});


// Telegram Router API
app.get("/api/centres", (_req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.json(buildCentresPayload());
  } catch (err) {
    res.status(500).json({ updated_at: "", centres: [], error: String(err) });
  }
});


// Health
app.get("/health", (_req, res) => res.json({ ok: true, service: "index-centre" }));


// Redirect router: /voice, /door, /war ...
app.get(/^\/([a-z0-9_-]+)$/, (req, res, next) => {
  const slug = String(req.params[0] || "").toLowerCase();


  // do not hijack real endpoints
  if (slug === "menu" || slug === "api" || slug === "health") return next();


  try {
    const payload = buildCentresPayload();
    const hit = payload.centres.find((c) => c.cmd === slug);
    if (!hit) return next();
    return res.redirect(302, hit.url);
  } catch (err) {
    return res.status(500).send(String(err));
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/terminal" });

wss.on("connection", (ws, req) => {
  if (!TERMINAL_ENABLED) {
    ws.close(1013, "Terminal disabled");
    return;
  }

  const remote = req.socket.remoteAddress || "";
  const isLocal =
    remote === "127.0.0.1" ||
    remote === "::1" ||
    remote === "::ffff:127.0.0.1";
  if (!isLocal && !TERMINAL_ALLOW_REMOTE) {
    ws.close(1008, "Local only");
    return;
  }

  const shell = process.env.SHELL || "/bin/bash";
  const term = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: 120,
    rows: 34,
    cwd: process.env.HOME,
    env: process.env,
  });

  term.onData((data) => {
    try {
      ws.send(JSON.stringify({ type: "output", data }));
    } catch (_) {
      return;
    }
  });

  ws.on("message", (msg) => {
    let payload;
    try {
      payload = JSON.parse(String(msg));
    } catch (_) {
      return;
    }
    if (payload.type === "input") {
      term.write(payload.data || "");
    } else if (payload.type === "resize") {
      const cols = Number(payload.cols || 0);
      const rows = Number(payload.rows || 0);
      if (cols > 0 && rows > 0) {
        term.resize(cols, rows);
      }
    }
  });

  ws.on("close", () => {
    try {
      term.kill();
    } catch (_) {
      return;
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`αOS Index listening on http://${HOST}:${PORT}`);
});
