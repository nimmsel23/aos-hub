/*******************************
 * Alpha OS Creator King Centre — Gemini Insights @ 20:00 (FINAL)
 * Stand: 18. Dezember 2025
 * Strategy: Queue insights during the day → generate + send via Telegram daily at 20:00
 *
 * Drop-in additions/changes:
 *  1) Add queue + dispatcher
 *  2) Replace per-answer delayed triggers with enqueue
 *  3) Add upsertAndAnalyze (client expects it)
 *  4) Add exportAllToDrive + generateFullAIAnalysis (client expects them)
 *  5) Switch Telegram parse_mode to HTML (stable)
 *******************************/

// =====================================================
// CONFIG / CONSTANTS
// =====================================================
const ROOT_HTML = 'creatorcentre';
const CENTRE_LABEL = 'CreatorKing';
const CENTRE_KEY = 'CKA';

const MAP_TITLE = '👑 Creator King Assets Map';
const MAP_SUBTITLE = 'Discovering Your Passion & Crafting Your Message – Re-Invention for Dominion in BUSINESS';

const KING_EMOJIS = ["👑","🔥","💎","⚔️","🦁","🏆","🌹","🛡️","⚡","🦅"];

// Properties Keys
const LAST_UPDATE_ID_PROP = 'TG_LAST_UPDATE_ID';
const TG_DEFAULT_CHAT_ID_PROP = 'TG_DEFAULT_CHAT_ID';
const STORE_FILE_NAME = 'creatorking_store.json';
const LEGACY_SHEET_PROP = 'CKA_SPREADSHEET_ID';

// Gemini
const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

// Telegram
const TELEGRAM_BOT_TOKEN = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');

// Queue key
const INSIGHT_QUEUE_PROP = 'CKA_INSIGHT_QUEUE';

