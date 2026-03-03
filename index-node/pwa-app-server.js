import fs from "fs";
import http from "http";
import https from "https";
import path from "path";
import os from "os";
import yaml from "js-yaml";

const APP = String(process.env.PWA_APP || "").trim().toLowerCase();
const PORT = Number(process.env.PWA_APP_PORT || 8781);
const HOST = String(process.env.PWA_APP_HOST || "0.0.0.0").trim() || "0.0.0.0";
const PUBLIC_ROOT = String(
  process.env.PWA_PUBLIC_DIR || path.join(process.cwd(), "public", "pwa")
).trim();
const PWA_API_BASE = String(process.env.PWA_API_BASE || "http://127.0.0.1:8799").trim();
const PWA_BRIDGE_BASE = String(process.env.PWA_BRIDGE_BASE || "http://127.0.0.1:8080").trim();

const GAS_ENV_FILE = String(
  process.env.AOS_GAS_ENV_FILE || path.join(os.homedir(), ".env", "gas.env")
).trim();
const GAS_URLS_FILE = String(
  process.env.AOS_GAS_URLS_FILE || path.join(os.homedir(), ".aos", "gas-urls.yaml")
).trim();

if (!APP) {
  console.error("[pwa-app] missing PWA_APP env");
  process.exit(1);
}

const APP_DIR = path.resolve(PUBLIC_ROOT, APP);
if (!fs.existsSync(APP_DIR) || !fs.statSync(APP_DIR).isDirectory()) {
  console.error(`[pwa-app] app dir missing: ${APP_DIR}`);
  process.exit(1);
}

const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=utf-8"],
]);

