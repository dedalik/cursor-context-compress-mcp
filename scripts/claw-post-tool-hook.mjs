#!/usr/bin/env node
/**
 * Cursor postToolUse hook: compress large tool outputs via Claw and record stats.
 * Install: npm run plugin:install-hooks
 *
 * stdin: Cursor hook JSON (tool_name, tool_output, cwd, ...)
 * stdout: { additional_context?, updated_mcp_tool_output? }
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRIDGE = path.join(PLUGIN_ROOT, "scripts", "claw_bridge.py");
const STATS_DIR =
  process.env.CONTEXT_COMPRESS_STATS_DIR?.trim() ||
  path.join(os.homedir(), ".cursor", "cursor-context-compress-mcp");
const STATS_FILE = path.join(STATS_DIR, "claw-stats.jsonl");

const PYTHON_CANDIDATES = [
  process.env.PYTHON_BIN,
  process.env.CLAW_PYTHON,
  "/opt/homebrew/bin/python3",
  "/usr/local/bin/python3",
  "/usr/bin/python3",
].filter(Boolean);

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function getThreshold() {
  const raw =
    process.env.CLAW_HOOK_MIN_TOKENS ??
    process.env.CLAW_PIPELINE_THRESHOLD ??
    "100";
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 100;
}

/** inject | stats-only | smart (default) | off */
function getHookMode() {
  const m = (process.env.CLAW_HOOK_MODE ?? "smart").toLowerCase();
  if (m === "off" || m === "0" || m === "false") return "off";
  if (m === "inject" || m === "stats-only") return m;
  return "smart";
}

function getInjectMinReductionPct() {
  const raw = process.env.CLAW_HOOK_INJECT_MIN_PCT ?? "35";
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 35;
}

function shellCommandFromInput(toolInput) {
  if (!toolInput || typeof toolInput !== "object") return "";
  if (typeof toolInput.command === "string") return toolInput.command;
  return "";
}

function isRtkShellCommand(command) {
  if (!command) return false;
  return /(?:^|\s)rtk(?:\s|:)/.test(command) || /^rtk:/.test(command);
}

function resolvePython() {
  for (const bin of PYTHON_CANDIDATES) {
    const probe = spawnSync(
      bin,
      ["-c", "import claw_compactor"],
      { encoding: "utf8", timeout: 8000 }
    );
    if (probe.status === 0) return bin;
  }
  return null;
}

function guessContentType(toolName, text) {
  const head = text.slice(0, 4000);
  if (/^diff --git /m.test(head) || /^@@ /m.test(head)) return "diff";
  if (toolName === "Grep" || /\d+:\s*.+/m.test(head)) return "search";
  if (/^\s*\{/.test(head) && /"\w+"\s*:/.test(head)) return "json";
  if (/\b(ERROR|WARN|Traceback)\b/.test(head)) return "log";
  return "text";
}

function extractText(toolOutputRaw) {
  if (!toolOutputRaw) return "";
  let parsed = toolOutputRaw;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return parsed;
    }
  }
  if (typeof parsed === "string") return parsed;
  if (parsed && typeof parsed === "object") {
    if (typeof parsed.stdout === "string" || typeof parsed.stderr === "string") {
      return [parsed.stdout, parsed.stderr].filter(Boolean).join("\n");
    }
    if (Array.isArray(parsed.content)) {
      return parsed.content
        .map((c) => (c && typeof c.text === "string" ? c.text : ""))
        .filter(Boolean)
        .join("\n");
    }
    if (typeof parsed.text === "string") return parsed.text;
  }
  return JSON.stringify(parsed);
}

function alreadyCompressed(text) {
  return /engine=(claw|pipeline)\b/.test(text.slice(-500));
}

function normalizeClawStats(raw, fallback) {
  const pick = (keys) => {
    if (!raw || typeof raw !== "object") return 0;
    for (const key of keys) {
      const v = raw[key];
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }
    return 0;
  };
  const inputTokens =
    pick(["input_tokens", "original_tokens", "tokens_in", "before_tokens"]) ||
    fallback.inputTokens;
  const outputTokens =
    pick(["output_tokens", "compressed_tokens", "tokens_out", "after_tokens"]) ||
    fallback.outputTokens;
  let saved = pick(["tokens_saved", "saved", "saved_tokens"]);
  if (saved <= 0 && inputTokens > 0) {
    saved = Math.max(0, inputTokens - outputTokens);
  }
  let savingsPct = pick(["savings_pct", "reduction_pct", "savings_percent"]);
  if (savingsPct > 0 && savingsPct <= 1) savingsPct *= 100;
  if (savingsPct <= 0 && inputTokens > 0) {
    savingsPct = (saved / inputTokens) * 100;
  }
  return { inputTokens, outputTokens, saved, savingsPct };
}

