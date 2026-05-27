import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runClaw, ClawNotFoundError } from "../../claw/runner.js";
import { mcpTextResult } from "../../formatToolResult.js";
import { estimateTokens } from "../../tokenCounter.js";
import { recordClawOperation } from "../../stats/recordClawStats.js";
import type { AppDeps } from "../../deps.js";

const messageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

export function registerClawCompressMessages(
  server: McpServer,
  deps: AppDeps
): void {
  server.registerTool(
    "claw_compress_messages",
    {
      description: "Compress chat messages array via Claw Compactor",
      inputSchema: z.object({
        messages: z.array(messageSchema).min(1),
        enable_rewind: z.boolean().optional().default(false),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ messages, enable_rewind }) => {
      if (!deps.capabilities.claw) {
        return mcpTextResult(new ClawNotFoundError().message, {
          engine: "claw",
          compressedTokens: 0,
        }, true);
      }

      const before = estimateTokens(JSON.stringify(messages));
      const started = performance.now();
      const result = await runClaw("compress_messages", {
        messages,
        enable_rewind,
      });
      const durationMs = performance.now() - started;

      if (!result.ok) {
        return mcpTextResult(result.error ?? "Claw compress_messages failed", {
          engine: "claw",
          compressedTokens: 0,
        }, true);
      }

      const out = result.messages ?? messages;
      const body = JSON.stringify(out, null, 2);
      const after = estimateTokens(body);
      const reductionPct = before > 0 ? ((before - after) / before) * 100 : 0;
      const markers = Array.isArray(result.markers) ? result.markers.length : 0;

      recordClawOperation({
        workspace: deps.workspace,
        op: "compress_messages",
        tool: "claw_compress_messages",
        stats: result.stats,
        durationMs,
        fallback: { inputTokens: before, outputTokens: after },
      });

      return mcpTextResult(body, {
        engine: "claw",
        compressedTokens: after,
        estimatedTokens: before,
        reductionPct,
        markers,
      });
    }
  );
}
