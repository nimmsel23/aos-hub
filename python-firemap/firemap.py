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
from typing import Any, Dict, Iterable, List
from zoneinfo import ZoneInfo


TASK_BIN = os.environ.get("AOS_TASK_BIN", "task")
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


@dataclass(frozen=True)
class Window:
    start: dt.date
    end: dt.date  # inclusive end


def _run_task_export(args: List[str]) -> List[Dict[str, Any]]:
    cmd = [TASK_BIN, "rc.verbose=0", "rc.confirmation=no", *args, "export"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    except OSError:
        return []

    raw = (result.stdout or "").strip()
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


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
    if not desc:
        return ""
    if tid:
        return f"- {tid} {desc}"
    return f"- {desc}"


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
        "+fire",
        "(status:pending or status:waiting)",
        "(due.before:today or scheduled.before:today or wait.before:today)",
    ]


def _filters_daily(today: dt.date) -> List[str]:
    # Window: today only (>= today AND < tomorrow)
    return [
        "+fire",
        "(status:pending or status:waiting)",
        "((due.after:yesterday and due.before:tomorrow) or (scheduled.after:yesterday and scheduled.before:tomorrow) or (wait.after:yesterday and wait.before:tomorrow))",
    ]


def _filters_weekly(window: Window) -> List[str]:
    # Weekly view excludes overdue; shows tasks within [today..end_of_week]
    # Taskwarrior doesn't natively accept explicit ISO date ranges without comparisons;
    # we'll approximate with relative terms (today..eow).
    return [
        "+fire",
        "(status:pending or status:waiting)",
        "((due.after:yesterday and due.before:eow+1day) or (scheduled.after:yesterday and scheduled.before:eow+1day) or (wait.after:yesterday and wait.before:eow+1day))",
    ]


def _filters_undated() -> List[str]:
    return [
        "+fire",
        "(status:pending or status:waiting)",
        "(due.none and scheduled.none and wait.none)",
    ]


def debug_counts(scope: str) -> Dict[str, int]:
    """Cheap diagnostics for 'why is output empty?' situations."""
    scope = str(scope or "").strip().lower()
    if scope not in ("daily", "weekly"):
        scope = "daily"

    today = _today()
    total = _run_task_export(["+fire", "(status:pending or status:waiting)"])
    overdue = _run_task_export(_filters_overdue(today))
    windowed = _run_task_export(_filters_daily(today) if scope == "daily" else _filters_weekly(_week_window(today)))
    undated = _run_task_export(_filters_undated()) if (scope == "weekly" and INCLUDE_UNDATED_WEEKLY) else []

    return {
        "total_fire": len(_dedup(total)),
        "overdue": len(_dedup(overdue)),
        "in_scope": len(_dedup(windowed)),
        "undated": len(_dedup(undated)),
    }


def build_overdue_message() -> str:
    today = _today()
    tasks = _dedup(_run_task_export(_filters_overdue(today)))

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

    if scope == "daily":
        tasks = _dedup(_run_task_export(_filters_daily(today)))
        label = f"today — {_iso(today)}"
    else:
        w = _week_window(today)
        tasks = _dedup(_run_task_export(_filters_weekly(w)))
        label = f"week — {_iso(w.start)}..{_iso(w.end)}"
        if INCLUDE_UNDATED_WEEKLY:
            undated = _dedup(_run_task_export(_filters_undated()))
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