function appendClawRecord(record) {
  fs.mkdirSync(STATS_DIR, { recursive: true });
  fs.appendFileSync(STATS_FILE, `${JSON.stringify(record)}\n`, "utf8");
}

function runClawCompress(text, contentType) {
  const python = resolvePython();
  if (!python || !fs.existsSync(BRIDGE)) {
    return { ok: false, error: "claw not available" };
  }
  const started = performance.now();
  const child = spawnSync(
    python,
    [BRIDGE, "compress_text"],
    {
      input: JSON.stringify({ text, content_type: contentType }),
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      timeout: 120_000,
    }
  );
  const durationMs = performance.now() - started;
  if (child.error || child.status !== 0) {
    return {
      ok: false,
      error: child.stderr?.trim() || child.error?.message || "claw bridge failed",
      durationMs,
    };
  }
  try {
    const parsed = JSON.parse(child.stdout || "{}");
    return { ...parsed, durationMs };
  } catch {
    return { ok: false, error: "invalid claw bridge json", durationMs };
  }
}

function shouldInjectContext({ mode, reductionPct, before, after, postRtk }) {
  if (mode === "stats-only") return false;
  if (mode === "inject") return true;
  if (postRtk && reductionPct < 50) return false;
  const minPct = getInjectMinReductionPct();
  if (reductionPct < minPct) return false;
  if (after >= before * 0.7) return false;
  return true;
}

function buildHookOutput({
  toolName,
  toolOutputRaw,
  compressed,
  before,
  after,
  reductionPct,
  inject,
}) {
  if (!inject) return {};

  const header = `[Claw hook] ${toolName} output compressed ~${reductionPct.toFixed(1)}% (${before}→${after} tokens est.). Use this summary instead of re-reading the full raw tool output above.`;
  const body = `${header}\n\n${compressed}`;

  const isMcp =
    /^MCP:/i.test(toolName) ||
    /cursor-context-compress/i.test(toolName);

  if (isMcp && toolOutputRaw) {
    let parsed;
    try {
      parsed =
        typeof toolOutputRaw === "string"
          ? JSON.parse(toolOutputRaw)
          : toolOutputRaw;
    } catch {
      parsed = null;
    }
    if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.content)) {
        return {
          updated_mcp_tool_output: {
            content: [{ type: "text", text: `${compressed}\n\n---\nengine=claw | hook=postToolUse` }],
          },
          additional_context: body,
        };
      }
    }
    return {
      updated_mcp_tool_output: compressed,
      additional_context: body,
    };
  }

  return { additional_context: body };
}

function main() {
  const mode = getHookMode();
  if (mode === "off") {
    emit({});
    return;
  }

  const raw = readStdin().trim();
  if (!raw) {
    emit({});
    return;
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    emit({});
    return;
  }

  const toolName = String(input.tool_name ?? "unknown");
  const cwd = String(input.cwd ?? process.cwd());
  const toolOutputRaw = input.tool_output;
  const shellCmd = shellCommandFromInput(input.tool_input);
  const postRtk = toolName === "Shell" && isRtkShellCommand(shellCmd);

  if (/claw_compress_|compress_stats|claw-post-tool-hook/i.test(toolName)) {
    emit({});
    return;
  }

  const text = extractText(toolOutputRaw);
  const before = estimateTokens(text);
  if (before < getThreshold() || alreadyCompressed(text)) {
    emit({});
    return;
  }

  const contentType = guessContentType(toolName, text);
  const claw = runClawCompress(text, contentType);
  if (!claw.ok || !claw.compressed) {
    emit({});
    return;
  }

  const compressed = claw.compressed;
  const after = estimateTokens(compressed);
  const reductionPct = before > 0 ? ((before - after) / before) * 100 : 0;
  const norm = normalizeClawStats(claw.stats, {
    inputTokens: before,
    outputTokens: after,
  });

  const opSuffix = postRtk ? "_post_rtk" : "";
  const op = `hook_${toolName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}${opSuffix}`;

  if (norm.saved > 0 || reductionPct >= 5) {
    appendClawRecord({
      ts: new Date().toISOString(),
      workspace: cwd,
      op,
      inputTokens: norm.inputTokens,
      outputTokens: norm.outputTokens,
      saved: norm.saved,
      savingsPct: norm.savingsPct,
      durationMs: Math.round(claw.durationMs ?? 0),
      tool: "claw_post_tool_hook",
    });
  }

  const inject = shouldInjectContext({
    mode,
    reductionPct,
    before,
    after,
    postRtk,
  });

  emit(
    buildHookOutput({
      toolName,
      toolOutputRaw,
      compressed,
      before,
      after,
      reductionPct,
      inject,
    })
  );
}

main();
