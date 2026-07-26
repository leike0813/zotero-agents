import { getPref, setPref } from "../utils/prefs";
import { version } from "../../package.json";
import {
  getRuntimePersistencePaths,
  readRuntimeTextFile,
  registerRuntimeLogClearer,
  replaceRuntimeTextFileAtomically,
} from "./runtimePersistence";
import { isDebugModeEnabled } from "./debugMode";
import {
  incrementAcpRuntimeMetric,
  observeAcpRuntimeDuration,
  readAcpRuntimePerformanceClockMs,
  snapshotAcpRuntimeProfiles,
  type AcpRuntimePerformanceSnapshot,
} from "./acpRuntimePerformanceProfiler";

export type RuntimeLogLevel = "debug" | "info" | "warn" | "error";
export type RuntimeLogErrorCategory =
  | "network"
  | "timeout"
  | "auth"
  | "validation"
  | "provider"
  | "hook"
  | "unknown";

export type RuntimeLogRetentionMode = "normal" | "diagnostic";

export type RuntimeLogScope =
  | "workflow-trigger"
  | "job"
  | "state-machine"
  | "provider"
  | "hook"
  | "system";

export function createDefaultLogViewerLevelFilter(): Record<
  RuntimeLogLevel,
  boolean
> {
  return {
    debug: false,
    info: true,
    warn: true,
    error: true,
  };
}

export function filterLogsByLevels(
  entries: RuntimeLogEntry[],
  levelFilter: Record<RuntimeLogLevel, boolean>,
) {
  const active = new Set(
    (["debug", "info", "warn", "error"] as RuntimeLogLevel[]).filter(
      (level) => levelFilter[level],
    ),
  );
  return entries.filter((entry) => active.has(entry.level));
}

export function buildLogCopyPayload(args: {
  entries: RuntimeLogEntry[];
  format?: "pretty-json" | "ndjson";
}) {
  if (args.format === "ndjson") {
    return formatRuntimeLogsAsNDJSON(args.entries);
  }
  return formatRuntimeLogsAsPrettyJson(args.entries);
}

export type RuntimeLogTransportSummary = {
  method?: string;
  url?: string;
  path?: string;
  status?: number;
  duration?: number;
  retry?: number;
  size?: number;
  stepId?: string;
};

export type RuntimeLogEntry = {
  id: string;
  ts: string;
  level: RuntimeLogLevel;
  scope: RuntimeLogScope;
  schemaVersion: number;
  diagnosticMode: boolean;
  workflowId?: string;
  backendId?: string;
  backendType?: string;
  providerId?: string;
  runId?: string;
  requestId?: string;
  jobId?: string;
  interactionId?: string;
  component?: string;
  operation?: string;
  attempt?: number;
  phase?: string;
  transport?: RuntimeLogTransportSummary;
  stage: string;
  message: string;
  details?: unknown;
  error?: {
    name: string;
    message: string;
    stack?: string;
    category?: RuntimeLogErrorCategory;
    cause?: string;
  };
};

export type RuntimeLogInput = Omit<
  RuntimeLogEntry,
  "id" | "ts" | "error" | "schemaVersion" | "diagnosticMode"
> & {
  ts?: string;
  error?: unknown;
  schemaVersion?: number;
  diagnosticMode?: boolean;
};

export type RuntimeLogListFilters = {
  levels?: RuntimeLogLevel[];
  scopes?: RuntimeLogScope[];
  backendId?: string | string[];
  backendType?: string;
  providerId?: string;
  workflowId?: string | string[];
  runId?: string;
  requestId?: string;
  jobId?: string;
  interactionId?: string;
  component?: string;
  operation?: string;
  fromTs?: string;
  toTs?: string;
  order?: "asc" | "desc";
  limit?: number;
};

type RuntimeLogSnapshot = {
  entries: RuntimeLogEntry[];
  droppedEntries: number;
  droppedByReason: RuntimeLogDropReasonCounter;
  maxEntries: number;
  maxBytes: number;
  estimatedBytes: number;
  retentionMode: RuntimeLogRetentionMode;
  diagnosticMode: boolean;
  sanitizationPolicy: {
    redactedPlaceholder: string;
    stringLimit: number;
  };
};

type RuntimeDiagnosticBundleFilters = RuntimeLogListFilters;

export type RuntimeDiagnosticTimelineEvent = {
  id: string;
  ts: string;
  level: RuntimeLogLevel;
  scope: RuntimeLogScope;
  stage: string;
  message: string;
  workflowId?: string;
  backendId?: string;
  backendType?: string;
  providerId?: string;
  runId?: string;
  jobId?: string;
  requestId?: string;
  interactionId?: string;
  component?: string;
  operation?: string;
  phase?: string;
  attempt?: number;
  transport?: RuntimeLogTransportSummary;
  category?: RuntimeLogErrorCategory;
};

export type RuntimeDiagnosticIncident = {
  chainId: string;
  workflowId?: string;
  runId?: string;
  jobId?: string;
  requestId?: string;
  interactionId?: string;
  firstError?: {
    ts: string;
    stage: string;
    message: string;
    category?: RuntimeLogErrorCategory;
  };
  retryCount: number;
  terminalStatus?: "succeeded" | "failed" | "canceled";
  eventCount: number;
};

export type RuntimeDiagnosticBundleV1 = {
  schemaVersion: "runtime-diagnostic-bundle/v1";
  generatedAt: string;
  meta: {
    pluginVersion: string;
    runtimeVersion: string;
    platform: string;
    locale: string;
    retentionMode: RuntimeLogRetentionMode;
    diagnosticMode: boolean;
    retentionBudget: {
      maxEntries: number;
      maxBytes: number;
      estimatedBytes: number;
      droppedEntries: number;
      droppedByReason: RuntimeLogDropReasonCounter;
    };
    sanitization: {
      redactedPlaceholder: string;
      stringLimit: number;
      textPreviewLimit: number;
    };
    window: {
      fromTs?: string;
      toTs?: string;
    };
  };
  filters: RuntimeDiagnosticBundleFilters;
  timeline: RuntimeDiagnosticTimelineEvent[];
  incidents: RuntimeDiagnosticIncident[];
  entries: Array<Record<string, unknown>>;
  performanceProfiles?: AcpRuntimePerformanceSnapshot;
};

export type RuntimeIssueDiagnosticEvidenceGap = {
  code:
    | "no_retained_runtime_logs"
    | "missing_request_context"
    | "missing_acp_backend_probe"
    | "missing_skillrunner_model_cache_refresh"
    | "retention_evicted_entries";
  message: string;
  backendId?: string;
  backendType?: string;
  requestId?: string;
};

export type RuntimeIssueDiagnosticBundleV1 = {
  schemaVersion: "runtime-issue-diagnostic-bundle/v1";
  generatedAt: string;
  environment: {
    pluginVersion: string;
    runtimeVersion: string;
    platform: string;
    locale: string;
    retentionMode: RuntimeLogRetentionMode;
    diagnosticMode: boolean;
    retentionBudget: {
      maxEntries: number;
      maxBytes: number;
      estimatedBytes: number;
      droppedEntries: number;
      droppedByReason: RuntimeLogDropReasonCounter;
    };
  };
  context: {
    filters: RuntimeDiagnosticBundleFilters;
    backendIds: string[];
    backendTypes: string[];
    workflowIds: string[];
    runIds: string[];
    requestIds: string[];
    jobIds: string[];
  };
  backendHealth: {
    acpRuntimeOptions: RuntimeIssueBackendOperationHealth[];
    skillRunnerModelCache: RuntimeIssueBackendOperationHealth[];
  };
  incidents: RuntimeDiagnosticIncident[];
  timeline: RuntimeDiagnosticTimelineEvent[];
  evidenceGaps: RuntimeIssueDiagnosticEvidenceGap[];
  redaction: {
    redactedPlaceholder: string;
    stringLimit: number;
    textPreviewLimit: number;
    includesDebug: boolean;
    includesRawEntries: boolean;
  };
  developerRawEntries?: Array<Record<string, unknown>>;
  performanceProfiles?: AcpRuntimePerformanceSnapshot;
};

