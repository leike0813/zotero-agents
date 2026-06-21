import {
  BACKEND_TYPES,
  DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE,
  type BackendType,
} from "../config/defaults";
import type { LoadedWorkflow } from "../workflows/types";

function normalizeBackendType(value: unknown): BackendType | null {
  const normalized = String(value || "").trim();
  return BACKEND_TYPES.includes(normalized as BackendType)
    ? (normalized as BackendType)
    : null;
}

export function resolveWorkflowRequestKind(
  workflow: LoadedWorkflow,
  backendType: string,
) {
  const declared = String(workflow.manifest.request?.kind || "").trim();
  if (declared) {
    return declared;
  }
  const normalizedBackendType = normalizeBackendType(backendType);
  const fallback = normalizedBackendType
    ? DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE[normalizedBackendType]
    : undefined;
  if (fallback) {
    return fallback;
  }
  throw new Error(
    `Workflow ${workflow.manifest.id} cannot resolve request kind for backend type "${backendType}"`,
  );
}
