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
# LEGACY: TICK_ENV_PATH = Path(os.path.expanduser("~/.aos/tick.env"))
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


def parse_task_objects(raw: str) -> list[dict]:
    raw = (raw or "").strip()
    if not raw:
        return []
    try:
        obj = json.loads(raw)
        return [obj] if isinstance(obj, dict) else []
    except json.JSONDecodeError:
        decoder = json.JSONDecoder()
        idx = 0
        out: list[dict] = []
        while True:
            while idx < len(raw) and raw[idx].isspace():
                idx += 1
            if idx >= len(raw):
                break
            obj, idx = decoder.raw_decode(raw, idx)
            if isinstance(obj, dict):
                out.append(obj)
        return out


def parse_modify_old_new(raw: str) -> tuple[dict | None, dict | None]:
    objs = parse_task_objects(raw)
    if not objs:
        return None, None
    if len(objs) == 1:
        return None, objs[0]
    return objs[-2], objs[-1]


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
    domino_door = str(data.get("domino_door") or "").strip()

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
    if domino_door:
        lines.append(f"domino_door: {domino_door}")
    uuid = str(data.get("uuid") or "").strip()
    if uuid and _is_true(os.environ.get("AOS_HOOK_TELE_INCLUDE_UUID", "1")):
        lines.append(f"uuid: {uuid}")
    return "\n".join(lines).strip()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _format_core4_done_text(domain: str, habit: str, points: float, due: object, desc: str) -> str:
    label = "/".join([p for p in (domain, habit) if p]).strip()
    head = f"✅ Core4 done: {label}" if label else "✅ Core4 done"
    if points:
        head = f"{head} (+{points:.1f})"
    lines = [head]
    desc = (desc or "").strip()
    if desc and desc.lower() not in {habit.lower(), "core4"}:
        lines.append(desc)
    due_fmt = _format_due(due)
    if due_fmt:
        lines.append(f"due: {due_fmt}")
    return "\n".join(lines).strip()

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


def core4_date_key_for_task(task: dict) -> str:
    """Derive Core4 date key (YYYY-MM-DD) from task context."""
    try:
        ts_raw = core4_ts_for_task(task)
        ts_norm = ts_raw.replace("Z", "+00:00")
        dt = datetime.fromisoformat(ts_norm)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(TZ).date().isoformat()
    except Exception:
        return datetime.now(TZ).date().isoformat()


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


_ALPHATYPE_ALIASES = {
    "big": "bigrock",
    "little": "littlerock",
}

_ALPHATYPE_BY_TAG = (
    ("strike", "strike"),
    ("hit", "hit"),
    ("door", "door"),
    ("bigrock", "bigrock"),
    ("littlerock", "littlerock"),
    ("warstack", "warstack"),
    ("freedom", "freedom"),
    ("focus", "focus"),
    ("frame", "frame"),
    ("voice", "voice"),
    ("fire", "fire"),
    ("map", "map"),
    ("mission", "mission"),
)


def normalize_alphatype(value: object) -> str:
    raw = str(value or "").strip().lower()
    if not raw:
        return ""
    return _ALPHATYPE_ALIASES.get(raw, raw)


def detect_alphatype(task: dict, tags: list[str], habit: str = "") -> str:
    explicit = normalize_alphatype(task.get("alphatype"))
    if explicit:
        return explicit
    if "core4" in tags or habit:
        return "daily"
    for tag, alphatype in _ALPHATYPE_BY_TAG:
        if tag in tags:
            return alphatype
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


def send_tele_text(text: str) -> None:
    tele_bin = os.environ.get("AOS_HOOK_TELE_BIN") or os.environ.get("TELE_BIN") or "tele"
    message = str(text or "").strip()
    if not message:
        return
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


