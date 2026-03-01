"use strict";

/* ── State ──────────────────────────────────────────────────────────────── */
const PHASES = ["stop", "submit", "struggle", "strike"];
let currentView = "stop";
const autosaveCache = {};

/* ── Textarea IDs per phase ─────────────────────────────────────────────── */
const FIELDS = {
  stop: ["stop"],
  submit: ["submit_facts", "submit_feelings", "submit_focus", "submit_fruit"],
  struggle: ["struggle"],
  strike: ["strike"],
};

/* ── Chapter Content ────────────────────────────────────────────────────── */
const CHAPTERS = {
  stop: `## Creating Valuable Space
Society moves at a relentless pace, rarely offering us a chance to breathe. Our days become a series of reactions, fooling us into believing we're living with purpose when, in reality, we're just surviving.

## The Power of the Pause
There's unmatched power in stillness. When you choose to Stop, you're not just pausing your physical movements — you're also quieting the mental noise. You create space to think, reflect, and question the stories that have controlled your mind for too long.

## Beyond Reaction: Designing Change
Too often, people only change when they're forced to by trauma or drama. But the Alpha doesn't wait for life to make decisions for them. The Alpha chooses. By stopping, change becomes deliberate.

Stopping is the first crucial step on the journey of self-awareness, self-improvement, and self-mastery. To truly change the stories we tell ourselves, we must first stop and listen to them as they are. Only then can we rewrite them.`,

  submit: `## Radical Honesty
Society and self-preservation teach us to hide the truths that make us uncomfortable. In Submit, the first requirement is honesty — radical honesty. This level of truth-telling demands courage and vulnerability.

## Unleashing Your Emotions
All emotions, whether dark or light, need to be acknowledged during submission. By bringing them to the surface, you allow yourself to process, understand, and use these feelings as fuel for change.

## The Four Truths
- **Facts:** What are the undeniable realities? No exaggerations, no minimizing — just pure truth.
- **Feelings:** How do you truly feel? Go beyond surface reactions.
- **Focus:** What has been your mindset? Denial, avoidance, or confrontation?
- **Fruit:** What results have you gotten? What do you want them to be?

Submission isn't about defeat; it's about empowerment. When you submit to the truth, you become its master.`,

  struggle: `## A Battle of Identities
This fight is a clash between who you were and who you are becoming. It's a battle with the stories from your past, the narratives that shaped your actions. This new awareness rises to the surface, demanding that you deal with it.

## Active Engagement
Struggle isn't just about recognizing what's wrong; it's about actively engaging with it. A passive Alpha might turn The Voice into just another diary entry. But if you're serious about real transformation, the struggle becomes a deliberate battle between outdated beliefs and new aspirations.

## Emergence and Rebirth
Choosing to face the Struggle every day is more than a routine — it's a commitment to rise, evolve, and thrive. In the heat of Struggle, an Alpha finds their true strength. And in that discovery, they unlock a freedom that's unparalleled.`,

  strike: `## Why Action Is Paramount
Many people live in a world of ideas — constantly dreaming, reflecting, thinking. While these activities have value, they don't amount to much without action. Dreams without steps are just fantasies.

## The Dangers of Inaction
There's a dangerous trend — celebrating ideas as if they were actions. People get caught up in the excitement of a "eureka moment," thinking that having a great idea is the same as making it happen. Without action, even the best insights are worthless.

## Execution Above All
The Strike is what makes the difference. It's the daily force that drives your Weekly Fire, your Monthly Focus, and your journey towards Annual Freedom. It's the leap from "what if" to "I did it."

The Voice isn't just about gaining insight. It's a call to action. It's not about having grand ideas — it's about the grit to execute those ideas. The strength of our actions shapes our destiny.`,
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $$(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }

function today() {
  return new Date().toISOString().slice(0, 10);
}

function todayDisplay() {
  return new Date().toLocaleDateString("de-DE", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function escHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function showToast(msg) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 1800);
}

/* ── LocalStorage ───────────────────────────────────────────────────────── */
function lsKey(fieldId) { return "memoirs_" + fieldId + "_" + today(); }

function saveField(fieldId) {
  const el = $("#ta-" + fieldId);
  if (!el) return;
  try { localStorage.setItem(lsKey(fieldId), el.value); } catch (_) {}
}

function restoreField(fieldId) {
  const el = $("#ta-" + fieldId);
  if (!el) return;
  try {
    const v = localStorage.getItem(lsKey(fieldId));
    if (v !== null) el.value = v;
  } catch (_) {}
}

function getFieldValue(fieldId) {
  const el = $("#ta-" + fieldId);
  return el ? el.value.trim() : "";
}

function hasContent(phase) {
  return FIELDS[phase].some((f) => getFieldValue(f).length > 0);
}

/* ── Autosave to Server ─────────────────────────────────────────────────── */
async function autosavePhase(phase) {
  const md = buildPhaseMarkdown(phase);
  if (!md) return;
  if (autosaveCache[phase] === md) return;
  autosaveCache[phase] = md;
  try {
    await fetch("/api/voice/autosave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: phase, date: today(), markdown: md }),
    });
    const ind = $(".save-indicator.active");
    if (ind) {
      ind.classList.add("visible");
      clearTimeout(ind._t);
      ind._t = setTimeout(() => ind.classList.remove("visible"), 2000);
    }
  } catch (_) {}
}

