/*
GENERAL'S TENT — TICKTICK READ LAYER
====================================
Read-only TickTick functions for Tent Centre.

Provides:
- Catalog (projects + tags)
- Raw task fetch (filtered)
- Weekly / Monthly / Yearly summaries
- Smoke test
*/

// -------------------------------
// Helpers: dates / ranges
// -------------------------------

/** Parse `YYYY-Www` (ISO week) and return { year, week } */
function isoWeekParse_(weekStr) {
  const m = String(weekStr || '').trim().match(/^(\d{4})-W(\d{2})$/);
  if (!m) throw new Error('Invalid week format. Expected YYYY-Www, e.g. 2026-W01');
  return { year: +m[1], week: +m[2] };
}

/** Current ISO week string `YYYY-Www` */
function isoWeekNow_() {
  const d = new Date();
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * ISO week range (Monday 00:00:00Z .. Sunday 23:59:59Z)
 * Returns: { week, startIso, endIso, startDate, endDate }
 */
function isoWeekRange_(weekStr) {
  const { year, week } = isoWeekParse_(weekStr);

  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;

  // Monday of week 1
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));

  // Monday of target week
  const start = new Date(week1Mon);
  start.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7);
  start.setUTCHours(0, 0, 0, 0);

  // Sunday end
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);

  return {
    week: weekStr,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startDate: start,
    endDate: end
  };
}

/**
 * Month range (local time) -> ISO
 * monthStr: `YYYY-MM` (e.g. 2026-01)
 */
function monthRange_(monthStr) {
  const m = String(monthStr || '').trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error('Invalid month format. Expected YYYY-MM, e.g. 2026-01');
  const y = +m[1];
  const mo = +m[2] - 1;
  const start = new Date(y, mo, 1, 0, 0, 0, 0);
  const end = new Date(y, mo + 1, 0, 23, 59, 59, 999);
  return {
    month: monthStr,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startDate: start,
    endDate: end
  };
}

/** Year range (local time) -> ISO */
function yearRange_(year) {
  const y = +year;
  if (!y || y < 1970 || y > 3000) throw new Error('Invalid year');
  const start = new Date(y, 0, 1, 0, 0, 0, 0);
  const end = new Date(y, 11, 31, 23, 59, 59, 999);
  return {
    year: y,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startDate: start,
    endDate: end
  };
}

/** Normalize tags input (string "A,B" or array) -> array */
function normTags_(tags) {
  if (!tags) return null;
  if (Array.isArray(tags)) return tags.map(String).map(t => t.trim()).filter(Boolean);
  return String(tags).split(',').map(s => s.trim()).filter(Boolean);
}

/** Coerce boolean-ish */
function bool_(v, fallback) {
  if (v === true || v === false) return v;
  if (v == null) return !!fallback;
  const s = String(v).toLowerCase().trim();
  if (['1','true','yes','y','on'].includes(s)) return true;
  if (['0','false','no','n','off'].includes(s)) return false;
  return !!fallback;
}

// -------------------------------
// Public API: Catalog
// -------------------------------

/**
 * getTickTickCatalog()
 * - projects + tags for UI dropdowns / debug
 */
function getTickTickCatalog() {
  return run_('getTickTickCatalog', () => {
    const projects = ticktickListProjects_();
    const tags = ticktickListTags_();
    return {
      ok: true,
      message: 'TickTick catalog',
      data: {
        projects,
        tags,
        defaultProjectId: (cfg_().ticktick.projectId || 'inbox')
      }
    };
  });
}

// -------------------------------
// Public API: Raw fetch (filtered)
// -------------------------------

/**
 * getTickTickTasks(opts)
 * opts: { projectId, since, until, includeCompleted, tags, statuses }
 * Returns filtered tasks list.
 */
function getTickTickTasks(opts) {
  return run_('getTickTickTasks', () => {
    opts = opts || {};
    const tags = normTags_(opts.tags);
    const res = ticktickFetchTasks_({
      projectId: opts.projectId,
      since: opts.since,
      until: opts.until,
      includeCompleted: bool_(opts.includeCompleted, false),
      tags: tags,
      statuses: opts.statuses
    });
    const list = (res && Array.isArray(res.data)) ? res.data : [];
    return { ok: true, data: list, count: list.length };
  });
}

