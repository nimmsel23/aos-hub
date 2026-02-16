#!/usr/bin/env python3
"""Firemap engine (Taskwarrior -> grouped messages).

Design goals:
- Derive minimal daily/weekly execution list from Taskwarrior
- Include due + scheduled + wait
- Keep output grouped per project (one message per project)
- Keep overdue separate

AlphaOS alignment:
- Fire Map is tactical output (weekly war + daily execution)
"""

from __future__ import annotations

import datetime as dt
import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List
from zoneinfo import ZoneInfo


TASK_BIN = os.environ.get("AOS_TASK_BIN", "task")
TAGS_RAW = os.environ.get("AOS_FIREMAP_TAGS", "").strip() or "production,hit,fire"
TAGS_MODE = os.environ.get("AOS_FIREMAP_TAGS_MODE", "").strip().lower() or "any"  # any | all
TAGS = [t.strip().lower() for t in TAGS_RAW.split(",") if t.strip()]
INCLUDE_UNDATED_DAILY = os.environ.get("AOS_FIREMAP_INCLUDE_UNDATED_DAILY", "1").strip().lower() in (
    "1",
    "true",
    "yes",
    "on",
)
TASK_EXPORT_PATH = Path(
    os.environ.get("AOS_FIREMAP_TASK_EXPORT_PATH", "~/.local/share/alphaos/task_export.json")
).expanduser()
TASK_EXPORT_MAX_AGE_SEC = int(os.environ.get("AOS_FIREMAP_TASK_EXPORT_MAX_AGE_SEC", "600") or "600")
MAX_PER_PROJECT = int(os.environ.get("AOS_FIREMAP_MAX_PER_PROJECT", "30") or "30")
MAX_OVERDUE_LINES = int(os.environ.get("AOS_FIREMAP_MAX_OVERDUE_LINES", "120") or "120")
OUTPUT_FORMAT = os.environ.get("AOS_FIREMAP_OUTPUT_FORMAT", "code").strip().lower()  # code | plain
INCLUDE_UNDATED_WEEKLY = os.environ.get("AOS_FIREMAP_INCLUDE_UNDATED_WEEKLY", "1").strip().lower() in (
    "1",
    "true",
    "yes",
    "on",
)
MAX_UNDATED = int(os.environ.get("AOS_FIREMAP_MAX_UNDATED", "10") or "10")

DEFAULT_TZ = os.environ.get("AOS_TZ", "Europe/Vienna")
TZ = ZoneInfo(DEFAULT_TZ)


def _tag_terms() -> List[str]:
    if not TAGS:
        return []
    if TAGS_MODE == "all":
        return [f"+{t}" for t in TAGS]
    # any
    expr = " or ".join([f"+{t}" for t in TAGS])
    return [f"({expr})"]


@dataclass(frozen=True)
class Window:
    start: dt.date
    end: dt.date  # inclusive end


