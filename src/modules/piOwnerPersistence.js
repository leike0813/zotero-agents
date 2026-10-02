import { getRuntimePersistencePaths, listRuntimeChildDirectories, listRuntimeChildrenStrict, listRuntimeChildren, removeRuntimePath, runtimePathExists, statRuntimePath, statRuntimePathStrict, } from "./runtimePersistence";
import { deletePiConversationMetadata, deletePiOwnerRegistry, getPiConversationCleanupReceipt, getPiSkillRunCleanupReceipt, getPiConversationMetadata, getPiConversationReadFacts, getPiOwnerRegistry, insertPiConversationMetadata, listPiConversations, listPiOwnerRegistry, listPiSkillRunRegistry, updatePiConversationProjection, upsertPiConversationCleanupReceipt, upsertPiSkillRunCleanupReceipt, upsertPiOwnerRegistry, writePiConversationMetadata, } from "./pluginStateStore";
import { appendPiTranscriptBatch, appendPiTranscript, createPiTranscript, inspectPiTranscript, piOwnerPaths, readPiTranscriptPage, readPiVisibleTranscriptPage, rebuildPiIndex, repairPiTornTail, validatePiEntryInput, withPiOwnerWrite, } from "./piTranscriptStore";
import { PI_TRANSCRIPT_NON_CONTEXT_KINDS, } from "./piTurnPreparation";
import { record as recordPiRuntimeAudit } from "./piRuntimeAudit";
import { joinPath } from "../utils/path";
export { getPiConversationCleanupReceipt, getPiSkillRunCleanupReceipt, getPiConversationMetadata, getPiConversationReadFacts, getPiConversationReadFacts as getPiConversationProjection, listPiConversations, listPiSkillRunRegistry, readPiVisibleTranscriptPage as readPiConversationPage, };
function record(ref, inspection, projection) {
    const common = {
        entryCount: inspection.entries.length,
        lastSequence: inspection.entries.length,
        updatedAt: inspection.entries.at(-1)?.createdAt || inspection.header.createdAt,
        projection,
    };
    return ref.kind === "conversation"
        ? { kind: "conversation", conversationId: ref.ownerId, ...common }
        : { kind: "skill_run", skillRunId: ref.ownerId, ...common };
}
const PI_SKILL_RUN_SCALAR_MAX = 32;
// Bounded, rebuildable Skill Run list facts folded from the canonical log. The
// status vocabulary stays owned by the Pi Skill Run owner; this only stores a
// bounded opaque scalar, never a transcript payload.
function piSkillRunScalarsFor(inspection) {
    const admission = inspection.entries.find((entry) => entry.kind === "skill_run_admitted")?.payload;
    if (!admission)
        return undefined;
    const counts = { user: 0, assistant: 0, tool: 0, thought: 0 };
    let status = "queued";
    let archived = false;
    const boundedStatus = (value) => {
        if (typeof value !== "string")
            return null;
        const next = value.trim();
        return next && next.length <= PI_SKILL_RUN_SCALAR_MAX ? next : null;
    };
    for (const entry of inspection.entries) {
        const payload = (entry.payload ?? {});
        if (entry.kind === "skill_run_status") {
            status = boundedStatus(payload.status) ?? status;
        }
        else if (entry.kind === "skill_run_outcome") {
            const result = payload.result;
            status = boundedStatus(result?.status) ?? status;
        }
        else if (entry.kind === "skill_run_archive") {
            archived = true;
        }
        else if (entry.kind === "message") {
            if (payload.role === "user")
                counts.user += 1;
            else if (payload.role === "assistant")
                counts.assistant += 1;
        }
        else if (entry.kind === "tool_result") {
            counts.tool += 1;
        }
        else if (entry.kind === "thought") {
            counts.thought += 1;
        }
    }
    return {
        taskName: String(admission.taskName ?? ""),
        skillId: String(admission.skillId ?? ""),
        status,
        archived,
        counts,
    };
}
const RESERVATION_TEXT_MAX = 256;
const RESERVATION_IDENTITY_MAX = 64;
function reservationText(value) {
    if (typeof value !== "string")
        return null;
    const text = value.trim();
    return text && text.length <= RESERVATION_TEXT_MAX ? text : null;
}
function reservationPositive(value) {
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0
        ? value
        : null;
}
/**
 * The committed Workflow reservation, projected into bounded scalars. This is
 * the accounting input for slot restoration, so it is read and rebuilt from the
 * canonical fact rather than reconstructed at startup from live queue state.
 */
function piSkillRunReservationFor(inspection) {
    const entry = inspection.entries.find((item) => item.kind === "skill_run_reservation");
    if (!entry)
        return undefined;
    const payload = entry.payload;
    const submissionId = reservationText(payload.submissionId);
    const submissionUnitId = reservationText(payload.submissionUnitId);
    const workflowId = reservationText(payload.workflowId);
    const unitId = reservationText(payload.unitId);
    const state = reservationText(payload.state);
    const backendId = reservationText(payload.backendId);
    const maxConcurrency = reservationPositive(payload.maxConcurrency);
    const unitCount = reservationPositive(payload.unitCount);
    const unitOrder = typeof payload.unitOrder === "number" &&
        Number.isSafeInteger(payload.unitOrder) &&
        payload.unitOrder >= 0
        ? payload.unitOrder
        : null;
    const members = Array.isArray(payload.memberIdentities)
        ? payload.memberIdentities
            .map((identity) => reservationText(identity))
            .filter((identity) => Boolean(identity))
        : null;
    // A reservation is only projected when it is complete enough to restore a
    // slot; a partial tuple would make accounting look available when it is not.
    if (!submissionId ||
        !submissionUnitId ||
        !workflowId ||
        !unitId ||
        !state ||
        !backendId ||
        !maxConcurrency ||
        !unitCount ||
        unitOrder === null ||
        !members)
        return undefined;
    const ownerId = reservationText(payload.ownerId);
    return {
        submissionId,
        submissionUnitId,
        workflowId,
        workflowLabel: reservationText(payload.workflowLabel) ?? "",
        backendId,
        unitId,
        unitOrder,
        taskName: reservationText(payload.taskName) ?? "",
        memberIdentities: members.slice(0, 64),
        unitCount,
        maxConcurrency,
        state,
        ...(ownerId ? { ownerId } : {}),
    };
}
/**
 * The reservation an owner still holds, read from the registry projection. A
 * corrupt transcript keeps its last projected reservation, so one damaged
 * owner is isolated instead of failing global accounting.
 */
export function getPiSkillRunReservation(requestId) {
    return getPiOwnerRegistry("skill_run", requestId)?.reservation ?? null;
}
/**
 * Managed residue that survives a crash. A restart cannot prove an orphan
 * process has exited, so actual files on disk are the evidence a hold is
 * rebuilt from when the canonical fact was lost.
 */
async function piOwnerStagingResidue(ref, root) {
    const staging = joinPath(piOwnerPaths(ref, root).dir, "staging");
    if (!(await statRuntimePath(staging)).exists)
        return false;
    const children = await listRuntimeChildren(staging).catch(() => []);
    return children.length > 0;
}
async function project(ref, inspection, root) {
    try {
        await rebuildPiIndex(ref, inspection, root);
        const updatedAt = inspection.entries.at(-1)?.createdAt || inspection.header.createdAt;
        const skillRun = ref.kind === "skill_run" ? piSkillRunScalarsFor(inspection) : undefined;
        const reservation = ref.kind === "skill_run"
            ? piSkillRunReservationFor(inspection)
            : undefined;
        upsertPiOwnerRegistry({
            ownerKind: ref.kind,
            ownerId: ref.ownerId,
            entryCount: inspection.entries.length,
            lastSequence: inspection.entries.length,
            updatedAt,
            ...(skillRun ? { skillRun } : {}),
            ...(reservation ? { reservation } : {}),
        });
        if (ref.kind === "conversation") {
            insertPiConversationMetadata({
                conversationId: ref.ownerId,
                createdAt: inspection.header.createdAt,
            });
            updatePiConversationProjection(ref.ownerId, piConversationProjectionFor(inspection));
        }
        return "ready";
    }
    catch {
        return "pending";
    }
}
export async function createPiOwner(ref, root) {
    return withPiOwnerWrite(ref, root, async () => {
        const inspection = await createPiTranscript(ref, root);
        return record(ref, inspection, await project(ref, inspection, root));
    });
}
export async function appendPiOwnerEntry(ref, input, root) {
    return withPiOwnerWrite(ref, root, async () => {
        const { entry, inspection } = await appendPiTranscript(ref, input, root);
        return {
            sequence: entry.seq,
            projection: await project(ref, inspection, root),
        };
    });
}
export function inspectPiOwner(ref, root) {
    return inspectPiTranscript(ref, root);
}
/**
 * A refused transcript is an integrity failure of the owner's own canonical
 * store. It is recorded here, by the module that owns the store, and only ever
 * as a structural status: no entry content, path or repair detail leaves this
 * boundary.
 */
