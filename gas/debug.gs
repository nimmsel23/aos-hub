// ================================================================
// Debug helpers (manual console execution)
// ================================================================

function debugStatusLocal() {
  const res = (typeof getSystemStatus_ === 'function')
    ? getSystemStatus_({ ping: false, log: false })
    : { ok: false, error: 'getSystemStatus_ missing' };
  Logger.log('=== HQ STATUS (no ping) ===');
  Logger.log(JSON.stringify(res));
  return res;
}

function debugWatchdog() {
  const sp = PropertiesService.getScriptProperties();
  const status = (typeof watchdog_getStatus_ === 'function')
    ? watchdog_getStatus_()
    : { ok: null, label: 'watchdog_getStatus_ missing' };
  Logger.log('=== WATCHDOG ===');
  Logger.log('Status: ' + JSON.stringify(status));
  Logger.log('WATCHDOG_LAST_HOST: ' + (sp.getProperty('WATCHDOG_LAST_HOST') || 'MISSING'));
  Logger.log('WATCHDOG_BOT_TOKEN: ' + (sp.getProperty('WATCHDOG_BOT_TOKEN') ? 'SET' : 'MISSING'));
  Logger.log('WATCHDOG_CHAT_ID: ' + (sp.getProperty('WATCHDOG_CHAT_ID') || sp.getProperty('CHAT_ID') || 'MISSING'));
  Logger.log('BRIDGE_HEARTBEAT_TS: ' + (sp.getProperty('BRIDGE_HEARTBEAT_TS') || 'MISSING'));
  Logger.log('BRIDGE_HEARTBEAT_HOST: ' + (sp.getProperty('BRIDGE_HEARTBEAT_HOST') || 'MISSING'));
  return status;
}

function debugBridge() {
  const api = (typeof getBridgeApiUrl_ === 'function') ? getBridgeApiUrl_() : '';
  const root = (typeof getBridgeRootUrl_ === 'function') ? getBridgeRootUrl_() : '';
  const res = (typeof bridgeHealth_ === 'function')
    ? bridgeHealth_()
    : { ok: false, label: 'bridgeHealth_ missing' };
  Logger.log('=== BRIDGE ===');
  Logger.log('Root URL: ' + (root || 'MISSING'));
  Logger.log('API URL: ' + (api || 'MISSING'));
  Logger.log('Health: ' + JSON.stringify(res));
  return res;
}

function debugRouter() {
  const bridgeUrl = (typeof router_getBridgeUrl_ === 'function') ? router_getBridgeUrl_() : '';
  const triggerUrl = (typeof router_getTriggerUrl_ === 'function') ? router_getTriggerUrl_() : '';
  const webAppUrl = (typeof router_getWebAppUrl_ === 'function') ? router_getWebAppUrl_() : '';
  const registry = (typeof ROUTER_REGISTRY === 'object')
    ? Object.keys(ROUTER_REGISTRY || {})
    : [];
  Logger.log('=== ROUTER ===');
  Logger.log('Bridge URL: ' + (bridgeUrl || 'MISSING'));
  Logger.log('Trigger URL: ' + (triggerUrl || 'MISSING'));
  Logger.log('WebApp URL: ' + (webAppUrl || 'MISSING'));
  Logger.log('Warstack bot: ' + (ROUTER_CONFIG && ROUTER_CONFIG.WARSTACK_BOT_USERNAME ? ROUTER_CONFIG.WARSTACK_BOT_USERNAME : 'MISSING'));
  Logger.log('Registry: ' + JSON.stringify(registry));
  return { bridgeUrl: bridgeUrl, triggerUrl: triggerUrl, webAppUrl: webAppUrl, registry: registry };
}

function debugAll() {
  Logger.log('=== DEBUG ALL ===');
  debugStatusLocal();
  debugWatchdog();
  debugBridge();
  debugRouter();
  if (typeof debugTelegram_ === 'function') debugTelegram_();
  if (typeof debugCentreUrls_ === 'function') debugCentreUrls_();
  if (typeof debugScriptProps_ === 'function') debugScriptProps_();
  if (typeof core4_debugInfo === 'function') core4_debugInfo();
  if (typeof fruits_debugInfo === 'function') fruits_debugInfo();
  return { ok: true };
}
