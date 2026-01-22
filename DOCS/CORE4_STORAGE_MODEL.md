# Core4 storage model (event ledger)

Core4 uses an append-only event ledger to avoid losing data when multiple writers exist (local CLI / Taskwarrior hook / GAS / Bridge) and when rclone sync lags.

For a full end-to-end explanation, see `aos-hub/DOCS/CORE4.md`.

## Filesystem layout

**Event ledger (source of truth, append-only)**

- Local: `~/AlphaOS-Vault/Core4/.core4/events/YYYY-MM-DD/*.json`
- GDrive mount (written by GAS): `~/AlphaOS-Vault/Alpha_Core4/.core4/events/YYYY-MM-DD/*.json`

Each *done* creates one JSON event. Scoring dedupes by:

- `key = YYYY-MM-DD:domain:task`

Multiple events with the same key are allowed (different sources), but they count once.

**Derived artifacts (rebuildable)**

- Day: `~/AlphaOS-Vault/Core4/core4_day_YYYY-MM-DD.json`
- Week: `~/AlphaOS-Vault/Core4/core4_week_YYYY-WWW.json`
- Rolling daily export (last ~8 weeks): `~/AlphaOS-Vault/Core4/core4_daily.csv`
- Month close archive (1 row per day): `~/AlphaOS-Vault/Core4/core4_YYYY-MM.csv`
- Legacy weekly seal (optional): `~/AlphaOS-Vault/Core4/core4_scores.csv`

These are rebuilt from the event ledger and then pushed to Drive by rclone (`Core4 -> Alpha_Core4`).

## Writers

- **Local CLI:** `aos-hub/core4/tracker.py`
  - Writes events into local ledger and rebuilds day/week JSON.
  - Can still create+complete a Taskwarrior task for TickTick integration.
- **Bridge:** `POST /bridge/core4/log` in `aos-hub/bridge/app.py`
  - Writes events into local ledger and rebuilds day/week JSON.
- **GAS:** `aos-hub/gas/core4.gs`
  - Writes events into Drive `Alpha_Core4/.core4/events/` and rebuilds `Alpha_Core4/core4_week_*.json`.
- **Taskwarrior hook:** `~/.task/hooks/on-modify.99-alphaos.py`
  - On completion of a `+core4` task: calls Bridge; if Bridge is down, writes a local event.

## Related commands

- `core4 -d`, `core4 -1d`, `core4 -w` rebuild and then print scores.
- `core4 export-daily --days=56` regenerates `core4_daily.csv` from events.
- `core4 finalize-month 2026-01` writes `core4_2026-01.csv` from events (month-close archive).
- `core4 prune-events --keep-weeks=8` deletes local event files older than the window.
- `core4 finalize-week 2026-W03` appends a weekly row into `core4_scores.csv` (legacy/optional).
- `vaultctl sync` triggers a rebuild (`core4 -w` + `core4 -d`) before running the rclone push.

## Optional automation (systemd user timers)

Templates live in `aos-hub/systemd/` and are intentionally not enabled automatically.

- Install templates: `aos-hub/core4/core4ctl install-timers`
- Enable:
  - `systemctl --user daemon-reload`
  - `systemctl --user enable --now core4-daily.timer core4-prune.timer core4-month-close.timer`

Timers:
- `core4-daily.timer`: regenerates rolling daily CSV (default 56 days)
- `core4-prune.timer`: prunes local events (default keep 8 weeks)
- `core4-month-close.timer`: writes previous-month CSV on the 1st
