"use strict";

const $       = (id) => document.getElementById(id);
const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
window.aosGasFallback?.init?.("frame");

// ── Helpers ───────────────────────────────────────────────────────────────────

function isMobile() {
  return window.innerWidth < 720;
}

/**
 * Switch visible view on mobile (list | editor).
 * On desktop, both panels are always visible — this is a no-op.
 */
function showView(view) {
  document.querySelector(".shell").dataset.view = view;
}

/**
 * Format "DD Mon YYYY" from ISO timestamp
 */
function formatUpdated(isoStr) {
  if (!isoStr) return "No frame yet";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric"
  });
}

/**
 * Calculate staleness class based on updated timestamp
 * fresh: < 30 days, aging: 30-90 days, stale: > 90 days or null
 */
function getStalenessClass(isoStr) {
  if (!isoStr) return "stale";
  const now = Date.now();
  const updated = new Date(isoStr).getTime();
  const days = (now - updated) / (1000 * 60 * 60 * 24);

  if (days < 30) return "fresh";
  if (days < 90) return "aging";
  return "stale";
}

/**
 * Extract preview from markdown content (first non-heading text line).
 */
function extractPreview(content) {
  if (!content) return "";
  for (const line of String(content).split("\n")) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    return text.slice(0, 60);
  }
  return "";
}

// ── API ────────────────────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const netFetch = window.aosGasFallback?.fetch
    ? window.aosGasFallback.fetch
    : fetch;
  const res = await netFetch(path, opts, { app: "frame" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Toast ─────────────────────────────────────────────────────────────────────

let toastTimer = null;
function showToast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

// ── State ─────────────────────────────────────────────────────────────────────

let state = {
  domain:  null,
  domains: {},
  fullContent: "",
};

const DOMAIN_ORDER = ["body", "being", "balance", "business"];
const QUESTION_ORDER = [
  { key: "where_am_i_now", label: "Where am I now?" },
  { key: "how_did_i_get_here", label: "How did I get here?" },
  { key: "how_do_i_feel_about_where_i_am", label: "How do I feel about where I am?" },
  { key: "what_is_working_about_where_i_am_now", label: "What is working about where I am now?" },
  { key: "what_is_not_working_about_where_i_am", label: "What is not working about where I am?" },
];

const wizard = {
  active: false,
  step: 0,
  steps: [],
  answers: {},
};

// ── Domain icons ──────────────────────────────────────────────────────────────

const DOMAIN_ICONS = {
  body: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>`,
  being: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4"/>
    <circle cx="12" cy="8" r="0.5" fill="currentColor"/>
  </svg>`,
  balance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="9" cy="7" r="4"/>
    <circle cx="17" cy="17" r="2"/>
    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
  </svg>`,
  business: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>`,
};

// ── Domain cards ──────────────────────────────────────────────────────────────

function renderDomainCards() {
  const root = $("domainCards");
  root.innerHTML = "";

  const LABELS = { body: "BODY", being: "BEING", balance: "BALANCE", business: "BUSINESS" };

  for (const [key, label] of Object.entries(LABELS)) {
    const domainData = state.domains[key] || {};
    const content    = domainData.content || null;
    const updated    = domainData.updated || null;
    const preview    = domainData.preview || (content ? extractPreview(content) : "");
    const active     = state.domain === key;

    const updatedText  = formatUpdated(updated);
    const stalenessClass = getStalenessClass(updated);

    const btn = document.createElement("button");
    btn.className = `domain-card ${stalenessClass}${active ? " active" : ""}`;
    btn.innerHTML = `
      <div class="domain-icon">${DOMAIN_ICONS[key]}</div>
      <div class="domain-body">
        <div class="domain-name">${escHtml(label)}</div>
        <div class="domain-updated">${escHtml(updatedText)}</div>
        ${preview ? `<div class="domain-preview">${escHtml(preview)}</div>` : ""}
      </div>
    `;
    btn.addEventListener("click", () => {
      loadDomain(key);
    });
    root.appendChild(btn);
  }
}

// ── Load domains ──────────────────────────────────────────────────────────────

function showGeneral() {
  state.domain = null;
  $("editorTitle").textContent = "GENERAL · FRAME";
  $("editor").value = state.fullContent || "";
  $("editor").readOnly = true;
  $("btnSave").disabled = true;
  renderDomainCards();
  if (isMobile()) showView("list");
}

function setMode(mode) {
  document.querySelector(".shell").dataset.mode = mode;
}

function buildWizardSteps() {
  const steps = [];
  for (const q of QUESTION_ORDER) {
    for (const domain of DOMAIN_ORDER) {
      steps.push({ domain, question: q });
    }
  }
  return steps;
}

function initWizardAnswers() {
  const answers = {};
  for (const domain of DOMAIN_ORDER) {
    answers[domain] = {};
    for (const q of QUESTION_ORDER) {
      answers[domain][q.key] = "";
    }
  }
  return answers;
}

function updateWizardUI() {
  const step = wizard.steps[wizard.step];
  const total = wizard.steps.length;
  const domainUpper = step.domain.toUpperCase();
  const q = step.question;
  $("wizardProgress").textContent = `${wizard.step + 1} / ${total}`;
  $("wizardDomain").textContent = domainUpper;
  $("wizardQuestion").textContent = q.label;
  $("wizardInput").value = wizard.answers[step.domain][q.key] || "";
  $("wizardBack").disabled = wizard.step === 0;
  $("wizardNext").textContent = wizard.step === total - 1 ? "Finish" : "Next";
}

function startWizard() {
  wizard.active = true;
  wizard.step = 0;
  wizard.steps = buildWizardSteps();
  wizard.answers = initWizardAnswers();
  setMode("wizard");
  showView("editor");
  updateWizardUI();
}

async function completeWizard() {
  $("wizardNext").disabled = true;
  $("wizardBack").disabled = true;
  try {
    await apiFetch("/api/frame/full/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: wizard.answers }),
    });
    wizard.active = false;
    setMode("editor");
    await loadDomains();
  } catch (err) {
    showToast("Save failed");
    console.error(err);
    $("wizardNext").disabled = false;
    $("wizardBack").disabled = false;
  }
}

async function loadDomains() {
  const res = await apiFetch("/api/frame/domains");
  state.domains = res.domains || {};

  renderDomainCards();

  const full = await apiFetch("/api/frame/full");
  state.fullContent = full.content || "";

  setMode("editor");
  showGeneral();
}

// ── Load domain ───────────────────────────────────────────────────────────────

async function loadDomain(domain) {
  const res = await apiFetch(`/api/frame/domain?domain=${domain}`);
  state.domain = domain;
  renderDomainCards();

  const domainUpper = domain.toUpperCase();
  $("editorTitle").textContent = `${domainUpper} · Current Frame`;
  $("editor").value = res.content || "";
  $("editor").readOnly = false;
  $("btnSave").disabled = false;

  // Mobile: switch to editor view
  if (isMobile()) showView("editor");
}

// ── Save ──────────────────────────────────────────────────────────────────────

async function saveCurrent() {
  if (!state.domain) {
    showToast("Select a domain first");
    return;
  }
  const content = $("editor").value;
  const btn     = $("btnSave");
  btn.disabled  = true;

  try {
    await apiFetch("/api/frame/domain/save", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ domain: state.domain, content }),
    });
    showToast("Saved");
    await loadDomains(); // refresh preview + updated timestamp + staleness
  } catch (err) {
    showToast("Save failed");
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}

