# Cursor Marketplace submission - Cursor Context Compress MCP

## Product summary (for publish form)

**Cursor Context Compress MCP** (`cursor-context-compress-mcp`) is a Cursor plugin that connects a dual-engine MCP server: **RTK** compresses command output (git, shell, grep), **Claw Compactor** compresses text and chat messages. One-click MCP via `npx`; optional RTK/Claw CLI installs for full compression. Includes unified **token savings** dashboard (`compress_stats`).

## Checklist

- [x] Open source (MIT) - `LICENSE`
- [x] `.cursor-plugin/plugin.json` - name `cursor-context-compress-mcp`
- [x] Logo - `assets/logo.svg`
- [x] `mcp.json` - stdio + `npx -y cursor-context-compress-mcp`
- [x] `CHANGELOG.md`
- [x] `repository` / `homepage` in `plugin.json` (update GitHub username if forked)
- [ ] `npm publish` package `cursor-context-compress-mcp`
- [ ] Demo screenshot / GIF of `compress_stats` output
- [ ] Submit: https://cursor.com/marketplace/publish

## Security notes (for reviewers)

- MCP tools use `execFile` / `spawn` with `shell: false` - no shell injection
- `rtk_shell` blocks shell metacharacters in the command string
- File paths validated against `RTK_WORKSPACE`
- Claw stats store writes **numeric metrics only** - no compressed content text
- Plugin does **not** auto-download or install RTK/Claw binaries

## Honest UX

| Component | Install |
|-----------|---------|
| Node MCP (13 tools) | Automatic via plugin / npx |
| RTK | User: `brew install rtk` (optional) |
| Claw | User: `pip install claw-compactor` (optional) |

## Local test before submit

```bash
npm install && npm run build && npm test && npm run validate:plugin
ln -sf "$(pwd)" ~/.cursor/plugins/local/cursor-context-compress-mcp
# Reload Cursor → Settings → Plugins
```

## Test plan

1. Install plugin locally via symlink
2. Confirm MCP `cursor-context-compress-mcp` shows 13 tools
3. `rtk_git status` (with RTK installed)
4. `compress_stats` - RTK + Claw sections
5. `npx cursor-context-compress-mcp-doctor`

## Links

- [Cursor Plugins docs](https://cursor.com/docs/plugins)
- [RTK](https://github.com/rtk-ai/rtk)
- [Claw Compactor](https://github.com/open-compress/claw-compactor)
