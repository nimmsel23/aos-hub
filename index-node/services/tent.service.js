// ================================================================
// Tent Service - General's Tent Data Orchestrator
// ================================================================
//
// Orchestrates General's Tent weekly data:
// - TickTick weekly digest (via Bridge/GAS)
// - TickTick tent scores (STACK/DOOR/CORE completion)
// - Map latest entries (Frame/Freedom/Focus/Fire/Voice)
//
// Bridge actions expected (GAS side):
// - "ticktickWeeklyDigest"  args: { week, tags?, includeOpen?, includeOverdue?, maxItems?, preferExport? }
// - "ticktickTentScores"    args: { week }
// - "mapLatest"             args: { type }
//
// If your bridge uses different action names, adjust ACTIONS below.
//
// ================================================================

import { makeBridgeClient } from './bridge.client.js';
import { makeTtlCache } from '../lib/cache.js';
import { isoWeekNow, assertIsoWeek } from '../lib/week.js';

const ACTIONS = {
  ticktickWeeklyDigest: 'ticktickWeeklyDigest',
  ticktickTentScores: 'ticktickTentScores',
  mapLatest: 'mapLatest'
};

/**
 * Create Tent service instance
 * @param {Object} options - Configuration
 * @param {string} options.bridgeUrl - Bridge base URL
 * @returns {Object} Service instance with getWeekBundle() method
 */
export function makeTentService({ bridgeUrl } = {}) {
  const bridge = makeBridgeClient({ bridgeUrl });

  const ttlSec = parseInt(process.env.AOS_TENT_CACHE_TTL_SEC || '120', 10);
  const cache = makeTtlCache({ ttlMs: Math.max(5, ttlSec) * 1000 });

  /**
   * Get complete weekly bundle (maps + ticktick + scores)
   * @param {Object} options - Bundle options
   * @param {string} options.week - ISO week string (defaults to current week)
   * @param {boolean} options.preferExport - Prefer export fallback over live TickTick
   * @param {Array<string>} options.tags - Filter digest by tags (e.g., ['DOOR', 'STACK'])
   * @returns {Promise<Object>} Bundle with week, maps, ticktick, scores
   */
  async function getWeekBundle({ week, preferExport = false, tags = null } = {}) {
    const w = week ? assertIsoWeek(week) : isoWeekNow();
    const cacheKey = `tent:bundle:${w}:export=${preferExport}:tags=${(tags || []).join(',')}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    // 1) Maps (best effort). If you don't want maps via GAS, remove these calls.
    const mapTypes = ['frame', 'freedom', 'focus', 'fire', 'voice'];
    const maps = {};
    await Promise.all(mapTypes.map(async (t) => {
      const r = await bridge.rpc(ACTIONS.mapLatest, { type: t });
      maps[t] = r?.data ?? r; // tolerate either raw or {data}
    }));

    // 2) TickTick digest
    const digestRes = await bridge.rpc(ACTIONS.ticktickWeeklyDigest, {
      week: w,
      tags, // e.g. ['DOOR','STACK'] or null
      includeOpen: true,
      includeOverdue: true,
      maxItems: 200,
      preferExport
    });

    // 3) TickTick scores (stack/door)
    const scoreRes = await bridge.rpc(ACTIONS.ticktickTentScores, { week: w });

    const out = {
      week: w,
      maps,
      ticktick: digestRes?.data ?? digestRes,
      scores: scoreRes?.data ?? scoreRes
    };

    cache.set(cacheKey, out);
    return out;
  }

  return { getWeekBundle, bridgeBase: bridge.base };
}
