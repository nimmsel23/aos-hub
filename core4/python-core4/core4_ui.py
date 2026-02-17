"""
core4_ui.py — Color helpers, fzf/gum menus, show_sources.
Depends on: core4_types, core4_paths
"""

from __future__ import annotations

import os
import subprocess
import sys
import termios
import tty
from pathlib import Path
from typing import Optional

from core4_types import DOMAIN_ORDER, HABIT_ORDER, DISPLAY_HABIT
from core4_paths import core4_dirs, core4_event_dir


def _color(text: str, code: str) -> str:
    if os.environ.get("NO_COLOR"):
        return text
    mode = str(os.environ.get("CORE4_COLOR", "auto")).strip().lower()
    if mode in ("0", "off", "false", "no", "never"):
        return text
    if mode in ("1", "on", "true", "yes", "force", "always"):
        return f"\033[{code}m{text}\033[0m"
    # auto
    if sys.stdout.isatty():
        return f"\033[{code}m{text}\033[0m"
    return text


def _green(text: str) -> str:
    return _color(text, "32")


def _yellow(text: str) -> str:
    return _color(text, "33")


def _cyan(text: str) -> str:
    return _color(text, "36")


def _have_cmd(name: str) -> bool:
    return subprocess.call(["which", name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0


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
    import re
    if not (_have_cmd("fzf") and sys.stdin.isatty() and sys.stdout.isatty()):
        return None
    labels: list[str] = []
    for idx, opt in enumerate(options, start=1):
        if opt in done:
            continue
        # Keep the canonical 1-8 index visible so muscle memory works even if some are done.
        labels.append(f"{idx}. {opt}")

    done_line = " ".join([f"\u2713{DISPLAY_HABIT.get(h, h)}" for h in options if h in done]) or "none"
    header = (
        "Keys: 1-8=done  Enter=journal  Space=done  q/esc=exit\n"
        f"Done today: {done_line}"
    )

    if not labels:
        # Nothing left to log today.
        print(_green("✓ core4: all habits done (today)"))
        return ("", "noop")
    res = subprocess.run(
        [
            "fzf",
            "--prompt",
            "Core4 log> ",
            "--height",
            "40%",
            "--border",
            "--no-multi",
            "--header",
            header,
            "--expect",
            "enter,space,1,2,3,4,5,6,7,8",
            "--bind",
            "space:accept,enter:accept,q:abort,esc:abort",
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

    key = ""
    selection = ""
    if lines[0] in ("enter", "space") or (len(lines[0]) == 1 and lines[0].isdigit()):
        key = lines[0]
        selection = lines[1] if len(lines) > 1 else ""
    else:
        key = "enter"
        selection = lines[0]

    # Fast path: digit hotkeys (always "done", no journal).
    if len(key) == 1 and key.isdigit():
        idx = int(key)
        if not (1 <= idx <= len(options)):
            return ("", "noop")
        habit = options[idx - 1]
        if habit in done:
            return ("", "noop")
        return habit, "done"

    m = re.match(r"^\s*(\d+)\.\s+(\S+)\s*$", selection)
    if not m:
        return ("", "noop")
    idx = int(m.group(1))
    if not (1 <= idx <= len(options)):
        return ("", "noop")
    habit = options[idx - 1]
    if not habit or habit not in options or habit in done:
        return ("", "noop")
    action = "done" if key == "space" else "log"
    return habit, action


def prompt_action_menu() -> Optional[str]:
    options = [
        "Log habit",
        "Score today",
        "Score week",
        "Sync (pull+push)",
        "Pull (Core4 only)",
        "Push (Core4 only)",
        "Sources",
        "Build day/week (write)",
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
