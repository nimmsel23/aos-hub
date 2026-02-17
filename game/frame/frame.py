#!/usr/bin/env python3
"""
Frame Map Engine – Alpha OS
Primary storage: DOMAIN_frame.yaml
Node display:    DOMAIN_frame.md  (auto-generated from YAML)

Usage:
    frame.py new   [--domain BODY]
    frame.py show  [--domain BODY]
    frame.py list
"""

import sys
import argparse
from datetime import date
from pathlib import Path

LIB = Path(__file__).parent.parent.parent / "lib"
sys.path.insert(0, str(LIB))

from domains import DOMAIN_LIST, DOMAINS
from vault import write_frame_yaml, read_frame_yaml, list_frame_yamls
from maps import FRAME_QUESTIONS

DOMAIN_CHOICES = DOMAIN_LIST + [d.lower() for d in DOMAIN_LIST]


def prompt_domain(domain: str) -> dict:
    info = DOMAINS[domain]
    print(f"\n{'='*44}")
    print(f"  {info['emoji']}  {domain}  –  FRAME MAP")
    print(f"{'='*44}")
    answers = {}
    for q, hint in FRAME_QUESTIONS:
        print(f"\n{q}")
        print(f"  ({hint})")
        answers[q] = input("  > ").strip() or "(—)"
    return answers


def save_frame(domain: str, answers: dict) -> Path:
    """Save frame as YAML (primary + only storage)."""
    today = date.today().isoformat()
    data = {"domain": domain, "date": today, "answers": answers}
    return write_frame_yaml(domain, data)


def cmd_new(domain: str | None):
    domains = [domain.upper()] if domain else DOMAIN_LIST
    for d in domains:
        answers = prompt_domain(d)
        yaml_p = save_frame(d, answers)
        print(f"\n  ✔ {d}  →  {yaml_p.name}")
    print(f"\nFrame Map abgeschlossen. {len(domains)} Domain(s).")


def cmd_show(domain: str | None):
    domains = [domain.upper()] if domain else DOMAIN_LIST
    for d in domains:
        data = read_frame_yaml(d)
        if data:
            print(f"\n{'─'*44}")
            print(f"  {DOMAINS[d]['emoji']}  {d}  –  {data.get('date', '?')}")
            for q, a in (data.get("answers") or {}).items():
                print(f"\n## {q}\n  {a}")
        else:
            print(f"\n  {d}: kein Frame Map. → framectl new {d}")


def cmd_list():
    files = list_frame_yamls()
    if not files:
        print("  Keine Frame Maps vorhanden.")
        return
    for f in files:
        domain = f.stem.replace("_frame", "")
        mtime = date.fromtimestamp(f.stat().st_mtime).isoformat()
        print(f"  {domain:<12} {mtime}  {f.name}")


def cmd_edit(domain: str | None):
    import os, subprocess
    from vault import yaml_path
    domains = [domain.upper()] if domain else DOMAIN_LIST
    for d in domains:
        p = yaml_path(d)
        if not p.exists():
            print(f"  {d}: kein Frame Map. → framectl new {d}")
            continue
        subprocess.run([os.environ.get("EDITOR", "nano"), str(p)])


def main():
    parser = argparse.ArgumentParser(description="Frame Map Engine")
    sub = parser.add_subparsers(dest="cmd")

    p_new = sub.add_parser("new")
    p_new.add_argument("--domain", "-d", choices=DOMAIN_CHOICES)

    p_show = sub.add_parser("show")
    p_show.add_argument("--domain", "-d", choices=DOMAIN_CHOICES)

    sub.add_parser("list")

    p_edit = sub.add_parser("edit")
    p_edit.add_argument("--domain", "-d", choices=DOMAIN_CHOICES)

    args = parser.parse_args()
    if args.cmd == "new":
        cmd_new(args.domain)
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
