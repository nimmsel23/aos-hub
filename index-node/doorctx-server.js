import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
import yaml from "js-yaml";

import doorRouter from "./routes/door.js";

const HOST = process.env.PWA_APP_HOST || process.env.DOORCTX_HOST || "0.0.0.0";
const PORT = Number(process.env.PWA_APP_PORT || process.env.DOORCTX_PORT || 8786);
const PWA_PUBLIC_DIR = process.env.PWA_PUBLIC_DIR || path.join(process.cwd(), "public", "pwa");
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
  return {
    door: fromEnv("door", "DOOR_WEBAPP_URL"),
  };
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exactPath(pathname) {
  return new RegExp(`^${escapeRegex(pathname)}$`);
}

function registerPhaseRedirect(app, slug, target) {
  app.get(exactPath(`/${slug}`), (_req, res) => res.redirect(302, target));
  app.get(exactPath(`/${slug}/`), (_req, res) => res.redirect(302, target));
  app.get(exactPath(`/door/${slug}`), (_req, res) => res.redirect(302, target));
  app.get(exactPath(`/door/${slug}/`), (_req, res) => res.redirect(302, target));
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

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
        runtime: "doorctx",
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.get("/gas", (_req, res) => {
    try {
      const routes = buildPwaFallbackRoutes();
      return res.json({
        ok: true,
        routes,
        runtime: "doorctx",
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  });
  app.get("/gas/", (_req, res) => res.redirect(302, "/gas"));

  app.use("/api/door", doorRouter);

  app.get("/", (_req, res) => res.redirect(302, "/pwa/door/"));
  app.get(exactPath("/door"), (_req, res) => res.redirect(302, "/pwa/door/"));
  app.get(exactPath("/door/"), (_req, res) => res.redirect(302, "/pwa/door/"));
  app.get(exactPath("/pwa/door"), (_req, res) => res.redirect(302, "/pwa/door/"));

  registerPhaseRedirect(app, "potential", "/pwa/potential/");
  registerPhaseRedirect(app, "plan", "/pwa/plan/");
  registerPhaseRedirect(app, "production", "/pwa/production/");
  registerPhaseRedirect(app, "profit", "/pwa/profit/");

  app.get(exactPath("/pwa/potential"), (_req, res) => res.redirect(302, "/pwa/potential/"));
  app.get(exactPath("/pwa/door/potential"), (_req, res) => res.redirect(302, "/pwa/potential/"));
  app.get(exactPath("/pwa/door/potential/"), (_req, res) => res.redirect(302, "/pwa/potential/"));
  app.get(exactPath("/pwa/plan"), (_req, res) => res.redirect(302, "/pwa/plan/"));
  app.get(exactPath("/pwa/door/plan"), (_req, res) => res.redirect(302, "/pwa/plan/"));
  app.get(exactPath("/pwa/door/plan/"), (_req, res) => res.redirect(302, "/pwa/plan/"));
  app.get(exactPath("/pwa/production"), (_req, res) => res.redirect(302, "/pwa/production/"));
  app.get(exactPath("/pwa/door/production"), (_req, res) => res.redirect(302, "/pwa/production/"));
  app.get(exactPath("/pwa/door/production/"), (_req, res) => res.redirect(302, "/pwa/production/"));
  app.get(exactPath("/pwa/profit"), (_req, res) => res.redirect(302, "/pwa/profit/"));
  app.get(exactPath("/pwa/door/profit"), (_req, res) => res.redirect(302, "/pwa/profit/"));
  app.get(exactPath("/pwa/door/profit/"), (_req, res) => res.redirect(302, "/pwa/profit/"));

  app.use("/pwa", express.static(PWA_PUBLIC_DIR, STATIC_OPTIONS));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "doorctx",
      host: HOST,
      port: PORT,
      pwa_public_dir: PWA_PUBLIC_DIR,
    });
  });

  return app;
}

export function startServer() {
  const app = createApp();
  return app.listen(PORT, HOST, () => {
    console.log(`[doorctx] listening on http://${HOST}:${PORT}`);
  });
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  startServer();
}
