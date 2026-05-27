export interface NormalizedClawStats {
  inputTokens: number;
  outputTokens: number;
  saved: number;
  savingsPct: number;
}

function pickNum(obj: Record<string, unknown> | undefined, keys: string[]): number {
  if (!obj) return 0;
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

/** Map FusionEngine / bridge stats objects to stable numeric fields. */
export function normalizeClawStats(
  raw: Record<string, unknown> | undefined,
  fallback?: { inputTokens: number; outputTokens: number }
): NormalizedClawStats {
  const inputTokens =
    pickNum(raw, [
      "input_tokens",
      "original_tokens",
      "tokens_in",
      "input",
      "before_tokens",
    ]) || fallback?.inputTokens || 0;

  const outputTokens =
    pickNum(raw, [
      "output_tokens",
      "compressed_tokens",
      "tokens_out",
      "output",
      "after_tokens",
    ]) || fallback?.outputTokens || 0;

  let saved = pickNum(raw, ["tokens_saved", "saved", "saved_tokens"]);
  if (saved <= 0 && inputTokens > 0 && outputTokens >= 0) {
    saved = Math.max(0, inputTokens - outputTokens);
  }

  let savingsPct = pickNum(raw, [
    "savings_pct",
    "savings_percent",
    "reduction_pct",
    "compression_ratio",
  ]);
  if (savingsPct > 0 && savingsPct <= 1) {
    savingsPct *= 100;
  }
  if (savingsPct <= 0 && inputTokens > 0) {
    savingsPct = (saved / inputTokens) * 100;
  }

  return { inputTokens, outputTokens, saved, savingsPct };
}
