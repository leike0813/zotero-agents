import type { HostBridgeWorkflowSelection } from "./hostBridgeWorkflowControl";
import {
  compareAndSetPluginTaskContextEntry,
  deletePluginTaskContextDomain,
  deletePluginTaskContextEntry,
  getPluginTaskContextEntry,
  listPluginTaskContextEntries,
  upsertPluginTaskContextEntry,
} from "./pluginStateStore";
import { getTaskHistoryRetentionConfig } from "./taskRetentionPolicy";

const DOMAIN = "host-bridge-agent-runs";
const RETENTION_MS = getTaskHistoryRetentionConfig().retentionMs;

export type HostBridgeAgentRunState =
  | "prepared"
  | "expired"
  | "preflighting"
  | "applying"
  | "succeeded"
  | "partial"
  | "failed"
  | "outcome_unknown"
  | "abandoned";

export type HostBridgeAgentRunPreparedRequest = {
  agentRequestId: string;
  requestIndex: number;
  taskName?: string;
  requestKind?: string;
  skillId?: string;
  namespace: string;
  resultJsonPath: string;
  bundlePath: string;
  request: unknown;
};

export type HostBridgeAgentRunApplyReceipt = {
  schema: "host-bridge.agent-apply-receipt.v2";
  agentRunId: string;
  workflowId: string;
  status:
    | "preflight"
    | "applying"
    | "succeeded"
    | "partial"
    | "failed"
    | "outcome_unknown"
    | "abandoned";
  updatedAt: string;
  stateChange: "unchanged" | "changed" | "unknown";
  handleConsumption: "unconsumed" | "consumed" | "unknown";
  recoverable: boolean;
  results: Array<{
    agentRequestId: string;
    status: "pending" | "succeeded" | "failed" | "unknown";
    errorCode?: string;
    error?: string;
    objectRefs?: string[];
    safeNextAction?: string;
  }>;
};

export type HostBridgeAgentRunRecord = {
  agentRunId: string;
  workflowId: string;
  selection: HostBridgeWorkflowSelection;
  state: HostBridgeAgentRunState;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  retentionExpiresAt: string;
  requests: HostBridgeAgentRunPreparedRequest[];
  sealedAt?: string;
  renewedAt?: string;
  abandonedAt?: string;
  outcome?: "succeeded" | "partial" | "failed";
  error?: string;
  applyReceipt?: HostBridgeAgentRunApplyReceipt;
};

let sequence = 0;

function nowIso() {
  return new Date().toISOString();
}

function futureIso(from: string, durationMs = RETENTION_MS) {
  return new Date(Date.parse(from) + durationMs).toISOString();
}

function createAgentRunId() {
  sequence += 1;
  const random = Math.random().toString(36).slice(2, 10);
  return `agent-run-${Date.now().toString(36)}-${sequence.toString(36)}-${random}`;
}

function parseRecord(payload: string): HostBridgeAgentRunRecord | null {
  try {
    const record = JSON.parse(payload) as HostBridgeAgentRunRecord;
    return record?.agentRunId && record?.workflowId ? record : null;
  } catch {
    return null;
  }
}

function entryFor(record: HostBridgeAgentRunRecord) {
  return {
    contextId: record.agentRunId,
    requestId: record.workflowId,
    backendId: "host-bridge",
    state: record.state,
    updatedAt: record.updatedAt,
    payload: JSON.stringify(record),
  };
}

function cleanupRetained(now = Date.now()) {
  for (const entry of listPluginTaskContextEntries(DOMAIN)) {
    const record = parseRecord(entry.payload);
    if (!record || Date.parse(record.retentionExpiresAt) <= now) {
      deletePluginTaskContextEntry(DOMAIN, entry.contextId);
    }
  }
}

function readRecord(agentRunId: string) {
  cleanupRetained();
  const entry = getPluginTaskContextEntry(DOMAIN, agentRunId);
  return entry ? parseRecord(entry.payload) : null;
}

function writeRecord(record: HostBridgeAgentRunRecord) {
  upsertPluginTaskContextEntry(DOMAIN, entryFor(record));
  return record;
}

function transition(args: {
  agentRunId: string;
  expectedStates: HostBridgeAgentRunState[];
  mutate: (
    record: HostBridgeAgentRunRecord,
    now: string,
  ) => HostBridgeAgentRunRecord;
}) {
  const current = readRecord(args.agentRunId);
  if (!current || !args.expectedStates.includes(current.state)) return null;
  const now = nowIso();
  const next = args.mutate(current, now);
  next.updatedAt = now;
  next.retentionExpiresAt = futureIso(now);
  const result = compareAndSetPluginTaskContextEntry({
    domain: DOMAIN,
    contextId: args.agentRunId,
    expectedStates: args.expectedStates,
    next: entryFor(next),
  });
  return result.updated && result.current
    ? parseRecord(result.current.payload)
    : null;
}

export function createHostBridgeAgentRunRecord(args: {
  workflowId: string;
  selection: HostBridgeWorkflowSelection;
  requests: HostBridgeAgentRunPreparedRequest[];
}): HostBridgeAgentRunRecord {
  cleanupRetained();
  const createdAt = nowIso();
  return writeRecord({
    agentRunId: createAgentRunId(),
    workflowId: args.workflowId,
    selection: args.selection,
    state: "prepared",
    createdAt,
    updatedAt: createdAt,
    expiresAt: futureIso(createdAt),
    retentionExpiresAt: futureIso(createdAt),
    requests: args.requests,
  });
}

