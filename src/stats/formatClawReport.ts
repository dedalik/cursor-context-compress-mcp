import type { StatsScope } from "./clawStore.js";
import {
  aggregateClawRecords,
  filterRecordsByScope,
  readClawRecords,
  type ClawAggregate,
} from "./clawStore.js";
import {
  formatMeter,
  formatMs,
  formatTokenCount,
  impactBar,
  padEnd,
} from "./formatReport.js";

export function clawGainSectionTitle(scope: StatsScope): string {
  return scope === "project"
    ? "Claw Token Savings (MCP + Project Scope)"
    : "Claw Token Savings (MCP + Global Scope)";
}

export function formatClawAggregateReport(
  agg: ClawAggregate,
  scope: StatsScope
): string {
  const lines: string[] = [];
  lines.push(clawGainSectionTitle(scope));
  lines.push("═".repeat(60));
  lines.push("");

  if (agg.totalOps === 0) {
    lines.push("No Claw compression operations recorded yet.");
    lines.push("Use claw_compress_text or claw_compress_messages to accumulate stats.");
    return lines.join("\n");
  }

  lines.push(`Total operations:  ${agg.totalOps}`);
  lines.push(`Input tokens:      ${formatTokenCount(agg.inputTokens)}`);
  lines.push(`Output tokens:     ${formatTokenCount(agg.outputTokens)}`);
  lines.push(
    `Tokens saved:      ${formatTokenCount(agg.saved)} (${agg.savingsPct.toFixed(1)}%)`
  );
  lines.push(
    `Total exec time:   ${formatMs(agg.totalTimeMs)} (avg ${formatMs(agg.avgTimeMs)})`
  );
  lines.push(
    `Efficiency meter: ${formatMeter(agg.savingsPct)} ${agg.savingsPct.toFixed(1)}%`
  );
  lines.push("");

  if (agg.byOp.length > 0) {
    lines.push("By Operation");
    lines.push("─".repeat(71));
    lines.push(
      `  #  Operation                 Count  Saved    Avg%    Time  Impact`
    );
    lines.push("─".repeat(71));

    agg.byOp.forEach((row, i) => {
      const num = `${i + 1}.`.padStart(3);
      const op = padEnd(row.op, 24);
      const count = String(row.count).padStart(5);
      const saved = String(row.saved).padStart(6);
      const avgPct = `${row.avgPct.toFixed(1)}%`.padStart(7);
      const time = formatMs(row.avgTimeMs).padStart(7);
      const impact = impactBar(row.avgPct);
      lines.push(` ${num}  ${op} ${count} ${saved} ${avgPct} ${time}  ${impact}`);
    });
    lines.push("─".repeat(71));
  }

  return lines.join("\n");
}

export function formatClawReport(scope: StatsScope, workspace: string): string {
  const records = filterRecordsByScope(readClawRecords(), scope, workspace);
  const agg = aggregateClawRecords(records);
  return formatClawAggregateReport(agg, scope);
}

export function clawAggregateForJson(
  scope: StatsScope,
  workspace: string
): ClawAggregate {
  const records = filterRecordsByScope(readClawRecords(), scope, workspace);
  return aggregateClawRecords(records);
}
