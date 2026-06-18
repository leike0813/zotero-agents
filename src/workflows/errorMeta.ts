export type WorkflowHookFailureMeta = {
  hookName?: "buildRequest" | "applyResult";
  workflowId?: string;
  packageId?: string;
  workflowSourceKind?: "builtin" | "user" | "";
  capabilitySource?: string;
  executionMode?: string;
};

const WORKFLOW_HOOK_FAILURE_META_KEY = "__zsWorkflowHookFailureMeta";

type WorkflowHookFailureCarrier = {
  [WORKFLOW_HOOK_FAILURE_META_KEY]?: WorkflowHookFailureMeta;
};

export function attachWorkflowHookFailureMeta(
  error: unknown,
  meta: WorkflowHookFailureMeta,
) {
  if (!error || (typeof error !== "object" && typeof error !== "function")) {
    return error;
  }
  try {
    (error as WorkflowHookFailureCarrier)[WORKFLOW_HOOK_FAILURE_META_KEY] = {
      hookName: meta.hookName,
      workflowId: meta.workflowId,
      packageId: meta.packageId,
      workflowSourceKind: meta.workflowSourceKind,
      capabilitySource: meta.capabilitySource,
      executionMode: meta.executionMode,
    };
  } catch {
    // ignore metadata attachment failures
  }
  return error;
}

export function readWorkflowHookFailureMeta(
  error: unknown,
): WorkflowHookFailureMeta | undefined {
  if (!error || (typeof error !== "object" && typeof error !== "function")) {
    return undefined;
  }
  const meta = (error as WorkflowHookFailureCarrier)[
    WORKFLOW_HOOK_FAILURE_META_KEY
  ];
  if (!meta || typeof meta !== "object") {
    return undefined;
  }
  return {
    hookName: meta.hookName,
    workflowId: meta.workflowId,
    packageId: meta.packageId,
    workflowSourceKind: meta.workflowSourceKind,
    capabilitySource: meta.capabilitySource,
    executionMode: meta.executionMode,
  };
}

export function summarizeWorkflowExecutionError(error: unknown) {
  const meta = readWorkflowHookFailureMeta(error);
  const err = error instanceof Error ? error : null;
  const carrier = (error &&
  (typeof error === "object" || typeof error === "function")
    ? (error as Record<string, unknown>)
    : null);
  return {
    message: err?.message || String(error || ""),
    stack: err?.stack,
    hookName: meta?.hookName,
    packageId: meta?.packageId,
    workflowId: meta?.workflowId,
    workflowSourceKind: meta?.workflowSourceKind,
    capabilitySource:
      meta?.capabilitySource ||
      String(carrier?.capabilitySource || "").trim() ||
      undefined,
    executionMode:
      meta?.executionMode ||
      String(carrier?.executionMode || "").trim() ||
      undefined,
  };
}