export type RuntimeIssueBackendOperationHealth = {
  backendId?: string;
  backendType?: string;
  operation: string;
  status: "started" | "ok" | "failed" | "unknown";
  lastStage?: string;
  lastMessage?: string;
  lastTs?: string;
  eventCount: number;
  summary?: unknown;
};

type RuntimeLogDocument = {
  entries?: unknown;
  droppedEntries?: unknown;
  droppedByReason?: unknown;
};

export type RuntimeLogChange = {
  revision: number;
  kind: "append" | "clear" | "settings";
  entry?: RuntimeLogEntry;
  evictedEntryIds: string[];
};

type RuntimeLogListener = (change: RuntimeLogChange) => void;

export type RuntimeLogSummary = Omit<RuntimeLogSnapshot, "entries"> & {
  entryCount: number;
  facets: {
    backendIds: string[];
    workflowIds: string[];
  };
};

type RuntimeLogPersistenceWriter = (args: {
  path: string;
  fragments: Iterable<string>;
}) => Promise<void>;

type RuntimeLogDropReasonCounter = {
  entry_limit: number;
  byte_budget: number;
  expired: number;
};

const NORMAL_MAX_ENTRIES = 2000;
const NORMAL_MAX_BYTES = 0;
const DIAGNOSTIC_MAX_ENTRIES = 3000;
const DIAGNOSTIC_MAX_BYTES = 20 * 1024 * 1024;
const HISTORY_PREF_KEY = "runtimeLogsJson";
const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const MAX_STRING_LENGTH = 4000;
const DIAGNOSTIC_TEXT_PREVIEW_LIMIT = 480;
const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 100;
const MAX_OBJECT_KEYS = 200;
const REDACTED = "<redacted>";
const DEFAULT_ALLOWED_LEVELS = new Set<RuntimeLogLevel>([
  "info",
  "warn",
  "error",
]);
const SENSITIVE_KEY =
  /(authorization|token|secret|password|api[-_]?key|cookie|bearer)/i;
const PERSIST_IDLE_DEBOUNCE_MS = 250;
const PERSIST_MAX_DELAY_MS = 2000;

let sequence = 0;
let droppedEntries = 0;
let droppedByReason: RuntimeLogDropReasonCounter = {
  entry_limit: 0,
  byte_budget: 0,
  expired: 0,
};
const entries: RuntimeLogEntry[] = [];
const entryByteSizes = new Map<string, number>();
const serializedEntries = new Map<string, string>();
let estimatedBytes = 0;
const listeners = new Set<RuntimeLogListener>();
const allowedLevels = new Set<RuntimeLogLevel>(DEFAULT_ALLOWED_LEVELS);
let diagnosticMode = false;
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let persistenceDirty = false;
let persistIdleTimer: ReturnType<typeof setTimeout> | null = null;
let persistMaxDelayTimer: ReturnType<typeof setTimeout> | null = null;
let changeRevision = 0;
let durableRevision = 0;
let inFlightSave: Promise<void> | null = null;
let persistenceFlushCount = 0;
let filePersistenceFailureCount = 0;
let entrySerializationCount = 0;
let legacyMigrationRevision: number | null = null;
let persistenceWriterForTests: RuntimeLogPersistenceWriter | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cloneEntry(entry: RuntimeLogEntry): RuntimeLogEntry {
  return {
    ...entry,
    details:
      typeof entry.details === "undefined"
        ? undefined
        : JSON.parse(JSON.stringify(entry.details)),
    error: entry.error ? { ...entry.error } : undefined,
    transport: entry.transport ? { ...entry.transport } : undefined,
  };
}

function sanitizeString(value: string) {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }
  return `${value.slice(0, MAX_STRING_LENGTH)}...<truncated>`;
}

function sanitizeValue(
  value: unknown,
  keyHint?: string,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (keyHint && SENSITIVE_KEY.test(keyHint)) {
    return REDACTED;
  }

  if (value === null || typeof value === "undefined") {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return "[max-depth]";
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "function") {
    return `[function ${value.name || "anonymous"}]`;
  }

  if (value instanceof Error) {
    return normalizeError(value);
  }
  if (value instanceof Uint8Array) {
    return `[binary:${value.byteLength}]`;
  }
  if (value instanceof ArrayBuffer) {
    return `[binary:${value.byteLength}]`;
  }

  if (typeof value === "object") {
    const typed = value as object;
    if (seen.has(typed)) {
      return "[circular]";
    }
    seen.add(typed);

    if (Array.isArray(value)) {
      const sliced = value.slice(0, MAX_ARRAY_ITEMS);
      const normalized = sliced.map((entry) =>
        sanitizeValue(entry, undefined, depth + 1, seen),
      );
      if (value.length > MAX_ARRAY_ITEMS) {
        normalized.push(`[... ${value.length - MAX_ARRAY_ITEMS} more items]`);
      }
      return normalized;
    }

    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const keys = Object.keys(source);
    for (const key of keys.slice(0, MAX_OBJECT_KEYS)) {
      result[key] = sanitizeValue(source[key], key, depth + 1, seen);
    }
    if (keys.length > MAX_OBJECT_KEYS) {
      result.__truncated_keys__ = keys.length - MAX_OBJECT_KEYS;
    }
    return result;
  }

  return String(value);
}

function normalizeLevel(input: unknown): RuntimeLogLevel {
  const value = String(input || "")
    .trim()
    .toLowerCase();
  if (
    value === "debug" ||
    value === "info" ||
    value === "warn" ||
    value === "error"
  ) {
    return value;
  }
  return "info";
}

function normalizeScope(input: unknown): RuntimeLogScope {
  const value = String(input || "")
    .trim()
    .toLowerCase();
  if (
    value === "workflow-trigger" ||
    value === "job" ||
    value === "state-machine" ||
    value === "provider" ||
    value === "hook" ||
    value === "system"
  ) {
    return value;
  }
  return "system";
}

function normalizeError(error: unknown) {
  if (!error) {
    return undefined;
  }
  const category = classifyErrorCategory(error);
  const cause = extractErrorCauseSummary(error);
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || String(error),
      stack: error.stack || undefined,
      category,
      cause,
    };
  }
  if (typeof error === "string") {
    return {
      name: "Error",
      message: sanitizeString(error),
      category,
      cause,
    };
  }
  if (typeof error === "object" && error !== null) {
    const rec = error as Record<string, unknown>;
    if (typeof rec.message === "string" && rec.message.trim()) {
      return {
        name: String(rec.name || "Error"),
        message: sanitizeString(rec.message),
        stack: typeof rec.stack === "string" ? rec.stack : undefined,
        category,
        cause,
      };
    }
  }
  try {
    return {
      name: "Error",
      message: sanitizeString(JSON.stringify(error)),
      category,
      cause,
    };
  } catch {
    return {
      name: "Error",
      message: sanitizeString(String(error)),
      category,
      cause,
    };
  }
}

function normalizeId(input: unknown) {
  const value = String(input || "").trim();
  return value || undefined;
}

