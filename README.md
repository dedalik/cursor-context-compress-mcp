# Cursor Context Compress MCP

**Package:** `cursor-context-compress-mcp` - dual-engine MCP server and **Cursor Plugin** for [Cursor](https://cursor.com): **RTK** compresses command output (git, shell, grep); **Claw Compactor** compresses text and chat messages.

[![CI](https://github.com/radiks/cursor-context-compress-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/radiks/cursor-context-compress-mcp/actions/workflows/ci.yml)

## Install (users - Marketplace)

1. Install **Cursor Context Compress MCP** from [Cursor Marketplace](https://cursor.com/marketplace) (or symlink for local test below).
2. MCP starts automatically via `npx -y cursor-context-compress-mcp` - no local `npm run build` required.
3. Optional: install [RTK](https://github.com/rtk-ai/rtk) and [Claw Compactor](https://github.com/open-compress/claw-compactor) for full compression.
4. Run `/cursor-context-compress-mcp-doctor` or `npx cursor-context-compress-mcp-doctor`.

### Local plugin test (before publish)

```bash
npm install && npm run build && npm run validate:plugin
ln -sf "$(pwd)" ~/.cursor/plugins/local/cursor-context-compress-mcp
# Reload Cursor → Settings → Plugins
```

See [docs/marketplace-submission.md](docs/marketplace-submission.md) for publish checklist.

## Install (developers - this repo)

```bash
npm install
npm run build
npm run doctor
```

Use [docs/examples/mcp-manual-dev.json](docs/examples/mcp-manual-dev.json) for `node dist/index.js` wiring.

## Viewing token savings

| Method | What you get |
|--------|----------------|
| MCP `compress_stats` | **RTK** (`rtk gain` report) + **Claw** (MCP session stats) in one dashboard |
| MCP `rtk_gain` | RTK only - human-readable by default (`format: json` for summary JSON) |
| `/cursor-context-compress-mcp-stats` | Plugin command → agent calls `compress_stats` |
| Terminal | `npm run stats` or `npx cursor-context-compress-mcp-stats` (`--project` for workspace scope) |

**RTK** stats are read from the native `rtk gain` CLI (global or project scope).

**Claw** stats are accumulated when you use `claw_compress_text` / `claw_compress_messages`, stored in:

`~/.cursor/cursor-context-compress-mcp/claw-stats.jsonl` (override: `CONTEXT_COMPRESS_STATS_DIR`).

Only numeric metrics are stored - not compressed content.

## MCP tools (13)

| Task | Tool |
|------|------|
| `git status`, `git diff`, `git log` | `rtk_git` |
| Read file (RTK filtering) | `rtk_read` |
| List / grep / find | `rtk_ls`, `rtk_grep`, `rtk_find` |
| Arbitrary shell command | `rtk_shell` |
| RTK savings only | `rtk_gain` |
| **RTK + Claw savings** | `compress_stats` |
| Token estimate only | `rtk_count_tokens` |
| Compress text / JSON | `claw_compress_text` |
| Compress message history | `claw_compress_messages` |
| Restore compressed section | `claw_rewind` |
| Workspace compression report | `claw_workspace_benchmark` |

### Pipeline

`rtk_read` accepts `post_compress: true`. Large RTK output (≥800 tokens by default) can pass through Claw (`engine=pipeline` in footer). Set `CLAW_PIPELINE_THRESHOLD` in MCP `env`.

## Marketplace `mcp.json`

```json
{
  "mcpServers": {
    "cursor-context-compress-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "cursor-context-compress-mcp"],
      "env": {
        "RTK_WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
```

## RTK vs Claw vs hooks

- **RTK hooks** (`rtk init -g --agent cursor`): auto-rewrites Shell commands.
- **Cursor Context Compress MCP**: explicit MCP tools; `rtk_read` / `rtk_grep`; Claw for text/messages.

Avoid running the same operation via hooks and MCP twice.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| RTK tools fail | `npx cursor-context-compress-mcp-doctor`; set `RTK_BIN` in MCP env |
| Claw tools fail | `pip install claw-compactor`; set `PYTHON_BIN` |
| No Claw stats | Use `claw_compress_*` first; then `compress_stats` |
| Server not listed | Reload MCP; check MCP Logs |

## Development

```bash
npm test
npm run test:integration
npm run validate:plugin
npm pack --dry-run
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Publish to GitHub

```bash
git remote add origin https://github.com/YOUR_USER/cursor-context-compress-mcp.git
git push -u origin main
```

If your GitHub username is not `radiks`, update `repository` / `homepage` in `package.json` and `.cursor-plugin/plugin.json`.

## License

MIT
