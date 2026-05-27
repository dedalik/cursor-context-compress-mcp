import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runClaw, ClawNotFoundError } from "../../claw/runner.js";
import { mcpTextResult } from "../../formatToolResult.js";
import { estimateTokens } from "../../tokenCounter.js";
import type { AppDeps } from "../../deps.js";

export function registerClawBenchmark(server: McpServer, deps: AppDeps): void {
  server.registerTool(
    "claw_workspace_benchmark",
    {
      description: "Dry-run Claw Compactor workspace benchmark (non-destructive)",
      inputSchema: z.object({
        workspace: z.string().optional().describe("Defaults to RTK_WORKSPACE"),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ workspace }) => {
      if (!deps.capabilities.claw) {
        return mcpTextResult(new ClawNotFoundError().message, {
          engine: "claw",
          compressedTokens: 0,
        }, true);
      }

      const ws = workspace ?? deps.workspace;
      const result = await runClaw("workspace_benchmark", { workspace: ws });
      const body = JSON.stringify(
        { summary: result.summary, stats: result.stats, error: result.error },
        null,
        2
      );

      return mcpTextResult(body, {
        engine: "claw",
        compressedTokens: estimateTokens(body),
      }, !result.ok);
    }
  );
}
