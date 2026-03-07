# Findings (AOS Hub)

Stand: 2026-02-27

## 1) Restart-Ziel war uneindeutig (Dev vs Prod)
- Bereich: `index-node/nodectl`, `scripts/indexctl`, systemd Units
- Symptom: `nodectl restart` lief über `indexctl restart` auf den Systemdienst (`node server.js`), obwohl lokal oft Dev erwartet wurde (`aos-index-dev.service`, `npm run dev`).
- Risiko: falscher Dienst wird neu gestartet, Debugging wirkt widersprüchlich.
- Status: **behoben**
- Fix:
  - `nodectl`/`indexctl` wurden auf user-service-only vereinheitlicht (`aos-index-dev.service`).
  - Systemdienst-Workflow wurde aus den Tools entfernt.

## 2) Core4 PWA Fehlerbild war auth-/PIN-bedingt
- Bereich: Core4 PWA + Index API
- Symptom: `Unexpected token '<'` und teils `HTTP 404` im Core4-Frontend.
- Ursache: API erhielt HTML (PIN/Auth Barrier) statt JSON.
- Status: **teilweise behoben + dokumentiert**
- Fix/Workaround:
  - PIN-Checks über `nodectl pin status|off|on|clear-sessions`
  - Nach PIN-Änderungen Dienst neu starten
  - Logs bei Crash:
    - `journalctl --user -u aos-index-dev.service -n 120 --no-pager`

## 3) Dokumentation war verteilt und unvollständig
- Bereich: Ops/Handoff
- Symptom: Kein zentrales `FINDINGS.md`/`HANDOFF.md` im Hub-Root.
- Risiko: Kontextverlust zwischen Sessions.
- Status: **behoben**
- Fix:
  - `aos-hub/FINDINGS.md` (diese Datei) angelegt
  - `aos-hub/HANDOFF.md` angelegt

## 4) Dev-Start in Doku teils inkonsistent
- Bereich: `index-node/AGENTS.md`, `index-node/runbook.md`
- Symptom: teils `npm start` als primärer lokaler Start, obwohl Dev-Flow über `npm run dev` läuft.
- Status: **behoben**
- Fix:
  - Doku auf Dev-first ausgerichtet (`npm run dev`), `npm start` als production-style Ergänzung.

## 5) Core4-Realität vs Legacy-Komplexität
- Bereich: Core4 CLI/Doku
- Beobachtung: Core4 ist im Alltag ein Habit-Tracker; `core4ctl` ist primär Kompatibilitäts-/Ops-Shim.
- Status: **dokumentiert**
- Hinweis:
  - Daily-Frontdoors: `core4`, `c4`, `c4d`, `wcore4`
  - Mount-basierte Workflows sind nicht mehr Standard.
