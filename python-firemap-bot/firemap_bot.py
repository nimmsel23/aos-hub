#!/usr/bin/env python3
"""Fire Map bot: send Taskwarrior snapshots to Telegram (daily/weekly)."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import subprocess
import shlex
import time
from typing import List
from urllib import request, parse

from firemap import build_all_messages, debug_counts


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")


def load_dotenv(path: str) -> None:
    if not os.path.isfile(path):
        return
    try:
        with open(path, "r", encoding="utf-8") as handle:
            for raw in handle:
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                if line.startswith("export "):
                    line = line[len("export ") :].strip()
                if "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                if not key:
                    continue
                value = value.strip().strip("'\"")
                # Only set if missing OR currently blank. (A blank exported var should not override .env.)
                if key not in os.environ or os.environ.get(key, "") == "":
                    os.environ[key] = value
    except OSError:
        return


load_dotenv(ENV_PATH)

TASK_BIN = os.environ.get("AOS_TASK_BIN", "task")
TELE_BIN = os.environ.get("AOS_TELE_BIN", "tele")
BOT_TOKEN = os.environ.get("AOS_FIREMAP_BOT_TOKEN", "")
CHAT_ID = os.environ.get("AOS_FIREMAP_CHAT_ID", "")
SENDER = os.environ.get("AOS_FIREMAP_SENDER", "api").strip().lower()  # api | tele | auto


def send_msg(text: str, *, prefer_api: bool = False, debug: bool = False) -> bool:
    if not text:
        return True
    sender = "api" if prefer_api else (SENDER or "api")
    if sender not in ("api", "tele", "auto"):
        sender = "api"

    if sender in ("tele", "auto"):
        if try_send_via_tele(text):
            if debug:
                print("DEBUG: sent via tele")
            return True

    # Telegram API (needs chat id).
    if BOT_TOKEN and CHAT_ID:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        data = parse.urlencode({"chat_id": CHAT_ID, "text": text, "parse_mode": "Markdown"}).encode("utf-8")
        req = request.Request(url, data=data)
        try:
            raw = request.urlopen(req, timeout=8).read().decode("utf-8", errors="ignore")
            if debug:
                print("DEBUG: sent via api url=", url)
                print("DEBUG: response=", raw[:800])
            return True
        except Exception as exc:
            # Try to read Telegram error body (parse errors, message too long, etc).
            body = ""
            try:
                body = getattr(exc, "read", lambda: b"")().decode("utf-8", errors="ignore")  # type: ignore[attr-defined]
            except Exception:
                body = ""
            if debug:
                print("DEBUG: api send failed:", repr(exc))
                if body:
                    print("DEBUG: api error body=", body[:800])
            # Fallback to tele on any API failure (network, parse errors, etc).
            if try_send_via_tele(text):
                if debug:
                    print("DEBUG: tele fallback after api error")
                return True
            return False

    # Last resort: try tele (works even without chat id).
    if try_send_via_tele(text):
        if debug:
            print("DEBUG: sent via tele (fallback)")
        return True
    return False
def shutil_which(name: str) -> bool:
    from shutil import which

    return which(name) is not None


def try_send_via_tele(text: str) -> bool:
    if not TELE_BIN:
        return False
    if shutil_which(TELE_BIN):
        return subprocess.run([TELE_BIN, text], check=False).returncode == 0
    # `tele` might be a shell function/alias; try via bash login shell.
    return subprocess.run(["bash", "-lc", f"{TELE_BIN} {shlex.quote(text)}"], check=False).returncode == 0


def send_firemap(scope: str, *, debug: bool = False) -> bool:
    msgs = build_all_messages(scope)
    if not msgs:
        msgs = ["🟦 Firemap: (no tasks)"]
    ok = True
    for msg in msgs:
        ok = send_msg(msg, debug=debug) and ok
    return ok


def send_firemap_daily(*, debug: bool = False) -> bool:
    return send_firemap("daily", debug=debug)


def send_firemap_weekly(*, debug: bool = False) -> bool:
    return send_firemap("weekly", debug=debug)


def listen_for_done() -> None:
    if not BOT_TOKEN:
        print("ERR: AOS_FIREMAP_BOT_TOKEN missing; listen disabled.")
        return
    offset = None
    while True:
        try:
            params = {"timeout": 30}
            if offset is not None:
                params["offset"] = offset
            url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates?" + parse.urlencode(params)
            resp = request.urlopen(url, timeout=35).read().decode("utf-8")
            updates = json.loads(resp).get("result", [])
            for update in updates:
                offset = update.get("update_id", 0) + 1
                text = (update.get("message", {}).get("text", "") or "").strip().lower()
                if not text:
                    continue
                # Fire commands (direct bot mode, no router required)
                if text in ("/fire", "/fire@alphaos_firebot"):
                    send_firemap_daily()
                    continue
                if text in ("/fireweek", "/fireweekend", "/fire7", "/fireweek@alphaos_firebot"):
                    send_firemap_weekly()
                    continue
                if text in ("/firehelp", "/help", "/start"):
                    help_text = (
                        "*AlphaOS Fire Bot*\n\n"
                        "`/fire` — today (due/scheduled/wait)\n"
                        "`/fireweek` — this week (Mon–Sun)\n\n"
                        "*Notes*\n"
                        "- only `+fire` tasks (`pending`/`waiting`)\n"
                        "- overdue is sent separately\n"
                        "- if nothing is due today, output is empty except overdue\n\n"
                        "*Debug (terminal)*\n"
                        "`firectl doctor`\n"
                        "`firectl test --debug`"
                    )
                    send_msg(help_text, prefer_api=True)
                    continue
                if text.endswith(" done") and text.startswith("#"):
                    task_id = text.split()[0].replace("#", "")
                    subprocess.run([TASK_BIN, task_id, "done"], check=False)
                    send_msg(f"OK: task #{task_id} marked as done.")
        except Exception:
            pass
        time.sleep(2)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["daily", "weekly", "listen", "test", "print"])
    parser.add_argument("--scope", default="", help="scope: daily|weekly (mode=print or mode=test)")
    parser.add_argument("--text", default="", help="test message text (mode=test)")
    parser.add_argument("--debug", action="store_true", help="print sender decisions + API response")
    args = parser.parse_args()

    if args.mode == "daily":
        return 0 if send_firemap_daily() else 1
    elif args.mode == "weekly":
        return 0 if send_firemap_weekly() else 1
    elif args.mode == "test":
        scope = str(args.scope or "").strip().lower()
        if scope in ("daily", "weekly"):
            # Send a real firemap snapshot (same as /fire), but marked as test.
            msgs = build_all_messages(scope)
            if not msgs:
                msgs = [f"🧪 Firemap test ({scope}): (no tasks)"]
            msgs = [("🧪 TEST\n\n" + m) for m in msgs]
            if args.debug:
                print("DEBUG: mode=test scope=", scope)
                print("DEBUG: sender=", SENDER)
                print("DEBUG: chat_id_set=", bool(CHAT_ID))
                print("DEBUG: tele_bin=", TELE_BIN)
                print("DEBUG: messages=", len(msgs))
                try:
                    print("DEBUG: counts=", debug_counts(scope))
                except Exception:
                    print("DEBUG: counts= (failed)")
            ok = True
            for msg in msgs:
                ok = send_msg(msg, debug=bool(args.debug)) and ok
            return 0 if ok else 1
        else:
            text = str(args.text or "").strip()
            if not text:
                text = f"🧪 Firemap bot test ({dt.datetime.now().isoformat(timespec='seconds')})"
            if args.debug:
                print("DEBUG: mode=test text")
                print("DEBUG: sender=", SENDER)
                print("DEBUG: chat_id_set=", bool(CHAT_ID))
                print("DEBUG: tele_bin=", TELE_BIN)
            return 0 if send_msg(text, debug=bool(args.debug)) else 1
    elif args.mode == "print":
        scope = str(args.scope or "").strip().lower()
        if scope not in ("daily", "weekly"):
            print("ERR: --scope must be daily|weekly")
            return 2
        print("\n\n".join(build_all_messages(scope)))
    else:
        listen_for_done()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
