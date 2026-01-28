
/**************************************
 * AlphaOS – General's Tent Centre (GameCentre)
 * Single GAS project
 *
 * Ziel:
 *  - Dashboard (read-only) für Latest Entries/Scorecards
 *  - Sonntag 15:00: Telegram Invite (Link zum WebApp)
 *  - Task-Ping via TickTick: „General's Tent – YYYY-WNN“ (und optional Complete)
 *  - Keine FireMap→TickTick Sync Funktion hier.
 **************************************/

// ================================
// CONFIG (ScriptProperties)
// ================================
// REQUIRED:
//  - GEN_TENT_TELEGRAM_BOT_TOKEN
//  - GEN_TENT_CHAT_ID
//  - TICKTICK_TOKEN
// OPTIONAL:
//  - TICKTICK_PROJECT_ID (default: inbox)
//  - GEN_TENT_PUBLIC_URL (falls du NICHT ScriptApp.getService().getUrl() willst)
//  - GEN_TENT_TICKTICK_TAGS (comma separated)
//  - GEN_TENT_COMPLETE_ENDPOINT (falls dein TickTick-Complete Endpoint anders ist)
//  - GEN_TENT_TIMEZONE (default: Script TZ)

const GEN_TENT = {
  SHEET_KEYS: ['FRAME_SHEET_ID','FREEDOM_SHEET_ID','FOCUS_SHEET_ID','FIRE_SHEET_ID','VOICE_SHEET_ID','CORE_SHEET_ID','DOOR_SHEET_ID'],

  get tz() {
    return sp_('GEN_TENT_TIMEZONE') || Session.getScriptTimeZone();
  },

  get webUrl() {
    // Vorsicht: getUrl() liefert erst nach WebApp Deploy sinnvolle URL.
    return tent_getWebUrl_();
  },

  telegram: {
    get token() { return sp_('GEN_TENT_TELEGRAM_BOT_TOKEN'); },
    get chatId() { return sp_('GEN_TENT_CHAT_ID'); }
  },

  ticktick: {
    get token() { return sp_('TICKTICK_TOKEN'); },
    get projectId() { return sp_('TICKTICK_PROJECT_ID') || 'inbox'; },
    get tags() {
      const raw = sp_('GEN_TENT_TICKTICK_TAGS') || 'AlphaOS,GameCentre,GeneralsTent';
      return raw.split(',').map(s => s.trim()).filter(Boolean);
    },
    // Manche Implementationen nutzen andere Pfade; du kannst es überschreiben.
    get completeEndpoint() {
      // Best-guess: /open/v1/task/{id}/complete
      return sp_('GEN_TENT_COMPLETE_ENDPOINT') || 'https://api.ticktick.com/open/v1/task/{id}/complete';
    }
  }
};

// Standalone Tent Centre WebApp URL (fallback for Telegram bot links).
const TENT_WEBAPP_URL_FALLBACK = "https://script.google.com/macros/s/AKfycbzRXpjBQPk77W4nnR0pI5l1-pkMk8jIcxA-iL1jzb-ZNQuU8nwTaUJ2O-xGiscVXudaZg/exec";

function sp_(k) {
  return PropertiesService.getScriptProperties().getProperty(k);
}
function spSet_(k, v) {
  PropertiesService.getScriptProperties().setProperty(k, String(v));
}

function tent_getWebUrl_() {
  const sp = PropertiesService.getScriptProperties();
  return (
    (sp.getProperty('TENT_WEBAPP_URL') || '').trim() ||
    (sp.getProperty('GEN_TENT_PUBLIC_URL') || '').trim() ||
    TENT_WEBAPP_URL_FALLBACK ||
    ScriptApp.getService().getUrl()
  );
}

