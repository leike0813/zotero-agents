import { getPref, setPref } from "../utils/prefs";
import { version } from "../../package.json";
import {
  getRuntimePersistencePaths,
  registerRuntimeLogClearer,
  writeRuntimeTextFile,
} from "./runtimePersistence";

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

export function createDefaultLogViewerLevelFilter(): Record<RuntimeLogLevel, boolean> {
  return {
    debug: true,
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
      (level) => levelFilter[level]
    )
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
};

type RuntimeLogDocument = {
  entries?: unknown;
  droppedEntries?: unknown;
  droppedByReason?: unknown;
};

type RuntimeLogListener = (snapshot: RuntimeLogSnapshot) => void;

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
const DEFAULT_ALLOWED_LEVELS = new Set<RuntimeLogLevel>(["info", "warn", "error"]);
const SENSITIVE_KEY = /(authorization|token|secret|password|api[-_]?key|cookie|bearer)/i;
const PERSIST_DEBOUNCE_MS = 25;

let sequence = 0;
let droppedEntries = 0;
let droppedByReason: RuntimeLogDropReasonCounter = {
  entry_limit: 0,
  byte_budget: 0,
  expired: 0,
};
const entries: RuntimeLogEntry[] = [];
const entryByteSizes = new Map<string, number>();
let estimatedBytes = 0;
const listeners = new Set<RuntimeLogListener>();
const allowedLevels = new Set<RuntimeLogLevel>(DEFAULT_ALLOWED_LEVELS);
let diagnosticMode = false;
let hydrated = false;
let persistenceDirty = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistenceFlushCount = 0;
let filePersistenceFailureCount = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cloneEntry(entry: RuntimeLogEntry): RuntimeLogEntry {
  return {
    ...entry,
    details: typeof entry.details === "undefined"
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
  const value = String(input || "").trim().toLowerCase();
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }
  return "info";
}

