#!/usr/bin/env python3
import argparse
import asyncio
import csv
import json
import logging
import math
import os
import re
import shutil
import shlex
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo

from aiohttp import web
import aiohttp

LOGGER = logging.getLogger("aos-bridge")

DEFAULT_TZ = os.getenv("AOS_TZ", "Europe/Vienna")
TZ = ZoneInfo(DEFAULT_TZ)

VAULT_DIR = Path(os.getenv("AOS_VAULT_DIR", Path.home() / "AlphaOS-Vault")).expanduser()
# Core4 storage model:
# - Append-only event ledger lives under `.core4/events/<YYYY-MM-DD>/...json`
# - Derived artifacts live in the Core4 root (rclone push copies Core4 -> Alpha_Core4)
CORE4_LOCAL_DIR = Path(os.getenv("AOS_CORE4_LOCAL_DIR", VAULT_DIR / "Core4")).expanduser()
CORE4_MOUNT_DIR = Path(os.getenv("AOS_CORE4_MOUNT_DIR", VAULT_DIR / "Alpha_Core4")).expanduser()
FRUITS_DIR = Path(os.getenv("AOS_FRUITS_DIR", VAULT_DIR / "Alpha_Fruits")).expanduser()
TENT_DIR = Path(os.getenv("AOS_TENT_DIR", VAULT_DIR / "Alpha_Tent")).expanduser()
WARSTACK_DIR = Path(
    os.getenv("AOS_WARSTACK_DRAFT_DIR", os.getenv("WARSTACK_DATA_DIR", Path.home() / ".local/share/warstack"))
).expanduser()

CORE4_PREFIX = "core4_week_"

GAS_WEBHOOK_URL = os.getenv("AOS_GAS_WEBHOOK_URL", "").strip()
GAS_CHAT_ID = os.getenv("AOS_GAS_CHAT_ID", "").strip()
GAS_USER_ID = os.getenv("AOS_GAS_USER_ID", "").strip()
GAS_MODE = os.getenv("AOS_GAS_MODE", "direct").strip().lower()
FALLBACK_TELE = os.getenv("AOS_BRIDGE_FALLBACK_TELE", "0").strip() == "1"
TELE_BIN = os.getenv("AOS_TELE_BIN", "tele").strip()
BRIDGE_TOKEN = os.getenv("AOS_BRIDGE_TOKEN", "").strip()
BRIDGE_TOKEN_HEADER = os.getenv("AOS_BRIDGE_TOKEN_HEADER", "X-Bridge-Token").strip()
QUEUE_DIR = Path(
    os.getenv("AOS_BRIDGE_QUEUE_DIR", Path.home() / ".cache/alphaos/bridge-queue")
).expanduser()

FIREMAP_BIN = os.getenv("AOS_FIREMAP_BIN", "firemap").strip()
FIREMAP_TRIGGER_ARGS = os.getenv("AOS_FIREMAP_TRIGGER_ARGS", "sync").strip()

FIRE_DAILY_REPORT = os.getenv("AOS_FIRE_DAILY_REPORT", "fired").strip()
FIRE_WEEKLY_REPORT = os.getenv("AOS_FIRE_WEEKLY_REPORT", "firew").strip()
FIRE_DAILY_FALLBACK_FILTER = os.getenv("AOS_FIRE_DAILY_FALLBACK_FILTER", "+fire status:pending").strip()
FIRE_DAILY_SEND = os.getenv("AOS_FIRE_DAILY_SEND", "0").strip() == "1"
FIRE_DAILY_MODE = os.getenv("AOS_FIRE_DAILY_MODE", "firectl").strip().lower()
FIRECTL_BIN = os.getenv(
    "AOS_FIRECTL_BIN", str((Path(__file__).resolve().parents[1] / "scripts" / "firectl"))
).strip()

TASK_BIN = os.getenv("AOS_TASK_BIN", "task").strip()
TASK_EXEC_ENABLED = os.getenv("AOS_TASK_EXECUTE", "0").strip() == "1"
TASK_ID_RE = re.compile(r"created task (\d+)", re.IGNORECASE)
TASK_UUID_RE = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")

core4_lock = asyncio.Lock()
fruits_lock = asyncio.Lock()
queue_lock = asyncio.Lock()
firemap_lock = asyncio.Lock()
fire_daily_lock = asyncio.Lock()


@web.middleware
async def auth_middleware(request: web.Request, handler):
    if not BRIDGE_TOKEN:
        return await handler(request)
    supplied = request.headers.get(BRIDGE_TOKEN_HEADER, "")
    if not supplied:
        supplied = request.query.get("token", "")
    if supplied != BRIDGE_TOKEN:
        return web.json_response({"ok": False, "error": "unauthorized"}, status=401)
    return await handler(request)

async def _read_json(request: web.Request) -> Dict[str, Any]:
    try:
        payload = await request.json()
    except Exception:
        raise web.HTTPBadRequest(text=json.dumps({"ok": False, "error": "invalid json"}), content_type="application/json")
    if not isinstance(payload, dict):
        raise web.HTTPBadRequest(
            text=json.dumps({"ok": False, "error": "invalid payload"}), content_type="application/json"
        )
    return payload


def _now() -> datetime:
    return datetime.now(TZ)


def _parse_ts(value: Optional[str]) -> datetime:
    if value is None:
        return _now()
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), TZ)
    text = str(value).strip()
    if not text:
        return _now()
    if re.fullmatch(r"-?\d+(\.\d+)?", text):
        try:
            return datetime.fromtimestamp(float(text), TZ)
        except Exception:
            return _now()
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).astimezone(TZ)
    except ValueError:
        return _now()


def _week_key(dt: datetime) -> str:
    year, week, _ = dt.isocalendar()
    return f"{year}-W{week:02d}"


def _date_key(dt: datetime) -> str:
    return dt.date().isoformat()


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _load_json(path: Path, fallback: Dict[str, Any]) -> Dict[str, Any]:
    if not path.exists():
        return dict(fallback)
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return dict(fallback)


def _save_json(path: Path, data: Dict[str, Any]) -> None:
    _ensure_dir(path.parent)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def _parse_float(value: Any) -> Optional[float]:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def _safe_float(value: Any, default: float = 0.0) -> float:
    parsed = _parse_float(value)
    return parsed if parsed is not None else default


def _queue_file_name() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return f"{stamp}-{uuid.uuid4().hex}.json"


def _enqueue_payload(payload: Dict[str, Any], chat_id: int, user_id: int) -> None:
    _ensure_dir(QUEUE_DIR)
    entry = {
        "queued_at": _now().isoformat(),
        "chat_id": chat_id,
        "user_id": user_id,
        "payload": payload,
    }
    path = QUEUE_DIR / _queue_file_name()
    _save_json(path, entry)


def _list_queue_files() -> list[Path]:
    if not QUEUE_DIR.exists():
        return []
    return sorted(p for p in QUEUE_DIR.glob("*.json") if p.is_file())