// =====================================================
// WEBAPP SERVING
// =====================================================
function doGet() {
  const t = HtmlService.createTemplateFromFile(ROOT_HTML);
  t.mapTitle = MAP_TITLE;
  t.mapSubtitle = MAP_SUBTITLE;
  return t.evaluate()
    .setTitle(MAP_TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ================================
// QUESTIONS – 100% originalgetreu
// ================================
const QUESTIONS = {
  "1. Personal Interests": [
    "I feel most alive (or at home) when I am doing:",
    "When I was a kid, I dreamt of being, doing and having:",
    "I love to give advice to others on:",
    "If I am NOT doing this or incorporating this into my life, I feel a loss or a sense of being off balance:",
    "What makes me feel great about myself as a person is:",
    "What really excites me is:",
    "What brings my energy down and makes me feel most tired and drained is:",
    "I get a sense of satisfaction and fulfillment when I:",
    "I feel like the luckiest person on the planet when I am:",
    "When I am 90 years old, sitting in my rocking chair and looking back on my life, I will be thinking and feeling:"
  ],
  "2. Unique Talents & Expertise": [
    "What unique experiences have I had?",
    "What personal challenges have I overcome?",
    "What professional challenges have I overcome?",
    "What are some of my Natural talents or abilities that come to me with ease?",
    "What seems like common sense to me, yet most people understand it? (I am shocked when other people donʼt know this, which seems like common sense to me)",
    "What are my personal, unshakable strengths?",
    "What are some weaknesses I have, or stuff I hate doing or need support on?"
  ],
  "3. Life Lessons": [
    "What do I know is absolutely true about the world?",
    "What do I know is absolutely true about myself?",
    "How can my experiences enhance peopleʼs lives or serve them in a positive? What can I teach people that would change their lives?",
    "How will people be affected or changes after I help them?",
    "What message would I love for people to get from me or my products / services?"
  ],
  "4. Marketing My Passion": [
    "List of possible topics I could teach on:",
    "If I was to write a book, it would be on:",
    "What specific groups of people or niche could I target?",
    "In my opinion, what are people teachingINCORRECTLY? What is missing that people need to know in life?",
    "What and how can I... Simplify things for people:",
    "Increase Efficiency:",
    "Deliver with ease:",
    "Create loyalty and build on-going relationships with my customers:"
  ],
  "5. Environments": [
    "Rate 1-11: speaking",
    "Rate 1-11: writing",
    "Rate 1-11: presenting on video",
    "Rate 1-11: entertaining or networking",
    "Rate 1-11: training others",
    "Rate 1-11: working from home",
    "Rate 1-11: working at a big company",
    "Rate 1-11: working with small groups of people",
    "Rate 1-11: working with large groups of people",
    "Rate 1-11: traveling to different locations",
    "Who are my ideal customers / clients (please describe in detail)? Common traits of my ideal customers / clients are:",
    "My ideal customer / client seeks me out because:",
    "What do my ideal customers / clients say when the recommend me or my services?"
  ],
  "6. Values & Inspiration": [
    "My top 5 values are: (select up to 5 from list below + Other)",
    "What excites me about the world?",
    "What is worth standing up for or fighting for?",
    "What kind of LEGACY would I want to leave in this world?",
    "If I have or will have children, what would be the most important thing I would teach them?",
    "What movie(s), or books, inspire me and why?",
    "Whether real or imagined, describe the person that you admire most:",
    "These 2 people have had a major input in my life. What is it about them, or what they did or said, or “who they were”, that moves or influences me?",
    "What do I do or keep myself going when I lose faith or hit a roadblock?"
  ],
  "7. Re-Invention of Self": [
    "My mission in life is (can create more than one):",
    "In one sentence, the greatest MESSAGE I could give the world is:",
    "Write your future biography. Decide who youʼve become, what achievements youʼve made and how you have helped others and contributed to the world:",
    "My vision for my life and business is:",
    "Craft your bonding story or stories below (real, raw, heartfelt – use another sheet if needed):"
  ]
};

const VALUES_LIST = [
  "Security", "Health", "Integrity", "Family", "Friends", "Success", "Efficiency",
  "Human Interaction", "Inner Peace", "Leadership", "Passion", "Honesty",
  "Learning", "Personal Growth", "Courage", "Adventure", "Financial Abundance",
  "Control of my Time", "Creating", "Being the Best"
];

const QUESTION_HINTS = {
  "My mission in life is (can create more than one):": "Your mission must have passion or it is lifeless and powerless. It has nothing to do with money. It should include both business and personal life.",
  "My vision for my life and business is:": "Your vision must be BIG – if it doesnʼt scare you, itʼs not big enough! Fear is expansion.",
  "Craft your bonding story or stories below (real, raw, heartfelt – use another sheet if needed):": "Be real, vulnerable, funny or heartfelt. Share stories that say: “Iʼve been there... I understand... Trust me... Iʼm one of you.”"
};
// =====================================================
// QUESTIONS / VALUES / HINTS  (keep your originals)
// =====================================================
// ... keep your QUESTIONS, VALUES_LIST, QUESTION_HINTS exactly as-is ...

// =====================================================
// DRIVE SAVE LOGIC (keep your existing implementation)
// =====================================================
// ... keep getAlphaOsRootFolder_ / getCentreFolder_ / saveEntry(...) ...

// =====================================================
// JSON STORE (answers + users + assets)
// =====================================================
// ... see JSON Store section below ...

// =====================================================
// NEXT QUESTION + SKIP (keep your existing implementation)
// =====================================================
// ... keep getNextQuestion / skipCurrentQuestion ...

// ================================
// Drive & Save Logic
// ================================
const ALPHAOS_ROOT_NAME_ = 'AlphaOS';
const ALPHAOS_CENTRES_DIR_ = 'Centres';
const DEFAULT_SUBFOLDERS_ = ['My_Assets', 'Delayed_Insights', 'Exports'];

function getAlphaOsRootFolder_() {
  const key = 'ALPHAOS_ROOT_FOLDER_ID';
  const props = PropertiesService.getUserProperties();
  let cached = props.getProperty(key);
  if (cached) {
    try { return DriveApp.getFolderById(cached); } catch(e) { props.deleteProperty(key); }
  }
  const it = DriveApp.getFoldersByName(ALPHAOS_ROOT_NAME_);
  const root = it.hasNext() ? it.next() : DriveApp.createFolder(ALPHAOS_ROOT_NAME_);
  props.setProperty(key, root.getId());
  return root;
}

function getOrCreateFolderByName_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function getCentreFolder_() {
  const root = getAlphaOsRootFolder_();
  const centres = getOrCreateFolderByName_(root, ALPHAOS_CENTRES_DIR_);
  const folderName = `Alpha_${CENTRE_LABEL}`;
  const it = centres.getFoldersByName(folderName);
  const folder = it.hasNext() ? it.next() : centres.createFolder(folderName);
  DEFAULT_SUBFOLDERS_.forEach(name => getOrCreateFolderByName_(folder, name));
  return folder;
}

function getCentreSubfolder_(name) {
  const centre = getCentreFolder_();
  return getOrCreateFolderByName_(centre, name);
}

function safeFilename_(name) {
  return String(name || 'Asset').replace(/[\\\/:*?"<>|]/g, '-').trim().substring(0, 120);
}

function saveEntry(payload) {
  try {
    const md = String(payload.markdown || '').trim();
    if (!md) return { ok: false, error: 'Empty content' };

    const centre = getCentreFolder_();
    const sub = payload.subfolder || 'My_Assets';
    const target = getOrCreateFolderByName_(centre, sub);

    let fname = safeFilename_(payload.filename || `Asset_${new Date().toISOString().slice(0,10)}`);
    if (!fname.endsWith('.md')) fname += '.md';

    const file = target.createFile(fname, md, MimeType.PLAIN_TEXT);

    return { ok: true, file: { id: file.getId(), name: file.getName(), url: file.getUrl() } };
  } catch (e) {
    Logger.log('saveEntry error: ' + e);
    return { ok: false, error: e.toString() };
  }
}

// ================================
// JSON Store
// ================================
function seedStore_() {
  return {
    answers: {},
    users: {},
    assets: {},
    logs: [],
    updated_at: new Date().toISOString()
  };
}

function getStoreFile_() {
  const folder = getCentreFolder_();
  const it = folder.getFilesByName(STORE_FILE_NAME);
  if (it.hasNext()) return it.next();
  return folder.createFile(STORE_FILE_NAME, JSON.stringify(seedStore_(), null, 2), MimeType.PLAIN_TEXT);
}

function loadStore_() {
  try {
    const file = getStoreFile_();
    const parsed = JSON.parse(file.getBlob().getDataAsString() || '{}');
    if (!parsed.answers) parsed.answers = {};
    if (!parsed.users) parsed.users = {};
    if (!parsed.assets) parsed.assets = {};
    if (!parsed.logs) parsed.logs = [];
    if (!Object.keys(parsed.answers).length) {
      migrateLegacySheet_(parsed);
    }
    return parsed;
  } catch (e) {
    Logger.log('loadStore_ error: ' + e);
    return seedStore_();
  }
}

function saveStore_(store) {
  store.updated_at = new Date().toISOString();
  const file = getStoreFile_();
  file.setContent(JSON.stringify(store, null, 2));
}

function migrateLegacySheet_(store) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(LEGACY_SHEET_PROP) || '';
  if (!id) return;
  try {
    const ss = SpreadsheetApp.openById(id);
    const sh = ss.getSheetByName('Answers');
    if (!sh) return;
    const values = sh.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      const section = values[i][0];
      const question = values[i][1];
      const answer = values[i][2];
      if (!question || !answer) continue;
      store.answers[question] = {
        answer: String(answer),
        section: String(section || ''),
        source: 'legacy-sheet',
        chat_id: '',
        updated_at: new Date().toISOString()
      };
      store.assets[question] = {
        section: String(section || ''),
        question: String(question),
        answer: String(answer),
        status: 'draft',
        updated_at: new Date().toISOString()
      };
    }
    saveStore_(store);
  } catch (e) {
    Logger.log('migrateLegacySheet_ error: ' + e);
  }
}

function loadAnswers_() {
  const store = loadStore_();
  const answers = {};
  Object.keys(store.answers || {}).forEach((q) => {
    const entry = store.answers[q];
    answers[q] = entry && typeof entry === 'object' ? (entry.answer || '') : (entry || '');
  });
  return answers;
}

function upsertAnswer(section, question, answer, source, chatId) {
  section = String(section || '').trim();
  question = String(question || '').trim();
  answer = String(answer || '').trim();
  if (!section || !question) return { ok: false, error: 'Missing data' };

  const store = loadStore_();
  const answers = store.answers || {};
  const previous = answers[question];
  const exists = Boolean(previous);

  answers[question] = {
    answer: answer,
    section: section,
    source: source || '',
    chat_id: chatId || '',
    updated_at: new Date().toISOString()
  };
  store.answers = answers;

  const assets = store.assets || {};
  assets[question] = {
    section: section,
    question: question,
    answer: answer,
    status: 'draft',
    updated_at: new Date().toISOString()
  };
  store.assets = assets;

  const logs = store.logs || [];
  logs.push({
    type: 'answer',
    timestamp: new Date().toISOString(),
    section: section,
    question: question,
    answer: answer,
    source: source || '',
    chat_id: chatId || '',
    previous_answer: previous && typeof previous === 'object' ? (previous.answer || '') : (previous || '')
  });
  store.logs = logs;

  saveStore_(store);
  return { ok: true, mode: exists ? 'update' : 'append' };
}

function getUser_(chatId) {
  const store = loadStore_();
  const users = store.users || {};
  return users[String(chatId || '')] || null;
}

function setLastQuestion_(chatId, section, question) {
  const store = loadStore_();
  const users = store.users || {};
  const id = String(chatId || '');
  const existing = users[id] || {};
  users[id] = {
    chat_id: id,
    last_section: section || '',
    last_question: question || '',
    updated_at: new Date().toISOString(),
    user_name: existing.user_name || ''
  };
  store.users = users;
  saveStore_(store);
}

function clearLastQuestion_(chatId) {
  const store = loadStore_();
  const users = store.users || {};
  const id = String(chatId || '');
  if (users[id]) {
    users[id].last_section = '';
    users[id].last_question = '';
    users[id].updated_at = new Date().toISOString();
    store.users = users;
    saveStore_(store);
  }
}

// ================================
// Sequentielles Next Question + Skip
// ================================
function getTodayDateString() {
  return new Date().toISOString().slice(0,10);
}

function getNextQuestion() {
  const answers = loadAnswers_();
  const today = getTodayDateString();
  const skipped = JSON.parse(PropertiesService.getUserProperties().getProperty(`SKIPPED_${today}`) || '[]');

  for (const section in QUESTIONS) {
    for (const q of QUESTIONS[section]) {
      if (!answers[q] && !skipped.includes(q)) {
        return { section, question: q };
      }
    }
  }
  return null;
}

function skipCurrentQuestion() {
  const next = getNextQuestion();
  if (!next) return { ok: false, message: 'Keine Frage zum Skippen verfügbar.' };

  const today = getTodayDateString();
  const skips = parseInt(PropertiesService.getUserProperties().getProperty(`SKIPS_${today}`) || '0');
  if (skips >= 1) return { ok: false, message: 'Du hast heute bereits 1 Skip verwendet. Beantworte oder warte bis morgen.' };

  PropertiesService.getUserProperties().setProperty(`SKIPS_${today}`, '1');
  let skipped = JSON.parse(PropertiesService.getUserProperties().getProperty(`SKIPPED_${today}`) || '[]');
  skipped.push(next.question);
  PropertiesService.getUserProperties().setProperty(`SKIPPED_${today}`, JSON.stringify(skipped));

  return { ok: true, message: 'Frage geskippt. Nächste ist bereit.' };
}
// =====================================================
// TELEGRAM HELPERS — switch to HTML parse_mode (stable)
// =====================================================
function getTelegramToken() {
  return PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
}

function getTelegramApiUrl() {
  const token = getTelegramToken();
  return token ? `https://api.telegram.org/bot${token}` : null;
}

function sendTelegramMessage(chatId, text, replyMarkup = null) {
  const apiUrl = getTelegramApiUrl();
  if (!apiUrl) return;

  const payload = { chat_id: String(chatId), text: String(text || ''), parse_mode: 'HTML' };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  try {
    UrlFetchApp.fetch(`${apiUrl}/sendMessage`, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('TG Send Error: ' + e);
  }
}

function getWebAppButtonKeyboard() {
  return {
    inline_keyboard: [[{ text: '👑 Open WebApp', web_app: { url: ScriptApp.getService().getUrl() } }]]
  };
}

// Minimal HTML escaping for Telegram
function escapeHtml_(s) {
  return String(s || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extractQuestionFromText_(text) {
  const t = String(text || '');
  for (const section of Object.keys(QUESTIONS)) {
    const qs = QUESTIONS[section] || [];
    for (const q of qs) {
      if (t.indexOf(q) !== -1) {
        return { section: section, question: q };
      }
    }
  }
  return null;
}

// =====================================================
// GEMINI REST — generate at 20:00
// =====================================================
function geminiGenerateText_(prompt, opts) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return { ok:false, error:'GEMINI_API_KEY missing' };

  opts = opts || {};
  const model = opts.model || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: String(prompt || '') }] }],
    generationConfig: {
      temperature: (opts.temperature ?? 0.55),
      maxOutputTokens: (opts.maxOutputTokens ?? 280)
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
  let json;
  try { json = JSON.parse(body); } catch(e) { json = null; }

  if (code >= 300) return { ok:false, error:`Gemini HTTP ${code}`, details: body };

  const text =
    json?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || '';

  return { ok:true, text: String(text || '').trim(), raw: json };
}

function generateGeminiInsight_(jobs, answers) {
  // Build Q&A block for ALL answered questions of the day
  const qaLines = jobs.map(j => {
    const a = (answers[j.question] || '').trim();
    return `[${j.section}]\nFrage: ${j.question}\nAntwort: ${a}`;
  }).join('\n\n');

  const prompt = [
    'Du bist "Creator King Insight" — ein brutaler, klarer Spiegel.',
    'Analysiere die Eingaben des Tages als EINE zusammenhängende Reflexion.',
    '',
    'Regeln:',
    '- Schreibe auf Deutsch, keine Therapie-Sprache, keine Floskeln.',
    '- Finde den EINE roten Faden über alle Antworten hinweg.',
    '- Gib genau diese 3 Blöcke aus, OHNE Markdown, OHNE Sternchen, OHNE Aufzählungszeichen:',
    '',
    'THEMA: (der verborgene rote Faden – ein Satz)',
    'BOTSCHAFT: (was du dir jetzt erkläres – zwei bis drei Sätze)',
    'NÄCHSTER STRIKE: (eine konkrete Aktion für morgen – ein Satz)',
    '',
    '--- EINGABEN DES TAGES ---',
    qaLines,
    '--- ENDE ---',
    '',
    'Jetzt:',
  ].join('\n');

  const g = geminiGenerateText_(prompt, { model: 'gemini-2.5-flash', maxOutputTokens: 700, temperature: 0.45 });
  if (!g.ok) return null;
  return g.text || null;
}

// =====================================================
// INSIGHT QUEUE — store minimal job, generate later
// =====================================================
function enqueueInsightJob_(section, question) {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(INSIGHT_QUEUE_PROP) || '[]';
  const arr = JSON.parse(raw);

  // De-dup by question (latest wins)
  const idx = arr.findIndex(x => x && x.question === question);
  const job = { ts: new Date().toISOString(), section: String(section||''), question: String(question||'') };
  if (idx >= 0) arr[idx] = job; else arr.push(job);

  props.setProperty(INSIGHT_QUEUE_PROP, JSON.stringify(arr));
}

function drainInsightQueue_() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(INSIGHT_QUEUE_PROP) || '[]';
  const arr = JSON.parse(raw);
  props.deleteProperty(INSIGHT_QUEUE_PROP);
  return arr;
}

