// AlphaOS Fire Centre – Daily & Weekly Fire Maps
// WebApp entry + TickTick integration for strict to-do lists

const FIRE_ROOT_HTML = 'Game_Fire_Index';
const FIRE_CENTRE_LABEL = 'Fire Maps';
const FIRE_CENTRE_KEY = 'FIR';

// Script properties keys (project-level, not per-user)
const FIRE_TICKTICK_TOKEN_PROP = 'TICKTICK_TOKEN';
const FIRE_TICKTICK_PROJECT_PROP = 'TICKTICK_PROJECT_ID';
const FIRE_FOLDER_PROP = 'FIRE_DRIVE_FOLDER_ID';
const FIRE_SHEET_PROP = 'FIRE_LOG_SHEET_ID';
const FIRE_GCAL_EMBED_PROP = 'FIRE_GCAL_EMBED_URL';
const FIRE_GCAL_ID_PROP = 'FIRE_GCAL_CALENDAR_ID';
const FIRE_GCAL_NAME_PROP = 'FIRE_GCAL_CALENDAR_NAME';
const FIRE_GCAL_ICS_PROP = 'FIRE_GCAL_ICS_URL';
const FIRE_TICKTICK_ICS_PROP = 'FIRE_TICKTICK_ICS_URL';

// TickTick
const FIRE_TICKTICK_BASE = 'https://api.ticktick.com/open/v1';

// Basic helpers (project-level storage)
function fireGetProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function fireSetProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

function renderFirePage_() {
  const t = HtmlService.createTemplateFromFile(FIRE_ROOT_HTML);
  t.gcalUrl = fireGetProp_(FIRE_GCAL_EMBED_PROP) || '';
  return t.evaluate()
    .setTitle('αOS – ' + FIRE_CENTRE_LABEL)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ----------------------
// Drive + Sheet (logging)
// ----------------------
function getFireFolder() {
  const existingId = fireGetProp_(FIRE_FOLDER_PROP);
  if (existingId) {
    try {
      const folder = DriveApp.getFolderById(existingId);
      folder.getName();
      return folder;
    } catch (e) {
      // fall through → recreate
    }
  }

  let parent = DriveApp.getRootFolder();
  const gameIt = parent.getFoldersByName('Alpha_Game');
  parent = gameIt.hasNext() ? gameIt.next() : DriveApp.createFolder('Alpha_Game');

  const fireIt = parent.getFoldersByName('Fire');
  const folder = fireIt.hasNext() ? fireIt.next() : parent.createFolder('Fire');
  fireSetProp_(FIRE_FOLDER_PROP, folder.getId());
  return folder;
}

function getFireLogSheet() {
  const existingId = fireGetProp_(FIRE_SHEET_PROP);
  if (existingId) {
    try {
      const ss = SpreadsheetApp.openById(existingId);
      const sheet = ss.getSheetByName('FireLogs') || ss.insertSheet('FireLogs');
      ensureSheetHeader(sheet);
      return sheet;
    } catch (e) {
      // fall through → recreate
    }
  }

  const ss = SpreadsheetApp.create('Alpha_Fire_Logsheet');
  fireSetProp_(FIRE_SHEET_PROP, ss.getId());
  const sheet = ss.getSheets()[0];
  sheet.setName('FireLogs');
  ensureSheetHeader(sheet);
  return sheet;
}

function ensureSheetHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['SessionID', 'Timestamp', 'Week', 'Domain', 'WeeklyTasks', 'DailyIgnition', 'File', 'URL']);
  }
}

// Week label (e.g., "KW35 2024")
function getCurrentWeek() {
  const tz = Session.getScriptTimeZone();
  const week = Utilities.formatDate(new Date(), tz, 'ww');
  const year = Utilities.formatDate(new Date(), tz, 'yyyy');
  return 'KW' + week + ' ' + year;
}

function formatDayLabel(date, tz) {
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return `${days[date.getDay()]} ${Utilities.formatDate(date, tz, 'dd.MM.yyyy')}`;
}

