from __future__ import annotations

import logging
import socket
import time

import aiohttp

logger = logging.getLogger(__name__)


async def send_startup_ping(gas_webhook_url: str) -> None:
    if not gas_webhook_url:
        logger.info("Startup ping skipped: AOS_GAS_WEBHOOK_URL not configured")
        return

    try:
        hostname = socket.gethostname()
        timeout = aiohttp.ClientTimeout(total=5)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            payload = {
                "kind": "router_startup",
                "status": "online",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "host": hostname,
            }
            async with session.post(gas_webhook_url, json=payload) as response:
                if response.status == 200:
                    logger.info("Startup ping sent to GAS: %s", gas_webhook_url)
                else:
                    logger.warning("GAS ping failed: HTTP %s", response.status)
    except Exception as exc:
        logger.warning("Startup ping failed: %s", exc)
