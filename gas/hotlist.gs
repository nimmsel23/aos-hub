// ================================================================
// HOT LIST MANAGEMENT (Door Centre / 1-Potential)
// ================================================================
//
// This module handles Hot List idea capture and management across
// multiple input sources (Web UI, Telegram, CLI) and output targets
// (Google Drive, TickTick, Taskwarrior, Google Sheets).
//
// ARCHITECTURE OVERVIEW:
//
// Input Sources → Processing → Output Targets
//
// INPUTS:
// - Web UI (Index.html)
// - Telegram (/hot command)
// - CLI (aos-hot.fish)
// - TickTick (via ticktick_hotlist_sync.py)
//
// PROCESSING:
// - Deduplication check
// - Markdown file creation
// - JSON index update (hotlist_index.json)
// - Taskwarrior task creation (via Bridge)
//
// OUTPUTS:
// - Google Drive: Alpha_Door/1-Potential/*.md (individual files)
// - Google Sheets: HotList_Log (analytics)
// - TickTick: Tasks with 'hot' tag
// - Taskwarrior: HotList project tasks
// - JSON Index: hotlist_index.json (local + Drive)
//
// DATA FLOW:
//
// 1. IDEA CAPTURE (Web/Telegram → GAS):
//    User input → hotlist_addWeb() → Save .md + TickTick + Sheets + JSON
//                                  → Create Taskwarrior task (via Bridge)
//                                  → Update JSON with UUID
//
// 2. IDEA CAPTURE (CLI → Local):
//    aos-hot.fish → .md file + Taskwarrior → hotlist_index.json
//                                           → rclone sync to Drive
//
// 3. IDEA CAPTURE (TickTick → Local):
//    ticktick_hotlist_sync.py → Fetch TickTick tasks → Create .md + Taskwarrior
//                             → Update hotlist_index.json → rclone sync
//
// 4. DOOR WAR RELOAD (Index.html):
//    getPotentialHotIdeas() → Reads .md files directly from Drive
//                          → Returns list for Door War UI
//
// KEY FILES:
// - Drive: Alpha_Door/1-Potential/*.md (individual idea files)
// - Drive: Alpha_Door/1-Potential/hotlist_index.json (index for local tools)
// - Sheets: HotList_Log (analytics tracking)
// - Local: ~/AlphaOS-Vault/Door/1-Potential/*.md (synced via rclone)
// - Local: ~/AlphaOS-Vault/Door/1-Potential/hotlist_index.json
//
// IMPORTANT NOTES:
// - .md files are SOURCE OF TRUTH for GAS (reads directly from Drive)
// - hotlist_index.json is SOURCE OF TRUTH for local tools (CLI, Python)
// - UUIDs are synced bidirectionally (GAS ↔ Taskwarrior via task_export.json)
// - Deduplication uses normalized text comparison
// - Taskwarrior integration requires Bridge to be online
//
// ================================================================

// ----------------------------------------------------------------
// ENTRY POINTS (Web UI / Telegram)
// ----------------------------------------------------------------

/**
 * Add Hot List idea from Web UI or Telegram.
 *
 * Flow:
 * 1. Check for duplicates (normalized text comparison)
 * 2. Log to Sheets (analytics)
 * 3. Sync to TickTick (optional, if token configured)
 * 4. Save .md file to Drive (Alpha_Door/1-Potential)
 * 5. Update JSON index (hotlist_index.json)
 * 6. Create Taskwarrior task via Bridge (or queue if offline)
 *
 * @param {string} idea - Hot List idea text
 * @param {Object} user - User object {id, username, first_name}
 * @returns {Object} {ok, deduped?, entry_id, ticktick, task}
 */
function hotlist_addWeb(idea, user) {
  const text = String(idea || '').trim();
  if (!text) return { ok: false, error: 'missing idea' };
  const u = user || { id: 'web', username: '', first_name: 'Web' };
  const ts = new Date().toISOString();
  try {
    // Check for duplicates
    const dup = hotlist_findDuplicate_(text);
    if (dup) {
      return { ok: true, deduped: true, entry_id: dup.id, entry: dup };
    }

    // Log to Sheets (analytics)
    webapp_logHotListToSheets(text, u, 'webapp', ts);

    // Sync to TickTick (optional)
    const ticktick = hotlist_syncToTickTick_(text);

    // Save .md file to Drive
    const file = hotlist_saveToDoorPotential_(text, u, ts);

    // Update JSON index
    const entry = hotlist_indexAdd_(text, u, ts, file, 'webapp');

    // Create Taskwarrior task (via Bridge or queue)
    const task = hotlist_createTaskOrQueue_(entry, text);

    return { ok: true, ticktick: ticktick, task: task, entry_id: entry && entry.id };
  } catch (e) {
    Logger.log('hotlist_addWeb error: ' + e.toString());
    return { ok: false, error: e.toString() };
  }
}

