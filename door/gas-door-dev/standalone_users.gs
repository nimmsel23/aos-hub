// ================================================================
// Door Standalone: Anonymous multi-user keys (?k=...)
// ================================================================

var DOOR_ACTIVE_USER_KEY = '';

function door_normalizeUserKey_(userKey) {
  const key = String(userKey || '').trim();
  if (!key) return '';
  const cleaned = key.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  return cleaned;
}

function door_setActiveUserKey_(userKey) {
  DOOR_ACTIVE_USER_KEY = door_normalizeUserKey_(userKey);
}

function door_getActiveUserKey_() {
  return DOOR_ACTIVE_USER_KEY || '';
}

function door_withUserKey_(userKey, fn) {
  const key = door_normalizeUserKey_(userKey);
  door_setActiveUserKey_(key);
  try {
    return fn();
  } finally {
    door_setActiveUserKey_('');
  }
}

function door_getUsersFile_() {
  const base = doorGetBaseFolder_();
  const name = 'door_users.json';
  const it = base.getFilesByName(name);
  if (it.hasNext()) return it.next();
  const seed = { users: {}, updated_at: new Date().toISOString() };
  return base.createFile(name, JSON.stringify(seed, null, 2), MimeType.PLAIN_TEXT);
}

function door_loadUsers_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) throw new Error('door_users locked');
  try {
    const file = door_getUsersFile_();
    const raw = file.getBlob().getDataAsString();
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed.users || typeof parsed.users !== 'object') parsed.users = {};
    return parsed;
  } finally {
    lock.releaseLock();
  }
}

function door_saveUsers_(store) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) throw new Error('door_users locked');
  try {
    const file = door_getUsersFile_();
    const payload = store && typeof store === 'object' ? store : {};
    if (!payload.users || typeof payload.users !== 'object') payload.users = {};
    payload.updated_at = new Date().toISOString();
    file.setContent(JSON.stringify(payload, null, 2));
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function door_isRegisteredUserKey_(userKey) {
  const key = door_normalizeUserKey_(userKey);
  if (!key) return false;
  const store = door_loadUsers_();
  return Boolean(store.users && store.users[key]);
}

function door_registerUserKey_(userKey, meta) {
  const key = door_normalizeUserKey_(userKey);
  if (!key) throw new Error('door_registerUserKey_: missing key');
  const store = door_loadUsers_();
  store.users[key] = store.users[key] || {};
  store.users[key].created_at = store.users[key].created_at || new Date().toISOString();
  store.users[key].meta = meta && typeof meta === 'object' ? meta : (store.users[key].meta || {});
  door_saveUsers_(store);
  return { ok: true, userKey: key };
}

function door_createUserKey_() {
  // 32+ chars, URL safe, no dashes.
  return String(Utilities.getUuid() || '').replace(/-/g, '');
}

function door_requireRegisteredUserKey_(userKey) {
  const key = door_normalizeUserKey_(userKey);
  if (!key) throw new Error('Missing user key (?k=...)');
  if (!door_isRegisteredUserKey_(key)) throw new Error('Unknown user key; please open the main URL to generate a new workspace.');
  return key;
}

function door_getWebUrl_() {
  const props = PropertiesService.getScriptProperties();
  const configured = String(props.getProperty('DOOR_WEBAPP_URL') || props.getProperty('DOOR_CENTRE_URL') || '').trim();
  if (configured) return configured;
  try {
    return String(ScriptApp.getService().getUrl() || '').trim();
  } catch (_) {
    return '';
  }
}

function door_sideEffectsAllowed_() {
  const sp = PropertiesService.getScriptProperties();
  const flag = String(sp.getProperty('DOOR_STANDALONE_ALLOW_SIDE_EFFECTS') || '').trim();
  if (flag !== '1') return false;

  const active = door_getActiveUserKey_();
  if (!active) return false;

  const raw = String(sp.getProperty('DOOR_PRIVILEGED_USER_KEYS') || '').trim();
  if (!raw) return false;
  const keys = raw.split(',').map(s => String(s || '').trim()).filter(Boolean);
  return keys.indexOf(active) !== -1;
}

function door_registerAnonUser() {
  const key = door_createUserKey_();
  door_registerUserKey_(key, { kind: 'anon' });
  // Ensure Drive folders exist.
  door_withUserKey_(key, function() {
    doorGetCentreFolder(key);
  });
  const base = door_getWebUrl_();
  return {
    ok: true,
    userKey: key,
    url: base,
    shareUrl: base ? (base + '?k=' + encodeURIComponent(key)) : ''
  };
}
