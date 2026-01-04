# Scripts Overview

Scripts live in `aos-hub/scripts/` unless stated otherwise.

## Core scripts

- `scripts/syncvaultctl`
  - Vault + repo sync helper (rclone + git).
  - See `DOCS/syncvaultctl.md` for full usage.

- `scripts/indexctl`
  - Node index service control (systemd install/restart/status).

- `scripts/aos-doctor`
  - System sanity checker (bridge/router/node/tailscale).

- `scripts/setup-fire-map.sh`
  - Fire Map bootstrap (arch-friendly, no pip).

## External CLIs

These are not in `scripts/`, but are core to ops:

- `bridgectl` -> `aos-hub/bridge/bridgectl`
- `routerctl` -> `aos-hub/router/routerctl`

## Notes

- Keep script docs in `DOCS/scripts/` and link from `DOCS/overview.md`.
