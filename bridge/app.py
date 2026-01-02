#!/usr/bin/env python3
import argparse
import asyncio
import json
import logging
import os
import re
import shutil
import shlex
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo

from aiohttp import web
import aiohttp

LOGGER = logging.getLogger("aos-bridge")

DEFAULT_TZ = os.getenv("AOS_TZ", "Europe/Vienna")
TZ = ZoneInfo(DEFAULT_TZ)

VAULT_DIR = Path(os.getenv("AOS_VAULT_DIR", Path.home() / "AlphaOS-Vault")).expanduser()
CORE4_DIR = Path(os.getenv("AOS_CORE4_DIR", VAULT_DIR / "Alpha_Core4")).expanduser()
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
QUEUE_DIR = Path(
    os.getenv("AOS_BRIDGE_QUEUE_DIR", Path.home() / ".cache/alphaos/bridge-queue")
).expanduser()

TASK_BIN = os.getenv("AOS_TASK_BIN", "task").strip()
TASK_EXEC_ENABLED = os.getenv("AOS_TASK_EXECUTE", "0").strip() == "1"
TASK_ID_RE = re.compile(r"created task (\d+)", re.IGNORECASE)
TASK_UUID_RE = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")

core4_lock = asyncio.Lock()
fruits_lock = asyncio.Lock()
queue_lock = asyncio.Lock()

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
    if not value:
        return _now()
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), TZ)
    text = str(value).strip()
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
    return cleaned or "untitled"


def _core4_path(week: str) -> Path:
    return CORE4_DIR / f"{CORE4_PREFIX}{week}.json"


def _core4_compute_totals(entries):
    totals = {"week_total": 0, "by_domain": {}, "by_day": {}, "by_habit": {}}
    for entry in entries:
        points = float(entry.get("points", 0) or 0)
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
        if entry.get("date") == date_key:
            total += float(entry.get("points", 0) or 0)
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


async def handle_core4_log(request: web.Request) -> web.Response:
    payload = await _read_json(request)
    domain = str(payload.get("domain", "")).strip().lower()
    task = str(payload.get("task", "")).strip().lower()
    if not domain or not task:
        return web.json_response({"ok": False, "error": "missing domain or task"}, status=400)

    ts = _parse_ts(payload.get("ts") or payload.get("timestamp"))
    week = _week_key(ts)
    date_key = _date_key(ts)
    entry_id = payload.get("id") or str(uuid.uuid4())
    entry = {
        "id": entry_id,
        "ts": ts.isoformat(),
        "date": date_key,
        "week": week,
        "domain": domain,
        "task": task,
        "points": float(payload.get("points", 0.5)),
        "source": str(payload.get("source", "bridge")),
        "user": payload.get("user") or {},
    }

    async with core4_lock:
        path = _core4_path(week)
        data = _load_json(path, {"week": week, "updated_at": "", "entries": [], "totals": {}})
        if not any(e.get("id") == entry_id for e in data["entries"]):
            data["entries"].append(entry)
        data["updated_at"] = _now().isoformat()
        data["totals"] = _core4_compute_totals(data["entries"])
        _save_json(path, data)

    total_today = _core4_total_for_date(data["entries"], date_key)
    return web.json_response({"ok": True, "week": week, "total_today": total_today})


async def handle_core4_week(request: web.Request) -> web.Response:
    week = request.query.get("week") or _week_key(_now())
    path = _core4_path(week)
    data = _load_json(path, {"week": week, "updated_at": "", "entries": [], "totals": {}})
    return web.json_response({"ok": True, "data": data})


async def handle_core4_today(request: web.Request) -> web.Response:
    today = _now()
    week = _week_key(today)
    date_key = _date_key(today)
    path = _core4_path(week)
    data = _load_json(path, {"week": week, "updated_at": "", "entries": [], "totals": {}})
    total = _core4_total_for_date(data["entries"], date_key)
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
    path = TENT_DIR / file_name
    path.write_text(markdown + "\n", encoding="utf-8")

    return web.json_response({"ok": True, "path": str(path)})


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


async def _run_task_add(task: Dict[str, Any]) -> Dict[str, Any]:
    if not TASK_EXEC_ENABLED:
        return {"ok": False, "error": "task execution disabled"}
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
    tasks = payload.get("tasks") or []
    single = payload.get("task")
    if single:
        tasks = [single]
    if not tasks:
        return web.json_response({"ok": False, "error": "missing tasks"}, status=400)

    results = []
    for task in tasks:
        results.append(await _run_task_add(task))

    ok = all(r.get("ok") for r in results)
    status = 200 if ok else 502
    return web.json_response({"ok": ok, "results": results}, status=status)


async def _run_task_modify(uuid: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    if not TASK_EXEC_ENABLED:
        return {"ok": False, "error": "task execution disabled"}
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
    app = web.Application()
    app.add_routes(
        [
            web.get("/health", handle_health),
            web.post("/bridge/core4/log", handle_core4_log),
            web.get("/bridge/core4/week", handle_core4_week),
            web.get("/bridge/core4/today", handle_core4_today),
            web.post("/bridge/fruits/answer", handle_fruits_answer),
            web.post("/bridge/tent/summary", handle_tent_summary),
            web.post("/bridge/task/operation", handle_task_operation),
            web.post("/bridge/task/execute", handle_task_execute),
            web.post("/bridge/task/modify", handle_task_modify),
            web.post("/bridge/warstack/draft", handle_warstack_draft),
            web.post("/bridge/queue/flush", handle_queue_flush),
            web.post("/bridge/sync/push", handle_sync_push),
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
    LOGGER.info("Vault=%s | Core4=%s | Fruits=%s | Tent=%s", VAULT_DIR, CORE4_DIR, FRUITS_DIR, TENT_DIR)

    app = create_app()
    web.run_app(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