function normalizeScope(input: unknown): RuntimeLogScope {
  const value = String(input || "").trim().toLowerCase();
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

function normalizeErrorCategory(input: unknown): RuntimeLogErrorCategory | undefined {
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

function normalizeTransport(input: unknown): RuntimeLogTransportSummary | undefined {
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

function estimateSerializedBytes(value: unknown) {
  try {
    const raw = JSON.stringify(value);
    if (typeof raw !== "string") {
      return 0;
    }
    return raw.length;
  } catch {
    return 128;
  }
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

function removeEntryAt(index: number, reason: keyof RuntimeLogDropReasonCounter) {
  const [removed] = entries.splice(index, 1);
  if (!removed) {
    return;
  }
  droppedEntries += 1;
  droppedByReason[reason] += 1;
  const byteSize = entryByteSizes.get(removed.id) || 0;
  entryByteSizes.delete(removed.id);
  estimatedBytes = Math.max(0, estimatedBytes - byteSize);
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

function buildRuntimeLogDocument() {
  return {
    entries,
    droppedEntries,
    droppedByReason,
  };
}

function getNodeBuiltinModule(name: string) {
  const runtime = globalThis as {
    process?: {
      getBuiltinModule?: (specifier: string) => any;
    };
  };
  try {
    const module = runtime.process?.getBuiltinModule?.(name);
    if (module) {
      return module;
    }
  } catch {
    // Fall through to CommonJS require fallback.
  }
  try {
    const requireFn = new Function(
      "return typeof require === 'function' ? require : null",
    )() as ((specifier: string) => any) | null;
    return requireFn ? requireFn(name) : null;
  } catch {
    return null;
  }
}

function readRuntimeLogFileSync() {
  const runtime = globalThis as { process?: unknown };
  if (!runtime.process) {
    return "";
  }
  try {
    const fs = getNodeBuiltinModule("fs");
    if (!fs) {
      return "";
    }
    const path = getRuntimePersistencePaths().runtimeLogPath;
    if (!fs.existsSync(path)) {
      return "";
    }
    return String(fs.readFileSync(path, "utf8") || "");
  } catch {
    return "";
  }
}

function writeRuntimeLogFileSync(content: string) {
  const runtime = globalThis as { process?: unknown };
  if (!runtime.process) {
    return false;
  }
  try {
    const fs = getNodeBuiltinModule("fs");
    const path = getNodeBuiltinModule("path");
    if (!fs || !path) {
      return false;
    }
    const logPath = getRuntimePersistencePaths().runtimeLogPath;
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, content, "utf8");
    return true;
  } catch {
    return false;
  }
}

function writeRuntimeLogFileAsync(content: string) {
  if (writeRuntimeLogFileSync(content)) {
    return;
  }
  void writeRuntimeTextFile(getRuntimePersistencePaths().runtimeLogPath, content).catch(
    () => {
      filePersistenceFailureCount += 1;
    },
  );
}

function clearPersistTimer() {
  if (!persistTimer) {
    return;
  }
  clearTimeout(persistTimer);
  persistTimer = null;
}

function persistRuntimeLogsNow(force = false) {
  clearPersistTimer();
  if (!force && !persistenceDirty) {
    return;
  }
  try {
    writeRuntimeLogFileAsync(JSON.stringify(buildRuntimeLogDocument()));
    setPref(HISTORY_PREF_KEY, "");
  } catch {
    // Ignore prefs persistence failures in runtime logger.
  }
  persistenceDirty = false;
  persistenceFlushCount += 1;
}

function scheduleRuntimeLogPersistence() {
  persistenceDirty = true;
  if (persistTimer) {
    return;
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistRuntimeLogsNow();
  }, PERSIST_DEBOUNCE_MS);
}

function pruneExpiredRuntimeLogs(nowMs = Date.now()) {
  const threshold = nowMs - RETENTION_MS;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const ts = Date.parse(entries[i].ts || "");
    if (!Number.isFinite(ts) || ts >= threshold) {
      continue;
    }
    removeEntryAt(i, "expired");
  }
}

function pruneOverflowByEntryBudget() {
  const { maxEntries } = resolveActiveRetentionBudget();
  while (entries.length > maxEntries) {
    removeEntryAt(0, "entry_limit");
  }
}

function pruneOverflowByByteBudget() {
  const { maxBytes } = resolveActiveRetentionBudget();
  if (!(maxBytes > 0)) {
    return;
  }
  while (entries.length > 0 && estimatedBytes > maxBytes) {
    removeEntryAt(0, "byte_budget");
  }
}

function enforceRetentionBudgets() {
  pruneExpiredRuntimeLogs();
  pruneOverflowByEntryBudget();
  pruneOverflowByByteBudget();
}

function hydrateRuntimeLogsIfNeeded() {
  if (hydrated) {
    return;
  }
  hydrated = true;
  let raw = readRuntimeLogFileSync();
  try {
    if (!raw.trim()) {
      raw = String(getPref(HISTORY_PREF_KEY) || "").trim();
      if (raw) {
        writeRuntimeLogFileAsync(raw);
        setPref(HISTORY_PREF_KEY, "");
      }
    }
  } catch {
    raw = raw || "";
  }
  if (!raw) {
    return;
  }
  try {
    const parsed = JSON.parse(raw) as RuntimeLogDocument | unknown[];
    const rows = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.entries)
        ? parsed.entries
      : [];
    entries.length = 0;
    entryByteSizes.clear();
    estimatedBytes = 0;
    droppedEntries = Math.max(
      0,
      Math.floor(Number(Array.isArray(parsed) ? 0 : parsed?.droppedEntries || 0) || 0),
    );
    droppedByReason = {
      entry_limit: Math.max(
        0,
        Math.floor(
          Number(
            Array.isArray(parsed)
              ? 0
              : (parsed?.droppedByReason as Record<string, unknown> | undefined)?.entry_limit || 0,
          ) || 0,
        ),
      ),
      byte_budget: Math.max(
        0,
        Math.floor(
          Number(
            Array.isArray(parsed)
              ? 0
              : (parsed?.droppedByReason as Record<string, unknown> | undefined)?.byte_budget || 0,
          ) || 0,
        ),
      ),
      expired: Math.max(
        0,
        Math.floor(
          Number(
            Array.isArray(parsed)
              ? 0
              : (parsed?.droppedByReason as Record<string, unknown> | undefined)?.expired || 0,
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
      entries.push(parsedEntry);
      const bytes = estimateSerializedBytes(parsedEntry);
      entryByteSizes.set(parsedEntry.id, bytes);
      estimatedBytes += bytes;
      maxSeq = Math.max(maxSeq, parseSequenceFromLogId(parsedEntry.id));
    }
    sequence = Math.max(sequence, maxSeq);
    const beforeDropped = droppedEntries;
    enforceRetentionBudgets();
    if (beforeDropped !== droppedEntries) {
      persistRuntimeLogsNow(true);
    }
  } catch {
    entries.length = 0;
    entryByteSizes.clear();
    estimatedBytes = 0;
    droppedEntries = 0;
    droppedByReason = {
      entry_limit: 0,
      byte_budget: 0,
      expired: 0,
    };
    persistRuntimeLogsNow(true);
  }
}

function emitChanged() {
  if (listeners.size === 0) {
    return;
  }
  const snapshot = snapshotRuntimeLogsInternal();
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function flushRuntimeLogsPersistenceNow() {
  hydrateRuntimeLogsIfNeeded();
  persistRuntimeLogsNow();
}

export async function flushRuntimeLogsPersistence() {
  flushRuntimeLogsPersistenceNow();
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
  hydrateRuntimeLogsIfNeeded();
  diagnosticMode = enabled === true;
  enforceRetentionBudgets();
  persistenceDirty = true;
  persistRuntimeLogsNow();
  emitChanged();
}

export function getRuntimeLogDiagnosticMode() {
  return diagnosticMode;
}

export function appendRuntimeLog(input: RuntimeLogInput) {
  hydrateRuntimeLogsIfNeeded();
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

  entries.push(entry);
  const entryBytes = estimateSerializedBytes(entry);
  entryByteSizes.set(entry.id, entryBytes);
  estimatedBytes += entryBytes;
  enforceRetentionBudgets();
  scheduleRuntimeLogPersistence();
  emitChanged();
  return cloneEntry(entry);
}

export function listRuntimeLogs(filters: RuntimeLogListFilters = {}) {
  hydrateRuntimeLogsIfNeeded();
  const levels = Array.isArray(filters.levels) ? new Set(filters.levels) : null;
  const scopes = Array.isArray(filters.scopes) ? new Set(filters.scopes) : null;
  const backendIds = Array.isArray(filters.backendId) 
    ? new Set(filters.backendId.map(id => normalizeId(id))) 
    : filters.backendId ? new Set([normalizeId(filters.backendId)]) : null;
  const backendType = normalizeId(filters.backendType);
  const providerId = normalizeId(filters.providerId);
  const workflowIds = Array.isArray(filters.workflowId)
    ? new Set(filters.workflowId.map(id => normalizeId(id)))
    : filters.workflowId ? new Set([normalizeId(filters.workflowId)]) : null;
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
  hydrateRuntimeLogsIfNeeded();
  entries.length = 0;
  entryByteSizes.clear();
  estimatedBytes = 0;
  droppedEntries = 0;
  droppedByReason = {
    entry_limit: 0,
    byte_budget: 0,
    expired: 0,
  };
  persistenceDirty = true;
  persistRuntimeLogsNow(true);
  emitChanged();
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
  flushRuntimeLogsPersistenceNow();
  return snapshotRuntimeLogsInternal();
}

export function getRuntimeLogManagerSnapshotForTests() {
  hydrateRuntimeLogsIfNeeded();
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
    hasPendingTimer: persistTimer !== null,
    flushCount: persistenceFlushCount,
    fileFailureCount: filePersistenceFailureCount,
    path: getRuntimePersistencePaths().runtimeLogPath,
  };
}

export function subscribeRuntimeLogs(listener: RuntimeLogListener) {
  hydrateRuntimeLogsIfNeeded();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function formatRuntimeLogsAsPrettyJson(entriesToFormat: RuntimeLogEntry[]) {
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
    navigator?: {
      platform?: string;
      userAgent?: string;
    };
  };
  return (
    String(runtime.navigator?.platform || "").trim() ||
    String(runtime.navigator?.userAgent || "").trim() ||
    "unknown-platform"
  );
}

function normalizeTextPreview(input: string, limit = DIAGNOSTIC_TEXT_PREVIEW_LIMIT) {
  const normalized = String(input || "").replace(/\s+/g, " ").trim();
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

function toDiagnosticExportEntry(entry: RuntimeLogEntry): Record<string, unknown> {
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

function isTerminalStage(stage: string): RuntimeDiagnosticIncident["terminalStatus"] | undefined {
  const normalized = String(stage || "").trim().toLowerCase();
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

function buildIncidentsFromTimeline(timeline: RuntimeDiagnosticTimelineEvent[]) {
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
    if (
      event.level === "error" &&
      !existing.firstError
    ) {
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

export function buildRuntimeDiagnosticBundle(args: {
  filters?: RuntimeLogListFilters;
} = {}): RuntimeDiagnosticBundleV1 {
  flushRuntimeLogsPersistenceNow();
  const filters = args.filters || {};
  const timelineEntries = listRuntimeLogs({
    ...filters,
    order: "asc",
  });
  const timeline: RuntimeDiagnosticTimelineEvent[] = timelineEntries.map((entry) => ({
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
  }));
  const incidents = buildIncidentsFromTimeline(timeline);
  const budget = resolveActiveRetentionBudget();
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
  };
}

export function buildRuntimeIssueSummary(args: {
  filters?: RuntimeLogListFilters;
  topErrorLimit?: number;
} = {}) {
  const bundle = buildRuntimeDiagnosticBundle({
    filters: args.filters,
  });
  const topErrorLimit = Math.max(1, Math.floor(Number(args.topErrorLimit || 8)));
  const errorTimeline = bundle.timeline.filter(
    (entry) => entry.level === "error" || entry.stage.toLowerCase().includes("fail"),
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
