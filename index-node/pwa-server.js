import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
import yaml from "js-yaml";

// Reuse the same route modules as index-node where possible.
// This keeps business logic in one place while giving PWAs a separate runtime.
import { gameApiRouter } from "./routes/game.js";
import core4Router from "./routes/core4.js";
import fireRouter from "./routes/fire.js";
import focusRouter from "./routes/focus.js";
import freedomRouter from "./routes/freedom.js";
import frameRouter from "./routes/frame.js";
import doorRouter from "./routes/door.js";

const HOST = process.env.PWA_HOST || "0.0.0.0";
const PORT = Number(process.env.PWA_PORT || 8780);
const PUBLIC_DIR = process.env.PWA_PUBLIC_DIR || path.join(process.cwd(), "public");
const PWA_ROOT = path.join(PUBLIC_DIR, "pwa");
const MENU_YAML_FILE = process.env.MENU_YAML || path.join(process.cwd(), "menu.yaml");
const GAS_ENV_FILE = String(
  process.env.AOS_GAS_ENV_FILE || path.join(os.homedir(), ".env", "gas.env")
).trim();
const GAS_URLS_FILE = String(
  process.env.AOS_GAS_URLS_FILE || path.join(os.homedir(), ".aos", "gas-urls.yaml")
).trim();

