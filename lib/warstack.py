"""
War Stack schema + YAML template.
Adapted from alpha_door_module.py (legacy).

Structure: Trigger → Narrative → Validation → Impact
           + 4 Hits: Fact / Obstacle / Strike / Responsibility
"""

from datetime import date
from domains import DOMAINS, DOMAIN_LIST

HIT_SCHEMA = {
    "fact":           "",
    "obstacle":       "",
    "strike":         "",
    "responsibility": "",
    "metric":         "",
    "due":            "",
}

INQUIRY_FIELDS = [
    ("trigger",     "Trigger",              "What person or event sparked your desire to open this Door?"),
    ("narrative",   "Narrative",            "What story are you telling yourself about this Door?"),
    ("validation",  "Validation",           "Why does opening this Door feel necessary?"),
    ("impact",      "Impact of Opening",    "How would opening this Door change your life?"),
    ("inaction",    "Cost of Inaction",     "What happens if this Door stays closed?"),
]

HIT_FIELDS = [
    ("fact",           "The Fact",           "The clear, measurable result you aim to achieve."),
    ("obstacle",       "The Obstacle",       "What could prevent you from achieving this?"),
    ("strike",         "The Strike",         "Your strategic move to overcome the obstacle."),
    ("responsibility", "Responsibility",     "Who executes this strike?"),
    ("metric",         "Success Metric",     "How will you know this Hit is won?"),
]


def warstack_schema(door_name: str, domain: str, week: str) -> dict:
    info = DOMAINS.get(domain.upper(), {})
    return {
        "door":   door_name,
        "domain": domain.upper(),
        "emoji":  info.get("emoji", "⚔️"),
        "week":   week,
        "date":   date.today().isoformat(),
        "inquiry": {key: "" for key, _, _ in INQUIRY_FIELDS},
        "hits": {
            f"hit_{i}": dict(HIT_SCHEMA) for i in range(1, 5)
        },
        "victory_condition": "",
        "timeline": {f"hit_{i}": "" for i in range(1, 5)},
    }


def display_warstack(data: dict):
    door = data.get("door", "?")
    domain = data.get("domain", "?")
    week = data.get("week", "?")
    emoji = data.get("emoji", "⚔️")
    print(f"\n{'='*44}")
    print(f"  {emoji}  WAR STACK – {door}  [{week}]")
    print(f"  Domain: {domain}")
    print(f"{'='*44}")

    inquiry = data.get("inquiry") or {}
    if any(inquiry.values()):
        print("\n  INQUIRY")
        for key, label, _ in INQUIRY_FIELDS:
            val = inquiry.get(key, "")
            if val:
                print(f"  {label}: {val}")

    hits = data.get("hits") or {}
    for i in range(1, 5):
        hit = hits.get(f"hit_{i}") or {}
        if any(hit.values()):
            print(f"\n  HIT #{i}")
            for key, label, _ in HIT_FIELDS:
                val = hit.get(key, "")
                if val:
                    print(f"    {label}: {val}")
