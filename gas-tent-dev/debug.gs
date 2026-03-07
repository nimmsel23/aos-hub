// ================================================================
// DEBUG FUNCTIONS - General's Tent Centre
// ================================================================
//
// Development helpers for testing and debugging GAS Tent Centre
//
// IMPORTANT: These functions should ONLY be used in development
// Never call these from production code paths
//
// ================================================================

// ----------------------------------------------------------------
// TEST DATA GENERATORS
// ----------------------------------------------------------------

/**
 * Generate fake TickTick tasks for testing
 * @param {number} count - Number of tasks to generate
 * @param {string} week - ISO week string (e.g., "2026-W04")
 * @returns {Array} Array of fake tasks
 */
function debugGenerateFakeTasks(count = 10, week = null) {
  const now = new Date();
  const tasks = [];

  const tags = ['STACK', 'DOOR', 'FIRE', 'FOCUS', 'CORE', 'BODY', 'BEING', 'BALANCE', 'BUSINESS'];
  const titles = [
    'Complete War Stack',
    'Update Frame Map',
    'VOICE session',
    'Core4 workout',
    'Write blog post',
    'Review Door progress',
    'Fire Map update',
    'Meditation practice'
  ];

  for (let i = 0; i < count; i++) {
    const randomTag = tags[Math.floor(Math.random() * tags.length)];
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];

    tasks.push({
      id: 'fake_' + i,
      title: randomTitle + ' #' + i,
      tags: [randomTag],
      status: Math.random() > 0.5 ? 2 : 0, // 50% completed
      completedTime: Math.random() > 0.5 ? now.toISOString() : null,
      priority: Math.floor(Math.random() * 6), // 0-5
      projectId: 'fake_project'
    });
  }

  return tasks;
}

/**
 * Generate fake Tent component data (simulates Index Node response)
 * @param {string} week - ISO week string
 * @returns {Object} Fake component data
 */
function debugGenerateFakeComponent(week = null) {
  week = week || isoWeekNow_();

  return {
    week: week,
    component: {
      weekly_metrics: {
        core4: {
          BODY: 5,
          BEING: 4,
          BALANCE: 3,
          BUSINESS: 6
        },
        fire_hits: {
          BODY: { total: 3, completed: 2 },
          BEING: { total: 2, completed: 1 },
          BALANCE: { total: 4, completed: 3 },
          BUSINESS: { total: 5, completed: 4 }
        },
        war_stacks: {
          by_domain: {
            BODY: { active: 1, completed: 0 },
            BEING: { active: 0, completed: 1 },
            BALANCE: { active: 2, completed: 1 },
            BUSINESS: { active: 1, completed: 2 }
          }
        }
      },
      domain_synthesis: {
        overall_balance: 0.7,
        insights: [
          {
            severity: 'high',
            description: 'BODY domain lagging - only 5/7 Core4',
            recommendation: 'Focus on consistency this week'
          },
          {
            severity: 'medium',
            description: 'BUSINESS showing strong progress',
            recommendation: 'Maintain momentum'
          }
        ]
      },
      pipeline_synthesis: {
        overall_health: 0.8,
        issues: [
          {
            domain: 'BEING',
            stage: 'VOICE→DOOR',
            description: 'Insights not converting to War Stacks',
            correction: 'Schedule dedicated PLAN session'
          }
        ]
      },
      temporal_synthesis: {
        overall_alignment: 0.75,
        cascade_health: {
          BODY: {
            fire_to_focus: 'aligned',
            focus_to_freedom: 'partial',
            freedom_to_frame: 'blocked'
          },
          BEING: {
            fire_to_focus: 'partial',
            focus_to_freedom: 'aligned',
            freedom_to_frame: 'aligned'
          },
          BALANCE: {
            fire_to_focus: 'aligned',
            focus_to_freedom: 'aligned',
            freedom_to_frame: 'partial'
          },
          BUSINESS: {
            fire_to_focus: 'aligned',
            focus_to_freedom: 'aligned',
            freedom_to_frame: 'aligned'
          }
        }
      }
    }
  };
}

