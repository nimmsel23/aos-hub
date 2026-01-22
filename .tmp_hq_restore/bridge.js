// ================================================================
// Bridge helpers (health, status)
// ================================================================

/**
 * Runs Bridge health check on the root URL (`/health`).
 * Heartbeat (BRIDGE_HEARTBEAT_TS) is appended as info only.
 */
function bridgeHealth_() {
  const sp = PropertiesService.getScriptProperties();
  const root = (typeof getBridgeRootUrl_ === 'function') ? getBridgeRootUrl_() : '';
  const api = (typeof getBridgeApiUrl_ === 'function') ? getBridgeApiUrl_() : '';

  const res = { ok: false, label: 'not configured', url: (api || root || '') };
  const candidates = [];
  if (api) candidates.push(String(api).replace(/\/$/, '') + '/health');
  if (root) candidates.push(String(root).replace(/\/$/, '') + '/health');
  for (let i = 0; i < candidates.length; i++) {
    const url = candidates[i];
    try {
      const r = UrlFetchApp.fetch(url, {
        headers: (typeof bridge_getAuthHeaders_ === 'function' ? bridge_getAuthHeaders_() : {}),
        muteHttpExceptions: true
      });
      const code = r.getResponseCode();
      if (code >= 200 && code < 300) {
        res.ok = true;
        res.label = 'online';
        res.url = url;
        break;
      }
      res.ok = false;
      res.label = 'HTTP ' + code;
      res.url = url;
    } catch (e) {
      res.ok = false;
      res.label = 'offline: ' + e;
      res.url = url;
    }
  }

  // Heartbeat info (does not flip ok)
  const beat = Number(sp.getProperty('BRIDGE_HEARTBEAT_TS') || 0);
  if (beat) {
    const ageMin = Math.round((Date.now() - beat) / 60000);
    res.label = res.ok ? `online (hb ${ageMin}m)` : `hb ${ageMin}m`;
  }

  return res;
}

