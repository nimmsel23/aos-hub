/*******************************
 * utils.gs – Modular Helper mit Error Handling
 *******************************/

// Emojis
const FRUIT_EMOJIS = ["🍎","🍌","🍇","🍉","🍓","🍒","🍍","🥝","🍊","🍏"];
function randomFruit() {
  try {
    return FRUIT_EMOJIS[Math.floor(Math.random() * FRUIT_EMOJIS.length)];
  } catch (e) {
    return '🍎'; // fallback
  }
}

// Properties Helper (mit Error Handling)
function getProp(key) {
  try {
    return PropertiesService.getScriptProperties().getProperty(key);
  } catch (e) {
    Logger.log(`Error reading property ${key}: ${e}`);
    return null;
  }
}

function setProp(key, value) {
  try {
    PropertiesService.getScriptProperties().setProperty(key, value);
  } catch (e) {
    Logger.log(`Error writing property ${key}: ${e}`);
  }
}

function clearProp(key) {
  try {
    PropertiesService.getScriptProperties().deleteProperty(key);
  } catch (e) {
    Logger.log(`Error deleting property ${key}: ${e}`);
  }
}

function getSkippedQuestion() {
  const question = getProp(PROP_SKIPPED_QUESTION || 'SKIPPED_QUESTION');
  if (!question) return null;
  const section = getProp(PROP_SKIPPED_SECTION || 'SKIPPED_SECTION');
  return { question, section: section || '' };
}

function setSkippedQuestion(section, question) {
  setProp(PROP_SKIPPED_QUESTION || 'SKIPPED_QUESTION', question || '');
  setProp(PROP_SKIPPED_SECTION || 'SKIPPED_SECTION', section || '');
}

function clearSkippedQuestion() {
  clearProp(PROP_SKIPPED_QUESTION || 'SKIPPED_QUESTION');
  clearProp(PROP_SKIPPED_SECTION || 'SKIPPED_SECTION');
}

// Bot Token (mit klarer Fehlermeldung)
function getBotToken() {
  const token = getProp(PROP_BOT_TOKEN || 'BOT_TOKEN') || getProp('FRUITS_BOT_TOKEN');
  if (!token) {
    throw new Error('Bot Token nicht gesetzt. Führe setupConfig aus oder setze BOT_TOKEN in Script Properties.');
  }
  return token;
}

function getPrimaryBotToken_() {
  try {
    return getBotToken();
  } catch (_) {
    return '';
  }
}

// Spreadsheet (mit Error Handling)
// Drive Folder (mit Fallback + Logging)
function getDriveFolder() {
  let id = getProp(PROP_DRIVE_FOLDER_ID || 'DRIVE_FOLDER_ID') || getProp('FRUITS_DRIVE_FOLDER_ID');
  if (id) {
    try {
      return DriveApp.getFolderById(id);
    } catch (e) {
      Logger.log(`Ungültige DRIVE_FOLDER_ID (${id}), erstelle neuen Ordner.`);
    }
  }

  try {
    const rootName = 'Alpha_Game';
    const rootIt = DriveApp.getFoldersByName(rootName);
    const root = rootIt.hasNext() ? rootIt.next() : DriveApp.getRootFolder().createFolder(rootName);
    const centreName = 'Fruits';
    const it = root.getFoldersByName(centreName);
    const folder = it.hasNext() ? it.next() : root.createFolder(centreName);
    setProp(PROP_DRIVE_FOLDER_ID || 'DRIVE_FOLDER_ID', folder.getId());
    return folder;
  } catch (e) {
    throw new Error(`Kann Fruits Ordner nicht anlegen: ${e.message}`);
  }
}

// Sheet sicherstellen (mit Error Handling)
// Answers
function loadAnswers() {
  try {
    const store = loadStore_();
    const answers = {};
    Object.keys(store.answers || {}).forEach((q) => {
      const entry = store.answers[q];
      answers[q] = entry && typeof entry === 'object' ? (entry.answer || '') : (entry || '');
    });
    return answers;
  } catch (e) {
    Logger.log('loadAnswers Error: ' + e);
    return {};
  }
}

function saveAnswer(section, question, answer) {
  return saveAnswerWithMeta(section, question, answer, 'webapp', '');
}

