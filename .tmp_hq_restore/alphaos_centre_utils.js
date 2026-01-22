/**************************************
 * alphaos_centre_utils.gs — AlphaOS Centre Utils (Library-ready)
 * Version: 1.1 (Dec 2025)
 *
 * Purpose:
 * - Reusable utilities for Voice / Door / Game / any Centre in Apps Script
 * - Telegram send helpers (HTML + Markdown) with safe chunking
 * - Queue jobs during day, dispatch later
 * - Gemini + Claude REST helpers (optional)
 * - Drive save pipeline (per-user root folder) + safe filenames
 * - Spreadsheet Index helpers (create/open, upsert)
 * - Trigger helpers (install + override)
 *
 * Design rules:
 * - No hard dependency on Centre globals
 * - Centre-specific values come from cfg argument
 **************************************/

// =====================================================
// CONFIG CONTRACT
// =====================================================
// cfg = {
//   centreLabel: 'Voice' | 'Door' | 'Game' | ...,
//   centreKey:   'VOI'   | 'DOR'  | 'GAM'  | ...,
//   rootFolderName: 'AlphaOS',
//   centresDirName: 'Centres',
//   defaultSubfolders: ['Sessions','Exports','AI_Analysis'],
//   drive: {
//     fixedRootPath: 'Alpha_Game/Creator_King',
//     fixedRootPathUnderAlphaOS: 'Alpha_Game/Creator_King'
//   },
//   telegram: {
//     tokenProp: 'ALPHAOS_BOT_TOKEN',
//     defaultChatIdProp: 'TG_DEFAULT_CHAT_ID'
//   },
//   llm: {
//     geminiKeyProp: 'GEMINI_API_KEY',
//     anthropicKeyProp: 'ANTHROPIC_API_KEY'
//   },
//   queue: {
//     propKey: 'VOI_QUEUE'
//   },
//   sheets: {
//     spreadsheetIdProp: 'VOI_SPREADSHEET_ID',
//     spreadsheetTitle: 'Alpha_Voice_Index',
//     sheetName: 'Index',
//     headers: ['id','ts','type','title','drive_url','meta_json']
//   }
// }

// =====================================================
// SMALL HELPERS
// =====================================================
function AOS_nowIso_() { return new Date().toISOString(); }

