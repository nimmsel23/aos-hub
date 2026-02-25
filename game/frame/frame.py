#!/usr/bin/env python3
"""
Frame Map Engine – Alpha OS
YAML = current state. MD = history export on demand.

Usage:
    frame.py new   [--domain BODY] [--mode domain-first|question-first]
    frame.py show  [--week 2026-W08]
    frame.py list
    frame.py edit  [--domain BODY]
    frame.py export [--week 2026-W08]
"""

import os, sys, argparse, subprocess
from pathlib import Path

LIB = Path(__file__).parent.parent.parent / "lib"
sys.path.insert(0, str(LIB))

from domains import DOMAIN_LIST, DOMAINS
from vault import (write_yaml, read_yaml, read_latest_yaml, list_yamls,
                   update_domain_yaml, current_week, current_yaml_path)
from maps import FRAME_QUESTIONS, display_frame, export_md

DOMAIN_CHOICES = DOMAIN_LIST + [d.lower() for d in DOMAIN_LIST]
PROMPT_MODES = ("domain-first", "question-first")


def prompt_domain(domain: str) -> dict:
    info = DOMAINS[domain]
    print(f"\n  {info['emoji']}  {domain}")
    print(f"  {'─'*38}")
    answers = {}
    for key, label, hint in FRAME_QUESTIONS:
        print(f"\n  {label}")
        print(f"  ({hint})")
        answers[key] = input("  > ").strip() or "(—)"
    return answers


def prompt_question_first(domains: list[str]) -> dict[str, dict]:
    answers_by_domain = {d: {} for d in domains}
    for key, label, hint in FRAME_QUESTIONS:
        print(f"\n{'='*44}")
        print(f"  {label}")
        print(f"  {hint}")
        print(f"{'='*44}")
        for domain in domains:
            info = DOMAINS[domain]
            print(f"\n  {info['emoji']}  {domain}")
            answers_by_domain[domain][key] = input("  > ").strip() or "(—)"
    return answers_by_domain


def cmd_new(domain: str | None, mode: str):
    week = current_week()
    domains = [domain.upper()] if domain else DOMAIN_LIST
    print(f"\n{'='*44}")
    print(f"  FRAME MAP  –  {week}")
    print(f"  Prompt mode: {mode}")
    print(f"{'='*44}")

    if mode == "question-first":
        answers_by_domain = prompt_question_first(domains)
    else:
        answers_by_domain = {d: prompt_domain(d) for d in domains}

    for d in domains:
        path = update_domain_yaml("frame", d, answers_by_domain[d])
        print(f"\n  ✔ {d} → {path.name}")
    print()


def cmd_show(week: str | None):
    if week:
        data = read_yaml("frame", week)
        if not data:
            print(f"  Kein Frame für {week}.")
            return
    else:
        result = read_latest_yaml("frame")
        if not result:
            print("  Kein Frame vorhanden. → framectl new")
            return
        _, data = result
    display_frame(data)


def cmd_list():
    files = list_yamls("frame")
    if not files:
        print("  Keine Frame Maps vorhanden.")
        return
    from datetime import date
    for f in files:
        period = f.stem[len("frame_"):]
        mtime = date.fromtimestamp(f.stat().st_mtime).isoformat()
        print(f"  {period:<14} {mtime}  {f.name}")


def cmd_edit(domain: str | None):
    path = current_yaml_path("frame")
    if not path.exists():
        print(f"  Kein aktuelles Frame. → framectl new")
        return
    subprocess.run([os.environ.get("EDITOR", "nano"), str(path)])


def cmd_export(week: str | None):
    from vault import yaml_path, MAP_DIRS
    data = read_yaml("frame", week) if week else (read_latest_yaml("frame") or (None, None))[1]
    if not data:
        print("  Kein Frame vorhanden.")
        return
    md = export_md("frame", data)
    period = data.get("period", week or "export")
    out = MAP_DIRS["frame"] / f"frame_{period}.md"
    out.write_text(md, encoding="utf-8")
    print(f"  ✔ Exportiert: {out.name}")


def main():
    parser = argparse.ArgumentParser(description="Frame Map Engine")
    sub = parser.add_subparsers(dest="cmd")

    p_new = sub.add_parser("new")
    p_new.add_argument("--domain", "-d", choices=DOMAIN_CHOICES)
    p_new.add_argument("--mode", choices=PROMPT_MODES, default="question-first")

    p_show = sub.add_parser("show")
    p_show.add_argument("--week", "-w")

    sub.add_parser("list")

    p_edit = sub.add_parser("edit")
    p_edit.add_argument("--domain", "-d", choices=DOMAIN_CHOICES)

    p_exp = sub.add_parser("export")
    p_exp.add_argument("--week", "-w")

    args = parser.parse_args()
    if args.cmd == "new":
        cmd_new(args.domain, getattr(args, "mode", "domain-first"))
    elif args.cmd == "show":
        cmd_show(getattr(args, "week", None))
    elif args.cmd == "list":
        cmd_list()
    elif args.cmd == "edit":
        cmd_edit(getattr(args, "domain", None))
    elif args.cmd == "export":
        cmd_export(getattr(args, "week", None))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
