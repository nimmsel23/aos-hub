# Tent Centre Prototype Guidelines

Das lokale `game/tent/tentctl`-Skript wird in Codex-Sessions für dateibasierte Tent-Prototypen verwendet.

## Scope
- `game/tent/` in this repo is the terminal-first Tent area (weekly synthesis + bot tooling).
- It complements, but does not replace, the production-oriented GAS implementation:
  - `game/tent/bot/` (Telegram bot fallback)
  - `game/gas-tent-dev/` (preferred GAS standalone/webapp)

## Blueprint Alignment (important)
- Primary blueprint for this pillar:
  - `~/vault/AlphaOS-blueprints/41 - General_s Tent.md`
- Upstream input context (do not re-own here):
  - `~/vault/AlphaOS-blueprints/30 - Profit.md` (Door final-stage weekly yield/execution review)

## Tent vs Door/Profit Boundary
- Kapitel 41 beschreibt Tent als **woechentliche Strategie-/Review-Session** (Return/Report, Lessons, Course Correction, New Targets).
- Kapitel 30 beschreibt Profit im Door-Ablauf; diese Werte sind daher ein Input fuer Tent-Return/Report.
- Tent darf diese Inputs im eigenen Wochen-Review persistieren (Markdown/JSON/CSV) als Session-/Historie-Artefakte.

## Sealed Session / Artifacts (prototype convention)
- Final primary artifact: sealed Tent markdown (weekly review session output), currently `generalstent_YYYY-KWxx.md`.
- Session JSON can exist as history/audit trail (internal to Tent).
- `weekly_core4score.csv` should be generated from Core4 week JSON data (`core4_week_YYYY-Www.json`) when available; manual input is fallback only.
- Additional exports (e.g. later annual CSV rollups) are supporting bundle artifacts for the weekly/annual review.
- Keep canonical vs `_history` copies explicit when implementing local file writers (see `generals_tent.fish`).

## Prototype Run (Codex Session)
- `game/tent/tentctl weekly [--week YYYY-Www]`
- Runs `game/tent/generals_tent.fish` interactive weekly session.
- Produces canonical + `_history` artifacts in `Game/Tent/`.

## Conventions
- Keep Tent prototype front matter stable (`type`, `week`, `source_refs`, `status`).
- Tent should synthesize Fire outputs; avoid embedding Fire business logic into `scripts/`.
- Keep Tent synthesis distinct from Door/Profit scoring logic; prefer consuming Door/Profit outputs over re-implementing Profit rules here.

## Known Open Baustellen (Storage/Archiv)
- Retention/Prune fuer `Game/Tent/_history/` und `Game/Tent/generals_tent/_history/` ist noch offen.
- Lokale Dateinamen (`generalstent_YYYY-KWxx.md`) und bestehende Index-Node-Namen (`generals_tent_YYYY-Www.md`, `tent_YYYY-Www.md`) sind noch nicht vereinheitlicht.
- Weekly Core4 CSV nutzt Core4 week JSON mit Fallbacks; Traceability (z. B. Hash/mtime, strict source policy) ist ausbaubar.
- Voice-/Door-Scores im Weekly Run sind derzeit manuell; API-/Datei-Anbindung ist noch eine offene Architekturentscheidung.
