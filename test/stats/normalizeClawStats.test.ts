import { describe, expect, it } from "vitest";
import { normalizeClawStats } from "../../src/stats/normalizeClawStats.js";

describe("normalizeClawStats", () => {
  it("reads input_tokens and output_tokens", () => {
    const n = normalizeClawStats({
      input_tokens: 100,
      output_tokens: 30,
      tokens_saved: 70,
      savings_pct: 70,
    });
    expect(n.inputTokens).toBe(100);
    expect(n.outputTokens).toBe(30);
    expect(n.saved).toBe(70);
  });

  it("derives saved from fallback when stats empty", () => {
    const n = normalizeClawStats(undefined, { inputTokens: 80, outputTokens: 20 });
    expect(n.saved).toBe(60);
    expect(n.savingsPct).toBeCloseTo(75);
  });
});
