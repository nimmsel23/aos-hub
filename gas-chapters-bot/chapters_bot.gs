// GAS Chapters Bot
// Sends one markdown file per day to a Telegram chat.

const PROP_FOLDER_ID = "CHAPTERS_FOLDER_ID";
const PROP_BOT_TOKEN = "TELEGRAM_BOT_TOKEN";
const PROP_CHAT_ID = "TELEGRAM_CHAT_ID";
const PROP_LAST_SENT = "LAST_SENT_FILE_ID";

function setupDailyTrigger() {
  // Create a daily trigger at 09:00 in the script's timezone.
  ScriptApp.newTrigger("sendNextChapter")
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();
}

function sendNextChapter() {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty(PROP_FOLDER_ID);
  const token = props.getProperty(PROP_BOT_TOKEN);
  const chatId = props.getProperty(PROP_CHAT_ID);

  if (!folderId || !token || !chatId) {
    throw new Error("Missing CHAPTERS_FOLDER_ID, TELEGRAM_BOT_TOKEN, or TELEGRAM_CHAT_ID");
  }

  const files = listChapterFiles_(folderId);
  if (!files.length) {
    throw new Error("No chapter files found in folder");
  }

  const lastSentId = props.getProperty(PROP_LAST_SENT) || "";
  const next = pickNextFile_(files, lastSentId);

  const text = getFileText_(next.id);
  sendTelegramMarkdown_(token, chatId, text);

  props.setProperty(PROP_LAST_SENT, next.id);
}

function listChapterFiles_(folderId) {
  const folder = DriveApp.getFolderById(folderId);
  const iter = folder.getFiles();
  const files = [];
  while (iter.hasNext()) {
    const f = iter.next();
    // Skip non-text files by simple extension check.
    const name = f.getName();
    if (name.toLowerCase().endsWith(".md") || name.toLowerCase().endsWith(".markdown")) {
      files.push({
        id: f.getId(),
        name: name,
      });
    }
  }
  files.sort((a, b) => a.name.localeCompare(b.name));
  return files;
}

function pickNextFile_(files, lastSentId) {
  if (!lastSentId) {
    return files[0];
  }
  const idx = files.findIndex((f) => f.id === lastSentId);
  if (idx === -1 || idx === files.length - 1) {
    return files[0];
  }
  return files[idx + 1];
}

function getFileText_(fileId) {
  const file = DriveApp.getFileById(fileId);
  return file.getBlob().getDataAsString();
}

function sendTelegramMarkdown_(token, chatId, text) {
  const chunks = chunkTelegram_(text, 3800);
  for (const chunk of chunks) {
    const payload = {
      chat_id: chatId,
      text: chunk,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    };
    const res = UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + token + "/sendMessage",
      {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      }
    );
    const code = res.getResponseCode();
    if (code < 200 || code >= 300) {
      throw new Error("Telegram send failed: " + code + " " + res.getContentText());
    }
  }
}

function chunkTelegram_(text, maxLen) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf("\n", maxLen);
    if (cut < 100) {
      cut = maxLen;
    }
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  if (remaining) {
    chunks.push(remaining);
  }
  return chunks;
}
