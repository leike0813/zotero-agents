import { hashSynthesisContractCanonicalJson } from "../../packages/synthesis-contracts/src/index";
import type {
  JsonObject,
  JsonValue,
  MutationAttemptError,
  MutationAttemptReport,
  MutationAttemptStatus,
  MutationChangeDto,
  MutationEntityObservationDto,
  MutationEntityRef,
  MutationExecutionResult,
  MutationPhase,
  MutationPreviewOperation,
  MutationReceipt,
  MutationRecovery,
  WorkflowCallControl,
  WorkflowHostMutationReceiptOperation,
} from "../workflows/types";
import type {
  WorkflowHostErrorCode,
  WorkflowHostErrorDetailsByCode,
} from "../workflows/workflowHostErrorContract";
import { assertWorkflowHostStrictJsonValue } from "../workflows/workflowHostErrorContract";

const TERMINAL_RETENTION_MS = 10 * 60 * 1000;
const PREVIEW_TOKEN_TTL_MS = 15 * 60 * 1000;
const TERMINAL_RECORD_LIMIT = 4096;
const TERMINAL_EVIDENCE_BYTES_LIMIT = 256 * 1024 * 1024;

export type ZoteroHostMutationCallerScope = Readonly<{
  ownerId: string;
}>;

type MutationRuntimeConfiguration = {
  now: () => number;
  randomId: () => string;
  terminalRecordLimit: number;
  terminalEvidenceBytesLimit: number;
};

type MutationTerminalRecord = {
  state: "terminal";
  digest: string;
  result: MutationExecutionResult<object>;
  terminalAt: number;
  lastAccessedAt: number;
  serializedBytes: number;
  semanticInput: JsonValue;
};

type MutationRunningRecord = {
  state: "running";
  digest: string;
  promise: Promise<MutationExecutionResult<object>>;
  createdAt: number;
};

type MutationRecord = MutationRunningRecord | MutationTerminalRecord;

type PreviewTokenRecord = {
  scope: string;
  operation: MutationPreviewOperation;
  semanticDigest: string;
  planDigest: string;
  observationDigest: string;
  expiresAt: number;
};

type ConfirmedMutation<TResult extends object> = {
  outcome: "committed" | "unchanged";
  result: TResult;
  changes: MutationChangeDto[];
};

export type MutationExecutionContext = WorkflowCallControl;

export class MutationAuthorityAdmissionError<
  Code extends WorkflowHostErrorCode = WorkflowHostErrorCode,
> extends Error {
  constructor(
    readonly code: Code,
    readonly details: WorkflowHostErrorDetailsByCode[Code],
    message: string,
  ) {
    super(message);
    this.name = "MutationAuthorityAdmissionError";
  }
}

export class MutationAuthorityExecutionError<
  Code extends WorkflowHostErrorCode = WorkflowHostErrorCode,
> extends Error {
  constructor(
    readonly status: MutationAttemptStatus,
    readonly code: Code,
    readonly phase: MutationPhase,
    readonly recovery: MutationRecovery,
    readonly details: WorkflowHostErrorDetailsByCode[Code],
    message: string,
    readonly affectedRefs: MutationEntityRef[] = [],
    readonly residualRefs: MutationEntityRef[] = [],
  ) {
    super(message);
    this.name = "MutationAuthorityExecutionError";
  }
}

const defaultRuntimeConfiguration = (): MutationRuntimeConfiguration => ({
  now: () => Date.now(),
  randomId: () => {
    const crypto = (globalThis as { crypto?: { randomUUID?: () => string } })
      .crypto;
    return crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  },
  terminalRecordLimit: TERMINAL_RECORD_LIMIT,
  terminalEvidenceBytesLimit: TERMINAL_EVIDENCE_BYTES_LIMIT,
});

let runtimeConfiguration = defaultRuntimeConfiguration();
const mutationRecords = new Map<string, MutationRecord>();
const previewTokens = new Map<string, PreviewTokenRecord>();
const pinnedMutationReceipts = new Map<string, number>();

function requireScope(scope: ZoteroHostMutationCallerScope) {
  const ownerId = String(scope?.ownerId || "").trim();
  if (!ownerId || ownerId.length > 256) {
    throw new MutationAuthorityAdmissionError(
      "invalid_request",
      { reason: "invalid_value", field: "callerScope" },
      "A trusted mutation caller scope is required",
    );
  }
  return ownerId;
}