function buildPhaseMarkdown(phase) {
  const date = today();
  if (phase === "submit") {
    const facts = getFieldValue("submit_facts");
    const feelings = getFieldValue("submit_feelings");
    const focus = getFieldValue("submit_focus");
    const fruit = getFieldValue("submit_fruit");
    const blocks = [];
    if (facts) blocks.push("## Facts\n" + facts);
    if (feelings) blocks.push("## Feelings\n" + feelings);
    if (focus) blocks.push("## Focus\n" + focus);
    if (fruit) blocks.push("## Fruit\n" + fruit);
    if (!blocks.length) return "";
    return "# Voice Submit - " + date + "\n\n" + blocks.join("\n\n") + "\n";
  }
  const val = getFieldValue(phase);
  if (!val) return "";
  return "# Voice " + phase.toUpperCase() + " - " + date + "\n\n" + val + "\n";
}

/* ── Full Session Markdown ──────────────────────────────────────────────── */
function buildFullSession() {
  const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
  const stop = getFieldValue("stop");
  const facts = getFieldValue("submit_facts");
  const feelings = getFieldValue("submit_feelings");
  const focus = getFieldValue("submit_focus");
  const fruit = getFieldValue("submit_fruit");
  const struggle = getFieldValue("struggle");
  const strike = getFieldValue("strike");

  let md = "# The Voice Session \u2013 \u03B1OS\n\n_" + ts + "_\n\n---\n\n";
  md += "## STOP\n\n" + (stop || "_leer_") + "\n\n";
  md += "---\n\n## SUBMIT\n\n";
  md += "**FACTS:**\n\n" + (facts || "_leer_") + "\n\n";
  md += "**FEELINGS:**\n\n" + (feelings || "_leer_") + "\n\n";
  md += "**FOCUS:**\n\n" + (focus || "_leer_") + "\n\n";
  md += "**FRUIT:**\n\n" + (fruit || "_leer_") + "\n\n";
  md += "---\n\n## STRUGGLE\n\n" + (struggle || "_leer_") + "\n\n";
  md += "---\n\n## STRIKE\n\n" + (strike || "_leer_") + "\n\n";
  md += "---\n\n_Generated via Memoirs Centre \u00B7 \u03B1OS_\n";
  return md;
}

/* ── Export Session ─────────────────────────────────────────────────────── */
async function exportSession() {
  const md = buildFullSession();
  const title = "Voice_Session_" + today();
  try {
    const res = await fetch("/api/voice/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, markdown: md }),
    });
    const data = await res.json();
    if (data?.ok) {
      showToast("Session exported");
    } else {
      showToast("Export failed: " + (data?.error || "unknown"));
    }
  } catch (err) {
    showToast("Export error: " + err.message);
  }
}

/* ── Clear Today ────────────────────────────────────────────────────────── */
function clearToday() {
  if (!confirm("Alle heutigen Eintr\u00E4ge l\u00F6schen?")) return;
  for (const phase of PHASES) {
    for (const fid of FIELDS[phase]) {
      const el = $("#ta-" + fid);
      if (el) el.value = "";
      try { localStorage.removeItem(lsKey(fid)); } catch (_) {}
    }
  }
  autosaveCache.stop = "";
  autosaveCache.submit = "";
  autosaveCache.struggle = "";
  autosaveCache.strike = "";
  updateContentDots();
  showToast("Cleared");
}

