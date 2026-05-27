# Contributing to Cursor Context Compress MCP

## Development setup

```bash
git clone https://github.com/radiks/cursor-context-compress-mcp.git
cd cursor-context-compress-mcp
npm install
npm run build
npm test
```

## Before opening a PR

```bash
npm run build
npm test
npm run validate:plugin
```

## Local plugin test

```bash
npm link
ln -sf "$(pwd)" ~/.cursor/plugins/local/cursor-context-compress-mcp
# Reload Cursor
```

## Code style

- TypeScript strict mode, ESM (`"type": "module"`)
- Match existing patterns in `src/tools/` and `src/rtk/`
- Add tests for new behavior under `test/`
