// ================================================================
// FRUITS MODULE (GAS) - Shared storage for Bot + Fruits Centre
// ================================================================

const FRUITS_CONFIG = {
  ROOT_HTML: 'Fruits',
  QUESTIONS_FILE: 'fruits_questions',
  MAP_TITLE: 'Fruit Fact Maps',
  MAP_SUBTITLE: 'Facing the Fruits of Reality - Raw Facts',
  ROOT_FOLDER_NAME: 'Alpha_Game',
  CENTRE_FOLDER_NAME: 'Fruits',
  PROP_SHEET_ID: 'FRUITS_SHEET_ID',
  PROP_DRIVE_FOLDER_ID: 'FRUITS_DRIVE_FOLDER_ID',
  PROP_DEFAULT_CHAT_ID: 'FRUITS_DEFAULT_CHAT_ID',
  PROP_SKIPPED_QUESTION: 'FRUITS_SKIPPED_QUESTION',
  PROP_SKIPPED_SECTION: 'FRUITS_SKIPPED_SECTION',
  PROP_WEBAPP_URL: 'FRUITS_WEBAPP_URL',
  PROP_WEBHOOK_URL: 'FRUITS_WEBHOOK_URL',
  PROP_BOT_TOKEN: 'FRUITS_BOT_TOKEN'
};

const FRUITS_EMOJIS = ['🍎','🍌','🍇','🍉','🍓','🍒','🍍','🥝','🍊','🍏'];
let FRUITS_Q_INDEX = null;

function fruits_setupAll(sheetId, folderId, fruitsWebAppUrl, defaultChatId) {
  const props = PropertiesService.getScriptProperties();
  if (sheetId) props.setProperty(FRUITS_CONFIG.PROP_SHEET_ID, sheetId);
  if (folderId) props.setProperty(FRUITS_CONFIG.PROP_DRIVE_FOLDER_ID, folderId);
  if (fruitsWebAppUrl) props.setProperty(FRUITS_CONFIG.PROP_WEBAPP_URL, fruitsWebAppUrl);
  if (defaultChatId) props.setProperty(FRUITS_CONFIG.PROP_DEFAULT_CHAT_ID, String(defaultChatId));
  return { ok: true };
}

function fruits_setBotToken(token) {
  if (!token) throw new Error('fruits_setBotToken: token missing');
  PropertiesService.getScriptProperties().setProperty(FRUITS_CONFIG.PROP_BOT_TOKEN, token);
  return { ok: true };
}

function fruits_setWebhook(url) {
  const props = PropertiesService.getScriptProperties();
  const token = getPrimaryBotToken_();
  if (!token) throw new Error('fruits_setWebhook: primary bot token not set');

  const webhookUrl = tg_getWebhookUrl_(FRUITS_CONFIG.PROP_WEBHOOK_URL, url);
  if (!webhookUrl) throw new Error('fruits_setWebhook: url missing (pass deploy URL or set FRUITS_WEBHOOK_URL)');
  if (url) props.setProperty(FRUITS_CONFIG.PROP_WEBHOOK_URL, webhookUrl);
  return tg_setWebhook_(token, webhookUrl);
}

function fruits_ensureWebhook_() {
  const props = PropertiesService.getScriptProperties();
  const token = getPrimaryBotToken_();
  if (!token) return { ok: false, error: 'primary bot token missing' };

  const info = tg_getWebhookInfo_(token);
  const currentUrl = info && info.ok && info.result ? String(info.result.url || '') : '';
  if (currentUrl) return { ok: true, url: currentUrl, mode: 'existing' };

  const desiredUrl = tg_getWebhookUrl_(FRUITS_CONFIG.PROP_WEBHOOK_URL, '');
  if (!desiredUrl) return { ok: false, error: 'webhook URL missing (deploy WebApp)' };

  // Persist the resolved webhook URL so the next debug run shows it.
  props.setProperty(FRUITS_CONFIG.PROP_WEBHOOK_URL, desiredUrl);
  const setRes = tg_setWebhook_(token, desiredUrl);
  return { ok: Boolean(setRes && setRes.ok), mode: 'set', url: desiredUrl, result: setRes };
}