// =====================================================
// MAIN SAVE FLOW — upsert + asset + enqueue insight job
// =====================================================
function upsertAnswerAndCreateAsset(section, question, answer) {
  const result = upsertAnswer(section, question, answer, 'webapp', '');
  if (!result.ok) return result;

  // ✅ queue a job (generate at 20:00)
  if (PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')) {
    enqueueInsightJob_(section, question);
  }

  return {
    ok: true,
    message: 'Antwort gespeichert! Asset bleibt als Draft in JSON. Insight kommt heute um 20:00 per Telegram.',
    assetUrl: null
  };
}

// Client expects this name
function upsertAndAnalyze(section, question, answer) {
  // We do NOT analyze immediately anymore.
  return upsertAnswerAndCreateAsset(section, question, answer);
}

// =====================================================
// 20:00 DISPATCHER — generate insights + send Telegram
// =====================================================
// Strip stray markdown that Gemini sometimes emits despite instructions
function stripMarkdown_(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // **bold**
    .replace(/\*([^*]+)\*/g, '$1')        // *italic*
    .replace(/^[-•]\s+/gm, '')            // bullet lines
    .replace(/`([^`]+)`/g, '$1');         // `code`
}

// Generic: split "LABEL: text" blocks from cleaned Gemini output
function parseInsightBlocks_(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const match = line.match(/^([A-ZÄÖÜ\s]+):/);
    if (match && match[1].trim().length >= 3) {
      if (current) blocks.push(current);
      const label = match[1].trim();
      const rest = line.slice(match[0].length).trim();
      current = { label, lines: rest ? [rest] : [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

// Format parsed blocks as Telegram HTML
function formatBlocksForTelegram_(blocks) {
  return blocks.map(b =>
    `<b>${escapeHtml_(b.label)}:</b> ${escapeHtml_(b.lines.join(' '))}`
  ).join('\n');
}

function dispatchQueuedInsights() {
  const chatId = PropertiesService.getScriptProperties().getProperty(TG_DEFAULT_CHAT_ID_PROP);
  if (!chatId) return;

  const jobs = drainInsightQueue_();
  if (!jobs.length) return;

  const answers = loadAnswers_();

  // Single holistic call for the whole day
  const raw = generateGeminiInsight_(jobs, answers);
  if (!raw) {
    Logger.log('dispatchQueuedInsights: Gemini returned nothing');
    return;
  }

  const cleaned = stripMarkdown_(raw);
  const blocks = parseInsightBlocks_(cleaned);

  // Send via Telegram
  const header = `🌌 <b>Creator King — Abend-Insights</b>\n<i>${escapeHtml_(new Date().toLocaleDateString('de-DE'))}</i>\n\n`;
  sendTelegramMessage(chatId, header + formatBlocksForTelegram_(blocks));

  // Persist to Drive — Delayed_Insights was created but never written to
  saveEntry({
    tool: 'CreatorKing_Daily_Insight',
    markdown: `# Creator King — Abend-Insights\n**${new Date().toLocaleDateString('de-DE')}**\n\n${cleaned}\n`,
    filename: `DailyInsight_${new Date().toISOString().slice(0,10)}.md`,
    subfolder: 'Delayed_Insights'
  });

  Logger.log(`Dispatched holistic insight for ${jobs.length} answer(s)`);

  // Check for newly completed sections → fire section analyses
  checkAndDispatchSectionAnalyses_(chatId);
}

