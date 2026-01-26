/**
 * TENT.GS - General's Tent Strategic Intelligence Bot
 *
 * Receives Tent synthesis from Bridge (when laptop online)
 * Stores in Sheet "TentReports"
 * Sends weekly Telegram reports (Sunday 20:00) - works 24/7 even when laptop offline
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const TENT_CONFIG = {
  SHEET_NAME: 'TentReports',
  TELEGRAM_BOT_TOKEN: PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN'),
  TELEGRAM_CHAT_ID: PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID'),
  INDEX_NODE_URL: 'http://127.0.0.1:8799', // via Bridge
  BRIDGE_URL: PropertiesService.getScriptProperties().getProperty('BRIDGE_URL') || 'http://127.0.0.1:8080'
};

// ============================================================================
// SHEET MANAGEMENT
// ============================================================================

/**
 * Get or create TentReports sheet
 */
function getTentReportsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TENT_CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(TENT_CONFIG.SHEET_NAME);

    // Header row
    sheet.appendRow([
      'Week',
      'Timestamp',
      'Domain_Health',
      'Strategic_Insights',
      'Pipeline_Issues',
      'Cascade_Health',
      'Overall_Score',
      'Raw_JSON'
    ]);

    // Format header
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    sheet.setFrozenRows(1);

    Logger.log('✅ Created TentReports sheet');
  }

  return sheet;
}

/**
 * Save Tent data to sheet
 */
function saveTentReport(week, data) {
  const sheet = getTentReportsSheet();

  try {
    // Extract key metrics
    const component = data.component || {};
    const domainSynthesis = component.domain_synthesis || {};
    const pipelineSynthesis = component.pipeline_synthesis || {};
    const temporalSynthesis = component.temporal_synthesis || {};

    // Domain health summary
    const domainHealth = Object.keys(domainSynthesis.domain_health || {})
      .map(domain => {
        const dh = domainSynthesis.domain_health[domain];
        return `${domain}:${dh.core4_week || 0}/7`;
      })
      .join(', ');

    // Strategic insights count
    const insightsCount = (domainSynthesis.insights || []).length;
    const insightsSummary = `${insightsCount} insights`;

    // Pipeline issues count
    const issuesCount = (pipelineSynthesis.issues || []).length;
    const issuesSummary = `${issuesCount} blockages`;

    // Cascade health summary
    const cascadeHealth = temporalSynthesis.overall_alignment || 0;

    // Overall score (simple average)
    const overallScore = calculateOverallScore(component);

    // Save row
    sheet.appendRow([
      week,
      new Date(),
      domainHealth,
      insightsSummary,
      issuesSummary,
      cascadeHealth,
      overallScore,
      JSON.stringify(data)
    ]);

    Logger.log(`✅ Saved Tent report for ${week}`);
    return true;

  } catch (err) {
    Logger.log(`❌ Error saving Tent report: ${err}`);
    return false;
  }
}

/**
 * Get latest Tent report from sheet
 */
function getLatestTentReport() {
  const sheet = getTentReportsSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  const row = sheet.getRange(lastRow, 1, 1, 8).getValues()[0];

  try {
    return {
      week: row[0],
      timestamp: row[1],
      domain_health: row[2],
      strategic_insights: row[3],
      pipeline_issues: row[4],
      cascade_health: row[5],
      overall_score: row[6],
      raw_data: JSON.parse(row[7])
    };
  } catch (err) {
    Logger.log(`❌ Error parsing latest report: ${err}`);
    return null;
  }
}

/**
 * Calculate overall score from component data
 */
function calculateOverallScore(component) {
  try {
    const domainSynthesis = component.domain_synthesis || {};
    const pipelineSynthesis = component.pipeline_synthesis || {};

    const overallBalance = domainSynthesis.overall_balance || 0;
    const overallPipeline = pipelineSynthesis.overall_health || 0;

    return Math.round((overallBalance + overallPipeline) / 2 * 100);
  } catch (err) {
    return 0;
  }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch fresh Tent data from Index Node (via Bridge)
 */
function fetchTentDataFromIndex(week) {
  // Try to reach Index Node via Bridge
  try {
    const url = `${TENT_CONFIG.INDEX_NODE_URL}/api/tent/component/return-report?week=${week}`;

    // This won't work directly from GAS to localhost
    // Need to go through Bridge proxy
    const bridgeUrl = `${TENT_CONFIG.BRIDGE_URL}/bridge/tent/fetch?week=${week}`;

    const response = UrlFetchApp.fetch(bridgeUrl, {
      method: 'get',
      muteHttpExceptions: true,
      timeout: 10
    });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      Logger.log(`✅ Fetched fresh Tent data from Index Node for ${week}`);
      return data;
    } else {
      Logger.log(`⚠️ Index Node unreachable: ${response.getResponseCode()}`);
      return null;
    }

  } catch (err) {
    Logger.log(`⚠️ Failed to fetch from Index Node: ${err}`);
    return null;
  }
}

