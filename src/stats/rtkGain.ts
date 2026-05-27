import { runRtk, RtkNotFoundError } from "../rtk/runner.js";

export type RtkGainScope = "global" | "project";
export type RtkGainFormat = "text" | "json";

export function buildRtkGainArgs(
  scope: RtkGainScope,
  format: RtkGainFormat
): string[] {
  const args = ["gain"];
  if (format === "json") {
    args.push("-f", "json");
  }
  if (scope === "project") {
    args.push("-p");
  }
  return args;
}

export interface RtkGainFetchResult {
  body: string;
  exitCode: number;
  isError: boolean;
  missing: boolean;
}

export async function fetchRtkGainReport(options: {
  cwd: string;
  scope: RtkGainScope;
  format: RtkGainFormat;
}): Promise<RtkGainFetchResult> {
  try {
    const result = await runRtk(buildRtkGainArgs(options.scope, options.format), {
      cwd: options.cwd,
    });
    const body = result.stdout || result.stderr;
    return {
      body,
      exitCode: result.exitCode,
      isError: result.exitCode !== 0,
      missing: false,
    };
  } catch (err) {
    if (err instanceof RtkNotFoundError) {
      return {
        body: `${err.message}\n\nInstall RTK: brew install rtk - or use skill cursor-context-compress-mcp-setup.`,
        exitCode: 1,
        isError: true,
        missing: true,
      };
    }
    throw err;
  }
}

export function rtkGainSectionTitle(scope: RtkGainScope): string {
  return scope === "project"
    ? "RTK Token Savings (Project Scope)"
    : "RTK Token Savings (Global Scope)";
}
