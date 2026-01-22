// ================================================================
// GAS TELEGRAM COMMAND ROUTER (NAMESPACED)
//
// Note: This is not the Python `router/` service. This file routes
// Telegram commands inside the GAS `doPost` webhook (see entrypoints.gs).
// ================================================================

const ROUTER_CONFIG = {
  BOT_TOKEN: (typeof getPrimaryBotToken_ === 'function')
    ? getPrimaryBotToken_()
    : (PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN') ||
      PropertiesService.getScriptProperties().getProperty('ALPHAOS_BOT_TOKEN') ||
      PropertiesService.getScriptProperties().getProperty('BOT_TOKEN') ||
      ''),
  WARSTACK_BOT_USERNAME: PropertiesService.getScriptProperties().getProperty('WARSTACK_BOT_USERNAME') || '@WarStackRioBot',
  CHAT_ID: PropertiesService.getScriptProperties().getProperty('CHAT_ID') || '',
  TELEGRAM_API: 'https://api.telegram.org/bot'
};

function router_getBridgeUrl_() {
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
  try {
    return ScriptApp.getService().getUrl();
  } catch (e) {
    return '';
  }
}

function router_getTriggerUrl_() {
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
  help: {
    type: 'internal',
    handler: 'showHelp',
    description: 'Show available commands'
  },
  status: {
    type: 'internal',
    handler: 'showStatus',
    description: 'Show system status'
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
    text: text,
    parse_mode: (options && options.parse_mode) || 'Markdown'
  };
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

function router_handleHelp_(message) {
  const helpText = `🤖 *AlphaOS Universal Bot*\n\n` +
    `Available commands:\n\n` +
    `*AlphaOS Pillars:*\n` +
    `/warstack - Create War Stack (DOOR Pillar)\n` +
    `/voice - VOICE Session (WebApp)\n` +
    `/firemap - Fire Map (Weekly War)\n` +
    `/frame - Frame Map (WebApp)\n\n` +
    `*System:*\n` +
    `/help - Show this help\n` +
    `/status - Bot status\n\n` +
    `*How it works:*\n` +
    `• /warstack → Delegates to ${ROUTER_CONFIG.WARSTACK_BOT_USERNAME}\n` +
    `• /voice, /frame, /firemap → Opens GAS WebApp pages`;

  router_sendTelegramMessage_(message.chat.id, helpText);
}

function router_handleStatus_(message) {
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
