#!/usr/bin/env python3
"""
TickTick sync helper for Core4 (add + get + gemini match).
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, time
from pathlib import Path
from typing import Dict, List, Optional
from urllib.request import Request, urlopen


BASE_URL = "https://api.ticktick.com/open/v1"
LOG_PATH = Path.home() / ".local" / "share" / "alphaos" / "logs" / "core4_ticktick.log"

SUBTASKS = [
    "fitness",
    "fuel",
    "meditation",
    "memoirs",
    "partner",
    "posterity",
    "discover",
    "declare",
]

def today_core4_tag() -> str:
    return "core4_" + datetime.now().strftime("%Y%m%d")


def vault_map_path() -> Path:
    return Path.home() / "AlphaOS-Vault" / ".alphaos" / "core4_ticktick_map.json"


def legacy_map_path() -> Path:
    return Path.home() / ".local" / "share" / "alphaos" / "core4_ticktick_map.json"


def ensure_map_path() -> Path:
    vault_path = vault_map_path()
    vault_path.parent.mkdir(parents=True, exist_ok=True)
    legacy = legacy_map_path()
    if not legacy.exists():
        legacy.parent.mkdir(parents=True, exist_ok=True)
        try:
            legacy.symlink_to(vault_path)
        except Exception:
            pass
    return vault_path


def log_line(message: str) -> None:
    try:
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with LOG_PATH.open("a", encoding="utf-8") as handle:
            handle.write(f"[{ts}] {message}\n")
    except Exception:
        return


def load_map() -> Dict:
    path = ensure_map_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_map(data: Dict) -> None:
    path = ensure_map_path()
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def ticktick_token() -> Optional[str]:
    token = os.getenv("TICKTICK_TOKEN", "").strip()
    if token:
        return token
    token_file = Path.home() / ".ticktick_token"
    if token_file.exists():
        try:
            return token_file.read_text(encoding="utf-8").strip()
        except Exception:
            return None
    return None


def ticktick_project_id() -> str:
    return (
        os.getenv("CORE4_TICKTICK_PROJECT_ID", "").strip()
        or os.getenv("TICKTICK_PROJECT_ID", "").strip()
        or "inbox"
    )


def ticktick_request(endpoint: str, method: str = "GET", payload: Optional[Dict] = None) -> Dict:
    token = ticktick_token()
    if not token:
        raise RuntimeError("Missing TICKTICK_TOKEN")
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method=method,
    )
    with urlopen(req, timeout=10) as resp:
        body = resp.read().decode("utf-8")
    try:
        return json.loads(body)
    except Exception:
        return {"raw": body}


def ticktick_fetch_tasks() -> List[Dict]:
    try:
        data = ticktick_request(f"/task?projectId={ticktick_project_id()}", "GET")
    except Exception:
        return []
    return data if isinstance(data, list) else []


def task_export(filters: List[str]) -> List[Dict]:
    cmd = ["task", "rc.verbose=0", "rc.confirmation=no"] + filters + ["export"]
    try:
        out = subprocess.check_output(cmd, text=True).strip()
    except Exception:
        return []
    if not out:
        return []
    try:
        return json.loads(out)
    except Exception:
        return []


def task_done(uuid: str) -> None:
    if not uuid:
        return
    try:
        subprocess.run(["task", uuid, "done"], check=True, stdout=subprocess.DEVNULL)
    except Exception:
        return


def pending_core4_today() -> List[Dict]:
    # Core4 tasks are identified by the date-tag (core4_YYYYMMDD).
    return task_export([f"+{today_core4_tag()}", "status:pending"])


def completed_core4_today() -> List[Dict]:
    # Tag-minimal: Core4 tasks are identified by the date-tag.
    return task_export([f"+{today_core4_tag()}", "status:completed", "end:today"])


def send_tele(message: str) -> None:
    if os.getenv("CORE4_TELE", "1") != "1":
        return
    if not message:
        return
    try:
        subprocess.run(["tele", message], check=True)
    except Exception:
        return


def parse_completed_today(task: Dict) -> bool:
    completed = task.get("completedTime") or task.get("modifiedTime")
    if not completed:
        return False
    try:
        dt = datetime.fromisoformat(completed.replace("Z", "+00:00"))
    except Exception:
        return False
    day_start = datetime.combine(datetime.now().date(), time.min)
    day_end = datetime.combine(datetime.now().date(), time.max)
    return day_start <= dt <= day_end


def gemini_enabled(force: bool) -> bool:
    if force:
        return bool(os.getenv("GEMINI_API_KEY", "").strip())
    return os.getenv("CORE4_GEMINI_MATCH", "0") == "1" and bool(
        os.getenv("GEMINI_API_KEY", "").strip()
    )


def classify_subtask_gemini(title: str, force: bool) -> Optional[str]:
    if not gemini_enabled(force):
        return None
    try:
        import google.generativeai as genai
    except Exception:
        return None

    genai.configure(api_key=os.getenv("GEMINI_API_KEY", "").strip())
    model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))

    prompt = (
        "Classify the following task title into one of these categories:\n"
        f"{', '.join(SUBTASKS)}\n\n"
        "If none fit, respond with 'none'.\n"
        f"Title: {title}\n"
        "Respond with a single word only."
    )
    try:
        resp = model.generate_content(prompt, generation_config={"temperature": 0})
        text = (resp.text or "").strip().lower()
    except Exception:
        return None
    if text in SUBTASKS:
        return text
    return None


def subtask_from_tags(tags: List[str]) -> Optional[str]:
    for tag in tags:
        if tag in SUBTASKS:
            return tag
    return None


def parse_task(task: Dict) -> Dict:
    uuid = task.get("uuid", "")
    title = task.get("description", "")
    tags = [str(t) for t in task.get("tags", [])]
    due = task.get("due")
    due_iso = None
    if due:
        try:
            due_iso = datetime.strptime(due, "%Y%m%dT%H%M%SZ").isoformat() + "Z"
        except Exception:
            due_iso = None
    return {
        "uuid": uuid,
        "title": title,
        "tags": tags,
        "due_iso": due_iso,
    }


def build_payload(task_info: Dict) -> Dict:
    tags = ["core4"]
    for tag in task_info.get("tags", []):
        if tag in SUBTASKS:
            tags.append(tag)

    payload = {
        "projectId": ticktick_project_id(),
        "title": task_info.get("title") or "Core4",
        "content": f"TW_UUID: {task_info.get('uuid', '')}",
        "tags": tags,
    }
    if task_info.get("due_iso"):
        payload["dueDate"] = task_info["due_iso"]
    return payload


def handle_add(stdin_task: Dict) -> int:
    task_info = parse_task(stdin_task)
    if not task_info.get("uuid") or not task_info.get("title"):
        return 0

    mapping = load_map()
    if task_info["uuid"] in mapping:
        return 0

    payload = build_payload(task_info)
    created = ticktick_request("/task", "POST", payload)
    task_id = created.get("id") or created.get("taskId") or created.get("task_id")
    if task_id:
        mapping[task_info["uuid"]] = {
            "ticktick_id": task_id,
            "title": task_info["title"],
            "created_at": datetime.utcnow().isoformat() + "Z",
        }
        save_map(mapping)
        log_line(f"add: {task_info['uuid']} -> {task_id}")
        return 0
    return 1


def handle_sync(use_gemini: bool, send_tele_flag: bool, status_flag: bool) -> int:
    mapping = load_map()
    tasks = ticktick_fetch_tasks()
    tasks_by_id = {t.get("id"): t for t in tasks if t.get("id")}

    updated = 0
    # Legacy matcher (by subtask tag) is best-effort; Core4 tasks may not carry subtask tags anymore.
    pending_by_subtask = {}
    for subtask in SUBTASKS:
        # Prefer date-tag identification; keep legacy +core4 matching as fallback.
        tw = task_export([f"+{today_core4_tag()}", f"+{subtask}", "status:pending"])
        if not tw:
            tw = task_export([f"+core4", f"+{subtask}", "due:today", "status:pending"])
        if tw:
            pending_by_subtask[subtask] = tw[0]

    for tw_uuid, info in mapping.items():
        tick_id = info.get("ticktick_id")
        tt = tasks_by_id.get(tick_id)
        if not tt:
            continue
        if tt.get("status") == 2 and parse_completed_today(tt):
            task_done(tw_uuid)
            updated += 1
            log_line(f"sync: completed {tw_uuid} via ticktick {tick_id}")

    for tt in tasks:
        if tt.get("status") != 2 or not parse_completed_today(tt):
            continue
        tags = [str(t) for t in tt.get("tags", [])]
        if "core4" not in tags:
            continue
        subtask = subtask_from_tags(tags)
        if not subtask:
            title = str(tt.get("title", ""))
            subtask = classify_subtask_gemini(title, use_gemini)
        if not subtask:
            continue
        tw_task = pending_by_subtask.get(subtask)
        if tw_task:
            task_done(tw_task.get("uuid", ""))
            updated += 1
            log_line(f"match: completed {tw_task.get('uuid','')} via {subtask}")

    pending = pending_core4_today()
    pending_titles = [p.get("description", "Core4") for p in pending]

    if send_tele_flag and pending_titles:
        msg = "Core4 pending today:\n- " + "\n- ".join(pending_titles)
        send_tele(msg)
        log_line(f"tele: pending={len(pending_titles)}")

    if status_flag:
        print(f"ticktick_tasks={len(tasks)} updated={updated} pending_today={len(pending)}")
        log_line(f"status: tasks={len(tasks)} updated={updated} pending={len(pending)}")

    return 0


def ticktick_complete_endpoint() -> str:
    return os.getenv(
        "CORE4_TICKTICK_COMPLETE_ENDPOINT",
        "https://api.ticktick.com/open/v1/task/{id}/complete",
    )


def ticktick_complete_task(task_id: str) -> bool:
    token = ticktick_token()
    if not token or not task_id:
        return False
    url = ticktick_complete_endpoint().replace("{id}", task_id)
    req = Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(req, timeout=10):
            return True
    except Exception:
        return False


def handle_push() -> int:
    mapping = load_map()
    ticktick_tasks = ticktick_fetch_tasks()

    # Best-effort recovery when mapping is missing/corrupted: try to find the
    # TickTick task by the TW uuid embedded in content ("TW_UUID: ...").
    tick_by_uuid: Dict[str, str] = {}
    for tt in ticktick_tasks:
        if not isinstance(tt, dict):
            continue
        tid = tt.get("id")
        if not tid:
            continue
        content = str(tt.get("content") or tt.get("note") or "")
        if "TW_UUID:" in content:
            after = content.split("TW_UUID:", 1)[1].strip()
            candidate = after.split()[0].strip()
            if candidate:
                tick_by_uuid[candidate] = tid
                continue
        # Fallback: some API variants return content in "desc"/"description".
        extra = " ".join(str(tt.get(k) or "") for k in ("desc", "description"))
        for part in (content, extra):
            if not part:
                continue
            if "TW_UUID:" in part:
                after = part.split("TW_UUID:", 1)[1].strip()
                candidate = after.split()[0].strip()
                if candidate:
                    tick_by_uuid[candidate] = tid
                    break

    done = 0
    tasks = completed_core4_today()
    for tw_task in tasks:
        tw_uuid = tw_task.get("uuid")
        if not tw_uuid:
            continue
        tick_id = None
        if tw_uuid in mapping:
            tick_id = mapping[tw_uuid].get("ticktick_id")
        if not tick_id:
            tick_id = tick_by_uuid.get(tw_uuid)
            if tick_id:
                mapping[tw_uuid] = {
                    "ticktick_id": tick_id,
                    "title": tw_task.get("description", "Core4"),
                    "created_at": datetime.utcnow().isoformat() + "Z",
                    "recovered": True,
                }
                save_map(mapping)
        if tick_id and ticktick_complete_task(tick_id):
            done += 1
            log_line(f"push: completed ticktick {tick_id} for {tw_uuid}")
    return done


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stdin", action="store_true", help="Read task json from stdin")
    parser.add_argument("--sync", action="store_true", help="Sync completions into Taskwarrior")
    parser.add_argument("--status", action="store_true", help="Return status summary")
    parser.add_argument("--tele", action="store_true", help="Send reminder via tele")
    parser.add_argument("--gemini", action="store_true", help="Use Gemini to classify unclear tasks")
    parser.add_argument("--push", action="store_true", help="Mark TickTick done from Taskwarrior")
    args = parser.parse_args()

    if args.stdin:
        try:
            data = json.load(sys.stdin)
        except Exception:
            return 1
        task = data.get("task") if isinstance(data, dict) else None
        if isinstance(task, dict):
            return handle_add(task)
        if isinstance(data, dict):
            return handle_add(data)
        return 1

    if args.sync or args.status or args.tele or args.push:
        if args.push:
            handle_push()
        return handle_sync(args.gemini, args.tele, args.status)

    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
