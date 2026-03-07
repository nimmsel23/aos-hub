"use strict";

const STORAGE = {
  selectedDoorTitle: "aos-door-plan-selected-v2",
  reasoning: "aos-door-plan-reasoning-v2",
};

const state = {
  candidates: [],
  selectedDoorTitle: loadString(STORAGE.selectedDoorTitle, ""),
  reasoning: loadString(STORAGE.reasoning, ""),
  doorwarResult: null,
  warstackSession: null,
  warstackAnswer: "",
  recentDoorwars: [],
  activeSessions: [],
  recentWarstacks: [],
  online: navigator.onLine,
  busy: false,
  status: "Booting plan surface...",
  summary: "Loading candidates...",
  tone: "info",
};

const refs = {
  doorTitleInput: document.getElementById("doorTitleInput"),
  reasoningInput: document.getElementById("reasoningInput"),
  refreshBtn: document.getElementById("refreshBtn"),
  runDoorwarBtn: document.getElementById("runDoorwarBtn"),
  startWarstackBtn: document.getElementById("startWarstackBtn"),
  onlineDot: document.getElementById("onlineDot"),
  onlineLabel: document.getElementById("onlineLabel"),
  statusLine: document.getElementById("statusLine"),
  summaryLine: document.getElementById("summaryLine"),
  radarGrid: document.getElementById("radarGrid"),
  candidateCount: document.getElementById("candidateCount"),
  doorwarCount: document.getElementById("doorwarCount"),
  warstackCount: document.getElementById("warstackCount"),
  candidateMeta: document.getElementById("candidateMeta"),
  candidateList: document.getElementById("candidateList"),
  doorwarResult: document.getElementById("doorwarResult"),
  sessionPanel: document.getElementById("sessionPanel"),
  doorwarHistory: document.getElementById("doorwarHistory"),
  sessionHistory: document.getElementById("sessionHistory"),
  warstackHistory: document.getElementById("warstackHistory"),
};

function loadString(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? String(raw) : fallback;
  } catch (_err) {
    return fallback;
  }
}

function saveString(key, value) {
  localStorage.setItem(key, String(value || ""));
}

