# Fish CLI overview

This repo uses Fish as the primary CLI entry point for αOS.

## Entry points

- `aos` function: defined in `~/.dotfiles/config/fish/functions/alphaos.fish`
- `alphaos` function: legacy alias that calls `aos`

## Registry

- Registry file: `~/.aos/registry.tsv`
- Builder: `~/.dotfiles/config/fish/functions/alphaos_registry.fish`
- Rebuild: `aos regen`
- View: `aos registry`

## UI and greeting

- `aos ui`: interactive menu (Fish)
- `aos-menu`: alternate menu function
- `aos_greeting`: startup banner and quick status
- Disable ctl status block: `AOS_SHOW_CTL_STATUS=0`

## Related docs

- Hot List CLI: `aos-hub/DOCS/fish/aos-hot.md`
- Codex branch shortcuts: `aos-hub/DOCS/fish/codex-sessions.md`
- Dotfiles Fish README: `~/.dotfiles/config/fish/README.md`

## Notes

- This repo keeps small Fish entry points in `DOCS` only.
- The authoritative Fish implementation lives in dotfiles.
