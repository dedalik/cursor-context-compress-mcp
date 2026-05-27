import { describe, it, expect } from "vitest";
import { TOOL_NAMES } from "../../src/tools/register.js";

describe("tool registry", () => {
  it("exports 12 tool names", () => {
    expect(TOOL_NAMES).toHaveLength(13);
    expect(TOOL_NAMES).toContain("compress_stats");
    expect(TOOL_NAMES).toContain("rtk_git");
    expect(TOOL_NAMES).toContain("claw_compress_text");
  });
});
