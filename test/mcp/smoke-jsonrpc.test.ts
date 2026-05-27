import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function jsonRpcLine(
  method: string,
  params: unknown,
  id?: number
): string {
  const msg: Record<string, unknown> = { jsonrpc: "2.0", method, params };
  if (id !== undefined) msg.id = id;
  return JSON.stringify(msg) + "\n";
}

async function runServerExchange(lines: string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [path.join(root, "dist/index.js")], {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        RTK_WORKSPACE: root,
        MCP_SKIP_PROBE: "1",
      },
    });

    const outputs: string[] = [];
    let buffer = "";
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        child.kill();
      } catch {
        // ignore
      }
      resolve(outputs);
    };

    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const line of parts) {
        if (line.trim()) outputs.push(line);
      }
    });

    child.on("error", (err) => {
      if (!settled) reject(err);
    });

    setTimeout(finish, 5000);

    for (const line of lines) {
      child.stdin.write(line);
    }
  });
}

describe("MCP smoke", () => {
  it(
    "lists tools including rtk_count_tokens",
    async () => {
    const lines = await runServerExchange([
      jsonRpcLine(
        "initialize",
        {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0" },
        },
        1
      ),
      jsonRpcLine("notifications/initialized", {}),
      jsonRpcLine("tools/list", {}, 2),
    ]);

    const listLine = lines.find((l) => {
      try {
        const p = JSON.parse(l);
        return p.id === 2 && p.result?.tools;
      } catch {
        return false;
      }
    });

    expect(listLine).toBeDefined();
    const parsed = JSON.parse(listLine!);
    const names = parsed.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("rtk_count_tokens");
    expect(names.length).toBeGreaterThanOrEqual(12);
    },
    15_000
  );
});
