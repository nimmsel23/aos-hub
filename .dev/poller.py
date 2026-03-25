#!/usr/bin/env python3
"""
Telegram Poller

Runs once daily via systemd timer (12:00).
Fetches new messages → appends to domain dropfile → triggers gemini_processor.

Does NOT run permanently. Plain requests, no aiogram.

Usage:
    python3 poller.py --domain entspannung
    python3 poller.py --domain fitness
    python3 poller.py --domain fuel

Env (from ~/.env/telegram.env):
    BOT_TOKEN
    CHAT_ID
"""

import os
import sys
import json
import subprocess
import argparse
import requests
from pathlib import Path

# Add parent dir for imports
sys.path.insert(0, str(Path(__file__).parent))
from session_logger_helper import SessionLogger

# ──────────────────────────────────────────────────────────────────────────────
# Domain config - all domains in one place
# ──────────────────────────────────────────────────────────────────────────────

DOMAINS = {
    "entspannung": {
        "project_dir": "vital-hub/entspannungsctx",
        "daily_prefix": "entspannung",
        "dropfile_name": "ENTSPANNUNG.md",
        "name": "Entspannung",
        "emoji": "🧘",
    },
    "fitness": {
        "project_dir": "vital-hub/fitnessctx",
        "daily_prefix": "fitness",
        "dropfile_name": "FITNESS.md",
        "name": "Fitness",
        "emoji": "💪",
    },
    "fuel": {
        "project_dir": "vital-hub/fuelctx",
        "daily_prefix": "fuel",
        "dropfile_name": "FUEL.md",
        "name": "Fuel",
        "emoji": "🍽️",
    },
}

# ──────────────────────────────────────────────────────────────────────────────
# Telegram API helpers
# ──────────────────────────────────────────────────────────────────────────────

def get_updates(token: str, offset: int) -> list:
    """
    Poll Telegram getUpdates API.
    offset = last_update_id + 1 ensures we don't re-process old messages.
    Returns list of update dicts (empty list on failure).
    """
    url = f"https://api.telegram.org/bot{token}/getUpdates"
    params = {"offset": offset, "timeout": 10}

    try:
        response = requests.get(url, params=params, timeout=15)
        data = response.json()
        if data.get("ok"):
            return data.get("result", [])
    except Exception as e:
        print(f"❌ Telegram poll failed: {e}", file=sys.stderr)

    return []


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Telegram Poller for session logging")
    parser.add_argument("--domain", required=True, choices=DOMAINS.keys(),
                        help="Domain to poll for (entspannung/fitness/fuel)")
    args = parser.parse_args()

    # Config
    domain_cfg = DOMAINS[args.domain]
    token = os.getenv("BOT_TOKEN")
    chat_id = str(os.getenv("CHAT_ID", ""))

    if not token:
        print("❌ BOT_TOKEN not set (load from ~/.env/telegram.env)", file=sys.stderr)
        sys.exit(1)

    # Init logger for this domain
    logger = SessionLogger(
        project_dir=domain_cfg["project_dir"],
        daily_prefix=domain_cfg["daily_prefix"],
        dropfile_name=domain_cfg["dropfile_name"],
    )

    # Poll for new messages
    last_id = logger.get_last_update_id()
    updates = get_updates(token, offset=last_id + 1)

    if not updates:
        print(f"✓ [{domain_cfg['name']}] No new messages.")
        sys.exit(0)

    # Process new messages
    new_messages = 0
    latest_id = last_id

    for update in updates:
        update_id = update.get("update_id", 0)
        latest_id = max(latest_id, update_id)

        message = update.get("message", {})
        text = message.get("text", "").strip()
        from_chat = str(message.get("chat", {}).get("id", ""))

        # Filter: only messages from the configured chat
        if chat_id and from_chat != chat_id:
            continue

        # Skip commands
        if not text or text.startswith("/"):
            continue

        # Append raw freetext to dropfile - always, failsafe
        if logger.append_raw(text):
            new_messages += 1
            print(f"  ✓ Saved: {text[:60]}{'...' if len(text) > 60 else ''}")

    # Persist state so next poll skips these
    if latest_id > last_id:
        logger.save_last_update_id(latest_id)

    print(f"✓ [{domain_cfg['name']}] {new_messages} messages saved to dropfile.")

    # Trigger Gemini processor if we got new messages
    if new_messages > 0:
        processor_path = Path(__file__).parent / "gemini_processor.py"
        print(f"  → Triggering Gemini processor...")
        subprocess.Popen([sys.executable, str(processor_path), "--domain", args.domain])


if __name__ == "__main__":
    main()
