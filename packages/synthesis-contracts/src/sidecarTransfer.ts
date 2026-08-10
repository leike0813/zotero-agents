import {
  SynthesisClientError,
  toSynthesisJsonObject,
  toSynthesisJsonValue,
  type SynthesisJsonObject,
  type SynthesisJsonValue,
} from "./common.js";

export const SYNTHESIS_SIDECAR_TRANSFER_LIMITS = {
  pageBytes: 4 * 1024 * 1024,
  pageJsonNodes: 100_000,
  directionPages: 256,
  directionBytes: 1024 * 1024 * 1024,
  activeSessions: 2,
  serviceBytes: 2 * 1024 * 1024 * 1024,
  idempotencyKeyLength: 128,
  sessionIdLength: 128,
  idleTtlMs: 5 * 60 * 1000,
  absoluteTtlMs: 30 * 60 * 1000,
  reaperIntervalMs: 30 * 1000,
  shutdownBudgetMs: 500,
} as const;

export const SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION =
  "synthesis-production-content-transfer.v1" as const;
export const SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING =
  "canonical_json_text_chunks.v1" as const;
export const SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_TARGETS = [
  "topic_apply_assets",
  "production_client_result",
  "host_export_entries",
] as const;

export type SynthesisProductionContentTransferTarget =
  (typeof SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_TARGETS)[number];

export type SynthesisSidecarTransferDirection = "input" | "output";
export type SynthesisSidecarTransferPageDescriptor = {
  kind: string;
  pageIndex: number;
  rowCount: number;
  byteLength: number;
  sha256: string;
};
export type SynthesisSidecarTransferManifest = {
  transferVersion: string;
  encoding: string;
  direction: SynthesisSidecarTransferDirection;
  header: SynthesisJsonObject;
  pages: SynthesisSidecarTransferPageDescriptor[];
  rootSha256: string;
};
export type SynthesisSidecarTransferPage = {
  descriptor: SynthesisSidecarTransferPageDescriptor;
  rows: SynthesisJsonValue[];
};
export type SynthesisSidecarTransferState =
  | "receiving_input"
  | "input_sealed"
  | "queued"
  | "executing"
  | "publishing_output"
  | "completed";
export type SynthesisSidecarTransferExecutionFailureCode =
  | "worker_timeout"
  | "worker_canceled"
  | "worker_crashed"
  | "worker_result_invalid"
  | "worker_unavailable"
  | "transfer_limit_exceeded"
  | "transfer_conflict"
  | "internal_error";
export type SynthesisSidecarTransferExecution = {
  attempts: number;
  lastFailure?: {
    code: SynthesisSidecarTransferExecutionFailureCode;
    retryable: boolean;
    atMs: number;
  };
};
export type SynthesisSidecarTransferProgress = {
  receivedPages: number;
  totalPages: number;
  stagedBytes: number;
};
export type SynthesisSidecarTransferStatus = {
  sessionId: string;
  state: SynthesisSidecarTransferState;
  input: SynthesisSidecarTransferProgress;
  output?: SynthesisSidecarTransferProgress;
  execution: SynthesisSidecarTransferExecution;
  stagedBytes: number;
  createdAtMs: number;
  lastActivityAtMs: number;
};
export type SynthesisSidecarTransferSnapshot = {
  state: "idle" | "active" | "stopping";
  sessions: number;
  stagedBytes: number;
};

export type SynthesisSidecarOutputTransferReference = {
  sessionId: string;
  rootSha256: string;
};

export type SynthesisSidecarTransferAction =
  | {
      action: "begin";
      idempotencyKey: string;
      manifest: SynthesisSidecarTransferManifest;
    }
  | {
      action: "put_input_page";
      sessionId: string;
      page: SynthesisSidecarTransferPage;
    }
  | {
      action:
        | "seal_input"
        | "execute"
        | "status"
        | "get_output_manifest"
        | "cancel";
      sessionId: string;
    }
  | {
      action: "get_output_page";
      sessionId: string;
      kind: string;
      pageIndex: number;
    };

