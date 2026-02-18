"use strict";

// ── Config ────────────────────────────────────────────────────────────────────
const DOMAINS = [
  { key: "body",     label: "BODY",     icon: "🏋" },
  { key: "being",    label: "BEING",    icon: "🧘" },
  { key: "balance",  label: "BALANCE",  icon: "👥" },
  { key: "business", label: "BUSINESS", icon: "⚡" },
];

const CIRCUMFERENCE = 2 * Math.PI * 52;

// ── Helpers ───────────────────────────────────────────────────────────────────
const $       = (id) => document.getElementById(id);
const escHtml = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function itemPct(item) {
  if (!item) return 0;
  if (item.type === "delta") {
    return Math.round(clamp01(Math.abs(item.current) / (Math.abs(item.target) || 1)) * 100);
  }
  return Math.round(clamp01(item.current / (item.target || 1)) * 100);
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, opts);
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
  toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
}

// ── Ring ──────────────────────────────────────────────────────────────────────
function updateRing(pct) {
  const offset = CIRCUMFERENCE * (1 - pct / 100);
  $("ringTrack").style.strokeDashoffset = offset.toFixed(2);
  $("overallPct").textContent = pct + "%";
  $("statusLabel").textContent = pct >= 50 ? "On Track" : "Behind";
  $("statusLabel").className = "sc-value sc-status " + (pct >= 50 ? "on-track" : "behind");
}

// ── Inline value edit ─────────────────────────────────────────────────────────
function activateValueEdit(el, domain, index, currentVal) {
  if (el.querySelector("input")) return;
  el.innerHTML = `<input class="inline-input" type="number" step="0.1" value="${currentVal}" style="width:72px" />`;
  const input = el.querySelector("input");
  input.focus();
  input.select();

  async function commit() {
    const val = parseFloat(input.value);
    if (isNaN(val)) { render(focusData); return; }
    try {
      const res = await apiFetch("/api/focus/set", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ domain, index, current: val }),
      });
      if (res.ok) { focusData = res.data; updateRing(res.score.overallPct); }
    } catch { showToast("Save failed"); }
    render(focusData);
  }

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter")  { input.blur(); }
    if (e.key === "Escape") { render(focusData); }
  });
}

// ── Inline title edit ─────────────────────────────────────────────────────────
function activateTitleEdit(el, domain, index, currentTitle) {
  if (el.querySelector("input")) return;
  el.innerHTML = `<input class="inline-input" value="${escHtml(currentTitle)}" maxlength="80" style="width:100%" />`;
  const input = el.querySelector("input");
  input.focus();
  input.select();

  async function commit() {
    const val = input.value.trim();
    if (!val || val === currentTitle) { render(focusData); return; }
    try {
      const res = await apiFetch("/api/focus/rename", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ domain, index, title: val }),
      });
      if (res.ok) { focusData = res.data; updateRing(res.score.overallPct); }
    } catch { showToast("Save failed"); }
    render(focusData);
  }

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter")  { input.blur(); }
    if (e.key === "Escape") { render(focusData); }
  });
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function activateDeleteConfirm(btn, domain, index) {
  btn.textContent = "sure?";
  btn.classList.add("confirming");
  const reset = setTimeout(() => { btn.textContent = "×"; btn.classList.remove("confirming"); }, 3000);
  btn.onclick = async () => {
    clearTimeout(reset);
    try {
      const res = await apiFetch("/api/focus/del", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ domain, index }),
      });
      if (res.ok) { focusData = res.data; updateRing(res.score.overallPct); render(focusData); showToast("Deleted"); }
    } catch { showToast("Delete failed"); }
  };
}

// ── State ─────────────────────────────────────────────────────────────────────
let focusData = null;

