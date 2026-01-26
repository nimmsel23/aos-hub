// ================================================================
// ISO Week Helpers - Week number calculations
// ================================================================
//
// Provides ISO 8601 week number utilities.
// Format: YYYY-Www (e.g., "2026-W04")
//
// ================================================================

/**
 * Get current ISO week string
 * @param {Date} date - Optional date (defaults to now)
 * @returns {string} ISO week string (YYYY-Www)
 */
export function isoWeekNow(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Validate and normalize ISO week string
 * @param {string} week - Week string to validate
 * @returns {string} Normalized week string
 * @throws {Error} If week format is invalid
 */
export function assertIsoWeek(week) {
  const s = String(week || '').trim();
  if (!/^\d{4}-W\d{2}$/.test(s)) {
    throw new Error(`Invalid week: ${week} (expected YYYY-Www)`);
  }
  return s;
}
