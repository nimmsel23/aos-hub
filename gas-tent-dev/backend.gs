// ================================================================
// BACKEND UTILITIES - General's Tent Centre
// ================================================================
//
// Core utilities for standalone Tent Centre deployment.
// Provides: PROP access, run_ wrapper, cfg_ helper
//
// Pattern: Same as main GAS HQ but simplified for Tent-only usage
// ================================================================

// ----------------------------------------------------------------
// PROPERTY KEYS
// ----------------------------------------------------------------
const PROP = {
  // TickTick
  TICKTICK_TOKEN: 'TICKTICK_TOKEN',
  TICKTICK_PROJECT_ID: 'TICKTICK_PROJECT_ID',

  // Telegram
  TELEGRAM_BOT_TOKEN: 'TELEGRAM_BOT_TOKEN',
  TELEGRAM_CHAT_ID: 'TELEGRAM_CHAT_ID',

  // Integration
  BRIDGE_URL: 'BRIDGE_URL',
  VAULT_PATH: 'VAULT_PATH',

  // Centre URLs (optional)
  DOOR_CENTRE_URL: 'DOOR_CENTRE_URL',
  GAME_CENTRE_URL: 'GAME_CENTRE_URL',

  // Deployment
  WEBAPP_URL: 'TENT_WEBAPP_URL'
};

// ----------------------------------------------------------------
// PROPERTY HELPERS
// ----------------------------------------------------------------

/**
 * Get Script Property value
 * @param {string} key - Property key from PROP
 * @param {*} fallback - Default value if not set
 * @returns {string|null}
 */
function getProp_(key, fallback) {
  const props = PropertiesService.getScriptProperties();
  const val = props.getProperty(key);
  return (val != null) ? val : (fallback != null ? fallback : null);
}

/**
 * Set Script Property value
 * @param {string} key - Property key
 * @param {string} value - Value to set
 */
function setProp_(key, value) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(key, String(value || ''));
}

/**
 * Delete Script Property
 * @param {string} key - Property key to delete
 */
function delProp_(key) {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(key);
}

// ----------------------------------------------------------------
// CONFIG OBJECT
// ----------------------------------------------------------------

/**
 * Get configuration object with all settings
 * @returns {Object} Configuration
 */
function cfg_() {
  return {
    ticktick: {
      token: getProp_(PROP.TICKTICK_TOKEN),
      projectId: getProp_(PROP.TICKTICK_PROJECT_ID, 'inbox')
    },
    telegram: {
      botToken: getProp_(PROP.TELEGRAM_BOT_TOKEN),
      chatId: getProp_(PROP.TELEGRAM_CHAT_ID)
    },
    integration: {
      bridgeUrl: getProp_(PROP.BRIDGE_URL),
      vaultPath: getProp_(PROP.VAULT_PATH, 'Alpha_Tent')  // Google Drive root folder
    },
    centres: {
      door: getProp_(PROP.DOOR_CENTRE_URL),
      game: getProp_(PROP.GAME_CENTRE_URL),
      tent: getProp_(PROP.WEBAPP_URL)
    }
  };
}

// ----------------------------------------------------------------
// RUN WRAPPER (Error handling + logging)
// ----------------------------------------------------------------

/**
 * Wrapper for functions that provides consistent error handling and response format
 * @param {string} name - Function name (for logging)
 * @param {Function} fn - Function to execute
 * @returns {Object} {ok, message, data, error}
 */
function run_(name, fn) {
  const start = Date.now();
  try {
    Logger.log(`[${name}] Starting...`);
    const result = fn();
    const elapsed = Date.now() - start;
    Logger.log(`[${name}] Completed in ${elapsed}ms`);

    // Normalize response
    if (result && typeof result === 'object') {
      if (result.ok !== undefined) return result;
      return { ok: true, message: name, data: result };
    }

    return { ok: true, message: name, data: result };

  } catch (err) {
    const elapsed = Date.now() - start;
    const error = String(err);
    Logger.log(`[${name}] Failed after ${elapsed}ms: ${error}`);
    return {
      ok: false,
      error: error,
      message: `${name} failed`,
      stack: err.stack
    };
  }
}

// ----------------------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------------------

/**
 * Initialize Tent Centre (create required resources)
 */
function initTent() {
  return run_('initTent', () => {
    Logger.log('Initializing Tent Centre...');

    // Check required properties
    const required = [
      PROP.TICKTICK_TOKEN,
      PROP.TELEGRAM_BOT_TOKEN
    ];

    const missing = [];
    required.forEach(key => {
      if (!getProp_(key)) missing.push(key);
    });

    if (missing.length > 0) {
      throw new Error('Missing required properties: ' + missing.join(', '));
    }

    Logger.log('Tent Centre initialized successfully');

    return {
      status: 'initialized',
      config: cfg_(),
      timestamp: new Date().toISOString()
    };
  });
}

/**
 * Get Tent Centre status
 */
function statusTent() {
  return run_('statusTent', () => {
    const config = cfg_();

    return {
      status: 'operational',
      config: {
        ticktick: {
          configured: !!config.ticktick.token,
          projectId: config.ticktick.projectId
        },
        telegram: {
          configured: !!config.telegram.botToken,
          chatId: config.telegram.chatId
        },
        integration: {
          bridge: config.integration.bridgeUrl,
          vault: config.integration.vaultPath
        }
      },
      timestamp: new Date().toISOString()
    };
  });
}

// ----------------------------------------------------------------
// LOGGING HELPERS
// ----------------------------------------------------------------

/**
 * Log info message
 * @param {string} msg - Message to log
 */
function logInfo_(msg) {
  Logger.log('[INFO] ' + msg);
}

/**
 * Log error message
 * @param {string} msg - Error message
 * @param {Error} err - Optional error object
 */
function logError_(msg, err) {
  Logger.log('[ERROR] ' + msg);
  if (err) Logger.log(err.stack || err);
}

/**
 * Log warning message
 * @param {string} msg - Warning message
 */
function logWarn_(msg) {
  Logger.log('[WARN] ' + msg);
}
