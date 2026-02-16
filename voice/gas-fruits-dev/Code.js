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
let FRUITS_SECTION_ORDER = null;

function fruits_aosCfg_() {
  return {
    centreLabel: 'Fruits',
    centreKey: 'FRU',
    telegram: {
      tokenProp: 'FRUITS_BOT_TOKEN',
      defaultChatIdProp: FRUITS_CONFIG.PROP_DEFAULT_CHAT_ID
    },
    drive: {
      fixedRootPath: `${FRUITS_CONFIG.ROOT_FOLDER_NAME}/${FRUITS_CONFIG.CENTRE_FOLDER_NAME}`
    }
  };
}

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

function fruits_extractSectionOrderFromRaw_(rawJson, parsed) {
  const text = String(rawJson || '');
  const data = parsed && typeof parsed === 'object' ? parsed : {};
  const order = [];
  const re = /"([^"]+)":\s*\[/g;
  let m;
  while ((m = re.exec(text))) {
    const key = m[1];
    if (key && Object.prototype.hasOwnProperty.call(data, key)) order.push(key);
  }
  const seen = {};
  const out = [];
  order.forEach((k) => {
    if (!seen[k]) {
      seen[k] = true;
      out.push(k);
    }
  });
  Object.keys(data).forEach((k) => {
    if (!seen[k]) out.push(k);
  });
  return out;
}

function fruits_getQuestions_() {
  let raw = HtmlService.createHtmlOutputFromFile(FRUITS_CONFIG.QUESTIONS_FILE).getContent();
  raw = String(raw || '').replace(/^\uFEFF/, '').trim();

  // Try raw JSON first.
  try {
    const parsed = JSON.parse(raw);
    FRUITS_SECTION_ORDER = fruits_extractSectionOrderFromRaw_(raw, parsed);
    return parsed;
  } catch (_) {}

  // Fallback: strip outer HTML and parse the first {...} block.
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const objText = raw.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(objText);
      FRUITS_SECTION_ORDER = fruits_extractSectionOrderFromRaw_(objText, parsed);
      return parsed;
    } catch (_) {}
  }

  // Fallback: extract from <script> const QUESTIONS = {...};
  const idx = raw.indexOf('const QUESTIONS');
  if (idx !== -1) {
    const braceStart = raw.indexOf('{', idx);
    const scriptEnd = raw.indexOf('</script>', braceStart);
    const braceEnd = raw.lastIndexOf('}', scriptEnd === -1 ? raw.length : scriptEnd);
    if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
      const objText = raw.slice(braceStart, braceEnd + 1);
      const parsed = JSON.parse(objText);
      FRUITS_SECTION_ORDER = fruits_extractSectionOrderFromRaw_(objText, parsed);
      return parsed;
    }
  }

  throw new Error('fruits_getQuestions_: could not parse QUESTIONS');
}

function fruits_getSectionOrder_() {
  if (FRUITS_SECTION_ORDER && FRUITS_SECTION_ORDER.length) return FRUITS_SECTION_ORDER;
  const questions = fruits_getQuestions_();
  if (FRUITS_SECTION_ORDER && FRUITS_SECTION_ORDER.length) return FRUITS_SECTION_ORDER;
  return Object.keys(questions || {});
}

function fruits_initIfNeeded_() {
  // Standalone uses a Drive JSON store; keep init minimal to avoid webhook timeouts.
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(FRUITS_CONFIG.PROP_DRIVE_FOLDER_ID)) {
    const folder = fruits_ensureCentreFolder_();
    props.setProperty(FRUITS_CONFIG.PROP_DRIVE_FOLDER_ID, folder.getId());
  }
  try {
    getStoreFile_();
  } catch (e) {
    Logger.log('fruits_initIfNeeded_: store init failed: ' + String(e));
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
  return loadAnswers('');
}

function fruits_loadAnswersForChat_(chatId) {
  return loadAnswers(String(chatId || ''));
}

function fruits_getSkippedQuestion_(chatId) {
  return getSkippedQuestionForChat_(String(chatId || '').trim());
}

function fruits_setSkippedQuestion_(chatId, section, question) {
  return setSkippedQuestionForChat_(String(chatId || '').trim(), section, question);
}

