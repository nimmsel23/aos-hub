const grid = document.getElementById("menuGrid");
const docGrid = document.getElementById("docGrid");
const gptGrid = document.getElementById("gptGrid");
const core4Grid = document.getElementById("core4Grid");
const core4Total = document.getElementById("core4Total");
const core4Modal = document.getElementById("core4Modal");
const core4ModalTitle = document.getElementById("core4ModalTitle");
const core4ModalClose = document.getElementById("core4ModalClose");
const core4JournalInput = document.getElementById("core4JournalInput");
const core4JournalDone = document.getElementById("core4JournalDone");
const core4JournalStatus = document.getElementById("core4JournalStatus");
let core4JournalSubtask = "";
let core4JournalLog = null;

let lastHash = "";
let hadError = false;
let docsRendered = false;

function hashLinks(links) {
  return JSON.stringify(links.map(x => ({ label: x.label, url: x.url, cmd: x.cmd })));
}

async function loadMenu() {
  try {
    const res = await fetch("/menu", { cache: "no-store" });
    const data = await res.json();
    const links = Array.isArray(data?.links) ? data.links : [];
    const gptLinks = links.filter(x => /gpt/i.test(x.label || ""));
    const mainLinks = links.filter(x => !/gpt/i.test(x.label || ""));

    const h = hashLinks(links);

    // no changes → do nothing
    if (h === lastHash) return;

    // change detected → glitch (but not on first load)
    if (lastHash !== "") {
      grid.classList.add("glitching");
      setTimeout(() => grid.classList.remove("glitching"), 800);
    }

    lastHash = h;
    hadError = false;

    if (!links.length) {
      grid.innerHTML = `<div class="loading">No links configured.</div>`;
      if (gptGrid) gptGrid.innerHTML = "";
      return;
    }

    grid.innerHTML = mainLinks
      .map(x => `<a href="${x.url}" rel="noopener noreferrer">${x.label}</a>`)
      .join("");
    if (gptGrid) {
      gptGrid.innerHTML = gptLinks
        .map((x) => `<a class="gpt-card" href="${x.url}" rel="noopener noreferrer">${x.label}</a>`)
        .join("");
    }
  } catch (err) {
    if (!hadError) {
      grid.innerHTML = `<div class="loading">Menu load failed</div>`;
      if (gptGrid) gptGrid.innerHTML = "";
      hadError = true;
    }
  }
}

function renderDocButtons() {
  if (!docGrid || docsRendered) return;
  const docs = [
    { label: "Foundation", doc: "foundation" },
    { label: "Code", doc: "code" },
    { label: "Core", doc: "core" },
    { label: "Voice", doc: "voice" },
    { label: "Door", doc: "door" },
    { label: "Game", doc: "game" },
  ];

  docGrid.innerHTML = docs
    .map(
      (doc) =>
        `<a class="doc-card" href="/chapters.html?doc=${doc.doc}" rel="noopener noreferrer"><h4>${doc.label}</h4></a>`
    )
    .join("");

  docsRendered = true;
}

const core4Tasks = [
  { key: "fitness", label: "Fitness" },
  { key: "fuel", label: "Fuel" },
  { key: "meditation", label: "Meditation" },
  { key: "memoirs", label: "Memoirs" },
  { key: "partner", label: "Partner" },
  { key: "posterity", label: "Posterity" },
  { key: "discover", label: "Discover" },
  { key: "declare", label: "Declare" },
];
const core4TaskByKey = core4Tasks.reduce((acc, task) => {
  acc[task.key] = task;
  return acc;
}, {});

function updateCore4UI(data, total) {
  if (!core4Grid) return;
  const totalValue = typeof total === "number" ? total : Number(total) || 0;
  if (core4Total) core4Total.textContent = `${totalValue.toFixed(1)}/4.0`;
  core4Tasks.forEach((task) => {
    const btn = core4Grid.querySelector(`[data-subtask="${task.key}"]`);
    if (!btn) return;
    const value = Number(data?.[task.key] || 0);
    btn.classList.toggle("is-done", value >= 1);
  });
}

async function loadCore4Today() {
  if (!core4Grid) return;
  try {
    const res = await fetch("/api/core4/today", { cache: "no-store" });
    const data = await res.json();
    if (data?.ok && data?.data) {
      updateCore4UI(data.data, data.total);
    }
  } catch (_) {}
}