// =====================================================
// SECTION COMPLETION — one-time Gemini analysis per section
// =====================================================
function generateSectionAnalysis_(section, sectionQA) {
  const qaBlock = sectionQA.map(item =>
    `Frage: ${item.question}\nAntwort: ${item.answer}`
  ).join('\n\n');

  const prompt = [
    'Du bist "Creator King Insight".',
    `Analysiere die vollständigen Antworten der Section "${section}".`,
    'Finde den roten Faden und das Kernmuster.',
    '',
    'Regeln:',
    '- Auf Deutsch, keine Therapie-Sprache, keine Floskeln.',
    '- Kein Markdown, keine Sternchen, keine Aufzählungszeichen.',
    '- Gib genau diese 3 Blöcke aus:',
    '',
    'KERNMUSTER: (was sich über alle Antworten hinweg wiederholt – ein bis zwei Sätze)',
    'PROFIL: (was diese Section über die Person aussagt – zwei bis drei Sätze)',
    'STRIKE: (eine konkrete Nutzung dieses Erkenntnisses für das Business – ein Satz)',
    '',
    '--- ANTWORTEN ---',
    qaBlock,
    '--- ENDE ---',
    '',
    'Jetzt:'
  ].join('\n');

  return geminiGenerateText_(prompt, { model: 'gemini-2.5-flash', maxOutputTokens: 500, temperature: 0.45 });
}

