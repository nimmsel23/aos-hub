# Router Bot Guidelines

## Project Structure & Purpose
- `router_bot.py` is the aiogram router (Telegram commands → centre URLs).
- `extensions/` holds opt-in command modules (e.g., warstack trigger).
- `config.yaml` maps extensions + base URLs.
- `routerctl` manages systemd user units + heartbeat timers.

## Run & Ops
- Manual run: `python router_bot.py`
- Systemd: `routerctl install`, `routerctl restart`, `routerctl status`
- Heartbeat: `routerctl heartbeat install|ping|status`

## Configuration
- `config.yaml` is the source of truth for enabled extensions and URLs.
- `.env` is loaded by the systemd unit (token, endpoints, Tailscale IPs).
- `.env` must be a file, not a directory (systemd fails if it points to a dir).
- Default unit path: `~/.config/systemd/user/alphaos-router.service`
- Default env path: `router/.env` (or `ENV_FILE=...` when using `routerctl`)

## Coding Style
- Keep handlers small and stateless.
- Use extension modules for new commands instead of bloating `router_bot.py`.

## Notes / Gotchas
- Router is a dispatcher only; it does not create War Stacks itself.
- Heartbeat posts `{"kind":"heartbeat"}` to the GAS webhook for online status.
