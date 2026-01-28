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
  const maxAgeMin = Number(p.getProperty(WD_MAX_AGE) || 12);
  const maxAgeMs = maxAgeMin * 60 * 1000;
  const ageMin = last ? Math.round((Date.now() - last) / 60000) : null;
  const isDown = last ? (Date.now() - last) > maxAgeMs : true;
  return {
    ok: last ? !isDown : false,
    last: last,
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
      host: routerHost
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

function tgSendWatchdog_(text) {
  const token = watchdog_getBotToken_();
  const chatId = watchdog_getChatId_();
  if (!token || !chatId) return;

  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: text
    }),
    muteHttpExceptions: true
  });
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

  const bridge = status && status.bridge ? status.bridge : {};
  const router = status && status.router ? status.router : {};
  const heartbeat = status && status.heartbeat ? status.heartbeat : {};
  const server = status && status.server ? status.server : {};

  const msg = '🟢 HQ Session\n' +
    'session: ' + sid + '\n' +
    'bridge: ' + (bridge.label || 'unknown') + (bridge.url ? (' (' + bridge.url + ')') : '') + '\n' +
    'router: ' + (router.label || 'unknown') + '\n' +
    'heartbeat: ' + (heartbeat.label || 'unknown') + '\n' +
    'server: ' + (server.locale || 'n/a');

  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: msg }),
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
