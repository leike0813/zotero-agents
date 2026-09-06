import { hashSynthesisContractCanonicalJson } from "../../packages/synthesis-contracts/src/index";
import type {
  JsonObject,
  JsonValue,
  MutationAttemptError,
  MutationAttemptReport,
  MutationAttemptStatus,
  MutationChangeDto,
  MutationEntityRef,
  MutationExecutionResult,
  MutationPhase,
  MutationReceipt,
  MutationRecovery,
  WorkflowCallControl,
  WorkflowHostMutationReceiptOperation,
} from "../workflows/types";
import type {
  WorkflowHostErrorCode,
  WorkflowHostErrorDetailsByCode,
} from "../workflows/workflowHostErrorContract";
import {
  assertWorkflowHostErrorDetails,
  assertWorkflowHostStrictJsonValue,
} from "../workflows/workflowHostErrorContract";
import {
  claimPluginMutationAuthorityEntry,
  clearPluginMutationAuthorityEntriesForTests,
  expirePluginMutationAuthorityEntryEvidence,
  getPluginMutationAuthorityEntry,
  settlePluginMutationAuthorityEntry,
  type PluginMutationAuthorityEntry,
} from "./pluginStateStore";

const TERMINAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export type ZoteroHostMutationCallerScope = Readonly<{
  ownerId: string;
}>;

type MutationRuntimeConfiguration = {
  now: () => number;
  randomId: () => string;
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

type ConfirmedMutation<TResult extends object> = {
  outcome: "committed" | "unchanged";
  result: TResult;
  changes: MutationChangeDto[];
};

export type MutationExecutionContext = WorkflowCallControl;

export type MutationOperationObservation =
  | Readonly<{ state: "running" }>
  | Readonly<{ state: "settled"; result: MutationExecutionResult<object> }>
  | Readonly<{ state: "unavailable" }>;

export type MutationReplayLookup<TResult extends object> =
  | Readonly<{ state: "missing" }>
  | Readonly<{ state: "settled"; result: MutationExecutionResult<TResult> }>
  | Readonly<{ state: "unavailable" }>;

/**
 * Private adapter lookup for stored-file writes before the adapter resolves a
 * local path or resource. This is deliberately separate from the public
 * operation observation: the content manifest is trusted in-process evidence,
 * never a Bridge, Workflow, or transport DTO.
 */
export type TrustedStoredAttachmentMutationLookup<TResult extends object> =
  | Readonly<{ state: "missing" }>
  | Readonly<{ state: "settled"; result: MutationExecutionResult<TResult> }>
  | Readonly<{
      state: "tombstone";
      result: MutationExecutionResult<TResult>;
    }>;

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
});

let runtimeConfiguration = defaultRuntimeConfiguration();
const mutationRecords = new Map<string, MutationRecord>();
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

function assertAuthorityStrictJsonValue(
  value: unknown,
): asserts value is JsonValue {
  assertWorkflowHostStrictJsonValue(value);
  const visit = (candidate: JsonValue) => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    if (candidate && typeof candidate === "object") {
      if (!isPlainObject(candidate)) {
        throw new TypeError(
          "Mutation authority evidence must not contain class instances",
        );
      }
      Object.values(candidate).forEach(visit);
    }
  };
  visit(value);
}

function canonicalDigest(value: JsonValue) {
  assertAuthorityStrictJsonValue(value);
  return hashSynthesisContractCanonicalJson(value);
}

function canonicalSemanticValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(canonicalSemanticValue);
  }
  if (!value || typeof value !== "object") return value;
  const normalized: Record<string, JsonValue> = {};
  for (const key of Object.keys(value).sort()) {
    normalized[key] = canonicalSemanticValue(value[key]);
  }
  return normalized;
}

export function canonicalMutationDigest(value: JsonValue) {
  assertAuthorityStrictJsonValue(value);
  return canonicalDigest(canonicalSemanticValue(value));
}

function recordKey(scope: string, operationId: string) {
  return `${scope}\n${operationId}`;
}

function idempotencyConflict() {
  return new MutationAuthorityAdmissionError(
    "conflict",
    { reason: "idempotency_conflict" },
    "operationId is already bound to different semantic input",
  );
}

function assertEntryBinding(args: {
  entry: PluginMutationAuthorityEntry;
  operation: WorkflowHostMutationReceiptOperation;
  digest: string;
}) {
  if (
    args.entry.operation !== args.operation ||
    args.entry.semanticDigest !== args.digest
  ) {
    throw idempotencyConflict();
  }
}

