import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { estimateTokens } from "../tokenCounter.js";
import { mcpTextResult } from "../formatToolResult.js";
import type { AppDeps } from "../deps.js";

export function registerCountTokens(server: McpServer, _deps: AppDeps): void {
  server.registerTool(
    "rtk_count_tokens",
    {
      description: "Estimate token count for text without running RTK or Claw",
      inputSchema: z.object({
        text: z.string().describe("Text to count tokens for"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ text }) => {
      const estimatedTokens = estimateTokens(text);
      return mcpTextResult(text.slice(0, 500) + (text.length > 500 ? "..." : ""), {
        engine: "none",
        estimatedTokens,
        compressedTokens: estimatedTokens,
      });
    }
  );
}
