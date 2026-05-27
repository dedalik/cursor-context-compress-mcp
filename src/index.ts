#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  buildServerInstructions,
  probeCapabilities,
} from "./engines/capabilities.js";
import { getWorkspace } from "./deps.js";
import { registerAllTools } from "./tools/register.js";
import { PROJECT_DISPLAY, PROJECT_NAME } from "./constants.js";

const VERSION = "1.0.0";

async function main(): Promise<void> {
  const capabilities = await probeCapabilities();
  console.error(
    `[${PROJECT_NAME}] rtk=${capabilities.rtk ? "ok" : "missing"} claw=${capabilities.claw ? "ok" : "missing"}`
  );
  if (capabilities.rtkPath) {
    console.error(`[${PROJECT_NAME}] RTK: ${capabilities.rtkPath}`);
  }
  if (capabilities.pythonPath) {
    console.error(`[${PROJECT_NAME}] Python: ${capabilities.pythonPath}`);
  }

  const server = new McpServer(
    {
      name: PROJECT_NAME,
      version: VERSION,
    },
    {
      instructions: buildServerInstructions(capabilities),
    }
  );

  const deps = {
    workspace: getWorkspace(),
    capabilities,
  };

  registerAllTools(server, deps);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[${PROJECT_NAME}] ${PROJECT_DISPLAY} running on stdio`);
}

process.on("SIGINT", () => process.exit(0));

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
