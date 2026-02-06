from __future__ import annotations

import logging
import time

import aiohttp
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from ..commands import list_extension_commands, warstack_help_note
from ..keyboards import menu_kb
from ..state import AppState

logger = logging.getLogger(__name__)


def build_core_router(state: AppState) -> Router:
    router = Router()

    @router.message(Command("start"))
    async def start_command(m: Message):
        if not state.allowed(m.from_user.id):
            return

        logger.info("/start from user %s", m.from_user.id)
        centres, _updated = await state.cache.fetch(force=True)

        if not centres:
            await m.answer(
                "⚠️ Index API unreachable.\n\n"
                f"Check: {state.cache.api_base}{state.cache.api_path}"
            )
            return

        await m.answer(
            "αOS Router\n\n"
            "Commands:\n"
            "/menu or /commands — show all centres\n"
            "/reload — refresh centre list\n"
            "/help — show help\n\n"
            "Or type /voice /door /fire etc. (routes to centres)",
            reply_markup=menu_kb(centres),
            disable_web_page_preview=True,
        )

    @router.message(Command("menu"))
    async def menu_command(m: Message):
        if not state.allowed(m.from_user.id):
            return

        logger.info("/menu from user %s", m.from_user.id)
        centres, updated = await state.cache.fetch()

        if not centres:
            await m.answer(
                "⚠️ No centres cached.\n\n"
                f"Check Index API: {state.cache.api_base}{state.cache.api_path}"
            )
            return

        timestamp = updated or "unknown"
        await m.answer(
            f"AlphaOS Centres\n(Index: {timestamp})",
            reply_markup=menu_kb(centres),
        )

    @router.message(Command("commands"))
    async def commands_command(m: Message):
        if not state.allowed(m.from_user.id):
            return

        ext_cmds = list_extension_commands(state.config)
        msg = "Bot/Extension Commands:\n"
        msg += ext_cmds if ext_cmds else "No extension commands configured."
        await m.answer(msg)

    @router.message(Command("help"))
    async def help_command(m: Message):
        if not state.allowed(m.from_user.id):
            return

        logger.info("/help from user %s", m.from_user.id)
        loaded_names = state.loaded_extension_names()
        warstack_note = warstack_help_note(state.config, loaded_names or None)
        warstack_note_block = f"\n\n{warstack_note}" if warstack_note else ""

        ext_cmds = list_extension_commands(state.config)
        ext_cmds_block = f"\n\nExtension commands:\n{ext_cmds}" if ext_cmds else ""

        ext_info = (
            f"\n\nLoaded extensions: {', '.join(sorted(loaded_names))}" if loaded_names else ""
        )

        await m.answer(
            "αOS Router Help\n\n"
            "/menu or /commands — show all centres from the Index\n"
            "/reload — refresh centre list\n"
            "/health — check bridge/laptop health\n"
            "/help — this help message\n\n"
            "Dynamic commands (from Index API):\n"
            "Type /voice /door /fire /frame etc. to get centre URLs.\n"
            "Available commands are whatever the Index menu currently serves."
            f"{ext_cmds_block}"
            f"{warstack_note_block}"
            f"{ext_info}"
        )

    @router.message(Command("reload"))
    async def reload_command(m: Message):
        if not state.allowed(m.from_user.id):
            return

        logger.info("/reload from user %s", m.from_user.id)
        centres, updated = await state.cache.fetch(force=True)

        if not centres:
            await m.answer("⚠️ Reload failed (Index API unreachable).")
            return

        timestamp = updated or "unknown"
        await m.answer(
            f"✅ Reloaded {len(centres)} centres.\n(Index: {timestamp})",
            reply_markup=menu_kb(centres),
        )

    @router.message(Command("health"))
    async def health_command(m: Message):
        if not state.allowed(m.from_user.id):
            return

        if not state.health_url:
            await m.answer("⚠️ Health URL not configured.")
            return

        logger.info("/health from user %s", m.from_user.id)
        timeout = aiohttp.ClientTimeout(total=state.health_timeout)
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                started = time.monotonic()
                async with session.get(state.health_url) as response:
                    elapsed_ms = int((time.monotonic() - started) * 1000)
                    status = response.status
                    text = await response.text()
                    msg = f"🟢 Bridge health OK\nHTTP {status} • {elapsed_ms}ms"
                    if text:
                        msg += f"\n\n{text[:800]}"
                    await m.answer(msg)
        except Exception as exc:
            await m.answer(f"🔴 Bridge health failed\n{state.health_url}\n{exc}")

    return router
