import express from "express";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import yaml from "js-yaml";
import { WebSocketServer } from "ws";
import * as pty from "node-pty";
import { execFile } from "child_process";


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

function queueVaultSync() {
  if (!RCLONE_TARGET) return { ok: false, status: "disabled" };
  Promise.resolve()
    .then(() =>
      rcloneRc("sync/sync", {
        srcFs: getVaultDir(),
        dstFs: RCLONE_TARGET,
      })
    )
    .then(() => console.log("[rclone] vault sync ok →", RCLONE_TARGET))
    .catch((err) =>
      console.error("[rclone] vault sync failed:", err?.message || err)
    );
  return { ok: true, status: "queued", target: RCLONE_TARGET };
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
  try {
    if (!fs.existsSync(TASK_EXPORT_PATH)) return { ok: false, error: "missing-export" };
    const raw = fs.readFileSync(TASK_EXPORT_PATH, "utf8");
    const tasks = JSON.parse(raw);
    if (!Array.isArray(tasks)) return { ok: false, error: "invalid-export" };
    return { ok: true, tasks };
  } catch (err) {
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
app.post("/api/core4", (req, res) => {
  try {
    const subtask = String(req.body?.subtask || req.body?.task || "").trim().toLowerCase();
    if (!subtask) {
      return res.status(400).json({ ok: false, error: "missing subtask" });
    }
    const data = updateCore4Subtask(subtask);
    if (!data) {
      return res.status(400).json({ ok: false, error: "unknown subtask" });
    }
    const total = getCore4Total(data);
    return res.json({ ok: true, data, total });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Core4 today (local JSON)
app.get("/api/core4/today", (_req, res) => {
  try {
    const data = ensureCore4Today();
    const total = getCore4Total(data);
    return res.json({ ok: true, data, total });
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
