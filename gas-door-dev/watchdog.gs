// ================================================================
// WATCHDOG (heartbeat / bridge health) + Telegram alerts
// Extracted from alphaos_single_project.gs
// ================================================================
const WD_LAST_BEAT_TS = 'WATCHDOG_LAST_BEAT_TS';
const WD_DOWN_FLAG = 'WATCHDOG_IS_DOWN';
const WD_BOT_TOKEN = 'WATCHDOG_BOT_TOKEN';
const WD_CHAT_ID = 'WATCHDOG_CHAT_ID';
const WD_MAX_AGE = 'WATCHDOG_MAX_AGE_MIN';
const WD_LAST_HOST = 'WATCHDOG_LAST_HOST';
const WD_PING_CACHE_PREFIX = 'WD_SESSION_PING_';

const WATCHDOG_OVERRIDES = {
  BOT_TOKEN: '',
  CHAT_ID: ''
};

function watchdog_getBotToken_() {
  const p = PropertiesService.getScriptProperties();
  return (WATCHDOG_OVERRIDES.BOT_TOKEN || p.getProperty(WD_BOT_TOKEN) || '').trim();
}

function watchdog_getChatId_() {
  const p = PropertiesService.getScriptProperties();
  return (WATCHDOG_OVERRIDES.CHAT_ID || p.getProperty(WD_CHAT_ID) || p.getProperty('CHAT_ID') || '').trim();
}

function watchdog_getStatus_() {
  const p = PropertiesService.getScriptProperties();
  const last = Number(p.getProperty(WD_LAST_BEAT_TS) || 0);
  const lastHost = String(p.getProperty(WD_LAST_HOST) || '').trim();
  const maxAgeMin = Number(p.getProperty(WD_MAX_AGE) || 12);
  const maxAgeMs = maxAgeMin * 60 * 1000;
  const ageMin = last ? Math.round((Date.now() - last) / 60000) : null;
  const isDown = last ? (Date.now() - last) > maxAgeMs : true;
  return {
    ok: last ? !isDown : false,
    last: last,
    lastSource: lastHost || null,
    ageMin: ageMin,
    label: last ? (isDown ? `offline (${ageMin}m)` : `online (${ageMin}m)`) : 'no heartbeat',
    maxAgeMin: maxAgeMin
  };
}

function watchdog_getSystemStatus_(options) {
  const status = {};
  const opts = options || {};
  const doPing = opts.ping !== false;
  const touchHeartbeat = opts.touchHeartbeat === true;
  const sessionId = String(opts.sessionId || '').trim() || Utilities.getUuid().slice(0, 8);

  const bridge = (typeof bridgeHealth_ === 'function')
    ? bridgeHealth_()
    : { ok: false, label: 'missing bridgeHealth_', url: '' };
  status.bridge = bridge;
  if (touchHeartbeat && bridge && bridge.ok) {
    watchdog_touchHeartbeat_('hq-bridge-ok');
  }

  // Router status (from ROUTER_STARTUP_TS)
  const sp = PropertiesService.getScriptProperties();
  const routerTs = Number(sp.getProperty('ROUTER_STARTUP_TS') || 0);
  const routerHost = sp.getProperty('ROUTER_HOST') || 'unknown';
  if (routerTs) {
    const ageMin = Math.round((Date.now() - routerTs) / 60000);
    status.router = {
      ok: true,
      label: 'online (' + ageMin + 'm ago)',
      host: routerHost,
      startupTs: routerTs,
      ageMin: ageMin
    };
  } else {
    status.router = { ok: false, label: 'no startup ping' };
  }

  if (typeof watchdog_getStatus_ === 'function') {
    status.heartbeat = watchdog_getStatus_();
  } else {
    status.heartbeat = { ok: null, label: 'watchdog_getStatus_ missing' };
  }

  status.server = {
    iso: new Date().toISOString(),
    locale: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
  };

  if (doPing) {
    try {
      if (typeof watchdog_sendSessionPing_ === 'function') {
        watchdog_sendSessionPing_(sessionId, status);
      }
    } catch (e) {
      Logger.log('Status ping failed: ' + e);
    }
  }

  if (opts.log !== false && typeof debugStatusLog_ === 'function') {
    debugStatusLog_(status);
  }

  return status;
}

function watchdog_touchHeartbeat_(source) {
  const sp = PropertiesService.getScriptProperties();
  sp.setProperty(WD_LAST_BEAT_TS, String(Date.now()));
  if (source) {
    sp.setProperty(WD_LAST_HOST, String(source));
  }
}

function watchdogCheck() {
  const p = PropertiesService.getScriptProperties();
  let last = Number(p.getProperty(WD_LAST_BEAT_TS) || 0);
  const now = Date.now();
  const maxAgeMin = Number(p.getProperty(WD_MAX_AGE) || 12);
  const maxAgeMs = maxAgeMin * 60 * 1000;

  const wasDown = p.getProperty(WD_DOWN_FLAG) === '1';
  const isDown = (now - last) > maxAgeMs;

  if (isDown && !wasDown) {
    p.setProperty(WD_DOWN_FLAG, '1');
    tgSendWatchdog_(
      `🔴 IDEAPAD OFFLINE (no heartbeat)\n` +
      `Last beat age: ~${Math.round((now - last) / 60000)} min\n` +
      `Index GAS still online.`
    );
    Logger.log('Watchdog: OFFLINE (no heartbeat) age=' + Math.round((now - last) / 60000) + 'm');
  }

  if (!isDown && wasDown) {
    p.setProperty(WD_DOWN_FLAG, '0');
    tgSendWatchdog_('🟢 IDEAPAD ONLINE (heartbeat restored)');
    Logger.log('Watchdog: ONLINE (heartbeat restored)');
  }

  Logger.log('Watchdog status: last=' + last + ' ageMin=' + Math.round((now - last) / 60000) +
             ' isDown=' + isDown + ' wasDown=' + wasDown);
}

