"use strict";

window.aosGasFallback?.init?.("door");

const PHASES = {
  potential: {
    label: "POTENTIAL",
    folder: "1-Potential",
    subtitle: "Hot List intake",
    intro: "Capture raw possibilities and keep the file trail in sync with Door/1-Potential.",
    draftTitle: "Untitled Potential",
    template(title) {
      return [
        "---",
        "type: door-potential",
        "phase: potential",
        `created: ${todayKey()}`,
        "---",
        "",
        `# ${title}`,
        "",
        "## Idea",
        "",
        "-",
        "",
        "## Notes",
        "",
      ].join("\n");
    },
  },
  plan: {
    label: "PLAN",
    folder: "2-Plan",
    subtitle: "Door War + War Stack",
    intro: "Evaluate candidates, pick the Door, then walk the War Stack inquiry directly in the PWA.",
    draftTitle: "Untitled Plan",
    template(title) {
      return [
        "---",
        "type: door-plan",
        "phase: plan",
        `created: ${todayKey()}`,
        "---",
        "",
        `# ${title}`,
        "",
        "## Door War",
        "",
        "- Priority:",
        "- Door:",
        "- Why now:",
        "",
        "## Notes",
        "",
      ].join("\n");
    },
  },
  production: {
    label: "PRODUCTION",
    folder: "3-Production",
    subtitle: "Hit List execution",
    intro: "Production is the execution layer. Keep 3-Production focused on the weekly Hit List and the handoff toward the Daily Fire Map.",
    draftTitle: "Untitled Hit List",
    template(title) {
      return [
        "---",
        "type: door-production",
        "phase: production",
        `created: ${todayKey()}`,
        "---",
        "",
        `# Hit List: ${title}`,
        "",
        "## Week",
        "",
        `- ${todayKey()}`,
        "",
        "## Door",
        "",
        `- ${title}`,
        "",
        "## Hits",
        "",
        "### Hit 1",
        "- Fact:",
        "- Obstacle:",
        "- Strike:",
        "- Responsibility:",
        "",
      ].join("\n");
    },
  },
  profit: {
    label: "PROFIT",
    folder: "4-Profit",
    subtitle: "Review + reflections",
    intro: "Reflect completed work, save Profit notes, and keep the review artifacts in Door/4-Profit.",
    draftTitle: "Untitled Reflection",
    template(title) {
      return [
        "---",
        "type: door-profit",
        "phase: profit",
        `created: ${todayKey()}`,
        "---",
        "",
        `# Profit Reflection: ${title}`,
        "",
        "## Reflection",
        "",
        "-",
        "",
        "## Wins",
        "",
        "-",
        "",
        "## Next",
        "",
        "-",
        "",
      ].join("\n");
    },
  },
};

const APP_CONFIG = (() => {
  const raw = window.DOOR_PWA_CONFIG || {};
  const initialPhase = String(raw.initialPhase || raw.phase || "potential").trim().toLowerCase();
  const lockedPhase = String(raw.lockedPhase || "").trim().toLowerCase();
  return {
    appTitle: String(raw.appTitle || "DOOR CTX").trim() || "DOOR CTX",
    initialPhase: PHASES[initialPhase] ? initialPhase : "potential",
    lockedPhase: PHASES[lockedPhase] ? lockedPhase : "",
    swPath: String(raw.swPath || "/pwa/door/sw.js").trim() || "/pwa/door/sw.js",
    swScope: String(raw.swScope || "/pwa/door/").trim() || "/pwa/door/",
  };
})();

const OFFLINE_STORE_KEY = "aos-door-pwa-cache-v1";

const state = {
  currentPhase: "potential",
  summary: {},
  capabilities: {
    filesApi: true,
  },
  filesByPhase: {
    potential: [],
    plan: [],
    production: [],
    profit: [],
  },
  editors: {},
  status: "",
  statusTone: "info",
  phaseData: {
    potential: {
      candidates: [],
      draftText: "",
    },
    plan: {
      candidates: [],
      reasoning: "",
      selectedDoorTitle: "",
      doorwarResult: null,
      warstackSession: null,
      warstackAnswer: "",
      latestWarstack: null,
      recentDoorwars: [],
      activeSessions: [],
      recentWarstacks: [],
    },
    production: {
      weekSummary: null,
      hits: [],
    },
    profit: {
      completed: [],
      reflections: [],
      form: {
        door_title: "",
        reflection: "",
        wins: "",
        lessons: "",
        next: "",
      },
    },
  },
};

const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

const offlineStore = loadOfflineStore();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadOfflineStore() {
  try {
    const raw = window.localStorage?.getItem(OFFLINE_STORE_KEY);
    if (!raw) return { gets: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { gets: {} };
    if (!parsed.gets || typeof parsed.gets !== "object") parsed.gets = {};
    return parsed;
  } catch (_err) {
    return { gets: {} };
  }
}

function saveOfflineStore() {
  try {
    window.localStorage?.setItem(OFFLINE_STORE_KEY, JSON.stringify(offlineStore));
  } catch (_err) {
    // Ignore local storage failures. The app still works online.
  }
}

function rememberGetResponse(url, data) {
  offlineStore.gets[url] = {
    saved_at: new Date().toISOString(),
    data,
  };
  saveOfflineStore();
}

function readCachedGet(url) {
  return offlineStore.gets[url]?.data || null;
}

function isLikelyOfflineError(err) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return err instanceof TypeError;
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatSize(value) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function deriveTitleFromName(name, fallback) {
  const raw = String(name || "").replace(/\.md$/i, "");
  const cleaned = raw.replace(/[_-]+/g, " ").trim();
  return cleaned || fallback;
}

function makeDraft(phase) {
  const config = PHASES[phase];
  const title = config.draftTitle;
  return {
    key: "",
    name: "",
    title,
    content: config.template(title),
    source: config.folder,
    relative_path: "",
    mtime: "",
    size: 0,
    isDraft: true,
  };
}

function maybeRetitleDraftContent(phase, oldTitle, nextTitle, content) {
  const config = PHASES[phase];
  const previous = config.template(oldTitle || config.draftTitle);
  if (String(content || "") !== previous) return content;
  return config.template(nextTitle || config.draftTitle);
}

function currentEditor(phase) {
  if (!state.editors[phase]) {
    state.editors[phase] = makeDraft(phase);
  }
  return state.editors[phase];
}

function setStatus(message, tone = "info") {
  state.status = String(message || "").trim();
  state.statusTone = tone;
  const line = $("statusLine");
  if (line) {
    line.textContent = state.status || "Ready.";
    line.dataset.tone = state.statusTone;
  }
}

async function apiJson(url, options = {}) {
  const init = { ...options };
  const method = String(init.method || "GET").trim().toUpperCase();
  init.headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || payload.message || response.statusText || "request_failed");
    }
    const data = payload.data || payload;
    if (method === "GET") rememberGetResponse(url, data);
    return data;
  } catch (err) {
    if (method === "GET" && isLikelyOfflineError(err)) {
      const cached = readCachedGet(url);
      if (cached) {
        state.status = `Offline cache active for ${url}`;
        state.statusTone = "info";
        return cached;
      }
    }
    throw err;
  }
}