function trimText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeText(value) {
  return trimText(value).toLowerCase();
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function selectorFor(item) {
  return trimText(item?.id) || trimText(item?.task_uuid) || trimText(item?.tw_uuid) || (item?.hot_index ? `hot-${item.hot_index}` : "");
}

function apiJson(url, options = {}) {
  const init = {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  };
  return fetch(url, init)
    .then((response) =>
      response.json().catch(() => ({})).then((payload) => {
        if (!response.ok || payload.ok === false) {
          throw new Error(payload.error || payload.message || response.statusText || "request_failed");
        }
        return payload.data || payload;
      })
    );
}

function quadrantStats() {
  const stats = { 1: 0, 2: 0, 3: 0, 4: 0, none: 0 };
  for (const item of state.candidates) {
    const quadrant = Number(item?.quadrant);
    if (quadrant >= 1 && quadrant <= 4) {
      stats[quadrant] += 1;
    } else {
      stats.none += 1;
    }
  }
  return stats;
}

function persist() {
  saveString(STORAGE.selectedDoorTitle, state.selectedDoorTitle);
  saveString(STORAGE.reasoning, state.reasoning);
}

function setBusy(next) {
  state.busy = Boolean(next);
  document.body.classList.toggle("is-busy", state.busy);
  refs.refreshBtn.disabled = state.busy;
  refs.runDoorwarBtn.disabled = state.busy;
  refs.startWarstackBtn.disabled = state.busy;
}

function setStatus(message, tone = "info", summary = "") {
  state.status = trimText(message) || "Ready.";
  state.tone = tone;
  if (summary) {
    state.summary = trimText(summary);
  }
  refs.statusLine.textContent = state.status;
  refs.summaryLine.textContent = state.summary;
}

function chooseFromDoorwarHistory(title) {
  state.selectedDoorTitle = trimText(title);
  persist();
  refs.doorTitleInput.value = state.selectedDoorTitle;
  render();
}

function renderRadar() {
  const stats = quadrantStats();
  refs.radarGrid.innerHTML = [
    { key: 1, label: "Critical" },
    { key: 2, label: "Strategic" },
    { key: 3, label: "Reactive" },
    { key: 4, label: "Noise" },
  ].map((entry) => `
    <div class="radar-cell">
      <span>Q${entry.key} ${escapeHtml(entry.label)}</span>
      <strong>${stats[entry.key] || 0}</strong>
    </div>
  `).join("");
}

function quadrantPill(quadrant) {
  const q = Number(quadrant);
  if (!(q >= 1 && q <= 4)) return "";
  return `<span class="pill pill-q${q}">Q${q}</span>`;
}

function renderCandidates() {
  refs.candidateCount.textContent = String(state.candidates.length);
  refs.doorwarCount.textContent = String(state.recentDoorwars.length);
  refs.warstackCount.textContent = String(state.recentWarstacks.length);
  refs.candidateMeta.textContent = `${state.candidates.length} active entries`;

  if (!state.candidates.length) {
    refs.candidateList.innerHTML = `<div class="empty-state">No active candidates. Capture doors in Potential first.</div>`;
    return;
  }

  refs.candidateList.innerHTML = state.candidates.map((item) => {
    const selector = selectorFor(item);
    const selected = trimText(item.title) === state.selectedDoorTitle || selector === trimText(state.selectedDoorTitle);
    const quadrant = Number(item.quadrant);
    const source = trimText(item.source) || "potential";
    return `
      <article class="candidate-item ${selected ? "is-selected" : ""}" data-selector="${escapeHtml(selector)}">
        <div class="candidate-top">
          <div>
            <h3 class="record-title">${escapeHtml(item.title || "Untitled Door")}</h3>
            <div class="pill-row">
              <span class="pill">${escapeHtml(source)}</span>
              ${quadrantPill(quadrant)}
              ${item.task_uuid ? '<span class="pill">task</span>' : ""}
            </div>
          </div>
          <div class="record-actions">
            <button class="tiny-button" type="button" data-action="select" data-selector="${escapeHtml(selector)}">Use</button>
            <button class="tiny-button" type="button" data-action="doorwar" data-selector="${escapeHtml(selector)}">Door War</button>
          </div>
        </div>
        <div class="record-body">${escapeHtml(item.description || "No notes yet.")}</div>
        <div class="quadrant-actions">
          <button class="pill-button ${quadrant === 1 ? "is-active" : ""}" type="button" data-action="quadrant" data-selector="${escapeHtml(selector)}" data-quadrant="1">Q1</button>
          <button class="pill-button ${quadrant === 2 ? "is-active" : ""}" type="button" data-action="quadrant" data-selector="${escapeHtml(selector)}" data-quadrant="2">Q2</button>
          <button class="pill-button ${quadrant === 3 ? "is-active" : ""}" type="button" data-action="quadrant" data-selector="${escapeHtml(selector)}" data-quadrant="3">Q3</button>
          <button class="pill-button ${quadrant === 4 ? "is-active" : ""}" type="button" data-action="quadrant" data-selector="${escapeHtml(selector)}" data-quadrant="4">Q4</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderDoorwarResult() {
  const result = state.doorwarResult;
  if (!result) {
    refs.doorwarResult.innerHTML = `<div class="empty-state">No Door War result yet. Pick a candidate and run it.</div>`;
    return;
  }

  const selected = result.selected || {};
  const evaluation = selected.evaluation || {};
  refs.doorwarResult.innerHTML = `
    <div class="result-shell is-live">
      <div class="result-head">
        <div>
          <h3 class="record-title">${escapeHtml(selected.title || result.doorwar?.selected_title || state.selectedDoorTitle || "Selected Door")}</h3>
          <div class="pill-row">
            ${quadrantPill(evaluation.quadrant || result.doorwar?.quadrant)}
            ${selected.task_uuid ? '<span class="pill">task linked</span>' : ""}
          </div>
        </div>
      </div>
      <div class="result-body">
        <div class="record-body">${escapeHtml(result.doorwar?.reasoning || evaluation.reasoning || "No reasoning captured.")}</div>
        <div class="record-meta">${escapeHtml(formatDate(result.doorwar?.created_at || new Date().toISOString()))}</div>
      </div>
    </div>
  `;
}

function renderSessionPanel() {
  const session = state.warstackSession;
  if (!session) {
    refs.sessionPanel.innerHTML = `
      <div class="session-shell">
        <div class="session-head">
          <div>
            <h3 class="record-title">Start Inquiry</h3>
            <div class="record-body">Use the selected Door or enter a manual title on the left.</div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  refs.sessionPanel.innerHTML = `
    <div class="session-shell is-live">
      <div class="session-head">
        <div>
          <h3 class="record-title">${escapeHtml(session.door_title || state.selectedDoorTitle || "Untitled Door")}</h3>
          <div class="pill-row">
            <span class="pill">${escapeHtml(session.step || "question")}</span>
          </div>
        </div>
      </div>
      <div class="session-body">
        <div class="record-body">${escapeHtml(session.question || "Continue the inquiry.")}</div>
        <label class="field-label" for="warstackAnswerInput">Answer</label>
        <textarea id="warstackAnswerInput" class="answer-input" placeholder="Write the next answer ...">${escapeHtml(state.warstackAnswer)}</textarea>
        <div class="control-actions">
          <button class="primary-button" id="answerWarstackBtn" type="button">Submit Answer</button>
          <button class="ghost-button" id="resetWarstackBtn" type="button">Reset</button>
        </div>
      </div>
    </div>
  `;
}

function renderHistory() {
  refs.doorwarHistory.innerHTML = state.recentDoorwars.length
    ? state.recentDoorwars.map((entry) => `
        <article class="history-item">
          <div class="history-top">
            <div>
              <h3 class="record-title">${escapeHtml(entry.selected_title || "Untitled Door")}</h3>
              <div class="pill-row">
                ${quadrantPill(entry.quadrant)}
                <span class="pill">${escapeHtml(`${entry.evaluated_count || 0} candidates`)}</span>
              </div>
            </div>
            <div class="record-actions">
              <button class="tiny-button" type="button" data-action="use-doorwar" data-title="${escapeHtml(entry.selected_title || "")}">Use</button>
            </div>
          </div>
          <div class="record-body">${escapeHtml(entry.reasoning || "No reasoning saved.")}</div>
          <div class="record-meta">${escapeHtml(formatDate(entry.created_at))}</div>
        </article>
      `).join("")
    : `<div class="empty-state">No recent Door Wars yet.</div>`;

  refs.sessionHistory.innerHTML = state.activeSessions.length
    ? state.activeSessions.map((entry) => `
        <article class="history-item">
          <div class="history-top">
            <div>
              <h3 class="record-title">${escapeHtml(entry.door_title || "Untitled Door")}</h3>
              <div class="pill-row">
                <span class="pill">${escapeHtml(entry.step || "pending")}</span>
                <span class="pill">${escapeHtml(`${entry.answered_count || 0} answered`)}</span>
              </div>
            </div>
            <div class="record-actions">
              <button class="tiny-button" type="button" data-action="resume-session" data-session-id="${escapeHtml(entry.session_id || "")}">Resume</button>
            </div>
          </div>
          <div class="record-body">${escapeHtml(entry.question || "Continue the inquiry.")}</div>
          <div class="record-meta">${escapeHtml(formatDate(entry.updated_at || entry.created_at))}</div>
        </article>
      `).join("")
    : `<div class="empty-state">No active War Stack sessions.</div>`;

  refs.warstackHistory.innerHTML = state.recentWarstacks.length
    ? state.recentWarstacks.map((entry) => `
        <article class="history-item ${state.doorwarResult && trimText(entry.door_title) === trimText(state.selectedDoorTitle) ? "is-emphasis" : ""}">
          <div class="history-top">
            <div>
              <h3 class="record-title">${escapeHtml(entry.door_title || "Untitled Door")}</h3>
              <div class="pill-row">
                <span class="pill">${escapeHtml(entry.week || "week")}</span>
                <span class="pill">${escapeHtml(`${Array.isArray(entry.hits) ? entry.hits.length : 0} hits`)}</span>
              </div>
            </div>
          </div>
          <div class="hit-list">${(Array.isArray(entry.hits) ? entry.hits : []).slice(0, 4).map((hit, index) => `<div class="hit-entry"><strong>H${index + 1}</strong> ${escapeHtml(hit.fact || hit.strike || "-")}</div>`).join("")}</div>
          <div class="record-meta">${escapeHtml(formatDate(entry.created_at))}</div>
        </article>
      `).join("")
    : `<div class="empty-state">No recent War Stacks yet.</div>`;
}

function render() {
  refs.onlineDot.classList.toggle("is-online", state.online);
  refs.onlineLabel.textContent = state.online ? "Online" : "Offline";
  refs.doorTitleInput.value = state.selectedDoorTitle;
  refs.reasoningInput.value = state.reasoning;
  renderRadar();
  renderCandidates();
  renderDoorwarResult();
  renderSessionPanel();
  renderHistory();
}

function chosenCandidate(selector) {
  const ref = trimText(selector);
  return state.candidates.find((item) => selectorFor(item) === ref) || null;
}

async function refreshAll() {
  try {
    setBusy(true);
    setStatus("Refreshing plan surface...", "info", "Loading candidates and plan history...");
    const [potentialData, doorwarsData, sessionsData, warstacksData] = await Promise.all([
      apiJson("/api/door/potential/hotlist?mode=active"),
      apiJson("/api/door/plan/doorwars").catch(() => ({ doorwars: [] })),
      apiJson("/api/door/plan/warstack/sessions").catch(() => ({ sessions: [] })),
      apiJson("/api/door/plan/warstacks").catch(() => ({ warstacks: [] })),
    ]);

    state.candidates = Array.isArray(potentialData.items) ? potentialData.items : [];
    state.recentDoorwars = Array.isArray(doorwarsData.doorwars) ? doorwarsData.doorwars : [];
    state.activeSessions = Array.isArray(sessionsData.sessions) ? sessionsData.sessions : [];
    state.recentWarstacks = Array.isArray(warstacksData.warstacks) ? warstacksData.warstacks.slice(0, 6) : [];

    if (!state.doorwarResult && state.recentDoorwars[0]) {
      const recent = state.recentDoorwars[0];
      state.doorwarResult = {
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
      if (!state.selectedDoorTitle && trimText(recent.selected_title)) {
        state.selectedDoorTitle = trimText(recent.selected_title);
      }
    }

    if (!state.warstackSession && state.activeSessions[0]) {
      const session = state.activeSessions[0];
      state.warstackSession = {
        session_id: session.session_id,
        step: session.step,
        question: session.question,
        door_title: session.door_title,
      };
    }

    state.online = true;
    persist();
    setStatus("Plan surface synced.", "ok", `${state.candidates.length} candidates loaded.`);
  } catch (err) {
    state.online = false;
    setStatus(`Plan refresh failed: ${String(err.message || err)}`, "error", "Using the last in-memory state.");
  } finally {
    setBusy(false);
    render();
  }
}

async function runDoorWar(selector = "") {
  const candidate = chosenCandidate(selector);
  const title = trimText(candidate?.title || state.selectedDoorTitle || refs.doorTitleInput.value);
  if (!title) {
    setStatus("Door title required.", "error", "Pick a candidate or type one manually.");
    refs.doorTitleInput.focus();
    return;
  }

  try {
    setBusy(true);
    setStatus("Running Door War...", "info", `Evaluating ${title}`);
    const data = await apiJson("/api/door/plan/doorwar", {
      method: "POST",
      body: JSON.stringify({
        title,
        reasoning: state.reasoning,
      }),
    });
    state.selectedDoorTitle = trimText(data.selected?.title || title);
    state.doorwarResult = data;
    state.warstackSession = null;
    state.warstackAnswer = "";
    persist();
    await refreshAll();
  } catch (err) {
    setStatus(`Door War failed: ${String(err.message || err)}`, "error");
  } finally {
    setBusy(false);
    render();
  }
}

async function assignQuadrant(selector, quadrant) {
  const candidate = chosenCandidate(selector);
  if (!candidate) {
    setStatus("Candidate not found.", "error");
    return;
  }
  try {
    setBusy(true);
    setStatus(`Assigning Q${quadrant}...`, "info", candidate.title || "Updating candidate");
    const data = await apiJson(`/api/door/plan/quadrant/${encodeURIComponent(selector)}`, {
      method: "POST",
      body: JSON.stringify({
        quadrant,
        title: candidate.title,
        reasoning: state.reasoning,
      }),
    });
    const nextItem = data.item || {};
    state.candidates = state.candidates.map((entry) =>
      selectorFor(entry) === selector
        ? { ...entry, ...nextItem, quadrant: Number(nextItem.quadrant || quadrant) }
        : entry
    );
    if (!state.selectedDoorTitle) {
      state.selectedDoorTitle = trimText(candidate.title);
      persist();
    }
    setStatus(`Assigned ${candidate.title} to Q${quadrant}.`, "ok", `Task priority synced to ${data.priority || "-"}.`);
  } catch (err) {
    setStatus(`Quadrant update failed: ${String(err.message || err)}`, "error");
  } finally {
    setBusy(false);
    render();
  }
}

async function startWarStack() {
  const selected = state.doorwarResult?.selected || {};
  const candidate = state.candidates.find((entry) => trimText(entry.title) === trimText(state.selectedDoorTitle)) || null;
  const doorTitle = trimText(state.selectedDoorTitle || refs.doorTitleInput.value);
  if (!doorTitle) {
    setStatus("Door title required before starting War Stack.", "error");
    refs.doorTitleInput.focus();
    return;
  }

  try {
    setBusy(true);
    setStatus("Starting War Stack...", "info", `Opening inquiry for ${doorTitle}`);
    const data = await apiJson("/api/door/plan/warstack/start", {
      method: "POST",
      body: JSON.stringify({
        door_title: doorTitle,
        selected_id: trimText(selected.id || selectorFor(candidate)),
        selected_task_uuid: trimText(selected.task_uuid || candidate?.task_uuid),
        reasoning: state.reasoning,
      }),
    });
    state.warstackSession = {
      session_id: data.session_id,
      step: data.step,
      question: data.question,
      door_title: doorTitle,
    };
    state.warstackAnswer = "";
    setStatus("War Stack inquiry started.", "ok", `Question: ${data.question}`);
    await refreshAll();
  } catch (err) {
    setStatus(`War Stack start failed: ${String(err.message || err)}`, "error");
  } finally {
    setBusy(false);
    render();
  }
}

async function answerWarStack() {
  const session = state.warstackSession;
  const answer = trimText(state.warstackAnswer);
  if (!session?.session_id) {
    setStatus("No active session.", "error");
    return;
  }
  if (!answer) {
    setStatus("Answer required.", "error");
    const input = document.getElementById("warstackAnswerInput");
    input?.focus();
    return;
  }

  try {
    setBusy(true);
    setStatus("Submitting answer...", "info", session.step || "warstack");
    const data = await apiJson("/api/door/plan/warstack/answer", {
      method: "POST",
      body: JSON.stringify({
        session_id: session.session_id,
        step: session.step,
        answer,
      }),
    });

    if (data.done && data.warstack) {
      state.warstackSession = null;
      state.warstackAnswer = "";
      state.recentWarstacks = [data.warstack, ...state.recentWarstacks].slice(0, 6);
      setStatus(`War Stack created for ${data.warstack.door_title}.`, "ok", `${Array.isArray(data.warstack.hits) ? data.warstack.hits.length : 0} hits generated.`);
      await refreshAll();
      return;
    }

    state.warstackSession = {
      ...state.warstackSession,
      step: data.step,
      question: data.question,
    };
    state.warstackAnswer = "";
    setStatus("Next inquiry step loaded.", "ok", data.question || data.step);
    await refreshAll();
  } catch (err) {
    setStatus(`War Stack answer failed: ${String(err.message || err)}`, "error");
  } finally {
    setBusy(false);
    render();
  }
}

function resumeSession(sessionId) {
  const session = state.activeSessions.find((entry) => trimText(entry.session_id) === trimText(sessionId));
  if (!session) {
    setStatus("Session not found.", "error");
    return;
  }
  state.warstackSession = {
    session_id: session.session_id,
    step: session.step,
    question: session.question,
    door_title: session.door_title,
  };
  state.selectedDoorTitle = trimText(session.door_title || state.selectedDoorTitle);
  state.warstackAnswer = "";
  persist();
  setStatus(`Resumed session for ${state.selectedDoorTitle}.`, "ok");
  render();
}

function bindStaticEvents() {
  refs.doorTitleInput.addEventListener("input", (event) => {
    state.selectedDoorTitle = trimText(event.target.value);
    persist();
  });

  refs.reasoningInput.addEventListener("input", (event) => {
    state.reasoning = trimText(event.target.value);
    persist();
  });

  refs.refreshBtn.addEventListener("click", refreshAll);
  refs.runDoorwarBtn.addEventListener("click", () => runDoorWar());
  refs.startWarstackBtn.addEventListener("click", startWarStack);

  refs.candidateList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    const selector = trimText(button.getAttribute("data-selector"));
    if (action === "select") {
      const candidate = chosenCandidate(selector);
      state.selectedDoorTitle = trimText(candidate?.title || "");
      persist();
      render();
      return;
    }
    if (action === "quadrant") {
      assignQuadrant(selector, Number.parseInt(button.getAttribute("data-quadrant"), 10));
      return;
    }
    if (action === "doorwar") {
      const candidate = chosenCandidate(selector);
      state.selectedDoorTitle = trimText(candidate?.title || state.selectedDoorTitle);
      persist();
      runDoorWar(selector);
    }
  });

  refs.doorwarHistory.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='use-doorwar']");
    if (!button) return;
    chooseFromDoorwarHistory(button.getAttribute("data-title"));
  });

  refs.sessionHistory.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='resume-session']");
    if (!button) return;
    resumeSession(button.getAttribute("data-session-id"));
  });

  document.addEventListener("click", (event) => {
    const answerButton = event.target.closest("#answerWarstackBtn");
    if (answerButton) {
      answerWarStack();
      return;
    }
    const resetButton = event.target.closest("#resetWarstackBtn");
    if (resetButton) {
      state.warstackSession = null;
      state.warstackAnswer = "";
      setStatus("War Stack session reset locally.", "info");
      render();
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target && event.target.id === "warstackAnswerInput") {
      state.warstackAnswer = event.target.value;
    }
  });

  window.addEventListener("online", () => {
    state.online = true;
    refreshAll();
  });
  window.addEventListener("offline", () => {
    state.online = false;
    render();
  });
}

bindStaticEvents();
render();
refreshAll();
