#!/usr/bin/env node
/**
 * Writes mcp.json with an absolute path to dist/index.js.
 * Cursor resolves relative MCP args from the wrong cwd (often $HOME), so local plugins need this.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localPluginDir = path.join(
  os.homedir(),
  ".cursor/plugins/local/cursor-context-compress-mcp"
);

function pickPluginRoot() {
  const candidates = [localPluginDir, repoRoot];
  for (const dir of candidates) {
    const entry = path.join(dir, "dist", "index.js");
    if (fs.existsSync(entry)) return dir;
  }
  return repoRoot;
}

function buildMcpJson(entryPath) {
  return {
    mcpServers: {
      "cursor-context-compress-mcp": {
        type: "stdio",
        command: "node",
        args: [entryPath],
        env: {
          RTK_WORKSPACE: "${workspaceFolder}",
          CLAW_AUTO_ALL: "1",
          CLAW_PIPELINE_THRESHOLD: "1",
        },
      },
    },
  };
}

const pluginRoot = pickPluginRoot();
const entry = path.join(pluginRoot, "dist", "index.js");

if (!fs.existsSync(entry)) {
  console.error(`Missing ${entry}\nRun: npm install && npm run build`);
  process.exit(1);
}

const payload = buildMcpJson(entry);
const json = `${JSON.stringify(payload, null, 2)}\n`;

const targets = [
  path.join(localPluginDir, "mcp.json"),
  path.join(repoRoot, "mcp.local.json"),
];

for (const out of targets) {
  const dir = path.dirname(out);
  if (dir === localPluginDir && !fs.existsSync(dir)) continue;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(out, json, "utf8");
  console.log(`Wrote ${out}`);
}
