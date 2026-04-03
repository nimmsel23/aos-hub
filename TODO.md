# aos-hub — TODO

Offene Aufgaben, sortiert nach Prioritaet. Neueste oben.

## Aktiv (diese Session)

- [x] bridge.env erstellt (statt monolithische aos.env)
- [x] core4.env erstellt (Tracker + CLI)
- [x] core4_paths.py Fallback auf ~/.core4
- [x] core4_paths.py liest ~/.env/core4.env
- [x] Bridge Service auf bridge.env umgestellt
- [x] scanForCore4Metrics() auf ~/.core4/ gefixt

## Offen (Core4 Env Refactor)

- [x] Bridge: Entfernt doppelte TW-Logik (_complete_core4_tw_task, _find_pending_core4_uuid, _run_task_done) — jetzt direkt tracker.py
- [x] Bridge: AOS_TASK_EXECUTE=1 setzen (war nach Reinstall verloren)
- [x] Bridge: _run_tracker_done() hinzugefuegt (direct Python subprocess zu tracker.py, nicht uber core4ctl)
- [ ] Bridge: Test Core4 Pipeline end-to-end (GAS → Bridge JSON → tracker.py done → TW hooks → Telegram)
- [ ] Ghost-Daten in ~/vault/Core4/ aufraeumen (leere 218-Byte Skeleton Day-Files)
- [ ] Toter Code in tracker.py Zeile 494-503 entfernen (nach return None unerreichbar)
- [ ] routes/core4.js: eigene Ledger-Schreiblogik entfernen, stattdessen POST an Bridge delegieren
- [ ] core4-lib.sh: CORE4_LOCAL_DIR Fallback pruefen (nutzt AOS_CORE4_LOCAL_DIR aus aos.env)
- [ ] ~/vault/Core4 Symlink oder Redirect auf ~/.core4 (falls andere Tools dort suchen)
- [ ] core4ctl doctor erweitern: Speicherpfad, Bridge-Erreichbarkeit, Events-Schreibtest

## Offen (Architektur)

- [ ] Bridge app.py ist 3000+ Zeilen Monolith — aufteilen in Module (core4_handler, fire_handler, sync_handler)
- [ ] Index-Node /api/core4/log soll an Bridge proxyen statt selbst Events zu schreiben (Dual-Write Problem)
- [ ] Env-Trennung fuer weitere Services (router.env, index.env) nach bridge.env Muster
- [ ] /etc/aos/aos.env Symlink: brauchen wir ihn noch? Wer liest ihn ausser core4_paths.py (gefixt)?

## Offen (Waybar / Sway)

- [ ] C4 Waybar zeigt "n/a" wenn heute noch nichts geloggt — evtl. gestrigen Score anzeigen statt n/a
- [ ] Weitere Waybar-Module pruefen (battery-conditional, taskwarrior-*, clipboard)

## Spaeter

- [ ] core4ctx.zsh: prueft core4ctl Befehle die evtl. nicht existieren (show, scores, log, chapters)
- [ ] c4d Wrapper geht ueber ~/.dotfiles/bin/core4 statt direkt — Symlink-Kette vereinfachen
- [ ] wcore4: task 28 Report pruefen ob er nach Reinstall funktioniert
