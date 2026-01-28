#!/usr/bin/env python3
"""
Core4 tracker CLI (idempotent via weekly JSON).

Design:
- The *source of truth* for "already logged" is the weekly JSON written by Bridge:
  `AlphaOS-Vault/Alpha_Core4/core4_week_YYYY-WWW.json` (configurable via env).
- If the entry is already present (done=true), we do nothing.
- Otherwise we create+complete a Taskwarrior task so existing hooks handle:
  - Bridge `/bridge/core4/log` (weekly JSON)
  - TickTick mapping + completion (`ticktick_sync.py`)
"""

from __future__ import annotations

import argparse
import termios
import tty
import csv
import json
import os
import re
import subprocess
import sys
import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from urllib import request
from urllib.error import URLError, HTTPError
from zoneinfo import ZoneInfo


HABIT_ALIASES = {
    "partner": "person1",
    "posterity": "person2",
    "person_1": "person1",
    "person-1": "person1",
    "person_2": "person2",
    "person-2": "person2",
    "learn": "discover",
    "action": "declare",
}

VALID_HABITS = {
    "fitness",
    "fuel",
    "meditation",
    "memoirs",
    "person1",
    "person2",
    "discover",
    "declare",
}

HABIT_TO_DOMAIN = {
    "fitness": "body",
    "fuel": "body",
    "meditation": "being",
    "memoirs": "being",
    "person1": "balance",
    "person2": "balance",
    "discover": "business",
    "declare": "business",
}

DISPLAY_HABIT = {
    "person1": "partner",
    "person2": "posterity",
}

HABIT_ORDER = ["fitness", "fuel", "meditation", "memoirs", "person1", "person2", "discover", "declare"]
DOMAIN_ORDER = ["body", "being", "balance", "business"]

HABIT_PROMPTS = {
    "fitness": "Did you sweat today?",
    "fuel": "Did you fuel your body?",
    "meditation": "Did you meditate?",
    "memoirs": "Did you write memoirs?",
    "person1": "Did you invest in Person 1?",
    "person2": "Did you invest in Person 2?",
    "discover": "Did you discover?",
    "declare": "Did you declare?",
}

DEFAULT_VAULT_DIR = Path.home() / "AlphaOS-Vault"
BRIDGE_URL = os.environ.get("AOS_BRIDGE_URL", "http://127.0.0.1:8080").rstrip("/")
TZ = ZoneInfo(os.environ.get("AOS_TZ", "Europe/Vienna"))
CORE4CTL = Path(os.environ.get("AOS_CORE4CTL", str(Path(__file__).resolve().parent / "core4ctl"))).expanduser()
CORE4_JOURNAL_DIR = Path(
    os.environ.get("CORE4_JOURNAL_DIR")
    or os.environ.get("AOS_CORE4_JOURNAL_DIR")
    or (DEFAULT_VAULT_DIR / "Alpha_Journal" / "Entries")
).expanduser()


def _color(text: str, code: str) -> str:
    force = str(os.environ.get("CORE4_COLOR", "1")).strip() == "1"
    if sys.stdout.isatty() or force:
        return f"\033[{code}m{text}\033[0m"
    return text


def _green(text: str) -> str:
    return _color(text, "32")


def _yellow(text: str) -> str:
    return _color(text, "33")


def _cyan(text: str) -> str:
    return _color(text, "36")


def week_key(day: date) -> str:
    iso = day.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def core4_dirs() -> list[Path]:
    """
    Return Core4 directories to consider, in priority order (first = primary write target).

    Defaults reflect the "local + gdrive mount" setup:
      - `AlphaOS-Vault/Core4` (local, rclone-push)
      - `AlphaOS-Vault/Alpha_Core4` (gdrive mount)

    Override with:
      - `AOS_CORE4_DIR` (single dir)
      - `AOS_CORE4_DIRS` (colon-separated list, priority order)
    """
    vault_dir = Path(os.getenv("AOS_VAULT_DIR", DEFAULT_VAULT_DIR)).expanduser()

    dirs_raw = os.getenv("AOS_CORE4_DIRS", "").strip()
    if dirs_raw:
        dirs = [Path(p).expanduser() for p in dirs_raw.split(":") if p.strip()]
        return [d for d in dirs if str(d).strip()]

    single = os.getenv("AOS_CORE4_DIR", "").strip()
    if single:
        return [Path(single).expanduser()]

    return [vault_dir / "Core4", vault_dir / "Alpha_Core4"]


def primary_core4_dir() -> Path:
    return core4_dirs()[0]


def core4_week_path(day: date) -> Path:
    # Derived artifact written locally; pushed to GDrive via rclone (Core4 -> Alpha_Core4).
    return primary_core4_dir() / f"core4_week_{week_key(day)}.json"