function AOS_safeFilename_(name) {
  return String(name || 'Entry')
    .replace(/[\\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 120);
}

function AOS_escapeHtml_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function AOS_uuid_() {
  const t = new Date().getTime();
  const r = Math.floor(Math.random() * 1e9);
  return Utilities.base64EncodeWebSafe(String(t) + ':' + String(r)).replace(/=+$/,'');
}

function AOS_sp_() { return PropertiesService.getScriptProperties(); }
function AOS_up_() { return PropertiesService.getUserProperties(); }

function AOS_getCfg_(cfg) {
  cfg = cfg || {};
  cfg.rootFolderName = cfg.rootFolderName || 'AlphaOS';
  cfg.centresDirName = cfg.centresDirName || 'Centres';
  cfg.defaultSubfolders = cfg.defaultSubfolders || ['Sessions','Exports','AI_Analysis'];
  if (!cfg.centreLabel) cfg.centreLabel = 'Centre';
  if (!cfg.centreKey) cfg.centreKey = 'CTR';
  cfg.telegram = cfg.telegram || { tokenProp: 'ALPHAOS_BOT_TOKEN', defaultChatIdProp: 'TG_DEFAULT_CHAT_ID' };
  cfg.llm = cfg.llm || { geminiKeyProp: 'GEMINI_API_KEY', anthropicKeyProp: 'ANTHROPIC_API_KEY' };
  cfg.queue = cfg.queue || { propKey: cfg.centreKey + '_QUEUE' };
  cfg.sheets = cfg.sheets || {
    spreadsheetIdProp: cfg.centreKey + '_SPREADSHEET_ID',
    spreadsheetTitle: 'Alpha_' + cfg.centreLabel + '_Index',
    sheetName: 'Index',
    headers: ['id','ts','type','title','drive_url','meta_json']
  };
  return cfg;
}

// =====================================================
// DRIVE — per-user AlphaOS root and centre folders
// =====================================================
function AOS_getOrCreateFolderByName_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function AOS_getRootFolder_(cfg) {
  cfg = AOS_getCfg_(cfg);
  const key = 'AOS_ROOT_FOLDER_ID::' + cfg.rootFolderName;

  const props = AOS_up_();
  const cached = props.getProperty(key);
  if (cached) {
    try { return DriveApp.getFolderById(cached); } catch (e) { props.deleteProperty(key); }
  }

  const it = DriveApp.getFoldersByName(cfg.rootFolderName);
  const root = it.hasNext() ? it.next() : DriveApp.createFolder(cfg.rootFolderName);
  props.setProperty(key, root.getId());
  return root;
}

function AOS_getCentreFolder_(cfg) {
  cfg = AOS_getCfg_(cfg);

  const fixedAbs = cfg.drive && cfg.drive.fixedRootPath;
  const fixedUnder = cfg.drive && cfg.drive.fixedRootPathUnderAlphaOS;

  if (fixedAbs || fixedUnder) {
    const base = fixedUnder ? AOS_getRootFolder_(cfg) : DriveApp.getRootFolder();
    const parts = String(fixedAbs || fixedUnder)
      .split('/')
      .map(p => p.trim())
      .filter(Boolean);

    let current = base;
    parts.forEach(name => {
      current = AOS_getOrCreateFolderByName_(current, name);
    });

    (cfg.defaultSubfolders || []).forEach(n => AOS_getOrCreateFolderByName_(current, n));
    return current;
  }

  const root = AOS_getRootFolder_(cfg);
  const centres = AOS_getOrCreateFolderByName_(root, cfg.centresDirName);
  const folderName = 'Alpha_' + cfg.centreLabel;
  const centre = AOS_getOrCreateFolderByName_(centres, folderName);

  (cfg.defaultSubfolders || []).forEach(n => AOS_getOrCreateFolderByName_(centre, n));
  return centre;
}

function AOS_getCentreSubfolder_(cfg, name) {
  const centre = AOS_getCentreFolder_(cfg);
  return AOS_getOrCreateFolderByName_(centre, String(name || 'Sessions'));
}

function AOS_saveMarkdown_(cfg, subfolder, filename, markdown, meta) {
  cfg = AOS_getCfg_(cfg);
  const md = String(markdown || '').trim();
  if (!md) return { ok:false, error:'Empty markdown' };

  const target = AOS_getCentreSubfolder_(cfg, subfolder || 'Sessions');
  let fname = AOS_safeFilename_(filename || ('Entry_' + AOS_nowIso_().slice(0,10)));
  if (!fname.endsWith('.md')) fname += '.md';

  const file = target.createFile(fname, md, MimeType.PLAIN_TEXT);

  if (cfg.sheets && cfg.sheets.spreadsheetIdProp) {
    try {
      const id = AOS_uuid_();
      AOS_indexUpsert_(cfg, {
        id,
        ts: AOS_nowIso_(),
        type: (meta && meta.type) ? meta.type : 'md',
        title: fname,
        drive_url: file.getUrl(),
        meta_json: JSON.stringify(meta || {})
      });
    } catch (e) {
      Logger.log('Index write failed: ' + e);
    }
  }

  return { ok:true, file:{ id:file.getId(), name:file.getName(), url:file.getUrl() } };
}

// =====================================================
// SHEETS — lightweight “Index” (Sheet = Index, not DB)
// =====================================================
function AOS_getSpreadsheet_(cfg) {
  cfg = AOS_getCfg_(cfg);
  const sp = AOS_sp_();
  let id = String(sp.getProperty(cfg.sheets.spreadsheetIdProp) || '');

  if (!id) {
    const ss = SpreadsheetApp.create(cfg.sheets.spreadsheetTitle || ('Alpha_' + cfg.centreLabel + '_Index'));
    id = ss.getId();
    sp.setProperty(cfg.sheets.spreadsheetIdProp, id);
    return ss;
  }

  try {
    return SpreadsheetApp.openById(id);
  } catch (e) {
    const ss = SpreadsheetApp.create(cfg.sheets.spreadsheetTitle || ('Alpha_' + cfg.centreLabel + '_Index'));
    sp.setProperty(cfg.sheets.spreadsheetIdProp, ss.getId());
    return ss;
  }
}

function AOS_getIndexSheet_(cfg) {
  cfg = AOS_getCfg_(cfg);
  const ss = AOS_getSpreadsheet_(cfg);
  const name = cfg.sheets.sheetName || 'Index';
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  if (sh.getLastRow() === 0) {
    const headers = cfg.sheets.headers || ['id','ts','type','title','drive_url','meta_json'];
    sh.appendRow(headers);
    sh.getRange(1,1,1,headers.length).setFontWeight('bold');
  }
  return sh;
}

function AOS_indexUpsert_(cfg, rowObj) {
  cfg = AOS_getCfg_(cfg);
  const sh = AOS_getIndexSheet_(cfg);
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const idCol = headers.indexOf('id') + 1;
  if (idCol < 1) throw new Error('Index sheet missing id column');

  const id = String(rowObj.id || '').trim();
  if (!id) throw new Error('rowObj.id missing');

  const last = sh.getLastRow();
  if (last < 2) {
    sh.appendRow(headers.map(h => (rowObj[h] ?? '')));
    return { ok:true, mode:'append' };
  }

  const ids = sh.getRange(2, idCol, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) {
      const row = i + 2;
      for (let c = 0; c < headers.length; c++) {
        const h = headers[c];
        sh.getRange(row, c + 1).setValue(rowObj[h] ?? '');
      }
      return { ok:true, mode:'update' };
    }
  }

  sh.appendRow(headers.map(h => (rowObj[h] ?? '')));
  return { ok:true, mode:'append' };
}