function requireOperationId(operationId: unknown) {
  const normalized = String(operationId || "").trim();
  if (!normalized || normalized.length > 128) {
    throw new MutationAuthorityAdmissionError(
      "invalid_request",
      { reason: "invalid_value", field: "operationId" },
      "operationId must contain between 1 and 128 characters",
    );
  }
  return normalized;
}

function canonicalDigest(value: JsonValue) {
  assertWorkflowHostStrictJsonValue(value);
  return hashSynthesisContractCanonicalJson(value);
}

function canonicalSemanticValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(canonicalSemanticValue);
  }
  if (!value || typeof value !== "object") return value;
  const normalized: Record<string, JsonValue> = {};
  for (const key of Object.keys(value).sort()) {
    if (key === "previewToken") continue;
    normalized[key] = canonicalSemanticValue(value[key]);
  }
  return normalized;
}

export function canonicalMutationDigest(value: JsonValue) {
  return canonicalDigest(canonicalSemanticValue(value));
}

function recordKey(scope: string, operationId: string) {
  return `${scope}\n${operationId}`;
}

function pruneExpiredPreviewTokens(now: number) {
  for (const [token, record] of previewTokens) {
    if (record.expiresAt <= now) previewTokens.delete(token);
  }
}

function terminalRecords() {
  return Array.from(mutationRecords.entries()).filter(
    (entry): entry is [string, MutationTerminalRecord] =>
      entry[1].state === "terminal",
  );
}

function pruneTerminalRecords(now: number) {
  for (const [key, record] of terminalRecords()) {
    const receiptId =
      record.result.outcome === "committed" ||
      record.result.outcome === "unchanged"
        ? record.result.receipt.receiptId
        : "";
    if (
      now - record.terminalAt >= TERMINAL_RETENTION_MS &&
      !pinnedMutationReceipts.has(receiptId)
    ) {
      mutationRecords.delete(key);
    }
  }
}

function ensureReservationCapacity(now: number) {
  pruneTerminalRecords(now);
  const terminals = terminalRecords();
  const protectedTerminals = terminals.filter(
    ([, record]) => now - record.terminalAt < TERMINAL_RETENTION_MS,
  );
  const protectedBytes = protectedTerminals.reduce(
    (sum, [, record]) => sum + record.serializedBytes,
    0,
  );
  if (
    protectedTerminals.length >= runtimeConfiguration.terminalRecordLimit ||
    protectedBytes >= runtimeConfiguration.terminalEvidenceBytesLimit
  ) {
    throw new MutationAuthorityAdmissionError(
      "resource_limited",
      {
        resource: "entries",
        limit: runtimeConfiguration.terminalRecordLimit,
        observed: protectedTerminals.length,
      },
      "The process-local mutation replay registry is full",
    );
  }
}

function asAttemptError(
  error: MutationAuthorityExecutionError,
): MutationAttemptError {
  return {
    code: error.code,
    phase: error.phase,
    recovery: error.recovery,
    message: error.message,
    details: error.details,
  } as MutationAttemptError;
}

function attemptFromError(
  error: unknown,
  operationId: string,
  operation: WorkflowHostMutationReceiptOperation,
): MutationExecutionResult<JsonObject> {
  const normalized =
    error instanceof MutationAuthorityExecutionError
      ? error
      : new MutationAuthorityExecutionError(
          "failed",
          "execution_failed",
          "commit",
          "retry_same_operation",
          {
            phase: "commit",
            recovery: "retry_same_operation",
          },
          error instanceof Error ? error.message : "Mutation execution failed",
        );
  const attempt: MutationAttemptReport = {
    schema: "zotero-agents.mutation-attempt.v1",
    attemptId: runtimeConfiguration.randomId(),
    operationId,
    operation,
    status: normalized.status,
    error: asAttemptError(normalized),
    affectedRefs: normalized.affectedRefs,
    residualRefs: normalized.residualRefs,
  };
  assertWorkflowHostStrictJsonValue(attempt as unknown as JsonValue);
  return { outcome: normalized.status, attempt };
}

