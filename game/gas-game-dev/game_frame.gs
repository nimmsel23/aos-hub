// Frame Centre (standalone)

function saveFrameEntry(domain, answers, userKey) {
  const key = String(userKey || "").trim();
  return game_withUserKey_(key, function() {
    return saveFrameEntry_(domain, answers);
  });
}

function saveFrameEntry_(domain, answers) {
  const dom = String(domain || "").trim();
  const a = answers || {};
  if (!dom) return { ok: false, error: "domain missing" };
  if (!a || !String(a.whereNow || "").trim()) {
    return { ok: false, error: "Where am I now? required" };
  }

  gameEnsureWorkspaceFolders_();
  const folder = gameGetCentreFolder_("Frame");
  const entries = gameGetOrCreateSubfolder_(folder, "Entries");

  const sessionId = gameGenerateSessionId_("FRM");
  const dateFormatted = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd.MM.yyyy");

  const header = [
    "# FRAME MAP \u2013 " + dom,
    "**Session:** " + sessionId,
    "**Date:** " + dateFormatted,
    "",
    "---",
    ""
  ].join("\n");

  const body = [
    "**1. Where am I now?**",
    String(a.whereNow || "-"),
    "",
    "**2. How did I get here?**",
    String(a.howGotHere || "-"),
    "",
    "**3. How do I feel about where I am?**",
    String(a.howFeel || "-"),
    "",
    "**4. What is working?**",
    String(a.whatWorking || "-"),
    "",
    "**5. What is not working?**",
    String(a.whatNotWorking || "-")
  ].join("\n");

  const filename = sessionId + "_" + dom + ".md";
  const file = entries.createFile(filename, header + body + "\n", MimeType.PLAIN_TEXT);

  return {
    ok: true,
    sessionId: sessionId,
    domain: dom,
    file: { id: file.getId(), name: file.getName(), url: file.getUrl() }
  };
}

