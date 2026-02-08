// Shared helpers for gas-game-dev (standalone multi-user).

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function gameGetProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function gameSetProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

function game_getWebUrl_() {
  const props = PropertiesService.getScriptProperties();
  const configured = String(props.getProperty("GAME_WEBAPP_URL") || "").trim();
  if (configured) return configured;
  try {
    return String(ScriptApp.getService().getUrl() || "").trim();
  } catch (_) {
    return "";
  }
}

