import { describe, it, expect, vi } from "vitest";
import { shouldRunClawPipeline, getPipelineThreshold } from "../../src/engines/thresholds.js";

vi.mock("../../src/claw/runner.js", () => ({
  runClaw: vi.fn().mockResolvedValue({
    ok: true,
    compressed: "tiny",
    markers: [],
  }),
}));

describe("thresholds", () => {
  it("default threshold is 800", () => {
    delete process.env.CLAW_PIPELINE_THRESHOLD;
    expect(getPipelineThreshold()).toBe(800);
  });

  it("post_compress false skips pipeline", () => {
    expect(shouldRunClawPipeline("x".repeat(4000), false)).toBe(false);
  });

  it("short output skips pipeline even with post_compress", () => {
    expect(shouldRunClawPipeline("short", true)).toBe(false);
  });

  it("long output triggers pipeline check", () => {
    expect(shouldRunClawPipeline("x".repeat(4000), true)).toBe(true);
  });
});

describe("applyClawPipeline", () => {
  it("returns rtk only when post_compress false", async () => {
    const { applyClawPipeline } = await import("../../src/engines/router.js");
    const result = await applyClawPipeline("hello world", false);
    expect(result.engine).toBe("rtk");
    expect(result.body).toBe("hello world");
  });

  it("pipelines when output is large", async () => {
    const { applyClawPipeline } = await import("../../src/engines/router.js");
    const big = "x".repeat(4000);
    const result = await applyClawPipeline(big, true);
    expect(result.engine).toBe("pipeline");
    expect(result.body).toBe("tiny");
  });
});
