from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Dict, Tuple

import aiohttp

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Centre:
    cmd: str
    label: str
    url: str


class IndexCache:
    def __init__(self, api_base: str, api_path: str, cache_ttl: int):
        self._lock = asyncio.Lock()
        self._centres: Dict[str, Centre] = {}
        self._updated_at: str = ""
        self._ts: float = 0.0
        self.api_base = api_base.rstrip("/")
        self.api_path = api_path
        self.cache_ttl = cache_ttl

    def fresh(self) -> bool:
        return self._centres and (time.time() - self._ts) < self.cache_ttl

    async def fetch(self, force: bool = False) -> Tuple[Dict[str, Centre], str]:
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
                    if link.startswith("/"):
                        link = f"{self.api_base}{link}"
                    if cmd and label and link:
                        centres[cmd] = Centre(cmd, label, link)

                self._centres = centres
                self._updated_at = str(payload.get("updated_at", ""))
                self._ts = time.time()
                logger.info("Fetched %s centres from Index API", len(centres))
            except Exception as exc:
                logger.warning("Failed to fetch from Index API: %s", exc)

            return self._centres, self._updated_at
