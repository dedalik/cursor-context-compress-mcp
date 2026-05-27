import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mcpTextResult } from "../formatToolResult.js";
import { estimateTokens } from "../tokenCounter.js";
import type { AppDeps } from "../deps.js";
import { fetchRtkGainReport } from "../stats/rtkGain.js";

export function registerStats(server: McpServer, deps: AppDeps): void {
  server.registerTool(
    "rtk_gain",
    {
      description:
        "Show RTK token savings (rtk gain). Default: human-readable report with By Command table. Use format=json for summary JSON.",
      inputSchema: z.object({
        scope: z
          .enum(["global", "project"])
          .default("global")
          .describe("global = all projects; project = current workspace only"),
        format: z
          .enum(["text", "json"])
          .default("text")
          .describe("text = full RTK report; json = summary only"),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ scope, format }) => {
      const report = await fetchRtkGainReport({
        cwd: deps.workspace,
        scope,
        format,
      });

      return mcpTextResult(report.body, {
        engine: "rtk",
        compressedTokens: estimateTokens(report.body),
        exitCode: report.exitCode,
      }, report.isError);
    }
  );
}