/**
 * Handle Telegram /hot command.
 * Parses message, extracts idea, calls hotlist_addWeb().
 *
 * @param {Object} message - Telegram message object
 * @returns {boolean} true if handled, false if not a /hot command
 */
function hotlist_handleTelegramMessage_(message) {
  if (!message || !message.text) return false;
  var text = String(message.text || '').trim();
  if (!text.startsWith('/hot')) return false;

  var idea = text.replace(/^\/hot(@\w+)?\s*/i, '').trim();
  var user = message.from || {};
  var chatId = message.chat && message.chat.id ? String(message.chat.id) : '';

  if (!idea) {
    hotlist_sendTelegram_('Usage: /hot <idea>', chatId);
    return true;
  }

  var res = hotlist_addWeb(idea, {
    id: user.id || 'telegram',
    username: user.username || '',
    first_name: user.first_name || 'Telegram'
  });

  if (!res || !res.ok) {
    hotlist_sendTelegram_('Hot List failed. Try again later.', chatId);
    return true;
  }

  if (res.deduped) {
    hotlist_sendTelegram_('Hot List: already captured (deduped).', chatId);
    return true;
  }

  hotlist_sendTelegram_('Hot List captured ✅', chatId);
  return true;
}

// ----------------------------------------------------------------
// STATISTICS & COUNTING
// ----------------------------------------------------------------

/**
 * Get Hot List count for dashboard.
 *
 * Strategy:
 * 1. Try to count from Sheets (HotList_Log rows)
 * 2. Fallback: Count .md files in Drive (Alpha_Door/1-Potential)
 *
 * @returns {number} Hot List item count
 */
function hotlist_getCount_() {
  try {
    // Try Sheets first
    if (!TELEGRAM_CONFIG || !TELEGRAM_CONFIG.SHEET_ID) return 0;
    const ss = SpreadsheetApp.openById(TELEGRAM_CONFIG.SHEET_ID);
    const sheetName = TELEGRAM_CONFIG.SHEET_NAMES && TELEGRAM_CONFIG.SHEET_NAMES.HOTLIST
      ? TELEGRAM_CONFIG.SHEET_NAMES.HOTLIST
      : 'HotList_Log';
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return 0;
    const rows = sheet.getLastRow();
    return rows > 1 ? rows - 1 : 0;
  } catch (e) {
    Logger.log('hotlist_getCount_ error: ' + e.toString());

    // Fallback: Count .md files in Drive
    try {
      var root = null;
      if (typeof doorGetCentreFolder === 'function') {
        root = doorGetCentreFolder();
      } else {
        var it = DriveApp.getFoldersByName('Alpha_Door');
        if (it.hasNext()) root = it.next();
      }
      if (!root) return 0;
      var potIt = root.getFoldersByName('1-Potential');
      if (!potIt.hasNext()) return 0;
      var pot = potIt.next();
      var files = pot.getFiles();
      var count = 0;
      while (files.hasNext()) {
        var f = files.next();
        if (/\.md$/i.test(f.getName())) count += 1;
      }
      return count;
    } catch (err) {
      Logger.log('hotlist_getCount_ fallback error: ' + err.toString());
      return 0;
    }
  }
}

// ----------------------------------------------------------------
// MARKDOWN FILE MANAGEMENT (Google Drive)
// ----------------------------------------------------------------

/**
 * Save Hot List idea as .md file in Drive.
 *
 * Creates individual markdown file in Alpha_Door/1-Potential/
 * with clean format (no annoying tags).
 *
 * Filename format: {slug}_{YYYY-MM-DD}_{HHmmss}.md
 *
 * @param {string} idea - Idea text
 * @param {Object} user - User object
 * @param {string} timestamp - ISO timestamp
 * @returns {Object} {id, name, url} of created file, or null if failed
 */