def core4_day_path(day: date) -> Path:
    # Derived artifact written locally; pushed to GDrive via rclone.
    return primary_core4_dir() / f"core4_day_{day.isoformat()}.json"


def core4_event_dir(base_dir: Path) -> Path:
    # Append-only event ledger; safe with multiple writers + sync lag.
    return base_dir / ".core4" / "events"


def _safe_filename(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", str(value or "").strip())
    return cleaned or "x"


def core4_scores_csv_path() -> Path:
    return primary_core4_dir() / "core4_scores.csv"

def core4_daily_csv_path() -> Path:
    return primary_core4_dir() / "core4_daily.csv"

def core4_monthly_csv_path(month: str) -> Path:
    # e.g. core4_2026-01.csv (daily rows for the month)
    return primary_core4_dir() / f"core4_{month}.csv"


def core4_sealed_dir() -> Path:
    return primary_core4_dir() / ".core4" / "sealed"

def core4_sealed_months_dir() -> Path:
    return primary_core4_dir() / ".core4" / "sealed-months"


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


def export_daily_csv(*, days: int = 56) -> Path:
    """Regenerate `core4_daily.csv` for the last N days (default: 8 weeks)."""
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


def prune_events(*, keep_weeks: int = 8) -> Dict[str, Any]:
    """
    Remove local event files older than `keep_weeks` to limit growth.
    Only touches the *local* ledger under `~/AlphaOS-Vault/Core4/.python-core4/events`.
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


def _week_fallback(day: date) -> Dict[str, Any]:
    return {"week": week_key(day), "updated_at": "", "entries": [], "totals": {}}


def _day_fallback(day: date) -> Dict[str, Any]:
    return {"date": day.isoformat(), "week": week_key(day), "updated_at": "", "entries": [], "totals": {}}


def _load_json_file(path: Path, fallback: Dict[str, Any]) -> Dict[str, Any]:
    if not path.exists():
        return dict(fallback)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else dict(fallback)
    except Exception:
        return dict(fallback)


def _parse_ts_for_merge(value: Any) -> float:
    if value is None:
        return 0.0
    text = str(value).strip()
    if not text:
        return 0.0
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def _merge_entry(existing: Dict[str, Any], incoming: Dict[str, Any]) -> Dict[str, Any]:
    ex_done = bool(existing.get("done", True))
    in_done = bool(incoming.get("done", True))
    ex_ts = max(_parse_ts_for_merge(existing.get("last_ts")), _parse_ts_for_merge(existing.get("ts")))
    in_ts = max(_parse_ts_for_merge(incoming.get("last_ts")), _parse_ts_for_merge(incoming.get("ts")))

    winner = incoming
    if in_done != ex_done:
        winner = existing if ex_done else incoming
    elif ex_ts != in_ts:
        winner = existing if ex_ts > in_ts else incoming

    merged = dict(winner)
    try:
        merged["sources"] = sorted(
            {str(s) for s in (existing.get("sources") or []) + (incoming.get("sources") or []) if str(s).strip()}
        )
    except Exception:
        pass
    if "source" not in merged and (existing.get("source") or incoming.get("source")):
        merged["source"] = existing.get("source") or incoming.get("source")
    merged["points"] = max(_safe_float(existing.get("points"), 0.0), _safe_float(incoming.get("points"), 0.0))
    merged["done"] = ex_done or in_done
    merged["last_ts"] = incoming.get("last_ts") or existing.get("last_ts") or incoming.get("ts") or existing.get("ts")
    merged["ts"] = incoming.get("ts") or existing.get("ts")
    return merged


def load_week(day: date) -> Dict[str, Any]:
    # Weekly JSON is a derived artifact. Rebuild it from event ledger to avoid cross-writer conflicts.
    return build_week(day, write=True)


def _event_key_from_entry(entry: Dict[str, Any]) -> str:
    key = str(entry.get("key") or "").strip()
    if key:
        return key
    date_key = str(entry.get("date") or "").strip()
    domain = str(entry.get("domain") or "").strip().lower()
    task = str(entry.get("task") or "").strip().lower()
    if date_key and domain and task:
        return f"{date_key}:{domain}:{task}"
    return ""


def _read_event_file(path: Path) -> Optional[Dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    if not isinstance(data, dict):
        return None
    key = _event_key_from_entry(data)
    if key:
        data["key"] = key
    return data


def _legacy_week_paths(day: date) -> list[Path]:
    name = f"core4_week_{week_key(day)}.json"
    return [base / name for base in core4_dirs()]


def _any_events_for_week(day: date) -> bool:
    start = day - timedelta(days=day.isoweekday() - 1)
    for base in core4_dirs():
        ev_dir = core4_event_dir(base)
        for i in range(7):
            d = start + timedelta(days=i)
            if (ev_dir / d.isoformat()).exists():
                try:
                    if any((ev_dir / d.isoformat()).glob("*.json")):
                        return True
                except Exception:
                    continue
    return False


def migrate_week_from_legacy(day: date) -> int:
    """
    One-time migration: if we have legacy weekly JSON but no event ledger yet,
    convert entries into append-only event files in the *primary* Core4 folder.
    """
    if _any_events_for_week(day):
        return 0

    merged_by_key: Dict[str, Dict[str, Any]] = {}
    for path in _legacy_week_paths(day):
        data = _load_json_file(path, _week_fallback(day))
        entries = data.get("entries") or []
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            key = _event_key_from_entry(entry)
            if not key:
                continue
            entry["key"] = key
            if key in merged_by_key:
                merged_by_key[key] = _merge_entry(merged_by_key[key], entry)
            else:
                merged_by_key[key] = dict(entry)

    if not merged_by_key:
        return 0

    written = 0
    base = primary_core4_dir()
    for entry in merged_by_key.values():
        date_key = str(entry.get("date") or "").strip()
        domain = str(entry.get("domain") or "").strip().lower()
        task = str(entry.get("task") or "").strip().lower()
        if not date_key or not domain or not task:
            continue
        ts = str(entry.get("last_ts") or entry.get("ts") or "").strip()
        if not ts:
            try:
                d = datetime.strptime(date_key, "%Y-%m-%d").date()
                ts = datetime.combine(d, time(12, 0, 0), tzinfo=TZ).astimezone(timezone.utc).isoformat()
            except Exception:
                ts = datetime.now(timezone.utc).isoformat()
        src = str(entry.get("source") or "legacy_import")
        event = {
            "id": str(uuid.uuid4()),
            "key": entry.get("key"),
            "ts": ts,
            "last_ts": ts,
            "date": date_key,
            "week": week_key(datetime.strptime(date_key, "%Y-%m-%d").date()),
            "domain": domain,
            "task": task,
            "done": bool(entry.get("done", True)),
            "points": _safe_float(entry.get("points"), 0.5),
            "source": src,
            "sources": list({src, *[str(s) for s in (entry.get("sources") or []) if str(s).strip()]}),
            "user": entry.get("user") if isinstance(entry.get("user"), dict) else {},
        }

        day_dir = core4_event_dir(base) / date_key
        day_dir.mkdir(parents=True, exist_ok=True)
        name = f"{date_key}__{_safe_filename(domain)}__{_safe_filename(task)}__{_safe_filename(ts.replace(':','').replace('-',''))}__legacy.json"
        (day_dir / name).write_text(json.dumps(event, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        written += 1

    return written


def list_events_for_day(day: date) -> list[Dict[str, Any]]:
    migrate_week_from_legacy(day)
    date_key = day.isoformat()
    events: list[Dict[str, Any]] = []
    for base in core4_dirs():
        day_dir = core4_event_dir(base) / date_key
        if not day_dir.exists():
            continue
        try:
            paths = sorted(p for p in day_dir.glob("*.json") if p.is_file())
        except Exception:
            continue
        for path in paths:
            ev = _read_event_file(path)
            if not ev:
                continue
            if str(ev.get("date") or "").strip() != date_key:
                # tolerate mismatches but ignore for the day view
                continue
            events.append(ev)
    return events


def build_day(day: date, *, write: bool) -> Dict[str, Any]:
    events = list_events_for_day(day)
    by_key: Dict[str, Dict[str, Any]] = {}
    for ev in events:
        key = _event_key_from_entry(ev)
        if not key:
            continue
        if key in by_key:
            by_key[key] = _merge_entry(by_key[key], ev)
        else:
            by_key[key] = dict(ev)
    data = _day_fallback(day)
    data["entries"] = list(by_key.values())
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    data["totals"] = _core4_compute_totals(data["entries"])
    if write:
        path = core4_day_path(day)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return data


def build_week(day: date, *, write: bool) -> Dict[str, Any]:
    wk = week_key(day)
    start = day - timedelta(days=day.isoweekday() - 1)
    by_key: Dict[str, Dict[str, Any]] = {}
    for i in range(7):
        d = start + timedelta(days=i)
        for ev in list_events_for_day(d):
            key = _event_key_from_entry(ev)
            if not key:
                continue
            if key in by_key:
                by_key[key] = _merge_entry(by_key[key], ev)
            else:
                by_key[key] = dict(ev)
    data = _week_fallback(day)
    data["week"] = wk
    data["entries"] = list(by_key.values())
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    data["totals"] = _core4_compute_totals(data["entries"])
    if write:
        path = core4_week_path(day)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return data


def normalize_habit(raw: str) -> str:
    v = str(raw or "").strip().lower()
    v = HABIT_ALIASES.get(v, v)
    if v not in VALID_HABITS:
        raise ValueError(f"unknown habit: {raw}")
    return v


def parse_day(value: Optional[str]) -> date:
    if not value:
        return date.today()
    v = value.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
        return datetime.strptime(v, "%Y-%m-%d").date()
    if re.fullmatch(r"-\d+d", v):
        n = int(v[1:-1])
        return date.today() - timedelta(days=n)
    raise ValueError(f"invalid date: {value}")


@dataclass(frozen=True)
class Target:
    habit: str
    domain: str
    day: date

    @property
    def date_key(self) -> str:
        return self.day.isoformat()

    @property
    def entry_key(self) -> str:
        return f"{self.date_key}:{self.domain}:{self.habit}"

    @property
    def date_tag(self) -> str:
        return f"core4_{self.day.strftime('%Y%m%d')}"

    @property
    def tw_habit_primary_tag(self) -> str:
        # TickTick sync script uses partner/posterity (not person1/person2).
        if self.habit == "person1":
            return "partner"
        if self.habit == "person2":
            return "posterity"
        return self.habit

    @property
    def tw_habit_tags(self) -> list[str]:
        # Keep both canonical + legacy tags for compatibility across scripts.
        if self.habit == "person1":
            return ["partner", "person1"]
        if self.habit == "person2":
            return ["posterity", "person2"]
        return [self.habit]


def bridge_core4_log(target: Target, *, source: str = "tracker") -> None:
    # Midday UTC avoids timezone edge cases; week/day derived from date.
    ts = datetime.combine(target.day, time(12, 0, 0), tzinfo=TZ).astimezone(timezone.utc).isoformat()

    # 1) Try Bridge API (if running)
    url = f"{BRIDGE_URL}/bridge/core4/log"
    payload = {"domain": target.domain, "task": target.habit, "done": True, "points": 0.5, "ts": ts, "source": source}
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with request.urlopen(req, timeout=2) as resp:
            resp.read()
        return
    except (URLError, HTTPError):
        # 2) Fallback: write directly to the local event ledger + rebuild aggregates
        local_core4_log(target, ts=ts, source=source)


def _core4_compute_totals(entries: list[Dict[str, Any]]) -> Dict[str, Any]:
    totals: Dict[str, Any] = {"week_total": 0.0, "by_domain": {}, "by_day": {}, "by_habit": {}}
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        if entry.get("done") is False:
            continue
        points = _safe_float(entry.get("points", 0), 0.0)
        totals["week_total"] += points
        domain = entry.get("domain")
        task = entry.get("task")
        date_key = entry.get("date")
        if domain:
            totals["by_domain"][domain] = totals["by_domain"].get(domain, 0.0) + points
        if date_key:
            totals["by_day"][date_key] = totals["by_day"].get(date_key, 0.0) + points
        if domain and task:
            key = f"{domain}:{task}"
            totals["by_habit"][key] = totals["by_habit"].get(key, 0.0) + points
    return totals


def local_core4_log(target: Target, *, ts: str, source: str) -> None:
    key = target.entry_key
    event = {
        "id": str(uuid.uuid4()),
        "key": key,
        "ts": ts,
        "last_ts": ts,
        "date": target.date_key,
        "week": week_key(target.day),
        "domain": target.domain,
        "task": target.habit,
        "done": True,
        "points": 0.5,
        "source": source,
        "sources": [source],
        "user": {},
    }

    base = primary_core4_dir()
    day_dir = core4_event_dir(base) / target.date_key
    day_dir.mkdir(parents=True, exist_ok=True)

    ts_safe = _safe_filename(ts.replace(":", "").replace("-", ""))
    src_safe = _safe_filename(source)
    habit_safe = _safe_filename(target.habit)
    domain_safe = _safe_filename(target.domain)
    name = f"{target.date_key}__{domain_safe}__{habit_safe}__{ts_safe}__{src_safe}.json"
    (day_dir / name).write_text(json.dumps(event, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # Rebuild derived artifacts locally so rclone push can sync them.
    build_day(target.day, write=True)
    build_week(target.day, write=True)


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


def resolve_target(habit_raw: str, day_raw: Optional[str]) -> Target:
    habit = normalize_habit(habit_raw)
    domain = HABIT_TO_DOMAIN.get(habit, "")
    if not domain:
        raise ValueError(f"cannot infer domain for habit: {habit}")
    day = parse_day(day_raw)
    return Target(habit=habit, domain=domain, day=day)


def is_already_logged(target: Target) -> bool:
    data = load_week(target.day)
    entries = data.get("entries") or []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        key = str(entry.get("key") or "").strip()
        if not key:
            date_key = str(entry.get("date") or "").strip()
            domain = str(entry.get("domain") or "").strip().lower()
            task = str(entry.get("task") or "").strip().lower()
            if date_key and domain and task:
                key = f"{date_key}:{domain}:{task}"
        if key != target.entry_key:
            continue
        if bool(entry.get("done", True)) and float(entry.get("points") or 0.0) >= 0.5:
            return True
    return False


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


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


def _display_habit(habit: str) -> str:
    return DISPLAY_HABIT.get(habit, habit)


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


def replay_from_taskwarrior(day: date, *, scope: str) -> int:
    """Replay completed Core4 tasks into Bridge weekly JSON for a day or week."""
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
    day_raw: Optional[str] = None
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

    # Ensure a day artifact exists for the requested date.
    try:
        build_day(day, write=True)
    except Exception:
        pass

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
    habit_display = _display_habit(target.habit)
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


def try_ticktick_push() -> None:
    ticktick = "/home/alpha/aos-hub/python-ticktick/ticktick_sync.py"
    if not os.path.exists(ticktick):
        return
    token_available = bool(os.getenv("TICKTICK_TOKEN") or os.path.exists(os.path.expanduser("~/.ticktick_token")))
    if not token_available:
        return
    subprocess.run([ticktick, "--push"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def run_core4ctl(*args: str) -> bool:
    if not CORE4CTL.exists():
        print(f"core4: core4ctl not found: {CORE4CTL}", file=sys.stderr)
        return False
    res = subprocess.run([str(CORE4CTL), *args], check=False)
    return res.returncode == 0


def safe_slug(text: str) -> str:
    slug = re.sub(r"^[\\/]+", "", str(text or "").strip().lower())
    slug = slug.replace("'", "").replace('"', "")
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"[^a-z0-9_-]", "", slug)
    return slug


def journal_entry_path(subtask: str) -> Path:
    date_key = date.today().isoformat()
    base = safe_slug(subtask or "journal") or "journal"
    filename = f"{base}-{date_key}.md"
    full = CORE4_JOURNAL_DIR / filename
    if full.exists():
        stamp = datetime.now().isoformat().replace(":", "-").replace(".", "-").replace("T", "_").replace("Z", "")
        filename = f"{base}-{date_key}-{stamp}.md"
        full = CORE4_JOURNAL_DIR / filename
    return full


def open_core4_journal(subtask: str, *, task_label: str, task_uuid: str = "") -> None:
    if not (sys.stdin.isatty() and sys.stdout.isatty()):
        return
    CORE4_JOURNAL_DIR.mkdir(parents=True, exist_ok=True)
    path = journal_entry_path(subtask)
    now = datetime.now(tz=TZ).isoformat()
    tags = ["core4", subtask]
    fm = [
        "---",
        "title: Core4 Journal",
        f"created: {now}",
    ]
    if task_uuid:
        fm.append(f"task_uuid: {task_uuid}")
    fm.append(f"task: {task_label or subtask or 'core4'}")
    fm.append("tags:")
    fm.extend([f"  - {tag}" for tag in tags if tag])
    fm.append("---")
    fm.append("")
    if not path.exists():
        path.write_text("\n".join(fm), encoding="utf-8")
    if task_uuid:
        annotate_taskopen(task_uuid, path)
    editor = os.environ.get("EDITOR") or "nano"
    subprocess.run([editor, str(path)], check=False)


def get_task_uuid(target: "Target") -> str:
    try:
        uuid = find_completed_uuid(target)
        if uuid:
            return uuid
        uuid = find_pending_uuid(target)
        if uuid:
            return uuid
    except Exception:
        return ""
    return ""


def annotate_taskopen(task_uuid: str, path: Path) -> None:
    try:
        info = run_task([task_uuid, "info"], capture=True)
    except Exception:
        return
    if info.returncode == 0 and f"file://{path}" in (info.stdout or ""):
        return
    try:
        run_task([task_uuid, "annotate", f"file://{path}"], capture=True)
    except Exception:
        return


def _latest_event_day(base_dir: Path) -> str:
    ev_root = core4_event_dir(base_dir)
    if not ev_root.exists():
        return ""
    days = sorted([p.name for p in ev_root.iterdir() if p.is_dir()])
    return days[-1] if days else ""


def _latest_week_file(base_dir: Path) -> str:
    pattern = "core4_week_"
    files = sorted([p.name for p in base_dir.glob(f"{pattern}*.json") if p.is_file()])
    return files[-1] if files else ""


def show_sources() -> int:
    dirs = core4_dirs()
    if not dirs:
        print("core4 sources: none")
        return 0
    print("core4 sources:")
    for base in dirs:
        base = base.expanduser()
        ev_root = core4_event_dir(base)
        latest_day = _latest_event_day(base)
        latest_week = _latest_week_file(base)
        exists = base.exists()
        events_ok = ev_root.exists()
        print(f"- {base}")
        print(f"  exists: {_green('yes') if exists else _yellow('no')}")
        print(f"  events: {str(ev_root) if events_ok else _yellow('missing')}")
        print(f"  latest_day: {_green(latest_day) if latest_day else _yellow('n/a')}")
        print(f"  latest_week: {_green(latest_week) if latest_week else _yellow('n/a')}")
    return 0


def _have_cmd(name: str) -> bool:
    return subprocess.call(["which", name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0


def prompt_habit_menu(options: list[str], done: set[str]) -> Optional[str]:
    if not (sys.stdin.isatty() and sys.stdout.isatty()):
        return None

    labels = []
    for idx, opt in enumerate(options, start=1):
        mark = "[x]" if opt in done else "[ ]"
        labels.append(f"{idx}.{mark}{opt}")

    row1 = "  ".join(labels[:4])
    row2 = "  ".join(labels[4:])
    print(row1)
    print(row2)

    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setcbreak(fd)
        print("Select 1-8 (q to cancel): ", end="", flush=True)
        while True:
            ch = sys.stdin.read(1)
            if not ch:
                return None
            if ch in ("q", "Q"):
                print("")
                return None
            if ch.isdigit():
                choice = int(ch)
                if 1 <= choice <= len(options):
                    opt = options[choice - 1]
                    if opt in done:
                        print("")
                        return None
                    print("")
                    return opt
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)


def fzf_pick_habit(options: list[str], done: set[str]) -> Optional[tuple[str, str]]:
    if not (_have_cmd("fzf") and sys.stdin.isatty() and sys.stdout.isatty()):
        return None
    labels = []
    for opt in options:
        mark = "✓" if opt in done else " "
        labels.append(f"[{mark}] {opt}")
    res = subprocess.run(
        [
            "fzf",
            "--prompt",
            "Core4 log> ",
            "--height",
            "40%",
            "--border",
            "--no-multi",
            "--expect",
            "enter,space",
            "--bind",
            "space:accept,q:abort,esc:abort",
        ],
        input="\n".join(labels),
        check=False,
        stdout=subprocess.PIPE,
        text=True,
    )
    if res.returncode != 0:
        return None
    lines = (res.stdout or "").splitlines()
    if not lines:
        return None
    key = lines[0] if lines[0] in ("enter", "space") else "enter"
    selection = lines[1] if lines[0] in ("enter", "space") and len(lines) > 1 else lines[0]
    opt = selection.replace("[✓]", "").replace("[ ]", "").strip()
    if not opt or opt not in options or opt in done:
        return None
    action = "done" if key == "space" else "log"
    return opt, action


def run_habit_flow(argv: list[str], finish, *, skip_journal: bool) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "habit",
        help="fitness|fuel|meditation|memoirs|partner|posterity|person1|person2|discover|declare",
    )
    parser.add_argument("rest", nargs="*", help="Optional: done | -1d | YYYY-MM-DD")
    parser.add_argument("--date", dest="date", default=None, help="YYYY-MM-DD")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-taskwarrior", action="store_true", help="Only check JSON, do not write")
    args = parser.parse_args(argv)
    mark_done = "done" in args.rest
    wants_journal = (not mark_done) and (not skip_journal)

    day_raw = args.date
    for tok in args.rest:
        if tok == "done":
            continue
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", tok) or re.fullmatch(r"-\d+d", tok):
            day_raw = tok

    try:
        target = resolve_target(args.habit, day_raw)
    except Exception as exc:
        print(f"core4: {exc}", file=sys.stderr)
        return finish(2)

    def maybe_open_journal() -> None:
        if not wants_journal:
            return
        subtask = _display_habit(target.habit)
        task_label = _display_habit(target.habit)
        task_uuid = get_task_uuid(target)
        open_core4_journal(subtask, task_label=task_label, task_uuid=task_uuid)

    if args.dry_run:
        print(
            f"core4 target: habit={target.habit} domain={target.domain} date={target.date_key} week={week_key(target.day)} key={target.entry_key}"
        )
        return finish(0)

    if is_already_logged(target):
        print(_green(f"✓ core4 {target.habit} ({target.date_key}) already logged (json)"))
        maybe_open_journal()
        return finish(0)

    if args.no_taskwarrior:
        print(_yellow(f"! core4 {target.habit} ({target.date_key}) not in json (no write)"))
        maybe_open_journal()
        return finish(1)

    # Fail-safe: if TW already contains the completion, just replay into JSON.
    if tw_has_completed(target):
        try:
            bridge_core4_log(target, source="tracker_replay")
            try_ticktick_push()
            if is_already_logged(target):
                print(_green(f"✓ core4 {target.habit} ({target.date_key}) already done (replayed json)"))
            else:
                print(_green(f"✓ core4 {target.habit} ({target.date_key}) already done (replay queued)"))
            maybe_open_journal()
            return finish(0)
        except Exception as exc:
            print(f"core4: failed to replay bridge log: {exc}", file=sys.stderr)
            # Fall through to task-based approach.

    try:
        ensure_taskwarrior()
        # Concurrency/idempotency: if a pending task already exists, just complete it.
        pending_uuid = find_pending_uuid(target)
        if pending_uuid:
            task_done(pending_uuid)
            try_ticktick_push()
            if is_already_logged(target):
                print(_green(f"✓ core4 {target.habit} ({target.date_key}) → done existing (json ok)"))
            else:
                print(_green(f"✓ core4 {target.habit} ({target.date_key}) → done existing (json pending)"))
            maybe_open_journal()
            return finish(0)

        # Extra safety: if a completed task exists under the stable tag, replay JSON and exit.
        completed_uuid = find_completed_uuid(target)
        if completed_uuid:
            bridge_core4_log(target, source="tracker_replay_uuid")
            try_ticktick_push()
            print(_green(f"✓ core4 {target.habit} ({target.date_key}) already done (uuid)"))
            maybe_open_journal()
            return finish(0)

        # Create+complete via Taskwarrior so hooks handle Bridge+TickTick.
        task_add(target)
        pending_uuid = find_pending_uuid(target)
        if pending_uuid:
            task_done(pending_uuid)
        try_ticktick_push()
    except Exception as exc:
        print(f"core4: {exc}", file=sys.stderr)
        return finish(1)

    # Best-effort verification: if hooks/bridge are fast, JSON should now contain it.
    if is_already_logged(target):
        print(_green(f"✓ core4 {target.habit} ({target.date_key}) → created+done (json ok)"))
        maybe_open_journal()
        return finish(0)
    print(_green(f"✓ core4 {target.habit} ({target.date_key}) → created+done (json pending)"))
    maybe_open_journal()
    return finish(0)


def prompt_action_menu() -> Optional[str]:
    options = [
        "Log habit",
        "Score today",
        "Score week",
        "Sync (pull+push)",
        "Pull (Core4 only)",
        "Push (Core4 only)",
        "Sources",
        "Build day/week",
        "Export daily CSV",
        "Prune events",
        "Finalize month",
        "Exit",
    ]
    if _have_cmd("fzf") and sys.stdin.isatty() and sys.stdout.isatty():
        res = subprocess.run(
            ["fzf", "--prompt", "Core4 menu> ", "--height", "40%", "--border"],
            input="\n".join(options),
            check=False,
            stdout=subprocess.PIPE,
            text=True,
        )
        choice = (res.stdout or "").strip()
        return choice or None
    if _have_cmd("gum") and sys.stdin.isatty() and sys.stdout.isatty():
        res = subprocess.run(
            ["gum", "choose", "--header", "Core4 menu", "--height", "12", *options],
            check=False,
            stdout=subprocess.PIPE,
            text=True,
        )
        choice = (res.stdout or "").strip()
        return choice or None
    return None




def main(argv: list[str]) -> int:
    argv = list(argv)
    skip_journal = False
    sync_pull = "--pull" in argv or "--sync" in argv
    sync_push = "--push" in argv or "--sync" in argv
    if sync_pull or sync_push:
        argv = [tok for tok in argv if tok not in ("--pull", "--push", "--sync")]
        if sync_pull:
            if not run_core4ctl("pull-core4"):
                return 1

    def finish(code: int) -> int:
        if sync_push:
            if not run_core4ctl("sync-core4"):
                return 1 if code == 0 else code
        return code

    if argv and argv[0] in ("-h", "--help"):
        print(
            "Core4 (tracker)\n"
            "\n"
            "Log a habit (defaults to today):\n"
            "  core4 fitness\n"
            "  core4 fitness -1d\n"
            "  core4 fitness done -1d\n"
            "  core4 fitness --sync\n"
            "  core4             # opens menu (gum/fzf)\n"
            "  core4 sources     # show local Core4 sources\n"
            "  core4 menu        # full action menu (fzf/gum)\n"
            "\n"
            "Show score (JSON-backed, with TW replay if behind):\n"
            "  core4 -d            # today\n"
            "  core4 -1d           # yesterday\n"
            "  core4 -w            # this week\n"
            "  core4 -w --date 2026-01-13\n"
            "  core4 -w --quiet    # score only\n"
            "\n"
            "Sync Core4 only (pull before push):\n"
            "  core4 sync\n"
            "  core4 --pull\n"
            "  core4 --push\n"
            "  core4 --sync\n"
        )
        return finish(0)

    if not argv:
        options = [
            "fitness",
            "fuel",
            "meditation",
            "memoirs",
            "partner",
            "posterity",
            "discover",
            "declare",
        ]
        if _have_cmd("fzf"):
            while True:
                day = date.today()
                data = load_week(day)
                done = {habit for _, habit in _day_done_list(data, day)}
                picked = fzf_pick_habit(options, done)
                if not picked:
                    return finish(0)
                habit, action = picked
                if action == "done":
                    run_habit_flow([habit, "done"], finish, skip_journal=True)
                else:
                    run_habit_flow([habit], finish, skip_journal=False)
        day = date.today()
        data = load_week(day)
        done = {habit for _, habit in _day_done_list(data, day)}
        choice = prompt_habit_menu(options, done)
        if not choice:
            return finish(0)
        skip_journal = True
        argv = [choice]

    if argv and argv[0] in ("sources", "source", "debug"):
        return finish(show_sources())

    if argv and argv[0] in ("menu", "actions"):
        choice = prompt_action_menu()
        if not choice or choice == "Exit":
            return finish(0)
        if choice == "Log habit":
            options = [
                "fitness",
                "fuel",
                "meditation",
                "memoirs",
                "partner",
                "posterity",
                "discover",
                "declare",
            ]
            day = date.today()
            data = load_week(day)
            done = {habit for _, habit in _day_done_list(data, day)}
            habit_choice = prompt_habit_menu(options, done)
            if not habit_choice:
                return finish(0)
            argv = [habit_choice]
            skip_journal = True
        elif choice == "Score today":
            return finish(score_mode(["-d"]))
        elif choice == "Score week":
            return finish(score_mode(["-w"]))
        elif choice == "Sync (pull+push)":
            if not run_core4ctl("pull-core4"):
                return 1
            if not run_core4ctl("sync-core4"):
                return 1
            return 0
        elif choice == "Pull (Core4 only)":
            return 0 if run_core4ctl("pull-core4") else 1
        elif choice == "Push (Core4 only)":
            return 0 if run_core4ctl("sync-core4") else 1
        elif choice == "Sources":
            return finish(show_sources())
        elif choice == "Build day/week":
            return 0 if run_core4ctl("build") else 1
        elif choice == "Export daily CSV":
            return 0 if run_core4ctl("export-daily", "--days=56") else 1
        elif choice == "Prune events":
            return 0 if run_core4ctl("prune", "--keep-weeks=8") else 1
        elif choice == "Finalize month":
            month = f"{date.today().year:04d}-{date.today().month:02d}"
            return 0 if run_core4ctl("finalize-month", month) else 1

    if argv and argv[0] in ("sync", "core4sync", "sync-core4"):
        if not run_core4ctl("pull-core4"):
            return 1
        if not run_core4ctl("sync-core4"):
            return 1
        return 0

    if argv and argv[0] in ("finalize-week", "finalize", "seal-week", "seal"):
        week = None
        force = False
        for tok in argv[1:]:
            if tok == "--force":
                force = True
                continue
            if re.fullmatch(r"\d{4}-W\d{2}", tok):
                week = tok
        if not week:
            week = week_key(date.today())
        try:
            res = finalize_week(week, force=force)
        except Exception as exc:
            print(f"core4: finalize failed: {exc}", file=sys.stderr)
            return finish(1)
        if res.get("skipped"):
            print(f"Core4 {week}: already sealed (csv unchanged)")
        else:
            print(f"Core4 {week}: sealed -> {res.get('csv')}")
        return finish(0)

    if argv and argv[0] in ("finalize-month", "seal-month", "month-close"):
        month = None
        force = False
        for tok in argv[1:]:
            if tok == "--force":
                force = True
                continue
            if re.fullmatch(r"\d{4}-\d{2}", tok):
                month = tok
        if not month:
            today = date.today()
            month = f"{today.year:04d}-{today.month:02d}"
        try:
            res = finalize_month(month, force=force)
        except Exception as exc:
            print(f"core4: finalize-month failed: {exc}", file=sys.stderr)
            return finish(1)
        if res.get("skipped"):
            print(f"Core4 {month}: already sealed (csv unchanged)")
        else:
            print(f"Core4 {month}: sealed -> {res.get('csv')}")
        return finish(0)

    if argv and argv[0] in ("export-daily", "daily-csv"):
        days = 56
        for tok in argv[1:]:
            if tok.startswith("--days="):
                try:
                    days = int(tok.split("=", 1)[1])
                except Exception:
                    pass
        try:
            path = export_daily_csv(days=days)
        except Exception as exc:
            print(f"core4: export-daily failed: {exc}", file=sys.stderr)
            return finish(1)
        print(str(path))
        return finish(0)

    if argv and argv[0] in ("prune", "prune-events"):
        keep_weeks = 8
        for tok in argv[1:]:
            if tok.startswith("--keep-weeks="):
                try:
                    keep_weeks = int(tok.split("=", 1)[1])
                except Exception:
                    pass
        res = prune_events(keep_weeks=keep_weeks)
        print(json.dumps(res, ensure_ascii=False))
        return finish(0)

    # Score shortcuts:
    # - `core4 -w` (week total)
    # - `core4 -d` (day total, default today)
    # - `core4 -1d` (day total yesterday)
    if not argv:
        return finish(score_mode(["-d"]))
    if argv[0].startswith("-") and argv[0] not in ("--date", "--dry-run", "--no-taskwarrior"):
        return finish(score_mode(argv))
    return run_habit_flow(argv, finish, skip_journal=skip_journal)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
