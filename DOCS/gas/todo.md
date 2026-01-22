# GAS HQ TODO / Open Points

## Fix/Decide
- `dailyReview()`: calls Bridge `GET /bridge/daily-review-data`. If missing/unreachable it sends “Data Unavailable”.
- `weeklyFireMapAutomation()`: calls Bridge `POST /bridge/trigger/weekly-firemap`. Requires Bridge firemap trigger env; else disable.
- Status UI shows “Checking” if GAS cannot reach Bridge via funnel. Ensure `AOS_BRIDGE_URL=https://ideapad.tail7a15d6.ts.net/bridge` and that the URL is externally reachable from GAS; otherwise accept hb fallback.
- External Centre Links (dots/buttons): set Script Props for URLs or hide/mute missing ones to avoid “Missing URL”.

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
