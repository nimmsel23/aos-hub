#!/usr/bin/env python3
"""AlphaOS Router Bot - Dumb URL router for AlphaOS centres.

This bot fetches centre URLs from the local AlphaOS Index Node
and routes Telegram commands to the appropriate centre URLs.

Extensions can be loaded to add additional functionality without
modifying the core routing logic.
"""

import asyncio
import logging
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Tuple

import aiohttp
import yaml
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command
from aiogram.types import Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from extensions import ExtensionLoader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Environment configuration
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
ALLOWED_USER_ID = os.getenv("ALLOWED_USER_ID", "").strip()
CONFIG_PATH = Path(os.getenv("ROUTER_CONFIG", "./config.yaml")).expanduser()


def require_token():
    """Ensure BOT_TOKEN is set."""
    if not BOT_TOKEN:
        raise SystemExit("Missing TELEGRAM_BOT_TOKEN environment variable")


def allowed(uid: int) -> bool:
    """Check if user is allowed to use the bot."""
    return (not ALLOWED_USER_ID) or (str(uid) == str(ALLOWED_USER_ID))


def load_config() -> dict:
    """Load configuration from config.yaml."""
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except FileNotFoundError:
        logger.warning(f"Config file not found: {CONFIG_PATH}, using defaults")
        return {}
    except Exception as exc:
        logger.error(f"Error loading config: {exc}")
        return {}


@dataclass(frozen=True)
class Centre:
    """Represents an AlphaOS centre."""
    cmd: str
    label: str
    url: str


class IndexCache:
    """Caches centre data from the Index API."""

    def __init__(self, api_base: str, api_path: str, cache_ttl: int):
        """Initialize cache.

        Args:
            api_base: Index API base URL (e.g., http://100.76.197.55:8799)
            api_path: Index API path (e.g., /api/centres)
            cache_ttl: Cache TTL in seconds
        """
        self._lock = asyncio.Lock()
        self._centres: Dict[str, Centre] = {}
        self._updated_at: str = ""
        self._ts: float = 0.0
        self.api_base = api_base.rstrip("/")
        self.api_path = api_path
        self.cache_ttl = cache_ttl

    def fresh(self) -> bool:
        """Check if cache is still fresh."""
        return self._centres and (time.time() - self._ts) < self.cache_ttl

    async def fetch(self, force: bool = False) -> Tuple[Dict[str, Centre], str]:
        """Fetch centres from Index API.

        Args:
            force: Force refresh even if cache is fresh

        Returns:
            Tuple of (centres dict, updated_at timestamp)
        """
        async with self._lock:
            if self.fresh() and not force:
                return self._centres, self._updated_at

            url = self.api_base + self.api_path
            try:
                timeout = aiohttp.ClientTimeout(total=3)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.get(url) as response:
                        if response.status != 200:
                            raise RuntimeError(f"HTTP {response.status}")
                        payload = await response.json(content_type=None)

                centres: Dict[str, Centre] = {}
                for item in payload.get("centres", []):
                    cmd = str(item.get("cmd", "")).strip().lstrip("/").lower()
                    label = str(item.get("label", "")).strip()
                    link = str(item.get("url", "")).strip()
                    if cmd and label and link:
                        centres[cmd] = Centre(cmd, label, link)

                self._centres = centres
                self._updated_at = str(payload.get("updated_at", ""))
                self._ts = time.time()
                logger.info(f"Fetched {len(centres)} centres from Index API")
            except Exception as exc:
                logger.warning(f"Failed to fetch from Index API: {exc}")
                # Fail-soft: keep last cache (if any)

            return self._centres, self._updated_at


# Global state
config = load_config()
index_config = config.get("index_api", {})
CACHE = IndexCache(
    api_base=index_config.get("base", "http://100.76.197.55:8799"),
    api_path=index_config.get("path", "/api/centres"),
    cache_ttl=int(index_config.get("cache_ttl", 60))
)
dp = Dispatcher()
extension_loader = None  # Will be initialized in main()


def menu_kb(centres: Dict[str, Centre], cols: int = 2):
    """Build inline keyboard for centre menu."""
    kb = InlineKeyboardBuilder()
    for cmd in sorted(centres.keys()):
        c = centres[cmd]
        # Skip local-only URLs (start with /)
        if c.url.startswith("/"):
            continue
        kb.button(text=c.label, url=c.url)
    kb.adjust(cols)
    return kb.as_markup()