function fruits_getWebhookInfo() {
  const token = getPrimaryBotToken_();
  if (!token) throw new Error('fruits_getWebhookInfo: primary bot token not set');
  return tg_getWebhookInfo_(token);
}

function fruits_debugInfo() {
  try {
    const props = PropertiesService.getScriptProperties();
    const sheetId = props.getProperty(FRUITS_CONFIG.PROP_SHEET_ID);
    const folderId = props.getProperty(FRUITS_CONFIG.PROP_DRIVE_FOLDER_ID);
    const webUrl = props.getProperty(FRUITS_CONFIG.PROP_WEBAPP_URL);
    const defaultChatId = props.getProperty(FRUITS_CONFIG.PROP_DEFAULT_CHAT_ID);
    const botToken = props.getProperty(FRUITS_CONFIG.PROP_BOT_TOKEN);

    Logger.log('FRUITS_SHEET_ID: ' + (sheetId || 'MISSING'));
    if (sheetId) Logger.log('Sheet URL: ' + SpreadsheetApp.openById(sheetId).getUrl());

    Logger.log('FRUITS_DRIVE_FOLDER_ID: ' + (folderId || 'MISSING'));
    if (folderId) Logger.log('Folder URL: ' + DriveApp.getFolderById(folderId).getUrl());

    Logger.log('FRUITS_WEBAPP_URL: ' + (webUrl || 'MISSING'));
    Logger.log('FRUITS_DEFAULT_CHAT_ID: ' + (defaultChatId || 'MISSING'));
    Logger.log('FRUITS_BOT_TOKEN: ' + (botToken ? 'SET' : 'MISSING'));
  } catch (e) {
    Logger.log('fruits_debugInfo error: ' + e.toString());
  }
}

function fruits_getQuestions_() {
  const raw = HtmlService.createHtmlOutputFromFile(FRUITS_CONFIG.QUESTIONS_FILE).getContent().trim();

  // Try raw JSON first (pure JSON file).
  try {
    return JSON.parse(raw);
  } catch (_) {}

  // Fallback: extract from <script> const QUESTIONS = {...};
  const idx = raw.indexOf('const QUESTIONS');
  if (idx !== -1) {
    const braceStart = raw.indexOf('{', idx);
    const scriptEnd = raw.indexOf('</script>', braceStart);
    const braceEnd = raw.lastIndexOf('}', scriptEnd === -1 ? raw.length : scriptEnd);
    if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
      const objText = raw.slice(braceStart, braceEnd + 1);
      return JSON.parse(objText);
    }
  }

  throw new Error('fruits_getQuestions_: could not parse QUESTIONS');
}

function fruits_getQuestionIndex_() {
  if (FRUITS_Q_INDEX) return FRUITS_Q_INDEX;
  const questions = fruits_getQuestions_();
  const index = {};
  Object.keys(questions).forEach(section => {
    const list = questions[section] || [];
    list.forEach(q => { index[q] = section; });
  });
  FRUITS_Q_INDEX = index;
  return FRUITS_Q_INDEX;
}

function fruits_findQuestionInText_(text) {
  const hay = String(text || '');
  const index = fruits_getQuestionIndex_();
  for (const q in index) {
    if (hay.indexOf(q) !== -1) {
      return { question: q, section: index[q] };
    }
  }
  return null;
}

function fruits_initIfNeeded_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(FRUITS_CONFIG.PROP_DRIVE_FOLDER_ID)) {
    fruits_init_();
  }
  fruits_getStoreFile_();
}

function fruits_init_() {
  const folder = fruits_ensureCentreFolder_();
  const props = PropertiesService.getScriptProperties();
  props.setProperty(FRUITS_CONFIG.PROP_DRIVE_FOLDER_ID, folder.getId());
  fruits_getStoreFile_();
}

