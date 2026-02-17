#!/usr/bin/env python3
"""
Game Map Engine – Alpha OS
Frame → Freedom → Focus → Fire

Usage:
    game.py new   frame   [--domain BODY]
    game.py new   freedom [--domain BODY] [--year 2026]
    game.py new   focus   [--domain BODY] [--month 2026-02]
    game.py new   fire    [--domain BODY] [--week 2026-W08]
    game.py show  <map>   [--domain BODY]
    game.py list  <map>
"""

import sys
import argparse
from datetime import date
from pathlib import Path

# shared lib
LIB = Path(__file__).parent.parent / "lib"
sys.path.insert(0, str(LIB))

from domains import DOMAINS, DOMAIN_LIST
from vault import write_map, read_map, list_maps, map_path
from maps import frame_template, freedom_template, focus_template, fire_template

TEMPLATES = {
    "frame":   frame_template,
    "freedom": freedom_template,
    "focus":   focus_template,
    "fire":    fire_template,
}


# ── interactive Q&A ──────────────────────────────────────────────────────────

def ask(prompt: str, hint: str = "") -> str:
    if hint:
        print(f"  ({hint})")
    return input(f"  {prompt}\n  > ").strip() or "(—)"


def prompt_frame(domain: str) -> dict:
    from maps import FRAME_QUESTIONS
    print()
    answers = {}
    for q, hint in FRAME_QUESTIONS:
        answers[q] = ask(q, hint)
    return answers


def prompt_freedom(domain: str) -> dict:
    return {"vision": ask("If anything were possible — what would life look like in 10 years?")}


def prompt_focus(domain: str) -> dict:
    return {"objective": ask("Monthly objective for this domain?")}


def prompt_fire(domain: str) -> dict:
    return {"battle": ask("Weekly battle declaration for this domain?")}


PROMPTS = {
    "frame":   prompt_frame,
    "freedom": prompt_freedom,
    "focus":   prompt_focus,
    "fire":    prompt_fire,
}


# ── commands ─────────────────────────────────────────────────────────────────

def cmd_new(map_type: str, domain: str | None, **kwargs):
    from vault import read_frame_yaml
    domains = [domain.upper()] if domain else DOMAIN_LIST
    for d in domains:
        info = DOMAINS[d]
        print(f"\n{'='*44}")
        print(f"  {info['emoji']}  {d}  –  {map_type.upper()} MAP")
        print(f"{'='*44}")
        answers = PROMPTS[map_type](d)
        extras = dict(kwargs)
        if map_type == "freedom":
            frame = read_frame_yaml(d)
            if not frame:
                print(f"\n  ✘ {d}: kein Frame Map. Erst: framectl new {d}")
                continue
            extras["frame_data"] = frame
        content = TEMPLATES[map_type](d, answers=answers, **extras)
        path = write_map(map_type, d, content)
        print(f"\n  ✔ gespeichert: {path.name}")
    print(f"\n{map_type.upper()} Map abgeschlossen. {len(domains)} Domain(s).")


def cmd_show(map_type: str, domain: str | None):
    domains = [domain.upper()] if domain else DOMAIN_LIST
    for d in domains:
        content = read_map(map_type, d)
        if content:
            print(f"\n{'─'*44}")
            print(content)
        else:
            print(f"\n  {d}: kein {map_type} Map. → gamectl new {map_type} {d}")


def cmd_list(map_type: str):
    files = list_maps(map_type)
    if not files:
        print(f"  Keine {map_type} Maps vorhanden.")
        return
    for f in files:
        domain = f.stem.replace(f"_{map_type}", "")
        mtime = date.fromtimestamp(f.stat().st_mtime).isoformat()
        print(f"  {domain:<12} {mtime}  {f.name}")


def cmd_edit(map_type: str, domain: str | None):
    import os, subprocess
    if domain:
        p = map_path(map_type, domain.upper())
        if not p.exists():
            print(f"  Kein {map_type} Map für {domain}. Erst: gamectl new {map_type} {domain}")
            sys.exit(1)
        subprocess.run([os.environ.get("EDITOR", "nano"), str(p)])
    else:
        import subprocess
        from vault import MAP_DIRS, ensure
        ensure(map_type)
        subprocess.run([os.environ.get("EDITOR", "nano"), str(MAP_DIRS[map_type])])


# ── CLI ───────────────────────────────────────────────────────────────────────

MAP_TYPES = list(TEMPLATES.keys())
DOMAIN_CHOICES = DOMAIN_LIST + [d.lower() for d in DOMAIN_LIST]


def main():
    parser = argparse.ArgumentParser(description="Game Map Engine")
    sub = parser.add_subparsers(dest="cmd")

    for verb in ("new", "show", "edit"):
        p = sub.add_parser(verb)
        p.add_argument("map", choices=MAP_TYPES)
        p.add_argument("--domain", "-d", choices=DOMAIN_CHOICES)
        if verb == "new":
            p.add_argument("--year",  type=int)
            p.add_argument("--month")
            p.add_argument("--week")

    p_list = sub.add_parser("list")
    p_list.add_argument("map", choices=MAP_TYPES)

    args = parser.parse_args()
    if not args.cmd:
        parser.print_help()
        return

    domain = getattr(args, "domain", None)
    map_type = args.map

    if args.cmd == "new":
        extras = {}
        if map_type == "freedom" and getattr(args, "year", None):
            extras["year"] = args.year
        if map_type == "focus" and getattr(args, "month", None):
            extras["month"] = args.month
        if map_type == "fire" and getattr(args, "week", None):
            extras["week"] = args.week
        cmd_new(map_type, domain, **extras)
    elif args.cmd == "show":
        cmd_show(map_type, domain)
    elif args.cmd == "list":
        cmd_list(map_type)
    elif args.cmd == "edit":
        cmd_edit(map_type, domain)


if __name__ == "__main__":
    main()