// =====================================================
// TELEGRAM — send + safe splitter
// =====================================================
function AOS_getTelegramToken_(cfg) {
  cfg = AOS_getCfg_(cfg);
  const sp = AOS_sp_();
  const explicit = sp.getProperty(cfg.telegram.tokenProp || 'ALPHAOS_BOT_TOKEN');
  if (explicit) return explicit;
  return sp.getProperty('ALPHAOS_BOT_TOKEN') ||
    sp.getProperty('TELEGRAM_BOT_TOKEN') ||
    sp.getProperty('BOT_TOKEN') || '';
}

function AOS_tgApiUrl_(cfg) {
  const token = AOS_getTelegramToken_(cfg);
  return token ? `https://api.telegram.org/bot${token}` : null;
}

function AOS_tgSendHtml_(cfg, chatId, html, replyMarkup) {
  cfg = AOS_getCfg_(cfg);
  const apiUrl = AOS_tgApiUrl_(cfg);
  if (!apiUrl) return { ok:false, error:'Telegram token missing' };

  const SAFE_LIMIT = 3800;
  const full = String(html || '');
  const parts = AOS_splitTelegramText_(full, SAFE_LIMIT);
  const total = parts.length;

  for (let i = 0; i < total; i++) {
    const payload = {
      chat_id: String(chatId),
      text: parts[i],
      parse_mode: 'HTML'
    };
    if (replyMarkup && i === 0) payload.reply_markup = replyMarkup;

    const res = UrlFetchApp.fetch(`${apiUrl}/sendMessage`, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (res.getResponseCode() >= 300) {
      Logger.log('TG send error: ' + res.getContentText());
    }
  }

  return { ok:true, parts: total };
}

function AOS_tgSendMarkdown_(cfg, chatId, markdown, replyMarkup) {
  cfg = AOS_getCfg_(cfg);
  const apiUrl = AOS_tgApiUrl_(cfg);
  if (!apiUrl) return { ok:false, error:'Telegram token missing' };

  const SAFE_LIMIT = 3800;
  const full = String(markdown || '');
  const parts = AOS_splitTelegramText_(full, SAFE_LIMIT);
  const total = parts.length;

  for (let i = 0; i < total; i++) {
    const payload = {
      chat_id: String(chatId),
      text: parts[i],
      parse_mode: 'Markdown'
    };
    if (replyMarkup && i === 0) payload.reply_markup = replyMarkup;

    const res = UrlFetchApp.fetch(`${apiUrl}/sendMessage`, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (res.getResponseCode() >= 300) {
      Logger.log('TG send error: ' + res.getContentText());
    }
  }

  return { ok:true, parts: total };
}

function AOS_splitTelegramText_(text, limit) {
  const t = String(text || '');
  if (t.length <= limit) return [t];

  const blocks = t.split(/\n\n+/);
  const chunks = [];
  let buf = '';

  function pushBuf() {
    const s = (buf || '').trim();
    if (s) chunks.push(s);
    buf = '';
  }

  function hardSplitLine(line) {
    for (let i = 0; i < line.length; i += limit) {
      chunks.push(line.slice(i, i + limit));
    }
  }

  function addPiece(piece) {
    if (!piece) return;
    const sep = buf ? 2 : 0;

    if (buf.length + sep + piece.length <= limit) {
      buf += (buf ? '\n\n' : '') + piece;
      return;
    }

    pushBuf();

    if (piece.length > limit) {
      const lines = piece.split('\n');
      let lineBuf = '';

      for (const ln of lines) {
        const lsep = lineBuf ? 1 : 0;
        if (lineBuf.length + lsep + ln.length <= limit) {
          lineBuf += (lineBuf ? '\n' : '') + ln;
        } else {
          if (lineBuf) chunks.push(lineBuf);
          if (ln.length > limit) {
            hardSplitLine(ln);
            lineBuf = '';
          } else {
            lineBuf = ln;
          }
        }
      }

      if (lineBuf) chunks.push(lineBuf);
    } else {
      buf = piece;
    }
  }

  for (const b of blocks) addPiece(b);
  pushBuf();

  return chunks.length ? chunks : [t.slice(0, limit)];
}

// =====================================================
// QUEUE — JSON array in ScriptProperties
// =====================================================
function AOS_queueEnqueue_(cfg, job) {
  cfg = AOS_getCfg_(cfg);
  const sp = AOS_sp_();
  const key = cfg.queue.propKey;
  const raw = sp.getProperty(key) || '[]';
  const arr = JSON.parse(raw);

  const j = job || {};
  if (!j.id) j.id = AOS_uuid_();
  if (!j.ts) j.ts = AOS_nowIso_();

  const idx = arr.findIndex(x => x && x.id === j.id);
  if (idx >= 0) arr[idx] = j; else arr.push(j);

  sp.setProperty(key, JSON.stringify(arr));
  return { ok:true, size: arr.length, id: j.id };
}

function AOS_queueDrain_(cfg) {
  cfg = AOS_getCfg_(cfg);
  const sp = AOS_sp_();
  const key = cfg.queue.propKey;
  const raw = sp.getProperty(key) || '[]';
  const arr = JSON.parse(raw);
  sp.deleteProperty(key);
  return arr;
}

function AOS_queuePeek_(cfg) {
  cfg = AOS_getCfg_(cfg);
  const sp = AOS_sp_();
  const key = cfg.queue.propKey;
  const raw = sp.getProperty(key) || '[]';
  return JSON.parse(raw);
}

function AOS_queueCount_(cfg) {
  return AOS_queuePeek_(cfg).length;
}

// =====================================================
// LLM — Gemini + optional Claude
// =====================================================
function AOS_geminiGenerateText_(cfg, prompt, opts) {
  cfg = AOS_getCfg_(cfg);
  const apiKey = AOS_sp_().getProperty(cfg.llm.geminiKeyProp || 'GEMINI_API_KEY');
  if (!apiKey) return { ok:false, error:'Gemini key missing' };

  opts = opts || {};
  const model = opts.model || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: String(prompt || '') }] }],
    generationConfig: {
      temperature: (opts.temperature ?? 0.55),
      maxOutputTokens: (opts.maxOutputTokens ?? 420)
    }
  };

  const res = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const body = res.getContentText();
  let json; try { json = JSON.parse(body); } catch (e) { json = null; }
  if (code >= 300) return { ok:false, error:`Gemini HTTP ${code}`, details: body };

  const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || '';
  return { ok:true, text: String(text || '').trim(), raw: json };
}

