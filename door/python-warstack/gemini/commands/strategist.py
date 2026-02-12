from __future__ import annotations

from typing import Dict


def _format_hits(hits: list[dict]) -> str:
    lines = []
    for idx, hit in enumerate(hits, 1):
        lines.append(f"Hit {idx}:")
        lines.append(f"- Fact: {hit.get('fact', '').strip()}")
        lines.append(f"- Obstacle: {hit.get('obstacle', '').strip()}")
        lines.append(f"- Strike: {hit.get('strike', '').strip()}")
    return "\n".join(lines)


def build_prompt(war_stack: Dict) -> str:
    hits = war_stack.get("hits") or []
    hits_text = _format_hits(hits)
    return f"""
You are a strategic advisor. Provide a long-range, high-level perspective on this War Stack.
Look for leverage, risk, blind spots, and alternative angles. Be calm, precise, and actionable.

War Stack:
- Domain: {war_stack.get("domain", "")}
- Subdomain: {war_stack.get("subdomain", "")}
- Domino Door: {war_stack.get("domino_door", "")}
- Trigger: {war_stack.get("trigger", "")}
- Narrative: {war_stack.get("narrative", "")}
- Validation: {war_stack.get("validation", "")}
- Impact: {war_stack.get("impact", "")}
- Consequences: {war_stack.get("consequences", "")}

Hits:
{hits_text}

Insights: {war_stack.get("insights", "")}
Lessons: {war_stack.get("lessons", "")}

Respond in German. Keep it under 350 words. Use short sections with headings.
"""


def run(client, war_stack: Dict) -> str:
    prompt = build_prompt(war_stack)
    return client.generate(prompt)
