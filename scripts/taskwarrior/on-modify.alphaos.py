#!/usr/bin/env python3
"""AlphaOS Taskwarrior on-modify hook.

Sends JSON payloads to Telegram via `tele` for GAS Task Bridge.
Triggers task_export.json update after task modifications.
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone, date, time
from pathlib import Path
from zoneinfo import ZoneInfo


ENV_PATH = Path(os.path.expanduser("~/.config/alpha-os/hooks.env"))


def load_env(path: Path) -> None:
    if not path.exists():
        return
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            if key and key not in os.environ:
                os.environ[key] = value.strip().strip('"').strip("'")
    except Exception:
        return


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

TZ = ZoneInfo(os.environ.get("AOS_TZ", "Europe/Vienna"))

def _date_from_core4_tag(tags: list[str]) -> date | None:
    for t in tags:
        m = re.fullmatch(r"core4_(\d{8})", str(t or "").strip().lower())
        if not m:
            continue
        try:
            return datetime.strptime(m.group(1), "%Y%m%d").date()
        except Exception:
            return None
    return None

def core4_ts_for_task(task: dict) -> str:
    """Derive Core4 log timestamp.

    For backfills we prefer the task's due date (date-level) to ensure the
    Bridge writes into the correct ISO week/day. Fallback: now (UTC).
    """
    tags = [str(t).lower() for t in (task.get("tags") or [])]
    tagged_day = _date_from_core4_tag(tags)
    if tagged_day:
        return datetime.combine(tagged_day, time(12, 0, 0), tzinfo=TZ).astimezone(timezone.utc).isoformat()

    due = task.get("due")
    if not due:
        return now_iso()
    try:
        due_str = str(due).strip()
        if not due_str:
            return now_iso()
        # Common Taskwarrior formats:
        # - 20260113T000000Z
        # - 20260113T000000
        # - 2026-01-13T00:00:00Z
        # - 2026-01-13
        for fmt in (
            "%Y%m%dT%H%M%SZ",
            "%Y%m%dT%H%M%S",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d",
        ):
            try:
                dt = datetime.strptime(due_str, fmt)
                if fmt.endswith("Z"):
                    dt = dt.replace(tzinfo=timezone.utc).astimezone(TZ)
                else:
                    dt = dt.replace(tzinfo=TZ)
                dt = datetime.combine(dt.date(), time(12, 0, 0), tzinfo=TZ).astimezone(timezone.utc)
                return dt.isoformat()
            except ValueError:
                continue
    except Exception:
        return now_iso()
    return now_iso()


def detect_domain(tags, project) -> str:
    project = (project or "").strip()
    project_lower = project.lower()
    for domain in ("body", "being", "balance", "business"):
        if project_lower.startswith(domain):
            return domain
        if f".{domain}" in project_lower:
            return domain
    for tag in tags:
        if tag in ("body", "being", "balance", "business"):
            return tag
    return ""


def detect_habit(tags) -> str:
    mapping = {
        "fitness": "fitness",
        "fuel": "fuel",
        "meditation": "meditation",
        "memoirs": "memoirs",
        "partner": "person1",
        "posterity": "person2",
        "person1": "person1",
        "person2": "person2",
        "discover": "discover",
        "declare": "declare",
        "learn": "discover",
        "action": "declare",
    }
    for tag in tags:
        if tag in mapping:
            return mapping[tag]
    return ""


def detect_alphatype(tags) -> str:
    for tag in ("door", "hit", "strike", "bigrock", "fire", "warstack"):
        if tag in tags:
            return tag
    return ""


def send_tele(payload: dict) -> None:
    tele_bin = os.environ.get("AOS_HOOK_TELE_BIN") or os.environ.get("TELE_BIN") or "tele"
    message = json.dumps(payload, ensure_ascii=False)
    subprocess.run([tele_bin, message], check=False)

def send_bridge(payload: dict) -> None:
    bridge_url = os.environ.get("AOS_BRIDGE_URL", "http://127.0.0.1:8080").rstrip("/")
    url = f"{bridge_url}/bridge/task/operation"
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    try:
        from urllib import request

        req = request.Request(url, data=data, headers=headers)
        with request.urlopen(req, timeout=5) as resp:
            resp.read()
    except Exception:
        return


def send_core4_log(payload: dict) -> None:
    bridge_url = os.environ.get("AOS_BRIDGE_URL", "http://127.0.0.1:8080").rstrip("/")
    url = f"{bridge_url}/bridge/core4/log"
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    try:
        from urllib import request

        req = request.Request(url, data=data, headers=headers)
        with request.urlopen(req, timeout=5) as resp:
            resp.read()
    except Exception:
        return


def main() -> int:
    load_env(ENV_PATH)
    raw = sys.stdin.read()
    if not raw.strip():
        return 0
    task = json.loads(raw)

    tags = [str(t).lower() for t in task.get("tags", [])]
    project = task.get("project", "")
    domain = detect_domain(tags, project)
    habit = detect_habit(tags)
    alphatype = detect_alphatype(tags)
    status = str(task.get("status", "")).lower()

    data = {
        "uuid": task.get("uuid"),
        "description": task.get("description", ""),
        "tags": tags,
        "project": project,
        "priority": task.get("priority"),
        "due": task.get("due"),
        "end": task.get("end"),
        "door_name": task.get("door_name") or "",
        "alphatype": alphatype,
        "changes": {"status": {"new": status}},
    }

    if "core4" in tags or habit:
        if status == "completed" and os.environ.get("AOS_CORE4_LOG", "1") == "1":
            core4_payload = {
                "domain": domain or "",
                "task": habit or "core4",
                "points": float(os.environ.get("AOS_CORE4_POINTS", "0.5")),
                "ts": core4_ts_for_task(task),
                "source": "taskwarrior",
                "user": {"id": task.get("uuid") or ""},
            }
            send_core4_log(core4_payload)
        if status == "completed":
            payload = {
                "type": "core4_task_done",
                "timestamp": now_iso(),
                "data": {**data, "domain": domain, "task": habit or "core4"},
            }
        else:
            payload = {
                "type": "core4_task_modify",
                "timestamp": now_iso(),
                "data": {**data, "domain": domain, "task": habit or "core4"},
            }
    else:
        if status == "completed":
            payload = {"type": "task_done_sync", "timestamp": now_iso(), "data": data}
        else:
            payload = {"type": "task_modify_sync", "timestamp": now_iso(), "data": data}

    target = os.environ.get("AOS_HOOK_TARGET", "tele").lower().strip()
    if target == "bridge":
        send_bridge(payload)
    else:
        send_tele(payload)

    # Note: on-exit.alphaos.py will trigger task_export.json update automatically
    sys.stdout.write(raw)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
