"""
core4_ledger.py — Event ledger read/write, build_day/week, bridge logging.
Depends on: core4_types, core4_paths, core4_ui
"""

from __future__ import annotations

import json
import uuid
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from urllib import request
from urllib.error import URLError, HTTPError

from core4_types import (
    BRIDGE_URL,
    TZ,
    Target,
    week_key,
)
from core4_paths import (
    core4_dirs,
    core4_day_path,
    core4_event_dir,
    core4_week_path,
    primary_core4_dir,
    _safe_filename,
)


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


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


def _week_fallback(day: date) -> Dict[str, Any]:
    return {"week": week_key(day), "updated_at": "", "entries": [], "totals": {}}


def _day_fallback(day: date) -> Dict[str, Any]:
    return {"date": day.isoformat(), "week": week_key(day), "updated_at": "", "entries": [], "totals": {}}


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


def load_week(day: date) -> Dict[str, Any]:
    """Return a computed week view from the event ledger (read-only)."""
    return build_week(day, write=False)


def load_day(day: date) -> Dict[str, Any]:
    """Return a computed day view from the event ledger (read-only)."""
    return build_day(day, write=False)


def is_already_logged(target: Target) -> bool:
    # Cheap path: check day events only (truth = ledger).
    for ev in list_events_for_day(target.day):
        if not isinstance(ev, dict):
            continue
        if _event_key_from_entry(ev) != target.entry_key:
            continue
        if bool(ev.get("done", True)) and float(ev.get("points") or 0.0) >= 0.5:
            return True
    return False


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