function parseStoredResult(
  entry: PluginMutationAuthorityEntry,
): MutationExecutionResult<object> {
  if (!entry.result) {
    throw new Error("plugin_mutation_authority_terminal_evidence_missing");
  }
  const result = JSON.parse(entry.result) as MutationExecutionResult<object>;
  assertAuthorityStrictJsonValue(result);
  return result;
}

function parseStoredSemanticInput(entry: PluginMutationAuthorityEntry) {
  let semanticInput: unknown;
  try {
    semanticInput = JSON.parse(entry.semanticInput);
  } catch {
    throw new Error("plugin_mutation_authority_semantic_input_invalid");
  }
  assertAuthorityStrictJsonValue(semanticInput);
  return semanticInput;
}

function assertStoredAttachmentContentIdentity(semanticInput: JsonValue) {
  if (!isPlainObject(semanticInput)) throw idempotencyConflict();
  const source = semanticInput.source;
  if (!isPlainObject(source) || source.kind !== "stored_file") {
    throw idempotencyConflict();
  }
  const content = source.content;
  if (!isPlainObject(content)) throw idempotencyConflict();
  if (
    content.schema !== "zotero-agents.attachment-content.v1" ||
    typeof content.identity !== "string" ||
    !content.identity ||
    !isStoredAttachmentContentEntry(content.main) ||
    !Array.isArray(content.companions) ||
    !content.companions.every(isStoredAttachmentContentEntry)
  ) {
    throw idempotencyConflict();
  }
}

function isStoredAttachmentContentEntry(value: unknown) {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ["relativePath", "sizeBytes", "sha256"]) &&
    typeof value.relativePath === "string" &&
    value.relativePath.length > 0 &&
    typeof value.sizeBytes === "number" &&
    Number.isSafeInteger(value.sizeBytes) &&
    value.sizeBytes >= 0 &&
    typeof value.sha256 === "string" &&
    value.sha256.length > 0
  );
}

function storedAttachmentNonResourceSemanticInput(value: JsonValue): JsonValue {
  if (!isPlainObject(value)) throw idempotencyConflict();
  const source = value.source;
  if (!isPlainObject(source) || source.kind !== "stored_file") {
    throw idempotencyConflict();
  }
  const normalizedSource: Record<string, JsonValue> = {};
  for (const key of Object.keys(source).sort()) {
    if (key === "content") continue;
    normalizedSource[key] = canonicalSemanticValue(source[key] as JsonValue);
  }
  const normalized: Record<string, JsonValue> = {};
  for (const key of Object.keys(value).sort()) {
    normalized[key] =
      key === "source"
        ? normalizedSource
        : canonicalSemanticValue(value[key] as JsonValue);
  }
  return normalized;
}

function isExpirableTerminal(result: MutationExecutionResult<object>) {
  return result.outcome !== "unknown" && result.outcome !== "repair_required";
}

function terminalExpired(entry: PluginMutationAuthorityEntry, now: number) {
  const terminalAt = Date.parse(entry.terminalAt);
  return (
    Number.isFinite(terminalAt) && now - terminalAt >= TERMINAL_RETENTION_MS
  );
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

function asAttemptError(
  error: MutationAuthorityExecutionError,
): MutationAttemptError {
  assertWorkflowHostErrorDetails(error.code, error.details);
  return {
    code: error.code,
    phase: error.phase,
    recovery: error.recovery,
    message: error.message,
    details: error.details,
  } as MutationAttemptError;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function isPortableMutationRef(value: unknown) {
  if (!isPlainObject(value) || !hasExactKeys(value, ["libraryId", "key"])) {
    return false;
  }
  const libraryId = value.libraryId;
  const key = value.key;
  return (
    typeof libraryId === "number" &&
    Number.isSafeInteger(libraryId) &&
    libraryId > 0 &&
    typeof key === "string" &&
    key.length > 0 &&
    key.length <= 128
  );
}

function hasSafeMutationEntityRefs(
  value: unknown,
): value is MutationEntityRef[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isPlainObject(entry) &&
        hasExactKeys(entry, ["kind", "ref"]) &&
        (entry.kind === "item" || entry.kind === "collection") &&
        isPortableMutationRef(entry.ref),
    )
  );
}

