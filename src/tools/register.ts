import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppDeps } from "../deps.js";
import { registerShell } from "./shell.js";
import { registerGit } from "./git.js";
import { registerFiles } from "./files.js";
import { registerStats } from "./stats.js";
import { registerCompressStats } from "./compressStats.js";
import { registerCountTokens } from "./countTokens.js";
import { registerClawCompressText } from "./claw/compressText.js";
import { registerClawCompressMessages } from "./claw/compressMessages.js";
import { registerClawRewind } from "./claw/rewind.js";
import { registerClawBenchmark } from "./claw/benchmark.js";

export function registerAllTools(server: McpServer, deps: AppDeps): void {
  registerShell(server, deps);
  registerGit(server, deps);
  registerFiles(server, deps);
  registerStats(server, deps);
  registerCompressStats(server, deps);
  registerCountTokens(server, deps);

  registerClawCompressText(server, deps);
  registerClawCompressMessages(server, deps);
  registerClawRewind(server, deps);
  registerClawBenchmark(server, deps);
}

export const TOOL_NAMES = [
  "rtk_shell",
  "rtk_git",
  "rtk_read",
  "rtk_ls",
  "rtk_grep",
  "rtk_find",
  "rtk_gain",
  "compress_stats",
  "rtk_count_tokens",
  "claw_compress_text",
  "claw_compress_messages",
  "claw_rewind",
  "claw_workspace_benchmark",
] as const;
