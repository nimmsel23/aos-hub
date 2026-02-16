/**
 * Door War Stack helpers (parse markdown, task wiring, task queue)
 */

function listWarStackHits(userKey) {
  return (typeof door_withUserKey_ === 'function')
    ? door_withUserKey_(userKey, function() { return listWarStackHits_(); })
    : listWarStackHits_();
}

function listWarStackHits_() {
  var files = doorGetWarStackFiles_();
  if (!files.length) {
    return { ok: false, error: 'Keine War-Stack-Dateien gefunden.' };
  }

  var hits = [];
  files.forEach(function(entry) {
    var f = entry.file;
    var name = entry.name;
    var content = entry.content;
    var parsed = doorParseWarStackHits(content);
    if (parsed && parsed.hits && parsed.hits.length) {
      parsed.hits.forEach(function(hit) {
        hits.push({
          title: parsed.title,
          door: parsed.door,
          fact: hit.fact,
          obstacle: hit.obstacle,
          strike: hit.strike,
          responsibility: hit.responsibility,
          name: name,
          url: f.getUrl()
        });
      });
    }
  });

  if (!hits.length) return { ok: false, error: 'Keine War-Stack-Hits gefunden.' };
  return { ok: true, hits: hits };
}

function door_getWarStackStats() {
  var files = doorGetWarStackFiles_();
  var stackCount = 0;
  var hitCount = 0;

  files.forEach(function(entry) {
    var parsed = doorParseWarStackHits(entry.content);
    if (parsed && parsed.hits) {
      stackCount += 1;
      hitCount += parsed.hits.length;
    }
  });

  return { ok: true, count_stacks: stackCount, count_hits: hitCount };
}

/**
 * Get War Stack statistics for a specific week
 * @param {string} weekKey - Format: YYYY_WW (e.g., "2025_02")
 * @returns {object} { ok, count, completed, hits }
 */
function door_getWeekWarStacks(weekKey) {
  if (!weekKey) return { ok: false, error: 'weekKey required' };

  // Parse week key
  const parts = weekKey.split('_');
  if (parts.length !== 2) return { ok: false, error: 'Invalid weekKey format (expected YYYY_WW)' };

  const year = parseInt(parts[0]);
  const week = parseInt(parts[1]);

  // Calculate week start/end dates
  const weekStart = door_getWeekStartDate_(year, week);
  const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));

  // Get all War Stack files
  const files = doorGetWarStackFiles_();
  let count = 0;
  let completed = 0;
  let totalHits = 0;

  files.forEach(entry => {
    const fileDate = entry.file.getDateCreated();

    // Check if file was created in this week
    if (fileDate >= weekStart && fileDate < weekEnd) {
      const parsed = doorParseWarStackHits(entry.content);
      if (parsed && parsed.hits) {
        count += 1;
        totalHits += parsed.hits.length;
      }
    }
  });

  // Count completed Doors (Profit Reviews this week)
  // 1 Door = 1 War Stack = 4 Hits (always)
  try {
    const folder = doorGetCentreFolder();
    const profitFolder = doorGetOrCreateSubfolder(folder, '4-Profit');
    const profitFiles = profitFolder.getFiles();

    while (profitFiles.hasNext()) {
      const file = profitFiles.next();
      if (file.getName().startsWith('door_profit_')) {
        const fileDate = file.getDateCreated();
        if (fileDate >= weekStart && fileDate < weekEnd) {
          completed += 1;
        }
      }
    }
  } catch (e) {
    Logger.log('door_getWeekWarStacks: Profit folder check failed - ' + e);
  }

  return {
    ok: true,
    week: weekKey,
    count: count,
    completed: completed,
    hits: totalHits
  };
}

/**
 * Get week start date (Monday) from year and ISO week number
 */
function door_getWeekStartDate_(year, week) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay();
  const isoWeekStart = simple;

  if (dayOfWeek <= 4) {
    isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }

  return isoWeekStart;
}

function doorGetWarStackFiles_() {
  var root = doorGetCentreFolder();
  var folders = [];
  var seen = {};

  var itProd = root.getFoldersByName('3-Production');
  if (itProd.hasNext()) folders.push(itProd.next());
  var itLegacy = root.getFoldersByName('War-Stacks');
  if (itLegacy.hasNext()) folders.push(itLegacy.next());

  var results = [];
  folders.forEach(function(folder) {
    var files = folder.getFiles();
    while (files.hasNext()) {
      var f = files.next();
      var name = f.getName();
      if (!/\.md$/i.test(name)) continue;
      if (seen[f.getId()]) continue;
      seen[f.getId()] = true;
      results.push({ file: f, name: name, content: f.getBlob().getDataAsString() });
    }
  });

  return results;
}

