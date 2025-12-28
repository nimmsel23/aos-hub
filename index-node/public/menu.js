const grid = document.getElementById("menuGrid");
const docGrid = document.getElementById("docGrid");

let lastHash = "";
let hadError = false;
let docsRendered = false;

function hashLinks(links) {
  return JSON.stringify(links.map(x => ({ label: x.label, url: x.url })));
}

async function loadMenu() {
  try {
    const res = await fetch("/menu", { cache: "no-store" });
    const data = await res.json();
    const links = Array.isArray(data?.links) ? data.links : [];

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
      return;
    }

    grid.innerHTML = links
      .map(x => `<a href="${x.url}" rel="noopener noreferrer">${x.label}</a>`)
      .join("");
  } catch (err) {
    if (!hadError) {
      grid.innerHTML = `<div class="loading">Menu load failed</div>`;
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

loadMenu();
setInterval(loadMenu, 1500);
renderDocButtons();