def send_core4_log(payload: dict) -> None:
    core4_url = os.environ.get("AOS_CORE4_LOG_URL", "").strip()
    if not core4_url:
        index_base = os.environ.get("AOS_INDEX_BASE_URL", "").strip()
        if not index_base:
            index_base = os.environ.get("AOS_INDEX_URL", "").strip()
            if index_base.endswith("/api/centres"):
                index_base = index_base[: -len("/api/centres")]
        if index_base:
            core4_url = f"{index_base.rstrip('/')}/api/core4/log"
    if not core4_url:
        bridge_url = os.environ.get("AOS_BRIDGE_URL", "http://127.0.0.1:8080").rstrip("/")
        core4_url = f"{bridge_url}/bridge/core4/log"
    # Hook-side Core4 logging is best-effort:
    # - never block `task` commands on network/bridge issues
    # - Bridge is idempotent (dedupe by `key = YYYY-MM-DD:domain:task`)
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    try:
        from urllib import request

        req = request.Request(core4_url, data=data, headers=headers)
        with request.urlopen(req, timeout=5) as resp:
            resp.read()
    except Exception:
        return


_HABIT_LABELS = {
    "fitness": "Fitness", "fuel": "Fuel",
    "meditation": "Meditation", "memoirs": "Memoirs",
    "partner": "Partner", "posterity": "Posterity",
    "discover": "Discover", "declare": "Declare",
}


# LEGACY: TickTick integration removed — use Bridge/GAS pipeline instead
# def _load_tick_config() -> dict: ...
# def send_ticktick_done(domain: str, habit: str, tags: list[str]) -> None: ...


def main() -> int:
    load_env(GLOBAL_ENV_PATH)
    hook_env_path = Path(os.environ.get("AOS_HOOK_ENV_FILE") or str(ENV_PATH)).expanduser()
    load_env(hook_env_path)
    raw = sys.stdin.read()
    old_task, task = parse_modify_old_new(raw)
    if not task:
        return 0

    tags = [str(t).lower() for t in task.get("tags", [])]
    project = task.get("project", "")
    domain = detect_domain(tags, project)
    habit = detect_habit(tags)
    alphatype = detect_alphatype(task, tags, habit)
    status = str(task.get("status", "")).lower()
    old_status = str((old_task or {}).get("status", "")).lower()
    completed_transition = status == "completed" and old_status != "completed"

    data = {
        "uuid": task.get("uuid"),
        "description": task.get("description", ""),
        "tags": tags,
        "project": project,
        "priority": task.get("priority"),
        "due": task.get("due"),
        "end": task.get("end"),
        "domino_door": task.get("domino_door") or "",
        "alphatype": alphatype,
        "changes": {"status": {"old": old_status, "new": status}},
    }

    if habit:
        if completed_transition and os.environ.get("AOS_CORE4_LOG", "1") == "1":
            core4_payload = {
                "domain": domain or "",
                "task": habit,
                "points": float(os.environ.get("AOS_CORE4_POINTS", "0.5")),
                "ts": core4_ts_for_task(task),
                "date": core4_date_key_for_task(task),
                "source": "taskwarrior",
                "user": {"id": task.get("uuid") or ""},
            }
            send_core4_log(core4_payload)
            if _is_true(os.environ.get("AOS_HOOK_CORE4_TELE_DONE", "0")):
                done_text = _format_core4_done_text(
                    domain or "",
                    habit,
                    float(os.environ.get("AOS_CORE4_POINTS", "0.5")),
                    task.get("due"),
                    task.get("description", ""),
                )
                send_tele_text(done_text)
        if status == "completed":
            # LEGACY: if completed_transition and os.environ.get("AOS_CORE4_TICKTICK", "1") == "1":
            #     send_ticktick_done(domain, habit, tags)
            payload = {
                "type": "core4_task_done",
                "timestamp": now_iso(),
                "data": {**data, "domain": domain, "task": habit},
            }
        else:
            payload = {
                "type": "core4_task_modify",
                "timestamp": now_iso(),
                "data": {**data, "domain": domain, "task": habit},
            }
    else:
        if status == "completed":
            payload = {"type": "task_done_sync", "timestamp": now_iso(), "data": data}
        else:
            # Skip noisy/slow modify events when configured.
            if _is_true(os.environ.get("AOS_HOOK_SKIP_MODIFY", "0")):
                sys.stdout.write(json.dumps(task, ensure_ascii=False))
                return 0
            payload = {"type": "task_modify_sync", "timestamp": now_iso(), "data": data}

    target = os.environ.get("AOS_HOOK_TARGET", "tele").lower().strip()
    if target == "bridge":
        send_bridge(payload)
    else:
        send_tele(payload)

    # Note: on-exit.alphaos.py will trigger task_export.json update automatically
    sys.stdout.write(json.dumps(task, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
