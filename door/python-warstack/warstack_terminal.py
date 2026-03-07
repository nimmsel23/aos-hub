#!/usr/bin/env python3
"""Interactive terminal War Stack wizard aligned with Chapter 28."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path


DOMAIN_CONFIG = {
    "Power": ["Body", "Being", "Balance", "Business"],
    "Production": ["Advertising", "Marketing", "Sales", "Systems", "Profit"],
    "Process": ["People", "Optics"],
    "Protection": ["Accounting", "Taxes", "Legal", "Cash"],
}


@dataclass
class Hit:
    fact: str = ""
    obstacle: str = ""
    strike: str = ""
    responsibility: str = "Me"


@dataclass
class WarStackDraft:
    door_name: str = ""
    title: str = ""
    domain: str = ""
    subdomain: str = ""
    domino_door: str = ""
    other_doors: list[str] = field(default_factory=list)
    trigger: str = ""
    narrative: str = ""
    validation: str = ""
    impact: str = ""
    consequences: str = ""
    hits: list[Hit] = field(default_factory=lambda: [Hit() for _ in range(4)])
    insights: str = ""
    lessons: str = ""
    created: str = ""
    updated: str = ""
    week: str = ""
    source_potential: dict[str, str] = field(default_factory=dict)
    profit_review: dict[str, str] = field(default_factory=dict)


def now_iso() -> str:
    return dt.datetime.now().replace(microsecond=0).isoformat()


def week_key() -> str:
    return dt.datetime.now().strftime("%G-W%V")


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or "door"


def yaml_quote(value: str) -> str:
    return json.dumps(value or "", ensure_ascii=False)


def split_frontmatter(text: str) -> tuple[str, str]:
    if not text.startswith("---\n"):
        return "", text
    end = text.find("\n---\n", 4)
    if end == -1:
        return "", text
    return text[4:end], text[end + 5 :]


def extract_scalar(frontmatter: str, key: str) -> str:
    pattern = re.compile(rf"(?m)^{re.escape(key)}:\s*(.+?)\s*$")
    match = pattern.search(frontmatter)
    if not match:
        return ""
    raw = match.group(1).strip()
    if raw in {"null", "None"}:
        return ""
    if raw.startswith('"') and raw.endswith('"'):
        return raw[1:-1]
    if raw.startswith("'") and raw.endswith("'"):
        return raw[1:-1]
    return raw


def extract_nested_scalar(frontmatter: str, parent: str, key: str) -> str:
    block = re.search(
        rf"(?ms)^{re.escape(parent)}:\s*\n(?P<body>(?:^[ ]{{2,}}.*\n?)*)",
        frontmatter,
    )
    if not block:
        return ""
    pattern = re.compile(rf"(?m)^[ ]{{2,}}{re.escape(key)}:\s*(.+?)\s*$")
    match = pattern.search(block.group("body"))
    if not match:
        return ""
    raw = match.group(1).strip()
    if raw.startswith('"') and raw.endswith('"'):
        return raw[1:-1]
    if raw.startswith("'") and raw.endswith("'"):
        return raw[1:-1]
    return "" if raw == "null" else raw


def extract_line(body: str, label: str) -> str:
    patterns = [
        rf"(?m)^\*\*{re.escape(label)}:\*\*\s*(.+?)\s*$",
        rf"(?ms)^### {re.escape(label)}\s*\n(.+?)(?:\n### |\n## |\Z)",
    ]
    for pattern in patterns:
        match = re.search(pattern, body)
        if match:
            return match.group(1).strip()
    return ""


def extract_domino_door(body: str) -> str:
    patterns = [
        r"(?ms)^## 🚪 The Domino Door\s*\n.*?\*\*What specific Door are you opening this week\?\*\*\s*\n(.+?)(?:\n\s*\n|\n\*\*What other Doors)",
        r"(?ms)^## Domino Door\s*\n(.+?)(?:\n## |\Z)",
        r"(?m)^\*\*Domino Door:\*\*\s*(.+?)\s*$",
    ]
    for pattern in patterns:
        match = re.search(pattern, body)
        if match:
            return match.group(1).strip()
    return ""


def extract_other_doors(body: str) -> list[str]:
    match = re.search(
        r"(?ms)\*\*What other Doors does this open\?\*\*\s*\n(?P<body>.*?)(?:\n\s*\n|\n## |\Z)",
        body,
    )
    if not match:
        return []
    items: list[str] = []
    for line in match.group("body").splitlines():
        line = line.strip()
        if not line.startswith("-"):
            continue
        line = re.sub(r"^-+\s*", "", line)
        line = re.sub(r"^Door to:\s*", "", line, flags=re.IGNORECASE)
        if line:
            items.append(line)
    return items


def extract_hit(body: str, index: int) -> Hit:
    block = re.search(
        rf"(?ms)^### Hit {index}(?:\s|$).*?(?P<body>.*?)(?:^### Hit \d|^## |\Z)",
        body,
    )
    if not block:
        return Hit()
    hit_body = block.group("body")

    def pull(label: str, alt: str = "") -> str:
        patterns = [rf"(?m)^- \*\*{re.escape(label)}:\*\*\s*(.+?)\s*$"]
        if alt:
            patterns.append(rf"(?m)^- \*\*{re.escape(alt)}\*\*:\s*(.+?)\s*$")
        for pattern in patterns:
            match = re.search(pattern, hit_body)
            if match:
                return match.group(1).strip()
        return ""

    return Hit(
        fact=pull("FACT", "Fakt"),
        obstacle=pull("OBSTACLE", "Hindernis"),
        strike=pull("STRIKE", "Schlag"),
        responsibility=pull("RESPONSIBILITY", "Verantwortung") or "Me",
    )


def default_output_path(door_name: str, explicit_path: str | None) -> Path:
    if explicit_path:
        return Path(explicit_path).expanduser()
    warstack_dir = os.environ.get("AOS_DOOR_WARSTACK_DIR")
    if warstack_dir:
        vault_dir = Path(warstack_dir).expanduser()
    else:
        vault_root = Path(os.environ.get("AOS_VAULT_DIR", str(Path.home() / "vault"))).expanduser()
        vault_dir = vault_root / "Door" / "War-Stacks"
    return vault_dir / f"STACK_{slugify(door_name)}.md"


def load_existing(path: Path) -> WarStackDraft:
    draft = WarStackDraft()
    if not path.exists():
        return draft

    text = path.read_text(encoding="utf-8")
    frontmatter, body = split_frontmatter(text)

    draft.door_name = extract_scalar(frontmatter, "door_name")
    draft.title = extract_scalar(frontmatter, "title")
    draft.domain = extract_scalar(frontmatter, "domain")
    draft.subdomain = extract_scalar(frontmatter, "subdomain")
    draft.created = extract_scalar(frontmatter, "created")
    draft.updated = extract_scalar(frontmatter, "updated")
    draft.week = extract_scalar(frontmatter, "week")
    draft.source_potential = {
        key: value
        for key in ["kind", "hot_index", "hot_item_id", "hotlist_json", "hot_file", "tw_uuid"]
        if (value := extract_nested_scalar(frontmatter, "source_potential", key))
    }
    draft.profit_review = {
        key: value
        for key in ["status", "reviewed_at", "score"]
        if (value := extract_nested_scalar(frontmatter, "profit_review", key))
    }

    h1_match = re.search(r"(?m)^# .*?[—-]\s*(.+?)\s*$", body)
    if h1_match and not draft.title:
        draft.title = h1_match.group(1).strip()

    domain_line = extract_line(body, "Domain")
    if domain_line:
        if "→" in domain_line and not draft.subdomain:
            left, right = [part.strip() for part in domain_line.split("→", 1)]
            draft.domain = draft.domain or left
            draft.subdomain = draft.subdomain or right
        else:
            draft.domain = draft.domain or domain_line
    draft.subdomain = draft.subdomain or extract_line(body, "Sub-domain")
    draft.week = draft.week or extract_line(body, "Week")

    draft.domino_door = extract_domino_door(body)
    draft.other_doors = extract_other_doors(body)
    draft.trigger = extract_line(body, "Trigger")
    draft.narrative = extract_line(body, "Narrative")
    draft.validation = extract_line(body, "Validation")
    draft.impact = extract_line(body, "Impact") or extract_line(body, "Impact on Opening")
    draft.consequences = extract_line(body, "Consequences") or extract_line(body, "Consequences of Inaction")
    draft.insights = extract_line(body, "Insights")
    draft.lessons = extract_line(body, "Lessons Learned") or extract_line(body, "Lessons")
    draft.hits = [extract_hit(body, i) for i in range(1, 5)]

    return draft


def prompt_text(label: str, current: str = "", required: bool = False) -> str:
    while True:
        suffix = f" [{current}]" if current else ""
        try:
            value = input(f"{label}{suffix}: ").strip()
        except EOFError as exc:
            raise SystemExit(1) from exc
        if not value:
            value = current
        if value or not required:
            return value
        print("Value required.", file=sys.stderr)


def prompt_choice(label: str, options: list[str], current: str = "") -> str:
    while True:
        print(f"\n{label}")
        for idx, option in enumerate(options, start=1):
            marker = " *" if option == current else ""
            print(f"  {idx}. {option}{marker}")
        raw = input("Select number or enter value: ").strip()
        if not raw and current:
            return current
        if raw.isdigit():
            index = int(raw) - 1
            if 0 <= index < len(options):
                return options[index]
        if raw in options:
            return raw
        print("Invalid selection.", file=sys.stderr)


def normalize_other_doors(raw: str) -> list[str]:
    if not raw.strip():
        return []
    return [part.strip() for part in raw.split(",") if part.strip()]


def render_frontmatter(draft: WarStackDraft) -> str:
    lines = [
        "---",
        f"type: {yaml_quote('door-war-stack')}",
        f"status: {yaml_quote('active')}",
        f"phase: {yaml_quote('production')}",
        f"door_name: {yaml_quote(draft.door_name)}",
        f"title: {yaml_quote(draft.title)}",
        f"domain: {yaml_quote(draft.domain)}",
        f"subdomain: {yaml_quote(draft.subdomain)}",
        f"created: {yaml_quote(draft.created)}",
        f"updated: {yaml_quote(draft.updated)}",
        f"week: {yaml_quote(draft.week)}",
    ]
    if draft.source_potential:
        lines.append("source_potential:")
        for key in ["kind", "hot_index", "hot_item_id", "hotlist_json", "hot_file", "tw_uuid"]:
            if key in draft.source_potential:
                lines.append(f"  {key}: {yaml_quote(draft.source_potential[key])}")
    else:
        lines.extend(
            [
                "source_potential:",
                "  kind: null",
                "  hot_index: null",
                "  hot_item_id: null",
                "  hotlist_json: null",
                "  hot_file: null",
                "  tw_uuid: null",
            ]
        )
    status = draft.profit_review.get("status", "open")
    reviewed_at = draft.profit_review.get("reviewed_at", "null")
    score = draft.profit_review.get("score", "null")
    lines.extend(
        [
            "profit_review:",
            f"  status: {yaml_quote(status)}",
            f"  reviewed_at: {reviewed_at if reviewed_at == 'null' else yaml_quote(reviewed_at)}",
            f"  score: {score if score == 'null' else yaml_quote(score)}",
            "---",
        ]
    )
    return "\n".join(lines)


def render_markdown(draft: WarStackDraft) -> str:
    lines = [
        render_frontmatter(draft),
        "",
        f"# ⚔️ WAR STACK — {draft.title}",
        "",
        f"**Title:** {draft.title}",
        f"**Domain:** {draft.domain}",
        f"**Sub-domain:** {draft.subdomain}",
        f"**Week:** {draft.week}",
        "",
        "## 🚪 The Domino Door",
        "",
        "**What specific Door are you opening this week?**",
        draft.domino_door,
        "",
        "**What other Doors does this open?**",
    ]
    if draft.other_doors:
        lines.extend([f"- Door to: {value}" for value in draft.other_doors])
    else:
        lines.append("- Door to: ")
    lines.extend(
        [
            "",
            "## 🔥 The Spark",
            "",
            f"**Trigger:** {draft.trigger}",
            f"**Narrative:** {draft.narrative}",
            f"**Validation:** {draft.validation}",
            f"**Impact on Opening:** {draft.impact}",
            f"**Consequences of Inaction:** {draft.consequences}",
            "",
            "## 🎯 The 4 Hits",
            "",
        ]
    )
    for index, hit in enumerate(draft.hits, start=1):
        lines.extend(
            [
                f"### Hit {index}",
                f"- **FACT:** {hit.fact}",
                f"- **OBSTACLE:** {hit.obstacle}",
                f"- **STRIKE:** {hit.strike}",
                f"- **RESPONSIBILITY:** {hit.responsibility}",
                "",
            ]
        )
    lines.extend(
        [
            "## 🧠 Insights",
            "",
            draft.insights,
            "",
            "## 📚 Lessons Learned",
            "",
            draft.lessons,
            "",
        ]
    )
    return "\n".join(lines).rstrip() + "\n"


def merge_args(draft: WarStackDraft, args: argparse.Namespace) -> WarStackDraft:
    if args.door_name:
        draft.door_name = args.door_name
    if args.title:
        draft.title = args.title
    if args.domino_door:
        draft.domino_door = args.domino_door
    if args.source_idea and not draft.title:
        draft.title = args.source_idea
    if args.source_uuid:
        draft.source_potential["tw_uuid"] = args.source_uuid
    if args.source_idea:
        draft.source_potential.setdefault("kind", "hotlist-json")
    if args.hot_index:
        draft.source_potential["hot_index"] = args.hot_index
    if args.hot_file:
        draft.source_potential["hot_file"] = args.hot_file
    draft.door_name = draft.door_name or draft.domino_door or draft.title
    draft.title = draft.title or draft.door_name
    draft.domino_door = draft.domino_door or draft.door_name
    draft.created = draft.created or now_iso()
    draft.updated = now_iso()
    draft.week = draft.week or week_key()
    return draft


def run_wizard(draft: WarStackDraft) -> WarStackDraft:
    print("\nWar Stack Wizard\n")
    print("Chapter 28 flow: Title -> Domain -> Sub-domain -> Domino Door -> Spark -> 4 Hits -> Reflection\n")
    draft.title = prompt_text("Title", draft.title or draft.door_name, required=True)
    draft.domain = prompt_choice("Domain", list(DOMAIN_CONFIG.keys()), draft.domain or "Power")
    draft.subdomain = prompt_choice("Sub-domain", DOMAIN_CONFIG[draft.domain], draft.subdomain)
    draft.domino_door = prompt_text("Domino Door", draft.domino_door or draft.door_name or draft.title, required=True)
    other_doors = prompt_text(
        "Other Doors this opens (comma-separated)",
        ", ".join(draft.other_doors),
    )
    draft.other_doors = normalize_other_doors(other_doors)
    draft.trigger = prompt_text("Trigger", draft.trigger)
    draft.narrative = prompt_text("Narrative", draft.narrative)
    draft.validation = prompt_text("Validation", draft.validation)
    draft.impact = prompt_text("Impact on Opening", draft.impact)
    draft.consequences = prompt_text("Consequences of Inaction", draft.consequences)

    for index, hit in enumerate(draft.hits, start=1):
        print(f"\nHit {index}")
        hit.fact = prompt_text("  FACT", hit.fact)
        hit.obstacle = prompt_text("  OBSTACLE", hit.obstacle)
        hit.strike = prompt_text("  STRIKE", hit.strike)
        hit.responsibility = prompt_text("  RESPONSIBILITY", hit.responsibility or "Me")

    draft.insights = prompt_text("Insights", draft.insights)
    draft.lessons = prompt_text("Lessons Learned", draft.lessons)
    return draft


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Interactive terminal War Stack wizard")
    parser.add_argument("--door-name", default="")
    parser.add_argument("--title", default="")
    parser.add_argument("--domino-door", default="")
    parser.add_argument("--source-idea", default="")
    parser.add_argument("--source-uuid", default="")
    parser.add_argument("--hot-index", default="")
    parser.add_argument("--hot-file", default="")
    parser.add_argument("--path", default="")
    return parser.parse_args()


def main() -> int:
    if not sys.stdin.isatty():
        print("War Stack wizard requires a TTY.", file=sys.stderr)
        return 1

    args = parse_args()
    output_path = default_output_path(args.door_name or args.domino_door or args.title or "door", args.path)
    draft = load_existing(output_path)
    draft = merge_args(draft, args)
    draft = run_wizard(draft)
    draft.updated = now_iso()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(render_markdown(draft), encoding="utf-8")

    print(f"\nSaved: {output_path}")
    print(f"Door: {draft.door_name}")
    print(f"Domain: {draft.domain} -> {draft.subdomain}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
