import { estimateTokens } from "../tokenCounter.js";
import { runClaw } from "../claw/runner.js";
import type { RtkRunResult } from "../rtk/runner.js";
import { shouldRunClawPipeline } from "./thresholds.js";
import type { CompressionEngine } from "../formatToolResult.js";

export interface PipelineResult {
  body: string;
  engine: CompressionEngine;
  reductionPct?: number;
  markers?: number;
}

export async function applyClawPipeline(
  rtkOutput: string,
  postCompress: boolean
): Promise<PipelineResult> {
  if (!shouldRunClawPipeline(rtkOutput, postCompress)) {
    return { body: rtkOutput, engine: "rtk" };
  }

  const before = estimateTokens(rtkOutput);
  const claw = await runClaw("compress_text", { text: rtkOutput });
  if (!claw.ok || !claw.compressed) {
    return { body: rtkOutput, engine: "rtk" };
  }

  const after = estimateTokens(claw.compressed);
  const reductionPct = before > 0 ? ((before - after) / before) * 100 : 0;
  const markers = Array.isArray(claw.markers) ? claw.markers.length : 0;

  return {
    body: claw.compressed,
    engine: "pipeline",
    reductionPct,
    markers,
  };
}

export function formatRtkBody(result: RtkRunResult): string {
  const parts: string[] = [];
  if (result.stdout) parts.push(result.stdout);
  if (result.stderr) parts.push(result.stderr);
  return parts.join("\n").trim() || "(no output)";
}
