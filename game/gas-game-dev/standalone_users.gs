// ================================================================
// Game Standalone: Anonymous multi-user keys (?k=...)
// Storage is scoped to Users/<key>/... under the base Drive folder.
// ================================================================

var GAME_ACTIVE_USER_KEY = "";

function game_normalizeUserKey_(userKey) {
  const key = String(userKey || "").trim();
  if (!key) return "";
  return key.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function game_setActiveUserKey_(userKey) {
  GAME_ACTIVE_USER_KEY = game_normalizeUserKey_(userKey);
}

function game_getActiveUserKey_() {
  return GAME_ACTIVE_USER_KEY || "";
}

function game_withUserKey_(userKey, fn) {
  const key = game_normalizeUserKey_(userKey);
  game_setActiveUserKey_(key);
  try {
    return fn();
  } finally {
    game_setActiveUserKey_("");
  }
}

function game_getUsersFile_() {
  const base = gameGetBaseFolder_();
  const name = "game_users.json";
  const it = base.getFilesByName(name);
  if (it.hasNext()) return it.next();
  const seed = { users: {}, updated_at: new Date().toISOString() };
  return base.createFile(name, JSON.stringify(seed, null, 2), MimeType.PLAIN_TEXT);
}

function game_loadUsers_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) throw new Error("game_users locked");
  try {
    const file = game_getUsersFile_();
    const raw = file.getBlob().getDataAsString();
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed.users || typeof parsed.users !== "object") parsed.users = {};
    return parsed;
  } finally {
    lock.releaseLock();
  }
}

function game_saveUsers_(store) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) throw new Error("game_users locked");
  try {
    const file = game_getUsersFile_();
    const payload = store && typeof store === "object" ? store : {};
    if (!payload.users || typeof payload.users !== "object") payload.users = {};
    payload.updated_at = new Date().toISOString();
    file.setContent(JSON.stringify(payload, null, 2));
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function game_isRegisteredUserKey_(userKey) {
  const key = game_normalizeUserKey_(userKey);
  if (!key) return false;
  const store = game_loadUsers_();
  return Boolean(store.users && store.users[key]);
}

function game_registerUserKey_(userKey, meta) {
  const key = game_normalizeUserKey_(userKey);
  if (!key) throw new Error("game_registerUserKey_: missing key");
  const store = game_loadUsers_();
  store.users[key] = store.users[key] || {};
  store.users[key].created_at = store.users[key].created_at || new Date().toISOString();
  store.users[key].meta = meta && typeof meta === "object" ? meta : (store.users[key].meta || {});
  game_saveUsers_(store);
  return { ok: true, userKey: key };
}

function game_createUserKey_() {
  return String(Utilities.getUuid() || "").replace(/-/g, "");
}

function game_requireRegisteredUserKey_(userKey) {
  const key = game_normalizeUserKey_(userKey);
  if (!key) throw new Error("Missing user key (?k=...)");
  if (!game_isRegisteredUserKey_(key)) {
    throw new Error("Unknown user key; open the main URL to generate a new workspace.");
  }
  return key;
}

function game_registerAnonUser() {
  const key = game_createUserKey_();
  game_registerUserKey_(key, { kind: "anon" });
  // Ensure Drive folders exist.
  game_withUserKey_(key, function() {
    gameEnsureWorkspaceFolders_();
  });
  const base = game_getWebUrl_();
  return {
    ok: true,
    userKey: key,
    url: base,
    shareUrl: base ? (base + "?k=" + encodeURIComponent(key)) : ""
  };
}