async function refreshSummary() {
  try {
    const data = await apiJson("/api/door/files");
    state.capabilities.filesApi = true;
    state.summary = {};
    (data.phases || []).forEach((phase) => {
      state.summary[phase.key] = phase;
    });
  } catch (err) {
    state.capabilities.filesApi = false;
  }
}

function updateNav() {
  $$(".bn-btn").forEach((btn) => {
    const phase = btn.dataset.phase;
    const summary = state.summary[phase];
    btn.classList.toggle("active", phase === state.currentPhase);
    btn.setAttribute("data-count", String(summary?.count ?? state.filesByPhase[phase]?.length ?? 0));
  });
}

async function fetchPhaseFilesOnly(phase) {
  if (!state.capabilities.filesApi) {
    state.filesByPhase[phase] = [];
    updateNav();
    return [];
  }

  try {
    const data = await apiJson(`/api/door/files?phase=${encodeURIComponent(phase)}`);
    state.capabilities.filesApi = true;
    const files = Array.isArray(data.files) ? data.files : [];
    state.filesByPhase[phase] = files;
    if (data.phase) {
      state.summary[phase] = {
        ...data.phase,
        count: files.length,
      };
    }
    updateNav();
    return files;
  } catch (_err) {
    state.capabilities.filesApi = false;
    state.filesByPhase[phase] = [];
    updateNav();
    return [];
  }
}

function buildCandidateFromFile(file) {
  return {
    id: file.key || file.relative_path || file.name,
    selector: file.key || file.relative_path || file.name,
    title: String(file.title || file.name || "Untitled").trim(),
    description: String(file.excerpt || "").trim(),
    source: file.source || "1-Potential",
    fileKey: file.key || "",
    created_at: file.mtime || "",
  };
}