function parseSequenceFromLogId(id: string) {
  const matched = /^log-(\d+)$/.exec(String(id || "").trim());
  if (!matched) {
    return 0;
  }
  const parsed = Number(matched[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function normalizeAttempt(input: unknown) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }
  return Math.floor(parsed);
}

function normalizeErrorCategory(
  input: unknown,
): RuntimeLogErrorCategory | undefined {
  const value = normalizeId(input);
  if (
    value === "network" ||
    value === "timeout" ||
    value === "auth" ||
    value === "validation" ||
    value === "provider" ||
    value === "hook" ||
    value === "unknown"
  ) {
    return value;
  }
  return undefined;
}

function normalizeTransport(
  input: unknown,
): RuntimeLogTransportSummary | undefined {
  if (!isRecord(input)) {
    return undefined;
  }
  const transport: RuntimeLogTransportSummary = {};
  const method = normalizeId(input.method);
  const url = normalizeId(input.url);
  const path = normalizeId(input.path);
  const stepId = normalizeId(input.stepId);
  const statusRaw = Number(input.status);
  const durationRaw = Number(input.duration);
  const retryRaw = Number(input.retry);
  const sizeRaw = Number(input.size);
  if (method) {
    transport.method = method;
  }
  if (url) {
    transport.url = url;
  }
  if (path) {
    transport.path = path;
  }
  if (stepId) {
    transport.stepId = stepId;
  }
  if (Number.isFinite(statusRaw) && statusRaw >= 0) {
    transport.status = Math.floor(statusRaw);
  }
  if (Number.isFinite(durationRaw) && durationRaw >= 0) {
    transport.duration = Math.floor(durationRaw);
  }
  if (Number.isFinite(retryRaw) && retryRaw >= 0) {
    transport.retry = Math.floor(retryRaw);
  }
  if (Number.isFinite(sizeRaw) && sizeRaw >= 0) {
    transport.size = Math.floor(sizeRaw);
  }
  if (Object.keys(transport).length === 0) {
    return undefined;
  }
  return transport;
}

function utf8ByteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function retainSerializedEntry(entry: RuntimeLogEntry) {
  const serialized = JSON.stringify(entry);
  entrySerializationCount += 1;
  entries.push(entry);
  serializedEntries.set(entry.id, serialized);
  const byteSize = utf8ByteLength(serialized);
  entryByteSizes.set(entry.id, byteSize);
  estimatedBytes += byteSize;
}

function resolveActiveRetentionBudget() {
  if (diagnosticMode) {
    return {
      mode: "diagnostic" as RuntimeLogRetentionMode,
      maxEntries: DIAGNOSTIC_MAX_ENTRIES,
      maxBytes: DIAGNOSTIC_MAX_BYTES,
    };
  }
  return {
    mode: "normal" as RuntimeLogRetentionMode,
    maxEntries: NORMAL_MAX_ENTRIES,
    maxBytes: NORMAL_MAX_BYTES,
  };
}

function removeEntryAt(
  index: number,
  reason: keyof RuntimeLogDropReasonCounter,
) {
  const [removed] = entries.splice(index, 1);
  if (!removed) {
    return undefined;
  }
  droppedEntries += 1;
  droppedByReason[reason] += 1;
  const byteSize = entryByteSizes.get(removed.id) || 0;
  entryByteSizes.delete(removed.id);
  serializedEntries.delete(removed.id);
  estimatedBytes = Math.max(0, estimatedBytes - byteSize);
  return removed.id;
}

function parseRuntimeLogEntry(raw: unknown): RuntimeLogEntry | null {
  if (!isRecord(raw)) {
    return null;
  }
  const id = String(raw.id || "").trim();
  const ts = String(raw.ts || "").trim();
  const stage = String(raw.stage || "").trim();
  const message = String(raw.message || "").trim();
  if (!id || !ts || !stage || !message) {
    return null;
  }
  const entry: RuntimeLogEntry = {
    id,
    ts,
    level: normalizeLevel(raw.level),
    scope: normalizeScope(raw.scope),
    schemaVersion: Math.max(1, Math.floor(Number(raw.schemaVersion || 1) || 1)),
    diagnosticMode: raw.diagnosticMode === true,
    workflowId: normalizeId(raw.workflowId),
    backendId: normalizeId(raw.backendId),
    backendType: normalizeId(raw.backendType),
    providerId: normalizeId(raw.providerId),
    runId: normalizeId(raw.runId),
    requestId: normalizeId(raw.requestId),
    jobId: normalizeId(raw.jobId),
    interactionId: normalizeId(raw.interactionId),
    component: normalizeId(raw.component),
    operation: normalizeId(raw.operation),
    attempt: normalizeAttempt(raw.attempt),
    phase: normalizeId(raw.phase),
    transport: normalizeTransport(raw.transport),
    stage,
    message: sanitizeString(message),
  };
  if (typeof raw.details !== "undefined") {
    entry.details = sanitizeValue(raw.details);
  }
  if (isRecord(raw.error)) {
    const name = String(raw.error.name || "").trim() || "Error";
    const errorMessage = String(raw.error.message || "").trim();
    if (errorMessage) {
      entry.error = {
        name,
        message: sanitizeString(errorMessage),
        stack: normalizeId(raw.error.stack),
        category: normalizeErrorCategory(raw.error.category),
        cause: normalizeId(raw.error.cause),
      };
    }
  }
  return entry;
}

function clearPersistTimers() {
  if (persistIdleTimer) {
    clearTimeout(persistIdleTimer);
    persistIdleTimer = null;
  }
  if (persistMaxDelayTimer) {
    clearTimeout(persistMaxDelayTimer);
    persistMaxDelayTimer = null;
  }
}

function scheduleRuntimeLogPersistence() {
  if (persistIdleTimer) {
    clearTimeout(persistIdleTimer);
  }
  persistIdleTimer = setTimeout(() => {
    persistIdleTimer = null;
    void drainRuntimeLogPersistence();
  }, PERSIST_IDLE_DEBOUNCE_MS);
  if (!persistMaxDelayTimer) {
    persistMaxDelayTimer = setTimeout(() => {
      persistMaxDelayTimer = null;
      void drainRuntimeLogPersistence();
    }, PERSIST_MAX_DELAY_MS);
  }
}

function markRuntimeLogPersistenceDirty(options: { schedule?: boolean } = {}) {
  changeRevision += 1;
  persistenceDirty = true;
  if (options.schedule !== false) {
    scheduleRuntimeLogPersistence();
  }
  return changeRevision;
}

function captureRuntimeLogPersistenceDocument() {
  const serialized = entries
    .map((entry) => serializedEntries.get(entry.id))
    .filter((entry): entry is string => typeof entry === "string");
  const capturedDroppedEntries = droppedEntries;
  const capturedDroppedByReason = { ...droppedByReason };
  const prefix = '{"entries":[';
  const suffix = `],"droppedEntries":${capturedDroppedEntries},"droppedByReason":${JSON.stringify(
    capturedDroppedByReason,
  )}}`;
  function* fragments() {
    yield prefix;
    for (let index = 0; index < serialized.length; index += 1) {
      if (index > 0) {
        yield ",";
      }
      yield serialized[index];
    }
    yield suffix;
  }
  return {
    fragments: fragments(),
    byteLength:
      utf8ByteLength(prefix) +
      utf8ByteLength(suffix) +
      Math.max(0, serialized.length - 1) +
      serialized.reduce(
        (total, entry, index) =>
          total +
          (entryByteSizes.get(entries[index]?.id || "") ||
            utf8ByteLength(entry)),
        0,
      ),
  };
}

async function writeRuntimeLogPersistenceDocument(args: {
  path: string;
  fragments: Iterable<string>;
}) {
  if (persistenceWriterForTests) {
    await persistenceWriterForTests(args);
    return;
  }
  await replaceRuntimeTextFileAtomically({
    targetPath: args.path,
    fragments: args.fragments,
  });
}

function recordRuntimeLogPersistenceMetrics(startedAt: number, bytes: number) {
  if (
    !__acp_runtime_performance_profiler_enabled__ ||
    !(typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    return;
  }
  incrementAcpRuntimeMetric(null, "runtime_log_persist", {
    persistenceChannel: "runtime-log",
  });
  incrementAcpRuntimeMetric(
    null,
    "runtime_log_persist_bytes",
    { persistenceChannel: "runtime-log" },
    bytes,
  );
  observeAcpRuntimeDuration(
    null,
    "runtime_log_persist_duration",
    { persistenceChannel: "runtime-log" },
    readAcpRuntimePerformanceClockMs() - startedAt,
  );
}

async function drainRuntimeLogPersistence() {
  clearPersistTimers();
  if (inFlightSave) {
    await inFlightSave;
    return;
  }
  inFlightSave = (async () => {
    while (persistenceDirty && durableRevision < changeRevision) {
      const saveRevision = changeRevision;
      const document = captureRuntimeLogPersistenceDocument();
      const startedAt =
        __acp_runtime_performance_profiler_enabled__ &&
        (typeof __debug_mode__ === "undefined"
          ? isDebugModeEnabled()
          : __debug_mode__)
          ? readAcpRuntimePerformanceClockMs()
          : 0;
      try {
        await writeRuntimeLogPersistenceDocument({
          path: getRuntimePersistencePaths().runtimeLogPath,
          fragments: document.fragments,
        });
      } catch {
        filePersistenceFailureCount += 1;
        persistenceDirty = true;
        return;
      }
      durableRevision = Math.max(durableRevision, saveRevision);
      persistenceDirty = durableRevision < changeRevision;
      persistenceFlushCount += 1;
      recordRuntimeLogPersistenceMetrics(startedAt, document.byteLength);
      if (
        legacyMigrationRevision !== null &&
        durableRevision >= legacyMigrationRevision
      ) {
        try {
          setPref(HISTORY_PREF_KEY, "");
          legacyMigrationRevision = null;
        } catch {
          // The file is durable; leave the legacy pref for a later retry.
        }
      }
    }
  })();
  try {
    await inFlightSave;
  } finally {
    inFlightSave = null;
    if (!persistenceDirty) {
      clearPersistTimers();
    }
  }
}

function pruneExpiredRuntimeLogs(nowMs = Date.now()) {
  const evictedEntryIds: string[] = [];
  const threshold = nowMs - RETENTION_MS;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const ts = Date.parse(entries[i].ts || "");
    if (!Number.isFinite(ts) || ts >= threshold) {
      continue;
    }
    const removedId = removeEntryAt(i, "expired");
    if (removedId) {
      evictedEntryIds.push(removedId);
    }
  }
  return evictedEntryIds;
}

function pruneOverflowByEntryBudget() {
  const evictedEntryIds: string[] = [];
  const { maxEntries } = resolveActiveRetentionBudget();
  while (entries.length > maxEntries) {
    const removedId = removeEntryAt(0, "entry_limit");
    if (removedId) {
      evictedEntryIds.push(removedId);
    }
  }
  return evictedEntryIds;
}

function pruneOverflowByByteBudget() {
  const evictedEntryIds: string[] = [];
  const { maxBytes } = resolveActiveRetentionBudget();
  if (!(maxBytes > 0)) {
    return evictedEntryIds;
  }
  while (entries.length > 0 && estimatedBytes > maxBytes) {
    const removedId = removeEntryAt(0, "byte_budget");
    if (removedId) {
      evictedEntryIds.push(removedId);
    }
  }
  return evictedEntryIds;
}

function enforceRetentionBudgets() {
  return [
    ...pruneExpiredRuntimeLogs(),
    ...pruneOverflowByEntryBudget(),
    ...pruneOverflowByByteBudget(),
  ];
}

function resetRuntimeLogMemory() {
  entries.length = 0;
  entryByteSizes.clear();
  serializedEntries.clear();
  estimatedBytes = 0;
  droppedEntries = 0;
  droppedByReason = {
    entry_limit: 0,
    byte_budget: 0,
    expired: 0,
  };
}

function hydrateRuntimeLogDocument(raw: string) {
  const parsed = JSON.parse(raw) as RuntimeLogDocument | unknown[];
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.entries)
      ? parsed.entries
      : [];
  resetRuntimeLogMemory();
  droppedEntries = Math.max(
    0,
    Math.floor(
      Number(Array.isArray(parsed) ? 0 : parsed?.droppedEntries || 0) || 0,
    ),
  );
  droppedByReason = {
    entry_limit: Math.max(
      0,
      Math.floor(
        Number(
          Array.isArray(parsed)
            ? 0
            : (parsed?.droppedByReason as Record<string, unknown> | undefined)
                ?.entry_limit || 0,
        ) || 0,
      ),
    ),
    byte_budget: Math.max(
      0,
      Math.floor(
        Number(
          Array.isArray(parsed)
            ? 0
            : (parsed?.droppedByReason as Record<string, unknown> | undefined)
                ?.byte_budget || 0,
        ) || 0,
      ),
    ),
    expired: Math.max(
      0,
      Math.floor(
        Number(
          Array.isArray(parsed)
            ? 0
            : (parsed?.droppedByReason as Record<string, unknown> | undefined)
                ?.expired || 0,
        ) || 0,
      ),
    ),
  };
  let maxSeq = 0;
  for (const row of rows) {
    const parsedEntry = parseRuntimeLogEntry(row);
    if (!parsedEntry) {
      continue;
    }
    retainSerializedEntry(parsedEntry);
    maxSeq = Math.max(maxSeq, parseSequenceFromLogId(parsedEntry.id));
  }
  sequence = Math.max(sequence, maxSeq);
  return enforceRetentionBudgets();
}