const STATIC_OPTIONS = {
  extensions: ["html"],
  setHeaders: (res, filePath) => {
    const p = String(filePath || "").toLowerCase();
    if (p.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-store");
      return;
    }
    if (p.endsWith(".js") || p.endsWith(".css")) {
      res.setHeader("Cache-Control", "no-cache");
    }
  },
};

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
        (value.startsWith("\"") && value.endsWith("\"")) ||
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

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exactPath(pathname) {
  return new RegExp(`^${escapeRegex(pathname)}$`);
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

function fitnessCtxTarget(req) {
  const forwardedHost = String(req.headers["x-forwarded-host"] || "")
    .split(",")[0]
    .trim();
  const rawHost = forwardedHost || String(req.headers.host || "").trim();
  const out = new URL("http://127.0.0.1/");
  try {
    const parsed = new URL(`http://${rawHost || "127.0.0.1"}`);
    out.hostname = parsed.hostname || "127.0.0.1";
  } catch {
    out.hostname = "127.0.0.1";
  }
  out.port = "8788";
  out.pathname = "/";
  return out.toString();
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // Standalone PWA control plane contract (same shape as main index-node).
  app.get("/api/pwa/gas-fallback", (req, res) => {
    try {
      const appKey = String(req.query.app || "").trim().toLowerCase();
      const routes = buildPwaFallbackRoutes();
      const url = appKey ? String(routes[appKey] || "") : "";
      return res.json({
        ok: true,
        app: appKey || null,
        url,
        routes,
        gas_env_file: GAS_ENV_FILE,
        gas_env_exists: fs.existsSync(GAS_ENV_FILE),
        gas_urls_file: GAS_URLS_FILE,
        gas_urls_exists: fs.existsSync(GAS_URLS_FILE),
        runtime: "pwa-standalone",
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Mobile links from menu.yaml — used by /pwa/mobile.html (independent of index-node)
  app.get("/pwa/mobile-links", (_req, res) => {
    try {
      const raw = fs.existsSync(MENU_YAML_FILE)
        ? yaml.load(fs.readFileSync(MENU_YAML_FILE, "utf8"))
        : null;
      const mobile_links = Array.isArray(raw?.mobile_links) ? raw.mobile_links : [];
      res.setHeader("Cache-Control", "no-store");
      return res.json({ mobile_links });
    } catch (err) {
      return res.status(500).json({ mobile_links: [], error: String(err) });
    }
  });

  // GAS fallback map for quick inspection (no app filter).
  app.get("/gas", (_req, res) => {
    try {
      const routes = buildPwaFallbackRoutes();
      return res.json({
        ok: true,
        routes,
        gas_env_file: GAS_ENV_FILE,
        gas_env_exists: fs.existsSync(GAS_ENV_FILE),
        gas_urls_file: GAS_URLS_FILE,
        gas_urls_exists: fs.existsSync(GAS_URLS_FILE),
        runtime: "pwa-standalone",
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  });
  app.get("/gas/", (_req, res) => res.redirect(302, "/gas"));

  // Reuse app APIs needed by PWA clients.
  app.use("/api/game", gameApiRouter);
  app.use("/api/core4", core4Router);
  app.use("/api/fire", fireRouter);
  app.use("/api/focus", focusRouter);
  app.use("/api/freedom", freedomRouter);
  app.use("/api/frame", frameRouter);
  app.use("/api/door", doorRouter);

  // Tailnet /pwa proxy may strip the /pwa prefix. Serve aliases for direct /core4/... paths.
  const pwaAliases = ["core4", "fire", "focus", "frame", "freedom", "door", "game", "memoirs", "fitness", "potential", "plan", "production", "profit"];
  for (const slug of pwaAliases) {
    app.use(`/${slug}`, express.static(path.join(PWA_ROOT, slug), STATIC_OPTIONS));
  }

  app.get(exactPath("/pwa/potential"), (_req, res) => {
    return res.redirect(302, "/pwa/potential/");
  });
  app.get(exactPath("/potential"), (_req, res) => {
    return res.redirect(302, "/pwa/potential/");
  });
  app.get(exactPath("/pwa/plan"), (_req, res) => {
    return res.redirect(302, "/pwa/plan/");
  });
  app.get(exactPath("/plan"), (_req, res) => {
    return res.redirect(302, "/pwa/plan/");
  });
  app.get(exactPath("/pwa/production"), (_req, res) => {
    return res.redirect(302, "/pwa/production/");
  });
  app.get(exactPath("/production"), (_req, res) => {
    return res.redirect(302, "/pwa/production/");
  });
  app.get(exactPath("/pwa/profit"), (_req, res) => {
    return res.redirect(302, "/pwa/profit/");
  });
  app.get(exactPath("/profit"), (_req, res) => {
    return res.redirect(302, "/pwa/profit/");
  });
  app.get(exactPath("/pwa/door/potential"), (_req, res) => {
    return res.redirect(302, "/pwa/potential/");
  });
  app.get(exactPath("/pwa/door/potential/"), (_req, res) => {
    return res.redirect(302, "/pwa/potential/");
  });
  app.get(exactPath("/pwa/door/plan"), (_req, res) => {
    return res.redirect(302, "/pwa/plan/");
  });
  app.get(exactPath("/pwa/door/plan/"), (_req, res) => {
    return res.redirect(302, "/pwa/plan/");
  });
  app.get(exactPath("/pwa/door/production"), (_req, res) => {
    return res.redirect(302, "/pwa/production/");
  });
  app.get(exactPath("/pwa/door/production/"), (_req, res) => {
    return res.redirect(302, "/pwa/production/");
  });
  app.get(exactPath("/pwa/door/profit"), (_req, res) => {
    return res.redirect(302, "/pwa/profit/");
  });
  app.get(exactPath("/pwa/door/profit/"), (_req, res) => {
    return res.redirect(302, "/pwa/profit/");
  });

  // Fitness context shortcut should land on the dedicated fitness service.
  app.get(["/fitnessctx", "/fitnessctx/", "/pwa/fitness", "/pwa/fitness/"], (req, res) => {
    return res.redirect(302, fitnessCtxTarget(req));
  });
  app.get(/^\/pwa\/fitness\/.+$/, (req, res) => {
    return res.redirect(302, fitnessCtxTarget(req));
  });

  app.get("/gas-fallback.js", (_req, res) => {
    const filePath = path.join(PWA_ROOT, "gas-fallback.js");
    if (!fs.existsSync(filePath)) {
      return res.status(404).end();
    }
    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(filePath);
  });

  // Static app-shell serving for installed PWAs.
  app.use(
    express.static(PUBLIC_DIR, STATIC_OPTIONS)
  );

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "pwa-standalone",
      host: HOST,
      port: PORT,
      public_dir: PUBLIC_DIR,
    });
  });

  return app;
}

export function startServer() {
  const app = createApp();
  return app.listen(PORT, HOST, () => {
    console.log(`[pwa-standalone] listening on http://${HOST}:${PORT}`);
  });
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  startServer();
}
