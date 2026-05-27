import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import path from "node:path";
import { runRtk, RtkNotFoundError } from "../rtk/runner.js";
import { applyClawPipeline, formatRtkBody } from "../engines/router.js";
import { mcpTextResult, type CompressionEngine } from "../formatToolResult.js";
import { estimateTokens } from "../tokenCounter.js";
import type { AppDeps } from "../deps.js";

function resolveSafePath(workspace: string, target: string): string | null {
  const resolved = path.resolve(workspace, target);
  const root = path.resolve(workspace);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return null;
  }
  return resolved;
}

export function registerFiles(server: McpServer, deps: AppDeps): void {
  const rtkMissing = () =>
    mcpTextResult(new RtkNotFoundError().message, {
      engine: "rtk",
      compressedTokens: 0,
    }, true);

  server.registerTool(
    "rtk_read",
    {
      description: "Read file(s) through RTK; optional Claw pipeline when post_compress is true",
      inputSchema: z.object({
        paths: z.array(z.string()).min(1),
        level: z.enum(["none", "minimal", "aggressive"]).optional().default("none"),
        post_compress: z.boolean().optional().default(false),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ paths, level, post_compress }) => {
      if (!deps.capabilities.rtk) return rtkMissing();

      const safePaths: string[] = [];
      for (const p of paths) {
        const safe = resolveSafePath(deps.workspace, p);
        if (!safe) {
          return mcpTextResult(`Path escapes workspace: ${p}`, {
            engine: "rtk",
            compressedTokens: 0,
          }, true);
        }
        safePaths.push(safe);
      }

      const args = ["read", "-l", level, ...safePaths];
      const result = await runRtk(args, { cwd: deps.workspace });
      let body = formatRtkBody(result);
      let engine: CompressionEngine = "rtk";
      let reductionPct: number | undefined;
      let markers: number | undefined;

      if (post_compress && deps.capabilities.claw) {
        const piped = await applyClawPipeline(body, true);
        body = piped.body;
        engine = piped.engine;
        reductionPct = piped.reductionPct;
        markers = piped.markers;
      }

      const isError = result.exitCode !== 0;
      return mcpTextResult(body, {
        engine,
        compressedTokens: estimateTokens(body),
        reductionPct,
        markers,
        exitCode: result.exitCode,
        command: result.commandLine,
      }, isError);
    }
  );

  server.registerTool(
    "rtk_ls",
    {
      description: "List directory through RTK",
      inputSchema: z.object({
        path: z.string().default("."),
        flags: z.array(z.string()).optional().default([]),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ path: dirPath, flags }) => {
      if (!deps.capabilities.rtk) return rtkMissing();
      const safe = resolveSafePath(deps.workspace, dirPath);
      if (!safe) {
        return mcpTextResult(`Path escapes workspace: ${dirPath}`, {
          engine: "rtk",
          compressedTokens: 0,
        }, true);
      }
      const result = await runRtk(["ls", safe, ...flags], { cwd: deps.workspace });
      const body = formatRtkBody(result);
      return mcpTextResult(body, {
        engine: "rtk",
        compressedTokens: estimateTokens(body),
        exitCode: result.exitCode,
        command: result.commandLine,
      }, result.exitCode !== 0);
    }
  );

  server.registerTool(
    "rtk_grep",
    {
      description: "Grep through RTK",
      inputSchema: z.object({
        pattern: z.string(),
        path: z.string().optional().default("."),
        extra_args: z.array(z.string()).optional().default([]),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ pattern, path: searchPath, extra_args }) => {
      if (!deps.capabilities.rtk) return rtkMissing();
      const safe = resolveSafePath(deps.workspace, searchPath);
      if (!safe) {
        return mcpTextResult(`Path escapes workspace: ${searchPath}`, {
          engine: "rtk",
          compressedTokens: 0,
        }, true);
      }
      const result = await runRtk(
        ["grep", pattern, safe, ...extra_args],
        { cwd: deps.workspace }
      );
      const body = formatRtkBody(result);
      return mcpTextResult(body, {
        engine: "rtk",
        compressedTokens: estimateTokens(body),
        exitCode: result.exitCode,
        command: result.commandLine,
      }, result.exitCode !== 0);
    }
  );

  server.registerTool(
    "rtk_find",
    {
      description: "Find files through RTK",
      inputSchema: z.object({
        args: z.array(z.string()).describe("Arguments passed to rtk find (e.g. . -name '*.ts')"),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ args }) => {
      if (!deps.capabilities.rtk) return rtkMissing();
      const result = await runRtk(["find", ...args], { cwd: deps.workspace });
      const body = formatRtkBody(result);
      return mcpTextResult(body, {
        engine: "rtk",
        compressedTokens: estimateTokens(body),
        exitCode: result.exitCode,
        command: result.commandLine,
      }, result.exitCode !== 0);
    }
  );
}
