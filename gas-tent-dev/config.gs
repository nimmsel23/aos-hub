// ================================================================
// CONFIG - General's Tent Centre
// ================================================================
//
// Configuration specific to Tent Centre.
// Uses Script Properties for sensitive data (tokens, etc.)
//
// ================================================================

/**
 * Get TickTick configuration
 * @returns {Object} TickTick config
 */
function getTickTickConfig() {
  return {
    token: getProp_(PROP.TICKTICK_TOKEN),
    projectId: getProp_(PROP.TICKTICK_PROJECT_ID, 'inbox'),
    baseUrl: 'https://api.ticktick.com/open/v1'
  };
}

/**
 * Get Telegram configuration
 * @returns {Object} Telegram config
 */
function getTelegramConfig() {
  return {
    botToken: getProp_(PROP.TELEGRAM_BOT_TOKEN),
    chatId: getProp_(PROP.TELEGRAM_CHAT_ID),
    baseUrl: 'https://api.telegram.org/bot'
  };
}

/**
 * Get integration URLs
 * @returns {Object} Integration config
 */
function getIntegrationConfig() {
  return {
    bridgeUrl: getProp_(PROP.BRIDGE_URL),
    vaultPath: getProp_(PROP.VAULT_PATH, 'AlphaOS-Vault/Alpha_Tent'),
    doorCentreUrl: getProp_(PROP.DOOR_CENTRE_URL),
    gameCentreUrl: getProp_(PROP.GAME_CENTRE_URL)
  };
}

/**
 * Tent-specific configuration
 */
const TENT_CONFIG = {
  // Week format
  weekFormat: 'YYYY-Www', // ISO week

  // Scores
  scores: {
    stack: {
      max: 7,
      tag: 'STACK'
    },
    door: {
      max: 21,
      tag: 'DOOR'
    },
    core: {
      max: 28,
      tag: 'CORE'
    }
  },

  // Digest
  digest: {
    includeTags: ['DOOR', 'STACK', 'FIRE', 'FOCUS'],
    maxTopTasks: 10,
    maxRecentTasks: 5
  },

  // Export
  export: {
    format: 'markdown',
    archiveWeeks: true
  }
};

/**
 * Get complete Tent configuration
 * @returns {Object} Complete config
 */
function getTentConfig() {
  return {
    ticktick: getTickTickConfig(),
    telegram: getTelegramConfig(),
    integration: getIntegrationConfig(),
    tent: TENT_CONFIG
  };
}
