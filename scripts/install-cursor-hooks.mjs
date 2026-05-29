#!/usr/bin/env node
/**
 * Adds claw postToolUse hook to ~/.cursor/hooks.json (keeps existing hooks like RTK).
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
  const hookInRepo = path.join(repoRoot, "scripts", "claw-post-tool-hook.mjs");
  if (fs.existsSync(hookInRepo)) return repoRoot;
  const hookInLocal = path.join(localPluginDir, "scripts", "claw-post-tool-hook.mjs");
  if (fs.existsSync(hookInLocal)) return localPluginDir;
  return repoRoot;
}

const pluginRoot = pickPluginRoot();
const hookScript = path.join(pluginRoot, "scripts", "claw-post-tool-hook.mjs");
const hooksPath = path.join(os.homedir(), ".cursor", "hooks.json");

if (!fs.existsSync(hookScript)) {
  console.error(`Missing ${hookScript}`);
  process.exit(1);
}

let config = { version: 1, hooks: {} };
if (fs.existsSync(hooksPath)) {
  try {
    config = JSON.parse(fs.readFileSync(hooksPath, "utf8"));
  } catch (e) {
    console.error(`Invalid ${hooksPath}: ${e.message}`);
    process.exit(1);
  }
}

config.version = 1;
config.hooks ??= {};

const matcher =
  process.env.CLAW_HOOK_MATCHER ?? "Shell|Read|Grep|Task";
const entry = {
  command: `node "${hookScript}"`,
  matcher,
  timeout: 120,
};

const post = (config.hooks.postToolUse ?? []).filter(
  (h) => !String(h.command ?? "").includes("claw-post-tool-hook.mjs")
);
post.push(entry);
config.hooks.postToolUse = post;

fs.mkdirSync(path.dirname(hooksPath), { recursive: true });
fs.writeFileSync(hooksPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

console.log(`Updated ${hooksPath}`);
console.log(`  postToolUse → ${hookScript}`);
console.log(`  matcher: ${matcher}`);
console.log("\nReload Cursor (Developer: Reload Window), then run a large Shell/Read command.");
console.log("Check stats: npm run stats");
