#!/usr/bin/env python3
"""
Core4 tracker CLI (idempotent via append-only event ledger).

Design:
- The *source of truth* for "already logged" is the append-only event ledger:
  `~/.core4/events/YYYY-MM-DD/*.json`
- If the stable entry key already exists (done=true), we do nothing.
- Otherwise we create+complete a Taskwarrior task so existing hooks handle:
  - Bridge `/bridge/core4/log` (weekly JSON)
  - TickTick mapping + completion (`ticktick_sync.py`)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Optional

# Allow module imports from python-core4/ (parent of this file).
THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Module imports — all core logic lives in focused modules
from core4_types import (
    CORE4CTL,
    DISPLAY_HABIT,
    HABIT_ORDER,
    HABIT_TO_DOMAIN,
    Target,
    parse_day,
    resolve_target,
    week_key,
)
from core4_paths import primary_core4_dir
from core4_ui import (
    _green,
    _have_cmd,
    _yellow,
    fzf_pick_habit,
    prompt_action_menu,
    prompt_habit_menu,
    show_sources,
)
from core4_ledger import (
    bridge_core4_log,
    build_day,
    build_week,
    is_already_logged,
    load_week,
)
from core4_tw import (
    ensure_taskwarrior,
    find_completed_uuid,
    find_pending_uuid,
    task_add,
    task_done,
    tw_has_completed,
)
from core4_score import (
    _day_done_list,
    score_mode,
)
from core4_export import (
    export_daily_csv,
    finalize_month,
    finalize_week,
    prune_events,
    seed_week,
)
from core4_journal import (
    get_task_uuid,
    open_core4_journal,
)


def run_core4ctl(*args: str) -> bool:
    if not CORE4CTL.exists():
        print(f"core4: core4ctl not found: {CORE4CTL}", file=sys.stderr)
        return False
    res = subprocess.run([str(CORE4CTL), *args], check=False)
    return res.returncode == 0


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
        subtask = DISPLAY_HABIT.get(target.habit, target.habit)
        task_label = DISPLAY_HABIT.get(target.habit, target.habit)
        task_uuid = get_task_uuid(target)
        open_core4_journal(subtask, task_label=task_label, task_uuid=task_uuid)

    def rebuild_derived_best_effort() -> None:
        # Derived artifacts are rebuildable snapshots (NOT the truth). We keep them up to date on writes
        # so other tools (e.g. index-node scanners) can read a single file, but we avoid writing on reads.
        try:
            build_week(target.day, write=True)
            build_day(target.day, write=True)
        except Exception:
            pass

    if args.dry_run:
        already = is_already_logged(target)
        label = DISPLAY_HABIT.get(target.habit, target.habit)
        domain = target.domain.upper()
        date_s = target.date_key

        # TW status — read-only, no task_add called
        try:
            ensure_taskwarrior()
            tw_done_uuid = find_completed_uuid(target)
            tw_pending_uuid = find_pending_uuid(target)
            if tw_done_uuid:
                tw_status = f"completed ({tw_done_uuid[:8]})"
            elif tw_pending_uuid:
                tw_status = f"pending ({tw_pending_uuid[:8]})"
            else:
                tw_status = "no task"
        except Exception:
            tw_status = "unavailable"

        if already:
            print(_green(f"✓ {label} ({domain}) {date_s} — already logged, would skip"))
        else:
            print(_yellow(f"→ {label} ({domain}) {date_s} — would log now"))
        print(f"  json: {'logged' if already else 'not logged'}  |  taskwarrior: {tw_status}")
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
            if is_already_logged(target):
                print(_green(f"✓ core4 {target.habit} ({target.date_key}) → done existing (json ok)"))
            else:
                print(_green(f"✓ core4 {target.habit} ({target.date_key}) → done existing (json pending)"))
            rebuild_derived_best_effort()
            maybe_open_journal()
            return finish(0)

        # Extra safety: if a completed task exists under the stable tag, replay JSON and exit.
        completed_uuid = find_completed_uuid(target)
        if completed_uuid:
            bridge_core4_log(target, source="tracker_replay_uuid")
            print(_green(f"✓ core4 {target.habit} ({target.date_key}) already done (uuid)"))
            maybe_open_journal()
            return finish(0)

        # Create+complete via Taskwarrior so hooks handle Bridge+TickTick.
        task_add(target)
        pending_uuid = find_pending_uuid(target)
        if pending_uuid:
            task_done(pending_uuid)
    except Exception as exc:
        print(f"core4: {exc}", file=sys.stderr)
        return finish(1)

    # Best-effort verification: if hooks/bridge are fast, JSON should now contain it.
    if is_already_logged(target):
        print(_green(f"✓ core4 {target.habit} ({target.date_key}) → created+done (json ok)"))
        rebuild_derived_best_effort()
        maybe_open_journal()
        return finish(0)
    print(_green(f"✓ core4 {target.habit} ({target.date_key}) → created+done (json pending)"))
    rebuild_derived_best_effort()
    maybe_open_journal()
    return finish(0)


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
            if not run_core4ctl("push-core4"):
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
            "  core4 build       # write derived day+week snapshots (from ledger)\n"
            "\n"
            "Show score (JSON-backed, with TW replay if behind):\n"
            "  core4 -d            # today\n"
            "  core4 -1d           # yesterday\n"
            "  core4 -w            # this week\n"
            "  core4 -w --date 2026-01-13\n"
            "  core4 -w --quiet    # score only\n"
            "\n"
            "Sync is timer-driven by default (vaultctl core4).\n"
            "Manual sync is emergency-only:\n"
            "  core4 sync\n"
            "  core4 --pull\n"
            "  core4 --push\n"
            "  core4 --sync\n"
            "\n"
            "Seed pending tasks for the week:\n"
            "  core4 seed-week            # 8 habits x 7 days (idempotent)\n"
            "  core4 seed-week --dry-run  # preview what would be created\n"
            "  core4 seed-week --date 2026-02-03\n"
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
                if not habit or action == "noop":
                    continue
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

    admin_result = handle_admin_command(argv, finish=finish, run_core4ctl=run_core4ctl)
    if admin_result is not None:
        return admin_result

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
            if not run_core4ctl("push-core4"):
                return 1
            return 0
        elif choice == "Pull (Core4 only)":
            return 0 if run_core4ctl("pull-core4") else 1
        elif choice == "Push (Core4 only)":
            return 0 if run_core4ctl("push-core4") else 1
        elif choice == "Sources":
            return finish(show_sources())
        elif choice == "Build day/week (write)":
            return finish(main(["build"]))
        elif choice == "Export daily CSV":
            return 0 if run_core4ctl("export-daily", "--days=56") else 1
        elif choice == "Prune events":
            return 0 if run_core4ctl("prune", "--keep-weeks=8") else 1
        elif choice == "Finalize month":
            month = f"{date.today().year:04d}-{date.today().month:02d}"
            return 0 if run_core4ctl("finalize-month", month) else 1
        return finish(0)


def handle_admin_command(argv: list[str], *, finish, run_core4ctl) -> Optional[int]:
    if argv and argv[0] in ("sources", "source", "debug"):
        return finish(show_sources())

    if argv and argv[0] in ("build", "rebuild"):
        day_raw = argv[1] if len(argv) > 1 else None
        try:
            day = parse_day(day_raw)
        except Exception as exc:
            print(f"core4: {exc}", file=sys.stderr)
            return finish(2)
        try:
            build_week(day, write=True)
            build_day(day, write=True)
        except Exception as exc:
            print(f"core4: build failed: {exc}", file=sys.stderr)
            return finish(1)
        return finish(0)

    if argv and argv[0] in ("sync", "core4sync", "sync-core4"):
        print("core4: manual sync path (legacy/emergency). regular sync runs via vaultctl core4 timer.", file=sys.stderr)
        if not run_core4ctl("pull-core4"):
            return 1
        if not run_core4ctl("push-core4"):
            return 1
        return 0

    if argv and argv[0] in ("seed-week", "seed_week", "seed"):
        dry_run = "--dry-run" in argv
        force = "--force" in argv or "-f" in argv
        day = date.today()
        for tok in argv[1:]:
            if tok.startswith("--date="):
                try:
                    day = datetime.strptime(tok.split("=", 1)[1], "%Y-%m-%d").date()
                except Exception:
                    pass
        result = seed_week(day, dry_run=dry_run, force=force)
        if not result.get("ok"):
            print(f"core4 seed-week failed: {result.get('error')}", file=sys.stderr)
            return finish(1)
        status = "dry-run" if dry_run else "done"
        print(f"Core4 seed-week {result['week']} [{status}]: created={result['created']} skipped={result['skipped']}")
        for err in result.get("errors", []):
            print(f"  ! {err}", file=sys.stderr)
        return finish(0)

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

    return None

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
    sys.exit(main(sys.argv[1:]))