function fireGenerateSessionId_() {
  return gameGenerateSessionId_(FIRE_CENTRE_KEY);
}

function fireParseDateInput_(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function fireGetWeekLabel_(date) {
  const tz = Session.getScriptTimeZone();
  const base = date || new Date();
  const week = Utilities.formatDate(base, tz, 'ww');
  const year = Utilities.formatDate(base, tz, 'yyyy');
  return 'KW' + week + ' ' + year;
}

function fireGetWeekInfo(dateIso) {
  const tz = Session.getScriptTimeZone();
  const date = fireParseDateInput_(dateIso) || new Date();
  return {
    week: fireGetWeekLabel_(date),
    date: Utilities.formatDate(date, tz, 'yyyy-MM-dd'),
    label: formatDayLabel(date, tz)
  };
}

// TickTick token setup
function saveTickTickToken(token, projectId) {
  if (!token) throw new Error('TickTick Token fehlt');
  fireSetProp_(FIRE_TICKTICK_TOKEN_PROP, token.trim());
  fireSetProp_(FIRE_TICKTICK_PROJECT_PROP, (projectId || 'inbox').trim());
  return 'TickTick Token gespeichert (projektweit)';
}

// ----------------------
// TickTick core helpers
// ----------------------
function getTickTickConfig() {
  const token = fireGetProp_(FIRE_TICKTICK_TOKEN_PROP);
  if (!token) throw new Error('TickTick Token fehlt. Führe saveTickTickToken(token, projectId) aus.');
  const projectId = fireGetProp_(FIRE_TICKTICK_PROJECT_PROP) || 'inbox';
  return { token, projectId };
}

function tickTickHeaders(token) {
  return {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json'
  };
}

function listProjectTasks() {
  const { token, projectId } = getTickTickConfig();
  const url = `${FIRE_TICKTICK_BASE}/project/${projectId}/tasks`;
  const resp = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: tickTickHeaders(token),
    muteHttpExceptions: true
  });

  const code = resp.getResponseCode();
  if (code !== 200) {
    throw new Error('TickTick ' + code + ': ' + resp.getContentText());
  }

  const tasks = JSON.parse(resp.getContentText()) || [];
  return tasks.filter(task => !task.completedTime && !task.isCompleted);
}

function completeTickTickTask(taskId) {
  if (!taskId) throw new Error('TaskId fehlt');
  const { token } = getTickTickConfig();
  const url = `${FIRE_TICKTICK_BASE}/task/${taskId}/complete`;

  const resp = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: tickTickHeaders(token),
    muteHttpExceptions: true
  });

  const code = resp.getResponseCode();
  if (code !== 200 && code !== 204) {
    throw new Error('TickTick ' + code + ': ' + resp.getContentText());
  }

  return { ok: true };
}

// ----------------------
// Push weekly/daily domain entries to Drive + TickTick
// ----------------------
function saveFireEntry(data) {
  if (!data || !data.domain) throw new Error('Domain fehlt');

  const entryDate = fireParseDateInput_(data.entryDate) || new Date();
  const week = (data.week || fireGetWeekLabel_(entryDate) || getCurrentWeek()).trim();
  const domain = data.domain.trim();
  const sessionId = fireGenerateSessionId_();
  const dateLabel = Utilities.formatDate(entryDate, Session.getScriptTimeZone(), 'dd.MM.yyyy');

  const header = [
    `# FIRE MAP – ${domain}`,
    `**Week:** ${week}`,
    `**Session:** ${sessionId}`,
    `**Date:** ${dateLabel}`,
    '',
    '---',
    ''
  ].join('\n');

  const body = [
    `**Weekly Tasks (4 Strikes)**\n${(data.weekly || '_leer_')}`,
    `**Daily Ignition**\n${(data.daily || '_leer_')}`
  ].join('\n\n');

  const fullMd = header + body;
  const filename = `${sessionId}_${domain}.md`;

  const rootFolder = getFireFolder();
  const weekFolder = gameGetOrCreateSubfolder_(rootFolder, week);
  const file = weekFolder.createFile(filename, fullMd, MimeType.PLAIN_TEXT);

  getFireLogSheet().appendRow([
    sessionId,
    entryDate,
    week,
    domain,
    data.weekly || '',
    data.daily || '',
    file.getName(),
    file.getUrl()
  ]);

  const tickResult = pushDomainToTickTick(domain, data.weekly || '', data.daily || '', week);

  return {
    ok: true,
    sessionId,
    domain,
    week,
    file: { url: file.getUrl(), name: file.getName() },
    ticktick: tickResult
  };
}