async def _send_tele(payload: Dict[str, Any]) -> None:
    if not FALLBACK_TELE:
        return
    if not TELE_BIN:
        return
    if not shutil.which(TELE_BIN):
        return
    message = json.dumps(payload, ensure_ascii=False)
    try:
        proc = await asyncio.create_subprocess_exec(
            TELE_BIN,
            message,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(proc.wait(), timeout=5)
    except Exception:
        return


async def _send_tele_text(text: str) -> None:
    if not TELE_BIN:
        return
    if not shutil.which(TELE_BIN):
        return
    msg = str(text or "").strip()
    if not msg:
        return
    try:
        proc = await asyncio.create_subprocess_exec(
            TELE_BIN,
            msg,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(proc.wait(), timeout=10)
    except Exception:
        return


async def _post_to_gas(payload: Dict[str, Any], chat_id: int, user_id: int) -> tuple[bool, str]:
    if not GAS_WEBHOOK_URL:
        return False, "AOS_GAS_WEBHOOK_URL not set"

    if GAS_MODE == "telegram":
        text = json.dumps(payload, ensure_ascii=False)
        update = {
            "message": {
                "message_id": 1,
                "date": int(_now().timestamp()),
                "from": {"id": user_id, "is_bot": False, "first_name": "AlphaOS"},
                "chat": {"id": chat_id, "type": "private"},
                "text": text,
            }
        }
    else:
        update = {"kind": "task_operation", "chat_id": chat_id, "payload": payload}

    try:
        timeout = aiohttp.ClientTimeout(total=6)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(GAS_WEBHOOK_URL, json=update) as resp:
                if resp.status >= 300:
                    body = await resp.text()
                    return False, f"GAS HTTP {resp.status}: {body[:300]}"
    except Exception as exc:
        return False, str(exc)

    return True, ""


async def _post_telegram_update(webhook_url: str, text: str, chat_id: int, user_id: int) -> tuple[bool, str]:
    if not webhook_url:
        return False, "GAS webhook URL missing"
    if not text:
        return False, "message text missing"

    update = {
        "message": {
            "message_id": 1,
            "date": int(_now().timestamp()),
            "from": {"id": user_id, "is_bot": False, "first_name": "AlphaOS"},
            "chat": {"id": chat_id, "type": "private"},
            "text": text,
        }
    }

    try:
        timeout = aiohttp.ClientTimeout(total=6)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(webhook_url, json=update) as resp:
                if resp.status >= 300:
                    body = await resp.text()
                    return False, f"GAS HTTP {resp.status}: {body[:300]}"
    except Exception as exc:
        return False, str(exc)

    return True, ""


async def _flush_queue() -> tuple[int, str]:
    files = _list_queue_files()
    if not files:
        return 0, ""
    sent = 0
    for path in files:
        try:
            entry = _load_json(path, {})
            payload = entry.get("payload") or {}
            chat_id = int(entry.get("chat_id") or 0)
            user_id = int(entry.get("user_id") or chat_id)
            ok, err = await _post_to_gas(payload, chat_id, user_id)
            if not ok:
                return sent, err
            path.unlink(missing_ok=True)
            sent += 1
        except Exception as exc:
            return sent, str(exc)
    return sent, ""


async def handle_queue_flush(_request: web.Request) -> web.Response:
    async with queue_lock:
        sent, err = await _flush_queue()
    if err:
        return web.json_response({"ok": False, "sent": sent, "error": err}, status=502)
    return web.json_response({"ok": True, "sent": sent})


def _safe_name(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", name.strip())
    if not cleaned or cleaned in {".", ".."}:
        return "untitled"
    return cleaned


def _core4_path(week: str) -> Path:
    return CORE4_LOCAL_DIR / f"{CORE4_PREFIX}{week}.json"


def _core4_day_path(day_key: str) -> Path:
    return CORE4_LOCAL_DIR / f"core4_day_{day_key}.json"


def _core4_event_dir(base_dir: Path) -> Path:
    return base_dir / ".core4" / "events"


def _core4_safe_filename(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", str(text or "").strip())
    return cleaned or "x"


def _core4_write_event(event: Dict[str, Any]) -> None:
    day_key = str(event.get("date") or "").strip()
    if not day_key:
        return
    ts = str(event.get("ts") or "").strip()
    src = str(event.get("source") or "bridge").strip()
    domain = str(event.get("domain") or "").strip().lower()
    task = _core4_canon_task(str(event.get("task") or "").strip().lower())

    out_dir = _core4_event_dir(CORE4_LOCAL_DIR) / day_key
    _ensure_dir(out_dir)

    name = "__".join(
        [
            day_key,
            _core4_safe_filename(domain),
            _core4_safe_filename(task),
            _core4_safe_filename(ts.replace(":", "").replace("-", "")),
            _core4_safe_filename(src),
        ]
    )
    path = out_dir / f"{name}.json"
    _save_json(path, event)


def _core4_read_event(path: Path) -> Optional[Dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _core4_events_for_day(day_key: str) -> list[Dict[str, Any]]:
    out: list[Dict[str, Any]] = []
    for base in (CORE4_LOCAL_DIR, CORE4_MOUNT_DIR):
        day_dir = _core4_event_dir(base) / day_key
        if not day_dir.exists():
            continue
        for path in sorted(p for p in day_dir.glob("*.json") if p.is_file()):
            ev = _core4_read_event(path)
            if not ev:
                continue
            if str(ev.get("date") or "").strip() != day_key:
                continue
            out.append(ev)
    return out


def _core4_build_day(day_key: str) -> Dict[str, Any]:
    entries = _core4_events_for_day(day_key)
    entries = _core4_dedup_entries(entries)
    totals = _core4_compute_totals(entries)
    data = {
        "date": day_key,
        "week": _week_key(datetime.fromisoformat(f"{day_key}T12:00:00+00:00").astimezone(TZ)),
        "updated_at": _now().isoformat(),
        "entries": entries,
        "totals": totals,
        "day_total": totals.get("by_day", {}).get(day_key, 0),
    }
    _save_json(_core4_day_path(day_key), data)
    return data


def _core4_build_week_for_date(day: date) -> Dict[str, Any]:
    start = day - timedelta(days=day.isoweekday() - 1)
    events: list[Dict[str, Any]] = []
    for i in range(7):
        d = start + timedelta(days=i)
        events.extend(_core4_events_for_day(d.isoformat()))
    entries = _core4_dedup_entries(events)
    week = f"{day.isocalendar().year}-W{day.isocalendar().week:02d}"
    data = {
        "week": week,
        "updated_at": _now().isoformat(),
        "entries": entries,
        "totals": _core4_compute_totals(entries),
    }
    _save_json(_core4_path(week), data)
    return data


def _core4_week_start(week: str) -> Optional[date]:
    text = str(week or "").strip()
    m = re.fullmatch(r"(\d{4})-W(\d{2})", text)
    if not m:
        return None
    try:
        return date.fromisocalendar(int(m.group(1)), int(m.group(2)), 1)
    except Exception:
        return None


def _core4_scores_csv_path() -> Path:
    return Path(os.getenv("AOS_CORE4_SCORES_CSV", str(CORE4_LOCAL_DIR / "core4_scores.csv"))).expanduser()


def _core4_sealed_dir() -> Path:
    return CORE4_LOCAL_DIR / ".core4" / "sealed"


def _core4_finalize_week(week: str, *, force: bool = False) -> dict[str, Any]:
    start = _core4_week_start(week)
    if not start:
        return {"ok": False, "error": "invalid week"}

    data = _core4_build_week_for_date(start)
    totals = data.get("totals") if isinstance(data.get("totals"), dict) else {}
    by_domain = totals.get("by_domain") if isinstance(totals.get("by_domain"), dict) else {}

    sealed_dir = _core4_sealed_dir()
    _ensure_dir(sealed_dir)
    marker = sealed_dir / f"{week}.json"
    if marker.exists() and not force:
        return {"ok": True, "week": week, "sealed": True, "skipped": True}

    row = {
        "week": week,
        "updated_at": str(data.get("updated_at") or ""),
        "week_total": _safe_float(totals.get("week_total"), 0.0),
        "body": _safe_float(by_domain.get("body"), 0.0),
        "being": _safe_float(by_domain.get("being"), 0.0),
        "balance": _safe_float(by_domain.get("balance"), 0.0),
        "business": _safe_float(by_domain.get("business"), 0.0),
        "entry_count": int(len(data.get("entries") or [])),
    }

    csv_path = _core4_scores_csv_path()
    _ensure_dir(csv_path.parent)
    write_header = (not csv_path.exists()) or csv_path.stat().st_size == 0
    with csv_path.open("a", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(row.keys()))
        if write_header:
            writer.writeheader()
        writer.writerow(row)

    _save_json(marker, {"week": week, "sealed_at": datetime.now(timezone.utc).isoformat(), "row": row})
    return {"ok": True, "week": week, "sealed": True, "skipped": False, "csv": str(csv_path)}


def _core4_canon_task(task: str) -> str:
    value = str(task or "").strip().lower()
    mapping = {
        "partner": "person1",
        "person_1": "person1",
        "person-1": "person1",
        "posterity": "person2",
        "person_2": "person2",
        "person-2": "person2",
        "learn": "discover",
        "action": "declare",
    }
    return mapping.get(value, value)


def _core4_infer_domain(domain: str, task: str) -> str:
    value = str(domain or "").strip().lower()
    if value:
        return value
    habit = _core4_canon_task(task)
    mapping = {
        "fitness": "body",
        "fuel": "body",
        "meditation": "being",
        "memoirs": "being",
        "person1": "balance",
        "person2": "balance",
        "discover": "business",
        "declare": "business",
    }
    return mapping.get(habit, "")


def _core4_entry_key(date_key: str, domain: str, task: str) -> str:
    return f"{date_key}:{domain}:{task}"


def _core4_normalize_entry_sources(entry: Dict[str, Any]) -> list[str]:
    sources = entry.get("sources")
    if isinstance(sources, list):
        out = [str(s) for s in sources if s]
    elif isinstance(sources, str) and sources:
        out = [sources]
    else:
        src = str(entry.get("source") or "").strip()
        out = [src] if src else []
    seen = set()
    normalized = []
    for src in out:
        if src in seen:
            continue
        seen.add(src)
        normalized.append(src)
    return normalized


def _core4_dedup_entries(entries: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
    keep: dict[str, Dict[str, Any]] = {}
    passthrough: list[Dict[str, Any]] = []

    for entry in entries:
        if not isinstance(entry, dict):
            continue
        date_key = str(entry.get("date") or "").strip()
        domain = str(entry.get("domain") or "").strip().lower()
        task = _core4_canon_task(str(entry.get("task") or "").strip().lower())
        key = str(entry.get("key") or "").strip()
        if not key and date_key and domain and task:
            key = _core4_entry_key(date_key, domain, task)
            entry["key"] = key

        if not key:
            passthrough.append(entry)
            continue

        if key not in keep:
            entry["domain"] = domain
            entry["task"] = task
            entry["sources"] = _core4_normalize_entry_sources(entry)
            entry["done"] = bool(entry.get("done", True))
            if "last_ts" not in entry and entry.get("ts"):
                entry["last_ts"] = entry.get("ts")
            keep[key] = entry
            continue

        existing = keep[key]
        existing_sources = _core4_normalize_entry_sources(existing)
        incoming_sources = _core4_normalize_entry_sources(entry)
        merged_sources = existing_sources[:]
        for src in incoming_sources:
            if src not in merged_sources:
                merged_sources.append(src)
        existing["sources"] = merged_sources
        existing["done"] = bool(existing.get("done", True) or entry.get("done", True))

        existing_points = _safe_float(existing.get("points", 0), 0.0)
        incoming_points = _safe_float(entry.get("points", 0), 0.0)
        existing["points"] = max(existing_points, incoming_points)

        existing_ts = _parse_ts(existing.get("last_ts") or existing.get("ts"))
        incoming_ts = _parse_ts(entry.get("ts"))
        if incoming_ts > existing_ts:
            existing["last_ts"] = incoming_ts.isoformat()
            existing["ts"] = incoming_ts.isoformat()
            existing["source"] = str(entry.get("source") or existing.get("source") or "bridge")
            existing["user"] = entry.get("user") or existing.get("user") or {}

    return passthrough + list(keep.values())


def _core4_compute_totals(entries):
    totals = {"week_total": 0, "by_domain": {}, "by_day": {}, "by_habit": {}}
    for entry in entries:
        if entry.get("done") is False:
            continue
        points = _safe_float(entry.get("points", 0), 0.0)
        totals["week_total"] += points
        domain = entry.get("domain")
        task = entry.get("task")
        date = entry.get("date")
        if domain:
            totals["by_domain"][domain] = totals["by_domain"].get(domain, 0) + points
        if date:
            totals["by_day"][date] = totals["by_day"].get(date, 0) + points
        if domain and task:
            key = f"{domain}:{task}"
            totals["by_habit"][key] = totals["by_habit"].get(key, 0) + points
    return totals


def _core4_total_for_date(entries, date_key):
    total = 0
    for entry in entries:
        if entry.get("done") is False:
            continue
        if entry.get("date") == date_key:
            total += _safe_float(entry.get("points", 0), 0.0)
    return total


async def handle_health(_request: web.Request) -> web.Response:
    return web.json_response(
        {
            "ok": True,
            "service": "aos-bridge",
            "time": _now().isoformat(),
            "tz": DEFAULT_TZ,
        }
    )


def _task_export_path() -> Path:
    override = os.getenv("AOS_TASK_EXPORT_PATH", "").strip()
    if override:
        return Path(override).expanduser()
    return (VAULT_DIR / ".alphaos" / "task_export.json").expanduser()


def _extract_task_list(payload: Any) -> list[Dict[str, Any]]:
    if isinstance(payload, list):
        return [t for t in payload if isinstance(t, dict)]
    if not isinstance(payload, dict):
        return []
    for key in ("tasks", "items", "export"):
        val = payload.get(key)
        if isinstance(val, list):
            return [t for t in val if isinstance(t, dict)]
    return []


def _norm_tags(value: Any) -> set[str]:
    if not value:
        return set()
    if isinstance(value, str):
        raw = re.split(r"[,\s]+", value.strip())
    elif isinstance(value, list):
        raw = [str(v) for v in value]
    else:
        raw = [str(value)]
    return {t.strip().lstrip("#+").lower() for t in raw if str(t).strip()}


def _count_pending_with_tag(tasks: list[Dict[str, Any]], tag: str) -> int:
    wanted = str(tag).strip().lstrip("#+").lower()
    count = 0
    for task in tasks:
        status = str(task.get("status") or "").strip().lower()
        if status != "pending":
            continue
        tags = _norm_tags(task.get("tags"))
        if wanted and wanted in tags:
            count += 1
    return count


async def handle_bridge_daily_review_data(_request: web.Request) -> web.Response:
    path = _task_export_path()
    exists = path.exists()
    if not exists:
        return web.json_response(
            {
                "ok": True,
                "sessions": [],
                "tasks": {"fire": 0},
                "task_export": {"path": str(path), "exists": False, "count": 0},
            }
        )

    async def _read_export() -> tuple[dict, int]:
        try:
            raw = await asyncio.to_thread(path.read_text, encoding="utf-8")
        except Exception:
            raw = ""
        if not raw.strip():
            return {}, 0
        try:
            payload = json.loads(raw)
        except Exception:
            return {}, 0
        tasks = _extract_task_list(payload)
        return payload if isinstance(payload, dict) else {"raw": payload}, len(tasks)

    try:
        payload, task_count = await asyncio.wait_for(_read_export(), timeout=2.0)
    except asyncio.TimeoutError:
        return web.json_response(
            {
                "ok": False,
                "error": "task export read timeout",
                "sessions": [],
                "tasks": {"fire": 0},
                "task_export": {"path": str(path), "exists": True, "count": 0},
            },
            status=504,
        )

    tasks = _extract_task_list(payload)
    fire_count = _count_pending_with_tag(tasks, "fire")
    return web.json_response(
        {
            "ok": True,
            "sessions": [],
            "tasks": {"fire": fire_count},
            "task_export": {"path": str(path), "exists": True, "count": task_count},
        }
    )


async def _run_firemap_and_log(cmd: list[str]) -> None:
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        LOGGER.info(
            "firemap trigger finished code=%s stdout=%s stderr=%s",
            proc.returncode,
            stdout.decode("utf-8", errors="ignore")[:500],
            stderr.decode("utf-8", errors="ignore")[:500],
        )
    except Exception as exc:
        LOGGER.warning("firemap trigger failed: %s", exc)


async def handle_bridge_trigger_weekly_firemap(_request: web.Request) -> web.Response:
    cmd = [FIREMAP_BIN, *shlex.split(FIREMAP_TRIGGER_ARGS)] if FIREMAP_BIN else []
    if not cmd or not cmd[0]:
        return web.json_response({"ok": False, "error": "AOS_FIREMAP_BIN missing"}, status=400)

    if not shutil.which(cmd[0]) and not Path(cmd[0]).expanduser().exists():
        return web.json_response({"ok": False, "error": f"firemap binary not found: {cmd[0]}"}, status=404)

    async with firemap_lock:
        asyncio.create_task(_run_firemap_and_log(cmd))
    return web.json_response({"ok": True, "status": "started", "cmd": " ".join(cmd)})


async def _run_task_report(cmd: list[str], timeout_s: float = 10.0) -> dict[str, Any]:
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout_s)
    except asyncio.TimeoutError:
        return {"ok": False, "error": "timeout", "cmd": " ".join(cmd)}
    except Exception as exc:
        return {"ok": False, "error": str(exc), "cmd": " ".join(cmd)}

    out = stdout.decode("utf-8", errors="ignore").strip()
    err = stderr.decode("utf-8", errors="ignore").strip()
    if proc.returncode != 0:
        return {
            "ok": False,
            "error": "nonzero exit",
            "code": proc.returncode,
            "stdout": out,
            "stderr": err,
            "cmd": " ".join(cmd),
        }
    return {"ok": True, "code": 0, "stdout": out, "stderr": err, "cmd": " ".join(cmd)}

def _split_blocks(text: str) -> list[str]:
    raw = str(text or "").strip()
    if not raw:
        return []
    parts = [p.strip() for p in raw.split("\n\n") if p.strip()]
    return parts


async def _run_firectl_print(scope: str, timeout_s: float = 15.0) -> dict[str, Any]:
    scope = str(scope or "").strip().lower()
    if scope not in ("daily", "weekly"):
        return {"ok": False, "error": "invalid scope"}
    if not FIRECTL_BIN:
        return {"ok": False, "error": "AOS_FIRECTL_BIN missing"}
    if not shutil.which(FIRECTL_BIN) and not Path(FIRECTL_BIN).expanduser().exists():
        return {"ok": False, "error": f"firectl binary not found: {FIRECTL_BIN}"}
    cmd = [FIRECTL_BIN, "print", scope]
    return await _run_task_report(cmd, timeout_s=timeout_s)


def _format_fire_daily_message(report: dict[str, Any]) -> str:
    now = _now()
    header = f"🔥 Daily Fire ({now.strftime('%Y-%m-%d')})"
    if not report.get("ok"):
        return header + "\n\nERR: " + str(report.get("error") or "unknown")
    out = str(report.get("stdout") or "").strip()
    if not out:
        return header + "\n\n(no tasks)"
    lines = out.splitlines()
    if len(lines) > 80:
        lines = lines[:80] + ["...", f"(truncated; {len(out.splitlines())} lines total)"]
    return header + "\n\n" + "\n".join(lines)


async def handle_bridge_fire_daily(request: web.Request) -> web.Response:
    send = _truthy(request.query.get("send")) or FIRE_DAILY_SEND
    scope = str(request.query.get("scope") or "").strip().lower()
    try:
        days = int(str(request.query.get("days") or "1").strip())
    except ValueError:
        days = 1
    days = max(1, min(days, 14))

    if scope in ("daily", "today"):
        days = 1
    elif scope in ("weekly", "week"):
        days = max(days, 7)

    async with fire_daily_lock:
        report: dict[str, Any] = {"ok": False, "error": "not configured"}
        messages: list[str] = []

        if FIRE_DAILY_MODE == "firectl":
            ctl_scope = "daily" if days <= 1 else "weekly"
            report = await _run_firectl_print(ctl_scope)
            if report.get("ok"):
                messages = _split_blocks(str(report.get("stdout") or ""))
        elif FIRE_DAILY_MODE == "due_export":
            if not TASK_BIN:
                report = {"ok": False, "error": "AOS_TASK_BIN missing"}
            else:
                if days == 1:
                    due_filter = "due.before:tomorrow"
                else:
                    due_filter = f"due.before:today+{days}days"
                cmd = [TASK_BIN, "+fire", "status:pending", due_filter, "export"]
                report = await _run_task_report(cmd)

                if report.get("ok"):
                    try:
                        report["tasks"] = json.loads(report.get("stdout") or "[]")
                    except Exception:
                        report = {"ok": False, "error": "invalid export json", "cmd": report.get("cmd", "")}
        else:
            report_name = FIRE_DAILY_REPORT if days <= 1 else FIRE_WEEKLY_REPORT
            primary_cmd = [TASK_BIN, report_name] if (TASK_BIN and report_name) else []
            fallback_cmd = (
                [TASK_BIN, *shlex.split(FIRE_DAILY_FALLBACK_FILTER)]
                if (TASK_BIN and FIRE_DAILY_FALLBACK_FILTER)
                else []
            )
            if primary_cmd:
                report = await _run_task_report(primary_cmd)
            if (not report.get("ok")) and fallback_cmd:
                report = await _run_task_report(fallback_cmd)

    if FIRE_DAILY_MODE == "firectl" and report.get("ok"):
        if not messages:
            now = _now()
            title = f"🔥 Fire {'week' if days > 1 else 'today'} — {now.strftime('%Y-%m-%d')}"
            messages = [title + "\n\n(no tasks)"]
        message = "\n\n".join(messages)
    elif FIRE_DAILY_MODE == "due_export" and report.get("ok"):
        now = _now()
        title = f"🔥 Fire due (next {days}d) — {now.strftime('%Y-%m-%d')}"
        tasks = report.get("tasks") if isinstance(report.get("tasks"), list) else []
        lines: list[str] = []
        for task in tasks:
            if not isinstance(task, dict):
                continue
            desc = str(task.get("description") or "").strip()
            due = str(task.get("due") or "").strip().replace("T", " ")[:16]
            proj = str(task.get("project") or "").strip()
            prefix = f"[{due}]" if due else "[due?]"
            if proj:
                lines.append(f"- {prefix} {proj}: {desc}")
            else:
                lines.append(f"- {prefix} {desc}")
        if not lines:
            message = title + "\n\n(no tasks)"
        else:
            if len(lines) > 40:
                lines = lines[:40] + ["- ... (truncated)"]
            message = title + "\n\n" + "\n".join(lines)
    else:
        message = _format_fire_daily_message(report)
        messages = _split_blocks(message) or ([message] if message else [])

    sent = False
    if send:
        for chunk in messages or [message]:
            if not chunk:
                continue
            await _send_tele_text(chunk)
        sent = True

    return web.json_response(
        {
            "ok": bool(report.get("ok")),
            "sent": sent,
            "report": report,
            "message": message,
            "messages": messages,
        },
        status=200 if report.get("ok") else 500,
    )


async def handle_core4_log(request: web.Request) -> web.Response:
    payload = await _read_json(request)
    domain = str(payload.get("domain", "")).strip().lower()
    task = _core4_canon_task(str(payload.get("task", "")).strip().lower())
    domain = _core4_infer_domain(domain, task)
    if not domain or not task:
        return web.json_response({"ok": False, "error": "missing domain or task"}, status=400)

    ts = _parse_ts(payload.get("ts") or payload.get("timestamp"))
    done = bool(payload.get("done", True))
    points = 0.5 if done else 0.0
    week = _week_key(ts)
    date_key = _date_key(ts)
    entry_key = str(payload.get("key") or "").strip() or _core4_entry_key(date_key, domain, task)
    source = str(payload.get("source", "bridge"))
    event = {
        "id": payload.get("id") or str(uuid.uuid4()),
        "key": entry_key,
        "ts": ts.isoformat(),
        "last_ts": ts.isoformat(),
        "date": date_key,
        "week": week,
        "domain": domain,
        "task": task,
        "done": done,
        "points": points,
        "source": source,
        "sources": [source],
        "user": payload.get("user") or {},
    }

    async with core4_lock:
        _core4_write_event(event)
        _core4_build_day(date_key)
        data = _core4_build_week_for_date(ts.date())

    total_today = _core4_total_for_date(data.get("entries") or [], date_key)
    return web.json_response({"ok": True, "week": data.get("week") or week, "total_today": total_today})


async def handle_core4_week(request: web.Request) -> web.Response:
    week = request.query.get("week") or _week_key(_now())
    start = _core4_week_start(week) or _now().date()
    async with core4_lock:
        data = _core4_build_week_for_date(start)
    return web.json_response({"ok": True, "data": data})


async def handle_core4_today(request: web.Request) -> web.Response:
    now = _now()
    week = _week_key(now)
    date_key = _date_key(now)
    async with core4_lock:
        data = _core4_build_week_for_date(now.date())
    total = _core4_total_for_date(data.get("entries") or [], date_key)
    return web.json_response({"ok": True, "week": week, "date": date_key, "total": total})


def _fruits_store_path() -> Path:
    return FRUITS_DIR / "fruits_store.json"


async def handle_fruits_answer(request: web.Request) -> web.Response:
    payload = await _read_json(request)
    question = str(payload.get("question", "")).strip()
    answer = str(payload.get("answer", "")).strip()
    if not question or not answer:
        return web.json_response({"ok": False, "error": "missing question or answer"}, status=400)

    ts = _parse_ts(payload.get("ts") or payload.get("timestamp"))
    event = {
        "id": payload.get("id") or str(uuid.uuid4()),
        "ts": ts.isoformat(),
        "question": question,
        "section": payload.get("section") or "",
        "answer": answer,
        "chat_id": str(payload.get("chat_id") or ""),
        "source": str(payload.get("source") or "bridge"),
    }

    async with fruits_lock:
        path = _fruits_store_path()
        store = _load_json(path, {"updated_at": "", "answers": {}, "events": []})
        store["answers"][question] = {
            "section": event["section"],
            "answer": answer,
            "updated_at": ts.isoformat(),
            "source": event["source"],
            "chat_id": event["chat_id"],
        }
        store["events"].append(event)
        store["updated_at"] = _now().isoformat()
        _save_json(path, store)

    return web.json_response({"ok": True})


async def handle_tent_summary(request: web.Request) -> web.Response:
    payload = await _read_json(request)
    markdown = str(payload.get("markdown", "")).strip()
    if not markdown:
        return web.json_response({"ok": False, "error": "missing markdown"}, status=400)

    week = str(payload.get("week") or _week_key(_now()))
    name = payload.get("name") or f"core4_week_summary_{week}.md"
    file_name = _safe_name(name)
    _ensure_dir(TENT_DIR)
    base_dir = TENT_DIR.resolve()
    path = (base_dir / file_name).resolve()
    if base_dir not in path.parents:
        return web.json_response({"ok": False, "error": "invalid name"}, status=400)
    path.write_text(markdown + "\n", encoding="utf-8")

    # Optional: keep the legacy weekly sealing behavior behind a flag.
    # Default is off because month-close sealing is preferred to avoid late-arrival issues.
    core4_finalized: dict[str, Any] | None = None
    try:
        if os.getenv("AOS_CORE4_FINALIZE_ON_TENT", "0").strip() == "1":
            async with core4_lock:
                core4_finalized = _core4_finalize_week(week)
    except Exception:
        core4_finalized = None

    resp: dict[str, Any] = {"ok": True, "path": str(path)}
    if core4_finalized:
        resp["core4_finalize"] = core4_finalized
    return web.json_response(resp)


async def handle_tent_sync(request: web.Request) -> web.Response:
    """
    POST /bridge/tent/sync
    Fetch Tent data from Index Node and push to GAS
    """
    week = str(request.query.get("week", "")).strip()
    if not week:
        # Auto-detect current week
        now = _now()
        iso = now.isocalendar()
        week = f"{iso[0]}-W{iso[1]:02d}"

    # Fetch from Index Node
    index_url = os.getenv("INDEX_NODE_URL", "http://127.0.0.1:8799")
    tent_url = f"{index_url}/api/tent/component/return-report?week={week}"

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(tent_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    return web.json_response({
                        "ok": False,
                        "error": f"Index Node returned {resp.status}"
                    }, status=502)

                tent_data = await resp.json()

    except asyncio.TimeoutError:
        return web.json_response({
            "ok": False,
            "error": "Index Node timeout"
        }, status=504)
    except Exception as e:
        return web.json_response({
            "ok": False,
            "error": f"Failed to fetch from Index Node: {str(e)}"
        }, status=502)

    # Push to GAS
    gas_webhook = os.getenv("AOS_GAS_TENT_WEBHOOK", GAS_WEBHOOK_URL).strip()
    if not gas_webhook:
        return web.json_response({
            "ok": False,
            "error": "GAS webhook not configured (AOS_GAS_TENT_WEBHOOK or AOS_GAS_WEBHOOK_URL)"
        }, status=500)

    gas_payload = {
        "type": "tent_sync",
        "week": week,
        "data": tent_data
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                gas_webhook,
                json=gas_payload,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                if resp.status != 200:
                    gas_error = await resp.text()
                    return web.json_response({
                        "ok": False,
                        "error": f"GAS returned {resp.status}: {gas_error}"
                    }, status=502)

                gas_response = await resp.json()
                return web.json_response({
                    "ok": True,
                    "week": week,
                    "gas_response": gas_response
                })

    except asyncio.TimeoutError:
        return web.json_response({
            "ok": False,
            "error": "GAS webhook timeout"
        }, status=504)
    except Exception as e:
        return web.json_response({
            "ok": False,
            "error": f"Failed to push to GAS: {str(e)}"
        }, status=502)


async def handle_tent_fetch(request: web.Request) -> web.Response:
    """
    GET /bridge/tent/fetch?week=2026-W04
    Proxy endpoint for GAS to fetch Tent data from Index Node
    Needed because GAS can't reach localhost directly
    """
    week = str(request.query.get("week", "")).strip()
    if not week:
        now = _now()
        iso = now.isocalendar()
        week = f"{iso[0]}-W{iso[1]:02d}"

    index_url = os.getenv("INDEX_NODE_URL", "http://127.0.0.1:8799")
    tent_url = f"{index_url}/api/tent/component/return-report?week={week}"

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(tent_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    return web.json_response({
                        "ok": False,
                        "error": f"Index Node returned {resp.status}"
                    }, status=502)

                tent_data = await resp.json()
                return web.json_response(tent_data)

    except asyncio.TimeoutError:
        return web.json_response({
            "ok": False,
            "error": "Index Node timeout"
        }, status=504)
    except Exception as e:
        return web.json_response({
            "ok": False,
            "error": f"Failed to fetch from Index Node: {str(e)}"
        }, status=502)


async def handle_task_operation(request: web.Request) -> web.Response:
    payload = await _read_json(request)

    chat_id = str(payload.get("chat_id") or GAS_CHAT_ID or GAS_USER_ID or "").strip()
    user_id = str(payload.get("user_id") or GAS_USER_ID or GAS_CHAT_ID or "").strip()
    if not chat_id:
        return web.json_response({"ok": False, "error": "missing chat_id"}, status=400)
    if not user_id:
        user_id = chat_id

    try:
        chat_id_int = int(chat_id)
        user_id_int = int(user_id)
    except ValueError:
        return web.json_response({"ok": False, "error": "invalid chat_id/user_id"}, status=400)

    async with queue_lock:
        _, _ = await _flush_queue()

    ok, err = await _post_to_gas(payload, chat_id_int, user_id_int)
    if ok:
        return web.json_response({"ok": True})

    async with queue_lock:
        _enqueue_payload(payload, chat_id_int, user_id_int)
    await _send_tele(payload)
    return web.json_response({"ok": False, "queued": True, "error": err}, status=202)


async def handle_telegram_send(request: web.Request) -> web.Response:
    payload = await _read_json(request)
    text = str(payload.get("text") or "").strip()
    webhook_url = str(payload.get("webhook_url") or GAS_WEBHOOK_URL or "").strip()

    chat_id = str(payload.get("chat_id") or GAS_CHAT_ID or GAS_USER_ID or "").strip()
    user_id = str(payload.get("user_id") or GAS_USER_ID or GAS_CHAT_ID or "").strip()
    if not text:
        return web.json_response({"ok": False, "error": "missing text"}, status=400)
    if not webhook_url:
        return web.json_response({"ok": False, "error": "missing webhook_url"}, status=400)
    if not chat_id:
        return web.json_response({"ok": False, "error": "missing chat_id"}, status=400)
    if not user_id:
        user_id = chat_id

    try:
        chat_id_int = int(chat_id)
        user_id_int = int(user_id)
    except ValueError:
        return web.json_response({"ok": False, "error": "invalid chat_id/user_id"}, status=400)

    ok, err = await _post_telegram_update(webhook_url, text, chat_id_int, user_id_int)
    if ok:
        return web.json_response({"ok": True})
    return web.json_response({"ok": False, "error": err}, status=502)


def _task_bin_available() -> bool:
    if not TASK_BIN:
        return False
    return shutil.which(TASK_BIN) is not None


async def _run_task_add(task: Dict[str, Any]) -> Dict[str, Any]:
    if not TASK_EXEC_ENABLED:
        return {"ok": False, "error": "task execution disabled"}
    if not _task_bin_available():
        return {"ok": False, "error": f"task binary not found: {TASK_BIN}"}
    description = str(task.get("description") or task.get("title") or "").strip()
    if not description:
        return {"ok": False, "error": "missing description"}

    args = [TASK_BIN, "add", description]
    tags = task.get("tags") or []
    for tag in tags:
        if not tag:
            continue
        args.append(f"+{tag}")
    project = task.get("project")
    if project:
        args.append(f"project:{project}")
    due = task.get("due")
    if due:
        args.append(f"due:{due}")
    priority = task.get("priority")
    if priority:
        args.append(f"priority:{priority}")
    depends = task.get("depends")
    if depends:
        if isinstance(depends, str):
            args.append(f"depends:{depends}")
        elif isinstance(depends, list):
            deps = ",".join([str(d) for d in depends if d])
            if deps:
                args.append(f"depends:{deps}")
    wait = task.get("wait")
    if wait:
        args.append(f"wait:{wait}")

    proc = await asyncio.create_subprocess_exec(
        *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    stdout_text = stdout.decode("utf-8", errors="ignore")
    stderr_text = stderr.decode("utf-8", errors="ignore")
    combined = f"{stdout_text}\n{stderr_text}"
    task_id = None
    task_uuid = None
    match = TASK_UUID_RE.search(combined)
    if match:
        task_uuid = match.group(0)
    match = TASK_ID_RE.search(combined)
    if match:
        task_id = match.group(1)
    if not task_uuid and task_id:
        task_uuid = await _get_task_uuid(task_id)
    return {
        "ok": proc.returncode == 0,
        "code": proc.returncode,
        "stdout": stdout_text,
        "stderr": stderr_text,
        "cmd": " ".join(args),
        "task_id": task_id,
        "task_uuid": task_uuid,
        "description": description,
        "meta": task.get("meta") if isinstance(task, dict) else None,
    }


async def _get_task_uuid(task_id: str) -> Optional[str]:
    if not _task_bin_available():
        return None
    proc = await asyncio.create_subprocess_exec(
        TASK_BIN,
        "_get",
        f"{task_id}.uuid",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        return None
    text = stdout.decode("utf-8", errors="ignore").strip()
    if TASK_UUID_RE.fullmatch(text):
        return text
    match = TASK_UUID_RE.search(text or stderr.decode("utf-8", errors="ignore"))
    if match:
        return match.group(0)
    return None


async def handle_task_execute(request: web.Request) -> web.Response:
    payload = await _read_json(request)
    single = payload.get("task")
    if single:
        tasks = [single]
    else:
        tasks = payload.get("tasks")
        if tasks is None:
            tasks = []
        elif isinstance(tasks, dict):
            tasks = [tasks]
        elif not isinstance(tasks, list):
            return web.json_response({"ok": False, "error": "invalid tasks"}, status=400)
    if not tasks:
        return web.json_response({"ok": False, "error": "missing tasks"}, status=400)

    results = []
    for idx, task in enumerate(tasks):
        if not isinstance(task, dict):
            return web.json_response({"ok": False, "error": f"invalid task at index {idx}"}, status=400)
        results.append(await _run_task_add(task))

    ok = all(r.get("ok") for r in results)
    status = 200 if ok else 502
    return web.json_response({"ok": ok, "results": results}, status=status)


async def _run_task_modify(uuid: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    if not TASK_EXEC_ENABLED:
        return {"ok": False, "error": "task execution disabled"}
    if not _task_bin_available():
        return {"ok": False, "error": f"task binary not found: {TASK_BIN}"}
    if not uuid:
        return {"ok": False, "error": "missing uuid"}

    args = [TASK_BIN, uuid, "modify"]

    # Handle tags (add/remove)
    tags_add = updates.get("tags_add") or []
    for tag in tags_add:
        if tag:
            args.append(f"+{tag}")
    tags_remove = updates.get("tags_remove") or []
    for tag in tags_remove:
        if tag:
            args.append(f"-{tag}")

    # Handle project
    project = updates.get("project")
    if project:
        args.append(f"project:{project}")

    # Handle due
    due = updates.get("due")
    if due:
        args.append(f"due:{due}")

    # Handle wait
    wait = updates.get("wait")
    if wait:
        args.append(f"wait:{wait}")

    # Handle priority
    priority = updates.get("priority")
    if priority:
        args.append(f"priority:{priority}")

    # Handle depends (set or append)
    depends = updates.get("depends")
    if depends:
        if isinstance(depends, str):
            args.append(f"depends:{depends}")
        elif isinstance(depends, list):
            deps = ",".join([str(d) for d in depends if d])
            if deps:
                args.append(f"depends:{deps}")

    # Must have at least one modification
    if len(args) <= 3:
        return {"ok": False, "error": "no modifications specified"}

    proc = await asyncio.create_subprocess_exec(
        *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    stdout_text = stdout.decode("utf-8", errors="ignore")
    stderr_text = stderr.decode("utf-8", errors="ignore")

    return {
        "ok": proc.returncode == 0,
        "code": proc.returncode,
        "stdout": stdout_text,
        "stderr": stderr_text,
        "cmd": " ".join(args),
        "task_uuid": uuid,
    }


async def handle_task_modify(request: web.Request) -> web.Response:
    payload = await _read_json(request)
    uuid = str(payload.get("uuid") or "").strip()
    updates = payload.get("updates")
    if not isinstance(updates, dict):
        return web.json_response({"ok": False, "error": "missing updates"}, status=400)

    result = await _run_task_modify(uuid, updates)
    status = 200 if result.get("ok") else 502
    return web.json_response(result, status=status)


async def handle_warstack_draft(request: web.Request) -> web.Response:
    payload = await _read_json(request)
    action = str(payload.get("action") or "save").strip().lower()
    user_id = payload.get("user_id") or payload.get("chat_id") or payload.get("id")

    try:
        user_id_int = int(str(user_id).strip())
    except Exception:
        return web.json_response({"ok": False, "error": "missing user_id"}, status=400)

    filepath = WARSTACK_DIR / f"warstack_{user_id_int}.json"

    if action == "clear":
        if filepath.exists():
            filepath.unlink()
        return web.json_response({"ok": True, "cleared": True})

    warstack = payload.get("warstack") or {}
    if not isinstance(warstack, dict):
        return web.json_response({"ok": False, "error": "invalid warstack"}, status=400)

    warstack = dict(warstack)
    warstack["user_id"] = user_id_int
    _save_json(filepath, warstack)
    return web.json_response({"ok": True, "path": str(filepath)})


def _rclone_filters() -> list:
    raw = os.getenv("AOS_RCLONE_SUBDIRS", "")
    if not raw:
        return []
    subdirs = [s.strip().strip("/") for s in raw.split(",") if s.strip()]
    if not subdirs:
        return []
    filters = []
    for sub in subdirs:
        filters.extend(["--include", f"{sub}/**"])
    filters.extend(["--exclude", "*"])
    return filters


def _rclone_flags() -> list[str]:
    raw = os.getenv("AOS_RCLONE_FLAGS", "").strip()
    if raw:
        return shlex.split(raw)
    return ["--skip-links", "--create-empty-src-dirs", "--update"]

def _rclone_join(base: str, subpath: str) -> str:
    base = (base or "").strip()
    subpath = (subpath or "").strip().lstrip("/")
    if not base:
        return subpath
    if base.endswith(":"):
        return f"{base}{subpath}"
    return f"{base.rstrip('/')}/{subpath}"


def _parse_rclone_map() -> list[tuple[str, str]]:
    raw = os.getenv("AOS_RCLONE_MAP", "").strip()
    if not raw:
        return []
    pairs: list[tuple[str, str]] = []
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "=" not in chunk:
            continue
        local_key, remote_key = chunk.split("=", 1)
        local_key = local_key.strip().strip("/")
        remote_key = remote_key.strip().strip("/")
        if not local_key or not remote_key:
            continue
        pairs.append((local_key, remote_key))
    return pairs


def _rclone_backup_dir(direction: str) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    if direction == "pull":
        base = os.getenv("AOS_RCLONE_LOCAL_BACKUP", "").strip()
        if base:
            return str(Path(base).expanduser() / f"pull-{stamp}")
        return ""
    base = os.getenv("AOS_RCLONE_REMOTE_BACKUP", "").strip()
    if base:
        return f"{base.rstrip('/')}/push-{stamp}"
    return ""


def _truthy(value: Optional[str]) -> bool:
    if value is None:
        return False
    text = str(value).strip().lower()
    return text in ("1", "true", "yes", "y", "on")


async def _run_rclone(direction: str, *, dry_run: bool = False) -> Dict[str, Any]:
    remote = os.getenv("AOS_RCLONE_REMOTE", "").strip()
    local = os.getenv("AOS_RCLONE_LOCAL", str(VAULT_DIR)).strip()
    if not remote:
        return {"ok": False, "error": "AOS_RCLONE_REMOTE not set"}
    if not shutil.which("rclone"):
        return {"ok": False, "error": "rclone not found"}
    mapping = _parse_rclone_map()
    filters = [] if mapping else _rclone_filters()
    flags = _rclone_flags()
    backup_dir = _rclone_backup_dir(direction)
    if dry_run:
        flags = [*flags, "--dry-run"]

    if not mapping:
        if direction == "pull":
            cmd = ["rclone", "copy", remote, local, *filters, *flags]
        else:
            cmd = ["rclone", "copy", local, remote, *filters, *flags]
        if backup_dir:
            cmd.extend(["--backup-dir", backup_dir])

        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        return {
            "ok": proc.returncode == 0,
            "code": proc.returncode,
            "stdout": stdout.decode("utf-8", errors="ignore"),
            "stderr": stderr.decode("utf-8", errors="ignore"),
            "cmd": " ".join(cmd),
        }

    results: list[Dict[str, Any]] = []
    local_root = Path(local).expanduser()
    for local_key, remote_key in mapping:
        local_path = str((local_root / local_key).as_posix())
        remote_path = _rclone_join(remote, remote_key)
        if direction == "pull":
            src = remote_path
            dst = local_path
        else:
            src = local_path
            dst = remote_path
        cmd = ["rclone", "copy", src, dst, *flags]
        if backup_dir:
            cmd.extend(["--backup-dir", backup_dir])
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        results.append(
            {
                "ok": proc.returncode == 0,
                "code": proc.returncode,
                "stdout": stdout.decode("utf-8", errors="ignore"),
                "stderr": stderr.decode("utf-8", errors="ignore"),
                "cmd": " ".join(cmd),
                "map": {"local": local_key, "remote": remote_key, "direction": direction},
            }
        )
        if proc.returncode != 0:
            break

    ok = all(r.get("ok") for r in results) if results else False
    return {"ok": ok, "mode": "mapped", "results": results}


async def handle_sync_push(request: web.Request) -> web.Response:
    dry_run = _truthy(request.query.get("dry_run")) or _truthy(os.getenv("AOS_RCLONE_DRY_RUN"))
    result = await _run_rclone("push", dry_run=dry_run)
    status = 200 if result.get("ok") else 500
    return web.json_response(result, status=status)


async def handle_sync_pull(request: web.Request) -> web.Response:
    dry_run = _truthy(request.query.get("dry_run")) or _truthy(os.getenv("AOS_RCLONE_DRY_RUN"))
    result = await _run_rclone("pull", dry_run=dry_run)
    status = 200 if result.get("ok") else 500
    return web.json_response(result, status=status)


def create_app() -> web.Application:
    app = web.Application(middlewares=[auth_middleware])
    app.add_routes(
        [
            web.get("/health", handle_health),
            web.get("/bridge/health", handle_health),
            # Tailscale `serve/funnel --set-path /bridge` strips the `/bridge` prefix when proxying to :8080.
            # Provide root-path aliases so external calls to `/bridge/<route>` map cleanly to `/<route>` here.
            web.get("/daily-review-data", handle_bridge_daily_review_data),
            web.get("/bridge/daily-review-data", handle_bridge_daily_review_data),
            web.post("/trigger/weekly-firemap", handle_bridge_trigger_weekly_firemap),
            web.post("/bridge/trigger/weekly-firemap", handle_bridge_trigger_weekly_firemap),
            web.post("/fire/daily", handle_bridge_fire_daily),
            web.post("/bridge/fire/daily", handle_bridge_fire_daily),
            web.post("/core4/log", handle_core4_log),
            web.post("/bridge/core4/log", handle_core4_log),
            web.get("/core4/week", handle_core4_week),
            web.get("/bridge/core4/week", handle_core4_week),
            web.get("/core4/today", handle_core4_today),
            web.get("/bridge/core4/today", handle_core4_today),
            web.post("/fruits/answer", handle_fruits_answer),
            web.post("/bridge/fruits/answer", handle_fruits_answer),
            web.post("/tent/summary", handle_tent_summary),
            web.post("/bridge/tent/summary", handle_tent_summary),
            web.post("/tent/sync", handle_tent_sync),
            web.post("/bridge/tent/sync", handle_tent_sync),
            web.get("/tent/fetch", handle_tent_fetch),
            web.get("/bridge/tent/fetch", handle_tent_fetch),
            web.post("/task/operation", handle_task_operation),
            web.post("/bridge/task/operation", handle_task_operation),
            web.post("/task/execute", handle_task_execute),
            web.post("/bridge/task/execute", handle_task_execute),
            web.post("/task/modify", handle_task_modify),
            web.post("/bridge/task/modify", handle_task_modify),
            web.post("/warstack/draft", handle_warstack_draft),
            web.post("/bridge/warstack/draft", handle_warstack_draft),
            web.post("/queue/flush", handle_queue_flush),
            web.post("/bridge/queue/flush", handle_queue_flush),
            web.post("/telegram/send", handle_telegram_send),
            web.post("/bridge/telegram/send", handle_telegram_send),
            web.post("/sync/push", handle_sync_push),
            web.post("/bridge/sync/push", handle_sync_push),
            web.post("/sync/pull", handle_sync_pull),
            web.post("/bridge/sync/pull", handle_sync_pull),
        ]
    )
    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="AOS Bridge (aiohttp)")
    parser.add_argument("--host", default=os.getenv("AOS_BRIDGE_HOST", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=int(os.getenv("AOS_BRIDGE_PORT", "8080")))
    parser.add_argument("--log-level", default=os.getenv("AOS_BRIDGE_LOG_LEVEL", "INFO"))
    args = parser.parse_args()

    logging.basicConfig(level=args.log_level.upper(), format="%(asctime)s [%(levelname)s] %(message)s")
    LOGGER.info("Starting bridge on %s:%s", args.host, args.port)
    LOGGER.info(
        "Vault=%s | Core4Local=%s | Core4Mount=%s | Fruits=%s | Tent=%s",
        VAULT_DIR,
        CORE4_LOCAL_DIR,
        CORE4_MOUNT_DIR,
        FRUITS_DIR,
        TENT_DIR,
    )
    if BRIDGE_TOKEN:
        LOGGER.info("Bridge auth enabled (header=%s)", BRIDGE_TOKEN_HEADER)
    else:
        LOGGER.info("Bridge auth disabled")

    app = create_app()
    web.run_app(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