function checkAndDispatchSectionAnalyses_(chatId) {
  const store = loadStore_();
  const answers = loadAnswers_();
  const analyses = store.section_analyses || {};
  let updated = false;

  for (const section of Object.keys(QUESTIONS)) {
    if (analyses[section]) continue; // already generated for this section

    const questions = QUESTIONS[section];
    const sectionQA = questions
      .filter(q => String(answers[q] || '').trim())
      .map(q => ({ question: q, answer: answers[q] }));

    if (sectionQA.length !== questions.length) continue; // not fully answered yet

    const g = generateSectionAnalysis_(section, sectionQA);
    if (!g.ok) {
      Logger.log(`Section analysis failed for "${section}": ${g.error}`);
      continue;
    }

    const cleaned = stripMarkdown_(g.text);
    const blocks = parseInsightBlocks_(cleaned);

    // Persist to Drive
    const safeName = section.replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 60);
    saveEntry({
      tool: 'CreatorKing_Section_Analysis',
      markdown: `# Section Analysis: ${section}\n\n${cleaned}\n\n*Generiert am: ${new Date().toLocaleDateString('de-DE')}*`,
      filename: `SectionAnalysis_${safeName}_${new Date().toISOString().slice(0,10)}.md`,
      subfolder: 'Delayed_Insights'
    });

    // Send via Telegram
    const header = `👑 <b>Section Complete: ${escapeHtml_(section)}</b>\n\n`;
    sendTelegramMessage(chatId, header + formatBlocksForTelegram_(blocks));

    analyses[section] = { generated_at: new Date().toISOString() };
    updated = true;
  }

  if (updated) {
    store.section_analyses = analyses;
    saveStore_(store);
  }
}

