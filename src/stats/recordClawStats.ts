import { appendClawRecord, type ClawStatsRecord } from "./clawStore.js";
import { normalizeClawStats } from "./normalizeClawStats.js";

export function recordClawOperation(params: {
  workspace: string;
  op: string;
  tool: string;
  stats?: Record<string, unknown>;
  durationMs: number;
  fallback?: { inputTokens: number; outputTokens: number };
}): void {
  const normalized = normalizeClawStats(params.stats, params.fallback);
  const record: ClawStatsRecord = {
    ts: new Date().toISOString(),
    workspace: params.workspace,
    op: params.op,
    inputTokens: normalized.inputTokens,
    outputTokens: normalized.outputTokens,
    saved: normalized.saved,
    savingsPct: normalized.savingsPct,
    durationMs: params.durationMs,
    tool: params.tool,
  };
  appendClawRecord(record);
}
