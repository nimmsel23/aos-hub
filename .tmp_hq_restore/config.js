// ================================================================
// GAS CONFIG HELPERS - Single source of truth for centre URLs
// ================================================================

const CENTRE_URL_KEYS = {
  creator: 'CREATOR_WEBAPP_URL',
  hq: 'HQ_WEBAPP_URL',
  fruits: 'FRUITS_WEBAPP_URL',
  allmylinks: 'ALLMYLINKS_URL',
  voice: 'VOICE_URL',
  wordpress: 'WORDPRESS_URL',
  door: 'DOOR_URL',
  door_centre: 'DOOR_CENTRE_URL',
  game: 'GAME_URL',
  fadaro: 'FADARO_URL',
  frame: 'FRAME_MAP_URL',
  freedom: 'FREEDOM_MAP_URL',
  focus: 'FOCUS_MAP_URL',
  fire: 'FIRE_MAP_URL',
  tent: 'TENT_MAP_URL',
  body: 'BODY_GPT_URL',
  being: 'BEING_GPT_URL',
  balance: 'BALANCE_GPT_URL',
  business: 'BUSINESS_GPT_URL'
};

const CONFIG = {
  get BOT_TOKEN() {
    // αOS Bot Token (@TerminalkreitzaIDEA_bot)
    return PropertiesService.getScriptProperties().getProperty('ALPHAOS_BOT_TOKEN');
  },
  get CHAT_ID() {
    // Your Telegram User ID
    return PropertiesService.getScriptProperties().getProperty('CHAT_ID');
  },
  get DOOR_CENTRE_URL() {
    // Door Centre Web App URL
    return PropertiesService.getScriptProperties().getProperty('DOOR_CENTRE_URL');
  },
  get LAPTOP_URL() {
    // Legacy name: use PUBLIC root (host without `/bridge`).
    return (typeof getPublicRootUrl_ === 'function') ? getPublicRootUrl_() : '';
  },
  get PUBLIC_ROOT_URL() {
    return (typeof getPublicRootUrl_ === 'function') ? getPublicRootUrl_() : '';
  },
  get SHEET_ID() {
    // War Stack Logsheet (optional for stats)
    return PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  }
};

// Hardcoded fallback for Telegram webhook URL (avoids relying on Script Properties UI / /dev URLs).
const AOS_WEBAPP_EXEC_URL_FALLBACK = "https://script.google.com/macros/s/AKfycbysk1LEX9r05qiKKvNevayAc8OSESqItpWDbKhepBJjOdEcx8Cav4MGVqyCXsjcv9Chmw/exec";

// Hardcoded fallback for Bridge API URL.
// Canonical form includes `/bridge` (API namespace); health check runs on the root URL.
const AOS_BRIDGE_URL_FALLBACK = "https://ideapad.tail7a15d6.ts.net/bridge";

// Hardcoded fallback for public/root URL (host without `/bridge`).
const AOS_PUBLIC_ROOT_URL_FALLBACK = "https://ideapad.tail7a15d6.ts.net";

function getCentreUrls_() {
  const sp = PropertiesService.getScriptProperties();
  const out = {};
  Object.keys(CENTRE_URL_KEYS).forEach((key) => {
    const val = (sp.getProperty(CENTRE_URL_KEYS[key]) || '').trim();
    out[key] = val;
  });
  return out;
}

function setCentreUrls_(urlMap) {
  const sp = PropertiesService.getScriptProperties();
  Object.keys(CENTRE_URL_KEYS).forEach((key) => {
    if (urlMap && Object.prototype.hasOwnProperty.call(urlMap, key)) {
      const value = String(urlMap[key] || '').trim();
      if (value) sp.setProperty(CENTRE_URL_KEYS[key], value);
    }
  });
  return { ok: true };
}