function fruits_clearSkippedQuestion_(chatId) {
  return clearSkippedQuestionForChat_(String(chatId || '').trim());
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

function fruits_resolveChatIdFromUserKey_(userKey) {
  const k = String(userKey || '').trim();
  if (!k) return '';
  return String(getChatIdByUserKey(k) || '').trim();
}

function fruits_registerAnonUser() {
  fruits_initIfNeeded_();
  const userKey = (typeof fruits_registerAnonUserKey_ === 'function')
    ? fruits_registerAnonUserKey_()
    : String(Utilities.getUuid() || '').replace(/-/g, '');
  return { ok: true, userKey: userKey };
}

function fruits_getAllData(userKey) {
  fruits_initIfNeeded_();
  const key = String(userKey || '').trim();
  const chatId = fruits_resolveChatIdFromUserKey_(key);
  return {
    userKey: key,
    mapTitle: FRUITS_CONFIG.MAP_TITLE,
    mapSubtitle: FRUITS_CONFIG.MAP_SUBTITLE,
    questions: fruits_getQuestions_(),
    sectionOrder: fruits_getSectionOrder_(),
    emojis: FRUITS_EMOJIS,
    answers: key ? loadAnswers('', key) : {},
    skipped: key
      ? ((typeof fruits_getSkippedQuestionForUserKey_ === 'function') ? fruits_getSkippedQuestionForUserKey_(key) : null)
      : null,
    chatId: chatId
  };
}

function fruits_saveAnswer(section, question, answer, userKey) {
  const key = String(userKey || '').trim();
  if (!key) return { ok: false, error: 'Missing userKey (?k=...)' };
  const chatId = fruits_resolveChatIdFromUserKey_(key);
  return fruits_saveAnswerWithMeta(section, question, answer, 'webapp', chatId, key);
}

function fruits_saveAnswerWithMeta(section, question, answer, source, chatId, userKey) {
  return saveAnswerWithMeta(section, question, answer, source, chatId, userKey);
}

function fruits_exportCompleteMap(userKey) {
  fruits_initIfNeeded_();
  const payload = fruits_getAllData(userKey);
  const answers = payload.answers || {};
  const questions = payload.questions || {};
  const sectionOrder = Array.isArray(payload.sectionOrder) && payload.sectionOrder.length
    ? payload.sectionOrder
    : Object.keys(questions);

  let md = '# αOS Fruits Frame Map\n';
  md += 'Completed: ' + new Date().toLocaleDateString('de-AT') + '\n\n';

  for (const section of sectionOrder) {
    const qs = questions[section] || [];
    md += `## ${section}\n\n`;
    for (const q of qs) {
      const ans = answers[q] || '_noch offen_';
      md += `**${q}**\n\n${ans}\n\n---\n\n`;
    }
  }

  const rawName = `Fruits_Frame_Map_${new Date().toISOString().slice(0,10)}`;
  const filename = (typeof AOS_safeFilename_ === 'function') ? AOS_safeFilename_(rawName) : rawName;
  return fruits_saveSessionToDrive_(md, filename);
}

function fruits_saveSessionToDrive_(mdContent, filename) {
  const folder = fruits_getDriveFolder_();
  const safeName = (typeof AOS_safeFilename_ === 'function') ? AOS_safeFilename_(filename) : String(filename || 'Fruits_Frame_Map');
  const file = folder.createFile(safeName + '.md', mdContent, MimeType.PLAIN_TEXT);

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
  const configured = String(PropertiesService.getScriptProperties().getProperty(FRUITS_CONFIG.PROP_WEBAPP_URL) || '').trim();
  if (configured) return configured;
  try {
    return String(ScriptApp.getService().getUrl() || '').trim();
  } catch (_) {
    return '';
  }
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
    store.user_keys = {};
  }
  if (mode === 'reset_answers') {
    store.answers = {};
    store.answers_by_chat = {};
  }
  if (mode === 'reset_skipped') {
    const users = store.users || {};
    Object.keys(users).forEach((id) => {
      const u = users[id] || {};
      if (u && typeof u === 'object' && u.skipped) {
        const next = { ...u };
        delete next.skipped;
        users[id] = next;
      }
    });
    store.users = users;
    try {
      PropertiesService.getScriptProperties().deleteProperty('SKIPPED_QUESTION');
      PropertiesService.getScriptProperties().deleteProperty('SKIPPED_SECTION');
      PropertiesService.getScriptProperties().deleteProperty(FRUITS_CONFIG.PROP_SKIPPED_QUESTION);
      PropertiesService.getScriptProperties().deleteProperty(FRUITS_CONFIG.PROP_SKIPPED_SECTION);
    } catch (_) {}
  }
  saveStore_(store);
  const byChat = store.answers_by_chat && typeof store.answers_by_chat === 'object' ? store.answers_by_chat : {};
  const perUserAnswerCount = Object.keys(byChat).reduce((acc, id) => acc + Object.keys(byChat[id] || {}).length, 0);
  return {
    ok: true,
    answers_legacy: Object.keys(store.answers || {}).length,
    answers_by_chat: perUserAnswerCount,
    users: Object.keys(store.users || {}).length,
    skipped: null
  };
}

