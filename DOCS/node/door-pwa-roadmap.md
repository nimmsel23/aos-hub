# Door PWA Ausbauplan

Status: active
Scope: index-node + dedicated PWA runtimes
Last Update: 2026-03-07

## Zielbild

The Door wird als Familie von spezialisierten PWAs gebaut, nicht als eine einzige grosse UI.

Zielzustand:
- `Potential` = eigenstaendige Hot-List-App
- `Plan` = eigenstaendige Door-War- und War-Stack-App
- `Production` = eigenstaendige Hit-List-App
- `Profit` = eigenstaendige Review-App
- `Door Hub` = duenne Orchestrator- und Launcher-App fuer diese vier Phasen

Wichtig:
- `Potential` bleibt Teil von The Door als Phase 1.
- Die Trennung der Install-Routen dient nur PWA-Scope, Installierbarkeit und Stabilitaet.
- Der Hub ist nicht die primaere Arbeitsflaeche, sondern Einstieg, Statusboard und Uebergabepunkt.

## Ist-Stand

Bereits vorhanden:
- standalone `Potential` PWA unter `/pwa/potential/`
- standalone `Plan` PWA unter `/pwa/plan/`
- standalone `Production` PWA unter `/pwa/production/`
- standalone `Profit` PWA unter `/pwa/profit/`
- Door Hub unter `/pwa/door/`
- alte Door-Phasen-Shells unter `/pwa/door/*` als Redirect-/Compat-Layer
- kanonische Potential-Backend-Strecke ueber `door/python-potential/hot.py`
- Door APIs fuer:
  - Potential Hot List
  - Plan / Door War / War Stack
  - Plan / manuelle Quadrant-Zuordnung mit Priority-Sync
  - Production / Hits
  - Profit / Reflections

Aktuelle Schwaeche:
- Potential nutzt noch Legacy-Assets unter `/pwa/door/potential/*` (sollte in eigene Assets migrieren)
- Door-Runtime/Docs enthalten noch alte Beschreibungen, die nicht komplett auf den neuen Ist-Stand angepasst sind
- Shared Door Alt-App (`public/pwa/door/app.js`) existiert noch als Legacy-Oberflaeche neben den neuen Solo-Apps

## Architekturregeln

1. Erst einzelne Phasen bauen, dann den Hub neu denken.
2. Jede installierbare Phase bekommt ihren eigenen PWA-Scope.
3. Keine zweite konkurrierende Datenwahrheit fuer Hot List oder Door Flow.
4. Shared UI nur extrahieren, wenn mindestens zwei Phasen dieselben Muster wirklich brauchen.
5. Alte Door-Routen duerfen weiterleiten, aber nicht wieder zur primaeren Arbeitsflaeche werden.

## Ausbau-Reihenfolge

### Phase A - Potential stabilisieren

Ziel:
- `Potential` als alltagstaugliche Phase-1-App absichern

Arbeiten:
- offline queue fuer mehr als nur `add`
- mobile UX polieren
- empty states, errors, reconnect klarer machen
- alte `/pwa/door/potential/*` Pfade nur noch als Redirect-/Compat-Layer behandeln

Exit-Kriterium:
- Potential ist die klare installierbare Standard-App fuer Hot-List-Arbeit

### Phase B - Plan als Solo-PWA bauen

Ziel:
- `Plan` als naechste echte Door-Arbeitsflaeche unter eigener Route, voraussichtlich `/pwa/plan/`

Arbeiten:
- Candidate-Auswahl aus Potential
- Door War UI
- War Stack Start / Resume / Answer Flow
- letzte Door Wars und War Stacks sichtbar machen
- eigener Manifest- und Service-Worker-Scope

Exit-Kriterium:
- Plan kann ohne Door-Hub direkt installiert und benutzt werden

### Phase C - Production als Solo-PWA bauen

Ziel:
- `Production` als fokussierte Wochen-Hit-Ansicht unter eigener Route, voraussichtlich `/pwa/production/`

Arbeiten:
- nur aktive Wochen-Hits zeigen
- hit toggle sauber und schnell
- Wochen-Summary sichtbar machen
- mobile-first Fokus auf Abarbeitung statt Verwaltung

Exit-Kriterium:
- Production taugt als taegliche Ausfuehrungs-App

### Phase D - Profit als Solo-PWA bauen

Ziel:
- `Profit` als Review- und Reflection-App unter eigener Route, voraussichtlich `/pwa/profit/`

Arbeiten:
- completed Doors klar auflisten
- Reflection-Form auf mobile Nutzung zuschneiden
- Reflexionsdateien sauber sichtbar machen
- schnelle Uebernahme aus abgeschlossenen Doors

Exit-Kriterium:
- Profit taugt fuer Wochenabschluss und Rueckblick

### Phase E - Door Hub neu aufsetzen

Ziel:
- `/pwa/door/` wird ein duennes Hub statt einer grossen Multi-Tool-App

Arbeiten:
- 4 Karten / Launcher fuer Potential, Plan, Production, Profit
- Counts, letzte Aktivitaet, Wochenstatus, offene Sessions
- Deep Links in die Solo-PWAs
- keine volle Editor- oder Ops-Last mehr im Hub

Exit-Kriterium:
- Door Hub ist klarer Einstieg und Ueberblick, nicht mehr die Hauptarbeitsflaeche

## Quick Wins

Die sinnvollsten kurzen Schritte sind:

1. `Plan` als eigene Route vorbereiten
2. `Potential` Offline-Queue fuer `done/delete` erweitern
3. Door Hub auf Launcher-Denke reduzieren
4. alte Potential-Pfade und Doku weiter bereinigen

## Nicht-Ziel

Das Ziel ist nicht:
- eine einzige riesige Door-Super-PWA
- vier unterschiedliche Backend-Wahrheiten
- vorschnelle Shared-Komponenten-Extraktion
- Potential aus The Door herauszuloesen

## Entscheidungssatz

Die naechste grosse Arbeit nach `Potential` ist `Plan`.

Wenn `Plan` als Solo-PWA steht, wird klarer:
- wie `Production` aussehen muss
- wie `Profit` aussehen muss
- welche Rolle der Door Hub am Ende wirklich haben soll
