# αOS README — Hits, Strikes, War Stack, Scores

> **Operator Intent:** Ein eindeutiges Mapping, damit **General’s Tent**, **War Stack**, **Voice**, **Fire Map** nie wieder vermischt werden.

---

## 0) File Placement (Vault)

Empfohlen (passt zu deiner Vault-Struktur):

* `~/Dokumente/AlphaOs-Vault/GAME/README_HITS_STRIKES.md`
* Optional Kurzlink: `~/Dokumente/AlphaOs-Vault/GAME/README_SCORE.md` → verlinkt auf die Datei oben

---

## 1) Die drei Ebenen (Game Praxis)

### The Voice (Perspective)

**Stop → Submit → Struggle → Strike**

* **STRIKE (Voice)** = der **decisive action-Impuls** aus erneuerter Story (renewed narratives).
* Funktion: *Richtung / Commit.*

### The Door (Production)

**Hit List (Door / Production)**

* **HIT** = *abgehakte* Production-Einheit (delivered, not imagined).
* Standard: **4 Hits/Tag (Mo–Fr)** ⇒ **20 Hits/Woche**.

### The Fire Map (Weekly War)

**Structured Blaze: 4×4**

* **4 Domains × 4 pivotal actions = 16** (Weekly Plan / Weekly War).

---

## 2) War Stack: Warum „Hits haben Strikes“

Im **War Stack** wird **jeder Hit** im Schema geführt:

* **Fact** (messbares Ergebnis)
* **Obstacle** (was verhindert’s)
* **Strike** (strategischer Move gegen das Obstacle)
* **Responsibility** (wer zieht’s durch)

➡️ **STRIKE (War Stack)** = *Taktik pro Hit*, um ein Obstacle zu brechen.

---

## 3) Zwei „Strike“-Bedeutungen (kritisch)

### A) Voice-Strike

* kommt aus Stop/Submit/Struggle
* ist der **Commit**: „Was ist jetzt die klare Handlung?“

### B) WarStack-Strike

* gehört zu einem **konkreten Hit**
* ist der **Move**: „Wie knacken wir dieses Obstacle?“

**Regel:**

> **Voice-Strike = Richtung.**
> **WarStack-Strike = Taktik pro Hit.**

---

## 4) Scores (General’s Tent vs Fire Map)

### Fire Map Score (Plan-Struktur)

* **16 Actions** (4×4) = Structured Blaze der Woche

### Alpha Score (General’s Tent)

* **__/28 The Core**
* **__/7 The Stack**
* **__/21 The Door**

**Warum /21 Door?**

* **20 Hits/Woche** (Hit List, Mo–Fr)
* **+1 Weekly Door** (die Door der Woche / Door War)

➡️ **Fire Map (16)** ist **nicht** automatisch **Door Score (21)**.
Fire Map kann die Hit List *füttern*, aber die Zählung bleibt getrennt.

---

## 5) Operator-Mapping (für CLI/JSON, ohne Begriffe zu verbiegen)

Empfohlenes internes Naming (damit du’s nie wieder verwechselst):