function invalid(location: string): never {
  throw new SynthesisClientError(
    "invalid_request",
    `Invalid Synthesis sidecar transfer value at ${location}`,
    { location },
  );
}

function exactFields(
  object: SynthesisJsonObject,
  expected: readonly string[],
  location: string,
) {
  const actual = Object.keys(object).sort();
  const fields = [...expected].sort();
  if (
    actual.length !== fields.length ||
    actual.some((field, index) => field !== fields[index])
  ) {
    invalid(`${location}.fields`);
  }
}

function hasControlCharacter(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function boundedString(value: unknown, location: string, max: number) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > max ||
    hasControlCharacter(value)
  ) {
    return invalid(location);
  }
  return value;
}

function nonNegativeInteger(value: unknown, location: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    return invalid(location);
  }
  return Number(value);
}

function sha256(value: unknown, location: string) {
  const hash = boundedString(value, location, 71);
  if (!/^sha256:[a-f0-9]{64}$/.test(hash)) {
    return invalid(location);
  }
  return hash;
}

function jsonNodes(value: unknown) {
  let count = 0;
  const visit = (entry: unknown) => {
    count += 1;
    if (Array.isArray(entry)) {
      entry.forEach(visit);
    } else if (entry && typeof entry === "object") {
      Object.entries(entry).forEach(([key, child]) => {
        visit(key);
        visit(child);
      });
    }
  };
  visit(value);
  return count;
}

export function rebuildSynthesisSidecarTransferPageDescriptor(
  value: unknown,
): SynthesisSidecarTransferPageDescriptor {
  const object = toSynthesisJsonObject(value, "transferPageDescriptor");
  exactFields(
    object,
    ["kind", "pageIndex", "rowCount", "byteLength", "sha256"],
    "transferPageDescriptor",
  );
  const byteLength = nonNegativeInteger(
    object.byteLength,
    "transferPageDescriptor.byteLength",
  );
  if (byteLength > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageBytes) {
    invalid("transferPageDescriptor.byteLength");
  }
  return {
    kind: boundedString(object.kind, "transferPageDescriptor.kind", 64),
    pageIndex: nonNegativeInteger(
      object.pageIndex,
      "transferPageDescriptor.pageIndex",
    ),
    rowCount: nonNegativeInteger(
      object.rowCount,
      "transferPageDescriptor.rowCount",
    ),
    byteLength,
    sha256: sha256(object.sha256, "transferPageDescriptor.sha256"),
  };
}

export function rebuildSynthesisSidecarTransferManifest(
  value: unknown,
): SynthesisSidecarTransferManifest {
  const object = toSynthesisJsonObject(value, "transferManifest");
  exactFields(
    object,
    [
      "transferVersion",
      "encoding",
      "direction",
      "header",
      "pages",
      "rootSha256",
    ],
    "transferManifest",
  );
  if (object.direction !== "input" && object.direction !== "output") {
    invalid("transferManifest.direction");
  }
  if (!Array.isArray(object.pages)) {
    invalid("transferManifest.pages");
  }
  if (object.pages.length > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.directionPages) {
    invalid("transferManifest.pages");
  }
  const pages = object.pages.map(rebuildSynthesisSidecarTransferPageDescriptor);
  if (
    pages.reduce((sum, page) => sum + page.byteLength, 0) >
    SYNTHESIS_SIDECAR_TRANSFER_LIMITS.directionBytes
  ) {
    invalid("transferManifest.bytes");
  }
  return {
    transferVersion: boundedString(
      object.transferVersion,
      "transferManifest.transferVersion",
      128,
    ),
    encoding: boundedString(object.encoding, "transferManifest.encoding", 128),
    direction: object.direction,
    header: toSynthesisJsonObject(object.header, "transferManifest.header"),
    pages,
    rootSha256: sha256(object.rootSha256, "transferManifest.rootSha256"),
  };
}

