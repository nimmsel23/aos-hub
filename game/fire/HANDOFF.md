# Fire Handoff (Agent Notes)

## Scope
- This folder contains Fire pillar tooling.
- Current focus is Taskwarrior -> Google Calendar daily sync for due tasks.

## Current State
- GCal sync is implemented and wrapped in `firectl`.
- Selection source is configured to use custom Taskwarrior report `fired`.
- Overdue tasks are included daily until marked done.
- If a task has `scheduled`, event is pushed as timed (HH:MM from Taskwarrior), otherwise all-day.

## Key Entry Points
- `game/fire/firectl`
- `scripts/firectl` (compat wrapper to Fire firectl)

## GCal Commands
- `game/fire/firectl gcal bootstrap`
- `game/fire/firectl gcal auth`
- `game/fire/firectl gcal list`
- `game/fire/firectl gcal setup`
- `game/fire/firectl gcal doctor`
- `game/fire/firectl gcal due`
- `game/fire/firectl gcal auto enable [HH:MM]`
- `game/fire/firectl gcal auto status`
- `game/fire/firectl gcal auto disable`

## Relevant Scripts
- `game/fire/gcal-push-due.sh` (core logic)
- `game/fire/gcal-due.sh` (thin wrapper)
- `game/fire/gcal-setup.sh`
- `game/fire/gcal-auth.sh`
- `game/fire/gcal-bootstrap.sh`
- `game/fire/gcal-auto.sh`

## Config (Source of Truth)
- `game/fire/fire.env`

Expected active keys:
- `AOS_FIRE_GCAL_BACKEND="gcalcli"`
- `AOS_FIRE_GCAL_CALENDAR="Fire Map"` (or your calendar)
- `AOS_FIRE_GCAL_TW_SOURCE=report`
- `AOS_FIRE_GCAL_TW_REPORT=fired`
- `AOS_FIRE_GCAL_SCHEDULED_AS_TIMED=1`
- `AOS_FIRE_GCAL_SCHEDULED_DURATION_MIN=60`
- `AOS_FIRE_GCAL_DAILY_TIME=07:00`

Optional:
- `AOS_FIRE_GCAL_CLIENT_SECRET_JSON=...` (otherwise auto-detect `client_secret*.json` in this folder)

## Behavior Rules
- Data source:
  - report mode: `task fired export`
  - filter mode fallback: `status:pending due:today` + `status:pending due.before:today`
- Classifier:
  - due date = today -> today scope
  - due date < today -> overdue scope
- Idempotency:
  - script deletes its own marker-tagged day events first, then re-adds.
  - prevents duplicates on rerun.

## Quick Validation
- Preview:
  - `game/fire/firectl gcal due --backend print`
- Push:
  - `game/fire/firectl gcal due`
- Diagnostics:
  - `game/fire/firectl gcal doctor`

## Known Caveat
- In sandbox/CI terminal, `systemctl --user` may be unavailable.
- Auto timer must be enabled from a normal user session:
  - `game/fire/firectl gcal auto enable 07:00`

## Do Not
- Do not commit secrets or OAuth private values.
- Keep OAuth client JSON local/private.
- Do not move Fire business logic into `scripts/`; keep pillar logic in `game/fire/`.
