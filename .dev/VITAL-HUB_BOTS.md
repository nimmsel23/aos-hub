# Journal Dropfile Bots - vital-hub

**Pattern:** Telegram → Dropfile → Gemini → Journal + Telegram Output
**Domains:** Entspannung · Fitness · Fuel
**Schedule:** Einmal täglich (12:00) + on boot via systemd

---

## Konzept

Kein starres Format. Kein slash command. Einfach drauflosschreiben.

Der Bot sammelt Freitextnachrichten über den Tag. Um 12:00 pollt der systemd
Timer alle neuen Messages, speichert sie ins Dropfile und delegiert an Gemini.
Gemini strukturiert den Text, erkennt Muster, schreibt Insights. Das Ergebnis
geht ins Journal (lokal) und zurück an Telegram.

**Failsafe:** Dropfile und Journal werden immer gespeichert. Telegram Output
kommt nur wenn Gemini erfolgreich war. Fällt Gemini aus → fallback_parser.py
schreibt ein minimales Journal ohne Analyse, kein Telegram Output.

---

## Flow

```
Ganzer Tag: User schreibt Freitext an Telegram Bot
  "heute morgen 30min progressive entspannung, war angespannt aber danach viel besser"
  "bankdrücken 5 sätze 80kg, letzte waren schwer"
  "bircher zum frühstück, mittags hähnchen mit reis und brokkoli"

[12:00] systemd timer startet daily.sh
  → poller.py --domain entspannung
  → poller.py --domain fitness
  → poller.py --domain fuel

poller.py (pro Domain):
  1. Telegram getUpdates API (neue Messages seit letztem Run)
  2. Append raw text → Dropfile (IMMER, failsafe)
  3. Falls neue Messages: gemini_processor.py --domain X im Hintergrund starten
  4. Beendet sich

gemini_processor.py (pro Domain):
  1. Dropfile lesen
  2. Gemini API mit domain-spezifischem Prompt
  3a. Gemini OK:  Journal speichern (strukturiert) + Telegram Output
  3b. Gemini fail: fallback_parser.py → Journal speichern (raw) + kein Telegram
```

---

## Dateien

```
~/vital-hub/
├── session_logger_helper.py     Base class: file I/O + state (kein Parsing)
├── poller.py                    Telegram polling → Dropfile, triggert Gemini
├── gemini_processor.py          Gemini API, Journal save, Telegram output
├── fallback_parser.py           Minimal structuring ohne Gemini
├── daily.sh                     Wrapper: alle 3 Domains nacheinander
│
├── entspannungsctx/
│   ├── bot.py                   Entry point (deprecated, durch poller.py ersetzt)
│   ├── aggregator.py            (deprecated, durch gemini_processor.py ersetzt)
│   ├── entspannung-YYYY-MM-DD.md  Daily dropfile (raw Freitext)
│   ├── ENTSPANNUNG.md           Aktuelles Dropfile (für Claude Code Sessions)
│   ├── .last_update_id          Telegram polling state
│   └── journal/
│       └── YYYY-MM-DD.md        Tägliches Journal (Gemini oder Fallback)
│
├── fitnessctx/                  (gleiche Struktur)
└── fuelctx/                     (gleiche Struktur)
```

---

## Konfiguration

**Env vars** (aus `~/.env/telegram.env` + `~/.env/gemini.env`):

| Variable | Quelle | Verwendung |
|---|---|---|
| `BOT_TOKEN` | telegram.env | Telegram API auth |
| `CHAT_ID` | telegram.env | Nur Messages von dieser Chat-ID |
| `GEMINI_API_KEY` | gemini.env | Gemini API auth |
| `GEMINI_MODEL` | gemini.env | Default: `gemini-2.5-flash` |

---

## Systemd

```
~/.config/systemd/user/
├── vital-hub-daily.timer      OnCalendar=12:00, OnBootSec=2min
├── vital-hub-daily.service    ExecStart=daily.sh (alle 3 Domains)
└── vital-hub-poller@.service  Template: poller.py --domain %i (optional)
```

**Aktivieren:**
```bash
systemctl --user daemon-reload
systemctl --user enable vital-hub-daily.timer
systemctl --user start vital-hub-daily.timer

# Status prüfen
systemctl --user list-timers vital-hub-daily.timer
journalctl --user -u vital-hub-daily.service -n 50
```

