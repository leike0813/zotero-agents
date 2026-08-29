import type {
  JsonObject,
  JsonValue,
  WorkflowHostMutationReceiptOperation,
} from "./types";

export const WORKFLOW_HOST_ERROR_SCHEMA =
  "zotero-agents.workflow-host-error.v1" as const;

export type WorkflowHostErrorCode =
  | "invalid_request"
  | "invalid_ref"
  | "not_found"
  | "unsupported_operation"
  | "interaction_required"
  | "permission_denied"
  | "resource_limited"
  | "conflict"
  | "unavailable"
  | "canceled"
  | "execution_failed";

export type WorkflowHostTargetKind =
  | "library"
  | "item"
  | "note"
  | "attachment"
  | "annotation"
  | "collection"
  | "resource"
  | "prepared_image"
  | "bibliography_format"
  | "workflow_input"
  | "archive_entry";

export type WorkflowInteractionMember =
  | "context.getCurrentView"
  | "context.getSelectedItems"
  | "navigation.openItem"
  | "navigation.openNote"
  | "navigation.openCollection"
  | "navigation.openSelection"
  | "file.pickDirectory"
  | "file.pickFile"
  | "file.pickSaveFile"
  | "file.pickFiles"
  | "clipboard.readText"
  | "clipboard.writeText"
  | "clipboard.hasText"
  | "clipboard.clear"
  | "editor.openSession"
  | "notifications.toast";

export type WorkflowHostErrorDetailsByCode = {
  invalid_request: {
    reason:
      | "missing_field"
      | "invalid_type"
      | "invalid_value"
      | "invalid_combination"
      | "invalid_schema"
      | "invalid_format"
      | "duplicate_value"
      | "checksum_failed"
      | "unsafe_path"
      | "unsupported_value";
    field?: string;
    operation?: WorkflowHostMutationReceiptOperation;
  };
  invalid_ref: {
    kind: WorkflowHostTargetKind;
    reason:
      | "invalid_shape"
      | "invalid_library_id"
      | "invalid_key"
      | "wrong_kind"
      | "foreign_scope"
      | "expired"
      | "forged";
  };
  not_found: {
    kind: WorkflowHostTargetKind;
    opaqueKey?: string;
  };
  unsupported_operation: {
    memberOrOperation: string;
  };
  interaction_required: {
    member: WorkflowInteractionMember;
  };
  permission_denied: {
    reason: "host_permission" | "security_policy" | "authorization";
    kind?: WorkflowHostTargetKind;
  };
  resource_limited: {
    resource:
      | "items"
      | "entries"
      | "bytes"
      | "characters"
      | "depth"
      | "pages"
      | "duration_ms"
      | "path_length"
      | "translators"
      | "candidates"
      | "response_bytes"
      | "selection";
    limit: number;
    observed?: number;
  };
  conflict: {
    reason:
      | "revision_mismatch"
      | "concurrent_modification"
      | "idempotency_conflict"
      | "operation_in_progress"
      | "ambiguous_state";
    kind?: WorkflowHostTargetKind;
  };
  unavailable: {
    reason: "runtime" | "capability" | "filesystem" | "navigation" | "adapter";
    kind?: WorkflowHostTargetKind;
  };
  canceled: {
    reason: "caller_signal" | "host_shutdown";
  };
  execution_failed: {
    phase:
      | "validation"
      | "read"
      | "staging"
      | "write"
      | "commit"
      | "verification"
      | "cleanup"
      | "adapter";
    recovery:
      | "none"
      | "retry_same_operation"
      | "refresh_and_retry_new_operation"
      | "reconcile"
      | "manual_repair";
    affectedCount?: number;
    residualCount?: number;
  };
};

export type WorkflowHostErrorData = {
  [Code in WorkflowHostErrorCode]: {
    schema: typeof WORKFLOW_HOST_ERROR_SCHEMA;
    code: Code;
    retryable: boolean;
    details: WorkflowHostErrorDetailsByCode[Code];
  };
}[WorkflowHostErrorCode];

export type WorkflowHostStrictJsonBounds = Readonly<{
  maxDepth?: number;
  maxCollectionEntries?: number;
  maxStringCharacters?: number;
}>;

const DEFAULT_MAX_DEPTH = 32;
const DEFAULT_MAX_COLLECTION_ENTRIES = 10_000;
const DEFAULT_MAX_STRING_CHARACTERS = 1_000_000;
const BOUNDED_DETAIL_TOKEN_LENGTH = 128;

