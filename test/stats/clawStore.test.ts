import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  aggregateClawRecords,
  appendClawRecord,
  filterRecordsByScope,
  getClawStatsPath,
  readClawRecords,
  type ClawStatsRecord,
} from "../../src/stats/clawStore.js";
import { formatClawReport } from "../../src/stats/formatClawReport.js";

describe("clawStore", () => {
  let tmpDir: string;
  const prev = process.env.CONTEXT_COMPRESS_STATS_DIR;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-stats-"));
    process.env.CONTEXT_COMPRESS_STATS_DIR = tmpDir;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.CONTEXT_COMPRESS_STATS_DIR;
    else process.env.CONTEXT_COMPRESS_STATS_DIR = prev;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const sample = (overrides: Partial<ClawStatsRecord>): ClawStatsRecord => ({
    ts: new Date().toISOString(),
    workspace: "/proj/a",
    op: "compress_text",
    inputTokens: 100,
    outputTokens: 40,
    saved: 60,
    savingsPct: 60,
    durationMs: 10,
    tool: "claw_compress_text",
    ...overrides,
  });

  it("aggregates totals and by operation", () => {
    appendClawRecord(sample({ op: "compress_text", saved: 60 }));
    appendClawRecord(sample({ op: "compress_text", saved: 40 }));
    appendClawRecord(
      sample({ op: "compress_messages", saved: 100, inputTokens: 200, outputTokens: 100 })
    );

    const agg = aggregateClawRecords(readClawRecords());
    expect(agg.totalOps).toBe(3);
    expect(agg.saved).toBe(200);
    expect(agg.byOp).toHaveLength(2);
    expect(agg.byOp[0].op).toBe("compress_messages");
  });

  it("filters project scope by workspace", () => {
    appendClawRecord(sample({ workspace: "/proj/a", saved: 10 }));
    appendClawRecord(sample({ workspace: "/proj/b", saved: 20 }));

    const filtered = filterRecordsByScope(readClawRecords(), "project", "/proj/a");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].saved).toBe(10);
  });

  it("formatClawReport includes section title and meter", () => {
    appendClawRecord(sample({ saved: 50, savingsPct: 50 }));
    const report = formatClawReport("global", "/proj/a");
    expect(report).toContain("Claw Token Savings");
    expect(report).toContain("Efficiency meter:");
    expect(report).toContain("By Operation");
  });

  it("persists to jsonl file", () => {
    appendClawRecord(sample({}));
    expect(fs.existsSync(getClawStatsPath())).toBe(true);
  });
});
