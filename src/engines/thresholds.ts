import { estimateTokens } from "../tokenCounter.js";

const DEFAULT_PIPELINE_THRESHOLD = 800;

export function getPipelineThreshold(): number {
  const raw = process.env.CLAW_PIPELINE_THRESHOLD;
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return DEFAULT_PIPELINE_THRESHOLD;
}

export function shouldRunClawPipeline(
  text: string,
  postCompress: boolean
): boolean {
  if (!postCompress) return false;
  return estimateTokens(text) >= getPipelineThreshold();
}

export function isAutoClawEnabled(): boolean {
  const raw = process.env.CLAW_AUTO_ALL?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