/* ── View Switching ─────────────────────────────────────────────────────── */
function switchView(viewId) {
  currentView = viewId;
  $$(".view").forEach((v) => v.classList.remove("active"));
  const target = $("#view-" + viewId);
  if (target) target.classList.add("active");

  $$(".bn-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.view === viewId);
  });

  // Load history when switching to that view
  if (viewId === "history") loadHistory();

  // Mark active save indicator
  $$(".save-indicator").forEach((s) => s.classList.remove("active"));
  const ind = $(".save-indicator", target);
  if (ind) ind.classList.add("active");
}

function updateContentDots() {
  $$(".bn-tab").forEach((tab) => {
    const view = tab.dataset.view;
    if (PHASES.includes(view)) {
      tab.classList.toggle("has-content", hasContent(view));
    }
  });
}

/* ── History ────────────────────────────────────────────────────────────── */
async function loadHistory() {
  const container = $("#history-list");
  if (!container) return;
  container.innerHTML = '<div class="history-empty">Lade...</div>';

  try {
    const res = await fetch("/api/voice/history?limit=50", { cache: "no-store" });
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.files) || !data.files.length) {
      container.innerHTML = '<div class="history-empty">Keine Eintr\u00E4ge.</div>';
      return;
    }

    container.innerHTML = data.files.map((f) => {
      const name = f.relative || f.name || "?";
      const date = f.mtimeMs ? new Date(f.mtimeMs).toLocaleDateString("de-DE", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      }) : "";
      return '<div class="history-item" data-path="' + escHtml(name) + '">'
        + '<div class="history-name">' + escHtml(name) + '</div>'
        + '<div class="history-date">' + escHtml(date) + '</div>'
        + '</div>';
    }).join("");

    $$(".history-item", container).forEach((item) => {
      item.addEventListener("click", () => {
        openHistoryFile(item.dataset.path);
      });
    });
  } catch (_) {
    container.innerHTML = '<div class="history-empty">Fehler beim Laden.</div>';
  }
}

async function openHistoryFile(relPath) {
  try {
    const res = await fetch("/api/voice/file?path=" + encodeURIComponent(relPath), { cache: "no-store" });
    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error || "read failed");
    openModal(relPath, data.content || "");
  } catch (err) {
    showToast("Fehler: " + err.message);
  }
}

/* ── Modal ──────────────────────────────────────────────────────────────── */
function openModal(title, content) {
  const overlay = $("#modal-overlay");
  const titleEl = $("#modal-title");
  const bodyEl = $("#modal-body");
  if (!overlay || !titleEl || !bodyEl) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = '<pre>' + escHtml(content) + '</pre>';
  overlay.classList.add("show");

  const close = () => {
    overlay.classList.remove("show");
    document.removeEventListener("keydown", escHandler);
  };

  const escHandler = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", escHandler);

  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  $("#modal-close").onclick = close;
}

/* ── Init ───────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Date display
  const dateEl = $(".app-date");
  if (dateEl) dateEl.textContent = todayDisplay();

  // Restore all fields from localStorage
  for (const phase of PHASES) {
    for (const fid of FIELDS[phase]) {
      restoreField(fid);
    }
  }

  // Textarea event listeners
  $$(".phase-textarea").forEach((ta) => {
    const fid = ta.id.replace("ta-", "");
    const phase = Object.keys(FIELDS).find((p) => FIELDS[p].includes(fid));

    ta.addEventListener("input", () => {
      saveField(fid);
      updateContentDots();
    });

    ta.addEventListener("blur", () => {
      if (phase) autosavePhase(phase);
    });
  });

  // Bottom nav
  $$(".bn-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      switchView(tab.dataset.view);
    });
  });

  // Session actions
  $("#btn-export")?.addEventListener("click", exportSession);
  $("#btn-clear")?.addEventListener("click", clearToday);
  $("#btn-preview")?.addEventListener("click", () => {
    openModal("Session Preview", buildFullSession());
  });

  // Initial view
  switchView("stop");
  updateContentDots();

  // Register service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/pwa/memoirs/sw.js").catch(() => {});
  }
});
