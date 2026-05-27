import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { constants } from "node:fs";

const execFileAsync = promisify(execFile);

let cachedRtkPath: string | null = null;

const COMMON_RTK_PATHS = [
  `${process.env.HOME}/.local/bin/rtk`,
  "/opt/homebrew/bin/rtk",
  "/usr/local/bin/rtk",
];

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function probeRtk(path: string): Promise<boolean> {
  try {
    await execFileAsync(path, ["--version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export async function resolveRtkPath(): Promise<string | null> {
  if (process.env.RTK_BIN) {
    if (await probeRtk(process.env.RTK_BIN)) {
      cachedRtkPath = process.env.RTK_BIN;
      return cachedRtkPath;
    }
    return null;
  }

  if (cachedRtkPath && (await probeRtk(cachedRtkPath))) {
    return cachedRtkPath;
  }

  for (const candidate of COMMON_RTK_PATHS) {
    if (await isExecutable(candidate) && (await probeRtk(candidate))) {
      cachedRtkPath = candidate;
      return cachedRtkPath;
    }
  }

  try {
    const { stdout } = await execFileAsync("which", ["rtk"], { timeout: 3000 });
    const found = stdout.trim();
    if (found && (await probeRtk(found))) {
      cachedRtkPath = found;
      return cachedRtkPath;
    }
  } catch {
    // not in PATH
  }

  return null;
}

export function invalidateRtkCache(): void {
  cachedRtkPath = null;
}
