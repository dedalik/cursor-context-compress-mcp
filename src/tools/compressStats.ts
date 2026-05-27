import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runClaw } from "../claw/runner.js";
import { mcpTextResult } from "../formatToolResult.js";
import { estimateTokens } from "../tokenCounter.js";
import type { AppDeps } from "../deps.js";
import {
  clawAggregateForJson,
  formatClawReport,
} from "../stats/formatClawReport.js";
import { fetchRtkGainReport, rtkGainSectionTitle } from "../stats/rtkGain.js";
import type { StatsScope } from "../stats/clawStore.js";
import { PROJECT_DISPLAY } from "../constants.js";

const HEADER = [
  "═".repeat(60),
  `  ${PROJECT_DISPLAY.toUpperCase()} - Token Savings`,
  "═".repeat(60),
  "",
].join("\n");

export function registerCompressStats(server: McpServer, deps: AppDeps): void {
  server.registerTool(
    "compress_stats",
    {
      description:
        "Unified token savings dashboard: RTK (rtk gain) + Claw (MCP session stats). Human-readable by default.",
      inputSchema: z.object({
        engines: z.enum(["all", "rtk", "claw"]).default("all"),
        scope: z.enum(["global", "project"]).default("global"),
        format: z.enum(["text", "json"]).default("text"),
        includeBenchmark: z
          .boolean()
          .default(false)
          .describe("Append Claw workspace benchmark snapshot for current workspace"),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ engines, scope, format, includeBenchmark }) => {
      const sections: string[] = [];
      let isError = false;

      const jsonPayload: Record<string, unknown> = {
        scope,
        engines,
      };

      if (format === "text") {
        sections.push(HEADER);
      }

      if (engines === "all" || engines === "rtk") {
        const rtk = await fetchRtkGainReport({
          cwd: deps.workspace,
          scope: scope as StatsScope,
          format: format === "json" ? "json" : "text",
        });
        if (format === "text") {
          if (!rtk.missing && !rtk.isError) {
            sections.push(rtk.body.trim());
          } else {
            sections.push(rtkGainSectionTitle(scope as StatsScope));
            sections.push("═".repeat(60));
            sections.push("");
            sections.push(rtk.body.trim());
          }
          sections.push("");
        }
        jsonPayload.rtk = format === "json" ? tryParseJson(rtk.body) : rtk.body;
        if (engines === "rtk" && rtk.isError) isError = true;
      }

      if (engines === "all" || engines === "claw") {
        if (format === "text") {
          sections.push(formatClawReport(scope as StatsScope, deps.workspace));
          sections.push("");
        }
        jsonPayload.claw = clawAggregateForJson(scope as StatsScope, deps.workspace);
      }

      if (includeBenchmark && deps.capabilities.claw) {
        const bench = await runClaw("workspace_benchmark", {
          workspace: deps.workspace,
        });
        const benchText = bench.ok
          ? JSON.stringify({ summary: bench.summary, stats: bench.stats }, null, 2)
          : `Benchmark failed: ${bench.error ?? "unknown"}`;
        if (format === "text") {
          sections.push("Claw Workspace Benchmark (snapshot)");
          sections.push("─".repeat(60));
          sections.push(benchText);
          sections.push("");
        }
        jsonPayload.benchmark = bench.ok
          ? { summary: bench.summary, stats: bench.stats }
          : { error: bench.error };
      }

      if (format === "json") {
        const rtkSummary = jsonPayload.rtk;
        const clawAgg =
          engines === "all" || engines === "claw"
            ? clawAggregateForJson(scope as StatsScope, deps.workspace)
            : undefined;
        const rtkBlock =
          typeof rtkSummary === "object" && rtkSummary !== null
            ? (rtkSummary as { summary?: { total_saved?: number; total_input?: number } })
            : undefined;
        const rtkSaved =
          typeof rtkBlock?.summary?.total_saved === "number"
            ? rtkBlock.summary.total_saved
            : 0;
        const clawSaved = clawAgg?.saved ?? 0;
        const combinedInput =
          (typeof rtkBlock?.summary?.total_input === "number"
            ? rtkBlock.summary.total_input
            : 0) + (clawAgg?.inputTokens ?? 0);
        const combinedSaved = rtkSaved + clawSaved;
        jsonPayload.combined = {
          saved: combinedSaved,
          savingsPct:
            combinedInput > 0 ? (combinedSaved / combinedInput) * 100 : 0,
        };
        return mcpTextResult(JSON.stringify(jsonPayload, null, 2), {
          engine: "none",
          compressedTokens: estimateTokens(JSON.stringify(jsonPayload)),
        });
      }

      const body = sections.join("\n").trimEnd();
      return mcpTextResult(body, {
        engine: "none",
        compressedTokens: estimateTokens(body),
      }, isError);
    }
  );
}

function tryParseJson(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}
