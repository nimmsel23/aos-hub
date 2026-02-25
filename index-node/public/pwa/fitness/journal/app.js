import { pickRepoDir, getSubdir, listFilenames, readTextFile, writeTextFile } from "../_shared/fs.js";
import { isoToday, toast } from "../_shared/util.js";
import { renderMarkdown } from "../_shared/markdown.js";

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
  root: null,
  journalDir: null,
  templatesDir: null,
  template: null,
  date: isoToday(),
  preview: false,
};

function setStatus(msg) {
  els.status.textContent = msg;
}

function setConnected(on) {
  els.saveBtn.disabled = !on;
  els.editor.placeholder = on ? "Write your entry..." : "Connect folder to edit and save...";
}

async function getTemplate() {
  if (state.template) return state.template;
  const text = await readTextFile(state.templatesDir, "journal-entry.md");
  state.template = text;
  return text;
}

async function connect() {
  try {
    state.root = await pickRepoDir();
    state.journalDir = await getSubdir(state.root, ["personal", "journal"], true);
    state.templatesDir = await getSubdir(state.root, ["templates"], false);
    setStatus(`connected: ${state.root.name}`);
    setConnected(true);
    await refreshList();
    await loadEntry(state.date, { fallbackToTemplate: true });
  } catch (err) {
    toast(err.message || "Failed to connect.");
  }
}

async function refreshList() {
  const names = await listFilenames(state.journalDir, { suffix: ".md" });
  const sorted = names.slice().sort().reverse();
  els.list.innerHTML = "";
  for (const name of sorted.slice(0, 40)) {
    const date = name.replace(".md", "");
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

async function readIfExists(filename) {
  try {
    return await readTextFile(state.journalDir, filename);
  } catch (err) {
    if (err && err.name === "NotFoundError") return null;
    throw err;
  }
}

async function loadEntry(date, { fallbackToTemplate } = {}) {
  if (!state.journalDir) return;
  const filename = `${date}.md`;
  let text = await readIfExists(filename);
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
  if (!state.journalDir) return;
  const date = els.dateInput.value || isoToday();
  const template = await getTemplate();
  state.date = date;
  els.dateInput.value = date;
  els.editor.value = template.replaceAll("YYYY-MM-DD", date);
  setActiveListItem(date);
  updatePreview();
}

async function saveEntry() {
  if (!state.journalDir) return;
  const date = els.dateInput.value || isoToday();
  const filename = `${date}.md`;
  await writeTextFile(state.journalDir, filename, els.editor.value);
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
  els.connectBtn.addEventListener("click", connect);
  els.loadBtn.addEventListener("click", () => loadEntry(els.dateInput.value, { fallbackToTemplate: true }));
  els.newBtn.addEventListener("click", newEntry);
  els.saveBtn.addEventListener("click", saveEntry);
  els.toggleBtn.addEventListener("click", togglePreview);
  els.editor.addEventListener("input", () => {
    if (state.preview) updatePreview();
  });
}

bind();
setConnected(false);
