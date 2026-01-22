// ================================================================
// CORE4 LOG (Drive JSON per week)
// ================================================================

const CORE4_CONFIG = {
  FOLDER_NAME: 'Alpha_Core4',
  FILE_PREFIX: 'core4_week_',
  DAY_PREFIX: 'core4_day_',
  EVENT_ROOT: '.core4',
  EVENT_DIR: 'events',
  SUMMARY_PREFIX: 'core4_week_summary_',
  SUMMARY_FOLDER_NAME: 'Alpha_Tent',
  SHEET_PROP: 'CORE4_SHEET_ID',
  SHEET_NAME: 'Core4_Log'
};

const CORE4_HABITS = {
  body: {
    fitness: 'Fitness',
    fuel: 'Fuel'
  },
  being: {
    meditation: 'Meditation',
    memoirs: 'Memoirs'
  },
  balance: {
    person1: 'Person 1',
    person2: 'Person 2'
  },
  business: {
    discover: 'Discover',
    declare: 'Declare'
  }
};

function core4_log(domain, task, timestamp, source, user) {
  const ts = timestamp ? new Date(timestamp) : new Date();
  const weekKey = core4_getWeekKey_(ts);
  const d = String(domain || '').toLowerCase();
  const t = String(task || '').toLowerCase();
  if (!d || !t) return { ok: false, error: 'domain/task missing' };

  const dateKey = core4_formatDate_(ts);
  const src = String(source || 'webapp');
  const entry = {
    id: Utilities.getUuid(),
    key: `${dateKey}:${d}:${t}`,
    ts: ts.toISOString(),
    last_ts: ts.toISOString(),
    date: dateKey,
    week: weekKey,
    domain: d,
    task: t,
    done: true,
    points: 0.5,
    source: src,
    sources: [src],
    user: {
      id: user && user.id ? String(user.id) : 'web',
      username: user && user.username ? String(user.username) : '',
      first_name: user && user.first_name ? String(user.first_name) : 'Web'
    }
  };

  core4_writeEvent_(entry);
  const dayData = core4_buildDay_(dateKey);
  const weekData = core4_buildWeekForDate_(ts);

  core4_appendSheetRow_(entry);
  return { ok: true, week: weekKey, total_today: core4_totalForDate_(weekData.entries, dateKey) };
}

function core4_getToday() {
  const today = new Date();
  const weekKey = core4_getWeekKey_(today);
  core4_buildWeekForDate_(today);
  const data = core4_loadWeek_(weekKey);
  const dateKey = core4_formatDate_(today);
  return {
    ok: true,
    week: weekKey,
    date: dateKey,
    total: core4_totalForDate_(data.entries, dateKey)
  };
}

function core4_getWeekLog(weekKey) {
  const key = weekKey || core4_getWeekKey_(new Date());
  return core4_loadWeek_(key);
}

function core4_getWeekSummary(weekKey) {
  const key = weekKey || core4_getWeekKey_(new Date());
  const data = core4_loadWeek_(key);
  const totals = core4_computeTotals_(data.entries);
  return {
    week: key,
    entries: data.entries,
    totals: totals
  };
}

function core4_buildWeeklyReportText(weekKey) {
  const summary = core4_getWeekSummary(weekKey);
  const totals = summary.totals;
  const weekTotal = totals.week_total || 0;
  const target = 28;
  const pct = Math.round((weekTotal / target) * 100);

  const domainLines = [];
  Object.keys(CORE4_HABITS).forEach(domain => {
    const label = core4_capitalize_(domain);
    const points = totals.by_domain[domain] || 0;
    domainLines.push(`${label}: ${points}/7`);
  });

  let message = `⚡ *Core4 Weekly Summary – ${summary.week}*\\n\\n`;
  message += `Total: ${weekTotal}/${target} (${pct}%)\\n\\n`;
  message += `*By Domain:*\\n${domainLines.map(l => `• ${l}`).join('\\n')}\\n\\n`;
  message += `*Daily Totals:*\\n`;
  const dayKeys = Object.keys(totals.by_day || {}).sort();
  if (!dayKeys.length) {
    message += '• No entries yet\\n';
  } else {
    dayKeys.forEach(day => {
      message += `• ${day}: ${totals.by_day[day]}\\n`;
    });
  }
  message += '\\n28 or Die.';
  return message;
}

