import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

const router = express.Router();

const FLOW_PATH = path.join(os.homedir(), ".aos", "door-flow.json");
const VAULT_DOOR_DIR = path.join(os.homedir(), "AlphaOS-Vault", "Door");
const WARSTACKS_DIR = path.join(VAULT_DOOR_DIR, "War-Stacks");
const PROFIT_DIR = path.join(VAULT_DOOR_DIR, "4-Profit");

const WARSTACK_STEPS = [
  {
    key: "trigger",
    question: "Was ist der Ausloeser?",
  },
  {
    key: "narrative",
    question: "Welche Story erzaehlst du dir?",
  },
  {
    key: "validation",
    question: "Was ist wirklich wahr?",
  },
  {
    key: "impact",
    question: "Was wird sich aendern?",
  },
];

function baseFlow() {
  return {
    hotlist: [],
    doorwars: [],
    warstacks: [],
    hits: [],
    warstack_sessions: {},
  };
}

function normalizeFlow(raw) {
  const flow = raw && typeof raw === "object" ? { ...raw } : {};
  flow.hotlist = Array.isArray(flow.hotlist) ? flow.hotlist : [];
  flow.doorwars = Array.isArray(flow.doorwars) ? flow.doorwars : [];
  flow.warstacks = Array.isArray(flow.warstacks) ? flow.warstacks : [];
  flow.hits = Array.isArray(flow.hits) ? flow.hits : [];
  flow.warstack_sessions =
    flow.warstack_sessions && typeof flow.warstack_sessions === "object" && !Array.isArray(flow.warstack_sessions)
      ? flow.warstack_sessions
      : {};
  return flow;
}

function loadFlow() {
  try {
    return normalizeFlow(JSON.parse(fs.readFileSync(FLOW_PATH, "utf8")));
  } catch {
    return baseFlow();
  }
}

function saveFlow(data) {
  const dir = path.dirname(FLOW_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FLOW_PATH, JSON.stringify(normalizeFlow(data), null, 2) + "\n", "utf8");
}

function respondOk(res, data, aliases = {}) {
  return res.json({ ok: true, data, ...aliases });
}

function respondErr(res, status, error, extra = {}) {
  return res.status(status).json({ ok: false, error, ...extra });
}

function nowIso() {
  return new Date().toISOString();
}

