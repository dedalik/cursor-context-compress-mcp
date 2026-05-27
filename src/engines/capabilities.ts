import { resolveRtkPath } from "../rtk/resolve.js";
import { resolvePythonBin } from "../claw/resolve.js";
import { runClaw } from "../claw/runner.js";
import { PROJECT_DISPLAY } from "../constants.js";

export interface Capabilities {
  rtk: boolean;
  claw: boolean;
  rtkPath: string | null;
  pythonPath: string | null;
}

export async function probeCapabilities(): Promise<Capabilities> {
  const [rtkPath, pythonPath] = await Promise.all([
    resolveRtkPath(),
    resolvePythonBin(),
  ]);

  let claw = false;
  if (pythonPath && process.env.MCP_SKIP_PROBE !== "1") {
    try {
      const probe = await runClaw("probe", {});
      claw = probe.ok === true;
    } catch {
      claw = false;
    }
  } else if (pythonPath) {
    claw = true;
  }

  return {
    rtk: rtkPath != null,
    claw,
    rtkPath,
    pythonPath,
  };
}

export function buildServerInstructions(caps: Capabilities): string {
  const lines = [
    `${PROJECT_DISPLAY}: RTK for command output (git, shell, grep); Claw for text and chat messages.`,
    "",
    "Routing:",
    "- git/shell/fs → rtk_* tools",
    "- large text / messages / JSON → claw_* tools",
    "- rtk_read with post_compress=true may pipeline RTK→Claw when output is large",
    "- claw_rewind retrieves content by marker id (same MCP session only)",
    "",
    `RTK: ${caps.rtk ? "available" : "MISSING - install rtk or set RTK_BIN"}`,
    `Claw: ${caps.claw ? "available" : "MISSING - pip install claw-compactor, set PYTHON_BIN"}`,
  ];
  return lines.join("\n");
}