// =====================================================
// CLIENT DATA
// =====================================================
function getAllData() {
  return {
    title: MAP_TITLE,
    subtitle: MAP_SUBTITLE,
    emojis: KING_EMOJIS,
    questions: QUESTIONS,
    sectionOrder: Object.keys(QUESTIONS),
    answers: loadAnswers_(),
    assets: loadStore_().assets || {},
    valuesList: VALUES_LIST,
    hints: QUESTION_HINTS,
    isComplete: getNextQuestion() === null
  };
}

// =====================================================
// EXPORT + FULL ANALYSIS (client expects)
// =====================================================
function exportAllToDrive() {
  const answers = loadAnswers_();
  const lines = [
    `# ${MAP_TITLE}`,
    '',
    `${MAP_SUBTITLE}`,
    '',
    `Export: ${new Date().toISOString()}`,
    '---',
    ''
  ];

  for (const section in QUESTIONS) {
    lines.push(`## ${section}`, '');
    for (const q of QUESTIONS[section]) {
      const a = (answers[q] || '').trim();
      lines.push(`### ${q}`, a ? a : '_(empty)_', '');
    }
  }

  const file = saveEntry({
    tool: 'CreatorKing_Export_All',
    markdown: lines.join('\n'),
    filename: `CreatorKing_Export_${new Date().toISOString().slice(0,10)}.md`,
    subfolder: 'Exports'
  });

  return file.ok ? { ok: true, file: file.file } : { ok: false, error: file.error };
}

function buildAssetMarkdown_(asset) {
  return `# Creator King Asset – ${asset.question}

**Section:** ${asset.section}
**Frage:** ${asset.question}

**Deine Antwort:**
${asset.answer}

---

**Zusätzliche Reflexionen (editiere mich frei):**
- 
- 
- 

**Für Gemini (Auto @20:00):**
Dieses Asset wird heute um 20:00 automatisch analysiert und dir per Telegram geschickt.

---

*Erstellt am: ${new Date().toLocaleDateString('de-DE')} via Alpha OS Creator King Centre*
*Dein Königreich wächst mit jedem Asset. 👑*`;
}

