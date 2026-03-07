// ================================================================
// TENT DIGEST - Weekly Digest Builder
// ================================================================
//
// Combines data from multiple sources into weekly digest:
// - TickTick (scores, tasks)
// - Index Node via Bridge (domain states, pipeline)
// - Fallback to cached data when offline
//
// ================================================================

/**
 * Build complete weekly digest
 * @param {string} week - ISO week (YYYY-Www)
 * @param {Object} opts - Options
 * @returns {Object} Digest data
 */
function buildWeeklyDigest(week, opts) {
  return run_('buildWeeklyDigest', () => {
    week = week || isoWeekNow_();
    opts = opts || {};

    logInfo_('Building weekly digest for ' + week);

    const digest = {
      week: week,
      generated_at: new Date().toISOString(),
      sources: {},
      markdown: ''
    };

    // 1. TickTick Scores (always try, required)
    try {
      const scores = getTickTickTentScores(week);
      if (scores.ok) {
        digest.sources.ticktick_scores = {
          ok: true,
          data: scores.data
        };
      } else {
        throw new Error(scores.error || 'Failed');
      }
    } catch (err) {
      logError_('TickTick scores failed', err);
      digest.sources.ticktick_scores = {
        ok: false,
        error: String(err)
      };
    }

    // 2. TickTick Weekly Summary (optional, for details)
    try {
      const summary = getTickTickWeeklySummary(week, {
        tags: ['DOOR', 'STACK', 'FIRE', 'FOCUS'],
        groupByTag: true
      });

      if (summary.ok) {
        digest.sources.ticktick_summary = {
          ok: true,
          data: summary.data
        };
      }
    } catch (err) {
      logWarn_('TickTick summary unavailable: ' + err);
    }

    // 3. Index Node Intelligence (try via Bridge, fallback to cache)
    try {
      const intelligence = fetchTentIntelligence(week);
      if (intelligence) {
        digest.sources.tent_intelligence = {
          ok: true,
          data: intelligence
        };
      }
    } catch (err) {
      logWarn_('Index Node intelligence unavailable: ' + err);
      digest.sources.tent_intelligence = {
        ok: false,
        error: String(err),
        fallback: 'Using cached data'
      };
    }

    // 4. Build Markdown
    digest.markdown = buildDigestMarkdown(digest);

    // 5. Save to Sheet for archive
    saveTentReport(week, {
      component: digest,
      week: week
    });

    return {
      ok: true,
      message: 'Weekly digest built',
      data: digest
    };
  });
}

/**
 * Fetch Tent Intelligence from Index Node (via Bridge if available)
 * @param {string} week - ISO week
 * @returns {Object|null} Intelligence data
 */
function fetchTentIntelligence(week) {
  const config = cfg_();
  const bridgeUrl = config.integration.bridgeUrl;

  if (!bridgeUrl) {
    logWarn_('Bridge URL not configured, skipping Index Node data');
    return null;
  }

  try {
    // Try to reach Index Node via Bridge
    const url = bridgeUrl + '/rpc/tent/returnReport';

    const payload = {
      action: 'returnReport',
      args: { week: week }
    };

    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      timeout: 10
    });

    const code = response.getResponseCode();
    if (code !== 200) {
      logWarn_('Bridge returned ' + code);
      return null;
    }

    const data = JSON.parse(response.getContentText());
    if (data.ok && data.component) {
      logInfo_('Fetched fresh Tent intelligence from Index Node');
      return data.component;
    }

    return null;

  } catch (err) {
    logWarn_('Bridge unreachable: ' + err);
    return null;
  }
}

/**
 * Build Markdown digest from all sources
 * @param {Object} digest - Digest data
 * @returns {string} Markdown
 */
