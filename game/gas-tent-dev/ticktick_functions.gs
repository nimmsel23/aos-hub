// ================================================================
// TICKTICK API FUNCTIONS - General's Tent Centre
// ================================================================
//
// Core TickTick API integration functions.
// Provides: projects, tags, tasks fetch, summary
//
// Based on TickTick Open API v1
// Docs: https://developer.ticktick.com/api
//
// ================================================================

/**
 * Get TickTick API headers
 * @returns {Object} Headers with auth token
 */
function ticktickHeaders_() {
  const config = cfg_();
  const token = config.ticktick.token;

  if (!token) {
    throw new Error('TickTick token not configured. Set PROP.TICKTICK_TOKEN');
  }

  return {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };
}

/**
 * Make TickTick API request
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} opts - Request options
 * @returns {Object} Response data
 */
function ticktickRequest_(endpoint, opts) {
  opts = opts || {};
  const baseUrl = 'https://api.ticktick.com/open/v1';
  const url = baseUrl + endpoint;

  const options = {
    method: opts.method || 'get',
    headers: ticktickHeaders_(),
    muteHttpExceptions: true
  };

  if (opts.payload) {
    options.payload = JSON.stringify(opts.payload);
  }

  logInfo_('TickTick request: ' + options.method.toUpperCase() + ' ' + endpoint);

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code < 200 || code >= 300) {
    logError_('TickTick API error: ' + code + ' - ' + text);
    throw new Error('TickTick API error: ' + code);
  }

  return text ? JSON.parse(text) : null;
}

/**
 * List all projects
 * @returns {Array} Projects
 */
function ticktickListProjects_() {
  return run_('ticktickListProjects', () => {
    const data = ticktickRequest_('/project');
    return Array.isArray(data) ? data : [];
  });
}

/**
 * List all tags
 * @returns {Array} Tags
 */
function ticktickListTags_() {
  return run_('ticktickListTags', () => {
    const data = ticktickRequest_('/tag');
    return Array.isArray(data) ? data : [];
  });
}

/**
 * Fetch tasks with filters
 * @param {Object} opts - Filter options
 * @returns {Object} {ok, data}
 */
function ticktickFetchTasks_(opts) {
  return run_('ticktickFetchTasks', () => {
    opts = opts || {};

    // Build query params
    const params = [];

    if (opts.projectId) {
      params.push('projectId=' + encodeURIComponent(opts.projectId));
    }

    if (opts.since) {
      params.push('modifiedAfter=' + encodeURIComponent(opts.since));
    }

    if (opts.until) {
      params.push('modifiedBefore=' + encodeURIComponent(opts.until));
    }

    const endpoint = '/task' + (params.length > 0 ? '?' + params.join('&') : '');
    let tasks = ticktickRequest_(endpoint);

    if (!Array.isArray(tasks)) tasks = [];

    // Filter by tags if specified
    if (opts.tags && opts.tags.length > 0) {
      const wantedTags = opts.tags.map(t => String(t).toLowerCase());
      tasks = tasks.filter(task => {
        const taskTags = (task.tags || []).map(t => String(t).toLowerCase());
        return wantedTags.some(wt => taskTags.includes(wt));
      });
    }

    // Filter by status
    if (opts.statuses) {
      tasks = tasks.filter(task => opts.statuses.includes(task.status));
    }

    // Include completed or not
    if (!opts.includeCompleted) {
      tasks = tasks.filter(task => task.status !== 2);
    }

    return { ok: true, data: tasks };
  });
}

/**
 * Generate summary from tasks
 * @param {Object} opts - Summary options
 * @returns {Object} Summary data
 */
function ticktickSummary_(opts) {
  return run_('ticktickSummary', () => {
    opts = opts || {};

    // Fetch tasks
    const res = ticktickFetchTasks_(opts);
    const tasks = res.data || [];

    // Calculate stats
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 2).length;
    const open = total - completed;

    const summary = {
      total: total,
      complete: completed,
      completed: completed, // alias
      open: open,
      completion: total > 0 ? Math.round((completed / total) * 100) : 0
    };

    // Group by tag if requested
    if (opts.groupByTag) {
      const byTag = {};

      tasks.forEach(task => {
        const taskTags = task.tags || [];

        taskTags.forEach(tag => {
          const tagKey = String(tag);
          if (!byTag[tagKey]) {
            byTag[tagKey] = {
              total: 0,
              complete: 0,
              completed: 0,
              open: 0
            };
          }

          byTag[tagKey].total++;
          if (task.status === 2) {
            byTag[tagKey].complete++;
            byTag[tagKey].completed++;
          } else {
            byTag[tagKey].open++;
          }
        });
      });

      summary.byTag = byTag;
    }

    return { ok: true, data: summary };
  });
}

/**
 * Create task
 * @param {Object} task - Task data
 * @returns {Object} Created task
 */
function ticktickCreateTask_(task) {
  return run_('ticktickCreateTask', () => {
    const config = cfg_();
    const projectId = task.projectId || config.ticktick.projectId || 'inbox';

    const payload = {
      title: task.title,
      content: task.content || '',
      projectId: projectId
    };

    if (task.tags && task.tags.length > 0) {
      payload.tags = task.tags;
    }

    if (task.priority) {
      payload.priority = task.priority;
    }

    if (task.dueDate) {
      payload.dueDate = task.dueDate;
    }

    const created = ticktickRequest_('/task', {
      method: 'post',
      payload: payload
    });

    return { ok: true, data: created };
  });
}