export async function initializeRuntimeLogsPersistence() {
  if (hydrated) {
    return;
  }
  if (hydrationPromise) {
    await hydrationPromise;
    return;
  }
  hydrationPromise = (async () => {
    let fileRaw = "";
    try {
      fileRaw = await readRuntimeTextFile(
        getRuntimePersistencePaths().runtimeLogPath,
      );
    } catch {
      resetRuntimeLogMemory();
      filePersistenceFailureCount += 1;
      hydrated = true;
      return;
    }
    let raw = fileRaw.trim();
    let fromLegacyPref = false;
    if (!raw) {
      try {
        raw = String(getPref(HISTORY_PREF_KEY) || "").trim();
        fromLegacyPref = raw.length > 0;
      } catch {
        filePersistenceFailureCount += 1;
      }
    }
    if (!raw) {
      hydrated = true;
      return;
    }
    let evictedEntryIds: string[];
    try {
      evictedEntryIds = hydrateRuntimeLogDocument(raw);
    } catch {
      resetRuntimeLogMemory();
      filePersistenceFailureCount += 1;
      hydrated = true;
      return;
    }
    hydrated = true;
    if (fromLegacyPref || evictedEntryIds.length > 0) {
      const revision = markRuntimeLogPersistenceDirty({ schedule: false });
      if (fromLegacyPref) {
        legacyMigrationRevision = revision;
      }
      await drainRuntimeLogPersistence();
    }
  })();
  try {
    await hydrationPromise;
  } finally {
    hydrationPromise = null;
  }
}

function emitChanged(change: RuntimeLogChange) {
  if (listeners.size === 0) {
    return;
  }
  for (const listener of listeners) {
    listener(change);
  }
}

export async function flushRuntimeLogsPersistence() {
  if (hydrationPromise) {
    await hydrationPromise;
  }
  clearPersistTimers();
  await drainRuntimeLogPersistence();
}