function fruits_handleApiAction_(action, payload) {
  try {
    const userKey = payload && (payload.userKey || payload.user_key || payload.k || payload.key)
      ? String(payload.userKey || payload.user_key || payload.k || payload.key)
      : '';
    if (action === 'getAllData') {
      return fruits_jsonResponse_(fruits_getAllData(userKey));
    }
    if (action === 'saveAnswer') {
      const section = payload && payload.section;
      const question = payload && payload.question;
      const answer = payload && payload.answer;
      if (!section || !question) {
        return fruits_jsonResponse_({ ok: false, error: 'Missing section or question' });
      }
      return fruits_jsonResponse_(fruits_saveAnswer(section, question, answer, userKey));
    }
    if (action === 'exportCompleteMap') {
      return fruits_jsonResponse_(fruits_exportCompleteMap(userKey));
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
  try {
    if (typeof AOS_tgSendMarkdown_ === 'function') {
      AOS_tgSendMarkdown_(fruits_aosCfg_(), chatId, text);
      return;
    }
  } catch (e) {
    Logger.log('fruits_sendMessage_: centre_utils failed: ' + String(e));
  }

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
  const userKey = getUserKey(chatId);
  const answers = loadAnswers('', userKey);
  const skipped = (typeof fruits_getSkippedQuestionForUserKey_ === 'function') ? fruits_getSkippedQuestionForUserKey_(userKey) : null;
  const hasPendingSkip = fruits_hasPendingSkippedAnswer_(answers, skipped);

  const questions = fruits_getQuestions_();
  let nextQ = null;
  const sectionOrder = fruits_getSectionOrder_();
  outer: for (const section of sectionOrder) {
    const list = questions[section] || [];
    for (const q of list) {
      if (!answers[q]) { nextQ = { section, question: q }; break outer; }
    }
  }
  if (!nextQ && skipped && skipped.question && answers[skipped.question] === '_geskippt_') {
    nextQ = skipped;
  }

  const today = new Date().toLocaleDateString('de-AT');
  const web = fruits_getWebUrl_() + (userKey ? ('?k=' + encodeURIComponent(userKey)) : '');

  if (!nextQ) {
    fruits_sendMessage_(chatId, `✅ FRUITS MAP COMPLETE - ${today}\n\nExport im Centre: ${web}`);
    fruits_setLastQuestion_(chatId, '', '');
    return;
  }

  const msg =
    `${fruits_randomEmoji_()} *αOS Fruits Daily Fact - ${today}*\n\n` +
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

  const userKey = getUserKey(chatId);
  const answers = loadAnswers('', userKey);
  const skipped = (typeof fruits_getSkippedQuestionForUserKey_ === 'function') ? fruits_getSkippedQuestionForUserKey_(userKey) : null;
  if (fruits_hasPendingSkippedAnswer_(answers, skipped)) {
    fruits_sendMessage_(chatId, 'Skip bereits genutzt. Bitte zuerst die geskippte Frage beantworten.');
    return;
  }

  fruits_saveAnswerWithMeta(last.section, last.question, '_geskippt_', 'telegram', String(chatId), userKey);
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
    const props = PropertiesService.getScriptProperties();
    const fallback =
      props.getProperty(FRUITS_CONFIG.PROP_DEFAULT_CHAT_ID) ||
      props.getProperty(PROP_DEFAULT_CHAT_ID) ||
      '';
    if (fallback) fruits_sendNextQuestionToUser_(fallback);
  }
}

function fruits_handleTelegramMessage_(message) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim();
  if (!text) return false;

  if (text === '/facts' || text === '/fruits') {
    fruits_registerUser_(chatId, message.from.first_name || message.from.username || 'User');
    const userKey = getUserKey(chatId);
    const web = fruits_getWebUrl_() + (userKey ? ('?k=' + encodeURIComponent(userKey)) : '');
    fruits_sendMessage_(chatId,
      `🍎 Welcome to the αOS Fruits Bot (Standalone Dev)!\n\n` +
      `Daily Fact arrives at 07:00.\n` +
      `Centre: ${web}\n\n` +
      `Commands: /web /next /skip`
    );
    return true;
  }

  if (text === '/web') {
    const userKey = getUserKey(chatId);
    const web = fruits_getWebUrl_() + (userKey ? ('?k=' + encodeURIComponent(userKey)) : '');
    fruits_sendMessage_(chatId, `🍎 Fruits Centre: ${web}`);
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

  const userKey = getUserKey(chatId);
  fruits_saveAnswerWithMeta(last.section, last.question, text, 'telegram', String(chatId), userKey);
  fruits_setLastQuestion_(chatId, '', '');
  fruits_sendMessage_(chatId, `${fruits_randomEmoji_()} Fact gespeichert. Naechste Frage morgen um 7:00.`);
  return true;
}

// ----------------------------------------------------------------
// Standalone entrypoints (clean, non-legacy)
// ----------------------------------------------------------------

function tg_isDuplicate_(update) {
  try {
    const hasCbq = Boolean(update && update.callback_query && update.callback_query.id);
    const msg = update && update.message;
    const hasMsg = Boolean(msg && msg.chat && msg.chat.id && msg.message_id);
    if (!hasCbq && !hasMsg) return false;

    const cache = CacheService.getScriptCache();
    const lock = LockService.getScriptLock();
    const gotLock = lock.tryLock(300);
    if (!gotLock) return true;

    try {
      if (hasCbq) {
        const id = String(update.callback_query.id);
        const key = 'tg:cbq:' + id;
        if (cache.get(key)) return true;
        cache.put(key, '1', 21600);
        return false;
      }

      const chatId = msg.chat.id;
      const messageId = msg.message_id;
      const key = 'tg:msg:' + String(chatId) + ':' + String(messageId);
      if (cache.get(key)) return true;
      cache.put(key, '1', 21600);
      return false;
    } finally {
      lock.releaseLock();
    }
  } catch (_) {
    return false;
  }
}

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
    const userKey = String((e && e.parameter && (e.parameter.userKey || e.parameter.user_key || e.parameter.k || e.parameter.key)) || '').trim();
    return fruits_handleApiAction_(action, { userKey: userKey });
  }
  fruits_initIfNeeded_();
  const t = HtmlService.createTemplateFromFile(FRUITS_CONFIG.ROOT_HTML);
  t.mapTitle = FRUITS_CONFIG.MAP_TITLE;
  t.mapSubtitle = FRUITS_CONFIG.MAP_SUBTITLE;
  t.userKey = String((e && e.parameter && (e.parameter.k || e.parameter.key)) || '').trim();
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
  try {
    const props = PropertiesService.getScriptProperties();
    const allowWebhook = String(props.getProperty('FRUITS_ALLOW_WEBHOOK') || '').trim() === '1';
    if (!allowWebhook) return ContentService.createTextOutput('OK');

    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput('OK');
    }
    const update = JSON.parse(e.postData.contents);
    if (tg_isDuplicate_(update)) {
      return ContentService.createTextOutput('OK');
    }
    if (!update.message) return ContentService.createTextOutput('OK');
    // Avoid expensive init before dedupe; init lazily when handling.
    fruits_initIfNeeded_();
    if (fruits_handleTelegramMessage_(update.message)) {
      return ContentService.createTextOutput('OK');
    }
  } catch (err) {
    Logger.log('doPost Error: ' + err);
  }
  return ContentService.createTextOutput('OK');
}