function isoWeekParts(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round(
    ((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
  return { year: d.getFullYear(), week };
}

function weekKey(date = new Date()) {
  const { year, week } = isoWeekParts(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function dayKey(date = new Date()) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeFilename(input, fallback = "item") {
  const cleaned = String(input || "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-zA-Z0-9._ -]/g, " ")
    .trim()
    .replace(/\s+/g, "_");
  return cleaned || fallback;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function uniquePath(filePath) {
  if (!fs.existsSync(filePath)) return filePath;
  const ext = path.extname(filePath);
  const base = filePath.slice(0, -ext.length);
  let idx = 2;
  while (true) {
    const candidate = `${base}-${idx}${ext}`;
    if (!fs.existsSync(candidate)) return candidate;
    idx += 1;
  }
}

function trimStr(value) {
  return String(value == null ? "" : value).trim();
}

function ensureHotlistShape(item) {
  return {
    id: trimStr(item.id) || crypto.randomUUID(),
    title: trimStr(item.title),
    description: trimStr(item.description),
    created_at: trimStr(item.created_at) || nowIso(),
    quadrant: Number.isInteger(item.quadrant) ? item.quadrant : null,
  };
}

function evaluateEisenhower(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const urgencyWords = ["today", "morgen", "deadline", "urgent", "dring", "frist", "soon", "now"];
  const importanceWords = ["ausbildung", "business", "kunden", "client", "income", "strategy", "system", "project"];
  const urgency = urgencyWords.reduce((acc, word) => acc + (text.includes(word) ? 1 : 0), 0);
  const importance = 1 + importanceWords.reduce((acc, word) => acc + (text.includes(word) ? 1 : 0), 0);

  let quadrant = 2;
  if (urgency >= 2 && importance >= 2) quadrant = 1;
  else if (urgency < 2 && importance >= 2) quadrant = 2;
  else if (urgency >= 2 && importance < 2) quadrant = 3;
  else quadrant = 4;

  if (Number.isInteger(item.quadrant) && item.quadrant >= 1 && item.quadrant <= 4) {
    quadrant = item.quadrant;
  }

  return {
    quadrant,
    urgency_score: urgency,
    importance_score: importance,
    reasoning: `Q${quadrant} (urgency=${urgency}, importance=${importance})`,
  };
}

function ensureHitStatus(flow, hit, warstack) {
  const idx = flow.hits.findIndex((entry) => entry && entry.id === hit.id);
  const base = {
    id: hit.id,
    warstack_id: warstack.id,
    door_title: warstack.door_title,
    week: warstack.week || weekKey(new Date(warstack.created_at || Date.now())),
    done: Boolean(hit.done),
    created_at: trimStr(hit.created_at) || trimStr(warstack.created_at) || nowIso(),
    completed_at: hit.done ? trimStr(hit.completed_at) || nowIso() : null,
  };

  if (idx === -1) {
    flow.hits.push(base);
    return base;
  }

  const merged = {
    ...flow.hits[idx],
    ...base,
    done: flow.hits[idx].done != null ? Boolean(flow.hits[idx].done) : base.done,
    completed_at: flow.hits[idx].done
      ? trimStr(flow.hits[idx].completed_at) || base.completed_at || nowIso()
      : null,
  };
  flow.hits[idx] = merged;
  return merged;
}

function syncHits(flow) {
  let changed = false;
  const hitsLenBefore = Array.isArray(flow.hits) ? flow.hits.length : 0;
  flow.warstacks = (flow.warstacks || []).map((warstack) => {
    const ws = { ...warstack };
    const hits = Array.isArray(ws.hits) ? ws.hits : [];
    ws.hits = hits.map((hit) => {
      const h = {
        id: trimStr(hit.id) || crypto.randomUUID(),
        fact: trimStr(hit.fact),
        obstacle: trimStr(hit.obstacle),
        strike: trimStr(hit.strike),
        responsibility: trimStr(hit.responsibility),
        created_at: trimStr(hit.created_at) || trimStr(ws.created_at) || nowIso(),
        done: Boolean(hit.done),
        completed_at: hit.done ? trimStr(hit.completed_at) || null : null,
      };
      const status = ensureHitStatus(flow, h, ws);
      if (h.done !== Boolean(status.done) || h.completed_at !== (status.completed_at || null)) {
        h.done = Boolean(status.done);
        h.completed_at = status.completed_at || null;
        changed = true;
      }
      if (!trimStr(hit.id)) changed = true;
      return h;
    });
    return ws;
  });
  if ((flow.hits || []).length !== hitsLenBefore) changed = true;
  return changed;
}

function findWarstack(flow, id) {
  const ref = trimStr(id);
  if (!ref) return null;
  return (flow.warstacks || []).find((ws) => ws && (ws.id === ref || ws.session_id === ref)) || null;
}

function buildWarStackHits(doorTitle, inquiry) {
  const validation = trimStr(inquiry.validation) || "Noch nicht klar";
  const trigger = trimStr(inquiry.trigger) || "Unklar";
  const narrative = trimStr(inquiry.narrative) || "Unklar";
  const impact = trimStr(inquiry.impact) || "Momentum";
  const facts = [
    `Definition of done fuer ${doorTitle}`,
    `Erster konkreter Deliverable fuer ${doorTitle}`,
    `Blocker entfernen fuer ${doorTitle}`,
    `Woechentliche Review fuer ${doorTitle}`,
  ];

  return facts.map((fact, index) => ({
    id: crypto.randomUUID(),
    fact,
    obstacle:
      index === 0 ? `Unklare Kriterien (${narrative.slice(0, 80) || "Narrative fehlt"})`
        : index === 1 ? `Zu viele Parallelthemen (${trigger.slice(0, 80) || "Trigger unklar"})`
        : index === 2 ? `Annahme statt Fakten (${validation.slice(0, 80) || "Validation fehlt"})`
        : `Kein Review-Rhythmus (${impact.slice(0, 80) || "Impact unklar"})`,
    strike:
      index === 0 ? "10 Minuten Scope schreiben und DoD festlegen"
        : index === 1 ? "90-Minuten Fokusblock im Kalender fixieren"
        : index === 2 ? "Eine verifizierbare Aktion heute abschliessen"
        : "Wochenreview terminieren und Ergebnisse dokumentieren",
    responsibility: `Ich uebernehme Verantwortung fuer Hit ${index + 1} bei ${doorTitle}.`,
    done: false,
    completed_at: null,
    created_at: nowIso(),
  }));
}

function renderWarStackMarkdown(warstack) {
  const d = new Date(warstack.created_at || Date.now());
  const createdDate = Number.isNaN(d.getTime()) ? dayKey() : dayKey(d);
  const week = warstack.week || weekKey(d);
  const inquiry = warstack.inquiry || {};
  const hits = Array.isArray(warstack.hits) ? warstack.hits : [];

  const hitSections = hits.map((hit, idx) => {
    return [
      `### Hit ${idx + 1}`,
      `- **Fact:** ${trimStr(hit.fact) || "-"}`,
      `- **Obstacle:** ${trimStr(hit.obstacle) || "-"}`,
      `- **Strike:** ${trimStr(hit.strike) || "-"}`,
      `- **Responsibility:** ${trimStr(hit.responsibility) || "-"}`,
      "",
    ].join("\n");
  }).join("\n");

  return [
    `# War Stack: ${warstack.door_title || "Untitled Door"}`,
    "",
    `**Week:** ${week}`,
    `**Created:** ${createdDate}`,
    `**ID:** ${warstack.id}`,
    "",
    "## Reflexive Inquiry",
    "",
    "**Trigger:** Was hat dich hierher gebracht?",
    `> ${trimStr(inquiry.trigger) || "-"}`,
    "",
    "**Narrative:** Welche Geschichte erzaehlst du dir?",
    `> ${trimStr(inquiry.narrative) || "-"}`,
    "",
    "**Validation:** Was ist wirklich wahr?",
    `> ${trimStr(inquiry.validation) || "-"}`,
    "",
    "**Impact:** Was wird sich aendern wenn du das durchziehst?",
    `> ${trimStr(inquiry.impact) || "-"}`,
    "",
    "---",
    "",
    "## 4 Hits (Fact / Obstacle / Strike / Responsibility)",
    "",
    hitSections.trimEnd(),
    "",
  ].join("\n");
}

function writeWarStackMarkdown(warstack) {
  const weekDir = path.join(WARSTACKS_DIR, warstack.week || weekKey(new Date(warstack.created_at || Date.now())));
  ensureDir(weekDir);
  const name = safeFilename(warstack.door_title, `warstack-${warstack.id}`);
  const target = uniquePath(path.join(weekDir, `${name}.md`));
  fs.writeFileSync(target, renderWarStackMarkdown(warstack), "utf8");
  return target;
}

function renderReflectionMarkdown(payload) {
  const dateStr = trimStr(payload.date) || dayKey();
  const createdAt = nowIso();
  const doorTitle = trimStr(payload.door_title || payload.title) || "Untitled Door";
  const warstackId = trimStr(payload.warstack_id);
  const reflection = trimStr(payload.reflection || payload.text || payload.body);
  const wins = Array.isArray(payload.wins) ? payload.wins.map(trimStr).filter(Boolean) : [];
  const lessons = Array.isArray(payload.lessons) ? payload.lessons.map(trimStr).filter(Boolean) : [];
  const next = Array.isArray(payload.next) ? payload.next.map(trimStr).filter(Boolean) : [];

  const lines = [
    `# Profit Reflection: ${doorTitle}`,
    "",
    `**Date:** ${dateStr}`,
    `**Created:** ${createdAt}`,
  ];
  if (warstackId) lines.push(`**War Stack ID:** ${warstackId}`);
  lines.push("");
  lines.push("## Reflection");
  lines.push("");
  lines.push(reflection || "-");
  lines.push("");

  if (wins.length) {
    lines.push("## Wins", "");
    wins.forEach((entry) => lines.push(`- ${entry}`));
    lines.push("");
  }
  if (lessons.length) {
    lines.push("## Lessons", "");
    lessons.forEach((entry) => lines.push(`- ${entry}`));
    lines.push("");
  }
  if (next.length) {
    lines.push("## Next", "");
    next.forEach((entry) => lines.push(`- ${entry}`));
    lines.push("");
  }

  return lines.join("\n");
}

function writeReflectionMarkdown(payload) {
  ensureDir(PROFIT_DIR);
  const dateStr = trimStr(payload.date) || dayKey();
  const doorPart = trimStr(payload.door_title || payload.title);
  const fileName = doorPart ? `${safeFilename(dateStr)}_${safeFilename(doorPart)}.md` : `${safeFilename(dateStr)}.md`;
  const target = uniquePath(path.join(PROFIT_DIR, fileName));
  fs.writeFileSync(target, renderReflectionMarkdown(payload), "utf8");
  return target;
}

function listMarkdownFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => {
        const full = path.join(dirPath, entry.name);
        const st = fs.statSync(full);
        return {
          name: entry.name,
          path: full,
          mtime: st.mtime.toISOString(),
          size: st.size,
        };
      })
      .sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
  } catch {
    return [];
  }
}

router.get("/hotlist", (_req, res) => {
  try {
    const flow = loadFlow();
    const items = (flow.hotlist || []).map(ensureHotlistShape);
    return respondOk(res, { items }, { items });
  } catch (err) {
    return respondErr(res, 500, String(err));
  }
});

router.post("/hotlist", (req, res) => {
  try {
    const title = trimStr(req.body?.title);
    const description = trimStr(req.body?.description);
    if (!title) return respondErr(res, 400, "title_required");

    const flow = loadFlow();
    const item = ensureHotlistShape({
      id: crypto.randomUUID(),
      title,
      description,
      created_at: nowIso(),
      quadrant: null,
    });
    flow.hotlist.push(item);
    saveFlow(flow);
    return respondOk(res, { item }, { item });
  } catch (err) {
    return respondErr(res, 500, String(err));
  }
});

router.delete("/hotlist/:id", (req, res) => {
  try {
    const id = trimStr(req.params.id);
    const flow = loadFlow();
    const before = flow.hotlist.length;
    const removed = flow.hotlist.find((item) => trimStr(item.id) === id) || null;
    flow.hotlist = flow.hotlist.filter((item) => trimStr(item.id) !== id);
    if (flow.hotlist.length === before) return respondErr(res, 404, "not_found");
    saveFlow(flow);
    return respondOk(res, { removed, id }, { removed });
  } catch (err) {
    return respondErr(res, 500, String(err));
  }
});

router.post("/doorwar", (req, res) => {
  try {
    const flow = loadFlow();
    const hotlist = (flow.hotlist || []).map(ensureHotlistShape);
    if (!hotlist.length) {
      return respondErr(res, 400, "hotlist_empty");
    }

    const evaluated = hotlist.map((item) => ({
      ...item,
      evaluation: evaluateEisenhower(item),
    }));

    const requested = trimStr(req.body?.id || req.body?.choice || req.body?.title || req.body?.door_title);
    let selected = null;
    if (requested) {
      selected = evaluated.find((item) => item.id === requested || item.title === requested) || null;
    }
    if (!selected) {
      const sorted = [...evaluated].sort((a, b) => {
        const aq2 = a.evaluation.quadrant === 2 ? 1 : 0;
        const bq2 = b.evaluation.quadrant === 2 ? 1 : 0;
        if (bq2 !== aq2) return bq2 - aq2;
        const ai = a.evaluation.importance_score || 0;
        const bi = b.evaluation.importance_score || 0;
        if (bi !== ai) return bi - ai;
        return (a.created_at || "").localeCompare(b.created_at || "");
      });
      selected = sorted[0] || null;
    }
    if (!selected) return respondErr(res, 400, "no_door_selected");

    flow.hotlist = flow.hotlist.map((item) => {
      const match = evaluated.find((ev) => ev.id === item.id);
      if (!match) return item;
      return { ...item, quadrant: match.evaluation.quadrant };
    });

    const doorwar = {
      id: crypto.randomUUID(),
      selected_id: selected.id,
      selected_title: selected.title,
      quadrant: selected.evaluation.quadrant,
      reasoning: trimStr(req.body?.reasoning) || selected.evaluation.reasoning,
      created_at: nowIso(),
      evaluated: evaluated.map((item) => ({
        id: item.id,
        title: item.title,
        quadrant: item.evaluation.quadrant,
        urgency_score: item.evaluation.urgency_score,
        importance_score: item.evaluation.importance_score,
      })),
    };

    flow.doorwars.push(doorwar);
    saveFlow(flow);

    return respondOk(
      res,
      { doorwar, evaluated, selected },
      { doorwar, evaluated, selected }
    );
  } catch (err) {
    return respondErr(res, 500, String(err));
  }
});

router.get("/warstacks", (_req, res) => {
  try {
    const flow = loadFlow();
    const changed = syncHits(flow);
    if (changed) saveFlow(flow);
    const warstacks = [...flow.warstacks].sort((a, b) => {
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
    return respondOk(res, { warstacks }, { warstacks });
  } catch (err) {
    return respondErr(res, 500, String(err));
  }
});

router.post("/warstack/start", (req, res) => {
  try {
    const doorTitle =
      trimStr(req.body?.door_title) ||
      trimStr(req.body?.title) ||
      trimStr(req.body?.door);
    if (!doorTitle) return respondErr(res, 400, "door_title_required");

    const flow = loadFlow();
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      door_title: doorTitle,
      step_index: 0,
      inquiry: {},
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    flow.warstack_sessions[sessionId] = session;
    saveFlow(flow);

    const step = WARSTACK_STEPS[0];
    return respondOk(
      res,
      {
        session_id: sessionId,
        step: step.key,
        question: step.question,
      },
      {
        session_id: sessionId,
        step: step.key,
        question: step.question,
      }
    );
  } catch (err) {
    return respondErr(res, 500, String(err));
  }
});

router.post("/warstack/answer", (req, res) => {
  try {
    const sessionId = trimStr(req.body?.session_id || req.body?.id);
    const answer = trimStr(req.body?.answer);
    if (!sessionId) return respondErr(res, 400, "session_id_required");
    if (!answer) return respondErr(res, 400, "answer_required");

    const flow = loadFlow();
    const session = flow.warstack_sessions[sessionId];
    if (!session) return respondErr(res, 404, "session_not_found");

    const stepIndex = Number.isInteger(session.step_index) ? session.step_index : 0;
    const current = WARSTACK_STEPS[stepIndex];
    if (!current) return respondErr(res, 400, "session_invalid_state");

    const providedStep = trimStr(req.body?.step);
    if (providedStep && providedStep !== current.key) {
      return respondErr(res, 400, "step_mismatch", { expected_step: current.key });
    }

    session.inquiry = session.inquiry || {};
    session.inquiry[current.key] = answer;
    session.step_index = stepIndex + 1;
    session.updated_at = nowIso();

    const next = WARSTACK_STEPS[session.step_index];
    if (next) {
      flow.warstack_sessions[sessionId] = session;
      saveFlow(flow);
      return respondOk(
        res,
        {
          session_id: sessionId,
          step: next.key,
          question: next.question,
        },
        {
          session_id: sessionId,
          step: next.key,
          question: next.question,
        }
      );
    }

    const createdAt = nowIso();
    const warstack = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      door_title: session.door_title,
      inquiry: {
        trigger: trimStr(session.inquiry.trigger),
        narrative: trimStr(session.inquiry.narrative),
        validation: trimStr(session.inquiry.validation),
        impact: trimStr(session.inquiry.impact),
      },
      hits: buildWarStackHits(session.door_title, session.inquiry),
      week: weekKey(new Date(createdAt)),
      created_at: createdAt,
    };

    const markdownPath = writeWarStackMarkdown(warstack);
    warstack.path = markdownPath;

    flow.warstacks.push(warstack);
    delete flow.warstack_sessions[sessionId];
    const changed = syncHits(flow);
    saveFlow(flow);

    return respondOk(
      res,
      { warstack, done: true, synced_hits: changed },
      { warstack, done: true }
    );
  } catch (err) {
    return respondErr(res, 500, String(err));
  }
});

router.get("/warstack/:id", (req, res) => {
  try {
    const flow = loadFlow();
    const warstack = findWarstack(flow, req.params.id);
    if (!warstack) return respondErr(res, 404, "not_found");
    return respondOk(res, { warstack }, { warstack });
  } catch (err) {
    return respondErr(res, 500, String(err));
  }
});

router.get("/hits", (_req, res) => {
  try {
    const flow = loadFlow();
    const changed = syncHits(flow);
    const currentWeek = weekKey();
    const hits = (flow.warstacks || [])
      .filter((warstack) => (warstack.week || weekKey(new Date(warstack.created_at || Date.now()))) === currentWeek)
      .flatMap((warstack) => (Array.isArray(warstack.hits) ? warstack.hits : []).map((hit) => ({
        ...hit,
        warstack_id: warstack.id,
        door_title: warstack.door_title,
        week: currentWeek,
      })));

    if (changed) saveFlow(flow);
    return respondOk(res, { week: currentWeek, hits }, { hits, week: currentWeek });
  } catch (err) {
    return respondErr(res, 500, String(err));
  }
});

router.post("/hits/:id/toggle", (req, res) => {
  try {
    const hitId = trimStr(req.params.id);
    const flow = loadFlow();
    syncHits(flow);

    const status = flow.hits.find((entry) => trimStr(entry.id) === hitId);
    if (!status) return respondErr(res, 404, "hit_not_found");

    status.done = !Boolean(status.done);
    status.completed_at = status.done ? nowIso() : null;

    let hit = null;
    let warstackId = null;
    flow.warstacks = (flow.warstacks || []).map((ws) => {
      if (!Array.isArray(ws.hits)) return ws;
      const updatedHits = ws.hits.map((entry) => {
        if (trimStr(entry.id) !== hitId) return entry;
        const next = {
          ...entry,
          done: status.done,
          completed_at: status.completed_at,
        };
        hit = next;
        warstackId = ws.id;
        return next;
      });
      return { ...ws, hits: updatedHits };
    });

    saveFlow(flow);

    return respondOk(
      res,
      {
        hit: {
          ...status,
          ...(hit || {}),
          warstack_id: warstackId || status.warstack_id,
        },
      },
      { hit: { ...status, ...(hit || {}) } }
    );
  } catch (err) {
    return respondErr(res, 500, String(err));
  }
});

router.get("/hits/week", (_req, res) => {
  try {
    const flow = loadFlow();
    const changed = syncHits(flow);
    const currentWeek = weekKey();
    const hits = flow.hits.filter((entry) => trimStr(entry.week) === currentWeek);
    const completed = hits.filter((entry) => entry.done).length;
    const summary = {
      week: currentWeek,
      total_hits: hits.length,
      completed_hits: completed,
      open_hits: hits.length - completed,
      completion_rate: hits.length ? Number((completed / hits.length).toFixed(4)) : 0,
    };
    if (changed) saveFlow(flow);
    return respondOk(res, { summary }, { summary });
  } catch (err) {
    return respondErr(res, 500, String(err));
  }
});

router.get("/completed", (_req, res) => {
  try {
    const flow = loadFlow();
    const changed = syncHits(flow);
    const completed = (flow.warstacks || [])
      .filter((ws) => Array.isArray(ws.hits) && ws.hits.length > 0)
      .filter((ws) => ws.hits.every((hit) => Boolean(hit.done)))
      .map((ws) => ({
        id: ws.id,
        door_title: ws.door_title,
        week: ws.week,
        created_at: ws.created_at,
        completed_at: ws.hits.reduce((latest, hit) => {
          const value = trimStr(hit.completed_at);
          return value > latest ? value : latest;
        }, ""),
        hit_count: ws.hits.length,
      }))
      .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)));
    if (changed) saveFlow(flow);
    return respondOk(res, { completed }, { completed });
  } catch (err) {
    return respondErr(res, 500, String(err));
  }
});

router.post("/reflection", (req, res) => {
  try {
    const hasText = trimStr(req.body?.reflection || req.body?.text || req.body?.body);
    const hasDoor = trimStr(req.body?.door_title || req.body?.title);
    if (!hasText && !hasDoor) {
      return respondErr(res, 400, "reflection_required");
    }
    const filePath = writeReflectionMarkdown(req.body || {});
    return respondOk(res, { path: filePath }, { path: filePath });
  } catch (err) {
    return respondErr(res, 500, String(err));
  }
});

router.get("/reflections", (_req, res) => {
  try {
    const reflections = listMarkdownFiles(PROFIT_DIR);
    return respondOk(res, { reflections }, { reflections });
  } catch (err) {
    return respondErr(res, 500, String(err));
  }
});

export default router;