function renderCore4Buttons() {
  if (!core4Grid) return;
  core4Grid.innerHTML = core4Tasks
    .map(
      (task) =>
        `<button class="core4-btn" type="button" data-subtask="${task.key}">${task.label}</button>`
    )
    .join("");

  core4Grid.addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-subtask]");
    if (!btn || btn.disabled) return;
    const subtask = btn.dataset.subtask || "";
    if (!subtask) return;
    void logCore4OnOpen(subtask);
    openJournalFor(subtask);
  });
}

function setJournalStatus(message, isError = false) {
  if (!core4JournalStatus) return;
  core4JournalStatus.textContent = message;
  core4JournalStatus.dataset.state = isError ? "error" : "ok";
  if (message) {
    setTimeout(() => {
      if (core4JournalStatus.textContent === message) {
        core4JournalStatus.textContent = "";
        core4JournalStatus.dataset.state = "";
      }
    }, 2200);
  }
}

function wireCore4Journal() {
  if (!core4JournalInput || !core4JournalDone) return;
  core4JournalDone.addEventListener("click", async () => {
    const text = String(core4JournalInput.value || "").trim();
    if (!text) {
      setJournalStatus("Empty note", true);
      return;
    }
    core4JournalDone.disabled = true;
    try {
      const meta = core4TaskByKey[core4JournalSubtask] || null;
      let core4Data =
        core4JournalLog && core4JournalLog.subtask === core4JournalSubtask
          ? core4JournalLog.data
          : null;
      if (!core4Data?.ok) {
        const core4Res = await fetch("/api/core4", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subtask: core4JournalSubtask, value: 1 }),
        });
        core4Data = await core4Res.json().catch(() => ({}));
      }

      const taskUuid = core4Data?.taskwarrior?.uuid || "";
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          source: "index-core4",
          subtask: core4JournalSubtask,
          task_uuid: taskUuid,
          task_label: meta ? meta.label : "",
          tags: ["core4", core4JournalSubtask].filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.ok) {
        core4JournalInput.value = "";
        setJournalStatus("Saved");
        if (core4Data?.ok && core4Data?.data) {
          updateCore4UI(core4Data.data, core4Data.total);
        } else {
          await loadCore4Today();
        }
        closeJournal();
      } else {
        setJournalStatus("Save failed", true);
      }
    } catch (_) {
      setJournalStatus("Save failed", true);
    } finally {
      core4JournalDone.disabled = false;
    }
  });

  core4JournalInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      core4JournalDone.click();
    }
  });

  if (core4ModalClose) {
    core4ModalClose.addEventListener("click", () => closeJournal());
  }
  if (core4Modal) {
    core4Modal.addEventListener("click", (event) => {
      if (event.target === core4Modal) closeJournal();
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeJournal();
  });
}

async function logCore4OnOpen(subtask) {
  core4JournalLog = { subtask, data: null };
  try {
    const res = await fetch("/api/core4", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtask, value: 1 }),
    });
    const data = await res.json().catch(() => ({}));
    core4JournalLog = { subtask, data };
    if (data?.ok && data?.data) {
      updateCore4UI(data.data, data.total);
    } else {
      await loadCore4Today();
    }
  } catch (_) {
    core4JournalLog = { subtask, data: null };
  }
}

function openJournalFor(subtask) {
  if (!core4JournalInput || !core4Modal) return;
  const meta = core4TaskByKey[subtask];
  core4JournalSubtask = subtask;
  if (meta) {
    core4JournalInput.placeholder = `Journal for ${meta.label}...`;
    if (core4ModalTitle) {
      core4ModalTitle.textContent = `Core4 Journal – ${meta.label}`;
    }
  } else if (core4ModalTitle) {
    core4ModalTitle.textContent = "Core4 Journal";
  }
  core4Modal.classList.add("is-open");
  core4Modal.setAttribute("aria-hidden", "false");
  core4JournalInput.focus();
}

function closeJournal() {
  if (!core4Modal) return;
  core4Modal.classList.remove("is-open");
  core4Modal.setAttribute("aria-hidden", "true");
}

loadMenu();
setInterval(loadMenu, 1500);
renderDocButtons();
renderCore4Buttons();
loadCore4Today();
wireCore4Journal();
