"""
core4_tw.py — Taskwarrior operations.
Depends on: core4_types, core4_paths
"""

from __future__ import annotations

import json
import re
import subprocess
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Optional

from core4_types import HABIT_ORDER, HABIT_TO_DOMAIN, VALID_HABITS, TZ, Target, week_key
from core4_paths import primary_core4_dir


def run_task(args: list[str], *, capture: bool = True) -> subprocess.CompletedProcess:
    base = ["task", "rc.verbose=0", "rc.confirmation=no"]
    cmd = base + args
    return subprocess.run(
        cmd,
        check=False,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )


def ensure_taskwarrior() -> None:
    try:
        p = run_task(["--version"], capture=True)
    except FileNotFoundError:
        raise RuntimeError("task binary not found") from None
    if p.returncode != 0:
        raise RuntimeError(f"task not usable: {p.stderr.strip() or p.stdout.strip()}")


def find_pending_uuid(target: Target) -> Optional[str]:
    habit_tag = target.tw_habit_primary_tag
    res = run_task(
        [
            f"+{target.date_tag}",
            f"+{habit_tag}",
            "status:pending",
            "uuids",
        ]
    )
    if res.returncode != 0:
        return None
    for line in (res.stdout or "").splitlines():
        line = line.strip()
        if line:
            return line
    return None


def find_completed_uuid(target: Target) -> Optional[str]:
    habit_tag = target.tw_habit_primary_tag
    res = run_task(
        [
            f"+{target.date_tag}",
            f"+{habit_tag}",
            "status:completed",
            "uuids",
        ]
    )
    if res.returncode != 0:
        return None
    for line in (res.stdout or "").splitlines():
        line = line.strip()
        if line:
            return line
    return None


def task_add(target: Target) -> None:
    from core4_types import DISPLAY_HABIT
    habit_display = DISPLAY_HABIT.get(target.habit, target.habit)
    habit_tag = target.tw_habit_primary_tag
    title = f"Core4 {habit_display} ({target.date_key})"
    args = [
        "add",
        title,
        f"project:{habit_tag}",
        f"due:{target.date_key}",
        f"+{habit_tag}",
        f"+{target.date_tag}",
    ]
    res = run_task(args, capture=True)
    if res.returncode != 0:
        raise RuntimeError(f"task add failed: {res.stderr.strip() or res.stdout.strip()}")


def task_done(uuid: str) -> None:
    res = run_task([uuid, "done"], capture=True)
    if res.returncode != 0:
        raise RuntimeError(f"task done failed: {res.stderr.strip() or res.stdout.strip()}")


def tw_has_completed(target: Target) -> bool:
    # Secondary fail-safe: if Taskwarrior already has the completion, do not create duplicates.
    try:
        ensure_taskwarrior()
    except Exception:
        return False

    habit_tag = target.tw_habit_primary_tag
    for query in (
        [f"+{habit_tag}", f"+{target.date_tag}", "status:completed", "uuids"],
        [f"+{habit_tag}", f"due:{target.date_key}", "status:completed", "uuids"],
    ):
        res = run_task(query)
        if res.returncode != 0:
            continue
        if any(line.strip() for line in (res.stdout or "").splitlines()):
            return True
    return False


def _iso_week_days(day: date) -> list[date]:
    """Mon–Sun for the ISO week that contains *day*."""
    monday = day - timedelta(days=day.isoweekday() - 1)
    return [monday + timedelta(days=i) for i in range(7)]


def _habit_due_dates(habit: str, days: list[date]) -> set[str]:
    """Return date-strings within *days* for which +{habit} already has a task (pending or completed)."""
    target_sample = Target(habit=habit, domain=HABIT_TO_DOMAIN[habit], day=days[0])
    habit_tag = target_sample.tw_habit_primary_tag
    day_set = {d.isoformat() for d in days}
    found: set[str] = set()
    for status in ("pending", "completed"):
        res = run_task([f"+{habit_tag}", f"status:{status}", "export"])
        if res.returncode != 0:
            continue
        try:
            tasks = json.loads((res.stdout or "").strip() or "[]")
        except (json.JSONDecodeError, TypeError):
            continue
        for t in tasks:
            due = _parse_due_to_date(t.get("due"))
            if due and due.isoformat() in day_set:
                found.add(due.isoformat())
    return found


def _parse_due_to_date(value: Any) -> Optional[date]:
    if not value:
        return None
    due_str = str(value).strip()
    if not due_str:
        return None
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
            return dt.date()
        except ValueError:
            continue
    return None


def _tw_export_core4_completed() -> list[Dict[str, Any]]:
    try:
        ensure_taskwarrior()
    except Exception:
        return []
    res = run_task(["+core4", "status:completed", "export"])
    if res.returncode != 0:
        return []
    raw = (res.stdout or "").strip()
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except Exception:
        return []
    return data if isinstance(data, list) else []


def _tw_task_habit(task: Dict[str, Any]) -> Optional[str]:
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

    tags = [str(t).lower() for t in (task.get("tags") or [])]
    for tag in tags:
        if tag in mapping:
            return mapping[tag]

    project = str(task.get("project") or "").strip().lower()
    if project in mapping:
        return mapping[project]

    desc = str(task.get("description") or "").strip()
    m = re.search(r"\bCore4\s+([a-zA-Z0-9_-]+)\b", desc)
    if m:
        raw = m.group(1).strip().lower()
        return mapping.get(raw) or (raw if raw in VALID_HABITS else None)
    return None
