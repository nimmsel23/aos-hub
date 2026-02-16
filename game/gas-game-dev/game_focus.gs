// Focus Centre (standalone)

function getFocusState(userKey) {
  const key = String(userKey || "").trim();
  return game_withUserKey_(key, function() {
    return getFocusState_();
  });
}

function getFocusState_() {
  gameEnsureWorkspaceFolders_();
  const folder = gameGetCentreFolder_("Focus");
  const file = gameFindFileByName_(folder, ".focus-state.json");
  if (!file) {
    return {
      ok: true,
      states: {
        BODY: { domain: "BODY", month: "current", habits: "", routines: "", additions: "", eliminations: "", lastUpdated: null },
        BEING: { domain: "BEING", month: "current", habits: "", routines: "", additions: "", eliminations: "", lastUpdated: null },
        BALANCE: { domain: "BALANCE", month: "current", habits: "", routines: "", additions: "", eliminations: "", lastUpdated: null },
        BUSINESS: { domain: "BUSINESS", month: "current", habits: "", routines: "", additions: "", eliminations: "", lastUpdated: null }
      }
    };
  }
  try {
    const raw = file.getBlob().getDataAsString();
    const parsed = raw ? JSON.parse(raw) : {};
    return { ok: true, states: parsed && typeof parsed === "object" ? parsed : {} };
  } catch (e) {
    return { ok: true, states: {} };
  }
}

function saveFocusState(domain, month, habits, routines, additions, eliminations, userKey) {
  const key = String(userKey || "").trim();
  return game_withUserKey_(key, function() {
    return saveFocusState_(domain, month, habits, routines, additions, eliminations);
  });
}

function saveFocusState_(domain, month, habits, routines, additions, eliminations) {
  const dom = String(domain || "").trim().toUpperCase();
  const phase = String(month || "current").trim().toLowerCase();
  if (!dom) return { ok: false, error: "invalid domain" };

  const folder = gameGetCentreFolder_("Focus");
  const file = gameFindFileByName_(folder, ".focus-state.json");
  let states = {};
  if (file) {
    try {
      states = JSON.parse(file.getBlob().getDataAsString() || "{}") || {};
    } catch (_) {
      states = {};
    }
  }

  states[dom] = {
    domain: dom,
    month: phase,
    habits: String(habits || ""),
    routines: String(routines || ""),
    additions: String(additions || ""),
    eliminations: String(eliminations || ""),
    lastUpdated: new Date().toISOString()
  };

  gameUpsertTextFile_(folder, ".focus-state.json", JSON.stringify(states, null, 2));
  return { ok: true, domain: dom, lastUpdated: states[dom].lastUpdated };
}

function saveFocusEntry(domain, mission, monthLabel, phase, userKey) {
  const key = String(userKey || "").trim();
  return game_withUserKey_(key, function() {
    return saveFocusEntry_(domain, mission, monthLabel, phase);
  });
}

function saveFocusEntry_(domain, mission, monthLabel, phase) {
  const dom = String(domain || "").trim().toUpperCase();
  const m = mission || {};
  const month = String(monthLabel || "").trim();
  const ph = String(phase || "current").trim().toLowerCase();

  const h = String(m.habits || "").trim();
  const r = String(m.routines || "").trim();
  const a = String(m.additions || "").trim();
  const e = String(m.eliminations || "").trim();
  if (!dom) return { ok: false, error: "invalid domain" };
  if (!h || !r || !a || !e) return { ok: false, error: "all four pillars required" };

  const now = new Date();
  const timestamp = now.toISOString();
  const dateFormatted = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd.MM.yyyy");

  const yaml = [
    "---",
    "domain: " + dom,
    "month: " + month,
    "phase: " + ph,
    "date: " + dateFormatted,
    "created: " + timestamp,
    "type: focus-map",
    "status: locked",
    "tags:",
    "  - alphaos",
    "  - focus",
    "  - " + dom.toLowerCase(),
    "  - " + ph,
    "---",
    ""
  ].join("\n");

  const header = [
    "# FOCUS MAP \u2013 " + dom,
    "**Month:** " + month,
    "**Phase:** " + ph,
    "**Date:** " + dateFormatted,
    "",
    "---",
    ""
  ].join("\n");

  const body = [
    "## HABITS",
    h,
    "",
    "## ROUTINES",
    r,
    "",
    "## ADDITIONS",
    a,
    "",
    "## ELIMINATIONS",
    e,
    ""
  ].join("\n");

  const md = yaml + header + body;

  // Cascade-critical filename base.
  // Prefer {DOMAIN}_focus_{Month}_{Year} (Month label expected like "January 2026").
  const safeMonth = month.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "_");
  const filename = dom + "_focus_" + safeMonth + ".md";

  const folder = gameGetCentreFolder_("Focus");
  const file = gameUpsertTextFile_(folder, filename, md);

  return { ok: true, file: { id: file.getId(), name: file.getName(), url: file.getUrl() } };
}

function listFocusEntries(domain, phase, userKey) {
  const key = String(userKey || "").trim();
  return game_withUserKey_(key, function() {
    return listFocusEntries_(domain, phase);
  });
}

function listFocusEntries_(domain, phase) {
  const dom = String(domain || "").trim().toUpperCase();
  const ph = String(phase || "").trim().toLowerCase();
  const folder = gameGetCentreFolder_("Focus");

  const files = folder.getFiles();
  const maps = [];
  while (files.hasNext()) {
    const f = files.next();
    const name = f.getName();
    if (!/\.md$/i.test(name)) continue;

    let metaDomain = "";
    let metaPhase = "";
    try {
      const content = f.getBlob().getDataAsString();
      const m = content.match(/^---\n([\s\S]*?)\n---/);
      if (m) {
        const head = m[1];
        const dm = head.match(/^domain:\s*(.+)$/mi);
        const pm = head.match(/^phase:\s*(.+)$/mi);
        metaDomain = dm ? String(dm[1] || "").trim().toUpperCase() : "";
        metaPhase = pm ? String(pm[1] || "").trim().toLowerCase() : "";
      }
    } catch (_) {}

    const out = {
      filename: name,
      domain: metaDomain,
      phase: metaPhase,
      modified: f.getLastUpdated().toISOString()
    };

    if (dom && out.domain !== dom) continue;
    if (ph && out.phase !== ph) continue;
    maps.push(out);
  }

  maps.sort(function(a, b) {
    return new Date(b.modified).getTime() - new Date(a.modified).getTime();
  });

  return { ok: true, maps: maps };
}

function loadFocusEntry(filename, userKey) {
  const key = String(userKey || "").trim();
  return game_withUserKey_(key, function() {
    return loadFocusEntry_(filename);
  });
}

function loadFocusEntry_(filename) {
  const name = String(filename || "").trim();
  if (!name) return { ok: false, error: "missing filename" };
  const folder = gameGetCentreFolder_("Focus");
  const file = gameFindFileByName_(folder, name);
  if (!file) return { ok: false, error: "file not found" };
  const content = file.getBlob().getDataAsString();
  return {
    ok: true,
    content: content,
    filename: file.getName(),
    url: file.getUrl(),
    modified: file.getLastUpdated().toISOString()
  };
}

