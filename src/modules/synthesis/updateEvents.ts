import { hashCanonicalJson } from "./foundation";
import {
  type SynthesisDirtyEventRecord,
  type SynthesisRepository,
} from "./repository";

const SCHEMA_VERSION = "1.0.0";
const QUEUE_STATE_JOB_NAME = "synthesis:update-queue-state";
const DEFAULT_RETRY_DELAYS_MS = [60_000, 300_000, 900_000, 1_800_000];

export type SynthesisUpdateEventType =
  | "paper_artifact_changed"
  | "digest_applied"
  | "literature_matching_metadata_changed"
  | "reference_matching_applied"
  | "topic_synthesis_applied"
  | "zotero_item_added"
  | "zotero_item_updated"
  | "zotero_item_deleted"
  | "zotero_item_restored"
  | "startup_reconcile_detected_dirty_items"
  | "manual_registry_rebuild_requested"
  | "manual_citation_graph_rebuild_requested"
  | "manual_layout_recompute_requested"
  | "citation_graph_structure_dirty"
  | "citation_graph_complex_metrics_dirty"
  | "topic_freshness_dirty"
  | "startup_reconcile_requested";

export type SynthesisUpdateScopeKind =
  | "library"
  | "zotero_item"
  | "paper"
  | "work"
  | "reference_instance"
  | "topic"
  | "citation_graph_structure"
  | "citation_graph_layout";

export type SynthesisUpdateEventStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed_retryable"
  | "failed_permanent"
  | "skipped";

export type SynthesisUpdateQueueState =
  | "idle"
  | "queued"
  | "running"
  | "paused"
  | "failed_retryable"
  | "failed_permanent";

export type SynthesisStartupReconcileState =
  | "unknown"
  | "checking"
  | "queued"
  | "ready"
  | "failed_retryable"
  | "failed_permanent";

export type SynthesisUpdateDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type SynthesisUpdateEvent = {
  schema_id: "synthesis.update_event";
  schema_version: "1.0.0";
  library_id: number;
  event_id: string;
  event_type: SynthesisUpdateEventType;
  source: string;
  scope: {
    kind: SynthesisUpdateScopeKind;
    ref: string;
  };
  source_hash?: string;
  status: SynthesisUpdateEventStatus;
  attempt: number;
  next_retry_at?: string;
  last_retry_at?: string;
  diagnostics: SynthesisUpdateDiagnostic[];
  coalesced_count: number;
  created_at: string;
  updated_at: string;
};

export type SynthesisUpdateQueueStatus = {
  schema_id: "synthesis.update_queue_state";
  schema_version: "1.0.0";
  library_id: number;
  queue_state: SynthesisUpdateQueueState;
  paused: boolean;
  pending_count: number;
  running_count: number;
  failed_count: number;
  retry_attempt: number;
  next_retry_at?: string;
  last_retry_at?: string;
  last_failure?: SynthesisUpdateDiagnostic;
  startup_reconcile: {
    state: SynthesisStartupReconcileState;
    dirty_count: number;
    last_checked_at?: string;
    diagnostics: SynthesisUpdateDiagnostic[];
  };
  updated_at: string;
  allowed_actions: string[];
};

export type RecordSynthesisUpdateEventInput = {
  eventType: SynthesisUpdateEventType;
  source: string;
  scope: {
    kind: SynthesisUpdateScopeKind;
    ref?: string;
  };
  sourceHash?: string;
  diagnostics?: SynthesisUpdateDiagnostic[];
};

export type SynthesisUpdateEventStoreOptions = {
  libraryId: number;
  repository: SynthesisRepository;
  now?: () => string;
  retryDelaysMs?: number[];
};

type QueueMeta = Pick<
  SynthesisUpdateQueueStatus,
  | "paused"
  | "queue_state"
  | "retry_attempt"
  | "next_retry_at"
  | "last_retry_at"
  | "last_failure"
  | "startup_reconcile"
  | "updated_at"
