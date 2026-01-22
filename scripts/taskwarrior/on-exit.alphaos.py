#!/usr/bin/env python3
"""AlphaOS Taskwarrior on-exit hook.

Writes a local JSON snapshot of `task ... export` after each Taskwarrior command.
Optionally copies the snapshot into the Vault so existing rclone sync can make it
available to GAS (Drive).

This hook is fail-soft: it should never block Taskwarrior.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path


ENV_PATH = Path(os.path.expanduser("~/.config/alpha-os/hooks.env"))


def load_env(path: Path) -> None:
    if not path.exists():
        return
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            if key and key not in os.environ:
                os.environ[key] = value.strip().strip('"').strip("'")
    except Exception:
        return


def _mkdirp(path: Path) -> None:
    try:
        path.mkdir(parents=True, exist_ok=True)
    except Exception:
        return


def _atomic_write_json(path: Path, data: object) -> bool:
    try:
        _mkdirp(path.parent)
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(path)
        return True
    except Exception:
        try:
            tmp.unlink(missing_ok=True)  # type: ignore[attr-defined]
        except Exception:
            pass
        return False


def main() -> int:
    load_env(ENV_PATH)

    task_bin = os.environ.get("AOS_TASK_BIN") or os.environ.get("TASK_BIN") or "task"
    taskrc = os.environ.get("AOS_TASKRC") or os.environ.get("TASKRC") or ""

    export_filter = os.environ.get("AOS_TASK_EXPORT_FILTER") or os.environ.get("TASK_EXPORT_FILTER") or "status:pending"
    out_path = Path(
        os.environ.get("AOS_TASK_EXPORT_PATH")
        or os.environ.get("TASK_EXPORT")
        or (Path.home() / ".local" / "share" / "alphaos" / "task_export.json")
    ).expanduser()
    vault_path = Path(
        os.environ.get("AOS_TASK_EXPORT_VAULT_PATH") or (Path.home() / "AlphaOS-Vault" / ".alphaos" / "task_export.json")
    ).expanduser()
    copy_to_vault = (os.environ.get("AOS_TASK_EXPORT_COPY_TO_VAULT", "1").strip() == "1")

    try:
        min_interval = int(os.environ.get("AOS_TASK_EXPORT_MIN_INTERVAL_SEC", "15"))
    except ValueError:
        min_interval = 15

    cache_root = Path(os.environ.get("XDG_CACHE_HOME") or (Path.home() / ".cache")).expanduser()
    state_dir = cache_root / "alphaos"
    lock_path = state_dir / "task-export.lock"
    last_path = state_dir / "task-export.last"

    _mkdirp(state_dir)

    now = int(time.time())
    try:
        if last_path.exists():
            last = int(last_path.read_text(encoding="utf-8").strip() or "0")
            if min_interval > 0 and now - last < min_interval:
                return 0
    except Exception:
        pass

    try:
        import fcntl  # Unix-only; OK on Arch

        lock_fd = lock_path.open("w", encoding="utf-8")
        try:
            fcntl.flock(lock_fd.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except Exception:
            try:
                lock_fd.close()
            except Exception:
                pass
            return 0
    except Exception:
        return 0

    try:
        try:
            if last_path.exists():
                last = int(last_path.read_text(encoding="utf-8").strip() or "0")
                if min_interval > 0 and now - last < min_interval:
                    return 0
        except Exception:
            pass

        args = [task_bin, "rc.verbose=0", "rc.confirmation=no"]
        if export_filter:
            args.extend(export_filter.split())
        args.append("export")

        env = os.environ.copy()
        if taskrc:
            env["TASKRC"] = taskrc

        proc = subprocess.run(args, capture_output=True, text=True, env=env, timeout=8, check=False)
        if proc.returncode != 0:
            return 0

        try:
            exported = json.loads(proc.stdout or "[]")
        except Exception:
            return 0

        if not isinstance(exported, list):
            return 0

        _atomic_write_json(out_path, exported)
        if copy_to_vault:
            _atomic_write_json(vault_path, exported)

        try:
            last_path.write_text(str(now), encoding="utf-8")
        except Exception:
            pass

        return 0
    except Exception:
        return 0
    finally:
        try:
            lock_fd.close()  # type: ignore[name-defined]
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())

