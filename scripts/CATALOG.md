# scripts/CATALOG.md

Schnelle Orientierung fuer `aos-hub/scripts/`.

## Wenn du nicht nachdenken willst

Nutze diese Frontdoors:
- `hubctl` (zentral)
- `nodectl` / `indexctl` (Index Node)
- `syncctl` (Sync)
- `backupctl` (Backups)
- `gasctl` / `telectl` / `firectl` (GAS/Tele/Fire)

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
