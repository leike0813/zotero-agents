import type {
  SynthesisDurableBundleExport,
  SynthesisDurableBundleSource,
} from "./durableBundle.js";
import type {
  SynthesisDurableImportApplyRequest,
  SynthesisDurableImportApplyResult,
  SynthesisDurableImportPreview,
} from "./durableBundleImport.js";
import { toSynthesisJsonValue } from "./common.js";
import type { SynthesisHostWebDavSyncPort } from "./webDavSyncPort.js";

export const SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_ID =
  "synthesis.webdav_sync_head" as const;
export const SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_VERSION = "1.0.0" as const;
export const SYNTHESIS_WEBDAV_SYNC_STATE_SCHEMA_ID =
  "synthesis.webdav_sync_state" as const;
export const SYNTHESIS_WEBDAV_SYNC_STATE_SCHEMA_VERSION = "1.0.0" as const;
export const SYNTHESIS_WEBDAV_SYNC_CONFLICT_SCHEMA_ID =
  "synthesis.webdav_sync_conflict_report" as const;
export const SYNTHESIS_WEBDAV_SYNC_CONFLICT_SCHEMA_VERSION = "1.0.0" as const;
export const SYNTHESIS_WEBDAV_SYNC_RETRY_DELAYS_MS = [
  60_000, 300_000, 900_000, 1_800_000,
] as const;

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const UTC_ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SAFE_SEGMENT_PATTERN = /^[A-Za-z0-9._:-]+$/;
const STRING_MAX = 4096;
const STATE_COLLECTION_MAX = 20;
const STATE_DETAILS_BYTES_MAX = 16 * 1024;

export type SynthesisWebDavSyncQueueState =
  | "idle"
  | "queued"
  | "syncing"
  | "blocked_conflict"
  | "failed_retryable"
  | "failed_permanent"
  | "disabled";

export type SynthesisWebDavSnapshotPointer = {
  schema_id: typeof SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_ID;
  schema_version: typeof SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_VERSION;
  snapshot_id: string;
  manifest_hash: string;
  updated_at: string;
  producer_version?: string;
};

export type SynthesisWebDavRemoteHead = {
  pointer?: SynthesisWebDavSnapshotPointer;
  etag?: string;
  missing: boolean;
};

export type SynthesisWebDavSyncDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  details?: unknown;
};

export type SynthesisWebDavSyncConflictReport = {
  schema_id: typeof SYNTHESIS_WEBDAV_SYNC_CONFLICT_SCHEMA_ID;
  schema_version: typeof SYNTHESIS_WEBDAV_SYNC_CONFLICT_SCHEMA_VERSION;
  conflict_id: string;
  status: "blocked" | "resolved";
  conflicts: Array<{
    asset_path: string;
    reason: string;
    base_hash?: string;
    local_hash?: string;
    remote_hash?: string;
  }>;
  diagnostics: SynthesisWebDavSyncDiagnostic[];
};

export type SynthesisWebDavSyncState = {
  schema_id: typeof SYNTHESIS_WEBDAV_SYNC_STATE_SCHEMA_ID;
  schema_version: typeof SYNTHESIS_WEBDAV_SYNC_STATE_SCHEMA_VERSION;
  queue_state: SynthesisWebDavSyncQueueState;
  paused: boolean;
  adapter_configured: boolean;
  config_status?: "disabled" | "incomplete" | "configured" | "invalid";
  base_url: string;
  remote_path: string;
  username?: string;
  credential_updated_at?: string;
  connection_test?: unknown;
  retry_attempt?: number;
  next_retry_at?: string;
  last_run?: {
    run_id: string;
    status:
      | "completed"
      | "failed_retryable"
      | "failed_permanent"
      | "blocked_conflict";
    started_at: string;
    completed_at: string;
    diagnostics: SynthesisWebDavSyncDiagnostic[];
    snapshot_id?: string;
    manifest_hash?: string;
  };
  conflict_report?: SynthesisWebDavSyncConflictReport;
  conflict_actions?: string[];
  diagnostics: SynthesisWebDavSyncDiagnostic[];
  allowed_actions: string[];
  last_phase?: string;
  progress?: {
    phase?: string;
    phase_label?: string;
    message?: string;
    processed_count?: number;
    total_count?: number;
    bundle_count?: number;
    entry_count?: number;
    total_bytes?: number;
    updated_at?: string;
  };
  updated_at: string;
};