function core4_exportWeekSummaryToDrive(weekKey) {
  const summary = core4_getWeekSummary(weekKey);
  const totals = summary.totals;
  const week = summary.week;
  const target = 28;
  const weekTotal = totals.week_total || 0;
  const pct = Math.round((weekTotal / target) * 100);

  let md = `# Core4 Weekly Summary – ${week}\\n\\n`;
  md += `Total: ${weekTotal}/${target} (${pct}%)\\n\\n`;
  md += '## By Domain\\n';
  Object.keys(CORE4_HABITS).forEach(domain => {
    const points = totals.by_domain[domain] || 0;
    md += `- ${core4_capitalize_(domain)}: ${points}/7\\n`;
  });
  md += '\\n## Daily Totals\\n';
  const dayKeys = Object.keys(totals.by_day || {}).sort();
  if (!dayKeys.length) {
    md += '- No entries yet\\n';
  } else {
    dayKeys.forEach(day => {
      md += `- ${day}: ${totals.by_day[day]}\\n`;
    });
  }
  md += '\\n## Entries\\n';
  summary.entries.forEach(entry => {
    const habitLabel = core4_getHabitLabel_(entry.domain, entry.task);
    md += `- ${entry.date} • ${core4_capitalize_(entry.domain)} • ${habitLabel} • +${entry.points}\\n`;
  });

  const folder = core4_getSummaryFolder_();
  const name = CORE4_CONFIG.SUMMARY_PREFIX + week + '.md';
  const files = folder.getFilesByName(name);
  const content = md.trim() + '\\n';
  let file;
  if (files.hasNext()) {
    file = files.next();
    file.setContent(content);
  } else {
    file = folder.createFile(name, content, MimeType.PLAIN_TEXT);
  }
  return { id: file.getId(), name: file.getName(), url: file.getUrl() };
}

function core4_sendWeeklySummary(chatId, weekKey) {
  const target = chatId || PropertiesService.getScriptProperties().getProperty('CHAT_ID');
  if (!target) return { ok: false, error: 'CHAT_ID not set' };
  const message = core4_buildWeeklyReportText(weekKey);

  if (typeof hub_sendMessage_ === 'function') {
    hub_sendMessage_(target, message);
    return { ok: true };
  }

  const token = getPrimaryBotToken_();
  if (!token) return { ok: false, error: 'BOT_TOKEN not set' };
  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: target, text: message, parse_mode: 'Markdown' }),
    muteHttpExceptions: true
  });
  return { ok: true };
}

function core4_appendSheetRow_(entry) {
  try {
    const sheet = core4_getSheet_();
    sheet.appendRow([
      entry.date,
      entry.ts,
      entry.domain,
      entry.task,
      entry.points,
      entry.source,
      entry.user.id,
      entry.user.username || '',
      entry.user.first_name || '',
      JSON.stringify(entry)
    ]);
  } catch (e) {
    Logger.log('core4 sheet append failed: ' + e.toString());
  }
}

function core4_getSheet_() {
  const sp = PropertiesService.getScriptProperties();
  const sheetId = sp.getProperty(CORE4_CONFIG.SHEET_PROP);
  if (sheetId) {
    try {
      const ss = SpreadsheetApp.openById(sheetId);
      return core4_getOrCreateSheet_(ss);
    } catch (e) {
      Logger.log('CORE4_SHEET_ID invalid: ' + e.toString());
    }
  }

  const ss = SpreadsheetApp.create('Alpha_Core4_Logsheet');
  sp.setProperty(CORE4_CONFIG.SHEET_PROP, ss.getId());
  return core4_getOrCreateSheet_(ss);
}

