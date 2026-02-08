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
  return getSkippedQuestionForChat_('');
}

function setSkippedQuestion(section, question) {
  setSkippedQuestionForChat_('', section, question);
}

function clearSkippedQuestion() {
  clearSkippedQuestionForChat_('');
}

function getSkippedQuestionForChat_(chatId) {
  const id = String(chatId || '').trim();
  if (!id) {
    const question = getProp(PROP_SKIPPED_QUESTION || 'SKIPPED_QUESTION');
    if (!question) return null;
    const section = getProp(PROP_SKIPPED_SECTION || 'SKIPPED_SECTION');
    return { question, section: section || '' };
  }
  try {
    const store = loadStore_();
    const user = (store.users || {})[id] || {};
    const skipped = user.skipped && typeof user.skipped === 'object' ? user.skipped : null;
    if (!skipped || !skipped.question) return null;
    return { question: String(skipped.question || ''), section: String(skipped.section || '') };
  } catch (e) {
    Logger.log('getSkippedQuestionForChat_ Error: ' + e);
    return null;
  }
}

function setSkippedQuestionForChat_(chatId, section, question) {
  const id = String(chatId || '').trim();
  if (!id) {
    setProp(PROP_SKIPPED_QUESTION || 'SKIPPED_QUESTION', question || '');
    setProp(PROP_SKIPPED_SECTION || 'SKIPPED_SECTION', section || '');
    return;
  }
  const store = loadStore_();
  const users = store.users || {};
  const existing = users[id] || { chat_id: id, status: 'active' };
  users[id] = {
    ...existing,
    skipped: { question: question || '', section: section || '' },
    updated_at: new Date().toISOString()
  };
  store.users = users;
  saveStore_(store);
}