function mergeCandidates(hotItems, potentialFiles) {
  const out = [];
  const seen = new Set();

  const push = (entry) => {
    const titleKey = String(entry.title || "").trim().toLowerCase();
    const selectorKey = String(entry.selector || entry.id || "").trim();
    const key = selectorKey || titleKey;
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(entry);
  };

  hotItems.forEach((item) => {
    const title = String(item.title || item.idea || "").trim();
    if (!title) return;
    const matchedFile = potentialFiles.find((file) => {
      const fileTitle = String(file.title || file.name || "").trim().toLowerCase();
      return fileTitle === title.toLowerCase();
    });
    push({
      id: item.id || item.task_uuid || item.tw_uuid || item.hot_index || title,
      selector: item.id || item.task_uuid || item.tw_uuid || item.hot_index || title,
      title,
      description: String(item.description || matchedFile?.excerpt || "").trim(),
      source: item.source || "hotlist",
      status: item.status || "active",
      quadrant: item.quadrant || null,
      fileKey: matchedFile?.key || "",
      created_at: item.created_at || item.created || matchedFile?.mtime || "",
      task_uuid: item.task_uuid || item.tw_uuid || "",
    });
  });

  potentialFiles.forEach((file) => {
    push(buildCandidateFromFile(file));
  });

  return out.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

async function loadPotentialCandidates() {
  const [hotData, fileData] = await Promise.all([
    apiJson("/api/door/potential/hotlist?mode=active").catch(() => ({ items: [] })),
    apiJson("/api/door/files?phase=potential").catch(() => ({ files: [] })),
  ]);

  const hotItems = Array.isArray(hotData.items) ? hotData.items : [];
  const files = Array.isArray(fileData.files) ? fileData.files : [];
  state.filesByPhase.potential = files;
  if (fileData.phase) {
    state.summary.potential = { ...fileData.phase, count: files.length };
  }
  return mergeCandidates(hotItems, files);
}

async function loadOperationalPhase(phase) {
  switch (phase) {
    case "potential": {
      state.phaseData.potential.candidates = await loadPotentialCandidates();
      if (!state.capabilities.filesApi) {
        state.summary.potential = { ...(state.summary.potential || {}), count: state.phaseData.potential.candidates.length };
      }
      updateNav();
      return;
    }
    case "plan": {
      state.phaseData.plan.candidates = await loadPotentialCandidates();
      const [doorwarsData, sessionsData, warstacksData] = await Promise.all([
        apiJson("/api/door/plan/doorwars").catch(() => ({ doorwars: [] })),
        apiJson("/api/door/plan/warstack/sessions").catch(() => ({ sessions: [] })),
        apiJson("/api/door/plan/warstacks").catch(() => ({ warstacks: [] })),
      ]);
      state.phaseData.plan.recentDoorwars = Array.isArray(doorwarsData.doorwars) ? doorwarsData.doorwars.slice(0, 8) : [];
      state.phaseData.plan.activeSessions = Array.isArray(sessionsData.sessions) ? sessionsData.sessions : [];
      state.phaseData.plan.recentWarstacks = Array.isArray(warstacksData.warstacks) ? warstacksData.warstacks.slice(0, 5) : [];
      if (!state.phaseData.plan.doorwarResult && state.phaseData.plan.recentDoorwars[0]) {
        const recent = state.phaseData.plan.recentDoorwars[0];
        state.phaseData.plan.doorwarResult = {
          doorwar: recent,
          selected: {
            title: recent.selected_title,
            task_uuid: recent.selected_task_uuid,
            evaluation: {
              quadrant: recent.quadrant,
              reasoning: recent.reasoning,
            },
          },
        };
      }
      if (!state.phaseData.plan.warstackSession && state.phaseData.plan.activeSessions[0]) {
        state.phaseData.plan.warstackSession = {
          session_id: state.phaseData.plan.activeSessions[0].session_id,
          step: state.phaseData.plan.activeSessions[0].step,
          question: state.phaseData.plan.activeSessions[0].question,
          door_title: state.phaseData.plan.activeSessions[0].door_title,
        };
      }
      if (!state.capabilities.filesApi) {
        state.summary.plan = { ...(state.summary.plan || {}), count: state.phaseData.plan.recentDoorwars.length };
      }
      updateNav();
      return;
    }
    case "production": {
      const [hitsData, weekData] = await Promise.all([
        apiJson("/api/door/production/hits").catch(() => ({ hits: [] })),
        apiJson("/api/door/production/hits/week").catch(() => ({ summary: null })),
      ]);
      state.phaseData.production.hits = Array.isArray(hitsData.hits) ? hitsData.hits : [];
      state.phaseData.production.weekSummary = weekData.summary || null;
      if (!state.capabilities.filesApi) {
        state.summary.production = { ...(state.summary.production || {}), count: state.phaseData.production.hits.length };
      }
      return;
    }
    case "profit": {
      const [completedData, reflectionsData] = await Promise.all([
        apiJson("/api/door/profit/completed").catch(() => ({ completed: [] })),
        apiJson("/api/door/profit/reflections").catch(() => ({ reflections: [] })),
      ]);
      state.phaseData.profit.completed = Array.isArray(completedData.completed) ? completedData.completed : [];
      state.phaseData.profit.reflections = Array.isArray(reflectionsData.reflections) ? reflectionsData.reflections : [];
      if (!state.capabilities.filesApi) {
        state.summary.profit = { ...(state.summary.profit || {}), count: state.phaseData.profit.reflections.length };
      }
      return;
    }
    default:
      return;
  }
}

async function loadFile(phase, key, { render = true } = {}) {
  const data = await apiJson(`/api/door/files/read?phase=${encodeURIComponent(phase)}&key=${encodeURIComponent(key)}`);
  const file = data.file || {};
  state.editors[phase] = {
    key: file.key || "",
    name: file.name || "",
    title: String(file.title || "").trim() || deriveTitleFromName(file.name, PHASES[phase].draftTitle),
    content: String(file.content || ""),
    source: file.source || PHASES[phase].folder,
    relative_path: file.relative_path || "",
    mtime: file.mtime || "",
    size: Number(file.size || 0),
    isDraft: false,
  };
  if (render && state.currentPhase === phase) {
    renderPhase(phase);
  }
}

async function loadPhase(phase, { preferredKey = "" } = {}) {
  const files = await fetchPhaseFilesOnly(phase);
  if (!state.capabilities.filesApi) {
    if (!state.editors[phase]) state.editors[phase] = makeDraft(phase);
    renderPhase(phase);
    return;
  }
  const editor = state.editors[phase];
  const nextKey =
    preferredKey ||
    (editor && editor.key && files.some((file) => file.key === editor.key) ? editor.key : "") ||
    (files[0] ? files[0].key : "");

  if (nextKey) {
    await loadFile(phase, nextKey, { render: false });
  } else if (!editor || !editor.isDraft) {
    state.editors[phase] = makeDraft(phase);
  }

  renderPhase(phase);
}

async function refreshPhaseState(phase, { preferredKey = "" } = {}) {
  await refreshSummary();
  await loadOperationalPhase(phase);
  await loadPhase(phase, { preferredKey: preferredKey || currentEditor(phase).key });
}

function phaseSummaryLine(phase) {
  const config = PHASES[phase];
  const summary = state.summary[phase];
  const count = summary?.count ?? state.filesByPhase[phase]?.length ?? 0;
  if (!state.capabilities.filesApi) {
    return `${config.folder} · ops mode · ${count} item${count === 1 ? "" : "s"}`;
  }
  return `${config.folder} · ${count} file${count === 1 ? "" : "s"}`;
}

function renderFileList(files, activeKey) {
  if (!files.length) {
    return `
      <div class="empty-state">
        <p>No markdown files yet.</p>
        <span>Create a new file for this phase.</span>
      </div>
    `;
  }

  return files.map((file) => `
    <button class="file-card ${file.key === activeKey ? "is-active" : ""}" data-file-key="${escapeHtml(file.key)}" type="button">
      <div class="file-card-top">
        <span class="file-name">${escapeHtml(String(file.title || file.name || "").trim() || "Untitled")}</span>
        <span class="file-source">${escapeHtml(file.source)}</span>
      </div>
      <div class="file-excerpt">${escapeHtml(file.excerpt || "No preview available.")}</div>
      <div class="file-meta">
        <span>${escapeHtml(formatTime(file.mtime))}</span>
        <span>${escapeHtml(formatSize(file.size))}</span>
      </div>
    </button>
  `).join("");
}

function renderShell(phase, operationsHtml) {
  const config = PHASES[phase];
  const files = state.filesByPhase[phase] || [];
  const editor = currentEditor(phase);
  const metaLine = editor.isDraft
    ? `New draft in ${config.folder}`
    : `${editor.source} · ${formatTime(editor.mtime)} · ${formatSize(editor.size)}`;

  const fileShell = state.capabilities.filesApi ? `
    <section class="ctx-summary">
      <div class="phase-intro">
        <div class="phase-kicker">${escapeHtml(config.subtitle)}</div>
        <p>${escapeHtml(config.intro)}</p>
      </div>
      <div class="phase-banner">
        <strong>${escapeHtml(phaseSummaryLine(phase))}</strong>
        <span>${escapeHtml(phaseBannerText(phase))}</span>
      </div>
      <div class="status-line" id="statusLine" data-tone="${escapeHtml(state.statusTone)}">
        ${escapeHtml(state.status || "Ready.")}
      </div>
    </section>

    ${operationsHtml}

    <section class="ctx-shell">
      <aside class="file-panel">
        <div class="panel-head">
          <div>
            <div class="panel-eyebrow">${escapeHtml(config.label)}</div>
            <h2>Files</h2>
          </div>
          <div class="panel-actions">
            <button class="btn btn-ghost" id="refreshPhaseBtn" type="button">Refresh</button>
            <button class="btn btn-primary" id="newFileBtn" type="button">New</button>
          </div>
        </div>
        <div class="file-list" id="fileList">
          ${renderFileList(files, editor.key)}
        </div>
      </aside>

      <section class="editor-panel">
        <div class="panel-head">
          <div>
            <div class="panel-eyebrow">${escapeHtml(config.folder)}</div>
            <h2>${escapeHtml(editor.isDraft ? "New File" : editor.title || editor.name || config.draftTitle)}</h2>
            <p class="editor-meta">${escapeHtml(metaLine)}</p>
          </div>
          <div class="panel-actions">
            <button class="btn btn-ghost" id="deleteFileBtn" type="button" ${editor.isDraft ? "disabled" : ""}>Delete</button>
            <button class="btn btn-primary" id="saveFileBtn" type="button">Save</button>
          </div>
        </div>

        <label class="field-label" for="editorTitle">Title</label>
        <input class="text-input" id="editorTitle" type="text" value="${escapeHtml(editor.title)}" placeholder="File title" />

        <label class="field-label" for="editorContent">Markdown</label>
        <textarea class="editor-textarea" id="editorContent" spellcheck="false">${escapeHtml(editor.content)}</textarea>
      </section>
    </section>
  ` : `
    <section class="ctx-summary">
      <div class="phase-intro">
        <div class="phase-kicker">${escapeHtml(config.subtitle)}</div>
        <p>${escapeHtml(config.intro)}</p>
      </div>
      <div class="phase-banner">
        <strong>${escapeHtml(phaseSummaryLine(phase))}</strong>
        <span>${escapeHtml(phaseBannerText(phase))}</span>
      </div>
      <div class="status-line" id="statusLine" data-tone="${escapeHtml(state.statusTone)}">
        ${escapeHtml(state.status || "Ready.")}
      </div>
      <div class="phase-banner">
        <strong>Files API unavailable</strong>
        <span>Phase operations stay usable. File browser/editor needs the newer Door backend on HQ.</span>
      </div>
    </section>

    ${operationsHtml}
  `;

  return fileShell;
}

function phaseBannerText(phase) {
  switch (phase) {
    case "potential":
      return "Capture into Hot List and keep the markdown trail visible.";
    case "plan":
      return "Run Door War, then step through the War Stack inquiry.";
    case "production":
      return "Production is the Hit List only. War Stack lives in Plan.";
    case "profit":
      return "Review completed Doors and save reflections.";
    default:
      return "";
  }
}

function renderPill(text, tone = "") {
  return `<span class="pill ${tone ? `pill-${tone}` : ""}">${escapeHtml(text)}</span>`;
}

function renderPotentialOps() {
  const phaseState = state.phaseData.potential;
  const items = phaseState.candidates || [];
  const listHtml = items.length
    ? items.map((item) => `
        <article class="record-card">
          <div class="record-top">
            <div>
              <h3>${escapeHtml(item.title || "Untitled")}</h3>
              <div class="record-pills">
                ${renderPill(item.source || "potential")}
                ${item.fileKey ? renderPill("file", "accent") : ""}
              </div>
            </div>
            <div class="record-actions">
              ${item.fileKey ? `<button class="btn btn-ghost" type="button" data-open-potential="${escapeHtml(item.fileKey)}">Open</button>` : ""}
              <button class="btn btn-ghost btn-danger" type="button" data-delete-potential="${escapeHtml(item.fileKey || item.selector || item.id)}">Delete</button>
            </div>
          </div>
          <div class="record-body">${escapeHtml(item.description || "No notes yet.")}</div>
          <div class="record-meta">${escapeHtml(formatTime(item.created_at))}</div>
        </article>
      `).join("")
    : `<div class="empty-state compact"><p>No active Hot List entries.</p><span>Add one on the left.</span></div>`;

  return `
    <section class="phase-ops two-col">
      <article class="op-panel">
        <div class="panel-head compact-head">
          <div>
            <div class="panel-eyebrow">Potential</div>
            <h2>Quick Capture</h2>
            <p>One idea per line. This writes through the canonical Hot List API.</p>
          </div>
        </div>
        <textarea class="compact-textarea" id="hotInput" placeholder="One idea per line ...">${escapeHtml(phaseState.draftText || "")}</textarea>
        <div class="panel-actions left-actions">
          <button class="btn btn-primary" id="hotAddBtn" type="button">Add to Hot List</button>
          <button class="btn btn-ghost" id="hotClearBtn" type="button">Clear</button>
        </div>
      </article>

      <article class="op-panel">
        <div class="panel-head compact-head">
          <div>
            <div class="panel-eyebrow">Potential</div>
            <h2>Active Hot List</h2>
            <p>${escapeHtml(`${items.length} active entr${items.length === 1 ? "y" : "ies"}`)}</p>
          </div>
        </div>
        <div class="record-list">${listHtml}</div>
      </article>
    </section>
  `;
}

function renderPlanOps() {
  const phaseState = state.phaseData.plan;
  const candidates = phaseState.candidates || [];
  const result = phaseState.doorwarResult;
  const session = phaseState.warstackSession;
  const doorwars = phaseState.recentDoorwars || [];
  const activeSessions = phaseState.activeSessions || [];
  const warstacks = phaseState.recentWarstacks || [];

  const candidateHtml = candidates.length
    ? candidates.map((item) => `
        <article class="record-card selectable ${phaseState.selectedDoorTitle === item.title ? "is-selected" : ""}">
          <div class="record-top">
            <div>
              <h3>${escapeHtml(item.title || "Untitled")}</h3>
              <div class="record-pills">
                ${renderPill(item.source || "potential")}
                ${item.quadrant ? renderPill(`Q${item.quadrant}`, "accent") : ""}
              </div>
            </div>
            <div class="record-actions">
              <button class="btn btn-ghost" type="button" data-select-door="${escapeHtml(item.title)}">Select</button>
              <button class="btn btn-primary" type="button" data-run-doorwar="${escapeHtml(item.title)}">Door War</button>
            </div>
          </div>
          <div class="record-body">${escapeHtml(item.description || "No notes yet.")}</div>
        </article>
      `).join("")
    : `<div class="empty-state compact"><p>No candidates available.</p><span>Potential is empty or not synced yet. You can still start a War Stack manually.</span></div>`;

  const resultHtml = result
    ? `
      <article class="record-card emphasis">
        <div class="record-top">
          <div>
            <h3>${escapeHtml(result.selected?.title || result.selected?.selected_title || phaseState.selectedDoorTitle || "Selected Door")}</h3>
            <div class="record-pills">
              ${result.selected?.evaluation?.quadrant ? renderPill(`Q${result.selected.evaluation.quadrant}`, "accent") : ""}
              ${result.selected?.task_uuid ? renderPill("task linked") : ""}
            </div>
          </div>
        </div>
        <div class="record-body">${escapeHtml(result.doorwar?.reasoning || result.selected?.evaluation?.reasoning || "No reasoning saved.")}</div>
        <div class="record-meta">${escapeHtml(formatTime(result.doorwar?.created_at || new Date().toISOString()))}</div>
      </article>
    `
    : `<div class="empty-state compact"><p>No Door War result yet.</p><span>Select a candidate and run Door War.</span></div>`;

  const sessionHtml = session
    ? `
      <div class="question-card">
        <div class="panel-eyebrow">War Stack Inquiry</div>
        <h3>${escapeHtml(session.door_title || phaseState.selectedDoorTitle || "Untitled Door")}</h3>
        <p class="question-text">${escapeHtml(session.question || "Continue the inquiry.")}</p>
        <textarea class="compact-textarea" id="warstackAnswer" placeholder="Your answer ...">${escapeHtml(phaseState.warstackAnswer || "")}</textarea>
        <div class="panel-actions left-actions">
          <button class="btn btn-primary" id="warstackAnswerBtn" type="button">Submit Answer</button>
          <button class="btn btn-ghost" id="warstackCancelBtn" type="button">Reset</button>
        </div>
      </div>
    `
    : `
      <div class="question-card">
        <div class="panel-eyebrow">War Stack</div>
        <h3>Start Inquiry</h3>
        <p class="question-text">Use the selected Door or type a title manually.</p>
        <input class="text-input" id="warstackTitle" type="text" value="${escapeHtml(phaseState.selectedDoorTitle || "")}" placeholder="Door title" />
        <div class="panel-actions left-actions">
          <button class="btn btn-primary" id="warstackStartBtn" type="button">Start War Stack</button>
        </div>
      </div>
    `;

  const latestHtml = phaseState.latestWarstack
    ? `
      <article class="record-card emphasis">
        <div class="record-top">
          <div>
            <h3>${escapeHtml(phaseState.latestWarstack.door_title || "War Stack")}</h3>
            <div class="record-pills">
              ${renderPill(phaseState.latestWarstack.week || "week")}
              ${renderPill(`${(phaseState.latestWarstack.hits || []).length} hits`, "accent")}
            </div>
          </div>
        </div>
        <div class="record-body">${(phaseState.latestWarstack.hits || []).map((hit, index) => `<div class="mini-hit"><strong>Hit ${index + 1}:</strong> ${escapeHtml(hit.fact || hit.strike || "-")}</div>`).join("")}</div>
      </article>
    `
    : "";

  const recentHtml = warstacks.length
    ? warstacks.map((warstack) => `
        <article class="record-card compact-card">
          <div class="record-top">
            <div>
              <h3>${escapeHtml(warstack.door_title || "Untitled Door")}</h3>
              <div class="record-pills">
                ${renderPill(warstack.week || "week")}
                ${renderPill(`${(warstack.hits || []).length} hits`, "accent")}
              </div>
            </div>
          </div>
          <div class="record-meta">${escapeHtml(formatTime(warstack.created_at))}</div>
        </article>
      `).join("")
    : `<div class="empty-state compact"><p>No recent War Stacks.</p><span>Start one here after Door War.</span></div>`;

  const doorwarHistoryHtml = doorwars.length
    ? doorwars.map((doorwar) => `
        <article class="record-card compact-card">
          <div class="record-top">
            <div>
              <h3>${escapeHtml(doorwar.selected_title || "Untitled Door")}</h3>
              <div class="record-pills">
                ${doorwar.quadrant ? renderPill(`Q${doorwar.quadrant}`, "accent") : ""}
                ${renderPill(`${doorwar.evaluated_count || 0} candidates`)}
              </div>
            </div>
            <div class="record-actions">
              <button class="btn btn-ghost" type="button" data-use-doorwar="${escapeHtml(doorwar.selected_title || "")}">Use</button>
            </div>
          </div>
          <div class="record-body">${escapeHtml(doorwar.reasoning || "No reasoning saved.")}</div>
          <div class="record-meta">${escapeHtml(formatTime(doorwar.created_at))}</div>
        </article>
      `).join("")
    : `<div class="empty-state compact"><p>No recent Door Wars.</p><span>Run Door War on a Hot List candidate.</span></div>`;

  const activeSessionHtml = activeSessions.length
    ? activeSessions.map((entry) => `
        <article class="record-card compact-card ${session?.session_id === entry.session_id ? "is-selected" : ""}">
          <div class="record-top">
            <div>
              <h3>${escapeHtml(entry.door_title || "Untitled Door")}</h3>
              <div class="record-pills">
                ${entry.step ? renderPill(entry.step, "accent") : ""}
                ${renderPill(`${entry.answered_count || 0} answered`)}
              </div>
            </div>
            <div class="record-actions">
              <button class="btn btn-primary" type="button" data-resume-warstack="${escapeHtml(entry.session_id)}">Resume</button>
            </div>
          </div>
          <div class="record-body">${escapeHtml(entry.question || "Continue the inquiry.")}</div>
          <div class="record-meta">${escapeHtml(formatTime(entry.updated_at || entry.created_at))}</div>
        </article>
      `).join("")
    : `<div class="empty-state compact"><p>No active War Stack sessions.</p><span>Start one after Door War.</span></div>`;

  return `
    <section class="phase-ops two-col">
      <article class="op-panel">
        <div class="panel-head compact-head">
          <div>
            <div class="panel-eyebrow">Plan</div>
            <h2>Door War</h2>
            <p>Door War is the Eisenhower pass over Potential. Pick a candidate, add reasoning, then continue into the War Stack.</p>
          </div>
        </div>
        <label class="field-label" for="doorWarReasoning">Reasoning</label>
        <textarea class="compact-textarea" id="doorWarReasoning" placeholder="Why does this Door win right now?">${escapeHtml(phaseState.reasoning || "")}</textarea>
        <div class="record-list tight-list">${candidateHtml}</div>
      </article>

      <article class="op-panel">
        <div class="panel-head compact-head">
          <div>
            <div class="panel-eyebrow">Plan</div>
            <h2>Selected Door</h2>
            <p>Door War result and War Stack inquiry.</p>
          </div>
        </div>
        ${resultHtml}
        ${sessionHtml}
        ${latestHtml}
        <div class="panel-subsection">
          <div class="panel-eyebrow">Active Sessions</div>
          <div class="record-list tight-list">${activeSessionHtml}</div>
        </div>
        <div class="panel-subsection">
          <div class="panel-eyebrow">Recent Door Wars</div>
          <div class="record-list tight-list">${doorwarHistoryHtml}</div>
        </div>
        <div class="panel-subsection">
          <div class="panel-eyebrow">Recent War Stacks</div>
          <div class="record-list tight-list">${recentHtml}</div>
        </div>
      </article>
    </section>
  `;
}

function renderProductionOps() {
  const phaseState = state.phaseData.production;
  const summary = phaseState.weekSummary || { week: todayKey(), total_hits: 0, completed_hits: 0, open_hits: 0, completion_rate: 0 };
  const hits = phaseState.hits || [];

  const hitsHtml = hits.length
    ? hits.map((hit) => `
        <article class="record-card ${hit.done ? "is-done" : ""}">
          <div class="record-top">
            <div>
              <h3>${escapeHtml(hit.fact || hit.strike || "Untitled Hit")}</h3>
              <div class="record-pills">
                ${renderPill(hit.door_title || "door")}
                ${renderPill(hit.done ? "done" : "open", hit.done ? "ok" : "")}
              </div>
            </div>
            <div class="record-actions">
              <button class="btn ${hit.done ? "btn-ghost" : "btn-primary"}" type="button" data-toggle-hit="${escapeHtml(hit.id)}">${hit.done ? "Reopen" : "Done"}</button>
            </div>
          </div>
          <div class="record-body">
            <div><strong>Obstacle:</strong> ${escapeHtml(hit.obstacle || "-")}</div>
            <div><strong>Strike:</strong> ${escapeHtml(hit.strike || "-")}</div>
            <div><strong>Responsibility:</strong> ${escapeHtml(hit.responsibility || "-")}</div>
          </div>
        </article>
      `).join("")
    : `<div class="empty-state compact"><p>No hits for the current week.</p><span>Create a War Stack in Plan first.</span></div>`;

  return `
    <section class="phase-ops">
      <article class="op-panel">
        <div class="panel-head compact-head">
          <div>
            <div class="panel-eyebrow">Production</div>
            <h2>Weekly Hit List</h2>
            <p>Door stays strategic. The Hit List here is the handoff toward the Daily Fire Map.</p>
          </div>
        </div>
        <div class="stats-grid four-stats">
          <div class="stat-card"><span>Total</span><strong>${escapeHtml(String(summary.total_hits || 0))}</strong></div>
          <div class="stat-card"><span>Done</span><strong>${escapeHtml(String(summary.completed_hits || 0))}</strong></div>
          <div class="stat-card"><span>Open</span><strong>${escapeHtml(String(summary.open_hits || 0))}</strong></div>
          <div class="stat-card"><span>Rate</span><strong>${escapeHtml(`${Math.round(Number(summary.completion_rate || 0) * 100)}%`)}</strong></div>
        </div>
        <div class="record-list">${hitsHtml}</div>
      </article>
    </section>
  `;
}

function renderProfitOps() {
  const phaseState = state.phaseData.profit;
  const form = phaseState.form;
  const completed = phaseState.completed || [];
  const reflections = phaseState.reflections || [];

  const completedHtml = completed.length
    ? completed.map((item) => `
        <article class="record-card compact-card ${form.door_title === item.door_title ? "is-selected" : ""}">
          <div class="record-top">
            <div>
              <h3>${escapeHtml(item.door_title || "Untitled Door")}</h3>
              <div class="record-pills">
                ${renderPill(item.week || "week")}
                ${renderPill(`${item.hit_count || 0} hits`, "accent")}
              </div>
            </div>
            <div class="record-actions">
              <button class="btn btn-ghost" type="button" data-use-completed-door="${escapeHtml(item.door_title || "")}">Use</button>
            </div>
          </div>
          <div class="record-meta">Completed: ${escapeHtml(formatTime(item.completed_at || item.created_at))}</div>
        </article>
      `).join("")
    : `<div class="empty-state compact"><p>No completed Doors yet.</p><span>Finish all hits for a War Stack to move it into review.</span></div>`;

  const reflectionsHtml = reflections.length
    ? reflections.map((item) => `
        <article class="record-card compact-card">
          <div class="record-top">
            <div>
              <h3>${escapeHtml(item.name || "Reflection")}</h3>
            </div>
          </div>
          <div class="record-meta">${escapeHtml(formatTime(item.mtime))} · ${escapeHtml(formatSize(item.size))}</div>
        </article>
      `).join("")
    : `<div class="empty-state compact"><p>No reflection files yet.</p><span>Save a Profit reflection on the left.</span></div>`;

  return `
    <section class="phase-ops two-col">
      <article class="op-panel">
        <div class="panel-head compact-head">
          <div>
            <div class="panel-eyebrow">Profit</div>
            <h2>Reflection Writer</h2>
            <p>Capture review, wins, lessons, and next actions into Door/4-Profit.</p>
          </div>
        </div>
        <label class="field-label" for="reflectionDoorTitle">Door</label>
        <input class="text-input" id="reflectionDoorTitle" type="text" value="${escapeHtml(form.door_title || "")}" placeholder="Door title" />
        <label class="field-label" for="reflectionText">Reflection</label>
        <textarea class="compact-textarea" id="reflectionText" placeholder="What happened?">${escapeHtml(form.reflection || "")}</textarea>
        <div class="input-grid three-col">
          <div>
            <label class="field-label" for="reflectionWins">Wins</label>
            <textarea class="compact-textarea small-textarea" id="reflectionWins" placeholder="One per line">${escapeHtml(form.wins || "")}</textarea>
          </div>
          <div>
            <label class="field-label" for="reflectionLessons">Lessons</label>
            <textarea class="compact-textarea small-textarea" id="reflectionLessons" placeholder="One per line">${escapeHtml(form.lessons || "")}</textarea>
          </div>
          <div>
            <label class="field-label" for="reflectionNext">Next</label>
            <textarea class="compact-textarea small-textarea" id="reflectionNext" placeholder="One per line">${escapeHtml(form.next || "")}</textarea>
          </div>
        </div>
        <div class="panel-actions left-actions">
          <button class="btn btn-primary" id="saveReflectionBtn" type="button">Save Reflection</button>
          <button class="btn btn-ghost" id="clearReflectionBtn" type="button">Clear</button>
        </div>
      </article>

      <article class="op-panel">
        <div class="panel-head compact-head">
          <div>
            <div class="panel-eyebrow">Profit</div>
            <h2>Completed + Reflections</h2>
            <p>Completed Doors can seed the reflection form.</p>
          </div>
        </div>
        <div class="panel-subsection">
          <div class="panel-eyebrow">Completed Doors</div>
          <div class="record-list tight-list">${completedHtml}</div>
        </div>
        <div class="panel-subsection">
          <div class="panel-eyebrow">Reflection Files</div>
          <div class="record-list tight-list">${reflectionsHtml}</div>
        </div>
      </article>
    </section>
  `;
}

function renderPhase(phase) {
  const root = $("content");
  let operationsHtml = "";

  if (phase === "potential") operationsHtml = renderPotentialOps();
  if (phase === "plan") operationsHtml = renderPlanOps();
  if (phase === "production") operationsHtml = renderProductionOps();
  if (phase === "profit") operationsHtml = renderProfitOps();

  root.innerHTML = renderShell(phase, operationsHtml);
  bindPhaseInteractions(phase);
  bindFileEditorInteractions(phase);
}

function bindFileEditorInteractions(phase) {
  if (!state.capabilities.filesApi) return;
  const config = PHASES[phase];

  $("refreshPhaseBtn")?.addEventListener("click", async () => {
    setStatus(`Refreshing ${config.folder} ...`, "info");
    try {
      await refreshPhaseState(phase, { preferredKey: currentEditor(phase).key });
      setStatus(`Loaded ${phaseSummaryLine(phase)}.`, "ok");
    } catch (err) {
      setStatus(`Refresh failed: ${err.message}`, "error");
    }
  });

  $("newFileBtn")?.addEventListener("click", () => {
    state.editors[phase] = makeDraft(phase);
    renderPhase(phase);
    setStatus(`New draft opened for ${config.folder}.`, "info");
  });

  document.querySelectorAll("[data-file-key]").forEach((button) => {
    button.addEventListener("click", async () => {
      const key = button.getAttribute("data-file-key") || "";
      if (!key) return;
      try {
        setStatus(`Opening ${button.textContent.trim()} ...`, "info");
        await loadFile(phase, key);
        setStatus(`Opened file from ${config.folder}.`, "ok");
      } catch (err) {
        setStatus(`Open failed: ${err.message}`, "error");
      }
    });
  });

  $("editorTitle")?.addEventListener("input", (event) => {
    const active = currentEditor(phase);
    const nextTitle = event.target.value;
    if (active.isDraft) {
      active.content = maybeRetitleDraftContent(phase, active.title, nextTitle, active.content);
      $("editorContent").value = active.content;
    }
    active.title = nextTitle;
  });

  $("editorContent")?.addEventListener("input", (event) => {
    currentEditor(phase).content = event.target.value;
  });

  $("saveFileBtn")?.addEventListener("click", async () => {
    const active = currentEditor(phase);
    const title = String(active.title || "").trim();
    if (!title) {
      setStatus("Title is required before saving.", "error");
      $("editorTitle")?.focus();
      return;
    }
    try {
      setStatus(`Saving ${config.folder} ...`, "info");
      const data = await apiJson("/api/door/files/write", {
        method: "POST",
        body: JSON.stringify({
          phase,
          key: active.key,
          title,
          content: active.content,
        }),
      });
      await refreshPhaseState(phase, { preferredKey: data.file?.key || "" });
      setStatus(`Saved ${data.file?.name || "file"} to ${config.folder}.`, "ok");
    } catch (err) {
      setStatus(`Save failed: ${err.message}`, "error");
    }
  });

  $("deleteFileBtn")?.addEventListener("click", async () => {
    const active = currentEditor(phase);
    if (!active.key) return;
    if (!window.confirm(`Delete ${active.name || active.title}?`)) return;
    try {
      setStatus(`Deleting ${active.name || active.title} ...`, "info");
      await apiJson("/api/door/files/delete", {
        method: "POST",
        body: JSON.stringify({
          phase,
          key: active.key,
        }),
      });
      state.editors[phase] = makeDraft(phase);
      await refreshPhaseState(phase);
      setStatus(`Deleted file from ${config.folder}.`, "ok");
    } catch (err) {
      setStatus(`Delete failed: ${err.message}`, "error");
    }
  });
}

function bindPhaseInteractions(phase) {
  if (phase === "potential") bindPotentialInteractions();
  if (phase === "plan") bindPlanInteractions();
  if (phase === "production") bindProductionInteractions();
  if (phase === "profit") bindProfitInteractions();
}

function bindPotentialInteractions() {
  const phaseState = state.phaseData.potential;

  $("hotInput")?.addEventListener("input", (event) => {
    phaseState.draftText = event.target.value;
  });

  $("hotAddBtn")?.addEventListener("click", async () => {
    const raw = String(phaseState.draftText || "").trim();
    if (!raw) {
      setStatus("Enter at least one idea first.", "error");
      $("hotInput")?.focus();
      return;
    }

    try {
      setStatus("Adding Hot List entries ...", "info");
      await apiJson("/api/door/potential/hotlist", {
        method: "POST",
        body: JSON.stringify({ text: raw, source: "door-pwa" }),
      });
      phaseState.draftText = "";
      await refreshPhaseState("potential");
      setStatus("Hot List updated.", "ok");
    } catch (err) {
      setStatus(`Add failed: ${err.message}`, "error");
    }
  });

  $("hotClearBtn")?.addEventListener("click", () => {
    phaseState.draftText = "";
    renderPhase("potential");
    setStatus("Input cleared.", "info");
  });

  document.querySelectorAll("[data-open-potential]").forEach((button) => {
    button.addEventListener("click", async () => {
      const key = button.getAttribute("data-open-potential") || "";
      if (!key) return;
      try {
        await loadFile("potential", key);
        setStatus("Potential file opened.", "ok");
      } catch (err) {
        setStatus(`Open failed: ${err.message}`, "error");
      }
    });
  });

  document.querySelectorAll("[data-delete-potential]").forEach((button) => {
    button.addEventListener("click", async () => {
      const selector = button.getAttribute("data-delete-potential") || "";
      if (!selector) return;
      if (!window.confirm("Delete this Hot List entry?")) return;
      try {
        setStatus("Deleting Hot List entry ...", "info");
        if (selector.includes(":")) {
          await apiJson("/api/door/files/delete", {
            method: "POST",
            body: JSON.stringify({ phase: "potential", key: selector }),
          });
        } else {
          await apiJson(`/api/door/potential/hotlist/${encodeURIComponent(selector)}`, { method: "DELETE" });
        }
        await refreshPhaseState("potential");
        setStatus("Hot List entry deleted.", "ok");
      } catch (err) {
        setStatus(`Delete failed: ${err.message}`, "error");
      }
    });
  });
}

function bindPlanInteractions() {
  const phaseState = state.phaseData.plan;

  $("doorWarReasoning")?.addEventListener("input", (event) => {
    phaseState.reasoning = event.target.value;
  });

  $("warstackTitle")?.addEventListener("input", (event) => {
    phaseState.selectedDoorTitle = event.target.value;
  });

  $("warstackAnswer")?.addEventListener("input", (event) => {
    phaseState.warstackAnswer = event.target.value;
  });

  document.querySelectorAll("[data-select-door]").forEach((button) => {
    button.addEventListener("click", () => {
      phaseState.selectedDoorTitle = button.getAttribute("data-select-door") || "";
      renderPhase("plan");
      setStatus(`Selected Door: ${phaseState.selectedDoorTitle}`, "info");
    });
  });

  document.querySelectorAll("[data-use-doorwar]").forEach((button) => {
    button.addEventListener("click", () => {
      phaseState.selectedDoorTitle = button.getAttribute("data-use-doorwar") || "";
      renderPhase("plan");
      setStatus(`Using Door: ${phaseState.selectedDoorTitle}`, "info");
    });
  });

  document.querySelectorAll("[data-run-doorwar]").forEach((button) => {
    button.addEventListener("click", async () => {
      const title = button.getAttribute("data-run-doorwar") || phaseState.selectedDoorTitle || "";
      if (!title) {
        setStatus("Select a candidate first.", "error");
        return;
      }
      try {
        setStatus("Running Door War ...", "info");
        const data = await apiJson("/api/door/plan/doorwar", {
        method: "POST",
        body: JSON.stringify({ title, reasoning: phaseState.reasoning || "" }),
      });
      phaseState.selectedDoorTitle = data.selected?.title || title;
      phaseState.doorwarResult = data;
      phaseState.latestWarstack = null;
      phaseState.warstackSession = null;
      await refreshSummary();
      await loadOperationalPhase("plan");
      renderPhase("plan");
        setStatus(`Door War selected ${phaseState.selectedDoorTitle}.`, "ok");
      } catch (err) {
        setStatus(`Door War failed: ${err.message}`, "error");
      }
    });
  });

  $("warstackStartBtn")?.addEventListener("click", async () => {
    const doorTitle = String(phaseState.selectedDoorTitle || "").trim();
    const selectedTaskUuid = String(phaseState.doorwarResult?.selected?.task_uuid || "").trim();
    const selectedId = String(phaseState.doorwarResult?.selected?.id || "").trim();
    if (!doorTitle) {
      setStatus("Door title required before starting War Stack.", "error");
      $("warstackTitle")?.focus();
      return;
    }
    try {
      setStatus("Starting War Stack inquiry ...", "info");
      const data = await apiJson("/api/door/plan/warstack/start", {
        method: "POST",
        body: JSON.stringify({
          door_title: doorTitle,
          selected_id: selectedId,
          selected_task_uuid: selectedTaskUuid,
        }),
      });
      phaseState.warstackSession = {
        session_id: data.session_id,
        step: data.step,
        question: data.question,
        door_title: doorTitle,
      };
      phaseState.warstackAnswer = "";
      await loadOperationalPhase("plan");
      renderPhase("plan");
      setStatus("War Stack inquiry started.", "ok");
    } catch (err) {
      setStatus(`War Stack start failed: ${err.message}`, "error");
    }
  });

  $("warstackAnswerBtn")?.addEventListener("click", async () => {
    const session = phaseState.warstackSession;
    const answer = String(phaseState.warstackAnswer || "").trim();
    if (!session?.session_id) {
      setStatus("No active War Stack session.", "error");
      return;
    }
    if (!answer) {
      setStatus("Answer required.", "error");
      $("warstackAnswer")?.focus();
      return;
    }
    try {
      setStatus("Submitting answer ...", "info");
      const data = await apiJson("/api/door/plan/warstack/answer", {
        method: "POST",
        body: JSON.stringify({
          session_id: session.session_id,
          step: session.step,
          answer,
        }),
      });

      if (data.done && data.warstack) {
        phaseState.latestWarstack = data.warstack;
        phaseState.warstackSession = null;
        phaseState.warstackAnswer = "";
        await refreshSummary();
        await Promise.all([
          loadOperationalPhase("plan"),
          loadOperationalPhase("production"),
        ]);
        if (state.currentPhase === "production") {
          await loadPhase("production");
        } else {
          await loadPhase("plan");
        }
        setStatus(`War Stack created for ${data.warstack.door_title}.`, "ok");
        return;
      }

      phaseState.warstackSession = {
        ...phaseState.warstackSession,
        step: data.step,
        question: data.question,
      };
      phaseState.warstackAnswer = "";
      await loadOperationalPhase("plan");
      renderPhase("plan");
      setStatus(`Next question: ${data.step}`, "ok");
    } catch (err) {
      setStatus(`War Stack answer failed: ${err.message}`, "error");
    }
  });

  document.querySelectorAll("[data-resume-warstack]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-resume-warstack") || "";
      const resumed = phaseState.activeSessions.find((entry) => entry.session_id === id);
      if (!resumed) {
        setStatus("Session not found.", "error");
        return;
      }
      phaseState.warstackSession = {
        session_id: resumed.session_id,
        step: resumed.step,
        question: resumed.question,
        door_title: resumed.door_title,
      };
      phaseState.selectedDoorTitle = resumed.door_title || phaseState.selectedDoorTitle;
      phaseState.warstackAnswer = "";
      renderPhase("plan");
      setStatus(`Resumed War Stack for ${phaseState.selectedDoorTitle}.`, "ok");
    });
  });

  $("warstackCancelBtn")?.addEventListener("click", () => {
    phaseState.warstackSession = null;
    phaseState.warstackAnswer = "";
    renderPhase("plan");
    setStatus("War Stack session reset locally.", "info");
  });
}

