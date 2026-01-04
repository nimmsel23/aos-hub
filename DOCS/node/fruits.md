# Centre: Fruits (Node)

## Purpose
Local Fruits maps with JSON storage + vault export.

## Entry
- UI: `http://127.0.0.1:8799/facts`

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
