
/*******************************
 * αOS FRAME MAP CENTRE – FINAL
 * Pro-User Drive + Logging
 *******************************/

const FRAME_ROOT_HTML = 'Game_Frame_Index';
const FRAME_CENTRE_LABEL = 'Frame';
const FRAME_CENTRE_KEY = 'FRM';

const FRAME_FOLDER_PROP = 'FRAME_DRIVE_FOLDER_ID';
const FRAME_SHEET_PROP  = 'FRAME_LOG_SHEET_ID';

function renderFramePage_() {
  const t = HtmlService.createTemplateFromFile(FRAME_ROOT_HTML);
  return t.evaluate()
    .setTitle('αOS – ' + FRAME_CENTRE_LABEL)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ---------- Korrekte Alpha_Game/Frame Ordnerlogik ----------
function getFrameFolder() {
  let folderId = gameGetUserProp_(FRAME_FOLDER_PROP);
  let folder;

  if (folderId) {
    try {
      folder = DriveApp.getFolderById(folderId);  // ← HIER WAR DER FEHLER!
      folder.getName(); // sanity check
      return folder;
    } catch (e) {
      Logger.log('Frame-Folder-ID ungültig → neu anlegen');
    }
  }

  // 1. Alpha_Game Ordner
  let parent = gameGetAlphaGameRoot_();

  // 2. Frame Ordner darin
  const frameIt = parent.getFoldersByName('Frame');
  folder = frameIt.hasNext() ? frameIt.next() : parent.createFolder('Frame');

  gameSetUserProp_(FRAME_FOLDER_PROP, folder.getId());
  return folder;
}

// ---------- Log-Sheet ----------
function getFrameLogSheet() {
  let sheetId = gameGetUserProp_(FRAME_SHEET_PROP);
  if (sheetId) {
    try {
      const ss = SpreadsheetApp.openById(sheetId);
      const sheet = ss.getSheetByName('Logs') || ss.insertSheet('Logs');
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['SessionID','Timestamp','Domain','File','URL','Status']);
      }
      return sheet;
    } catch (e) {}
  }

  const ss = SpreadsheetApp.create('Alpha_Frame_Logsheet');
  gameSetUserProp_(FRAME_SHEET_PROP, ss.getId());
  const sheet = ss.getSheets()[0];
  sheet.setName('Logs');
  sheet.appendRow(['SessionID','Timestamp','Domain','File','URL','Status']);
  return sheet;
}

// ---------- Session ID ----------
function frameGenerateSessionId_() {
  return gameGenerateSessionId_(FRAME_CENTRE_KEY);
}

// ---------- Save Frame Entry ----------
function saveFrameEntry(domain, answers) {
  if (!domain || !answers || !answers.whereNow) {
    return { ok: false, error: 'Ungültige Eingabe – Where am I now? erforderlich' };
  }

  const sessionId = frameGenerateSessionId_();
  const mdLines = [
    '**1. Where am I now?**',
    answers.whereNow || '-',
    '',
    '**2. How did I get here?**',
    answers.howGotHere || '-',
    '',
    '**3. How do I feel about where I am?**',
    answers.howFeel || '-',
    '',
    '**4. What is working?**',
    answers.whatWorking || '-',
    '',
    '**5. What is not working?**',
    answers.whatNotWorking || '-'
  ];

  const payload = {
    sessionId: sessionId,
    domain: domain,
    markdown: mdLines.join('\n')
  };

  const folder = getFrameFolder();
  const framesFolder = gameGetOrCreateSubfolder_(folder, 'Frames');

  const header = [
    `# FRAME MAP – ${domain}`,
    `**Session:** ${sessionId}`,
    `**Datum:** ${new Date().toLocaleDateString('de-DE')}`,
    '',
    '---',
    ''
  ].join('\n');

  const fullMd = header + payload.markdown;
  const filename = `${sessionId}_${domain}.md`;
  const file = framesFolder.createFile(filename, fullMd, MimeType.PLAIN_TEXT);

  getFrameLogSheet().appendRow([
    sessionId,
    new Date(),
    domain,
    file.getName(),
    file.getUrl(),
    'gespeichert'
  ]);

  return {
    ok: true,
    sessionId: sessionId,
    domain: domain,
    file: { url: file.getUrl(), name: file.getName() }
  };
}

// ---------- Init ----------
function initFrameSystem() {
  const folder = getFrameFolder();
  const sheet = getFrameLogSheet();
  return {
    folderUrl: folder.getUrl(),
    sheetUrl: sheet.getParent().getUrl(),
    message: 'Frame Centre vollständig eingerichtet – pro User.'
  };
}
// ---------- Test & Query ----------
function testFrameSave(domain = 'Body') {
  const answers = {
    whereNow: 'Test Position',
    howGotHere: 'Test Path',
    howFeel: 'Test Feeling',
    whatWorking: 'Test Wins',
    whatNotWorking: 'Test Fails'
  };
  return saveFrameEntry(domain, answers);
}

function getRecentFrames(limit = 5) {
  const sheet = getFrameLogSheet();
  const data = sheet.getDataRange().getValues();
  const recent = data.slice(-limit).map(row => ({
    session: row[0],
    time: row[1],
    domain: row[2],
    url: row[4]
  }));
  return recent;
}

// =====================================================
// Telegram Bot Handler
// =====================================================
function frame_handleTelegramMessage_(message) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim().toLowerCase();
  if (!text) return false;

  if (text === '/frame') {
    const webUrl = PropertiesService.getScriptProperties().getProperty('FRAME_WEBAPP_URL') || ScriptApp.getService().getUrl();
    frame_sendMessage_(chatId,
      '🗺️ *FRAME MAP*\n\n' +
      'Where am I now?\n\n' +
      '/frameweb - Open Frame Centre\n' +
      '/framerecent - Show recent Frames'
    );
    return true;
  }

  if (text === '/frameweb') {
    const webUrl = PropertiesService.getScriptProperties().getProperty('FRAME_WEBAPP_URL') || ScriptApp.getService().getUrl();
    frame_sendMessage_(chatId, `🗺️ Frame Centre: ${webUrl}?page=frame`);
    return true;
  }

  if (text === '/framerecent') {
    try {
      const recent = getRecentFrames(5);
      let msg = '🗺️ *Recent Frames*\n\n';
      recent.forEach(r => {
        msg += `• ${r.domain} - ${r.session}\n`;
      });
      frame_sendMessage_(chatId, msg);
    } catch (e) {
      frame_sendMessage_(chatId, `❌ Error: ${e}`);
    }
    return true;
  }

  return false;
}

function frame_sendMessage_(chatId, text) {
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
