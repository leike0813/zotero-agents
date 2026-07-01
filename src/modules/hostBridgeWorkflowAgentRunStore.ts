import type { HostBridgeWorkflowSelection } from "./hostBridgeWorkflowControl";

const AGENT_RUN_TTL_MS = 24 * 60 * 60 * 1000;

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

export type HostBridgeAgentRunRecord = {
  agentRunId: string;
  workflowId: string;
  selection: HostBridgeWorkflowSelection;
  createdAt: string;
  expiresAt: string;
  requests: HostBridgeAgentRunPreparedRequest[];
  sealedAt?: string;
  outcome?: "succeeded" | "failed";
  error?: string;
};

const records = new Map<string, HostBridgeAgentRunRecord>();
let sequence = 0;

function nowIso() {
  return new Date().toISOString();
}

function createAgentRunId() {
  sequence += 1;
  return `agent-run-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

function isExpired(record: HostBridgeAgentRunRecord, now = Date.now()) {
  return Date.parse(record.expiresAt) <= now;
}

function cleanupExpired(now = Date.now()) {
  for (const [id, record] of records) {
    if (isExpired(record, now)) {
      records.delete(id);
    }
  }
}

export function createHostBridgeAgentRunRecord(args: {
  workflowId: string;
  selection: HostBridgeWorkflowSelection;
  requests: HostBridgeAgentRunPreparedRequest[];
}): HostBridgeAgentRunRecord {
  cleanupExpired();
  const createdAt = nowIso();
  const expiresAt = new Date(
    Date.parse(createdAt) + AGENT_RUN_TTL_MS,
  ).toISOString();
  const record: HostBridgeAgentRunRecord = {
    agentRunId: createAgentRunId(),
    workflowId: args.workflowId,
    selection: args.selection,
    createdAt,
    expiresAt,
    requests: args.requests,
  };
  records.set(record.agentRunId, record);
  return record;
}

export function getHostBridgeAgentRunRecord(agentRunId: string) {
  cleanupExpired();
  const record = records.get(agentRunId);
  if (!record) {
    return null;
  }
  if (isExpired(record)) {
    records.delete(agentRunId);
    return null;
  }
  return record;
}

export function getExpiredHostBridgeAgentRunRecord(agentRunId: string) {
  const record = records.get(agentRunId);
  if (!record || !isExpired(record)) {
    return null;
  }
  return record;
}

export function sealHostBridgeAgentRunRecord(agentRunId: string) {
  const record = records.get(agentRunId);
  if (!record) {
    return null;
  }
  if (!record.sealedAt) {
    record.sealedAt = nowIso();
  }
  return record;
}

export function finishHostBridgeAgentRunRecord(args: {
  agentRunId: string;
  outcome: "succeeded" | "failed";
  error?: string;
}) {
  const record = records.get(args.agentRunId);
  if (!record) {
    return null;
  }
  record.outcome = args.outcome;
  record.error = args.error;
  return record;
}

export function resetHostBridgeAgentRunStoreForTests() {
  records.clear();
  sequence = 0;
}