function setupCentreUrls_(urlMap) {
  const sp = PropertiesService.getScriptProperties();
  const report = { ok: true, set: [], skipped: [] };
  Object.keys(CENTRE_URL_KEYS).forEach((key) => {
    if (!urlMap || !Object.prototype.hasOwnProperty.call(urlMap, key)) {
      return;
    }
    const value = String(urlMap[key] || '').trim();
    if (!value) return;
    const propKey = CENTRE_URL_KEYS[key];
    const current = String(sp.getProperty(propKey) || '').trim();
    if (current) {
      report.skipped.push(key);
      return;
    }
    sp.setProperty(propKey, value);
    report.set.push(key);
  });
  return report;
}

function debugCentreUrls_() {
  const urls = getCentreUrls_();
  Object.keys(urls).forEach((key) => {
    Logger.log(key + ': ' + (urls[key] || 'MISSING'));
  });
}

// ------------------------------------------------------------
// Bridge / Bot config helpers (centralize Script Props)
// ------------------------------------------------------------
function normalizeBridgeApiUrl_(url) {
  let u = String(url || '').trim();
  if (!u) return '';
  u = u.replace(/\/$/, '');
  // If a full endpoint path was accidentally provided, keep only the API base.
  u = u.replace(/\/bridge\/.+$/, '/bridge');
  if (/\/bridge$/.test(u)) return u;
  // If the root host was provided, normalize to `/bridge`.
  return u + '/bridge';
}

function getBridgeApiUrl_() {
  const sp = PropertiesService.getScriptProperties();
  const explicit =
    (sp.getProperty('AOS_BRIDGE_URL') || '').trim() ||
    (sp.getProperty('BRIDGE_URL') || '').trim() ||
    (sp.getProperty('LAPTOP_WEBHOOK_URL') || '').trim() ||
    String(AOS_BRIDGE_URL_FALLBACK || '').trim();
  if (explicit) return normalizeBridgeApiUrl_(explicit);

  const root = (sp.getProperty('LAPTOP_URL') || '').trim();
  return root ? normalizeBridgeApiUrl_(root) : '';
}

function getBridgeRootUrl_() {
  const api = getBridgeApiUrl_();
  return api ? api.replace(/\/bridge$/, '') : '';
}

function getPublicRootUrl_() {
  const sp = PropertiesService.getScriptProperties();
  const explicit = (sp.getProperty('AOS_PUBLIC_ROOT_URL') || '').trim();
  if (explicit) return String(explicit).replace(/\/$/, '');
  const rootFromBridge = getBridgeRootUrl_();
  if (rootFromBridge) return String(rootFromBridge).replace(/\/$/, '');
  return String(AOS_PUBLIC_ROOT_URL_FALLBACK || '').trim().replace(/\/$/, '');
}

function getBridgeUrl_() {
  // Back-compat name: canonical Bridge API base (includes `/bridge`).
  return getBridgeApiUrl_();
}

function setLaptopUrl(url) {
  if (!url) throw new Error('setLaptopUrl: url missing');
  PropertiesService.getScriptProperties().setProperty('LAPTOP_URL', url);
  return { ok: true, url: url };
}

function getBotConfig_() {
  const sp = PropertiesService.getScriptProperties();
  return {
    // Universal fallback
    chatId: (sp.getProperty('CHAT_ID') || '').trim(),
    botToken: (sp.getProperty('BOT_TOKEN') || '').trim(),
    // Centre-specific tokens (required)
    fruitsBotToken: (sp.getProperty('FRUITS_BOT_TOKEN') || '').trim(),
    core4BotToken: (sp.getProperty('CORE4_BOT_TOKEN') || '').trim(),
    voiceBotToken: (sp.getProperty('VOICE_BOT_TOKEN') || '').trim(),
    doorBotToken: (sp.getProperty('DOOR_BOT_TOKEN') || '').trim(),
    gameBotToken: (sp.getProperty('GAME_BOT_TOKEN') || '').trim(),
    // Special bots (separate webhooks)
    watchdogBotToken: (sp.getProperty('WATCHDOG_BOT_TOKEN') || '').trim(),
    fireBotToken: (sp.getProperty('FIRE_BOT_TOKEN') || '').trim()
  };
}