/**
 * Get Tent data (fresh from Index or cached from Sheet)
 */
function getTentData(week) {
  // Try fresh data first
  const fresh = fetchTentDataFromIndex(week);
  if (fresh) {
    // Save to sheet for future fallback
    saveTentReport(week, fresh);
    return fresh;
  }

  // Fallback to cached data
  Logger.log('⚠️ Using cached Tent data from Sheet');
  const cached = getLatestTentReport();

  if (cached && cached.week === week) {
    return cached.raw_data;
  }

  return null;
}

// ============================================================================
// MESSAGE FORMATTING
// ============================================================================

/**
 * Format domain health line
 */
function formatDomainHealthLine(domain, voiceCount, warStacks, fireHits, core4) {
  // Status emoji
  let status;
  if (warStacks > 0 && fireHits > 0 && core4 >= 6) {
    status = '🟢 STRONG';
  } else if (warStacks > 0 || fireHits > 0 || core4 >= 4) {
    status = '🟡 PARTIAL';
  } else {
    status = '🔴 BLOCKED';
  }

  const domainPadded = (domain + '        ').substring(0, 8);
  const core4Padded = (core4 + '/7  ').substring(0, 4);

  return `\`${domainPadded}  ${voiceCount}→${warStacks}→${fireHits}  ${core4Padded} ${status}\``;
}

/**
 * Format full Tent message for Telegram
 */
function formatTentMessage(data) {
  const component = data.component || {};
  const week = data.week || getCurrentWeek();

  let msg = `🏛️ *GENERAL'S TENT* - Week \`${week}\`\n\n`;

  // Domain Health Matrix
  msg += '📊 *DOMAIN HEALTH MATRIX:*\n';
  msg += '`Domain    V→D→F  Core4  Status`\n';
  msg += '`────────────────────────────────────`\n';

  const metrics = component.weekly_metrics || {};
  const domains = ['BODY', 'BEING', 'BALANCE', 'BUSINESS'];

  // Voice counts (from synthesis or hardcoded for now)
  const voiceMap = {
    'BODY': 6,
    'BEING': 4,
    'BALANCE': 8,
    'BUSINESS': 6
  };

  domains.forEach(domain => {
    const voiceCount = voiceMap[domain] || 0;
    const core4 = (metrics.core4 || {})[domain] || 0;
    const fireData = (metrics.fire_hits || {})[domain] || {};
    const fireHits = fireData.total || 0;
    const warStacks = ((metrics.war_stacks || {}).by_domain || {})[domain] || {};
    const wsActive = warStacks.active || 0;

    msg += formatDomainHealthLine(domain, voiceCount, wsActive, fireHits, core4) + '\n';
  });

  msg += '\n';

  // Strategic Insights
  const insights = (component.domain_synthesis || {}).insights || [];
  if (insights.length > 0) {
    msg += '🚨 *STRATEGIC INTELLIGENCE:*\n';

    insights.slice(0, 3).forEach(insight => {
      const severityEmoji = {
        'high': '🔴',
        'medium': '🟡',
        'low': '🟢'
      }[insight.severity] || '⚪';

      msg += `${severityEmoji} ${insight.description}\n`;
      msg += `   → _${insight.recommendation}_\n\n`;
    });
  }

  // Pipeline Issues
  const pipelineIssues = (component.pipeline_synthesis || {}).issues || [];
  if (pipelineIssues.length > 0) {
    msg += '⚠️ *PIPELINE BLOCKAGES:*\n';

    pipelineIssues.slice(0, 2).forEach(issue => {
      msg += `• ${issue.domain} ${issue.stage}: ${issue.description}\n`;
      msg += `   ✅ ${issue.correction}\n\n`;
    });
  }

  // Cascade Health
  const cascade = (component.temporal_synthesis || {}).cascade_health || {};
  msg += '📈 *CASCADE ALIGNMENT:*\n';
  msg += '`Fire→Focus→Freedom→Frame`\n';

  domains.forEach(domain => {
    const domainCascade = cascade[domain] || {};
    const ff = domainCascade.fire_to_focus || 'unknown';
    const ff2 = domainCascade.focus_to_freedom || 'unknown';
    const ff3 = domainCascade.freedom_to_frame || 'unknown';

    const emojiMap = {
      'aligned': '🟢',
      'partial': '🟡',
      'blocked': '🔴',
      'unknown': '⚪'
    };

    const e1 = emojiMap[ff] || '⚪';
    const e2 = emojiMap[ff2] || '⚪';
    const e3 = emojiMap[ff3] || '⚪';

    const domainPadded = (domain + '        ').substring(0, 8);
    msg += `\`${domainPadded}  ${e1}   ${e2}      ${e3}      ⚪\`\n`;
  });

  msg += '\n';

  // Footer
  msg += '💾 Full report: http://127.0.0.1:8799/tent\n';
  msg += 'React with ✅ when reviewed';

  return msg;
}

