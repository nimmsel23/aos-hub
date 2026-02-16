# scripts/CATALOG.md

Schnelle Orientierung fuer `aos-hub/scripts/`.

## Wenn du nicht nachdenken willst

Nutze diese Frontdoors:
- `aosctl` (Production/system scope)
- `hubctl` (Dev/user scope)
- `nodectl` / `indexctl` (Index Node)
- `syncctl` (Sync)
- `backupctl` (Backups)
- `gasctl` / `telectl` / `firectl` (GAS/Tele/Fire)

## Runtime Scope Policy

- Production: `aosctl` + systemd **system** units (`aos-index.service`, `aos-router.service`, `aos-bridge.service`).
- Dev: `hubctl dev ...` + systemd **user** units (`aos-index-dev.service`, `aos-router-dev.service`, `aos-bridge-dev.service`).
- Legacy `alphaos-*` Units sind Migrationsfaelle und nicht mehr der primäre Sollzustand.

## Klassen

### Strict CTL (bevorzugt)
- `backupctl`
- `firectl`
- `gamectl`
- `gasctl`
- `hubctl`
- `indexctl`
- `mountctl`
- `nodectl`
- `rclonectl`
- `syncctl`
- `telectl`

Regel:
- Shared libs nutzen (`codex-subcmd.sh`, `aos-env.sh`, `ctl-lib.sh`)
- Keine lokalen Redefinitionen der Common-Helper

### Legacy CTL (Migration offen)
- `aos-aliasctl`
- `aos-syncctl`
- `blueprintctl`
- `gitctl`
- `hookctl`
- `systemstatusctl`

### Wrapper CTL (nur Weiterleitung)
- `doorctl`
- `voicectl`
- `syncvaultctl` (deprecated -> `syncctl`)

## Wichtige Non-CTL Tools
- `heartbeat`
- `aos-sync`
- `aos-doctor`

## Sync-Utils Konsolidierung

- Kanonische Implementierungen liegen in `scripts/sync-utils/`.
- `scripts/utils/git-auto-sync.sh`, `scripts/utils/rclone-domain-sync.sh` und
  `scripts/utils/rclone-vitaltrainer-copy.sh` sind nur noch Kompatibilitaets-Wrapper.

## Validierung

```bash
scripts/scripts-lint.sh
```

## Entscheidungsregel

1. Neuer operational command -> neues `*ctl` in Strict-Form.
2. Bestehendes Legacy nur anfassen, wenn:
   - Bugfix noetig ist, oder
   - gerade Migration auf Strict gemacht wird.
3. Wrapper bleiben klein und delegieren per `exec`.