**Manuell testen:**
```bash
# Einzelne Domain
cd ~/vital-hub
source ~/.env/telegram.env && source ~/.env/gemini.env
python3 poller.py --domain entspannung

# Alle Domains
bash daily.sh
```

---

## Gemini Prompts

Jede Domain hat einen eigenen Prompt in `gemini_processor.py` (`DOMAINS` dict).

**Entspannung:** Extrahiert Methode, Dauer, Ort, Tageszeit, emotionaler Zustand.
Gibt Gesamtzeit, Einheiten-Count, 2-3 Sätze Insights zurück.

**Fitness:** Extrahiert Übung, Sätze×Wiederholungen, Gewicht, Muskelgruppe.
Gibt Trainingsvolumen, Muskelgruppen-Balance, Empfehlung nächstes Training zurück.

**Fuel:** Extrahiert Mahlzeiten mit geschätzten Makros (auch ohne Zahlen im Input).
Gibt Tagessummen (kcal, P, C, F), Timing, Empfehlung zurück.

**Gemini schätzt Makros auch bei reinem Freitext:**
```
"mittags hähnchen mit reis und brokkoli"
→ Hähnchen Reis Brokkoli - ~450kcal | P:35g C:55g F:8g
```

---

## Fallback

`fallback_parser.py` greift wenn Gemini nicht erreichbar ist:

- Extrahiert Zeilen aus dem Dropfile (Lines starting with `- [HH:MM:SS]`)
- Schreibt minimal strukturiertes Markdown ins Journal
- **Kein** Telegram Output (nur bei Gemini Success)
- Journal enthält `*Gemini offline - keine Analyse verfügbar*`

---

## Dropfile Pattern (für Claude Code Sessions)

Die `ENTSPANNUNG.md`, `FITNESS.md`, `FUEL.md` Dateien sind Dropfiles:

```
User: "schau auf ENTSPANNUNG.md"
→ Claude liest aktuelles Journal + heutige Sessions
→ Kann darauf eingehen, Ausbildungs-Protokoll exportieren, etc.
```

Tägliche Raw-Files (`entspannung-YYYY-MM-DD.md`) bleiben als Archiv erhalten.

---

## Beispiel Output (Telegram)

```
🧘 Entspannung - 2026-03-13

### Sessions
| Zeit  | Methode | Dauer | Ort | Notizen |
|-------|---------|-------|-----|---------|
| 07:30 | Progressive Muskelentspannung | 30min | Wien-Sanctuary | angespannt aber danach besser |

### Statistik
- Gesamtzeit: 30 min
- Einheiten: 1

### Insights
Gute Morgen-Session. Regelmäßige PMR am Morgen hilft besonders bei erhöhtem
Stresslevel. Empfehlung: Morgen wieder 07:30 einplanen, eventuell 35-40min
für tiefere Entspannung.
```

---

## Erweiterung auf neue Domains

1. Domain-Config in `poller.py` → `DOMAINS` dict ergänzen
2. Domain-Config + Gemini Prompt in `gemini_processor.py` → `DOMAINS` dict
3. Fallback-Funktion in `fallback_parser.py` → `_parse_<domain>()` + Eintrag in `parsers`
4. Verzeichnis anlegen: `~/vital-hub/<domain>ctx/`
5. `daily.sh` → Domain zur Loop ergänzen

---

## Bezug zu Dev-Ports (9000er)

Die Python Bots hier (`~/vital-hub/`) sind **unabhängig** von den Dev-PWAs:

| Was | Wo | Port | Zweck |
|---|---|---|---|
| Session Logger Bots | `~/vital-hub/` | — | Telegram → Dropfile → Gemini |
| Entspannungs PWA | `~/dev/entspannungsctx/` | 9001 | Node.js Dev Frontend |
| Fitness PWA | `~/dev/fitnessctx/` | 9002 | Node.js Dev Frontend |
| Fuel PWA | `~/dev/fuelctx/` | 9000 | Node.js Dev Frontend |
| Vital Hub Server | `~/vital-hub/` | 8788/4100 | Production Backend |

Die PWA Frontends und die Bots teilen sich perspektivisch das gleiche Journal-Backend
(Port 8788), sind aber aktuell noch getrennt.
