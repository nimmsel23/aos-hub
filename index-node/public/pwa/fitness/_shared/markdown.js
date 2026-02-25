import { escapeHtml } from "./util.js";

// Minimal Markdown renderer for journaling.
// Intent: keep it dependency-free and safe (escape HTML).
export function renderMarkdown(md) {
  const lines = String(md).replaceAll("\r\n", "\n").split("\n");
  const out = [];

  let inCode = false;
  let codeLang = "";
  let listOpen = false;

  const closeList = () => {
    if (listOpen) out.push("</ul>");
    listOpen = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    if (raw.startsWith("```")) {
      if (!inCode) {
        closeList();
        inCode = true;
        codeLang = raw.slice(3).trim();
        out.push(`<pre class="md-pre"><code class="language-${escapeHtml(codeLang)}">`);
      } else {
        inCode = false;
        out.push("</code></pre>");
        codeLang = "";
      }
      continue;
    }

    if (inCode) {
      out.push(escapeHtml(raw) + "\n");
      continue;
    }

    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      out.push('<div class="md-sp"></div>');
      continue;
    }

    const mH = /^(#{1,3})\s+(.*)$/.exec(line);
    if (mH) {
      closeList();
      const lvl = mH[1].length;
      out.push(`<h${lvl} class="md-h${lvl}">${escapeHtml(mH[2])}</h${lvl}>`);
      continue;
    }

    const mLi = /^-\s+(.*)$/.exec(line);
    if (mLi) {
      if (!listOpen) out.push('<ul class="md-ul">');
      listOpen = true;
      out.push(`<li>${escapeHtml(mLi[1])}</li>`);
      continue;
    }

    closeList();
    out.push(`<p class="md-p">${escapeHtml(line)}</p>`);
  }

  closeList();
  if (inCode) out.push("</code></pre>");
  return out.join("");
}

