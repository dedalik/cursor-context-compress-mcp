import { runRtk } from "./runner.js";

const SHELL_METACHAR_RE = /[;|&`$<>]|(?:\$\()|\|\|/;

export function hasShellMetacharacters(command: string): boolean {
  return SHELL_METACHAR_RE.test(command);
}

export async function rewriteCommand(command: string): Promise<string | null> {
  try {
    const result = await runRtk(["rewrite", command]);
    if (result.exitCode !== 0) return null;
    const rewritten = result.stdout.trim();
    return rewritten || null;
  } catch {
    return null;
  }
}