// ------------------------------------------------
// Bridge task executor (Taskwarrior via Bridge)
// ------------------------------------------------
function bridge_taskExecutor_(payload) {
  var base = (typeof getBridgeUrl_ === 'function' ? getBridgeUrl_() : '') || '';
  if (!base) return { ok: false, error: 'bridge URL not set' };
  base = String(base || '').replace(/\/$/, '');
  var url = /\/bridge$/.test(base) ? (base + '/task/execute') : (base + '/bridge/task/execute');

  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: (typeof bridge_getAuthHeaders_ === 'function' ? bridge_getAuthHeaders_() : {}),
      payload: JSON.stringify(payload || {}),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    if (code < 200 || code >= 300) {
      return { ok: false, error: 'HTTP ' + code, body: body };
    }
    return JSON.parse(body || '{}');
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function bridge_taskModify_(uuid, updates) {
  var base = (typeof getBridgeUrl_ === 'function' ? getBridgeUrl_() : '') || '';
  if (!base) return { ok: false, error: 'bridge URL not set' };
  base = String(base || '').replace(/\/$/, '');
  var url = /\/bridge$/.test(base) ? (base + '/task/modify') : (base + '/bridge/task/modify');
  var payload = { uuid: uuid || '', updates: updates || {} };
  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: (typeof bridge_getAuthHeaders_ === 'function' ? bridge_getAuthHeaders_() : {}),
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    if (code < 200 || code >= 300) {
      return { ok: false, error: 'HTTP ' + code, body: body };
    }
    return JSON.parse(body || '{}');
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ------------------------------------------------
// Vault sync (Bridge rclone pull/push)
// ------------------------------------------------
function bridge_syncPull(options) {
  var base = (typeof getBridgeUrl_ === 'function' ? getBridgeUrl_() : '') || '';
  if (!base) return { ok: false, error: 'bridge URL not set' };
  base = String(base || '').replace(/\/$/, '');
  var url = /\/bridge$/.test(base) ? (base + '/sync/pull') : (base + '/bridge/sync/pull');

  var opts = options || {};
  var dryRun = opts.dry_run || opts.dryRun;
  if (dryRun) {
    url += '?dry_run=1';
  }

  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: (typeof bridge_getAuthHeaders_ === 'function' ? bridge_getAuthHeaders_() : {}),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    var json = null;
    try {
      json = JSON.parse(body || '{}');
    } catch (_) {
      json = { raw: body };
    }
    if (code < 200 || code >= 300) {
      return { ok: false, error: 'HTTP ' + code, body: json };
    }
    if (json && typeof json.ok === 'boolean') return json;
    return { ok: true, body: json };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function bridge_syncPush(options) {
  var base = (typeof getBridgeUrl_ === 'function' ? getBridgeUrl_() : '') || '';
  if (!base) return { ok: false, error: 'bridge URL not set' };
  base = String(base || '').replace(/\/$/, '');
  var url = /\/bridge$/.test(base) ? (base + '/sync/push') : (base + '/bridge/sync/push');

  var opts = options || {};
  var dryRun = opts.dry_run || opts.dryRun;
  if (dryRun) {
    url += '?dry_run=1';
  }

  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: (typeof bridge_getAuthHeaders_ === 'function' ? bridge_getAuthHeaders_() : {}),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    var json = null;
    try {
      json = JSON.parse(body || '{}');
    } catch (_) {
      json = { raw: body };
    }
    if (code < 200 || code >= 300) {
      return { ok: false, error: 'HTTP ' + code, body: json };
    }
    if (json && typeof json.ok === 'boolean') return json;
    return { ok: true, body: json };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ================================================================
// BRIDGE CHECK (explicit /health on bridge root URL)
// ================================================================
function bridgeCheck_() {
  const api = (typeof getBridgeApiUrl_ === 'function') ? getBridgeApiUrl_() : '';
  const root = (typeof getBridgeRootUrl_ === 'function') ? getBridgeRootUrl_() : '';
  const candidates = [];
  if (api) candidates.push(String(api).replace(/\/$/, '') + '/health');
  if (root) candidates.push(String(root).replace(/\/$/, '') + '/health');
  if (!candidates.length) return { ok: false, url: '', label: 'bridge URL missing' };
  for (let i = 0; i < candidates.length; i++) {
    const url = candidates[i];
    try {
      const res = UrlFetchApp.fetch(url, {
        headers: bridge_getAuthHeaders_(),
        muteHttpExceptions: true
      });
      const code = res.getResponseCode();
      if (code >= 200 && code < 300) {
        return { ok: true, url: url, label: 'online' };
      }
      if (i === candidates.length - 1) return { ok: false, url: url, label: 'HTTP ' + code };
    } catch (e) {
      if (i === candidates.length - 1) return { ok: false, url: url, label: 'error: ' + e };
    }
  }
  return { ok: false, url: '', label: 'unknown' };
}

function setupBridgePullTrigger() {
  ScriptApp.newTrigger('bridge_syncPull')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();
  return { ok: true };
}

function setupBridgePushTrigger() {
  ScriptApp.newTrigger('bridge_syncPush')
    .timeBased()
    .everyDays(1)
    .atHour(21)
    .create();
  return { ok: true };
}

// ================================================================
// TASK BRIDGE BOT (NAMESPACED)
// ================================================================

const BOT_CONFIG = {
  TELEGRAM_TOKEN: (typeof getPrimaryBotToken_ === 'function')
    ? getPrimaryBotToken_()
    : (PropertiesService.getScriptProperties().getProperty('BOT_TOKEN') || ''),
  CHAT_ID: PropertiesService.getScriptProperties().getProperty('CHAT_ID') || '',
  SHEET_ID: PropertiesService.getScriptProperties().getProperty('SYNC_SHEET_ID') || '',
  WEBHOOK_URL: PropertiesService.getScriptProperties().getProperty('BRIDGE_WEBHOOK_URL') || ''
};

function bridge_handleTelegramMessage(message) {
  const chatId = message.chat.id;
  const text = message.text;

  const allowedChatId = PropertiesService.getScriptProperties().getProperty('CHAT_ID');
  if (chatId.toString() !== allowedChatId) {
    return;
  }

  Logger.log(`Received message: ${text}`);

  if (text.startsWith('/')) {
    bridge_handleBotCommand(chatId, text);
  } else {
    bridge_handleTaskOperation(chatId, text);
  }
}

function bridge_handleBotCommand(chatId, command) {
  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  switch (cmd) {
    case '/start':
      bridge_sendTelegramMessage(
        chatId,
        `🤖 *Task Bridge Bot Active*\n\nCommands:\n/push - Vault push (Bridge rclone)\n/pull - Vault pull (Bridge rclone)\n/sync - Task sync (TickTick <-> Taskwarrior)\n/status - Task sync status\n/help - Show help`
      );
      break;

    case '/sync':
      bridge_performManualSync(chatId);
      break;
    case '/push':
    case '/vaultpush':
      bridge_pushVault(chatId);
      break;
    case '/pull':
    case '/vaultpull':
      bridge_pullVault(chatId);
      break;

    case '/status':
      bridge_showSyncStatus(chatId);
      break;

    case '/hot':
      bridge_addToHotList(chatId, args);
      break;

    case '/hit':
      bridge_addHitTask(chatId, args);
      break;

    case '/done':
      bridge_markTaskDone(chatId, args);
      break;

    case '/help':
      bridge_showHelp(chatId);
      break;

    default:
      bridge_sendTelegramMessage(chatId, `❓ Unknown command: ${cmd}\nType /help for available commands`);
  }
}

function bridge_handleTaskOperation(chatId, message) {
  try {
    const operation = JSON.parse(message);

    switch (operation.type) {
      case 'task_add':
        bridge_handleTaskAdd(chatId, operation);
        break;

      case 'task_done':
        bridge_handleTaskDone(chatId, operation);
        break;

      case 'task_sync':
        bridge_handleTaskSync(chatId, operation);
        break;

      case 'task_export':
        bridge_handleTaskExport(chatId, operation);
        break;

      default:
        Logger.log('Unknown operation type:', operation.type);
    }

  } catch (error) {
    Logger.log('Non-JSON message received:', message);
  }
}

function bridge_handleTaskAdd(chatId, operation) {
  const { uuid, description, tags, project, priority, due } = operation.data;

  const syncTags = ['door', 'hit', 'strike'];
  const shouldSync = tags && tags.some(tag => syncTags.includes(tag));

  if (shouldSync) {
    const ticktickUuid = bridge_createTickTickTaskFromTaskwarrior({
      title: description,
      tags: tags,
      project: project,
      priority: priority,
      due: due
    });

    if (ticktickUuid) {
      addTaskMapping(ticktickUuid, uuid, description, 'taskwarrior_add', tags);
      bridge_sendTelegramMessage(chatId, `✅ Task synced to TickTick\n📝 *${description}*\n🏷️ ${tags.join(', ')}`);
    } else {
      bridge_sendTelegramMessage(chatId, `❌ Failed to sync task to TickTick\n📝 *${description}*`);
    }
  }
}

function bridge_handleTaskDone(chatId, operation) {
  const { uuid, description } = operation.data;

  const mapping = bridge_findMappingByTaskwarriorUuid(uuid);

  if (mapping && mapping.ticktickUuid) {
    const success = bridge_completeTickTickTask(mapping.ticktickUuid);

    if (success) {
      bridge_updateMappingStatus(mapping.row, 'completed');
      bridge_sendTelegramMessage(chatId, `✅ Task completed in both systems\n📝 *${description}*`);
    } else {
      bridge_sendTelegramMessage(chatId, `⚠️ Task completed in Taskwarrior but failed to sync to TickTick\n📝 *${description}*`);
    }
  }
}

function bridge_handleTaskSync(chatId, operation) {
  bridge_sendTelegramMessage(chatId, '🔄 Starting sync...');

  const stats = syncTasksBetweenSystems({ source: 'export' });

  const message = `🔄 *Sync Complete*\n\n` +
    `Created in TickTick: ${stats.created.ticktick}\n` +
    `Created in Taskwarrior: ${stats.created.taskwarrior}\n` +
    `Updated: ${stats.updated.ticktick + stats.updated.taskwarrior}\n` +
    `Errors: ${stats.errors}`;

  bridge_sendTelegramMessage(chatId, message);
}

function bridge_handleTaskExport(chatId, operation) {
  const { tasks } = operation.data;

  let syncCount = 0;
  const syncTags = ['door', 'hit', 'strike'];

  tasks.forEach(task => {
    const shouldSync = task.tags && task.tags.some(tag => syncTags.includes(tag));

    if (shouldSync && task.status === 'pending') {
      const existingMapping = bridge_findMappingByTaskwarriorUuid(task.uuid);

      if (!existingMapping) {
        const ticktickUuid = bridge_createTickTickTaskFromTaskwarrior({
          title: task.description,
          tags: task.tags,
          project: task.project,
          priority: task.priority,
          due: task.due
        });

        if (ticktickUuid) {
          addTaskMapping(ticktickUuid, task.uuid, task.description, 'export_sync', task.tags);
          syncCount++;
        }
      }
    }
  });

  bridge_sendTelegramMessage(chatId, `📥 *Export Sync Complete*\n\nSynced ${syncCount} tasks from Taskwarrior to TickTick`);
}

function bridge_sendTelegramMessage(chatId, text, parseMode) {
  const token = (typeof getPrimaryBotToken_ === 'function')
    ? getPrimaryBotToken_()
    : (PropertiesService.getScriptProperties().getProperty('BOT_TOKEN') || '');
  if (!token) {
    Logger.log('bridge_sendTelegramMessage: BOT_TOKEN missing');
    return;
  }

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: parseMode || 'Markdown'
  };

  try {
    UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload)
    });
  } catch (error) {
    Logger.log('Error sending Telegram message:', error);
  }
}