function recordPiIntegrityFailure(ref, root, status) {
    recordPiRuntimeAudit({
        operation: "persistence.integrity_failure",
        origin: "persistence",
        owner: { ...ref },
        ...(root ? { root } : {}),
        attributes: {
            status: status === "torn_tail" ? "state_unknown" : "recovery_required",
            reason: "transcript_not_valid",
        },
    });
}
export function readPiOwnerPage(ref, options = {}, root) {
    return readPiTranscriptPage(ref, options, root);
}
export async function rebuildPiOwnerProjections(ref, root) {
    return withPiOwnerWrite(ref, root, async () => {
        const inspection = await inspectPiTranscript(ref, root);
        if (inspection.status !== "valid") {
            recordPiIntegrityFailure(ref, root, inspection.status);
            throw new Error(`pi_transcript_${inspection.status}`);
        }
        const projection = await project(ref, inspection, root);
        if (projection !== "ready")
            throw new Error("pi_projection_rebuild_failed");
        return record(ref, inspection, projection);
    });
}
export async function repairPiOwnerTornTail(ref, root) {
    return withPiOwnerWrite(ref, root, async () => {
        const inspection = await repairPiTornTail(ref, root);
        if (inspection.status !== "valid") {
            recordPiIntegrityFailure(ref, root, inspection.status);
            throw new Error(`pi_transcript_${inspection.status}`);
        }
        const projected = await record(ref, inspection, await project(ref, inspection, root));
        // The repair terminal is evidence of a completed repair, so it is recorded
        // only after the transcript is valid again and the projection committed.
        recordPiRuntimeAudit({
            operation: "persistence.repair_terminal",
            origin: "persistence",
            owner: { ...ref },
            ...(root ? { root } : {}),
            attributes: {
                status: "valid",
                reason: "torn_tail_repaired",
                bytes: inspection.validBytes,
            },
        });
        return projected;
    });
}
export async function rebuildAllPiOwnerProjections(root) {
    const ownersDir = getRuntimePersistencePaths(root).piOwnersDir;
    const results = [];
    for (const kind of ["conversation", "skill_run"]) {
        for (const dir of await listRuntimeChildDirectories(joinPath(ownersDir, kind))) {
            const ownerId = dir
                .replace(/[\\/]+$/, "")
                .split(/[\\/]/)
                .at(-1) || "";
            const ref = { kind, ownerId };
            try {
                results.push({
                    ref,
                    record: await rebuildPiOwnerProjections(ref, root),
                });
            }
            catch (error) {
                results.push({ ref, issue: String(error) });
            }
        }
    }
    return results;
}
/* ------------------------------------------------------------------------
 * C19 recovery inventory, budget checkpoints and hold-safe deletion.
 * Physical process occupancy is never inferred here: it is supplied by the
 * process lifecycle through a parameter callback, and every static hold is
 * read from canonical owner facts.
 * --------------------------------------------------------------------- */
const PI_OWNER_KINDS = ["conversation", "skill_run"];
const INVENTORY_YIELD_OWNERS = 100;
const INVENTORY_YIELD_INTERVAL_MS = 50;
const SKILL_RUN_RETENTION_DAYS = 30;
const SKILL_RUN_RETENTION_MS = SKILL_RUN_RETENTION_DAYS * 86_400_000;
const SKILL_RUN_TERMINAL_STATUSES = new Set([
    "succeeded",
    "failed",
    "canceled",
]);
// Certainties that actually prove what happened. `unknown`, `not_started` and
// `not_applicable` are statements of absence of proof, not of absence of
// effect, so they never clear a hold.
const PI_GATEWAY_PROVEN_CERTAINTIES = new Set([
    "confirmed_none",
    "confirmed_complete",
    "confirmed_partial",
]);
function yieldToRuntime() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}
/** An occupancy probe may be synchronous; an unprovable answer is a hold. */
async function piOwnerOccupied(probe, ref) {
    if (!probe)
        return false;
    return (await Promise.resolve(probe(ref)).catch(() => true)) === true;
}
/**
 * Canonical owner inventory is the union of the strict directory listing and
 * both registry identities: a committed directory without its rebuildable
 * projection is still an owner, and a projection without its directory is
 * still an owner that needs reconstruction. A failed read is not an empty
 * inventory, so it throws and startup fails closed.
 */
export async function listPiOwnerInventory(root) {
    const ownersDir = getRuntimePersistencePaths(root).piOwnersDir;
    const found = new Map();
    // The yield budget is spent on the real IO, so a large owner set cannot
    // block the startup path.
    let sinceYield = 0;
    let lastYield = Date.now();
    const breathe = async () => {
        sinceYield += 1;
        if (sinceYield < INVENTORY_YIELD_OWNERS &&
            Date.now() - lastYield < INVENTORY_YIELD_INTERVAL_MS)
            return;
        sinceYield = 0;
        lastYield = Date.now();
        await yieldToRuntime();
    };
    for (const kind of PI_OWNER_KINDS) {
        const kindDir = joinPath(ownersDir, kind);
        // A kind that was never written is not an accounting failure; a kind
        // directory that exists but cannot be listed is. Absence is probed
        // leniently because a strict stat also rejects a missing path, while the
        // listing itself is strict so a real read error fails closed.
        if (!(await statRuntimePath(kindDir)).exists)
            continue;
        let children;
        try {
            children = await listRuntimeChildrenStrict(kindDir);
        }
        catch {
            throw new Error("pi_owner_inventory_unreadable");
        }
        for (const child of children) {
            await breathe();
            if (!(await statRuntimePathStrict(child)).isDir)
                continue;
            const ownerId = child
                .replace(/[\\/]+$/, "")
                .split(/[\\/]/)
                .at(-1) || "";
            if (!ownerId)
                continue;
            found.set(`${kind}\n${ownerId}`, { kind, ownerId });
        }
    }
    for (const kind of PI_OWNER_KINDS) {
        for (const row of listPiOwnerRegistry(kind)) {
            await breathe();
            found.set(`${row.ownerKind}\n${row.ownerId}`, {
                kind: row.ownerKind,
                ownerId: row.ownerId,
            });
        }
    }
    const refs = [...found.values()].sort((left, right) => left.kind.localeCompare(right.kind) ||
        left.ownerId.localeCompare(right.ownerId));
    return refs;
}
function normalizeCheckpoint(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return null;
    const source = value;
    const turnId = source.turnId;
    if (Number(source.version) !== 1 ||
        typeof turnId !== "string" ||
        !turnId ||
        [source.budgetMs, source.activeMs, source.remainingMs].some((item) => typeof item !== "number" || !Number.isFinite(item) || item < 0) ||
        typeof source.resumeEligible !== "boolean")
        return null;
    return {
        version: 1,
        turnId,
        budgetMs: Number(source.budgetMs),
        activeMs: Number(source.activeMs),
        remainingMs: Number(source.remainingMs),
        resumeEligible: source.resumeEligible,
    };
}
function readPiOwnerCheckpoint(entries) {
    let latest;
    for (const entry of entries) {
        if (entry.kind !== "execution_checkpoint")
            continue;
        const checkpoint = normalizeCheckpoint(entry.payload);
        if (checkpoint)
            latest = checkpoint;
    }
    return latest;
}
export async function recordPiExecutionCheckpoint(ref, value, root) {
    const checkpoint = normalizeCheckpoint(value);
    if (!checkpoint)
        throw new Error("pi_execution_checkpoint_invalid");
    await appendPiOwnerFact(ref, {
        kind: "execution_checkpoint",
        payload: checkpoint,
        turnId: checkpoint.turnId,
    }, root);
    return checkpoint;
}
/**
 * Canonical writer for late tool evidence. It stores identity, physical state
 * and the executor's own certainty, and nothing else: an outcome body could
 * carry paths or library payloads that have no place in an owner transcript.
 */
