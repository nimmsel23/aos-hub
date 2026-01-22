// ===================================
// αOS SINGLE GAS PROJECT
// Consolidated Hub + WebApp Backend + Task Bridge + Reflection System
// ===================================

// ================================================================
// PROJECT SETUP WRAPPER
// ================================================================
/**
 * One-shot setup helper for the single GAS project.
 * - Validates required Script Properties.
 * - Initializes optional systems if configured.
 */
function setupAlphaOSSingleProject() {
  const sp = PropertiesService.getScriptProperties();
  const primaryToken = (typeof getPrimaryBotToken_ === 'function') ? getPrimaryBotToken_() : '';
  const required = ['CHAT_ID'];

  const missing = required.filter(key => !sp.getProperty(key));
  if (!primaryToken) missing.push('TELEGRAM_BOT_TOKEN (or ALPHAOS_BOT_TOKEN / BOT_TOKEN)');

  if (missing.length) {
    Logger.log('❌ Missing properties: ' + missing.join(', '));
    return { ok: false, missing: missing };
  }

  // WebApp backend setup (requires TELEGRAM_BOT_TOKEN + TELEGRAM_SHEET_ID)
  webapp_setupTelegramWebAppBackend();

  // Task sync mapping (requires SYNC_SHEET_ID)
  if (sp.getProperty('SYNC_SHEET_ID')) {
    initializeTaskSyncMap();
  }

  // Reflection system (requires REFLECTION_SHEET_ID + REFLECTION_DRIVE_FOLDER_ID)
  if (sp.getProperty('REFLECTION_SHEET_ID') && sp.getProperty('REFLECTION_DRIVE_FOLDER_ID')) {
    initializeTaskReflectionSystem();
  }

  Logger.log('✅ setupAlphaOSSingleProject complete.');
  return { ok: true };
}