// ============================================================================
// TELEGRAM SENDING
// ============================================================================

/**
 * Send Telegram message
 */
function sendTelegramMessage(text) {
  const token = TENT_CONFIG.TELEGRAM_BOT_TOKEN;
  const chatId = TENT_CONFIG.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    Logger.log('❌ Telegram token or chat ID not configured');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    };

    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      Logger.log('✅ Telegram message sent');
      return true;
    } else {
      Logger.log(`❌ Telegram API error: ${response.getContentText()}`);
      return false;
    }

  } catch (err) {
    Logger.log(`❌ Error sending Telegram message: ${err}`);
    return false;
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * doPost - Receive Tent data from Bridge
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.type === 'tent_sync') {
      const week = data.week;
      const tentData = data.data;

      Logger.log(`📥 Received Tent sync for ${week}`);

      const saved = saveTentReport(week, tentData);

      return ContentService.createTextOutput(JSON.stringify({
        ok: saved,
        message: saved ? 'Tent report saved' : 'Save failed'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: 'Unknown request type'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log(`❌ doPost error: ${err}`);
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: String(err)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * sendWeeklyTentReport - Time-driven trigger (Sunday 20:00)
 */
function sendWeeklyTentReport() {
  const week = getCurrentWeek();

  Logger.log(`🏛️ Generating weekly Tent report for ${week}`);

  // Get data (fresh or cached)
  const data = getTentData(week);

  if (!data) {
    Logger.log('❌ No Tent data available');
    sendTelegramMessage('⚠️ Tent Report unavailable for ' + week + '\n\nNo data in cache. Index Node may be offline.');
    return;
  }

  // Format message
  const message = formatTentMessage(data);

  // Send to Telegram
  const sent = sendTelegramMessage(message);

  if (sent) {
    Logger.log(`✅ Weekly Tent report sent for ${week}`);
  } else {
    Logger.log(`❌ Failed to send weekly Tent report`);
  }
}

/**
 * Manual test function
 */
function testTentReport() {
  Logger.log('🧪 Testing Tent report generation...');
  sendWeeklyTentReport();
}

/**
 * Get current ISO week (YYYY-Wxx)
 */
function getCurrentWeek() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now - yearStart) / 86400000 + yearStart.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ============================================================================
// SETUP INSTRUCTIONS
// ============================================================================

/**
 * Setup instructions (run once)
 *
 * 1. Set Script Properties:
 *    - TELEGRAM_BOT_TOKEN
 *    - TELEGRAM_CHAT_ID
 *    - BRIDGE_URL (optional, defaults to http://127.0.0.1:8080)
 *
 * 2. Deploy as Web App:
 *    - Deploy > New Deployment > Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Copy Web App URL → Configure in Bridge
 *
 * 3. Create Time-driven Trigger:
 *    - Triggers > Add Trigger
 *    - Function: sendWeeklyTentReport
 *    - Event source: Time-driven
 *    - Type: Week timer
 *    - Day: Sunday
 *    - Time: 8pm to 9pm
 *
 * 4. Test:
 *    - Run testTentReport() manually
 *    - Check Telegram for message
 *    - Check TentReports sheet for data
 */
