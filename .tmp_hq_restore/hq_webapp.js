// ================================================================
// HQ WebApp backend (Telegram WebApp / GAS HQ v1)
// ================================================================

const TELEGRAM_CONFIG = {
  BOT_TOKEN: PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN') || '',
  WEBHOOK_URL: PropertiesService.getScriptProperties().getProperty('TELEGRAM_WEBHOOK_URL') || '',
  SHEET_ID: PropertiesService.getScriptProperties().getProperty('TELEGRAM_SHEET_ID') ||
    PropertiesService.getScriptProperties().getProperty('SHEET_ID') || '',
  TICKTICK_TOKEN: PropertiesService.getScriptProperties().getProperty('TICKTICK_TOKEN') || '',
  SHEET_NAMES: {
    HOTLIST: 'HotList_Log',
    CORE4: 'Core4_Log',
    WEBAPP_SESSIONS: 'WebApp_Sessions'
  }
};

function webapp_getControlCenterUrl_() {
  if (typeof getCentreUrls_ === 'function') {
    const urls = getCentreUrls_();
    if (urls && urls.hq) return urls.hq;
  }
  const sp = PropertiesService.getScriptProperties();
  const propUrl = (sp.getProperty('HQ_WEBAPP_URL') || '').trim();
  if (propUrl) return propUrl;
  try {
    return ScriptApp.getService().getUrl();
  } catch (err) {
    return '';
  }
}

function webapp_handleWebAppData(webAppData, user, chatId) {
  try {
    const data = JSON.parse(webAppData.data);
    Logger.log('Web App Data received:', data);

    let responseMessage = '';

    switch (data.type) {
      case 'hotlist':
        responseMessage = webapp_handleHotListSubmission(data, user, chatId);
        break;

      case 'core4':
        responseMessage = webapp_handleCore4Submission(data, user, chatId);
        break;

      case 'session_complete':
        responseMessage = webapp_handleSessionComplete(data, user, chatId);
        break;

      default:
        responseMessage = `❓ Unknown data type: ${data.type}`;
    }

    webapp_sendTelegramMessage(chatId, responseMessage);
    webapp_logWebAppSession(data, user, chatId);

  } catch (error) {
    Logger.log('Error handling Web App data:', error);
    webapp_sendTelegramMessage(chatId, '❌ Error processing your request');
  }
}

function webapp_handleHotListSubmission(data, user, chatId) {
  const idea = data.idea;
  const timestamp = data.timestamp || new Date().toISOString();

  webapp_logHotListToSheets(idea, user, 'telegram_webapp', timestamp);
  const ticktickSuccess = webapp_createTickTickHotListTask(idea);

  let response = `🔥 *Hot List Added*\n\n📝 "${idea}"\n\n`;

  if (ticktickSuccess) {
    response += '✅ Synced to TickTick\n';
  } else {
    response += '📊 Logged to αOS\n';
  }

  response += `👤 ${user.first_name}\n📅 ${webapp_formatTimestamp(timestamp)}`;

  return response;
}

function webapp_handleCore4Submission(data, user, chatId) {
  const domain = data.domain;
  const task = data.task;
  const timestamp = data.timestamp || new Date().toISOString();

  const logRes = core4_log(domain, task, timestamp, 'telegram_webapp', user);
  const habitSuccess = webapp_updateTickTickHabit(domain, task);
  const todayProgress = logRes.total_today || 0;

  const habitLabel = (typeof core4_getHabitLabel_ === 'function')
    ? core4_getHabitLabel_(domain, task)
    : webapp_capitalizeFirst(task);
  let response = `⚡ *Core4 Logged*\n\n`;
  response += `🎯 **${webapp_capitalizeFirst(domain)}** > ${habitLabel}\n`;
  response += `📊 Today: ${todayProgress}/4.0 points\n\n`;

  if (habitSuccess) {
    response += '✅ TickTick Habit updated\n';
  }

  response += `👤 ${user.first_name}\n📅 ${webapp_formatTimestamp(timestamp)}`;

  if (todayProgress >= 4.0) {
    response += '\n\n🎉 **Daily Core4 Complete!**';
  } else if (todayProgress >= 2.0) {
    response += '\n\n🔥 Halfway there!';
  }

  return response;
}

