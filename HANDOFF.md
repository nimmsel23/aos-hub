# Handoff (AOS Hub)

Stand: 2026-03-02

## Zielbild (kurz)
- Index lokal im Dev-Flow stabil halten (`npm run dev` / `aos-index-dev.service`).
- Core4 als Habit-Tracker-first betreiben.
- PIN/Auth-Probleme schnell und reproduzierbar prüfen.

## Aktueller Betriebsmodus
- Bevorzugter Index-Dienst: `aos-index-dev.service` (user scope, `npm run dev`)
- Nützlicher Alias (lokal): `node-restart` -> `systemctl --user restart aos-index-dev.service`
- `nodectl`/`indexctl` Service-Kommandos sind user-service-only.

## Kanonische Kurzbefehle
- Dienst neu starten (Dev): `systemctl --user restart aos-index-dev.service`
- Dienststatus: `systemctl --user status aos-index-dev.service --no-pager`
- Logs: `journalctl --user -u aos-index-dev.service -n 120 --no-pager`
- Core4 Schnellcheck: `nodectl core4-check quick`
- PIN Status: `nodectl pin status`
- PIN temporär aus: `nodectl pin off`
- PIN wieder an: `nodectl pin on`

## Schnelle Störungsroutine (wenn PWA/Core4 spinnt)
1. Dev-Dienst neu starten:
   - `systemctl --user restart aos-index-dev.service`
2. Status prüfen:
   - `systemctl --user status aos-index-dev.service --no-pager`
3. PIN prüfen:
   - `nodectl pin status`
4. Bei weiterhin kaputt testweise PIN deaktivieren:
   - `nodectl pin off`
   - danach erneut Restart
5. Bei Crash Logs sichern:
   - `journalctl --user -u aos-index-dev.service -n 120 --no-pager`

## Bekannte Stolpersteine
- `Unexpected token '<'` deutet meist auf HTML-Antwort (Auth/PIN) statt JSON.
- `HTTP 404` im gleichen Kontext kann ebenfalls durch PIN/Auth-Flow maskiert sein.
- `core4ctl` nicht als primäre Daily-UX behandeln (Ops/Compat-Shim).
- Mount-Workflows gelten hier nicht mehr als Standardpfad.

## Offene Punkte (nächste Session)
1. End-to-end Smoke mit laufendem User-Systemd auf Host durchziehen (nicht nur Sandbox).
2. Optional: kompakten `hubctl`/`nodectl doctor` Block um PIN-Status erweitern.
3. `index-node/server.js` modularisieren: Fitness-Centre-Handler nach `index-node/routes/fitness-centre.js` auslagern und Helper entkoppeln. (erledigt)

## codex-mapguard -> codex-neighbor (Game/PWA Stand)
- Frame/Freedom/Focus laufen jetzt im gewünschten Split:
  - Frontend editiert Markdown-Body.
  - Backend hält strukturierte States/Frontmatter/Cascade.
- `index-node/routes/frame.js`:
  - SSOT bleibt YAML state (`~/.aos/frame/{domain}.yaml`).
  - API liefert editorfreundliches Markdown für `pwa/frame`.
- `index-node/routes/freedom.js`:
  - `GET` liefert body-only (ohne Frontmatter).
  - `POST` nimmt body-only (full-md backward-compatible) und baut Frontmatter intern.
- `index-node/routes/focus.js`:
  - `/api/focus/month` liefert mission body-only (ohne Frontmatter + ohne Cascade-Blöcke).
  - `/api/focus/entry` liefert entry body-only.
  - Save-Endpunkte setzen Frontmatter/Cascade serverseitig wieder zusammen.
- PWA UX:
  - `pwa/frame` Hint wieder markdown (`Markdown · Obsidian-compatible`), kein YAML-Hinweis im Editor.
  - `pwa/focus` Mission-Preview ignoriert Markdown-Headings für bessere Karten-Vorschau.
- Smoke (ohne Service-Neustart, gegen laufendes `127.0.0.1:8799`) erfolgreich:
  - `/health`
  - `/api/frame/domain?domain=body`
  - `/api/frame/domains`
  - `/api/freedom/domain?domain=body&year=2026`
  - `/api/focus/month`
  - `/api/focus/entry?date=<today>`
- Reminder SSOT-Policy:
  - Bitte keine YAML-Editorflächen in PWA zurückbringen.
  - Für alle AlphaOS stages/phases/maps zentrale Template-SSOTs beibehalten und toolübergreifend nutzen.

## Änderungen (2026-03-02)
- Fire Pushes konsolidiert: `aos-fire-daily.service` sendet Telegram **+** GCal in einer Unit (daily 08:00, `Persistent=true`). Weekly Telegram separat: `aos-fire-weekly.timer` Sonntag 22:00.
- Unit-Umbenennung abgeschlossen: `alphaos-*` → `aos-*` (Fire daily/weekly, GCal-Timer deaktiviert).
- `firectl status` kompakt: zeigt Fire daily Erfolg + PWA lokal/tailnet Reachability (`/pwa/health`).
- Game/Fire API entkoppelt: neue Endpoints `GET /api/fire/tasks-day` und `GET /api/fire/tasks-week` (optional `?domain=body|being|balance|business`).
- Game/Fire UI (`index-node/public/game/fire.html`) nutzt die neuen Task-Endpoints.
- Fire-API vereinfacht: nur noch `index-node/routes/fire.js` mit `/api/fire/day|week|week-range` (Taskwarrior SSOT, kein TickTick).

