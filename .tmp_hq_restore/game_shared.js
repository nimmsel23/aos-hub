function gameGetUserProp_(key) {
  return PropertiesService.getUserProperties().getProperty(key);
}

function gameSetUserProp_(key, value) {
  PropertiesService.getUserProperties().setProperty(key, value);
}

function gameGetOrCreateSubfolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function gameGetAlphaGameRoot_() {
  var it = DriveApp.getFoldersByName('Alpha_Game');
  return it.hasNext() ? it.next() : DriveApp.createFolder('Alpha_Game');
}

function gameGenerateSessionId_(prefix) {
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  return String(prefix || 'GAME') + '-' + stamp;
}
