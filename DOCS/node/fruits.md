# Centre: Fruits (Node)

## Purpose
Local Fruits maps with JSON storage + vault export.

## Entry
- UI: `http://127.0.0.1:8799/facts`

## Relation to Router Bot
Telegram handling is not in Node. The Router bot extension `router/extensions/fruits_daily.py`
talks to this Node API (`/api/fruits/*`) to implement `/facts`, `/next`, `/skip`, answers, etc.

Important rule: do not share a Telegram bot token between Router and any GAS bot/webhook.

## Storage
- Questions JSON: `data/fruits_questions.json`
- Store JSON: `FRUITS_STORE` (default `~/AlphaOS-Vault/Game/Fruits/fruits_store.json`)
- Export dir: `FRUITS_EXPORT_DIR` (default `~/AlphaOS-Vault/Game/Fruits`)

## API (Node)
- `GET /api/fruits`
- `GET /api/fruits/users`
- `POST /api/fruits/register`
- `POST /api/fruits/next`
- `POST /api/fruits/answer`
- `POST /api/fruits/skip`
- `POST /api/fruits/export`

## Env
- `FRUITS_QUESTIONS`
- `FRUITS_DIR`
- `FRUITS_STORE`
- `FRUITS_EXPORT_DIR`

## Ops
- Node service is typically managed via systemd user units; helper CLI: `nodectl` (repo root).
  - Examples: `nodectl monitor`, `nodectl open`, `nodectl dev`
- Cross-service health: `hubctl doctor`