function confirmedResult<TResult extends object>(
  operationId: string,
  operation: WorkflowHostMutationReceiptOperation,
  semanticInput: JsonValue,
  confirmed: ConfirmedMutation<TResult>,
): MutationExecutionResult<TResult> {
  const committedAt = new Date(runtimeConfiguration.now()).toISOString();
  const effectDigest = canonicalDigest({
    operation,
    semanticInput: canonicalSemanticValue(semanticInput),
    outcome: confirmed.outcome,
    changes: confirmed.changes,
  });
  const receipt: MutationReceipt = {
    schema: "zotero-agents.mutation-receipt.v1",
    receiptId: runtimeConfiguration.randomId(),
    operationId,
    operation,
    outcome: confirmed.outcome,
    committedAt,
    effectDigest,
    changes: confirmed.changes,
  };
  const result: MutationExecutionResult<TResult> = {
    outcome: confirmed.outcome,
    receipt,
    result: confirmed.result,
  };
  assertWorkflowHostStrictJsonValue(result as unknown as JsonValue);
  return result;
}

function isRetriableFailedTerminal(result: MutationExecutionResult<object>) {
  if (result.outcome !== "failed" || !("attempt" in result)) return false;
  return result.attempt.error.recovery === "retry_same_operation";
}

export async function executeReservedMutation<TResult extends object>(args: {
  scope: ZoteroHostMutationCallerScope;
  operationId: string;
  operation: WorkflowHostMutationReceiptOperation;
  semanticInput: JsonValue;
  control?: MutationExecutionContext;
  execute: () => Promise<ConfirmedMutation<TResult>>;
}): Promise<MutationExecutionResult<TResult>> {
  const scope = requireScope(args.scope);
  const operationId = requireOperationId(args.operationId);
  const digest = canonicalMutationDigest(args.semanticInput);
  const key = recordKey(scope, operationId);
  const now = runtimeConfiguration.now();
  const existing = mutationRecords.get(key);
  if (existing) {
    if (existing.digest !== digest) {
      throw new MutationAuthorityAdmissionError(
        "conflict",
        { reason: "idempotency_conflict" },
        "operationId is already bound to different semantic input",
      );
    }
    if (existing.state === "running") {
      return existing.promise as Promise<MutationExecutionResult<TResult>>;
    }
    // A confirmed failure whose recovery contract is retry_same_operation is
    // not replayed: the retried call forms a successor attempt under the same
    // operation identity instead of returning the stale failure snapshot.
    if (isRetriableFailedTerminal(existing.result)) {
      mutationRecords.delete(key);
    } else {
      existing.lastAccessedAt = now;
      return existing.result as MutationExecutionResult<TResult>;
    }
  }
  ensureReservationCapacity(now);
  let resolveResult!: (result: MutationExecutionResult<object>) => void;
  const promise = new Promise<MutationExecutionResult<object>>((resolve) => {
    resolveResult = resolve;
  });
  mutationRecords.set(key, {
    state: "running",
    digest,
    promise,
    createdAt: now,
  });

  let terminal: MutationExecutionResult<object>;
  try {
    if (args.control?.signal?.aborted) {
      throw new MutationAuthorityExecutionError(
        "canceled",
        "canceled",
        "reservation",
        "none",
        { reason: "caller_signal" },
        "Mutation canceled before its first write",
      );
    }
    const confirmed = await args.execute();
    if (args.control?.signal?.aborted) {
      throw new MutationAuthorityExecutionError(
        "unknown",
        "canceled",
        "verification",
        "reconcile",
        { reason: "caller_signal" },
        "Mutation completion raced with cancellation",
        confirmed.changes.map((change) => change.entity),
      );
    }
    terminal = confirmedResult(
      operationId,
      args.operation,
      args.semanticInput,
      confirmed,
    ) as MutationExecutionResult<object>;
  } catch (error) {
    terminal = attemptFromError(error, operationId, args.operation);
  }
  const terminalAt = runtimeConfiguration.now();
  const serializedBytes = JSON.stringify(terminal).length;
  mutationRecords.set(key, {
    state: "terminal",
    digest,
    result: terminal,
    terminalAt,
    lastAccessedAt: terminalAt,
    serializedBytes,
    semanticInput: canonicalSemanticValue(args.semanticInput),
  });
  resolveResult(terminal);
  return terminal as MutationExecutionResult<TResult>;
}

export type PinnedMutationReceiptEvidence = Readonly<{
  receipt: MutationReceipt;
  semanticInput: JsonValue;
  release(): void;
}>;

