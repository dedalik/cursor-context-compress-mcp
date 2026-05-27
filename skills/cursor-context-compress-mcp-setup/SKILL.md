---
name: cursor-context-compress-mcp-setup
description: Install and verify RTK + Claw + Cursor Context Compress MCP. Use when compression tools fail or on first plugin setup.
---

# Cursor Context Compress MCP - setup

## When to use

- `rtk_*` returns RTK not found
- `claw_*` returns Claw not found
- User asks how to enable compression

## Steps

1. **MCP** - If using the Cursor Plugin, MCP is already wired via `npx -y cursor-context-compress-mcp`. For local dev, see `docs/examples/mcp-manual-dev.json`.

2. **Doctor** - Run in terminal:
   ```bash
   npx cursor-context-compress-mcp-doctor
   ```
   Or from repo: `npm run doctor`

3. **RTK** (optional, for command output):
   ```bash
   brew install rtk
   ```

4. **Claw** (optional, for text/messages):
   ```bash
   pip install claw-compactor
   ```
   Set `PYTHON_BIN` in MCP env if Cursor cannot find the same Python.

5. **Verify** - Reload MCP in Cursor. Call `compress_stats` or `rtk_gain`.

Do **not** run install commands without telling the user first.
