import { hashSynthesisContractCanonicalJson } from "../../packages/synthesis-contracts/src/index";
import { assertWorkflowHostErrorDetails, assertWorkflowHostStrictJsonValue, } from "../workflows/workflowHostErrorContract";
import { claimPluginMutationAuthorityEntry, clearPluginMutationAuthorityEntriesForTests, expirePluginMutationAuthorityEntryEvidence, getPluginMutationAuthorityEntry, listPluginMutationAuthorityEntries, settlePluginMutationAuthorityEntry, } from "./pluginStateStore";
import { readRuntimeTextFile, removeRuntimePath, runtimePathExists, writeRuntimeTextFile, } from "./runtimePersistence";
import { readSystemE2EEventUrl } from "./systemE2ETestRun";
const TERMINAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const SYSTEM_E2E_CHECKPOINT_TIMEOUT_MS = 120_000;
export class MutationAuthorityAdmissionError extends Error {
    code;
    details;
    constructor(code, details, message) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = "MutationAuthorityAdmissionError";
    }
}
export class MutationAuthorityExecutionError extends Error {
    status;
    code;
    phase;
    recovery;
    details;
    affectedRefs;
    residualRefs;
    constructor(status, code, phase, recovery, details, message, affectedRefs = [], residualRefs = []) {
        super(message);
        this.status = status;
        this.code = code;
        this.phase = phase;
        this.recovery = recovery;
        this.details = details;
        this.affectedRefs = affectedRefs;
        this.residualRefs = residualRefs;
        this.name = "MutationAuthorityExecutionError";
    }
}
const defaultRuntimeConfiguration = () => ({
    now: () => Date.now(),
    randomId: () => {
        const crypto = globalThis
            .crypto;
        return crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
    },
});
let runtimeConfiguration = defaultRuntimeConfiguration();
const mutationRecords = new Map();
const pinnedMutationReceipts = new Map();
function holdSystemE2EAdmissionCheckpoint(operationId) {
    const runtime = globalThis;
    const eventUrl = readSystemE2EEventUrl();
    const dataDir = String(runtime.Zotero?.DataDirectory?.dir || "").trim();
    const join = runtime.PathUtils?.join;
    if (!eventUrl || !dataDir || !join)
        return;
    return (async () => {
        const root = join(dataDir, "system-e2e");
        const armedPath = join(root, "canonical-mutation-admission.armed.json");
        if (!(await runtimePathExists(armedPath)))
            return;
        let armed;
        try {
            armed = JSON.parse(await readRuntimeTextFile(armedPath));
        }
        catch {
            return;
        }
        if (String(armed.operationId || "").trim() !== operationId)
            return;
        await removeRuntimePath(armedPath);
        const heldPath = join(root, "canonical-mutation-admission.held");
        const releasePath = join(root, "canonical-mutation-admission.release");
        await writeRuntimeTextFile(heldPath, operationId);
        const deadline = Date.now() + SYSTEM_E2E_CHECKPOINT_TIMEOUT_MS;
        while (Date.now() < deadline) {
            if (await runtimePathExists(releasePath)) {
                await removeRuntimePath(releasePath);
                await removeRuntimePath(heldPath);
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        throw new Error("system_e2e_mutation_admission_checkpoint_timeout");
    })();
}
function requireScope(scope) {
    const ownerId = String(scope?.ownerId || "").trim();
    if (!ownerId || ownerId.length > 256) {
        throw new MutationAuthorityAdmissionError("invalid_request", { reason: "invalid_value", field: "callerScope" }, "A trusted mutation caller scope is required");
    }
    return ownerId;
}
function requireOperationId(operationId) {
    const normalized = String(operationId || "").trim();
    if (!normalized || normalized.length > 128) {
        throw new MutationAuthorityAdmissionError("invalid_request", { reason: "invalid_value", field: "operationId" }, "operationId must contain between 1 and 128 characters");
    }
    return normalized;
}
function assertAuthorityStrictJsonValue(value) {
    assertWorkflowHostStrictJsonValue(value);
    const visit = (candidate) => {
        if (Array.isArray(candidate)) {
            candidate.forEach(visit);
            return;
        }
        if (candidate && typeof candidate === "object") {
            if (!isPlainObject(candidate)) {
                throw new TypeError("Mutation authority evidence must not contain class instances");
            }
            Object.values(candidate).forEach(visit);
        }
    };
    visit(value);
}
function canonicalDigest(value) {
    assertAuthorityStrictJsonValue(value);
    return hashSynthesisContractCanonicalJson(value);
}
function canonicalSemanticValue(value) {
    if (Array.isArray(value)) {
        return value.map(canonicalSemanticValue);
    }
    if (!value || typeof value !== "object")
        return value;
    const normalized = {};
    for (const key of Object.keys(value).sort()) {
        normalized[key] = canonicalSemanticValue(value[key]);
    }
    return normalized;
}
export function canonicalMutationDigest(value) {
    assertAuthorityStrictJsonValue(value);
    return canonicalDigest(canonicalSemanticValue(value));
}
function recordKey(scope, operationId) {
    return `${scope}\n${operationId}`;
}
function idempotencyConflict() {
    return new MutationAuthorityAdmissionError("conflict", { reason: "idempotency_conflict" }, "operationId is already bound to different semantic input");
}
function assertEntryBinding(args) {
    if (args.entry.operation !== args.operation ||
        args.entry.semanticDigest !== args.digest) {
        throw idempotencyConflict();
    }
}
function parseStoredResult(entry) {
    if (!entry.result) {
        throw new Error("plugin_mutation_authority_terminal_evidence_missing");
    }
    const result = JSON.parse(entry.result);
    assertAuthorityStrictJsonValue(result);
    return result;
}
function parseStoredSemanticInput(entry) {
    let semanticInput;
    try {
        semanticInput = JSON.parse(entry.semanticInput);
    }
    catch {
        throw new Error("plugin_mutation_authority_semantic_input_invalid");
    }
    assertAuthorityStrictJsonValue(semanticInput);
    return semanticInput;
}
function assertStoredAttachmentContentIdentity(semanticInput) {
    if (!isPlainObject(semanticInput))
        throw idempotencyConflict();
    const source = semanticInput.source;
    if (!isPlainObject(source) || source.kind !== "stored_file") {
        throw idempotencyConflict();
    }
    const content = source.content;
    if (!isPlainObject(content))
        throw idempotencyConflict();
    if (content.schema !== "zotero-agents.attachment-content.v1" ||
        typeof content.identity !== "string" ||
        !content.identity ||
        !isStoredAttachmentContentEntry(content.main) ||
        !Array.isArray(content.companions) ||
        !content.companions.every(isStoredAttachmentContentEntry)) {
        throw idempotencyConflict();
    }
}
function isStoredAttachmentContentEntry(value) {
    return (isPlainObject(value) &&
        hasExactKeys(value, ["relativePath", "sizeBytes", "sha256"]) &&
        typeof value.relativePath === "string" &&
        value.relativePath.length > 0 &&
        typeof value.sizeBytes === "number" &&
        Number.isSafeInteger(value.sizeBytes) &&
        value.sizeBytes >= 0 &&
        typeof value.sha256 === "string" &&
        value.sha256.length > 0);
}
function storedAttachmentNonResourceSemanticInput(value) {
    if (!isPlainObject(value))
        throw idempotencyConflict();
    const source = value.source;
    if (!isPlainObject(source) || source.kind !== "stored_file") {
        throw idempotencyConflict();
    }
    const normalizedSource = {};
    for (const key of Object.keys(source).sort()) {
        if (key === "content")
            continue;
        normalizedSource[key] = canonicalSemanticValue(source[key]);
    }
    const normalized = {};
    for (const key of Object.keys(value).sort()) {
        normalized[key] =
            key === "source"
                ? normalizedSource
                : canonicalSemanticValue(value[key]);
    }
    return normalized;
}
function isExpirableTerminal(result) {
    return result.outcome !== "unknown" && result.outcome !== "repair_required";
}
function terminalExpired(entry, now) {
    const terminalAt = Date.parse(entry.terminalAt);
    return (Number.isFinite(terminalAt) && now - terminalAt >= TERMINAL_RETENTION_MS);
}
function terminalRecords() {
    return Array.from(mutationRecords.entries()).filter((entry) => entry[1].state === "terminal");
}
function pruneTerminalRecords(now) {
    for (const [key, record] of terminalRecords()) {
        const receiptId = record.result.outcome === "committed" ||
            record.result.outcome === "unchanged"
            ? record.result.receipt.receiptId
            : "";
        if (now - record.terminalAt >= TERMINAL_RETENTION_MS &&
            !pinnedMutationReceipts.has(receiptId)) {
            mutationRecords.delete(key);
        }
    }
}
function asAttemptError(error) {
    assertWorkflowHostErrorDetails(error.code, error.details);
    return {
        code: error.code,
        phase: error.phase,
        recovery: error.recovery,
        message: error.message,
        details: error.details,
    };
}
function isPlainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function hasExactKeys(value, keys) {
    return (Object.keys(value).length === keys.length &&
        keys.every((key) => Object.prototype.hasOwnProperty.call(value, key)));
}
function isPortableMutationRef(value) {
    if (!isPlainObject(value) || !hasExactKeys(value, ["libraryId", "key"])) {
        return false;
    }
    const libraryId = value.libraryId;
    const key = value.key;
    return (typeof libraryId === "number" &&
        Number.isSafeInteger(libraryId) &&
        libraryId > 0 &&
        typeof key === "string" &&
        key.length > 0 &&
        key.length <= 128);
}
function hasSafeMutationEntityRefs(value) {
    return (Array.isArray(value) &&
        value.every((entry) => isPlainObject(entry) &&
            hasExactKeys(entry, ["kind", "ref"]) &&
            (entry.kind === "item" || entry.kind === "collection") &&
            isPortableMutationRef(entry.ref)));
}
function isSafeMutationAttemptError(error) {
    if (!(error instanceof MutationAuthorityExecutionError))
        return false;
    try {
        assertWorkflowHostErrorDetails(error.code, error.details);
        return (isPlainObject(error.details) &&
            hasSafeMutationEntityRefs(error.affectedRefs) &&
            hasSafeMutationEntityRefs(error.residualRefs));
    }
    catch {
        return false;
    }
}
function publicMutationAttemptMessage(message) {
    const normalized = Array.from(String(message || ""), (character) => {
        const codePoint = character.codePointAt(0) || 0;
        return codePoint <= 0x1f || codePoint === 0x7f ? " " : character;
    })
        .join("")
        .trim();
    if (/(?:\b(?:native|ns_error|moz_storage|sqlite|component returned|errno)\b|0x[0-9a-f]{4,}|(?:[a-z]:[\\/]|file:|\/)[^\s]+)/i.test(normalized)) {
        return "Mutation execution failed";
    }
    return normalized.slice(0, 512) || "Mutation execution failed";
}
function attemptFromError(error, operationId, operation) {
    const normalized = isSafeMutationAttemptError(error)
        ? error
        : new MutationAuthorityExecutionError("failed", "execution_failed", "commit", "refresh_and_retry_new_operation", {
            phase: "commit",
            recovery: "refresh_and_retry_new_operation",
        }, "Mutation execution failed");
    const attempt = {
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
function confirmedResult(operationId, operation, semanticInput, confirmed) {
    const committedAt = new Date(runtimeConfiguration.now()).toISOString();
    const effectDigest = canonicalDigest({
        operation,
        semanticInput: canonicalSemanticValue(semanticInput),
        outcome: confirmed.outcome,
        changes: confirmed.changes,
    });
    const receipt = {
        schema: "zotero-agents.mutation-receipt.v1",
        receiptId: runtimeConfiguration.randomId(),
        operationId,
        operation,
        outcome: confirmed.outcome,
        committedAt,
        effectDigest,
        changes: confirmed.changes,
    };
    const result = {
        outcome: confirmed.outcome,
        receipt,
        result: confirmed.result,
    };
    assertAuthorityStrictJsonValue(result);
    return result;
}
function interruptedResult(entry) {
    return attemptFromError(new MutationAuthorityExecutionError("unknown", "execution_failed", "verification", "reconcile", { phase: "verification", recovery: "reconcile" }, "Mutation execution was interrupted before terminal evidence was stored"), entry.operationId, entry.operation);
}
function resolveDurableMutation(args) {
    const entry = getPluginMutationAuthorityEntry(args.scope, args.operationId);
    if (!entry)
        return { state: "missing" };
    if (args.operation && args.digest) {
        assertEntryBinding({
            entry,
            operation: args.operation,
            digest: args.digest,
        });
    }
    if (entry.state === "identity_only")
        return { state: "unavailable" };
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
    if (isExpirableTerminal(result) &&
        terminalExpired(entry, runtimeConfiguration.now())) {
        expirePluginMutationAuthorityEntryEvidence({
            scope: args.scope,
            operationId: args.operationId,
            lastAccessedAt: new Date(runtimeConfiguration.now()).toISOString(),
        });
        return { state: "unavailable" };
    }
    return { state: "settled", result };
}
export function getMutationOperation(args) {
    const scope = requireScope(args.scope);
    const operationId = requireOperationId(args.operationId);
    const resolved = resolveDurableMutation({ scope, operationId });
    if (resolved.state === "running")
        return { state: "running" };
    if (resolved.state === "settled") {
        return { state: "settled", result: resolved.result };
    }
    return { state: "unavailable" };
}
export function listMutationOperations(args) {
    const scope = requireScope(args.scope);
    return listPluginMutationAuthorityEntries(scope);
}
/**
 * Use this before resolving a local path or resource. When the caller already
 * has a canonical content manifest, completeSemanticInput makes this lookup
 * validate the complete durable binding before returning a result.
 */
export async function lookupTrustedStoredAttachmentMutation(args) {
    const scope = requireScope(args.scope);
    const operationId = requireOperationId(args.operationId);
    const entry = getPluginMutationAuthorityEntry(scope, operationId);
    if (!entry)
        return { state: "missing" };
    if (entry.operation !== args.operation)
        throw idempotencyConflict();
    const storedSemanticInput = parseStoredSemanticInput(entry);
    assertStoredAttachmentContentIdentity(storedSemanticInput);
    const storedNonResource = storedAttachmentNonResourceSemanticInput(storedSemanticInput);
    const requestedNonResource = storedAttachmentNonResourceSemanticInput(args.nonResourceSemanticInput);
    if (canonicalMutationDigest(storedNonResource) !==
        canonicalMutationDigest(requestedNonResource)) {
        throw idempotencyConflict();
    }
    if (args.completeSemanticInput !== undefined) {
        const completeNonResource = storedAttachmentNonResourceSemanticInput(args.completeSemanticInput);
        if (canonicalMutationDigest(completeNonResource) !==
            canonicalMutationDigest(requestedNonResource)) {
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
            result: (await resolved.promise),
        };
    }
    if (resolved.state === "settled") {
        return {
            state: "settled",
            result: resolved.result,
        };
    }
    return {
        state: "tombstone",
        result: outcomeUnavailableResult(operationId, args.operation),
    };
}
export async function lookupReservedMutation(args) {
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
            result: (await resolved.promise),
        };
    }
    if (resolved.state === "settled") {
        return {
            state: "settled",
            result: resolved.result,
        };
    }
    return resolved;
}
function evidencePersistenceUnknown(operationId, operation) {
    return attemptFromError(new MutationAuthorityExecutionError("unknown", "execution_failed", "verification", "reconcile", { phase: "verification", recovery: "reconcile" }, "Mutation terminal evidence could not be persisted"), operationId, operation);
}
function confirmedResultUnknown(operationId, operation) {
    return attemptFromError(new MutationAuthorityExecutionError("unknown", "execution_failed", "verification", "reconcile", { phase: "verification", recovery: "reconcile" }, "Mutation effect completed but its result evidence is invalid"), operationId, operation);
}
function outcomeUnavailableResult(operationId, operation) {
    return attemptFromError(new MutationAuthorityExecutionError("failed", "unavailable", "reservation", "none", { reason: "outcome_unavailable" }, "Mutation outcome evidence is no longer available"), operationId, operation);
}
export async function executeReservedMutation(args) {
    const scope = requireScope(args.scope);
    const operationId = requireOperationId(args.operationId);
    const digest = canonicalMutationDigest(args.semanticInput);
    const key = recordKey(scope, operationId);
    const replay = await lookupReservedMutation(args);
    if (replay.state === "settled")
        return replay.result;
    if (replay.state === "unavailable") {
        return outcomeUnavailableResult(operationId, args.operation);
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
        const winner = await lookupReservedMutation(args);
        if (winner.state === "settled")
            return winner.result;
        return outcomeUnavailableResult(operationId, args.operation);
    }
    let resolveResult;
    const promise = new Promise((resolve) => {
        resolveResult = resolve;
    });
    mutationRecords.set(key, {
        state: "running",
        digest,
        promise,
        createdAt: now,
    });
    let terminal;
    try {
        const checkpoint = runtimeConfiguration.admissionCheckpoint;
        if (checkpoint?.operationId === operationId) {
            runtimeConfiguration.admissionCheckpoint = undefined;
            await checkpoint.wait();
        }
        const systemE2ECheckpoint = holdSystemE2EAdmissionCheckpoint(operationId);
        if (systemE2ECheckpoint)
            await systemE2ECheckpoint;
        if (args.control?.signal?.aborted) {
            throw new MutationAuthorityExecutionError("canceled", "canceled", "reservation", "none", { reason: "caller_signal" }, "Mutation canceled before its first write");
        }
        const confirmed = await args.execute();
        if (args.control?.signal?.aborted) {
            throw new MutationAuthorityExecutionError("unknown", "canceled", "verification", "reconcile", { reason: "caller_signal" }, "Mutation completion raced with cancellation", confirmed.changes.map((change) => change.entity));
        }
        try {
            terminal = confirmedResult(operationId, args.operation, args.semanticInput, confirmed);
        }
        catch {
            terminal = confirmedResultUnknown(operationId, args.operation);
        }
    }
    catch (error) {
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
    }
    catch {
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
        }
        catch {
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
    return terminal;
}
export function pinVerifiedMutationReceipt(receipt) {
    assertAuthorityStrictJsonValue(receipt);
    for (const [, record] of terminalRecords()) {
        if (record.result.outcome !== "committed" &&
            record.result.outcome !== "unchanged") {
            continue;
        }
        const stored = record.result.receipt;
        if (stored.receiptId !== receipt.receiptId ||
            canonicalDigest(stored) !==
                canonicalDigest(receipt)) {
            continue;
        }
        pinnedMutationReceipts.set(stored.receiptId, (pinnedMutationReceipts.get(stored.receiptId) || 0) + 1);
        let released = false;
        return {
            receipt: stored,
            semanticInput: record.semanticInput,
            release() {
                if (released)
                    return;
                released = true;
                const count = pinnedMutationReceipts.get(stored.receiptId) || 0;
                if (count <= 1)
                    pinnedMutationReceipts.delete(stored.receiptId);
                else
                    pinnedMutationReceipts.set(stored.receiptId, count - 1);
            },
        };
    }
    return null;
}
export function configureMutationAuthorityRuntimeForTests(configuration) {
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