function isSafeMutationAttemptError(
  error: unknown,
): error is MutationAuthorityExecutionError {
  if (!(error instanceof MutationAuthorityExecutionError)) return false;
  try {
    assertWorkflowHostErrorDetails(error.code, error.details);
    return (
      isPlainObject(error.details) &&
      hasSafeMutationEntityRefs(error.affectedRefs) &&
      hasSafeMutationEntityRefs(error.residualRefs)
    );
  } catch {
    return false;
  }
}

function publicMutationAttemptMessage(message: string) {
  const normalized = Array.from(String(message || ""), (character) => {
    const codePoint = character.codePointAt(0) || 0;
    return codePoint <= 0x1f || codePoint === 0x7f ? " " : character;
  })
    .join("")
    .trim();
  if (
    /(?:\b(?:native|ns_error|moz_storage|sqlite|component returned|errno)\b|0x[0-9a-f]{4,}|(?:[a-z]:[\\/]|file:|\/)[^\s]+)/i.test(
      normalized,
    )
  ) {
    return "Mutation execution failed";
  }
  return normalized.slice(0, 512) || "Mutation execution failed";
}

function attemptFromError<TResult extends object = JsonObject>(
  error: unknown,
  operationId: string,
  operation: WorkflowHostMutationReceiptOperation,
): MutationExecutionResult<TResult> {
  const normalized = isSafeMutationAttemptError(error)
    ? error
    : new MutationAuthorityExecutionError(
        "failed",
        "execution_failed",
        "commit",
        "refresh_and_retry_new_operation",
        {
          phase: "commit",
          recovery: "refresh_and_retry_new_operation",
        },
        "Mutation execution failed",
      );
  const attempt: MutationAttemptReport = {
    schema: "zotero-agents.mutation-attempt.v1",
    attemptId: runtimeConfiguration.randomId(),
    operationId,
    operation,
    status: normalized.status,
    error: {
      ...asAttemptError(normalized),
      message: publicMutationAttemptMessage(normalized.message),
    },
    affectedRefs: normalized.affectedRefs,
    residualRefs: normalized.residualRefs,
  };
  assertAuthorityStrictJsonValue(attempt);
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
  assertAuthorityStrictJsonValue(result);
  return result;
}

type DurableMutationResolution =
  | { state: "missing" }
  | { state: "running"; promise: Promise<MutationExecutionResult<object>> }
  | { state: "settled"; result: MutationExecutionResult<object> }
  | { state: "unavailable" };

function interruptedResult(entry: PluginMutationAuthorityEntry) {
  return attemptFromError(
    new MutationAuthorityExecutionError(
      "unknown",
      "execution_failed",
      "verification",
      "reconcile",
      { phase: "verification", recovery: "reconcile" },
      "Mutation execution was interrupted before terminal evidence was stored",
    ),
    entry.operationId,
    entry.operation as WorkflowHostMutationReceiptOperation,
  );
}

function resolveDurableMutation(args: {
  scope: string;
  operationId: string;
  operation?: WorkflowHostMutationReceiptOperation;
  digest?: string;
}): DurableMutationResolution {
  const entry = getPluginMutationAuthorityEntry(args.scope, args.operationId);
  if (!entry) return { state: "missing" };
  if (args.operation && args.digest) {
    assertEntryBinding({
      entry,
      operation: args.operation,
      digest: args.digest,
    });
  }
  if (entry.state === "identity_only") return { state: "unavailable" };
  if (entry.state === "started") {
    const live = mutationRecords.get(recordKey(args.scope, args.operationId));
    if (live?.state === "running") {
      return { state: "running", promise: live.promise };
    }
    const result = interruptedResult(entry);
    settlePluginMutationAuthorityEntry({
      scope: args.scope,
      operationId: args.operationId,
      result: JSON.stringify(result),
      terminalAt: new Date(runtimeConfiguration.now()).toISOString(),
      lastAccessedAt: new Date(runtimeConfiguration.now()).toISOString(),
    });
    return {
      state: "settled",
      result,
    };
  }
  const result = parseStoredResult(entry);
  if (
    isExpirableTerminal(result) &&
    terminalExpired(entry, runtimeConfiguration.now())
  ) {
    expirePluginMutationAuthorityEntryEvidence({
      scope: args.scope,
      operationId: args.operationId,
      lastAccessedAt: new Date(runtimeConfiguration.now()).toISOString(),
    });
    return { state: "unavailable" };
  }
  return { state: "settled", result };
}

