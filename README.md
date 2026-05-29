# Cursor Context Compress MCP

**Package:** `cursor-context-compress-mcp` - dual-engine MCP server and **Cursor Plugin** for [Cursor](https://cursor.com): **RTK** compresses command output (git, shell, grep); **Claw Compactor** compresses text and chat messages.

[![CI](https://github.com/radiks/cursor-context-compress-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/radiks/cursor-context-compress-mcp/actions/workflows/ci.yml)

## Install (users - Marketplace)

1. Install **Cursor Context Compress MCP** from [Cursor Marketplace](https://cursor.com/marketplace) (or symlink for local test below).
2. After npm publish: MCP via `npx -y cursor-context-compress-mcp`. **Before publish (local plugin):** `mcp.json` runs `node scripts/run-mcp-server.mjs` from the plugin folder (`npm run build` required).
3. Optional: install [RTK](https://github.com/rtk-ai/rtk) and [Claw Compactor](https://github.com/open-compress/claw-compactor) for full compression.
4. Run `npx cursor-context-compress-mcp-doctor` (or `npm run doctor` in this repo).

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
| Terminal | `npm run stats` or `npx cursor-context-compress-mcp-stats` (default: global; `--project` for workspace scope) |

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

## MCP wiring

**GitHub / Marketplace** - committed `mcp.json` uses `npx -y cursor-context-compress-mcp` (after npm publish).

**Local plugin (before npm publish)**:

```bash
npm run build
npm run plugin:sync
```

`plugin:sync` copies the repo to `~/.cursor/plugins/local/cursor-context-compress-mcp/` and writes a **local** `mcp.json` there with `node` + absolute `dist/index.js` (also `mcp.local.json` in the repo root, gitignored).

If MCP logs show `404 Not Found` on npm, the package is not published yet - use `plugin:sync` and reload Cursor.

## RTK vs Claw vs hooks

- **RTK hooks** (`rtk init -g --agent cursor`): auto-rewrites Shell commands.
- **Cursor Context Compress MCP**: explicit MCP tools; `rtk_read` / `rtk_grep`; Claw for text/messages.

Avoid running the same operation via hooks and MCP twice.

## Aggressive auto-Claw mode

To auto-run Claw over RTK outputs (git/shell/read/ls/grep/find), set MCP env:

```json
{
  "env": {
    "CLAW_AUTO_ALL": "1",
    "CLAW_PIPELINE_THRESHOLD": "1"
  }
}
```

- `CLAW_AUTO_ALL=1` enables auto pipeline on RTK tools.
- `CLAW_PIPELINE_THRESHOLD` controls minimum token size before Claw runs (`800` default).

## Recommended usage (closest to "compress everything")

1. Enable plugin and reload Cursor window.
2. Keep RTK hook enabled: `rtk init -g --agent cursor --hook-only --auto-patch`.
3. Ensure MCP env has:
   - `RTK_WORKSPACE=${workspaceFolder}`
   - `CLAW_AUTO_ALL=1`
   - `CLAW_PIPELINE_THRESHOLD=1`
4. Verify setup: `npm run doctor` and `npm run stats`.
5. Verify pipeline is active:
   - tool footer should show `engine=pipeline`
   - `npm run stats` should show Claw operations > 0

Note: MCP cannot intercept all base model chat traffic in Cursor. It compresses tool-call flows (RTK/Claw), not every message sent to Cursor backend.

## Claw via Cursor hooks (RTK-like coverage)

To compress **Shell / Read / Grep** outputs automatically (not only MCP tools):

```bash
npm run plugin:install-hooks
```

This adds a `postToolUse` entry to `~/.cursor/hooks.json` that runs `scripts/claw-post-tool-hook.mjs`, records Claw stats, and injects a compressed summary into agent context.

Then **Reload Window** and run `npm run stats` - Claw `Total operations` should increase during normal agent work.

**Why Claw stats look smaller than RTK:** RTK compresses at `preToolUse` on every Shell command (~90% savings). The Claw hook runs **after** on output that RTK already shrank, so second-pass savings are often ~20-40% (`hook_shell_post_rtk`). That is expected, not a failure.

Hook modes (`CLAW_HOOK_MODE`):

| Mode | Behavior |
|------|----------|
| `smart` (default) | Record stats; inject summary only when compression is strong enough |
| `stats-only` | Record stats only (no extra context in chat) |
| `inject` | Always inject summary (can duplicate tokens with raw Shell output) |
| `off` | Disable hook |

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
