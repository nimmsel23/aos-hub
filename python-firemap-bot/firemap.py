"""Firemap engine shared by the local Fire bot and tooling.

Goal:
- derive a minimal, readable daily/weekly execution list from Taskwarrior
- include due + scheduled + waiting
- keep output grouped per project (one message per project)
- keep overdue separate
"""

from __future__ import annotations

import datetime as dt
import json
import os
import subprocess
from typing import Any, Dict, Iterable, List, Optional


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
    if tid:
        return f"- {tid} {desc}"
    return f"- {desc}"


def _group_by_project(tasks: Iterable[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    groups: Dict[str, List[Dict[str, Any]]] = {}
    for task in tasks:
        project = str(task.get("project") or "Inbox").strip() or "Inbox"
        groups.setdefault(project, []).append(task)
    return groups


def _today_iso() -> str:
    return dt.date.today().isoformat()


def _filters_for_scope(scope: str) -> List[str]:
    if scope == "weekly":
        # Weekly view should not duplicate overdue; overdue is handled separately.
        # Use "after:yesterday" to include today while excluding anything < today.
        return [
            "+fire",
            "(status:pending or status:waiting)",
            "((due.after:yesterday and due.before:eow+1day) or (scheduled.after:yesterday and scheduled.before:eow+1day) or (wait.after:yesterday and wait.before:eow+1day))",
        ]
    # Daily view: only today (overdue handled separately).
    return [
        "+fire",
        "(status:pending or status:waiting)",
        "((due.after:yesterday and due.before:tomorrow) or (scheduled.after:yesterday and scheduled.before:tomorrow) or (wait.after:yesterday and wait.before:tomorrow))",
    ]


def _filters_overdue() -> List[str]:
    return [
        "+fire",
        "(status:pending or status:waiting)",
        "(due.before:today or scheduled.before:today or wait.before:today)",
    ]


def _filters_undated() -> List[str]:
    # Optional: include +fire tasks without due/scheduled/wait in weekly view,
    # so Fire doesn't look empty if tasks aren't date-stamped yet.
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

    total = _run_task_export(["+fire", "(status:pending or status:waiting)"])
    overdue = _run_task_export(_filters_overdue())
    windowed = _run_task_export(_filters_for_scope(scope))
    undated = _run_task_export(_filters_undated()) if INCLUDE_UNDATED_WEEKLY else []
    return {
        "total_fire": len(_dedup(total)),
        "overdue": len(_dedup(overdue)),
        "in_scope": len(_dedup(windowed)),
        "undated": len(_dedup(undated)),
    }


def build_overdue_message() -> str:
    tasks = _dedup(_run_task_export(_filters_overdue()))
    lines = [_task_line(t) for t in tasks if _task_line(t)]
    lines = [l for l in lines if l.strip()]
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

    tasks = _dedup(_run_task_export(_filters_for_scope(scope)))
    if scope == "weekly" and INCLUDE_UNDATED_WEEKLY:
        undated = _dedup(_run_task_export(_filters_undated()))
        if undated:
            # Limit to avoid flooding weekly output.
            tasks.extend(undated[:MAX_UNDATED])
    groups = _group_by_project(tasks)
    now = _today_iso()
    out: List[str] = []
    for project in sorted(groups.keys()):
        items = groups[project]
        lines = [_task_line(t) for t in items if _task_line(t)]
        lines = [l for l in lines if l.strip()]
        if not lines:
            continue
        if len(lines) > MAX_PER_PROJECT:
            lines = lines[:MAX_PER_PROJECT] + ["- ... (truncated)"]
        title = "🔥 Fire " + ("week" if scope == "weekly" else "today") + f" — {project} ({now})"
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
