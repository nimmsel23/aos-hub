# Fire (Taskwarrior → Firemap → Centres)

This folder is the documentation home for everything Fire-related in `aos-hub`.

## Mental Model

- **`task fire`**: terminal report for “what must execute now”.
- **Firemap (Telegram)**: daily/weekly snapshots sent via `firectl` (and timers).
- **Index Node Fire Centre**: local UI + `/api/fire/day|week` (TickTick first; Taskwarrior fallback).
- **Router `/fire`**: on-demand trigger (starts the same systemd units as the timers).

## Where The Code Lives

- Terminal report setup: `scripts/setup-fire-map.sh`
- Fire tooling CLI: `scripts/firectl`
- Firemap engine: `python-firemap/firemap.py`
- Firemap sender: `python-firemap/firemap_bot.py`
- Index Node endpoints: `index-node/server.js` (`/api/fire/day`, `/api/fire/week`)
- Router trigger extension: `router/extensions/firemap_commands.py`

## Expected Semantics (Taskwarrior Fallback)

For “daily” / “weekly” selection:
- Include tasks with **dates** in `due|scheduled|wait` within the day/week window (and overdue separately).
- Additionally include **undated** tasks if they match execution tags (default: `production,hit,fire`).

Firemap prefers reading a Taskwarrior export snapshot (default: `~/.local/share/alphaos/task_export.json`) to avoid DB-lock/permission issues; it falls back to `task ... export` if the snapshot is missing/stale.

Update the snapshot (recommended, also used by other tooling):

```bash
scripts/taskwarrior/export-snapshot.sh
```

## Systemd Units (User)

Common units (host user):
- `alphaos-fire-daily.timer` → `alphaos-fire-daily.service` → `scripts/firectl send daily`
- `alphaos-fire-weekly.timer` → `alphaos-fire-weekly.service` → `scripts/firectl send weekly`

Router `/fire` and `/fireweek` prefers `systemctl --user start` on these units (same logs/env).

## Environment (No Secrets In Git)

Firemap sender reads env (recommended: shared file) and also auto-loads `python-firemap/.env` as a fallback:
- Shared env (preferred): `~/.env/fire.env` (or set `AOS_FIRE_ENV_FILE=/path/to/fire.env`)
- Repo-local (untracked) option: `fire/fire.env` (useful for local Codex sessions in this repo)
- `AOS_FIREMAP_BOT_TOKEN`, `AOS_FIREMAP_CHAT_ID` (Telegram API)
- `AOS_FIREMAP_SENDER=api|tele|auto`
- `AOS_FIREMAP_TAGS=production,hit,fire` (undated inclusion tags)
- `AOS_FIREMAP_TAGS_MODE=any|all`
- `AOS_FIREMAP_INCLUDE_UNDATED_DAILY=1`
- `AOS_FIREMAP_TASK_EXPORT_PATH=~/.local/share/alphaos/task_export.json`
- `AOS_FIREMAP_TASK_EXPORT_MAX_AGE_SEC=600`

Index Node Fire Taskwarrior fallback can be tuned via:
- `FIRE_TASK_DATE_FIELDS=scheduled,due,wait`
- `FIRE_INCLUDE_UNDATED=1`
- `FIRE_TASK_TAGS=production,hit,fire`
- `FIRE_TASK_TAGS_MODE=any|all`

## Troubleshooting

If the daily Telegram Firemap suddenly shows too few overdue tasks:
- Check whether overdue tasks in Taskwarrior actually have `due|scheduled|wait` set.
- Verify the Firemap engine isn’t accidentally tag-filtering dated tasks (it shouldn’t).
- Use `firectl doctor` and `python python-firemap/firemap_bot.py test --debug --scope daily` for counts.

## Fire Git (Vault)

If your Fire vault folder is a git worktree, `firectl` can manage it:

- `firectl git status`
- `firectl git sync` (add/commit + pull --rebase + push)

Set `AOS_FIRE_GIT_DIR` if your git repo root is above/below `AOS_FIRE_DIR`.