function exportAssetToDrive(question) {
  const q = String(question || '').trim();
  if (!q) return { ok: false, error: 'Missing question' };

  const store = loadStore_();
  const assets = store.assets || {};
  const asset = assets[q];
  if (!asset || !asset.answer) return { ok: false, error: 'Asset draft not found' };

  const safeQ = String(q).substring(0, 60).replace(/[^a-zA-Z0-9äöüÄÖÜß ]/g, '');
  const filename = `Asset_${safeQ}_${new Date().toISOString().slice(0,10)}.md`;
  const fileResult = saveEntry({
    tool: 'Creator_King_Asset',
    markdown: buildAssetMarkdown_(asset),
    filename: filename,
    subfolder: 'My_Assets'
  });

  if (fileResult.ok) {
    assets[q] = {
      section: asset.section,
      question: asset.question,
      answer: asset.answer,
      status: 'exported',
      exported_at: new Date().toISOString(),
      asset_url: fileResult.file.url,
      updated_at: new Date().toISOString()
    };
    store.assets = assets;
    saveStore_(store);
  }

  return fileResult.ok ? { ok: true, file: fileResult.file } : { ok: false, error: fileResult.error };
}

function generateFullAIAnalysis() {
  const next = getNextQuestion();
  if (next) return { ok: false, error: 'Not complete yet' };

  const answers = loadAnswers_();
  const blob = JSON.stringify(answers, null, 2);

  const prompt = [
    'You are Creator King Analyst.',
    'Write a German analysis in Markdown.',
    'Output structure:',
    '# Creator King Analysis',
    '## Core Theme',
    '## Target Audience Hypothesis',
    '## Offer Angles (3)',
    '## Content Pillars (5)',
    '## One 7-day Strike Plan',
    '',
    'ANSWERS JSON:',
    blob
  ].join('\n');

  const g = geminiGenerateText_(prompt, { model: 'gemini-2.5-flash', maxOutputTokens: 900, temperature: 0.55 });
  const text = g.ok ? g.text : `Gemini error: ${g.error}\n\n${g.details || ''}`;

  const file = saveEntry({
    tool: 'CreatorKing_Full_AI_Analysis',
    markdown: text,
    filename: `CreatorKing_AI_Analysis_${new Date().toISOString().slice(0,10)}.md`,
    subfolder: 'AI_Analysis'
  });

  return file.ok ? { ok: true, file: file.file } : { ok: false, error: file.error };
}

// =====================================================
// TELEGRAM BOT — polling + /start + /skip + answer capture
// =====================================================
function pollForUpdates() {
  const apiUrl = getTelegramApiUrl();
  if (!apiUrl) return Logger.log('Telegram Token fehlt');

  const props = PropertiesService.getScriptProperties();
  let lastUpdateId = parseInt(props.getProperty(LAST_UPDATE_ID_PROP) || '0', 10);
  const url = `${apiUrl}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`;

  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const data = JSON.parse(response.getContentText());

    if (data.ok && data.result.length > 0) {
      data.result.forEach(update => {
        if (update.update_id > lastUpdateId) {
          lastUpdateId = update.update_id;
          processTelegramUpdate(update);
        }
      });
      props.setProperty(LAST_UPDATE_ID_PROP, String(lastUpdateId));
    }
  } catch (e) {
    Logger.log('Polling ERROR: ' + e);
  }
}

function processTelegramUpdate(update) {
  if (!update.message) return;
  const msg = update.message;
  const chatId = String(msg.chat.id);
  const text = String(msg.text || '').trim();
  const replyText = msg.reply_to_message && msg.reply_to_message.text
    ? String(msg.reply_to_message.text)
    : '';

  if (text === '/start') {
    const props = PropertiesService.getScriptProperties();
    props.setProperty(TG_DEFAULT_CHAT_ID_PROP, chatId);
    sendTelegramMessage(chatId,
      '👑 <b>Creator King Centre aktiviert!</b>\n\nErste Frage morgen um 08:00. Insights kommen täglich um 20:00.',
      getWebAppButtonKeyboard()
    );
    return;
  }

  if (text === '/skip') {
    const result = skipCurrentQuestion();
    sendTelegramMessage(chatId, escapeHtml_(result.message), getWebAppButtonKeyboard());
    if (result.ok) {
      const next = getNextQuestion();
      if (next) {
        sendTelegramMessage(chatId,
          `👑 <b>Nächste Frage:</b>\n\n<b>${escapeHtml_(next.question)}</b>\n\nAntworte direkt.`,
          getWebAppButtonKeyboard()
        );
        setLastQuestion_(chatId, next.section, next.question);
      }
    }
    return;
  }

  const user = getUser_(chatId);
  const lastSection = user && user.last_section ? user.last_section : '';
  const lastQuestion = user && user.last_question ? user.last_question : '';
  const matched = replyText ? extractQuestionFromText_(replyText) : null;
  const question = matched ? matched.question : lastQuestion;
  const section = matched ? matched.section : lastSection;
  if (question && text) {
    const result = upsertAnswer(section, question, text, 'telegram', chatId);
    if (result.ok) {
      sendTelegramMessage(chatId,
        '✅ <b>Antwort gespeichert!</b>\n\nNächste Frage morgen. Insight kommt heute um 20:00.',
        getWebAppButtonKeyboard()
      );
      if (question === lastQuestion) {
        clearLastQuestion_(chatId);
      }
      if (PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')) {
        enqueueInsightJob_(section, question);
      }
    } else {
      sendTelegramMessage(chatId, `❌ Error: ${escapeHtml_(result.error || 'unknown')}`);
    }
  }
}

