"use strict";

window.aosGasFallback?.init?.("door");

const PHASES = {
  potential: {
    label: "POTENTIAL",
    folder: "1-Potential",
    subtitle: "Hot List files",
    intro: "User-side file view for the Door flow. This phase manages raw markdown in `1-Potential`; system operations stay in `doorctl`.",
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
    subtitle: "Door War / plan files",
    intro: "This phase manages markdown in `2-Plan`. Use it to review and edit Door War material; operational promotion and automation remain `doorctl` work.",
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
        "## Priority",
        "",
        "- H / M / L / none",
        "",
        "## Domino Door",
        "",
        "-",
        "",
        "## Notes",
        "",
      ].join("\n");
    },
  },
  production: {
    label: "PRODUCTION",
    folder: "3-Production",
    subtitle: "War Stack / production files",
    intro: "This phase manages markdown in `3-Production`. Legacy `War-Stacks` files stay visible here, but new work should live in the primary production folder.",
    draftTitle: "Untitled War Stack",
    template(title) {
      return [
        "---",
        "type: door-production",
        "phase: production",
        `created: ${todayKey()}`,
        "---",
        "",
        `# War Stack: ${title}`,
        "",
        "## Title",
        "",
        `- ${title}`,
        "",
        "## Domino Door",
        "",
        "-",
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
    subtitle: "Reflections and wrap-ups",
    intro: "This phase manages markdown in `4-Profit`. Use it for reflections, closure, and review output without mixing in system-side execution logic.",
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

const state = {
  currentPhase: "potential",
  summary: {},
  filesByPhase: {
    potential: [],
    plan: [],
    production: [],
    profit: [],
  },
  editors: {},
  status: "",
  statusTone: "info",
};

const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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
  init.headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || payload.message || response.statusText || "request_failed");
  }
  return payload.data || payload;
}

async function refreshSummary() {
  try {
    const data = await apiJson("/api/door/files");
    state.summary = {};
    (data.phases || []).forEach((phase) => {
      state.summary[phase.key] = phase;
    });
  } catch (err) {
    setStatus(`Summary failed: ${err.message}`, "error");
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

async function loadFile(phase, key, { render = true } = {}) {
  const data = await apiJson(`/api/door/files/read?phase=${encodeURIComponent(phase)}&key=${encodeURIComponent(key)}`);
  const file = data.file || {};
  state.editors[phase] = {
    key: file.key || "",
    name: file.name || "",
    title: deriveTitleFromName(file.name, PHASES[phase].draftTitle),
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
  const data = await apiJson(`/api/door/files?phase=${encodeURIComponent(phase)}`);
  state.filesByPhase[phase] = data.files || [];
  if (data.phase) {
    state.summary[phase] = {
      ...data.phase,
      count: state.filesByPhase[phase].length,
    };
  }
  updateNav();

  const editor = state.editors[phase];
  const nextKey =
    preferredKey ||
    (editor && editor.key && state.filesByPhase[phase].some((file) => file.key === editor.key) ? editor.key : "") ||
    (state.filesByPhase[phase][0] ? state.filesByPhase[phase][0].key : "");

  if (nextKey) {
    await loadFile(phase, nextKey, { render: false });
  } else if (!editor || !editor.isDraft) {
    state.editors[phase] = makeDraft(phase);
  }

  renderPhase(phase);
}

function phaseSummaryLine(phase) {
  const config = PHASES[phase];
  const summary = state.summary[phase];
  const count = summary?.count ?? state.filesByPhase[phase]?.length ?? 0;
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
        <span class="file-name">${escapeHtml(file.name)}</span>
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

function renderPhase(phase) {
  const config = PHASES[phase];
  const root = $("content");
  const files = state.filesByPhase[phase] || [];
  const editor = currentEditor(phase);
  const metaLine = editor.isDraft
    ? `New draft in ${config.folder}`
    : `${editor.source} · ${formatTime(editor.mtime)} · ${formatSize(editor.size)}`;

  root.innerHTML = `
    <section class="ctx-summary">
      <div class="phase-intro">
        <div class="phase-kicker">${escapeHtml(config.subtitle)}</div>
        <p>${escapeHtml(config.intro)}</p>
      </div>
      <div class="phase-banner">
        <strong>${escapeHtml(phaseSummaryLine(phase))}</strong>
        <span>User side: files only. System side: \`doorctl\`.</span>
      </div>
      <div class="status-line" id="statusLine" data-tone="${escapeHtml(state.statusTone)}">
        ${escapeHtml(state.status || "Ready.")}
      </div>
    </section>

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
            <h2>${escapeHtml(editor.isDraft ? "New File" : editor.name || config.draftTitle)}</h2>
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
  `;

  $("refreshPhaseBtn")?.addEventListener("click", async () => {
    setStatus(`Refreshing ${config.folder} ...`, "info");
    try {
      await refreshSummary();
      await loadPhase(phase, { preferredKey: currentEditor(phase).key });
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

  root.querySelectorAll("[data-file-key]").forEach((button) => {
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
    currentEditor(phase).title = event.target.value;
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
      await refreshSummary();
      await loadPhase(phase, { preferredKey: data.file?.key || "" });
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
      await refreshSummary();
      await loadPhase(phase);
      setStatus(`Deleted file from ${config.folder}.`, "ok");
    } catch (err) {
      setStatus(`Delete failed: ${err.message}`, "error");
    }
  });
}

async function switchPhase(phase) {
  if (!PHASES[phase]) return;
  state.currentPhase = phase;
  $("appPhase").textContent = `${PHASES[phase].label} · ${PHASES[phase].folder}`;
  updateNav();
  $("content").innerHTML = `
    <section class="ctx-loading">
      <div class="phase-intro">
        <div class="phase-kicker">${escapeHtml(PHASES[phase].subtitle)}</div>
        <p>Loading files from ${escapeHtml(PHASES[phase].folder)} ...</p>
      </div>
    </section>
  `;
  try {
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
  if (title) title.textContent = "DOOR CTX";
  await refreshSummary();
  updateNav();
  await switchPhase(state.currentPhase);
})();
