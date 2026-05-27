---
name: cursor-context-compress-mcp-doctor
description: Diagnose RTK, Claw, and MCP setup for Cursor Context Compress MCP.
---

# Cursor Context Compress MCP - Doctor

Run environment diagnostics and print a minimal MCP config.

## Steps

1. In the project terminal, run:
   ```bash
   npx cursor-context-compress-mcp-doctor
   ```
   If developing this repo locally: `npm run doctor`

2. Share the output with the user: RTK path, Python/claw status, build status.

3. If MCP is not connected, suggest installing the **cursor-context-compress-mcp** plugin from Cursor Marketplace, or copying `mcp.json` from the plugin root.

4. If RTK or Claw are missing, offer skill **cursor-context-compress-mcp-setup** - ask before running `brew install` or `pip install`.
