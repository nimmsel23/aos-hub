/*******************************
 * αOS Game Centre – Standalone Dev (multi-user)
 *******************************/

function game_templateForPage_(page) {
  const p = String(page || "").trim().toLowerCase();
  if (!p || p === "index" || p === "home") return "Index";
  if (p === "frame") return "Frame";
  if (p === "freedom") return "Freedom";
  if (p === "focus") return "Focus";
  if (p === "fire") return "Fire";
  return "Index";
}

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const page = String(params.page || "index").trim().toLowerCase();
  const action = String(params.action || "").trim().toLowerCase();
  const rawKey = params.k || params.key || params.userKey || params.user_key || "";

  if (action === "health" || page === "health") {
    const base = gameGetBaseFolder_();
    const out = {
      ok: true,
      now: new Date().toISOString(),
      baseFolder: { id: base.getId(), name: base.getName() }
    };
    return ContentService
      .createTextOutput(JSON.stringify(out))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const t = HtmlService.createTemplateFromFile(game_templateForPage_(page));
  t.baseUrl = game_getWebUrl_();
  t.userKey = game_normalizeUserKey_(rawKey);
  t.page = page;

  return t.evaluate()
    .setTitle("αOS Game Centre")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