const TARGET_KINDS = new Set<WorkflowHostTargetKind>([
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

const INTERACTION_MEMBERS = new Set<WorkflowInteractionMember>([
  "context.getCurrentView",
  "context.getSelectedItems",
  "navigation.openItem",
  "navigation.openNote",
  "navigation.openCollection",
  "navigation.openSelection",
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
  unsupported_operation: new Set(["memberOrOperation"]),
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
} satisfies Record<WorkflowHostErrorCode, ReadonlySet<string>>;

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
    "ambiguous_state",
  ]),
  unavailableReason: new Set([
    "runtime",
    "capability",
    "filesystem",
    "navigation",
    "adapter",
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

function positiveBound(value: number | undefined, fallback: number): number {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : fallback;
}

export function assertWorkflowHostStrictJsonValue(
  value: unknown,
  bounds: WorkflowHostStrictJsonBounds = {},
): asserts value is JsonValue {
  const maxDepth = positiveBound(bounds.maxDepth, DEFAULT_MAX_DEPTH);
  const maxCollectionEntries = positiveBound(
    bounds.maxCollectionEntries,
    DEFAULT_MAX_COLLECTION_ENTRIES,
  );
  const maxStringCharacters = positiveBound(
    bounds.maxStringCharacters,
    DEFAULT_MAX_STRING_CHARACTERS,
  );
  const seen = new WeakSet<object>();

  const visit = (candidate: unknown, path: string, depth: number): void => {
    if (depth > maxDepth) {
      throw new TypeError(`${path} exceeds the strict-JSON depth limit`);
    }
    if (candidate === null || typeof candidate === "boolean") return;
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

export function sanitizeWorkflowHostDetailToken(value: unknown): string {
  const normalized = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim();
  return normalized.slice(0, BOUNDED_DETAIL_TOKEN_LENGTH);
}

function assertPlainDetails(value: unknown): asserts value is JsonObject {
  assertWorkflowHostStrictJsonValue(value, {
    maxDepth: 4,
    maxCollectionEntries: 16,
    maxStringCharacters: BOUNDED_DETAIL_TOKEN_LENGTH,
  });
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new TypeError("Workflow Host error details must be an object");
  }
}

function assertExactKeys(
  code: WorkflowHostErrorCode,
  details: JsonObject,
): void {
  const allowed = DETAIL_KEYS[code];
  const unexpected = Object.keys(details).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    throw new TypeError(`Workflow Host ${code} details contain unknown fields`);
  }
}

function assertEnum(
  value: unknown,
  allowed: ReadonlySet<string>,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new TypeError(`Workflow Host error details contain invalid ${field}`);
  }
}

function assertOptionalKind(value: unknown): void {
  if (value !== undefined) assertEnum(value, TARGET_KINDS, "kind");
}

function assertFiniteNonNegative(value: unknown, field: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`Workflow Host error details contain invalid ${field}`);
  }
}

function sanitizeDetails<Code extends WorkflowHostErrorCode>(
  code: Code,
  details: WorkflowHostErrorDetailsByCode[Code],
): WorkflowHostErrorDetailsByCode[Code] {
  const output = { ...(details as JsonObject) };
  for (const key of ["field", "opaqueKey", "memberOrOperation"] as const) {
    if (key in output && output[key] !== undefined) {
      output[key] = sanitizeWorkflowHostDetailToken(output[key]);
    }
  }
  return output as WorkflowHostErrorDetailsByCode[Code];
}

export function assertWorkflowHostErrorDetails<Code extends WorkflowHostErrorCode>(
  code: Code,
  details: unknown,
): asserts details is WorkflowHostErrorDetailsByCode[Code] {
  assertPlainDetails(details);
  assertExactKeys(code, details);
  switch (code) {
    case "invalid_request":
      assertEnum(details.reason, ENUMS.invalidRequestReason, "reason");
      if (details.field !== undefined && typeof details.field !== "string") {
        throw new TypeError("Workflow Host invalid_request field must be a string");
      }
      if (details.operation !== undefined && typeof details.operation !== "string") {
        throw new TypeError("Workflow Host invalid_request operation must be a string");
      }
      return;
    case "invalid_ref":
      assertEnum(details.kind, TARGET_KINDS, "kind");
      assertEnum(details.reason, ENUMS.invalidRefReason, "reason");
      return;
    case "not_found":
      assertEnum(details.kind, TARGET_KINDS, "kind");
      if (details.opaqueKey !== undefined && typeof details.opaqueKey !== "string") {
        throw new TypeError("Workflow Host not_found opaqueKey must be a string");
      }
      return;
    case "unsupported_operation":
      if (typeof details.memberOrOperation !== "string") {
        throw new TypeError("Workflow Host operation token must be a string");
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
      if (details.observed !== undefined) assertFiniteNonNegative(details.observed, "observed");
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

export function createWorkflowHostErrorData<Code extends WorkflowHostErrorCode>(
  code: Code,
  details: WorkflowHostErrorDetailsByCode[Code],
  options: Readonly<{ retryable?: boolean }> = {},
): Extract<WorkflowHostErrorData, { code: Code }> {
  const safeDetails = sanitizeDetails(code, details);
  assertWorkflowHostErrorDetails(code, safeDetails);
  const retryable =
    options.retryable === true &&
    (code === "unavailable" ||
      (code === "execution_failed" &&
        (safeDetails as WorkflowHostErrorDetailsByCode["execution_failed"])
          .recovery === "retry_same_operation"));
  return {
    schema: WORKFLOW_HOST_ERROR_SCHEMA,
    code,
    retryable,
    details: safeDetails,
  } as unknown as Extract<WorkflowHostErrorData, { code: Code }>;
}