// ----------------------------------------------------------------
// Telegram polling mode (optional)
// - Use when you do not want/allow webhooks for the bot token.
// - Requires a time-driven trigger calling `fruits_pollTelegram_`.
// ----------------------------------------------------------------

const FRUITS_POLL_KEYS = {
  lastUpdateId: 'FRUITS_POLL_LAST_UPDATE_ID'
};

function tg_getApiBase_(token) {
  const t = String(token || '').trim();
  return t ? ('https://api.telegram.org/bot' + t) : '';
}

function tg_getWebhookInfo_(token) {
  const apiBase = tg_getApiBase_(token);
  if (!apiBase) throw new Error('tg_getWebhookInfo_: token missing');
  const res = UrlFetchApp.fetch(apiBase + '/getWebhookInfo', {
    method: 'get',
    muteHttpExceptions: true
  });
  try {
    return JSON.parse(res.getContentText());
  } catch (e) {
    return { ok: false, error: res.getContentText() };
  }
}

function fruits_getWebhookInfo() {
  const token = getPrimaryBotToken_();
  if (!token) throw new Error('fruits_getWebhookInfo: bot token missing');
  const info = tg_getWebhookInfo_(token);
  try { Logger.log(JSON.stringify(info, null, 2)); } catch (_) {}
  return info;
}

function fruits_logWebhookInfo() {
  return fruits_getWebhookInfo();
}

