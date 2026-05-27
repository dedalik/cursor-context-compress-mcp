import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { resolvePythonBin } from "./resolve.js";
import { DEFAULT_MAX_BUFFER, DEFAULT_TIMEOUT_MS } from "../rtk/runner.js";

export type ClawAction =
  | "probe"
  | "compress_text"
  | "compress_messages"
  | "rewind"
  | "workspace_benchmark";

export interface ClawBridgeResponse {
  ok: boolean;
  error?: string;
  compressed?: string;
  messages?: Array<{ role: string; content: string }>;
  stats?: Record<string, unknown>;
  markers?: string[];
  content?: string;
  summary?: Record<string, unknown>;
  version?: string;
}

export class ClawNotFoundError extends Error {
  constructor() {
    super(
      "Claw Compactor not found. Run: pip install claw-compactor and set PYTHON_BIN if needed. npm run doctor"
    );
    this.name = "ClawNotFoundError";
  }
}

function bridgeScriptPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../scripts/claw_bridge.py");
}

export async function runClaw(
  action: ClawAction,
  payload: Record<string, unknown> = {},
  options: { cwd?: string; timeoutMs?: number } = {}
): Promise<ClawBridgeResponse> {
  const pythonBin = await resolvePythonBin();
  if (!pythonBin) {
    throw new ClawNotFoundError();
  }

  const script = bridgeScriptPath();
  const input = JSON.stringify(payload);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin, [script, action], {
      cwd: options.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > DEFAULT_MAX_BUFFER) {
        killed = true;
        child.kill("SIGTERM");
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new ClawNotFoundError());
      } else {
        reject(err);
      }
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (killed && code !== 0) {
        resolve({ ok: false, error: `Claw bridge timed out after ${timeoutMs}ms` });
        return;
      }

      try {
        const parsed = JSON.parse(stdout || "{}") as ClawBridgeResponse;
        if (!parsed.ok && !parsed.error && stderr) {
          parsed.error = stderr.trim();
        }
        resolve(parsed);
      } catch {
        resolve({
          ok: false,
          error: stderr.trim() || `Invalid JSON (exit ${code}): ${stdout.slice(0, 200)}`,
        });
      }
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}
