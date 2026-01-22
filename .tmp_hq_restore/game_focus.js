/*******************************
 * αOS FOCUS MAP CENTRE – Code.gs
 * 100 % live-ready | Dezember 2025
 *******************************/

const FOCUS_ROOT_HTML = 'Game_Focus_Centre';        // Haupt-HTML
const FOCUS_CENTRE_LABEL = 'Focus';
const FOCUS_CENTRE_KEY = 'FOC';

// Ordner & Sheet IDs (pro User)
const FOCUS_FOLDER_PROP = 'FOCUS_DRIVE_FOLDER_ID';
const FOCUS_SHEET_PROP = 'FOCUS_LOG_SHEET_ID';

// Optional: Obsidian Vault-Name (genau so wie dein Vault-Ordner in Drive heißt)
const OBSIDIAN_VAULT_NAME = 'Alpha_Game';   // ← anpassen, falls anders

function renderFocusPage_() {
  return HtmlService.createTemplateFromFile(FOCUS_ROOT_HTML)
    .evaluate()
    .setTitle('αOS – Focus Map')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ========== DRIVE & LOGGING ==========
function getFocusFolder() {
  let folderId = gameGetUserProp_(FOCUS_FOLDER_PROP);
  if (folderId) {
    try { return DriveApp.getFolderById(folderId); } catch(e) {}
  }

  const gameRoot = gameGetAlphaGameRoot_();

  const it = gameRoot.getFoldersByName('Alpha_Focus');
  const folder = it.hasNext() ? it.next() : gameRoot.createFolder('Alpha_Focus');

  // Subfolder für Current / Q1–Q4
  ['Current', 'Q1', 'Q2', 'Q3', 'Q4'].forEach(name => {
    if (!folder.getFoldersByName(name).hasNext()) {
      folder.createFolder(name);
    }
  });

  gameSetUserProp_(FOCUS_FOLDER_PROP, folder.getId());
  return folder;
}

function getFocusLogSheet() {
  let sheetId = gameGetUserProp_(FOCUS_SHEET_PROP);
  if (sheetId) {
    try {
      const ss = SpreadsheetApp.openById(sheetId);
      let sheet = ss.getSheetByName('Logs');
      if (!sheet) sheet = ss.insertSheet('Logs');
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['SessionID','Timestamp','Domain','Month','File','URL','Type','Obsidian']);
      }
      return sheet;
    } catch(e) {}
  }

  const ss = SpreadsheetApp.create('Alpha_Focus_Logsheet');
  gameSetUserProp_(FOCUS_SHEET_PROP, ss.getId());
  const sheet = ss.getSheets()[0];
  sheet.setName('Logs');
  sheet.appendRow(['SessionID','Timestamp','Domain','Month','File','URL','Type','Obsidian']);
  return sheet;
}

function focusGenerateSessionId_() {
  return gameGenerateSessionId_(FOCUS_CENTRE_KEY);
}

// NEU → direkt auf Alpha_Game zugreifen (dein echter Vault)
function getObsidianVaultFolder() {
  const it = DriveApp.getFoldersByName('Alpha_Game');
  if (!it.hasNext()) {
    // Falls noch nicht existiert (unmöglich bei dir
    return DriveApp.createFolder('Alpha_Game');
  }
  return it.next(); // ← das ist dein Vault, 1:1
}

// Und saveToObsidian leicht angepasst:
function saveToObsidian(mdContent, filename, subfolder = '3_FOCUS') {
  try {
    const vault = getObsidianVaultFolder(); // ← direkt Alpha_Game
    let folder = vault;

    if (subfolder) {
      subfolder.split('/').forEach(part => {
        if (part) {
          let it = folder.getFoldersByName(part);
          folder = it.hasNext() ? it.next() : folder.createFolder(part);
        }
      });
    }

    const cleanName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalName = Utilities.formatDate(new Date(), 'GMT+1', 'yyyy-MM-dd') + '_' + cleanName + '.md';
    
    // Vermeidet Überschreiben, aber bleibt sortierbar
    const file = folder.createFile(finalName, mdContent, MimeType.PLAIN_TEXT);
    
    return { success: true, url: file.getUrl(), name: finalName };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
// ========== SAVE FOCUS ENTRY ==========
function saveFocusEntry(domain, mission, month = "Current Month", type = "current") {
  if (!mission.habits || !mission.routines || !mission.additions || !mission.eliminations) {
    return { ok: false, error: 'Alle vier Pfeiler müssen gefüllt sein.' };
  }

  const sessionId = focusGenerateSessionId_();
  const folder = getFocusFolder();
  const targetFolder = gameGetOrCreateSubfolder_(folder, type === 'current' ? 'Current' : type.toUpperCase());

  const header = [
    `# FOCUS MAP – ${domain}`,
    '## MONTHLY MISSION',
    `**Month:** ${month}`,
    `**Session:** ${sessionId}`,
    `**Date:** ${new Date().toLocaleDateString('de-DE')}`,
    '',
    '### HABITS', mission.habits,
    '', '### ROUTINES', mission.routines,
    '', '### ADDITIONS', mission.additions,
    '', '### ELIMINATIONS', mission.eliminations,
    '', '---', ''
  ].join('\n');

  const filename = `${sessionId}_${type}_${domain}`;
  const file = targetFolder.createFile(filename + '.md', header, MimeType.PLAIN_TEXT);

  // Obsidian Sync
  const obsResult = saveToObsidian(header, filename, '3_FOCUS');

  // Log
  getFocusLogSheet().appendRow([
    sessionId,
    new Date(),
    domain,
    month,
    file.getName(),
    file.getUrl(),
    type,
    obsResult.success ? obsResult.name : 'FAILED'
  ]);

  return {
    ok: true,
    sessionId,
    domain,
    month,
    type,
    file: { url: file.getUrl(), name: file.getName() },
    obsidian: obsResult.success ? obsResult.url : null
  };
}

// ========== INIT (einmal ausführen) ==========
function initFocusSystem() {
  const folder = getFocusFolder();
  const sheet = getFocusLogSheet();
  return {
    message: 'αOS Focus Map Centre.',
    folderUrl: folder.getUrl(),
    sheetUrl: sheet.getParent().getUrl()
  };
}

// =====================================================
// Telegram Bot Handler
// =====================================================
function focus_handleTelegramMessage_(message) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim().toLowerCase();
  if (!text) return false;

  if (text === '/focus') {
    const webUrl = PropertiesService.getScriptProperties().getProperty('FOCUS_WEBAPP_URL') || ScriptApp.getService().getUrl();
    focus_sendMessage_(chatId,
      '🎯 *FOCUS MAP*\n\n' +
      'Monthly mission - What do I need to do to stay on track?\n\n' +
      '/focusweb - Open Focus Centre'
    );
    return true;
  }

  if (text === '/focusweb') {
    const webUrl = PropertiesService.getScriptProperties().getProperty('FOCUS_WEBAPP_URL') || ScriptApp.getService().getUrl();
    focus_sendMessage_(chatId, `🎯 Focus Centre: ${webUrl}?page=focus`);
    return true;
  }

  return false;
}

function focus_sendMessage_(chatId, text) {
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
