# Core4 CLI (local habit tracker)

`core4` is a thin wrapper around `aos-hub/core4/tracker.py`. It logs one Core4 habit as done and persists it as an append-only event (`.json` per done).

See `aos-hub/DOCS/CORE4.md` for the full “how it works”.

## Usage

- Log (defaults to today): `core4 fitness`
- Backfill (emergency): `core4 fitness -1d` or `core4 fitness done -1d`
- Scores:
  - Today: `core4 -d`
  - Yesterday: `core4 -1d`
  - Week: `core4 -w`

If you run `core4` with no args in an interactive shell and `fzf` is installed, it opens a habit picker.

## Idempotency / dedupe

The stable identity is `YYYY-MM-DD:domain:habit` (the `key`). Multiple events can exist (different sources), but scoring uses a deduped view by `key` so the day doesn’t count twice.

## Storage model (event ledger → day → week)

- **Event ledger (append-only, never edited):**
  - Local: `~/AlphaOS-Vault/Core4/.core4/events/YYYY-MM-DD/*.json`
  - Mount: `~/AlphaOS-Vault/Alpha_Core4/.core4/events/YYYY-MM-DD/*.json`
- **Derived artifacts (rebuilt anytime):**
  - Day: `~/AlphaOS-Vault/Core4/core4_day_YYYY-MM-DD.json`
  - Week: `~/AlphaOS-Vault/Core4/core4_week_YYYY-WWW.json`

Rclone push copies `~/AlphaOS-Vault/Core4` → `eldanioo:Alpha_Core4`, so the derived artifacts land in Drive as `Alpha_Core4/core4_week_...json` etc.

See `aos-hub/DOCS/CORE4_STORAGE_MODEL.md` for the full picture (writers, merge rules, and sync).

Override read roots with:

- `AOS_CORE4_DIR=/path/to/dir` (single root)
- `AOS_CORE4_DIRS=/path/one:/path/two` (priority order; first is the local write root)

## Integration notes

- Taskwarrior tasks are created+completed with `+core4` and `core4_YYYYMMDD` tags; the Taskwarrior hook logs to Bridge, and falls back to writing a local event if Bridge is down.
- TickTick completion is best-effort via `~/.dotfiles/bin/ticktick_sync.py --push` (mapping stored in `~/AlphaOS-Vault/.alphaos/core4_ticktick_map.json`).
