import {
  compareAndSetPluginTaskContextEntry,
  deletePluginTaskContextDomain,
  deletePluginTaskContextEntry,
  getPluginTaskContextEntry,
  listPluginTaskContextEntries,
  upsertPluginTaskContextEntry,
} from "./pluginStateStore";
import { getTaskHistoryRetentionConfig } from "./taskRetentionPolicy";

const DOMAIN = "host-bridge-operations";
const RETENTION_MS = getTaskHistoryRetentionConfig().retentionMs;
const runtimeInstanceId = `host-bridge-${Date.now().toString(36)}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

export type HostBridgeOperationState =
  | "in_progress"
  | "completed"
  | "outcome_unknown";

export type HostBridgeOperationResponse = {
  status: number;
  reason: string;
  body: unknown;
};

export type HostBridgeOperationRecord = {
  schema: "host-bridge.operation-receipt.v1";
  operationId: string;
  requestDigest: string;
  attemptId: string;
  runtimeInstanceId: string;
  method: string;
  path: string;
  state: HostBridgeOperationState;
  createdAt: string;
  updatedAt: string;
  retentionExpiresAt: string;
  stateChange: "unchanged" | "changed" | "unknown";
  handleConsumption: "unconsumed" | "consumed" | "unknown";
  response?: HostBridgeOperationResponse;
};

function nowIso() {
  return new Date().toISOString();
}

function futureIso(from: string) {
  return new Date(Date.parse(from) + RETENTION_MS).toISOString();
}

function parseRecord(payload: string): HostBridgeOperationRecord | null {
  try {
    const record = JSON.parse(payload) as HostBridgeOperationRecord;
    return record?.operationId && record?.requestDigest ? record : null;
  } catch {
    return null;
  }
}

function entryFor(record: HostBridgeOperationRecord) {
  return {
    contextId: record.operationId,
    requestId: record.requestDigest,
    backendId: "host-bridge",
    state: record.state,
    updatedAt: record.updatedAt,
    payload: JSON.stringify(record),
  };
}

function cleanup(now = Date.now()) {
  for (const entry of listPluginTaskContextEntries(DOMAIN)) {
    const record = parseRecord(entry.payload);
    if (!record || Date.parse(record.retentionExpiresAt) <= now) {
      deletePluginTaskContextEntry(DOMAIN, entry.contextId);
    }
  }
}

export function getHostBridgeOperation(operationId: string) {
  cleanup();
  const entry = getPluginTaskContextEntry(DOMAIN, operationId.trim());
  return entry ? parseRecord(entry.payload) : null;
}

export function reserveHostBridgeOperation(args: {
  operationId: string;
  requestDigest: string;
  method: string;
  path: string;
}) {
  cleanup();
  const operationId = args.operationId.trim();
  const requestDigest = args.requestDigest.trim();
  const createdAt = nowIso();
  const record: HostBridgeOperationRecord = {
    schema: "host-bridge.operation-receipt.v1",
    operationId,
    requestDigest,
    attemptId: `${runtimeInstanceId}-${createdAt}`,
    runtimeInstanceId,
    method: args.method,
    path: args.path,
    state: "in_progress",
    createdAt,
    updatedAt: createdAt,
    retentionExpiresAt: futureIso(createdAt),
    stateChange: "unknown",
    handleConsumption: "unknown",
  };
  const result = compareAndSetPluginTaskContextEntry({
    domain: DOMAIN,
    contextId: operationId,
    expectedStates: [null],
    next: entryFor(record),
  });
  if (result.updated) return { kind: "reserved" as const, record };
  const existing = result.current ? parseRecord(result.current.payload) : null;
  if (!existing) return { kind: "conflict" as const, record: null };
  return existing.requestDigest === requestDigest
    ? { kind: "replay" as const, record: existing }
    : { kind: "conflict" as const, record: existing };
}

export function completeHostBridgeOperation(args: {
  operationId: string;
  response: HostBridgeOperationResponse;
}) {
  const current = getHostBridgeOperation(args.operationId);
  if (!current) return null;
  const updatedAt = nowIso();
  const envelope = args.response.body as {
    result?: Record<string, unknown>;
    error?: Record<string, unknown>;
  };
  const control = envelope?.error || envelope?.result || {};
  const stateChange = ["unchanged", "changed", "unknown"].includes(
    String(control.stateChange || ""),
  )
    ? (control.stateChange as HostBridgeOperationRecord["stateChange"])
    : "unknown";
  const handleConsumption = ["unconsumed", "consumed", "unknown"].includes(
    String(control.handleConsumption || ""),
  )
    ? (control.handleConsumption as HostBridgeOperationRecord["handleConsumption"])
    : "unknown";
  const record: HostBridgeOperationRecord = {
    ...current,
    state: "completed",
    updatedAt,
    retentionExpiresAt: futureIso(updatedAt),
    stateChange,
    handleConsumption,
    response: args.response,
  };
  const result = compareAndSetPluginTaskContextEntry({
    domain: DOMAIN,
    contextId: current.operationId,
    expectedStates: ["in_progress"],
    next: entryFor(record),
  });
  return result.updated && result.current
    ? parseRecord(result.current.payload)
    : null;
}

export function markHostBridgeOperationOutcomeUnknown(operationId: string) {
  const current = getHostBridgeOperation(operationId);
  if (!current) return null;
  const updatedAt = nowIso();
  const record: HostBridgeOperationRecord = {
    ...current,
    state: "outcome_unknown",
    updatedAt,
    retentionExpiresAt: futureIso(updatedAt),
    stateChange: "unknown",
    handleConsumption: "unknown",
  };
  const result = compareAndSetPluginTaskContextEntry({
    domain: DOMAIN,
    contextId: current.operationId,
    expectedStates: ["in_progress"],
    next: entryFor(record),
  });
  return result.updated && result.current
    ? parseRecord(result.current.payload)
    : null;
}

export function recoverHostBridgeOperationStoreAfterRestart() {
  for (const entry of listPluginTaskContextEntries(DOMAIN)) {
    const record = parseRecord(entry.payload);
    if (
      !record ||
      record.state !== "in_progress" ||
      record.runtimeInstanceId === runtimeInstanceId
    ) {
      continue;
    }
    const updatedAt = nowIso();
    upsertPluginTaskContextEntry(
      DOMAIN,
      entryFor({
        ...record,
        state: "outcome_unknown",
        updatedAt,
        retentionExpiresAt: futureIso(updatedAt),
        stateChange: "unknown",
        handleConsumption: "unknown",
      }),
    );
  }
}

export function resetHostBridgeOperationStoreForTests() {
  deletePluginTaskContextDomain(DOMAIN);
}

export const hostBridgeOperationStoreInternalsForTests = {
  DOMAIN,
  RETENTION_MS,
  runtimeInstanceId,
  cleanup,
};