def _run_task_export(args: List[str]) -> tuple[List[Dict[str, Any]], bool]:
    cmd = [TASK_BIN, "rc.verbose=0", "rc.confirmation=no", *args, "export"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    except OSError:
        return [], False

    if result.returncode != 0:
        return [], False

    raw = (result.stdout or "").strip()
    if not raw:
        return [], True
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return [], False
    return (data if isinstance(data, list) else []), True


def _load_export_file(*, allow_stale: bool) -> List[Dict[str, Any]] | None:
    try:
        if not TASK_EXPORT_PATH.is_file():
            return None
        if not allow_stale and TASK_EXPORT_MAX_AGE_SEC > 0:
            st = TASK_EXPORT_PATH.stat()
            age = dt.datetime.now(dt.timezone.utc).timestamp() - st.st_mtime
            if age > TASK_EXPORT_MAX_AGE_SEC:
                return None
        data = json.loads(TASK_EXPORT_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else None
    except Exception:
        return None


def _load_tasks_snapshot() -> List[Dict[str, Any]]:
    # Prefer local export snapshot (stable, avoids Taskwarrior DB lock issues).
    from_file = _load_export_file(allow_stale=False)
    if from_file is not None:
        return from_file

    tasks, ok = _run_task_export(["(status:pending or status:waiting)"])
    if ok:
        return tasks

    from_file = _load_export_file(allow_stale=True)
    return from_file if from_file is not None else []


def _as_list(val: Any) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return [str(x) for x in val if str(x).strip()]
    return []


def _parse_tw_dt(value: Any) -> dt.datetime | None:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None

    # ISO first
    try:
        parsed = dt.datetime.fromisoformat(text.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed.astimezone(TZ)
    except Exception:
        pass

    # Taskwarrior export format: 20260101T010203Z
    try:
        match = (
            len(text) >= 15
            and text[8] == "T"
            and text[0:4].isdigit()
            and text[4:6].isdigit()
            and text[6:8].isdigit()
        )
        if not match:
            return None
        year = int(text[0:4])
        month = int(text[4:6])
        day = int(text[6:8])
        hour = int(text[9:11])
        minute = int(text[11:13])
        second = int(text[13:15])
        parsed = dt.datetime(year, month, day, hour, minute, second, tzinfo=dt.timezone.utc)
        return parsed.astimezone(TZ)
    except Exception:
        return None


def _date_candidates(task: Dict[str, Any]) -> List[dt.datetime]:
    out: List[dt.datetime] = []
    for field in ("due", "scheduled", "wait"):
        d = _parse_tw_dt(task.get(field))
        if d:
            out.append(d)
    return out


def _primary_date(task: Dict[str, Any]) -> dt.datetime | None:
    dates = _date_candidates(task)
    return min(dates) if dates else None


def _matches_undated_tags(task: Dict[str, Any]) -> bool:
    if not TAGS:
        return True
    tags = {t.lower() for t in _as_list(task.get("tags"))}
    if TAGS_MODE == "all":
        return all(t in tags for t in TAGS)
    return any(t in tags for t in TAGS)


def _filter_status(task: Dict[str, Any]) -> bool:
    st = str(task.get("status") or "").strip().lower()
    return st in ("pending", "waiting")


def _select_overdue(tasks: List[Dict[str, Any]], *, today_start: dt.datetime) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for t in tasks:
        if not _filter_status(t):
            continue
        if any(d < today_start for d in _date_candidates(t)):
            out.append(t)
    return out


def _select_windowed(tasks: List[Dict[str, Any]], *, start: dt.datetime, end: dt.datetime) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for t in tasks:
        if not _filter_status(t):
            continue
        d = _primary_date(t)
        if not d:
            continue
        if start <= d < end:
            out.append(t)
    return out


def _select_undated(tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for t in tasks:
        if not _filter_status(t):
            continue
        if _primary_date(t) is not None:
            continue
        if _matches_undated_tags(t):
            out.append(t)
    return out


def _dedup(tasks: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    out: List[Dict[str, Any]] = []
    for task in tasks:
        if not isinstance(task, dict):
            continue
        key = str(task.get("uuid") or task.get("id") or "").strip()
        if not key:
            key = f"{task.get('project','')}|{task.get('description','')}"
        if key in seen:
            continue
        seen.add(key)
        out.append(task)
    return out


def _task_line(task: Dict[str, Any]) -> str:
    desc = str(task.get("description") or "").strip()
    tid = str(task.get("id") or "").strip()
    tags = [t.strip().lower() for t in _as_list(task.get("tags")) if str(t).strip()]
    tags = sorted({t for t in tags if t})
    if not desc:
        return ""
    tag_suffix = ""
    if tags:
        tag_suffix = " (" + " ".join([f"+{t}" for t in tags]) + ")"
    if tid:
        return f"- {tid} {desc}{tag_suffix}"
    return f"- {desc}{tag_suffix}"


def _group_by_project(tasks: Iterable[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    groups: Dict[str, List[Dict[str, Any]]] = {}
    for task in tasks:
        project = str(task.get("project") or "Inbox").strip() or "Inbox"
        groups.setdefault(project, []).append(task)
    return groups


def _today() -> dt.date:
    return dt.datetime.now(TZ).date()


def _iso(d: dt.date) -> str:
    return d.isoformat()


def _week_window(today: dt.date) -> Window:
    # ISO week: Monday=1 ... Sunday=7
    start = today - dt.timedelta(days=today.isoweekday() - 1)
    end = start + dt.timedelta(days=6)
    return Window(start=start, end=end)


def _filters_overdue(today: dt.date) -> List[str]:
    # Anything strictly before today counts as overdue.
    return [
        "(status:pending or status:waiting)",
        "(due.before:today or scheduled.before:today or wait.before:today)",
    ]


def _filters_daily(today: dt.date) -> List[str]:
    # Window: today only (>= today AND < tomorrow)
    return [
        "(status:pending or status:waiting)",
        "((due.after:yesterday and due.before:tomorrow) or (scheduled.after:yesterday and scheduled.before:tomorrow) or (wait.after:yesterday and wait.before:tomorrow))",
    ]


def _filters_weekly(window: Window) -> List[str]:
    # Weekly view excludes overdue; shows tasks within [today..end_of_week]
    # Taskwarrior doesn't natively accept explicit ISO date ranges without comparisons;
    # we'll approximate with relative terms (today..eow).
    return [
        "(status:pending or status:waiting)",
        "((due.after:yesterday and due.before:eow+1day) or (scheduled.after:yesterday and scheduled.before:eow+1day) or (wait.after:yesterday and wait.before:eow+1day))",
    ]


def _filters_undated() -> List[str]:
    return [
        *_tag_terms(),
        "(status:pending or status:waiting)",
        "(due.none and scheduled.none and wait.none)",
    ]


def debug_counts(scope: str) -> Dict[str, int]:
    """Cheap diagnostics for 'why is output empty?' situations."""
    scope = str(scope or "").strip().lower()
    if scope not in ("daily", "weekly"):
        scope = "daily"

    raw_tasks = _load_tasks_snapshot()
    today_start = dt.datetime.now(TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + dt.timedelta(days=1)
    week_start = today_start - dt.timedelta(days=today_start.isoweekday() - 1)
    week_end = week_start + dt.timedelta(days=7)

    overdue = _select_overdue(raw_tasks, today_start=today_start)
    if scope == "daily":
        windowed = _select_windowed(raw_tasks, start=today_start, end=tomorrow_start)
    else:
        windowed = _select_windowed(raw_tasks, start=today_start, end=week_end)

    undated = []
    if (scope == "daily" and INCLUDE_UNDATED_DAILY) or (scope == "weekly" and INCLUDE_UNDATED_WEEKLY):
        undated = _select_undated(raw_tasks)

    return {
        "total": len(_dedup(raw_tasks)),
        "overdue": len(_dedup(overdue)),
        "in_scope": len(_dedup(windowed)),
        "undated": len(_dedup(undated)),
    }


def build_overdue_message() -> str:
    raw_tasks = _load_tasks_snapshot()
    today_start = dt.datetime.now(TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    tasks = _dedup(_select_overdue(raw_tasks, today_start=today_start))

    lines = []
    for t in tasks:
        line = _task_line(t)
        if line:
            lines.append(line)

    if not lines:
        return "✅ No overdue fire tasks."

    if len(lines) > MAX_OVERDUE_LINES:
        lines = lines[:MAX_OVERDUE_LINES] + ["- ... (truncated)"]

    body = "\n".join(lines)
    if OUTPUT_FORMAT == "plain":
        return "⛔ Overdue Fire\n" + body
    return "*⛔ Overdue Fire*\n```markdown\n" + body + "\n```"


def build_project_messages(scope: str) -> List[str]:
    scope = str(scope or "").strip().lower()
    if scope not in ("daily", "weekly"):
        return []

    today = _today()

    raw_tasks = _load_tasks_snapshot()
    today_start = dt.datetime.now(TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + dt.timedelta(days=1)
    week_start = today_start - dt.timedelta(days=today_start.isoweekday() - 1)
    week_end = week_start + dt.timedelta(days=7)

    if scope == "daily":
        tasks = _dedup(_select_windowed(raw_tasks, start=today_start, end=tomorrow_start))
        label = f"today — {_iso(today_start.date())}"
        if INCLUDE_UNDATED_DAILY:
            undated = _dedup(_select_undated(raw_tasks))
            if undated:
                tasks.extend(undated[:MAX_UNDATED])
    else:
        w = _week_window(today_start.date())
        tasks = _dedup(_select_windowed(raw_tasks, start=today_start, end=week_end))
        label = f"week — {_iso(w.start)}..{_iso(w.end)}"
        if INCLUDE_UNDATED_WEEKLY:
            undated = _dedup(_select_undated(raw_tasks))
            if undated:
                tasks.extend(undated[:MAX_UNDATED])

    groups = _group_by_project(tasks)
    out: List[str] = []

    for project in sorted(groups.keys()):
        items = groups[project]
        lines = []
        for t in items:
            line = _task_line(t)
            if line:
                lines.append(line)

        if not lines:
            continue
        if len(lines) > MAX_PER_PROJECT:
            lines = lines[:MAX_PER_PROJECT] + ["- ... (truncated)"]

        title = f"🔥 Fire {label} — {project}"
        body = "\n".join(lines)
        if OUTPUT_FORMAT == "plain":
            out.append(title + "\n" + body)
        else:
            out.append(f"*{title}*\n```markdown\n{body}\n```")

    return out


def build_all_messages(scope: str) -> List[str]:
    msgs: List[str] = []
    overdue = build_overdue_message().strip()
    if overdue:
        msgs.append(overdue)
    msgs.extend(build_project_messages(scope))
    return [m for m in msgs if str(m).strip()]
