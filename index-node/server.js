import express from "express";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import yaml from "js-yaml";
import { WebSocketServer } from "ws";
import * as pty from "node-pty";
import { execFile, execFileSync } from "child_process";


const app = express();

app.use(express.json({ limit: "1mb" }));


const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8799);
const TERMINAL_ENABLED = process.env.TERMINAL_ENABLED !== "0";
const TERMINAL_ALLOW_REMOTE = process.env.TERMINAL_ALLOW_REMOTE === "1";


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

let TASK_CACHE = { ts: 0, tasks: [], error: null };


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

function getVoiceVaultDir() {
  const env = process.env.VOICE_VAULT_DIR;
  if (env) return env;
  const homeVoice = path.join(os.homedir(), "Voice");
  if (fs.existsSync(homeVoice)) return homeVoice;
  return path.join(getVaultDir(), "VOICE");
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BRIDGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
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
 * Update Taskwarrior task via `task <uuid> modify ...`
 * Note: Bridge doesn't have a modify endpoint yet, so we use task CLI directly
 * TODO: Add /bridge/task/modify endpoint in bridge/app.py
 * @param {String} uuid - Taskwarrior UUID
 * @param {Object} updates - { tags: ['+newtag'], project: 'newproject', ... }
 * @returns {Promise<Object>} - { ok, stdout, stderr }
 */
async function updateTaskwarriorTask(uuid, updates) {
  // For now, return not implemented - we'll add Bridge endpoint later
  // Alternatively, spawn child_process here to run `task <uuid> modify ...`
  return { ok: false, error: "task modify via bridge not implemented yet" };
}

function getCore4TodayFile() {
  return path.join(os.homedir(), ".local", "share", "alphaos", "drop", "core4_today.json");
}

function ensureCore4Today() {
  const filePath = getCore4TodayFile();
  const dir = path.dirname(filePath);
  ensureDir(dir);

  const today = new Date().toISOString().split("T")[0];
  let data = null;
  try {
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch (_) {
    data = null;
  }

  if (!data || data.date !== today) {
    data = {
      date: today,
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
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  return data;
}

function getCore4Total(data) {
  if (!data) return 0;
  const raw = Object.keys(data)
    .filter((key) => !["date", "csv_written"].includes(key))
    .reduce((sum, key) => sum + (Number(data[key]) || 0), 0);
  return raw * 0.5;
}

function updateCore4Subtask(subtask) {
  const data = ensureCore4Today();
  if (!data || typeof data[subtask] === "undefined") return null;
  data[subtask] = data[subtask] >= 1 ? 0 : 1;
  fs.writeFileSync(getCore4TodayFile(), JSON.stringify(data, null, 2));
  return data;
}

function mapCore4Subtask(subtask) {
  const map = {
    fitness: { domain: "body", task: "fitness" },
    fuel: { domain: "body", task: "fuel" },
    meditation: { domain: "being", task: "meditation" },
    memoirs: { domain: "being", task: "memoirs" },
    partner: { domain: "balance", task: "person1" },
    posterity: { domain: "balance", task: "person2" },
    discover: { domain: "business", task: "discover" },
    declare: { domain: "business", task: "declare" },
  };
  return map[subtask] || null;
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
    return { ok: true, tasks, source: "live" };
  } catch (err) {
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

// Centre routes
app.get("/game", (_req, res) => res.redirect(302, "/game/"));
app.get("/generals", (_req, res) => res.redirect(302, "/game/tent"));
app.get("/tent", (_req, res) => res.redirect(302, "/game/tent"));
app.get("/door", (_req, res) => res.redirect(302, "/door/"));
app.get("/game/frame", (_req, res) => res.redirect(302, "/game/frame.html"));
app.get("/game/freedom", (_req, res) => res.redirect(302, "/game/freedom.html"));
app.get("/game/focus", (_req, res) => res.redirect(302, "/game/focus.html"));
app.get("/game/fire", (_req, res) => res.redirect(302, "/game/fire.html"));
app.get("/tele", (_req, res) => res.redirect(302, "/tele.html"));

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
app.post("/api/door/export", (req, res) => {
  try {
    const markdownRaw = String(req.body?.markdown || "").trim();
    if (!markdownRaw) {
      return res.status(400).json({ ok: false, error: "missing markdown" });
    }
    const tool = String(req.body?.tool || "").trim().toLowerCase();
    const title = String(req.body?.title || "").trim();
    const ticktick = req.body?.ticktick === true;
    const dir = resolveDoorExportDir(tool);
    ensureDir(dir);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const base = safeFilename(title) || `${tool || "door"}_${stamp}`;
    const filename = `${base}.md`;
    const filepath = path.join(dir, filename);

    let markdown = markdownRaw;
    let syncId = null;
    if (ticktick) {
      syncId = makeSyncId(`door-${tool || "entry"}`);
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
        const tags = ["door"];
        if (tool) tags.push(tool);
        Promise.resolve()
          .then(() =>
            ticktickCreateTask({
              title: title || `Door ${tool || "entry"}`,
              content: markdown,
              tags,
            })
          )
          .then((created) => {
            if (!created) return;
            appendSyncEntry({
              syncId,
              ticktickId: created.id || created.taskId || created.task_id || "",
              scope: "door",
              tool,
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
      tool,
      path: filepath,
      ticktick: tickInfo,
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
    const doorTask = {
      description: `Door: ${selectedItem.title}`,
      tags: ["plan", domain.toLowerCase()],
      project: domain,
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

// Fire Week (TickTick primary, GCal fallback)
app.get("/api/fire/week", async (req, res) => {
  const tag = String(req.query?.tag || "fire").trim().toLowerCase();
  const { start, end, week, rangeLabel } = getWeekRangeLocal();
  let tasks = [];
  let error = null;

  try {
    const raw = await ticktickListProjectTasks();
    const filtered = raw
      .filter((task) => !task.isCompleted && !task.completedTime)
      .filter((task) => taskInRange(task, start, end))
      .filter((task) => {
        if (!tag) return true;
        const tags = (task.tags || []).map((t) => String(t || "").toLowerCase());
        return tags.includes(tag);
      })
      .map((task) => ({
        id: task.id,
        title: task.title || "(ohne Titel)",
        tags: task.tags || [],
        due: (parseTickTickDue(task) || "").toISOString?.() || (task.dueDateTime || task.dueDate || ""),
      }));
    tasks = filtered;
  } catch (err) {
    error = err?.message || String(err);
  }

  return res.json({
    ok: !error,
    source: error ? "gcal" : "ticktick",
    week,
    rangeLabel,
    tasks,
    error,
    gcal_url: FIRE_GCAL_EMBED_URL || "",
  });
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

// Core4 update (local JSON)
app.post("/api/core4", async (req, res) => {
  try {
    const subtask = String(req.body?.subtask || req.body?.task || "").trim().toLowerCase();
    if (!subtask) {
      return res.status(400).json({ ok: false, error: "missing subtask" });
    }

    const mapped = mapCore4Subtask(subtask);
    const todayKey = new Date().toISOString().split("T")[0];

    if (BRIDGE_URL && mapped) {
      const payload = {
        id: `core4-${todayKey}-${subtask}`,
        ts: new Date().toISOString(),
        domain: mapped.domain,
        task: mapped.task,
        points: 0.5,
        source: "hq",
      };
      const logRes = await bridgeFetch("/bridge/core4/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (logRes && logRes.ok !== false) {
        const todayRes = await bridgeFetch("/bridge/core4/today");
        if (todayRes && todayRes.ok !== false) {
          return res.json({ ok: true, total: todayRes.total || 0, source: "bridge" });
        }
      }
    }

    const data = updateCore4Subtask(subtask);
    if (!data) {
      return res.status(400).json({ ok: false, error: "unknown subtask" });
    }
    const total = getCore4Total(data);
    return res.json({ ok: true, data, total, source: "local" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Core4 today (local JSON)
app.get("/api/core4/today", async (_req, res) => {
  try {
    if (BRIDGE_URL) {
      const todayRes = await bridgeFetch("/bridge/core4/today");
      if (todayRes && todayRes.ok !== false) {
        return res.json({ ok: true, total: todayRes.total || 0, source: "bridge" });
      }
    }
    const data = ensureCore4Today();
    const total = getCore4Total(data);
    return res.json({ ok: true, data, total, source: "local" });
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
      const project = String(t?.project || "").trim();
      const tags = Array.isArray(t?.tags) ? t.tags : [];
      const args = ["add", description];
      if (due) args.push(`due:${due}`);
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
  console.log(`AlphaOS Index listening on http://${HOST}:${PORT}`);
});