function doorParseWarStackHits(markdown) {
  var lines = String(markdown || '').split(/\r?\n/);
  var title = doorExtractTitle(markdown);
  var door = doorExtractDoor(markdown);
  var hits = [];
  var current = null;

  lines.forEach(function(line) {
    var trimmed = String(line || '').trim();
    if (/^#{2,3}\s*Hit\s*\d+/i.test(trimmed)) {
      if (current && (current.fact || current.strike || current.obstacle)) {
        hits.push(current);
      }
      current = { fact: '', obstacle: '', strike: '', responsibility: '' };
      return;
    }

    if (!current) return;

    var factMatch = trimmed.match(/^(?:-\s*)?(?:\*\*)?Fact:\**\s*(.+)$/i);
    if (factMatch) {
      current.fact = factMatch[1].trim();
      return;
    }
    var obsMatch = trimmed.match(/^(?:-\s*)?(?:\*\*)?Obstacle:\**\s*(.+)$/i);
    if (obsMatch) {
      current.obstacle = obsMatch[1].trim();
      return;
    }
    var strikeMatch = trimmed.match(/^(?:-\s*)?(?:\*\*)?Strike:\**\s*(.+)$/i);
    if (strikeMatch) {
      current.strike = strikeMatch[1].trim();
      return;
    }
    var respMatch = trimmed.match(/^(?:-\s*)?(?:\*\*)?Responsibility:\**\s*(.+)$/i);
    if (respMatch) {
      current.responsibility = respMatch[1].trim();
    }
  });

  if (current && (current.fact || current.strike || current.obstacle)) {
    hits.push(current);
  }

  return { title: title, door: door, hits: hits };
}

function doorExtractFrontmatter_(markdown) {
  var text = String(markdown || '');
  if (!text.startsWith('---')) return {};
  var parts = text.split('\n');
  var map = {};
  var inHead = false;
  for (var i = 0; i < parts.length; i += 1) {
    var line = parts[i];
    if (i === 0 && line.trim() === '---') {
      inHead = true;
      continue;
    }
    if (inHead && line.trim() === '---') break;
    if (!inHead) continue;
    var idx = line.indexOf(':');
    if (idx === -1) continue;
    var key = line.slice(0, idx).trim();
    var val = line.slice(idx + 1).trim();
    if (key) map[key] = val.replace(/^\"|\"$/g, '');
  }
  return map;
}

function doorExtractTitle(markdown) {
  var fm = doorExtractFrontmatter_(markdown);
  if (fm && fm.title) return String(fm.title || '').trim();
  var lines = String(markdown || '').split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.startsWith('# War Stack')) return line.replace(/^#\s*War Stack\s*[-–]\s*/, '').trim();
    if (line.startsWith('**Title:**')) return line.replace('**Title:**', '').trim();
  }
  return 'Untitled';
}

function doorExtractDomain(markdown) {
  var fm = doorExtractFrontmatter_(markdown);
  if (fm && fm.domain) return String(fm.domain || '').trim();
  var lines = String(markdown || '').split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.startsWith('**Domain:**')) return line.replace('**Domain:**', '').trim();
    if (line.startsWith('- Domain:')) return line.replace('- Domain:', '').trim();
  }
  return '';
}

function doorExtractDoor(markdown) {
  var fm = doorExtractFrontmatter_(markdown);
  if (fm && fm.door) return String(fm.door || '').trim();
  var lines = String(markdown || '').split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.startsWith('**Domino Door:**')) return line.replace('**Domino Door:**', '').trim();
    if (line === '## Domino Door') {
      for (var j = i + 1; j < lines.length; j++) {
        var next = lines[j].trim();
        if (next) return next;
      }
    }
  }
  return '-';
}