export async function recordPiToolPhysicalEvidence(ref, evidence, root) {
    if (typeof evidence?.turnId !== "string" || !evidence.turnId)
        throw new Error("pi_physical_evidence_invalid");
    if (typeof evidence.callId !== "string" || !evidence.callId)
        throw new Error("pi_physical_evidence_invalid");
    if (evidence.state !== "settled" && evidence.state !== "unknown")
        throw new Error("pi_physical_evidence_invalid");
    await appendPiOwnerFact(ref, {
        kind: "tool_call_physical_evidence",
        payload: {
            owner: { ...ref },
            turnId: evidence.turnId,
            callId: evidence.callId,
            capabilityId: String(evidence.capabilityId ?? ""),
            state: evidence.state,
            ...(evidence.outcome
                ? {
                    outcome: String(evidence.outcome.status ?? ""),
                    effectCertainty: String(evidence.outcome.effectCertainty ?? "unknown"),
                }
                : {}),
            ...(evidence.domainOperation
                ? {
                    domainOperation: {
                        scope: { ownerId: evidence.domainOperation.scope.ownerId },
                        operationId: evidence.domainOperation.operationId,
                    },
                }
                : {}),
            observedAt: new Date().toISOString(),
        },
        turnId: evidence.turnId,
        entryId: `physical-evidence-${evidence.turnId}-${evidence.callId}`,
    }, root);
}
function piOwnerHasDispatchedWork(entries) {
    return entries.some((entry) => ["model_invocation_started", "tool_call_started", "turn_started"].includes(entry.kind));
}
function piOwnerTerminalStatus(entries) {
    let status = null;
    for (const entry of entries) {
        const payload = entry.payload;
        if (entry.kind === "skill_run_status" &&
            typeof payload?.status === "string")
            status = payload.status;
        else if (entry.kind === "skill_run_outcome") {
            const result = payload?.result?.status;
            if (typeof result === "string")
                status = result;
        }
        else if (entry.kind === "turn_terminal") {
            const value = payload?.status;
            if (typeof value === "string")
                status = value;
        }
    }
    return status;
}
/** The last turn the owner committed work in, or null when it never started one. */
function piOwnerLatestTurnId(entries) {
    let turnId = null;
    for (const entry of entries) {
        if (entry.kind !== "turn_started")
            continue;
        const payload = entry.payload;
        if (typeof payload?.turnId === "string")
            turnId = payload.turnId;
    }
    return turnId;
}
/**
 * Unresolved work is derived from canonical started facts that have no
 * matching terminal fact. A missing domain operation binding is still an
 * unresolved operation; the scope falls back to the owner itself because the
 * owner identity is the only thing persistence can prove.
 */
function piUnresolvedOperations(ref, entries) {
    // An invocation is identified by its turn and its ID together. A callId is
    // only unique inside one turn, so keying on the bare ID would let a reused
    // call in a later turn settle an older unresolved invocation.
    const invocationKey = (turnId, id) => typeof id === "string" && id ? `${String(turnId ?? "")}\n${id}` : null;
    const entryTurnId = (entry) => {
        const payload = entry.payload;
        return typeof payload?.turnId === "string" ? payload.turnId : entry.turnId;
    };
    const settledModels = new Set(entries
        .filter((entry) => entry.kind === "model_invocation_terminal" ||
        // A physical settlement settles the invocation only when the process
        // outcome is itself proven; an unproven one leaves the hold.
        (entry.kind === "model_invocation_settled" &&
            entry.payload
                ?.physicalOutcome === "settled"))
        .map((entry) => invocationKey(entryTurnId(entry), entry.payload?.invocationId))
        .filter((value) => value !== null));
    const settledCalls = new Set(entries
        .filter((entry) => entry.kind === "tool_call_receipt")
        .map((entry) => invocationKey(entryTurnId(entry), entry.payload?.callId))
        .filter((value) => value !== null));
    const unknownEffectCalls = new Set(entries
        .filter((entry) => entry.kind === "tool_call_receipt" &&
        entry.payload
            ?.effectCertainty === "unknown")
        .map((entry) => invocationKey(entryTurnId(entry), entry.payload?.callId))
        .filter((value) => value !== null));
    // Late executor evidence settles a call only when the process ended AND the
    // executor stated a proven certainty. A bare physical state, or an outcome
    // that is still unknown, leaves the hold exactly where it was.
    const physicallySettledCalls = new Set(entries
        .filter((entry) => {
        if (entry.kind !== "tool_call_physical_evidence")
            return false;
        const payload = entry.payload;
        // The canonical writer stores the certainty flat; the gateway's own
        // late-evidence object nests it under the outcome, and both are read.
        const certainty = typeof payload?.effectCertainty === "string"
            ? payload.effectCertainty
            : (payload?.outcome?.effectCertainty ?? null);
        return (payload?.state === "settled" &&
            typeof certainty === "string" &&
            PI_GATEWAY_PROVEN_CERTAINTIES.has(certainty));
    })
        .map((entry) => invocationKey(entryTurnId(entry), entry.payload?.callId))
        .filter((value) => value !== null));
    // Authoritative late evidence settles the operation it names, but only when
    // it actually proves an outcome. Evidence recorded as unknown leaves the
    // hold exactly where it was, without rewriting the original started fact or
    // its unknown receipt.
    const observedOperations = new Set(entries
        .filter((entry) => {
        if (entry.kind !== "operation_evidence_observed")
            return false;
        const certainty = entry.payload?.effectCertainty;
        return (typeof certainty === "string" &&
            PI_GATEWAY_PROVEN_CERTAINTIES.has(certainty));
    })
        .map((entry) => entry.payload?.operationId)
        .filter((value) => typeof value === "string"));
    const unresolved = [];
    const seen = new Set();
    for (const entry of entries) {
        if (entry.kind !== "model_invocation_started")
            continue;
        const payload = entry.payload;
        const invocationId = payload?.invocationId;
        const startedTurnId = typeof payload?.turnId === "string"
            ? payload.turnId
            : (entry.turnId ?? "");
        const modelKey = invocationKey(startedTurnId, invocationId);
        if (modelKey && settledModels.has(modelKey))
            continue;
        if (typeof payload?.domainOperation?.operationId === "string" &&
            observedOperations.has(payload.domainOperation.operationId))
            continue;
        const turnId = startedTurnId;
        const operationId = payload?.domainOperation?.operationId;
        const key = `${turnId}\n${String(invocationId ?? "")}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        unresolved.push({
            turnId,
            callId: typeof invocationId === "string" ? invocationId : "",
            scope: {
                ownerId: typeof payload?.domainOperation?.scope?.ownerId === "string"
                    ? payload.domainOperation.scope.ownerId
                    : ref.ownerId,
            },
            operationId: typeof operationId === "string" ? operationId : "",
        });
    }
    for (const entry of entries) {
        if (entry.kind !== "tool_call_started")
            continue;
        const payload = entry.payload;
        const callId = payload?.callId;
        const startedTurnId = typeof payload?.turnId === "string"
            ? payload.turnId
            : (entry.turnId ?? "");
        const callKey = invocationKey(startedTurnId, callId);
        if (callKey &&
            settledCalls.has(callKey) &&
            !unknownEffectCalls.has(callKey))
            continue;
        // Physical evidence alone proves a process exited, never what it did, so
        // only a proven late outcome clears the hold.
        if (callKey && physicallySettledCalls.has(callKey))
            continue;
        if (typeof payload?.domainOperation?.operationId === "string" &&
            observedOperations.has(payload.domainOperation.operationId))
            continue;
        const turnId = startedTurnId;
        const key = `${turnId}\n${String(callId ?? "")}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        unresolved.push({
            turnId,
            callId: typeof callId === "string" ? callId : "",
            scope: {
                ownerId: typeof payload?.domainOperation?.scope?.ownerId === "string"
                    ? payload.domainOperation.scope.ownerId
                    : ref.ownerId,
            },
            operationId: typeof payload?.domainOperation?.operationId === "string"
                ? payload.domainOperation.operationId
                : "",
        });
    }
    return unresolved;
}
/**
 * Static holds: an apply receipt still claimed, a sealed result without its
 * terminal ack, or a permission still pending. Each is a canonical fact, so a
 * restart rebuilds the hold without asking a live process anything.
 */