function fruits_ensureCentreFolder_() {
  const rootIt = DriveApp.getFoldersByName(FRUITS_CONFIG.ROOT_FOLDER_NAME);
  const root = rootIt.hasNext() ? rootIt.next() : DriveApp.getRootFolder().createFolder(FRUITS_CONFIG.ROOT_FOLDER_NAME);
  const it = root.getFoldersByName(FRUITS_CONFIG.CENTRE_FOLDER_NAME);
  return it.hasNext() ? it.next() : root.createFolder(FRUITS_CONFIG.CENTRE_FOLDER_NAME);
}

function fruits_ensureSpreadsheet_(folder) {
  const existingId = PropertiesService.getScriptProperties().getProperty(FRUITS_CONFIG.PROP_SHEET_ID);
  if (existingId) {
    try {
      const ss = SpreadsheetApp.openById(existingId);
      const file = DriveApp.getFileById(existingId);
      const parent = file.getParents().next();
      if (parent.getId() !== folder.getId()) file.moveTo(folder);
      return ss;
    } catch (e) {}
  }
  const ss = SpreadsheetApp.create('Alpha_Fruits_DB');
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  return ss;
}

function fruits_ensureSheet_(ss, name, header) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(header);
  return sh;
}

function fruits_getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty(FRUITS_CONFIG.PROP_SHEET_ID);
  if (!id) throw new Error('FRUITS_SHEET_ID not set');
  return SpreadsheetApp.openById(id);
}

function fruits_getDriveFolder_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(FRUITS_CONFIG.PROP_DRIVE_FOLDER_ID);
  if (!id) {
    const folder = fruits_ensureCentreFolder_();
    id = folder.getId();
    props.setProperty(FRUITS_CONFIG.PROP_DRIVE_FOLDER_ID, id);
    return folder;
  }
  return DriveApp.getFolderById(id);
}

function fruits_getStoreFile_() {
  const folder = fruits_getDriveFolder_();
  const name = 'fruits_store.json';
  const it = folder.getFilesByName(name);
  if (it.hasNext()) return it.next();
  // Fallback: find existing store elsewhere and move into the canonical folder.
  const globalIt = DriveApp.getFilesByName(name);
  let best = null;
  let bestScore = -1;
  let bestUpdated = '';
  while (globalIt.hasNext()) {
    const file = globalIt.next();
    try {
      const raw = file.getBlob().getDataAsString();
      const parsed = raw ? JSON.parse(raw) : {};
      const answers = parsed && parsed.answers ? Object.keys(parsed.answers).length : 0;
      const updated = parsed && parsed.updated_at ? String(parsed.updated_at) : '';
      if (answers > bestScore || (answers === bestScore && updated > bestUpdated)) {
        best = file;
        bestScore = answers;
        bestUpdated = updated;
      }
    } catch (_) {
      // Ignore unreadable candidates.
    }
  }
  if (best) {
    try {
      best.moveTo(folder);
    } catch (_) {}
    return best;
  }
  const seed = {
    answers: {},
    users: {},
    logs: [],
    updated_at: new Date().toISOString()
  };
  return folder.createFile(name, JSON.stringify(seed, null, 2), MimeType.PLAIN_TEXT);
}

function fruits_loadStore_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const file = fruits_getStoreFile_();
    const raw = file.getBlob().getDataAsString();
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed.answers) parsed.answers = {};
    if (!parsed.users) parsed.users = {};
    if (!parsed.logs) parsed.logs = [];
    return parsed;
  } finally {
    lock.releaseLock();
  }
}

function fruits_saveStore_(store) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const file = fruits_getStoreFile_();
    const payload = store || {};
    payload.updated_at = new Date().toISOString();
    file.setContent(JSON.stringify(payload, null, 2));
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function fruits_getAnswersSheet_() {
  return fruits_ensureSheet_(fruits_getSpreadsheet_(), 'Answers', ['question','section','answer','source','chat_id','updated_at']);
}

function fruits_getUsersSheet_() {
  return fruits_ensureSheet_(fruits_getSpreadsheet_(), 'Users', ['chat_id','user_name','status','started_at','last_section','last_question']);
}

