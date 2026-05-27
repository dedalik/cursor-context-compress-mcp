import { describe, it, expect, vi, beforeEach } from "vitest";

const execFileMock = vi.fn();

vi.mock("node:child_process", () => ({
  execFile: (...args: unknown[]) => execFileMock(...args),
}));

vi.mock("../../src/rtk/resolve.js", () => ({
  resolveRtkPath: vi.fn().mockResolvedValue("/usr/local/bin/rtk"),
  invalidateRtkCache: vi.fn(),
}));

describe("runRtk", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("throws RtkNotFoundError when rtk missing", async () => {
    const { resolveRtkPath } = await import("../../src/rtk/resolve.js");
    vi.mocked(resolveRtkPath).mockResolvedValueOnce(null);
    const { runRtk, RtkNotFoundError } = await import("../../src/rtk/runner.js");
    await expect(runRtk(["git", "status"])).rejects.toBeInstanceOf(
      RtkNotFoundError
    );
  });

  it("propagates non-zero exit code", async () => {
    execFileMock.mockImplementation(
      (
        _file: string,
        _args: string[],
        _opts: object,
        cb: (err: NodeJS.ErrnoException & { stdout?: string; stderr?: string }) => void
      ) => {
        const err = new Error("git failed") as NodeJS.ErrnoException & {
          stdout?: string;
          stderr?: string;
          code?: number;
        };
        err.code = 128;
        err.stderr = "fatal: not a git repository";
        cb(err);
      }
    );

    const { runRtk } = await import("../../src/rtk/runner.js");
    const result = await runRtk(["git", "status"]);
    expect(result.exitCode).toBe(128);
    expect(result.stderr).toContain("fatal");
  });
});
