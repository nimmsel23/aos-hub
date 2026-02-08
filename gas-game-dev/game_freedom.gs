// Freedom Centre (standalone)

function saveFreedomEntry(domain, vision, period, horizon, userKey) {
  const key = String(userKey || "").trim();
  return game_withUserKey_(key, function() {
    return saveFreedomEntry_(domain, vision, period, horizon);
  });
}

function saveFreedomEntry_(domain, vision, period, horizon) {
  const dom = String(domain || "").trim().toUpperCase();
  const v = String(vision || "").trim();
  if (!dom) return { ok: false, error: "domain missing" };
  if (!v) return { ok: false, error: "vision empty" };

  const hz = String(horizon || "10Year").trim();
  const per = String(period || "").trim() || (hz === "10Year" ? "2035" : String(new Date().getFullYear() + 1));

  gameEnsureWorkspaceFolders_();
  const folder = gameGetCentreFolder_("Freedom");

  const now = new Date();
  const timestamp = now.toISOString();
  const dateFormatted = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd.MM.yyyy");

  const yaml = [
    "---",
    "domain: " + dom,
    "horizon: " + hz,
    "period: " + per,
    "date: " + dateFormatted,
    "created: " + timestamp,
    "type: freedom-map",
    "status: manifested",
    "tags:",
    "  - alphaos",
    "  - freedom",
    "  - " + dom.toLowerCase(),
    "  - " + String(hz || "").toLowerCase(),
    "---",
    ""
  ].join("\n");

  const md = [
    yaml,
    "# FREEDOM MAP \u2013 " + dom,
    "**Horizon:** " + hz,
    "**Period:** " + per,
    "**Date:** " + dateFormatted,
    "",
    "---",
    "",
    "## VISION",
    "",
    v,
    ""
  ].join("\n");

  const filename = dom + "_freedom_" + per + ".md";
  const file = gameUpsertTextFile_(folder, filename, md);

  return {
    ok: true,
    domain: dom,
    horizon: hz,
    period: per,
    file: { id: file.getId(), name: file.getName(), url: file.getUrl() }
  };
}