function door_buildWarStackTasks_(markdown) {
  var parsed = doorParseWarStackHits(markdown);
  var domain = doorExtractDomain(markdown);
  var cleanDomain = String(domain || '').trim();
  var domainTag = cleanDomain ? cleanDomain.toLowerCase() : '';
  var doorTitle = doorExtractTitle(markdown);
  var doorName = doorExtractDoor(markdown);
  var project = doorName ? String(doorName).replace(/[^A-Za-z0-9 _-]/g, '').trim() : '';
  if (!project) project = cleanDomain ? cleanDomain.replace(/[^A-Za-z0-9 _-]/g, '').trim() : '';
  var doorDesc = doorTitle ? ('Door: ' + doorTitle) : 'Door Task';
  var opts = arguments.length > 1 && arguments[1] ? arguments[1] : {};
  var metaBase = {
    warstack_session_id: opts.sessionId || '',
    warstack_file_id: opts.fileId || '',
    warstack_title: opts.title || ''
  };

  var tasks = [];
  if (!parsed || !parsed.hits || !parsed.hits.length) return tasks;

  // First pass: build hits
  var hitTasks = [];
  parsed.hits.forEach(function(hit, idx) {
    // NOTE: adjust due/wait offsets here if needed (e.g. wait:+1d, +2d ...)
    var primary = hit.fact || hit.strike || hit.obstacle || hit.responsibility || 'War Stack Hit';
    var desc = 'Hit ' + (idx + 1) + ': ' + primary;
    if (hit.strike && hit.fact !== hit.strike) {
      desc += ' (Strike: ' + hit.strike + ')';
    }
    var tags = ['hit', 'production', 'door'];
    if (domainTag) tags.push(domainTag);
    hitTasks.push({
      description: desc,
      tags: tags,
      project: project || undefined,
      due: (function() {
        // Hit1..Hit4 -> today+1..4 days
        var offs = idx + 1;
        return 'today+' + offs + 'd';
      })(),
      wait: '+' + (idx + 1) + 'd',
      meta: {
        warstack_session_id: metaBase.warstack_session_id,
        warstack_file_id: metaBase.warstack_file_id,
        warstack_title: metaBase.warstack_title,
        hit_index: idx + 1,
        hit_title: primary
      }
    });
  });

  // Door parent task (depends on all hits)
  tasks.push({
    description: doorDesc,
    tags: ['door', 'production'].concat(domainTag ? [domainTag] : []),
    project: project || undefined,
    meta: {
      warstack_session_id: metaBase.warstack_session_id,
      warstack_file_id: metaBase.warstack_file_id,
      warstack_title: metaBase.warstack_title,
      door_parent: true,
      hit_count: hitTasks.length
    }
  });

  // Profit task (wait + depends on door)
  tasks.push({
    description: 'Profit: ' + (doorTitle || 'Door'),
    tags: ['profit'].concat(domainTag ? [domainTag] : []),
    project: project || undefined,
    wait: '+5d',
    meta: {
      warstack_session_id: metaBase.warstack_session_id,
      warstack_file_id: metaBase.warstack_file_id,
      warstack_title: metaBase.warstack_title,
      profit: true
    }
  });

  // Append hits after door/profit so exec order is hits -> door -> profit
  hitTasks.forEach(function(t) { tasks.unshift(t); });

  return tasks;
}

function door_attachWarStackTaskMeta_(tasks, meta) {
  if (!tasks || !tasks.length) return [];
  var base = meta || {};
  return tasks.map(function(task, idx) {
    var copy = Object.assign({}, task || {});
    var merged = Object.assign({}, base);
    if (copy.meta) merged = Object.assign(merged, copy.meta);
    if (!merged.hit_index && copy.hit_index) merged.hit_index = copy.hit_index;
    if (!merged.hit_index) merged.hit_index = idx + 1;
    if (!merged.hit_title && copy.description) merged.hit_title = copy.description;
    copy.meta = merged;
    return copy;
  });
}

function door_updateWarStackTaskwarriorUuids_(results) {
  if (!results || !results.length) return { ok: false, updated: 0 };
  var grouped = {};
  results.forEach(function(entry) {
    if (!entry || !entry.task_uuid) return;
    var meta = entry.meta || entry.task_meta || {};
    var fileId = meta.warstack_file_id;
    if (!fileId) return;
    if (!grouped[fileId]) grouped[fileId] = [];
    grouped[fileId].push({
      hit_index: meta.hit_index || '',
      uuid: entry.task_uuid,
      title: meta.hit_title || entry.description || ''
    });
  });

  var updated = 0;
  Object.keys(grouped).forEach(function(fileId) {
    try {
      var file = DriveApp.getFileById(fileId);
      var content = file.getBlob().getDataAsString();
      var combined = door_wireWarStackDependencies_(grouped[fileId]);
      var next = door_upsertTaskwarriorSection_(content, combined.entries);
      next = door_upsertTaskwarriorFrontmatter_(next, combined.entries, combined.door_uuid, combined.hit_uuids, combined.profit_uuid);
      if (next && next !== content) {
        file.setContent(next);
        updated += 1;
      }
    } catch (e) {
      Logger.log('Taskwarrior UUID update failed for ' + fileId + ': ' + e);
    }
  });
  return { ok: true, updated: updated };
}