function core4_getOrCreateSheet_(ss) {
  const name = CORE4_CONFIG.SHEET_NAME;
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Date',
      'Timestamp',
      'Domain',
      'Task',
      'Points',
      'Source',
      'User_ID',
      'Username',
      'First_Name',
      'Payload_JSON'
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  }
  return sheet;
}

function core4_weeklySummaryAutomation() {
  const res = core4_sendWeeklySummary();
  core4_exportWeekSummaryToDrive();
  return res;
}

function core4_debugInfo() {
  const folder = core4_getFolder_();
  Logger.log('CORE4 folder: ' + folder.getUrl());
  const key = core4_getWeekKey_(new Date());
  Logger.log('Current week: ' + key);
}

function core4_getFolder_() {
  const root = DriveApp.getRootFolder();
  const it = root.getFoldersByName(CORE4_CONFIG.FOLDER_NAME);
  return it.hasNext() ? it.next() : root.createFolder(CORE4_CONFIG.FOLDER_NAME);
}

function core4_getOrCreateFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function core4_getEventRootFolder_() {
  const folder = core4_getFolder_();
  const meta = core4_getOrCreateFolder_(folder, CORE4_CONFIG.EVENT_ROOT);
  return core4_getOrCreateFolder_(meta, CORE4_CONFIG.EVENT_DIR);
}

function core4_writeEvent_(entry) {
  const dateKey = String(entry.date || '').trim();
  if (!dateKey) return;
  const eventsRoot = core4_getEventRootFolder_();
  const dayFolder = core4_getOrCreateFolder_(eventsRoot, dateKey);

  const safeTs = String(entry.ts || '').replace(/[^0-9a-zA-Z]/g, '');
  const safeSource = String(entry.source || 'webapp').replace(/[^0-9a-zA-Z._-]/g, '_');
  const safeDomain = String(entry.domain || '').replace(/[^0-9a-zA-Z._-]/g, '_');
  const safeTask = String(entry.task || '').replace(/[^0-9a-zA-Z._-]/g, '_');
  const name = `${dateKey}__${safeDomain}__${safeTask}__${safeTs}__${safeSource}.json`;
  dayFolder.createFile(name, JSON.stringify(entry, null, 2), MimeType.PLAIN_TEXT);
}

function core4_listEventsForDate_(dateKey) {
  const day = String(dateKey || '').trim();
  if (!day) return [];
  const eventsRoot = core4_getEventRootFolder_();
  const it = eventsRoot.getFoldersByName(day);
  if (!it.hasNext()) return [];
  const folder = it.next();
  const files = folder.getFiles();
  const out = [];
  while (files.hasNext()) {
    const f = files.next();
    try {
      const text = f.getBlob().getDataAsString();
      const data = JSON.parse(text);
      if (data && data.date === day) out.push(data);
    } catch (_) {
      // ignore
    }
  }
  return out;
}

function core4_dedupEntries_(entries) {
  const keep = {};
  (entries || []).forEach(e => {
    if (!e) return;
    const key = String(e.key || `${e.date}:${e.domain}:${e.task}` || '').trim();
    if (!key) return;
    const prev = keep[key];
    if (!prev) {
      keep[key] = e;
      return;
    }
    const prevTs = String(prev.last_ts || prev.ts || '');
    const nextTs = String(e.last_ts || e.ts || '');
    if (nextTs > prevTs) keep[key] = e;
    const merged = keep[key];
    const sources = [].concat(prev.sources || []).concat(e.sources || []).concat([prev.source, e.source]);
    merged.sources = Array.from(new Set(sources.filter(Boolean)));
    merged.done = Boolean(prev.done || e.done);
    merged.points = Math.max(Number(prev.points || 0), Number(e.points || 0));
  });
  return Object.keys(keep).map(k => keep[k]);
}