// ── Events ────────────────────────────────────────────────────────────────────

$("btnBack").addEventListener("click", () => showView("list"));

$("btnSave").addEventListener("click", saveCurrent);
$("btnFullFrame").addEventListener("click", () => {
  startWizard();
});

// Wizard controls
$("wizardBack").addEventListener("click", () => {
  if (!wizard.active) return;
  const step = wizard.steps[wizard.step];
  wizard.answers[step.domain][step.question.key] = $("wizardInput").value || "";
  if (wizard.step > 0) {
    wizard.step -= 1;
    updateWizardUI();
  }
});

$("wizardNext").addEventListener("click", () => {
  if (!wizard.active) return;
  const step = wizard.steps[wizard.step];
  wizard.answers[step.domain][step.question.key] = $("wizardInput").value || "";
  if (wizard.step < wizard.steps.length - 1) {
    wizard.step += 1;
    updateWizardUI();
  } else {
    completeWizard();
  }
});

// Cmd/Ctrl+S
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    saveCurrent();
  }
});

// Handle resize: if switching from mobile → desktop, ensure shell has no stale data-view
window.addEventListener("resize", () => {
  if (!isMobile()) {
    // Desktop always shows both panels; reset to list so both visible
    showView("list");
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────

// Always start with list view
showView("list");

loadDomains().catch((err) => {
  console.error(err);
  document.querySelector(".shell").innerHTML =
    `<p style="padding:32px 24px;color:#f66;font-size:14px;">Error: ${escHtml(err.message)}</p>`;
});