function piStaticHolds(entries) {
    const holds = new Set();
    let applyStatus = null;
    let sealed = false;
    let acked = false;
    let applyTerminal = false;
    let stagingPending = false;
    const pendingPermissions = new Set();
    for (const entry of entries) {
        const payload = entry.payload;
        if (entry.kind === "skill_run_apply_receipt") {
            applyStatus = typeof payload?.status === "string" ? payload.status : null;
            if (applyStatus && applyStatus !== "claimed")
                applyTerminal = true;
        }
        else if (entry.kind === "skill_run_result_sealed")
            sealed = true;
        else if (entry.kind === "skill_run_terminal_ack")
            acked = true;
        else if (entry.kind === "tool_preflight_cleanup_pending")
            // A crash between staging and cleanup leaves a durable residue marker.
            stagingPending = true;
        else if (entry.kind === "permission_pending") {
            if (typeof payload?.id === "string")
                pendingPermissions.add(payload.id);
        }
        else if (entry.kind === "permission_resolved") {
            if (typeof payload?.id === "string")
                pendingPermissions.delete(payload.id);
        }
    }
    if (applyStatus === "claimed")
        holds.add("apply_claimed");
    if (sealed && !acked)
        holds.add("result_sealed_without_ack");
    if (pendingPermissions.size)
        holds.add("permission_pending");
    // A settled provider outcome whose apply and ack have not completed is still
    // in flight for cleanup purposes even though it may not resume.
    if (applyTerminal && !acked)
        holds.add("apply_not_acked");
    if (stagingPending)
        holds.add("staging_cleanup_pending");
    return [...holds];
}
/**
 * Holds that block safe continuation but must not block the idempotent
 * Finalizer and ack path. A sealed result awaiting its ack is such a hold: the
 * owner is finished, only the acknowledgement is outstanding.
 */
const PI_CONTINUATION_BLOCKING_HOLDS = new Set([
    "apply_claimed",
    "permission_pending",
    "physically_occupied",
    "apply_not_acked",
]);
/** The holds that actually prevent an owner from settling as terminal. */
function piContinuationHolds(holds) {
    return holds.filter((hold) => PI_CONTINUATION_BLOCKING_HOLDS.has(hold));
}
/**
 * Safe recovery assessment. It never manufactures evidence: an owner whose
 * canonical store is damaged, whose holds are unresolved, or whose dispatched
 * work has no trustworthy checkpoint stays in recovery rather than resuming.
 */
export async function assessPiOwnerRecovery(ref, root, options = {}) {
    const occupied = await piOwnerOccupied(options.isPhysicallyOccupied, ref);
    let inspection = await inspectPiTranscript(ref, root).catch(() => null);
    // A torn tail is an interrupted append, so it is repaired automatically and
    // its projection is rebuilt. Committed corruption is never rewritten.
    if (inspection?.status === "torn_tail") {
        const repaired = await repairPiTornTail(ref, root).catch(() => null);
        if (repaired?.status === "valid") {
            inspection = repaired;
            await rebuildPiIndex(ref, repaired, root).catch(() => undefined);
            await rebuildPiOwnerProjections(ref, root).catch(() => undefined);
        }
    }
    if (!inspection || inspection.status !== "valid") {
        // Committed corruption is isolated to this owner: it is reported, never
        // repaired here, and never blocks the other owners' assessment.
        recordPiIntegrityFailure(ref, root, inspection?.status ?? "corrupt");
        return {
            state: "recovery_required",
            safeToResume: false,
            unresolvedOperations: [],
            hasHolds: true,
            entries: [],
        };
    }
    const entries = inspection.entries;
    const checkpoint = readPiOwnerCheckpoint(entries);
    const unresolved = piUnresolvedOperations(ref, entries);
    const holds = piStaticHolds(entries);
    if (occupied)
        holds.push("physically_occupied");
    // Assessment reports every hold, but only continuation-blocking ones prevent
    // an owner from being settled as terminal: a sealed result awaiting its ack
    // must still reach the idempotent Finalizer and ack path.
    const hasHolds = unresolved.length > 0 || holds.length > 0;
    const hasContinuationHolds = unresolved.length > 0 || piContinuationHolds(holds).length > 0;
    const status = piOwnerTerminalStatus(entries);
    if (status &&
        SKILL_RUN_TERMINAL_STATUSES.has(status) &&
        !hasContinuationHolds)
        return {
            state: "terminal",
            ...(checkpoint ? { checkpoint } : {}),
            safeToResume: false,
            unresolvedOperations: unresolved,
            hasHolds,
            entries,
        };
    if (hasContinuationHolds)
        return {
            // An unresolved operation is an unprovable effect: state_unknown must
            // survive as such, never as a settled failure that invites replay.
            state: unresolved.length ? "state_unknown" : "recovery_required",
            ...(checkpoint ? { checkpoint } : {}),
            safeToResume: false,
            unresolvedOperations: unresolved,
            hasHolds,
            entries,
        };
    if (!checkpoint)
        return {
            state: piOwnerHasDispatchedWork(entries) ? "recovery_required" : "ready",
            safeToResume: !piOwnerHasDispatchedWork(entries),
            unresolvedOperations: [],
            hasHolds: false,
            entries,
        };
    const resumable = checkpoint.resumeEligible && checkpoint.remainingMs > 0;
    // A checkpoint only speaks for the turn it was taken in. Reusing an older
    // turn's remaining budget would refill a run that already moved on.
    const latestTurnId = piOwnerLatestTurnId(entries);
    const currentTurn = latestTurnId === null || latestTurnId === checkpoint.turnId;
    return {
        state: resumable && currentTurn ? "interrupted" : "recovery_required",
        checkpoint,
        safeToResume: resumable && currentTurn,
        unresolvedOperations: [],
        hasHolds: false,
        entries,
    };
}
function requireSkillRunRef(ref) {
    if (ref.kind !== "skill_run")
        throw new Error("pi_skill_run_owner_required");
}
/**
 * Reconcile original tool invocations against authoritative Broker evidence.
 * The Broker is observed, never invoked: a settled observation is appended as
 * a late canonical fact under the original invocation identity, and anything
 * that is running, unavailable, unbound or unreachable stays an unresolved
 * hold. No execution path is reachable from here, so no replay is possible.
 */
