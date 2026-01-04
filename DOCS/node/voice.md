# Centre: Voice (Node)

## Purpose
Local Voice Centre for session capture and file history.

## Entry
- UI: `http://127.0.0.1:8799/voice`

## Storage
- Vault: `~/Voice` (preferred) or `~/AlphaOS-Vault/VOICE`

## API (Node)
- `POST /api/voice/export` (save session markdown)
- `GET /api/voice/history?limit=50`
- `GET /api/voice/file?path=relative/path.md`
- `POST /api/voice/autosave`

## Env
- `VOICE_VAULT_DIR` (default auto-detect)
