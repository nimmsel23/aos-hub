#!/usr/bin/env python3
import asyncio
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace

from aiohttp import web


class StubRequest:
    def __init__(self, payload=None, query=None, json_exc: Exception | None = None):
        self._payload = payload
        self.query = query or {}
        self._json_exc = json_exc

    async def json(self):
        if self._json_exc:
            raise self._json_exc
        return self._payload


def _load_json_response(resp) -> dict:
    text = getattr(resp, "text", "")
    if not text:
        return {}
    return json.loads(text)


async def main() -> int:
    root = Path(__file__).resolve().parent

    with tempfile.TemporaryDirectory(prefix="aos-bridge-selftest-") as tmp:
        base = Path(tmp)
        os.environ["AOS_TZ"] = "Europe/Vienna"
        os.environ["AOS_VAULT_DIR"] = str(base / "vault")
        os.environ["AOS_CORE4_DIR"] = str(base / "vault" / "Alpha_Core4")
        os.environ["AOS_FRUITS_DIR"] = str(base / "vault" / "Alpha_Fruits")
        os.environ["AOS_TENT_DIR"] = str(base / "vault" / "Alpha_Tent")
        os.environ["AOS_BRIDGE_QUEUE_DIR"] = str(base / "queue")
        os.environ.pop("AOS_GAS_WEBHOOK_URL", None)
        os.environ.pop("AOS_GAS_CHAT_ID", None)
        os.environ.pop("AOS_GAS_USER_ID", None)
        os.environ.pop("AOS_BRIDGE_FALLBACK_TELE", None)
        os.environ.pop("AOS_TELE_BIN", None)
        os.environ.pop("AOS_TASK_EXECUTE", None)

        app_path = root / "app.py"
        if not app_path.exists():
            raise RuntimeError(f"missing bridge app: {app_path}")

        import importlib.util

        spec = importlib.util.spec_from_file_location("aos_bridge_app", app_path)
        if not spec or not spec.loader:
            raise RuntimeError("failed to load bridge/app.py")
        mod = importlib.util.module_from_spec(spec)
        sys.modules["aos_bridge_app"] = mod
        spec.loader.exec_module(mod)

        # /health
        resp = await mod.handle_health(StubRequest())
        assert resp.status == 200
        body = _load_json_response(resp)
        assert body.get("ok") is True

        # invalid json -> 400 (aiohttp raises HTTPBadRequest)
        try:
            await mod.handle_core4_log(StubRequest(json_exc=ValueError("bad json")))
            raise AssertionError("expected HTTPBadRequest")
        except web.HTTPBadRequest as exc:
            assert exc.status == 400
            body = json.loads(exc.text)
            assert body.get("ok") is False

        # core4 log -> writes week file
        payload = {
            "domain": "body",
            "task": "fitness",
            "ts": "2025-01-01T10:00:00+01:00",
            "source": "selftest",
            "user": {"id": "tester"},
        }
        resp = await mod.handle_core4_log(StubRequest(payload=payload))
        assert resp.status == 200
        body = _load_json_response(resp)
        assert body.get("ok") is True and body.get("week") == "2025-W01"

        # core4 today/week
        resp = await mod.handle_core4_week(StubRequest(query={"week": "2025-W01"}))
        assert resp.status == 200
        body = _load_json_response(resp)
        assert body.get("ok") is True and body["data"]["week"] == "2025-W01"

        resp = await mod.handle_core4_today(StubRequest())
        assert resp.status == 200
        body = _load_json_response(resp)
        assert body.get("ok") is True and "total" in body

        # fruits answer
        resp = await mod.handle_fruits_answer(
            StubRequest(payload={"question": "Q1", "answer": "A1", "section": "S", "source": "selftest"})
        )
        assert resp.status == 200
        body = _load_json_response(resp)
        assert body.get("ok") is True

        # tent summary
        resp = await mod.handle_tent_summary(
            StubRequest(payload={"week": "2025-W01", "name": "test.md", "markdown": "# Hi"})
        )
        assert resp.status == 200
        body = _load_json_response(resp)
        assert body.get("ok") is True
        assert (base / "vault" / "Alpha_Tent" / "test.md").exists()

        # task execute disabled by default -> 502
        resp = await mod.handle_task_execute(StubRequest(payload={"task": {"description": "x"}}))
        assert resp.status == 502
        body = _load_json_response(resp)
        assert body.get("ok") is False

        # task operation without GAS webhook -> queued (202)
        resp = await mod.handle_task_operation(StubRequest(payload={"chat_id": 1, "type": "task_add", "data": {}}))
        assert resp.status == 202
        body = _load_json_response(resp)
        assert body.get("queued") is True

        # queue flush should now fail (no GAS) with 502 and sent=0
        resp = await mod.handle_queue_flush(StubRequest())
        assert resp.status == 502
        body = _load_json_response(resp)
        assert body.get("ok") is False and body.get("sent") == 0

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
