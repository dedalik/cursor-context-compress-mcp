#!/usr/bin/env python3
"""JSON stdin/stdout bridge for Claw Compactor FusionEngine."""

from __future__ import annotations

import json
import sys
from typing import Any

# Module-level rewind store (lives for MCP process lifetime)
_REWIND_STORE: dict[str, str] = {}


def _read_input() -> dict[str, Any]:
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    return json.loads(raw)


def _emit(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def _error(message: str) -> None:
    _emit({"ok": False, "error": message})
    sys.exit(1)


def action_probe(_: dict[str, Any]) -> None:
    try:
        from claw_compactor.fusion.engine import FusionEngine  # type: ignore

        engine = FusionEngine()
        _emit(
            {
                "ok": True,
                "version": getattr(engine, "version", "unknown"),
                "fusion_stages": 14,
            }
        )
    except ImportError as e:
        _error(f"claw_compactor not installed: {e}")


def action_compress_text(data: dict[str, Any]) -> None:
    text = data.get("text", "")
    if not isinstance(text, str):
        _error("text must be a string")

    content_type = data.get("content_type")
    language = data.get("language")
    enable_rewind = bool(data.get("enable_rewind", False))

    try:
        from claw_compactor.fusion.engine import FusionEngine  # type: ignore

        engine = FusionEngine(enable_rewind=enable_rewind)
        kwargs: dict[str, Any] = {}
        if content_type:
            kwargs["content_type"] = content_type
        if language:
            kwargs["language"] = language

        result = engine.compress(text, **kwargs)
        compressed = result.get("compressed", text)
        stats = result.get("stats", {})
        markers = result.get("markers", [])

        if enable_rewind and markers:
            for m in markers:
                mid = m.get("id") if isinstance(m, dict) else str(m)
                if mid:
                    _REWIND_STORE[str(mid)] = text

        _emit(
            {
                "ok": True,
                "compressed": compressed,
                "stats": stats,
                "markers": markers if isinstance(markers, list) else [],
            }
        )
    except Exception as e:
        _error(str(e))


def action_compress_messages(data: dict[str, Any]) -> None:
    messages = data.get("messages", [])
    if not isinstance(messages, list):
        _error("messages must be an array")

    enable_rewind = bool(data.get("enable_rewind", False))

    try:
        from claw_compactor.fusion.engine import FusionEngine  # type: ignore

        engine = FusionEngine(enable_rewind=enable_rewind)
        result = engine.compress_messages(messages)
        out_messages = result.get("messages", messages)
        stats = result.get("stats", {})
        markers = result.get("markers", [])

        _emit(
            {
                "ok": True,
                "messages": out_messages,
                "stats": stats,
                "markers": markers if isinstance(markers, list) else [],
            }
        )
    except Exception as e:
        _error(str(e))


def action_rewind(data: dict[str, Any]) -> None:
    marker_id = data.get("marker_id")
    if not marker_id:
        _error("marker_id required")

    content = _REWIND_STORE.get(str(marker_id))
    if content is None:
        try:
            from claw_compactor.fusion.engine import FusionEngine  # type: ignore

            engine = FusionEngine(enable_rewind=True)
            store = getattr(engine, "rewind_store", None)
            if store and hasattr(store, "retrieve"):
                content = store.retrieve(str(marker_id))
        except Exception:
            content = None

    if content is None:
        _error(f"marker not found: {marker_id}")

    _emit({"ok": True, "content": content})


def action_workspace_benchmark(data: dict[str, Any]) -> None:
    workspace = data.get("workspace", ".")
    try:
        import subprocess

        proc = subprocess.run(
            ["claw-compactor", str(workspace), "benchmark", "--quiet"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        summary = {
            "exit_code": proc.returncode,
            "stdout": proc.stdout[-4000:] if proc.stdout else "",
            "stderr": proc.stderr[-2000:] if proc.stderr else "",
        }
        _emit({"ok": proc.returncode == 0, "summary": summary, "stats": {}})
    except FileNotFoundError:
        _error("claw-compactor CLI not in PATH")
    except Exception as e:
        _error(str(e))


def main() -> None:
    if len(sys.argv) < 2:
        _error("usage: claw_bridge.py <action>")

    action = sys.argv[1]
    data = _read_input()

    handlers = {
        "probe": action_probe,
        "compress_text": action_compress_text,
        "compress_messages": action_compress_messages,
        "rewind": action_rewind,
        "workspace_benchmark": action_workspace_benchmark,
    }

    handler = handlers.get(action)
    if not handler:
        _error(f"unknown action: {action}")

    handler(data)


if __name__ == "__main__":
    main()
