/*******************************
 * αOS Voice Centre — GAS Backend (inline)
 * Uses alphaos_centre_utils if available.
 *******************************/

const VOICE_CENTRE_LABEL = 'Voice';
const VOICE_CENTRE_KEY = 'VOI';
const VOICE_FOLDER_PROP = 'VOICE_DRIVE_FOLDER_ID';
const VOICE_SHEET_PROP = 'VOICE_LOG_SHEET_ID';

function renderVoicePage_() {
  const t = HtmlService.createTemplateFromFile('voicecentre');
  t.clientConfig = {
    centreLabel: VOICE_CENTRE_LABEL,
    centreKey: VOICE_CENTRE_KEY,
    build: 'inline',
    ts: new Date().toISOString()
  };

  const page = t.evaluate().setTitle('αOS — Voice');
  if (HtmlService.XFrameOptionsMode) {
    const mode = HtmlService.XFrameOptionsMode.ALLOWALL;
    if (mode) page.setXFrameOptionsMode(mode);
  }
  return page;
}

// Minimal API ping (debug)
function voice_apiPing() {
  const checks = {
    voicecentre: true,
    voiceStyles: true,
    voiceMarkdown: true,
    voiceClientJs: true,
    modalStyles: true,
    modal: true,
    modalJs: true
  };

  try { HtmlService.createHtmlOutputFromFile('voicecentre'); } catch (e) { checks.voicecentre = String(e); }
  try { HtmlService.createHtmlOutputFromFile('voice_styles'); } catch (e) { checks.voiceStyles = String(e); }
  try { HtmlService.createHtmlOutputFromFile('voice_markdown'); } catch (e) { checks.voiceMarkdown = String(e); }
  try { HtmlService.createHtmlOutputFromFile('voice_client_js'); } catch (e) { checks.voiceClientJs = String(e); }
  try { HtmlService.createHtmlOutputFromFile('modal_styles'); } catch (e) { checks.modalStyles = String(e); }
  try { HtmlService.createHtmlOutputFromFile('modal'); } catch (e) { checks.modal = String(e); }
  try { HtmlService.createHtmlOutputFromFile('modal_js'); } catch (e) { checks.modalJs = String(e); }

  return { ok: true, when: new Date().toISOString(), checks };
}

// =====================================================
// Telegram Bot Handler
// =====================================================
function voice_handleTelegramMessage_(message) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim();
  if (!text) return false;

  if (text === '/voice') {
    const webUrl = PropertiesService.getScriptProperties().getProperty('VOICE_WEBAPP_URL')
      || ScriptApp.getService().getUrl() + '?page=voice';

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💾 Save Session', callback_data: 'voice:save' },
          { text: '📋 List Sessions', callback_data: 'voice:list' }
        ],
        [
          { text: '🌐 Open WebApp', web_app: { url: webUrl } }
        ]
      ]
    };

    voice_sendMessage_(chatId,
      '🎙️ *VOICE Centre*\n\n' +
      'Mental Mastery - STOP→SUBMIT→STRUGGLE→STRIKE\n\n' +
      'Commands:\n' +
      '/voicesave - Save last message as VOICE session\n' +
      '/voiceweb - Open WebApp\n\n' +
      '_Oder sende mir direkt deinen VOICE Session Markdown Text._',
      keyboard
    );
    return true;
  }

  if (text === '/voiceweb') {
    const webUrl = PropertiesService.getScriptProperties().getProperty('VOICE_WEBAPP_URL') || ScriptApp.getService().getUrl();
    voice_sendMessage_(chatId, `🎙️ VOICE Centre: ${webUrl}?page=voice`);
    return true;
  }

  if (text === '/voicesave') {
    voice_sendMessage_(chatId, '⚠️ Reply to a message to save it as VOICE session');
    return true;
  }

  // Save replied message as VOICE session
  if (message.reply_to_message && message.reply_to_message.text && text === '/voicesave') {
    const markdown = message.reply_to_message.text;
    const filename = 'VoiceSession_' + new Date().toISOString().slice(0,10);
    try {
      const result = VOI_saveSessionWeb(markdown, filename);
      if (result.ok) {
        voice_sendMessage_(chatId, `✅ VOICE session saved\n${result.url || ''}`);
      } else {
        voice_sendMessage_(chatId, `❌ Save failed: ${result.error}`);
      }
    } catch (e) {
      voice_sendMessage_(chatId, `❌ Error: ${e}`);
    }
    return true;
  }

  return false;
}

function voice_sendMessage_(chatId, text, keyboard) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('VOICE_BOT_TOKEN') || props.getProperty('BOT_TOKEN');
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
// Web endpoints (called by voice_client_js)
// =====================================================
function VOI_saveSessionWeb(markdown, filename) {
  const md = String(markdown || '').trim();
  if (!md) return { ok: false, error: 'Empty markdown' };

  const name = String(filename || '').trim() ||
    ('VoiceSession_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-'));

  if (typeof VOI_saveSession === 'function') {
    return VOI_saveSession(md, { title: name, source: 'webapp', type: 'voice_session' });
  }

  const folder = voice_getFolder_();
  const file = folder.createFile(name + '.md', md, MimeType.PLAIN_TEXT);

  try {
    const sheet = voice_getLogSheet_();
    sheet.appendRow([
      'VOI-' + Utilities.getUuid().slice(0, 8),
      new Date(),
      'Session',
      file.getName(),
      file.getUrl(),
      md.length,
      md.slice(0, 140)
    ]);
  } catch (e) {
    Logger.log('Voice log append failed: ' + String(e));
  }

  return { ok: true, file: { name: file.getName(), url: file.getUrl(), id: file.getId() } };
}

