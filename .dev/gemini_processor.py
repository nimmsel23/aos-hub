#!/usr/bin/env python3
"""
Gemini Processor

Reads today's dropfile → calls Gemini API → saves journal → sends Telegram.

Failsafe:
  - Journal is ALWAYS saved (raw or structured)
  - Telegram output ONLY if Gemini succeeds
  - If Gemini fails → calls fallback_parser.py for basic structuring

Usage:
    python3 gemini_processor.py --domain entspannung
    python3 gemini_processor.py --domain fitness
    python3 gemini_processor.py --domain fuel

Env (from ~/.env/gemini.env + ~/.env/telegram.env):
    GEMINI_API_KEY
    GEMINI_MODEL
    BOT_TOKEN
    CHAT_ID
"""

import os
import sys
import json
import argparse
import requests
from datetime import datetime
from pathlib import Path

# Add parent dir for imports
sys.path.insert(0, str(Path(__file__).parent))
from session_logger_helper import SessionLogger
import fallback_parser

# ──────────────────────────────────────────────────────────────────────────────
# Domain config + Gemini prompts
# ──────────────────────────────────────────────────────────────────────────────

DOMAINS = {
    "entspannung": {
        "project_dir": "vital-hub/entspannungsctx",
        "daily_prefix": "entspannung",
        "dropfile_name": "ENTSPANNUNG.md",
        "name": "Entspannung",
        "emoji": "🧘",
        "gemini_prompt": """
Du bist ein Entspannungs- und Wellness-Analyst. Analysiere diese heutigen Entspannungs-Sessions:

{raw_content}

Extrahiere und strukturiere:
1. Alle Sessions mit: Methode, Dauer, Ort, Tageszeit, emotionaler Zustand (falls erwähnt)
2. Gesamtentspannungszeit heute
3. Kurze Insights (2-3 Sätze): Was fällt auf? Muster? Empfehlung für morgen?

Antworte in diesem Format:
### Sessions
[Tabelle: Zeit | Methode | Dauer | Ort | Notizen]

### Statistik
- Gesamtzeit: X min
- Einheiten: N

### Insights
[2-3 Sätze]
""",
    },
    "fitness": {
        "project_dir": "vital-hub/fitnessctx",
        "daily_prefix": "fitness",
        "dropfile_name": "FITNESS.md",
        "name": "Fitness",
        "emoji": "💪",
        "gemini_prompt": """
Du bist ein Fitness-Analyst. Analysiere diese heutigen Trainings-Sessions:

{raw_content}

Extrahiere und strukturiere:
1. Alle Übungen mit: Name, Sätze×Wiederholungen, Gewicht, Muskelgruppe
2. Trainingsvolumen gesamt
3. Kurze Insights (2-3 Sätze): Muskelgruppen-Balance? Progression? Empfehlung für nächstes Training?

Antworte in diesem Format:
### Übungen
[Tabelle: Übung | Sätze×Wdh | Gewicht | Muskelgruppe]

### Statistik
- Gesamtvolumen: X kg
- Trainingszeit: ~X min (falls erwähnt)

### Insights
[2-3 Sätze]
""",
    },
    "fuel": {
        "project_dir": "vital-hub/fuelctx",
        "daily_prefix": "fuel",
        "dropfile_name": "FUEL.md",
        "name": "Fuel",
        "emoji": "🍽️",
        "gemini_prompt": """
Du bist ein Ernährungs-Analyst. Analysiere diese heutigen Mahlzeiten:

{raw_content}

Extrahiere und strukturiere:
1. Alle Mahlzeiten mit: Zeitpunkt, Beschreibung, geschätzte Makros (kcal, Protein, Carbs, Fett)
   Falls keine Zahlen angegeben: schätze realistisch basierend auf den Lebensmitteln.
2. Tagessummen der Makros
3. Kurze Insights (2-3 Sätze): Protein ausreichend? Timing? Empfehlung für morgen?

Antworte in diesem Format:
### Mahlzeiten
[Tabelle: Zeit | Mahlzeit | kcal | P | C | F]

### Tagessumme
- kcal: X | Protein: Xg | Carbs: Xg | Fett: Xg

### Insights
[2-3 Sätze]
""",
    },
}

# ──────────────────────────────────────────────────────────────────────────────
# Gemini API
# ──────────────────────────────────────────────────────────────────────────────