export function getMutationOperation(args: {
  scope: ZoteroHostMutationCallerScope;
  operationId: string;
}): MutationOperationObservation {
  const scope = requireScope(args.scope);
  const operationId = requireOperationId(args.operationId);
  const resolved = resolveDurableMutation({ scope, operationId });
  if (resolved.state === "running") return { state: "running" };
  if (resolved.state === "settled") {
    return { state: "settled", result: resolved.result };
  }
  return { state: "unavailable" };
}

/**
 * Use this before resolving a local path or resource. When the caller already
 * has a canonical content manifest, completeSemanticInput makes this lookup
 * validate the complete durable binding before returning a result.
 */
export async function lookupTrustedStoredAttachmentMutation<
  TResult extends object,
>(args: {
  scope: ZoteroHostMutationCallerScope;
  operationId: string;
  operation: WorkflowHostMutationReceiptOperation;
  nonResourceSemanticInput: JsonValue;
  completeSemanticInput?: JsonValue;
}): Promise<TrustedStoredAttachmentMutationLookup<TResult>> {
  const scope = requireScope(args.scope);
  const operationId = requireOperationId(args.operationId);
  const entry = getPluginMutationAuthorityEntry(scope, operationId);
  if (!entry) return { state: "missing" };
  if (entry.operation !== args.operation) throw idempotencyConflict();

  const storedSemanticInput = parseStoredSemanticInput(entry);
  assertStoredAttachmentContentIdentity(storedSemanticInput);
  const storedNonResource =
    storedAttachmentNonResourceSemanticInput(storedSemanticInput);
  const requestedNonResource = storedAttachmentNonResourceSemanticInput(
    args.nonResourceSemanticInput,
  );
  if (
    canonicalMutationDigest(storedNonResource) !==
    canonicalMutationDigest(requestedNonResource)
  ) {
    throw idempotencyConflict();
  }
  if (args.completeSemanticInput !== undefined) {
    const completeNonResource = storedAttachmentNonResourceSemanticInput(
      args.completeSemanticInput,
    );
    if (
      canonicalMutationDigest(completeNonResource) !==
      canonicalMutationDigest(requestedNonResource)
    ) {
      throw idempotencyConflict();
    }
    assertEntryBinding({
      entry,
      operation: args.operation,
      digest: canonicalMutationDigest(args.completeSemanticInput),
    });
  }

  const resolved = resolveDurableMutation({ scope, operationId });
  if (resolved.state === "running") {
    return {
      state: "settled",
      result: (await resolved.promise) as MutationExecutionResult<TResult>,
    };
  }
  if (resolved.state === "settled") {
    return {
      state: "settled",
      result: resolved.result as MutationExecutionResult<TResult>,
    };
  }
  return {
    state: "tombstone",
    result: outcomeUnavailableResult<TResult>(operationId, args.operation),
  };
}

export async function lookupReservedMutation<TResult extends object>(args: {
  scope: ZoteroHostMutationCallerScope;
  operationId: string;
  operation: WorkflowHostMutationReceiptOperation;
  semanticInput: JsonValue;
}): Promise<MutationReplayLookup<TResult>> {
  const scope = requireScope(args.scope);
  const operationId = requireOperationId(args.operationId);
  const resolved = resolveDurableMutation({
    scope,
    operationId,
    operation: args.operation,
    digest: canonicalMutationDigest(args.semanticInput),
  });
  if (resolved.state === "running") {
    return {
      state: "settled",
      result: (await resolved.promise) as MutationExecutionResult<TResult>,
    };
  }
  if (resolved.state === "settled") {
    return {
      state: "settled",
      result: resolved.result as MutationExecutionResult<TResult>,
    };
  }
  return resolved;
}

function evidencePersistenceUnknown(
  operationId: string,
  operation: WorkflowHostMutationReceiptOperation,
) {
  return attemptFromError(
    new MutationAuthorityExecutionError(
      "unknown",
      "execution_failed",
      "verification",
      "reconcile",
      { phase: "verification", recovery: "reconcile" },
      "Mutation terminal evidence could not be persisted",
    ),
    operationId,
    operation,
  );
}

function confirmedResultUnknown(
  operationId: string,
  operation: WorkflowHostMutationReceiptOperation,
) {
  return attemptFromError(
    new MutationAuthorityExecutionError(
      "unknown",
      "execution_failed",
      "verification",
      "reconcile",
      { phase: "verification", recovery: "reconcile" },
      "Mutation effect completed but its result evidence is invalid",
    ),
    operationId,
    operation,
  );
}

