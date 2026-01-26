// ================================================================
// TTL Cache - Simple in-memory cache with expiration
// ================================================================
//
// Tiny TTL cache for General's Tent (and other weekly data).
// Sufficient for low-frequency access patterns (1x/week refresh).
//
// ================================================================

/**
 * Create a TTL cache instance
 * @param {Object} options - Configuration
 * @param {number} options.ttlMs - Time to live in milliseconds (default: 60000)
 * @returns {Object} Cache instance with get/set/del/clear methods
 */
export function makeTtlCache({ ttlMs = 60_000 } = {}) {
  const store = new Map();

  function get(key) {
    const hit = store.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
      store.delete(key);
      return null;
    }
    return hit.value;
  }

  function set(key, value, ttlOverrideMs = null) {
    const ttl = (ttlOverrideMs != null) ? ttlOverrideMs : ttlMs;
    store.set(key, { value, expiresAt: Date.now() + ttl });
    return value;
  }

  function del(key) {
    store.delete(key);
  }

  function clear() {
    store.clear();
  }

  return { get, set, del, clear };
}