function core4_saveDay_(dateKey, data) {
  const folder = core4_getFolder_();
  const name = CORE4_CONFIG.DAY_PREFIX + dateKey + '.json';
  const files = folder.getFilesByName(name);
  const content = JSON.stringify(data, null, 2);
  if (files.hasNext()) {
    const file = files.next();
    file.setContent(content);
    return file;
  }
  return folder.createFile(name, content, MimeType.PLAIN_TEXT);
}

function core4_buildDay_(dateKey) {
  const day = String(dateKey || '').trim();
  if (!day) return { date: '', entries: [], totals: {} };
  const entries = core4_dedupEntries_(core4_listEventsForDate_(day));
  const data = {
    date: day,
    updated_at: new Date().toISOString(),
    entries: entries,
    totals: core4_computeTotals_(entries)
  };
  core4_saveDay_(day, data);
  return data;
}

function core4_weekDatesFor_(dateObj) {
  const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dayNum - 1)); // monday
  const out = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() + i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function core4_buildWeekForDate_(dateObj) {
  const dt = dateObj || new Date();
  const weekKey = core4_getWeekKey_(dt);
  const days = core4_weekDatesFor_(dt);
  let all = [];
  days.forEach(day => {
    all = all.concat(core4_listEventsForDate_(day));
  });
  const entries = core4_dedupEntries_(all);
  const data = { week: weekKey, updated_at: new Date().toISOString(), entries: entries, totals: core4_computeTotals_(entries) };
  core4_saveWeek_(weekKey, data);
  return data;
}

function core4_getSummaryFolder_() {
  const root = DriveApp.getRootFolder();
  const it = root.getFoldersByName(CORE4_CONFIG.SUMMARY_FOLDER_NAME);
  return it.hasNext() ? it.next() : root.createFolder(CORE4_CONFIG.SUMMARY_FOLDER_NAME);
}

