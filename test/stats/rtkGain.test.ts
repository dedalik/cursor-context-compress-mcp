import { describe, expect, it, vi } from "vitest";
import { buildRtkGainArgs, fetchRtkGainReport } from "../../src/stats/rtkGain.js";
import * as runner from "../../src/rtk/runner.js";

describe("rtkGain", () => {
  it("buildRtkGainArgs defaults to text global", () => {
    expect(buildRtkGainArgs("global", "text")).toEqual(["gain"]);
  });

  it("buildRtkGainArgs adds project and json flags", () => {
    expect(buildRtkGainArgs("project", "json")).toEqual(["gain", "-f", "json", "-p"]);
  });

  it("fetchRtkGainReport returns stdout body", async () => {
    vi.spyOn(runner, "runRtk").mockResolvedValue({
      stdout: "RTK Token Savings (Global Scope)\n...",
      stderr: "",
      exitCode: 0,
      commandLine: "rtk gain",
      truncated: false,
    });

    const result = await fetchRtkGainReport({
      cwd: "/tmp",
      scope: "global",
      format: "text",
    });
    expect(result.body).toContain("RTK Token Savings");
    expect(result.isError).toBe(false);
    vi.restoreAllMocks();
  });
});
