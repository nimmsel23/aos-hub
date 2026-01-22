// ================================================================
// ROUTER DOPOST (SINGLE ENTRYPOINT)
// ================================================================

function doPost(e) {
  try {
    const update = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (update && update.kind === 'heartbeat') {
      if (typeof watchdog_handleHeartbeat_ === 'function') {
        watchdog_handleHeartbeat_(update);
      } else {
        const p = PropertiesService.getScriptProperties();
        p.setProperty('WATCHDOG_LAST_BEAT_TS', String(Date.now()));
        if (update.host) p.setProperty('WATCHDOG_LAST_HOST', String(update.host));
      }
      return ContentService.createTextOutput('OK');
    }

    if (update && update.kind === 'bridge_heartbeat') {
      if (typeof watchdog_handleBridgeHeartbeat_ === 'function') {
        watchdog_handleBridgeHeartbeat_(update);
      } else {
        const p = PropertiesService.getScriptProperties();
        p.setProperty('BRIDGE_HEARTBEAT_TS', String(Date.now()));
        if (update.host) p.setProperty('BRIDGE_HEARTBEAT_HOST', String(update.host));
      }
      return ContentService.createTextOutput('OK');
    }

    if (update && update.kind === 'router_startup') {
      if (typeof watchdog_handleRouterStartup_ === 'function') {
        watchdog_handleRouterStartup_(update);
      } else {
        const p = PropertiesService.getScriptProperties();
        p.setProperty('ROUTER_STARTUP_TS', String(Date.now()));
        p.setProperty('ROUTER_STATUS', 'online');
        if (update.host) p.setProperty('ROUTER_HOST', String(update.host));
      }
      return ContentService.createTextOutput('OK');
    }

    if (update && update.kind === 'warstack_complete') {
      const payload = update.payload || {};
      if (typeof door_ingestWarStack_ === 'function') {
        door_ingestWarStack_(payload);
      }
      return ContentService.createTextOutput('OK');
    }

    if (update && update.kind === 'task_operation') {
      const p = PropertiesService.getScriptProperties();
      const chatId = String(update.chat_id || p.getProperty('CHAT_ID') || '');
      if (!chatId) return ContentService.createTextOutput('OK');
      const payload = update.payload || {};
      bridge_handleTaskOperation(chatId, JSON.stringify(payload));
      return ContentService.createTextOutput('OK');
    }

    // Handle callback queries (inline button clicks)
    if (update.callback_query) {
      if (typeof handleCallbackQuery_ === 'function') {
        handleCallbackQuery_(update.callback_query);
      }
      return ContentService.createTextOutput('OK');
    }

    if (!update.message) {
      return ContentService.createTextOutput('OK');
    }

    const message = update.message;
    const text = message.text || '';

    if (message.web_app_data) {
      webapp_handleWebAppData(message.web_app_data, message.from, message.chat.id);
      return ContentService.createTextOutput('OK');
    }

    if (fruits_handleTelegramMessage_(message)) {
      return ContentService.createTextOutput('OK');
    }

    if (hotlist_handleTelegramMessage_(message)) {
      return ContentService.createTextOutput('OK');
    }

    if (voice_handleTelegramMessage_(message)) {
      return ContentService.createTextOutput('OK');
    }

    if (core4_handleTelegramMessage_(message)) {
      return ContentService.createTextOutput('OK');
    }

    if (door_handleTelegramMessage_(message)) {
      return ContentService.createTextOutput('OK');
    }

    if (game_handleTelegramMessage_(message)) {
      return ContentService.createTextOutput('OK');
    }

    if (frame_handleTelegramMessage_(message)) {
      return ContentService.createTextOutput('OK');
    }

    if (freedom_handleTelegramMessage_(message)) {
      return ContentService.createTextOutput('OK');
    }

    if (focus_handleTelegramMessage_(message)) {
      return ContentService.createTextOutput('OK');
    }

    if (tent_handleTelegramMessage_(message)) {
      return ContentService.createTextOutput('OK');
    }

    if (text.startsWith('/')) {
      const lower = text.split(' ')[0].toLowerCase();
      const bridgeCommands = ['/sync', '/hot', '/hit', '/done'];
      const webappCommands = ['/webapp', '/report'];

      if (router_routeCommand_(message)) {
        return ContentService.createTextOutput('OK');
      }

      if (bridgeCommands.includes(lower)) {
        bridge_handleBotCommand(message.chat.id, text);
      } else if (webappCommands.includes(lower)) {
        webapp_handleTelegramMessage(message);
      } else if (lower === '/status') {
        webapp_sendStatusMessage(message.chat.id, message.from);
        bridge_showSyncStatus(message.chat.id);
      } else if (lower === '/help' || lower === '/start') {
        router_sendCombinedHelp_(message.chat.id, message.from);
      } else {
        webapp_handleTelegramMessage(message);
      }

      return ContentService.createTextOutput('OK');
    }

    bridge_handleTaskOperation(message.chat.id, text);
    return ContentService.createTextOutput('OK');

  } catch (error) {
    Logger.log('Webhook error:', error);
    return ContentService.createTextOutput('Error');
  }
}

// ================================================================
// WEBAPP ENTRY (αOS Control Center)
// ================================================================

function doGet(e) {
  const page = String((e && e.parameter && e.parameter.page) || '').trim().toLowerCase();

  switch (page) {
    case 'door':
      return HtmlService.createTemplateFromFile('Door_Index')
        .evaluate()
        .setTitle('αOS – Door Centre')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    case 'core4':
      return HtmlService.createTemplateFromFile('Core4_Index')
        .evaluate()
        .setTitle('αOS – CORE4')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    case 'voice':
      return renderVoicePage_();
    case 'frame':
      return renderFramePage_();
    case 'freedom':
      return renderFreedomPage_();
    case 'focus':
      return renderFocusPage_();
    case 'fire':
      return renderFirePage_();
    case 'tent':
      return renderTentPage_();
    default: {
      const t = HtmlService.createTemplateFromFile('Index');
      t.mapUrls = getCentreUrls_();
      t.webAppUrl = ScriptApp.getService().getUrl();
      return t.evaluate().setTitle('αOS Control Center');
    }
  }
}
