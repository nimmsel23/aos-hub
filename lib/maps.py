"""
Game Map schemas + display helpers.

YAML = current state (read/written by scripts + Node)
MD   = history export (generated from YAML on demand)
"""

from datetime import date, datetime
from domains import DOMAINS, DOMAIN_LIST


# ── Questions ─────────────────────────────────────────────────────────────────

FRAME_QUESTIONS = [
    ("where_am_i_now",      "Where Am I Now?",         "Moment of reckoning — own up to choices, circumstances, victories, defeats."),
    ("how_did_i_get_here",  "How Did I Get Here?",     "Understanding the path that led to this moment."),
    ("how_do_i_feel",       "How Do I Feel?",           "Raw emotional assessment without filters."),
    ("what_is_working",     "What Is Working?",         "Parts of your current situation that align with goals and values."),
    ("what_is_not_working", "What Is NOT Working?",     "Barriers and challenges that hold you back."),
]

FREEDOM_QUESTIONS = [
    ("vision", "If anything were possible — what would life look like in 10 years?",
     "Push beyond what you think is possible."),
]

FOCUS_QUESTIONS = [
    ("objective", "Monthly objective for this domain?",
     "Bridge between current frame and annual vision."),
]

FIRE_QUESTIONS = [
    ("battle", "Weekly battle declaration for this domain?",
     "The specific fight you need to win this week."),
]

QUESTIONS = {
    "frame":   FRAME_QUESTIONS,
    "freedom": FREEDOM_QUESTIONS,
    "focus":   FOCUS_QUESTIONS,
    "fire":    FIRE_QUESTIONS,
}


# ── YAML schemas (empty state) ────────────────────────────────────────────────

def frame_schema(period: str) -> dict:
    return {
        "period": period,
        "date": date.today().isoformat(),
        "domains": {d: {k: "" for k, _, _ in FRAME_QUESTIONS} for d in DOMAIN_LIST},
    }


def freedom_schema(period: str) -> dict:
    return {
        "period": period,
        "date": date.today().isoformat(),
        "domains": {
            d: {"vision": "", "aspects": {a: [] for a in DOMAINS[d]["aspects"]}}
            for d in DOMAIN_LIST
        },
    }


def focus_schema(period: str, freedom_ref: str | None = None) -> dict:
    return {
        "period": period,
        "date": date.today().isoformat(),
        "freedom_ref": freedom_ref,
        "domains": {
            d: {"objective": "", "aspects": {a: {"habit": "", "routine": "", "metric": ""} for a in DOMAINS[d]["aspects"]}}
            for d in DOMAIN_LIST
        },
    }


def fire_schema(period: str, focus_ref: str | None = None) -> dict:
    return {
        "period": period,
        "date": date.today().isoformat(),
        "focus_ref": focus_ref,
        "domains": {
            d: {"battle": "", "aspects": {a: {"actions": [], "metric": ""} for a in DOMAINS[d]["aspects"]}}
            for d in DOMAIN_LIST
        },
    }


# ── Terminal display (YAML → readable output) ─────────────────────────────────

def display_frame(data: dict):
    period = data.get("period", "?")
    print(f"\n{'='*44}")
    print(f"  FRAME MAP  –  {period}  ({data.get('date', '?')})")
    print(f"{'='*44}")
    for domain, answers in (data.get("domains") or {}).items():
        info = DOMAINS.get(domain, {})
        print(f"\n  {info.get('emoji', '')}  {domain}")
        for key, label, _ in FRAME_QUESTIONS:
            val = (answers or {}).get(key, "")
            if val:
                print(f"  {label}: {val}")


def display_freedom(data: dict):
    period = data.get("period", "?")
    print(f"\n{'='*44}")
    print(f"  FREEDOM MAP  –  {period}")
    print(f"{'='*44}")
    for domain, content in (data.get("domains") or {}).items():
        info = DOMAINS.get(domain, {})
        print(f"\n  {info.get('emoji', '')}  {domain}")
        vision = (content or {}).get("vision", "")
        if vision:
            print(f"  Vision: {vision}")


def display_focus(data: dict):
    period = data.get("period", "?")
    print(f"\n{'='*44}")
    print(f"  FOCUS MAP  –  {period}")
    print(f"{'='*44}")
    for domain, content in (data.get("domains") or {}).items():
        info = DOMAINS.get(domain, {})
        print(f"\n  {info.get('emoji', '')}  {domain}")
        obj = (content or {}).get("objective", "")
        if obj:
            print(f"  Objective: {obj}")


def display_fire(data: dict):
    period = data.get("period", "?")
    print(f"\n{'='*44}")
    print(f"  FIRE MAP  –  {period}")
    print(f"{'='*44}")
    for domain, content in (data.get("domains") or {}).items():
        info = DOMAINS.get(domain, {})
        print(f"\n  {info.get('emoji', '')}  {domain}")
        battle = (content or {}).get("battle", "")
        if battle:
            print(f"  Battle: {battle}")


DISPLAY = {
    "frame":   display_frame,
    "freedom": display_freedom,
    "focus":   display_focus,
    "fire":    display_fire,
}


# ── MD export (YAML → Markdown history) ──────────────────────────────────────

def export_md(map_type: str, data: dict) -> str:
    """Generate markdown from YAML state for archiving."""
    period = data.get("period", "?")
    created = data.get("date", date.today().isoformat())
    lines = [f"# {map_type.upper()} MAP – {period}\n",
             f"*Exported: {created}*\n\n---\n"]
    for domain, content in (data.get("domains") or {}).items():
        info = DOMAINS.get(domain, {})
        lines.append(f"\n## {info.get('emoji', '')} {domain}\n")
        if isinstance(content, dict):
            for k, v in content.items():
                if v and k != "aspects":
                    lines.append(f"**{k.replace('_', ' ').title()}:** {v}\n")
    return "\n".join(lines)
