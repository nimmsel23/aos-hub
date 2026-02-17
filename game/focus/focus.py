#!/usr/bin/env python3
"""
Focus Map Engine – Alpha OS
Monthly mission. Requires Freedom YAML (contains Frame).
YAML = state. MD = export on demand.

Usage:
    focus.py new   [--domain BODY] [--month 2026-02]
    focus.py show  [--month 2026-02]
    focus.py list
    focus.py edit
    focus.py export [--month 2026-02]
"""

import os, sys, argparse, subprocess
from pathlib import Path

LIB = Path(__file__).parent.parent.parent / "lib"
sys.path.insert(0, str(LIB))

from domains import DOMAIN_LIST, DOMAINS
from vault import (read_yaml, read_latest_yaml, list_yamls,
                   update_domain_yaml, current_month, current_yaml_path)
from maps import FOCUS_QUESTIONS, display_focus, export_md

DOMAIN_CHOICES = DOMAIN_LIST + [d.lower() for d in DOMAIN_LIST]


def prompt_domain(domain: str, freedom_data: dict | None) -> dict:
    info = DOMAINS[domain]
    print(f"\n  {info['emoji']}  {domain}")
    print(f"  {'─'*38}")
    if freedom_data:
        domain_vision = (freedom_data.get("domains") or {}).get(domain, {})
        vision = (domain_vision or {}).get("vision", "")
        if vision:
            print(f"  🎯 Vision: {vision[:80]}{'…' if len(vision) > 80 else ''}")
    answers = {}
    for key, label, hint in FOCUS_QUESTIONS:
        print(f"\n  {label}")
        print(f"  ({hint})")
        answers[key] = input("  > ").strip() or "(—)"
    return answers


def cmd_new(domain: str | None, month: str | None):
    month = month or current_month()
    freedom_result = read_latest_yaml("freedom")
    if not freedom_result:
        print("  ✘ Kein Freedom Map. Erst: freedomctl new")
        sys.exit(1)
    freedom_period, freedom_data = freedom_result

    domains = [domain.upper()] if domain else DOMAIN_LIST
    print(f"\n{'='*44}")
    print(f"  FOCUS MAP  –  {month}  (Freedom: {freedom_period})")
    print(f"{'='*44}")
    for d in domains:
        answers = prompt_domain(d, freedom_data)
        path = update_domain_yaml("focus", d, answers, period=month)
        print(f"\n  ✔ {d} → {path.name}")
    print()


def cmd_show(month: str | None):
    if month:
        data = read_yaml("focus", month)
    else:
        result = read_latest_yaml("focus")
        if not result:
            print("  Kein Focus Map. → focusctl new")
            return
        _, data = result
    display_focus(data)


def cmd_list():
    files = list_yamls("focus")
    if not files:
        print("  Keine Focus Maps vorhanden.")
        return
    from datetime import date
    for f in files:
        period = f.stem[len("focus_"):]
        mtime = date.fromtimestamp(f.stat().st_mtime).isoformat()
        print(f"  {period:<14} {mtime}  {f.name}")


def cmd_edit():
    path = current_yaml_path("focus")
    if not path.exists():
        files = list_yamls("focus")
        if not files:
            print("  Kein Focus Map. → focusctl new")
            return
        path = files[-1]
    subprocess.run([os.environ.get("EDITOR", "nano"), str(path)])


def cmd_export(month: str | None):
    from vault import MAP_DIRS
    data = read_yaml("focus", month) if month else (read_latest_yaml("focus") or (None, None))[1]
    if not data:
        print("  Kein Focus Map vorhanden.")
        return
    md = export_md("focus", data)
    period = data.get("period", month or "export")
    out = MAP_DIRS["focus"] / f"focus_{period}.md"
    out.write_text(md, encoding="utf-8")
    print(f"  ✔ Exportiert: {out.name}")


def main():
    parser = argparse.ArgumentParser(description="Focus Map Engine")
    sub = parser.add_subparsers(dest="cmd")

    p_new = sub.add_parser("new")
    p_new.add_argument("--domain", "-d", choices=DOMAIN_CHOICES)
    p_new.add_argument("--month", "-m")

    p_show = sub.add_parser("show")
    p_show.add_argument("--month", "-m")

    sub.add_parser("list")
    sub.add_parser("edit")

    p_exp = sub.add_parser("export")
    p_exp.add_argument("--month", "-m")

    args = parser.parse_args()
    if args.cmd == "new":
        cmd_new(args.domain, getattr(args, "month", None))
    elif args.cmd == "show":
        cmd_show(getattr(args, "month", None))
    elif args.cmd == "list":
        cmd_list()
    elif args.cmd == "edit":
        cmd_edit()
    elif args.cmd == "export":
        cmd_export(getattr(args, "month", None))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
