from __future__ import annotations

import logging

from aiogram import F, Router
from aiogram.dispatcher.event.bases import SkipHandler
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.types import Message

from ..commands import extension_command_set
from ..state import AppState

logger = logging.getLogger(__name__)


def build_dynamic_router(state: AppState) -> Router:
    router = Router()

    @router.message(F.text.regexp(r"^/(.+)$"))
    async def route_command(m: Message):
        if not state.allowed(m.from_user.id):
            return

        cmd = m.text.strip().lstrip("/").split()[0].lower()

        if cmd in ("start", "menu", "reload", "help", "health", "commands"):
            raise SkipHandler
        if cmd in extension_command_set(state.config, state.loaded_extension_names()):
            raise SkipHandler

        logger.info("Routing /%s from user %s", cmd, m.from_user.id)

        centres, _ = await state.cache.fetch()
        centre = centres.get(cmd)

        if not centre:
            await m.answer(
                f"❌ Unknown command: /{cmd}\n\n" "Use /menu to see available centres."
            )
            return

        kb = InlineKeyboardBuilder()
        kb.button(text=f"Open: {centre.label}", url=centre.url)

        await m.answer(
            f"{centre.label}\n{centre.url}",
            reply_markup=kb.as_markup(),
            disable_web_page_preview=True,
        )

    return router
