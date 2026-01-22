# AOS Centres (Desktop Integration)

This is the desktop entrypoint for AOS. Centres are defined in
`index-node/menu.yaml` and opened via the local router:
`http://127.0.0.1:8799/<cmd>`.

## Files

- Config: `aos-hub/config/aos-centres.env`
- CLI: `bin/aos-centres`
- Sway bindings: `sway/config.d/aos-centres.conf`
- Hypr bindings: `hypr/modules/aos-centres.conf`
- Sway lock hook: `bin/aos-swaylock.sh`

## Commands

```bash
# Update centre URL in menu.yaml (source of truth)
aosctl centre add Body https://...
aosctl centre add Being https://...
aosctl centre add Balance https://...
aosctl centre add Business https://...

# Open centres (uses node router)
aosctl centre open root
aosctl centre open body

# Boot sequence from config
aosctl centre boot
```

## Menu editing

`alphaos-index-menu` is the canonical menu editor for `menu.yaml`. Running
`indexctl` without arguments or with the `menu` keyword now proxies directly to
that script, so you always get the Gum-powered menu workflow regardless of how
you invoke the command.

## Config (aos-centres.env)

- `AOS_NODE_URL` (default `http://127.0.0.1:8799`)
- `AOS_BROWSER` (`falkon` or `firefox`)
- `AOS_APP_MODE=1` uses kiosk/app mode (no address bar)
- `AOS_BOOT_CENTRES` space-separated list (e.g. `root body being`)
- `AOS_LOCK_ACTION` centre to open before swaylock (`root` or `boot`)
- `AOS_WS_*` workspace mapping for each centre

## Developer helpers

- `bin/aos-index-dev.sh` starts Foot, launches `npm run dev` inside
  `~/aos-hub/index-node` and helps you land the workspace you want. Pass
  `--workspace` to move Foot/Hypr/Sway to the right desktop and `--editor` to
  launch your editor once the dev server is up.
- When `--editor` is used, the helper passes the command stored in
  `AOS_INDEX_EDITOR_CMD` (e.g. `export AOS_INDEX_EDITOR_CMD='nvim .'`), so you can
  keep choosing your preferred editor without touching the script.

## Notes

- `menu.yaml` is the single source of truth for centre URLs.
- The node router resolves `/body`, `/being`, `/balance`, `/business`.
- Sway uses `bin/aos-swaylock.sh` to open the index before locking.
- The main Index grid includes Body/Being/Balance/Business when those
  centre commands exist in `menu.yaml`.
- Added ChatGPT Body/Being/Balance/Business links (and Door GPT) so the Core4
  zone exposes them directly in the Matrix grid.
- Added `/gpt/<name>` redirects (e.g. `/gpt/voice` or `/gpt/body`) pointing at the same GPT links for quick launches.
- A local wrapper now lives at `~/αOS/aos/bin/indexctl` and is prepended to
  your `PATH` (see `export PATH="$HOME/αOS/aos/bin:$PATH"` in `~/.bashrc`). It
  defers to `alphaos-index-menu` when no arguments or `menu` are provided and
  forwards everything else to `/home/alpha/aos-hub/scripts/indexctl`, so you can
  keep the menu editor primary without touching the root script.
