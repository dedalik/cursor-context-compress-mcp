#!/usr/bin/env node
/**
 * Start MCP from the plugin directory (works before npm publish).
 * Cursor should invoke this with cwd = plugin root, or pass an absolute path in args.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(pluginRoot, "dist", "index.js");

if (!fs.existsSync(entry)) {
  console.error(
    `[cursor-context-compress-mcp] Missing build: ${entry}\n` +
      "Run: npm install && npm run build"
  );
  process.exit(1);
}

const child = spawn(process.execPath, [entry], {
  cwd: pluginRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
