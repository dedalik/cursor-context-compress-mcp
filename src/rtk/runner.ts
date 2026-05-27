import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveRtkPath } from "./resolve.js";

const execFileAsync = promisify(execFile);

export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_BUFFER = 512 * 1024;

export interface RtkRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  commandLine: string;
  truncated: boolean;
}

export interface RtkRunOptions {
  cwd?: string;
  timeoutMs?: number;
  maxBuffer?: number;
}

export class RtkNotFoundError extends Error {
  constructor() {
    super(
      "RTK not found. Install rtk (brew install rtk) or set RTK_BIN in mcp.json. Run: npm run doctor"
    );
    this.name = "RtkNotFoundError";
  }
}

function truncateOutput(text: string, maxBytes: number): { text: string; truncated: boolean } {
  const buf = Buffer.from(text, "utf8");
  if (buf.length <= maxBytes) {
    return { text, truncated: false };
  }
  const slice = buf.subarray(0, maxBytes).toString("utf8");
  return { text: `${slice}\n...[truncated]`, truncated: true };
}

export async function runRtk(
  args: string[],
  options: RtkRunOptions = {}
): Promise<RtkRunResult> {
  const rtkPath = await resolveRtkPath();
  if (!rtkPath) {
    throw new RtkNotFoundError();
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBuffer = options.maxBuffer ?? DEFAULT_MAX_BUFFER;
  const commandLine = `rtk ${args.join(" ")}`;

  try {
    const { stdout, stderr } = await execFileAsync(rtkPath, args, {
      cwd: options.cwd,
      timeout: timeoutMs,
      maxBuffer,
      shell: false,
      encoding: "utf8",
    });

    const out = truncateOutput(stdout ?? "", maxBuffer);
    const err = truncateOutput(stderr ?? "", maxBuffer);

    return {
      stdout: out.text,
      stderr: err.text,
      exitCode: 0,
      commandLine,
      truncated: out.truncated || err.truncated,
    };
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: number | string;
      killed?: boolean;
      signal?: string;
    };

    if (e.code === "ENOENT") {
      throw new RtkNotFoundError();
    }

    if (e.killed || e.signal === "SIGTERM") {
      return {
        stdout: "",
        stderr: `Command timed out after ${timeoutMs}ms`,
        exitCode: 124,
        commandLine,
        truncated: false,
      };
    }

    const stdoutRaw = e.stdout ?? "";
    const stderrRaw = e.stderr ?? String(e.message ?? "");
    const out = truncateOutput(stdoutRaw, maxBuffer);
    const errOut = truncateOutput(stderrRaw, maxBuffer);
    const exitCode = typeof e.code === "number" ? e.code : 1;

    return {
      stdout: out.text,
      stderr: errOut.text,
      exitCode,
      commandLine,
      truncated: out.truncated || errOut.truncated,
    };
  }
}