// -------------------------------
// Public API: Weekly Summary
// -------------------------------

/**
 * getTickTickWeeklySummary(weekStr, opts)
 * weekStr: `YYYY-Www` (default current week)
 * opts: { tags, projectId, groupByTag }
 */
function getTickTickWeeklySummary(weekStr, opts) {
  return run_('getTickTickWeeklySummary', () => {
    const week = weekStr ? String(weekStr) : isoWeekNow_();
    const range = isoWeekRange_(week);
    opts = opts || {};

    const tags = normTags_(opts.tags);
    const groupByTag = bool_(opts.groupByTag, true);

    const sumRes = ticktickSummary_({
      since: range.startIso,
      until: range.endIso,
      tags,
      groupByTag,
      includeCompleted: true
    });

    // optional samples
    const tasksRes = ticktickFetchTasks_({
      projectId: opts.projectId,
      since: range.startIso,
      until: range.endIso,
      includeCompleted: true,
      tags
    });

    const list = (tasksRes && Array.isArray(tasksRes.data)) ? tasksRes.data : [];
    const completed = [];
    const open = [];

    list.forEach(t => {
      if (t && t.status === 2) completed.push(t);
      else open.push(t);
    });

    const ts = (t) => {
      const m = t && (t.completedTime || t.modifiedTime);
      const v = m ? new Date(m).getTime() : 0;
      return isNaN(v) ? 0 : v;
    };

    completed.sort((a,b) => ts(b) - ts(a));
    open.sort((a,b) => ts(b) - ts(a));

    return {
      ok: true,
      message: 'TickTick weekly summary',
      data: {
        range: { week: range.week, startIso: range.startIso, endIso: range.endIso },
        summary: sumRes.data || {},
        top: {
          completed: completed.slice(0, 10),
          open: open.slice(0, 10)
        }
      }
    };
  });
}

// -------------------------------
// Public API: Tent Scores
// -------------------------------

/**
 * getTickTickTentScores(weekStr)
 * - returns Stack/Door scores for the given ISO week
 * - uses TickTick weekly summary grouped by tag
 */
function getTickTickTentScores(weekStr) {
  return run_('getTickTickTentScores', () => {
    const week = weekStr ? String(weekStr) : isoWeekNow_();
    const range = isoWeekRange_(week);

    // Pull weekly summary grouped by tag
    const sumRes = ticktickSummary_({
      since: range.startIso,
      until: range.endIso,
      groupByTag: true,
      includeCompleted: true
    });

    // Normalize payload
    const data = (sumRes && sumRes.data) ? sumRes.data : {};
    const byTag = data.byTag || {};

    // Case-insensitive tag lookup
    function tagCount_(tagName) {
      const wanted = String(tagName).toLowerCase();
      for (const k in byTag) {
        if (String(k).toLowerCase() === wanted) {
          const v = byTag[k] || {};
          return +v.complete || +v.completed || 0;
        }
      }
      return 0;
    }

    const stackRaw = tagCount_('STACK');
    const doorRaw  = tagCount_('DOOR');

    const stackMax = 7;
    const doorMax  = 21;

    return {
      ok: true,
      message: 'Tent scores from TickTick',
      data: {
        week,
        range: { startIso: range.startIso, endIso: range.endIso },
        stack: { score: Math.min(stackRaw, stackMax), max: stackMax, raw: stackRaw, tag: 'STACK' },
        door:  { score: Math.min(doorRaw, doorMax),  max: doorMax,  raw: doorRaw,  tag: 'DOOR' },
        summary: {
          total: data.total,
          complete: data.complete,
          open: data.open,
          byTag
        }
      }
    };
  });
}

// -------------------------------
// Debug helper
// -------------------------------

/**
 * ticktickSmokeTest()
 * Minimal end-to-end read check.
 */
function ticktickSmokeTest() {
  return run_('ticktickSmokeTest', () => {
    const c = cfg_();
    if (!c.ticktick.token) throw new Error('Missing token: set TICKTICK_TOKEN');

    const week = isoWeekNow_();
    const cat = getTickTickCatalog();
    const weekly = getTickTickWeeklySummary(week, { groupByTag: true });
    const scores = getTickTickTentScores(week);

    return {
      ok: true,
      message: 'TickTick smoke test ok',
      data: { week, catalog: cat, weekly, scores }
    };
  });
}
