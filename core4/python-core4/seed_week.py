#!/usr/bin/env python3
"""
Core4 seed-week — Standalone weekly task seeding.

Creates 56 Taskwarrior tasks (8 habits × 7 days) for the current ISO week.
Reads configuration from core4_task_config.yaml.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

try:
    import yaml
except ImportError:
    print("error: PyYAML not installed. Install: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

# Config paths
SCRIPT_DIR = Path(__file__).parent
CONFIG_PATH = SCRIPT_DIR / "core4_task_config.yaml"
HABITS_DIR = SCRIPT_DIR / "habits"
TASK_BIN = os.getenv("TASK_BIN", "task")


def run_task(args: list[str], *, capture: bool = False) -> subprocess.CompletedProcess:
    """Execute task command."""
    cmd = [TASK_BIN] + args
    kwargs = {
        "stdout": subprocess.PIPE if capture else None,
        "stderr": subprocess.PIPE if capture else None,
        "text": True,
        "check": False,
    }
    return subprocess.run(cmd, **kwargs)


def week_key(day: date) -> str:
    """ISO week string YYYY-Www."""
    return day.strftime("%G-W%V")


def iso_week_days(day: date) -> list[date]:
    """Monday–Sunday for the ISO week containing *day*."""
    monday = day - timedelta(days=day.isoweekday() - 1)
    return [monday + timedelta(days=i) for i in range(7)]


def load_config() -> dict:
    """Load core4_task_config.yaml."""
    if not CONFIG_PATH.exists():
        print(f"error: config not found: {CONFIG_PATH}", file=sys.stderr)
        sys.exit(1)
    try:
        return yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"error: failed to load config: {e}", file=sys.stderr)
        sys.exit(1)


def load_habit_config(habit_id: str) -> dict:
    """Load habit-specific config (e.g., habits/fitness.yaml) or return empty dict."""
    habit_file = HABITS_DIR / f"{habit_id}.yaml"
    if not habit_file.exists():
        return {}
    try:
        return yaml.safe_load(habit_file.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}


def resolve_habit_task(habit: dict, day: date, title_template_default: str) -> dict:
    """Resolve title/description for a habit on a specific day.

    Checks habit-specific config for day-of-week overrides.
    Returns: {title: str, description: str}
    """
    habit_config = load_habit_config(habit["id"])

    # Day of week name (lowercase)
    day_name = day.strftime("%A").lower()

    # Check for schedule override
    schedule = habit_config.get("schedule", {})
    day_override = schedule.get(day_name, {})

    # Resolve title
    if day_override.get("title"):
        title_template = day_override["title"]
    elif habit_config.get("default", {}).get("title"):
        title_template = habit_config["default"]["title"]
    else:
        title_template = title_template_default

    title = title_template.format(
        display=habit["display"],
        date=day.isoformat(),
        domain=habit["domain"]
    )

    # Resolve description
    description = ""
    if day_override.get("description"):
        description = day_override["description"]
    elif habit_config.get("default", {}).get("description"):
        description = habit_config["default"]["description"]

    return {"title": title, "description": description}


def habit_has_task(habit_tag: str, due_date: date) -> bool:
    """Check if any task with +{habit_tag} due:{date} exists (pending or completed)."""
    due_str = due_date.isoformat()
    for status in ("pending", "completed"):
        res = run_task([f"+{habit_tag}", f"due:{due_str}", f"status:{status}", "export"], capture=True)
        if res.returncode == 0:
            try:
                tasks = json.loads(res.stdout.strip() or "[]")
                if tasks:
                    return True
            except json.JSONDecodeError:
                pass
    return False


def create_task(habit: dict, due_date: date, week_tag: str, task_data: dict, priority: str, add_core4_tag: bool) -> bool:
    """Create a single TW task for the habit+date.

    task_data: {title: str, description: str} from resolve_habit_task
    """
    tw_tag = habit["tw_tag"]
    tw_project = habit["tw_project"]
    date_str = due_date.isoformat()
    title = task_data["title"]
    description = task_data.get("description", "")

    args = [
        "add",
        title,
        f"project:{tw_project}",
        f"due:{date_str}",
        f"+{tw_tag}",
    ]

    if add_core4_tag:
        args.append("+core4")
    if week_tag:
        args.append(f"+{week_tag}")
    if priority:
        args.append(f"priority:{priority}")

    res = run_task(args, capture=True)

    # Add description as annotation if present
    if res.returncode == 0 and description:
        # Extract UUID from output (TW prints "Created task N.")
        uuid_match = None
        for line in (res.stdout or "").splitlines():
            if "Created task" in line:
                # Try to get UUID via task N uuids
                try:
                    task_num = line.split()[2].rstrip(".")
                    uuid_res = run_task([task_num, "uuids"], capture=True)
                    if uuid_res.returncode == 0:
                        uuid_match = uuid_res.stdout.strip()
                        break
                except:
                    pass

        if uuid_match:
            run_task([uuid_match, "annotate", description], capture=True)

    return res.returncode == 0


def seed_week(day: date, *, dry_run: bool = False, force: bool = False) -> dict:
    """Seed 56 TW tasks for the ISO week containing *day*."""
    config = load_config()
    habits = config.get("habits", [])
    defaults = config.get("defaults", {})
    seed_config = config.get("seed_week", {})

    check_idempotent = seed_config.get("check_idempotent", True) and not force
    title_template = defaults.get("task_title_template", "{display} — {date}")
    priority = defaults.get("priority", "")
    add_core4_tag = defaults.get("core4_tag", True)
    add_week_tag = defaults.get("week_tag", True)

    days = iso_week_days(day)
    wk = week_key(day)
    week_tag = f"w{day.strftime('%V')}" if add_week_tag else ""
    created = 0
    skipped = 0
    errors = []

    for d in days:
        for habit in habits:
            tw_tag = habit["tw_tag"]

            # Idempotency check
            if check_idempotent and not dry_run:
                if habit_has_task(tw_tag, d):
                    skipped += 1
                    continue

            # Resolve day-specific task data (title + description)
            task_data = resolve_habit_task(habit, d, title_template)

            if dry_run:
                print(f"  {d.isoformat()}  {habit['domain']:8s}  {task_data['title']}")
                created += 1
                continue

            try:
                success = create_task(habit, d, week_tag, task_data, priority, add_core4_tag)
                if success:
                    created += 1
                else:
                    errors.append(f"{d.isoformat()}:{habit['id']} — task add failed")
            except Exception as exc:
                errors.append(f"{d.isoformat()}:{habit['id']} — {exc}")

    return {
        "ok": True,
        "week": wk,
        "created": created,
        "skipped": skipped,
        "errors": errors,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed Core4 tasks for the ISO week")
    parser.add_argument("--date", help="Target date (YYYY-MM-DD, defaults to today)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without creating")
    parser.add_argument("--force", "-f", action="store_true", help="Skip idempotency check")
    args = parser.parse_args()

    if args.date:
        try:
            from datetime import datetime
            day = datetime.strptime(args.date, "%Y-%m-%d").date()
        except ValueError:
            print(f"error: invalid date format: {args.date}", file=sys.stderr)
            return 2
    else:
        day = date.today()

    result = seed_week(day, dry_run=args.dry_run, force=args.force)

    if not result["ok"]:
        print(f"seed-week failed: {result.get('error')}", file=sys.stderr)
        return 1

    status = "dry-run" if args.dry_run else "done"
    print(f"Core4 seed-week {result['week']} [{status}]: created={result['created']} skipped={result['skipped']}")

    for err in result.get("errors", []):
        print(f"  ! {err}", file=sys.stderr)

    return 0 if not result["errors"] else 1


if __name__ == "__main__":
    sys.exit(main())