function fruits_getLogsSheet_() {
  return fruits_ensureSheet_(fruits_getSpreadsheet_(), 'Logs', ['SessionID','Timestamp','File Name','Drive URL','Characters','Preview']);
}

function fruits_loadAnswers_() {
  const answers = {};
  const store = fruits_loadStore_();
  Object.keys(store.answers || {}).forEach((q) => {
    const entry = store.answers[q];
    answers[q] = entry && typeof entry === 'object' ? (entry.answer || '') : (entry || '');
  });
  return answers;
}

function fruits_getSkippedQuestion_() {
  const props = PropertiesService.getScriptProperties();
  const question = props.getProperty(FRUITS_CONFIG.PROP_SKIPPED_QUESTION);
  if (!question) return null;
  const section = props.getProperty(FRUITS_CONFIG.PROP_SKIPPED_SECTION) || '';
  return { question, section };
}

function fruits_setSkippedQuestion_(section, question) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(FRUITS_CONFIG.PROP_SKIPPED_QUESTION, question || '');
  props.setProperty(FRUITS_CONFIG.PROP_SKIPPED_SECTION, section || '');
}

function fruits_clearSkippedQuestion_() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(FRUITS_CONFIG.PROP_SKIPPED_QUESTION);
  props.deleteProperty(FRUITS_CONFIG.PROP_SKIPPED_SECTION);
}

function fruits_hasPendingSkippedAnswer_(answers, skipped) {
  if (skipped && skipped.question) return true;
  const vals = answers || fruits_loadAnswers_();
  return Object.values(vals).some(a => a === '_geskippt_');
}

function fruits_registerUser_(chatId, username) {
  const store = fruits_loadStore_();
  const id = String(chatId || '');
  if (!id) return;
  const users = store.users || {};
  const existing = users[id] || {};
  users[id] = {
    chat_id: id,
    user_name: username || existing.user_name || 'User',
    status: 'active',
    started_at: existing.started_at || new Date().toISOString(),
    last_section: existing.last_section || '',
    last_question: existing.last_question || '',
    updated_at: new Date().toISOString()
  };
  store.users = users;
  fruits_saveStore_(store);
}

function fruits_getLastQuestion_(chatId) {
  const store = fruits_loadStore_();
  const id = String(chatId || '');
  const user = (store.users || {})[id];
  if (!user) return { section: '', question: '' };
  return { section: user.last_section || '', question: user.last_question || '' };
}

function fruits_setLastQuestion_(chatId, section, question) {
  const store = fruits_loadStore_();
  const id = String(chatId || '');
  if (!id) return;
  const users = store.users || {};
  const existing = users[id] || {};
  users[id] = {
    chat_id: id,
    user_name: existing.user_name || 'User',
    status: existing.status || 'active',
    started_at: existing.started_at || new Date().toISOString(),
    last_section: section || '',
    last_question: question || '',
    updated_at: new Date().toISOString()
  };
  store.users = users;
  fruits_saveStore_(store);
}

function fruits_getAllData() {
  fruits_initIfNeeded_();
  return {
    mapTitle: FRUITS_CONFIG.MAP_TITLE,
    mapSubtitle: FRUITS_CONFIG.MAP_SUBTITLE,
    questions: fruits_getQuestions_(),
    emojis: FRUITS_EMOJIS,
    answers: fruits_loadAnswers_(),
    skipped: fruits_getSkippedQuestion_()
  };
}

function fruits_saveAnswer(section, question, answer) {
  return fruits_saveAnswerWithMeta(section, question, answer, 'webapp', '');
}