export type SynthesisWebDavSyncProgressReport = {
  jobName: string;
  runId: string;
  source: "webdav_sync";
  label: string;
  status:
    | "running"
    | "queued"
    | "waiting"
    | "completed"
    | "failed_retryable"
    | "failed_terminal";
  phase?: string;
  phaseLabel?: string;
  message?: string;
  processedCount?: number;
  totalCount?: number;
  progressMode?: "determinate" | "indeterminate";
  diagnosticsJson?: string;
};

export type SynthesisWebDavSyncStateStore = {
  load(): unknown | null | Promise<unknown | null>;
  save(state: SynthesisWebDavSyncState): void | Promise<void>;
};

export type SynthesisWebDavSyncAbortSignal = {
  readonly aborted: boolean;
  addEventListener(
    type: "abort",
    listener: () => void,
    options?: { once?: boolean },
  ): void;
};

export type SynthesisWebDavSyncDurablePort = {
  buildExport():
    | (SynthesisDurableBundleExport & {
        summary: {
          bundleCount: number;
          entityCount: number;
          topicCount: number;
          manifestHash: string;
        };
      })
    | Promise<
        SynthesisDurableBundleExport & {
          summary: {
            bundleCount: number;
            entityCount: number;
            topicCount: number;
            manifestHash: string;
          };
        }
      >;
  previewImport(
    source: SynthesisDurableBundleSource,
  ): SynthesisDurableImportPreview | Promise<SynthesisDurableImportPreview>;
  applyImport(
    request: SynthesisDurableImportApplyRequest,
  ):
    | SynthesisDurableImportApplyResult
    | Promise<SynthesisDurableImportApplyResult>;
  discardImport(receiptId?: string): boolean | Promise<boolean>;
};

export type SynthesisWebDavSyncApplicationOptions = {
  hostPort: SynthesisHostWebDavSyncPort;
  durable: SynthesisWebDavSyncDurablePort;
  stateStore: SynthesisWebDavSyncStateStore;
  now?: () => string;
  acknowledgeUnbasedUpdates?: boolean;
  progressReporter?: (
    report: SynthesisWebDavSyncProgressReport,
  ) => void | Promise<void>;
  retryDelaysMs?: readonly number[];
  abortSignal?: SynthesisWebDavSyncAbortSignal;
};

function record(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  return value as Record<string, unknown>;
}

function exact(
  value: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[],
  code: string,
) {
  const fields = Object.keys(value);
  if (
    fields.some((field) => !allowed.includes(field)) ||
    required.some((field) => !fields.includes(field))
  ) {
    throw new Error(code);
  }
}

function boundedString(value: unknown, code: string) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > STRING_MAX ||
    value.trim() !== value ||
    Array.from(value).some((entry) => {
      const char = entry.charCodeAt(0);
      return char <= 0x1f || char === 0x7f;
    })
  ) {
    throw new Error(code);
  }
  return value;
}

function boundedOptionalString(value: unknown, code: string) {
  return value === undefined ? undefined : boundedString(value, code);
}

function utcIso8601(value: unknown, code: string) {
  const timestamp = boundedString(value, code);
  const parsed = Date.parse(timestamp);
  if (
    !UTC_ISO_8601_PATTERN.test(timestamp) ||
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString() !== timestamp
  ) {
    throw new Error(code);
  }
  return timestamp;
}

function optionalUtcIso8601(value: unknown, code: string) {
  return value === undefined ? undefined : utcIso8601(value, code);
}

function boundedMaybeEmptyString(value: unknown, code: string) {
  if (value === "") return "";
  return boundedString(value, code);
}

function boundedInteger(
  value: unknown,
  code: string,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > maximum
  ) {
    throw new Error(code);
  }
  return value;
}

function utf8Bytes(value: string) {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
}

function boundedJson(value: unknown, code: string) {
  let normalized: ReturnType<typeof toSynthesisJsonValue>;
  let text: string | undefined;
  try {
    normalized = toSynthesisJsonValue(value, "webDavSyncState");
    text = JSON.stringify(normalized);
  } catch {
    throw new Error(code);
  }
  if (text === undefined || utf8Bytes(text) > STATE_DETAILS_BYTES_MAX) {
    throw new Error(code);
  }
  return normalized;
}