export function setRuntimeLogPersistenceWriterForTests(
  writer: RuntimeLogPersistenceWriter | null,
) {
  persistenceWriterForTests = writer;
}

export function setRuntimeLogAllowedLevels(levels: RuntimeLogLevel[]) {
  allowedLevels.clear();
  for (const level of levels) {
    allowedLevels.add(level);
  }
}

export function resetRuntimeLogAllowedLevels() {
  allowedLevels.clear();
  for (const level of DEFAULT_ALLOWED_LEVELS) {
    allowedLevels.add(level);
  }
}

export function setRuntimeLogDiagnosticMode(enabled: boolean) {
  const next = enabled === true;
  if (diagnosticMode === next) {
    return;
  }
  diagnosticMode = next;
  const evictedEntryIds = enforceRetentionBudgets();
  const revision = markRuntimeLogPersistenceDirty();
  emitChanged({
    revision,
    kind: "settings",
    evictedEntryIds,
  });
}

export function getRuntimeLogDiagnosticMode() {
  return diagnosticMode;
}

export function appendRuntimeLog(input: RuntimeLogInput) {
  const level = normalizeLevel(input.level);
  if (level === "debug" ? !diagnosticMode : !allowedLevels.has(level)) {
    return null;
  }

  const normalizedError = normalizeError(input.error);
  const entry: RuntimeLogEntry = {
    id: `log-${++sequence}`,
    ts: String(input.ts || new Date().toISOString()),
    level,
    scope: normalizeScope(input.scope),
    schemaVersion: 1,
    diagnosticMode,
    workflowId: normalizeId(input.workflowId),
    backendId: normalizeId(input.backendId),
    backendType: normalizeId(input.backendType),
    providerId: normalizeId(input.providerId),
    runId: normalizeId(input.runId),
    requestId: normalizeId(input.requestId),
    jobId: normalizeId(input.jobId),
    interactionId: normalizeId(input.interactionId),
    component: normalizeId(input.component),
    operation: normalizeId(input.operation),
    attempt: normalizeAttempt(input.attempt),
    phase: normalizeId(input.phase),
    transport: normalizeTransport(input.transport),
    stage: String(input.stage || "unknown").trim() || "unknown",
    message: sanitizeString(String(input.message || "")),
  };

  if (typeof input.details !== "undefined") {
    entry.details = sanitizeValue(input.details);
  }
  if (normalizedError) {
    entry.error = normalizedError;
  }

  retainSerializedEntry(entry);
  const evictedEntryIds = enforceRetentionBudgets();
  const revision = markRuntimeLogPersistenceDirty();
  emitChanged({
    revision,
    kind: "append",
    entry: cloneEntry(entry),
    evictedEntryIds,
  });
  return cloneEntry(entry);
}

export function listRuntimeLogs(filters: RuntimeLogListFilters = {}) {
  const levels = Array.isArray(filters.levels) ? new Set(filters.levels) : null;
  const scopes = Array.isArray(filters.scopes) ? new Set(filters.scopes) : null;
  const backendIds = Array.isArray(filters.backendId)
    ? new Set(filters.backendId.map((id) => normalizeId(id)))
    : filters.backendId
      ? new Set([normalizeId(filters.backendId)])
      : null;
  const backendType = normalizeId(filters.backendType);
  const providerId = normalizeId(filters.providerId);
  const workflowIds = Array.isArray(filters.workflowId)
    ? new Set(filters.workflowId.map((id) => normalizeId(id)))
    : filters.workflowId
      ? new Set([normalizeId(filters.workflowId)])
      : null;
  const runId = normalizeId(filters.runId);
  const requestId = normalizeId(filters.requestId);
  const jobId = normalizeId(filters.jobId);
  const interactionId = normalizeId(filters.interactionId);
  const component = normalizeId(filters.component);
  const operation = normalizeId(filters.operation);
  const fromTs = filters.fromTs ? Date.parse(String(filters.fromTs)) : NaN;
  const toTs = filters.toTs ? Date.parse(String(filters.toTs)) : NaN;

  let result = entries.filter((entry) => {
    if (levels && !levels.has(entry.level)) {
      return false;
    }
    if (scopes && !scopes.has(entry.scope)) {
      return false;
    }
    if (backendIds && !backendIds.has(entry.backendId)) {
      return false;
    }
    if (backendType && entry.backendType !== backendType) {
      return false;
    }
    if (providerId && entry.providerId !== providerId) {
      return false;
    }
    if (workflowIds && !workflowIds.has(entry.workflowId)) {
      return false;
    }
    if (runId && entry.runId !== runId) {
      return false;
    }
    if (requestId && entry.requestId !== requestId) {
      return false;
    }
    if (jobId && entry.jobId !== jobId) {
      return false;
    }
    if (interactionId && entry.interactionId !== interactionId) {
      return false;
    }
    if (component && entry.component !== component) {
      return false;
    }
    if (operation && entry.operation !== operation) {
      return false;
    }
    const ts = Date.parse(entry.ts);
    if (Number.isFinite(fromTs) && Number.isFinite(ts) && ts < fromTs) {
      return false;
    }
    if (Number.isFinite(toTs) && Number.isFinite(ts) && ts > toTs) {
      return false;
    }
    return true;
  });

  if (filters.order === "desc") {
    result = [...result].reverse();
  }

  const limit = Number(filters.limit);
  if (Number.isFinite(limit) && limit > 0) {
    result = result.slice(0, Math.floor(limit));
  }

  return result.map((entry) => cloneEntry(entry));
}

export function clearRuntimeLogs() {
  resetRuntimeLogMemory();
  const revision = markRuntimeLogPersistenceDirty({ schedule: false });
  emitChanged({
    revision,
    kind: "clear",
    evictedEntryIds: [],
  });
  return drainRuntimeLogPersistence();
}

registerRuntimeLogClearer(clearRuntimeLogs);

function snapshotRuntimeLogsInternal(): RuntimeLogSnapshot {
  const budget = resolveActiveRetentionBudget();
  return {
    entries: entries.map((entry) => cloneEntry(entry)),
    droppedEntries,
    droppedByReason: { ...droppedByReason },
    maxEntries: budget.maxEntries,
    maxBytes: budget.maxBytes,
    estimatedBytes,
    retentionMode: budget.mode,
    diagnosticMode,
    sanitizationPolicy: {
      redactedPlaceholder: REDACTED,
      stringLimit: MAX_STRING_LENGTH,
    },
  };
}

export function snapshotRuntimeLogs(): RuntimeLogSnapshot {
  return snapshotRuntimeLogsInternal();
}

export function getRuntimeLogSummary(): RuntimeLogSummary {
  const budget = resolveActiveRetentionBudget();
  const backendIds = new Set<string>();
  const workflowIds = new Set<string>();
  for (const entry of entries) {
    if (entry.backendId) {
      backendIds.add(entry.backendId);
    }
    if (entry.workflowId) {
      workflowIds.add(entry.workflowId);
    }
  }
  return {
    entryCount: entries.length,
    droppedEntries,
    droppedByReason: { ...droppedByReason },
    maxEntries: budget.maxEntries,
    maxBytes: budget.maxBytes,
    estimatedBytes,
    retentionMode: budget.mode,
    diagnosticMode,
    sanitizationPolicy: {
      redactedPlaceholder: REDACTED,
      stringLimit: MAX_STRING_LENGTH,
    },
    facets: {
      backendIds: [...backendIds],
      workflowIds: [...workflowIds],
    },
  };
}

