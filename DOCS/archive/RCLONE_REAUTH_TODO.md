# Rclone Reauth Stabilization (TODO)

Goal: stop periodic "rclone reconnect" surprises and make Drive sync/mounts predictable.

## Diagnose (do first)
- Confirm which remote is used (`AOS_RCLONE_REMOTE`, usually `eldanioo:`) and where config lives (`~/.config/rclone/rclone.conf`).
- Check whether failures are:
  - token refresh failures (expired/invalid refresh token)
  - 2FA / "security challenge" events
  - network/DNS flakiness
  - Drive rate limiting
  - mount process dying (fusermount, idle, sleep)
- Add a single "doctor" probe that runs:
  - `rclone about <remote>` (quick auth + quota check)
  - `rclone lsf <remote> --max-depth 1` (list root folders)
  - for mounts: `mountpoint` + `rclone rc core/stats` if using `--rc`

## Hardening Options (pick 1–2, not all)
- Switch heartbeat/sync to use `rclone copy/sync` only (no long-lived mounts) where possible.
- For mounts:
  - run mounts via systemd user services with restart policy + `After=network-online.target`
  - use `--vfs-cache-mode minimal` (or `writes` if needed), and explicit `--dir-cache-time`
  - add `--poll-interval 1m` (Drive) and `--timeout 30s`
  - consider `--daemon` + `ExecStop=rclone unmount ...` for clean restarts
- Authentication model:
  - re-run `rclone config reconnect <remote>:` once, then verify refresh token is present
  - if Google keeps invalidating: move to a dedicated Google account or a service account (workspace) if feasible
  - avoid multiple machines sharing the same remote creds if that triggers security invalidation

## Operational UX (make it easy)
- Add `syncctl doctor` output: remote auth + last push/pull + mount status.
- Add `syncctl reconnect` (just calls `rclone config reconnect <remote>:` + prints next steps).
- Add a manual one-shot push/pull commands that are always safe:
  - `syncctl pull --dry-run` then `syncctl pull`
  - `syncctl push --dry-run` then `syncctl push`

## Monitoring
- Emit a Telegram alert on:
  - mount down
  - `rclone about` failing
  - last successful push/pull older than N hours