function bridge_addToHotList(chatId, idea) {
  if (!idea) {
    bridge_sendTelegramMessage(chatId, '💡 Usage: /hot <your idea>');
    return;
  }

  const ticktickUuid = createTickTickTask({
    title: `💡 ${idea}`,
    tags: ['hot', 'idea'],
    project: 'Inbox'
  });

  if (ticktickUuid) {
    bridge_sendTelegramMessage(chatId, `💡 *Idea captured!*\n\n${idea}`);
  } else {
    bridge_sendTelegramMessage(chatId, `❌ Failed to capture idea`);
  }
}

function bridge_addHitTask(chatId, taskDescription) {
  if (!taskDescription) {
    bridge_sendTelegramMessage(chatId, '🎯 Usage: /hit <task description>');
    return;
  }

  const ticktickUuid = createTickTickTask({
    title: `🎯 ${taskDescription}`,
    tags: ['hit'],
    project: 'Hits'
  });

  if (ticktickUuid) {
    bridge_sendTelegramMessage(chatId, `🎯 *Hit added!*\n\n${taskDescription}`);
  } else {
    bridge_sendTelegramMessage(chatId, `❌ Failed to add hit task`);
  }
}

function bridge_markTaskDone(chatId, taskQuery) {
  if (!taskQuery) {
    bridge_sendTelegramMessage(chatId, '✅ Usage: /done <task search term>');
    return;
  }

  bridge_sendTelegramMessage(chatId, `✅ Task completion not yet implemented\n\nSearch: "${taskQuery}"`);
}

