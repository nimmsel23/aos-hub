"use strict";

const tocList = document.getElementById("tocList");
const readerTitle = document.getElementById("readerTitle");
const readerSub = document.getElementById("readerSub");
const readerBody = document.getElementById("readerBody");
const refreshBtn = document.getElementById("refresh");

let chapters = [];
let activeId = null;

function setActive(id) {
  activeId = String(id);
  const items = tocList.querySelectorAll(".toc-item");
  items.forEach((el) => {
    el.classList.toggle("active", el.dataset.id === activeId);
  });
}

function renderToc() {
  tocList.innerHTML = chapters.map((c) => `
    <div class="toc-item" data-id="${c.id}">
      <div class="toc-item-title">Chapter ${c.id}</div>
      <div class="toc-item-sub">${c.title}</div>
    </div>
  `).join("");

  tocList.querySelectorAll(".toc-item").forEach((el) => {
    el.addEventListener("click", () => loadChapter(el.dataset.id));
  });
}

async function loadChapters() {
  const res = await fetch("/api/game/chapters", { cache: "no-store" });
  const data = await res.json();
  chapters = Array.isArray(data?.chapters) ? data.chapters : [];
  renderToc();
}

async function loadChapter(id) {
  setActive(id);
  readerTitle.textContent = "Loading…";
  readerSub.textContent = "—";
  readerBody.textContent = "";
  const res = await fetch(`/api/game/chapters/${id}`, { cache: "no-store" });
  const data = await res.json();
  if (!data?.ok) {
    readerTitle.textContent = "Not found";
    readerBody.textContent = "Chapter not available.";
    return;
  }
  readerTitle.textContent = `Chapter ${data.id} · ${data.title}`;
  readerSub.textContent = `Chapters 32–42`;
  readerBody.textContent = data.content || "";

  const url = new URL(window.location.href);
  url.searchParams.set("id", String(data.id));
  window.history.replaceState({}, "", url.toString());
}

async function boot() {
  await loadChapters();
  const url = new URL(window.location.href);
  const id = url.searchParams.get("id") || (chapters[0] && chapters[0].id);
  if (id) loadChapter(id);
}

refreshBtn?.addEventListener("click", () => boot());
boot();
