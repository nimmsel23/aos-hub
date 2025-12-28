document.addEventListener("DOMContentLoaded", () => {
  const content = document.getElementById("chapterContent");
  const toc = document.getElementById("chapterToc");
  const title = document.getElementById("chapterTitle");

  const params = new URLSearchParams(window.location.search);
  const doc = params.get("doc") || "door";

  const labels = {
    foundation: "The Foundation",
    code: "The Code",
    core: "The Core",
    door: "The Door",
    game: "The Game",
    voice: "The Voice",
  };

  if (title) title.textContent = labels[doc] || "Chapters";

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/gi, "-");
  }

  function buildToc(container, tocEl) {
    if (!tocEl || !container) return;
    tocEl.innerHTML = "";
    const headings = container.querySelectorAll("h1, h2, h3");
    headings.forEach((heading) => {
      const text = heading.textContent.trim();
      if (!text) return;
      if (!heading.id) heading.id = slugify(text);
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent = text;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.getElementById(heading.id)?.scrollIntoView({ behavior: "smooth" });
      });
      tocEl.append(link);
    });
  }

  async function load() {
    if (!content) return;
    content.innerHTML = "<p>Loading…</p>";
    try {
      const res = await fetch(`/api/doc?name=${encodeURIComponent(doc)}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data || !data.ok || !data.content) {
        throw new Error(data?.error || `missing doc (${res.status})`);
      }
      content.innerHTML = window.marked ? marked.parse(data.content) : data.content;
      buildToc(content, toc);
    } catch (err) {
      content.innerHTML = `<p>Unable to load document: ${err}</p>`;
    }
  }

  load();
});
