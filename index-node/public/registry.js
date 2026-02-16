const els = {
  meta: document.getElementById("registryMeta"),
  status: document.getElementById("registryStatus"),
  list: document.getElementById("registryList"),
  kinds: document.getElementById("registryKinds"),
  search: document.getElementById("registrySearch"),
  reload: document.getElementById("registryReload"),
};

const state = {
  items: [],
  kind: "all",
  query: "",
  sourcePath: "",
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function kindCounts(items) {
  const map = new Map();
  items.forEach((item) => {
    const k = String(item.kind || "other").trim() || "other";
    map.set(k, (map.get(k) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function filterItems() {
  const query = state.query.trim().toLowerCase();
  return state.items.filter((item) => {
    if (state.kind !== "all" && item.kind !== state.kind) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = `${item.id} ${item.label} ${item.cmd} ${item.kind} ${item.source} ${item.desc}`
      .toLowerCase();
    return haystack.includes(query);
  });
}

function renderKinds() {
  const counts = kindCounts(state.items);
  const total = state.items.length;

  const chips = [
    `<button class="registry-kind-btn ${state.kind === "all" ? "active" : ""}" data-kind="all">all (${total})</button>`,
    ...counts.map(([kind, count]) => {
      const active = state.kind === kind ? "active" : "";
      return `<button class="registry-kind-btn ${active}" data-kind="${escapeHtml(kind)}">${escapeHtml(kind)} (${count})</button>`;
    }),
  ];

  els.kinds.innerHTML = chips.join("");
  els.kinds.querySelectorAll("[data-kind]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.kind = btn.getAttribute("data-kind") || "all";
      render();
    });
  });
}

function renderCards(items) {
  if (!items.length) {
    els.list.innerHTML = "";
    els.status.textContent = "No registry entries for this filter.";
    return;
  }

  els.list.innerHTML = items
    .map((item) => {
      const label = escapeHtml(item.label || item.id);
      const id = escapeHtml(item.id);
      const cmd = escapeHtml(item.cmd);
      const kind = escapeHtml(item.kind || "other");
      const source = escapeHtml(item.source || "-");
      const desc = escapeHtml(item.desc || "");
      const hasDesc = Boolean(desc);

      return `
        <article class="registry-card">
          <h2>${label}</h2>
          <div class="registry-card-meta">
            <span>${kind}</span>
            <span>${source}</span>
            <span>${id}</span>
          </div>
          <code>${cmd}</code>
          ${hasDesc ? `<p>${desc}</p>` : ""}
        </article>
      `;
    })
    .join("");

  const plural = items.length === 1 ? "entry" : "entries";
  els.status.textContent = `Showing ${items.length} ${plural}.`;
}

function render() {
  renderKinds();
  const filtered = filterItems();
  renderCards(filtered);
}

async function loadRegistry() {
  els.status.textContent = "Loading registry...";
  try {
    const res = await fetch("/api/aos/registry", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || `request failed (${res.status})`);
    }

    state.items = Array.isArray(data.items) ? data.items : [];
    state.sourcePath = String(data.path || "");
    const meta = state.sourcePath
      ? `Source: ${state.sourcePath}`
      : "Source: fish registry";
    els.meta.textContent = `${meta} | Total: ${state.items.length}`;
    render();
  } catch (err) {
    els.meta.textContent = "Registry unavailable";
    els.status.textContent = `Failed to load registry: ${String(err.message || err)}`;
    els.list.innerHTML = "";
    els.kinds.innerHTML = "";
  }
}

els.search.addEventListener("input", () => {
  state.query = els.search.value || "";
  render();
});

els.reload.addEventListener("click", () => {
  loadRegistry();
});

loadRegistry();