function fruits_saveAnswerWithMeta(section, question, answer, source, chatId) {
  const skipped = fruits_getSkippedQuestion_();
  if (answer === '_geskippt_') {
    if (skipped && skipped.question && skipped.question !== question) {
      return { ok: false, error: 'Skip already used. Answer skipped question first.' };
    }
    fruits_setSkippedQuestion_(section, question);
  } else if (skipped && skipped.question === question) {
    fruits_clearSkippedQuestion_();
  }

  const store = fruits_loadStore_();
  const answers = store.answers || {};
  const key = String(question || '');
  const exists = Boolean(answers[key]);
  answers[key] = {
    answer: answer,
    section: section,
    source: source || '',
    chat_id: chatId || '',
    updated_at: new Date().toISOString()
  };
  store.answers = answers;
  fruits_saveStore_(store);
  return { ok: true, mode: exists ? 'updated' : 'inserted' };
}

function fruits_exportCompleteMap() {
  fruits_initIfNeeded_();
  const payload = fruits_getAllData();
  const answers = payload.answers || {};

  let md = '# AlphaOS Fruits Frame Map\n';
  md += 'Completed: ' + new Date().toLocaleDateString('de-AT') + '\n\n';

  for (const [section, qs] of Object.entries(payload.questions)) {
    md += `## ${section}\n\n`;
    for (const q of qs) {
      const ans = answers[q] || '_noch offen_';
      md += `**${q}**\n\n${ans}\n\n---\n\n`;
    }
  }

  const filename = `Fruits_Frame_Map_${new Date().toISOString().slice(0,10)}`;
  return fruits_saveSessionToDrive_(md, filename);
}

function fruits_saveSessionToDrive_(mdContent, filename) {
  const folder = fruits_getDriveFolder_();
  const file = folder.createFile(filename + '.md', mdContent, MimeType.PLAIN_TEXT);

  const preview = mdContent.substring(0, 200).replace(/\n/g, ' ');
  const store = fruits_loadStore_();
  const logs = store.logs || [];
  logs.push({
    id: filename,
    timestamp: new Date().toISOString(),
    name: file.getName(),
    url: file.getUrl(),
    characters: mdContent.length,
    preview: preview
  });
  store.logs = logs;
  fruits_saveStore_(store);
  return { id: file.getId(), name: file.getName(), url: file.getUrl() };
}

function fruits_randomEmoji_() {
  return FRUITS_EMOJIS[Math.floor(Math.random() * FRUITS_EMOJIS.length)];
}

function fruits_getWebUrl_() {
  try {
    return String(ScriptApp.getService().getUrl() || '').trim();
  } catch (_) {
    return '';
  }
}


function fruits_sendMessage_(chatId, text) {
  const token = getPrimaryBotToken_();
  if (!token) return;
  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' }),
    muteHttpExceptions: true
  });
}

function fruits_sendNextQuestionToUser_(chatId) {
  fruits_registerUser_(chatId, 'User');

  const questions = fruits_getQuestions_();
  const answers = fruits_loadAnswers_();
  const skipped = fruits_getSkippedQuestion_();
  const hasPendingSkip = fruits_hasPendingSkippedAnswer_(answers, skipped);

  let nextQ = null;
  outer: for (const section in questions) {
    for (const q of questions[section]) {
      if (!answers[q]) { nextQ = { section, question: q }; break outer; }
    }
  }
  if (!nextQ && skipped && skipped.question && answers[skipped.question] === '_geskippt_') {
    nextQ = skipped;
  }

  const today = new Date().toLocaleDateString('de-AT');
  const web = fruits_getWebUrl_();

  if (!nextQ) {
    fruits_sendMessage_(chatId, `✅ FRUITS MAP COMPLETE - ${today}\n\nExport im Centre: ${web}`);
    fruits_setLastQuestion_(chatId, '', '');
    return;
  }

  const msg =
    `${fruits_randomEmoji_()} *AlphaOS Fruits Daily Fact - ${today}*\n\n` +
    `*${nextQ.section}*\n\n` +
    `${nextQ.question}\n\n` +
    `_Answer here or in the Centre:_\n` +
    `${web}` +
    (hasPendingSkip ? `\n\n⚠️ You still have a skipped question open.` : '');

  fruits_sendMessage_(chatId, msg);
  fruits_setLastQuestion_(chatId, nextQ.section, nextQ.question);
}

