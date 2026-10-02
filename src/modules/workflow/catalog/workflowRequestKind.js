import { BACKEND_TYPES, DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE, } from "../../../config/defaults";
function normalizeBackendType(value) {
    const normalized = String(value || "").trim();
    return BACKEND_TYPES.includes(normalized)
        ? normalized
        : null;
}
export function resolveWorkflowRequestKind(workflow, backendType) {
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
    throw new Error(`Workflow ${workflow.manifest.id} cannot resolve request kind for backend type "${backendType}"`);
}