@dp.message(Command("start"))
async def start_command(m: Message):
    """Handle /start command."""
    if not allowed(m.from_user.id):
        return

    logger.info(f"/start from user {m.from_user.id}")
    centres, updated = await CACHE.fetch(force=True)

    if not centres:
        await m.answer(
            f"⚠️ Index API unreachable.\n\n"
            f"Check: {CACHE.api_base}{CACHE.api_path}"
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


def list_extension_commands() -> str:
    """List commands exposed by loaded extensions/config."""
    lines: list[str] = []

    # War Stack extension
    if "warstack_commands" in config.get("extensions", []):
        lines.append("/war — launch War Stack bot")
        lines.append("/warstack — alias for /war")

    # Core4 Actions extension
    core_cfg = config.get("core4_actions", {})
    tags = core_cfg.get("tags", {}) if isinstance(core_cfg, dict) else {}
    for cmd, tag in tags.items():
        lines.append(f"/{cmd} — Core4 done (+{tag})")

    return "\n".join(lines)


@dp.message(Command("menu"))
async def menu_command(m: Message):
    """Handle /menu command (centre links from Index)."""
    if not allowed(m.from_user.id):
        return

    logger.info(f"/menu from user {m.from_user.id}")
    centres, updated = await CACHE.fetch()

    if not centres:
        await m.answer(
            f"⚠️ No centres cached.\n\n"
            f"Check Index API: {CACHE.api_base}{CACHE.api_path}"
        )
        return

    timestamp = updated or "unknown"
    await m.answer(
        f"AlphaOS Centres\n(Index: {timestamp})",
        reply_markup=menu_kb(centres)
    )


@dp.message(Command("commands"))
async def commands_command(m: Message):
    """Handle /commands command (bot/extension commands)."""
    if not allowed(m.from_user.id):
        return

    ext_cmds = list_extension_commands()
    msg = "Bot/Extension Commands:\n"
    if ext_cmds:
        msg += ext_cmds
    else:
        msg += "No extension commands configured."

    await m.answer(msg)


@dp.message(Command("help"))
async def help_command(m: Message):
    """Handle /help command."""
    if not allowed(m.from_user.id):
        return

    logger.info(f"/help from user {m.from_user.id}")

    # Get loaded extension names
    ext_names = [ext.get_name() for ext in extension_loader.extensions] if extension_loader else []
    ext_info = f"\n\nLoaded extensions: {', '.join(ext_names)}" if ext_names else ""
    ext_cmds = list_extension_commands()
    ext_cmds_block = f"\n\nExtension commands:\n{ext_cmds}" if ext_cmds else ""

    await m.answer(
        "αOS Router Help\n\n"
        "/menu or /commands — show all centres from the Index\n"
        "/reload — refresh centre list\n"
        "/help — this help message\n\n"
        "Dynamic commands (from Index API):\n"
        "Type /voice /door /fire /frame etc. to get centre URLs.\n"
        "Available commands are whatever the Index menu currently serves."
        f"{ext_cmds_block}"
        f"{ext_info}"
    )


@dp.message(Command("reload"))
async def reload_command(m: Message):
    """Handle /reload command."""
    if not allowed(m.from_user.id):
        return

    logger.info(f"/reload from user {m.from_user.id}")
    centres, updated = await CACHE.fetch(force=True)

    if not centres:
        await m.answer("⚠️ Reload failed (Index API unreachable).")
        return

    timestamp = updated or "unknown"
    await m.answer(
        f"✅ Reloaded {len(centres)} centres.\n(Index: {timestamp})",
        reply_markup=menu_kb(centres)
    )


@dp.message(F.text.regexp(r"^/(.+)$"))
async def route_command(m: Message):
    """Handle dynamic routing for centre commands."""
    if not allowed(m.from_user.id):
        return

    # Extract command
    cmd = m.text.strip().lstrip("/").split()[0].lower()

    # Skip known commands (handled by other handlers)
    if cmd in ("start", "menu", "reload", "help"):
        return

    logger.info(f"Routing /{cmd} from user {m.from_user.id}")

    # Fetch centres
    centres, _ = await CACHE.fetch()
    centre = centres.get(cmd)

    if not centre:
        await m.answer(
            f"❌ Unknown command: /{cmd}\n\n"
            "Use /menu to see available centres."
        )
        return

    # Build response
    kb = InlineKeyboardBuilder()
    kb.button(text=f"Open: {centre.label}", url=centre.url)

    await m.answer(
        f"{centre.label}\n{centre.url}",
        reply_markup=kb.as_markup(),
        disable_web_page_preview=True
    )


async def main():
    """Main bot entry point."""
    require_token()

    # Initialize bot
    bot = Bot(BOT_TOKEN)

    # Load extensions
    global extension_loader
    extension_loader = ExtensionLoader(bot, dp, config)
    extension_names = config.get("extensions", [])

    if extension_names:
        logger.info(f"Loading extensions: {extension_names}")
        await extension_loader.load_extensions(extension_names)
    else:
        logger.info("No extensions configured (dumb router mode)")

    # Start polling
    try:
        logger.info("Starting AlphaOS Router Bot (dumb core)")
        await dp.start_polling(bot)
    finally:
        # Cleanup extensions
        if extension_loader:
            await extension_loader.teardown_all()


if __name__ == "__main__":
    asyncio.run(main())
