# Changelog

## Unreleased

### Removed

- Agent-only bundle files from the public repo: `rules/`, `skills/`, `commands/`
- Accidental `~/` directory copy from a bad rsync path
- Local absolute-path `mcp.json` from version control (repo uses `npx`; local dev uses `mcp.local.json` / `plugin:mcp-json`)

## 1.0.0 - 2026-05-27

### Added

- **Cursor Context Compress MCP** - Cursor Plugin (`cursor-context-compress-mcp`) and Marketplace `mcp.json` via `npx`
- Unified token savings: `compress_stats`, improved `rtk_gain` (text default), Claw stats store (`~/.cursor/cursor-context-compress-mcp/claw-stats.jsonl`)
- Cursor plugin manifest and MCP wiring (`mcp.json` via `npx`)
- CLI bins: `cursor-context-compress-mcp-doctor`, `cursor-context-compress-mcp-stats`

### Initial

- Dual-engine MCP: 8× RTK tools + 4× Claw tools, engine router, doctor script
