---
name: cursor-context-compress-mcp-stats
description: Show unified RTK + Claw token savings for Cursor Context Compress MCP. Use when user asks about tokens saved, gain, stats, or compression efficiency.
---

# Cursor Context Compress MCP - token savings

## When to use

User asks: сколько сэкономили токенов, show stats, rtk gain, compression savings, efficiency.

## Action

Call MCP tool **`compress_stats`**:

```json
{
  "engines": "all",
  "scope": "project",
  "format": "text"
}
```

Use `scope: "global"` if they want machine-wide RTK stats.

For RTK-only: `rtk_gain` with `format: "text"`.

## Notes

- RTK stats come from native `rtk gain` (includes By Command table).
- Claw stats are accumulated from MCP `claw_compress_*` calls in `~/.cursor/cursor-context-compress-mcp/claw-stats.jsonl`.
