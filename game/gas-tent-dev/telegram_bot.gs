// ================================================================
// TELEGRAM BOT - General's Tent Centre
// ================================================================
//
// Telegram bot handler for standalone Tent Centre.
// Separate bot token from main HQ bot.
//
// Commands:
// /tent - Open Tent WebApp
// /week - Current week status
// /scores - TickTick scores
// /digest - Weekly digest
// /export - Export to Vault
// /help - Commands help
//
// ================================================================

/**
 * Handle Telegram update (message or callback)
 * @param {Object} update - Telegram update object
 * @returns {TextOutput} Response
 */
function handleTelegramUpdate(update) {
  try {
    if (update.message) {
      handleMessage(update.message);
    } else if (update.callback_query) {
      handleCallback(update.callback_query);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    logError_('Telegram update error', err);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle incoming message
 * @param {Object} msg - Telegram message
 */
function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  // Check if command
  if (!text.startsWith('/')) {
    return;
  }

  const parts = text.split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  logInfo_('Telegram command: ' + command);

  switch (command) {
    case '/start':
    case '/tent':
      cmdTent(chatId);
      break;

    case '/week':
      cmdWeek(chatId);
      break;

    case '/scores':
      cmdScores(chatId, args);
      break;

    case '/digest':
      cmdDigest(chatId, args);
      break;

    case '/export':
      cmdExport(chatId, args);
      break;

    case '/help':
      cmdHelp(chatId);
      break;

    default:
      sendMessage(chatId, '❓ Unknown command. Send /help for available commands.');
  }
}

/**
 * Handle callback query
 * @param {Object} query - Callback query
 */
function handleCallback(query) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  logInfo_('Callback: ' + data);

  // Answer callback to remove loading state
  answerCallback(query.id, 'Processing...');

  // Handle callback data
  const parts = data.split(':');
  const action = parts[0];
  const param = parts[1];

  switch (action) {
    case 'week':
      cmdWeek(chatId, [param]);
      break;

    case 'scores':
      cmdScores(chatId, [param]);
      break;

    case 'digest':
      cmdDigest(chatId, [param]);
      break;

    default:
      sendMessage(chatId, '❓ Unknown action');
  }
}

// ----------------------------------------------------------------
// COMMANDS
// ----------------------------------------------------------------

/**
 * /tent - Open WebApp
 */
function cmdTent(chatId) {
  const config = cfg_();
  const url = config.centres.tent || getProp_(PROP.WEBAPP_URL);

  if (!url) {
    sendMessage(chatId, '⚠️ Tent WebApp URL not configured');
    return;
  }

  const msg = `🏛️ *GENERAL'S TENT*\n\n` +
    `Weekly Strategic Intelligence & Review\n\n` +
    `Open Tent: ${url}\n\n` +
    `Commands:\n` +
    `/week - Current week status\n` +
    `/scores - TickTick scores\n` +
    `/digest - Weekly digest\n` +
    `/export - Export to Vault`;

  sendMessage(chatId, msg);
}

/**
 * /week - Current week status
 */
function cmdWeek(chatId, args) {
  const week = args && args[0] ? args[0] : isoWeekNow_();

  sendMessage(chatId, `📊 Loading week ${week}...`);

  try {
    const scores = getTickTickTentScores(week);

    if (!scores.ok) {
      throw new Error(scores.error || 'Failed to get scores');
    }

    const data = scores.data;
    const stack = data.stack;
    const door = data.door;

    let msg = `📊 *Week ${week}*\n\n`;
    msg += `*TickTick Scores:*\n`;
    msg += `Stack: ${stack.score}/${stack.max} (${stack.raw} total)\n`;
    msg += `Door: ${door.score}/${door.max} (${door.raw} total)\n\n`;

    const summary = data.summary;
    msg += `*Summary:*\n`;
    msg += `Total: ${summary.total} tasks\n`;
    msg += `Complete: ${summary.complete}\n`;
    msg += `Open: ${summary.open}\n`;
    msg += `Completion: ${Math.round((summary.complete / summary.total) * 100)}%\n`;

    sendMessage(chatId, msg);

  } catch (err) {
    sendMessage(chatId, `❌ Error: ${err.message}`);
  }
}

/**
 * /scores - TickTick scores
 */
function cmdScores(chatId, args) {
  cmdWeek(chatId, args); // Same as /week for now
}

/**
 * /digest - Weekly digest
 */
function cmdDigest(chatId, args) {
  const week = args && args[0] ? args[0] : isoWeekNow_();

  sendMessage(chatId, `📋 Generating digest for ${week}...`);

  try {
    const digest = buildWeeklyDigest(week);

    if (!digest.ok) {
      throw new Error(digest.error || 'Failed to build digest');
    }

    const md = digest.data.markdown;
    sendMessage(chatId, md);

  } catch (err) {
    sendMessage(chatId, `❌ Error: ${err.message}`);
  }
}

/**
 * /export - Export to Vault
 */
function cmdExport(chatId, args) {
  const week = args && args[0] ? args[0] : isoWeekNow_();

  sendMessage(chatId, `💾 Exporting ${week} to Vault...`);

  try {
    const exported = exportTentToVault(week);

    if (!exported.ok) {
      throw new Error(exported.error || 'Export failed');
    }

    sendMessage(chatId, `✅ Exported to ${exported.data.path}/${exported.data.filename}`);

  } catch (err) {
    sendMessage(chatId, `❌ Export failed: ${err.message}`);
  }
}

/**
 * /help - Show commands
 */
function cmdHelp(chatId) {
  const msg = `🏛️ *GENERAL'S TENT COMMANDS*\n\n` +
    `/tent - Open Tent WebApp\n` +
    `/week [YYYY-Www] - Week status\n` +
    `/scores [YYYY-Www] - TickTick scores\n` +
    `/digest [YYYY-Www] - Weekly digest\n` +
    `/export [YYYY-Www] - Export to Vault\n` +
    `/help - Show this help\n\n` +
    `Default week: current week`;

  sendMessage(chatId, msg);
}

// ----------------------------------------------------------------
// TELEGRAM API
// ----------------------------------------------------------------

/**
 * Send message to chat
 * @param {string} chatId - Chat ID
 * @param {string} text - Message text
 * @param {Object} opts - Optional params
 */
function sendMessage(chatId, text, opts) {
  const config = getTelegramConfig();
  const token = config.botToken;

  if (!token) {
    logError_('Telegram bot token not configured');
    return;
  }

  opts = opts || {};

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: opts.parseMode || 'Markdown',
    disable_web_page_preview: opts.disablePreview !== false
  };

  if (opts.replyMarkup) {
    payload.reply_markup = opts.replyMarkup;
  }

  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    logError_('Failed to send Telegram message', err);
  }
}

