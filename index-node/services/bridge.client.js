// ================================================================
// Bridge RPC Client - Talk to aiohttp Bridge
// ================================================================
//
// Small client for calling Bridge RPC endpoints.
//
// Expected Bridge endpoint: POST /rpc
// Payload: { action: string, args: object }
// Response: JSON { ok: boolean, data?: any, error?: string }
//
// ================================================================

/**
 * Create a Bridge RPC client
 * @param {Object} options - Configuration
 * @param {string} options.bridgeUrl - Bridge base URL (defaults to env AOS_BRIDGE_URL or localhost:8080)
 * @param {number} options.timeoutMs - Request timeout in milliseconds (default: 15000)
 * @param {string} options.apiKey - Optional API key for authenticated requests
 * @returns {Object} Client instance with rpc() method and base URL
 */
export function makeBridgeClient({ bridgeUrl, timeoutMs = 15000, apiKey = null } = {}) {
  const base = (bridgeUrl || process.env.AOS_BRIDGE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');

  /**
   * Call Bridge RPC endpoint
   * @param {string} action - RPC action name
   * @param {Object} args - Action arguments
   * @returns {Promise<Object>} Response object
   */
  async function rpc(action, args = {}) {
    if (!action) throw new Error('bridge.rpc: action required');

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);

    try {
      const res = await fetch(`${base}/rpc`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { 'x-aos-key': apiKey } : {})
        },
        body: JSON.stringify({ action, args }),
        signal: ac.signal
      });

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (_) {
        json = { ok: false, error: `Non-JSON from bridge: ${text.slice(0, 300)}` };
      }

      if (!res.ok) {
        return { ok: false, error: json?.error || `Bridge HTTP ${res.status}` };
      }

      if (json?.ok === false) {
        return { ok: false, error: json?.error || 'Bridge returned ok=false' };
      }

      return json;
    } finally {
      clearTimeout(t);
    }
  }

  return { base, rpc };
}
