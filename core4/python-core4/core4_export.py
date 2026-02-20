"""
core4_export.py — CSV export, finalize, prune, seed_week.
Depends on: core4_types, core4_paths, core4_ledger, core4_tw
"""

from __future__ import annotations

import csv
import json
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict

from core4_types import HABIT_ORDER, HABIT_TO_DOMAIN, Target, week_key
from core4_paths import (
    core4_daily_csv_path,
    core4_event_dir,
    core4_monthly_csv_path,
    core4_scores_csv_path,
    core4_sealed_dir,
    core4_sealed_months_dir,
    primary_core4_dir,
)
from core4_ledger import build_day, build_week


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _parse_month(value: str) -> tuple[int, int]:
    text = str(value or "").strip()
    m = re.fullmatch(r"(\d{4})-(\d{2})", text)
    if not m:
        raise ValueError(f"invalid month: {value}")
    year = int(m.group(1))
    month = int(m.group(2))
    if not (1 <= month <= 12):
        raise ValueError(f"invalid month: {value}")
    return year, month


def _month_days(year: int, month: int) -> list[date]:
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    days: list[date] = []
    d = start
    while d < end:
        days.append(d)
        d += timedelta(days=1)
    return days


def _day_row(day_data: Dict[str, Any], day: date) -> Dict[str, Any]:
    totals = day_data.get("totals") if isinstance(day_data.get("totals"), dict) else {}
    by_domain = totals.get("by_domain") if isinstance(totals.get("by_domain"), dict) else {}
    total = _safe_float((totals.get("by_day") or {}).get(day.isoformat()), 0.0) if isinstance(totals.get("by_day"), dict) else 0.0
    return {
        "date": day.isoformat(),
        "week": week_key(day),
        "day_total": total,
        "body": _safe_float(by_domain.get("body"), 0.0),
        "being": _safe_float(by_domain.get("being"), 0.0),
        "balance": _safe_float(by_domain.get("balance"), 0.0),
        "business": _safe_float(by_domain.get("business"), 0.0),
        "entry_count": int(len(day_data.get("entries") or [])),
        "updated_at": str(day_data.get("updated_at") or ""),
    }


def export_daily_csv(*, days: int = 56) -> "Path":
    """Regenerate `core4_daily.csv` for the last N days (default: 8 weeks)."""
    from pathlib import Path
    days = max(7, min(int(days), 365))
    end = date.today()
    start = end - timedelta(days=days - 1)

    rows: list[Dict[str, Any]] = []
    d = start
    while d <= end:
        day_data = build_day(d, write=True)
        rows.append(_day_row(day_data, d))
        d += timedelta(days=1)

    path = core4_daily_csv_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()) if rows else [])
        if rows:
            writer.writeheader()
            writer.writerows(rows)
    return path


def finalize_month(month: str, *, force: bool = False) -> Dict[str, Any]:
    """
    Month close:
    - rebuild day rows from event ledger
    - write `core4_YYYY-MM.csv` (one row per day)
    - mark sealed to avoid accidental duplicates
    """
    year, mon = _parse_month(month)
    sealed_dir = core4_sealed_months_dir()
    sealed_dir.mkdir(parents=True, exist_ok=True)
    marker = sealed_dir / f"{month}.json"
    if marker.exists() and not force:
        return {"ok": True, "sealed": True, "skipped": True, "month": month}

    rows: list[Dict[str, Any]] = []
    for d in _month_days(year, mon):
        day_data = build_day(d, write=True)
        rows.append(_day_row(day_data, d))

    csv_path = core4_monthly_csv_path(month)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()) if rows else [])
        if rows:
            writer.writeheader()
        writer.writerows(rows)

    marker.write_text(
        json.dumps({"month": month, "sealed_at": datetime.now(timezone.utc).isoformat(), "csv": str(csv_path)}, indent=2)
        + "\n",
        encoding="utf-8",
    )
    return {"ok": True, "sealed": True, "skipped": False, "month": month, "csv": str(csv_path)}


def _parse_week(value: str) -> date:
    text = str(value or "").strip()
    m = re.fullmatch(r"(\d{4})-W(\d{2})", text)
    if not m:
        raise ValueError(f"invalid week: {value}")
    return date.fromisocalendar(int(m.group(1)), int(m.group(2)), 1)


