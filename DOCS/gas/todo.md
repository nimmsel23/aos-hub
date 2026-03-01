# GAS HQ TODO / Open Points

## Fix/Decide
- `dailyReview()`: calls Bridge `GET /bridge/daily-review-data`. If missing/unreachable it sends “Data Unavailable”.
- `weeklyFireMapAutomation()`: calls Bridge `POST /bridge/trigger/weekly-firemap`. Requires Bridge firemap trigger env; else disable.
- Status UI shows “Checking” if GAS cannot reach Bridge via funnel. Ensure `AOS_BRIDGE_URL=https://ideapad.tail7a15d6.ts.net/bridge` and that the URL is externally reachable from GAS; otherwise accept hb fallback.
- External Centre Links (dots/buttons): set Script Props for URLs or hide/mute missing ones to avoid “Missing URL”.
- PWA→GAS fallback mechanism: define store-and-forward flow (queue writes in Drive when Bridge/Node offline), add retry/ack semantics, and document config/route ownership.

## PWA→GAS Fallback (Core4 First) — Draft Plan
Goal: Allow Core4 PWA to write via GAS when HQ/Bridge is offline, queue in Drive, and replay into Node when online.

### Queue Store (GAS/Drive)
- Folder: `AlphaOS_Fallback_Queue/Core4/`
- File per event: `core4-queue-<timestamp>-<uuid>.json`
- Schema:
  - `id`, `ts`, `app` (`core4`), `kind` (`checkin`, `bulk`, `note`, ...), `payload`
  - `status` (`queued`, `processing`, `done`, `error`)
  - `last_error`, `attempts`

### GAS Endpoints
- `POST /gas/core4/queue` (or GAS `doPost` with `action=queue_core4`): append queue file.
- `GET /gas/core4/queue/pending`: return list (for diagnostics).
- `POST /gas/core4/queue/ack`: mark items processed (by `id`).

### Bridge/Node Replay
- Bridge scheduled job (or Node cron) pulls pending queue from GAS:
  - `GET /gas/core4/queue/pending?limit=...`
  - For each: call existing Core4 APIs (`/api/core4/...`) and on success `POST /gas/core4/queue/ack`
  - On failure: increment `attempts`, store `last_error`

### PWA Behavior
- When `aosGasFallback` redirects (or when Node unreachable), Core4 PWA posts to GAS queue.
- UI shows `Offline queued` + `last sync`.
- On next online session, queue drains automatically via Bridge/Node.

## Debug/Telemetry
- Verify Status call runs on page load (browser console shows `SystemStatus data`). If not, add retry/fallback.
- Optionally add terminal command `props` → `debugScriptProps_()`.

## Docs/Config
- Keep `DOCS/gas/hq.md` in sync (functions/triggers).
- Consider centralizing more Script Prop access through `config.gs` (already partially done).

## Nice to have
- Refine Status ping cadence (currently every load); optional split messages (HQ online vs Bridge health).
- Decide on Heartbeat vs Funnel for Bridge status; if Funnel stays flaky, move UI status to heartbeat label (`hb Xm`).

## Verified OK (recent)
- Bridge executor supports `depends`/`wait`; War Stack tasks create Hits → Door (depends) → Profit (depends), UUIDs written to frontmatter + section.
- UI centre mode hides Home/Header, shows toolbar; terminal dummy lines removed; `debug` command triggers `debugStatus()`.
- Watchdog logs to console and Telegram on offline/online.