function markExpired(record: HostBridgeAgentRunRecord) {
  if (
    record.state !== "prepared" ||
    Date.parse(record.expiresAt) > Date.now()
  ) {
    return record;
  }
  return (
    transition({
      agentRunId: record.agentRunId,
      expectedStates: ["prepared"],
      mutate: (current) => ({ ...current, state: "expired" }),
    }) || record
  );
}

export function getHostBridgeAgentRunRecord(agentRunId: string) {
  const record = readRecord(agentRunId);
  if (!record) return null;
  const current = markExpired(record);
  return current.state === "expired" ? null : current;
}

export function getExpiredHostBridgeAgentRunRecord(agentRunId: string) {
  const record = readRecord(agentRunId);
  if (!record) return null;
  const current = markExpired(record);
  return current.state === "expired" ? current : null;
}

export function acquireHostBridgeAgentRunApplyLease(agentRunId: string) {
  return transition({
    agentRunId,
    expectedStates: ["prepared"],
    mutate: (record) => ({ ...record, state: "preflighting" }),
  });
}

export function releaseHostBridgeAgentRunApplyLease(agentRunId: string) {
  return transition({
    agentRunId,
    expectedStates: ["preflighting"],
    mutate: (record) => ({ ...record, state: "prepared" }),
  });
}

export function sealHostBridgeAgentRunRecord(agentRunId: string) {
  return transition({
    agentRunId,
    expectedStates: ["preflighting"],
    mutate: (record, now) => ({
      ...record,
      state: "applying",
      sealedAt: record.sealedAt || now,
    }),
  });
}

export function renewHostBridgeAgentRunRecord(agentRunId: string) {
  return transition({
    agentRunId,
    expectedStates: ["prepared", "expired"],
    mutate: (record, now) => ({
      ...record,
      state: "prepared",
      expiresAt: futureIso(now),
      renewedAt: now,
    }),
  });
}

export function abandonHostBridgeAgentRunRecord(agentRunId: string) {
  return transition({
    agentRunId,
    expectedStates: ["prepared", "expired"],
    mutate: (record, now) => ({
      ...record,
      state: "abandoned",
      abandonedAt: now,
      applyReceipt: {
        schema: "host-bridge.agent-apply-receipt.v2",
        agentRunId: record.agentRunId,
        workflowId: record.workflowId,
        status: "abandoned",
        updatedAt: now,
        stateChange: "unchanged",
        handleConsumption: "consumed",
        recoverable: false,
        results: [],
      },
    }),
  });
}

export function finishHostBridgeAgentRunRecord(args: {
  agentRunId: string;
  outcome: "succeeded" | "partial" | "failed";
  error?: string;
}) {
  return transition({
    agentRunId: args.agentRunId,
    expectedStates: ["applying"],
    mutate: (record) => ({
      ...record,
      state: args.outcome,
      outcome: args.outcome,
      error: args.error,
    }),
  });
}

export function recordHostBridgeAgentRunApplyReceipt(
  agentRunId: string,
  receipt: Omit<HostBridgeAgentRunApplyReceipt, "schema" | "updatedAt">,
) {
  const record = readRecord(agentRunId);
  if (!record) return null;
  const updatedAt = nowIso();
  const applyReceipt: HostBridgeAgentRunApplyReceipt = {
    schema: "host-bridge.agent-apply-receipt.v2",
    ...receipt,
    updatedAt,
  };
  writeRecord({
    ...record,
    updatedAt,
    retentionExpiresAt: futureIso(updatedAt),
    applyReceipt,
  });
  return applyReceipt;
}

export function getHostBridgeAgentRunApplyReceipt(agentRunId: string) {
  const record = readRecord(agentRunId);
  if (!record) return null;
  return (
    record.applyReceipt || {
      schema: "host-bridge.agent-apply-receipt.v2",
      agentRunId: record.agentRunId,
      workflowId: record.workflowId,
      status: "preflight",
      updatedAt: record.createdAt,
      stateChange: "unchanged",
      handleConsumption: record.sealedAt ? "consumed" : "unconsumed",
      recoverable: !record.sealedAt,
      results: [],
    }
  );
}

export function recoverHostBridgeAgentRunStoreAfterRestart() {
  for (const entry of listPluginTaskContextEntries(DOMAIN)) {
    const record = parseRecord(entry.payload);
    if (!record) continue;
    if (record.state === "preflighting") {
      releaseHostBridgeAgentRunApplyLease(record.agentRunId);
    } else if (record.state === "applying") {
      transition({
        agentRunId: record.agentRunId,
        expectedStates: ["applying"],
        mutate: (current, now) => ({
          ...current,
          state: "outcome_unknown",
          applyReceipt: {
            schema: "host-bridge.agent-apply-receipt.v2",
            agentRunId: current.agentRunId,
            workflowId: current.workflowId,
            status: "outcome_unknown",
            updatedAt: now,
            stateChange: "unknown",
            handleConsumption: "consumed",
            recoverable: false,
            results:
              current.applyReceipt?.results.map((result) =>
                result.status === "pending"
                  ? { ...result, status: "unknown" as const }
                  : result,
              ) || [],
          },
        }),
      });
    }
  }
}

export function resetHostBridgeAgentRunStoreForTests() {
  deletePluginTaskContextDomain(DOMAIN);
  sequence = 0;
}

export const hostBridgeAgentRunStoreInternalsForTests = {
  DOMAIN,
  RETENTION_MS,
  cleanupRetained,
};