def finalize_week(week: str, *, force: bool = False) -> Dict[str, Any]:
    start = _parse_week(week)
    data = build_week(start, write=True)
    totals = data.get("totals") if isinstance(data.get("totals"), dict) else {}

    sealed_dir = core4_sealed_dir()
    sealed_dir.mkdir(parents=True, exist_ok=True)
    marker = sealed_dir / f"{week}.json"
    if marker.exists() and not force:
        return {"ok": True, "sealed": True, "skipped": True, "week": week}

    row = {
        "week": week,
        "updated_at": str(data.get("updated_at") or ""),
        "week_total": _safe_float(totals.get("week_total"), 0.0),
        "body": _safe_float((totals.get("by_domain") or {}).get("body"), 0.0),
        "being": _safe_float((totals.get("by_domain") or {}).get("being"), 0.0),
        "balance": _safe_float((totals.get("by_domain") or {}).get("balance"), 0.0),
        "business": _safe_float((totals.get("by_domain") or {}).get("business"), 0.0),
        "entry_count": int(len(data.get("entries") or [])),
    }

    csv_path = core4_scores_csv_path()
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    write_header = (not csv_path.exists()) or csv_path.stat().st_size == 0
    with csv_path.open("a", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(row.keys()))
        if write_header:
            writer.writeheader()
        writer.writerow(row)

    marker.write_text(json.dumps({"week": week, "sealed_at": datetime.now(timezone.utc).isoformat(), "row": row}, indent=2), encoding="utf-8")
    return {"ok": True, "sealed": True, "skipped": False, "week": week, "csv": str(csv_path)}


def prune_events(*, keep_weeks: int = 8) -> Dict[str, Any]:
    """
    Remove local event files older than `keep_weeks` to limit growth.
    Only touches the *local* ledger under `~/.core4/events`.
    """
    keep_weeks = max(1, min(int(keep_weeks), 52))
    cutoff = date.today() - timedelta(days=keep_weeks * 7)
    base = primary_core4_dir()
    ev_root = core4_event_dir(base)
    deleted = 0
    kept = 0
    if not ev_root.exists():
        return {"ok": True, "deleted": 0, "kept": 0, "cutoff": cutoff.isoformat()}

    for day_dir in sorted(p for p in ev_root.glob("*") if p.is_dir()):
        day_key = day_dir.name
        try:
            d = datetime.strptime(day_key, "%Y-%m-%d").date()
        except Exception:
            continue
        if d >= cutoff:
            kept += 1
            continue
        try:
            for f in day_dir.glob("*.json"):
                try:
                    f.unlink(missing_ok=True)
                    deleted += 1
                except Exception:
                    continue
            # remove empty dir
            try:
                next(day_dir.iterdir())
            except StopIteration:
                day_dir.rmdir()
        except Exception:
            continue

    return {"ok": True, "deleted": deleted, "kept_days": kept, "cutoff": cutoff.isoformat()}


def seed_week(day: date, *, dry_run: bool = False, force: bool = False) -> Dict[str, Any]:
    """Seed pending Core4 TW tasks for every habit in the ISO week.

    Idempotent: skips any habit+day that already has a pending or completed
    task with the matching habit tag — regardless of description or other tags.
    Pass *force* to skip the existence check entirely.
    """
    from core4_tw import ensure_taskwarrior, task_add, _iso_week_days, _habit_due_dates
    from core4_types import DISPLAY_HABIT

    days = _iso_week_days(day)
    wk = week_key(day)
    created = 0
    skipped = 0
    errors: list[str] = []

    if not dry_run:
        try:
            ensure_taskwarrior()
        except Exception as exc:
            return {"ok": False, "error": str(exc), "week": wk}

    # Pre-fetch: which habit+day combos already have a task?
    existing: Dict[str, set[str]] = {}
    if not dry_run and not force:
        for habit in HABIT_ORDER:
            existing[habit] = _habit_due_dates(habit, days)

    for d in days:
        for habit in HABIT_ORDER:
            target = Target(habit=habit, domain=HABIT_TO_DOMAIN[habit], day=d)
            if not dry_run and not force and d.isoformat() in existing.get(habit, set()):
                skipped += 1
                continue
            if dry_run:
                print(f"  {target.date_key}  {target.domain:8s}  {DISPLAY_HABIT.get(target.habit, target.habit)}")
                created += 1
                continue
            try:
                task_add(target)
                created += 1
            except Exception as exc:
                errors.append(f"{target.date_key}:{target.habit} {exc}")

    return {"ok": True, "week": wk, "created": created, "skipped": skipped, "errors": errors}
