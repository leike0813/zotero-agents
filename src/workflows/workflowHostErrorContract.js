export const WORKFLOW_HOST_ERROR_SCHEMA = "zotero-agents.workflow-host-error.v1";
const DEFAULT_MAX_DEPTH = 32;
const DEFAULT_MAX_COLLECTION_ENTRIES = 10_000;
const DEFAULT_MAX_STRING_CHARACTERS = 1_000_000;
const BOUNDED_DETAIL_TOKEN_LENGTH = 128;
const TARGET_KINDS = new Set([
    "library",
    "item",
    "note",
    "attachment",
    "annotation",
    "collection",
    "resource",
    "prepared_image",
    "bibliography_format",
    "workflow_input",
    "archive_entry",
]);
const INTERACTION_MEMBERS = new Set([
    "context.getCurrentView",
    "context.getSelectedItems",
    "file.pickDirectory",
    "file.pickFile",
    "file.pickSaveFile",
    "file.pickFiles",
    "clipboard.readText",
    "clipboard.writeText",
    "clipboard.hasText",
    "clipboard.clear",
    "editor.openSession",
    "notifications.toast",
]);
const DETAIL_KEYS = {
    invalid_request: new Set(["reason", "field", "operation"]),
    invalid_ref: new Set(["kind", "reason"]),
    not_found: new Set(["kind", "opaqueKey"]),
    unsupported_operation: new Set(["memberOrOperation", "reason"]),
    interaction_required: new Set(["member"]),
    permission_denied: new Set(["reason", "kind"]),
    resource_limited: new Set(["resource", "limit", "observed"]),
    conflict: new Set(["reason", "kind"]),
    unavailable: new Set(["reason", "kind"]),
    canceled: new Set(["reason"]),
    execution_failed: new Set([
        "phase",
        "recovery",
        "affectedCount",
        "residualCount",
    ]),
};
const ENUMS = {
    invalidRequestReason: new Set([
        "missing_field",
        "invalid_type",
        "invalid_value",
        "invalid_combination",
        "invalid_schema",
        "invalid_format",
        "duplicate_value",
        "checksum_failed",
        "unsafe_path",
        "unsupported_value",
    ]),
    invalidRefReason: new Set([
        "invalid_shape",
        "invalid_library_id",
        "invalid_key",
        "wrong_kind",
        "foreign_scope",
        "expired",
        "forged",
    ]),
    permissionReason: new Set([
        "host_permission",
        "security_policy",
        "authorization",
    ]),
    resource: new Set([
        "items",
        "entries",
        "bytes",
        "characters",
        "depth",
        "pages",
        "duration_ms",
        "path_length",
        "translators",
        "candidates",
        "response_bytes",
        "selection",
    ]),
    conflictReason: new Set([
        "revision_mismatch",
        "concurrent_modification",
        "idempotency_conflict",
        "operation_in_progress",
        "basis_mismatch",
        "ambiguous_state",
    ]),
    unavailableReason: new Set([
        "runtime",
        "capability",
        "filesystem",
        "navigation",
        "adapter",
        "outcome_unavailable",
    ]),
    canceledReason: new Set(["caller_signal", "host_shutdown"]),
    phase: new Set([
        "validation",
        "read",
        "staging",
        "write",
        "commit",
        "verification",
        "cleanup",
        "adapter",
    ]),
    recovery: new Set([
        "none",
        "retry_same_operation",
        "refresh_and_retry_new_operation",
        "reconcile",
        "manual_repair",
    ]),
};
function positiveBound(value, fallback) {
    return Number.isSafeInteger(value) && Number(value) > 0
        ? Number(value)
        : fallback;
}
export function assertWorkflowHostStrictJsonValue(value, bounds = {}) {
    const maxDepth = positiveBound(bounds.maxDepth, DEFAULT_MAX_DEPTH);
    const maxCollectionEntries = positiveBound(bounds.maxCollectionEntries, DEFAULT_MAX_COLLECTION_ENTRIES);
    const maxStringCharacters = positiveBound(bounds.maxStringCharacters, DEFAULT_MAX_STRING_CHARACTERS);
    const seen = new WeakSet();
    const visit = (candidate, path, depth) => {
        if (depth > maxDepth) {
            throw new TypeError(`${path} exceeds the strict-JSON depth limit`);
        }
        if (candidate === null || typeof candidate === "boolean")
            return;
        if (typeof candidate === "string") {
            if (candidate.length > maxStringCharacters) {
                throw new TypeError(`${path} exceeds the strict-JSON string limit`);
            }
            return;
        }
        if (typeof candidate === "number") {
            if (!Number.isFinite(candidate)) {
                throw new TypeError(`${path} contains a non-finite number`);
            }
            return;
        }
        if (typeof candidate !== "object") {
            throw new TypeError(`${path} contains an unsupported value`);
        }
        if (seen.has(candidate)) {
            throw new TypeError(`${path} contains a cycle`);
        }
        seen.add(candidate);
        if (Array.isArray(candidate)) {
            if (candidate.length > maxCollectionEntries) {
                throw new TypeError(`${path} exceeds the strict-JSON collection limit`);
            }
            candidate.forEach((entry, index) => visit(entry, `${path}[${index}]`, depth + 1));
            seen.delete(candidate);
            return;
        }
        const prototype = Object.getPrototypeOf(candidate);
        if (prototype !== Object.prototype && prototype !== null) {
            throw new TypeError(`${path} is not a plain object`);
        }
        const entries = Object.entries(candidate);
        if (entries.length > maxCollectionEntries) {
            throw new TypeError(`${path} exceeds the strict-JSON collection limit`);
        }
        for (const [key, entry] of entries) {
            if (key.length > maxStringCharacters) {
                throw new TypeError(`${path} contains an oversized object key`);
            }
            visit(entry, `${path}.${key}`, depth + 1);
        }
        seen.delete(candidate);
    };
    visit(value, "$", 0);
}
export function sanitizeWorkflowHostDetailToken(value) {
    const normalized = Array.from(String(value ?? ""), (character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        return codePoint <= 0x1f || codePoint === 0x7f ? " " : character;
    })
        .join("")
        .trim();
    return normalized.slice(0, BOUNDED_DETAIL_TOKEN_LENGTH);
}
function assertPlainDetails(value) {
    assertWorkflowHostStrictJsonValue(value, {
        maxDepth: 4,
        maxCollectionEntries: 16,
        maxStringCharacters: BOUNDED_DETAIL_TOKEN_LENGTH,
    });
    if (!value || Array.isArray(value) || typeof value !== "object") {
        throw new TypeError("Workflow Host error details must be an object");
    }
}
function assertExactKeys(code, details) {
    const allowed = DETAIL_KEYS[code];
    const unexpected = Object.keys(details).filter((key) => !allowed.has(key));
    if (unexpected.length > 0) {
        throw new TypeError(`Workflow Host ${code} details contain unknown fields`);
    }
}
function assertEnum(value, allowed, field) {
    if (typeof value !== "string" || !allowed.has(value)) {
        throw new TypeError(`Workflow Host error details contain invalid ${field}`);
    }
}
function assertOptionalKind(value) {
    if (value !== undefined)
        assertEnum(value, TARGET_KINDS, "kind");
}
function assertFiniteNonNegative(value, field) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new TypeError(`Workflow Host error details contain invalid ${field}`);
    }
}
function sanitizeDetails(code, details) {
    const output = { ...details };
    for (const key of ["field", "opaqueKey", "memberOrOperation"]) {
        if (key in output && output[key] !== undefined) {
            output[key] = sanitizeWorkflowHostDetailToken(output[key]);
        }
    }
    return output;
}
export function assertWorkflowHostErrorDetails(code, details) {
    assertPlainDetails(details);
    assertExactKeys(code, details);
    switch (code) {
        case "invalid_request":
            assertEnum(details.reason, ENUMS.invalidRequestReason, "reason");
            if (details.field !== undefined && typeof details.field !== "string") {
                throw new TypeError("Workflow Host invalid_request field must be a string");
            }
            if (details.operation !== undefined &&
                typeof details.operation !== "string") {
                throw new TypeError("Workflow Host invalid_request operation must be a string");
            }
            return;
        case "invalid_ref":
            assertEnum(details.kind, TARGET_KINDS, "kind");
            assertEnum(details.reason, ENUMS.invalidRefReason, "reason");
            return;
        case "not_found":
            assertEnum(details.kind, TARGET_KINDS, "kind");
            if (details.opaqueKey !== undefined &&
                typeof details.opaqueKey !== "string") {
                throw new TypeError("Workflow Host not_found opaqueKey must be a string");
            }
            return;
        case "unsupported_operation":
            if (typeof details.memberOrOperation !== "string") {
                throw new TypeError("Workflow Host operation token must be a string");
            }
            if (details.reason !== undefined) {
                assertEnum(details.reason, new Set([
                    "location_unsupported",
                    "target_kind_unsupported",
                    "view_unsupported",
                ]), "reason");
            }
            return;
        case "interaction_required":
            assertEnum(details.member, INTERACTION_MEMBERS, "member");
            return;
        case "permission_denied":
            assertEnum(details.reason, ENUMS.permissionReason, "reason");
            assertOptionalKind(details.kind);
            return;
        case "resource_limited":
            assertEnum(details.resource, ENUMS.resource, "resource");
            assertFiniteNonNegative(details.limit, "limit");
            if (details.observed !== undefined)
                assertFiniteNonNegative(details.observed, "observed");
            return;
        case "conflict":
            assertEnum(details.reason, ENUMS.conflictReason, "reason");
            assertOptionalKind(details.kind);
            return;
        case "unavailable":
            assertEnum(details.reason, ENUMS.unavailableReason, "reason");
            assertOptionalKind(details.kind);
            return;
        case "canceled":
            assertEnum(details.reason, ENUMS.canceledReason, "reason");
            return;
        case "execution_failed":
            assertEnum(details.phase, ENUMS.phase, "phase");
            assertEnum(details.recovery, ENUMS.recovery, "recovery");
            if (details.affectedCount !== undefined) {
                assertFiniteNonNegative(details.affectedCount, "affectedCount");
            }
            if (details.residualCount !== undefined) {
                assertFiniteNonNegative(details.residualCount, "residualCount");
            }
    }
}
export function createWorkflowHostErrorData(code, details, options = {}) {
    const safeDetails = sanitizeDetails(code, details);
    assertWorkflowHostErrorDetails(code, safeDetails);
    const retryable = options.retryable === true &&
        (code === "unavailable" ||
            (code === "execution_failed" &&
                safeDetails
                    .recovery === "retry_same_operation"));
    return {
        schema: WORKFLOW_HOST_ERROR_SCHEMA,
        code,
        retryable,
        details: safeDetails,
    };
}
export function assertWorkflowCallNotCanceled(control) {
    if (control?.signal?.aborted) {
        throw createWorkflowHostError("canceled", "Workflow Host call was canceled", { reason: "caller_signal" });
    }
}
export function createWorkflowHostError(code, message, details, options = {}) {
    const error = new Error(message);
    Object.assign(error, createWorkflowHostErrorData(code, details, options));
    error.name = "WorkflowHostError";
    return error;
}
