// Drive storage for gas-game-dev.

var GAME_CONFIG = {
  BASE_FOLDER_PROP: "GAME_DRIVE_FOLDER_ID",
  BASE_FOLDER_NAME: "Alpha_Game_Standalone"
};

function gameGetBaseFolder_() {
  const folderId = String(gameGetProp_(GAME_CONFIG.BASE_FOLDER_PROP) || "").trim();
  if (folderId) {
    try {
      const folder = DriveApp.getFolderById(folderId);
      folder.getName();
      return folder;
    } catch (_) {
      // fall through to recreate
    }
  }

  const it = DriveApp.getFoldersByName(GAME_CONFIG.BASE_FOLDER_NAME);
  const folder = it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder(GAME_CONFIG.BASE_FOLDER_NAME);
  gameSetProp_(GAME_CONFIG.BASE_FOLDER_PROP, folder.getId());
  return folder;
}

function gameGetOrCreateSubfolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function gameGenerateSessionId_(prefix) {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  return String(prefix || "GAME") + "-" + stamp;
}

function gameFindFileByName_(folder, name) {
  const it = folder.getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}

function gameUpsertTextFile_(folder, name, content) {
  const file = gameFindFileByName_(folder, name);
  if (file) {
    file.setContent(String(content || ""));
    return file;
  }
  return folder.createFile(String(name || "untitled.txt"), String(content || ""), MimeType.PLAIN_TEXT);
}

function gameGetUsersFolder_() {
  return gameGetOrCreateSubfolder_(gameGetBaseFolder_(), "Users");
}

function gameGetWorkspaceFolder_(userKey) {
  const key = game_normalizeUserKey_(userKey || game_getActiveUserKey_());
  if (!key) return null;
  if (typeof game_requireRegisteredUserKey_ === "function") {
    game_requireRegisteredUserKey_(key);
  }
  return gameGetOrCreateSubfolder_(gameGetUsersFolder_(), key);
}

function gameEnsureWorkspaceFolders_() {
  const root = gameGetWorkspaceFolder_();
  if (!root) throw new Error("workspace missing (userKey)");

  // Centres
  gameGetOrCreateSubfolder_(root, "Frame");
  gameGetOrCreateSubfolder_(root, "Freedom");
  gameGetOrCreateSubfolder_(root, "Focus");
  gameGetOrCreateSubfolder_(root, "Fire");
  return { ok: true };
}

function gameGetCentreFolder_(centreName) {
  const root = gameGetWorkspaceFolder_();
  if (!root) throw new Error("workspace missing (userKey)");
  return gameGetOrCreateSubfolder_(root, String(centreName || "").trim() || "Game");
}
