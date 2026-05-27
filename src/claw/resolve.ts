import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { constants } from "node:fs";

const execFileAsync = promisify(execFile);

let cachedPythonPath: string | null = null;

const COMMON_PYTHON_PATHS = [
  "/opt/homebrew/bin/python3",
  "/usr/local/bin/python3",
  "/usr/bin/python3",
  `${process.env.HOME}/Library/Python/3.9/bin/python3`,
];

function pythonEnv(): string | undefined {
  return process.env.PYTHON_BIN ?? process.env.CLAW_PYTHON;
}

async function probeClawImport(pythonPath: string): Promise<boolean> {
  try {
    await execFileAsync(
      pythonPath,
      ["-c", "import claw_compactor; print('ok')"],
      { timeout: 8000 }
    );
    return true;
  } catch {
    return false;
  }
}

export async function resolvePythonBin(): Promise<string | null> {
  const fromEnv = pythonEnv();
  if (fromEnv && (await probeClawImport(fromEnv))) {
    cachedPythonPath = fromEnv;
    return cachedPythonPath;
  }

  if (cachedPythonPath && (await probeClawImport(cachedPythonPath))) {
    return cachedPythonPath;
  }

  for (const candidate of COMMON_PYTHON_PATHS) {
    try {
      await access(candidate, constants.X_OK);
      if (await probeClawImport(candidate)) {
        cachedPythonPath = candidate;
        return cachedPythonPath;
      }
    } catch {
      // continue
    }
  }

  try {
    const { stdout } = await execFileAsync("which", ["python3"], {
      timeout: 3000,
    });
    const found = stdout.trim();
    if (found && (await probeClawImport(found))) {
      cachedPythonPath = found;
      return cachedPythonPath;
    }
  } catch {
    // not found
  }

  return null;
}

export function invalidatePythonCache(): void {
  cachedPythonPath = null;
}