function VOI_saveStepWeb(tool, markdown) {
  const t = String(tool || '').trim();
  const md = String(markdown || '').trim();
  if (!t || !md) return { ok: false, error: 'Tool or markdown missing' };

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const name = `VOI_${t}_${stamp}`;

  if (typeof VOI_saveSession === 'function') {
    return VOI_saveSession(md, { title: name, source: 'webapp', type: 'voice_step', step: t });
  }

  const folder = voice_getFolder_();
  const file = folder.createFile(name + '.md', md, MimeType.PLAIN_TEXT);

  try {
    const sheet = voice_getLogSheet_();
    sheet.appendRow([
      'VOI-' + Utilities.getUuid().slice(0, 8),
      new Date(),
      t,
      file.getName(),
      file.getUrl(),
      md.length,
      md.slice(0, 140)
    ]);
  } catch (e) {
    Logger.log('Voice log append failed (step): ' + String(e));
  }

  return { ok: true, file: { name: file.getName(), url: file.getUrl(), id: file.getId() } };
}

// Legacy aliases (older clients)
function saveVoiceSessionToDrive(mdContent, filename) {
  return VOI_saveSessionWeb(mdContent, filename);
}

function saveVoiceStep(tool, markdown) {
  return VOI_saveStepWeb(tool, markdown);
}

// =====================================================
// Fallback storage helpers (per-user)
// =====================================================
function voice_getFolder_() {
  const props = PropertiesService.getUserProperties();
  const folderId = props.getProperty(VOICE_FOLDER_PROP);
  if (folderId) {
    try {
      const f = DriveApp.getFolderById(folderId);
      f.getName();
      return f;
    } catch (e) {
      Logger.log('Voice folder invalid: ' + String(e));
    }
  }

  const name = 'Alpha_Voice';
  const it = DriveApp.getFoldersByName(name);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(name);
  props.setProperty(VOICE_FOLDER_PROP, folder.getId());
  return folder;
}

function voice_getLogSheet_() {
  const props = PropertiesService.getUserProperties();
  const sheetId = props.getProperty(VOICE_SHEET_PROP);
  if (sheetId) {
    try {
      const ss = SpreadsheetApp.openById(sheetId);
      const sh = ss.getSheetByName('Logs') || ss.insertSheet('Logs');
      if (sh.getLastRow() === 0) {
        sh.appendRow(['SessionID','Timestamp','Tool','File Name','Drive URL','Characters','Preview']);
      }
      return sh;
    } catch (e) {
      Logger.log('Voice sheet invalid: ' + String(e));
    }
  }

  const ss = SpreadsheetApp.create('Alpha_Voice_Logsheet');
  props.setProperty(VOICE_SHEET_PROP, ss.getId());
  const sh = ss.getSheets()[0];
  sh.setName('Logs');
  sh.appendRow(['SessionID','Timestamp','Tool','File Name','Drive URL','Characters','Preview']);
  return sh;
}

// Optional init helper
function initVoiceSystem() {
  const out = { ok: true, notes: [] };
  if (typeof VOI_init === 'function') {
    VOI_init();
    out.notes.push('VOI_init() executed.');
  } else {
    out.notes.push('VOI_init() not found (fallback mode active).');
  }
  return out;
}

/**
 * Get Voice Session statistics for a specific week
 * @param {string} weekKey - Format: YYYY_WW (e.g., "2025_02")
 * @returns {object} { ok, week, count, sessions }
 */
function voice_getWeekSessions(weekKey) {
  if (!weekKey) return { ok: false, error: 'weekKey required' };

  // Parse week key
  const parts = weekKey.split('_');
  if (parts.length !== 2) return { ok: false, error: 'Invalid weekKey format (expected YYYY_WW)' };

  const year = parseInt(parts[0]);
  const week = parseInt(parts[1]);

  // Calculate week start/end dates (same logic as door)
  const weekStart = voice_getWeekStartDate_(year, week);
  const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));

  try {
    const sheet = voice_getLogSheet_();
    const data = sheet.getDataRange().getValues();

    // Skip header row
    const sessions = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const timestamp = row[1]; // Column B: Timestamp

      if (timestamp instanceof Date) {
        if (timestamp >= weekStart && timestamp < weekEnd) {
          sessions.push({
            sessionId: row[0],
            timestamp: timestamp,
            tool: row[2],
            fileName: row[3],
            url: row[4]
          });
        }
      }
    }

    return {
      ok: true,
      week: weekKey,
      count: sessions.length,
      sessions: sessions
    };
  } catch (e) {
    Logger.log('voice_getWeekSessions error: ' + e);
    return { ok: false, error: e.toString() };
  }
}

/**
 * Get week start date (Monday) from year and ISO week number
 */
function voice_getWeekStartDate_(year, week) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay();
  const isoWeekStart = simple;

  if (dayOfWeek <= 4) {
    isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }

  return isoWeekStart;
}
