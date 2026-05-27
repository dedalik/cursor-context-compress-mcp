import type { Capabilities } from "./engines/capabilities.js";

export interface AppDeps {
  workspace: string;
  capabilities: Capabilities;
}

export function getWorkspace(): string {
  return (
    process.env.RTK_WORKSPACE ??
    process.env.WORKSPACE_FOLDER ??
    process.cwd()
  );
}