function buildDigestMarkdown(digest) {
  const week = digest.week;
  let md = `# General's Tent - ${week}\n\n`;
  md += `Generated: ${new Date().toLocaleString('de-DE')}\n\n`;

  md += `---\n\n`;

  // Component #1: Return & Report
  md += `## Component #1 - Return & Report\n\n`;

  const ticktickScores = digest.sources.ticktick_scores;
  if (ticktickScores && ticktickScores.ok) {
    const data = ticktickScores.data;
    const stack = data.stack;
    const door = data.door;

    md += `### Alpha Score (TickTick)\n\n`;
    md += `- **Stack:** ${stack.score}/${stack.max} (${stack.raw} total completed)\n`;
    md += `- **Door:** ${door.score}/${door.max} (${door.raw} total completed)\n`;

    const summary = data.summary;
    md += `- **Total Tasks:** ${summary.total}\n`;
    md += `- **Completed:** ${summary.complete} (${Math.round((summary.complete / summary.total) * 100)}%)\n`;
    md += `- **Open:** ${summary.open}\n\n`;

    // Tag breakdown
    if (summary.byTag) {
      md += `### Tag Breakdown\n\n`;
      for (const tag in summary.byTag) {
        const t = summary.byTag[tag];
        md += `- **${tag}:** ${t.completed}/${t.total} (${Math.round((t.completed / t.total) * 100)}%)\n`;
      }
      md += '\n';
    }
  } else {
    md += `⚠️ TickTick scores unavailable: ${ticktickScores.error}\n\n`;
  }

  // Domain Health from Index Node (if available)
  const intelligence = digest.sources.tent_intelligence;
  if (intelligence && intelligence.ok && intelligence.data) {
    const comp = intelligence.data;
    const metrics = comp.weekly_metrics || {};

    md += `### Domain Health (Index Node)\n\n`;

    const domains = ['BODY', 'BEING', 'BALANCE', 'BUSINESS'];
    domains.forEach(domain => {
      const core4 = (metrics.core4 || {})[domain] || 0;
      const fireData = (metrics.fire_hits || {})[domain] || {};
      const fireHits = fireData.total || 0;

      md += `- **${domain}:** Core4 ${core4}/7, Fire ${fireHits} hits\n`;
    });

    md += '\n';
  }

  md += `---\n\n`;

  // Component #2: Top Completed Tasks (from TickTick summary)
  const ticktickSummary = digest.sources.ticktick_summary;
  if (ticktickSummary && ticktickSummary.ok && ticktickSummary.data.top) {
    const top = ticktickSummary.data.top;

    if (top.completed && top.completed.length > 0) {
      md += `## Component #2 - Wins This Week\n\n`;
      md += `### Top Completed Tasks\n\n`;

      top.completed.slice(0, 10).forEach((task, i) => {
        md += `${i + 1}. ${task.title}\n`;
        if (task.tags && task.tags.length > 0) {
          md += `   Tags: ${task.tags.join(', ')}\n`;
        }
      });

      md += '\n';
    }
  }

  md += `---\n\n`;

  // Component #3: Strategic Insights (from Index Node)
  if (intelligence && intelligence.ok && intelligence.data) {
    const comp = intelligence.data;
    const domainSynthesis = comp.domain_synthesis || {};
    const insights = domainSynthesis.insights || [];

    if (insights.length > 0) {
      md += `## Component #3 - Strategic Intelligence\n\n`;

      insights.slice(0, 5).forEach(insight => {
        const emoji = {
          'high': '🔴',
          'medium': '🟡',
          'low': '🟢',
          'positive': '✅'
        }[insight.severity] || '⚪';

        md += `${emoji} **${insight.type}**\n`;
        md += `${insight.description}\n`;
        md += `→ _${insight.recommendation}_\n\n`;
      });
    }

    // Pipeline Issues
    const pipelineSynthesis = comp.pipeline_synthesis || {};
    const issues = pipelineSynthesis.issues || [];

    if (issues.length > 0) {
      md += `### Pipeline Blockages\n\n`;

      issues.slice(0, 3).forEach(issue => {
        md += `⚠️ **${issue.domain}** ${issue.stage}\n`;
        md += `${issue.description}\n`;
        md += `✅ ${issue.correction}\n\n`;
      });
    }
  }

  md += `---\n\n`;

  // Component #4: Open Tasks
  if (ticktickSummary && ticktickSummary.ok && ticktickSummary.data.top) {
    const top = ticktickSummary.data.top;

    if (top.open && top.open.length > 0) {
      md += `## Component #4 - Open Tasks\n\n`;

      top.open.slice(0, 10).forEach((task, i) => {
        md += `${i + 1}. ${task.title}\n`;
        if (task.tags && task.tags.length > 0) {
          md += `   Tags: ${task.tags.join(', ')}\n`;
        }
      });

      md += '\n';
    }
  }

  md += `---\n\n`;

  md += `_Generated by General's Tent Centre_\n`;
  md += `αOS • Week ${week}\n`;

  return md;
}

/**
 * Test digest builder
 */
function testBuildDigest() {
  const week = isoWeekNow_();
  const result = buildWeeklyDigest(week);

  Logger.log('Digest build result:');
  Logger.log(JSON.stringify(result, null, 2));

  if (result.ok) {
    Logger.log('\n--- MARKDOWN ---\n');
    Logger.log(result.data.markdown);
  }

  return result;
}