export async function reconcilePiOwnerOperationEvidence(ref, root, options = {
    observeOperation: () => {
        throw new Error("pi_operation_observer_required");
    },
}) {
    const inspection = await inspectPiTranscript(ref, root);
    if (inspection.status !== "valid")
        throw new Error(`pi_transcript_${inspection.status}`);
    const pending = piUnresolvedOperations(ref, inspection.entries);
    const settled = [];
    const unresolved = [];
    for (const operation of pending) {
        // Without a bound operation identity there is nothing authoritative to
        // ask, so the hold stands rather than being cleared by assumption.
        if (!operation.operationId) {
            unresolved.push(operation);
            continue;
        }
        let observation;
        try {
            observation = await options.observeOperation({
                operationId: operation.operationId,
                scope: { ownerId: operation.scope.ownerId },
            });
        }
        catch {
            unresolved.push(operation);
            continue;
        }
        if (observation?.state !== "settled") {
            unresolved.push(operation);
            continue;
        }
        const result = observation.result;
        // A settled observation is not proof by itself. Only a committed or
        // unchanged result, or a failed attempt that states its own certainty, can
        // clear the effect hold. An `unknown` or `repair_required` attempt proves
        // no absence of effect, so the hold survives.
        const attempt = result && "attempt" in result
            ? result.attempt
            : undefined;
        const committed = result?.outcome === "committed" || result?.outcome === "unchanged";
        const certainty = committed
            ? "confirmed_complete"
            : attempt?.effectCertainty;
        if (!committed && !PI_GATEWAY_PROVEN_CERTAINTIES.has(certainty)) {
            unresolved.push(operation);
            continue;
        }
        await appendPiOwnerFact(ref, {
            kind: "operation_evidence_observed",
            payload: {
                operationId: operation.operationId,
                callId: operation.callId,
                turnId: operation.turnId,
                scope: { ownerId: operation.scope.ownerId },
                observedAt: new Date().toISOString(),
                outcome: result?.outcome ?? "unknown",
                // The gateway certainty vocabulary is the single accepted one; a
                // receipt never invents a certainty the broker did not state.
                effectCertainty: certainty,
                // Only the Broker's own identity is durable. Its result body can
                // carry file paths and library payloads that have no place in an
                // owner transcript, and the observation's purpose is the proof, not
                // a mirror of the mutation result.
                receiptRef: result && "receipt" in result && result.receipt
                    ? String(result.receipt.receiptId ?? "")
                    : "",
            },
            turnId: operation.turnId || undefined,
            // One observation per invocation identity: a repeated pass is a
            // no-op rather than a second settlement of the same operation.
            entryId: `operation-evidence-${operation.turnId}-${operation.callId || operation.operationId}`,
        }, root);
        settled.push(operation);
    }
    return { resolved: settled, unresolved };
}
function piSkillRunArchivedAt(entries) {
    let archivedAt = null;
    for (const entry of entries) {
        if (entry.kind !== "skill_run_archive")
            continue;
        const value = entry.payload
            ?.archivedAt;
        if (typeof value === "string" && Number.isFinite(Date.parse(value)))
            archivedAt = Date.parse(value);
    }
    return archivedAt;
}
function piSkillRunDeleting(entries) {
    return entries.some((entry) => entry.kind === "skill_run_deleting");
}
/**
 * Retention needs terminal status, an archive older than the window and no
 * apply, receipt, effect or physical hold. Anything else stays on disk.
 */
export async function isPiSkillRunRetentionEligible(ref, root, options = {}) {
    requireSkillRunRef(ref);
    const reasons = [];
    const inspection = await inspectPiTranscript(ref, root).catch(() => null);
    if (!inspection || inspection.status !== "valid")
        return { eligible: false, hasHolds: true, reasons: ["owner_unreadable"] };
    const entries = inspection.entries;
    const status = piOwnerTerminalStatus(entries);
    if (!status || !SKILL_RUN_TERMINAL_STATUSES.has(status))
        reasons.push("not_terminal");
    const archivedAt = piSkillRunArchivedAt(entries);
    const nowMs = options.nowMs ?? Date.now();
    const retentionMs = options.retentionMs ?? SKILL_RUN_RETENTION_MS;
    if (archivedAt === null)
        reasons.push("not_archived");
    else if (nowMs - archivedAt < retentionMs)
        reasons.push("retention_window");
    const unresolved = piUnresolvedOperations(ref, entries);
    const holds = piStaticHolds(entries);
    if (unresolved.length)
        reasons.push("unresolved_effect");
    if (holds.length)
        reasons.push("apply_or_receipt_hold");
    // Actual managed residue is rebuilt evidence: a crash can lose the fact
    // while the staged bytes remain.
    if (await piOwnerStagingResidue(ref, root))
        reasons.push("staging_residue");
    if (await piOwnerOccupied(options.isPhysicallyOccupied, ref))
        reasons.push("physically_occupied");
    const hasHolds = unresolved.length > 0 || holds.length > 0;
    return { eligible: reasons.length === 0, hasHolds, reasons };
}
/**
 * Two-phase deletion: the owner is marked first, so a crash between the mark
 * and the removal still leaves a request that maintenance retries.
 */
