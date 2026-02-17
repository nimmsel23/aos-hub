"""
core4_score.py — Score display and TW replay.
Depends on: core4_types, core4_ui, core4_ledger, core4_tw
"""

from __future__ import annotations

import re
import sys
from datetime import date
from typing import Any, Dict

from core4_types import (
    DISPLAY_HABIT,
    DOMAIN_ORDER,
    HABIT_ORDER,
    HABIT_TO_DOMAIN,
    Target,
    normalize_habit,
    parse_day,
    week_key,
)
from core4_ui import _cyan, _green, _yellow
from core4_ledger import (
    bridge_core4_log,
    is_already_logged,
    list_events_for_day,
    load_week,
)
from core4_tw import (
    _parse_due_to_date,
    _tw_export_core4_completed,
    _tw_task_habit,
)


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _display_habit(habit: str) -> str:
    return DISPLAY_HABIT.get(habit, habit)


def day_total_from_week(data: Dict[str, Any], day: date) -> float:
    date_key = day.isoformat()
    total = 0.0
    entries = data.get("entries") or []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        if str(entry.get("date") or "").strip() != date_key:
            continue
        done = bool(entry.get("done", True))
        points = _safe_float(entry.get("points"), 0.5 if done else 0.0)
        if done:
            total += points
    return total


def week_total_from_week(data: Dict[str, Any]) -> float:
    totals = data.get("totals") or {}
    if isinstance(totals, dict) and "week_total" in totals:
        return _safe_float(totals.get("week_total"), 0.0)
    total = 0.0
    entries = data.get("entries") or []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        done = bool(entry.get("done", True))
        points = _safe_float(entry.get("points"), 0.5 if done else 0.0)
        if done:
            total += points
    return total


def _iter_done_entries(data: Dict[str, Any]) -> list[Dict[str, Any]]:
    entries = data.get("entries") or []
    if not isinstance(entries, list):
        return []
    out: list[Dict[str, Any]] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        if entry.get("done") is False:
            continue
        if _safe_float(entry.get("points"), 0.5) <= 0.0:
            continue
        out.append(entry)
    return out


def _day_done_list(data: Dict[str, Any], day: date) -> list[tuple[str, str]]:
    date_key = day.isoformat()
    out: list[tuple[str, str]] = []
    for entry in _iter_done_entries(data):
        if str(entry.get("date") or "").strip() != date_key:
            continue
        domain = str(entry.get("domain") or "").strip().lower()
        habit = normalize_habit(str(entry.get("task") or "").strip().lower())
        out.append((domain, _display_habit(habit)))
    dom_idx = {d: i for i, d in enumerate(DOMAIN_ORDER)}
    hab_idx = {h: i for i, h in enumerate([_display_habit(h) for h in HABIT_ORDER])}
    out.sort(key=lambda x: (dom_idx.get(x[0], 999), hab_idx.get(x[1], 999), x[1]))
    # de-dupe display list
    seen = set()
    uniq: list[tuple[str, str]] = []
    for item in out:
        if item in seen:
            continue
        seen.add(item)
        uniq.append(item)
    return uniq


def _week_done_by_day(data: Dict[str, Any], week: str) -> Dict[str, list[str]]:
    by_day: Dict[str, set[str]] = {}
    for entry in _iter_done_entries(data):
        if str(entry.get("week") or "").strip() != week:
            continue
        date_key = str(entry.get("date") or "").strip()
        if not date_key:
            continue
        habit = normalize_habit(str(entry.get("task") or "").strip().lower())
        by_day.setdefault(date_key, set()).add(_display_habit(habit))
    hab_idx = {h: i for i, h in enumerate([_display_habit(h) for h in HABIT_ORDER])}
    return {day: sorted(list(hs), key=lambda h: hab_idx.get(h, 999)) for day, hs in by_day.items()}


