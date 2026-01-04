# Centre: Fire (Node)

## Entry
- UI: `http://127.0.0.1:8799/game/fire`

## Storage
- Vault: `~/AlphaOS-Vault/Game/Fire` (local)

## API (Node)
- `GET /api/fire/day` (Taskwarrior primary, TickTick fallback)
- `GET /api/fire/week?tag=fire` (Taskwarrior primary, TickTick fallback)
- Aliases: `/fire/day`, `/fire/week`, `/fired`, `/firew`
- Export via `/api/game/export`

## Env
- `FIRE_GCAL_EMBED_URL`
- `FIRE_TASK_TAGS_ALL` (default: `fire,production,hit`)
- `FIRE_TASK_DATE_FIELDS` (default: `scheduled,due`)

## Notes
- Taskwarrior is the primary source for `/api/fire/day` and `/api/fire/week` when local is online.
- TickTick is a fallback; it requires Taskwarrior hooks to push `+fire +production +hit`.
