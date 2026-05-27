#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function which(cmd) {
  try {
    const { stdout } = await execFileAsync("which", [cmd]);
    return stdout.trim();
  } catch {
    return null;
  }
}

async function probe(cmd, args) {
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout: 8000 });
    return { ok: true, out: stdout.trim() };
  } catch (e) {
    return { ok: false, err: e.message };
  }
}

const MCP_SERVER_ID = "cursor-context-compress-mcp";

const minimalMcp = {
  mcpServers: {
    [MCP_SERVER_ID]: {
      type: "stdio",
      command: "npx",
      args: ["-y", "cursor-context-compress-mcp"],
      env: {
        RTK_WORKSPACE: "${workspaceFolder}",
      },
    },
  },
};

const devMcp = {
  mcpServers: {
    [MCP_SERVER_ID]: {
      type: "stdio",
      command: "node",
      args: ["${workspaceFolder}/dist/index.js"],
      env: {
        RTK_WORKSPACE: "${workspaceFolder}",
      },
    },
  },
};

async function main() {
  console.log("Cursor Context Compress MCP - doctor\n");

  const node = process.version;
  console.log(`Node: ${node}`);

  const rtkPath =
    process.env.RTK_BIN ?? (await which("rtk")) ?? "(not found)";
  const rtkProbe =
    rtkPath !== "(not found)"
      ? await probe(rtkPath, ["--version"])
      : { ok: false };

  console.log(`RTK: ${rtkPath} ${rtkProbe.ok ? "✓" : "✗"}`);
  if (rtkProbe.ok) console.log(`  ${rtkProbe.out}`);

  const pythonPath =
    process.env.PYTHON_BIN ??
    process.env.CLAW_PYTHON ??
    (await which("python3")) ??
    "(not found)";
  const clawProbe =
    pythonPath !== "(not found)"
      ? await probe(pythonPath, [
          "-c",
          "import claw_compactor; print('claw ok')",
        ])
      : { ok: false };

  console.log(`Python (claw_compactor): ${pythonPath} ${clawProbe.ok ? "✓" : "✗"}`);

  const dist = path.join(root, "dist/index.js");
  try {
    await import("node:fs/promises").then((fs) => fs.access(dist));
    console.log(`Build: ${dist} ✓`);
  } catch {
    console.log(`Build: missing - run: npm run build`);
  }

  console.log("\nTools (13): rtk_* (8) + claw_* (4) + compress_stats");
  console.log("\n--- Marketplace .cursor/mcp.json (npx) ---\n");
  console.log(JSON.stringify(minimalMcp, null, 2));
  console.log("\n--- Local dev (this repo) ---\n");
  console.log(JSON.stringify(devMcp, null, 2));

  if (!rtkProbe.ok || !clawProbe.ok) {
    console.log("\n--- Optional overrides if auto-detect fails ---");
    console.log(JSON.stringify({
      env: {
        RTK_BIN: rtkPath !== "(not found)" ? rtkPath : "/path/to/rtk",
        PYTHON_BIN: pythonPath !== "(not found)" ? pythonPath : "/path/to/python3",
        RTK_WORKSPACE: "${workspaceFolder}",
      },
    }, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