* `voice_strikes[]`  → Output aus The Voice (Stage #4)
* `warstack.hits[].strike` → Strike im Fact/Obstacle/Strike Schema
* `door.hit_list[]` → Daily 4 Hits (Mo–Fr)
* `firemap.actions[]` → 16 Weekly Actions (4×4)

---

## 6) Quick Check

**Frage:** „Zähle ich gerade oder plane ich?“

* Plane ich die Woche? → **Fire Map (16)**
* Liefere ich daily ab? → **Door Hits (20 + 1)**
* Kommt der Move aus innerer Klarheit? → **Voice Strike**
* Knackt der Move ein Obstacle eines Hits? → **WarStack Strike**

---

# CLI Modul: `aos-glossary`

> Gibt dir die Regeln on-demand im Terminal (und optional als Auswahl-Menü via `gum`).

## Install

Speichere das Script als:

* `~/.dotfiles/bin/aos-glossary`

Dann:

```bash
chmod +x ~/.dotfiles/bin/aos-glossary
```

Optional Symlinks (wenn du willst):

```bash
ln -sf ~/.dotfiles/bin/aos-glossary ~/bin/aos-glossary
ln -sf ~/.dotfiles/bin/aos-glossary ~/.local/bin/aos-glossary
```

## Usage

* `aos-glossary` → Hilfe
* `aos-glossary hits`
* `aos-glossary strikes`
* `aos-glossary score`
* `aos-glossary map`
* `aos-glossary all`
* `aos-glossary menu` (wenn `gum` installiert)

---

```bash
#!/usr/bin/env bash
set -euo pipefail

# aos-glossary — αOS terminology quick reference
# Location (recommended): ~/.dotfiles/bin/aos-glossary

cmd="${1:-}"; shift || true

has() { command -v "$1" >/dev/null 2>&1; }

print_help() {
  cat <<'EOF'
Usage:
  aos-glossary <topic>

Topics:
  hits      Door / Hit List basics
  strikes   Voice Strike vs WarStack Strike
  score     Fire Map (16) vs Door (21) vs Alpha Score
  map       Operator mapping (voice_strike vs hit_strike etc.)
  all       Print everything
  menu      Interactive selector (requires gum)

Examples:
  aos-glossary strikes
  aos-glossary score
EOF
}

section_hits() {
  cat <<'EOF'
# HITS (The Door)

- HIT = abgehakte Production-Einheit (delivered, not imagined).
- Hit List Standard: 4 Hits/Tag (Mo–Fr) = 20 Hits/Woche.
- Hits sind NICHT gleich Fire Map Actions; Fire Map kann Hits füttern.
EOF
}

section_strikes() {
  cat <<'EOF'
# STRIKES (Two layers)

VOICE STRIKE
- Stop → Submit → Struggle → Strike
- Strike = decisive action-Impuls aus erneuerter Story.
- Funktion: Richtung / Commit.

WAR STACK STRIKE
- In jedem Hit: Fact → Obstacle → Strike → Responsibility
- Strike = strategischer Move gegen das Obstacle.
- Funktion: Taktik pro Hit.

Rule:
- Voice-Strike = Richtung.
- WarStack-Strike = Taktik pro Hit.
EOF
}

section_score() {
  cat <<'EOF'
# SCORES

Fire Map (Structured Blaze)
- 4×4 = 16 (4 Domains × 4 pivotal actions)

General’s Tent (Alpha Score)
- __/28 The Core
- __/7  The Stack
- __/21 The Door

Why /21 Door?
- 20 Hits/Woche (Hit List Mo–Fr)
- +1 Weekly Door (Door War)

Rule:
- Fire Map 16 = Weekly Plan.
- Door 21 = Weekly Production score.
EOF
}

section_map() {
  cat <<'EOF'
# OPERATOR MAPPING (recommended internal naming)

voice_strikes[]
- The Voice stage output (Strike)

warstack.hits[].strike
- Strike inside each Hit (Fact/Obstacle/Strike/Responsibility)

door.hit_list[]
- Daily 4 hits (Mo–Fr)

firemap.actions[]
- 16 weekly actions (4×4)
EOF
}

section_all() {
  echo
  section_hits
  echo
  section_strikes
  echo
  section_score
  echo
  section_map
  echo
}

menu() {
  if ! has gum; then
    echo "gum not found. Install gum or run: aos-glossary <topic>" >&2
    exit 1
  fi

  local choice
  choice=$(printf "%s\n" hits strikes score map all | gum choose --header "αOS Glossary" )
  "$0" "$choice"
}

case "$cmd" in
  "") print_help ;;
  -h|--help|help) print_help ;;
  hits) section_hits ;;
  strikes) section_strikes ;;
  score) section_score ;;
  map) section_map ;;
  all) section_all ;;
  menu) menu ;;
  *)
    echo "Unknown topic: $cmd" >&2
    echo
    print_help
    exit 2
    ;;
 esac
```

---

## Optional: `aos` Dispatcher Hook (wenn du ein `aos` CLI hast)

Wenn du bereits ein `aos` Script mit Subcommands hast, füge dort (sinngemäß) ein:

```bash
case "$sub" in
  glossary) shift; exec aos-glossary "$@" ;;
esac
```

---

## Optional: Fish Convenience

```fish
function aos-gl
  aos-glossary $argv
end
```

---

## Next Operator Upgrade (wenn du willst)

* `aos generals` kann beim Start automatisch `aos-glossary score` als Reminder zeigen.
* War Stack Generator kann `warstack.hits[].strike` direkt aus Voice-Strike Vorschlägen prefillen.
