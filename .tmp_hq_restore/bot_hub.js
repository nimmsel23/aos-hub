// ================================================================
// Bot Hub (scheduling + hub messaging)
// ================================================================

function weeklyWarStackReminder() {
  Logger.log('Running weeklyWarStackReminder...');

  try {
    const week = getCurrentWeekString();

    const message = `⚔️ *Weekly War Stack - ${week}*\n\n` +
      `*"Hit your four, before the Door, to prepare for War."* – E.H.\n\n` +
      `🗓 *Sunday 18:00 - Planning Time*\n\n` +
      `This week's battle plan:\n` +
      `1. Review last week (PROFIT phase)\n` +
      `2. Check Hot List (POTENTIAL)\n` +
      `3. Select Domino Door (DOOR WAR)\n` +
      `4. Create War Stack (4 HITS)\n` +
      `5. Build Hit List (PRODUCTION)\n\n` +
      `*Create War Stack:*\n${CONFIG.DOOR_CENTRE_URL}\n\n` +
      `Or open @WarStackBotIDEADPAD_bot and send /war\n\n` +
      `*"Wars aren't won in one big move; they're won through a series of decisive battles."*`;

    // send without parse_mode to avoid markdown parse errors
    hub_sendMessage_(CONFIG.CHAT_ID, message, null);
    Logger.log('Weekly War Stack reminder sent');

  } catch (error) {
    Logger.log('Error in weeklyWarStackReminder: ' + error.toString());
    hub_sendMessage_(CONFIG.CHAT_ID, '⚠️ War Stack Reminder failed: ' + error.message);
  }
}

function weeklyFireMapAutomation() {
  Logger.log('Running weeklyFireMapAutomation...');

  try {
    const week = getCurrentWeekString();

    hub_sendMessage_(CONFIG.CHAT_ID, `🔥 *Weekly Fire Map - ${week}*\n\nStarting automation...\n\nCheck results in 2 minutes.`);

    const base = (typeof getBridgeUrl_ === 'function') ? getBridgeUrl_() : '';
    if (!base) throw new Error('Bridge URL missing');
    const url = String(base).replace(/\/$/, '') + '/trigger/weekly-firemap';

    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: (typeof bridge_getAuthHeaders_ === 'function') ? bridge_getAuthHeaders_() : {},
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    const body = response.getContentText();
    let result = {};
    try {
      result = body ? JSON.parse(body) : {};
    } catch (e) {
      Logger.log('weeklyFireMapAutomation: non-JSON response (HTTP ' + statusCode + '): ' + String(body || '').slice(0, 200));
      hub_sendMessage_(CONFIG.CHAT_ID, '❌ Failed to trigger Fire Map automation\n\nNon-JSON response (wrong URL or bridge down).');
      return;
    }

    if ((statusCode >= 200 && statusCode < 300) && result && result.ok) {
      Logger.log('Fire Map automation triggered successfully');
    } else {
      hub_sendMessage_(CONFIG.CHAT_ID, '❌ Failed to trigger Fire Map automation\n\n' + (body || ('HTTP ' + statusCode)));
    }

  } catch (error) {
    Logger.log('Error in weeklyFireMapAutomation: ' + error.toString());
    hub_sendMessage_(CONFIG.CHAT_ID, '⚠️ Fire Map automation failed: ' + error.message);
  }
}

function hub_sendMessage_(chatId, text, replyMarkup) {
  const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());
    if (!result.ok) {
      Logger.log('sendMessage error: ' + JSON.stringify(result));
    }
  } catch (error) {
    Logger.log('sendMessage error: ' + error.toString());
  }
}

function getCurrentWeekString(date) {
  if (!date) date = new Date();

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  let temp = new Date(year, month, day);
  const dow = temp.getDay();
  const dowMon = (dow + 6) % 7;

  const offset = (dowMon - 3 + 7) % 7;
  temp.setDate(temp.getDate() - offset);
  const thurs = temp;

  const thursYear = thurs.getFullYear();

  let firstThurs = new Date(thursYear, 0, 4);
  const firstDow = firstThurs.getDay();
  const daysToFirst = (3 - firstDow + 7) % 7;
  firstThurs.setDate(firstThurs.getDate() - daysToFirst);

  const weekNum = Math.floor((thurs - firstThurs) / 86400000 / 7) + 1;

  return `${thursYear}-W${weekNum.toString().padStart(2, '0')}`;
}
