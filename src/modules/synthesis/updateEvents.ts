import {
  listPluginTaskRowEntries,
  upsertPluginTaskRowEntry,
  type PluginTaskRowEntry,
} from "../pluginStateStore";
import { hashCanonicalJson } from "./foundation";

const DOMAIN = "synthesis-updates";
const EVENT_SCOPE = "synthesis-update-events";
const STATE_SCOPE = "synthesis-update-state";
const STATE_TASK_ID = "queue";
const SCHEMA_VERSION = "1.0.0";
const DEFAULT_RETRY_DELAYS_MS = [60_000, 300_000, 900_000, 1_800_000];

export type SynthesisUpdateEventType =
  | "paper_artifact_changed"
  | "digest_applied"
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
  now?: () => string;
  retryDelaysMs?: number[];
};

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
  return Array.isArray(value)
    ? value
        .map(normalizeDiagnostic)
        .filter((diagnostic): diagnostic is SynthesisUpdateDiagnostic =>
          Boolean(diagnostic),
        )
    : [];
}

function normalizeEventType(value: unknown): SynthesisUpdateEventType {
  const normalized = cleanString(value);
  if (
    normalized === "paper_artifact_changed" ||
    normalized === "digest_applied" ||
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

function coerceAttempt(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parsePayload(row: PluginTaskRowEntry) {
  try {
    return JSON.parse(row.payload) as unknown;
  } catch {
    return null;
  }
}

function normalizeEvent(raw: unknown, fallback: Partial<SynthesisUpdateEvent>) {
  const source = isObject(raw) ? raw : {};
  const scope = isObject(source.scope) ? source.scope : {};
  const eventType = normalizeEventType(
    source.event_type || fallback.event_type,
  );
  const scopeKind = normalizeScopeKind(scope.kind || fallback.scope?.kind);
  const scopeRef = cleanString(scope.ref || fallback.scope?.ref) || "library";
  const libraryId = normalizeLibraryId(
    source.library_id || fallback.library_id,
  );
  const createdAt =
    cleanString(source.created_at || fallback.created_at) || nowIso();
  const updatedAt =
    cleanString(source.updated_at || fallback.updated_at) || createdAt;
  const eventId =
    cleanString(source.event_id || fallback.event_id) ||
    buildEventId(libraryId, eventType, scopeKind, scopeRef);
  return {
    schema_id: "synthesis.update_event" as const,
    schema_version: SCHEMA_VERSION,
    library_id: libraryId,
    event_id: eventId,
    event_type: eventType,
    source: cleanString(source.source || fallback.source) || "unknown",
    scope: {
      kind: scopeKind,
      ref: scopeRef,
    },
    source_hash:
      cleanString(source.source_hash || fallback.source_hash) || undefined,
    status: normalizeEventStatus(source.status || fallback.status),
    attempt: coerceAttempt(source.attempt || fallback.attempt),
    next_retry_at:
      cleanString(source.next_retry_at || fallback.next_retry_at) || undefined,
    last_retry_at:
      cleanString(source.last_retry_at || fallback.last_retry_at) || undefined,
    diagnostics: normalizeDiagnostics(
      source.diagnostics || fallback.diagnostics,
    ),
    coalesced_count: Math.max(
      1,
      coerceAttempt(source.coalesced_count || fallback.coalesced_count || 1),
    ),
    created_at: createdAt,
    updated_at: updatedAt,
  } satisfies SynthesisUpdateEvent;
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

function taskIdForEvent(event: SynthesisUpdateEvent) {
  return event.event_id;
}

function eventToRow(event: SynthesisUpdateEvent): PluginTaskRowEntry {
  return {
    taskId: taskIdForEvent(event),
    requestId: event.event_id,
    backendId: `${event.scope.kind}:${event.scope.ref}`,
    state: event.status,
    updatedAt: event.updated_at,
    payload: JSON.stringify(event),
  };
}

function stateRowToStatus(
  row: PluginTaskRowEntry | undefined,
  libraryId: number,
  timestamp: string,
) {
  const payload = row ? parsePayload(row) : null;
  const source = isObject(payload) ? payload : {};
  const startup = isObject(source.startup_reconcile)
    ? source.startup_reconcile
    : {};
  const paused = Boolean(source.paused);
  return {
    schema_id: "synthesis.update_queue_state" as const,
    schema_version: SCHEMA_VERSION,
    library_id: libraryId,
    queue_state: normalizeQueueState(source.queue_state),
    paused,
    pending_count: Math.max(0, Math.floor(Number(source.pending_count) || 0)),
    running_count: Math.max(0, Math.floor(Number(source.running_count) || 0)),
    failed_count: Math.max(0, Math.floor(Number(source.failed_count) || 0)),
    retry_attempt: Math.max(0, Math.floor(Number(source.retry_attempt) || 0)),
    next_retry_at: cleanString(source.next_retry_at) || undefined,
    last_retry_at: cleanString(source.last_retry_at) || undefined,
    last_failure:
      normalizeDiagnostic(source.last_failure) ||
      normalizeDiagnostics(source.diagnostics)[0] ||
      undefined,
    startup_reconcile: {
      state: normalizeStartupState(startup.state),
      dirty_count: Math.max(0, Math.floor(Number(startup.dirty_count) || 0)),
      last_checked_at: cleanString(startup.last_checked_at) || undefined,
      diagnostics: normalizeDiagnostics(startup.diagnostics),
    },
    updated_at: cleanString(source.updated_at) || timestamp,
    allowed_actions: [] as string[],
  } satisfies SynthesisUpdateQueueStatus;
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

function deriveQueueState(args: {
  stored: SynthesisUpdateQueueStatus;
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
  } else if (pendingCount > 0) {
    queueState = "queued";
  }
  const status: SynthesisUpdateQueueStatus = {
    ...args.stored,
    queue_state: queueState,
    pending_count: pendingCount,
    running_count: runningCount,
    failed_count: failedCount,
    updated_at: args.stored.updated_at || args.timestamp,
  };
  return { ...status, allowed_actions: allowedActionsForQueue(status) };
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

function persistQueueState(status: SynthesisUpdateQueueStatus) {
  upsertPluginTaskRowEntry(DOMAIN, STATE_SCOPE, {
    taskId: `${STATE_TASK_ID}:${status.library_id}`,
    requestId: `${STATE_TASK_ID}:${status.library_id}`,
    backendId: "synthesis",
    state: status.queue_state,
    updatedAt: status.updated_at,
    payload: JSON.stringify(status),
  });
}

function retryDelayMs(delays: number[], attempt: number) {
  const index = Math.max(0, Math.min(attempt - 1, delays.length - 1));
  return Math.max(0, Math.floor(Number(delays[index]) || 0));
}

export function createSynthesisUpdateEventStore(
  options: SynthesisUpdateEventStoreOptions,
) {
  const libraryId = Math.max(0, Math.floor(Number(options.libraryId) || 0));
  const now = options.now || nowIso;
  const retryDelaysMs =
    options.retryDelaysMs && options.retryDelaysMs.length
      ? options.retryDelaysMs
      : DEFAULT_RETRY_DELAYS_MS;

  function listEvents(): SynthesisUpdateEvent[] {
    return listPluginTaskRowEntries(DOMAIN, EVENT_SCOPE)
      .map((row) =>
        normalizeEvent(parsePayload(row), {
          event_id: row.taskId,
          status: row.state as SynthesisUpdateEventStatus,
          updated_at: row.updatedAt,
          library_id: libraryId,
        }),
      )
      .filter((event) => event.library_id === libraryId);
  }

  function loadStoredQueueState(timestamp = now()) {
    const row = listPluginTaskRowEntries(DOMAIN, STATE_SCOPE).find(
      (entry) => entry.taskId === `${STATE_TASK_ID}:${libraryId}`,
    );
    return stateRowToStatus(row, libraryId, timestamp);
  }

  function loadQueueState() {
    const timestamp = now();
    return deriveQueueState({
      stored: loadStoredQueueState(timestamp),
      events: listEvents(),
      timestamp,
    });
  }

  function recordEvent(input: RecordSynthesisUpdateEventInput) {
    const timestamp = now();
    const eventType = normalizeEventType(input.eventType);
    const scopeKind = normalizeScopeKind(input.scope?.kind);
    const scopeRef = cleanString(input.scope?.ref) || "library";
    const eventId = buildEventId(libraryId, eventType, scopeKind, scopeRef);
    const existing = listEvents().find((event) => event.event_id === eventId);
    const event = normalizeEvent(
      {
        ...(existing || {}),
        schema_id: "synthesis.update_event",
        schema_version: SCHEMA_VERSION,
        library_id: libraryId,
        event_id: eventId,
        event_type: eventType,
        source: input.source,
        scope: { kind: scopeKind, ref: scopeRef },
        source_hash: cleanString(input.sourceHash) || existing?.source_hash,
        status: "queued",
        next_retry_at: undefined,
        diagnostics: normalizeDiagnostics(input.diagnostics),
        coalesced_count: (existing?.coalesced_count || 0) + 1,
        created_at: existing?.created_at || timestamp,
        updated_at: timestamp,
      },
      {
        library_id: libraryId,
        event_id: eventId,
        event_type: eventType,
        source: input.source,
        scope: { kind: scopeKind, ref: scopeRef },
        status: "queued",
        created_at: timestamp,
        updated_at: timestamp,
      },
    );
    upsertPluginTaskRowEntry(DOMAIN, EVENT_SCOPE, eventToRow(event));
    const queue = deriveQueueState({
      stored: {
        ...loadStoredQueueState(timestamp),
        updated_at: timestamp,
      },
      events: listEvents()
        .filter((entry) => entry.event_id !== eventId)
        .concat(event),
      timestamp,
    });
    persistQueueState(queue);
    return { event, queue };
  }

  function pause() {
    const timestamp = now();
    const queue = deriveQueueState({
      stored: {
        ...loadStoredQueueState(timestamp),
        paused: true,
        queue_state: "paused",
        updated_at: timestamp,
      },
      events: listEvents(),
      timestamp,
    });
    persistQueueState(queue);
    return queue;
  }

  function resume() {
    const timestamp = now();
    const queue = deriveQueueState({
      stored: {
        ...loadStoredQueueState(timestamp),
        paused: false,
        queue_state: "queued",
        next_retry_at: undefined,
        updated_at: timestamp,
      },
      events: listEvents(),
      timestamp,
    });
    persistQueueState(queue);
    return queue;
  }

  function retryNow() {
    const timestamp = now();
    const events = listEvents().map((event) => {
      if (event.status !== "failed_retryable") {
        return event;
      }
      const next = {
        ...event,
        status: "queued" as const,
        next_retry_at: undefined,
        last_retry_at: timestamp,
        updated_at: timestamp,
      };
      upsertPluginTaskRowEntry(DOMAIN, EVENT_SCOPE, eventToRow(next));
      return next;
    });
    const queue = deriveQueueState({
      stored: {
        ...loadStoredQueueState(timestamp),
        queue_state: "queued",
        retry_attempt: 0,
        next_retry_at: undefined,
        last_retry_at: timestamp,
        updated_at: timestamp,
      },
      events,
      timestamp,
    });
    persistQueueState(queue);
    return queue;
  }

  function markFailure(args: {
    retryable: boolean;
    diagnostic: SynthesisUpdateDiagnostic;
  }) {
    const timestamp = now();
    const stored = loadStoredQueueState(timestamp);
    const retryAttempt = args.retryable ? stored.retry_attempt + 1 : 0;
    const nextRetryAt = args.retryable
      ? new Date(
          Date.parse(timestamp) + retryDelayMs(retryDelaysMs, retryAttempt),
        ).toISOString()
      : undefined;
    const queue = deriveQueueState({
      stored: {
        ...stored,
        queue_state: args.retryable ? "failed_retryable" : "failed_permanent",
        retry_attempt: retryAttempt,
        next_retry_at: nextRetryAt,
        last_failure: normalizeDiagnostic(args.diagnostic) || args.diagnostic,
        updated_at: timestamp,
      },
      events: listEvents(),
      timestamp,
    });
    persistQueueState(queue);
    return queue;
  }

  function updateEventStatus(args: {
    eventId: string;
    status: SynthesisUpdateEventStatus;
    diagnostics?: SynthesisUpdateDiagnostic[];
  }) {
    const timestamp = now();
    const events = listEvents();
    const event = events.find((entry) => entry.event_id === args.eventId);
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
    const nextEvent: SynthesisUpdateEvent = {
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
    };
    upsertPluginTaskRowEntry(DOMAIN, EVENT_SCOPE, eventToRow(nextEvent));
    const queue = deriveQueueState({
      stored: {
        ...loadStoredQueueState(timestamp),
        updated_at: timestamp,
      },
      events: events
        .filter((entry) => entry.event_id !== args.eventId)
        .concat(nextEvent),
      timestamp,
    });
    persistQueueState(queue);
    return queue;
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
    const stored = loadStoredQueueState(timestamp);
    const queue = deriveQueueState({
      stored: {
        ...stored,
        startup_reconcile: {
          state: normalizeStartupState(args.state),
          dirty_count: Math.max(0, Math.floor(Number(args.dirtyCount) || 0)),
          last_checked_at: timestamp,
          diagnostics: normalizeDiagnostics(args.diagnostics),
        },
        updated_at: timestamp,
      },
      events: listEvents(),
      timestamp,
    });
    persistQueueState(queue);
    return queue;
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