function getFireConfig() {
  return {
    gcalEmbedUrl: fireGetProp_(FIRE_GCAL_EMBED_PROP) || '',
    gcalCalendarId: fireGetProp_(FIRE_GCAL_ID_PROP) || '',
    gcalCalendarName: fireGetProp_(FIRE_GCAL_NAME_PROP) || '',
    gcalIcsUrl: fireGetProp_(FIRE_GCAL_ICS_PROP) || '',
    ticktickIcsUrl: fireGetProp_(FIRE_TICKTICK_ICS_PROP) || ''
  };
}

function pushDomainToTickTick(domain, weeklyTasks, dailyIgnition, week) {
  const token = fireGetProp_(FIRE_TICKTICK_TOKEN_PROP);
  if (!token) {
    return { success: false, message: 'TickTick Token fehlt – speichern zuerst' };
  }

  const projectId = fireGetProp_(FIRE_TICKTICK_PROJECT_PROP) || 'inbox';
  const url = `${FIRE_TICKTICK_BASE}/task`;

  const headers = tickTickHeaders(token);

  const createdIds = { weekly: [], daily: null };
  const errors = [];

  const weeklyLines = (weeklyTasks || '').split('\n').map(s => s.trim()).filter(Boolean);

  weeklyLines.forEach(line => {
    const payload = {
      title: `[FIRE] [${domain}] ${line} – ${week}`,
      projectId,
      tags: ['AlphaOS', 'FireMap', domain],
      priority: 5
    };

    try {
      const resp = UrlFetchApp.fetch(url, {
        method: 'post',
        headers,
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      const code = resp.getResponseCode();
      if (code === 200 || code === 201) {
        const data = JSON.parse(resp.getContentText());
        if (data && data.id) createdIds.weekly.push(data.id);
      } else {
        errors.push(`Weekly "${line}": ${code} ${resp.getContentText()}`);
      }
    } catch (e) {
      errors.push(`Weekly "${line}": ${e}`);
    }
  });

  const ignition = (dailyIgnition || '').trim();
  if (ignition) {
    const payload = {
      title: `[IGNITION] [${domain}] ${ignition} – täglich`,
      projectId,
      tags: ['AlphaOS', 'Ignition', domain],
      priority: 5,
      isAllDay: false,
      repeatFlag: 'RRULE:FREQ=DAILY'
    };

    try {
      const resp = UrlFetchApp.fetch(url, {
        method: 'post',
        headers,
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      const code = resp.getResponseCode();
      if (code === 200 || code === 201) {
        const data = JSON.parse(resp.getContentText());
        if (data && data.id) createdIds.daily = data.id;
      } else {
        errors.push(`Daily Ignition: ${code} ${resp.getContentText()}`);
      }
    } catch (e) {
      errors.push(`Daily Ignition: ${e}`);
    }
  }

  const success = errors.length === 0;
  const message = success
    ? `TickTick: ${createdIds.weekly.length} Weekly + ${createdIds.daily ? '1 Habit' : '0 Habit'} erstellt`
    : `Fehler: ${errors.join(' | ')}`;

  return { success, message, ids: createdIds };
}

// ----------------------
// Task filtering (Daily / Weekly)
// ----------------------
function fireGetCalendar_() {
  const calId = fireGetProp_(FIRE_GCAL_ID_PROP) || '';
  if (calId) return CalendarApp.getCalendarById(calId);
  const calName = fireGetProp_(FIRE_GCAL_NAME_PROP) || '';
  if (calName) {
    const cals = CalendarApp.getCalendarsByName(calName);
    if (cals && cals.length) return cals[0];
  }
  return null;
}

function fireGetIcsUrl_() {
  const gcalIcs = fireGetProp_(FIRE_GCAL_ICS_PROP) || '';
  if (gcalIcs) return gcalIcs;
  return fireGetProp_(FIRE_TICKTICK_ICS_PROP) || '';
}

function fireParseIcsDate_(line) {
  const parts = String(line || '').split(':');
  if (parts.length < 2) return null;
  const value = parts.slice(1).join(':').trim();
  if (!value) return null;
  const match = value.match(/^(\d{8})(T(\d{6})Z?)?$/);
  if (!match) return null;
  const datePart = match[1];
  const timePart = match[3] || '';
  const year = Number(datePart.slice(0, 4));
  const month = Number(datePart.slice(4, 6)) - 1;
  const day = Number(datePart.slice(6, 8));
  if (!timePart) return { date: new Date(year, month, day), allDay: true };
  const hour = Number(timePart.slice(0, 2));
  const minute = Number(timePart.slice(2, 4));
  const second = Number(timePart.slice(4, 6));
  const isUtc = value.endsWith('Z');
  const date = isUtc
    ? new Date(Date.UTC(year, month, day, hour, minute, second))
    : new Date(year, month, day, hour, minute, second);
  return { date, allDay: false };
}

function fireFetchIcsEvents_(start, end) {
  const url = fireGetIcsUrl_();
  if (!url) return [];
  let text = '';
  try {
    text = UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText() || '';
  } catch (e) {
    Logger.log('fireFetchIcsEvents_: ' + e);
    return [];
  }

  const rawLines = text.replace(/\r/g, '').split('\n');
  const lines = [];
  rawLines.forEach((line) => {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (lines.length) lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line.trim());
    }
  });

  const events = [];
  let current = null;

  lines.forEach((line) => {
    if (line === 'BEGIN:VEVENT') { current = {}; return; }
    if (line === 'END:VEVENT') {
      if (current && current.start) {
        if (!current.end) current.end = new Date(current.start.getTime());
        if (current.allDay === undefined) current.allDay = false;
        if (current.start >= start && current.start < end) events.push(current);
      }
      current = null;
      return;
    }
    if (!current) return;
    if (line.startsWith('SUMMARY')) {
      const parts = line.split(':');
      current.title = parts.slice(1).join(':').trim();
    }
    if (line.startsWith('DTSTART')) {
      const parsed = fireParseIcsDate_(line);
      if (parsed) {
        current.start = parsed.date;
        current.allDay = parsed.allDay;
      }
    }
    if (line.startsWith('DTEND')) {
      const parsed = fireParseIcsDate_(line);
      if (parsed) current.end = parsed.date;
    }
  });

  return events;
}

function fireListCalendarTasks_(start, end) {
  const cal = fireGetCalendar_();
  const events = cal
    ? cal.getEvents(start, end).map((event) => ({
        id: event.getId(),
        title: event.getTitle(),
        start: event.getStartTime(),
        end: event.getEndTime(),
        allDay: event.isAllDayEvent()
      }))
    : fireFetchIcsEvents_(start, end);

  return events.map((event, idx) => ({
    id: event.id || `cal_${idx}`,
    title: event.title || '(ohne Titel)',
    dueDateTime: event.start ? event.start.toISOString() : '',
    tags: []
  }));
}

function fireListTasksForRange_(start, end) {
  try {
    return { source: 'ticktick', tasks: listProjectTasks() };
  } catch (e) {
    return { source: 'calendar', tasks: fireListCalendarTasks_(start, end) };
  }
}

function getTodayRange() {
  const tz = Session.getScriptTimeZone();
  const now = new Date();
  const start = new Date(Utilities.formatDate(now, tz, 'yyyy-MM-dd') + 'T00:00:00');
  const end = new Date(start); end.setDate(start.getDate() + 1);
  return { start, end, tz };
}

function getWeekRange() {
  const tz = Session.getScriptTimeZone();
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(today); start.setDate(diff); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(start.getDate() + 7);
  return { start, end, tz };
}

function parseTickTickDate(task) {
  if (!task) return null;
  const raw = task.dueDateTime || task.dueDate || task.due;
  if (!raw) return null;
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function taskInRange(task, start, end) {
  const due = parseTickTickDate(task);
  if (!due) return false;
  return due >= start && due < end;
}

function taskInRangeOrOverdue(task, start, end) {
  const due = parseTickTickDate(task);
  if (!due) return false;
  return (due >= start && due < end) || due < start;
}

function normalizeTask(task) {
  const due = parseTickTickDate(task);
  return {
    id: task.id,
    title: task.title || '(ohne Titel)',
    due: due ? due.toISOString() : (task.dueDateTime || task.dueDate || ''),
    priority: task.priority || 0,
    tags: task.tags || [],
    projectId: task.projectId || ''
  };
}

function detectDomain(task) {
  const source = (task.title || '') + ' ' + (task.tags || []).join(' ');
  if (/\bbody\b/i.test(source)) return 'body';
  if (/\bbeing\b/i.test(source)) return 'being';
  if (/\bbalance\b/i.test(source)) return 'balance';
  if (/\bbusiness\b/i.test(source)) return 'business';
  return 'other';
}

function addDomainAndOverdue(tasks, referenceDate) {
  const ref = referenceDate || new Date();
  return tasks.map(t => {
    const mapped = normalizeTask(t);
    mapped.domain = detectDomain(t);
    const due = parseTickTickDate(mapped);
    mapped.overdue = due ? due < ref : false;
    return mapped;
  });
}

function sortTasks(tasks) {
  return tasks.slice().sort((a, b) => {
    const da = parseTickTickDate(a);
    const db = parseTickTickDate(b);

    if (da && db) {
      if (da.getTime() !== db.getTime()) return da - db;
    } else if (da || db) {
      return da ? -1 : 1;
    }

    const pa = typeof a.priority === 'number' ? a.priority : 0;
    const pb = typeof b.priority === 'number' ? b.priority : 0;
    return pb - pa;
  });
}

// Public endpoints for the client
function getDailyTasks() {
  try {
    const { start, end, tz } = getTodayRange();
    const { source, tasks } = fireListTasksForRange_(start, end);
    const annotated = addDomainAndOverdue(tasks, new Date());
    const filtered = sortTasks(annotated.filter(t => taskInRangeOrOverdue(t, start, end)));
    return {
      source,
      date: Utilities.formatDate(start, Session.getScriptTimeZone(), 'dd.MM.yyyy'),
      label: formatDayLabel(start, tz),
      tasks: filtered
    };
  } catch (e) {
    return { error: e.message || e }; 
  }
}

function getWeeklyTasks() {
  try {
    const { start, end, tz } = getWeekRange();
    const { source, tasks } = fireListTasksForRange_(start, end);
    const annotated = addDomainAndOverdue(tasks, new Date());
    const filtered = sortTasks(annotated.filter(t => taskInRangeOrOverdue(t, start, end)));

    const lastDay = new Date(end); lastDay.setMilliseconds(lastDay.getMilliseconds() - 1);
    const rangeLabel = `${formatDayLabel(start, tz)} – ${formatDayLabel(lastDay, tz)} (${getCurrentWeek()})`;
    return {
      week: getCurrentWeek(),
      rangeLabel,
      source,
      tasks: filtered
    };
  } catch (e) {
    return { error: e.message || e };
  }
}

function getTokenStatus() {
  return {
    hasToken: Boolean(fireGetProp_(FIRE_TICKTICK_TOKEN_PROP)),
    projectId: fireGetProp_(FIRE_TICKTICK_PROJECT_PROP) || 'inbox'
  };
}

// ----------------------
// System init helper (Drive + Sheet links)
// ----------------------
function initFireSystem() {
  const folder = getFireFolder();
  const sheet = getFireLogSheet();
  return {
    folderUrl: folder.getUrl(),
    sheetUrl: sheet.getParent().getUrl(),
    message: 'Fire Centre forged – Ready for war.'
  };
}