function fruits_skipCurrentQuestion_(chatId) {
  const last = fruits_getLastQuestion_(chatId);
  if (!last.question) {
    fruits_sendMessage_(chatId, 'Keine offene Frage zum Skippen.');
    return;
  }

  const answers = fruits_loadAnswers_();
  const skipped = fruits_getSkippedQuestion_();
  if (fruits_hasPendingSkippedAnswer_(answers, skipped)) {
    fruits_sendMessage_(chatId, 'Skip bereits genutzt. Bitte zuerst die geskippte Frage beantworten.');
    return;
  }

  fruits_saveAnswerWithMeta(last.section, last.question, '_geskippt_', 'telegram', String(chatId));
  fruits_setLastQuestion_(chatId, '', '');
  fruits_sendMessage_(chatId, `${fruits_randomEmoji_()} Frage uebersprungen. Naechste kommt morgen.`);
}

function fruits_setupDailyTrigger(hourUTC) {
  const hour = typeof hourUTC === 'number' ? hourUTC : 7;
  const triggers = ScriptApp.getProjectTriggers();

  // Remove existing trigger
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'fruits_dailyQuestion') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Create new trigger
  ScriptApp.newTrigger('fruits_dailyQuestion')
    .timeBased()
    .everyDays(1)
    .atHour(hour)
    .create();

  return { ok: true, trigger: 'fruits_dailyQuestion', hour: hour };
}

function fruits_setupWebhook(deployUrl) {
  const token = PropertiesService.getScriptProperties().getProperty(FRUITS_CONFIG.PROP_BOT_TOKEN);
  if (!token) throw new Error('fruits_setupWebhook: FRUITS_BOT_TOKEN not set. Call fruits_setBotToken() first.');

  return fruits_setWebhook(deployUrl);
}

function fruits_disableWebhook_() {
  const props = PropertiesService.getScriptProperties();
  const token = getPrimaryBotToken_();
  if (!token) throw new Error('fruits_disableWebhook_: bot token missing');

  const apiBase = tg_getApiBase_(token);
  const res = UrlFetchApp.fetch(apiBase + '/deleteWebhook', { method: 'post', muteHttpExceptions: true });
  props.deleteProperty(FRUITS_CONFIG.PROP_WEBHOOK_URL);
  try {
    return JSON.parse(res.getContentText());
  } catch (_) {
    return { ok: false, error: res.getContentText() };
  }
}

function fruits_pollTelegram_() {
  const props = PropertiesService.getScriptProperties();
  const token = getPrimaryBotToken_();
  if (!token) throw new Error('fruits_pollTelegram_: bot token missing');

  const info = tg_getWebhookInfo_(token);
  const currentUrl = info && info.ok && info.result ? String(info.result.url || '') : '';
  if (currentUrl) {
    return { ok: false, error: 'Webhook active; polling disabled.' };
  }

  const lastId = Number(props.getProperty('FRUITS_LAST_UPDATE_ID') || 0);
  let url = tg_getApiBase_(token) + '/getUpdates?timeout=0&allowed_updates=message';
  if (lastId) url += '&offset=' + (lastId + 1);

  const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  let data = null;
  try {
    data = JSON.parse(res.getContentText());
  } catch (_) {
    data = null;
  }
  if (!data || !data.ok) {
    return { ok: false, error: (data && data.description) || res.getContentText() };
  }

  const updates = data.result || [];
  let maxId = lastId;
  updates.forEach((u) => {
    if (u && typeof u.update_id === 'number' && u.update_id > maxId) {
      maxId = u.update_id;
    }
    if (u && u.message) {
      fruits_handleTelegramMessage_(u.message);
    }
  });

  if (maxId > lastId) props.setProperty('FRUITS_LAST_UPDATE_ID', String(maxId));
  return { ok: true, count: updates.length, lastUpdateId: maxId };
}