function fruits_disableWebhook_(dropPendingUpdates) {
  const token = getPrimaryBotToken_();
  if (!token) throw new Error('fruits_disableWebhook_: bot token missing');
  const apiBase = tg_getApiBase_(token);
  const payload = { drop_pending_updates: dropPendingUpdates !== false };
  const res = UrlFetchApp.fetch(apiBase + '/deleteWebhook', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  try {
    return JSON.parse(res.getContentText());
  } catch (e) {
    return { ok: false, error: res.getContentText() };
  }
}

function fruits_disableWebhook(dropPendingUpdates) {
  const res = fruits_disableWebhook_(dropPendingUpdates);
  Logger.log(JSON.stringify(res, null, 2));
  return res;
}

function fruits_dropPendingUpdates_() {
  const props = PropertiesService.getScriptProperties();
  const token = getPrimaryBotToken_();
  if (!token) throw new Error('fruits_dropPendingUpdates_: bot token missing');

  const info = tg_getWebhookInfo_(token);
  const currentUrl = info && info.ok && info.result ? String(info.result.url || '') : '';
  if (currentUrl) {
    return { ok: false, error: 'Webhook active; disable webhook before polling.' };
  }

  const lastId = Number(props.getProperty(FRUITS_POLL_KEYS.lastUpdateId) || 0);
  let url = tg_getApiBase_(token) + '/getUpdates?timeout=0&allowed_updates=message&limit=100';
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
    const updateId = u ? Number(u.update_id || 0) : 0;
    if (updateId && updateId > maxId) maxId = updateId;
  });
  if (maxId > lastId) props.setProperty(FRUITS_POLL_KEYS.lastUpdateId, String(maxId));
  return { ok: true, dropped: updates.length, lastUpdateId: maxId };
}

function fruits_dropPendingUpdates() {
  const res = fruits_dropPendingUpdates_();
  Logger.log(JSON.stringify(res, null, 2));
  return res;
}

function fruits_pollTelegram_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) {
    return { ok: true, skipped: true, reason: 'locked' };
  }
  try {
    const props = PropertiesService.getScriptProperties();
    const token = getPrimaryBotToken_();
    if (!token) throw new Error('fruits_pollTelegram_: bot token missing');

    const info = tg_getWebhookInfo_(token);
    const currentUrl = info && info.ok && info.result ? String(info.result.url || '') : '';
    if (currentUrl) {
      return { ok: false, error: 'Webhook active; polling disabled.' };
    }

    const lastId = Number(props.getProperty(FRUITS_POLL_KEYS.lastUpdateId) || 0);
    let url = tg_getApiBase_(token) + '/getUpdates?timeout=0&allowed_updates=message&limit=100';
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

    const cache = CacheService.getScriptCache();
    const updates = data.result || [];
    let maxId = lastId;
    updates.forEach((u) => {
      const updateId = u ? Number(u.update_id || 0) : 0;
      if (updateId && updateId > maxId) maxId = updateId;

      if (!u || !u.message) return;
      const chatId = u.message.chat && u.message.chat.id ? String(u.message.chat.id) : '';
      const messageId = u.message.message_id ? String(u.message.message_id) : '';
      if (chatId && messageId) {
        const key = 'fruits:poll:msg:' + chatId + ':' + messageId;
        if (cache.get(key)) return;
        cache.put(key, '1', 21600);
      }

      try {
        fruits_initIfNeeded_();
        fruits_handleTelegramMessage_(u.message);
      } catch (e) {
        Logger.log('fruits_pollTelegram_: handler error: ' + String(e));
      }
    });

    if (maxId > lastId) props.setProperty(FRUITS_POLL_KEYS.lastUpdateId, String(maxId));
    return { ok: true, count: updates.length, lastUpdateId: maxId };
  } finally {
    lock.releaseLock();
  }
}

function fruits_pollTelegram() {
  const res = fruits_pollTelegram_();
  try { Logger.log(JSON.stringify(res, null, 2)); } catch (_) {}
  return res;
}

function fruits_setupPollingTrigger(minutes) {
  const mins = typeof minutes === 'number' ? minutes : 5;
  if (typeof AOS_installTriggers_ === 'function') {
    return AOS_installTriggers_(fruits_aosCfg_(), [
      { fn: 'fruits_pollTelegram_', everyMinutes: mins }
    ]);
  }
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
  PropertiesService.getScriptProperties().deleteProperty(FRUITS_POLL_KEYS.lastUpdateId);
  return { ok: true };
}

function fruits_disablePolling() {
  const res = fruits_disablePolling_();
  Logger.log(JSON.stringify(res, null, 2));
  return res;
}

function fruits_enablePolling(minutes) {
  const disabled = fruits_disableWebhook(true);
  const trigger = fruits_setupPollingTrigger(minutes);
  return { ok: true, disabledWebhook: disabled, trigger: trigger };
}
