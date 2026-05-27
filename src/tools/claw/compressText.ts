import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runClaw, ClawNotFoundError } from "../../claw/runner.js";
import { mcpTextResult } from "../../formatToolResult.js";
import { estimateTokens } from "../../tokenCounter.js";
import { recordClawOperation } from "../../stats/recordClawStats.js";
import type { AppDeps } from "../../deps.js";

export function registerClawCompressText(server: McpServer, deps: AppDeps): void {
  server.registerTool(
    "claw_compress_text",
    {
      description: "Compress arbitrary text via Claw Compactor FusionEngine",
      inputSchema: z.object({
        text: z.string(),
        content_type: z
          .enum(["code", "json", "log", "diff", "search", "text"])
          .optional(),
        language: z.string().optional(),
        enable_rewind: z.boolean().optional().default(false),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ text, content_type, language, enable_rewind }) => {
      if (!deps.capabilities.claw) {
        return mcpTextResult(new ClawNotFoundError().message, {
          engine: "claw",
          compressedTokens: 0,
        }, true);
      }

      const before = estimateTokens(text);
      const started = performance.now();
      const result = await runClaw("compress_text", {
        text,
        content_type,
        language,
        enable_rewind,
      });
      const durationMs = performance.now() - started;

      if (!result.ok) {
        return mcpTextResult(result.error ?? "Claw compress failed", {
          engine: "claw",
          compressedTokens: 0,
        }, true);
      }

      const compressed = result.compressed ?? text;
      const after = estimateTokens(compressed);
      const reductionPct = before > 0 ? ((before - after) / before) * 100 : 0;
      const markers = Array.isArray(result.markers) ? result.markers.length : 0;

      recordClawOperation({
        workspace: deps.workspace,
        op: "compress_text",
        tool: "claw_compress_text",
        stats: result.stats,
        durationMs,
        fallback: { inputTokens: before, outputTokens: after },
      });

      return mcpTextResult(compressed, {
        engine: "claw",
        compressedTokens: after,
        estimatedTokens: before,
        reductionPct,
        markers,
      });
    }
  );
}
