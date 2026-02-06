#!/usr/bin/env python3
"""AlphaOS Taskwarrior on-add hook.

Sends JSON payloads to Telegram via `tele` for GAS Task Bridge.
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


ENV_PATH = Path(os.path.expanduser("~/.config/alpha-os/hooks.env"))
GLOBAL_ENV_PATH = Path(os.environ.get("AOS_ENV_FILE") or os.path.expanduser("~/.env/aos.env"))
PROTECTED_KEYS = set(os.environ.keys())


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
            if not key or key in PROTECTED_KEYS:
                continue
            os.environ[key] = value.strip().strip('"').strip("'")
    except Exception:
        return


def _is_true(value: str | None) -> bool:
    return str(value or "").strip().lower() in ("1", "true", "yes", "on")


def _format_due(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if not text:
        return ""
    m = re.match(r"^(\d{4})(\d{2})(\d{2})", text)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m = re.match(r"^(\d{4}-\d{2}-\d{2})", text)
    if m:
        return m.group(1)
    return text


def _format_human_message(payload: dict) -> str:
    data = payload.get("data") or {}
    ptype = str(payload.get("type") or "").strip()
    action = ptype
    prefix = "Hook"
    if ptype.startswith("core4_task_"):
        action = ptype[len("core4_task_") :]
        prefix = "Core4"
    elif ptype.startswith("task_"):
        action = ptype[len("task_") :]
        if action.endswith("_sync"):
            action = action[: -len("_sync")]
        prefix = "TW"
    action = action.replace("_", " ").strip() or ptype

    desc = str(data.get("description") or "").strip()
    domain = str(data.get("domain") or "").strip()
    habit = str(data.get("task") or "").strip()
    project = str(data.get("project") or "").strip()
    tags = [str(t) for t in (data.get("tags") or []) if str(t).strip()]
    priority = str(data.get("priority") or "").strip()
    due = _format_due(data.get("due"))
    status = str((data.get("changes") or {}).get("status", {}).get("new") or data.get("status") or "").strip()
    door_name = str(data.get("door_name") or "").strip()

    lines = []
    if prefix == "Core4":
        head = f"{prefix} {action}"
        if domain or habit:
            head = f"{head}: {domain}/{habit}".rstrip("/").replace(":/", ": ")
        lines.append(head)
        if desc and desc.lower() not in {habit.lower(), "core4"}:
            lines.append(desc)
    else:
        head = f"{prefix} {action}"
        if desc:
            head = f"{head}: {desc}"
        lines.append(head)

    if project:
        lines.append(f"project: {project}")
    if tags:
        lines.append(f"tags: {', '.join(tags)}")
    if priority:
        lines.append(f"priority: {priority}")
    if due:
        lines.append(f"due: {due}")
    if status:
        lines.append(f"status: {status}")
    if door_name:
        lines.append(f"door: {door_name}")
    uuid = str(data.get("uuid") or "").strip()
    if uuid and _is_true(os.environ.get("AOS_HOOK_TELE_INCLUDE_UUID", "1")):
        lines.append(f"uuid: {uuid}")
    return "\n".join(lines).strip()


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
    tele_format = str(os.environ.get("AOS_HOOK_TELE_FORMAT", "") or "").strip().lower()
    if tele_format in ("human", "text", "pretty"):
        message = _format_human_message(payload)
    else:
        message = json.dumps(payload, ensure_ascii=False)
    args = [tele_bin]
    if _is_true(os.environ.get("AOS_HOOK_TELE_SILENT", "0")):
        args.append("-s")
    args.append(message)
    subprocess.run(args, check=False)

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
    load_env(GLOBAL_ENV_PATH)
    hook_env_path = Path(os.environ.get("AOS_HOOK_ENV_FILE") or str(ENV_PATH)).expanduser()
    load_env(hook_env_path)
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
    # Note: on-exit.alphaos.py will trigger task_export.json update automatically
    sys.stdout.write(raw)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
