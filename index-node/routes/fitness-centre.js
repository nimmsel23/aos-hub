import express from "express";
import fs from "fs";
import os from "os";
import path from "path";

const router = express.Router();

function getFitnessCentreRepoDir() {
  return String(process.env.FITNESS_CENTRE_DIR || path.join(os.homedir(), "vital-hub/vitalctx"));
}

function parseSimpleEnv(content) {
  const out = {};
  for (const lineRaw of String(content || "").split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadFitnessCentreEnv(repoDir) {
  const envPath = path.join(repoDir, "fitness.env");
  if (!fs.existsSync(envPath)) {
    return { path: envPath, exists: false, values: {} };
  }
  const raw = fs.readFileSync(envPath, "utf8");
  return {
    path: envPath,
    exists: true,
    values: parseSimpleEnv(raw),
  };
}

router.get("/api/fitness-centre/status", (_req, res) => {
  try {
    const repoDir = getFitnessCentreRepoDir();
    const habitsPath = path.join(repoDir, "data", "habits.json");
    const journalDir = path.join(repoDir, "personal", "journal");
    const habitsDir = path.join(repoDir, "personal", "habits");
    const envInfo = loadFitnessCentreEnv(repoDir);
    const teleToken = String(envInfo.values.TELEGRAM_TOKEN || "").trim();
    const teleChatId = String(envInfo.values.TELEGRAM_CHAT_ID || "").trim();

    let habitCount = 0;
    let habitsConfigExists = false;
    try {
      if (fs.existsSync(habitsPath)) {
        habitsConfigExists = true;
        const raw = fs.readFileSync(habitsPath, "utf8");
        const parsed = JSON.parse(raw);
        habitCount = Array.isArray(parsed?.habits) ? parsed.habits.length : 0;
      }
    } catch (err) {
      return res.status(500).json({ ok: false, error: `habits.json parse failed: ${String(err)}` });
    }

    return res.json({
      ok: true,
      service: "fitness-centre",
      updated_at: new Date().toISOString(),
      repo: {
        path: repoDir,
        exists: fs.existsSync(repoDir),
      },
      fitness_env: {
        path: envInfo.path,
        exists: envInfo.exists,
      },
      dirs: {
        journal_exists: fs.existsSync(journalDir),
        habits_exists: fs.existsSync(habitsDir),
      },
      habits: {
        config_exists: habitsConfigExists,
        count: habitCount,
      },
      telegram: {
        token_configured: teleToken.length > 0,
        chat_id_configured: teleChatId.length > 0,
        chat_id_preview:
          teleChatId.length > 6 ? `${teleChatId.slice(0, 3)}...${teleChatId.slice(-3)}` : teleChatId,
      },
      pwa: {
        base_url: "/pwa/fitness/",
        journal_url: "/pwa/fitness/journal/",
        habits_url: "/pwa/fitness/habits/",
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Keep canonical trailing slash for the fitness PWA base path.
router.get(/^\/pwa\/fitness$/, (_req, res) => {
  res.redirect(302, "/pwa/fitness/");
});

router.post("/api/fitness-centre/tele/test", async (req, res) => {
  try {
    const repoDir = getFitnessCentreRepoDir();
    const envInfo = loadFitnessCentreEnv(repoDir);
    const token = String(envInfo.values.TELEGRAM_TOKEN || "").trim();
    const chatId = String(req.body?.chat_id || envInfo.values.TELEGRAM_CHAT_ID || "").trim();
    const text = String(
      req.body?.text || `AOS Fitness Centre test (${new Date().toISOString()})`
    ).trim();

    if (!envInfo.exists) {
      return res.status(400).json({ ok: false, error: "fitness.env not found", path: envInfo.path });
    }
    if (!token) {
      return res.status(400).json({ ok: false, error: "TELEGRAM_TOKEN missing in fitness.env" });
    }
    if (!chatId) {
      return res.status(400).json({
        ok: false,
        error: "No chat_id provided and TELEGRAM_CHAT_ID missing in fitness.env",
      });
    }
    if (!text) {
      return res.status(400).json({ ok: false, error: "Message text is empty" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let tgRes;
    try {
      tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    let payload = null;
    try {
      payload = await tgRes.json();
    } catch (_) {
      payload = null;
    }

    if (!tgRes.ok || !payload?.ok) {
      return res.status(502).json({
        ok: false,
        error: payload?.description || `Telegram send failed (${tgRes.status})`,
        telegram_status: tgRes.status,
      });
    }

    return res.json({
      ok: true,
      sent: true,
      chat_id: String(payload.result?.chat?.id || chatId),
      message_id: payload.result?.message_id || null,
      date: payload.result?.date || null,
    });
  } catch (err) {
    const isAbort = err?.name === "AbortError";
    return res.status(isAbort ? 504 : 500).json({
      ok: false,
      error: isAbort ? "Telegram request timed out" : String(err),
    });
  }
});

export default router;
