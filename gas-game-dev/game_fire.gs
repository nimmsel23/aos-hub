// Fire Centre (standalone) - weekly export only (no TickTick).

function saveFireWeek(week, focusMonth, strikesByDomain, userKey) {
  const key = String(userKey || "").trim();
  return game_withUserKey_(key, function() {
    return saveFireWeek_(week, focusMonth, strikesByDomain);
  });
}

function saveFireWeek_(week, focusMonth, strikesByDomain) {
  const wk = String(week || "").trim();
  if (!wk) return { ok: false, error: "week missing" };
  const monthName = String(focusMonth || "").trim() || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM yyyy");
  const strikes = strikesByDomain && typeof strikesByDomain === "object" ? strikesByDomain : {};

  gameEnsureWorkspaceFolders_();
  const folder = gameGetCentreFolder_("Fire");

  const now = new Date();
  const timestamp = now.toISOString();
  const dateFormatted = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd.MM.yyyy");

  const yaml = [
    "---",
    "week: " + wk,
    "date: " + dateFormatted,
    "created: " + timestamp,
    "type: fire-map",
    "status: locked",
    "focus_maps:",
    "  body: BODY_focus_" + monthName.replace(/\s+/g, "_"),
    "  being: BEING_focus_" + monthName.replace(/\s+/g, "_"),
    "  balance: BALANCE_focus_" + monthName.replace(/\s+/g, "_"),
    "  business: BUSINESS_focus_" + monthName.replace(/\s+/g, "_"),
    "tags:",
    "  - alphaos",
    "  - fire",
    "  - weekly",
    "  - " + wk,
    "---",
    ""
  ].join("\n");

  const header = [
    "# FIRE MAP - Week " + wk,
    "**Week:** " + wk,
    "**Date:** " + dateFormatted,
    "**Focus Month:** " + monthName,
    "",
    "---",
    ""
  ].join("\n");

  const domains = ["BODY", "BEING", "BALANCE", "BUSINESS"];
  const bodyBlocks = [];
  domains.forEach(function(d) {
    const key = d.toLowerCase();
    const items = Array.isArray(strikes[key]) ? strikes[key] : [];
    if (!items.length) return;
    const lines = items.map(function(s, idx) { return String(idx + 1) + ". " + String(s || "").trim(); }).join("\n");
    bodyBlocks.push("## " + d + "\n\n" + lines);
  });

  if (!bodyBlocks.length) return { ok: false, error: "no strikes" };

  const md = yaml + header + bodyBlocks.join("\n\n") + "\n";
  const filename = "fire_" + wk + ".md";
  const file = gameUpsertTextFile_(folder, filename, md);

  return { ok: true, week: wk, file: { id: file.getId(), name: file.getName(), url: file.getUrl() } };
}

