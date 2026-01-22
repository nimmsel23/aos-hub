/**
 * Door Centre shared helpers (props, Drive, TickTick, WarStack drafts)
 */

var DOOR_CONFIG = {
  FOLDER_PROP: 'DOOR_DRIVE_FOLDER_ID',
  SHEET_PROP: 'DOOR_LOG_SHEET_ID',
  TICKTICK_TOKEN_PROP: 'TICKTICK_API_TOKEN',
  TICKTICK_PROJECT_PROP: 'TICKTICK_PROJECT_ID'
};

var DOOR_CENTRE_LABEL = 'Door';
var DOOR_CENTRE_KEY = 'DOO';

function doorGetProp(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function doorSetProp(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

function doorGetCentreFolder() {
  var folderId = doorGetProp(DOOR_CONFIG.FOLDER_PROP);
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {}
  }

  var name = 'Alpha_Door';
  var it = DriveApp.getFoldersByName(name);
  var folder = it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder(name);
  doorSetProp(DOOR_CONFIG.FOLDER_PROP, folder.getId());
  return folder;
}

function doorGetCentreSheet() {
  var sheetId = doorGetProp(DOOR_CONFIG.SHEET_PROP);
  if (sheetId) {
    try {
      var ssExisting = SpreadsheetApp.openById(sheetId);
      var sheetExisting = ssExisting.getSheetByName('Logs') || ssExisting.insertSheet('Logs');
      if (sheetExisting.getLastRow() === 0) {
        sheetExisting.appendRow(['SessionID', 'Timestamp', 'File Name', 'Drive URL', 'Characters', 'Preview']);
      }
      return sheetExisting;
    } catch (e) {}
  }

  var ssName = 'Alpha_' + DOOR_CENTRE_LABEL + '_Logsheet';
  var ss = SpreadsheetApp.create(ssName);
  doorSetProp(DOOR_CONFIG.SHEET_PROP, ss.getId());
  var sheet = ss.getSheets()[0];
  sheet.setName('Logs');
  sheet.appendRow(['SessionID', 'Timestamp', 'File Name', 'Drive URL', 'Characters', 'Preview']);
  return sheet;
}

function doorGenerateSessionId() {
  var now = new Date();
  var stamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  return DOOR_CENTRE_KEY + '-' + stamp;
}

function doorGetOrCreateSubfolder(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function doorGetDraftFolder_() {
  var root = doorGetCentreFolder();
  return doorGetOrCreateSubfolder(root, '0-Drafts');
}

function doorFindFileByName_(folder, name) {
  var files = folder.getFilesByName(name);
  return files.hasNext() ? files.next() : null;
}

function door_getWarStackUserId_() {
  var sp = PropertiesService.getScriptProperties();
  var raw = sp.getProperty('WARSTACK_USER_ID') || sp.getProperty('CHAT_ID') || '';
  var parsed = parseInt(String(raw || '').trim(), 10);
  return isNaN(parsed) ? 0 : parsed;
}

function door_getWeekKey_(date) {
  var d = date ? new Date(date) : new Date();
  var oneJan = new Date(d.getFullYear(), 0, 1);
  var number = Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + ('0' + number).slice(-2);
}

function doorResolveSubfolder(tool) {
  var key = String(tool || '').toLowerCase();
  if (key === 'hotlist' || key === 'potential') return '1-Potential';
  if (key === 'doorwar' || key === 'plan') return '2-Plan';
  if (key === 'warstack') return '3-Production';
  if (key === 'hitlist' || key === 'production') return '3-Production';
  if (key === 'profit') return '4-Profit';
  return '';
}

function doorSaveSessionToDrive(mdContent, filename, tool) {
  var folder = doorGetCentreFolder();
  var sub = doorResolveSubfolder(tool);
  var target = sub ? doorGetOrCreateSubfolder(folder, sub) : folder;
  var fileName = filename || doorGenerateSessionId();
  var file = target.createFile(fileName + '.md', mdContent, MimeType.PLAIN_TEXT);
  try {
    doorLogSession(mdContent, fileName, file.getUrl());
  } catch (e) {
    Logger.log('Door log failed: ' + e);
  }
  return { id: file.getId(), name: file.getName(), url: file.getUrl() };
}

function door_buildWarStackPayload_(draft) {
  var now = new Date();
  var payload = {
    user_id: door_getWarStackUserId_(),
    title: String((draft && draft.title) || ''),
    domain: String((draft && draft.domain) || ''),
    subdomain: String((draft && draft.subdomain) || ''),
    domino_door: String((draft && draft.door) || ''),
    trigger: String((draft && draft.trigger) || ''),
    narrative: String((draft && draft.narrative) || ''),
    validation: String((draft && draft.validation) || ''),
    impact: String((draft && draft.impact) || ''),
    consequences: String((draft && draft.consequences) || ''),
    hits: [],
    insights: String((draft && draft.insights) || ''),
    lessons: String((draft && draft.lessons) || ''),
    date: Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    week: door_getWeekKey_(now)
  };

  var hits = (draft && draft.hits) ? draft.hits : [];
  hits.forEach(function(hit) {
    if (!hit) return;
    payload.hits.push({
      fact: String(hit.fact || ''),
      obstacle: String(hit.obstacle || ''),
      strike: String(hit.strike || ''),
      responsibility: String(hit.responsibility || '')
    });
  });

  while (payload.hits.length < 4) {
    payload.hits.push({ fact: '', obstacle: '', strike: '', responsibility: '' });
  }

  return payload;
}

function door_mapWarStackToDraft_(payload) {
  if (!payload) return {};
  var hits = (payload.hits || []).map(function(hit) {
    return {
      fact: hit.fact || '',
      obstacle: hit.obstacle || '',
      strike: hit.strike || '',
      responsibility: hit.responsibility || ''
    };
  });
  return {
    title: payload.title || '',
    domain: payload.domain || '',
    subdomain: payload.subdomain || '',
    door: payload.domino_door || '',
    trigger: payload.trigger || '',
    narrative: payload.narrative || '',
    validation: payload.validation || '',
    impact: payload.impact || '',
    consequences: payload.consequences || '',
    insights: payload.insights || '',
    lessons: payload.lessons || '',
    hits: hits
  };
}

function door_saveWarStackDraft_(payload) {
  if (!payload || !payload.sessionId || !payload.draft) {
    return { ok: false, error: 'missing sessionId or draft' };
  }

  var sessionId = String(payload.sessionId || '').trim();
  if (!sessionId) return { ok: false, error: 'sessionId empty' };

  var draft = payload.draft || {};
  var warstack = door_buildWarStackPayload_(draft);

  var folder = doorGetDraftFolder_();
  var fileName = 'WarStack_Draft_' + sessionId + '.json';
  var file = doorFindFileByName_(folder, fileName);
  var content = JSON.stringify(warstack, null, 2);

  if (file) {
    file.setContent(content);
  } else {
    file = folder.createFile(fileName, content, MimeType.PLAIN_TEXT);
  }

  door_syncWarStackDraftToBridge_(warstack, sessionId, 'save');
  return { ok: true, file: { id: file.getId(), name: file.getName(), url: file.getUrl() } };
}

function door_loadWarStackDraft_(sessionId) {
  var id = String(sessionId || '').trim();
  if (!id) return { ok: false, error: 'sessionId missing' };

  var folder = doorGetDraftFolder_();
  var fileName = 'WarStack_Draft_' + id + '.json';
  var file = doorFindFileByName_(folder, fileName);
  if (!file) return { ok: false, error: 'draft not found' };

  var content = file.getBlob().getDataAsString();
  try {
    var data = JSON.parse(content);
    if (data && data.draft) {
      return { ok: true, draft: data.draft || {}, updated_at: data.updated_at || '' };
    }
    return { ok: true, draft: door_mapWarStackToDraft_(data), updated_at: '' };
  } catch (e) {
    return { ok: false, error: 'invalid json' };
  }
}

function door_clearWarStackDraft_(sessionId) {
  var id = String(sessionId || '').trim();
  if (!id) return { ok: false, error: 'sessionId missing' };

  var folder = doorGetDraftFolder_();
  var fileName = 'WarStack_Draft_' + id + '.json';
  var file = doorFindFileByName_(folder, fileName);
  if (file) {
    file.setTrashed(true);
  }

  var warstack = { user_id: door_getWarStackUserId_() };
  door_syncWarStackDraftToBridge_(warstack, id, 'clear');
  return { ok: true };
}

function door_bridgeHeaders_() {
  var sp = PropertiesService.getScriptProperties();
  var token =
    sp.getProperty('AOS_BRIDGE_TOKEN') ||
    sp.getProperty('BRIDGE_TOKEN') ||
    '';
  return token ? { 'X-Bridge-Token': token } : {};
}

function door_syncWarStackDraftToBridge_(warstack, sessionId, action) {
  var bridgeBase = (typeof getBridgeUrl_ === 'function') ? getBridgeUrl_() : '';
  if (!bridgeBase) return { ok: false, error: 'bridge URL not set (AOS_BRIDGE_URL)' };
  var userId = warstack && warstack.user_id ? warstack.user_id : door_getWarStackUserId_();
  if (!userId) return { ok: false, error: 'WARSTACK_USER_ID missing' };

  try {
    var payload = {
      action: action || 'save',
      session_id: sessionId || '',
      user_id: userId,
      warstack: warstack || {}
    };
    bridgeBase = String(bridgeBase || '').replace(/\/$/, '');
    var url = /\/bridge$/.test(bridgeBase)
      ? (bridgeBase + '/warstack/draft')
      : (bridgeBase + '/bridge/warstack/draft');
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: door_bridgeHeaders_(),
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    return { ok: res.getResponseCode() >= 200 && res.getResponseCode() < 300 };
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

function door_saveProfitJson_(data) {
  if (!data) return { ok: false, error: 'missing data' };
  var date = String(data.date || '').trim() || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var week = door_getIsoWeek_(new Date(date));
  var hitCount = Array.isArray(data.hits) ? data.hits.length : 0;
  var bigTotal = 4;
  var execution = bigTotal ? Math.round((hitCount / bigTotal) * 100) : 0;
  var profitUuid = String(data.profit_uuid || '').trim();
  if (!profitUuid && typeof door_getLatestWarStackUuids_ === 'function') {
    var latest = door_getLatestWarStackUuids_();
    if (latest && latest.ok && latest.profit_uuid) profitUuid = latest.profit_uuid;
  }
  var payload = {
    date: date,
    week: week,
    door_opened: String(data.door_opened || ''),
    door_obstacle: String(data.door_obstacle || ''),
    profit_uuid: profitUuid,
    hits: Array.isArray(data.hits) ? data.hits : [],
    done: Array.isArray(data.done) ? data.done : [],
    insight: String(data.insight || ''),
    lesson: String(data.lesson || ''),
    score: {
      big_rocks_total: bigTotal,
      big_rocks_done: hitCount,
      execution_percent: execution
    },
    updated_at: new Date().toISOString()
  };

  var folder = doorGetCentreFolder();
  var sub = doorResolveSubfolder('profit');
  var target = sub ? doorGetOrCreateSubfolder(folder, sub) : folder;
  var fileName = 'door_profit_' + date + '.json';
  var file = doorFindFileByName_(target, fileName);
  var content = JSON.stringify(payload, null, 2);

  if (file) {
    file.setContent(content);
  } else {
    file = target.createFile(fileName, content, MimeType.PLAIN_TEXT);
  }

  var task = null;
  if (profitUuid && typeof bridge_taskModify_ === 'function') {
    task = bridge_taskModify_(profitUuid, {
      tags_add: ['profit_done'],
      priority: 'L'
    });
  }

  return { ok: true, file: { id: file.getId(), name: file.getName(), url: file.getUrl() }, task: task };
}

function door_getIsoWeek_(dateObj) {
  var d = dateObj instanceof Date ? dateObj : new Date();
  var tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  var day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  var yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  var week = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return tmp.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

function doorLogSession(mdContent, sessionId, fileUrl) {
  var sheet = doorGetCentreSheet();
  var preview = (mdContent || '').substring(0, 200).replace(/\n/g, ' ');
  sheet.appendRow([sessionId, new Date(), sessionId + '.md', fileUrl, (mdContent || '').length, preview]);
}

function doorPhaseFromTool_(tool) {
  var t = String(tool || '').toLowerCase();
  if (t === 'hotlist' || t === 'potential') return 'potential';
  if (t === 'doorwar' || t === 'plan') return 'plan';
  if (t === 'warstack') return 'production';
  if (t === 'hitlist' || t === 'production') return 'production';
  if (t === 'profit') return 'profit';
  return '';
}

function doorGetTickTickProjectId_(phase) {
  var sp = PropertiesService.getScriptProperties();
  var map = {
    potential: 'DOOR_TICKTICK_PROJECT_POTENTIAL',
    plan: 'DOOR_TICKTICK_PROJECT_PLAN',
    production: 'DOOR_TICKTICK_PROJECT_PRODUCTION',
    profit: 'DOOR_TICKTICK_PROJECT_PROFIT'
  };
  var key = map[String(phase || '').toLowerCase()] || '';
  return sp.getProperty(key) || sp.getProperty('TICKTICK_INBOX_PROJECT_ID') || 'inbox';
}

function doorGetTickTickTitle_(tool, markdown, meta) {
  var base = '';
  if (meta) {
    var metaMap = door_parseMetaMap_(meta);
    if (metaMap && metaMap.door) {
      base = String(metaMap.door || '').trim();
    } else {
      base = String(meta).trim();
    }
  }
  if (!base && markdown) {
    var lines = String(markdown).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      if (line.startsWith('#')) {
        base = line.replace(/^#+\s*/, '').trim();
        break;
      }
      base = line;
      break;
    }
  }
  if (!base) base = 'Door ' + String(tool || 'Entry');
  return base;
}

function doorCompactMarkdown_(markdown, limit) {
  var text = String(markdown || '').trim();
  if (!limit) limit = 1800;
  if (text.length <= limit) return text;
  return text.slice(0, limit) + '\n…';
}

function door_syncToTickTick_(tool, markdown, meta) {
  var phase = doorPhaseFromTool_(tool);
  if (!phase) return { ok: false, error: 'phase not mapped' };

  var token = PropertiesService.getScriptProperties().getProperty('TICKTICK_TOKEN');
  if (!token) return { ok: false, error: 'TICKTICK_TOKEN missing' };

  var projectId = doorGetTickTickProjectId_(phase);
  var title = doorGetTickTickTitle_(tool, markdown, meta);
  var content = doorCompactMarkdown_(markdown, 1800);

  try {
    var payload = {
      title: title,
      content: content,
      tags: ['door', phase],
      projectId: projectId
    };
    var res = UrlFetchApp.fetch('https://api.ticktick.com/open/v1/task', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var ok = res.getResponseCode() >= 200 && res.getResponseCode() < 300;
    return { ok: ok, projectId: projectId };
  } catch (e) {
    Logger.log('door TickTick sync failed: ' + e.toString());
    return { ok: false, error: e.toString() };
  }
}

// ------------------------------------------------------------
// Door War Taskwarrior task (via Bridge)
// ------------------------------------------------------------
function door_parseMetaMap_(meta) {
  var out = {};
  var raw = String(meta || '').trim();
  if (!raw) return out;
  raw.split(';').forEach(function(pair) {
    var idx = pair.indexOf(':');
    if (idx === -1) return;
    var key = pair.slice(0, idx).trim();
    var val = pair.slice(idx + 1).trim();
    if (key) out[key] = val;
  });
  return out;
}

function door_extractDoorWarChoice_(markdown) {
  var lines = String(markdown || '').split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('**Door:**')) {
      return line.replace('**Door:**', '').trim();
    }
    if (line.startsWith('**Domino Door:**')) {
      return line.replace('**Domino Door:**', '').trim();
    }
  }
  return '';
}

function door_getHotlistDepends_(metaMap) {
  if (!metaMap || !metaMap.hotlist_file_id) return '';
  if (typeof hotlist_findEntryByFileId_ !== 'function') return '';
  var entry = hotlist_findEntryByFileId_(metaMap.hotlist_file_id);
  if (entry && entry.task_uuid) return entry.task_uuid;
  return '';
}

function door_buildDoorWarTask_(markdown, meta, ctx) {
  var metaMap = door_parseMetaMap_(meta);
  var doorTitle = metaMap.door || door_extractDoorWarChoice_(markdown) || 'Domino Door';
  var depends = door_getHotlistDepends_(metaMap);
  var context = ctx || {};
  var quad = String(metaMap.quad || '').trim().toLowerCase();
  var priority = '';
  if (quad === 'q1') priority = 'H';
  else if (quad === 'q2') priority = 'M';
  else if (quad === 'q3') priority = 'L';
  var task = {
    description: 'Door War: ' + doorTitle,
    project: 'DoorWar',
    tags: ['plan', 'door'],
    priority: priority || undefined,
    meta: {
      doorwar: true,
      door_title: doorTitle,
      hotlist_file_id: metaMap.hotlist_file_id || '',
      doorwar_file_id: context.fileId || '',
      doorwar_session_id: context.sessionId || ''
    }
  };
  if (depends) task.depends = depends;
  return task;
}

function door_createDoorWarTask_(markdown, meta, ctx) {
  var task = door_buildDoorWarTask_(markdown, meta, ctx);
  if (!task || !task.description) return { ok: false, error: 'missing task' };
  var health = (typeof bridgeHealth_ === 'function') ? bridgeHealth_() : { ok: false };
  if (health && health.ok && typeof bridge_taskExecutor_ === 'function') {
    return bridge_taskExecutor_({ task: task });
  }
  if (typeof door_enqueueTaskOps_ === 'function') {
    return door_enqueueTaskOps_([task]);
  }
  return { ok: false, error: 'bridge offline and no queue available' };
}

// ------------------------------------------------------------
// Markdown helpers (frontmatter + changelog)
// ------------------------------------------------------------
function door_updateFrontmatter_(content, key, value) {
  var text = String(content || '');
  var fm = /^---\n([\s\S]*?)\n---/;
  var match = text.match(fm);
  if (!match) return text;
  var head = match[1];
  var lineRe = new RegExp('^' + key + ':.*$', 'm');
  if (head.match(lineRe)) {
    head = head.replace(lineRe, key + ': ' + value);
  } else {
    head += '\n' + key + ': ' + value;
  }
  return text.replace(fm, '---\n' + head + '\n---');
}

function door_addChangelog_(content, entryLine) {
  var text = String(content || '');
  var blockRe = /(## Changelog[\s\S]*?\|.*?\|[\s\S]*?\n)/;
  var match = text.match(blockRe);
  if (!match) return text;
  var block = match[1];
  var updated = block.replace(/(\n)(\|      \|)/, '\n' + entryLine + '\n$2');
  return text.replace(blockRe, updated);
}

function door_logPhaseChange_(content, phase, notes) {
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var entry = '| ' + dateStr + ' | Phase Update | ' + phase + ' | ' + (notes || 'Progressed') + ' |';
  return door_addChangelog_(content, entry);
}

// ------------------------------------------------------------
// Door save entry (moved from door.gs)
// ------------------------------------------------------------
function saveDoorEntry(payload) {
  if (!payload || !payload.markdown) {
    return { ok: false, error: 'Kein Payload oder Markdown leer.' };
  }

  var sessionId = payload.sessionId || doorGenerateSessionId();
  var tool = payload.tool || 'Door';
  var meta = payload.meta || '';
  var md = payload.markdown;

  var header = [
    '# ' + DOOR_CENTRE_LABEL + ' – ' + tool,
    '',
    '**Session:** ' + sessionId,
    meta ? '**Meta:** ' + meta : '',
    meta ? '' : '',
    '---',
    ''
  ].join('\n');

  var fullMd = header + md;
  var filename = sessionId + '_' + tool;
  var phase = doorPhaseFromTool_(tool);
  if (phase) {
    fullMd = door_updateFrontmatter_(fullMd, 'phase', phase);
    fullMd = door_logPhaseChange_(fullMd, phase, 'Saved via HQ');
  }
  var result = doorSaveSessionToDrive(fullMd, filename, tool);

  var ticktick = door_syncToTickTick_(tool, fullMd, meta);
  var telegram = null;
  var doorwarTask = null;
  if (String(tool || '').toLowerCase() === 'doorwar') {
    doorwarTask = door_createDoorWarTask_(fullMd, meta, {
      sessionId: sessionId,
      fileId: result && result.id ? result.id : ''
    });
    if (doorwarTask && doorwarTask.ok && doorwarTask.results) {
      door_updateDoorWarTaskwarriorUuids_(doorwarTask.results);
    }
  }
  if (String(tool || '').toLowerCase() === 'warstack') {
    telegram = door_sendWarStackTelegram_(fullMd);
    var tasks = door_buildWarStackTasks_(fullMd, {
      sessionId: sessionId,
      fileId: result.id,
      title: doorExtractTitle(fullMd)
    });
    if (tasks.length) {
      door_enqueueTaskOps_(tasks);
    }
  }

  return { ok: true, sessionId: sessionId, tool: tool, file: result, ticktick: ticktick, telegram: telegram, doorwar_task: doorwarTask };
}

function door_updateDoorWarTaskwarriorUuids_(results) {
  if (!results || !results.length) return { ok: false, updated: 0 };
  var grouped = {};
  results.forEach(function(entry) {
    if (!entry || !entry.task_uuid) return;
    var meta = entry.meta || entry.task_meta || {};
    var fileId = meta.doorwar_file_id;
    if (!fileId) return;
    if (!grouped[fileId]) grouped[fileId] = [];
    grouped[fileId].push({
      uuid: entry.task_uuid,
      title: meta.door_title || entry.description || 'Door War'
    });
  });

  var updated = 0;
  Object.keys(grouped).forEach(function(fileId) {
    try {
      var file = DriveApp.getFileById(fileId);
      var content = file.getBlob().getDataAsString();
      var entry = grouped[fileId][0];
      var next = door_upsertDoorWarTaskwarriorSection_(content, entry);
      if (next && next !== content) {
        file.setContent(next);
        updated += 1;
      }
    } catch (e) {
      Logger.log('Door War UUID update failed for ' + fileId + ': ' + e);
    }
  });
  return { ok: true, updated: updated };
}

function door_upsertDoorWarTaskwarriorSection_(content, entry) {
  if (!entry || !entry.uuid) return content;
  var cleaned = (typeof door_stripTaskwarriorSection_ === 'function')
    ? door_stripTaskwarriorSection_(content || '')
    : String(content || '');
  cleaned = door_upsertDoorWarFrontmatter_(cleaned, entry.uuid);
  var lines = [];
  lines.push('## Taskwarrior');
  lines.push('');
  lines.push('Door War Task (Taskwarrior UUID):');
  lines.push('');
  lines.push('- `' + entry.uuid + '` — ' + (entry.title || 'Door War'));
  var block = lines.join('\n');
  var trimmed = String(cleaned || '').replace(/\s+$/, '');
  return trimmed + '\n\n' + block + '\n';
}

function door_upsertDoorWarFrontmatter_(content, uuid) {
  var text = String(content || '');
  if (text.indexOf('---') !== 0) return text;
  var parts = text.split('\n');
  var out = [];
  var inHead = true;
  var found = false;
  for (var i = 0; i < parts.length; i += 1) {
    var line = parts[i];
    out.push(line);
    if (i === 0) continue;
    if (line.trim() === '---' && inHead) {
      if (!found) out.splice(out.length - 1, 0, 'taskwarrior_doorwar_uuid: ' + uuid);
      inHead = false;
      continue;
    }
    if (!inHead) continue;
    if (line.startsWith('taskwarrior_doorwar_uuid:')) {
      out[out.length - 1] = 'taskwarrior_doorwar_uuid: ' + uuid;
      found = true;
    }
  }
  return out.join('\n');
}
