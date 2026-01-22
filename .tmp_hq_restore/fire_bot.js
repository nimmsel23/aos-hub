// Fire Bot (GAS) - Telegram polling + Drive task_export.json fallback

const FIRE_BOT_KEYS = {
  offset: 'FIRE_BOT_OFFSET'
};

function fireBot_setupPollingTrigger(intervalMinutes) {
  const interval = typeof intervalMinutes === 'number' ? intervalMinutes : 5;
  const triggers = ScriptApp.getProjectTriggers();

  // Remove existing trigger
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'fireBot_pollTelegram') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Create new trigger (polling every X minutes)
  ScriptApp.newTrigger('fireBot_pollTelegram')
    .timeBased()
    .everyMinutes(interval)
    .create();

  return { ok: true, trigger: 'fireBot_pollTelegram', interval: interval };
}

function fireBot_pollTelegram() {
  const token = fireBot_getToken_();
  if (!token) {
    Logger.log('fireBot_pollTelegram: FIRE_BOT_TOKEN missing');
    return;
  }

  const sp = PropertiesService.getScriptProperties();
  const offset = Number(sp.getProperty(FIRE_BOT_KEYS.offset) || 0) || 0;
  const params = { timeout: 25 };
  if (offset) params.offset = offset;

  const url = `https://api.telegram.org/bot${token}/getUpdates?` + fireBot_encodeQuery_(params);
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    Logger.log('fireBot_pollTelegram: ' + res.getContentText());
    return;
  }

  const payload = JSON.parse(res.getContentText());
  const updates = payload.result || [];
  let nextOffset = offset;

  updates.forEach((update) => {
    const updateId = Number(update.update_id || 0);
    if (updateId && updateId >= nextOffset) nextOffset = updateId + 1;
    if (update.message) fireBot_handleMessage_(update.message);
  });

  if (nextOffset && nextOffset !== offset) {
    sp.setProperty(FIRE_BOT_KEYS.offset, String(nextOffset));
  }
}

function fireBot_handleMessage_(message) {
  const chatId = message.chat && message.chat.id;
  if (!chatId) return;
  const text = String(message.text || '').trim();
  if (!text) return;

  const cmd = text.split(/\s+/)[0].toLowerCase();
  if (cmd === '/fire') {
    fireBot_sendDueTasks_(chatId, 1);
    return;
  }
  if (cmd === '/fireweek' || cmd === '/fireweekend' || cmd === '/fire7') {
    fireBot_sendDueTasks_(chatId, 7);
    return;
  }
  if (cmd === '/firecal') {
    fireBot_sendTelegram_(chatId, 'Use /fire (task_export snapshot). Calendar mode removed.');
    return;
  }
  if (cmd === '/firehelp') {
    fireBot_sendTelegram_(chatId, 'Commands: /fire (today), /fireweek (this week)');
  }
}

function fireBot_parseTaskDate_(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  // Taskwarrior export is usually ISO8601; Date can parse it.
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return null;
}

function fireBot_taskInRange_(task, start, end) {
  const fields = ['due', 'scheduled', 'wait'];
  for (let i = 0; i < fields.length; i++) {
    const d = fireBot_parseTaskDate_(task[fields[i]]);
    if (!d) continue;
    if (d >= start && d < end) return true;
  }
  return false;
}

function fireBot_taskIsOverdue_(task, startOfToday) {
  const fields = ['due', 'scheduled', 'wait'];
  for (let i = 0; i < fields.length; i++) {
    const d = fireBot_parseTaskDate_(task[fields[i]]);
    if (!d) continue;
    if (d < startOfToday) return true;
  }
  return false;
}

