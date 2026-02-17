"""
core4_journal.py — Journal entry creation and task annotation.
Depends on: core4_types, core4_paths, core4_tw
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from core4_types import CORE4_JOURNAL_DIR, DISPLAY_HABIT, TZ, Target
from core4_tw import find_completed_uuid, find_pending_uuid, run_task


def safe_slug(text: str) -> str:
    slug = re.sub(r"^[\\/]+", "", str(text or "").strip().lower())
    slug = slug.replace("'", "").replace('"', "")
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"[^a-z0-9_-]", "", slug)
    return slug


def journal_entry_path(subtask: str) -> Path:
    from datetime import date
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


def get_task_uuid(target: Target) -> str:
    try:
        uid = find_completed_uuid(target)
        if uid:
            return uid
        uid = find_pending_uuid(target)
        if uid:
            return uid
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
    from core4_paths import core4_event_dir
    ev_root = core4_event_dir(base_dir)
    if not ev_root.exists():
        return ""
    days = sorted([p.name for p in ev_root.iterdir() if p.is_dir()])
    return days[-1] if days else ""


def _latest_week_file(base_dir: Path) -> str:
    pattern = "core4_week_"
    files = sorted([p.name for p in base_dir.glob(f"{pattern}*.json") if p.is_file()])
    return files[-1] if files else ""
