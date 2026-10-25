import type { WorkflowApplyDiagnostics } from "../../workflows/types";

const MAX_WARNING_COUNT = 1_000_000;
const MAX_WARNING_CODES = 20;
const MAX_WARNING_CODE_LENGTH = 96;
const MAX_REPORT_PATH_LENGTH = 1024;

export type NormalizedWorkflowApplyDiagnostics = Required<
  Pick<WorkflowApplyDiagnostics, "warningCount" | "warningCodeCounts">
> & {
  outcome?: "completed" | "partial";
  partialCount?: number;
  reportPath?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(MAX_WARNING_COUNT, Math.floor(value));
}

export function normalizeWorkflowApplyDiagnostics(
  result: unknown,
): NormalizedWorkflowApplyDiagnostics | undefined {
  try {
    if (!isRecord(result) || !isRecord(result.applyDiagnostics)) {
      return undefined;
    }
    const diagnostics = result.applyDiagnostics;
    const warningCodeEntries: Array<[string, number]> = [];
    let codeTotal = 0;
    for (const [rawCode, rawCount] of Object.entries(
      isRecord(diagnostics.warningCodeCounts)
        ? diagnostics.warningCodeCounts
        : {},
    )) {
      if (warningCodeEntries.length >= MAX_WARNING_CODES) {
        break;
      }
      const code = rawCode.trim().slice(0, MAX_WARNING_CODE_LENGTH);
      const count = boundedCount(rawCount);
      if (!code || count === 0) {
        continue;
      }
      warningCodeEntries.push([code, count]);
      codeTotal = Math.min(MAX_WARNING_COUNT, codeTotal + count);
    }
    const warningCount = Math.max(
      boundedCount(diagnostics.warningCount),
      codeTotal,
    );
    const outcome =
      diagnostics.outcome === "completed" || diagnostics.outcome === "partial"
        ? diagnostics.outcome
        : undefined;
    const partialCount = boundedCount(diagnostics.partialCount);
    const reportPath =
      typeof diagnostics.reportPath === "string"
        ? diagnostics.reportPath.trim().slice(0, MAX_REPORT_PATH_LENGTH)
        : "";
    if (!warningCount && !outcome && !partialCount && !reportPath) {
      return undefined;
    }
    return {
      warningCount,
      warningCodeCounts: Object.fromEntries(warningCodeEntries),
      ...(outcome ? { outcome } : {}),
      ...(partialCount > 0 || outcome === "partial" ? { partialCount } : {}),
      ...(reportPath ? { reportPath } : {}),
    };
  } catch {
    return undefined;
  }
}