function bindProductionInteractions() {
  document.querySelectorAll("[data-toggle-hit]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.getAttribute("data-toggle-hit") || "";
      if (!id) return;
      try {
        setStatus("Updating hit ...", "info");
        await apiJson(`/api/door/production/hits/${encodeURIComponent(id)}/toggle`, { method: "POST" });
        await refreshPhaseState("production");
        setStatus("Hit updated.", "ok");
      } catch (err) {
        setStatus(`Hit update failed: ${err.message}`, "error");
      }
    });
  });
}

function bindProfitInteractions() {
  const phaseState = state.phaseData.profit;
  const form = phaseState.form;

  $("reflectionDoorTitle")?.addEventListener("input", (event) => {
    form.door_title = event.target.value;
  });
  $("reflectionText")?.addEventListener("input", (event) => {
    form.reflection = event.target.value;
  });
  $("reflectionWins")?.addEventListener("input", (event) => {
    form.wins = event.target.value;
  });
  $("reflectionLessons")?.addEventListener("input", (event) => {
    form.lessons = event.target.value;
  });
  $("reflectionNext")?.addEventListener("input", (event) => {
    form.next = event.target.value;
  });

  document.querySelectorAll("[data-use-completed-door]").forEach((button) => {
    button.addEventListener("click", () => {
      form.door_title = button.getAttribute("data-use-completed-door") || "";
      renderPhase("profit");
      setStatus(`Reflection seeded with ${form.door_title}.`, "info");
    });
  });

  $("clearReflectionBtn")?.addEventListener("click", () => {
    phaseState.form = {
      door_title: "",
      reflection: "",
      wins: "",
      lessons: "",
      next: "",
    };
    renderPhase("profit");
    setStatus("Reflection form cleared.", "info");
  });

  $("saveReflectionBtn")?.addEventListener("click", async () => {
    const reflection = String(form.reflection || "").trim();
    const doorTitle = String(form.door_title || "").trim();
    if (!reflection && !doorTitle) {
      setStatus("Reflection text or door title required.", "error");
      $("reflectionText")?.focus();
      return;
    }

    const lines = (value) => String(value || "").split("\n").map((entry) => entry.trim()).filter(Boolean);

    try {
      setStatus("Saving reflection ...", "info");
      await apiJson("/api/door/profit/reflection", {
        method: "POST",
        body: JSON.stringify({
          door_title: doorTitle,
          reflection,
          wins: lines(form.wins),
          lessons: lines(form.lessons),
          next: lines(form.next),
        }),
      });
      phaseState.form = {
        door_title: doorTitle,
        reflection: "",
        wins: "",
        lessons: "",
        next: "",
      };
      await refreshPhaseState("profit");
      setStatus("Reflection saved.", "ok");
    } catch (err) {
      setStatus(`Reflection save failed: ${err.message}`, "error");
    }
  });
}