function sendDailyQuestion() {
  const chatId = PropertiesService.getScriptProperties().getProperty(TG_DEFAULT_CHAT_ID_PROP);
  if (!chatId) return;

  const next = getNextQuestion();
  if (next) {
    sendTelegramMessage(chatId,
      `👑 <b>Tägliche Frage</b>\n\n<b>${escapeHtml_(next.question)}</b>\n\nAntworte direkt hier.`,
      getWebAppButtonKeyboard()
    );
    setLastQuestion_(chatId, next.section, next.question);
  } else {
    sendTelegramMessage(chatId, '🎉 <b>Komplett!</b> Öffne die WebApp für Export.', getWebAppButtonKeyboard());
  }
}

// =====================================================
// SETUP & INIT — include 20:00 dispatcher
// =====================================================
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('pollForUpdates').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('sendDailyQuestion').timeBased().everyDays(1).atHour(8).create();

  // ✅ Daily Insight Dispatch at 20:00
  ScriptApp.newTrigger('dispatchQueuedInsights').timeBased().everyDays(1).atHour(20).create();

  Logger.log('Triggers gesetzt (08:00 question, 20:00 insights)');
}

function initCreatorKingCentre() {
  // your existing init tasks
  getCentreFolder_();
  getStoreFile_();
  setupTriggers();
  Logger.log('Creator King Centre initialisiert – bereit für dein Königreich.');
}

// =====================================================
// DEBUG HELPERS
// =====================================================
function ck_debugInfo(chatId) {
  const store = loadStore_();
  const user = chatId ? getUser_(chatId) : null;
  const file = getStoreFile_();
  const payload = {
    ok: true,
    storeFileName: file.getName(),
    storeFileUrl: file.getUrl(),
    answersCount: Object.keys(store.answers || {}).length,
    assetsCount: Object.keys(store.assets || {}).length,
    lastQuestion: user ? { section: user.last_section, question: user.last_question } : null
  };
  Logger.log(JSON.stringify(payload));
  return payload;
}

function ck_debugNextQuestion() {
  const next = getNextQuestion();
  const payload = { ok: true, next: next };
  Logger.log(JSON.stringify(payload));
  return payload;
}

function ck_debugClearLast(chatId) {
  if (!chatId) return { ok: false, error: 'Missing chatId' };
  clearLastQuestion_(chatId);
  return { ok: true };
}

function ck_debugSimulateMessage(chatId, text) {
  if (!chatId) return { ok: false, error: 'Missing chatId' };
  const update = {
    update_id: Date.now(),
    message: {
      chat: { id: String(chatId) },
      text: String(text || '')
    }
  };
  processTelegramUpdate(update);
  return { ok: true };
}

function ck_getWebhookInfo() {
  const apiUrl = getTelegramApiUrl();
  if (!apiUrl) return { ok: false, error: 'Missing TELEGRAM_BOT_TOKEN' };
  const res = UrlFetchApp.fetch(`${apiUrl}/getWebhookInfo`, { muteHttpExceptions: true });
  const body = res.getContentText();
  let json = {};
  try { json = JSON.parse(body); } catch (_) { json = { raw: body }; }
  Logger.log(JSON.stringify(json));
  return json;
}

function ck_deleteWebhook() {
  const apiUrl = getTelegramApiUrl();
  if (!apiUrl) return { ok: false, error: 'Missing TELEGRAM_BOT_TOKEN' };
  const res = UrlFetchApp.fetch(`${apiUrl}/deleteWebhook`, { muteHttpExceptions: true });
  const body = res.getContentText();
  let json = {};
  try { json = JSON.parse(body); } catch (_) { json = { raw: body }; }
  Logger.log(JSON.stringify(json));
  return json;
}

function ck_pollOnceDebug() {
  const apiUrl = getTelegramApiUrl();
  if (!apiUrl) return { ok: false, error: 'Missing TELEGRAM_BOT_TOKEN' };
  const props = PropertiesService.getScriptProperties();
  const lastUpdateId = parseInt(props.getProperty(LAST_UPDATE_ID_PROP) || '0', 10);
  const url = `${apiUrl}/getUpdates?offset=${lastUpdateId + 1}&timeout=0`;
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const body = res.getContentText();
  let json = {};
  try { json = JSON.parse(body); } catch (_) { json = { raw: body }; }
  Logger.log(JSON.stringify(json));
  return json;
}
