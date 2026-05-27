import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runRtk, RtkNotFoundError } from "../rtk/runner.js";
import { formatRtkBody } from "../engines/router.js";
import { mcpTextResult } from "../formatToolResult.js";
import { estimateTokens } from "../tokenCounter.js";
import type { AppDeps } from "../deps.js";

const GIT_SUBCOMMANDS = [
  "status",
  "diff",
  "log",
  "add",
  "commit",
  "push",
  "pull",
  "branch",
  "fetch",
  "stash",
  "show",
] as const;

export function registerGit(server: McpServer, deps: AppDeps): void {
  server.registerTool(
    "rtk_git",
    {
      description: "Run git subcommand through RTK compression",
      inputSchema: z.object({
        subcommand: z.enum(GIT_SUBCOMMANDS),
        args: z.array(z.string()).optional().default([]),
      }),
      annotations: { openWorldHint: true },
    },
    async ({ subcommand, args }) => {
      if (!deps.capabilities.rtk) {
        return mcpTextResult(new RtkNotFoundError().message, {
          engine: "rtk",
          compressedTokens: 0,
        }, true);
      }

      const result = await runRtk(["git", subcommand, ...args], {
        cwd: deps.workspace,
      });
      const body = formatRtkBody(result);
      const isError = result.exitCode !== 0;

      return mcpTextResult(body, {
        engine: "rtk",
        compressedTokens: estimateTokens(body),
        exitCode: result.exitCode,
        command: result.commandLine,
      }, isError);
    }
  );
}
