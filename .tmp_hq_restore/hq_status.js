// ================================================================
// HQ STATUS (Bridge / Router / Heartbeat)
// ================================================================

function getSystemStatus_(options) {
  if (typeof watchdog_getSystemStatus_ === 'function') {
    return watchdog_getSystemStatus_(options);
  }
  const sp = PropertiesService.getScriptProperties();
  const status = {};
  const opts = options || {};
  const doPing = opts.ping !== false;
  const sessionId = String(opts.sessionId || '').trim() || Utilities.getUuid().slice(0, 8);

  // Bridge status via helper (health + heartbeat info only)
  const bridge = (typeof bridgeHealth_ === 'function') ? bridgeHealth_() : { ok: false, label: 'missing bridgeHealth_', url: '' };
  status.bridge = bridge;

  // Router status (unused in UI)
  status.router = { ok: null, label: 'not used' };

  // Watchdog heartbeat status (strict watchdog mode)
  if (typeof watchdog_getStatus_ === 'function') {
    status.heartbeat = watchdog_getStatus_();
  } else {
    status.heartbeat = { ok: null, label: 'watchdog_getStatus_ missing' };
  }

  status.server = {
    iso: new Date().toISOString(),
    locale: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
  };

  // Debug ping: once per status call (HQ load / manual)
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

function debugStatusLog_(res) {
  Logger.log('=== HQ STATUS DEBUG ===');
  Logger.log('Bridge: ' + JSON.stringify(res.bridge));
  Logger.log('Router: ' + JSON.stringify(res.router));
  Logger.log('Heartbeat: ' + JSON.stringify(res.heartbeat));
  Logger.log('Server: ' + JSON.stringify(res.server));
}

// Debug helper: logs current system status to GAS console
function debugStatus() {
  const res = getSystemStatus_({ log: false });
  debugStatusLog_(res);
  return res;
}

function getDashboardStats_() {
  const stats = {
    hotlist: 0,
    warstacks: 0,
    hits: 0
  };

  try {
    if (typeof hotlist_getCount_ === 'function') {
      stats.hotlist = hotlist_getCount_();
    }
  } catch (e) {
    Logger.log('hotlist stats error: ' + e.toString());
  }

  try {
    if (typeof door_getWarStackStats === 'function') {
      const res = door_getWarStackStats();
      if (res && res.ok) {
        stats.warstacks = res.count_stacks || 0;
        stats.hits = res.count_hits || 0;
      }
    }
  } catch (e) {
    Logger.log('door stats error: ' + e.toString());
  }

  return stats;
}