export function rebuildSynthesisSidecarTransferPage(
  value: unknown,
): SynthesisSidecarTransferPage {
  const object = toSynthesisJsonObject(value, "transferPage");
  exactFields(object, ["descriptor", "rows"], "transferPage");
  if (!Array.isArray(object.rows)) {
    invalid("transferPage.rows");
  }
  const rows = toSynthesisJsonValue(object.rows, "transferPage.rows");
  if (
    !Array.isArray(rows) ||
    jsonNodes(rows) > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageJsonNodes
  ) {
    invalid("transferPage.rows");
  }
  return {
    descriptor: rebuildSynthesisSidecarTransferPageDescriptor(
      object.descriptor,
    ),
    rows,
  };
}

export function rebuildSynthesisSidecarOutputTransferReference(
  value: unknown,
): SynthesisSidecarOutputTransferReference {
  const object = toSynthesisJsonObject(value, "outputTransferReference");
  exactFields(object, ["sessionId", "rootSha256"], "outputTransferReference");
  return {
    sessionId: boundedString(
      object.sessionId,
      "outputTransferReference.sessionId",
      SYNTHESIS_SIDECAR_TRANSFER_LIMITS.sessionIdLength,
    ),
    rootSha256: sha256(object.rootSha256, "outputTransferReference.rootSha256"),
  };
}

function sessionAction(
  object: SynthesisJsonObject,
  action:
    | "seal_input"
    | "execute"
    | "status"
    | "get_output_manifest"
    | "cancel",
) {
  exactFields(object, ["action", "sessionId"], "transferAction");
  return {
    action,
    sessionId: boundedString(
      object.sessionId,
      "transferAction.sessionId",
      SYNTHESIS_SIDECAR_TRANSFER_LIMITS.sessionIdLength,
    ),
  };
}

export function rebuildSynthesisSidecarTransferAction(
  value: unknown,
): SynthesisSidecarTransferAction {
  const object = toSynthesisJsonObject(value, "transferAction");
  switch (object.action) {
    case "begin":
      exactFields(
        object,
        ["action", "idempotencyKey", "manifest"],
        "transferAction",
      );
      return {
        action: "begin",
        idempotencyKey: boundedString(
          object.idempotencyKey,
          "transferAction.idempotencyKey",
          SYNTHESIS_SIDECAR_TRANSFER_LIMITS.idempotencyKeyLength,
        ),
        manifest: rebuildSynthesisSidecarTransferManifest(object.manifest),
      };
    case "put_input_page":
      exactFields(object, ["action", "sessionId", "page"], "transferAction");
      return {
        action: "put_input_page",
        sessionId: boundedString(
          object.sessionId,
          "transferAction.sessionId",
          SYNTHESIS_SIDECAR_TRANSFER_LIMITS.sessionIdLength,
        ),
        page: rebuildSynthesisSidecarTransferPage(object.page),
      };
    case "seal_input":
    case "execute":
    case "status":
    case "get_output_manifest":
    case "cancel":
      return sessionAction(object, object.action);
    case "get_output_page":
      exactFields(
        object,
        ["action", "sessionId", "kind", "pageIndex"],
        "transferAction",
      );
      return {
        action: "get_output_page",
        sessionId: boundedString(
          object.sessionId,
          "transferAction.sessionId",
          SYNTHESIS_SIDECAR_TRANSFER_LIMITS.sessionIdLength,
        ),
        kind: boundedString(object.kind, "transferAction.kind", 64),
        pageIndex: nonNegativeInteger(
          object.pageIndex,
          "transferAction.pageIndex",
        ),
      };
    default:
      return invalid("transferAction.action");
  }
}

function progress(
  value: unknown,
  location: string,
): SynthesisSidecarTransferProgress {
  const object = toSynthesisJsonObject(value, location);
  exactFields(object, ["receivedPages", "totalPages", "stagedBytes"], location);
  return {
    receivedPages: nonNegativeInteger(
      object.receivedPages,
      `${location}.receivedPages`,
    ),
    totalPages: nonNegativeInteger(object.totalPages, `${location}.totalPages`),
    stagedBytes: nonNegativeInteger(
      object.stagedBytes,
      `${location}.stagedBytes`,
    ),
  };
}