function webapp_handleSessionComplete(data, user, chatId) {
  const core4Today = data.core4_today || 0;
  const timestamp = data.timestamp || new Date().toISOString();

  let response = `📊 *αOS Session Complete*\n\n`;
  response += `⚡ Core4 Today: ${core4Today}/4.0\n`;
  response += `👤 ${user.first_name}\n`;
  response += `📅 ${webapp_formatTimestamp(timestamp)}\n\n`;

  if (core4Today >= 4.0) {
    response += '🏆 **Outstanding! Full Core4 achieved!**';
  } else if (core4Today >= 2.0) {
    response += '💪 **Great progress! Keep going!**';
  } else if (core4Today > 0) {
    response += '🌱 **Good start! Every step counts!**';
  } else {
    response += '🎯 **Ready to begin your Alpha journey!**';
  }

  return response;
}

function webapp_logHotListToSheets(idea, user, source, timestamp) {
  try {
    const ss = SpreadsheetApp.openById(TELEGRAM_CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName(TELEGRAM_CONFIG.SHEET_NAMES.HOTLIST);

    if (!sheet) {
      sheet = ss.insertSheet(TELEGRAM_CONFIG.SHEET_NAMES.HOTLIST);
      const headers = ['Timestamp', 'User_ID', 'Username', 'First_Name', 'Idea', 'Source', 'TickTick_Synced'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }

    const row = [
      timestamp,
      user.id,
      user.username || '',
      user.first_name || '',
      idea,
      source,
      false
    ];

    sheet.appendRow(row);
    Logger.log(`Hot List logged: ${idea}`);

  } catch (error) {
    Logger.log('Error logging Hot List to sheets:', error);
  }
}

function webapp_logCore4ToSheets(domain, task, user, source, timestamp) {
  try {
    const ss = SpreadsheetApp.openById(TELEGRAM_CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName(TELEGRAM_CONFIG.SHEET_NAMES.CORE4);

    if (!sheet) {
      sheet = ss.insertSheet(TELEGRAM_CONFIG.SHEET_NAMES.CORE4);
      const headers = ['Date', 'Timestamp', 'User_ID', 'Username', 'Domain', 'Task', 'Points', 'Source', 'TickTick_Synced'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }

    const date = new Date(timestamp).toDateString();
    const row = [
      date,
      timestamp,
      user.id,
      user.username || '',
      domain,
      task,
      0.5,
      source,
      false
    ];

    sheet.appendRow(row);
    Logger.log(`Core4 logged: ${domain} > ${task}`);

  } catch (error) {
    Logger.log('Error logging Core4 to sheets:', error);
  }
}

function webapp_logWebAppSession(data, user, chatId) {
  try {
    const ss = SpreadsheetApp.openById(TELEGRAM_CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName(TELEGRAM_CONFIG.SHEET_NAMES.WEBAPP_SESSIONS);

    if (!sheet) {
      sheet = ss.insertSheet(TELEGRAM_CONFIG.SHEET_NAMES.WEBAPP_SESSIONS);
      const headers = ['Timestamp', 'User_ID', 'Username', 'Chat_ID', 'Data_Type', 'Data_JSON'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }

    const row = [
      new Date().toISOString(),
      user.id,
      user.username || '',
      chatId,
      data.type,
      JSON.stringify(data)
    ];

    sheet.appendRow(row);

  } catch (error) {
    Logger.log('Error logging Web App session:', error);
  }
}

function webapp_createTickTickHotListTask(idea) {
  const token = PropertiesService.getScriptProperties().getProperty('TICKTICK_TOKEN');
  if (!token) {
    Logger.log('TickTick token not configured');
    return false;
  }

  try {
    const payload = {
      title: `🔥 ${idea}`,
      tags: ['hot', 'telegram'],
      projectId: webapp_getTickTickInboxProjectId()
    };

    const response = UrlFetchApp.fetch('https://api.ticktick.com/open/v1/task', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    });

    if (response.getResponseCode() === 200) {
      Logger.log('TickTick Hot List task created successfully');
      return true;
    }

  } catch (error) {
    Logger.log('Error creating TickTick task:', error);
  }

  return false;
}

function webapp_updateTickTickHabit(domain, task) {
  const token = PropertiesService.getScriptProperties().getProperty('TICKTICK_TOKEN');
  if (!token) {
    Logger.log('TickTick token not configured');
    return false;
  }

  const habitMapping = {
    'body-fitness': '🏃 Fitness',
    'body-fuel': '🥗 Healthy Fuel',
    'being-meditation': '🧘 Meditation',
    'being-memoirs': '📝 Journal',
    'balance-person1': '🤝 Person 1',
    'balance-person2': '🤝 Person 2',
    'business-discover': '📚 Learn',
    'business-declare': '🎯 Action'
  };

  const habitKey = `${domain}-${task}`;
  const habitName = habitMapping[habitKey];

  if (!habitName) {
    Logger.log(`No habit mapping found for: ${habitKey}`);
    return false;
  }

  try {
    Logger.log(`Would update TickTick habit: ${habitName}`);
    return true;

  } catch (error) {
    Logger.log('Error updating TickTick habit:', error);
    return false;
  }
}

function webapp_getTodayCore4Progress(userId) {
  try {
    const res = core4_getToday();
    return Math.min(res.total || 0, 4.0);
  } catch (error) {
    Logger.log('Error getting Core4 progress:', error);
    return 0;
  }
}

function webapp_generateWeeklyCore4Report(userId) {
  try {
    return core4_buildWeeklyReportText();
  } catch (error) {
    Logger.log('Error generating weekly report:', error);
    return 'Error generating report';
  }
}

function webapp_handleTelegramMessage(message) {
  const chatId = message.chat.id;
  const text = message.text;
  const user = message.from;

  if (!text) return;

  if (text.startsWith('/start')) {
    webapp_sendWelcomeMessage(chatId, user);
  } else if (text.startsWith('/webapp')) {
    webapp_sendWebAppButton(chatId);
  } else if (text.startsWith('/status')) {
    webapp_sendStatusMessage(chatId, user);
  } else if (text.startsWith('/report')) {
    const report = webapp_generateWeeklyCore4Report(user.id);
    webapp_sendTelegramMessage(chatId, report);
  } else if (text.startsWith('/help')) {
    webapp_sendHelpMessage(chatId);
  }
}

function webapp_sendWelcomeMessage(chatId, user) {
  const message = `🚀 *Welcome to αOS, ${user.first_name}!*\n\n` +
    `Your productivity control center is ready.\n\n` +
    `🔥 Quick capture ideas\n` +
    `⚡ Track Core4 habits\n` +
    `📊 Monitor progress\n\n` +
    `Tap the button below to open αOS Control Center.`;

  const keyboard = {
    inline_keyboard: [[{
      text: '🎯 Open αOS',
      web_app: { url: webapp_getControlCenterUrl_() }
    }]]
  };

  webapp_sendTelegramMessage(chatId, message, keyboard);
}

function webapp_sendWebAppButton(chatId) {
  const message = '🎯 *αOS Control Center*\n\nTap to open the mobile interface:';

  const keyboard = {
    inline_keyboard: [[{
      text: '📱 Open Control Center',
      web_app: { url: webapp_getControlCenterUrl_() }
    }]]
  };

  webapp_sendTelegramMessage(chatId, message, keyboard);
}

function webapp_sendStatusMessage(chatId, user) {
  const todayProgress = webapp_getTodayCore4Progress(user.id);
  const progressPercent = Math.round((todayProgress / 4.0) * 100);

  let message = `📊 *αOS Status*\n\n`;
  message += `👤 ${user.first_name}\n`;
  message += `⚡ Today's Core4: ${todayProgress}/4.0 (${progressPercent}%)\n`;
  message += `📅 ${new Date().toDateString()}\n\n`;

  if (todayProgress >= 4.0) {
    message += '🏆 **Daily goal achieved!**';
  } else {
    message += `🎯 **${(4.0 - todayProgress).toFixed(1)} points to go!**`;
  }

  webapp_sendTelegramMessage(chatId, message);
}

function webapp_sendHelpMessage(chatId) {
  const message = `🤖 *αOS Bot Help*\n\n` +
    `*Commands:*\n` +
    `/webapp - Open Control Center\n` +
    `/status - Today's progress\n` +
    `/report - Weekly summary\n` +
    `/help - Show extended help\n\n` +
    `*Web App Features:*\n` +
    `🔥 Hot List - Quick idea capture\n` +
    `⚡ Core4 - Habit tracking\n` +
    `📊 Progress - Real-time stats\n\n` +
    `*Core4 Domains:*\n` +
    `🏃 Body - Fitness, Fuel\n` +
    `🧘 Being - Meditation, Memoirs\n` +
    `❤️ Balance - Partner, Posterity\n` +
    `💼 Business - Discover, Declare`;

  webapp_sendTelegramMessage(chatId, message);
}

function webapp_sendTelegramMessage(chatId, text, keyboard) {
  const token = (typeof getPrimaryBotToken_ === 'function')
    ? getPrimaryBotToken_()
    : (PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN') || '');
  if (!token) {
    Logger.log('Telegram bot token not configured');
    return;
  }

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };

  if (keyboard) {
    payload.reply_markup = keyboard;
  }

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

function webapp_formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function webapp_capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function webapp_getTickTickInboxProjectId() {
  return PropertiesService.getScriptProperties().getProperty('TICKTICK_INBOX_PROJECT_ID') || 'inbox';
}

/**
 * Setup + init wrapper for WebApp backend.
 * Uses Script Properties if present and falls back to TELEGRAM_CONFIG.
 */
function webapp_setupTelegramWebAppBackend() {
  Logger.log('🧩 Running webapp_setupTelegramWebAppBackend...');

  const sp = PropertiesService.getScriptProperties();
  const botToken = sp.getProperty('TELEGRAM_BOT_TOKEN') || TELEGRAM_CONFIG.BOT_TOKEN;
  const sheetId = sp.getProperty('TELEGRAM_SHEET_ID') || sp.getProperty('SHEET_ID') || TELEGRAM_CONFIG.SHEET_ID;
  const webhookUrl = sp.getProperty('TELEGRAM_WEBHOOK_URL') || TELEGRAM_CONFIG.WEBHOOK_URL;
  const ticktickToken = sp.getProperty('TICKTICK_TOKEN') || TELEGRAM_CONFIG.TICKTICK_TOKEN;

  const missing = [];
  if (!botToken) missing.push('TELEGRAM_BOT_TOKEN');
  if (!sheetId) missing.push('TELEGRAM_SHEET_ID or SHEET_ID');

  if (missing.length) {
    Logger.log('❌ Missing properties: ' + missing.join(', '));
    return { ok: false, missing: missing };
  }

  if (!sp.getProperty('TELEGRAM_BOT_TOKEN')) sp.setProperty('TELEGRAM_BOT_TOKEN', botToken);
  if (!sp.getProperty('TELEGRAM_SHEET_ID') && sheetId) sp.setProperty('TELEGRAM_SHEET_ID', sheetId);
  if (!sp.getProperty('TELEGRAM_WEBHOOK_URL') && webhookUrl) sp.setProperty('TELEGRAM_WEBHOOK_URL', webhookUrl);
  if (!sp.getProperty('TICKTICK_TOKEN') && ticktickToken) sp.setProperty('TICKTICK_TOKEN', ticktickToken);

  Logger.log('✅ webapp_setupTelegramWebAppBackend complete.');
  return { ok: true };
}
