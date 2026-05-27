import { estimateTokens } from "./tokenCounter.js";

export type CompressionEngine = "rtk" | "claw" | "pipeline" | "none";

export interface ToolResultMeta {
  engine: CompressionEngine;
  compressedTokens?: number;
  estimatedTokens?: number;
  reductionPct?: number;
  markers?: number;
  exitCode?: number;
  command?: string;
}

export function formatToolContent(body: string, meta: ToolResultMeta): {
  text: string;
  structuredContent: Record<string, unknown>;
} {
  const compressedTokens =
    meta.compressedTokens ?? estimateTokens(body);

  const footerParts = [
    `engine=${meta.engine}`,
    `compressedTokens≈${compressedTokens}`,
  ];
  if (meta.reductionPct != null) {
    footerParts.push(`reductionPct≈${meta.reductionPct.toFixed(1)}%`);
  }
  if (meta.markers != null) {
    footerParts.push(`markers=${meta.markers}`);
  }
  if (meta.exitCode != null) {
    footerParts.push(`exit=${meta.exitCode}`);
  }
  if (meta.command) {
    footerParts.push(`command=${meta.command}`);
  }

  const text = `${body}\n\n---\n${footerParts.join(" | ")}`;

  const structuredContent: Record<string, unknown> = {
    engine: meta.engine,
    compressedTokens,
  };
  if (meta.estimatedTokens != null) {
    structuredContent.estimatedTokens = meta.estimatedTokens;
  }
  if (meta.reductionPct != null) {
    structuredContent.reductionPct = meta.reductionPct;
  }
  if (meta.markers != null) {
    structuredContent.markers = meta.markers;
  }
  if (meta.exitCode != null) {
    structuredContent.exitCode = meta.exitCode;
  }
  if (meta.command) {
    structuredContent.command = meta.command;
  }

  return { text, structuredContent };
}

export function mcpTextResult(
  body: string,
  meta: ToolResultMeta,
  isError = false
): {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: Record<string, unknown>;
  isError?: boolean;
} {
  const { text, structuredContent } = formatToolContent(body, meta);
  return {
    content: [{ type: "text", text }],
    structuredContent,
    ...(isError ? { isError: true } : {}),
  };
}