function core4_getWeekKey_(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function core4_formatDate_(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function core4_loadWeek_(weekKey) {
  const folder = core4_getFolder_();
  const name = CORE4_CONFIG.FILE_PREFIX + weekKey + '.json';
  const files = folder.getFilesByName(name);
  if (!files.hasNext()) {
    return { week: weekKey, updated_at: '', entries: [], totals: {} };
  }
  const file = files.next();
  try {
    const text = file.getBlob().getDataAsString();
    const data = JSON.parse(text);
    data.entries = Array.isArray(data.entries) ? data.entries : [];
    return data;
  } catch (_) {
    return { week: weekKey, updated_at: '', entries: [], totals: {} };
  }
}

function core4_saveWeek_(weekKey, data) {
  const folder = core4_getFolder_();
  const name = CORE4_CONFIG.FILE_PREFIX + weekKey + '.json';
  const files = folder.getFilesByName(name);
  const content = JSON.stringify(data, null, 2);
  if (files.hasNext()) {
    const file = files.next();
    file.setContent(content);
    return file;
  }
  return folder.createFile(name, content, MimeType.PLAIN_TEXT);
}

function core4_computeTotals_(entries) {
  const totals = {
    week_total: 0,
    by_domain: {},
    by_day: {},
    by_habit: {}
  };
  entries.forEach(entry => {
    totals.week_total += entry.points || 0;
    if (entry.domain) {
      totals.by_domain[entry.domain] = (totals.by_domain[entry.domain] || 0) + (entry.points || 0);
    }
    if (entry.date) {
      totals.by_day[entry.date] = (totals.by_day[entry.date] || 0) + (entry.points || 0);
    }
    if (entry.domain && entry.task) {
      const key = `${entry.domain}:${entry.task}`;
      totals.by_habit[key] = (totals.by_habit[key] || 0) + (entry.points || 0);
    }
  });
  return totals;
}

function core4_totalForDate_(entries, dateKey) {
  let sum = 0;
  entries.forEach(entry => {
    if (entry.date === dateKey) sum += entry.points || 0;
  });
  return sum;
}

function core4_getHabitLabel_(domain, task) {
  if (!domain || !task) return String(task || '');
  const d = String(domain || '').toLowerCase();
  const t = String(task || '').toLowerCase();
  if (CORE4_HABITS[d] && CORE4_HABITS[d][t]) return CORE4_HABITS[d][t];
  return t;
}

function core4_capitalize_(text) {
  const str = String(text || '');
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// =====================================================
// Telegram Bot Handler
// =====================================================
function core4_handleTelegramMessage_(message) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim().toLowerCase();
  if (!text) return false;

  // Commands: /fit /fue /med /mem /par /pos /dis /dec
  const shortcuts = {
    '/fit': ['body', 'fitness'],
    '/fue': ['body', 'fuel'],
    '/med': ['being', 'meditation'],
    '/mem': ['being', 'memoirs'],
    '/par': ['balance', 'person1'],
    '/pos': ['balance', 'person2'],
    '/dis': ['business', 'discover'],
    '/dec': ['business', 'declare']
  };

  if (shortcuts[text]) {
    const [domain, task] = shortcuts[text];
    try {
      const result = core4_log(domain, task, null, 'telegram', {
        id: String(message.from.id),
        username: message.from.username || '',
        first_name: message.from.first_name || 'User'
      });

      if (result.ok) {
        const label = core4_getHabitLabel_(domain, task);
        core4_sendMessage_(chatId, `✅ ${label} logged\n\nToday: ${result.total_today} points`);
      } else {
        core4_sendMessage_(chatId, `❌ Log failed: ${result.error}`);
      }
    } catch (e) {
      core4_sendMessage_(chatId, `❌ Error: ${e}`);
    }
    return true;
  }

  if (text === '/core4' || text === '/core') {
    const webUrl = PropertiesService.getScriptProperties().getProperty('CORE4_WEBAPP_URL')
      || ScriptApp.getService().getUrl() + '?page=core4';

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🏋️ Fitness', callback_data: 'core:log:body:fitness' },
          { text: '🍽️ Fuel', callback_data: 'core:log:body:fuel' }
        ],
        [
          { text: '🧘 Meditation', callback_data: 'core:log:being:meditation' },
          { text: '📝 Memoirs', callback_data: 'core:log:being:memoirs' }
        ],
        [
          { text: '👥 Person 1', callback_data: 'core:log:balance:person1' },
          { text: '💑 Person 2', callback_data: 'core:log:balance:person2' }
        ],
        [
          { text: '🔍 Discover', callback_data: 'core:log:business:discover' },
          { text: '📣 Declare', callback_data: 'core:log:business:declare' }
        ],
        [
          { text: '📊 Today\'s Points', callback_data: 'core:today' }
        ],
        [
          { text: '🌐 Open WebApp', web_app: { url: webUrl } }
        ]
      ]
    };

    core4_sendMessage_(chatId,
      '🎯 *CORE4 Centre*\n\n' +
      'The 4 Domains - 28-or-Die:\n\n' +
      '💪 *BODY:* Fitness • Fuel\n' +
      '🧘 *BEING:* Meditation • Memoirs\n' +
      '⚖️ *BALANCE:* Person 1 • Person 2\n' +
      '💼 *BUSINESS:* Discover • Declare\n\n' +
      '_Wähle ein Habit zum Loggen:_',
      keyboard
    );
    return true;
  }

  if (text === '/core4help') {
    const help =
      '*CORE4 Pipeline – Setup Checklist*\\n\\n' +
      '*1) Core4 Bot (Telegram → Drive)*\\n' +
      '• Script Property: `CORE4_BOT_TOKEN` (oder `BOT_TOKEN`)\\n' +
      '• Drive Folder: `Alpha_Core4` (wird notfalls angelegt)\\n\\n' +
      '*2) Core4 Centre (WebApp UI)*\\n' +
      '• WebApp deployed (Centre: `?page=core4`)\\n\\n' +
      '*3) Laptop scoring (Drive → local)*\\n' +
      '• rclone mount: Drive `Alpha_Core4` → `~/AlphaOS-Vault/Alpha_Core4`\\n' +
      '• local: `~/AlphaOS-Vault/Core4` exists\\n' +
      '• `core4 -d` / `core4 -w` rebuild + score\\n\\n' +
      '*4) Taskwarrior + TickTick (optional)*\\n' +
      '• Taskwarrior hooks: `~/.task/hooks/on-add.core4`, `on-modify.core4`, `on-modify.99-alphaos.py`\\n' +
      '• TickTick token: `~/.ticktick_token` (so `ticktick_sync.py` can sync)\\n\\n' +
      '*5) Retention + Chronik (recommended)*\\n' +
      '• `core4 export-daily --days=56` (rolling CSV)\\n' +
      '• `core4 prune-events --keep-weeks=8` (limits local events)\\n' +
      '• `core4 finalize-month YYYY-MM` (monthly CSV archive)';
    core4_sendMessage_(chatId, help);
    return true;
  }

  if (text === '/today') {
    try {
      const result = core4_getToday();
      core4_sendMessage_(chatId, `📊 *Today*\n\nDate: ${result.date}\nPoints: ${result.total}\n\n(Goal: 4 points = 28/week)`);
    } catch (e) {
      core4_sendMessage_(chatId, `❌ Error: ${e}`);
    }
    return true;
  }

  return false;
}