async function switchPhase(phase) {
  if (!PHASES[phase]) return;
  if (APP_CONFIG.lockedPhase && phase !== APP_CONFIG.lockedPhase) return;
  state.currentPhase = phase;
  $("appPhase").textContent = `${PHASES[phase].label} · ${PHASES[phase].folder}`;
  updateNav();
  $("content").innerHTML = `
    <section class="ctx-loading">
      <div class="phase-intro">
        <div class="phase-kicker">${escapeHtml(PHASES[phase].subtitle)}</div>
        <p>Loading ${escapeHtml(PHASES[phase].folder)} ...</p>
      </div>
    </section>
  `;
  try {
    await loadOperationalPhase(phase);
    await loadPhase(phase);
  } catch (err) {
    $("content").innerHTML = `
      <section class="ctx-loading">
        <div class="phase-intro">
          <div class="phase-kicker">Load failed</div>
          <p>${escapeHtml(err.message)}</p>
        </div>
      </section>
    `;
    setStatus(`Phase load failed: ${err.message}`, "error");
  }
}

$$(".bn-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const phase = btn.dataset.phase;
    switchPhase(phase);
  });
});

(async function boot() {
  const title = document.querySelector(".app-title");
  state.currentPhase = APP_CONFIG.initialPhase;
  if (title) title.textContent = APP_CONFIG.appTitle;
  document.title = `αOS · ${APP_CONFIG.appTitle}`;
  if (APP_CONFIG.lockedPhase) {
    document.body.dataset.lockedPhase = APP_CONFIG.lockedPhase;
    document.body.classList.add("single-phase");
  }
  await refreshSummary();
  updateNav();
  await switchPhase(state.currentPhase);
})();