function stringCollection(value: unknown, code: string) {
  if (!Array.isArray(value) || value.length > STATE_COLLECTION_MAX) {
    throw new Error(code);
  }
  return value.map((entry) => boundedString(entry, code));
}

export function rebuildSynthesisWebDavSyncDiagnostic(
  value: unknown,
): SynthesisWebDavSyncDiagnostic {
  const json = record(value, "webdav_sync_diagnostic_invalid");
  exact(
    json,
    ["code", "severity", "message", "details"],
    ["code", "severity", "message"],
    "webdav_sync_diagnostic_fields_invalid",
  );
  if (
    json.severity !== "info" &&
    json.severity !== "warning" &&
    json.severity !== "error"
  ) {
    throw new Error("webdav_sync_diagnostic_severity_invalid");
  }
  return {
    code: boundedString(json.code, "webdav_sync_diagnostic_code_invalid"),
    severity: json.severity,
    message: boundedString(
      json.message,
      "webdav_sync_diagnostic_message_invalid",
    ),
    ...(json.details === undefined
      ? {}
      : {
          details: boundedJson(
            json.details,
            "webdav_sync_diagnostic_details_invalid",
          ),
        }),
  };
}

function diagnosticCollection(value: unknown, code: string) {
  if (!Array.isArray(value) || value.length > STATE_COLLECTION_MAX) {
    throw new Error(code);
  }
  return value.map(rebuildSynthesisWebDavSyncDiagnostic);
}

export function rebuildSynthesisWebDavSyncConflictReport(
  value: unknown,
): SynthesisWebDavSyncConflictReport {
  const json = record(value, "webdav_sync_conflict_invalid");
  exact(
    json,
    [
      "schema_id",
      "schema_version",
      "conflict_id",
      "status",
      "conflicts",
      "diagnostics",
    ],
    [
      "schema_id",
      "schema_version",
      "conflict_id",
      "status",
      "conflicts",
      "diagnostics",
    ],
    "webdav_sync_conflict_fields_invalid",
  );
  if (
    json.schema_id !== SYNTHESIS_WEBDAV_SYNC_CONFLICT_SCHEMA_ID ||
    json.schema_version !== SYNTHESIS_WEBDAV_SYNC_CONFLICT_SCHEMA_VERSION ||
    (json.status !== "blocked" && json.status !== "resolved") ||
    !Array.isArray(json.conflicts) ||
    json.conflicts.length > STATE_COLLECTION_MAX
  ) {
    throw new Error("webdav_sync_conflict_invalid");
  }
  const conflicts = json.conflicts.map((value) => {
    const entry = record(value, "webdav_sync_conflict_entry_invalid");
    exact(
      entry,
      ["asset_path", "reason", "base_hash", "local_hash", "remote_hash"],
      ["asset_path", "reason"],
      "webdav_sync_conflict_entry_fields_invalid",
    );
    return {
      asset_path: boundedString(
        entry.asset_path,
        "webdav_sync_conflict_asset_path_invalid",
      ),
      reason: boundedString(
        entry.reason,
        "webdav_sync_conflict_reason_invalid",
      ),
      ...(boundedOptionalString(
        entry.base_hash,
        "webdav_sync_conflict_hash_invalid",
      ) === undefined
        ? {}
        : { base_hash: entry.base_hash as string }),
      ...(boundedOptionalString(
        entry.local_hash,
        "webdav_sync_conflict_hash_invalid",
      ) === undefined
        ? {}
        : { local_hash: entry.local_hash as string }),
      ...(boundedOptionalString(
        entry.remote_hash,
        "webdav_sync_conflict_hash_invalid",
      ) === undefined
        ? {}
        : { remote_hash: entry.remote_hash as string }),
    };
  });
  return {
    schema_id: SYNTHESIS_WEBDAV_SYNC_CONFLICT_SCHEMA_ID,
    schema_version: SYNTHESIS_WEBDAV_SYNC_CONFLICT_SCHEMA_VERSION,
    conflict_id: boundedString(
      json.conflict_id,
      "webdav_sync_conflict_id_invalid",
    ),
    status: json.status,
    conflicts,
    diagnostics: diagnosticCollection(
      json.diagnostics,
      "webdav_sync_conflict_diagnostics_invalid",
    ),
  };
}

