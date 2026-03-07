# Tailscale Funnel Integration

## Why Funnel?

GAS (Google Apps Script) runs in the cloud and cannot reach `localhost` or private IPs.

**Solution:** Tailscale Funnel exposes your local services via public HTTPS URLs.

## Your Funnel Setup

```
https://ideapad.tail7a15d6.ts.net (Funnel on - PUBLIC)
├── /       → http://127.0.0.1:8799 (Index Node)
└── /bridge → http://127.0.0.1:8080 (Bridge)
```

## URLs for GAS Tent Centre

Set these in Script Properties (via `setupTentProperties()`):

```js
BRIDGE_URL = 'https://ideapad.tail7a15d6.ts.net/bridge'
INDEX_NODE_URL = 'https://ideapad.tail7a15d6.ts.net'
```

## Data Flow

```
GAS Tent Centre (Cloud)
    ↓
    HTTPS (public Funnel)
    ↓
https://ideapad.tail7a15d6.ts.net/bridge
    ↓
    Tailscale Funnel (laptop)
    ↓
http://127.0.0.1:8080 (Bridge)
    ↓
http://127.0.0.1:8799 (Index Node)
```

## Security

- ✅ Funnel is **PUBLIC** (anyone with URL can access)
- ✅ But: Protected by Tailscale (no direct Internet exposure)
- ✅ Index Node APIs should validate requests
- ⚠️ Consider adding auth headers if needed

## Verify Funnel is Running

```bash
curl https://ideapad.tail7a15d6.ts.net/health
# Should return: {"ok": true}

curl https://ideapad.tail7a15d6.ts.net/bridge/health
# Should return bridge health
```

## Router Bot Config

`router/config.yaml` already configured with Funnel URLs:

```yaml
tent_centre:
  bridge_funnel_url: https://ideapad.tail7a15d6.ts.net/bridge
  index_funnel_url: https://ideapad.tail7a15d6.ts.net
```

## Troubleshooting

**GAS can't reach Bridge:**
1. Check Funnel is running: `tailscale funnel status`
2. Verify URL in browser: `https://ideapad.tail7a15d6.ts.net/bridge/health`
3. Check GAS execution log for exact error

**Funnel not working:**
```bash
# Enable Funnel
tailscale funnel 8799
tailscale funnel 8080

# Check status
tailscale funnel status
```

**Bridge returns 404:**
- Funnel path is `/bridge` not `/bridge/`
- Use: `https://.../bridge/health` (with /health endpoint)
