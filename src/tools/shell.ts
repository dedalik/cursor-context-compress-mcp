import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runRtk, RtkNotFoundError } from "../rtk/runner.js";
import { hasShellMetacharacters, rewriteCommand } from "../rtk/rewrite.js";
import { formatRtkBody } from "../engines/router.js";
import { mcpTextResult } from "../formatToolResult.js";
import { estimateTokens } from "../tokenCounter.js";
import type { AppDeps } from "../deps.js";

export function registerShell(server: McpServer, deps: AppDeps): void {
  server.registerTool(
    "rtk_shell",
    {
      description:
        "Run shell command via RTK (rewrite to specialized rtk subcommand, or rtk summary). Blocks shell metacharacters.",
      inputSchema: z.object({
        command: z.string().describe("Shell command to run"),
      }),
      annotations: { destructiveHint: true, openWorldHint: true },
    },
    async ({ command }) => {
      if (!deps.capabilities.rtk) {
        return mcpTextResult(new RtkNotFoundError().message, {
          engine: "rtk",
          compressedTokens: 0,
        }, true);
      }

      if (hasShellMetacharacters(command)) {
        return mcpTextResult(
          "Command rejected: shell metacharacters (;, |, &, `, $(), redirects) are not allowed. Use specific rtk_* tools.",
          { engine: "rtk", compressedTokens: 0 },
          true
        );
      }

      const rewritten = await rewriteCommand(command);
      let result;
      if (rewritten && rewritten.startsWith("rtk ")) {
        const parts = rewritten.slice(4).split(/\s+/);
        result = await runRtk(parts, { cwd: deps.workspace });
      } else {
        result = await runRtk(["summary", command], { cwd: deps.workspace });
      }

      const body = formatRtkBody(result);
      return mcpTextResult(body, {
        engine: "rtk",
        compressedTokens: estimateTokens(body),
        exitCode: result.exitCode,
        command: result.commandLine,
      }, result.exitCode !== 0);
    }
  );
}
