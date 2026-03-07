// ================================================================
// WEBAPP - General's Tent Centre
// ================================================================
//
// WebApp deployment endpoints.
// Handles:
// - doGet() - Serve UI
// - doPost() - RPC calls from Bridge + Telegram webhooks
//
// ================================================================

/**
 * doGet - Serve Tent UI
 * @param {Object} e - Request event
 * @returns {HtmlOutput} HTML page
 */
function doGet(e) {
  return run_('doGet', () => {
    const params = e.parameter || {};
    const action = params.action || 'index';

    switch (action) {
      case 'index':
      case 'tent':
        return HtmlService.createHtmlOutputFromFile('Index')
          .setTitle('General\'s Tent - AlphaOS')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

      case 'health':
        const status = statusTent();
        return ContentService
          .createTextOutput(JSON.stringify(status))
          .setMimeType(ContentService.MimeType.JSON);

      default:
        return ContentService
          .createTextOutput(JSON.stringify({ ok: false, error: 'Unknown action' }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  }).data;
}

/**
 * doPost - Handle RPC calls + Telegram webhooks
 * @param {Object} e - Request event
 * @returns {TextOutput} JSON response
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");

    // Check if Telegram webhook
    if (body.message || body.callback_query) {
      return handleTelegramUpdate(body);
    }

    // Otherwise treat as RPC call from Bridge
    const action = String(body.action || "");
    const args = body.args || {};

    let out;

    switch (action) {
      // TickTick actions
      case "ticktickWeeklyDigest":
      case "weeklyDigest":
        out = buildWeeklyDigest(args.week, args);
        break;

      case "ticktickTentScores":
      case "tentScores":
        out = getTickTickTentScores(args.week);
        break;

      case "ticktickCatalog":
        out = getTickTickCatalog();
        break;

      case "ticktickWeeklySummary":
        out = getTickTickWeeklySummary(args.week, args);
        break;

      // Tent actions
      case "saveTentReport":
        out = saveTentReportFromBridge(args.week, args.data);
        break;

      case "getLatestTentReport":
        out = getLatestTentReport();
        break;

      // Export actions
      case "exportToVault":
        out = exportTentToVault(args.week, args);
        break;

      // Health check
      case "health":
      case "status":
        out = statusTent();
        break;

      default:
        out = { ok: false, error: "Unknown action: " + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(out))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    logError_('doPost error', err);
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: String(err),
        stack: err.stack
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Save Tent report from Bridge
 * @param {string} week - ISO week
 * @param {Object} data - Tent data
 * @returns {Object} Result
 */
function saveTentReportFromBridge(week, data) {
  return run_('saveTentReportFromBridge', () => {
    if (!week || !data) {
      throw new Error('Missing week or data');
    }

    const saved = saveTentReport(week, data);

    return {
      ok: saved,
      message: saved ? 'Tent report saved to Sheet' : 'Save failed',
      week: week
    };
  });
}

/**
 * Export Tent report to Vault (via Bridge)
 * @param {string} week - ISO week
 * @param {Object} opts - Export options
 * @returns {Object} Result
 */
function exportTentToVault(week, opts) {
  return run_('exportTentToVault', () => {
    opts = opts || {};

    // Get Tent data
    const report = getLatestTentReport();
    if (!report || report.week !== week) {
      throw new Error('No report found for week ' + week);
    }

    // Build markdown
    const md = buildTentMarkdown(report);

    // Return markdown for Bridge to save
    return {
      ok: true,
      message: 'Markdown generated',
      data: {
        week: week,
        markdown: md,
        filename: `tent_week_${week}.md`,
        path: 'Alpha_Tent/reports'
      }
    };
  });
}

/**
 * Build Tent markdown report
 * @param {Object} report - Tent report data
 * @returns {string} Markdown
 */
function buildTentMarkdown(report) {
  const week = report.week;
  const data = report.raw_data || {};
  const component = data.component || {};

  let md = `# General's Tent - ${week}\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;

  // Component #1: Return & Report
  md += `## Component #1 - Return & Report\n\n`;
  md += `### Domain Health\n`;
  md += report.domain_health + '\n\n';
  md += `### Overall Score: ${report.overall_score}/100\n\n`;

  // Component #2: Strategic Intelligence
  if (report.strategic_insights) {
    md += `## Component #2 - Strategic Intelligence\n\n`;
    md += report.strategic_insights + '\n\n';
  }

  // Component #3: Pipeline Issues
  if (report.pipeline_issues) {
    md += `## Component #3 - Pipeline Status\n\n`;
    md += report.pipeline_issues + '\n\n';
  }

  // Component #4: Cascade Health
  md += `## Component #4 - Cascade Alignment\n\n`;
  md += `Score: ${report.cascade_health}/100\n\n`;

  md += `---\n`;
  md += `αOS • General's Tent • Week ${week}\n`;

  return md;
}

/**
 * Test doPost locally
 */
function testDoPost() {
  const e = {
    postData: {
      contents: JSON.stringify({
        action: 'ticktickTentScores',
        args: { week: isoWeekNow_() }
      })
    }
  };

  const response = doPost(e);
  const text = response.getContent();
  const data = JSON.parse(text);

  Logger.log('doPost test result:');
  Logger.log(JSON.stringify(data, null, 2));

  return data;
}
