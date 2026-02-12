#!/usr/bin/env python3
"""Fire Map bot: send Taskwarrior snapshots to Telegram (daily/weekly).

Changes vs your version:
- Use Telegram parse_mode=HTML (robust)
- Escape content safely
- Chunk long messages
- Persist update offset to disk
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
import shlex
import subprocess
import time
from pathlib import Path
from typing import List
from urllib import parse, request

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
OFFSET_PATH = BASE_DIR / ".offset"


def load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    try:
        for raw in path.read_text(encoding="utf-8").splitlines():
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
            if key not in os.environ or os.environ.get(key, "") == "":
                os.environ[key] = value
    except OSError:
        return


def load_default_env() -> None:
    env_files: list[Path] = []

    override = os.environ.get("AOS_FIRE_ENV_FILE", "").strip()
    if override:
        env_files.append(Path(override).expanduser())

    # Repo-local shared env (untracked).
    repo_root = BASE_DIR.parent
    env_files.append(repo_root / "fire" / "fire.env")

    # Conventional shared location (host user).
    env_files.append(Path.home() / ".env" / "fire.env")
    # Legacy names (keep working).
    env_files.append(Path.home() / ".env" / "firemap.env")
    # Repo-local fallback.
    env_files.append(ENV_PATH)

    for p in env_files:
        load_dotenv(p)


load_default_env()

from firemap import build_all_messages, debug_counts  # noqa: E402

TASK_BIN = os.environ.get("AOS_TASK_BIN", "task")
TELE_BIN = os.environ.get("AOS_TELE_BIN", "tele")
BOT_TOKEN = os.environ.get("AOS_FIREMAP_BOT_TOKEN", "")
CHAT_ID = os.environ.get("AOS_FIREMAP_CHAT_ID", "")
SENDER = os.environ.get("AOS_FIREMAP_SENDER", "api").strip().lower()  # api | tele | auto

# Telegram hard-ish limit: keep margin
MAX_TG_CHARS = int(os.environ.get("AOS_FIREMAP_MAX_TG_CHARS", "3600") or "3600")


def shutil_which(name: str) -> bool:
    from shutil import which

    return which(name) is not None


def try_send_via_tele(text: str) -> bool:
    if not TELE_BIN:
        return False
    if shutil_which(TELE_BIN):
        return subprocess.run([TELE_BIN, text], check=False).returncode == 0
    return subprocess.run(["bash", "-lc", f"{TELE_BIN} {shlex.quote(text)}"], check=False).returncode == 0


def _chunk(text: str, limit: int) -> List[str]:
    """Split on paragraph boundaries where possible."""
    text = text.strip()
    if len(text) <= limit:
        return [text]

    parts: List[str] = []
    buf: List[str] = []
    size = 0
    for para in text.split("\n\n"):
        p = para.strip()
        if not p:
            continue
        add = ("\n\n" if buf else "") + p
        if size + len(add) <= limit:
            buf.append(p)
            size += len(add)
            continue
        if buf:
            parts.append("\n\n".join(buf).strip())
            buf = []
            size = 0
        # If a single paragraph is too large, hard-split
        while len(p) > limit:
            parts.append(p[:limit])
            p = p[limit:]
        if p:
            buf = [p]
            size = len(p)
    if buf:
        parts.append("\n\n".join(buf).strip())
    return [x for x in parts if x]


def _to_html_message(text: str) -> str:
    """Wrap your existing Markdown-ish output into robust HTML."""
    # Your engine returns either:
    # - plain text
    # - or "*title*\n```markdown\n...\n```"
    # We'll convert loosely: strip leading asterisks and render code blocks as <pre>.

    raw = text.strip()

    # Handle the common pattern: *TITLE*\n```markdown\nBODY\n```
    if raw.startswith("*") and "```" in raw:
        # Try to parse title line
        lines = raw.splitlines()
        title = lines[0].strip().strip("*")
        body = "\n".join(lines[1:]).strip()
        body = body.replace("```markdown", "```")
        if body.startswith("```") and body.endswith("```"):
            inner = body.strip("`").strip()
            inner = html.escape(inner)
            return f"<b>{html.escape(title)}</b>\n<pre>{inner}</pre>"

    # Default: escape all and keep newlines
    return html.escape(raw)


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

    if BOT_TOKEN and CHAT_ID:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"

        # Use HTML mode for robustness
        html_msg = _to_html_message(text)
        chunks = _chunk(html_msg, MAX_TG_CHARS)

        ok = True
        for c in chunks:
            data = parse.urlencode({"chat_id": CHAT_ID, "text": c, "parse_mode": "HTML"}).encode("utf-8")
            req = request.Request(url, data=data)
            try:
                raw = request.urlopen(req, timeout=10).read().decode("utf-8", errors="ignore")
                if debug:
                    print("DEBUG: sent via api url=", url)
                    print("DEBUG: response=", raw[:800])
            except Exception as exc:
                if debug:
                    print("DEBUG: api send failed:", repr(exc))
                ok = False
                # Fallback to tele for this chunk
                if try_send_via_tele(text):
                    ok = ok or True
        return ok

    if try_send_via_tele(text):
        if debug:
            print("DEBUG: sent via tele (fallback)")
        return True

    return False


def send_firemap(scope: str, *, debug: bool = False) -> bool:
    msgs = build_all_messages(scope)
    if not msgs:
        msgs = ["🟦 Firemap: (no tasks)"]

    ok = True
    for msg in msgs:
        ok = send_msg(msg, debug=debug) and ok
    return ok


def _read_offset() -> int:
    try:
        return int(OFFSET_PATH.read_text(encoding="utf-8").strip() or "0")
    except Exception:
        return 0


def _write_offset(val: int) -> None:
    try:
        OFFSET_PATH.write_text(str(int(val)), encoding="utf-8")
    except Exception:
        return


def listen_for_done() -> None:
    if not BOT_TOKEN:
        print("ERR: AOS_FIREMAP_BOT_TOKEN missing; listen disabled.")
        return

    offset = _read_offset() or None

    while True:
        try:
            params = {"timeout": 30}
            if offset is not None and int(offset) > 0:
                params["offset"] = int(offset)

            url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates?" + parse.urlencode(params)
            resp = request.urlopen(url, timeout=40).read().decode("utf-8")
            updates = json.loads(resp).get("result", [])

            for update in updates:
                offset = int(update.get("update_id", 0)) + 1
                _write_offset(offset)

                text = (update.get("message", {}).get("text", "") or "").strip().lower()
                if not text:
                    continue

                if text in ("/fire", "/fire@alphaos_firebot"):
                    send_firemap("daily")
                    continue

                if text in ("/fireweek", "/fireweekend", "/fire7", "/fireweek@alphaos_firebot"):
                    send_firemap("weekly")
                    continue

                if text in ("/firehelp", "/help", "/start"):
                    help_text = (
                        "<b>AlphaOS Fire Bot</b>\n\n"
                        "<code>/fire</code> — today (due/scheduled/wait)\n"
                        "<code>/fireweek</code> — this week (Mon–Sun)\n\n"
                        "<b>Notes</b>\n"
                        "- due/scheduled/wait tasks are included regardless of tags\n"
                        "- undated tasks are included by tags via <code>AOS_FIREMAP_TAGS</code> (default: <code>production,hit,fire</code>)\n"
                        "- undated mode via <code>AOS_FIREMAP_TAGS_MODE</code> (<code>any</code>/<code>all</code>)\n"
                        "- include undated in daily via <code>AOS_FIREMAP_INCLUDE_UNDATED_DAILY</code>\n"
                        "- overdue is sent separately\n\n"
                        "<b>Debug (terminal)</b>\n"
                        "<code>firectl doctor</code>\n"
                        "<code>firectl test --debug --scope daily</code>"
                    )
                    send_msg(help_text, prefer_api=True)
                    continue

                if text.endswith(" done") and text.startswith("#"):
                    task_id = text.split()[0].replace("#", "")
                    subprocess.run([TASK_BIN, task_id, "done"], check=False)
                    send_msg(f"OK: task #{task_id} marked as done.")

        except Exception as exc:
            # Minimal visibility
            print("WARN: listen loop error:", repr(exc))

        time.sleep(2)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["daily", "weekly", "listen", "test", "print"])
    parser.add_argument("--scope", default="", help="scope: daily|weekly (mode=print or mode=test)")
    parser.add_argument("--text", default="", help="test message text (mode=test)")
    parser.add_argument("--debug", action="store_true", help="print sender decisions + API response")
    args = parser.parse_args()

    if args.mode == "daily":
        return 0 if send_firemap("daily") else 1
    if args.mode == "weekly":
        return 0 if send_firemap("weekly") else 1

    if args.mode == "test":
        scope = str(args.scope or "").strip().lower()
        if scope in ("daily", "weekly"):
            msgs = build_all_messages(scope) or [f"🧪 Firemap test ({scope}): (no tasks)"]
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

        text = str(args.text or "").strip() or f"🧪 Firemap bot test ({dt.datetime.now().isoformat(timespec='seconds')})"
        return 0 if send_msg(text, debug=bool(args.debug)) else 1

    if args.mode == "print":
        scope = str(args.scope or "").strip().lower()
        if scope not in ("daily", "weekly"):
            print("ERR: --scope must be daily|weekly")
            return 2
        print("\n\n".join(build_all_messages(scope)))
        return 0

    listen_for_done()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