function core4_sendMessage_(chatId, text, keyboard) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('CORE4_BOT_TOKEN') || props.getProperty('BOT_TOKEN');
  if (!token) return;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };

  if (keyboard) {
    payload.reply_markup = keyboard;
  }

  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

// =====================================================
// CORE4 CENTRE (WebApp helpers for backfill)
// =====================================================
function core4_logForDate(domain, task, dateKey) {
  const day = String(dateKey || '').trim();
  if (!day) return { ok: false, error: 'date missing' };
  // Midday local time avoids timezone edge cases around midnight.
  const ts = new Date(`${day}T12:00:00`);
  if (String(ts) === 'Invalid Date') return { ok: false, error: 'invalid date' };
  return core4_log(domain, task, ts.toISOString(), 'webapp', null);
}

function core4_getDayState(dateKey) {
  const day = String(dateKey || '').trim();
  if (!day) return { ok: false, error: 'date missing' };
  const dt = new Date(`${day}T12:00:00`);
  if (String(dt) === 'Invalid Date') return { ok: false, error: 'invalid date' };

  const weekKey = core4_getWeekKey_(dt);
  const data = core4_loadWeek_(weekKey);
  const entries = (data.entries || []).filter(e => e && e.date === day);
  const total = core4_totalForDate_(data.entries || [], day);
  return {
    ok: true,
    date: day,
    week: weekKey,
    total: total,
    entries: entries.map(e => ({
      ts: e.ts,
      domain: e.domain,
      task: e.task,
      points: e.points,
      source: e.source
    }))
  };
}

function core4_getWeekSummaryForDate(dateKey) {
  const day = String(dateKey || '').trim();
  if (!day) return { ok: false, error: 'date missing' };
  const dt = new Date(`${day}T12:00:00`);
  if (String(dt) === 'Invalid Date') return { ok: false, error: 'invalid date' };
  const weekKey = core4_getWeekKey_(dt);
  const summary = core4_getWeekSummary(weekKey);
  return { ok: true, week: summary.week, totals: summary.totals };
}

function core4_exportWeekSummaryForDate(dateKey) {
  const day = String(dateKey || '').trim();
  if (!day) return { ok: false, error: 'date missing' };
  const dt = new Date(`${day}T12:00:00`);
  if (String(dt) === 'Invalid Date') return { ok: false, error: 'invalid date' };
  const weekKey = core4_getWeekKey_(dt);
  const file = core4_exportWeekSummaryToDrive(weekKey);
  return { ok: true, file };
}
