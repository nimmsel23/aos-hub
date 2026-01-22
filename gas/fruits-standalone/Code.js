/*******************************
 * αOS Fruits Centre – Unified
 * WebApp + Telegram Bot
 * One Source of Truth: Answers-Tab
 * Daily Fact via Bot, UI in WebApp, .md Export
 *******************************/
// ================================================================
// FRUITS MODULE (GAS) - Shared storage for Bot + Fruits Centre
// ================================================================

const FRUITS_CONFIG = {
  ROOT_HTML: 'fruitscentre',
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
  PROP_WEBAPP_URL: 'FRUITS_WEBAPP_URL'
};

const FRUITS_EMOJIS = ['🍎','🍌','🍇','🍉','🍓','🍒','🍍','🥝','🍊','🍏'];

function fruits_setupAll(sheetId, folderId, fruitsWebAppUrl, defaultChatId) {
  const props = PropertiesService.getScriptProperties();
  if (sheetId) props.setProperty(FRUITS_CONFIG.PROP_SHEET_ID, sheetId);
  if (folderId) props.setProperty(FRUITS_CONFIG.PROP_DRIVE_FOLDER_ID, folderId);
  if (fruitsWebAppUrl) props.setProperty(FRUITS_CONFIG.PROP_WEBAPP_URL, fruitsWebAppUrl);
  if (defaultChatId) props.setProperty(FRUITS_CONFIG.PROP_DEFAULT_CHAT_ID, String(defaultChatId));
  return { ok: true };
}

function fruits_debugInfo() {
  try {
    const props = PropertiesService.getScriptProperties();
    const sheetId = props.getProperty(FRUITS_CONFIG.PROP_SHEET_ID);
    const folderId = props.getProperty(FRUITS_CONFIG.PROP_DRIVE_FOLDER_ID);
    const webUrl = props.getProperty(FRUITS_CONFIG.PROP_WEBAPP_URL);
    const defaultChatId = props.getProperty(FRUITS_CONFIG.PROP_DEFAULT_CHAT_ID);

    Logger.log('FRUITS_SHEET_ID: ' + (sheetId || 'MISSING'));
    if (sheetId) Logger.log('Sheet URL: ' + SpreadsheetApp.openById(sheetId).getUrl());

    Logger.log('FRUITS_DRIVE_FOLDER_ID: ' + (folderId || 'MISSING'));
    if (folderId) Logger.log('Folder URL: ' + DriveApp.getFolderById(folderId).getUrl());

    Logger.log('FRUITS_WEBAPP_URL: ' + (webUrl || 'MISSING'));
    Logger.log('FRUITS_DEFAULT_CHAT_ID: ' + (defaultChatId || 'MISSING'));
  } catch (e) {
    Logger.log('fruits_debugInfo error: ' + e.toString());
  }
}

function fruits_getQuestions_() {
  const raw = HtmlService.createHtmlOutputFromFile(FRUITS_CONFIG.QUESTIONS_FILE).getContent().trim();

  // Try raw JSON first.
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

function fruits_initIfNeeded_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(FRUITS_CONFIG.PROP_SHEET_ID) || !props.getProperty(FRUITS_CONFIG.PROP_DRIVE_FOLDER_ID)) {
    fruits_init_();
  }
}

function fruits_init_() {
  const folder = fruits_ensureCentreFolder_();
  const props = PropertiesService.getScriptProperties();
  props.setProperty(FRUITS_CONFIG.PROP_DRIVE_FOLDER_ID, folder.getId());

  const ss = fruits_ensureSpreadsheet_(folder);
  props.setProperty(FRUITS_CONFIG.PROP_SHEET_ID, ss.getId());

  fruits_ensureSheet_(ss, 'Answers', ['question','section','answer','source','chat_id','updated_at']);
  fruits_ensureSheet_(ss, 'Users', ['chat_id','user_name','status','started_at','last_section','last_question']);
  fruits_ensureSheet_(ss, 'Logs', ['SessionID','Timestamp','File Name','Drive URL','Characters','Preview']);
}

function fruits_ensureCentreFolder_() {
  const rootName = FRUITS_CONFIG.ROOT_FOLDER_NAME;
  const centreName = FRUITS_CONFIG.CENTRE_FOLDER_NAME;
  const rootIt = DriveApp.getFoldersByName(rootName);
  const root = rootIt.hasNext() ? rootIt.next() : DriveApp.getRootFolder().createFolder(rootName);
  const it = root.getFoldersByName(centreName);
  if (it.hasNext()) return it.next();

  // Fallback: if an "Alpha_Fruits" folder already exists, use it directly.
  const legacyRootIt = DriveApp.getFoldersByName('Alpha_Fruits');
  if (legacyRootIt.hasNext()) return legacyRootIt.next();

  return root.createFolder(centreName);
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
  const id = PropertiesService.getScriptProperties().getProperty(FRUITS_CONFIG.PROP_DRIVE_FOLDER_ID);
  if (!id) throw new Error('FRUITS_DRIVE_FOLDER_ID not set');
  return DriveApp.getFolderById(id);
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
  return loadAnswers();
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
  registerUser(chatId, username);
}

function fruits_getLastQuestion_(chatId) {
  return getLastQuestion(chatId);
}