function AOS_callClaude_(cfg, prompt, opts) {
  cfg = AOS_getCfg_(cfg);
  const key = AOS_sp_().getProperty(cfg.llm.anthropicKeyProp || 'ANTHROPIC_API_KEY');
  if (!key) return { ok:false, error:'Anthropic key missing' };

  opts = opts || {};
  const model = opts.model || 'claude-3-5-sonnet-20240620';
  const maxTokens = (opts.maxTokens ?? 520);
  const temperature = (opts.temperature ?? 0.55);

  const endpoint = 'https://api.anthropic.com/v1/messages';
  const payload = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role:'user', content: String(prompt || '') }]
  };

  const res = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const body = res.getContentText();
  let json; try { json = JSON.parse(body); } catch(e) { json = null; }
  if (code >= 300) return { ok:false, error:`Claude HTTP ${code}`, details: body };

  const text = (json?.content || []).filter(b => b && b.type === 'text').map(b => b.text).join('\n').trim();
  return { ok:true, text: text || '' };
}

// =====================================================
// TRIGGERS — install standard schedule safely
// =====================================================
function AOS_installTriggers_(cfg, list) {
  cfg = AOS_getCfg_(cfg);

  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    const fn = t.getHandlerFunction();
    if (list.some(x => x.fn === fn)) {
      ScriptApp.deleteTrigger(t);
    }
  });

  list.forEach(item => {
    if (item.everyMinutes) {
      ScriptApp.newTrigger(item.fn).timeBased().everyMinutes(item.everyMinutes).create();
      return;
    }
    if (item.everyDays && typeof item.atHour === 'number') {
      ScriptApp.newTrigger(item.fn).timeBased().everyDays(item.everyDays).atHour(item.atHour).create();
      return;
    }
    if (typeof item.atHour === 'number') {
      ScriptApp.newTrigger(item.fn).timeBased().everyDays(1).atHour(item.atHour).create();
      return;
    }
    throw new Error('Unknown trigger spec: ' + JSON.stringify(item));
  });

  return { ok:true, installed: list.length };
}
