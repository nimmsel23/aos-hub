// ================================================================
// Door Profit (daily review / weekly wrap-up helpers)
// ================================================================

function dailyReview() {
  Logger.log('Running dailyReview...');

  try {
    const data = getDailyReviewData();

    if (!data) {
      hub_sendMessage_(CONFIG.CHAT_ID, '📅 *Daily Review - Data Unavailable*\n\nBridge is offline or unreachable.');
      return;
    }

    const week = getCurrentWeekString();
    const date = new Date();
    const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd.MM.yyyy');

    let message = `📅 *Daily Review - ${dateStr}*\n`;
    message += `🗓 Week: ${week}\n\n`;

    message += `🧠 *Session Logger (Yesterday):*\n`;
    if (data.sessions && data.sessions.length > 0) {
      data.sessions.forEach(s => {
        message += `• ${s.file}: ${s.events} events\n`;
      });
    } else {
      message += '• No sessions logged\n';
    }
    message += '\n';

    message += `🔥 *Fire Tasks (Pending):*\n`;
    message += `• Total: ${data.tasks.fire || 0} tasks\n`;
    message += `• View: \`task +fire +hit list\`\n\n`;

    message += `---\n\n`;
    message += `🎯 *Elliott Hulse:*\n`;
    message += `"${getRandomQuote()}"\n\n`;
    message += `Have a dominant day! 💪`;

    hub_sendMessage_(CONFIG.CHAT_ID, message);
    Logger.log('Daily review sent successfully');

  } catch (error) {
    Logger.log('Error in dailyReview: ' + error.toString());
    hub_sendMessage_(CONFIG.CHAT_ID, '⚠️ Daily Review failed: ' + error.message);
  }
}

function getDailyReviewData() {
  try {
    const base = (typeof getBridgeUrl_ === 'function') ? getBridgeUrl_() : '';
    if (!base) return null;
    const url = String(base).replace(/\/$/, '') + '/daily-review-data';

    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: (typeof bridge_getAuthHeaders_ === 'function') ? bridge_getAuthHeaders_() : {},
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      try {
        return JSON.parse(response.getContentText());
      } catch (e) {
        Logger.log('dailyReview: non-JSON response: ' + String(response.getContentText() || '').slice(0, 200));
        return null;
      }
    }

    Logger.log('Failed to fetch daily review data: HTTP ' + response.getResponseCode());
    return null;

  } catch (error) {
    Logger.log('Error fetching daily review data: ' + error.toString());
    return null;
  }
}

function getRandomQuote() {
  const quotes = [
    "Wars aren't won in one big move; they're won through a series of decisive battles.",
    'DOMINION is earned through daily strikes, not lucky breaks.',
    'Your Frame determines everything downstream.',
    'The VOICE within you knows the truth - will you listen?',
    'A Door opened is a Door multiplied.',
    '28 or Die - this is the Weekly War.',
    'Hit your four, before the Door, to prepare for War.',
    'The Door you choose is only the beginning. The real work begins with preparation for the battle ahead.'
  ];

  return quotes[Math.floor(Math.random() * quotes.length)];
}
