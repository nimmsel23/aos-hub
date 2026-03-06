"use strict";
window.aosGasFallback?.init?.("fire");

const DOMAINS = [
  {
    key: "body",
    label: "BODY",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 10h3v4H3zM18 10h3v4h-3zM6 11h3v2H6zM15 11h3v2h-3zM9 9h6v6H9z"/>
    </svg>`
  },
  {
    key: "being",
    label: "BEING",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4c-3 2-4 5-4 8 0 3 2 6 4 6s4-3 4-6c0-3-1-6-4-8z"/>
      <path d="M5 14c2 0 3 1 4 3m10-3c-2 0-3 1-4 3"/>
    </svg>`
  },
  {
    key: "balance",
    label: "BALANCE",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v3m-6 2h12m-9 9h6m-3-11-4 8h8l-4-8z"/>
    </svg>`
  },
  {
    key: "business",
    label: "BUSINESS",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16v11H4z"/>
      <path d="M9 7V5h6v2"/>
    </svg>`
  },
];

const $ = (id) => document.getElementById(id);
const escHtml = (s) => String(s)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

async function apiFetch(path, opts = {}) {
  const netFetch = window.aosGasFallback?.fetch ? window.aosGasFallback.fetch : fetch;
  const res = await netFetch(path, opts, { app: "fire" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderDomainGrid(containerId, tasks) {
  const container = $(containerId);
  if (!container) return;

  const grouped = { body: [], being: [], balance: [], business: [] };
  (tasks || []).forEach((task) => {
    const domain = ["body", "being", "balance", "business"].includes(task.domain)
      ? task.domain
      : "";
    if (!domain) return;
    grouped[domain].push(task);
  });

  container.innerHTML = "";

  DOMAINS.forEach((domain) => {
    const list = grouped[domain.key] || [];
    if (!list.length) return;

    const card = document.createElement("div");
    card.className = `domain-card ${domain.key}`;

    card.innerHTML = `
      <div class="domain-header">
        <div class="domain-icon">${domain.icon}</div>
        <div class="domain-info">
          <div class="domain-name">${domain.label}</div>
        </div>
      </div>
      <ul class="task-list"></ul>
    `;

    const ul = card.querySelector(".task-list");
    list.forEach((task) => {
      const item = document.createElement("li");
      item.className = "task-item";
      const dueText = task.date ? new Date(task.date).toLocaleDateString("de-DE") : "kein Due";
      item.innerHTML = `
        <div class="task-title">${escHtml(task.title || "(ohne Titel)")}</div>
        <div class="task-meta">${escHtml(dueText)}</div>
      `;
      ul.appendChild(item);
    });

    container.appendChild(card);
  });
}

async function load() {
  const [weekRes, dayRes] = await Promise.all([
    apiFetch("/api/fire/week"),
    apiFetch("/api/fire/day"),
  ]);

  if (!weekRes.ok) throw new Error(weekRes.error || "week load failed");
  if (!dayRes.ok) throw new Error(dayRes.error || "day load failed");

  $("weekLabel").textContent = weekRes.week || "—";
  const appWeek = $("appWeek");
  if (appWeek) appWeek.textContent = weekRes.week || "—";
  $("dayLabel").textContent = dayRes.date || "Today";

  renderDomainGrid("weekly-content", weekRes.tasks || []);
  renderDomainGrid("daily-content", dayRes.tasks || []);
}

load().catch((err) => {
  console.error(err);
  const el = $("fireError");
  if (el) el.textContent = `Fehler: ${err.message}`;
});