def replay_from_taskwarrior(day: date, *, scope: str) -> int:
    """Replay completed Core4 tasks into Bridge weekly JSON for a day or week."""
    from datetime import timedelta
    tasks = _tw_export_core4_completed()
    if not tasks:
        return 0
    wk = week_key(day)
    start = day - timedelta(days=day.isoweekday() - 1)
    end = start + timedelta(days=6)

    replayed = 0
    for task in tasks:
        if not isinstance(task, dict):
            continue
        due_day = _parse_due_to_date(task.get("due"))
        if not due_day:
            continue
        if week_key(due_day) != wk:
            continue
        if scope == "day" and due_day != day:
            continue
        if scope == "week" and not (start <= due_day <= end):
            continue

        habit = _tw_task_habit(task)
        if not habit:
            continue
        domain = str(task.get("domain") or "").strip().lower() or HABIT_TO_DOMAIN.get(habit, "")
        if not domain:
            continue

        target = Target(habit=habit, domain=domain, day=due_day)
        try:
            if is_already_logged(target):
                continue
            bridge_core4_log(target, source="tracker_replay_tw")
            replayed += 1
        except Exception:
            continue

    return replayed


def _expected_points_from_tw(day: date, *, scope: str) -> float:
    from datetime import timedelta
    tasks = _tw_export_core4_completed()
    if not tasks:
        return 0.0
    wk = week_key(day)
    start = day - timedelta(days=day.isoweekday() - 1)
    end = start + timedelta(days=6)

    seen: set[str] = set()
    for task in tasks:
        if not isinstance(task, dict):
            continue
        due_day = _parse_due_to_date(task.get("due"))
        if not due_day:
            continue
        if week_key(due_day) != wk:
            continue
        if scope == "day" and due_day != day:
            continue
        if scope == "week" and not (start <= due_day <= end):
            continue
        habit = _tw_task_habit(task)
        if not habit:
            continue
        domain = str(task.get("domain") or "").strip().lower() or HABIT_TO_DOMAIN.get(habit, "")
        if not domain:
            continue
        seen.add(f"{due_day.isoformat()}:{domain}:{habit}")
    return 0.5 * float(len(seen))


def score_mode(argv: list[str]) -> int:
    # Defaults
    mode = "day"  # day|week
    day_raw = None
    quiet = False

    rest: list[str] = []
    i = 0
    while i < len(argv):
        tok = argv[i]
        if tok in ("-w", "--week"):
            mode = "week"
            i += 1
            continue
        if tok in ("-d", "--day"):
            mode = "day"
            i += 1
            continue
        if tok == "--date":
            if i + 1 >= len(argv):
                print("core4: missing value for --date", file=sys.stderr)
                return 2
            day_raw = argv[i + 1]
            i += 2
            continue
        if tok.startswith("--date="):
            day_raw = tok.split("=", 1)[1]
            i += 1
            continue
        if tok in ("-q", "--quiet"):
            quiet = True
            i += 1
            continue
        rest.append(tok)
        i += 1

    # Support `core4 -1d` or `core4 2026-01-13` (day mode default).
    for tok in rest:
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", tok) or re.fullmatch(r"-\d+d", tok):
            day_raw = tok
            break

    try:
        day = parse_day(day_raw)
    except Exception as exc:
        print(f"core4: {exc}", file=sys.stderr)
        return 2

    data = load_week(day)
    wk = week_key(day)

    if mode == "week":
        current = week_total_from_week(data)
        expected = _expected_points_from_tw(day, scope="week")
        has_any = bool(data.get("entries") or []) or expected > 0.0
        if expected > current + 1e-9:
            replay_from_taskwarrior(day, scope="week")
            data = load_week(day)
            current = week_total_from_week(data)
            has_any = bool(data.get("entries") or []) or expected > 0.0
        total = current
        if (not has_any) and total == 0.0 and expected == 0.0:
            print(_yellow(f"Core4 {wk}: 0.0/28 (no data)"))
            return 0
        print(_cyan(f"Core4 {wk}: {total:.1f}/28"))
        if not quiet:
            by_day = _week_done_by_day(data, wk)
            for date_key in sorted(by_day.keys()):
                habits = by_day[date_key]
                if habits:
                    print(f"{date_key}: {', '.join(habits)}")
        return 0

    current = day_total_from_week(data, day)
    expected = _expected_points_from_tw(day, scope="day")
    has_any = bool(list_events_for_day(day)) or expected > 0.0
    if expected > current + 1e-9:
        replay_from_taskwarrior(day, scope="day")
        data = load_week(day)
        current = day_total_from_week(data, day)
    total = current
    print(_cyan(f"Core4 {day.isoformat()} ({wk}): {total:.1f}/4"))
    if not quiet:
        done = _day_done_list(data, day)
        done_habits = [h for _, h in done]
        if done_habits:
            print(_green(f"Done: {', '.join(done_habits)}"))
        else:
            print(_yellow("Done: (none)"))
    return 0