export function getRuntimeLogManagerSnapshotForTests() {
  const snapshot = snapshotRuntimeLogsInternal();
  return {
    entryCount: snapshot.entries.length,
    estimatedBytes: snapshot.estimatedBytes,
    droppedEntries: snapshot.droppedEntries,
    listenerCount: listeners.size,
    retentionMode: snapshot.retentionMode,
    diagnosticMode: snapshot.diagnosticMode,
  };
}

export function getRuntimeLogPersistenceStateForTests() {
  return {
    dirty: persistenceDirty,
    hasPendingTimer: persistIdleTimer !== null || persistMaxDelayTimer !== null,
    hasIdleTimer: persistIdleTimer !== null,
    hasMaxDelayTimer: persistMaxDelayTimer !== null,
    revision: changeRevision,
    durableRevision,
    inFlight: inFlightSave !== null,
    flushCount: persistenceFlushCount,
    fileFailureCount: filePersistenceFailureCount,
    entrySerializationCount,
    path: getRuntimePersistencePaths().runtimeLogPath,
  };
}

export function resetRuntimeLogHydrationForTests() {
  clearPersistTimers();
  hydrated = false;
  hydrationPromise = null;
  resetRuntimeLogMemory();
  persistenceDirty = false;
  changeRevision = 0;
  durableRevision = 0;
  inFlightSave = null;
  legacyMigrationRevision = null;
  entrySerializationCount = 0;
}