export function pinVerifiedMutationReceipt(
  receipt: MutationReceipt,
): PinnedMutationReceiptEvidence | null {
  assertWorkflowHostStrictJsonValue(receipt as unknown as JsonValue);
  for (const [, record] of terminalRecords()) {
    if (
      record.result.outcome !== "committed" &&
      record.result.outcome !== "unchanged"
    ) {
      continue;
    }
    const stored = record.result.receipt;
    if (
      stored.receiptId !== receipt.receiptId ||
      canonicalDigest(stored as unknown as JsonValue) !==
        canonicalDigest(receipt as unknown as JsonValue)
    ) {
      continue;
    }
    pinnedMutationReceipts.set(
      stored.receiptId,
      (pinnedMutationReceipts.get(stored.receiptId) || 0) + 1,
    );
    let released = false;
    return {
      receipt: stored,
      semanticInput: record.semanticInput,
      release() {
        if (released) return;
        released = true;
        const count = pinnedMutationReceipts.get(stored.receiptId) || 0;
        if (count <= 1) pinnedMutationReceipts.delete(stored.receiptId);
        else pinnedMutationReceipts.set(stored.receiptId, count - 1);
      },
    };
  }
  return null;
}

export function issueMutationPreviewToken(args: {
  scope: ZoteroHostMutationCallerScope;
  operation: MutationPreviewOperation;
  semanticInput: JsonValue;
  plan: JsonObject;
  observations: MutationEntityObservationDto[];
}) {
  const scope = requireScope(args.scope);
  const now = runtimeConfiguration.now();
  pruneExpiredPreviewTokens(now);
  const token = runtimeConfiguration.randomId();
  const expiresAt = now + PREVIEW_TOKEN_TTL_MS;
  previewTokens.set(token, {
    scope,
    operation: args.operation,
    semanticDigest: canonicalMutationDigest(args.semanticInput),
    planDigest: canonicalDigest(args.plan),
    observationDigest: canonicalDigest(
      args.observations as unknown as JsonValue,
    ),
    expiresAt,
  });
  return { value: token, expiresAt: new Date(expiresAt).toISOString() };
}

export function validateMutationPreviewToken(args: {
  scope: ZoteroHostMutationCallerScope;
  token: string;
  operation: MutationPreviewOperation;
  semanticInput: JsonValue;
  plan: JsonObject;
  observations: MutationEntityObservationDto[];
}) {
  const scope = requireScope(args.scope);
  const now = runtimeConfiguration.now();
  const record = previewTokens.get(String(args.token || ""));
  if (!record) {
    throw new MutationAuthorityExecutionError(
      "failed",
      "invalid_ref",
      "read",
      "refresh_and_retry_new_operation",
      { kind: "item", reason: "forged" },
      "The mutation preview token is invalid",
    );
  }
  if (record.expiresAt <= now) {
    previewTokens.delete(args.token);
    throw new MutationAuthorityExecutionError(
      "failed",
      "invalid_ref",
      "read",
      "refresh_and_retry_new_operation",
      { kind: "item", reason: "expired" },
      "The mutation preview token has expired",
    );
  }
  const semanticDigest = canonicalMutationDigest(args.semanticInput);
  const planDigest = canonicalDigest(args.plan);
  const observationDigest = canonicalDigest(
    args.observations as unknown as JsonValue,
  );
  if (
    record.scope !== scope ||
    record.operation !== args.operation ||
    record.semanticDigest !== semanticDigest ||
    record.planDigest !== planDigest ||
    record.observationDigest !== observationDigest
  ) {
    throw new MutationAuthorityExecutionError(
      "failed",
      "conflict",
      "read",
      "refresh_and_retry_new_operation",
      { reason: "revision_mismatch" },
      "The current mutation plan no longer matches the preview evidence",
    );
  }
}

export function discardMutationPreviewToken(token: string) {
  previewTokens.delete(String(token || ""));
}

export function configureMutationAuthorityRuntimeForTests(
  configuration: Partial<MutationRuntimeConfiguration>,
) {
  runtimeConfiguration = { ...runtimeConfiguration, ...configuration };
}

export function resetMutationAuthorityRuntimeForTests() {
  mutationRecords.clear();
  previewTokens.clear();
  pinnedMutationReceipts.clear();
  runtimeConfiguration = defaultRuntimeConfiguration();
}