function hotlist_saveToDoorPotential_(idea, user, timestamp) {
  if (typeof doorGetCentreFolder !== 'function' || typeof doorGetOrCreateSubfolder !== 'function') {
    return null;
  }

  const root = doorGetCentreFolder();
  const pot = doorGetOrCreateSubfolder(root, '1-Potential');
  const stamp = timestamp ? new Date(timestamp) : new Date();
  const dateStr = Utilities.formatDate(stamp, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  let base = hotlist_safeFilename_(idea);
  if (!base) base = 'Idea';

  // Append date to filename
  let filename = base + '_' + dateStr;

  // Check for duplicates and add time suffix if needed
  const files = pot.getFilesByName(filename + '.md');
  if (files.hasNext()) {
    const suffix = Utilities.formatDate(stamp, Session.getScriptTimeZone(), 'HHmmss');
    filename = base + '_' + dateStr + '_' + suffix;
  }

  const name = filename + '.md';
  const by = user && (user.username || user.first_name) ? (user.username || user.first_name) : 'Web';

  // Minimal markdown frontmatter + title
  // No annoying tags in body (only in frontmatter)
  const md = [
    '---',
    'date: ' + dateStr,
    'source: ' + (user && user.username ? user.username : 'webapp'),
    'tags: [potential]',
    '---',
    '',
    '# ' + idea,
    ''
  ].join('\n');

  var file = pot.createFile(name, md, MimeType.PLAIN_TEXT);
  return { id: file.getId(), name: file.getName(), url: file.getUrl() };
}

/**
 * Create safe filename slug from idea text.
 *
 * Takes first 5 words (max 60 chars), replaces German umlauts,
 * removes invalid filename characters.
 *
 * @param {string} text - Idea text
 * @returns {string} Safe filename slug
 */
function hotlist_safeFilename_(text) {
  const str = String(text || '').trim();
  if (!str) return '';

  // Take first 5 words (max 60 chars)
  const words = str.split(/\s+/).slice(0, 5);
  let slug = words.join('_');

  if (slug.length > 60) {
    slug = slug.substring(0, 60);
  }

  // Clean: remove invalid filename chars, German umlauts
  slug = slug
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[\\\/:*?"<>|]/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return slug || 'Idea';
}

// ----------------------------------------------------------------
// TICKTICK INTEGRATION (Optional)
// ----------------------------------------------------------------

/**
 * Sync Hot List idea to TickTick.
 *
 * Creates task in TickTick project with 'hot' tag.
 * Requires TICKTICK_TOKEN in Script Properties.
 *
 * @param {string} idea - Idea text
 * @returns {Object} {ok, projectId?, error?}
 */
function hotlist_syncToTickTick_(idea) {
  const token = PropertiesService.getScriptProperties().getProperty('TICKTICK_TOKEN');
  if (!token) return { ok: false, error: 'TICKTICK_TOKEN missing' };

  try {
    const projectId = hotlist_getTickTickProjectId_();
    const payload = {
      title: `🔥 ${idea}`,
      tags: ['hot'],
      projectId: projectId
    };
    const res = UrlFetchApp.fetch('https://api.ticktick.com/open/v1/task', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const ok = res.getResponseCode() >= 200 && res.getResponseCode() < 300;
    return { ok: ok, projectId: projectId };
  } catch (e) {
    Logger.log('hotlist TickTick direct failed: ' + e.toString());
    return { ok: false, error: e.toString() };
  }
}

/**
 * Get TickTick project ID for Hot List.
 *
 * Checks Script Properties in order:
 * 1. HOTLIST_TICKTICK_PROJECT_ID
 * 2. TICKTICK_INBOX_PROJECT_ID
 * 3. Fallback: 'inbox'
 *
 * @returns {string} TickTick project ID
 */
function hotlist_getTickTickProjectId_() {
  const sp = PropertiesService.getScriptProperties();
  return sp.getProperty('HOTLIST_TICKTICK_PROJECT_ID') ||
    sp.getProperty('TICKTICK_INBOX_PROJECT_ID') ||
    'inbox';
}

/**
 * Legacy function: Create TickTick task with description.
 * Use hotlist_syncToTickTick_() instead for new code.
 *
 * @deprecated
 */
function createTickTickHotTask(title, description) {
  var token = PropertiesService.getScriptProperties().getProperty('TICKTICK_TOKEN');
  if (!token) {
    Logger.log('TickTick: kein TICKTICK_TOKEN konfiguriert');
    return { ok: false, error: 'TICKTICK_TOKEN missing' };
  }

  var projectId = hotlist_getTickTickProjectId_();
  var payload = {
    title: title || 'Hot Idea',
    content: description || '',
    tags: ['hot']
  };

  if (projectId) payload.projectId = projectId;

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token }
  };

  var url = 'https://api.ticktick.com/open/v1/task';
  var response = UrlFetchApp.fetch(url, options);
  var status = response.getResponseCode();

  if (status >= 200 && status < 300) {
    var body = JSON.parse(response.getContentText() || '{}');
    return { ok: true, task: body };
  }

  Logger.log('TickTick API Fehler: ' + status + ' - ' + response.getContentText());
  return { ok: false, status: status, body: response.getContentText() };
}

// ----------------------------------------------------------------
// JSON INDEX MANAGEMENT (hotlist_index.json)
// ----------------------------------------------------------------
//
// hotlist_index.json is the LOCAL SOURCE OF TRUTH for:
// - CLI tools (aos-hot.fish)
// - Python scripts (ticktick_hotlist_sync.py)
// - Taskwarrior UUID mapping
//
// Structure:
// {
//   "items": [
//     {
//       "id": "uuid",
//       "idea": "text",
//       "created_at": "ISO timestamp",
//       "by": "username",
//       "source": "webapp|telegram|cli|ticktick",
//       "md_id": "Drive file ID",
//       "md_name": "filename.md",
//       "md_url": "Drive URL",
//       "task_uuid": "Taskwarrior UUID",
//       "task_id": "Taskwarrior ID"
//     }
//   ]
// }
//
// ----------------------------------------------------------------

/**
 * Get 1-Potential folder from Drive.
 *
 * @returns {Folder} Drive folder object, or null if not found
 */
function hotlist_getPotentialFolder_() {
  if (typeof doorGetCentreFolder !== 'function' || typeof doorGetOrCreateSubfolder !== 'function') {
    return null;
  }
  var root = doorGetCentreFolder();
  return doorGetOrCreateSubfolder(root, '1-Potential');
}

/**
 * Normalize idea text for deduplication.
 * Converts to lowercase and trims whitespace.
 *
 * @param {string} text - Idea text
 * @returns {string} Normalized text
 */
function hotlist_normalizeIdea_(text) {
  return String(text || '').trim().toLowerCase();
}

/**
 * Find duplicate idea in hotlist_index.json.
 * Uses normalized text comparison.
 *
 * @param {string} idea - Idea text to check
 * @returns {Object} Duplicate entry, or null if not found
 */
function hotlist_findDuplicate_(idea) {
  var pot = hotlist_getPotentialFolder_();
  if (!pot) return null;
  var index = hotlist_loadIndex_(pot);
  var needle = hotlist_normalizeIdea_(idea);
  if (!needle) return null;
  var items = index.items || [];
  for (var i = 0; i < items.length; i += 1) {
    var item = items[i];
    if (!item || !item.idea) continue;
    if (hotlist_normalizeIdea_(item.idea) === needle) return item;
  }
  return null;
}

/**
 * Find index entry by Drive file ID.
 *
 * @param {string} fileId - Drive file ID
 * @returns {Object} Index entry, or null if not found
 */
function hotlist_findEntryByFileId_(fileId) {
  if (!fileId) return null;
  var pot = hotlist_getPotentialFolder_();
  if (!pot) return null;
  var index = hotlist_loadIndex_(pot);
  var items = index.items || [];
  for (var i = 0; i < items.length; i += 1) {
    var item = items[i];
    if (!item) continue;
    if (String(item.md_id || '') === String(fileId)) return item;
  }
  return null;
}

/**
 * Load hotlist_index.json from Drive.
 *
 * @param {Folder} folder - Optional folder (default: 1-Potential)
 * @returns {Object} {items: [...]} or {items: []} if not found
 */
function hotlist_loadIndex_(folder) {
  var pot = folder || hotlist_getPotentialFolder_();
  if (!pot) return { items: [] };
  var it = pot.getFilesByName('hotlist_index.json');
  if (!it.hasNext()) return { items: [] };
  var file = it.next();
  try {
    var raw = file.getBlob().getDataAsString();
    var json = JSON.parse(raw || '{}');
    if (!json || !Array.isArray(json.items)) return { items: [] };
    return json;
  } catch (e) {
    Logger.log('hotlist_loadIndex_ parse error: ' + e);
    return { items: [] };
  }
}

/**
 * Write hotlist_index.json to Drive.
 * Creates file if it doesn't exist, updates if it does.
 *
 * @param {Object} data - {items: [...]}
 * @param {Folder} folder - Optional folder (default: 1-Potential)
 * @returns {Object} {ok, id, name, url}
 */
function hotlist_writeIndex_(data, folder) {
  var pot = folder || hotlist_getPotentialFolder_();
  if (!pot) return { ok: false, error: 'missing potential folder' };
  var payload = JSON.stringify(data || { items: [] }, null, 2);
  var it = pot.getFilesByName('hotlist_index.json');
  if (it.hasNext()) {
    var file = it.next();
    file.setContent(payload);
    return { ok: true, id: file.getId(), name: file.getName(), url: file.getUrl() };
  }
  var created = pot.createFile('hotlist_index.json', payload, MimeType.PLAIN_TEXT);
  return { ok: true, id: created.getId(), name: created.getName(), url: created.getUrl() };
}

/**
 * Add new entry to hotlist_index.json.
 * Creates entry with UUID, adds to beginning of items array.
 *
 * @param {string} idea - Idea text
 * @param {Object} user - User object
 * @param {string} timestamp - ISO timestamp
 * @param {Object} file - Drive file object {id, name, url}
 * @param {string} source - Source (webapp|telegram|cli|ticktick)
 * @returns {Object} Created entry
 */
function hotlist_indexAdd_(idea, user, timestamp, file, source) {
  var pot = hotlist_getPotentialFolder_();
  var index = hotlist_loadIndex_(pot);
  var id = Utilities.getUuid();
  var who = user && (user.username || user.first_name) ? (user.username || user.first_name) : 'Web';
  var entry = {
    id: id,
    idea: String(idea || ''),
    created_at: timestamp || new Date().toISOString(),
    by: who,
    source: source || 'webapp',
    md_id: file && file.id ? file.id : '',
    md_name: file && file.name ? file.name : '',
    md_url: file && file.url ? file.url : '',
    task_uuid: '',
    task_id: ''
  };
  index.items = index.items || [];
  index.items.unshift(entry);  // Add to beginning (most recent first)
  hotlist_writeIndex_(index, pot);
  return entry;
}

/**
 * Update index entry with Taskwarrior UUID.
 * Also updates markdown file frontmatter with UUID.
 *
 * @param {string} hotlistId - Hotlist entry UUID
 * @param {Object} taskResult - {task_uuid, task_id}
 * @returns {Object} {ok}
 */
function hotlist_updateTaskInIndex_(hotlistId, taskResult) {
  if (!hotlistId) return { ok: false, error: 'missing hotlistId' };
  var pot = hotlist_getPotentialFolder_();
  var index = hotlist_loadIndex_(pot);
  var items = index.items || [];
  var updated = false;
  var fileId = null;

  items.forEach(function(item) {
    if (item && item.id === hotlistId) {
      item.task_uuid = (taskResult && taskResult.task_uuid) ? taskResult.task_uuid : (item.task_uuid || '');
      item.task_id = (taskResult && taskResult.task_id) ? taskResult.task_id : (item.task_id || '');
      fileId = item.md_id || null;
      updated = true;
    }
  });

  if (updated) {
    hotlist_writeIndex_(index, pot);

    // Write UUID to markdown frontmatter
    if (fileId && taskResult && taskResult.task_uuid) {
      hotlist_updateMarkdownWithUuid_(fileId, taskResult.task_uuid);
    }
  }

  return { ok: updated };
}

// ----------------------------------------------------------------
// TASKWARRIOR INTEGRATION (via Bridge)
// ----------------------------------------------------------------
//
// Taskwarrior integration uses Bridge service (aiohttp, port 8080).
// Bridge must be online for immediate task creation.
// If Bridge is offline, tasks are queued and processed later.
//
// Flow:
// 1. Check Bridge health
// 2. If online: bridge_taskExecutor_({task: {...}})
// 3. If offline: enqueue task → periodic trigger processes queue
// 4. Bridge returns Taskwarrior UUID → update JSON + markdown
//
// ----------------------------------------------------------------

/**
 * Build Taskwarrior task object for Hot List idea.
 *
 * @param {string} idea - Idea text
 * @param {Object} entry - Hotlist index entry
 * @returns {Object} Taskwarrior task object
 */
function hotlist_buildTask_(idea, entry) {
  return {
    description: String(idea || '').trim(),
    project: 'HotList',
    priority: 'L',
    tags: ['potential'],
    meta: {
      hotlist_id: entry && entry.id ? entry.id : '',
      md_id: entry && entry.md_id ? entry.md_id : ''
    }
  };
}

/**
 * Create Taskwarrior task immediately (if Bridge online) or queue it.
 *
 * Strategy:
 * 1. Check Bridge health
 * 2. If online: Execute task immediately via Bridge
 * 3. If offline: Queue task for later processing
 *
 * @param {Object} entry - Hotlist index entry
 * @param {string} idea - Idea text
 * @returns {Object} Bridge result or queue result
 */
function hotlist_createTaskOrQueue_(entry, idea) {
  var task = hotlist_buildTask_(idea, entry);
  var health = (typeof bridgeHealth_ === 'function') ? bridgeHealth_() : { ok: false };
  if (health && health.ok && typeof bridge_taskExecutor_ === 'function') {
    var res = bridge_taskExecutor_({ task: task });
    if (res && res.ok && res.results && res.results.length) {
      hotlist_updateTaskInIndex_(entry.id, res.results[0]);
    }
    return res;
  }
  return hotlist_enqueueTaskOps_([task]);
}

/**
 * Enqueue tasks for later processing.
 * Stores in Script Properties, sets up periodic trigger.
 *
 * @param {Array} tasks - Array of Taskwarrior task objects
 * @returns {Object} {ok, queued, queuedOnly: true}
 */
function hotlist_enqueueTaskOps_(tasks) {
  if (!tasks || !tasks.length) return { ok: false, error: 'no tasks' };
  var sp = PropertiesService.getScriptProperties();
  var key = 'HOTLIST_TASK_QUEUE';
  var raw = sp.getProperty(key) || '[]';
  var arr = [];
  try { arr = JSON.parse(raw); } catch (e) { arr = []; }
  tasks.forEach(function(t) { arr.push(t); });
  sp.setProperty(key, JSON.stringify(arr));
  hotlist_setupTaskQueueTrigger_();
  return { ok: true, queued: tasks.length, queuedOnly: true };
}

/**
 * Process queued tasks (runs every 15 minutes via trigger).
 *
 * Checks Bridge health, executes queued tasks if online,
 * updates index with UUIDs.
 *
 * @returns {Object} {ok, processed}
 */
function hotlist_taskQueueTick_() {
  var sp = PropertiesService.getScriptProperties();
  var key = 'HOTLIST_TASK_QUEUE';
  var raw = sp.getProperty(key) || '[]';
  var queue = [];
  try { queue = JSON.parse(raw); } catch (e) { queue = []; }
  if (!queue.length) return { ok: true, processed: 0 };

  var health = (typeof bridgeHealth_ === 'function') ? bridgeHealth_() : { ok: false };
  if (!health || !health.ok || typeof bridge_taskExecutor_ !== 'function') {
    return { ok: false, error: 'bridge offline' };
  }

  var res = bridge_taskExecutor_({ tasks: queue });
  if (!res || !res.ok) {
    return { ok: false, error: (res && res.error) ? res.error : 'bridge execute failed' };
  }
  if (res.results && res.results.length) {
    res.results.forEach(function(r) {
      var meta = r && r.meta ? r.meta : {};
      if (meta && meta.hotlist_id) hotlist_updateTaskInIndex_(meta.hotlist_id, r);
    });
  }
  sp.deleteProperty(key);
  return { ok: true, processed: queue.length };
}

/**
 * Setup periodic trigger for task queue processing.
 * Runs every 15 minutes.
 */
function hotlist_setupTaskQueueTrigger_() {
  var triggers = ScriptApp.getProjectTriggers();
  var exists = triggers.some(function(t) { return t.getHandlerFunction() === 'hotlist_taskQueueTick_'; });
  if (!exists) {
    ScriptApp.newTrigger('hotlist_taskQueueTick_').timeBased().everyMinutes(15).create();
  }
}

/**
 * Update markdown file frontmatter with Taskwarrior UUID.
 *
 * Finds frontmatter section (---...---), inserts task_uuid field.
 * Skips if task_uuid already exists.
 *
 * @param {string} fileId - Drive file ID
 * @param {string} uuid - Taskwarrior UUID
 * @returns {Object} {ok, skipped?, fileId, uuid}
 */
function hotlist_updateMarkdownWithUuid_(fileId, uuid) {
  if (!fileId || !uuid) return { ok: false, error: 'missing fileId or uuid' };

  try {
    const file = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString();

    // Check if frontmatter exists
    if (!content.startsWith('---')) {
      Logger.log('hotlist_updateMarkdownWithUuid_: no frontmatter in ' + fileId);
      return { ok: false, error: 'no frontmatter' };
    }

    // Find end of frontmatter
    const secondDelim = content.indexOf('---', 3);
    if (secondDelim < 0) {
      Logger.log('hotlist_updateMarkdownWithUuid_: incomplete frontmatter in ' + fileId);
      return { ok: false, error: 'incomplete frontmatter' };
    }

    const frontmatter = content.slice(0, secondDelim + 3);
    const body = content.slice(secondDelim + 3);

    // Check if task_uuid already exists
    if (frontmatter.includes('task_uuid:')) {
      Logger.log('hotlist_updateMarkdownWithUuid_: task_uuid already exists in ' + fileId);
      return { ok: true, skipped: true };
    }

    // Insert task_uuid before closing ---
    const updatedFrontmatter = frontmatter.slice(0, secondDelim) + 'task_uuid: ' + uuid + '\n---';
    const updatedContent = updatedFrontmatter + body;

    file.setContent(updatedContent);
    Logger.log('hotlist_updateMarkdownWithUuid_: wrote UUID to ' + fileId);

    return { ok: true, fileId: fileId, uuid: uuid };
  } catch (e) {
    Logger.log('hotlist_updateMarkdownWithUuid_ error: ' + e.toString());
    return { ok: false, error: e.toString() };
  }
}

// ----------------------------------------------------------------
// UUID SYNC (task_export.json → hotlist_index.json)
// ----------------------------------------------------------------
//
// Bidirectional UUID sync between Taskwarrior and hotlist_index.json.
//
// Local → Drive: UUIDs created by CLI/Python tools are synced to Drive via rclone
// Drive → Taskwarrior: UUIDs from task_export.json are synced back to index
//
// This ensures UUID consistency across all tools.
//
// ----------------------------------------------------------------

/**
 * Sync UUIDs from task_export.json to Hot List index.
 *
 * Reads task_export.json from Drive, matches HotList project tasks
 * by description, updates hotlist_index.json with UUIDs.
 *
 * Should run periodically (every 15 minutes via trigger).
 *
 * @returns {Object} {ok, updated, markdownUpdated, hotListTasksFound}
 */
function hotlist_syncUuidsFromTaskExport() {
  try {
    // Load task_export.json
    if (typeof aos_loadTaskExportSafe_ !== 'function') {
      return { ok: false, error: 'aos_loadTaskExportSafe_ not available' };
    }

    const tasks = aos_loadTaskExportSafe_();
    if (!tasks || !tasks.length) {
      return { ok: false, error: 'task_export.json empty or unavailable' };
    }

    // Filter HotList tasks
    const hotListTasks = tasks.filter(t => {
      const project = String(t.project || '').toLowerCase();
      return project === 'hotlist' || project.startsWith('hotlist.');
    });

    if (!hotListTasks.length) {
      return { ok: true, updated: 0, message: 'No HotList tasks found' };
    }

    // Load hotlist_index.json
    const pot = hotlist_getPotentialFolder_();
    const index = hotlist_loadIndex_(pot);
    const items = index.items || [];

    let updated = 0;
    let markdownUpdated = 0;

    // Match by description
    hotListTasks.forEach(task => {
      const uuid = task.uuid;
      const description = String(task.description || '').trim();

      if (!uuid || !description) return;

      items.forEach(item => {
        if (item.task_uuid) return; // Already has UUID

        const idea = String(item.idea || '').trim();
        if (idea === description) {
          item.task_uuid = uuid;
          updated++;

          // Update markdown frontmatter
          if (item.md_id) {
            const result = hotlist_updateMarkdownWithUuid_(item.md_id, uuid);
            if (result && result.ok && !result.skipped) {
              markdownUpdated++;
            }
          }
        }
      });
    });

    if (updated > 0) {
      hotlist_writeIndex_(index, pot);
    }

    return {
      ok: true,
      updated: updated,
      markdownUpdated: markdownUpdated,
      hotListTasksFound: hotListTasks.length
    };
  } catch (e) {
    Logger.log('hotlist_syncUuidsFromTaskExport error: ' + e.toString());
    return { ok: false, error: e.toString() };
  }
}

/**
 * Setup periodic trigger for UUID sync (runs every 15 minutes).
 */
function hotlist_setupUuidSyncTrigger() {
  const handler = 'hotlist_syncUuidsFromTaskExport';
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(t => t.getHandlerFunction() === handler);

  if (exists) {
    return { ok: true, skipped: true, message: 'Trigger already exists' };
  }

  ScriptApp.newTrigger(handler)
    .timeBased()
    .everyMinutes(15)
    .create();

  return { ok: true, message: 'Trigger created (every 15 minutes)' };
}

// ----------------------------------------------------------------
// DOOR WAR INTEGRATION (UI → Drive .md files)
// ----------------------------------------------------------------
//
// Door War UI (Index.html) loads Hot Ideas by reading .md files
// directly from Google Drive (not from JSON).
//
// This is the SOURCE OF TRUTH for GAS/UI.
// JSON is only for local tools (CLI, Python).
//
// ----------------------------------------------------------------

/**
 * Get Hot Ideas for Door War UI.
 *
 * Reads .md files directly from Alpha_Door/1-Potential/,
 * extracts title from first line (H1 or task format).
 *
 * Sorting: Most recently updated first.
 *
 * Called by: hqDoorWarReload() in Index_client.html
 *
 * @returns {Object} {ok, count, ideas: [{id, name, url, title, updated}]}
 */
function getPotentialHotIdeas() {
  var root = doorGetCentreFolder();
  var itFolder = root.getFoldersByName('1-Potential');
  if (!itFolder.hasNext()) {
    return { ok: false, error: 'Kein Ordner "1-Potential" im Centre-Ordner gefunden.' };
  }

  var pot = itFolder.next();
  var ideas = [];

  // STRATEGY 1: Try to read hotlist_index.json (Source of Truth)
  var jsonFiles = pot.getFilesByName('hotlist_index.json');
  if (jsonFiles.hasNext()) {
    var jsonFile = jsonFiles.next();
    try {
      var jsonContent = jsonFile.getBlob().getDataAsString();
      var data = JSON.parse(jsonContent);

      // Extract items array (handle both {items: [...]} and [...] formats)
      var items = Array.isArray(data) ? data : (data.items || []);

      // Convert JSON entries to ideas format
      items.forEach(function(item) {
        if (!item.idea) return;  // Skip malformed entries

        // Extract filename from full path if present
        var filename = item.file;
        if (filename && filename.includes('/')) {
          filename = filename.split('/').pop();
        }

        // Try to find matching .md file by filename to get Drive ID and URL
        var mdFiles = pot.getFilesByName(filename);
        var fileId = null;
        var fileUrl = null;
        var updated = new Date(item.created).getTime();

        if (mdFiles.hasNext()) {
          var mdFile = mdFiles.next();
          fileId = mdFile.getId();
          fileUrl = mdFile.getUrl();
          updated = mdFile.getLastUpdated().getTime();
        }

        ideas.push({
          id: fileId || ('json_' + ideas.length),  // Fallback ID if file not found
          name: filename || (item.idea.substring(0, 30) + '.md'),
          url: fileUrl || '',
          title: item.idea,
          updated: updated,
          tw_uuid: item.tw_uuid || null,
          ticktick_id: item.ticktick_id || null,
          status: item.status || 'active',
          quadrant: item.quadrant || 2
        });
      });

      Logger.log('[getPotentialHotIdeas] Read ' + ideas.length + ' ideas from hotlist_index.json');
    } catch (e) {
      Logger.log('[getPotentialHotIdeas] JSON parse failed: ' + e.message + ' - falling back to filename scan');
    }
  }

  // STRATEGY 2: Fallback - Read .md filenames only (NOT content!)
  if (!ideas.length) {
    Logger.log('[getPotentialHotIdeas] No JSON found - reading .md filenames');
    var files = pot.getFiles();

    while (files.hasNext()) {
      var f = files.next();
      var name = f.getName();
      if (!/\.md$/i.test(name)) continue;
      if (name === 'hotlist_index.json') continue;  // Skip JSON itself

      // Extract title from FILENAME only (format: uuid-slug.md)
      var title = name.replace(/\.md$/i, '');

      // Remove UUID prefix (first 4 hex chars + hyphen)
      title = title.replace(/^[0-9a-f]{4}-/i, '');

      // Convert slug to human-readable title
      // Replace hyphens with spaces and capitalize words
      title = title
        .replace(/-/g, ' ')
        .replace(/\b\w/g, function(l) { return l.toUpperCase(); });

      ideas.push({
        id: f.getId(),
        name: name,
        url: f.getUrl(),
        title: title,
        updated: f.getLastUpdated().getTime()
      });
    }
  }

  if (!ideas.length) return { ok: false, error: 'Keine Hot Ideas in "1-Potential" gefunden.' };

  // Sort by most recently updated first
  ideas.sort(function(a, b) { return b.updated - a.updated; });

  return { ok: true, count: ideas.length, ideas: ideas };
}

/**
 * Move Hot Ideas from 1-Potential to 2-Plan.
 *
 * Called when user selects Hot Ideas in Door War and confirms selection.
 *
 * @param {Array|string} fileIds - Drive file IDs to move
 * @returns {Object} {ok, moved}
 */
function doorMovePotentialToPlan(fileIds) {
  if (!fileIds || !fileIds.length) return { ok: false, moved: 0 };
  var ids = Array.isArray(fileIds) ? fileIds : [fileIds];
  var root = doorGetCentreFolder();
  var plan = doorGetOrCreateSubfolder(root, '2-Plan');
  var moved = 0;

  ids.forEach(function(id) {
    if (!id) return;
    try {
      var file = DriveApp.getFileById(id);
      file.moveTo(plan);
      moved += 1;
    } catch (e) {
      Logger.log('doorMovePotentialToPlan failed: ' + e);
    }
  });

  return { ok: true, moved: moved };
}

// ----------------------------------------------------------------
// TELEGRAM INTEGRATION (Optional)
// ----------------------------------------------------------------

/**
 * Get bot token for Telegram messages.
 * Checks DOOR_BOT_TOKEN, falls back to BOT_TOKEN.
 *
 * @returns {string} Bot token
 */
function hotlist_getBotToken_() {
  var sp = PropertiesService.getScriptProperties();
  return String(sp.getProperty('DOOR_BOT_TOKEN') || sp.getProperty('BOT_TOKEN') || '').trim();
}

/**
 * Send Telegram message.
 *
 * @param {string} text - Message text (Markdown supported)
 * @param {string} chatId - Telegram chat ID (optional, uses CHAT_ID if not provided)
 * @returns {Object} {ok, error?}
 */
function hotlist_sendTelegram_(text, chatId) {
  var token = hotlist_getBotToken_();
  if (!token) return { ok: false, error: 'HOTLIST_BOT_TOKEN missing' };
  var sp = PropertiesService.getScriptProperties();
  var cid = String(chatId || sp.getProperty('CHAT_ID') || '').trim();
  if (!cid) return { ok: false, error: 'CHAT_ID missing' };

  var payload = {
    chat_id: cid,
    text: String(text || ''),
    parse_mode: 'Markdown'
  };

  try {
    var res = UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    return { ok: res.getResponseCode() >= 200 && res.getResponseCode() < 300 };
  } catch (e) {
    Logger.log('hotlist_sendTelegram_ error: ' + e.toString());
    return { ok: false, error: e.toString() };
  }
}
