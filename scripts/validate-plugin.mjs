#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_NAME = "cursor-context-compress-mcp";
let errors = 0;

function fail(msg) {
  console.error(`✗ ${msg}`);
  errors += 1;
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function readJson(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fail(`Missing ${rel}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    fail(`Invalid JSON: ${rel} - ${e.message}`);
    return null;
  }
}

const plugin = readJson(".cursor-plugin/plugin.json");
if (plugin) {
  if (plugin.name !== PROJECT_NAME) {
    fail(`plugin.json name must be ${PROJECT_NAME}, got: ${plugin.name}`);
  } else {
    ok(`plugin name: ${plugin.name}`);
  }
  if (!plugin.displayName?.includes("Cursor Context Compress MCP")) {
    fail("plugin.json displayName should be Cursor Context Compress MCP");
  } else {
    ok(`displayName: ${plugin.displayName}`);
  }
  if (!plugin.version) fail("plugin.json missing version");
  const logo = plugin.logo;
  if (!logo || !fs.existsSync(path.join(root, logo))) {
    fail(`logo missing: ${logo}`);
  } else {
    ok(`logo: ${logo}`);
  }
}

const mcp = readJson("mcp.json");
if (mcp?.mcpServers?.[PROJECT_NAME]) {
  const s = mcp.mcpServers[PROJECT_NAME];
  const args = s.args ?? [];
  if (s.command === "npx" && args.includes(PROJECT_NAME)) {
    ok("mcp.json uses npx (publishable template)");
  } else {
    fail(
      "mcp.json should use npx -y cursor-context-compress-mcp (not local absolute paths)"
    );
  }
} else {
  fail(`mcp.json missing ${PROJECT_NAME} server`);
}

const pkg = readJson("package.json");
if (pkg && plugin && pkg.version !== plugin.version) {
  fail(`version mismatch package.json (${pkg.version}) vs plugin.json (${plugin.version})`);
} else if (pkg && plugin) {
  ok(`version sync: ${pkg.version}`);
}

if (!fs.existsSync(path.join(root, "LICENSE"))) fail("Missing LICENSE");
else ok("LICENSE");

const hookScript = path.join(root, "scripts", "claw-post-tool-hook.mjs");
if (!fs.existsSync(hookScript)) fail("Missing scripts/claw-post-tool-hook.mjs");
else ok("scripts/claw-post-tool-hook.mjs");

if (!fs.existsSync(path.join(root, "dist", "index.js"))) {
  fail("dist/index.js missing - run npm run build");
} else {
  ok("dist/index.js");
}

if (errors > 0) {
  console.error(`\n${errors} validation error(s)`);
  process.exit(1);
}

console.log("\nPlugin validation passed.");