// ── Render ────────────────────────────────────────────────────────────────────
function render(data) {
  if (!data) return;
  focusData = data;
  $("monthLabel").textContent = data.month || "—";

  const root = $("cards");
  root.innerHTML = "";

  for (const d of DOMAINS) {
    const items    = data.domains[d.key] || [];
    const avgPct   = items.length
      ? Math.round(items.map(itemPct).reduce((a, b) => a + b, 0) / items.length)
      : 0;

    const card = document.createElement("div");
    card.className = "domain-card";

    card.innerHTML = `
      <div class="domain-header">
        <div class="domain-icon">${d.icon}</div>
        <div class="domain-info">
          <div class="domain-name">${d.label}</div>
          <div class="domain-score">
            <span class="pts">${avgPct}%</span> avg · ${items.length} outcomes
          </div>
        </div>
      </div>
      <div class="outcome-list" data-domain="${d.key}"></div>
    `;

    root.appendChild(card);

    const list = card.querySelector(".outcome-list");

    items.forEach((item, idx) => {
      const pct = itemPct(item);

      const row = document.createElement("div");
      row.className = "outcome-row";
      row.innerHTML = `
        <div class="outcome-main">
          <div class="outcome-title" data-domain="${d.key}" data-index="${idx}"
               data-title="${escHtml(item.title)}" title="Tap to rename">${escHtml(item.title)}</div>
          <div class="outcome-meta">
            <span class="type-tag">${escHtml(item.type)}</span>
            <span class="meta-num current-val" data-domain="${d.key}" data-index="${idx}"
                  data-val="${item.current}" title="Tap to set">${item.current}</span>
            <span class="meta-sep">/</span>
            <span class="meta-num">${item.target}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="outcome-actions">
          <button class="act-btn inc-btn" data-domain="${d.key}" data-index="${idx}" title="+1">+1</button>
          <button class="act-btn del-btn" data-domain="${d.key}" data-index="${idx}" title="Delete">×</button>
        </div>
      `;

      list.appendChild(row);
    });

    // +1 inc
    list.querySelectorAll(".inc-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const domain = btn.dataset.domain;
        const index  = Number(btn.dataset.index);
        try {
          const res = await apiFetch("/api/focus/inc", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ domain, index, amount: 1 }),
          });
          if (res.ok) { focusData = res.data; updateRing(res.score.overallPct); render(res.data); showToast("+1 ✓"); }
        } catch { showToast("Error"); }
      });
    });

    // Delete (two-tap)
    list.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activateDeleteConfirm(btn, btn.dataset.domain, Number(btn.dataset.index));
      });
    });

    // Title inline edit
    list.querySelectorAll(".outcome-title").forEach((el) => {
      el.addEventListener("click", () => {
        activateTitleEdit(el, el.dataset.domain, Number(el.dataset.index), el.dataset.title);
      });
    });

    // Current value inline edit
    list.querySelectorAll(".current-val").forEach((el) => {
      el.addEventListener("click", () => {
        activateValueEdit(el, el.dataset.domain, Number(el.dataset.index), Number(el.dataset.val));
      });
    });
  }
}

// ── Add form ──────────────────────────────────────────────────────────────────
$("addBtn").addEventListener("click", async () => {
  const domain = $("addDomain").value;
  const title  = $("addTitle").value.trim();
  const type   = $("addType").value;
  const target = parseFloat($("addTarget").value);

  if (!title)    { showToast("Title fehlt"); return; }
  if (isNaN(target)) { showToast("Target muss eine Zahl sein"); return; }

  try {
    const res = await apiFetch("/api/focus/add", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ domain, title, type, target }),
    });
    if (res.ok) {
      focusData = res.data;
      updateRing(res.score.overallPct);
      render(res.data);
      $("addTitle").value  = "";
      $("addTarget").value = "";
      showToast(`${domain.toUpperCase()} outcome added ✓`);
    }
  } catch { showToast("Add failed"); }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
async function load() {
  const res = await apiFetch("/api/focus/month");
  if (!res.ok) throw new Error(res.error || "load failed");
  focusData = res.data;
  updateRing(res.score.overallPct);
  render(focusData);
}

load().catch((err) => {
  console.error(err);
  $("cards").innerHTML =
    `<p style="padding:20px;color:#f66;font-size:14px">Fehler: ${err.message}</p>`;
});