function clearSkippedQuestionForChat_(chatId) {
  const id = String(chatId || '').trim();
  if (!id) {
    clearProp(PROP_SKIPPED_QUESTION || 'SKIPPED_QUESTION');
    clearProp(PROP_SKIPPED_SECTION || 'SKIPPED_SECTION');
    return;
  }
  const store = loadStore_();
  const users = store.users || {};
  const existing = users[id] || { chat_id: id, status: 'active' };
  const next = { ...existing };
  delete next.skipped;
  next.updated_at = new Date().toISOString();
  users[id] = next;
  store.users = users;
  saveStore_(store);
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
function loadAnswers(chatId, userKey) {
  try {
    const store = loadStore_();
    const answers = {};
    const id = String(chatId || '').trim();
    const key = String(userKey || '').trim();
    const source = id
      ? ((store.answers_by_chat || {})[id] || {})
      : (key ? ((store.answers_by_key || {})[key] || {}) : (store.answers || {}));
    Object.keys(source || {}).forEach((q) => {
      const entry = source[q];
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

function fruits_normalizeUserKey_(userKey) {
  return String(userKey || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 96);
}

function fruits_registerAnonUserKey_() {
  const store = loadStore_();
  store.users_by_key = store.users_by_key && typeof store.users_by_key === 'object' ? store.users_by_key : {};
  store.answers_by_key = store.answers_by_key && typeof store.answers_by_key === 'object' ? store.answers_by_key : {};
  store.user_keys = store.user_keys && typeof store.user_keys === 'object' ? store.user_keys : {};

  let userKey = '';
  for (let i = 0; i < 6; i++) {
    const candidate = fruits_normalizeUserKey_(String(Utilities.getUuid() || '').replace(/-/g, ''));
    if (!candidate) continue;
    if (!store.users_by_key[candidate] && !Object.prototype.hasOwnProperty.call(store.user_keys, candidate)) {
      userKey = candidate;
      break;
    }
  }
  if (!userKey) throw new Error('fruits_registerAnonUserKey_: failed');

  store.users_by_key[userKey] = {
    user_key: userKey,
    user_name: '',
    chat_id: '',
    status: 'active',
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  store.answers_by_key[userKey] = store.answers_by_key[userKey] || {};
  store.user_keys[userKey] = store.user_keys[userKey] || '';
  saveStore_(store);
  return userKey;
}

function fruits_getSkippedQuestionForUserKey_(userKey) {
  const key = fruits_normalizeUserKey_(userKey);
  if (!key) return null;
  const store = loadStore_();
  const users = store.users_by_key && typeof store.users_by_key === 'object' ? store.users_by_key : {};
  const user = users[key] || {};
  const skipped = user.skipped && typeof user.skipped === 'object' ? user.skipped : null;
  if (!skipped || !skipped.question) return null;
  return { question: String(skipped.question || ''), section: String(skipped.section || '') };
}

function fruits_setSkippedQuestionForUserKey_(userKey, section, question) {
  const key = fruits_normalizeUserKey_(userKey);
  if (!key) throw new Error('missing userKey');
  const store = loadStore_();
  const users = store.users_by_key && typeof store.users_by_key === 'object' ? store.users_by_key : {};
  const existing = users[key] || { user_key: key, status: 'active' };
  users[key] = {
    ...existing,
    skipped: { question: question || '', section: section || '' },
    updated_at: new Date().toISOString()
  };
  store.users_by_key = users;
  saveStore_(store);
}

function fruits_clearSkippedQuestionForUserKey_(userKey) {
  const key = fruits_normalizeUserKey_(userKey);
  if (!key) return;
  const store = loadStore_();
  const users = store.users_by_key && typeof store.users_by_key === 'object' ? store.users_by_key : {};
  const existing = users[key] || { user_key: key, status: 'active' };
  const next = { ...existing };
  delete next.skipped;
  next.updated_at = new Date().toISOString();
  users[key] = next;
  store.users_by_key = users;
  saveStore_(store);
}

function saveAnswerWithMeta(section, question, answer, source, chatId, userKey) {
  try {
    const id = String(chatId || '').trim();
    const userKeyNorm = fruits_normalizeUserKey_(userKey);
    const skipped = userKeyNorm
      ? fruits_getSkippedQuestionForUserKey_(userKeyNorm)
      : (id ? getSkippedQuestionForChat_(id) : getSkippedQuestionForChat_(''));
    if (answer === '_geskippt_') {
      if (skipped && skipped.question && skipped.question !== question) {
        return { ok: false, error: 'Skip bereits genutzt. Bitte zuerst die geskippte Frage beantworten.' };
      }
      if (userKeyNorm) {
        fruits_setSkippedQuestionForUserKey_(userKeyNorm, section, question);
      } else if (id) {
        setSkippedQuestionForChat_(id, section, question);
      } else {
        setSkippedQuestionForChat_('', section, question);
      }
    } else if (skipped && skipped.question === question) {
      if (userKeyNorm) {
        fruits_clearSkippedQuestionForUserKey_(userKeyNorm);
      } else if (id) {
        clearSkippedQuestionForChat_(id);
      } else {
        clearSkippedQuestionForChat_('');
      }
    }

    const store = loadStore_();
    const answersByChat = store.answers_by_chat || {};
    const answersByKey = store.answers_by_key || {};
    const answers = userKeyNorm
      ? (answersByKey[userKeyNorm] || {})
      : (id ? (answersByChat[id] || {}) : (store.answers || {}));
    const questionKey = String(question || '');
    const previous = answers[questionKey];
    const exists = Boolean(previous);
    answers[questionKey] = {
      answer: answer,
      section: section,
      source: source || '',
      chat_id: id || '',
      user_key: userKeyNorm || '',
      updated_at: new Date().toISOString()
    };
    if (userKeyNorm) {
      answersByKey[userKeyNorm] = answers;
      store.answers_by_key = answersByKey;
      if (id) {
        answersByChat[id] = answers;
        store.answers_by_chat = answersByChat;
      }
    } else if (id) {
      answersByChat[id] = answers;
      store.answers_by_chat = answersByChat;
    } else {
      store.answers = answers;
    }
    const logs = store.logs || [];
    logs.push({
      type: 'answer',
      timestamp: new Date().toISOString(),
      section: section,
      question: question,
      answer: answer,
      source: source || '',
      chat_id: id || '',
      user_key: userKeyNorm || '',
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
    const userKeys = store.user_keys || {};
    let userKey = String(existing.user_key || '').trim();
    if (!userKey) {
      userKey = fruits_normalizeUserKey_(String(Utilities.getUuid() || '').replace(/-/g, ''));
    }
    userKeys[userKey] = id;
    users[id] = {
      chat_id: id,
      user_name: username || existing.user_name || 'Unknown',
      status: 'active',
      started_at: existing.started_at || new Date().toISOString(),
      last_section: existing.last_section || '',
      last_question: existing.last_question || '',
      user_key: userKey,
      updated_at: new Date().toISOString()
    };
    store.users = users;
    store.user_keys = userKeys;

    // Keep per-user-key views for WebApp multi-user.
    const usersByKey = store.users_by_key && typeof store.users_by_key === 'object' ? store.users_by_key : {};
    usersByKey[userKey] = {
      user_key: userKey,
      user_name: username || existing.user_name || 'Unknown',
      chat_id: id,
      status: 'active',
      started_at: (usersByKey[userKey] && usersByKey[userKey].started_at) ? usersByKey[userKey].started_at : (existing.started_at || new Date().toISOString()),
      updated_at: new Date().toISOString()
    };
    store.users_by_key = usersByKey;

    // One-time migration: legacy store.answers -> per-user store for first user.
    const legacy = store.answers && typeof store.answers === 'object' ? store.answers : null;
    const hasLegacy = legacy && Object.keys(legacy).length > 0;
    const answersByChat = store.answers_by_chat && typeof store.answers_by_chat === 'object'
      ? store.answers_by_chat
      : {};
    const hasPerUser = Object.keys(answersByChat).length > 0;
    const otherUsers = Object.keys(users).filter((k) => k !== id);
    if (hasLegacy && !hasPerUser && otherUsers.length === 0) {
      answersByChat[id] = legacy;
      store.answers_by_chat = answersByChat;
      store.answers = {};
      store.migrations = store.migrations || {};
      store.migrations.legacy_answers_to_answers_by_chat = new Date().toISOString();
    }

    // Migration: answers_by_chat[chatId] -> answers_by_key[userKey]
    const answersByKey = store.answers_by_key && typeof store.answers_by_key === 'object' ? store.answers_by_key : {};
    const chatAnswers = answersByChat[id] && typeof answersByChat[id] === 'object' ? answersByChat[id] : null;
    const keyAnswers = answersByKey[userKey] && typeof answersByKey[userKey] === 'object' ? answersByKey[userKey] : null;
    if (chatAnswers && (!keyAnswers || Object.keys(keyAnswers).length === 0)) {
      answersByKey[userKey] = chatAnswers;
      store.answers_by_key = answersByKey;
      store.migrations = store.migrations || {};
      store.migrations.answers_by_chat_to_answers_by_key = store.migrations.answers_by_chat_to_answers_by_key || {};
      store.migrations.answers_by_chat_to_answers_by_key[id] = new Date().toISOString();
    }

    saveStore_(store);
  } catch (e) {
    Logger.log('registerUser Error: ' + e);
  }
}

function getUserKey(chatId) {
  const id = String(chatId || '').trim();
  if (!id) return '';
  try {
    registerUser(id, '');
    const store = loadStore_();
    const user = (store.users || {})[id] || {};
    return String(user.user_key || '');
  } catch (_) {
    return '';
  }
}

function getChatIdByUserKey(userKey) {
  const k = String(userKey || '').trim();
  if (!k) return '';
  try {
    const store = loadStore_();
    const keys = store.user_keys && typeof store.user_keys === 'object' ? store.user_keys : {};
    return String(keys[k] || '');
  } catch (_) {
    return '';
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
    if (typeof fruits_sendMessage_ === 'function') {
      return fruits_sendMessage_(chatId, text);
    }
    if (typeof AOS_tgSendMarkdown_ === 'function') {
      return AOS_tgSendMarkdown_({ telegram: { tokenProp: 'FRUITS_BOT_TOKEN' } }, chatId, text);
    }
    const url = `https://api.telegram.org/bot${getBotToken()}/sendMessage`;
    return UrlFetchApp.fetch(url, {
      method: 'post',
      payload: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
      headers: { 'Content-Type': 'application/json' },
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('sendMessage Error: ' + e);
    return null;
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
    answers_by_chat: {},
    answers_by_key: {},
    users: {},
    users_by_key: {},
    user_keys: {},
    logs: [],
    updated_at: new Date().toISOString()
  };
  return folder.createFile(name, JSON.stringify(seed, null, 2), MimeType.PLAIN_TEXT);
}

function loadStore_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) {
    throw new Error('store locked');
  }
  try {
    const file = getStoreFile_();
    const raw = file.getBlob().getDataAsString();
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed.answers) parsed.answers = {};
    if (!parsed.answers_by_chat) parsed.answers_by_chat = {};
    if (!parsed.answers_by_key) parsed.answers_by_key = {};
    if (!parsed.users) parsed.users = {};
    if (!parsed.users_by_key) parsed.users_by_key = {};
    if (!parsed.user_keys) parsed.user_keys = {};
    if (!parsed.logs) parsed.logs = [];
    return parsed;
  } finally {
    lock.releaseLock();
  }
}

function saveStore_(store) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) {
    throw new Error('store locked');
  }
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
