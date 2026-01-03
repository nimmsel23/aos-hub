#!/usr/bin/env python3
"""AlphaOS Taskwarrior on-add hook.

Sends JSON payloads to Telegram via `tele` for GAS Task Bridge.
"""

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


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

    data = {
        "uuid": task.get("uuid"),
        "description": task.get("description", ""),
        "tags": tags,
        "project": project,
        "priority": task.get("priority"),
        "due": task.get("due"),
        "door_name": task.get("door_name") or "",
        "alphatype": alphatype,
    }

    if "core4" in tags or habit:
        payload = {
            "type": "core4_task_add",
            "timestamp": now_iso(),
            "data": {**data, "domain": domain, "task": habit or "core4"},
        }
    else:
        sync_tags = {"door", "hit", "strike", "bigrock", "fire", "warstack"}
        if sync_tags.intersection(tags):
            payload = {"type": "task_add_sync", "timestamp": now_iso(), "data": data}
        else:
            payload = {"type": "task_add", "timestamp": now_iso(), "data": data}

    target = os.environ.get("AOS_HOOK_TARGET", "tele").lower().strip()
    if target == "bridge":
        send_bridge(payload)
    else:
        send_tele(payload)

    # Return task unchanged
    sys.stdout.write(raw)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
