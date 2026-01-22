/*******************************
 * αOS Freedom Centre – The Vision
 * Pro-User Drive + Eternal Log
 * (Deploy: Execute as the Warrior Accessing the Web App)
 *******************************/

const FREEDOM_ROOT_HTML = 'Game_Freedom_Index';
const FREEDOM_CENTRE_LABEL = 'Freedom';
const FREEDOM_CENTRE_KEY = 'FRE';

const FREEDOM_FOLDER_PROP = 'FREEDOM_DRIVE_FOLDER_ID';
const FREEDOM_SHEET_PROP = 'FREEDOM_LOG_SHEET_ID';

function renderFreedomPage_() {
  const t = HtmlService.createTemplateFromFile(FREEDOM_ROOT_HTML);
  return t.evaluate()
    .setTitle('αOS – ' + FREEDOM_CENTRE_LABEL)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ---------- Freedom Ordner: Alpha_Game/Freedom ----------
function getFreedomFolder() {
  let folderId = gameGetUserProp_(FREEDOM_FOLDER_PROP);
  let folder;

  if (folderId) {
    try {
      folder = DriveApp.getFolderById(folderId);
      folder.getName();
      return folder;
    } catch (e) {
      Logger.log('Freedom-Folder-ID ungültig → neu anlegen');
    }
  }

  let parent = gameGetAlphaGameRoot_();

  const freedomIt = parent.getFoldersByName('Freedom');
  folder = freedomIt.hasNext() ? freedomIt.next() : parent.createFolder('Freedom');

  gameSetUserProp_(FREEDOM_FOLDER_PROP, folder.getId());
  return folder;
}

// ---------- Log Sheet ----------
function getFreedomLogSheet() {
  let sheetId = gameGetUserProp_(FREEDOM_SHEET_PROP);
  if (sheetId) {
    try {
      const ss = SpreadsheetApp.openById(sheetId);
      const sheet = ss.getSheetByName('Logs') || ss.insertSheet('Logs');
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['SessionID','Timestamp','Domain','File','URL','Type','Period']);
      }
      return sheet;
    } catch (e) {}
  }

  const ss = SpreadsheetApp.create('Alpha_Freedom_Logsheet');
  gameSetUserProp_(FREEDOM_SHEET_PROP, ss.getId());
  const sheet = ss.getSheets()[0];
  sheet.setName('Logs');
  sheet.appendRow(['SessionID','Timestamp','Domain','File','URL','Type','Period']);
  return sheet;
}

// ---------- Session ID ----------
function freedomGenerateSessionId_() {
  return gameGenerateSessionId_(FREEDOM_CENTRE_KEY);
}

// ---------- SAVE FREEDOM ENTRY (10-Year + Annual) ----------
function saveFreedomEntry(domain, vision, period = "2035", type = "10Year") {
  if (!vision?.trim()) {
    return { ok: false, error: 'Vision empty' };
  }

  const sessionId = freedomGenerateSessionId_();
  const folder = getFreedomFolder();
  const targetFolder = gameGetOrCreateSubfolder_(folder, type === "10Year" ? "10Year_IPW" : "Annual");

  const header = [
    `# FREEDOM MAP – ${domain}`,
    type === "10Year" ? '## 10-YEAR IDEAL PARALLEL WORLD' : '## ANNUAL FREEDOM MAP',
    `**Period:** ${period}`,
    `**Session:** ${sessionId}`,
    `**Date:** ${new Date().toLocaleDateString('de-DE')}`,
    '',
    '---',
    ''
  ].join('\n');

  const fullMd = header + vision.trim();
  const filename = `${sessionId}_${type}_${domain}.md`;
  const file = targetFolder.createFile(filename, fullMd, MimeType.PLAIN_TEXT);

  // Log
  getFreedomLogSheet().appendRow([
    sessionId,
    new Date(),
    domain,
    file.getName(),
    file.getUrl(),
    type,
    period
  ]);

  return {
    ok: true,
    sessionId,
    domain,
    period,
    type,
    file: { url: file.getUrl(), name: file.getName() }
  };
}

// ---------- Init ----------
function initFreedomSystem() {
  const folder = getFreedomFolder();
  const sheet = getFreedomLogSheet();
  return {
    folderUrl: folder.getUrl(),
    sheetUrl: sheet.getParent().getUrl(),
    message: 'αOS Freedom Centre ready – Your vision is eternal.'
  };
}

// =====================================================
// Telegram Bot Handler
// =====================================================
function freedom_handleTelegramMessage_(message) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim().toLowerCase();
  if (!text) return false;

  if (text === '/freedom') {
    const webUrl = PropertiesService.getScriptProperties().getProperty('FREEDOM_WEBAPP_URL') || ScriptApp.getService().getUrl();
    freedom_sendMessage_(chatId,
      '🗺️ *FREEDOM MAP*\n\n' +
      'Annual vision - Where do I want to be?\n\n' +
      '/freedomweb - Open Freedom Centre'
    );
    return true;
  }

  if (text === '/freedomweb') {
    const webUrl = PropertiesService.getScriptProperties().getProperty('FREEDOM_WEBAPP_URL') || ScriptApp.getService().getUrl();
    freedom_sendMessage_(chatId, `🗺️ Freedom Centre: ${webUrl}?page=freedom`);
    return true;
  }

  return false;
}

function freedom_sendMessage_(chatId, text) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GAME_BOT_TOKEN') || props.getProperty('BOT_TOKEN');
  if (!token) return;

  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' }),
    muteHttpExceptions: true
  });
}