/**
 * Answer callback query
 * @param {string} callbackId - Callback query ID
 * @param {string} text - Answer text
 */
function answerCallback(callbackId, text) {
  const config = getTelegramConfig();
  const token = config.botToken;

  if (!token) return;

  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;

  const payload = {
    callback_query_id: callbackId,
    text: text
  };

  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    logError_('Failed to answer callback', err);
  }
}

/**
 * Set webhook (run once after deployment)
 */
function setTentWebhook() {
  const config = getTelegramConfig();
  const token = config.botToken;
  const webhookUrl = getProp_(PROP.WEBAPP_URL);

  if (!token || !webhookUrl) {
    throw new Error('Missing bot token or webapp URL');
  }

  const url = `https://api.telegram.org/bot${token}/setWebhook`;

  const payload = {
    url: webhookUrl
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });

  const result = JSON.parse(response.getContentText());

  Logger.log('Webhook set result:');
  Logger.log(JSON.stringify(result, null, 2));

  return result;
}

/**
 * Get webhook info
 */
function getTentWebhookInfo() {
  const config = getTelegramConfig();
  const token = config.botToken;

  if (!token) {
    throw new Error('Missing bot token');
  }

  const url = `https://api.telegram.org/bot${token}/getWebhookInfo`;

  const response = UrlFetchApp.fetch(url);
  const result = JSON.parse(response.getContentText());

  Logger.log('Webhook info:');
  Logger.log(JSON.stringify(result, null, 2));

  return result;
}