export async function markPiSkillRunDeleting(requestId, root) {
    const ref = { kind: "skill_run", ownerId: requestId };
    await appendPiOwnerFact(ref, {
        kind: "skill_run_deleting",
        payload: { markedAt: new Date().toISOString() },
    }, root);
}
async function removePiOwnerDirectories(ref, root) {
    const { discardPiRuntimeAuditOwner } = await import("./piRuntimeAudit");
    await discardPiRuntimeAuditOwner(ref, root);
    await removeRuntimePath(piOwnerPaths(ref, root).dir);
    // A removal that reports success is only a deletion once the tree is gone.
    if (await runtimePathExists(piOwnerPaths(ref, root).dir))
        return false;
    // The registry row is only dropped once the canonical tree is confirmed
    // gone, so an unconfirmed removal leaves the owner discoverable for retry.
    deletePiOwnerRegistry(ref.kind, ref.ownerId);
    return true;
}
export async function cleanupPiSkillRun(ref, root, options = {}) {
    requireSkillRunRef(ref);
    const inspection = await inspectPiTranscript(ref, root).catch(() => null);
    if (!inspection || inspection.status !== "valid") {
        // An owner that is already gone has a durable receipt to replay; without
        // one there is nothing to claim, so the deletion stays unproven.
        if (!(await runtimePathExists(piOwnerPaths(ref, root).dir))) {
            const receipt = getPiSkillRunCleanupReceipt(ref.ownerId);
            if (receipt)
                return {
                    status: "deleted",
                    requestId: ref.ownerId,
                    cleanedAt: receipt.cleanedAt,
                };
        }
        return {
            status: "cleanup_pending",
            requestId: ref.ownerId,
            reason: "owner_unreadable",
        };
    }
    const entries = inspection.entries;
    const marked = piSkillRunDeleting(entries);
    if (!marked) {
        // Retention owns the only unmarked path; an explicit request marks first.
        const decision = await isPiSkillRunRetentionEligible(ref, root, {
            ...(options.nowMs === undefined ? {} : { nowMs: options.nowMs }),
            ...(options.retentionMs === undefined
                ? { retentionMs: SKILL_RUN_RETENTION_MS }
                : { retentionMs: options.retentionMs }),
            ...(options.isPhysicallyOccupied
                ? { isPhysicallyOccupied: options.isPhysicallyOccupied }
                : {}),
        });
        if (!decision.eligible)
            return {
                status: "cleanup_pending",
                requestId: ref.ownerId,
                reason: decision.reasons.join(",") || "not_eligible",
            };
    }
    else if (options.isPhysicallyOccupied) {
        if (await piOwnerOccupied(options.isPhysicallyOccupied, ref))
            return {
                status: "cleanup_pending",
                requestId: ref.ownerId,
                reason: "physically_occupied",
            };
    }
    if (piUnresolvedOperations(ref, entries).length)
        return {
            status: "cleanup_pending",
            requestId: ref.ownerId,
            reason: "unresolved_effect",
        };
    if (piStaticHolds(entries).length)
        return {
            status: "cleanup_pending",
            requestId: ref.ownerId,
            reason: "apply_or_receipt_hold",
        };
    if (await piOwnerStagingResidue(ref, root))
        return {
            status: "cleanup_pending",
            requestId: ref.ownerId,
            reason: "staging_residue",
        };
    return withPiOwnerWrite(ref, root, async () => {
        try {
            if (!(await removePiOwnerDirectories(ref, root)))
                throw new Error("pi_skill_run_remove_unconfirmed");
            const receipt = {
                requestId: ref.ownerId,
                cleanedAt: new Date().toISOString(),
            };
            // The receipt is published only after the tree is confirmed gone, so it
            // is never evidence of a deletion that did not happen.
            upsertPiSkillRunCleanupReceipt(receipt);
            return {
                status: "deleted",
                requestId: ref.ownerId,
                cleanedAt: receipt.cleanedAt,
            };
        }
        catch {
            return {
                status: "cleanup_pending",
                requestId: ref.ownerId,
                reason: "remove_failed",
            };
        }
    });
}
const CONVERSATION_TITLE_MAX = 200;
const CONVERSATION_SELECTION_MAX = 200;
const TITLE_SOURCES = [
    "default",
    "user",
    "agent",
];
const LIFECYCLE_TRANSITIONS = {
    active: ["archived"],
    archived: ["active", "deleting"],
    deleting: ["cleanup_pending"],
    cleanup_pending: ["deleting"],
};
function requireConversationRef(ref) {
    if (ref.kind !== "conversation")
        throw new Error("pi_conversation_owner_required");
}
function normalizeConversationTitle(value) {
    if (typeof value !== "string")
        throw new Error("pi_conversation_title_invalid");
    const normalized = value
        .split("")
        .map((character) => {
        const code = character.codePointAt(0) ?? 0;
        return code <= 0x1f || code === 0x7f ? " " : character;
    })
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    return normalized.length > CONVERSATION_TITLE_MAX
        ? normalized.slice(0, CONVERSATION_TITLE_MAX)
        : normalized;
}
function normalizeConversationSelection(value) {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "string" ||
        !value.trim() ||
        value.length > CONVERSATION_SELECTION_MAX)
        throw new Error("pi_conversation_selection_invalid");
    return value;
}
function isContextPiEntry(entry) {
    return !PI_TRANSCRIPT_NON_CONTEXT_KINDS.has(entry.kind);
}
// The CAS token is the model-visible revision: durable non-context facts (turn
// boundaries, invocation and tool markers, conversation metadata, title usage)
// never move it, so they cannot stale an in-flight preparation.
function piVisibleRevision(inspection) {
    return inspection.entries.filter(isContextPiEntry).length;
}
// The active path is the whole committed log, so trailing settle markers stay
// reachable from the leaf; preparation ignores them semantically.
function piActiveLeaf(inspection) {
    return inspection.entries.at(-1)?.entryId ?? null;
}
function transcriptBasisOf(inspection) {
    return {
        revision: piVisibleRevision(inspection),
        activeLeaf: piActiveLeaf(inspection),
    };
}
// ADR 0003 keeps the Pi Usage shape in the canonical transcript; only these
// declared non-negative numeric scalars reach SQLite. The inputTokens and
// outputTokens spellings are the single accepted alternates at this boundary
// (title usage facts), never a second fact source.
const USAGE_DECLARED_FIELDS = [
    "input",
    "output",
    "cacheRead",
    "cacheWrite",
    "totalTokens",
    "cost",
];
const TITLE_USAGE_KEYS = {
    input: "titleInput",
    output: "titleOutput",
    cacheRead: "titleCacheRead",
    cacheWrite: "titleCacheWrite",
    totalTokens: "titleTokens",
    cost: "titleCost",
};
function readPiConversationUsageFields(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return null;
    const source = value;
    const read = (...names) => {
        for (const name of names) {
            const candidate = source[name];
            if (typeof candidate === "number" &&
                Number.isFinite(candidate) &&
                candidate >= 0)
                return candidate;
        }
        return null;
    };
    const found = {
        input: read("inputTokens", "input"),
        output: read("outputTokens", "output"),
        cacheRead: read("cacheRead"),
        cacheWrite: read("cacheWrite"),
        totalTokens: read("totalTokens"),
        // ADR 0003 keeps the Pi Usage shape: cost is either a plain number or the
        // SDK aggregate object with a numeric total.
        cost: readCost(source),
    };
    const fields = {};
    for (const field of USAGE_DECLARED_FIELDS) {
        const candidate = found[field];
        if (candidate !== null)
            fields[field] = candidate;
    }
    return Object.keys(fields).length ? fields : null;
}
function readCost(source) {
    const direct = source.cost;
    if (typeof direct === "number" && Number.isFinite(direct) && direct >= 0)
        return direct;
    if (!direct || typeof direct !== "object" || Array.isArray(direct))
        return null;
    const total = direct.total;
    return typeof total === "number" && Number.isFinite(total) && total >= 0
        ? total
        : null;
}
function toPiConversationUsage(fields) {
    return {
        input: fields.input ?? 0,
        output: fields.output ?? 0,
        cacheRead: fields.cacheRead ?? 0,
        cacheWrite: fields.cacheWrite ?? 0,
        totalTokens: fields.totalTokens ?? 0,
        cost: fields.cost ?? 0,
    };
}
// Durable scalar projection for cheap restart hydration: no message bodies,
// only rebuildable counts, the latest turn status and bounded usage scalars.
function piConversationProjectionFor(inspection) {
    const counts = { user: 0, assistant: 0, tool: 0, thought: 0, other: 0 };
    let latestTurnId = null;
    let latestTurnStatus = null;
    let usage = null;
    const usageTotals = {};
    for (const entry of inspection.entries) {
        const payload = entry.payload;
        if (entry.kind === "message") {
            const role = payload?.role;
            if (role === "user")
                counts.user += 1;
            else if (role === "assistant")
                counts.assistant += 1;
            else
                counts.other += 1;
        }
        else if (entry.kind === "thought")
            counts.thought += 1;
        else if (entry.kind === "tool_result")
            counts.tool += 1;
        else
            counts.other += 1;
        if (entry.kind === "turn_started") {
            if (typeof payload?.turnId === "string") {
                latestTurnId = payload.turnId;
                latestTurnStatus = "active";
            }
        }
        else if (entry.kind === "turn_terminal") {
            if (typeof payload?.turnId === "string")
                latestTurnId = payload.turnId;
            const status = typeof payload?.status === "string" ? payload.status : null;
            const outcome = typeof payload?.outcome === "string" ? payload.outcome : null;
            // An unprovable effect must survive restore as state_unknown; it must not
            // be presented as a settled failure, which would invite replay.
            latestTurnStatus =
                outcome === "unknown" ||
                    outcome === "state_unknown" ||
                    status === "state_unknown"
                    ? "state_unknown"
                    : (status ?? outcome);
        }
        const modelFields = readPiConversationUsageFields(payload?.usage);
        if (modelFields) {
            usage = toPiConversationUsage(modelFields);
            for (const field of USAGE_DECLARED_FIELDS)
                usageTotals[field] =
                    (usageTotals[field] ?? 0) + (modelFields[field] ?? 0);
        }
        if (entry.kind === "title_usage") {
            // Title usage is a top-level token fact, kept distinct from model usage.
            const titleFields = readPiConversationUsageFields(payload);
            if (titleFields)
                for (const field of USAGE_DECLARED_FIELDS) {
                    const key = TITLE_USAGE_KEYS[field];
                    usageTotals[key] =
                        (usageTotals[key] ?? 0) + (titleFields[field] ?? 0);
                }
        }
    }
    const basis = transcriptBasisOf(inspection);
    return {
        counts,
        contextRevision: basis.revision,
        activeLeaf: basis.activeLeaf,
        latestTurnId,
        latestTurnStatus,
        usage,
        usageTotals,
    };
}
function openPiConversationTurnId(entries) {
    const open = new Set();
    for (const entry of entries) {
        const turnId = entry.payload?.turnId;
        if (typeof turnId !== "string" || !turnId)
            continue;
        if (entry.kind === "turn_started")
            open.add(turnId);
        else if (entry.kind === "turn_terminal")
            open.delete(turnId);
    }
    return open.values().next().value ?? null;
}
function requireValidPiTranscript(inspection) {
    if (inspection.status !== "valid")
        throw new Error(`pi_transcript_${inspection.status}`);
}
function assertPiTranscriptBasis(inspection, expected) {
    const basis = transcriptBasisOf(inspection);
    if (!expected ||
        expected.revision !== basis.revision ||
        expected.activeLeaf !== basis.activeLeaf)
        throw new Error("pi_conversation_basis_mismatch");
    return basis;
}
function sanitizeFrozenTurn(frozen) {
    const result = {};
    if (frozen.model) {
        const model = frozen.model;
        if (typeof model.selectionRef !== "string" ||
            !model.selectionRef ||
            typeof model.provider !== "string" ||
            !model.provider ||
            typeof model.modelId !== "string" ||
            !model.modelId ||
            typeof model.api !== "string" ||
            !model.api)
            throw new Error("pi_conversation_frozen_model_invalid");
        result.model = {
            selectionRef: model.selectionRef,
            provider: model.provider,
            modelId: model.modelId,
            api: model.api,
        };
    }
    if (frozen.resources) {
        if (!Array.isArray(frozen.resources))
            throw new Error("pi_conversation_frozen_resources_invalid");
        result.resources = frozen.resources.map((resource) => {
            if (!resource ||
                typeof resource.ref !== "string" ||
                !resource.ref ||
                typeof resource.kind !== "string" ||
                !resource.kind)
                throw new Error("pi_conversation_frozen_resources_invalid");
            return {
                ref: resource.ref,
                kind: resource.kind,
                ...(typeof resource.digest === "string"
                    ? { digest: resource.digest }
                    : {}),
                ...(typeof resource.label === "string"
                    ? { label: resource.label }
                    : {}),
            };
        });
    }
    return result;
}
export function updatePiConversationMetadata(conversationId, patch = {}, expected = {}) {
    const current = getPiConversationMetadata(conversationId);
    if (!current)
        throw new Error("pi_conversation_missing");
    if ((expected.generation !== undefined &&
        current.generation !== expected.generation) ||
        (expected.titleRevision !== undefined &&
            current.titleRevision !== expected.titleRevision) ||
        (expected.lifecycle !== undefined &&
            current.lifecycle !== expected.lifecycle))
        throw new Error("pi_conversation_metadata_stale");
    const next = { ...current };
    if (patch.title !== undefined)
        next.title = normalizeConversationTitle(patch.title);
    if (patch.titleSource !== undefined) {
        if (!TITLE_SOURCES.includes(patch.titleSource))
            throw new Error("pi_conversation_title_source_invalid");
        next.titleSource = patch.titleSource;
    }
    if (patch.selection !== undefined)
        next.selection = normalizeConversationSelection(patch.selection);
    if (patch.lifecycle !== undefined) {
        const target = patch.lifecycle;
        if (target !== current.lifecycle &&
            !(LIFECYCLE_TRANSITIONS[current.lifecycle] ?? []).includes(target))
            throw new Error("pi_conversation_lifecycle_invalid");
        next.lifecycle = target;
    }
    if (next.title !== current.title || next.titleSource !== current.titleSource)
        next.titleRevision = current.titleRevision + 1;
    // generation is a stable owner-incarnation token: it changes only when the
    // owner irreversibly enters deleting. Archive/restore/rename/selection keep
    // it stable so a pending title result is judged by titleRevision, not by
    // unrelated metadata churn.
    if (next.lifecycle === "deleting" && current.lifecycle !== "deleting")
        next.generation = current.generation + 1;
    next.updatedAt = new Date().toISOString();
    const updated = writePiConversationMetadata(conversationId, {
        generation: current.generation,
        titleRevision: current.titleRevision,
        lifecycle: current.lifecycle,
    }, next);
    if (!updated)
        throw new Error("pi_conversation_metadata_stale");
    return updated;
}
export function markPiConversationDeleting(conversationId, expected = {}) {
    return updatePiConversationMetadata(conversationId, { lifecycle: "deleting" }, expected);
}
export async function cleanupPiConversation(ref, root, options = {}) {
    requireConversationRef(ref);
    return withPiOwnerWrite(ref, root, async () => {
        const metadata = getPiConversationMetadata(ref.ownerId);
        if (!metadata) {
            const receipt = getPiConversationCleanupReceipt(ref.ownerId);
            if (receipt)
                return { status: "deleted", receipt };
            throw new Error("pi_conversation_missing");
        }
        if (metadata.lifecycle !== "deleting" &&
            metadata.lifecycle !== "cleanup_pending")
            throw new Error("pi_conversation_not_deleting");
        // Permanent deletion preserves files while an executor or an outcome hold
        // remains; maintenance retries it later under the same lifecycle.
        if (options.isPhysicallyOccupied) {
            if (await piOwnerOccupied(options.isPhysicallyOccupied, ref))
                return {
                    status: "cleanup_pending",
                    conversationId: ref.ownerId,
                };
        }
        // An owner tree that is already gone is a finished deletion, not a hold:
        // a retry after a receipt failure must still reach its receipt.
        if (await runtimePathExists(piOwnerPaths(ref, root).dir)) {
            const assessment = await assessPiOwnerRecovery(ref, root);
            if (assessment.hasHolds)
                return {
                    status: "cleanup_pending",
                    conversationId: ref.ownerId,
                };
        }
        try {
            if (!(await removePiOwnerDirectories(ref, root)))
                throw new Error("pi_conversation_remove_unconfirmed");
            const receipt = {
                conversationId: ref.ownerId,
                generation: metadata.generation,
                cleanedAt: new Date().toISOString(),
            };
            upsertPiConversationCleanupReceipt(receipt);
            deletePiConversationMetadata(ref.ownerId);
            return { status: "deleted", receipt };
        }
        catch {
            try {
                updatePiConversationMetadata(ref.ownerId, {
                    lifecycle: "cleanup_pending",
                });
            }
            catch {
                // The row keeps its deleting mark; a later cleanup call retries.
            }
            return {
                status: "cleanup_pending",
                conversationId: ref.ownerId,
            };
        }
    });
}
export async function createPiConversationOwner(options = {}, root) {
    const conversationId = options.conversationId ||
        `conversation-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 10)}`;
    const ref = { kind: "conversation", ownerId: conversationId };
    const existing = getPiConversationMetadata(conversationId);
    if (existing &&
        (existing.lifecycle === "deleting" ||
            existing.lifecycle === "cleanup_pending"))
        throw new Error("pi_conversation_owner_unavailable");
    await createPiOwner(ref, root);
    const created = getPiConversationMetadata(conversationId);
    if (!created)
        throw new Error("pi_conversation_metadata_unavailable");
    if (created.lifecycle === "deleting" ||
        created.lifecycle === "cleanup_pending")
        throw new Error("pi_conversation_owner_unavailable");
    const metadata = options.selection === undefined
        ? created
        : updatePiConversationMetadata(conversationId, {
            selection: options.selection,
        });
    return { ref, metadata };
}
export async function appendPiConversationFact(ref, fact, root) {
    if (typeof fact.kind !== "string" || !fact.kind)
        throw new Error("pi_fact_kind_invalid");
    return withPiOwnerWrite(ref, root, async () => {
        const metadata = getPiConversationMetadata(ref.ownerId);
        if (ref.kind === "conversation" && !metadata)
            throw new Error("pi_conversation_missing");
        if (metadata?.lifecycle === "deleting" ||
            metadata?.lifecycle === "cleanup_pending")
            throw new Error("pi_conversation_lifecycle_frozen");
        const inspection = await inspectPiTranscript(ref, root);
        requireValidPiTranscript(inspection);
        const existing = fact.entryId
            ? inspection.entries.find((entry) => entry.entryId === fact.entryId)
            : undefined;
        const parent = existing
            ? existing.parentEntryId
            : inspection.entries.at(-1)?.entryId;
        const seq = inspection.entries.length + 1;
        const { entry, inspection: after } = await appendPiTranscript(ref, {
            entryId: fact.entryId || `fact-${seq}-${fact.kind}`,
            kind: fact.kind,
            payload: fact.payload,
            ...(fact.turnId ? { turnId: fact.turnId } : {}),
            ...(parent ? { parentEntryId: parent } : {}),
        }, root);
        await project(ref, after, root);
        return { entry, basis: transcriptBasisOf(after) };
    });
}
export async function admitPiConversationTurn(ref, admission, root) {
    requireConversationRef(ref);
    if (typeof admission.turnId !== "string" || !admission.turnId)
        throw new Error("pi_turn_id_invalid");
    if (!Array.isArray(admission.entries) || admission.entries.length === 0)
        throw new Error("pi_turn_entries_invalid");
    const prepared = admission.entries.map((input) => ({
        ...input,
        turnId: input.turnId ?? admission.turnId,
    }));
    for (const input of prepared)
        validatePiEntryInput(input);
    const frozen = admission.frozen
        ? sanitizeFrozenTurn(admission.frozen)
        : undefined;
    return withPiOwnerWrite(ref, root, async () => {
        const metadata = getPiConversationMetadata(ref.ownerId);
        if (!metadata)
            throw new Error("pi_conversation_missing");
        if (metadata.lifecycle !== "active")
            throw new Error("pi_conversation_lifecycle_frozen");
        const inspection = await inspectPiTranscript(ref, root);
        requireValidPiTranscript(inspection);
        assertPiTranscriptBasis(inspection, admission.expectedBasis);
        const openTurn = openPiConversationTurnId(inspection.entries);
        if (openTurn)
            throw new Error("pi_conversation_turn_open");
        // One bounded, all-or-nothing append: the user input precedes the
        // turn_started boundary, and nothing lands before the whole batch is
        // validated.
        const batch = [
            ...prepared,
            {
                entryId: `turn-started-${admission.turnId}-${inspection.entries.length + 1}`,
                kind: "turn_started",
                payload: {
                    schemaVersion: 1,
                    turnId: admission.turnId,
                    ...(frozen ? frozen : {}),
                },
                turnId: admission.turnId,
            },
        ];
        const { entries, inspection: after } = await appendPiTranscriptBatch(ref, batch, root);
        await project(ref, after, root);
        try {
            const fresh = getPiConversationMetadata(ref.ownerId);
            if (fresh)
                writePiConversationMetadata(ref.ownerId, { generation: fresh.generation }, { ...fresh, updatedAt: new Date().toISOString() });
        }
        catch {
            // Activity refresh is best-effort; the transcript is already durable.
        }
        return {
            turnId: admission.turnId,
            basis: transcriptBasisOf(after),
            entries,
        };
    });
}
export async function readPiConversationTranscriptSnapshot(ref, root) {
    const inspection = await inspectPiTranscript(ref, root);
    requireValidPiTranscript(inspection);
    const metadata = getPiConversationMetadata(ref.ownerId);
    return {
        generation: String(metadata?.generation ?? 1),
        ...transcriptBasisOf(inspection),
        entries: [...inspection.entries],
    };
}
export async function summarizePiConversationTranscript(ref, root) {
    requireConversationRef(ref);
    const inspection = await inspectPiTranscript(ref, root);
    requireValidPiTranscript(inspection);
    const counts = { user: 0, assistant: 0, tool: 0, other: 0 };
    for (const item of inspection.entries) {
        const payload = item.payload;
        if (item.kind === "message" && payload && payload.role === "user")
            counts.user += 1;
        else if (item.kind === "message" && payload && payload.role === "assistant")
            counts.assistant += 1;
        else if (item.kind === "tool_result")
            counts.tool += 1;
        else
            counts.other += 1;
    }
    return {
        ...transcriptBasisOf(inspection),
        ...counts,
    };
}
export async function recordPiConversationPreparation(ref, record, expected, root) {
    return createPiConversationPreparationAdapter(ref, root).record(record, expected);
}
export function createPiConversationPreparationAdapter(ref, root) {
    return {
        async record(record, expected) {
            return withPiOwnerWrite(ref, root, async () => {
                const metadata = getPiConversationMetadata(ref.ownerId);
                if (ref.kind === "conversation" && !metadata)
                    throw new Error("pi_conversation_missing");
                // Q188: archive may not cancel a pending auxiliary title result, so a
                // title-preparation record is the only one accepted on an archived
                // owner; every other preparation still requires an active owner.
                const titlePreparation = record.purpose === "title";
                if (ref.kind === "conversation" &&
                    metadata?.lifecycle !== "active" &&
                    !(titlePreparation && metadata?.lifecycle === "archived"))
                    throw new Error("pi_conversation_lifecycle_frozen");
                const inspection = await inspectPiTranscript(ref, root);
                requireValidPiTranscript(inspection);
                if (piVisibleRevision(inspection) !== expected.revision)
                    throw new Error("pi_conversation_basis_mismatch");
                const parent = inspection.entries.at(-1)?.entryId;
                const result = await appendPiTranscript(ref, {
                    entryId: `turn-preparation-${inspection.entries.length + 1}-${record.kind}`,
                    kind: "turn_preparation",
                    payload: record,
                    ...(parent ? { parentEntryId: parent } : {}),
                }, root);
                await project(ref, result.inspection, root);
                // A preparation record is durable but not model-visible, so the CAS
                // basis the caller holds is unchanged.
                return { revision: expected.revision, activeLeaf: expected.activeLeaf };
            });
        },
        async commitCompaction({ owner, turnId, expectedRevision, summary }) {
            if (owner.kind !== ref.kind || owner.ownerId !== ref.ownerId)
                throw new Error("pi_conversation_owner_mismatch");
            return withPiOwnerWrite(ref, root, async () => {
                const metadata = getPiConversationMetadata(ref.ownerId);
                const inspection = await inspectPiTranscript(ref, root);
                const basis = inspection.status === "valid" ? transcriptBasisOf(inspection) : null;
                if ((ref.kind === "conversation" &&
                    (!metadata || metadata.lifecycle !== "active")) ||
                    !basis ||
                    basis.revision !== expectedRevision)
                    return { status: "stale" };
                const parent = inspection.entries.at(-1)?.entryId;
                await appendPiTranscript(ref, {
                    entryId: `compaction-${inspection.entries.length + 1}`,
                    turnId,
                    kind: "compaction",
                    payload: {
                        schemaVersion: 1,
                        inputDigest: summary.inputDigest,
                        summary,
                    },
                    ...(parent ? { parentEntryId: parent } : {}),
                }, root);
                // Recorded only after the compaction entry is durable, so the evidence
                // never claims a summary the transcript does not contain.
                recordPiRuntimeAudit({
                    operation: "persistence.compaction_terminal",
                    origin: "persistence",
                    owner: { ...ref },
                    ...(root ? { root } : {}),
                    attributes: {
                        status: "completed",
                        kind: "compaction",
                        revision: basis.revision,
                    },
                });
                return {
                    status: "committed",
                    transcript: await readPiConversationTranscriptSnapshot(ref, root),
                };
            });
        },
    };
}
// Both owner kinds share the canonical append and preparation CAS protocol.
export const appendPiOwnerFact = appendPiConversationFact;
export const readPiOwnerTranscriptSnapshot = readPiConversationTranscriptSnapshot;
export const createPiOwnerPreparationAdapter = createPiConversationPreparationAdapter;
/** Commit a caller-owned CAS transition as one canonical owner batch. */
export function commitPiOwnerFacts(ref, decide, root) {
    return withPiOwnerWrite(ref, root, async () => {
        const inspection = await inspectPiTranscript(ref, root);
        requireValidPiTranscript(inspection);
        const inputs = await decide(inspection.entries);
        if (!inputs.length)
            return [];
        let parent = inspection.entries.at(-1)?.entryId;
        const linked = inputs.map((input) => {
            const result = { ...input, ...(parent ? { parentEntryId: parent } : {}) };
            parent = input.entryId;
            return result;
        });
        const result = await appendPiTranscriptBatch(ref, linked, root);
        await project(ref, result.inspection, root);
        return result.entries;
    });
}