export function rebuildSynthesisWebDavSyncState(
  value: unknown,
): SynthesisWebDavSyncState {
  const json = record(value, "webdav_sync_state_invalid");
  exact(
    json,
    [
      "schema_id",
      "schema_version",
      "queue_state",
      "paused",
      "adapter_configured",
      "config_status",
      "base_url",
      "remote_path",
      "username",
      "credential_updated_at",
      "connection_test",
      "retry_attempt",
      "next_retry_at",
      "last_run",
      "conflict_report",
      "conflict_actions",
      "diagnostics",
      "allowed_actions",
      "last_phase",
      "progress",
      "updated_at",
    ],
    [
      "schema_id",
      "schema_version",
      "queue_state",
      "paused",
      "adapter_configured",
      "base_url",
      "remote_path",
      "diagnostics",
      "allowed_actions",
      "updated_at",
    ],
    "webdav_sync_state_fields_invalid",
  );
  const queueStates: SynthesisWebDavSyncQueueState[] = [
    "idle",
    "queued",
    "syncing",
    "blocked_conflict",
    "failed_retryable",
    "failed_permanent",
    "disabled",
  ];
  const configStatuses = ["disabled", "incomplete", "configured", "invalid"];
  if (
    json.schema_id !== SYNTHESIS_WEBDAV_SYNC_STATE_SCHEMA_ID ||
    json.schema_version !== SYNTHESIS_WEBDAV_SYNC_STATE_SCHEMA_VERSION ||
    !queueStates.includes(json.queue_state as SynthesisWebDavSyncQueueState) ||
    typeof json.paused !== "boolean" ||
    typeof json.adapter_configured !== "boolean" ||
    (json.config_status !== undefined &&
      !configStatuses.includes(String(json.config_status)))
  ) {
    throw new Error("webdav_sync_state_invalid");
  }
  if (json.retry_attempt !== undefined) {
    boundedInteger(json.retry_attempt, "webdav_sync_retry_attempt_invalid", 4);
  }
  const lastRun = json.last_run;
  if (lastRun !== undefined) {
    const entry = record(lastRun, "webdav_sync_last_run_invalid");
    exact(
      entry,
      [
        "run_id",
        "status",
        "started_at",
        "completed_at",
        "diagnostics",
        "snapshot_id",
        "manifest_hash",
      ],
      ["run_id", "status", "started_at", "completed_at", "diagnostics"],
      "webdav_sync_last_run_fields_invalid",
    );
    if (
      entry.status !== "completed" &&
      entry.status !== "failed_retryable" &&
      entry.status !== "failed_permanent" &&
      entry.status !== "blocked_conflict"
    ) {
      throw new Error("webdav_sync_last_run_status_invalid");
    }
    boundedString(entry.run_id, "webdav_sync_run_id_invalid");
    const startedAt = utcIso8601(
      entry.started_at,
      "webdav_sync_started_at_invalid",
    );
    const completedAt = utcIso8601(
      entry.completed_at,
      "webdav_sync_completed_at_invalid",
    );
    if (completedAt < startedAt) {
      throw new Error("webdav_sync_completed_at_invalid");
    }
    diagnosticCollection(
      entry.diagnostics,
      "webdav_sync_last_run_diagnostics_invalid",
    );
    boundedOptionalString(entry.snapshot_id, "webdav_sync_snapshot_id_invalid");
    boundedOptionalString(
      entry.manifest_hash,
      "webdav_sync_manifest_hash_invalid",
    );
  }
  if (json.progress !== undefined) {
    const progress = record(json.progress, "webdav_sync_progress_invalid");
    exact(
      progress,
      [
        "phase",
        "phase_label",
        "message",
        "processed_count",
        "total_count",
        "bundle_count",
        "entry_count",
        "total_bytes",
        "updated_at",
      ],
      [],
      "webdav_sync_progress_fields_invalid",
    );
    for (const field of ["phase", "phase_label", "message"]) {
      boundedOptionalString(progress[field], "webdav_sync_progress_invalid");
    }
    optionalUtcIso8601(
      progress.updated_at,
      "webdav_sync_progress_updated_at_invalid",
    );
    for (const field of [
      "processed_count",
      "total_count",
      "bundle_count",
      "entry_count",
      "total_bytes",
    ]) {
      if (progress[field] !== undefined) {
        boundedInteger(progress[field], "webdav_sync_progress_invalid");
      }
    }
  }
  boundedMaybeEmptyString(json.base_url, "webdav_sync_base_url_invalid");
  boundedMaybeEmptyString(json.remote_path, "webdav_sync_remote_path_invalid");
  boundedOptionalString(json.username, "webdav_sync_username_invalid");
  optionalUtcIso8601(
    json.credential_updated_at,
    "webdav_sync_credential_updated_at_invalid",
  );
  optionalUtcIso8601(
    json.next_retry_at,
    "webdav_sync_next_retry_at_invalid",
  );
  boundedOptionalString(json.last_phase, "webdav_sync_last_phase_invalid");
  utcIso8601(json.updated_at, "webdav_sync_updated_at_invalid");
  if (json.connection_test !== undefined) {
    boundedJson(json.connection_test, "webdav_sync_connection_test_invalid");
  }
  if (json.conflict_report !== undefined) {
    rebuildSynthesisWebDavSyncConflictReport(json.conflict_report);
  }
  stringCollection(
    json.conflict_actions ?? [],
    "webdav_sync_conflict_actions_invalid",
  );
  diagnosticCollection(json.diagnostics, "webdav_sync_diagnostics_invalid");
  stringCollection(json.allowed_actions, "webdav_sync_allowed_actions_invalid");
  return JSON.parse(JSON.stringify(json)) as SynthesisWebDavSyncState;
}

