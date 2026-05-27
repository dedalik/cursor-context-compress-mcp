import { describe, it, expect } from "vitest";
import { estimateTokens } from "../src/tokenCounter.js";
import { formatToolContent } from "../src/formatToolResult.js";

describe("tokenCounter", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("estimates 100 tokens for 400 chars", () => {
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });
});

describe("formatToolContent", () => {
  it("includes engine=claw in footer", () => {
    const { text } = formatToolContent("hello", {
      engine: "claw",
      compressedTokens: 2,
    });
    expect(text).toContain("engine=claw");
    expect(text).toContain("compressedTokens≈2");
  });

  it("includes pipeline engine", () => {
    const { structuredContent } = formatToolContent("x", {
      engine: "pipeline",
      compressedTokens: 1,
      reductionPct: 50,
    });
    expect(structuredContent.engine).toBe("pipeline");
  });
});
