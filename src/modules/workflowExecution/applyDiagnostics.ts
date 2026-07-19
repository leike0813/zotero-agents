import type { WorkflowApplyDiagnostics } from "../../workflows/types";

const MAX_WARNING_COUNT = 1_000_000;
const MAX_WARNING_CODES = 20;
const MAX_WARNING_CODE_LENGTH = 96;

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
): Required<WorkflowApplyDiagnostics> | undefined {
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
    if (warningCount === 0) {
      return undefined;
    }
    return {
      warningCount,
      warningCodeCounts: Object.fromEntries(warningCodeEntries),
    };
  } catch {
    return undefined;
  }
}