// ================================
// WEBAPP
// ================================
function renderTentPage_() {
  const t = HtmlService.createTemplateFromFile('Game_Tent_Index');
  t.centreLinks = getTentCentreLinks_();
  return t.evaluate()
    .setTitle("GENERAL'S TENT – Alpha Odyssey")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getTentCentreLinks_() {
  const webAppUrl = ScriptApp.getService().getUrl();
  const defaults = {
    frame: `${webAppUrl}?page=frame`,
    freedom: `${webAppUrl}?page=freedom`,
    focus: `${webAppUrl}?page=focus`,
    fire: `${webAppUrl}?page=fire`,
    voice: `${webAppUrl}?page=voice`,
    doorcentre: `${webAppUrl}?page=door`,
    gamecentre: `${webAppUrl}?page=game`
  };

  const urls = (typeof getCentreUrls_ === 'function') ? getCentreUrls_() : {};
  return {
    frame: urls.frame || defaults.frame,
    freedom: urls.freedom || defaults.freedom,
    focus: urls.focus || defaults.focus,
    fire: urls.fire || defaults.fire,
    voice: urls.voice || defaults.voice,
    doorcentre: urls.door_centre || urls.door || defaults.doorcentre,
    gamecentre: urls.game || defaults.gamecentre
  };
}

function tent_debugCentreClick(centreKey, href) {
  const cfg = (typeof getBotConfig_ === 'function') ? getBotConfig_() : {};
  const chatId = String(cfg.chatId || '').trim();
  const token = tent_pickCentreBotToken_(centreKey, cfg);
  if (!chatId) return { ok: false, error: 'CHAT_ID missing' };
  if (!token) return { ok: false, error: 'BOT_TOKEN missing' };

  const key = String(centreKey || '').trim() || 'unknown';
  const url = String(href || '').trim();
  const when = new Date().toISOString();

  const text =
    `🏛️ General's Tent HQ (debug)\n` +
    `centre=${key}\n` +
    (url ? `link=${url}\n` : '') +
    `ts=${when}`;

  return tent_sendMessageByToken_(token, chatId, text);
}

function tent_pickCentreBotToken_(centreKey, cfg) {
  const key = String(centreKey || '').trim().toLowerCase();
  const fallback = String(cfg.botToken || '').trim();
  const game = String(cfg.gameBotToken || '').trim();
  const voice = String(cfg.voiceBotToken || '').trim();
  const door = String(cfg.doorBotToken || '').trim();
  const fruits = String(cfg.fruitsBotToken || '').trim();
  const core4 = String(cfg.core4BotToken || '').trim();

  if (['frame', 'freedom', 'focus', 'fire', 'tent', 'game', 'gamecentre'].includes(key)) return game || fallback;
  if (['voice', 'voicecentre'].includes(key)) return voice || fallback;
  if (['door', 'doorcentre', 'door_centre'].includes(key)) return door || fallback;
  if (['fruits', 'facts'].includes(key)) return fruits || fallback;
  if (['core4'].includes(key)) return core4 || fallback;
  return fallback;
}

function tent_sendMessageByToken_(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text
  };
  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    const body = res.getContentText();
    if (code >= 200 && code < 300) return { ok: true };
    return { ok: false, error: `telegram ${code}: ${body}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ================================
// CORE: Latest Row Reader
// ================================
/**
 * Erwartung: Jede Map hat Header in Zeile 1.
 * Latest Entry = letzte Zeile (lastRow).
 *
 * Rückgabe ist bewusst „neutral“: { ok, type, row, lastRow, error }
 */
function getLatest(type) {
  const key = (type || '').toUpperCase() + '_SHEET_ID';
  const sheetId = sp_(key);
  if (!sheetId) return { ok: false, type, error: `Missing ScriptProperty: ${key}` };

  try {
    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheets()[0];
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { ok: true, type, row: null, lastRow };

    const last = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    return { ok: true, type, row: last, lastRow };
  } catch (e) {
    return { ok: false, type, error: String(e) };
  }
}

// ================================
// TELEGRAM
// ================================
function tgSend_(text, replyMarkup) {
  const token = GEN_TENT.telegram.token;
  const chatId = GEN_TENT.telegram.chatId;
  if (!token || !chatId) {
    Logger.log('tgSend_: missing GEN_TENT_TELEGRAM_BOT_TOKEN or GEN_TENT_CHAT_ID');
    return { ok: false, error: 'telegram-not-configured' };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const body = res.getContentText();
    const json = safeJson_(body);
    if (json && json.ok) return { ok: true, result: json.result };
    return { ok: false, error: body };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ================================
// TICKTICK (Module: Open API Wrapper + Editor-friendly run_)
// ================================
// Ziel:
//  - Einheitliche Rückgaben für den Editor (ok/ms/name/data/error)
//  - Kleine Wrapper um TickTick Open API (projects/tags/tasks/create/batch)
//  - GenTent-Ping baut darauf auf

const PROP = {
  TICKTICK_TOKEN: 'TICKTICK_TOKEN',
  TICKTICK_PROJECT_ID: 'TICKTICK_PROJECT_ID'
};

function cfg_() {
  return {
    ticktick: {
      token: sp_(PROP.TICKTICK_TOKEN) || '',
      projectId: sp_(PROP.TICKTICK_PROJECT_ID) || 'inbox'
    }
  };
}

/**
 * Debug/Run Wrapper für Editor-Feedback.
 * - loggt immer
 * - gibt immer ein strukturiertes Objekt zurück
 */
function run_(name, fn) {
  const t0 = Date.now();
  try {
    const data = fn();
    const out = { ok: true, name: String(name || 'run'), ms: Date.now() - t0, data: data };
    Logger.log(JSON.stringify(out, null, 2));
    return out;
  } catch (e) {
    const out = {
      ok: false,
      name: String(name || 'run'),
      ms: Date.now() - t0,
      error: {
        message: (e && e.message) ? e.message : String(e),
        stack: (e && e.stack) ? e.stack : ''
      }
    };
    Logger.log(JSON.stringify(out, null, 2));
    return out;
  }
}

// Base URL for TickTick Open API
const TENT_TICKTICK_BASE = 'https://api.ticktick.com/open/v1';

/**
 * Internal helper: perform a TickTick API request.
 */
function ticktickRequest_(endpoint, options) {
  const token = cfg_().ticktick.token;
  if (!token) {
    throw new Error('TickTick token missing – set ' + PROP.TICKTICK_TOKEN + ' via Script Properties');
  }

  const url = TENT_TICKTICK_BASE + endpoint;
  const opt = options || {};
  opt.headers = opt.headers || {};
  opt.headers['Authorization'] = 'Bearer ' + token;
  if (!opt.muteHttpExceptions) opt.muteHttpExceptions = true;

  const response = UrlFetchApp.fetch(url, opt);
  const code = response.getResponseCode();
  const body = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error('TickTick API error (' + code + '): ' + body);
  }

  // Manche Endpoints liefern leere Bodies
  if (!body) return null;

  try {
    return JSON.parse(body);
  } catch (e) {
    // Fallback: nicht-JSON body trotzdem zurückgeben
    return { raw: body };
  }
}

function ticktickListProjects_() {
  return run_('ticktickListProjects', () => ticktickRequest_('/project', { method: 'get' }));
}

function ticktickListTags_() {
  return run_('ticktickListTags', () => ticktickRequest_('/tag', { method: 'get' }));
}

/**
 * Fetch tasks for a project and client-side filter.
 * NOTE: TickTick Open API ist je nach Account/Version nicht immer 100% konsistent.
 *      Wenn /task?projectId=… nichts liefert, wechseln wir auf ein alternatives Endpoint-Mapping.
 */
function ticktickFetchTasks_(opts) {
  return run_('ticktickFetchTasks', () => {
    opts = opts || {};
    const projectId = opts.projectId || cfg_().ticktick.projectId || 'inbox';

    // Versuch 1: /task?projectId=...
    let allTasks = ticktickRequest_('/task?projectId=' + encodeURIComponent(projectId), { method: 'get' });
    let list = Array.isArray(allTasks) ? allTasks : [];

    const sinceTs = opts.since ? new Date(opts.since).getTime() : null;
    const untilTs = opts.until ? new Date(opts.until).getTime() : null;
    const tagSet = (opts.tags && opts.tags.length) ? new Set(opts.tags.map(String)) : null;
    const statuses = (opts.statuses && opts.statuses.length) ? new Set(opts.statuses) : null;
    const includeCompleted = !!opts.includeCompleted;

    const filtered = list.filter(t => {
      const statusOk = includeCompleted
        ? (statuses ? statuses.has(t.status) : true)
        : (statuses ? statuses.has(t.status) : t.status === 0);
      if (!statusOk) return false;

      const modifiedTime = t.modifiedTime ? new Date(t.modifiedTime).getTime() : null;
      const completedTime = t.completedTime ? new Date(t.completedTime).getTime() : null;
      const compareTs = modifiedTime || completedTime || null;
      if (sinceTs && compareTs && compareTs < sinceTs) return false;
      if (untilTs && compareTs && compareTs > untilTs) return false;

      if (tagSet && Array.isArray(t.tags)) {
        const hasTag = t.tags.some(tag => tagSet.has(String(tag)));
        if (!hasTag) return false;
      }

      return true;
    });

    return { data: filtered, projectId: projectId, total: list.length, filtered: filtered.length };
  });
}

function ticktickCreateTask_(title, content, tags, fields) {
  return run_('ticktickCreateTask', () => {
    if (!title) throw new Error('title is required');

    const payload = Object.assign({}, fields || {});
    payload.title = String(title);
    if (content != null) payload.content = String(content);
    if (Array.isArray(tags) && tags.length) payload.tags = tags.map(String);
    if (!payload.projectId) payload.projectId = cfg_().ticktick.projectId || 'inbox';

    return ticktickRequest_('/task', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    });
  });
}

function ticktickBatchCreateTasks_(tasks) {
  return run_('ticktickBatchCreateTasks', () => {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('tasks array required');
    }
    const payload = {
      add: tasks.map(task => {
        const t = Object.assign({}, task);
        if (!t.title) throw new Error('Each task must have a title');
        if (!t.projectId) t.projectId = cfg_().ticktick.projectId || 'inbox';
        return t;
      })
    };

    return ticktickRequest_('/batch/task', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    });
  });
}

function ticktickSummary_(opts) {
  return run_('ticktickSummary', () => {
    opts = opts || {};
    const result = ticktickFetchTasks_({
      since: opts.since,
      until: opts.until,
      includeCompleted: true,
      tags: opts.tags
    });

    const list = (result && result.ok && result.data && Array.isArray(result.data.data))
      ? result.data.data
      : [];

    const summary = { total: list.length, complete: 0, open: 0 };
    if (opts.groupByTag) summary.byTag = {};

    list.forEach(t => {
      const isCompleted = t.status === 2;
      if (isCompleted) summary.complete++; else summary.open++;

      if (opts.groupByTag && Array.isArray(t.tags)) {
        t.tags.forEach(tag => {
          const k = String(tag);
          if (!summary.byTag[k]) summary.byTag[k] = { total: 0, complete: 0, open: 0 };
          summary.byTag[k].total++;
          if (isCompleted) summary.byTag[k].complete++; else summary.byTag[k].open++;
        });
      }
    });

    return summary;
  });
}

/**
 * Complete Task
 * NOTE: Endpoint kann je nach TickTick-Variante abweichen -> overridebar via GEN_TENT_COMPLETE_ENDPOINT.
 */
function ticktickCompleteTask_(taskId) {
  return run_('ticktickCompleteTask', () => {
    const token = GEN_TENT.ticktick.token;
    if (!token) throw new Error('missing TICKTICK_TOKEN');
    if (!taskId) throw new Error('missing taskId');

    const url = GEN_TENT.ticktick.completeEndpoint.replace('{id}', encodeURIComponent(taskId));
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    const text = res.getContentText();
    if (code >= 200 && code < 300) return { code: code, raw: text };
    throw new Error('Complete failed (' + code + '): ' + text);
  });
}

// ================================
// GEN TENT PING (TickTick)
// ================================
/**
 * Wird beim Öffnen/Abschließen genutzt.
 *
 * Strategie:
 *  - Create Task „General's Tent – YYYY-WNN“ wenn nicht bereits vorhanden (wir merken uns TaskId pro Woche).
 *  - Optional: Complete nach Submit.
 */
function ensureGenTentTickTickTask_() {
  const week = isoWeekString_(new Date());
  const key = `GENTENT_TASK_ID_${week}`;
  const existing = sp_(key);
  if (existing) return { ok: true, week, taskId: existing, reused: true };

  const title = `General's Tent – ${week}`;
  const note = `Weekly ritual: Return & Report · Lessons · Course Correction · New Targets

Web: ${GEN_TENT.webUrl}`;

  // ticktickCreateTask_ ist run_-wrapped und liefert { ok, data, ... }
  const created = ticktickCreateTask_(title, note, GEN_TENT.ticktick.tags, { priority: 5 });

  const taskId = (created && created.ok && created.data)
    ? (created.data.id || created.data.taskId || created.data.task_id || null)
    : null;

  if (created && created.ok && taskId) {
    spSet_(key, taskId);
    return { ok: true, week, taskId, reused: false, created };
  }

  return { ok: false, week, error: 'could-not-extract-task-id', created };
}

function markGenTentDone() {
  const ensured = ensureGenTentTickTickTask_();
  if (!ensured.ok) return ensured;

  // ticktickCompleteTask_ ist run_-wrapped
  const done = ticktickCompleteTask_(ensured.taskId);

  return {
    ok: !!(done && done.ok),
    week: ensured.week,
    taskId: ensured.taskId,
    complete: done
  };
}

// ================================
// SUNDAY 15:00 INVITE (Hub-Schedule Modul)
// ================================
function sendGeneralsTentInvite() {
  const week = isoWeekString_(new Date());

  const text = `🏕️ *GENERAL'S TENT – ${week}*\n\n` +
    `Return & Report · Lessons Learned · Course Correction · New Targets\n\n` +
    `*Chapter 41:* Step inside the sanctuary of strategic reflection.\n` +
    `Across from you sits your most important ally: *GOD*.\n\n` +
    `Open the Tent:\n${GEN_TENT.webUrl}`;

  // Optional: Button (klassischer URL-Button funktioniert im Gegensatz zu web_app in proactive messages zuverlässig)
  const keyboard = {
    inline_keyboard: [[
      { text: "🏕️ Open General's Tent", url: GEN_TENT.webUrl }
    ]]
  };

  const msg = tgSend_(text, keyboard);
  return msg;
}

// Optional: Einladung + TickTick Task in einem Rutsch
function sunday15InviteAndPing() {
  const invite = sendGeneralsTentInvite();
  const tick = ensureGenTentTickTickTask_();
  return { invite, tick };
}

// ================================
// INIT (Editor-friendly)
// ================================
/**
 * 1) Prüft Properties
 * 2) (Optional) setzt Trigger: Sonntag 15:00 → sunday15InviteAndPing
 */
function initGenTentCentre() {
  const missing = [];
  if (!sp_('GEN_TENT_TELEGRAM_BOT_TOKEN')) missing.push('GEN_TENT_TELEGRAM_BOT_TOKEN');
  if (!sp_('GEN_TENT_CHAT_ID')) missing.push('GEN_TENT_CHAT_ID');
  if (!sp_('TICKTICK_TOKEN')) missing.push('TICKTICK_TOKEN');

  const webUrl = GEN_TENT.webUrl;

  const status = {
    ok: missing.length === 0,
    missing,
    webUrl,
    timezone: GEN_TENT.tz
  };

  // Trigger setzen (idempotent)
  try {
    ensureSunday15Trigger_('sunday15InviteAndPing');
    status.trigger = 'ok';
  } catch (e) {
    status.trigger = 'error: ' + String(e);
  }

  Logger.log(JSON.stringify(status, null, 2));
  return status;
}

function ensureSunday15Trigger_(handlerFnName) {
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(t => t.getHandlerFunction && t.getHandlerFunction() === handlerFnName);
  if (exists) return;

  // Sonntag 15:00 – Script TZ
  ScriptApp.newTrigger(handlerFnName)
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(15)
    .create();
}

// ================================
// UTILITIES
// ================================
function safeJson_(s) {
  try { return JSON.parse(s); } catch (_) { return null; }
}

// ISO Week String: YYYY-WNN (Mon-based ISO week)
function isoWeekString_(date) {
  if (!date) date = new Date();

  // Clone
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  // ISO week date weeks start on Monday, so correct the day number
  const dayNum = d.getUTCDay() || 7; // 1..7

  // Set to nearest Thursday (current week defines year)
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  // Year of Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

  // Calculate week number
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function formatDate_(date) {
  if (!date) return '';
  const d = (typeof date === 'string') ? new Date(date) : date;
  return Utilities.formatDate(d, GEN_TENT.tz, 'dd.MM.yyyy');
}

// =====================================================
// Telegram Bot Handler
// =====================================================
function tent_handleTelegramMessage_(message) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim().toLowerCase();
  if (!text) return false;

  if (text === '/tent') {
    const webUrl = tent_getWebUrl_();
    tent_sendMessage_(chatId,
      '⛺ *GENERAL\'S TENT*\n\n' +
      'Weekly review - Where am I in the war?\n\n' +
      '/tentweb - Open Tent Centre\n' +
      '/tentreview - Trigger weekly review'
    );
    return true;
  }

  if (text === '/tentweb') {
    const webUrl = tent_getWebUrl_();
    tent_sendMessage_(chatId, `⛺ General's Tent: ${webUrl}?page=tent`);
    return true;
  }

  if (text === '/tentreview') {
    try {
      tent_sendMessage_(chatId, '⛺ Triggering weekly review...');

      // Trigger the actual weekly review function
      if (typeof tent_weeklyReviewTrigger === 'function') {
        const result = tent_weeklyReviewTrigger();
        if (result && result.ok) {
          tent_sendMessage_(chatId, `✅ Weekly review completed\n\nWeek: ${result.week}\n\nFull report: ${result.file.url}`);
        } else {
          tent_sendMessage_(chatId, `❌ Review failed: ${result.error || 'unknown error'}`);
        }
      } else {
        tent_sendMessage_(chatId, '✅ Weekly review ready\n\nOpen Tent Centre to complete.');
      }
    } catch (e) {
      tent_sendMessage_(chatId, `❌ Error: ${e}`);
    }
    return true;
  }

  return false;
}

function tent_sendMessage_(chatId, text) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GAME_BOT_TOKEN') || props.getProperty('BOT_TOKEN');
  if (!token) return;

  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' }),
    muteHttpExceptions: true
  });
}
