#!/usr/bin/env python3
"""AlphaOS Router Bot (entrypoint).

Kept intentionally small: wiring + startup only.
Implementation lives in `router_app/`.
"""

import asyncio
import logging
from aiogram import Bot, Dispatcher

from extensions import ExtensionLoader

from router_app.index_cache import IndexCache
from router_app.settings import load_config, read_settings
from router_app.startup_ping import send_startup_ping
from router_app.state import AppState
from router_app.handlers.core import build_core_router
from router_app.handlers.dynamic import build_dynamic_router


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

async def main():
    settings = read_settings()
    if not settings.bot_token:
        raise SystemExit("Missing TELEGRAM_BOT_TOKEN environment variable")

    config = load_config(settings.config_path)
    index_config = config.get("index_api", {}) if isinstance(config, dict) else {}
    health_config = config.get("healthcheck", {}) if isinstance(config, dict) else {}

    cache = IndexCache(
        api_base=str(index_config.get("base", "http://100.76.197.55:8799")),
        api_path=str(index_config.get("path", "/api/centres")),
        cache_ttl=int(index_config.get("cache_ttl", 60)),
    )

    health_url = settings.health_url or str(health_config.get("url", "http://100.76.197.55:8080/health"))
    health_timeout = settings.health_timeout
    if health_timeout is None:
        try:
            health_timeout = float(health_config.get("timeout", 3))
        except Exception:
            health_timeout = 3.0

    state = AppState(
        config=config if isinstance(config, dict) else {},
        cache=cache,
        allowed_user_id=settings.allowed_user_id,
        health_url=str(health_url).strip(),
        health_timeout=float(health_timeout),
        gas_webhook_url=settings.gas_webhook_url,
    )

    dp = Dispatcher()
    dp.include_router(build_core_router(state))
    dp.include_router(build_dynamic_router(state))

    bot = Bot(settings.bot_token)

    extension_loader = ExtensionLoader(bot, dp, state.config)
    state.extension_loader = extension_loader

    extension_names = state.config.get("extensions", [])
    if not isinstance(extension_names, list):
        extension_names = []

    if extension_names:
        logger.info(f"Loading extensions: {extension_names}")
        await extension_loader.load_extensions(extension_names)
    else:
        logger.info("No extensions configured (dumb router mode)")

    await send_startup_ping(state.gas_webhook_url)

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