function bridge_showHelp(chatId) {
  const helpText = `🤖 *Task Bridge Bot Help*\n\n` +
    `*Quick Commands:*\n` +
    `/hot <idea> - Add to Hot List\n` +
    `/hit <task> - Add Hit task\n` +
    `/done <search> - Mark task done\n` +
    `/push - Vault push (Bridge rclone)\n` +
    `/pull - Vault pull (Bridge rclone)\n` +
    `/sync - Task sync (TickTick <-> Taskwarrior)\n` +
    `/status - Task sync status\n\n` +
    `*Task Sync Scope:*\n` +
    `• Tags #door #hit #strike only (pending)\n\n` +
    `*Fish Integration:*\n` +
    `• \`task_add_sync\` - Auto-sync new tasks\n` +
    `• \`task_done_sync <uuid>\` - Complete & sync\n` +
    `• \`task_sync_all\` - Full sync\n` +
    `• \`task_export_sync\` - Export-based sync\n\n` +
    `*Tags for Auto-Sync:*\n` +
    `• #door - Strategic priorities\n` +
    `• #hit - Daily targets\n` +
    `• #strike - Action items`;

  bridge_sendTelegramMessage(chatId, helpText);
}

function bridge_showSyncStatus(chatId) {
  const mappings = getAllMappings();
  const totalMapped = mappings.length;
  const recentSyncs = mappings.filter(m => {
    const lastSync = new Date(m.lastSync);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return lastSync > oneDayAgo;
  }).length;

  const statusText = `📊 *Sync Status*\n\n` +
    `Total mapped tasks: ${totalMapped}\n` +
    `Synced in last 24h: ${recentSyncs}\n` +
    `Last full sync: ${bridge_getLastFullSyncTime()}\n\n` +
    `🔄 Auto-sync: Active\n` +
    `📱 Mobile access: TickTick\n` +
    `💻 Terminal access: Taskwarrior\n` +
    `🏷️ Scope: #door #hit #strike`;

  bridge_sendTelegramMessage(chatId, statusText);
}