export function subscribeRuntimeLogs(listener: RuntimeLogListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function formatRuntimeLogsAsPrettyJson(
  entriesToFormat: RuntimeLogEntry[],
) {
  return JSON.stringify(entriesToFormat, null, 2);
}

export function formatRuntimeLogsAsNDJSON(entriesToFormat: RuntimeLogEntry[]) {
  return entriesToFormat.map((entry) => JSON.stringify(entry)).join("\n");
}

function resolveRuntimeVersion() {
  const runtime = globalThis as {
    Zotero?: {
      version?: string;
      appName?: string;
      locale?: string;
    };
    navigator?: {
      platform?: string;
      language?: string;
      userAgent?: string;
    };
  };
  const zoteroVersion = String(runtime.Zotero?.version || "").trim();
  if (zoteroVersion) {
    return `Zotero/${zoteroVersion}`;
  }
  const userAgent = String(runtime.navigator?.userAgent || "").trim();
  return userAgent || "unknown-runtime";
}

function resolveRuntimeLocale() {
  const runtime = globalThis as {
    Zotero?: { locale?: string };
    navigator?: { language?: string };
  };
  return (
    String(runtime.Zotero?.locale || "").trim() ||
    String(runtime.navigator?.language || "").trim() ||
    "unknown-locale"
  );
}

function resolveRuntimePlatform() {
  const runtime = globalThis as {
    Zotero?: {
      isWin?: boolean;
      isMac?: boolean;
      isLinux?: boolean;
    };
    navigator?: {
      platform?: string;
      userAgent?: string;
    };
    process?: {
      platform?: string;
      arch?: string;
    };
  };
  if (runtime.Zotero?.isWin === true) {
    return "win32";
  }
  if (runtime.Zotero?.isMac === true) {
    return "darwin";
  }
  if (runtime.Zotero?.isLinux === true) {
    return "linux";
  }
  const processPlatform = String(runtime.process?.platform || "").trim();
  if (processPlatform) {
    const arch = String(runtime.process?.arch || "").trim();
    return arch ? `${processPlatform}/${arch}` : processPlatform;
  }
  return (
    String(runtime.navigator?.platform || "").trim() ||
    String(runtime.navigator?.userAgent || "").trim() ||
    "unknown-platform"
  );
}

function normalizeTextPreview(
  input: string,
  limit = DIAGNOSTIC_TEXT_PREVIEW_LIMIT,
) {
  const normalized = String(input || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit)}...`;
}

function hashText(input: string) {
  const text = String(input || "");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `fnv1a:${(hash >>> 0).toString(16)}`;
}

function summarizeLargePayload(value: unknown) {
  const text = (() => {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  })();
  const bytes = text.length;
  if (bytes <= MAX_STRING_LENGTH) {
    return value;
  }
  return {
    truncated: true,
    bytes,
    preview: normalizeTextPreview(text, DIAGNOSTIC_TEXT_PREVIEW_LIMIT),
    digest: hashText(text),
  };
}

function toDiagnosticExportEntry(
  entry: RuntimeLogEntry,
): Record<string, unknown> {
  const copied = cloneEntry(entry) as Record<string, unknown>;
  const textDigests: Record<string, unknown> = {};
  if (entry.message) {
    textDigests.message = {
      preview: normalizeTextPreview(entry.message),
      digest: hashText(entry.message),
      bytes: entry.message.length,
    };
  }
  if (entry.error?.message) {
    textDigests.errorMessage = {
      preview: normalizeTextPreview(entry.error.message),
      digest: hashText(entry.error.message),
      bytes: entry.error.message.length,
    };
  }
  if (typeof copied.details !== "undefined") {
    copied.details = summarizeLargePayload(copied.details);
  }
  if (Object.keys(textDigests).length > 0) {
    copied.textDigests = textDigests;
  }
  return copied;
}

function isTerminalStage(
  stage: string,
): RuntimeDiagnosticIncident["terminalStatus"] | undefined {
  const normalized = String(stage || "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized.includes("cancel")) {
    return "canceled";
  }
  if (normalized.includes("fail") || normalized.includes("exhaust")) {
    return "failed";
  }
  if (normalized.includes("succeed") || normalized.includes("complete")) {
    return "succeeded";
  }
  return undefined;
}

function resolveIncidentChainId(entry: {
  requestId?: string;
  jobId?: string;
  runId?: string;
  workflowId?: string;
}) {
  if (entry.requestId) {
    return `request:${entry.requestId}`;
  }
  if (entry.jobId) {
    return `job:${entry.jobId}`;
  }
  if (entry.runId) {
    return `run:${entry.runId}`;
  }
  return `workflow:${entry.workflowId || "unknown"}`;
}

function buildIncidentsFromTimeline(
  timeline: RuntimeDiagnosticTimelineEvent[],
) {
  const map = new Map<string, RuntimeDiagnosticIncident>();
  for (const event of timeline) {
    const chainId = resolveIncidentChainId(event);
    const existing = map.get(chainId) || {
      chainId,
      workflowId: event.workflowId,
      runId: event.runId,
      jobId: event.jobId,
      requestId: event.requestId,
      interactionId: event.interactionId,
      retryCount: 0,
      eventCount: 0,
    };
    existing.eventCount += 1;
    if (event.level === "error" && !existing.firstError) {
      existing.firstError = {
        ts: event.ts,
        stage: event.stage,
        message: normalizeTextPreview(event.message, 220),
        category: event.category,
      };
    }
    const retry = Number(event.transport?.retry);
    if (Number.isFinite(retry) && retry > 0) {
      existing.retryCount = Math.max(existing.retryCount, Math.floor(retry));
    }
    if (event.stage.toLowerCase().includes("retry")) {
      existing.retryCount += 1;
    }
    const terminal = isTerminalStage(event.stage);
    if (terminal) {
      existing.terminalStatus = terminal;
    }
    map.set(chainId, existing);
  }
  return Array.from(map.values());
}

function toTimelineEvent(
  entry: RuntimeLogEntry,
): RuntimeDiagnosticTimelineEvent {
  return {
    id: entry.id,
    ts: entry.ts,
    level: entry.level,
    scope: entry.scope,
    stage: entry.stage,
    message: entry.message,
    workflowId: entry.workflowId,
    backendId: entry.backendId,
    backendType: entry.backendType,
    providerId: entry.providerId,
    runId: entry.runId,
    jobId: entry.jobId,
    requestId: entry.requestId,
    interactionId: entry.interactionId,
    component: entry.component,
    operation: entry.operation,
    phase: entry.phase,
    attempt: entry.attempt,
    transport: entry.transport ? { ...entry.transport } : undefined,
    category: entry.error?.category,
  };
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeId(value))
        .filter((value): value is string => !!value),
    ),
  ).sort();
}

function issueDiagnosticLevels(args: {
  filters: RuntimeLogListFilters;
  includeDebug?: boolean;
}) {
  const requested = Array.isArray(args.filters.levels)
    ? args.filters.levels.filter((level) => level !== "debug")
    : (["info", "warn", "error"] as RuntimeLogLevel[]);
  if (args.includeDebug === true) {
    return Array.isArray(args.filters.levels)
      ? args.filters.levels
      : (["debug", "info", "warn", "error"] as RuntimeLogLevel[]);
  }
  return requested.length > 0
    ? requested
    : (["info", "warn", "error"] as RuntimeLogLevel[]);
}

function isHighSignalIssueEvent(entry: RuntimeLogEntry) {
  if (entry.level === "warn" || entry.level === "error") {
    return true;
  }
  const stage = entry.stage.toLowerCase();
  const operation = String(entry.operation || "").toLowerCase();
  if (
    operation === "probe-acp-runtime-options" ||
    operation === "refresh-skillrunner-model-cache" ||
    operation === "refresh-managed-model-cache-silent"
  ) {
    return true;
  }
  return (
    stage.includes("failed") ||
    stage.includes("failure") ||
    stage.includes("error") ||
    stage.includes("complete") ||
    stage.includes("succeed") ||
    stage.includes("terminal") ||
    stage.includes("cache-refresh") ||
    stage.includes("probe")
  );
}

function summarizeBackendOperationHealth(
  entriesToSummarize: RuntimeLogEntry[],
  operation: string,
) {
  const grouped = new Map<string, RuntimeLogEntry[]>();
  for (const entry of entriesToSummarize) {
    if (entry.operation !== operation) {
      continue;
    }
    const key = `${entry.backendType || "unknown"}:${entry.backendId || "unknown"}`;
    grouped.set(key, [...(grouped.get(key) || []), entry]);
  }
  return Array.from(grouped.values()).map((group) => {
    const last = group[group.length - 1];
    const failed = group.find(
      (entry) =>
        entry.level === "error" ||
        entry.level === "warn" ||
        entry.stage.toLowerCase().includes("failed"),
    );
    const ok = group.find((entry) => entry.stage.toLowerCase().includes("ok"));
    const status: RuntimeIssueBackendOperationHealth["status"] = failed
      ? "failed"
      : ok
        ? "ok"
        : "started";
    return {
      backendId: last?.backendId,
      backendType: last?.backendType,
      operation,
      status,
      lastStage: last?.stage,
      lastMessage: last?.message,
      lastTs: last?.ts,
      eventCount: group.length,
      summary: last?.details,
    };
  });
}

function hasBackendOperation(
  entriesToCheck: RuntimeLogEntry[],
  backendId: string | undefined,
  operation: string,
) {
  const normalizedBackendId = normalizeId(backendId);
  return entriesToCheck.some(
    (entry) =>
      entry.operation === operation &&
      (!normalizedBackendId || entry.backendId === normalizedBackendId),
  );
}

function buildIssueDiagnosticEvidenceGaps(args: {
  entries: RuntimeLogEntry[];
  filters: RuntimeLogListFilters;
  snapshot: RuntimeLogSnapshot;
}): RuntimeIssueDiagnosticEvidenceGap[] {
  const gaps: RuntimeIssueDiagnosticEvidenceGap[] = [];
  const backendId = Array.isArray(args.filters.backendId)
    ? normalizeId(args.filters.backendId[0])
    : normalizeId(args.filters.backendId);
  const backendType = normalizeId(args.filters.backendType);
  const requestId = normalizeId(args.filters.requestId);

  if (args.entries.length === 0) {
    gaps.push({
      code: "no_retained_runtime_logs",
      message: "No retained runtime logs matched the selected issue context.",
      backendId,
      backendType,
      requestId,
    });
  }
  if (
    requestId &&
    !args.entries.some((entry) => entry.requestId === requestId)
  ) {
    gaps.push({
      code: "missing_request_context",
      message: "No retained runtime log entry carries the selected requestId.",
      backendId,
      backendType,
      requestId,
    });
  }
  if (
    backendType === "acp" &&
    !hasBackendOperation(args.entries, backendId, "probe-acp-runtime-options")
  ) {
    gaps.push({
      code: "missing_acp_backend_probe",
      message:
        "No retained ACP backend probe/runtime options cache refresh event was found.",
      backendId,
      backendType,
      requestId,
    });
  }
  if (
    backendType === "skillrunner" &&
    !hasBackendOperation(
      args.entries,
      backendId,
      "refresh-skillrunner-model-cache",
    )
  ) {
    gaps.push({
      code: "missing_skillrunner_model_cache_refresh",
      message: "No retained SkillRunner model cache refresh event was found.",
      backendId,
      backendType,
      requestId,
    });
  }
  if (args.snapshot.droppedEntries > 0) {
    gaps.push({
      code: "retention_evicted_entries",
      message:
        "Some runtime logs were evicted before this issue diagnostic bundle was generated.",
      backendId,
      backendType,
      requestId,
    });
  }
  return gaps;
}

export function buildRuntimeDiagnosticBundle(
  args: {
    filters?: RuntimeLogListFilters;
  } = {},
): RuntimeDiagnosticBundleV1 {
  const filters = args.filters || {};
  const timelineEntries = listRuntimeLogs({
    ...filters,
    order: "asc",
  });
  const timeline: RuntimeDiagnosticTimelineEvent[] =
    timelineEntries.map(toTimelineEvent);
  const incidents = buildIncidentsFromTimeline(timeline);
  const budget = resolveActiveRetentionBudget();
  const performanceProfiles =
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
      ? snapshotAcpRuntimeProfiles()
      : undefined;
  const includePerformanceProfiles =
    !!performanceProfiles &&
    (performanceProfiles.active.length > 0 ||
      performanceProfiles.completed.length > 0 ||
      performanceProfiles.global.metrics.length > 0);
  return {
    schemaVersion: "runtime-diagnostic-bundle/v1",
    generatedAt: new Date().toISOString(),
    meta: {
      pluginVersion: String(version || "unknown"),
      runtimeVersion: resolveRuntimeVersion(),
      platform: resolveRuntimePlatform(),
      locale: resolveRuntimeLocale(),
      retentionMode: budget.mode,
      diagnosticMode,
      retentionBudget: {
        maxEntries: budget.maxEntries,
        maxBytes: budget.maxBytes,
        estimatedBytes,
        droppedEntries,
        droppedByReason: { ...droppedByReason },
      },
      sanitization: {
        redactedPlaceholder: REDACTED,
        stringLimit: MAX_STRING_LENGTH,
        textPreviewLimit: DIAGNOSTIC_TEXT_PREVIEW_LIMIT,
      },
      window: {
        fromTs: filters.fromTs,
        toTs: filters.toTs,
      },
    },
    filters: { ...filters },
    timeline,
    incidents,
    entries: timelineEntries.map((entry) => toDiagnosticExportEntry(entry)),
    ...(includePerformanceProfiles ? { performanceProfiles } : {}),
  };
}

export function buildRuntimeIssueDiagnosticBundle(
  args: {
    filters?: RuntimeLogListFilters;
    includeDebug?: boolean;
    includeRawEntries?: boolean;
  } = {},
): RuntimeIssueDiagnosticBundleV1 {
  const filters = args.filters || {};
  const levels = issueDiagnosticLevels({
    filters,
    includeDebug: args.includeDebug,
  });
  const effectiveFilters = {
    ...filters,
    levels,
    order: "asc" as const,
  };
  const issueEntries = listRuntimeLogs(effectiveFilters);
  const snapshot = snapshotRuntimeLogsInternal();
  const timeline = issueEntries
    .filter(isHighSignalIssueEvent)
    .map(toTimelineEvent);
  const incidents = buildIncidentsFromTimeline(timeline);
  const budget = resolveActiveRetentionBudget();
  const performanceProfiles =
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
      ? snapshotAcpRuntimeProfiles()
      : undefined;
  const includePerformanceProfiles =
    !!performanceProfiles &&
    (performanceProfiles.active.length > 0 ||
      performanceProfiles.completed.length > 0 ||
      performanceProfiles.global.metrics.length > 0);
  const bundle: RuntimeIssueDiagnosticBundleV1 = {
    schemaVersion: "runtime-issue-diagnostic-bundle/v1",
    generatedAt: new Date().toISOString(),
    environment: {
      pluginVersion: String(version || "unknown"),
      runtimeVersion: resolveRuntimeVersion(),
      platform: resolveRuntimePlatform(),
      locale: resolveRuntimeLocale(),
      retentionMode: budget.mode,
      diagnosticMode,
      retentionBudget: {
        maxEntries: budget.maxEntries,
        maxBytes: budget.maxBytes,
        estimatedBytes,
        droppedEntries,
        droppedByReason: { ...droppedByReason },
      },
    },
    context: {
      filters: { ...filters },
      backendIds: uniqueStrings(issueEntries.map((entry) => entry.backendId)),
      backendTypes: uniqueStrings(
        issueEntries.map((entry) => entry.backendType),
      ),
      workflowIds: uniqueStrings(issueEntries.map((entry) => entry.workflowId)),
      runIds: uniqueStrings(issueEntries.map((entry) => entry.runId)),
      requestIds: uniqueStrings(issueEntries.map((entry) => entry.requestId)),
      jobIds: uniqueStrings(issueEntries.map((entry) => entry.jobId)),
    },
    backendHealth: {
      acpRuntimeOptions: summarizeBackendOperationHealth(
        issueEntries,
        "probe-acp-runtime-options",
      ),
      skillRunnerModelCache: summarizeBackendOperationHealth(
        issueEntries,
        "refresh-skillrunner-model-cache",
      ),
    },
    incidents,
    timeline,
    evidenceGaps: buildIssueDiagnosticEvidenceGaps({
      entries: issueEntries,
      filters,
      snapshot,
    }),
    redaction: {
      redactedPlaceholder: REDACTED,
      stringLimit: MAX_STRING_LENGTH,
      textPreviewLimit: DIAGNOSTIC_TEXT_PREVIEW_LIMIT,
      includesDebug: args.includeDebug === true,
      includesRawEntries: args.includeRawEntries === true,
    },
    ...(includePerformanceProfiles ? { performanceProfiles } : {}),
  };
  if (args.includeRawEntries === true) {
    bundle.developerRawEntries = issueEntries.map((entry) =>
      toDiagnosticExportEntry(entry),
    );
  }
  return bundle;
}

export function buildRuntimeIssueSummary(
  args: {
    filters?: RuntimeLogListFilters;
    topErrorLimit?: number;
  } = {},
) {
  const bundle = buildRuntimeDiagnosticBundle({
    filters: args.filters,
  });
  const topErrorLimit = Math.max(
    1,
    Math.floor(Number(args.topErrorLimit || 8)),
  );
  const errorTimeline = bundle.timeline.filter(
    (entry) =>
      entry.level === "error" || entry.stage.toLowerCase().includes("fail"),
  );
  const topErrors = errorTimeline.slice(0, topErrorLimit);
  const lines = [
    "## Runtime Diagnostic Summary",
    "",
    `- Generated At: ${bundle.generatedAt}`,
    `- Plugin Version: ${bundle.meta.pluginVersion}`,
    `- Runtime: ${bundle.meta.runtimeVersion}`,
    `- Platform: ${bundle.meta.platform}`,
    `- Locale: ${bundle.meta.locale}`,
    `- Retention Mode: ${bundle.meta.retentionMode}`,
    `- Diagnostic Mode: ${bundle.meta.diagnosticMode ? "on" : "off"}`,
    `- Log Entries: ${bundle.entries.length}`,
    `- Dropped Entries: ${bundle.meta.retentionBudget.droppedEntries}`,
    "",
    "## Correlation",
    "",
    `- Workflows: ${Array.from(new Set(bundle.timeline.map((e) => e.workflowId).filter(Boolean))).join(", ") || "-"}`,
    `- Runs: ${Array.from(new Set(bundle.timeline.map((e) => e.runId).filter(Boolean))).join(", ") || "-"}`,
    `- Requests: ${Array.from(new Set(bundle.timeline.map((e) => e.requestId).filter(Boolean))).join(", ") || "-"}`,
    `- Jobs: ${Array.from(new Set(bundle.timeline.map((e) => e.jobId).filter(Boolean))).join(", ") || "-"}`,
    "",
    "## Top Errors",
    "",
  ];
  if (topErrors.length === 0) {
    lines.push("- none");
  } else {
    for (const entry of topErrors) {
      lines.push(
        `- [${entry.ts}] ${entry.stage}: ${normalizeTextPreview(entry.message, 180)} (request=${entry.requestId || "-"}, job=${entry.jobId || "-"})`,
      );
    }
  }
  return lines.join("\n");
}

export function classifyErrorCategory(error: unknown): RuntimeLogErrorCategory {
  const text = normalizeTextPreview(
    (() => {
      if (error instanceof Error) {
        return `${error.name} ${error.message}`;
      }
      if (typeof error === "string") {
        return error;
      }
      try {
        return JSON.stringify(error);
      } catch {
        return String(error || "");
      }
    })(),
    400,
  ).toLowerCase();
  if (!text) {
    return "unknown";
  }
  if (/timeout|timed out|etimedout/.test(text)) {
    return "timeout";
  }
  if (/unauthorized|forbidden|401|403|token|credential|auth/.test(text)) {
    return "auth";
  }
  if (/validation|invalid input|bad request|schema/.test(text)) {
    return "validation";
  }
  if (/network|econn|enotfound|fetch failed|socket/.test(text)) {
    return "network";
  }
  if (/hook|applyresult|filterinputs/.test(text)) {
    return "hook";
  }
  if (/provider|backend|dispatch|transport/.test(text)) {
    return "provider";
  }
  return "unknown";
}

function extractErrorCauseSummary(error: unknown) {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  if (error instanceof Error && typeof error.cause !== "undefined") {
    const cause = error.cause;
    if (cause instanceof Error) {
      return normalizeTextPreview(`${cause.name}: ${cause.message}`, 240);
    }
    return normalizeTextPreview(String(cause || ""), 240);
  }
  if (isRecord(error) && "cause" in error) {
    return normalizeTextPreview(String(error.cause || ""), 240);
  }
  return undefined;
}

export function getRuntimeLogRetentionConfig() {
  const budget = resolveActiveRetentionBudget();
  return {
    maxEntries: budget.maxEntries,
    maxBytes: budget.maxBytes,
    retentionMode: budget.mode,
    retentionDays: RETENTION_DAYS,
    retentionMs: RETENTION_MS,
    normal: {
      maxEntries: NORMAL_MAX_ENTRIES,
      maxBytes: NORMAL_MAX_BYTES,
    },
    diagnostic: {
      maxEntries: DIAGNOSTIC_MAX_ENTRIES,
      maxBytes: DIAGNOSTIC_MAX_BYTES,
    },
  };
}
