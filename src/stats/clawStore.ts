import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { PROJECT_STATS_SUBDIR } from "../constants.js";

export type StatsScope = "global" | "project";

export interface ClawStatsRecord {
  ts: string;
  workspace: string;
  op: string;
  inputTokens: number;
  outputTokens: number;
  saved: number;
  savingsPct: number;
  durationMs: number;
  tool: string;
}

export function getStatsDir(): string {
  return (
    process.env.CONTEXT_COMPRESS_STATS_DIR?.trim() ||
    path.join(os.homedir(), ".cursor", PROJECT_STATS_SUBDIR)
  );
}

export function getClawStatsPath(): string {
  return path.join(getStatsDir(), "claw-stats.jsonl");
}

export function ensureStatsDir(): void {
  fs.mkdirSync(getStatsDir(), { recursive: true });
}

export function appendClawRecord(record: ClawStatsRecord): void {
  ensureStatsDir();
  const line = `${JSON.stringify(record)}\n`;
  fs.appendFileSync(getClawStatsPath(), line, "utf8");
}

export function readClawRecords(): ClawStatsRecord[] {
  const file = getClawStatsPath();
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, "utf8");
  const records: ClawStatsRecord[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed) as ClawStatsRecord);
    } catch {
      // skip corrupt lines
    }
  }
  return records;
}

export function filterRecordsByScope(
  records: ClawStatsRecord[],
  scope: StatsScope,
  workspace: string
): ClawStatsRecord[] {
  if (scope === "global") return records;
  const resolved = path.resolve(workspace);
  return records.filter((r) => path.resolve(r.workspace) === resolved);
}

export interface ClawAggregate {
  totalOps: number;
  inputTokens: number;
  outputTokens: number;
  saved: number;
  savingsPct: number;
  totalTimeMs: number;
  avgTimeMs: number;
  byOp: Array<{
    op: string;
    count: number;
    saved: number;
    avgPct: number;
    avgTimeMs: number;
  }>;
}

export function aggregateClawRecords(records: ClawStatsRecord[]): ClawAggregate {
  const totalOps = records.length;
  let inputTokens = 0;
  let outputTokens = 0;
  let saved = 0;
  let totalTimeMs = 0;

  const byOpMap = new Map<
    string,
    { count: number; saved: number; pctSum: number; timeMs: number }
  >();

  for (const r of records) {
    inputTokens += r.inputTokens;
    outputTokens += r.outputTokens;
    saved += r.saved;
    totalTimeMs += r.durationMs;

    const cur = byOpMap.get(r.op) ?? { count: 0, saved: 0, pctSum: 0, timeMs: 0 };
    cur.count += 1;
    cur.saved += r.saved;
    cur.pctSum += r.savingsPct;
    cur.timeMs += r.durationMs;
    byOpMap.set(r.op, cur);
  }

  const savingsPct = inputTokens > 0 ? (saved / inputTokens) * 100 : 0;
  const avgTimeMs = totalOps > 0 ? totalTimeMs / totalOps : 0;

  const byOp = [...byOpMap.entries()]
    .map(([op, v]) => ({
      op,
      count: v.count,
      saved: v.saved,
      avgPct: v.count > 0 ? v.pctSum / v.count : 0,
      avgTimeMs: v.count > 0 ? v.timeMs / v.count : 0,
    }))
    .sort((a, b) => b.saved - a.saved || a.op.localeCompare(b.op));

  return {
    totalOps,
    inputTokens,
    outputTokens,
    saved,
    savingsPct,
    totalTimeMs,
    avgTimeMs,
    byOp,
  };
}