const EXECUTION_FAILURE_CODES = new Set<string>([
  "worker_timeout",
  "worker_canceled",
  "worker_crashed",
  "worker_result_invalid",
  "worker_unavailable",
  "transfer_limit_exceeded",
  "transfer_conflict",
  "internal_error",
]);

function execution(value: unknown): SynthesisSidecarTransferExecution {
  const object = toSynthesisJsonObject(value, "transferStatus.execution");
  exactFields(
    object,
    ["attempts", ...(object.lastFailure === undefined ? [] : ["lastFailure"])],
    "transferStatus.execution",
  );
  const rebuilt: SynthesisSidecarTransferExecution = {
    attempts: nonNegativeInteger(
      object.attempts,
      "transferStatus.execution.attempts",
    ),
  };
  if (object.lastFailure !== undefined) {
    const failure = toSynthesisJsonObject(
      object.lastFailure,
      "transferStatus.execution.lastFailure",
    );
    exactFields(
      failure,
      ["code", "retryable", "atMs"],
      "transferStatus.execution.lastFailure",
    );
    if (
      typeof failure.code !== "string" ||
      !EXECUTION_FAILURE_CODES.has(failure.code) ||
      typeof failure.retryable !== "boolean"
    ) {
      invalid("transferStatus.execution.lastFailure");
    }
    rebuilt.lastFailure = {
      code: failure.code as SynthesisSidecarTransferExecutionFailureCode,
      retryable: failure.retryable,
      atMs: nonNegativeInteger(
        failure.atMs,
        "transferStatus.execution.lastFailure.atMs",
      ),
    };
  }
  return rebuilt;
}

export function rebuildSynthesisSidecarTransferStatus(
  value: unknown,
): SynthesisSidecarTransferStatus {
  const object = toSynthesisJsonObject(value, "transferStatus");
  const expected = [
    "sessionId",
    "state",
    "input",
    "execution",
    "stagedBytes",
    "createdAtMs",
    "lastActivityAtMs",
    ...(object.output === undefined ? [] : ["output"]),
  ];
  exactFields(object, expected, "transferStatus");
  if (
    object.state !== "receiving_input" &&
    object.state !== "input_sealed" &&
    object.state !== "queued" &&
    object.state !== "executing" &&
    object.state !== "publishing_output" &&
    object.state !== "completed"
  ) {
    invalid("transferStatus.state");
  }
  const status: SynthesisSidecarTransferStatus = {
    sessionId: boundedString(
      object.sessionId,
      "transferStatus.sessionId",
      SYNTHESIS_SIDECAR_TRANSFER_LIMITS.sessionIdLength,
    ),
    state: object.state,
    input: progress(object.input, "transferStatus.input"),
    execution: execution(object.execution),
    stagedBytes: nonNegativeInteger(
      object.stagedBytes,
      "transferStatus.stagedBytes",
    ),
    createdAtMs: nonNegativeInteger(
      object.createdAtMs,
      "transferStatus.createdAtMs",
    ),
    lastActivityAtMs: nonNegativeInteger(
      object.lastActivityAtMs,
      "transferStatus.lastActivityAtMs",
    ),
  };
  if (object.output !== undefined) {
    status.output = progress(object.output, "transferStatus.output");
  }
  return status;
}

export function rebuildSynthesisSidecarTransferSnapshot(
  value: unknown,
): SynthesisSidecarTransferSnapshot {
  const object = toSynthesisJsonObject(value, "transferSnapshot");
  exactFields(object, ["state", "sessions", "stagedBytes"], "transferSnapshot");
  if (
    object.state !== "idle" &&
    object.state !== "active" &&
    object.state !== "stopping"
  ) {
    invalid("transferSnapshot.state");
  }
  return {
    state: object.state,
    sessions: nonNegativeInteger(object.sessions, "transferSnapshot.sessions"),
    stagedBytes: nonNegativeInteger(
      object.stagedBytes,
      "transferSnapshot.stagedBytes",
    ),
  };
}