function fruits_setLastQuestion_(chatId, section, question) {
  setLastQuestion(chatId, section, question);
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
  return saveAnswerWithMeta(section, question, answer, source, chatId);
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
  const store = loadStore_();
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
  saveStore_(store);
  return { id: file.getId(), name: file.getName(), url: file.getUrl() };
}

function fruits_randomEmoji_() {
  return FRUITS_EMOJIS[Math.floor(Math.random() * FRUITS_EMOJIS.length)];
}

function fruits_getWebUrl_() {
  return PropertiesService.getScriptProperties().getProperty(FRUITS_CONFIG.PROP_WEBAPP_URL) || '';
}

function fruits_syncStandaloneStorage_() {
  const p = PropertiesService.getScriptProperties();
  const sheetId = p.getProperty('SHEET_ID') || p.getProperty('FRUITS_SHEET_ID') || '';
  const folderId = p.getProperty('DRIVE_FOLDER_ID') || p.getProperty('FRUITS_DRIVE_FOLDER_ID') || '';
  if (sheetId) p.setProperty('SHEET_ID', sheetId);
  if (folderId) p.setProperty('DRIVE_FOLDER_ID', folderId);
  return { ok: true, sheetId: sheetId, folderId: folderId };
}

function fruits_jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

function fruits_repairStore_(mode) {
  const store = loadStore_();
  if (mode === 'reset_users') {
    store.users = {};
  }
  if (mode === 'reset_skipped') {
    store.skipped = null;
  }
  saveStore_(store);
  return {
    ok: true,
    answers: Object.keys(store.answers || {}).length,
    users: Object.keys(store.users || {}).length,
    skipped: store.skipped || null
  };
}

function fruits_handleApiAction_(action, payload) {
  try {
    if (action === 'getAllData') {
      return fruits_jsonResponse_(fruits_getAllData());
    }
    if (action === 'saveAnswer') {
      const section = payload && payload.section;
      const question = payload && payload.question;
      const answer = payload && payload.answer;
      if (!section || !question) {
        return fruits_jsonResponse_({ ok: false, error: 'Missing section or question' });
      }
      return fruits_jsonResponse_(saveAnswer(section, question, answer));
    }
    if (action === 'exportCompleteMap') {
      return fruits_jsonResponse_(fruits_exportCompleteMap());
    }
    if (action === 'repairStore') {
      const mode = payload && payload.mode ? String(payload.mode) : '';
      return fruits_jsonResponse_(fruits_repairStore_(mode));
    }
    return fruits_jsonResponse_({ ok: false, error: 'Unknown action' });
  } catch (e) {
    return fruits_jsonResponse_({ ok: false, error: String(e) });
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
  const answers = fruits_loadAnswers_();
  const skipped = fruits_getSkippedQuestion_();
  const hasPendingSkip = fruits_hasPendingSkippedAnswer_(answers, skipped);

  const questions = fruits_getQuestions_();
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

function fruits_dailyQuestion() {
  fruits_initIfNeeded_();
  const store = loadStore_();
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
  if (!last.question) return false;

  fruits_saveAnswerWithMeta(last.section, last.question, text, 'telegram', String(chatId));
  fruits_setLastQuestion_(chatId, '', '');
  fruits_sendMessage_(chatId, `${fruits_randomEmoji_()} Fact gespeichert. Naechste Frage morgen um 7:00.`);
  return true;
}

// ----------------------------------------------------------------
// Standalone entrypoints (clean, non-legacy)
// ----------------------------------------------------------------

// Legacy prop keys used by utils.js (keep as constants to avoid ReferenceError).
const PROP_BOT_TOKEN = 'BOT_TOKEN';
const PROP_SHEET_ID = 'SHEET_ID';
const PROP_DRIVE_FOLDER_ID = 'DRIVE_FOLDER_ID';
const PROP_SKIPPED_QUESTION = 'SKIPPED_QUESTION';
const PROP_SKIPPED_SECTION = 'SKIPPED_SECTION';
const PROP_DEFAULT_CHAT_ID = 'DEFAULT_CHAT_ID';

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action) {
    fruits_initIfNeeded_();
    return fruits_handleApiAction_(action, null);
  }
  fruits_initIfNeeded_();
  const t = HtmlService.createTemplateFromFile(FRUITS_CONFIG.ROOT_HTML);
  t.mapTitle = FRUITS_CONFIG.MAP_TITLE;
  t.mapSubtitle = FRUITS_CONFIG.MAP_SUBTITLE;
  return t.evaluate()
    .setTitle(FRUITS_CONFIG.MAP_TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action) {
    let payload = {};
    try {
      payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (_) {
      payload = {};
    }
    fruits_initIfNeeded_();
    return fruits_handleApiAction_(action, payload);
  }
  fruits_initIfNeeded_();
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput('OK');
    }
    const update = JSON.parse(e.postData.contents);
    if (!update.message) return ContentService.createTextOutput('OK');
    if (fruits_handleTelegramMessage_(update.message)) {
      return ContentService.createTextOutput('OK');
    }
  } catch (err) {
    Logger.log('doPost Error: ' + err);
  }
  return ContentService.createTextOutput('OK');
}