function outcomeUnavailableResult<TResult extends object>(
  operationId: string,
  operation: WorkflowHostMutationReceiptOperation,
): MutationExecutionResult<TResult> {
  return attemptFromError<TResult>(
    new MutationAuthorityExecutionError(
      "failed",
      "unavailable",
      "reservation",
      "none",
      { reason: "outcome_unavailable" },
      "Mutation outcome evidence is no longer available",
    ),
    operationId,
    operation,
  );
}

export async function executeReservedMutation<TResult extends object>(args: {
  scope: ZoteroHostMutationCallerScope;
  operationId: string;
  operation: WorkflowHostMutationReceiptOperation;
  semanticInput: JsonValue;
  control?: MutationExecutionContext;
  preflight?: () => Promise<void>;
  execute: () => Promise<ConfirmedMutation<TResult>>;
}): Promise<MutationExecutionResult<TResult>> {
  const scope = requireScope(args.scope);
  const operationId = requireOperationId(args.operationId);
  const digest = canonicalMutationDigest(args.semanticInput);
  const key = recordKey(scope, operationId);
  const replay = await lookupReservedMutation<TResult>(args);
  if (replay.state === "settled") return replay.result;
  if (replay.state === "unavailable") {
    return outcomeUnavailableResult<TResult>(operationId, args.operation);
  }
  await args.preflight?.();

  const now = runtimeConfiguration.now();
  const admitted = claimPluginMutationAuthorityEntry({
    scope,
    operationId,
    operation: args.operation,
    semanticDigest: digest,
    semanticInput: JSON.stringify(canonicalSemanticValue(args.semanticInput)),
    state: "started",
    result: "",
    createdAt: new Date(now).toISOString(),
    terminalAt: "",
    lastAccessedAt: new Date(now).toISOString(),
  });
  if (!admitted.claimed) {
    assertEntryBinding({
      entry: admitted.entry,
      operation: args.operation,
      digest,
    });
    const winner = await lookupReservedMutation<TResult>(args);
    if (winner.state === "settled") return winner.result;
    return outcomeUnavailableResult<TResult>(operationId, args.operation);
  }

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
    try {
      terminal = confirmedResult(
        operationId,
        args.operation,
        args.semanticInput,
        confirmed,
      ) as MutationExecutionResult<object>;
    } catch {
      terminal = confirmedResultUnknown(operationId, args.operation);
    }
  } catch (error) {
    terminal = attemptFromError(error, operationId, args.operation);
  }

  const terminalAt = runtimeConfiguration.now();
  try {
    settlePluginMutationAuthorityEntry({
      scope,
      operationId,
      result: JSON.stringify(terminal),
      terminalAt: new Date(terminalAt).toISOString(),
      lastAccessedAt: new Date(terminalAt).toISOString(),
    });
  } catch {
    terminal = evidencePersistenceUnknown(operationId, args.operation);
    try {
      settlePluginMutationAuthorityEntry({
        scope,
        operationId,
        result: JSON.stringify(terminal),
        terminalAt: new Date(terminalAt).toISOString(),
        lastAccessedAt: new Date(terminalAt).toISOString(),
        overwriteTerminal: true,
      });
    } catch {
      // The durable started record reconciles to unknown after restart.
    }
  }
  mutationRecords.set(key, {
    state: "terminal",
    digest,
    result: terminal,
    terminalAt,
    lastAccessedAt: terminalAt,
    serializedBytes: JSON.stringify(terminal).length,
    semanticInput: canonicalSemanticValue(args.semanticInput),
  });
  pruneTerminalRecords(terminalAt);
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
  assertAuthorityStrictJsonValue(receipt);
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

export function configureMutationAuthorityRuntimeForTests(
  configuration: Partial<MutationRuntimeConfiguration>,
) {
  runtimeConfiguration = { ...runtimeConfiguration, ...configuration };
}

export function resetMutationAuthorityLiveStateForTests() {
  mutationRecords.clear();
  pinnedMutationReceipts.clear();
}

export function resetMutationAuthorityRuntimeForTests() {
  resetMutationAuthorityLiveStateForTests();
  clearPluginMutationAuthorityEntriesForTests();
  runtimeConfiguration = defaultRuntimeConfiguration();
}
