import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runClaw, ClawNotFoundError } from "../../claw/runner.js";
import { mcpTextResult } from "../../formatToolResult.js";
import { estimateTokens } from "../../tokenCounter.js";
import type { AppDeps } from "../../deps.js";

export function registerClawRewind(server: McpServer, deps: AppDeps): void {
  server.registerTool(
    "claw_rewind",
    {
      description:
        "Retrieve original content by rewind marker id (same MCP session; requires enable_rewind on prior compress)",
      inputSchema: z.object({
        marker_id: z.string(),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ marker_id }) => {
      if (!deps.capabilities.claw) {
        return mcpTextResult(new ClawNotFoundError().message, {
          engine: "claw",
          compressedTokens: 0,
        }, true);
      }

      const result = await runClaw("rewind", { marker_id });
      if (!result.ok || !result.content) {
        return mcpTextResult(result.error ?? "Rewind failed - marker not found", {
          engine: "claw",
          compressedTokens: 0,
        }, true);
      }

      return mcpTextResult(result.content, {
        engine: "claw",
        compressedTokens: estimateTokens(result.content),
      });
    }
  );
}
