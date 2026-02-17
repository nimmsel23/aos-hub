"""
Markdown template generators for Frame / Freedom / Focus / Fire Maps.
Adapted from alpha_game_module.py (legacy) — Taskwarrior bits removed.
"""

from datetime import date, datetime
from domains import DOMAINS


def _header(domain: str, map_type: str, period: str) -> str:
    info = DOMAINS[domain.upper()]
    emoji = info["emoji"]
    return f"# {emoji} {map_type.upper()} MAP – {domain.upper()} – {period}\n\n"


# ──────────────────────────────────────────
# FRAME MAP  (current reality)
# ──────────────────────────────────────────

FRAME_QUESTIONS = [
    ("Where Am I Now?",
     "This is your moment of reckoning — own up to your choices, circumstances, victories, and defeats."),
    ("How Did I Get Here?",
     "Understanding the path that led to this moment."),
    ("How Do I Feel About Where I Am?",
     "Raw emotional assessment without filters."),
    ("What Is Working?",
     "Recognize the parts of your current situation that align with your goals and values."),
    ("What Is NOT Working?",
     "Face the barriers and challenges that hold you back."),
]


def frame_template(domain: str, answers: dict[str, str] | None = None) -> str:
    today = date.today().isoformat()
    info = DOMAINS[domain.upper()]
    out = _header(domain, "frame", today)
    out += f'*"The Frame Map is the foundation of the Alpha OS Journey. It\'s where all creation begins."*\n\n---\n\n'

    for q, hint in FRAME_QUESTIONS:
        answer = (answers or {}).get(q, "")
        out += f"## {q}\n_{hint}_\n\n{answer or ''}\n\n"

    out += f"## {info['emoji']} Domain Specifics – {domain.upper()}\n\n"
    aspects = info["aspects"]
    out += f"**{aspects[0]} — What's Working:**\n\n\n"
    out += f"**{aspects[0]} — What's NOT Working:**\n\n\n"
    out += f"**{aspects[1]} — What's Working:**\n\n\n"
    out += f"**{aspects[1]} — What's NOT Working:**\n\n\n"
    out += "**Key Insight:**\n\n\n"
    out += "---\n"
    out += f"*Created: {datetime.now().strftime('%Y-%m-%d %H:%M')}*\n"
    return out


# ──────────────────────────────────────────
# FREEDOM MAP  (annual vision / IPW)
# ──────────────────────────────────────────

def freedom_template(domain: str, year: int | None = None, answers: dict[str, str] | None = None, frame_data: dict = None) -> str:
    year = year or date.today().year
    info = DOMAINS[domain.upper()]
    out = _header(domain, "freedom", str(year))
    out += f'*"The Freedom Map embodies your Ideal Parallel World — a life where your biggest dreams come true."*\n\n---\n\n'
    out += "## If anything were possible — what would my life look like in 10 years?\n\n"
    out += ((answers or {}).get("vision", "") or "") + "\n\n"
    out += f"## {info['emoji']} {domain.upper()} Domain Vision\n\n"
    for aspect in info["aspects"]:
        out += f"### {aspect}\n- \n- \n- \n\n"
    out += "## Success Indicators\n\n\n"
    out += "## Bridge to Frame\n*How does this vision connect to current reality?*\n\n\n"
    out += f"---\n*Created: {datetime.now().strftime('%Y-%m-%d %H:%M')}*\n"

    if frame_data:
        frame_date = frame_data.get("date", "?")
        out += f"\n---\n\n## Current Frame ({domain.upper()}) — {frame_date}\n\n"
        for q, a in (frame_data.get("answers") or {}).items():
            out += f"**{q}**  \n{a}\n\n"

    return out


# ──────────────────────────────────────────
# FOCUS MAP  (monthly mission)
# ──────────────────────────────────────────

def focus_template(domain: str, month: str | None = None, answers: dict[str, str] | None = None) -> str:
    month = month or date.today().strftime("%Y-%m")
    info = DOMAINS[domain.upper()]
    out = _header(domain, "focus", month)
    out += f'*"The Focus Map bridges the gap between where you are now and where you want to be."*\n\n---\n\n'
    out += "## Monthly Objective\n\n"
    out += ((answers or {}).get("objective", "") or "") + "\n\n"
    out += f"## {info['emoji']} {domain.upper()} – Monthly Focus\n\n"
    for aspect in info["aspects"]:
        out += f"### {aspect}\n**Habit to establish:**\n\n**Routine:**\n\n**Success metric:**\n\n"
    out += "## Weekly Breakdown\n"
    for i in range(1, 5):
        out += f"- **Week {i}:** \n"
    out += "\n---\n"
    out += f"*Created: {datetime.now().strftime('%Y-%m-%d %H:%M')}*\n"
    return out


# ──────────────────────────────────────────
# FIRE MAP  (weekly war)
# ──────────────────────────────────────────

def fire_template(domain: str, week: str | None = None, answers: dict[str, str] | None = None) -> str:
    if not week:
        today = date.today()
        week = f"{today.isocalendar()[0]}-W{today.isocalendar()[1]:02d}"
    info = DOMAINS[domain.upper()]
    out = _header(domain, "fire", week)
    out += f'*"The Fire Map is your weekly guide — the specific battles you need to fight right now."*\n\n---\n\n'
    out += "## Weekly Battle Declaration\n\n"
    out += ((answers or {}).get("battle", "") or "") + "\n\n"
    out += f"## {info['emoji']} {domain.upper()} – Weekly Battles\n\n"
    for aspect in info["aspects"]:
        out += f"### {aspect}\n- [ ] \n- [ ] \n- [ ] \n\n**Success metric:**\n\n"
    out += "## Daily Commitments\n"
    for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]:
        out += f"- **{day}:** \n"
    out += "\n---\n"
    out += f"*Created: {datetime.now().strftime('%Y-%m-%d %H:%M')}*\n"
    return out
