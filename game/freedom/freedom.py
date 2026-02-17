#!/usr/bin/env python3
"""
Freedom Map Engine – Alpha OS
Annual vision (IPW). Requires current Frame YAML.
YAML = state. MD = export on demand.

Usage:
    freedom.py new   [--domain BODY] [--year 2026]
    freedom.py show  [--year 2026]
    freedom.py list
    freedom.py edit
    freedom.py export [--year 2026]
"""

import os, sys, argparse, subprocess
from pathlib import Path

LIB = Path(__file__).parent.parent.parent / "lib"
sys.path.insert(0, str(LIB))

from domains import DOMAIN_LIST, DOMAINS
from vault import (write_yaml, read_yaml, read_latest_yaml, list_yamls,
                   update_domain_yaml, current_year, current_yaml_path, read_latest_yaml)
from maps import FREEDOM_QUESTIONS, display_freedom, export_md

DOMAIN_CHOICES = DOMAIN_LIST + [d.lower() for d in DOMAIN_LIST]


def prompt_domain(domain: str, frame_data: dict | None) -> dict:
    info = DOMAINS[domain]
    print(f"\n  {info['emoji']}  {domain}")
    print(f"  {'─'*38}")
    if frame_data:
        domain_frame = (frame_data.get("domains") or {}).get(domain, {})
        current = domain_frame.get("where_am_i_now", "")
        if current:
            print(f"  📍 Frame: {current[:80]}{'…' if len(current) > 80 else ''}")
    answers = {}
    for key, label, hint in FREEDOM_QUESTIONS:
        print(f"\n  {label}")
        print(f"  ({hint})")
        answers[key] = input("  > ").strip() or "(—)"
    return answers


def cmd_new(domain: str | None, year: str | None):
    year = year or current_year()
    frame_result = read_latest_yaml("frame")
    if not frame_result:
        print("  ✘ Kein Frame Map vorhanden. Erst: framectl new")
        sys.exit(1)
    _, frame_data = frame_result
    frame_period = frame_data.get("period", "?")

    domains = [domain.upper()] if domain else DOMAIN_LIST
    print(f"\n{'='*44}")
    print(f"  FREEDOM MAP  –  {year}  (Frame: {frame_period})")
    print(f"{'='*44}")
    for d in domains:
        data = prompt_domain(d, frame_data)
        path = update_domain_yaml("freedom", d, data, period=year)
        print(f"\n  ✔ {d} → {path.name}")
    print()


def cmd_show(year: str | None):
    if year:
        data = read_yaml("freedom", year)
    else:
        result = read_latest_yaml("freedom")
        if not result:
            print("  Kein Freedom Map. → freedomctl new")
            return
        _, data = result
    display_freedom(data)


def cmd_list():
    files = list_yamls("freedom")
    if not files:
        print("  Keine Freedom Maps vorhanden.")
        return
    from datetime import date
    for f in files:
        period = f.stem[len("freedom_"):]
        mtime = date.fromtimestamp(f.stat().st_mtime).isoformat()
        print(f"  {period:<14} {mtime}  {f.name}")


def cmd_edit():
    path = current_yaml_path("freedom")
    if not path.exists():
        files = list_yamls("freedom")
        if not files:
            print("  Kein Freedom Map. → freedomctl new")
            return
        path = files[-1]
    subprocess.run([os.environ.get("EDITOR", "nano"), str(path)])


def cmd_export(year: str | None):
    from vault import MAP_DIRS
    data = read_yaml("freedom", year) if year else (read_latest_yaml("freedom") or (None, None))[1]
    if not data:
        print("  Kein Freedom Map vorhanden.")
        return
    md = export_md("freedom", data)
    period = data.get("period", year or "export")
    out = MAP_DIRS["freedom"] / f"freedom_{period}.md"
    out.write_text(md, encoding="utf-8")
    print(f"  ✔ Exportiert: {out.name}")


def main():
    parser = argparse.ArgumentParser(description="Freedom Map Engine")
    sub = parser.add_subparsers(dest="cmd")

    p_new = sub.add_parser("new")
    p_new.add_argument("--domain", "-d", choices=DOMAIN_CHOICES)
    p_new.add_argument("--year", "-y")

    p_show = sub.add_parser("show")
    p_show.add_argument("--year", "-y")

    sub.add_parser("list")
    sub.add_parser("edit")

    p_exp = sub.add_parser("export")
    p_exp.add_argument("--year", "-y")

    args = parser.parse_args()
    if args.cmd == "new":
        cmd_new(args.domain, getattr(args, "year", None))
    elif args.cmd == "show":
        cmd_show(getattr(args, "year", None))
    elif args.cmd == "list":
        cmd_list()
    elif args.cmd == "edit":
        cmd_edit()
    elif args.cmd == "export":
        cmd_export(getattr(args, "year", None))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