export function rebuildSynthesisWebDavSnapshotPointer(
  value: unknown,
): SynthesisWebDavSnapshotPointer {
  const json = record(value, "webdav_sync_head_invalid");
  exact(
    json,
    [
      "schema_id",
      "schema_version",
      "snapshot_id",
      "manifest_hash",
      "updated_at",
      "producer_version",
    ],
    [
      "schema_id",
      "schema_version",
      "snapshot_id",
      "manifest_hash",
      "updated_at",
    ],
    "webdav_sync_head_fields_invalid",
  );
  if (
    json.schema_id !== SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_ID ||
    json.schema_version !== SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_VERSION
  ) {
    throw new Error("webdav_sync_head_schema_invalid");
  }
  const snapshotId = boundedString(
    json.snapshot_id,
    "webdav_sync_snapshot_id_invalid",
  );
  if (
    !SAFE_SEGMENT_PATTERN.test(snapshotId) ||
    snapshotId === "." ||
    snapshotId === ".."
  ) {
    throw new Error("webdav_sync_snapshot_id_invalid");
  }
  const manifestHash = boundedString(
    json.manifest_hash,
    "webdav_sync_manifest_hash_invalid",
  );
  if (!HASH_PATTERN.test(manifestHash)) {
    throw new Error("webdav_sync_manifest_hash_invalid");
  }
  const updatedAt = utcIso8601(
    json.updated_at,
    "webdav_sync_updated_at_invalid",
  );
  const producerVersion =
    json.producer_version === undefined
      ? undefined
      : boundedString(
          json.producer_version,
          "webdav_sync_producer_version_invalid",
        );
  return {
    schema_id: SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_ID,
    schema_version: SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_VERSION,
    snapshot_id: snapshotId,
    manifest_hash: manifestHash,
    updated_at: updatedAt,
    ...(producerVersion ? { producer_version: producerVersion } : {}),
  };
}

export function synthesisWebDavRemotePath(...parts: string[]) {
  const segments = parts.flatMap((part) => part.split("/"));
  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("\\") ||
        !SAFE_SEGMENT_PATTERN.test(segment),
    )
  ) {
    throw new Error("webdav_sync_remote_path_invalid");
  }
  return segments.join("/");
}

export function synthesisWebDavSnapshotId(
  timestamp: string,
  manifestHash: string,
) {
  if (!HASH_PATTERN.test(manifestHash)) {
    throw new Error("webdav_sync_manifest_hash_invalid");
  }
  return `${timestamp.replace(/[^0-9A-Za-z]+/g, "-")}-${manifestHash.slice(-12)}`;
}