function debugScriptProps_() {
  const sp = PropertiesService.getScriptProperties();
  const props = sp.getProperties();
  const mask = (v) => (v && v.length > 4 ? v.slice(0, 2) + '***' + v.slice(-2) : v);

  Logger.log('--- Script Properties (trimmed/masked) ---');
  const keys = Object.keys(props).sort();
  keys.forEach((k) => {
    const val = (props[k] || '').trim();
    if (k.toLowerCase().includes('token') || k.toLowerCase().includes('secret')) {
      Logger.log(k + ': ' + (val ? mask(val) : 'MISSING'));
    } else {
      Logger.log(k + ': ' + (val || 'MISSING'));
    }
  });
}

function getPrimaryBotToken_() {
  return PropertiesService.getScriptProperties().getProperty('ALPHAOS_BOT_TOKEN') ||
    PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN') ||
    PropertiesService.getScriptProperties().getProperty('BOT_TOKEN') ||
    '';
}

// ------------------------------------------------------------
// Telegram setup/debug helpers (shared)
// ------------------------------------------------------------
function tg_getApiBase_(token) {
  const t = String(token || '').trim();
  return t ? ('https://api.telegram.org/bot' + t) : '';
}

function tg_getWebhookUrl_(propKey, explicitUrl) {
  const sp = PropertiesService.getScriptProperties();
  let url = String(explicitUrl || '').trim();
  if (!url && propKey) url = String(sp.getProperty(String(propKey)) || '').trim();
  if (!url) url = String(AOS_WEBAPP_EXEC_URL_FALLBACK || '').trim();
  if (!url) {
    try {
      url = String(ScriptApp.getService().getUrl() || '').trim();
    } catch (_) {
      url = '';
    }
  }
  return url;
}

function tg_setWebhook_(token, webhookUrl) {
  const apiBase = tg_getApiBase_(token);
  if (!apiBase) throw new Error('tg_setWebhook_: token missing');
  const url = String(webhookUrl || '').trim();
  if (!url) throw new Error('tg_setWebhook_: webhookUrl missing');

  const res = UrlFetchApp.fetch(apiBase + '/setWebhook', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ url: url }),
    muteHttpExceptions: true
  });

  try {
    return JSON.parse(res.getContentText());
  } catch (e) {
    return { ok: false, error: res.getContentText() };
  }
}

function tg_getWebhookInfo_(token) {
  const apiBase = tg_getApiBase_(token);
  if (!apiBase) throw new Error('tg_getWebhookInfo_: token missing');
  const res = UrlFetchApp.fetch(apiBase + '/getWebhookInfo', {
    method: 'get',
    muteHttpExceptions: true
  });
  try {
    return JSON.parse(res.getContentText());
  } catch (e) {
    return { ok: false, error: res.getContentText() };
  }
}

function debugTelegram_() {
  const sp = PropertiesService.getScriptProperties();
  const token = getPrimaryBotToken_();
  const webhookUrl = tg_getWebhookUrl_('TELEGRAM_WEBHOOK_URL', '');
  Logger.log('=== TELEGRAM (primary) ===');
  Logger.log('Token: ' + (token ? 'SET' : 'MISSING'));
  Logger.log('TELEGRAM_WEBHOOK_URL: ' + (String(sp.getProperty('TELEGRAM_WEBHOOK_URL') || '').trim() || 'MISSING'));
  Logger.log('Resolved webhook URL: ' + (webhookUrl || 'MISSING'));
  if (!token) return { ok: false, error: 'token missing' };
  const info = tg_getWebhookInfo_(token);
  Logger.log('Webhook info: ' + JSON.stringify(info));
  return { ok: true, webhookUrl: webhookUrl, info: info };
}

// Template helper for HtmlService templates.
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