>;

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeLibraryId(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function nowIso() {
  return new Date().toISOString();
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(cleanString(value) || "{}");
    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeDiagnostic(value: unknown): SynthesisUpdateDiagnostic | null {
  if (!isObject(value)) {
    return null;
  }
  const code = cleanString(value.code) || "synthesis_update_diagnostic";
  const severity =
    value.severity === "error" || value.severity === "warning"
      ? value.severity
      : "info";
  const message = cleanString(value.message) || code;
  return { code, severity, message };
}

function normalizeDiagnostics(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(normalizeDiagnostic)
    .filter((diagnostic): diagnostic is SynthesisUpdateDiagnostic =>
      Boolean(diagnostic),
    );
}

function normalizeEventType(value: unknown): SynthesisUpdateEventType {
  const normalized = cleanString(value);
  if (
    normalized === "paper_artifact_changed" ||
    normalized === "digest_applied" ||
    normalized === "literature_matching_metadata_changed" ||
    normalized === "reference_matching_applied" ||
    normalized === "topic_synthesis_applied" ||
    normalized === "zotero_item_added" ||
    normalized === "zotero_item_updated" ||
    normalized === "zotero_item_deleted" ||
    normalized === "zotero_item_restored" ||
    normalized === "startup_reconcile_detected_dirty_items" ||
    normalized === "manual_registry_rebuild_requested" ||
    normalized === "manual_citation_graph_rebuild_requested" ||
    normalized === "manual_layout_recompute_requested" ||
    normalized === "citation_graph_structure_dirty" ||
    normalized === "citation_graph_complex_metrics_dirty" ||
    normalized === "topic_freshness_dirty" ||
    normalized === "startup_reconcile_requested"
  ) {
    return normalized;
  }
  return "paper_artifact_changed";
}

function normalizeScopeKind(value: unknown): SynthesisUpdateScopeKind {
  const normalized = cleanString(value);
  if (
    normalized === "library" ||
    normalized === "zotero_item" ||
    normalized === "paper" ||
    normalized === "work" ||
    normalized === "reference_instance" ||
    normalized === "topic" ||
    normalized === "citation_graph_structure" ||
    normalized === "citation_graph_layout"
  ) {
    return normalized;
  }
  return "library";
}

function normalizeEventStatus(value: unknown): SynthesisUpdateEventStatus {
  const normalized = cleanString(value);
  if (
    normalized === "running" ||
    normalized === "completed" ||
    normalized === "failed_retryable" ||
    normalized === "failed_permanent" ||
    normalized === "skipped"
  ) {
    return normalized;
  }
  return "queued";
}

function normalizeQueueState(value: unknown): SynthesisUpdateQueueState {
  const normalized = cleanString(value);
  if (
    normalized === "queued" ||
    normalized === "running" ||
    normalized === "paused" ||
    normalized === "failed_retryable" ||
    normalized === "failed_permanent"
  ) {
    return normalized;
  }
  return "idle";
}

function normalizeStartupState(value: unknown): SynthesisStartupReconcileState {
  const normalized = cleanString(value);
  if (
    normalized === "checking" ||
    normalized === "queued" ||
    normalized === "ready" ||
    normalized === "failed_retryable" ||
    normalized === "failed_permanent"
  ) {
    return normalized;
  }
  return "unknown";
}

function coerceNonNegativeInt(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function retryDelayMs(delays: number[], attempt: number) {
  const index = Math.max(0, Math.min(attempt - 1, delays.length - 1));
  return Math.max(0, Math.floor(Number(delays[index]) || 0));
}

function buildEventId(
  libraryId: number,
  eventType: SynthesisUpdateEventType,
  scopeKind: SynthesisUpdateScopeKind,
  scopeRef: string,
) {
  return `synthesis-update:${hashCanonicalJson({
    libraryId,
    eventType,
    scopeKind,
    scopeRef,
  }).slice("sha256:".length, "sha256:".length + 24)}`;
}

function dirtyRecordToEvent(
  record: SynthesisDirtyEventRecord,
  fallbackLibraryId: number,
): SynthesisUpdateEvent {
  const createdAt = cleanString(record.createdAt) || nowIso();
  const updatedAt = cleanString(record.updatedAt) || createdAt;
  return {
    schema_id: "synthesis.update_event",
    schema_version: SCHEMA_VERSION,
    library_id: normalizeLibraryId(record.libraryId) || fallbackLibraryId,
    event_id:
      cleanString(record.eventId) ||
      buildEventId(
        fallbackLibraryId,
        normalizeEventType(record.eventType),
        normalizeScopeKind(record.scopeKind),
        cleanString(record.scopeRef) || "library",
      ),
    event_type: normalizeEventType(record.eventType),
    source: cleanString(record.source) || "unknown",
    scope: {
      kind: normalizeScopeKind(record.scopeKind),
      ref: cleanString(record.scopeRef) || "library",
    },
    source_hash: cleanString(record.sourceHash) || undefined,
    status: normalizeEventStatus(record.status),
    attempt: coerceNonNegativeInt(record.attemptCount),
    next_retry_at: cleanString(record.nextRetryAt) || undefined,
    diagnostics: normalizeDiagnostics(
      parseJsonObjectArray(record.diagnosticsJson),
    ),
    coalesced_count: Math.max(
      1,
      Math.floor(Number(record.coalescedCount) || 1),
    ),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function parseJsonObjectArray(value: unknown): unknown[] {
  try {
    const parsed = JSON.parse(cleanString(value) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function eventToDirtyRecord(event: SynthesisUpdateEvent) {
  return {
    eventId: event.event_id,
    libraryId: event.library_id,
    eventType: event.event_type,
    source: event.source,
    scopeKind: event.scope.kind,
    scopeRef: event.scope.ref,
    sourceHash: event.source_hash,
    status: event.status,
    attemptCount: event.attempt,
    coalescedCount: event.coalesced_count,
    nextRetryAt: event.next_retry_at,
    diagnosticsJson: JSON.stringify(event.diagnostics),
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  } satisfies SynthesisDirtyEventRecord;
}

function defaultQueueMeta(libraryId: number, timestamp: string): QueueMeta {
  return {
    queue_state: "idle",
    paused: false,
    retry_attempt: 0,
    updated_at: timestamp,
    startup_reconcile: {
      state: "unknown",
      dirty_count: 0,
      diagnostics: [],
    },
  };
}

function readQueueMeta(
  repository: SynthesisRepository,
  libraryId: number,
  timestamp: string,
): QueueMeta {
  const row = repository.getJobProgress(QUEUE_STATE_JOB_NAME);
  const source = parseJsonObject(row?.progressJson);
  const startup = isObject(source.startup_reconcile)
    ? source.startup_reconcile
    : {};
  return {
    queue_state: normalizeQueueState(source.queue_state || row?.message),
    paused: Boolean(source.paused),
    retry_attempt: coerceNonNegativeInt(source.retry_attempt),
    next_retry_at: cleanString(source.next_retry_at) || undefined,
    last_retry_at: cleanString(source.last_retry_at) || undefined,
    last_failure:
      normalizeDiagnostic(source.last_failure) ||
      normalizeDiagnostics(parseJsonObjectArray(row?.diagnosticsJson))[0] ||
      undefined,
    startup_reconcile: {
      state: normalizeStartupState(startup.state),
      dirty_count: coerceNonNegativeInt(startup.dirty_count),
      last_checked_at: cleanString(startup.last_checked_at) || undefined,
      diagnostics: normalizeDiagnostics(startup.diagnostics),
    },
    updated_at: cleanString(source.updated_at || row?.updatedAt) || timestamp,
  };
}

function persistQueueMeta(
  repository: SynthesisRepository,
  meta: QueueMeta,
  timestamp: string,
) {
  repository.upsertJobProgress({
    jobName: QUEUE_STATE_JOB_NAME,
    source: "update_queue_state",
    label: "Synthesis update queue state",
    status: "idle",
    message: meta.queue_state,
    progressMode: "indeterminate",
    progressJson: JSON.stringify(meta),
    diagnosticsJson: meta.last_failure
      ? JSON.stringify([meta.last_failure])
      : "[]",
    updatedAt: timestamp,
    heartbeatAt: timestamp,
  });
}

function allowedActionsForQueue(status: SynthesisUpdateQueueStatus) {
  const actions = new Set<string>();
  if (status.paused) {
    actions.add("resumeSynthesisUpdates");
  } else {
    actions.add("pauseSynthesisUpdates");
  }
  if (
    status.queue_state === "failed_retryable" ||
    status.next_retry_at ||
    status.failed_count > 0
  ) {
    actions.add("retrySynthesisUpdateQueue");
  }
  if (status.pending_count > 0) {
    actions.add("runSynthesisMaintenance");
  }
  return Array.from(actions);
}

function deriveQueueState(args: {
  libraryId: number;
  stored: QueueMeta;
  events: SynthesisUpdateEvent[];
  timestamp: string;
}) {
  const pendingCount = args.events.filter(
    (event) => event.status === "queued",
  ).length;
  const runningCount = args.events.filter(
    (event) => event.status === "running",
  ).length;
  const failedCount = args.events.filter(
    (event) =>
      event.status === "failed_retryable" ||
      event.status === "failed_permanent",
  ).length;
  let queueState: SynthesisUpdateQueueState = "idle";
  if (args.stored.paused) {
    queueState = "paused";
  } else if (runningCount > 0) {
    queueState = "running";
  } else if (args.stored.queue_state === "failed_permanent") {
    queueState = "failed_permanent";
  } else if (
    args.stored.queue_state === "failed_retryable" ||
    args.stored.next_retry_at
  ) {
    queueState = "failed_retryable";
  } else if (
    pendingCount > 0 ||
    args.stored.startup_reconcile.state === "queued"
  ) {
    queueState = "queued";
  }
  const status: SynthesisUpdateQueueStatus = {
    schema_id: "synthesis.update_queue_state",
    schema_version: SCHEMA_VERSION,
    library_id: args.libraryId,
    queue_state: queueState,
    paused: args.stored.paused,
    pending_count: pendingCount,
    running_count: runningCount,
    failed_count: failedCount,
    retry_attempt: args.stored.retry_attempt,
    next_retry_at: args.stored.next_retry_at,
    last_retry_at: args.stored.last_retry_at,
    last_failure: args.stored.last_failure,
    startup_reconcile: args.stored.startup_reconcile,
    updated_at: args.stored.updated_at || args.timestamp,
    allowed_actions: [],
  };
  return { ...status, allowed_actions: allowedActionsForQueue(status) };
}

export function createSynthesisUpdateEventStore(
  options: SynthesisUpdateEventStoreOptions,
) {
  const libraryId = Math.max(0, Math.floor(Number(options.libraryId) || 0));
  const repository = options.repository;
  const now = options.now || nowIso;
  const retryDelaysMs =
    options.retryDelaysMs && options.retryDelaysMs.length
      ? options.retryDelaysMs
      : DEFAULT_RETRY_DELAYS_MS;

  function listEvents(): SynthesisUpdateEvent[] {
    return repository
      .listDirtyEvents()
      .map((row) => dirtyRecordToEvent(row, libraryId))
      .filter(
        (event) => event.library_id === libraryId || event.library_id === 0,
      );
  }

  function loadStoredQueueMeta(timestamp = now()) {
    return readQueueMeta(repository, libraryId, timestamp);
  }

  function loadQueueState() {
    const timestamp = now();
    return deriveQueueState({
      libraryId,
      stored: loadStoredQueueMeta(timestamp),
      events: listEvents(),
      timestamp,
    });
  }

  function persistAndDeriveQueue(meta: QueueMeta, timestamp: string) {
    const queue = deriveQueueState({
      libraryId,
      stored: meta,
      events: listEvents(),
      timestamp,
    });
    persistQueueMeta(repository, queue, timestamp);
    return queue;
  }

  function recordEvent(input: RecordSynthesisUpdateEventInput) {
    const timestamp = now();
    const eventType = normalizeEventType(input.eventType);
    const scopeKind = normalizeScopeKind(input.scope?.kind);
    const scopeRef = cleanString(input.scope?.ref) || "library";
    const eventId = buildEventId(libraryId, eventType, scopeKind, scopeRef);
    const existing = listEvents().find((event) => event.event_id === eventId);
    const event: SynthesisUpdateEvent = {
      schema_id: "synthesis.update_event",
      schema_version: SCHEMA_VERSION,
      library_id: libraryId,
      event_id: eventId,
      event_type: eventType,
      source: cleanString(input.source) || existing?.source || "unknown",
      scope: { kind: scopeKind, ref: scopeRef },
      source_hash: cleanString(input.sourceHash) || existing?.source_hash,
      status: "queued",
      attempt: existing?.attempt || 0,
      diagnostics: normalizeDiagnostics(input.diagnostics),
      coalesced_count: (existing?.coalesced_count || 0) + 1,
      created_at: existing?.created_at || timestamp,
      updated_at: timestamp,
    };
    repository.upsertDirtyEvent(eventToDirtyRecord(event));
    const queue = deriveQueueState({
      libraryId,
      stored: { ...loadStoredQueueMeta(timestamp), updated_at: timestamp },
      events: listEvents(),
      timestamp,
    });
    persistQueueMeta(repository, queue, timestamp);
    return { event, queue };
  }

  function pause() {
    const timestamp = now();
    return persistAndDeriveQueue(
      {
        ...loadStoredQueueMeta(timestamp),
        paused: true,
        queue_state: "paused",
        updated_at: timestamp,
      },
      timestamp,
    );
  }

  function resume() {
    const timestamp = now();
    return persistAndDeriveQueue(
      {
        ...loadStoredQueueMeta(timestamp),
        paused: false,
        queue_state: "queued",
        next_retry_at: undefined,
        updated_at: timestamp,
      },
      timestamp,
    );
  }

  function retryNow() {
    const timestamp = now();
    for (const event of listEvents()) {
      if (event.status !== "failed_retryable") {
        continue;
      }
      repository.upsertDirtyEvent(
        eventToDirtyRecord({
          ...event,
          status: "queued",
          next_retry_at: undefined,
          last_retry_at: timestamp,
          updated_at: timestamp,
        }),
      );
    }
    return persistAndDeriveQueue(
      {
        ...loadStoredQueueMeta(timestamp),
        queue_state: "queued",
        retry_attempt: 0,
        next_retry_at: undefined,
        last_retry_at: timestamp,
        updated_at: timestamp,
      },
      timestamp,
    );
  }

  function markFailure(args: {
    retryable: boolean;
    diagnostic: SynthesisUpdateDiagnostic;
  }) {
    const timestamp = now();
    const stored = loadStoredQueueMeta(timestamp);
    const retryAttempt = args.retryable ? stored.retry_attempt + 1 : 0;
    const nextRetryAt = args.retryable
      ? new Date(
          Date.parse(timestamp) + retryDelayMs(retryDelaysMs, retryAttempt),
        ).toISOString()
      : undefined;
    return persistAndDeriveQueue(
      {
        ...stored,
        queue_state: args.retryable ? "failed_retryable" : "failed_permanent",
        retry_attempt: retryAttempt,
        next_retry_at: nextRetryAt,
        last_failure: normalizeDiagnostic(args.diagnostic) || args.diagnostic,
        updated_at: timestamp,
      },
      timestamp,
    );
  }

  function updateEventStatus(args: {
    eventId: string;
    status: SynthesisUpdateEventStatus;
    diagnostics?: SynthesisUpdateDiagnostic[];
  }) {
    const timestamp = now();
    const event = listEvents().find((entry) => entry.event_id === args.eventId);
    if (!event) {
      return loadQueueState();
    }
    const attempt =
      args.status === "failed_retryable"
        ? Math.max(0, event.attempt) + 1
        : event.attempt;
    const nextRetryAt =
      args.status === "failed_retryable"
        ? new Date(
            Date.parse(timestamp) + retryDelayMs(retryDelaysMs, attempt),
          ).toISOString()
        : undefined;
    repository.upsertDirtyEvent(
      eventToDirtyRecord({
        ...event,
        status: args.status,
        attempt,
        next_retry_at: nextRetryAt,
        last_retry_at:
          args.status === "queued" || args.status === "failed_retryable"
            ? timestamp
            : event.last_retry_at,
        diagnostics: normalizeDiagnostics(args.diagnostics),
        updated_at: timestamp,
      }),
    );
    return persistAndDeriveQueue(
      { ...loadStoredQueueMeta(timestamp), updated_at: timestamp },
      timestamp,
    );
  }

  function completeEvent(args: {
    eventId: string;
    diagnostics?: SynthesisUpdateDiagnostic[];
  }) {
    return updateEventStatus({
      eventId: args.eventId,
      status: "completed",
      diagnostics: args.diagnostics,
    });
  }

  function failEvent(args: {
    eventId: string;
    retryable: boolean;
    diagnostics?: SynthesisUpdateDiagnostic[];
  }) {
    return updateEventStatus({
      eventId: args.eventId,
      status: args.retryable ? "failed_retryable" : "failed_permanent",
      diagnostics: args.diagnostics,
    });
  }

  function recordStartupReconcileState(args: {
    state: SynthesisStartupReconcileState;
    dirtyCount?: number;
    diagnostics?: SynthesisUpdateDiagnostic[];
  }) {
    const timestamp = now();
    const stored = loadStoredQueueMeta(timestamp);
    return persistAndDeriveQueue(
      {
        ...stored,
        startup_reconcile: {
          state: normalizeStartupState(args.state),
          dirty_count: coerceNonNegativeInt(args.dirtyCount),
          last_checked_at: timestamp,
          diagnostics: normalizeDiagnostics(args.diagnostics),
        },
        updated_at: timestamp,
      },
      timestamp,
    );
  }

  return {
    listEvents,
    loadQueueState,
    recordEvent,
    pause,
    resume,
    retryNow,
    markFailure,
    completeEvent,
    failEvent,
    recordStartupReconcileState,
  };
}
