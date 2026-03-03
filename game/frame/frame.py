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

import os, sys, argparse, subprocess, json
from datetime import date
from pathlib import Path

LIB = Path(__file__).parent.parent.parent / "lib"
sys.path.insert(0, str(LIB))

from domains import DOMAIN_LIST, DOMAINS
import yaml

DOMAIN_CHOICES = DOMAIN_LIST + [d.lower() for d in DOMAIN_LIST]
PROMPT_MODES = ("domain-first", "question-first")

FRAME_DIR = Path.home() / ".aos" / "frame"
CHAPTER_REF = "Game Chapter 32 - Frame"

FRAME_QUESTIONS = [
    ("where_am_i_now", "Where am I now?", "Moment of reckoning — current reality."),
    ("how_did_i_get_here", "How did I get here?", "Trace the path that led here."),
    ("how_do_i_feel_about_where_i_am", "How do I feel about where I am?", "Raw emotional assessment."),
    ("what_is_working_about_where_i_am_now", "What is working about where I am now?", "What aligns and supports you."),
    ("what_is_not_working_about_where_i_am", "What is not working about where I am?", "Barriers and breakdowns."),
]


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def frame_path(domain: str) -> Path:
    return FRAME_DIR / f"{domain.lower()}.yaml"


def today_iso() -> str:
    return date.today().isoformat()


def default_state(domain: str) -> dict:
    return {
        "domain": domain.upper(),
        "updated": today_iso(),
        "period": "current",
        "type": "frame-map",
        "kind": "frame-state",
        "status": "grounded",
        "source_refs": {"chapter": CHAPTER_REF},
        "questions": {k: "" for k, _, _ in FRAME_QUESTIONS},
    }


def read_state(domain: str) -> dict | None:
    path = frame_path(domain)
    if not path.exists():
        return None
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def write_state(domain: str, state: dict) -> Path:
    ensure_dir(FRAME_DIR)
    path = frame_path(domain)
    text = yaml.dump(state, allow_unicode=True, sort_keys=False)
    path.write_text(text, encoding="utf-8")
    return path


def normalize_state(domain: str, raw: dict | None) -> dict:
    base = default_state(domain)
    raw = raw or {}
    questions = raw.get("questions") if isinstance(raw.get("questions"), dict) else {}
    for k, _, _ in FRAME_QUESTIONS:
        base["questions"][k] = str(questions.get(k, "") or "").strip()
    base["updated"] = str(raw.get("updated") or base["updated"])
    return base


def display_frame(state: dict):
    domain = state.get("domain", "?")
    print(f"\n{'='*44}")
    print(f"  FRAME MAP  –  {domain}")
    print(f"{'='*44}")
    for key, label, _ in FRAME_QUESTIONS:
        val = (state.get("questions") or {}).get(key, "")
        if val:
            print(f"  {label}: {val}")


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
    domains = [domain.upper()] if domain else DOMAIN_LIST
    print(f"\n{'='*44}")
    print(f"  FRAME MAP")
    print(f"  Prompt mode: {mode}")
    print(f"{'='*44}")

    if mode == "question-first":
        answers_by_domain = prompt_question_first(domains)
    else:
        answers_by_domain = {d: prompt_domain(d) for d in domains}

    for d in domains:
        existing = read_state(d) or {}
        state = normalize_state(d, existing)
        state["updated"] = today_iso()
        for key, _, _ in FRAME_QUESTIONS:
            state["questions"][key] = answers_by_domain[d].get(key, "").strip()
        path = write_state(d, state)
        print(f"\n  ✔ {d} → {path}")
    print()


def cmd_show(domain: str | None):
    domains = [domain.upper()] if domain else DOMAIN_LIST
    for d in domains:
        state = normalize_state(d, read_state(d))
        if not read_state(d):
            print(f"  Kein Frame für {d}. → framectl new {d}")
            continue
        display_frame(state)


def cmd_list():
    ensure_dir(FRAME_DIR)
    files = sorted(FRAME_DIR.glob("*.yaml"))
    if not files:
        print("  Keine Frame Maps vorhanden.")
        return
    for f in files:
        mtime = date.fromtimestamp(f.stat().st_mtime).isoformat()
        print(f"  {f.stem:<14} {mtime}  {f.name}")


def cmd_edit(domain: str | None):
    if not domain:
        subprocess.run([os.environ.get("EDITOR", "nano"), str(FRAME_DIR)])
        return
    path = frame_path(domain)
    if not path.exists():
        print(f"  Kein Frame für {domain}. → framectl new {domain}")
        return
    subprocess.run([os.environ.get("EDITOR", "nano"), str(path)])


def cmd_export():
    """Export current frame states via Node export API (if available)."""
    import urllib.request
    url = "http://127.0.0.1:8799/api/game/export"
    updated = []
    for domain in DOMAIN_LIST:
        state = normalize_state(domain, read_state(domain))
        if not read_state(domain):
            continue
        payload = {
            "map": "frame",
            "format": "yaml",
            "yaml": state,
            "meta": {"domain": domain.upper()},
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    updated.append(domain)
        except Exception:
            print("  Export failed (server unreachable).")
            return
    if updated:
        print(f"  ✔ Exported: {', '.join(updated)}")
    else:
        print("  Kein Frame vorhanden.")


def main():
    parser = argparse.ArgumentParser(description="Frame Map Engine")
    sub = parser.add_subparsers(dest="cmd")

    p_new = sub.add_parser("new")
    p_new.add_argument("--domain", "-d", choices=DOMAIN_CHOICES)
    p_new.add_argument("--mode", choices=PROMPT_MODES, default="question-first")

    p_show = sub.add_parser("show")
    p_show.add_argument("--domain", "-d", choices=DOMAIN_CHOICES)

    sub.add_parser("list")

    p_edit = sub.add_parser("edit")
    p_edit.add_argument("--domain", "-d", choices=DOMAIN_CHOICES)

    sub.add_parser("export")

    args = parser.parse_args()
    if args.cmd == "new":
        cmd_new(args.domain, getattr(args, "mode", "domain-first"))
    elif args.cmd == "show":
        cmd_show(getattr(args, "domain", None))
    elif args.cmd == "list":
        cmd_list()
    elif args.cmd == "edit":
        cmd_edit(getattr(args, "domain", None))
    elif args.cmd == "export":
        cmd_export()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
