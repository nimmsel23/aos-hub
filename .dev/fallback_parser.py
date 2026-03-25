#!/usr/bin/env python3
"""
Fallback Parser

Used when Gemini API is unavailable.
Minimal structuring of raw dropfile content - no AI, just clean formatting.

Called by gemini_processor.py on Gemini failure.
Journal is always saved regardless.
"""

from datetime import datetime


def parse(domain: str, raw_content: str) -> str:
    """
    Minimal fallback parsing per domain.
    Returns a basic structured string for journal save.
    No Telegram output will happen with this result.

    Args:
        domain: "entspannung" | "fitness" | "fuel"
        raw_content: Raw daily file content

    Returns:
        Basic formatted string for journal
    """
    today = datetime.now().strftime("%Y-%m-%d")

    parsers = {
        "entspannung": _parse_entspannung,
        "fitness": _parse_fitness,
        "fuel": _parse_fuel,
    }

    parser_fn = parsers.get(domain, _parse_generic)
    return parser_fn(raw_content, today)


def _extract_lines(raw_content: str) -> list[str]:
    """Extract session lines (lines starting with '- [')."""
    lines = []
    for line in raw_content.splitlines():
        line = line.strip()
        if line.startswith("- ["):
            # Strip "- [HH:MM:SS] " prefix and keep content
            try:
                content = line.split("] ", 1)[1]
                lines.append(content)
            except IndexError:
                lines.append(line)
    return lines


def _parse_entspannung(raw: str, today: str) -> str:
    lines = _extract_lines(raw)
    if not lines:
        return f"# Entspannung - {today}\n\nKeine Sessions gefunden.\n"

    result = [f"# Entspannung - {today}", "", "### Sessions (unstrukturiert)", ""]
    for line in lines:
        result.append(f"- {line}")
    result.extend([
        "",
        f"### Statistik",
        f"- Einheiten: {len(lines)}",
        "",
        "*Gemini offline - keine Analyse verfügbar*",
    ])
    return "\n".join(result)


def _parse_fitness(raw: str, today: str) -> str:
    lines = _extract_lines(raw)
    if not lines:
        return f"# Fitness - {today}\n\nKein Training gefunden.\n"

    result = [f"# Fitness - {today}", "", "### Training (unstrukturiert)", ""]
    for line in lines:
        result.append(f"- {line}")
    result.extend([
        "",
        f"### Statistik",
        f"- Übungen/Einträge: {len(lines)}",
        "",
        "*Gemini offline - keine Analyse verfügbar*",
    ])
    return "\n".join(result)


def _parse_fuel(raw: str, today: str) -> str:
    lines = _extract_lines(raw)
    if not lines:
        return f"# Fuel - {today}\n\nKeine Mahlzeiten gefunden.\n"

    result = [f"# Fuel - {today}", "", "### Mahlzeiten (unstrukturiert)", ""]
    for line in lines:
        result.append(f"- {line}")
    result.extend([
        "",
        "### Statistik",
        f"- Mahlzeiten: {len(lines)}",
        "",
        "*Gemini offline - Makros nicht berechnet*",
    ])
    return "\n".join(result)


def _parse_generic(raw: str, today: str) -> str:
    """Catch-all for unknown domains."""
    lines = _extract_lines(raw)
    result = [f"# Session Log - {today}", "", "### Einträge", ""]
    for line in lines:
        result.append(f"- {line}")
    result.extend(["", "*Gemini offline*"])
    return "\n".join(result)