// ----------------------------------------------------------------
// COMPONENT TESTERS
// ----------------------------------------------------------------

/**
 * Test TickTick connection
 * @returns {Object} {ok, data, error}
 */
function debugTestTickTick() {
  Logger.log('🧪 Testing TickTick connection...');

  try {
    const projects = ticktickRequest_('/project', { method: 'get' });

    if (!projects) {
      return { ok: false, error: 'No response from TickTick' };
    }

    Logger.log('✅ TickTick OK - Found ' + projects.length + ' projects');
    return {
      ok: true,
      data: {
        projectCount: projects.length,
        projects: projects.map(p => ({ id: p.id, name: p.name }))
      }
    };

  } catch (err) {
    Logger.log('❌ TickTick Error: ' + err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Test Telegram connection
 * @returns {Object} {ok, data, error}
 */
function debugTestTelegram() {
  Logger.log('🧪 Testing Telegram connection...');

  try {
    const token = cfg_().telegram.botToken;
    if (!token) {
      return { ok: false, error: 'No bot token configured' };
    }

    const url = 'https://api.telegram.org/bot' + token + '/getMe';
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const data = JSON.parse(response.getContentText());

    if (!data.ok) {
      return { ok: false, error: data.description || 'Telegram API error' };
    }

    Logger.log('✅ Telegram OK - Bot: ' + data.result.username);
    return {
      ok: true,
      data: {
        botId: data.result.id,
        botUsername: data.result.username,
        botName: data.result.first_name
      }
    };

  } catch (err) {
    Logger.log('❌ Telegram Error: ' + err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Test Index Node connection (via Tailscale Funnel)
 * @returns {Object} {ok, data, error}
 */
function debugTestIndexNode() {
  Logger.log('🧪 Testing Index Node connection...');

  try {
    const indexUrl = cfg_().integration.indexNodeUrl || 'https://ideapad.tail7a15d6.ts.net';
    const url = indexUrl + '/health';

    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      timeout: 10
    });

    if (response.getResponseCode() !== 200) {
      return {
        ok: false,
        error: 'Index Node returned ' + response.getResponseCode()
      };
    }

    const data = JSON.parse(response.getContentText());
    Logger.log('✅ Index Node OK - Status: ' + data.status);

    return { ok: true, data: data };

  } catch (err) {
    Logger.log('⚠️ Index Node unreachable: ' + err);
    Logger.log('   This is expected if laptop is offline');
    return { ok: false, error: 'Index Node offline (expected)' };
  }
}

/**
 * Test Bridge connection (via Tailscale Funnel)
 * @returns {Object} {ok, data, error}
 */
function debugTestBridge() {
  Logger.log('🧪 Testing Bridge connection...');

  try {
    const bridgeUrl = cfg_().integration.bridgeUrl || 'https://ideapad.tail7a15d6.ts.net/bridge';
    const url = bridgeUrl + '/health';

    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      timeout: 10
    });

    if (response.getResponseCode() !== 200) {
      return {
        ok: false,
        error: 'Bridge returned ' + response.getResponseCode()
      };
    }

    const data = JSON.parse(response.getContentText());
    Logger.log('✅ Bridge OK - Status: ' + data.status);

    return { ok: true, data: data };

  } catch (err) {
    Logger.log('⚠️ Bridge unreachable: ' + err);
    Logger.log('   This is expected if laptop is offline');
    return { ok: false, error: 'Bridge offline (expected)' };
  }
}

// ----------------------------------------------------------------
// STATE INSPECTORS
// ----------------------------------------------------------------

/**
 * Show current configuration (safe - no tokens)
 * @returns {Object} Safe config view
 */
function debugShowConfig() {
  const config = cfg_();

  const safe = {
    ticktick: {
      configured: !!config.ticktick.token,
      projectId: config.ticktick.projectId
    },
    telegram: {
      configured: !!config.telegram.botToken,
      chatId: config.telegram.chatId ? '***' + config.telegram.chatId.slice(-4) : 'not set'
    },
    integration: {
      bridgeUrl: config.integration.bridgeUrl,
      indexNodeUrl: getProp_(PROP.INDEX_NODE_URL) || 'not set',
      vaultPath: config.integration.vaultPath
    },
    centres: {
      door: config.centres.door || 'not set',
      game: config.centres.game || 'not set',
      tent: config.centres.tent || 'not set (deploy WebApp first)'
    }
  };

  Logger.log('📋 Current Configuration:');
  Logger.log(JSON.stringify(safe, null, 2));

  return safe;
}

/**
 * Show webhook info
 * @returns {Object} Webhook status
 */
function debugShowWebhook() {
  try {
    const info = getTentWebhookInfo();
    Logger.log('🔗 Webhook Info:');
    Logger.log(JSON.stringify(info, null, 2));
    return info;
  } catch (err) {
    Logger.log('❌ Webhook check failed: ' + err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Show all Script Properties (SAFE - tokens masked)
 * @returns {Object} All properties (tokens masked)
 */
function debugShowProperties() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const safe = {};

  Object.keys(props).forEach(key => {
    if (key.includes('TOKEN')) {
      safe[key] = '***' + (props[key] || '').slice(-6);
    } else {
      safe[key] = props[key];
    }
  });

  Logger.log('🔑 Script Properties (tokens masked):');
  Logger.log(JSON.stringify(safe, null, 2));

  return safe;
}

// ----------------------------------------------------------------
// QUICK TESTS
// ----------------------------------------------------------------

/**
 * Run all component tests
 * @returns {Object} Test results
 */
function debugRunAllTests() {
  Logger.log('🧪 Running all component tests...\n');

  const results = {
    config: debugShowConfig(),
    ticktick: debugTestTickTick(),
    telegram: debugTestTelegram(),
    indexNode: debugTestIndexNode(),
    bridge: debugTestBridge()
  };

  Logger.log('\n📊 Test Summary:');
  Logger.log('  TickTick:   ' + (results.ticktick.ok ? '✅' : '❌'));
  Logger.log('  Telegram:   ' + (results.telegram.ok ? '✅' : '❌'));
  Logger.log('  Index Node: ' + (results.indexNode.ok ? '✅' : '⚠️ (offline OK)'));
  Logger.log('  Bridge:     ' + (results.bridge.ok ? '✅' : '⚠️ (offline OK)'));

  return results;
}

/**
 * Test TickTick scores calculation with fake data
 * @returns {Object} Test scores
 */
function debugTestScoresCalculation() {
  Logger.log('🧪 Testing scores calculation with fake data...');

  const fakeTasks = debugGenerateFakeTasks(20);
  Logger.log('Generated ' + fakeTasks.length + ' fake tasks');

  // Manually calculate scores from fake data
  const stackTasks = fakeTasks.filter(t => t.tags.includes('STACK') && t.status === 2);
  const doorTasks = fakeTasks.filter(t => t.tags.includes('DOOR') && t.status === 2);
  const coreTasks = fakeTasks.filter(t => t.tags.includes('CORE') && t.status === 2);

  const scores = {
    stack: {
      completed: stackTasks.length,
      max: 7,
      percentage: Math.min(100, Math.round(stackTasks.length / 7 * 100))
    },
    door: {
      completed: doorTasks.length,
      max: 21,
      percentage: Math.min(100, Math.round(doorTasks.length / 21 * 100))
    },
    core: {
      completed: coreTasks.length,
      max: 28,
      percentage: Math.min(100, Math.round(coreTasks.length / 28 * 100))
    }
  };

  Logger.log('📊 Fake Scores:');
  Logger.log('  STACK: ' + scores.stack.completed + '/7 (' + scores.stack.percentage + '%)');
  Logger.log('  DOOR:  ' + scores.door.completed + '/21 (' + scores.door.percentage + '%)');
  Logger.log('  CORE:  ' + scores.core.completed + '/28 (' + scores.core.percentage + '%)');

  return scores;
}

/**
 * Test Tent message formatting with fake data
 * @returns {string} Formatted message
 */
function debugTestTentMessageFormat() {
  Logger.log('🧪 Testing Tent message formatting...');

  const fakeData = debugGenerateFakeComponent();
  const message = formatTentMessage(fakeData);

  Logger.log('📝 Formatted Message:');
  Logger.log(message);

  return message;
}

/**
 * Test weekly digest builder with fake data
 * @returns {Object} Digest result
 */
function debugTestDigestBuilder() {
  Logger.log('🧪 Testing digest builder with fake data...');

  const week = isoWeekNow_();

  // Mock TickTick scores
  const ttScores = {
    stack: { completed: 5, max: 7, percentage: 71 },
    door: { completed: 15, max: 21, percentage: 71 },
    core: { completed: 22, max: 28, percentage: 79 }
  };

  // Mock TickTick summary
  const ttSummary = {
    week: week,
    topCompleted: [
      { title: 'Complete War Stack', tags: ['STACK'], completedTime: new Date() },
      { title: 'Update Frame Map', tags: ['FIRE'], completedTime: new Date() }
    ],
    recentOpen: [
      { title: 'Review Door progress', tags: ['DOOR'], priority: 5 }
    ]
  };

  // Mock Tent intelligence
  const tentData = debugGenerateFakeComponent(week);

  const digest = {
    week: week,
    sources: {
      ticktick_scores: ttScores,
      ticktick_summary: ttSummary,
      tent_intelligence: tentData
    }
  };

  // Build markdown
  let md = `# 🏛️ GENERAL'S TENT - Week ${week}\n\n`;
  md += `## 📊 Weekly Scores (TickTick)\n\n`;
  md += `- **STACK:** ${ttScores.stack.completed}/${ttScores.stack.max} (${ttScores.stack.percentage}%)\n`;
  md += `- **DOOR:** ${ttScores.door.completed}/${ttScores.door.max} (${ttScores.door.percentage}%)\n`;
  md += `- **CORE:** ${ttScores.core.completed}/${ttScores.core.max} (${ttScores.core.percentage}%)\n\n`;

  md += `## 🚨 Strategic Intelligence\n\n`;
  if (tentData.component.domain_synthesis.insights.length > 0) {
    tentData.component.domain_synthesis.insights.forEach(insight => {
      md += `- **[${insight.severity.toUpperCase()}]** ${insight.description}\n`;
      md += `  → ${insight.recommendation}\n\n`;
    });
  }

  digest.markdown = md;

  Logger.log('📝 Digest Markdown:');
  Logger.log(md);

  return digest;
}

// ----------------------------------------------------------------
// RESET FUNCTIONS
// ----------------------------------------------------------------

/**
 * Clear webhook (useful for testing)
 * @returns {Object} Result
 */
function debugClearWebhook() {
  Logger.log('🧹 Clearing Telegram webhook...');

  try {
    const token = cfg_().telegram.botToken;
    const url = 'https://api.telegram.org/bot' + token + '/deleteWebhook?drop_pending_updates=true';

    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());

    if (data.ok) {
      Logger.log('✅ Webhook cleared');
      return { ok: true };
    } else {
      Logger.log('❌ Failed to clear webhook: ' + data.description);
      return { ok: false, error: data.description };
    }

  } catch (err) {
    Logger.log('❌ Error: ' + err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Clear TentReports sheet (for testing)
 * WARNING: This deletes all archived reports!
 * @returns {Object} Result
 */
function debugClearTentReports() {
  Logger.log('⚠️ WARNING: Clearing TentReports sheet...');

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(TENT_INTELLIGENCE_CONFIG.SHEET_NAME);

    if (!sheet) {
      Logger.log('Sheet not found');
      return { ok: true, message: 'Sheet does not exist' };
    }

    // Delete all rows except header
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
      Logger.log('✅ Cleared ' + (lastRow - 1) + ' reports');
    } else {
      Logger.log('Sheet already empty');
    }

    return { ok: true };

  } catch (err) {
    Logger.log('❌ Error: ' + err);
    return { ok: false, error: String(err) };
  }
}