function bridge_pullVault(chatId) {
  bridge_sendTelegramMessage(chatId, '📥 Pulling Vault from Drive...');
  const res = bridge_syncPull();
  if (res && res.ok) {
    bridge_sendTelegramMessage(chatId, '✅ Vault pull complete');
  } else {
    bridge_sendTelegramMessage(chatId, `❌ Vault pull failed\n${(res && res.error) || 'Unknown error'}`);
  }
}

function bridge_pushVault(chatId) {
  bridge_sendTelegramMessage(chatId, '📤 Pushing Vault to Drive...');
  const res = bridge_syncPush();
  if (res && res.ok) {
    bridge_sendTelegramMessage(chatId, '✅ Vault push complete');
  } else {
    bridge_sendTelegramMessage(chatId, `❌ Vault push failed\n${(res && res.error) || 'Unknown error'}`);
  }
}

function bridge_performManualSync(chatId) {
  bridge_sendTelegramMessage(chatId, '🔄 Starting manual sync...');

  try {
    const stats = syncTasksBetweenSystems();

    const message = `✅ *Manual Sync Complete*\n\n` +
      `📝 Created in TickTick: ${stats.created.ticktick}\n` +
      `⚡ Created in Taskwarrior: ${stats.created.taskwarrior}\n` +
      `🔄 Updates: ${stats.updated.ticktick + stats.updated.taskwarrior}\n` +
      `❌ Errors: ${stats.errors}`;

    bridge_sendTelegramMessage(chatId, message);
  } catch (error) {
    bridge_sendTelegramMessage(chatId, `❌ Sync failed: ${error.message}`);
  }
}

function bridge_getLastFullSyncTime() {
  const lastSync = PropertiesService.getScriptProperties().getProperty('LAST_FULL_SYNC');
  return lastSync || 'Never';
}

function bridge_initializeTelegramBot() {
  bridge_setTelegramWebhook();
  initializeTaskSyncMap();
  Logger.log('Telegram Task Bridge Bot initialized!');
}

function bridge_setTelegramWebhook(url) {
  const sp = PropertiesService.getScriptProperties();
  const token = (typeof getPrimaryBotToken_ === 'function')
    ? getPrimaryBotToken_()
    : (sp.getProperty('BOT_TOKEN') || '');
  if (!token) throw new Error('bridge_setTelegramWebhook: Telegram token missing');

  let webhookUrl = String(url || '').trim();
  if (!webhookUrl) webhookUrl = String(sp.getProperty('TELEGRAM_WEBHOOK_URL') || '').trim();
  if (!webhookUrl) webhookUrl = String(sp.getProperty('BRIDGE_WEBHOOK_URL') || '').trim();
  webhookUrl = tg_getWebhookUrl_('', webhookUrl);
  if (!webhookUrl) throw new Error('bridge_setTelegramWebhook: webhook url missing');
  if (url) sp.setProperty('TELEGRAM_WEBHOOK_URL', webhookUrl);
  return tg_setWebhook_(token, webhookUrl);
}

function bridge_createTickTickTaskFromTaskwarrior(task) {
  return createTickTickTask({
    title: task.title,
    tags: task.tags || [],
    project: task.project || 'Inbox',
    priority: task.priority,
    due: task.due
  });
}

function bridge_findMappingByTaskwarriorUuid(uuid) {
  const mappings = getAllMappings();
  return mappings.find(m => m.taskwarriorUuid === uuid) || null;
}

function bridge_updateMappingStatus(row, status) {
  const ss = SpreadsheetApp.openById(SYNC_CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(SYNC_CONFIG.SYNC_SHEET_NAME);
  sheet.getRange(row, 4).setValue(status);
}

function bridge_completeTickTickTask(taskId) {
  const token = PropertiesService.getScriptProperties().getProperty('TICKTICK_TOKEN');
  if (!token) return false;

  const url = `https://api.ticktick.com/open/v1/task/${encodeURIComponent(taskId)}/complete`;
  const res = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  });

  return res.getResponseCode() >= 200 && res.getResponseCode() < 300;
}

// ================================================================
// TASK SYNC MAPPING SYSTEM (INLINE)
// ================================================================

