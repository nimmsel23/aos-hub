#!/usr/bin/env python3
"""
Freedom Map Engine – Alpha OS
Annual vision (IPW) — requires current Frame YAML.

Usage:
    freedom.py new   [--domain BODY] [--year 2026]
    freedom.py show  [--domain BODY]
    freedom.py list
    freedom.py edit  [--domain BODY]
"""

import os
import sys
import argparse
import subprocess
from datetime import date
from pathlib import Path

LIB = Path(__file__).parent.parent.parent / "lib"
sys.path.insert(0, str(LIB))

from domains import DOMAIN_LIST, DOMAINS
from vault import write_map, read_map, list_maps, map_path, read_frame_yaml

DOMAIN_CHOICES = DOMAIN_LIST + [d.lower() for d in DOMAIN_LIST]


def prompt_domain(domain: str) -> dict:
    info = DOMAINS[domain]
    print(f"\n{'='*44}")
    print(f"  {info['emoji']}  {domain}  –  FREEDOM MAP")
    print(f"{'='*44}")
    print("\n  If anything were possible — what would life look like in 10 years?")
    vision = input("  > ").strip() or "(—)"
    return {"vision": vision}


def cmd_new(domain: str | None, year: int | None = None):
    from maps import freedom_template
    domains = [domain.upper()] if domain else DOMAIN_LIST
    for d in domains:
        frame = read_frame_yaml(d)
        if not frame:
            print(f"\n  ✘ {d}: kein Frame Map vorhanden. Erst: framectl new {d}")
            continue
        answers = prompt_domain(d)
        content = freedom_template(d, year=year, answers=answers, frame_data=frame)
        path = write_map("freedom", d, content)
        print(f"\n  ✔ {d} gespeichert: {path.name}  (Frame {frame['date']} als Footer)")
    print()


def cmd_show(domain: str | None):
    domains = [domain.upper()] if domain else DOMAIN_LIST
    for d in domains:
        content = read_map("freedom", d)
        if content:
            print(f"\n{'─'*44}")
            print(content)
        else:
            print(f"\n  {d}: kein Freedom Map. → freedomctl new {d}")


def cmd_list():
    files = list_maps("freedom")
    if not files:
        print("  Keine Freedom Maps vorhanden.")
        return
    for f in files:
        domain = f.stem.replace("_freedom", "")
        mtime = date.fromtimestamp(f.stat().st_mtime).isoformat()
        print(f"  {domain:<12} {mtime}  {f.name}")


def cmd_edit(domain: str | None):
    domains = [domain.upper()] if domain else DOMAIN_LIST
    for d in domains:
        p = map_path("freedom", d)
        if not p.exists():
            print(f"  {d}: kein Freedom Map. → freedomctl new {d}")
            continue
        subprocess.run([os.environ.get("EDITOR", "nano"), str(p)])


def main():
    parser = argparse.ArgumentParser(description="Freedom Map Engine")
    sub = parser.add_subparsers(dest="cmd")

    p_new = sub.add_parser("new")
    p_new.add_argument("--domain", "-d", choices=DOMAIN_CHOICES)
    p_new.add_argument("--year", "-y", type=int)

    p_show = sub.add_parser("show")
    p_show.add_argument("--domain", "-d", choices=DOMAIN_CHOICES)

    sub.add_parser("list")

    p_edit = sub.add_parser("edit")
    p_edit.add_argument("--domain", "-d", choices=DOMAIN_CHOICES)

    args = parser.parse_args()
    if args.cmd == "new":
        cmd_new(args.domain, getattr(args, "year", None))
    elif args.cmd == "show":
        cmd_show(args.domain)
    elif args.cmd == "list":
        cmd_list()
    elif args.cmd == "edit":
        cmd_edit(args.domain)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