## codex-mapguard -> codex-neighbor (GAS fallback wiring)
- Neue Datei: `~/.env/gas.env` als zentrale URL-Liste für GAS `/exec` WebApps.
- Index-Node Endpoint: `GET /api/pwa/gas-fallback?app=<key>`
  - liest aus `~/.env/gas.env` (oder `AOS_GAS_ENV_FILE`)
  - liefert Route-Map für `core4|door|game|frame|freedom|focus|fire`.
- Shared Frontend Hook: `index-node/public/pwa/gas-fallback.js`
  - cached Fallback-Routen in `localStorage`
  - Health-Probe auf `/health`
  - bei Node-Ausfall Redirect zur passenden GAS URL.
- Eingehängt in PWA-Indexseiten: `core4`, `door`, `fire`, `focus`, `frame`, `freedom`, `game`, `fitness`.
- Fetch-Hook aktiv in API-lastigen PWAs (`core4/fire/focus/frame/freedom/fitness`) für Redirect bei Netzwerkfehlern/5xx.
- `door` + `game` haben jetzt eigene PWA shells (manifest + sw + icons) für cache-basierten Start.
- Architektur-Priorität (user-note): `core4` daily basis inkl. `fire`; `door` eher weekly/sometime.
- Klarstellung (latest): Fokus auf lokale Standalone-PWA-Stabilität; GAS bleibt letzter, optionaler Fallback.

## codex-mapguard -> codex-neighbor (Standalone PWA Runtime)
- Neuer separater Runtime-Entry: `index-node/pwa-server.js`
- Startkommandos in `index-node/package.json`:
  - `npm run pwa`
  - `npm run pwa:dev`
- Zweck:
  - PWAs auf Laptop weiter nutzbar halten, auch wenn `index-node/server.js` gerade instabil ist.
  - Install-Quelle für Mobile kann bewusst `:8780` sein, wenn HQ-Runtime gerade refaktoriert wird.
  - `:8788` bleibt für `fitnessctx` reserviert.
- Architektur-/Roadmap-Doku:
  - `DOCS/node/pwa-resilience.md`
  - `pwa/ARCHITECTURE.md` (Laufzeit-Prinzip ergänzt)

## codex-mapguard -> codex-neighbor (pwactl Ausbau)
- `scripts/pwactl` ist kein Wrapper mehr, sondern eigener Control-CLI.
- Neue Kernkommandos:
  - `pwactl list`
  - `pwactl routes [main|pwa|all]`
  - `pwactl health [main|pwa|all]`
  - `pwactl check`
  - `pwactl doctor`
  - `pwactl open <app> [main|pwa]`
  - `pwactl run [main|pwa]`
- Fokus:
  - main runtime (`:8799`) und standalone runtime (`:8780`) in einem Frontdoor.
  - daily baseline respektiert (`core4/fire` zuerst in App-Reihenfolge).

## codex-ironforge -> codex-neighbor (pwactl Ausbau v2)
- `pwactl` weiter ausgebaut:
  - `pwactl menu` (interaktive Schnellaktionen)
  - `pwactl status` (kompakte Runtime/App-Reachability)
  - `pwactl apps` (nur App-IDs)
  - `pwactl run [main|pwa] [--force]` startet nicht blind neu, wenn Runtime bereits erreichbar ist.
- Strict-CTL Alignment:
  - `scripts/scripts-lint.sh` behandelt `pwactl` jetzt als strict ctl (nicht wrapper).
- Doku/Registry nachgezogen:
  - `scripts/README.md`
  - `registry.tsv`

## codex-ironforge -> codex-neighbor (PWA systemd + mode switch)
- Neuer User-Service im Repo:
  - `systemd/user/aos-pwa-dev.service`
  - Startmode über `~/.env/pwa.env`:
    - `AOS_PWA_RUN_MODE=dev` -> `npm run pwa:dev`
    - `AOS_PWA_RUN_MODE=normal` -> `npm run pwa`
- `pwactl` kann Mode jetzt umstellen:
  - `pwactl mode dev|normal [--restart]`
- `pwactl` hat systemd-Integration:
  - `pwactl service setup|install|start|stop|restart|enable|disable|status|logs|linger-*`
- Live-Setup ausgeführt:
  - `aos-pwa-dev.service` ist `active`
  - `curl http://127.0.0.1:8780/health` liefert `pwa-standalone`
- Port-Trennung:
  - PWA standalone: `8780`
  - `fitnessctx`: `8788` (belegt/bleibt reserviert)
- Vital Hub Runtime (pinned):
  - `4100` = clients only (`/c/<client>/...`), no admin/clientctx exposure
  - `8788` = Mr Coach variant incl. `clientctx` admin console
  - naming (`vital-hub`/`vitalctx`/`vital centre`) may vary, split stays fixed
- Vault-Policy umgesetzt im neuen Service:
  - `ReadWritePaths=%h/vault`
  - `Dokumente/*Vault` aus PWA-Service entfernt.

## codex-closeout (2026-03-08)
- Vital runtime split finalized and pinned:
  - `4100` = clients-only (`/c/<client>/...`), no `clientctx` exposure.
  - `8788` = coach/admin runtime incl. `clientctx`.
- New wrappers:
  - `clientctx` (admin on `8788`)
  - `vitalctx` (client-only on `4100`)
  - `clientdb` fish CLI for client DB operations.
- Index-node redirect set:
  - `8799/clients` and `8799/clients/` -> `http://127.0.0.1:8788/clientctx/`
- Root handoff refreshed for Claude-Code:
  - `~/HANDOFF.md` now contains the canonical continuation state.