const SYNC_CONFIG = {
  SHEET_ID: PropertiesService.getScriptProperties().getProperty('SYNC_SHEET_ID') || '',
  SYNC_SHEET_NAME: 'Task_Sync_Map',
  TASKWARRIOR_ENDPOINT: PropertiesService.getScriptProperties().getProperty('TASKWARRIOR_ENDPOINT') || '',
  TICKTICK_API: {
    BASE_URL: 'https://api.ticktick.com/open/v1',
    TOKEN: PropertiesService.getScriptProperties().getProperty('TICKTICK_TOKEN') || ''
  },
  SYNC_TAGS: ['door', 'hit', 'strike'],
  CONFLICT_RESOLUTION: 'last_modified_wins'
};

function initializeTaskSyncMap() {
  const ss = SpreadsheetApp.openById(SYNC_CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(SYNC_CONFIG.SYNC_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SYNC_CONFIG.SYNC_SHEET_NAME);
  }

  const headers = [
    'TickTick_UUID',
    'Taskwarrior_UUID',
    'Title',
    'Status',
    'Last_Sync',
    'Source',
    'Conflict_Reason',
    'TickTick_Modified',
    'Taskwarrior_Modified',
    'Tags'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 120);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 200);
}

function addTaskMapping(ticktickUuid, taskwarriorUuid, title, source, tags) {
  const ss = SpreadsheetApp.openById(SYNC_CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(SYNC_CONFIG.SYNC_SHEET_NAME);
  const existingRow = findMappingRow(ticktickUuid, taskwarriorUuid);

  const now = new Date();
  const rowData = [
    ticktickUuid || '',
    taskwarriorUuid || '',
    title,
    'synced',
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    source || 'sync',
    '',
    '',
    '',
    (tags || []).join(', ')
  ];

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function findMappingRow(ticktickUuid, taskwarriorUuid) {
  const ss = SpreadsheetApp.openById(SYNC_CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(SYNC_CONFIG.SYNC_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowTickTick = data[i][0];
    const rowTaskwarrior = data[i][1];

    if ((ticktickUuid && rowTickTick === ticktickUuid) ||
        (taskwarriorUuid && rowTaskwarrior === taskwarriorUuid)) {
      return i + 1;
    }
  }

  return -1;
}

function getAllMappings() {
  const ss = SpreadsheetApp.openById(SYNC_CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(SYNC_CONFIG.SYNC_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const mappings = [];
  for (let i = 1; i < data.length; i++) {
    mappings.push({
      ticktickUuid: data[i][0],
      taskwarriorUuid: data[i][1],
      title: data[i][2],
      status: data[i][3],
      lastSync: data[i][4],
      source: data[i][5],
      conflictReason: data[i][6],
      ticktickModified: data[i][7],
      taskwarriorModified: data[i][8],
      tags: data[i][9] ? data[i][9].split(', ') : [],
      row: i + 1
    });
  }

  return mappings;
}

function getTickTickSyncableTasks() {
  const token = PropertiesService.getScriptProperties().getProperty('TICKTICK_TOKEN');
  if (!token) return [];

  try {
    const projectsResponse = UrlFetchApp.fetch(`${SYNC_CONFIG.TICKTICK_API.BASE_URL}/project`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });

    const projects = JSON.parse(projectsResponse.getContentText());
    const syncableTasks = [];

    projects.forEach(project => {
      const tasksResponse = UrlFetchApp.fetch(`${SYNC_CONFIG.TICKTICK_API.BASE_URL}/project/${project.id}/task`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      const tasks = JSON.parse(tasksResponse.getContentText());

      tasks.forEach(task => {
        const taskTags = task.tags || [];
        const hasSyncTag = SYNC_CONFIG.SYNC_TAGS.some(tag =>
          taskTags.includes(tag) || String(task.title || '').includes(`#${tag}`)
        );

        if (hasSyncTag && task.status === 0) {
          syncableTasks.push({
            uuid: task.id,
            title: task.title,
            description: task.content || '',
            due: task.dueDate,
            priority: task.priority,
            tags: taskTags,
            modified: task.modifiedTime,
            project: project.name
          });
        }
      });
    });

    return syncableTasks;

  } catch (error) {
    Logger.log('Error fetching TickTick tasks:', error);
    return [];
  }
}

function createTickTickTask(task) {
  const token = PropertiesService.getScriptProperties().getProperty('TICKTICK_TOKEN');

  const payload = {
    title: task.title,
    content: task.description || '',
    tags: task.tags || [],
    priority: task.priority || 0,
    dueDate: task.due || null
  };

  try {
    const response = UrlFetchApp.fetch(`${SYNC_CONFIG.TICKTICK_API.BASE_URL}/task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    });

    const createdTask = JSON.parse(response.getContentText());
    return createdTask.id;

  } catch (error) {
    Logger.log('Error creating TickTick task:', error);
    return null;
  }
}

function getTaskwarriorSyncableTasks() {
  if (!SYNC_CONFIG.TASKWARRIOR_ENDPOINT) {
    return getTaskwarriorTasksFromFile();
  }

  try {
    const response = UrlFetchApp.fetch(`${SYNC_CONFIG.TASKWARRIOR_ENDPOINT}/tasks`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const tasks = JSON.parse(response.getContentText());

    return tasks.filter(task => {
      const taskTags = task.tags || [];
      return SYNC_CONFIG.SYNC_TAGS.some(tag => taskTags.includes(tag)) &&
             task.status === 'pending';
    }).map(task => ({
      uuid: task.uuid,
      title: task.description,
      description: task.annotations ? task.annotations.map(a => a.description).join('\n') : '',
      due: task.due,
      priority: task.priority,
      tags: task.tags || [],
      modified: task.modified,
      project: task.project
    }));

  } catch (error) {
    Logger.log('Error fetching Taskwarrior tasks via API:', error);
    return getTaskwarriorTasksFromFile();
  }
}

function aos_findTaskExportFileId_once_() {
  const alphaos = aos_getAlphaosVaultFolder_();
  const fileIt = alphaos.getFilesByName('task_export.json');
  if (!fileIt.hasNext()) throw new Error('task_export.json not found in AlphaOS-Vault/.alphaos');
  const id = fileIt.next().getId();
  PropertiesService.getScriptProperties().setProperty('AOS_TASK_EXPORT_FILE_ID', id);
  return id;
}

function aos_getAlphaosVaultFolder_() {
  const rootIt = DriveApp.getFoldersByName('AlphaOS-Vault');
  if (!rootIt.hasNext()) throw new Error('AlphaOS-Vault folder not found');
  const root = rootIt.next();
  const alphaosIt = root.getFoldersByName('.alphaos');
  if (!alphaosIt.hasNext()) throw new Error('AlphaOS-Vault/.alphaos folder not found');
  return alphaosIt.next();
}

function aos_readTaskExportRaw_() {
  const sp = PropertiesService.getScriptProperties();
  let id = sp.getProperty('AOS_TASK_EXPORT_FILE_ID');
  if (!id) {
    id = aos_findTaskExportFileId_once_();
  }
  return DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8');
}

function aos_loadTaskExport_() {
  const text = aos_readTaskExportRaw_();
  const tasks = JSON.parse(text || '[]');
  return Array.isArray(tasks) ? tasks : [];
}

function aos_getTaskExportCacheFile_() {
  const sp = PropertiesService.getScriptProperties();
  let id = sp.getProperty('AOS_TASK_EXPORT_CACHE_ID');
  if (id) {
    try {
      return DriveApp.getFileById(id);
    } catch (_) {}
  }
  const alphaos = aos_getAlphaosVaultFolder_();
  const it = alphaos.getFilesByName('task_export_cache.json');
  if (!it.hasNext()) return null;
  const file = it.next();
  sp.setProperty('AOS_TASK_EXPORT_CACHE_ID', file.getId());
  return file;
}

function aos_loadTaskExportCache_() {
  const file = aos_getTaskExportCacheFile_();
  if (!file) return [];
  const text = file.getBlob().getDataAsString('UTF-8');
  const tasks = JSON.parse(text || '[]');
  return Array.isArray(tasks) ? tasks : [];
}

function aos_loadTaskExportSafe_() {
  try {
    return aos_loadTaskExport_();
  } catch (error) {
    Logger.log('Primary task_export load failed: ' + error);
  }
  try {
    return aos_loadTaskExportCache_();
  } catch (error) {
    Logger.log('Cached task_export load failed: ' + error);
  }
  return [];
}

function aos_snapshotTaskExport_() {
  const sp = PropertiesService.getScriptProperties();
  const alphaos = aos_getAlphaosVaultFolder_();
  const raw = aos_readTaskExportRaw_();
  let file = aos_getTaskExportCacheFile_();
  if (!file) {
    file = alphaos.createFile('task_export_cache.json', raw, MimeType.PLAIN_TEXT);
  } else {
    file.setContent(raw);
  }
  sp.setProperty('AOS_TASK_EXPORT_CACHE_ID', file.getId());
  sp.setProperty('AOS_TASK_EXPORT_CACHE_TS', String(Date.now()));
  return { ok: true, fileId: file.getId(), bytes: raw.length };
}

function setupTaskExportSnapshotTrigger() {
  const handler = 'aos_snapshotTaskExport_';
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(trigger => trigger.getHandlerFunction() === handler);
  if (exists) return { ok: true, skipped: true };
  ScriptApp.newTrigger(handler)
    .timeBased()
    .everyHours(6)
    .create();
  return { ok: true };
}

function getTaskwarriorTasksFromFile() {
  try {
    const tasks = aos_loadTaskExportSafe_();
    return tasks.filter(task => {
      const taskTags = task.tags || [];
      return SYNC_CONFIG.SYNC_TAGS.some(tag => taskTags.includes(tag)) &&
             task.status === 'pending';
    });
  } catch (error) {
    Logger.log('Error reading Taskwarrior export file: ' + error);
    return [];
  }
}

function createTaskwarriorTask(task) {
  if (!SYNC_CONFIG.TASKWARRIOR_ENDPOINT) {
    generateTaskwarriorImportCommands([task]);
    return null;
  }

  try {
    const payload = {
      description: task.title,
      tags: task.tags || [],
      priority: task.priority,
      due: task.due,
      project: task.project
    };

    const response = UrlFetchApp.fetch(`${SYNC_CONFIG.TASKWARRIOR_ENDPOINT}/task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload)
    });

    const createdTask = JSON.parse(response.getContentText());
    return createdTask.uuid;

  } catch (error) {
    Logger.log('Error creating Taskwarrior task via API:', error);
    generateTaskwarriorImportCommands([task]);
    return null;
  }
}

function generateTaskwarriorImportCommands(tasks) {
  const commands = tasks.map(task => {
    let cmd = `task add "${task.title}"`;

    if (task.tags && task.tags.length > 0) {
      cmd += ` +${task.tags.join(' +')}`;
    }

    if (task.priority) {
      cmd += ` priority:${task.priority}`;
    }

    if (task.due) {
      cmd += ` due:${task.due}`;
    }

    if (task.project) {
      cmd += ` project:${task.project}`;
    }

    return cmd;
  });

  DriveApp.createFile('taskwarrior_import_commands.sh', commands.join('\n'), MimeType.PLAIN_TEXT);
  Logger.log(`Generated ${commands.length} Taskwarrior import commands`);
  return commands;
}

function syncTasksBetweenSystems(options) {
  Logger.log('Starting bidirectional task sync...');

  const opts = options || {};
  const source = String(opts.source || '').toLowerCase();
  const useExport = source === 'export' || opts.forceExport === true;

  const ticktickTasks = getTickTickSyncableTasks();
  const taskwarriorTasks = useExport ? getTaskwarriorTasksFromFile() : getTaskwarriorSyncableTasks();
  const existingMappings = getAllMappings();

  const syncStats = {
    created: { ticktick: 0, taskwarrior: 0 },
    updated: { ticktick: 0, taskwarrior: 0 },
    conflicts: 0,
    errors: 0
  };

  ticktickTasks.forEach(ttTask => {
    const mapping = existingMappings.find(m => m.ticktickUuid === ttTask.uuid);

    if (!mapping) {
      const twUuid = createTaskwarriorTask(ttTask);
      if (twUuid) {
        addTaskMapping(ttTask.uuid, twUuid, ttTask.title, 'ticktick_to_taskwarrior', ttTask.tags);
        syncStats.created.taskwarrior++;
      } else {
        syncStats.errors++;
      }
    }
  });

  taskwarriorTasks.forEach(twTask => {
    const mapping = existingMappings.find(m => m.taskwarriorUuid === twTask.uuid);

    if (!mapping) {
      const ttUuid = createTickTickTask(twTask);
      if (ttUuid) {
        addTaskMapping(ttUuid, twTask.uuid, twTask.title, 'taskwarrior_to_ticktick', twTask.tags);
        syncStats.created.ticktick++;
      } else {
        syncStats.errors++;
      }
    }
  });

  Logger.log('Sync completed:', syncStats);
  return syncStats;
}

// ------------------------------------------------
// (Removed) bridgeHeartbeatHook: consolidated into watchdog + doPost heartbeat.
// ------------------------------------------------