function tgSendWatchdog_(text, chatId, parseMode, silent) {
  const token = watchdog_getBotToken_();
  const targetChat = String(chatId || watchdog_getChatId_() || '').trim();
  if (!token || !targetChat) return;

  const payload = {
    chat_id: targetChat,
    text: text
  };
  if (parseMode) payload.parse_mode = parseMode;
  if (silent === true) payload.disable_notification = true;

  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function watchdog_mdEscape_(value) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value).replace(/([_*`[\]])/g, '\\$1');
}

function watchdog_statusLabel_(ok) {
  if (ok === true) return 'online';
  if (ok === false) return 'offline';
  return 'unknown';
}

function watchdog_formatAge_(ageMin) {
  if (ageMin === null || typeof ageMin === 'undefined' || isNaN(ageMin)) return 'n/a';
  const min = Number(ageMin);
  if (min < 120) return min + 'm';
  const hours = Math.round(min / 60);
  if (hours < 48) return hours + 'h';
  const days = Math.round((min / 1440) * 10) / 10;
  return days + 'd';
}

function watchdog_formatLast_(ts, ageMin) {
  if (!ts) return 'n/a';
  const local = Utilities.formatDate(new Date(ts), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const age = watchdog_formatAge_(ageMin);
  return local + (age !== 'n/a' ? (' (' + age + ' ago)') : '');
}

function watchdog_getQuote_() {
  try {
    if (typeof nietzsche_getRandomQuote_ === 'function') {
      return nietzsche_getRandomQuote_();
    }
  } catch (e) {
    Logger.log('Quote fetch failed: ' + e);
  }
  return '';
}

function watchdog_formatSystemStatus_(status) {
  const bridge = status && status.bridge ? status.bridge : {};
  const router = status && status.router ? status.router : {};
  const heartbeat = status && status.heartbeat ? status.heartbeat : {};
  const server = status && status.server ? status.server : {};

  const lines = ['*αOS System Status*', ''];

  lines.push('Heartbeat: ' + watchdog_statusLabel_(heartbeat.ok));
  lines.push('Last beat: ' + watchdog_mdEscape_(watchdog_formatLast_(heartbeat.last, heartbeat.ageMin)));
  if (typeof heartbeat.maxAgeMin === 'number') {
    lines.push('Max age: ' + heartbeat.maxAgeMin + 'm');
  }
  if (heartbeat.lastSource) {
    lines.push('Source: ' + watchdog_mdEscape_(heartbeat.lastSource));
  }

  lines.push('');
  lines.push('Bridge: ' + watchdog_statusLabel_(bridge.ok));
  if (typeof bridge.hbAgeMin === 'number') {
    lines.push('Bridge hb: ' + watchdog_formatAge_(bridge.hbAgeMin) + ' ago');
  }
  if (bridge.label && bridge.label !== watchdog_statusLabel_(bridge.ok) && String(bridge.label).indexOf('hb') === -1) {
    lines.push('Detail: ' + watchdog_mdEscape_(bridge.label));
  }

  lines.push('');
  lines.push('Router: ' + watchdog_statusLabel_(router.ok));
  if (router.startupTs) {
    lines.push('Startup: ' + watchdog_mdEscape_(watchdog_formatLast_(router.startupTs, router.ageMin)));
  } else if (router.label) {
    lines.push('Detail: ' + watchdog_mdEscape_(router.label));
  }
  if (router.host) {
    lines.push('Host: ' + watchdog_mdEscape_(router.host));
  }

  lines.push('');
  lines.push('Server time: ' + watchdog_mdEscape_(server.locale || server.iso || 'n/a'));

  const quote = watchdog_getQuote_();
  if (quote) {
    lines.push('');
    lines.push('Nietzsche: "' + watchdog_mdEscape_(quote) + '"');
  }

  return lines.join('\n');
}

function watchdog_sendStatusMessage_(chatId, options) {
  const opts = options || {};
  const status = (typeof getSystemStatus_ === 'function')
    ? getSystemStatus_({ ping: false, log: false, touchHeartbeat: opts.touchHeartbeat === true })
    : { ok: false, error: 'getSystemStatus_ missing' };

  const text = status && status.error
    ? ('❌ System status error: ' + status.error)
    : watchdog_formatSystemStatus_(status);

  tgSendWatchdog_(text, chatId, 'Markdown', true);
  return status;
}

function watchdogDebugPing_(sessionId, bridge) {
  const token = watchdog_getBotToken_();
  const chatId = watchdog_getChatId_();
  if (!token || !chatId) return;

  const msg = '🟢 HQ online\n' +
    'session: ' + (sessionId || 'n/a') + '\n' +
    'bridge: ' + ((bridge && bridge.label) || 'unknown') +
    (bridge && bridge.url ? (' (' + bridge.url + ')') : '');

  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: msg }),
    muteHttpExceptions: true
  });
}

function watchdog_sendSessionPing_(sessionId, status) {
  const token = watchdog_getBotToken_();
  const chatId = watchdog_getChatId_();
  if (!token || !chatId) return { ok: false, error: 'watchdog token/chat missing' };

  const sid = String(sessionId || '').trim();
  if (!sid) return { ok: false, error: 'sessionId missing' };

  const cache = CacheService.getScriptCache();
  const cacheKey = WD_PING_CACHE_PREFIX + sid;
  if (cache.get(cacheKey)) return { ok: true, skipped: true };
  cache.put(cacheKey, '1', 6 * 60 * 60); // 6h

  const base = (typeof watchdog_formatSystemStatus_ === 'function')
    ? watchdog_formatSystemStatus_(status)
    : '*αOS System Status*';
  const msg = base + '\n\n' + 'Session: ' + sid;

  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown', disable_notification: true }),
    muteHttpExceptions: true
  });

  return { ok: true };
}

function watchdog_handleHeartbeat_(payload) {
  const sp = PropertiesService.getScriptProperties();
  sp.setProperty(WD_LAST_BEAT_TS, String(Date.now()));
  if (payload && payload.host) {
    sp.setProperty(WD_LAST_HOST, String(payload.host));
  }
}

function watchdog_handleBridgeHeartbeat_(payload) {
  const sp = PropertiesService.getScriptProperties();
  sp.setProperty('BRIDGE_HEARTBEAT_TS', String(Date.now()));
  if (payload && payload.host) {
    sp.setProperty('BRIDGE_HEARTBEAT_HOST', String(payload.host));
  }
}

function watchdog_handleRouterStartup_(payload) {
  const sp = PropertiesService.getScriptProperties();
  sp.setProperty('ROUTER_STARTUP_TS', String(Date.now()));
  sp.setProperty('ROUTER_STATUS', 'online');
  if (payload && payload.host) {
    sp.setProperty('ROUTER_HOST', String(payload.host));
  }

  // Trigger full system status check (Bridge + Heartbeat + Router)
  try {
    const bridge = (typeof bridgeHealth_ === 'function')
      ? bridgeHealth_()
      : { ok: false, label: 'missing bridgeHealth_', url: '' };

    const heartbeat = watchdog_getStatus_();
    const router = {
      ok: true,
      label: 'online (startup)',
      host: payload && payload.host ? payload.host : 'unknown',
      timestamp: payload && payload.timestamp ? payload.timestamp : new Date().toISOString()
    };

    // Send Telegram notification with full status
    const token = watchdog_getBotToken_();
    const chatId = watchdog_getChatId_();

    if (token && chatId) {
      const msg = '🤖 *Router Bot Online*\n\n' +
        '*Router:* ' + router.label + ' (' + router.host + ')\n' +
        '*Bridge:* ' + (bridge.label || 'unknown') + (bridge.url ? (' → ' + bridge.url) : '') + '\n' +
        '*Heartbeat:* ' + (heartbeat.label || 'unknown') + '\n\n' +
        '_Connection pipeline active._';

      UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          chat_id: chatId,
          text: msg,
          parse_mode: 'Markdown',
          disable_notification: true
        }),
        muteHttpExceptions: true
      });
    }
  } catch (err) {
    Logger.log('Router startup notification failed: ' + err);
  }
}

// Heartbeat hook (bridge/router -> GAS)
// Stores BRIDGE_HEARTBEAT_TS and returns a one-shot bridge health check.
function bridgeHeartbeatHook(e) {
  try {
    let payload = {};
    try {
      payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (_) {
      payload = {};
    }
    watchdog_handleBridgeHeartbeat_(payload);
    const bridge = (typeof bridgeHealth_ === 'function')
      ? bridgeHealth_()
      : { ok: false, label: 'missing bridgeHealth_' };

    return ContentService.createTextOutput(JSON.stringify({ ok: true, bridge: bridge }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('bridgeHeartbeatHook error: ' + err);
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Debug heartbeat hook: stores bridge heartbeat, returns bridge health,
// and optionally pings the watchdog bot (WATCHDOG_BOT_TOKEN).
function bridgeHeartbeatDebugHook(e) {
  try {
    const sp = PropertiesService.getScriptProperties();
    let payload = {};
    try {
      payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (_) {
      payload = {};
    }
    watchdog_handleBridgeHeartbeat_(payload);

    const bridge = (typeof bridgeHealth_ === 'function')
      ? bridgeHealth_()
      : { ok: false, label: 'missing bridgeHealth_', url: '' };

    try {
      const sessionId = Utilities.getUuid().slice(0, 8);
      const msg = '🟢 Bridge heartbeat received\n' +
        'session: ' + sessionId + '\n' +
        'host: ' + (payload.host || 'unknown') + '\n' +
        'bridge: ' + (bridge.label || 'unknown') + ' (' + (bridge.url || 'n/a') + ')';
      tgSendWatchdog_(msg);
    } catch (err) {
      Logger.log('bridgeHeartbeatDebugHook ping failed: ' + err);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true, bridge: bridge }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('bridgeHeartbeatDebugHook error: ' + err);
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function setupWatchdogTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'watchdogCheck') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('watchdogCheck')
    .timeBased()
    .everyMinutes(5)
    .create();
}


// ================================================================
// BRIDGE HELPERS + TASK BOT (moved from bridge.gs)
// ================================================================
// ================================================================
// Bridge helpers (health, status)
// ================================================================
// This module talks to the external Bridge HTTP service (aiohttp, port 8080).
// It does NOT host a bot; it only triggers/reads Bridge endpoints.

/**
 * Bridge health check.
 * - Calls /health on either the API base or root base.
 * - Does NOT flip ok based on heartbeat timestamp; heartbeat is informational.
 * - Used by HQ status to show "online / offline + last heartbeat age".
 */
function bridgeHealth_() {
  const sp = PropertiesService.getScriptProperties();
  const root = (typeof getBridgeRootUrl_ === 'function') ? getBridgeRootUrl_() : '';
  const api = (typeof getBridgeApiUrl_ === 'function') ? getBridgeApiUrl_() : '';

  const res = { ok: false, label: 'not configured', url: (api || root || '') };
  const candidates = [];
  if (api) candidates.push(String(api).replace(/\/$/, '') + '/health');
  if (root) candidates.push(String(root).replace(/\/$/, '') + '/health');
  for (let i = 0; i < candidates.length; i++) {
    const url = candidates[i];
    try {
      const r = UrlFetchApp.fetch(url, {
        headers: (typeof bridge_getAuthHeaders_ === 'function' ? bridge_getAuthHeaders_() : {}),
        muteHttpExceptions: true
      });
      const code = r.getResponseCode();
      if (code >= 200 && code < 300) {
        res.ok = true;
        res.label = 'online';
        res.url = url;
        break;
      }
      res.ok = false;
      res.label = 'HTTP ' + code;
      res.url = url;
    } catch (e) {
      res.ok = false;
      res.label = 'offline: ' + e;
      res.url = url;
    }
  }

  // Heartbeat info (does not flip ok).
  const beat = Number(sp.getProperty('BRIDGE_HEARTBEAT_TS') || 0);
  if (beat) {
    const ageMin = Math.round((Date.now() - beat) / 60000);
    res.hbTs = beat;
    res.hbAgeMin = ageMin;
    res.label = res.ok ? `online (hb ${ageMin}m)` : `hb ${ageMin}m`;
  }

  return res;
}

// ------------------------------------------------
// Bridge task executor (Taskwarrior via Bridge)
// ------------------------------------------------
// Accepts a payload (from Door/Hotlist/etc) and forwards it to:
//   /bridge/task/execute
// The Bridge service will call Taskwarrior and return a JSON response.
function bridge_taskExecutor_(payload) {
  var base = (typeof getBridgeUrl_ === 'function' ? getBridgeUrl_() : '') || '';
  if (!base) return { ok: false, error: 'bridge URL not set' };
  base = String(base || '').replace(/\/$/, '');
  var url = /\/bridge$/.test(base) ? (base + '/task/execute') : (base + '/bridge/task/execute');

  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: (typeof bridge_getAuthHeaders_ === 'function' ? bridge_getAuthHeaders_() : {}),
      payload: JSON.stringify(payload || {}),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    if (code < 200 || code >= 300) {
      return { ok: false, error: 'HTTP ' + code, body: body };
    }
    return JSON.parse(body || '{}');
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function bridge_taskModify_(uuid, updates) {
  var base = (typeof getBridgeUrl_ === 'function' ? getBridgeUrl_() : '') || '';
  if (!base) return { ok: false, error: 'bridge URL not set' };
  base = String(base || '').replace(/\/$/, '');
  var url = /\/bridge$/.test(base) ? (base + '/task/modify') : (base + '/bridge/task/modify');
  var payload = { uuid: uuid || '', updates: updates || {} };
  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: (typeof bridge_getAuthHeaders_ === 'function' ? bridge_getAuthHeaders_() : {}),
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    if (code < 200 || code >= 300) {
      return { ok: false, error: 'HTTP ' + code, body: body };
    }
    return JSON.parse(body || '{}');
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ------------------------------------------------
// Vault sync (Bridge rclone pull/push)
// ------------------------------------------------
// These functions call the Bridge service, which runs rclone to sync
// between Google Drive and the local vault on the Bridge host.
function bridge_syncPull(options) {
  var base = (typeof getBridgeUrl_ === 'function' ? getBridgeUrl_() : '') || '';
  if (!base) return { ok: false, error: 'bridge URL not set' };
  base = String(base || '').replace(/\/$/, '');
  var url = /\/bridge$/.test(base) ? (base + '/sync/pull') : (base + '/bridge/sync/pull');

  var opts = options || {};
  var dryRun = opts.dry_run || opts.dryRun;
  var asyncFlag = (typeof opts.async === 'undefined') ? true : opts.async;
  var params = [];
  if (dryRun) params.push('dry_run=1');
  if (asyncFlag) params.push('async=1');
  if (params.length) {
    url += '?' + params.join('&');
  }

  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: (typeof bridge_getAuthHeaders_ === 'function' ? bridge_getAuthHeaders_() : {}),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    var json = null;
    try {
      json = JSON.parse(body || '{}');
    } catch (_) {
      json = { raw: body };
    }
    if (code < 200 || code >= 300) {
      return { ok: false, error: 'HTTP ' + code, body: json };
    }
    if (json && typeof json.ok === 'boolean') return json;
    return { ok: true, body: json };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function bridge_syncPush(options) {
  var base = (typeof getBridgeUrl_ === 'function' ? getBridgeUrl_() : '') || '';
  if (!base) return { ok: false, error: 'bridge URL not set' };
  base = String(base || '').replace(/\/$/, '');
  var url = /\/bridge$/.test(base) ? (base + '/sync/push') : (base + '/bridge/sync/push');

  var opts = options || {};
  var dryRun = opts.dry_run || opts.dryRun;
  if (dryRun) {
    url += '?dry_run=1';
  }

  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: (typeof bridge_getAuthHeaders_ === 'function' ? bridge_getAuthHeaders_() : {}),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    var json = null;
    try {
      json = JSON.parse(body || '{}');
    } catch (_) {
      json = { raw: body };
    }
    if (code < 200 || code >= 300) {
      return { ok: false, error: 'HTTP ' + code, body: json };
    }
    if (json && typeof json.ok === 'boolean') return json;
    return { ok: true, body: json };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ------------------------------------------------
// Core4 pull trigger (Bridge core4ctl pull-core4)
// ------------------------------------------------
function bridge_core4Pull(options) {
  // This is intentionally best-effort + throttled.
  // Why: Core4 logs can happen fast (Telegram buttons, batch logging, etc).
  // We only need to *hint* the laptop to pull GDrive ledger updates; pulling too often wastes time and
  // can amplify temporary rclone auth/network issues.
  var opts = options || {};
  var throttleSec = Number(opts.throttleSec || 20);
  if (throttleSec > 0) {
    try {
      var cache = CacheService.getScriptCache();
      var k = 'core4_pull_throttle';
      if (cache.get(k)) return { ok: true, skipped: true, reason: 'throttled' };
      cache.put(k, '1', throttleSec);
    } catch (e) {}
  }
  var base = (typeof getBridgeUrl_ === 'function' ? getBridgeUrl_() : '') || '';
  if (!base) return { ok: false, error: 'bridge URL not set' };
  base = String(base || '').replace(/\/$/, '');
  var url = /\/bridge$/.test(base) ? (base + '/core4/pull') : (base + '/bridge/core4/pull');

  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: (typeof bridge_getAuthHeaders_ === 'function' ? bridge_getAuthHeaders_() : {}),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    var json = null;
    try {
      json = JSON.parse(body || '{}');
    } catch (_) {
      json = { raw: body };
    }
    if (code < 200 || code >= 300) {
      return { ok: false, error: 'HTTP ' + code, body: json };
    }
    if (json && typeof json.ok === 'boolean') return json;
    return { ok: true, body: json };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ================================================================
// BRIDGE CHECK (explicit /health on bridge root URL)
// ================================================================
function bridgeCheck_() {
  const api = (typeof getBridgeApiUrl_ === 'function') ? getBridgeApiUrl_() : '';
  const root = (typeof getBridgeRootUrl_ === 'function') ? getBridgeRootUrl_() : '';
  const candidates = [];
  if (api) candidates.push(String(api).replace(/\/$/, '') + '/health');
  if (root) candidates.push(String(root).replace(/\/$/, '') + '/health');
  if (!candidates.length) return { ok: false, url: '', label: 'bridge URL missing' };
  for (let i = 0; i < candidates.length; i++) {
    const url = candidates[i];
    try {
      const res = UrlFetchApp.fetch(url, {
        headers: bridge_getAuthHeaders_(),
        muteHttpExceptions: true
      });
      const code = res.getResponseCode();
      if (code >= 200 && code < 300) {
        return { ok: true, url: url, label: 'online' };
      }
      if (i === candidates.length - 1) return { ok: false, url: url, label: 'HTTP ' + code };
    } catch (e) {
      if (i === candidates.length - 1) return { ok: false, url: url, label: 'error: ' + e };
    }
  }
  return { ok: false, url: '', label: 'unknown' };
}

function setupBridgePullTrigger() {
  // Schedule a daily pull (Drive -> local).
  ScriptApp.newTrigger('bridge_syncPull')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();
  return { ok: true };
}

function setupBridgePushTrigger() {
  // Schedule a daily push (local -> Drive).
  ScriptApp.newTrigger('bridge_syncPush')
    .timeBased()
    .everyDays(1)
    .atHour(21)
    .create();
  return { ok: true };
}

// ================================================================
// TASK BRIDGE BOT (NAMESPACED)
// ================================================================
// The "Task Bridge Bot" is a Telegram control layer for sync tasks.
// It receives updates via the primary GAS webhook (doPost in entrypoints.gs)
// and forwards commands to Bridge or TickTick.

const BOT_CONFIG = {
  TELEGRAM_TOKEN: (typeof getPrimaryBotToken_ === 'function')
    ? getPrimaryBotToken_()
    : (PropertiesService.getScriptProperties().getProperty('BOT_TOKEN') || ''),
  CHAT_ID: PropertiesService.getScriptProperties().getProperty('CHAT_ID') || '',
  SHEET_ID: PropertiesService.getScriptProperties().getProperty('SYNC_SHEET_ID') || '',
  WEBHOOK_URL: PropertiesService.getScriptProperties().getProperty('BRIDGE_WEBHOOK_URL') || ''
};

function bridge_handleTelegramMessage(message) {
  const chatId = message.chat.id;
  const text = message.text;

  const allowedChatId = PropertiesService.getScriptProperties().getProperty('CHAT_ID');
  if (chatId.toString() !== allowedChatId) {
    // Ignore messages from other chats for safety.
    return;
  }

  Logger.log(`Received message: ${text}`);

  if (text.startsWith('/')) {
    bridge_handleBotCommand(chatId, text);
  } else {
    bridge_handleTaskOperation(chatId, text);
  }
}

function bridge_handleBotCommand(chatId, command) {
  // Parse "/command args" and route to a handler.
  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  switch (cmd) {
    case '/start':
      bridge_sendTelegramMessage(
        chatId,
        `🤖 *Task Bridge Bot Active*\n\nCommands:\n/push - Vault push (Bridge rclone)\n/pull - Vault pull (Bridge rclone)\n/sync - Task sync (TickTick <-> Taskwarrior)\n/status - Task sync status\n/help - Show help`
      );
      break;

    case '/sync':
      bridge_performManualSync(chatId);
      break;
    case '/push':
    case '/vaultpush':
      bridge_pushVault(chatId);
      break;
    case '/pull':
    case '/vaultpull':
      bridge_pullVault(chatId);
      break;

    case '/status':
      bridge_showSyncStatus(chatId);
      break;

    case '/hot':
      bridge_addToHotList(chatId, args);
      break;

    case '/hit':
      bridge_addHitTask(chatId, args);
      break;

    case '/done':
      bridge_markTaskDone(chatId, args);
      break;

    case '/help':
      bridge_showHelp(chatId);
      break;

    default:
      bridge_sendTelegramMessage(chatId, `❓ Unknown command: ${cmd}\nType /help for available commands`);
  }
}

function bridge_handleTaskOperation(chatId, message) {
  // Task operations are JSON payloads posted back from Bridge.
  // This allows asynchronous "task_add", "task_done", "task_sync" callbacks.
  try {
    const operation = JSON.parse(message);

    switch (operation.type) {
      case 'task_add':
        bridge_handleTaskAdd(chatId, operation);
        break;

      case 'task_done':
        bridge_handleTaskDone(chatId, operation);
        break;

      case 'task_sync':
        bridge_handleTaskSync(chatId, operation);
        break;

      case 'task_export':
        bridge_handleTaskExport(chatId, operation);
        break;

      default:
        Logger.log('Unknown operation type:', operation.type);
    }

  } catch (error) {
    Logger.log('Non-JSON message received:', message);
  }
}

function bridge_handleTaskAdd(chatId, operation) {
  // Taskwarrior -> TickTick bridge for new tasks (tag filtered).
  const { uuid, description, tags, project, priority, due } = operation.data;

  const syncTags = ['door', 'hit', 'strike'];
  const shouldSync = tags && tags.some(tag => syncTags.includes(tag));

  if (shouldSync) {
    const ticktickUuid = bridge_createTickTickTaskFromTaskwarrior({
      title: description,
      tags: tags,
      project: project,
      priority: priority,
      due: due
    });

    if (ticktickUuid) {
      addTaskMapping(ticktickUuid, uuid, description, 'taskwarrior_add', tags);
      bridge_sendTelegramMessage(chatId, `✅ Task synced to TickTick\n📝 *${description}*\n🏷️ ${tags.join(', ')}`);
    } else {
      bridge_sendTelegramMessage(chatId, `❌ Failed to sync task to TickTick\n📝 *${description}*`);
    }
  }
}

function bridge_handleTaskDone(chatId, operation) {
  // Taskwarrior completion -> mirror completion in TickTick.
  const { uuid, description } = operation.data;

  const mapping = bridge_findMappingByTaskwarriorUuid(uuid);

  if (mapping && mapping.ticktickUuid) {
    const success = bridge_completeTickTickTask(mapping.ticktickUuid);

    if (success) {
      bridge_updateMappingStatus(mapping.row, 'completed');
      bridge_sendTelegramMessage(chatId, `✅ Task completed in both systems\n📝 *${description}*`);
    } else {
      bridge_sendTelegramMessage(chatId, `⚠️ Task completed in Taskwarrior but failed to sync to TickTick\n📝 *${description}*`);
    }
  }
}

function bridge_handleTaskSync(chatId, operation) {
  // Manual sync request using task_export snapshot.
  bridge_sendTelegramMessage(chatId, '🔄 Starting sync...');

  const stats = syncTasksBetweenSystems({ source: 'export' });

  const message = `🔄 *Sync Complete*\n\n` +
    `Created in TickTick: ${stats.created.ticktick}\n` +
    `Created in Taskwarrior: ${stats.created.taskwarrior}\n` +
    `Updated: ${stats.updated.ticktick + stats.updated.taskwarrior}\n` +
    `Errors: ${stats.errors}`;

  bridge_sendTelegramMessage(chatId, message);
}

function bridge_handleTaskExport(chatId, operation) {
  // Bulk sync from task_export.json payload (Bridge -> GAS).
  const { tasks } = operation.data;

  let syncCount = 0;
  const syncTags = ['door', 'hit', 'strike'];

  tasks.forEach(task => {
    const shouldSync = task.tags && task.tags.some(tag => syncTags.includes(tag));

    if (shouldSync && task.status === 'pending') {
      const existingMapping = bridge_findMappingByTaskwarriorUuid(task.uuid);

      if (!existingMapping) {
        const ticktickUuid = bridge_createTickTickTaskFromTaskwarrior({
          title: task.description,
          tags: task.tags,
          project: task.project,
          priority: task.priority,
          due: task.due
        });

        if (ticktickUuid) {
          addTaskMapping(ticktickUuid, task.uuid, task.description, 'export_sync', task.tags);
          syncCount++;
        }
      }
    }
  });

  bridge_sendTelegramMessage(chatId, `📥 *Export Sync Complete*\n\nSynced ${syncCount} tasks from Taskwarrior to TickTick`);
}

function bridge_sendTelegramMessage(chatId, text, parseMode) {
  // Generic Telegram sender for Task Bridge Bot.
  const token = (typeof getPrimaryBotToken_ === 'function')
    ? getPrimaryBotToken_()
    : (PropertiesService.getScriptProperties().getProperty('BOT_TOKEN') || '');
  if (!token) {
    Logger.log('bridge_sendTelegramMessage: BOT_TOKEN missing');
    return;
  }

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: parseMode || 'Markdown'
  };

  try {
    UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload)
    });
  } catch (error) {
    Logger.log('Error sending Telegram message:', error);
  }
}

function bridge_addToHotList(chatId, idea) {
  // Quick idea capture -> TickTick "hot" task.
  if (!idea) {
    bridge_sendTelegramMessage(chatId, '💡 Usage: /hot <your idea>');
    return;
  }

  const ticktickUuid = createTickTickTask({
    title: `💡 ${idea}`,
    tags: ['hot', 'idea'],
    project: 'Inbox'
  });

  if (ticktickUuid) {
    bridge_sendTelegramMessage(chatId, `💡 *Idea captured!*\n\n${idea}`);
  } else {
    bridge_sendTelegramMessage(chatId, `❌ Failed to capture idea`);
  }
}

function bridge_addHitTask(chatId, taskDescription) {
  // Quick hit capture -> TickTick "hit" task.
  if (!taskDescription) {
    bridge_sendTelegramMessage(chatId, '🎯 Usage: /hit <task description>');
    return;
  }

  const ticktickUuid = createTickTickTask({
    title: `🎯 ${taskDescription}`,
    tags: ['hit'],
    project: 'Hits'
  });

  if (ticktickUuid) {
    bridge_sendTelegramMessage(chatId, `🎯 *Hit added!*\n\n${taskDescription}`);
  } else {
    bridge_sendTelegramMessage(chatId, `❌ Failed to add hit task`);
  }
}

function bridge_markTaskDone(chatId, taskQuery) {
  // Placeholder: Task completion by search is not implemented yet.
  if (!taskQuery) {
    bridge_sendTelegramMessage(chatId, '✅ Usage: /done <task search term>');
    return;
  }

  bridge_sendTelegramMessage(chatId, `✅ Task completion not yet implemented\n\nSearch: "${taskQuery}"`);
}

function bridge_showHelp(chatId) {
  // Human readable help for the Task Bridge Bot.
  const helpText = `🤖 *Task Bridge Bot Help*\n\n` +
    `*Quick Commands:*\n` +
    `/hot <idea> - Add to Hot List\n` +
    `/hit <task> - Add Hit task\n` +
    `/done <search> - Mark task done\n` +
    `/push - Vault push (Bridge rclone)\n` +
    `/pull - Vault pull (Bridge rclone)\n` +
    `/sync - Task sync (TickTick <-> Taskwarrior)\n` +
    `/status - Task sync status\n\n` +
    `*Task Sync Scope:*\n` +
    `• Tags #door #hit #strike only (pending)\n\n` +
    `*Fish Integration:*\n` +
    `• \`task_add_sync\` - Auto-sync new tasks\n` +
    `• \`task_done_sync <uuid>\` - Complete & sync\n` +
    `• \`task_sync_all\` - Full sync\n` +
    `• \`task_export_sync\` - Export-based sync\n\n` +
    `*Tags for Auto-Sync:*\n` +
    `• #door - Strategic priorities\n` +
    `• #hit - Daily targets\n` +
    `• #strike - Action items`;

  bridge_sendTelegramMessage(chatId, helpText);
}

function bridge_showSyncStatus(chatId) {
  // Quick summary of the sync map + last full sync timestamp.
  const mappings = getAllMappings();
  const totalMapped = mappings.length;
  const recentSyncs = mappings.filter(m => {
    const lastSync = new Date(m.lastSync);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return lastSync > oneDayAgo;
  }).length;

  const statusText = `📊 *Sync Status*\n\n` +
    `Total mapped tasks: ${totalMapped}\n` +
    `Synced in last 24h: ${recentSyncs}\n` +
    `Last full sync: ${bridge_getLastFullSyncTime()}\n\n` +
    `🔄 Auto-sync: Active\n` +
    `📱 Mobile access: TickTick\n` +
    `💻 Terminal access: Taskwarrior\n` +
    `🏷️ Scope: #door #hit #strike`;

  bridge_sendTelegramMessage(chatId, statusText);
}

function bridge_pullVault(chatId) {
  // Manual pull (Drive -> local) via Bridge.
  bridge_sendTelegramMessage(chatId, '📥 Pulling Vault from Drive...');
  const res = bridge_syncPull();
  if (res && res.ok) {
    bridge_sendTelegramMessage(chatId, '✅ Vault pull complete');
  } else {
    bridge_sendTelegramMessage(chatId, `❌ Vault pull failed\n${(res && res.error) || 'Unknown error'}`);
  }
}

function bridge_pushVault(chatId) {
  // Manual push (local -> Drive) via Bridge.
  bridge_sendTelegramMessage(chatId, '📤 Pushing Vault to Drive...');
  const res = bridge_syncPush();
  if (res && res.ok) {
    bridge_sendTelegramMessage(chatId, '✅ Vault push complete');
  } else {
    bridge_sendTelegramMessage(chatId, `❌ Vault push failed\n${(res && res.error) || 'Unknown error'}`);
  }
}

function bridge_performManualSync(chatId) {
  // Full sync using task_export snapshot (no live Taskwarrior access).
  bridge_sendTelegramMessage(chatId, '🔄 Starting manual sync...');

  try {
    const stats = syncTasksBetweenSystems();

    const message = `✅ *Manual Sync Complete*\n\n` +
      `📝 Created in TickTick: ${stats.created.ticktick}\n` +
      `⚡ Created in Taskwarrior: ${stats.created.taskwarrior}\n` +
      `🔄 Updates: ${stats.updated.ticktick + stats.updated.taskwarrior}\n` +
      `❌ Errors: ${stats.errors}`;

    bridge_sendTelegramMessage(chatId, message);
  } catch (error) {
    bridge_sendTelegramMessage(chatId, `❌ Sync failed: ${error.message}`);
  }
}

function bridge_getLastFullSyncTime() {
  const lastSync = PropertiesService.getScriptProperties().getProperty('LAST_FULL_SYNC');
  return lastSync || 'Never';
}

function bridge_initializeTelegramBot() {
  // Registers the webhook and ensures mapping sheet exists.
  bridge_setTelegramWebhook();
  initializeTaskSyncMap();
  Logger.log('Telegram Task Bridge Bot initialized!');
}

function bridge_setTelegramWebhook(url) {
  // Sets Telegram webhook for the primary bot to this GAS WebApp.
  // This is NOT for the Bridge service itself.
  const sp = PropertiesService.getScriptProperties();
  const token = (typeof getPrimaryBotToken_ === 'function')
    ? getPrimaryBotToken_()
    : (sp.getProperty('BOT_TOKEN') || '');
  if (!token) throw new Error('bridge_setTelegramWebhook: Telegram token missing');

  let webhookUrl = String(url || '').trim();
  if (!webhookUrl) webhookUrl = String(sp.getProperty('TELEGRAM_WEBHOOK_URL') || '').trim();
  if (!webhookUrl) webhookUrl = String(sp.getProperty('BRIDGE_WEBHOOK_URL') || '').trim();
  webhookUrl = tg_getWebhookUrl_('', webhookUrl);
  if (!webhookUrl) throw new Error('bridge_setTelegramWebhook: webhook url missing');
  if (url) sp.setProperty('TELEGRAM_WEBHOOK_URL', webhookUrl);
  return tg_setWebhook_(token, webhookUrl);
}

function bridge_createTickTickTaskFromTaskwarrior(task) {
  // Normalize Taskwarrior task fields to TickTick payload.
  return createTickTickTask({
    title: task.title,
    tags: task.tags || [],
    project: task.project || 'Inbox',
    priority: task.priority,
    due: task.due
  });
}

function bridge_findMappingByTaskwarriorUuid(uuid) {
  // Lookup mapping row by Taskwarrior UUID.
  const mappings = getAllMappings();
  return mappings.find(m => m.taskwarriorUuid === uuid) || null;
}

function bridge_updateMappingStatus(row, status) {
  // Update mapping sheet row status in place.
  const ss = SpreadsheetApp.openById(SYNC_CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(SYNC_CONFIG.SYNC_SHEET_NAME);
  sheet.getRange(row, 4).setValue(status);
}

function bridge_completeTickTickTask(taskId) {
  // Mark a TickTick task as completed.
  const token = PropertiesService.getScriptProperties().getProperty('TICKTICK_TOKEN');
  if (!token) return false;

  const url = `https://api.ticktick.com/open/v1/task/${encodeURIComponent(taskId)}/complete`;
  const res = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  });

  return res.getResponseCode() >= 200 && res.getResponseCode() < 300;
}

// ================================================================
// TASK SYNC MAPPING SYSTEM (INLINE)
// ================================================================
// Stores Taskwarrior <-> TickTick relationships in a Google Sheet.
// This allows idempotent sync and status tracking across both systems.

const SYNC_CONFIG = {
  SHEET_ID: PropertiesService.getScriptProperties().getProperty('SYNC_SHEET_ID') || '',
  SYNC_SHEET_NAME: 'Task_Sync_Map',
  TASKWARRIOR_ENDPOINT: PropertiesService.getScriptProperties().getProperty('TASKWARRIOR_ENDPOINT') || '',
  TICKTICK_API: {
    BASE_URL: 'https://api.ticktick.com/open/v1',
    TOKEN: PropertiesService.getScriptProperties().getProperty('TICKTICK_TOKEN') || ''
  },
  SYNC_TAGS: ['door', 'hit', 'strike'],
  CONFLICT_RESOLUTION: 'last_modified_wins'
};

function initializeTaskSyncMap() {
  // Create the sync mapping sheet if it does not exist.
  const ss = SpreadsheetApp.openById(SYNC_CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(SYNC_CONFIG.SYNC_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SYNC_CONFIG.SYNC_SHEET_NAME);
  }

  const headers = [
    'TickTick_UUID',
    'Taskwarrior_UUID',
    'Title',
    'Status',
    'Last_Sync',
    'Source',
    'Conflict_Reason',
    'TickTick_Modified',
    'Taskwarrior_Modified',
    'Tags'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 120);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 200);
}

