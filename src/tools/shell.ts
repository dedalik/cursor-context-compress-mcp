import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runRtk, RtkNotFoundError } from "../rtk/runner.js";
import { hasShellMetacharacters, rewriteCommand } from "../rtk/rewrite.js";
import { applyClawPipeline, formatRtkBody } from "../engines/router.js";
import { isAutoClawEnabled } from "../engines/thresholds.js";
import { mcpTextResult, type CompressionEngine } from "../formatToolResult.js";
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

      let body = formatRtkBody(result);
      let engine: CompressionEngine = "rtk";
      let reductionPct: number | undefined;
      let markers: number | undefined;
      if (deps.capabilities.claw && isAutoClawEnabled()) {
        const piped = await applyClawPipeline(body, true, {
          workspace: deps.workspace,
          tool: "rtk_shell",
          op: "pipeline_shell",
        });
        body = piped.body;
        engine = piped.engine;
        reductionPct = piped.reductionPct;
        markers = piped.markers;
      }
      return mcpTextResult(body, {
        engine,
        compressedTokens: estimateTokens(body),
        reductionPct,
        markers,
        exitCode: result.exitCode,
        command: result.commandLine,
      }, result.exitCode !== 0);
    }
  );
}