function fruits_setupPollingTrigger(minutes) {
  const mins = typeof minutes === 'number' ? minutes : 5;
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach((t) => {
    if (t.getHandlerFunction() === 'fruits_pollTelegram_') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('fruits_pollTelegram_')
    .timeBased()
    .everyMinutes(mins)
    .create();
  return { ok: true, trigger: 'fruits_pollTelegram_', minutes: mins };
}

function fruits_disablePolling_() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach((t) => {
    if (t.getHandlerFunction() === 'fruits_pollTelegram_') {
      ScriptApp.deleteTrigger(t);
    }
  });
  PropertiesService.getScriptProperties().deleteProperty('FRUITS_LAST_UPDATE_ID');
  return { ok: true };
}

function fruits_setupComplete(config) {
  const cfg = config || {};
  const results = {};

  // 1. Setup storage (Sheet + Drive)
  results.storage = fruits_setupAll(
    cfg.sheetId,
    cfg.folderId,
    cfg.webAppUrl,
    cfg.defaultChatId
  );

  // 2. Setup bot token
  if (cfg.botToken) {
    results.token = fruits_setBotToken(cfg.botToken);
  }

  // 3. Setup webhook
  if (cfg.webhookUrl) {
    results.webhook = fruits_setupWebhook(cfg.webhookUrl);
  }

  // 4. Setup daily trigger (default 7:00 UTC)
  results.trigger = fruits_setupDailyTrigger(cfg.dailyHour || 7);

  return results;
}

function fruits_dailyQuestion() {
  fruits_initIfNeeded_();
  fruits_ensureWebhook_();
  const store = fruits_loadStore_();
  const users = store.users || {};
  let sent = false;

  Object.keys(users).forEach((id) => {
    const user = users[id] || {};
    if (user.status === 'active') {
      fruits_sendNextQuestionToUser_(id);
      sent = true;
    }
  });

  if (!sent) {
    const fallback = PropertiesService.getScriptProperties().getProperty(FRUITS_CONFIG.PROP_DEFAULT_CHAT_ID) || CONFIG.CHAT_ID;
    if (fallback) fruits_sendNextQuestionToUser_(fallback);
  }
}

function fruits_handleTelegramMessage_(message) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim();
  if (!text) return false;
  Logger.log('fruits_handleTelegramMessage_: text=' + text);

  if (text === '/facts' || text === '/fruits') {
    fruits_registerUser_(chatId, message.from.first_name || message.from.username || 'User');
    fruits_sendMessage_(chatId,
      `🍎 Willkommen beim AlphaOS Fruits Bot!\n\n` +
      `Taeglicher Fact kommt um 7:00 Uhr.\n` +
      `Centre: ${fruits_getWebUrl_()}\n\n` +
      `Commands: /web /next /skip`
    );
    return true;
  }

  if (text === '/web') {
    fruits_sendMessage_(chatId, `🍎 Fruits Centre: ${fruits_getWebUrl_()}`);
    return true;
  }

  if (text === '/next') {
    fruits_registerUser_(chatId, message.from.first_name || message.from.username || 'User');
    fruits_sendNextQuestionToUser_(chatId);
    return true;
  }

  if (text === '/skip') {
    fruits_skipCurrentQuestion_(chatId);
    return true;
  }

  if (text.startsWith('/')) return false;

  const last = fruits_getLastQuestion_(chatId);
  let question = last.question;
  let section = last.section;
  Logger.log('fruits_handleTelegramMessage_: last_question=' + (question || ''));

  if (!question && message.reply_to_message && message.reply_to_message.text) {
    const found = fruits_findQuestionInText_(message.reply_to_message.text);
    if (found) {
      question = found.question;
      section = found.section;
      Logger.log('fruits_handleTelegramMessage_: reply matched question');
    }
  }

  if (!question) {
    Logger.log('fruits_handleTelegramMessage_: no question match');
    return false;
  }

  fruits_saveAnswerWithMeta(section, question, text, 'telegram', String(chatId));
  fruits_setLastQuestion_(chatId, '', '');
  fruits_sendMessage_(chatId, `${fruits_randomEmoji_()} Fact gespeichert. Naechste Frage morgen um 7:00.`);
  return true;
}