function addTaskMapping(ticktickUuid, taskwarriorUuid, title, source, tags) {
  // Upsert mapping for a task pair.
  const ss = SpreadsheetApp.openById(SYNC_CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(SYNC_CONFIG.SYNC_SHEET_NAME);
  const existingRow = findMappingRow(ticktickUuid, taskwarriorUuid);

  const now = new Date();
  const rowData = [
    ticktickUuid || '',
    taskwarriorUuid || '',
    title,
    'synced',
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    source || 'sync',
    '',
    '',
    '',
    (tags || []).join(', ')
  ];

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function findMappingRow(ticktickUuid, taskwarriorUuid) {
  // Scan the sheet for a TickTick or Taskwarrior UUID match.
  const ss = SpreadsheetApp.openById(SYNC_CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(SYNC_CONFIG.SYNC_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowTickTick = data[i][0];
    const rowTaskwarrior = data[i][1];

    if ((ticktickUuid && rowTickTick === ticktickUuid) ||
        (taskwarriorUuid && rowTaskwarrior === taskwarriorUuid)) {
      return i + 1;
    }
  }

  return -1;
}

function getAllMappings() {
  // Return all mappings as objects (no filtering).
  const ss = SpreadsheetApp.openById(SYNC_CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(SYNC_CONFIG.SYNC_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const mappings = [];
  for (let i = 1; i < data.length; i++) {
    mappings.push({
      ticktickUuid: data[i][0],
      taskwarriorUuid: data[i][1],
      title: data[i][2],
      status: data[i][3],
      lastSync: data[i][4],
      source: data[i][5],
      conflictReason: data[i][6],
      ticktickModified: data[i][7],
      taskwarriorModified: data[i][8],
      tags: data[i][9] ? data[i][9].split(', ') : [],
      row: i + 1
    });
  }

  return mappings;
}

function getTickTickSyncableTasks() {
  // Pull open TickTick tasks tagged for sync (door/hit/strike).
  const token = PropertiesService.getScriptProperties().getProperty('TICKTICK_TOKEN');
  if (!token) return [];

  try {
    const projectsResponse = UrlFetchApp.fetch(`${SYNC_CONFIG.TICKTICK_API.BASE_URL}/project`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });

    const projects = JSON.parse(projectsResponse.getContentText());
    const syncableTasks = [];

    projects.forEach(project => {
      const tasksResponse = UrlFetchApp.fetch(`${SYNC_CONFIG.TICKTICK_API.BASE_URL}/project/${project.id}/task`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      const tasks = JSON.parse(tasksResponse.getContentText());

      tasks.forEach(task => {
        const taskTags = task.tags || [];
        const hasSyncTag = SYNC_CONFIG.SYNC_TAGS.some(tag =>
          taskTags.includes(tag) || String(task.title || '').includes(`#${tag}`)
        );

        if (hasSyncTag && task.status === 0) {
          syncableTasks.push({
            uuid: task.id,
            title: task.title,
            description: task.content || '',
            due: task.dueDate,
            priority: task.priority,
            tags: taskTags,
            modified: task.modifiedTime,
            project: project.name
          });
        }
      });
    });

    return syncableTasks;

  } catch (error) {
    Logger.log('Error fetching TickTick tasks:', error);
    return [];
  }
}

function createTickTickTask(task) {
  // Create a TickTick task (minimal wrapper around TickTick Open API).
  const token = PropertiesService.getScriptProperties().getProperty('TICKTICK_TOKEN');

  const payload = {
    title: task.title,
    content: task.description || '',
    tags: task.tags || [],
    priority: task.priority || 0,
    dueDate: task.due || null
  };

  try {
    const response = UrlFetchApp.fetch(`${SYNC_CONFIG.TICKTICK_API.BASE_URL}/task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    });

    const createdTask = JSON.parse(response.getContentText());
    return createdTask.id;

  } catch (error) {
    Logger.log('Error creating TickTick task:', error);
    return null;
  }
}

function getTaskwarriorSyncableTasks() {
  // Prefer API endpoint; otherwise fall back to task_export.json.
  if (!SYNC_CONFIG.TASKWARRIOR_ENDPOINT) {
    return getTaskwarriorTasksFromFile();
  }

  try {
    const response = UrlFetchApp.fetch(`${SYNC_CONFIG.TASKWARRIOR_ENDPOINT}/tasks`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const tasks = JSON.parse(response.getContentText());

    return tasks.filter(task => {
      const taskTags = task.tags || [];
      return SYNC_CONFIG.SYNC_TAGS.some(tag => taskTags.includes(tag)) &&
             task.status === 'pending';
    }).map(task => ({
      uuid: task.uuid,
      title: task.description,
      description: task.annotations ? task.annotations.map(a => a.description).join('\n') : '',
      due: task.due,
      priority: task.priority,
      tags: task.tags || [],
      modified: task.modified,
      project: task.project
    }));

  } catch (error) {
    Logger.log('Error fetching Taskwarrior tasks via API:', error);
    return getTaskwarriorTasksFromFile();
  }
}

function aos_findTaskExportFileId_once_() {
  // One-time lookup of AlphaOS-Vault/.alphaos/task_export.json.
  const alphaos = aos_getAlphaosVaultFolder_();
  const fileIt = alphaos.getFilesByName('task_export.json');
  if (!fileIt.hasNext()) throw new Error('task_export.json not found in AlphaOS-Vault/.alphaos');
  const id = fileIt.next().getId();
  PropertiesService.getScriptProperties().setProperty('AOS_TASK_EXPORT_FILE_ID', id);
  return id;
}

function aos_getAlphaosVaultFolder_() {
  // Resolve Drive folder AlphaOS-Vault/.alphaos.
  const rootIt = DriveApp.getFoldersByName('AlphaOS-Vault');
  if (!rootIt.hasNext()) throw new Error('AlphaOS-Vault folder not found');
  const root = rootIt.next();
  const alphaosIt = root.getFoldersByName('.alphaos');
  if (!alphaosIt.hasNext()) throw new Error('AlphaOS-Vault/.alphaos folder not found');
  return alphaosIt.next();
}

function aos_readTaskExportRaw_() {
  // Read task_export.json by stored file id (or discover once).
  const sp = PropertiesService.getScriptProperties();
  let id = sp.getProperty('AOS_TASK_EXPORT_FILE_ID');
  if (!id) {
    id = aos_findTaskExportFileId_once_();
  }
  return DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8');
}

function aos_loadTaskExport_() {
  // Parse task_export.json into an array.
  const text = aos_readTaskExportRaw_();
  const tasks = JSON.parse(text || '[]');
  return Array.isArray(tasks) ? tasks : [];
}

function aos_getTaskExportCacheFile_() {
  // Get cached task_export file in Drive (task_export_cache.json).
  const sp = PropertiesService.getScriptProperties();
  let id = sp.getProperty('AOS_TASK_EXPORT_CACHE_ID');
  if (id) {
    try {
      return DriveApp.getFileById(id);
    } catch (_) {}
  }
  const alphaos = aos_getAlphaosVaultFolder_();
  const it = alphaos.getFilesByName('task_export_cache.json');
  if (!it.hasNext()) return null;
  const file = it.next();
  sp.setProperty('AOS_TASK_EXPORT_CACHE_ID', file.getId());
  return file;
}

function aos_loadTaskExportCache_() {
  // Parse cached task_export snapshot (if present).
  const file = aos_getTaskExportCacheFile_();
  if (!file) return [];
  const text = file.getBlob().getDataAsString('UTF-8');
  const tasks = JSON.parse(text || '[]');
  return Array.isArray(tasks) ? tasks : [];
}

function aos_loadTaskExportSafe_() {
  // Robust load: try primary, then cached snapshot.
  try {
    return aos_loadTaskExport_();
  } catch (error) {
    Logger.log('Primary task_export load failed: ' + error);
  }
  try {
    return aos_loadTaskExportCache_();
  } catch (error) {
    Logger.log('Cached task_export load failed: ' + error);
  }
  return [];
}

function aos_snapshotTaskExport_() {
  // Snapshot task_export.json into Drive cache (task_export_cache.json).
  const sp = PropertiesService.getScriptProperties();
  const alphaos = aos_getAlphaosVaultFolder_();
  const raw = aos_readTaskExportRaw_();
  let file = aos_getTaskExportCacheFile_();
  if (!file) {
    file = alphaos.createFile('task_export_cache.json', raw, MimeType.PLAIN_TEXT);
  } else {
    file.setContent(raw);
  }
  sp.setProperty('AOS_TASK_EXPORT_CACHE_ID', file.getId());
  sp.setProperty('AOS_TASK_EXPORT_CACHE_TS', String(Date.now()));
  return { ok: true, fileId: file.getId(), bytes: raw.length };
}

function setupTaskExportSnapshotTrigger() {
  // Scheduled snapshot to keep cache fresh when the vault file is stale.
  const handler = 'aos_snapshotTaskExport_';
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(trigger => trigger.getHandlerFunction() === handler);
  if (exists) return { ok: true, skipped: true };
  ScriptApp.newTrigger(handler)
    .timeBased()
    .everyHours(6)
    .create();
  return { ok: true };
}

function getTaskwarriorTasksFromFile() {
  try {
    const tasks = aos_loadTaskExportSafe_();
    return tasks.filter(task => {
      const taskTags = task.tags || [];
      return SYNC_CONFIG.SYNC_TAGS.some(tag => taskTags.includes(tag)) &&
             task.status === 'pending';
    });
  } catch (error) {
    Logger.log('Error reading Taskwarrior export file: ' + error);
    return [];
  }
}

function createTaskwarriorTask(task) {
  if (!SYNC_CONFIG.TASKWARRIOR_ENDPOINT) {
    generateTaskwarriorImportCommands([task]);
    return null;
  }

  try {
    const payload = {
      description: task.title,
      tags: task.tags || [],
      priority: task.priority,
      due: task.due,
      project: task.project
    };

    const response = UrlFetchApp.fetch(`${SYNC_CONFIG.TASKWARRIOR_ENDPOINT}/task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload)
    });

    const createdTask = JSON.parse(response.getContentText());
    return createdTask.uuid;

  } catch (error) {
    Logger.log('Error creating Taskwarrior task via API:', error);
    generateTaskwarriorImportCommands([task]);
    return null;
  }
}

function generateTaskwarriorImportCommands(tasks) {
  const commands = tasks.map(task => {
    let cmd = `task add "${task.title}"`;

    if (task.tags && task.tags.length > 0) {
      cmd += ` +${task.tags.join(' +')}`;
    }

    if (task.priority) {
      cmd += ` priority:${task.priority}`;
    }

    if (task.due) {
      cmd += ` due:${task.due}`;
    }

    if (task.project) {
      cmd += ` project:${task.project}`;
    }

    return cmd;
  });

  DriveApp.createFile('taskwarrior_import_commands.sh', commands.join('\n'), MimeType.PLAIN_TEXT);
  Logger.log(`Generated ${commands.length} Taskwarrior import commands`);
  return commands;
}

function syncTasksBetweenSystems(options) {
  Logger.log('Starting bidirectional task sync...');

  const opts = options || {};
  const source = String(opts.source || '').toLowerCase();
  const useExport = source === 'export' || opts.forceExport === true;

  const ticktickTasks = getTickTickSyncableTasks();
  const taskwarriorTasks = useExport ? getTaskwarriorTasksFromFile() : getTaskwarriorSyncableTasks();
  const existingMappings = getAllMappings();

  const syncStats = {
    created: { ticktick: 0, taskwarrior: 0 },
    updated: { ticktick: 0, taskwarrior: 0 },
    conflicts: 0,
    errors: 0
  };

  ticktickTasks.forEach(ttTask => {
    const mapping = existingMappings.find(m => m.ticktickUuid === ttTask.uuid);

    if (!mapping) {
      const twUuid = createTaskwarriorTask(ttTask);
      if (twUuid) {
        addTaskMapping(ttTask.uuid, twUuid, ttTask.title, 'ticktick_to_taskwarrior', ttTask.tags);
        syncStats.created.taskwarrior++;
      } else {
        syncStats.errors++;
      }
    }
  });

  taskwarriorTasks.forEach(twTask => {
    const mapping = existingMappings.find(m => m.taskwarriorUuid === twTask.uuid);

    if (!mapping) {
      const ttUuid = createTickTickTask(twTask);
      if (ttUuid) {
        addTaskMapping(ttUuid, twTask.uuid, twTask.title, 'taskwarrior_to_ticktick', twTask.tags);
        syncStats.created.ticktick++;
      } else {
        syncStats.errors++;
      }
    }
  });

  Logger.log('Sync completed:', syncStats);
  return syncStats;
}

// ------------------------------------------------
// (Removed) bridgeHeartbeatHook: consolidated into watchdog + doPost heartbeat.
// ------------------------------------------------


// ================================================================
// TELEGRAM COMMAND ROUTER (moved from router.gs)
// ================================================================
// ================================================================
// GAS TELEGRAM COMMAND ROUTER (NAMESPACED)
//
// Note: This is not the Python `router/` service. This file routes
// Telegram commands inside the GAS `doPost` webhook (see entrypoints.gs).
//
// If Script Properties are locked/full, you can hardcode values below.
// Leave empty strings to keep Script Properties / defaults.
// ================================================================

const ROUTER_OVERRIDES = {
  BOT_TOKEN: '',           // Telegram bot token (primary)
  WARSTACK_BOT_USERNAME: '', // e.g. '@WarStackBotIDEAPAD_Bot'
  CHAT_ID: '',             // Default chat id for status/help routing
  BRIDGE_URL: '',          // Root URL (no /bridge), e.g. https://host.ts.net
  TRIGGER_URL: '',         // Optional explicit trigger URL
  WEBAPP_URL: ''           // Optional WebApp URL override (use /exec)
};

const ROUTER_CONFIG = {
  BOT_TOKEN: (ROUTER_OVERRIDES.BOT_TOKEN || '') ||
    ((typeof getPrimaryBotToken_ === 'function')
      ? getPrimaryBotToken_()
      : (PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN') ||
        PropertiesService.getScriptProperties().getProperty('ALPHAOS_BOT_TOKEN') ||
        PropertiesService.getScriptProperties().getProperty('BOT_TOKEN') ||
        '')),
  WARSTACK_BOT_USERNAME: (ROUTER_OVERRIDES.WARSTACK_BOT_USERNAME || '') ||
    PropertiesService.getScriptProperties().getProperty('WARSTACK_BOT_USERNAME') || '@WarStackRioBot',
  CHAT_ID: (ROUTER_OVERRIDES.CHAT_ID || '') ||
    PropertiesService.getScriptProperties().getProperty('CHAT_ID') || '',
  TELEGRAM_API: 'https://api.telegram.org/bot'
};

const ROUTER_INTERNAL_COMMANDS = {
  debug: {
    all: 'debugAll',
    status: 'debugStatusLocal',
    watchdog: 'debugWatchdog',
    bridge: 'debugBridge',
    router: 'debugRouter',
    telegram: 'debugTelegram',
    centres: 'debugCentreUrls',
    props: 'debugScriptProps'
  },
  terminal: {
    bridgecheck: 'terminal_bridgecheck',
    props: 'terminal_props',
    stats: 'terminal_stats',
    systemstatus: 'terminal_systemstatus',
    tasksync: 'terminal_tasksync',
    centres: 'terminal_centres',
    config: 'terminal_config',
    logs: 'terminal_logs'
  }
};

function router_getBridgeUrl_() {
  if (ROUTER_OVERRIDES.BRIDGE_URL) return ROUTER_OVERRIDES.BRIDGE_URL;
  if (typeof getBridgeRootUrl_ === 'function') return getBridgeRootUrl_();
  if (typeof getBridgeApiUrl_ === 'function') {
    const api = getBridgeApiUrl_();
    return api ? api.replace(/\/bridge$/, '') : '';
  }
  var sp = PropertiesService.getScriptProperties();
  return (
    sp.getProperty('LAPTOP_URL') ||
    sp.getProperty('AOS_BRIDGE_URL') ||
    sp.getProperty('BRIDGE_URL') ||
    sp.getProperty('LAPTOP_WEBHOOK_URL') ||
    ''
  ).trim();
}

function router_getWebAppUrl_() {
  if (ROUTER_OVERRIDES.WEBAPP_URL) return ROUTER_OVERRIDES.WEBAPP_URL;
  try {
    return ScriptApp.getService().getUrl();
  } catch (e) {
    return '';
  }
}

function router_getTriggerUrl_() {
  if (ROUTER_OVERRIDES.TRIGGER_URL) return ROUTER_OVERRIDES.TRIGGER_URL;
  const sp = PropertiesService.getScriptProperties();
  return (
    (sp.getProperty('LAPTOP_TRIGGER_URL') || '').trim() ||
    (sp.getProperty('LAPTOP_WEBHOOK_URL') || '').trim()
  );
}

const ROUTER_REGISTRY = {
  warstack: {
    type: 'delegate',
    target: 'bot',
    bot_username: ROUTER_CONFIG.WARSTACK_BOT_USERNAME,
    description: 'War Stack creation (DOOR Pillar)'
  },
  door: {
    type: 'webapp',
    page: 'door',
    description: 'Door Centre (WebApp)'
  },
  core4: {
    type: 'webapp',
    page: 'core4',
    description: 'CORE4 Centre (WebApp)'
  },
  firemap: {
    type: 'webapp',
    page: 'fire',
    description: 'Fire Map (WebApp)'
  },
  voice: {
    type: 'webapp',
    page: 'voice',
    description: 'VOICE Session (WebApp)'
  },
  frame: {
    type: 'webapp',
    page: 'frame',
    description: 'Frame Map (WebApp)'
  },
  freedom: {
    type: 'webapp',
    page: 'freedom',
    description: 'Freedom Map (WebApp)'
  },
  focus: {
    type: 'webapp',
    page: 'focus',
    description: 'Focus Map (WebApp)'
  },
  tent: {
    type: 'webapp',
    page: 'tent',
    description: 'General\'s Tent (WebApp)'
  },
  help: {
    type: 'internal',
    handler: 'showHelp',
    description: 'Show available commands'
  },
  status: {
    type: 'internal',
    handler: 'showStatus',
    description: 'Show system status'
  },
  debug: {
    type: 'internal',
    handler: 'debug',
    description: 'Debug: run all debug checks'
  },
  debugstatus: {
    type: 'internal',
    handler: 'debug',
    command: 'status',
    description: 'Debug: HQ status'
  },
  debugwatchdog: {
    type: 'internal',
    handler: 'debug',
    command: 'watchdog',
    description: 'Debug: watchdog status'
  },
  debugbridge: {
    type: 'internal',
    handler: 'debug',
    command: 'bridge',
    description: 'Debug: bridge status'
  },
  debugrouter: {
    type: 'internal',
    handler: 'debug',
    command: 'router',
    description: 'Debug: router status'
  },
  debugtelegram: {
    type: 'internal',
    handler: 'debug',
    command: 'telegram',
    description: 'Debug: telegram webhook info'
  },
  debugcentres: {
    type: 'internal',
    handler: 'debug',
    command: 'centres',
    description: 'Debug: centre URLs'
  },
  debugprops: {
    type: 'internal',
    handler: 'debug',
    command: 'props',
    description: 'Debug: script props (masked)'
  },
  props: {
    type: 'internal',
    handler: 'terminal',
    command: 'props',
    description: 'Props: list script properties (masked)'
  },
  centres: {
    type: 'internal',
    handler: 'terminal',
    command: 'centres',
    description: 'Centres: list webapp URLs'
  },
  systemstatus: {
    type: 'internal',
    handler: 'terminal',
    command: 'systemstatus',
    description: 'System status: bridge/router/heartbeat'
  },
  bridgecheck: {
    type: 'internal',
    handler: 'terminal',
    command: 'bridgecheck',
    description: 'Bridge health check'
  },
  config: {
    type: 'internal',
    handler: 'terminal',
    command: 'config',
    description: 'Config summary'
  },
  stats: {
    type: 'internal',
    handler: 'terminal',
    command: 'stats',
    description: 'Basic stats'
  },
  logs: {
    type: 'internal',
    handler: 'terminal',
    command: 'logs',
    description: 'Recent terminal logs'
  }
};

function router_debugInfo() {
  const sp = PropertiesService.getScriptProperties();
  const token = ROUTER_CONFIG.BOT_TOKEN || '';
  const bridgeUrl = router_getBridgeUrl_();
  const webAppUrl = router_getWebAppUrl_();
  const triggerUrl = router_getTriggerUrl_();
  const registry = Object.keys(ROUTER_REGISTRY || {});
  Logger.log('ROUTER BOT_TOKEN: ' + (token ? 'SET' : 'MISSING'));
  Logger.log('ROUTER WARSTACK_BOT_USERNAME: ' + (ROUTER_CONFIG.WARSTACK_BOT_USERNAME || 'MISSING'));
  Logger.log('ROUTER BRIDGE_URL: ' + (bridgeUrl || 'MISSING'));
  Logger.log('ROUTER WEBAPP_URL: ' + (webAppUrl || 'MISSING'));
  Logger.log('ROUTER TRIGGER_URL: ' + (triggerUrl || 'MISSING'));
  Logger.log('ROUTER REGISTRY: ' + JSON.stringify(registry));
  return {
    botToken: token ? 'SET' : 'MISSING',
    warstackBot: ROUTER_CONFIG.WARSTACK_BOT_USERNAME || '',
    bridgeUrl: bridgeUrl || '',
    webAppUrl: webAppUrl || '',
    triggerUrl: triggerUrl || '',
    registry: registry
  };
}

function router_sendTelegramMessage_(chatId, text, options) {
  if (!ROUTER_CONFIG.BOT_TOKEN) {
    Logger.log('Router send error: BOT_TOKEN missing (use TELEGRAM_BOT_TOKEN/ALPHAOS_BOT_TOKEN/BOT_TOKEN)');
    return false;
  }
  const url = ROUTER_CONFIG.TELEGRAM_API + ROUTER_CONFIG.BOT_TOKEN + '/sendMessage';
  const payload = {
    chat_id: chatId,
    text: text
  };
  if (options && Object.prototype.hasOwnProperty.call(options, 'parse_mode')) {
    payload.parse_mode = options.parse_mode;
  } else {
    payload.parse_mode = 'Markdown';
  }
  if (options && Object.prototype.hasOwnProperty.call(options, 'disable_notification')) {
    payload.disable_notification = options.disable_notification;
  }
  if (options && options.reply_markup) {
    payload.reply_markup = JSON.stringify(options.reply_markup);
  }
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const result = JSON.parse(response.getContentText());
    if (!result.ok) Logger.log('Router send error: ' + JSON.stringify(result));
    return result.ok;
  } catch (e) {
    Logger.log('Router send error: ' + e.toString());
    return false;
  }
}

function router_escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function router_getGlobalFn_(name) {
  const root = this;
  if (root && typeof root[name] === 'function') return root[name];
  return null;
}

function router_sendJson_(chatId, title, payload) {
  const raw = JSON.stringify(payload || {}, null, 2);
  const maxLen = 3500;
  const trimmed = raw.length > maxLen ? (raw.slice(0, maxLen) + '\n...truncated') : raw;
  const text = `<b>${router_escapeHtml_(title || 'Debug')}</b>\n<pre>${router_escapeHtml_(trimmed)}</pre>`;
  router_sendTelegramMessage_(chatId, text, { parse_mode: 'HTML' });
}

function router_handleHelp_(message) {
  const helpText = `🤖 *AlphaOS Universal Bot*\n\n` +
    `Available commands:\n\n` +
    `*AlphaOS Pillars:*\n` +
    `/warstack - Create War Stack (DOOR Pillar)\n` +
    `/door - Door Centre (WebApp)\n` +
    `/core4 - CORE4 Centre (WebApp)\n` +
    `/voice - VOICE Session (WebApp)\n` +
    `/firemap - Fire Map (Weekly War)\n` +
    `/frame - Frame Map (WebApp)\n` +
    `/freedom - Freedom Map (WebApp)\n` +
    `/focus - Focus Map (WebApp)\n` +
    `/tent - General's Tent (WebApp)\n\n` +
    `*System:*\n` +
    `/help - Show this help\n` +
    `/status - Bot status\n` +
    `/debug - Run all debug checks\n` +
    `/debugrouter, /debugbridge, /debugwatchdog\n` +
    `/debugtelegram, /debugcentres, /debugprops\n` +
    `/props, /centres, /systemstatus, /bridgecheck\n` +
    `/config, /stats, /logs\n\n` +
    `*How it works:*\n` +
    `• /warstack → Delegates to ${ROUTER_CONFIG.WARSTACK_BOT_USERNAME}\n` +
    `• /voice, /frame, /firemap → Opens GAS WebApp pages`;

  router_sendTelegramMessage_(message.chat.id, helpText);
}

function router_handleStatus_(message) {
  const chatId = message && message.chat ? message.chat.id : '';
  const wdChat = (typeof watchdog_getChatId_ === 'function') ? watchdog_getChatId_() : '';
  if (chatId && wdChat && String(chatId) === String(wdChat) &&
      typeof watchdog_sendStatusMessage_ === 'function') {
    watchdog_sendStatusMessage_(chatId);
    return;
  }

  var bridgeUrl = router_getBridgeUrl_();
  var webAppUrl = router_getWebAppUrl_();
  const statusText = `📊 *AlphaOS Bot Status*\n\n` +
    `🟢 Bot: Online\n` +
    `🔗 War Stack Bot: ${ROUTER_CONFIG.WARSTACK_BOT_USERNAME}\n` +
    `🌉 Bridge URL: ${bridgeUrl || 'not set'}\n` +
    `🧩 WebApp URL: ${webAppUrl || 'not set'}\n\n` +
    `*Bot Registry:*\n` +
    Object.keys(ROUTER_REGISTRY).map(cmd => `• /${cmd} (${ROUTER_REGISTRY[cmd].type})`).join('\n') +
    `\n\nLast updated: ${new Date().toISOString()}`;

  router_sendTelegramMessage_(message.chat.id, statusText);
}

function router_delegateToWarStackBot_(message) {
  const botUsername = ROUTER_CONFIG.WARSTACK_BOT_USERNAME.replace('@', '');
  const deepLink = `https://t.me/${botUsername}?start=warstack`;
  const text = `🚀 *War Stack Bot*\n\n` +
    `To create a War Stack, please open a conversation with the War Stack Bot:\n\n` +
    `[Open ${ROUTER_CONFIG.WARSTACK_BOT_USERNAME}](${deepLink})\n\n` +
    `Then send: /warstack\n\n` +
    `_This keeps the War Stack Bot's conversation state clean and separate from the Universal Bot._`;

  router_sendTelegramMessage_(message.chat.id, text);
}

function router_openWebAppPage_(pageKey, message) {
  const base = router_getWebAppUrl_();
  if (!base) {
    router_sendTelegramMessage_(message.chat.id, '❌ WebApp URL not available (deploy as WebApp)');
    return;
  }
  const url = base + '?page=' + encodeURIComponent(String(pageKey || '').trim());
  const label = String(pageKey || 'webapp').trim();
  const text = `🧩 *${label}* öffnen:\n${url}`;
  router_sendTelegramMessage_(message.chat.id, text, {
    reply_markup: {
      inline_keyboard: [[{ text: `Open ${label}`, url: url }]]
    }
  });
}

function router_triggerLaptopBot_(botName, message) {
  const botConfig = ROUTER_REGISTRY[botName];
  if (!botConfig || botConfig.type !== 'laptop') {
    router_sendTelegramMessage_(message.chat.id, `❌ Bot "${botName}" not configured for laptop trigger`);
    return;
  }

  const triggerBase = router_getTriggerUrl_();
  if (!triggerBase) {
    router_sendTelegramMessage_(message.chat.id, '❌ LAPTOP_TRIGGER_URL not configured (or legacy LAPTOP_WEBHOOK_URL)');
    return;
  }

  const laptopUrl = triggerBase.replace(/\/$/, '') + botConfig.endpoint;
  const payload = {
    user_id: message.from.id,
    command: `/${botName}`,
    message: message.text,
    chat_id: message.chat.id,
    timestamp: new Date().toISOString()
  };

  router_sendTelegramMessage_(message.chat.id, `🚀 *${botName}* wird gestartet...\n\n_Laptop Bot wird getriggert_`);

  try {
    const response = UrlFetchApp.fetch(laptopUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    if (statusCode !== 200) {
      router_sendTelegramMessage_(
        message.chat.id,
        `⚠️ Laptop trigger fehlgeschlagen (HTTP ${statusCode})\n\n_Ist der Laptop online?_`
      );
    }
  } catch (e) {
    router_sendTelegramMessage_(message.chat.id, `❌ Laptop nicht erreichbar\n\n_Error: ${e.toString()}_`);
  }
}

function router_routeCommand_(message) {
  const text = message.text || '';
  if (!text.startsWith('/')) return false;

  const commandMatch = text.match(/^\/([a-zA-Z0-9_]+)/);
  if (!commandMatch) return false;

  const command = commandMatch[1].toLowerCase();
  const botConfig = ROUTER_REGISTRY[command];
  if (!botConfig) return false;

  switch (botConfig.type) {
    case 'internal':
      if (botConfig.handler === 'showHelp') router_handleHelp_(message);
      if (botConfig.handler === 'showStatus') router_handleStatus_(message);
      if (botConfig.handler === 'debug') {
        const key = botConfig.command || 'all';
        const fnName = ROUTER_INTERNAL_COMMANDS.debug[key];
        const fn = fnName ? router_getGlobalFn_(fnName) : null;
        if (fn) {
          const result = fn();
          router_sendJson_(message.chat.id, 'Debug: ' + key, result);
        } else {
          router_sendTelegramMessage_(message.chat.id, '❌ Debug command not available: ' + key);
        }
      }
      if (botConfig.handler === 'terminal') {
        const key = botConfig.command || '';
        const fnName = ROUTER_INTERNAL_COMMANDS.terminal[key];
        const fn = fnName ? router_getGlobalFn_(fnName) : null;
        if (fn) {
          const result = fn();
          if (key === 'systemstatus' && typeof watchdog_formatSystemStatus_ === 'function') {
            const text = watchdog_formatSystemStatus_(result);
            router_sendTelegramMessage_(message.chat.id, text, { parse_mode: 'Markdown', disable_notification: true });
          } else {
            router_sendJson_(message.chat.id, 'Terminal: ' + key, result);
          }
        } else {
          router_sendTelegramMessage_(message.chat.id, '❌ Terminal command not available: ' + key);
        }
      }
      return true;
    case 'delegate':
      router_delegateToWarStackBot_(message);
      return true;
    case 'webapp':
      router_openWebAppPage_(botConfig.page, message);
      return true;
    case 'laptop':
      router_triggerLaptopBot_(command, message);
      return true;
    default:
      router_sendTelegramMessage_(message.chat.id, `⚠️ Unknown bot type: ${botConfig.type}`);
      return true;
  }
}

function router_sendCombinedHelp_(chatId, user) {
  const message = `🤖 *αOS Bot*\n\n` +
    `*Core Commands:*\n` +
    `/webapp - Open Control Center\n` +
    `/status - Core4 + Sync status\n` +
    `/report - Weekly Core4 summary\n\n` +
    `*Task Bridge:*\n` +
    `/hot <idea> - Add to Hot List\n` +
    `/hit <task> - Add Hit task\n` +
    `/done <search> - Mark task done\n` +
    `/sync - Manual sync\n\n` +
    `Use the Telegram WebApp for quick Core4 + Hot List capture.`;

  router_sendTelegramMessage_(chatId, message);
}
