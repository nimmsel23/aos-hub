// ================================================================
// Terminal handlers (limited, safe commands for HQ UI)
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