function sendJson(res, code, value) {
  const body = JSON.stringify(value);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, code, text) {
  res.writeHead(code, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(String(text));
}

function pipeUpstream(req, res, baseUrl) {
  let upstream;
  try {
    upstream = new URL(req.url || "/", baseUrl);
  } catch (_err) {
    sendText(res, 500, "invalid upstream base");
    return;
  }

  const isHttps = upstream.protocol === "https:";
  const lib = isHttps ? https : http;
  const headers = { ...(req.headers || {}) };
  delete headers.host;

  const proxyReq = lib.request(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || (isHttps ? 443 : 80),
      method: req.method || "GET",
      path: `${upstream.pathname}${upstream.search}`,
      headers,
    },
    (proxyRes) => {
      const outHeaders = { ...(proxyRes.headers || {}) };
      res.writeHead(proxyRes.statusCode || 502, outHeaders);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (err) => {
    sendJson(res, 502, { ok: false, error: `upstream error: ${String(err?.message || err)}` });
  });

  req.pipe(proxyReq);
}

function readSimpleEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    const out = {};
    const lines = String(fs.readFileSync(filePath, "utf8") || "").split(/\r?\n/);
    for (const lineRaw of lines) {
      const line = String(lineRaw || "").trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let value = String(m[2] || "").trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      out[m[1]] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function readSimpleYamlFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    const parsed = yaml.load(fs.readFileSync(filePath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function composeGamePageUrl(baseUrl, page) {
  const base = String(baseUrl || "").trim();
  if (!base) return "";
  try {
    const url = new URL(base);
    url.searchParams.set("page", String(page || "").trim());
    return url.toString();
  } catch {
    const glue = base.includes("?") ? "&" : "?";
    return `${base}${glue}page=${encodeURIComponent(String(page || "").trim())}`;
  }
}

function buildPwaFallbackRoutes() {
  const gasEnv = readSimpleEnvFile(GAS_ENV_FILE);
  const gasUrls = readSimpleYamlFile(GAS_URLS_FILE);
  const fromEnv = (key, ...aliases) => {
    for (const k of [key, ...aliases]) {
      const value = process.env[k] || gasUrls?.[k] || gasEnv[k];
      if (value) return String(value).trim();
    }
    return "";
  };
  const game = fromEnv("game", "GAME_URL");
  return {
    core4: fromEnv("core4", "CORE4_WEBAPP_URL"),
    door: fromEnv("door", "DOOR_WEBAPP_URL"),
    voice: fromEnv("voice", "VOICE_WEBAPP_URL"),
    memoirs: fromEnv("memoirs", "MEMOIRS_WEBAPP_URL"),
    fitness: fromEnv("fitness", "FITNESS_WEBAPP_URL"),
    fuel: fromEnv("fuel", "FUEL_WEBAPP_URL"),
    tent: fromEnv("tent", "TENT_WEBAPP_URL"),
    game,
    frame: fromEnv("frame", "FRAME_WEBAPP_URL") || composeGamePageUrl(game, "frame"),
    freedom: fromEnv("freedom", "FREEDOM_WEBAPP_URL") || composeGamePageUrl(game, "freedom"),
    focus: fromEnv("focus", "FOCUS_WEBAPP_URL") || composeGamePageUrl(game, "focus"),
    fire: fromEnv("fire", "FIRE_WEBAPP_URL") || composeGamePageUrl(game, "fire"),
  };
}

function safeResolve(rootDir, relPath) {
  const target = path.resolve(rootDir, "." + relPath);
  if (!target.startsWith(rootDir + path.sep) && target !== path.join(rootDir, "index.html")) {
    return null;
  }
  return target;
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendText(res, 404, "not found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME.get(ext) || "application/octet-stream";
  const headers = { "content-type": type };
  if (ext === ".html") {
    headers["cache-control"] = "no-store";
  } else if (ext === ".js" || ext === ".css") {
    headers["cache-control"] = "no-cache";
  }
  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  // Use the same backend as index-node/bridge so standalone PWAs mutate/read one SoT.
  if (url.pathname.startsWith("/api/") && url.pathname !== "/api/pwa/gas-fallback") {
    return pipeUpstream(req, res, PWA_API_BASE);
  }
  if (url.pathname.startsWith("/bridge/")) {
    return pipeUpstream(req, res, PWA_BRIDGE_BASE);
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 200, {
      ok: true,
      service: "pwa-app-standalone",
      app: APP,
      host: HOST,
      port: PORT,
      app_dir: APP_DIR,
      api_base: PWA_API_BASE,
      bridge_base: PWA_BRIDGE_BASE,
    });
  }

  if (req.method === "GET" && (url.pathname === "/api/pwa/gas-fallback" || url.pathname === "/gas")) {
    const appKey = String(url.searchParams.get("app") || "").trim().toLowerCase();
    const routes = buildPwaFallbackRoutes();
    const selected = appKey ? String(routes[appKey] || "") : "";
    return sendJson(res, 200, {
      ok: true,
      app: appKey || null,
      url: selected,
      routes,
      runtime: "pwa-app-standalone",
      service_app: APP,
    });
  }

  if (req.method === "GET" && url.pathname === "/pwa/gas-fallback.js") {
    const jsPath = path.resolve(PUBLIC_ROOT, "gas-fallback.js");
    return serveFile(res, jsPath);
  }

  let rel = "";
  if (url.pathname === "/" || url.pathname === "/index.html") {
    rel = "/index.html";
  } else if (url.pathname === `/pwa/${APP}` || url.pathname === `/pwa/${APP}/`) {
    rel = "/index.html";
  } else if (url.pathname.startsWith(`/pwa/${APP}/`)) {
    rel = url.pathname.slice(`/pwa/${APP}`.length);
  } else {
    rel = url.pathname;
  }

  const target = safeResolve(APP_DIR, rel);
  if (!target) {
    return sendText(res, 400, "invalid path");
  }
  return serveFile(res, target);
});

server.listen(PORT, HOST, () => {
  console.log(`[pwa-app:${APP}] listening on http://${HOST}:${PORT}`);
});