function fireBot_buildMessagesFromTaskExport_(days) {
  if (typeof aos_loadTaskExportSafe_ !== 'function') {
    return { ok: false, error: 'aos_loadTaskExportSafe_ missing (task_export loader)' };
  }

  const tz = Session.getScriptTimeZone();
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const d = (typeof days === 'number' && days > 0) ? Math.min(days, 14) : 1;
  const scope = (d <= 1) ? 'daily' : 'weekly';

  // Daily: today only. Weekly: today..end-of-week+1 day (Mon–Sun).
  const start = new Date(startOfToday);
  let end = new Date(startOfToday);
  if (scope === 'daily') {
    end.setDate(end.getDate() + 1);
  } else {
    // Move to end of ISO week (Mon..Sun). JS: Sun=0.
    const dow = start.getDay();
    const dowMon = (dow + 6) % 7; // Mon=0
    const daysToSun = 6 - dowMon;
    end.setDate(end.getDate() + daysToSun + 1); // exclusive end
  }

  const tasks = aos_loadTaskExportSafe_() || [];
  const fire = tasks.filter((t) => {
    if (!t || typeof t !== 'object') return false;
    const status = String(t.status || '').toLowerCase();
    if (status !== 'pending' && status !== 'waiting') return false;
    const tags = t.tags || [];
    return Array.isArray(tags) && tags.indexOf('fire') !== -1;
  });

  const overdue = [];
  const inScope = [];
  const undated = [];
  fire.forEach((t) => {
    const hasAnyDate = Boolean(t.due || t.scheduled || t.wait);
    if (fireBot_taskIsOverdue_(t, startOfToday)) {
      overdue.push(t);
      return;
    }
    if (fireBot_taskInRange_(t, start, end)) {
      inScope.push(t);
      return;
    }
    if (scope === 'weekly' && !hasAnyDate) {
      undated.push(t);
    }
  });

  function taskLine_(t) {
    const id = t.id ? String(t.id) : '';
    const desc = String(t.description || '').trim();
    return id ? ('- ' + id + ' ' + desc) : ('- ' + desc);
  }

  const messages = [];
  const todayStr = Utilities.formatDate(startOfToday, tz, 'yyyy-MM-dd');

  // Overdue first (single message).
  if (overdue.length) {
    const lines = overdue.slice(0, 120).map(taskLine_);
    messages.push('*⛔ Overdue Fire*\n```markdown\n' + lines.join('\n') + '\n```');
  }

  const grouped = {};
  function addToGroup_(t) {
    const proj = String(t.project || 'Inbox').trim() || 'Inbox';
    if (!grouped[proj]) grouped[proj] = [];
    grouped[proj].push(t);
  }
  inScope.forEach(addToGroup_);
  undated.slice(0, 10).forEach(addToGroup_);

  Object.keys(grouped).sort().forEach((proj) => {
    const list = grouped[proj] || [];
    const title = (scope === 'daily')
      ? ('🔥 Fire today — ' + proj + ' (' + todayStr + ')')
      : ('🔥 Fire week — ' + proj + ' (' + todayStr + ')');
    const lines = list.slice(0, 30).map(taskLine_);
    messages.push('*' + title + '*\n```markdown\n' + lines.join('\n') + '\n```');
  });

  if (!messages.length) {
    const title = scope === 'daily' ? ('🔥 Fire today (' + todayStr + ')') : ('🔥 Fire week (' + todayStr + ')');
    messages.push('*' + title + '*\n```markdown\n(no tasks)\n```');
  }

  return { ok: true, scope: scope, messages: messages };
}

function fireBot_sendDueTasks_(chatId, days) {
  const result = fireBot_buildMessagesFromTaskExport_(days);
  if (!result || !result.ok) {
    fireBot_sendTelegram_(chatId, '❌ Fire failed (task_export)\n' + String((result && result.error) || 'unknown'));
    return;
  }
  const msgs = Array.isArray(result.messages) ? result.messages : [];
  msgs.forEach((m) => {
    const text = String(m || '').trim();
    if (text) fireBot_sendTelegram_(chatId, text);
  });
}

function fireBot_getToken_() {
  const cfg = typeof getBotConfig_ === 'function' ? getBotConfig_() : { botToken: '' };
  return cfg.fireBotToken || cfg.botToken || '';
}

function fireBot_sendTelegram_(chatId, text) {
  const token = fireBot_getToken_();
  if (!token) return { ok: false, error: 'FIRE_BOT_TOKEN missing' };

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: String(chatId),
    text: String(text || ''),
    parse_mode: 'Markdown'
  };

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  return { ok: res.getResponseCode() < 300 };
}

function fireBot_encodeQuery_(params) {
  return Object.keys(params || {})
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}
