// ================================================================
// Terminal handlers (limited, safe commands for HQ UI)
// ================================================================
//
// This module provides safe terminal commands for the HQ Web UI.
// Commands are exposed via Google Apps Script and callable from Index_client.html.
//
// LOGGING:
// - terminal_log() stores structured events for debugging/analytics
// - Events: hq_open, button_click, map_open, section_toggle, etc.
//
// AVAILABLE COMMANDS:
// - bridgecheck: Check bridge health
// - props: List Script Properties (masked tokens)
// - stats: Basic system stats
// - systemstatus: Full system status (bridge/router/heartbeat)
// - tasksync: Sync tasks using task_export.json
// - centres: List all centre URLs
// - config: Show key configuration
// - log: Log an event (category, message)
//
// ================================================================

/**
 * Terminal: bridge health
 */
function terminal_bridgecheck() {
  if (typeof bridgeHealth_ !== 'function') {
    return { ok: false, error: 'bridgeHealth_ missing' };
  }
  return bridgeHealth_();
}

/**
 * Terminal: list key Script Props (masked)
 */
function terminal_props() {
  const sp = PropertiesService.getScriptProperties();
  const props = sp.getProperties();
  const keys = Object.keys(props).sort();
  const mask = (v) => (v && v.length > 4 ? v.slice(0, 2) + '***' + v.slice(-2) : v || '');

  const out = {};
  keys.forEach((k) => {
    const val = (props[k] || '').trim();
    if (k.toLowerCase().includes('token') || k.toLowerCase().includes('secret')) {
      out[k] = val ? mask(val) : 'MISSING';
    } else {
      out[k] = val || 'MISSING';
    }
  });
  return out;
}

/**
 * Terminal: basic stats placeholder (extend as needed)
 */
function terminal_stats() {
  return {
    serverTime: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    tz: Session.getScriptTimeZone(),
    bridge: (typeof bridgeHealth_ === 'function') ? bridgeHealth_() : { ok: false, label: 'missing bridgeHealth_' }
  };
}

/**
 * Terminal: full system status (bridge/router/heartbeat/server)
 */
function terminal_systemstatus() {
  if (typeof getSystemStatus_ !== 'function') {
    return { ok: false, error: 'getSystemStatus_ missing' };
  }
  return getSystemStatus_({ log: false });
}

/**
 * Terminal: task sync using task_export.json
 */
function terminal_tasksync() {
  if (typeof syncTasksBetweenSystems !== 'function') {
    return { ok: false, error: 'syncTasksBetweenSystems missing' };
  }
  return syncTasksBetweenSystems({ source: 'export' });
}

/**
 * Terminal: list all centre URLs
 */
function terminal_centres() {
  if (typeof getCentreUrls_ !== 'function') {
    return { ok: false, error: 'getCentreUrls_ missing' };
  }
  return getCentreUrls_();
}

/**
 * Terminal: show key configuration
 */
function terminal_config() {
  const sp = PropertiesService.getScriptProperties();
  return {
    bridgeUrl: (typeof getBridgeApiUrl_ === 'function') ? getBridgeApiUrl_() : 'missing getBridgeApiUrl_',
    publicRoot: (typeof getPublicRootUrl_ === 'function') ? getPublicRootUrl_() : 'missing getPublicRootUrl_',
    botToken: sp.getProperty('ALPHAOS_BOT_TOKEN') ? 'SET' : 'MISSING',
    chatId: sp.getProperty('CHAT_ID') ? 'SET' : 'MISSING',
    watchdogToken: sp.getProperty('WATCHDOG_BOT_TOKEN') ? 'SET' : 'MISSING',
    watchdogChat: sp.getProperty('WATCHDOG_CHAT_ID') ? 'SET' : 'MISSING',
    sheetId: sp.getProperty('SHEET_ID') ? 'SET' : 'MISSING'
  };
}

/**
 * Terminal: log an event for debugging/analytics
 * Usage: terminal_log({category: 'hq_open', message: 'HQ opened', data: {...}})
 */
function terminal_log(options) {
  const opts = options || {};
  const category = String(opts.category || 'general').trim();
  const message = String(opts.message || '').trim();
  const data = opts.data || {};

  const timestamp = new Date().toISOString();
  const entry = {
    timestamp: timestamp,
    category: category,
    message: message,
    data: data
  };

  // Log to Apps Script Logger
  Logger.log('[' + category + '] ' + message + (data && Object.keys(data).length > 0 ? ' | ' + JSON.stringify(data) : ''));

  // Optionally store in Script Properties (last 10 events)
  try {
    const sp = PropertiesService.getScriptProperties();
    const logKey = 'TERMINAL_LOG_RECENT';
    let recentLogs = [];
    try {
      const stored = sp.getProperty(logKey);
      if (stored) recentLogs = JSON.parse(stored);
    } catch (e) {
      recentLogs = [];
    }

    recentLogs.push(entry);
    if (recentLogs.length > 10) recentLogs = recentLogs.slice(-10); // Keep last 10
    sp.setProperty(logKey, JSON.stringify(recentLogs));
  } catch (e) {
    Logger.log('terminal_log storage failed: ' + e);
  }

  return { ok: true, logged: entry };
}

/**
 * Terminal: get recent log entries
 */
function terminal_logs() {
  const sp = PropertiesService.getScriptProperties();
  const logKey = 'TERMINAL_LOG_RECENT';
  try {
    const stored = sp.getProperty(logKey);
    if (stored) {
      return { ok: true, logs: JSON.parse(stored) };
    }
  } catch (e) {
    return { ok: false, error: 'parse error: ' + e };
  }
  return { ok: true, logs: [] };
}

/**
 * Terminal: help command (list all available commands)
 */
function terminal_help() {
  return {
    commands: [
      'bridgecheck - Check bridge health',
      'props - List Script Properties (masked)',
      'stats - Basic system stats',
      'systemstatus - Full system status',
      'tasksync - Sync tasks using task_export.json',
      'centres - List all centre URLs',
      'config - Show key configuration',
      'log - Log an event (usage: log {category, message, data})',
      'logs - Get recent log entries',
      'help - Show this help'
    ]
  };
}
