from __future__ import annotations

from typing import Dict

from aiogram.utils.keyboard import InlineKeyboardBuilder

from .index_cache import Centre


def menu_kb(centres: Dict[str, Centre], cols: int = 2):
    kb = InlineKeyboardBuilder()
    for cmd in sorted(centres.keys()):
        c = centres[cmd]
        kb.button(text=c.label, url=c.url)
    kb.adjust(cols)
    return kb.as_markup()
