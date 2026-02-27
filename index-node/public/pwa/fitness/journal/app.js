import { isoToday, toast } from "../_shared/util.js";
import { renderMarkdown } from "../_shared/markdown.js";

const API_BASE = "http://127.0.0.1:8789"; // local fitness-api

const els = {
  connectBtn: document.getElementById("connectBtn"),
  status: document.getElementById("status"),
  dateInput: document.getElementById("dateInput"),
  loadBtn: document.getElementById("loadBtn"),
  newBtn: document.getElementById("newBtn"),
  saveBtn: document.getElementById("saveBtn"),
  toggleBtn: document.getElementById("toggleBtn"),
  list: document.getElementById("list"),
  editor: document.getElementById("editor"),
  editorWrap: document.getElementById("editorWrap"),
  previewWrap: document.getElementById("previewWrap"),
  preview: document.getElementById("preview"),
};

const state = {
  template: null,
  date: isoToday(),
  preview: false,
};

function setStatus(msg) {
  els.status.textContent = msg;
}

function setConnected(on) {
  els.saveBtn.disabled = !on;
  els.editor.placeholder = on ? "Write your entry..." : "API offline";
}

async function getTemplate() {
  if (state.template) return state.template;
  // Minimal built-in template; server provides storage.
  state.template = `# Journal — YYYY-MM-DD\n\nWorkout:\n- \n\nNotes:\n- \n`;
  return state.template;
}

async function refreshList() {
  const res = await fetch(`${API_BASE}/journal/list`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const sorted = (data.entries || []).slice();
  els.list.innerHTML = "";
  for (const entry of sorted.slice(0, 40)) {
    const date = entry.date;
    const item = document.createElement("button");
    item.type = "button";
    item.className = "item";
    item.innerHTML = `<span class="date">${date}</span><span class="tag">entry</span>`;
    item.addEventListener("click", () => {
      els.dateInput.value = date;
      loadEntry(date, { fallbackToTemplate: true });
    });
    els.list.appendChild(item);
  }
}

function setActiveListItem(date) {
  for (const item of els.list.querySelectorAll(".item")) {
    const text = item.querySelector(".date")?.textContent || "";
    item.classList.toggle("active", text === date);
  }
}

async function fetchEntry(date) {
  const res = await fetch(`${API_BASE}/journal?date=${encodeURIComponent(date)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.content || "";
}

async function loadEntry(date, { fallbackToTemplate } = {}) {
  let text = await fetchEntry(date);
  if (!text && fallbackToTemplate) {
    const template = await getTemplate();
    text = template.replaceAll("YYYY-MM-DD", date);
    toast("Template loaded. Save to create the entry.");
  }
  if (text != null) {
    state.date = date;
    els.dateInput.value = date;
    els.editor.value = text;
    setActiveListItem(date);
    updatePreview();
  }
}

async function newEntry() {
  const date = els.dateInput.value || isoToday();
  const template = await getTemplate();
  state.date = date;
  els.dateInput.value = date;
  els.editor.value = template.replaceAll("YYYY-MM-DD", date);
  setActiveListItem(date);
  updatePreview();
}

async function saveEntry() {
  const date = els.dateInput.value || isoToday();
  const res = await fetch(`${API_BASE}/journal`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date, content: els.editor.value }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  state.date = date;
  toast("Saved.");
  await refreshList();
  setActiveListItem(date);
}

function updatePreview() {
  els.preview.innerHTML = renderMarkdown(els.editor.value);
}

function togglePreview() {
  state.preview = !state.preview;
  els.previewWrap.style.display = state.preview ? "block" : "none";
  els.editorWrap.style.display = state.preview ? "none" : "block";
  els.toggleBtn.textContent = state.preview ? "Edit" : "Preview";
  updatePreview();
}

function bind() {
  els.dateInput.value = state.date;
  els.connectBtn.addEventListener("click", () => loadEntry(state.date, { fallbackToTemplate: true }));
  els.loadBtn.addEventListener("click", () => loadEntry(els.dateInput.value, { fallbackToTemplate: true }));
  els.newBtn.addEventListener("click", newEntry);
  els.saveBtn.addEventListener("click", saveEntry);
  els.toggleBtn.addEventListener("click", togglePreview);
  els.editor.addEventListener("input", () => {
    if (state.preview) updatePreview();
  });
}

bind();
setConnected(true);
refreshList().catch(() => setStatus("API offline"));