def call_gemini(prompt: str, api_key: str, model: str) -> str | None:
    """
    Call Gemini API with prompt.
    Returns structured text response or None on failure.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    headers = {"Content-Type": "application/json"}
    params = {"key": api_key}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1024},
    }

    try:
        response = requests.post(url, headers=headers, params=params,
                                 json=payload, timeout=30)
        data = response.json()

        # Extract text from response
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                return parts[0].get("text", "").strip()

        print(f"❌ Gemini unexpected response: {json.dumps(data)[:200]}", file=sys.stderr)
    except Exception as e:
        print(f"❌ Gemini API call failed: {e}", file=sys.stderr)

    return None

# ──────────────────────────────────────────────────────────────────────────────
# Telegram send
# ──────────────────────────────────────────────────────────────────────────────

def send_telegram(token: str, chat_id: str, text: str):
    """Send message via Telegram. Silently fails (Telegram output is enhancement only)."""
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        requests.post(url, json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown",
        }, timeout=10)
    except Exception as e:
        print(f"⚠️ Telegram send failed (non-critical): {e}", file=sys.stderr)

# ──────────────────────────────────────────────────────────────────────────────
# Journal save
# ──────────────────────────────────────────────────────────────────────────────

def save_journal(project_dir: Path, daily_prefix: str, content: str, source: str):
    """
    Save to journal. Always called - failsafe.
    source: "gemini" or "fallback"
    """
    journal_dir = project_dir / "journal"
    journal_dir.mkdir(parents=True, exist_ok=True)

    today = datetime.now().strftime("%Y-%m-%d")
    journal_file = journal_dir / f"{today}.md"

    header = (
        f"# {daily_prefix.upper()} Journal - {today}\n\n"
        f"*Source: {source} @ {datetime.now().strftime('%H:%M:%S')}*\n\n"
    )

    journal_file.write_text(header + content)
    print(f"✓ Journal saved: {journal_file}")

# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Gemini Processor for session analysis")
    parser.add_argument("--domain", required=True, choices=DOMAINS.keys())
    args = parser.parse_args()

    domain_cfg = DOMAINS[args.domain]
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    token = os.getenv("BOT_TOKEN")
    chat_id = os.getenv("CHAT_ID", "")

    # Init logger to read dropfile
    logger = SessionLogger(
        project_dir=domain_cfg["project_dir"],
        daily_prefix=domain_cfg["daily_prefix"],
        dropfile_name=domain_cfg["dropfile_name"],
    )

    raw_content = logger.read_today()

    if not raw_content.strip():
        print(f"✓ [{domain_cfg['name']}] No content today, nothing to process.")
        sys.exit(0)

    # ── Try Gemini ─────────────────────────────────────────────────────────────
    gemini_result = None

    if api_key:
        prompt = domain_cfg["gemini_prompt"].format(raw_content=raw_content)
        print(f"  → Calling Gemini ({model})...")
        gemini_result = call_gemini(prompt, api_key, model)

    # ── Fallback if Gemini failed ──────────────────────────────────────────────
    if gemini_result:
        journal_content = gemini_result
        journal_source = "gemini"
        print(f"  ✓ Gemini succeeded.")
    else:
        print(f"  ⚠️ Gemini unavailable, using fallback parser.")
        journal_content = fallback_parser.parse(args.domain, raw_content)
        journal_source = "fallback"

    # ── Journal save (ALWAYS) ─────────────────────────────────────────────────
    save_journal(
        project_dir=logger.project_dir,
        daily_prefix=domain_cfg["daily_prefix"],
        content=journal_content,
        source=journal_source,
    )

    # ── Telegram output (ONLY if Gemini succeeded) ────────────────────────────
    if gemini_result and token and chat_id:
        emoji = domain_cfg["emoji"]
        name = domain_cfg["name"]
        today = datetime.now().strftime("%Y-%m-%d")

        message = f"{emoji} *{name} - {today}*\n\n{gemini_result}"

        # Truncate if too long for Telegram (max 4096 chars)
        if len(message) > 4000:
            message = message[:3990] + "\n\n_[gekürzt]_"

        send_telegram(token, chat_id, message)
        print(f"  ✓ Insights sent to Telegram.")
    elif not gemini_result:
        print(f"  ✓ Gemini failed → Journal saved, no Telegram output (as configured).")


if __name__ == "__main__":
    main()