function door_wireWarStackDependencies_(entries) {
  // Identify hits, door, profit and set depends accordingly
  var hits = [];
  var door = null;
  var profit = null;
  entries.forEach(function(entry) {
    if (!entry || !entry.task_uuid) return;
    var meta = entry.meta || entry.task_meta || {};
    if (meta.door_parent) {
      door = entry;
    } else if (meta.profit) {
      profit = entry;
    } else {
      hits.push(entry);
    }
  });
  // Door depends on hit UUIDs
  var hitUuids = hits.map(function(h) { return h.task_uuid; }).filter(Boolean);
  if (door && hitUuids.length) {
    if (!door.depends) door.depends = [];
    door.depends = door.depends.concat(hitUuids);
  }
  // Profit depends on door
  if (profit && door && door.task_uuid) {
    if (!profit.depends) profit.depends = [];
    profit.depends = profit.depends.concat([door.task_uuid]);
  }
  var entriesOut = [];
  if (door) entriesOut.push(door);
  if (profit) entriesOut.push(profit);
  entriesOut = entriesOut.concat(hits);
  return {
    entries: entriesOut,
    door_uuid: door && door.task_uuid,
    hit_uuids: hitUuids,
    profit_uuid: profit && profit.task_uuid
  };
}

function door_upsertTaskwarriorSection_(content, entries) {
  if (!entries || !entries.length) return content;
  var cleaned = door_stripTaskwarriorSection_(content || '');
  var uniq = {};
  entries.forEach(function(entry) {
    if (!entry || !entry.uuid) return;
    var key = String(entry.hit_index || '') + ':' + entry.uuid;
    uniq[key] = entry;
  });
  var list = Object.keys(uniq).map(function(key) { return uniq[key]; });
  list.sort(function(a, b) {
    return (Number(a.hit_index) || 0) - (Number(b.hit_index) || 0);
  });
  var lines = [];
  lines.push('## Taskwarrior');
  lines.push('');
  lines.push('War Stack Hits (Taskwarrior UUIDs):');
  lines.push('');
  list.forEach(function(entry) {
    var label = entry.hit_index ? ('Hit ' + entry.hit_index) : 'Hit';
    var title = String(entry.title || '').replace(/`/g, "'");
    var line = '- ' + label + ': `' + entry.uuid + '`';
    if (title) line += ' — ' + title;
    lines.push(line);
  });
  var block = lines.join('\n');
  var trimmed = (cleaned || '').replace(/\s+$/, '');
  return trimmed + '\n\n' + block + '\n';
}

function door_upsertTaskwarriorFrontmatter_(content, entries, doorUuid, hitUuids, profitUuid) {
  if (!content || String(content).indexOf('---') !== 0) return content;
  if (!entries || !entries.length) return content;
  hitUuids = hitUuids || [];
  var text = String(content || '');
  var fmEnd = text.indexOf('---', 3);
  if (fmEnd < 0) return content;
  var head = text.slice(0, fmEnd + 3); // include closing ---
  var body = text.slice(fmEnd + 3);

  var fmLines = head.split(/\r?\n/);
  var cleaned = [];
  var skipping = false;
  fmLines.forEach(function(line) {
    if (line.trim().match(/^taskwarrior_hits:/)) {
      skipping = true;
      return;
    }
    if (skipping) {
      if (/^\s*-\s+uuid:/.test(line)) {
        return;
      }
      if (line.trim() === '' || line.trim().startsWith('---')) {
        skipping = false;
        cleaned.push(line);
        return;
      }
    } else {
      cleaned.push(line);
    }
  });
  var newLines = [];
  newLines.push('taskwarrior_door_uuid: ' + (doorUuid || ''));
  newLines.push('taskwarrior_profit_uuid: ' + (profitUuid || ''));
  newLines.push('taskwarrior_hits:');
  hitUuids.forEach(function(uuid, idx) {
    newLines.push('  - hit_index: ' + (idx + 1));
    newLines.push('    uuid: ' + uuid);
  });
  var nextHead = cleaned.join('\n');
  if (nextHead && !nextHead.endsWith('\n')) nextHead += '\n';
  nextHead += newLines.join('\n') + '\n';
  return nextHead + body;
}

function door_stripTaskwarriorSection_(content) {
  var text = String(content || '');
  var regex = /\n## Taskwarrior[\s\S]*?(?=\n## |\n# |$)/;
  return text.replace(regex, '');
}

function door_sendWarStackTelegram_(markdown) {
  if (typeof door_sideEffectsAllowed_ === 'function' && !door_sideEffectsAllowed_()) {
    return { ok: false, skipped: true, error: 'side effects disabled' };
  }
  var sp = PropertiesService.getScriptProperties();
  var enabled = sp.getProperty('WARSTACK_TELEGRAM') === '1';
  if (!enabled) return { ok: false, skipped: true, error: 'disabled' };
  var token = sp.getProperty('WARSTACK_BOT_TOKEN') ||
    sp.getProperty('TELEGRAM_BOT_TOKEN') ||
    sp.getProperty('BOT_TOKEN') || '';
  var chatId = sp.getProperty('CHAT_ID') || '';
  if (!token || !chatId) return { ok: false, error: 'telegram not configured' };

  var chunks = door_splitMarkdown_(markdown, 3500);
  var total = chunks.length;
  for (var i = 0; i < total; i++) {
    var payload = {
      chat_id: chatId,
      text: (total > 1 ? ('Teil ' + (i + 1) + '/' + total + '\n\n') : '') + chunks[i],
      parse_mode: 'Markdown'
    };
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  }
  return { ok: true, parts: total };
}

function door_splitMarkdown_(text, limit) {
  var t = String(text || '').trim();
  var max = limit || 3500;
  if (t.length <= max) return [t];

  var parts = [];
  var chunk = '';
  var lines = t.split(/\r?\n/);
  lines.forEach(function(line) {
    if ((chunk + '\n' + line).length > max) {
      parts.push(chunk);
      chunk = line;
    } else {
      chunk = chunk ? chunk + '\n' + line : line;
    }
  });
  if (chunk) parts.push(chunk);
  return parts;
}

function door_ingestWarStack_(payload) {
  if (!payload || !payload.markdown) return { ok: false, error: 'missing markdown' };
  var markdown = payload.markdown;
  var sessionId = payload.sessionId || doorGenerateSessionId();
  var fileRes = doorSaveSessionToDrive(markdown, sessionId, 'warstack');
  return { ok: true, file: fileRes };
}

function door_enqueueTaskOps_(tasks) {
  if (typeof door_sideEffectsAllowed_ === 'function' && !door_sideEffectsAllowed_()) {
    return { ok: false, skipped: true, error: 'side effects disabled' };
  }
  if (!tasks || !tasks.length) return { ok: false, error: 'no tasks' };
  var sp = PropertiesService.getScriptProperties();
  var key = 'DOOR_TASK_QUEUE';
  var raw = sp.getProperty(key) || '[]';
  var arr = [];
  try { arr = JSON.parse(raw); } catch (e) { arr = []; }
  tasks.forEach(function(t) { arr.push(t); });
  sp.setProperty(key, JSON.stringify(arr));
  door_setupTaskQueueTrigger_();
  return { ok: true, queued: tasks.length };
}

function door_flushTaskOps_() {
  var sp = PropertiesService.getScriptProperties();
  var key = 'DOOR_TASK_QUEUE';
  var raw = sp.getProperty(key) || '[]';
  var arr = [];
  try { arr = JSON.parse(raw); } catch (e) { arr = []; }
  sp.deleteProperty(key);
  return arr;
}

function door_taskQueueTick_() {
  if (typeof door_sideEffectsAllowed_ === 'function' && !door_sideEffectsAllowed_()) {
    return { ok: false, skipped: true, error: 'side effects disabled' };
  }
  var queue = door_flushTaskOps_();
  if (!queue.length) return { ok: true, processed: 0 };
  var payload = { tasks: queue };
  var res = bridge_taskExecutor_(payload);
  if (res && res.results) {
    door_updateWarStackTaskwarriorUuids_(res.results);
    if (typeof door_updateDoorWarTaskwarriorUuids_ === 'function') {
      door_updateDoorWarTaskwarriorUuids_(res.results);
    }
  }
  return { ok: true, processed: queue.length };
}

function door_setupTaskQueueTrigger_() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'door_taskQueueTick_') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('door_taskQueueTick_').timeBased().everyMinutes(15).create();
  return { ok: true, everyMinutes: 15 };
}

// ------------------------------------------------------------
// Background scan: detect new War Stacks in 3-Production
// ------------------------------------------------------------
function door_scanWarStacksForTasks_() {
  var root = doorGetCentreFolder();
  if (!root) return { ok: false, error: 'missing Alpha_Door folder' };
  var prodName = doorResolveSubfolder('warstack') || '3-Production';
  var prod = doorGetOrCreateSubfolder(root, prodName);
  if (!prod) return { ok: false, error: 'missing production folder' };

  var files = prod.getFiles();
  var queued = 0;
  var skipped = 0;

  while (files.hasNext()) {
    var f = files.next();
    var name = f.getName();
    if (!/\.md$/i.test(name)) continue;
    var content = f.getBlob().getDataAsString();
    if (door_hasWarStackTaskwarrior_(content)) {
      skipped += 1;
      continue;
    }
    if (door_hasWarStackQueuedFlag_(content)) {
      skipped += 1;
      continue;
    }
    var tasks = door_buildWarStackTasks_(content, {
      sessionId: 'scan',
      fileId: f.getId(),
      title: doorExtractTitle(content)
    });
    if (!tasks || !tasks.length) {
      skipped += 1;
      continue;
    }
    door_enqueueTaskOps_(tasks);
    var next = door_upsertWarStackQueuedFlag_(content, new Date().toISOString());
    if (next && next !== content) f.setContent(next);
    queued += 1;
  }

  return { ok: true, queued: queued, skipped: skipped };
}

function door_hasWarStackTaskwarrior_(content) {
  var text = String(content || '');
  if (text.indexOf('taskwarrior_door_uuid:') !== -1) return true;
  return /##\s+Taskwarrior/i.test(text);
}

function door_hasWarStackQueuedFlag_(content) {
  return String(content || '').indexOf('warstack_task_queue:') !== -1;
}

function door_upsertWarStackQueuedFlag_(content, stamp) {
  var text = String(content || '');
  var lines = text.split('\n');
  var hasFrontmatter = lines.length > 1 && lines[0].trim() === '---';
  var inserted = false;
  var out = [];

  if (hasFrontmatter) {
    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i];
      if (line.startsWith('warstack_task_queue:')) {
        out.push('warstack_task_queue: ' + stamp);
        inserted = true;
      } else if (line.trim() === '---' && i > 0 && !inserted) {
        out.push('warstack_task_queue: ' + stamp);
        out.push(line);
        inserted = true;
      } else {
        out.push(line);
      }
    }
    return out.join('\n');
  }

  var head = ['---', 'warstack_task_queue: ' + stamp, '---', ''];
  return head.join('\n') + text;
}

function door_setupWarStackScanTrigger_() {
  var sp = PropertiesService.getScriptProperties();
  var hours = Number(sp.getProperty('WARSTACK_SCAN_EVERY_HOURS') || 6);
  if (!hours || hours < 1) hours = 6;
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'door_scanWarStacksForTasks_') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('door_scanWarStacksForTasks_').timeBased().everyHours(hours).create();
  return { ok: true, everyHours: hours };
}

function door_cleanupWarStackTriggers_() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  triggers.forEach(function(t) {
    var fn = t.getHandlerFunction();
    if (fn === 'door_taskQueueTick_' || fn === 'door_scanWarStacksForTasks_') {
      ScriptApp.deleteTrigger(t);
      removed += 1;
    }
  });
  var taskRes = door_setupTaskQueueTrigger_();
  var scanRes = door_setupWarStackScanTrigger_();
  return { ok: true, removed: removed, taskQueue: taskRes, scan: scanRes };
}

function door_getLatestWarStackUuids_() {
  var items = door_listWarStackFiles_();
  if (!items || !items.length) return { ok: false, error: 'no warstacks' };
  items.sort(function(a, b) {
    return (b.file.getLastUpdated().getTime() - a.file.getLastUpdated().getTime());
  });
  var latest = items[0];
  var content = latest.content || '';
  var fm = doorExtractFrontmatter_(content);
  var profitUuid = '';
  var doorUuid = '';
  if (fm && fm.taskwarrior_profit_uuid) profitUuid = String(fm.taskwarrior_profit_uuid || '').trim();
  if (fm && fm.taskwarrior_door_uuid) doorUuid = String(fm.taskwarrior_door_uuid || '').trim();
  return {
    ok: true,
    file_id: latest.file.getId(),
    file_name: latest.name,
    profit_uuid: profitUuid,
    door_uuid: doorUuid
  };
}
