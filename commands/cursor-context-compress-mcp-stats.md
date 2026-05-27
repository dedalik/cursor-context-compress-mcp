---
name: cursor-context-compress-mcp-stats
description: Show unified token savings for Cursor Context Compress MCP (RTK + Claw).
---

# Cursor Context Compress MCP - Stats

Show how many tokens RTK and Claw have saved.

## Steps

1. Call MCP tool **`compress_stats`** with:
   - `engines`: `"all"`
   - `scope`: `"project"` (current workspace) unless user asked for global
   - `format`: `"text"`

2. Present the full report to the user (RTK block + Claw block).

3. If RTK is missing, explain RTK is optional and show the Claw section only.

4. Terminal alternative:
   ```bash
   npx cursor-context-compress-mcp-stats
   ```
   Add `--project` for project scope.
