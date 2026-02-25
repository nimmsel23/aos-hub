"use strict";

// ── Config ────────────────────────────────────────────────────────────────────

const PHASES = {
  potential: {
    label: "POTENTIAL",
    subtitle: "Capture possibilities (Hot List)",
    intro: "Add ideas, projects, and opportunities to your **Hot List**. Don't filter yet—capture everything.",
  },
  plan: {
    label: "PLAN",
    subtitle: "Choose your Domino Door",
    intro: "Run **Door War** (Eisenhower Matrix) to select your Domino Door, then create a **War Stack** for execution.",
  },
  production: {
    label: "PRODUCTION",
    subtitle: "Execute 4 Hits",
    intro: "Track your **4 Hits** (weekly strikes). Each War Stack generates 4 tactical hits for execution.",
  },
  profit: {
    label: "PROFIT",
    subtitle: "Review & Reflect",
    intro: "Review completed Doors, capture learnings, and celebrate **DONE**. Reflect on what worked.",
  },
};

// ── State ─────────────────────────────────────────────────────────────────────

let currentPhase = "potential";

// ── Helpers ───────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// ── Render ────────────────────────────────────────────────────────────────────

function renderPhase(phase) {
  const config = PHASES[phase];
  const root = $("content");
  root.innerHTML = "";

  // Intro box
  const intro = document.createElement("div");
  intro.className = "phase-intro";
  intro.innerHTML = config.intro.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  root.appendChild(intro);

  // Phase-specific content
  if (phase === "potential") {
    renderPotential(root);
  } else if (phase === "plan") {
    renderPlan(root);
  } else if (phase === "production") {
    renderProduction(root);
  } else if (phase === "profit") {
    renderProfit(root);
  }
}

function renderPotential(root) {
  // Placeholder: Hot List items (would load from /api/door/hotlist)
  const items = [
    { title: "Vitaltrainer Ausbildung abschließen", badge: "Q2" },
    { title: "FADARO Platform Setup", badge: "Q2" },
    { title: "Vital Dojo Community Launch", badge: "Q3" },
  ];

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div class="item-header">
        <div class="item-title">${item.title}</div>
        <div class="item-badge">${item.badge}</div>
      </div>
      <div class="item-meta">
        <span>Added 3 days ago</span>
      </div>
    `;
    root.appendChild(card);
  });

  // Add button
  const addBtn = document.createElement("button");
  addBtn.className = "add-btn";
  addBtn.textContent = "+ ADD TO HOT LIST";
  addBtn.onclick = () => alert("Add Hot List item (TODO: implement form)");
  root.appendChild(addBtn);
}

function renderPlan(root) {
  const card = document.createElement("div");
  card.className = "item-card";
  card.innerHTML = `
    <div class="item-header">
      <div class="item-title">Run Door War</div>
      <div class="item-badge">EISENHOWER</div>
    </div>
    <div class="item-desc">
      Evaluate your Hot List with the Eisenhower Matrix. Select your Domino Door (highest Q2 item).
    </div>
    <div class="item-meta">
      <span>Hot List: 3 items</span>
    </div>
  `;
  root.appendChild(card);

  const warBtn = document.createElement("button");
  warBtn.className = "add-btn";
  warBtn.textContent = "START DOOR WAR";
  warBtn.onclick = () => alert("Door War (TODO: Eisenhower UI)");
  root.appendChild(warBtn);

  const stackBtn = document.createElement("button");
  stackBtn.className = "add-btn";
  stackBtn.textContent = "CREATE WAR STACK";
  stackBtn.onclick = () => alert("War Stack creation (TODO: inquiry flow)");
  root.appendChild(stackBtn);
}

function renderProduction(root) {
  // Placeholder: Hit List (4 Hits from War Stack)
  const hits = [
    { title: "Modul 3 abschließen", done: true },
    { title: "Prüfungsvorbereitung Woche 1", done: false },
    { title: "Praxisstunden dokumentieren", done: false },
    { title: "Feedback von Mentor einholen", done: false },
  ];

  hits.forEach((hit, i) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div class="item-header">
        <div class="item-title">Hit ${i + 1}: ${hit.title}</div>
        <div class="item-badge">${hit.done ? "✓ DONE" : "OPEN"}</div>
      </div>
    `;
    root.appendChild(card);
  });
}

function renderProfit(root) {
  const card = document.createElement("div");
  card.className = "item-card";
  card.innerHTML = `
    <div class="item-header">
      <div class="item-title">Completed Doors</div>
      <div class="item-badge">2 THIS MONTH</div>
    </div>
    <div class="item-desc">
      Review your completed Doors, capture learnings, and celebrate wins.
    </div>
  `;
  root.appendChild(card);

  const reflectBtn = document.createElement("button");
  reflectBtn.className = "add-btn";
  reflectBtn.textContent = "WRITE REFLECTION";
  reflectBtn.onclick = () => alert("Profit Reflection (TODO: form)");
  root.appendChild(reflectBtn);
}

// ── Phase Switching ───────────────────────────────────────────────────────────

function switchPhase(phase) {
  if (currentPhase === phase) return;
  currentPhase = phase;

  // Update bottom nav
  $$(".bn-btn").forEach((btn) => {
    if (btn.dataset.phase === phase) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Update header
  $("appPhase").textContent = PHASES[phase].label;

  // Render content
  renderPhase(phase);
}

// ── Event Listeners ───────────────────────────────────────────────────────────

$$(".bn-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const phase = btn.dataset.phase;
    switchPhase(phase);
  });
});

// ── Boot ──────────────────────────────────────────────────────────────────────

renderPhase(currentPhase);
