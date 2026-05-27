#!/usr/bin/env node
/**
 * Terminal dashboard: RTK gain + Claw MCP stats (no Cursor required).
 */
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const scope = process.argv.includes("--project") ? "project" : "global";
const cwd = process.env.RTK_WORKSPACE || process.cwd();

const HEADER = [
  "═".repeat(60),
  "  CURSOR CONTEXT COMPRESS MCP - Token Savings",
  "═".repeat(60),
  "",
].join("\n");

async function rtkSection() {
  const args = ["gain"];
  if (scope === "project") args.push("-p");
  try {
    const { stdout } = await execFileAsync("rtk", args, { cwd, maxBuffer: 2 * 1024 * 1024 });
    return stdout.trim();
  } catch (e) {
    return `RTK Token Savings (${scope === "project" ? "Project" : "Global"} Scope)\n${"═".repeat(60)}\n\nRTK not available: ${e.message}\nInstall: brew install rtk`;
  }
}

async function clawSection() {
  try {
    const mod = await import(path.join(root, "dist/stats/formatClawReport.js"));
    return mod.formatClawReport(scope, cwd);
  } catch (e) {
    return `Claw stats unavailable (run npm run build): ${e.message}`;
  }
}

async function main() {
  console.log(HEADER);
  console.log(await rtkSection());
  console.log("");
  console.log(await clawSection());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