function saveAnswerWithMeta(section, question, answer, source, chatId) {
  try {
    const skipped = getSkippedQuestion();
    if (answer === '_geskippt_') {
      if (skipped && skipped.question && skipped.question !== question) {
        return { ok: false, error: 'Skip bereits genutzt. Bitte zuerst die geskippte Frage beantworten.' };
      }
      setSkippedQuestion(section, question);
    } else if (skipped && skipped.question === question) {
      clearSkippedQuestion();
    }

    const store = loadStore_();
    const answers = store.answers || {};
    const key = String(question || '');
    const previous = answers[key];
    const exists = Boolean(previous);
    answers[key] = {
      answer: answer,
      section: section,
      source: source || '',
      chat_id: chatId || '',
      updated_at: new Date().toISOString()
    };
    store.answers = answers;
    const logs = store.logs || [];
    logs.push({
      type: 'answer',
      timestamp: new Date().toISOString(),
      section: section,
      question: question,
      answer: answer,
      source: source || '',
      chat_id: chatId || '',
      previous_answer: previous && typeof previous === 'object' ? (previous.answer || '') : (previous || '')
    });
    store.logs = logs;
    saveStore_(store);
    return { ok: true, mode: exists ? 'updated' : 'inserted' };
  } catch (e) {
    Logger.log('saveAnswerWithMeta Error: ' + e);
    return { ok: false, error: e.message };
  }
}

// Users
// Legacy sheet helpers removed (JSON-only store).

function registerUser(chatId, username) {
  try {
    const store = loadStore_();
    const id = String(chatId || '');
    if (!id) return;
    const users = store.users || {};
    const existing = users[id] || {};
    users[id] = {
      chat_id: id,
      user_name: username || existing.user_name || 'Unknown',
      status: 'active',
      started_at: existing.started_at || new Date().toISOString(),
      last_section: existing.last_section || '',
      last_question: existing.last_question || '',
      updated_at: new Date().toISOString()
    };
    store.users = users;
    saveStore_(store);
  } catch (e) {
    Logger.log('registerUser Error: ' + e);
  }
}

function getLastQuestion(chatId) {
  try {
    const store = loadStore_();
    const id = String(chatId || '');
    const user = (store.users || {})[id];
    if (!user) return { section: '', question: '' };
    return { section: user.last_section || '', question: user.last_question || '' };
  } catch (e) {
    Logger.log('getLastQuestion Error: ' + e);
    return { section: '', question: '' };
  }
}

function setLastQuestion(chatId, section, question) {
  try {
    const store = loadStore_();
    const id = String(chatId || '');
    if (!id) return;
    const users = store.users || {};
    const existing = users[id] || {};
    users[id] = {
      chat_id: id,
      user_name: existing.user_name || 'Unknown',
      status: existing.status || 'active',
      started_at: existing.started_at || new Date().toISOString(),
      last_section: section || '',
      last_question: question || '',
      updated_at: new Date().toISOString()
    };
    store.users = users;
    saveStore_(store);
  } catch (e) {
    Logger.log('setLastQuestion Error: ' + e);
  }
}

// Telegram send
function sendMessage(chatId, text) {
  try {
    const url = `https://api.telegram.org/bot${getBotToken()}/sendMessage`;
    UrlFetchApp.fetch(url, {
      method: 'post',
      payload: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
      headers: { 'Content-Type': 'application/json' },
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('sendMessage Error: ' + e);
  }
}

// Debug
function debugInfo() {
  try {
    Logger.log('Store file: ' + getStoreFile_().getUrl());
    Logger.log('Folder: ' + getDriveFolder().getUrl());
    Logger.log('Bot Token: ' + (getBotToken() ? 'gesetzt' : 'FEHLT'));
  } catch (e) {
    Logger.log('debugInfo Error: ' + e);
  }
}

// JSON store helpers
function getStoreFile_() {
  const folder = getDriveFolder();
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

function loadStore_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const file = getStoreFile_();
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

function saveStore_(store) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const file = getStoreFile_();
    const payload = store || {};
    payload.updated_at = new Date().toISOString();
    file.setContent(JSON.stringify(payload, null, 2));
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
