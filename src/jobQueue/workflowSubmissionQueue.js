import { appendRuntimeLog as appendRuntimeLogEntry } from "../modules/runtimeLogManager";
const DEFAULT_SCHEDULE_MICROTASK = (run) => {
    void Promise.resolve().then(run);
};
function backendKey(scope) {
    return `${scope.backendType}\n${scope.backendId}`;
}
function identityKey(query) {
    return `${query.workflowId}\n${query.inputUnitIdentity}`;
}
function normalizeConcurrency(value, unitCount) {
    if (value === undefined || value === 0) {
        return unitCount;
    }
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError("Workflow submission concurrency must be a non-negative safe integer");
    }
    return Math.min(value, unitCount);
}
function freezeBackendScope(scope) {
    return Object.freeze({
        backendType: scope.backendType,
        backendId: scope.backendId,
    });
}
const RESERVATION_STATES = new Set([
    "held",
    "yielded",
    "resumption-pending",
    "settled",
]);
/**
 * A restored reservation is a durable accounting fact, so a corrupted one must
 * fail closed instead of occupying a slot with unbounded capacity. Identity,
 * capacity and duplicate-suppression identities are validated at this trust
 * boundary; an already occupied submission unit is a separate conflict.
 */
function assertRestorableReservation(reservation) {
    const invalid = () => new Error("pi_workflow_reservation_invalid");
    const positive = (value) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
    if (!String(reservation.submissionId || "").trim())
        throw invalid();
    if (!String(reservation.submissionUnitId || "").trim())
        throw invalid();
    if (!String(reservation.workflowId || "").trim())
        throw invalid();
    if (!String(reservation.unitId || "").trim())
        throw invalid();
    if (!RESERVATION_STATES.has(String(reservation.state || "")))
        throw invalid();
    if (!positive(reservation.maxConcurrency))
        throw invalid();
    if (!positive(reservation.unitCount))
        throw invalid();
    if (!Array.isArray(reservation.memberIdentities))
        throw invalid();
    for (const identity of reservation.memberIdentities) {
        if (typeof identity !== "string" || !identity.trim())
            throw invalid();
    }
}
function summarize(submissionId, outcomes) {
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    for (const outcome of outcomes) {
        if (outcome.status === "succeeded") {
            succeeded += 1;
        }
        else if (outcome.status === "failed") {
            failed += 1;
        }
        else {
            skipped += 1;
        }
    }
    return Object.freeze({
        submissionId,
        total: outcomes.length,
        succeeded,
        failed,
        skipped,
    });
}
export class WorkflowSubmissionQueue {
    pendingByQueueId = new Map();
    activeByQueueId = new Map();
    queueIdsByBackend = new Map();
    queueIdsByIdentity = new Map();
    submissions = new Map();
    listeners = new Set();
    now;
    createSubmissionIdOverride;
    createQueueIdOverride;
    scheduleMicrotask;
    appendRuntimeLog;
    submissionSequence = 0;
    queueSequence = 0;
    ordinalSequence = 0;
    resumeOrdinalSequence = 0;
    displaySequence = 0;
    shuttingDown = false;
    piAdmissionBlocked = false;
    static SUBMISSION_SYMBOLS = [
        "🌙",
        "☀️",
        "⭐",
        "☄️",
        "🪐",
        "🌍",
        "🌊",
        "🔥",
    ];
    constructor(deps = {}) {
        this.now = deps.now ?? (() => new Date().toISOString());
        this.createSubmissionIdOverride = deps.createSubmissionId;
        this.createQueueIdOverride = deps.createQueueId;
        this.scheduleMicrotask =
            deps.scheduleMicrotask ?? DEFAULT_SCHEDULE_MICROTASK;
        this.appendRuntimeLog = deps.appendRuntimeLog ?? appendRuntimeLogEntry;
    }
    start() {
        this.shuttingDown = false;
    }
    get isShuttingDown() {
        return this.shuttingDown;
    }
    get isPiAdmissionBlocked() {
        return this.piAdmissionBlocked;
    }
    /**
     * Startup holds new builtin-pi admission while durable reservations are
     * restored. Only builtin-pi is gated; ACP and Skill-Runner submissions keep
     * flowing, and restoration itself is never blocked.
     */
    setPiAdmissionBarrier(blocked) {
        this.piAdmissionBlocked = blocked;
    }
    /**
     * Narrow slot descriptor the Pi owner persists. Returns undefined once the
     * unit settles, is released or the queue shuts down.
     */
    getReservation(submissionUnitId) {
        const item = this.findReservationItem(submissionUnitId);
        if (!item) {
            return undefined;
        }
        const controller = this.submissions.get(item.submissionId);
        const slot = this.toSlotSnapshot(item);
        return Object.freeze({
            submissionId: item.submissionId,
            submissionUnitId: item.queueId,
            workflowId: item.workflowId,
            workflowLabel: item.workflowLabel,
            backendId: item.backend.backendId,
            unitId: item.unitId,
            unitOrder: item.unitOrder,
            taskName: item.taskName,
            ...(item.inputUnitIdentity
                ? { inputUnitIdentity: item.inputUnitIdentity }
                : {}),
            memberIdentities: item.memberIdentities,
            unitCount: controller?.items.length ?? item.recovered?.unitCount ?? 1,
            maxConcurrency: controller?.limit ?? item.recovered?.maxConcurrency ?? 1,
            state: slot.state,
            ...(slot.yieldReason ? { yieldReason: slot.yieldReason } : {}),
            ...(slot.resumeReason ? { resumeReason: slot.resumeReason } : {}),
            ...(item.recovered?.ownerId ? { ownerId: item.recovered.ownerId } : {}),
        });
    }
    /**
     * Adopts a durable Pi reservation under its original identities, state and
     * per-submission concurrency limit. The recovered unit never dispatches:
     * its owner resumes through the returned slot coordinator.
     */
    restoreReservation(reservation) {
        assertRestorableReservation(reservation);
        const submissionId = reservation.submissionId;
        const queueId = reservation.submissionUnitId;
        const backendId = String(reservation.backendId || "").trim();
        let controller = this.submissions.get(submissionId);
        if (!controller) {
            let resolveCompletion;
            const completion = new Promise((resolve) => {
                resolveCompletion = resolve;
            });
            controller = {
                submissionId,
                backend: Object.freeze({
                    backendType: "builtin-pi",
                    backendId,
                }),
                workflow: Object.freeze({
                    workflowId: reservation.workflowId,
                    workflowLabel: reservation.workflowLabel,
                }),
                display: this.createDisplayIdentity(undefined),
                items: [],
                limit: Math.max(1, reservation.maxConcurrency || 1),
                total: 1,
                initiallySkipped: 0,
                outcomes: [],
                completion,
                resolveCompletion,
                active: 0,
                settled: 0,
                drainScheduled: false,
                completed: false,
            };
            this.submissions.set(submissionId, controller);
        }
        const existing = this.activeByQueueId.get(queueId);
        if (existing) {
            if (existing.recovered?.ownerId !== reservation.ownerId) {
                throw new Error("pi_workflow_reservation_conflict");
            }
            return this.createSlotCoordinator(controller, existing);
        }
        const item = {
            queueId,
            submissionId,
            backend: controller.backend,
            workflowId: reservation.workflowId,
            workflowLabel: reservation.workflowLabel,
            unitId: reservation.unitId,
            unitOrder: reservation.unitOrder,
            taskName: reservation.taskName,
            inputUnitIdentity: reservation.inputUnitIdentity,
            memberIdentities: Object.freeze([...reservation.memberIdentities]),
            memberCount: Math.max(1, reservation.memberIdentities.length),
            createdAt: this.now(),
            ordinal: ++this.ordinalSequence,
            execute: () => Promise.resolve({
                status: "skipped",
                reasonCode: "host-queue-recovered-reservation-not-dispatched",
            }),
            state: reservation.state === "resumption-pending"
                ? "resumption-pending"
                : reservation.state === "yielded"
                    ? "yielded"
                    : "admitted",
            slotHeld: reservation.state === "held",
            ...(reservation.yieldReason
                ? { yieldReason: reservation.yieldReason }
                : {}),
            ...(reservation.resumeReason
                ? { resumeReason: reservation.resumeReason }
                : {}),
            recovered: Object.freeze({
                backendId,
                workflowLabel: reservation.workflowLabel,
                maxConcurrency: reservation.maxConcurrency,
                unitCount: reservation.unitCount,
                ...(reservation.ownerId ? { ownerId: reservation.ownerId } : {}),
            }),
        };
        if (item.state === "resumption-pending") {
            // A recovered resumption-pending unit keeps its reason and gains a fresh
            // resume promise, so a late owner release cannot resolve a dead waiter.
            item.resumeReason = reservation.resumeReason;
            item.resumeOrdinal = ++this.resumeOrdinalSequence;
            item.resumePromise = new Promise((resolve) => {
                item.resolveResume = resolve;
            });
        }
        controller.items.push(item);
        if (item.slotHeld) {
            controller.active += 1;
        }
        this.activeByQueueId.set(queueId, item);
        this.addIdentityIndexes(item);
        this.log("reservation-restore", {
            submissionId,
            queueId,
            unitId: item.unitId,
            reasonCode: reservation.state,
        });
        if (item.state === "resumption-pending") {
            this.scheduleDrain(controller);
        }
        return this.createSlotCoordinator(controller, item);
    }
    /**
     * Drops a recovered reservation once its owner settled or abandoned the
     * work. Live submissions are settled through the normal queue path instead.
     */
    releaseRecoveredReservation(submissionUnitId) {
        const item = this.activeByQueueId.get(submissionUnitId);
        if (!item?.recovered) {
            return false;
        }
        const controller = this.submissions.get(item.submissionId);
        this.cancelPendingResumption(item);
        item.state = "settled";
        item.slotHeld = false;
        this.activeByQueueId.delete(item.queueId);
        this.removeIdentityIndexes(item);
        if (controller) {
            controller.active = Math.max(0, controller.active - 1);
            controller.settled += 1;
            controller.outcomes.push({
                status: "skipped",
                reasonCode: "host-queue-recovered-reservation-released",
            });
            this.maybeComplete(controller);
        }
        this.log("reservation-release", {
            submissionId: item.submissionId,
            queueId: item.queueId,
            unitId: item.unitId,
        });
        return true;
    }
    enqueueSubmission(config) {
        if (this.shuttingDown) {
            throw new Error("Workflow submission queue is shutting down");
        }
        const submissionId = this.nextSubmissionId();
        const initialOutcomes = [...(config.initialOutcomes ?? [])];
        const total = config.units.length + initialOutcomes.length;
        const limit = normalizeConcurrency(config.maxConcurrency, config.units.length);
        let resolveCompletion;
        const completion = new Promise((resolve) => {
            resolveCompletion = resolve;
        });
        const controller = {
            submissionId,
            backend: freezeBackendScope(config.backend),
            workflow: Object.freeze({
                workflowId: config.workflow.workflowId,
                workflowLabel: config.workflow.workflowLabel,
            }),
            display: this.createDisplayIdentity(config.presentation),
            items: [],
            limit,
            total,
            initiallySkipped: initialOutcomes.length,
            onTerminal: config.onTerminal,
            outcomes: initialOutcomes,
            completion,
            resolveCompletion,
            active: 0,
            settled: initialOutcomes.length,
            drainScheduled: false,
            completed: false,
        };
        this.log("submission-create", {
            submissionId,
            unitCount: config.units.length,
            maxConcurrency: config.maxConcurrency ?? 0,
        });
        if (config.units.length === 0) {
            controller.completed = true;
            const summary = summarize(submissionId, initialOutcomes);
            resolveCompletion(summary);
            controller.onTerminal?.(summary);
            return Object.freeze({ submissionId, completion });
        }
        this.submissions.set(submissionId, controller);
        for (const queuedUnit of config.units) {
            const queueId = this.nextQueueId();
            const item = {
                queueId,
                submissionId,
                backend: controller.backend,
                workflowId: controller.workflow.workflowId,
                workflowLabel: controller.workflow.workflowLabel,
                unitId: queuedUnit.display.unitId,
                unitOrder: queuedUnit.display.order,
                taskName: queuedUnit.display.taskName,
                inputUnitIdentity: queuedUnit.display.inputUnitIdentity,
                memberIdentities: Object.freeze(Array.from(new Set([
                    ...(queuedUnit.display.memberIdentities || []),
                    queuedUnit.display.inputUnitIdentity,
                ].filter((value) => Boolean(value))))),
                memberCount: Math.max(1, queuedUnit.display.memberCount ||
                    queuedUnit.display.memberIdentities?.length ||
                    0),
                createdAt: this.now(),
                ordinal: ++this.ordinalSequence,
                execute: () => config.executeUnit(queuedUnit.unit, Object.freeze({
                    submissionId,
                    submissionUnitId: queueId,
                    inputUnitIdentity: queuedUnit.display.inputUnitIdentity,
                    slot: this.createSlotCoordinator(controller, item),
                })),
                state: "pending",
                slotHeld: false,
            };
            controller.items.push(item);
            this.addPendingIndexes(item);
            this.emit(Object.freeze({
                type: "added",
                entry: this.toSnapshot(item),
            }));
            this.log("enqueue", {
                submissionId,
                queueId,
                unitId: item.unitId,
            });
        }
        this.scheduleDrain(controller);
        return Object.freeze({ submissionId, completion });
    }
    listQueued(scope) {
        const items = scope
            ? [...(this.queueIdsByBackend.get(backendKey(scope)) ?? [])]
                .map((queueId) => this.pendingByQueueId.get(queueId))
                .filter((item) => item !== undefined)
            : [...this.pendingByQueueId.values()];
        items.sort((left, right) => left.ordinal - right.ordinal);
        return Object.freeze(items.map((item) => this.toSnapshot(item)));
    }
    getActiveSubmission(submissionId) {
        const controller = this.submissions.get(submissionId);
        if (!controller || controller.completed) {
            return null;
        }
        const pendingItems = controller.items.filter((item) => item.state === "pending");
        const admittedItems = controller.items.filter((item) => (item.state === "admitted" ||
            item.state === "yielded" ||
            item.state === "resumption-pending") &&
            this.activeByQueueId.has(item.queueId));
        const units = [...pendingItems, ...admittedItems]
            .sort((left, right) => left.ordinal - right.ordinal)
            .map((item) => this.toActiveSubmissionUnitSnapshot(item));
        return Object.freeze({
            submissionId: controller.submissionId,
            workflowId: controller.workflow.workflowId,
            workflowLabel: controller.workflow.workflowLabel,
            backendType: controller.backend.backendType,
            backendId: controller.backend.backendId,
            submission: controller.display,
            total: controller.total,
            initiallySkipped: controller.initiallySkipped,
            pending: pendingItems.length,
            admitted: admittedItems.length,
            settled: controller.settled,
            units: Object.freeze(units),
        });
    }
    getSubmissionDisplayIdentity(submissionId) {
        return (this.submissions.get(submissionId)?.display ??
            null);
    }
    getSlotSnapshot(submissionUnitId) {
        const item = this.activeByQueueId.get(submissionUnitId);
        return item ? this.toSlotSnapshot(item) : null;
    }
    getSlotCoordinator(submissionUnitId) {
        const item = this.activeByQueueId.get(submissionUnitId);
        const controller = item ? this.submissions.get(item.submissionId) : null;
        return item && controller
            ? this.createSlotCoordinator(controller, item)
            : null;
    }
    hasActiveOrQueuedWorkflowInput(query) {
        return (this.queueIdsByIdentity.get(identityKey(query))?.size ?? 0) > 0;
    }
    cancel(queueId) {
        const item = this.pendingByQueueId.get(queueId);
        if (!item || item.state !== "pending") {
            return Object.freeze({ status: "not-pending", queueId });
        }
        item.state = "canceled";
        this.removePendingIndexes(item);
        this.emitRemoved(item, "canceled");
        this.log("cancel-pending", {
            submissionId: item.submissionId,
            queueId,
            unitId: item.unitId,
            reasonCode: "host-queue-canceled",
        });
        const controller = this.submissions.get(item.submissionId);
        if (controller) {
            this.settlePending(controller, {
                status: "skipped",
                reasonCode: "host-queue-canceled",
            });
        }
        return Object.freeze({ status: "canceled", queueId });
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    shutdown() {
        if (this.shuttingDown) {
            return;
        }
        this.shuttingDown = true;
        for (const item of [...this.pendingByQueueId.values()]) {
            if (item.state !== "pending") {
                continue;
            }
            item.state = "shutdown";
            this.removePendingIndexes(item);
            this.emitRemoved(item, "shutdown");
            this.log("shutdown-discard", {
                submissionId: item.submissionId,
                queueId: item.queueId,
                unitId: item.unitId,
                reasonCode: "host-queue-shutdown",
            });
            const controller = this.submissions.get(item.submissionId);
            if (controller) {
                this.settlePending(controller, {
                    status: "skipped",
                    reasonCode: "host-queue-shutdown",
                });
            }
        }
        for (const item of [...this.activeByQueueId.values()]) {
            this.cancelPendingResumption(item);
        }
        this.emit(Object.freeze({ type: "reset" }));
        this.pendingByQueueId.clear();
        this.activeByQueueId.clear();
        this.queueIdsByBackend.clear();
        this.queueIdsByIdentity.clear();
        this.submissions.clear();
        this.listeners.clear();
    }
    resetForTests() {
        this.shutdown();
        this.submissionSequence = 0;
        this.queueSequence = 0;
        this.ordinalSequence = 0;
        this.resumeOrdinalSequence = 0;
        this.displaySequence = 0;
        this.shuttingDown = false;
        this.piAdmissionBlocked = false;
    }
    nextSubmissionId() {
        if (this.createSubmissionIdOverride) {
            return this.createSubmissionIdOverride();
        }
        const sequence = (++this.submissionSequence).toString(36);
        return `workflow-submission-${Date.now().toString(36)}-${sequence}`;
    }
    nextQueueId() {
        if (this.createQueueIdOverride) {
            return this.createQueueIdOverride();
        }
        const sequence = (++this.queueSequence).toString(36);
        return `workflow-queue-${Date.now().toString(36)}-${sequence}`;
    }
    createDisplayIdentity(presentation) {
        const alphabet = WorkflowSubmissionQueue.SUBMISSION_SYMBOLS;
        let ordinal = ++this.displaySequence;
        let symbol = "";
        while (ordinal > 0) {
            const index = (ordinal - 1) % alphabet.length;
            symbol = `${alphabet[index]}${symbol}`;
            ordinal = Math.floor((ordinal - 1) / alphabet.length);
        }
        const normalize = (value) => String(value || "").trim() || "default";
        return Object.freeze({
            symbol,
            provider: normalize(presentation?.provider),
            model: normalize(presentation?.model),
        });
    }
    createSlotCoordinator(controller, item) {
        return Object.freeze({
            yield: (reason) => this.yieldSlot(controller, item, reason),
            ensureSlot: (reason) => this.ensureSlot(controller, item, reason),
            runWithPrioritySlot: async (reason, callback) => {
                const admitted = await this.ensureSlot(controller, item, reason);
                if (!admitted) {
                    return false;
                }
                await callback();
                return true;
            },
            cancelPendingResumption: () => this.cancelPendingResumption(item),
            snapshot: () => this.activeByQueueId.has(item.queueId)
                ? this.toSlotSnapshot(item)
                : null,
        });
    }
    yieldSlot(controller, item, reason) {
        if (controller.completed || item.state !== "admitted" || !item.slotHeld) {
            return false;
        }
        item.slotHeld = false;
        item.state = "yielded";
        item.yieldReason = reason;
        controller.active = Math.max(0, controller.active - 1);
        this.emitSlotChanged(item);
        this.log("yield", {
            submissionId: item.submissionId,
            queueId: item.queueId,
            unitId: item.unitId,
            reasonCode: reason,
        });
        this.scheduleDrain(controller);
        return true;
    }
    ensureSlot(controller, item, reason) {
        if (this.shuttingDown || controller.completed || item.state === "settled") {
            return Promise.resolve(false);
        }
        if (item.slotHeld && item.state === "admitted") {
            return Promise.resolve(true);
        }
        if (item.state === "resumption-pending" && item.resumePromise) {
            return item.resumePromise;
        }
        if (item.state !== "yielded") {
            return Promise.resolve(false);
        }
        item.state = "resumption-pending";
        item.resumeReason = reason;
        item.resumeOrdinal = ++this.resumeOrdinalSequence;
        item.resumePromise = new Promise((resolve) => {
            item.resolveResume = resolve;
        });
        this.emitSlotChanged(item);
        this.log("resume-queued", {
            submissionId: item.submissionId,
            queueId: item.queueId,
            unitId: item.unitId,
            reasonCode: reason,
        });
        this.scheduleDrain(controller);
        return item.resumePromise;
    }
    cancelPendingResumption(item) {
        if (item.state !== "resumption-pending") {
            return false;
        }
        item.state = "yielded";
        item.resumeOrdinal = undefined;
        item.resumeReason = undefined;
        const resolveResume = item.resolveResume;
        item.resolveResume = undefined;
        item.resumePromise = undefined;
        this.emitSlotChanged(item);
        resolveResume?.(false);
        return true;
    }
    toSlotSnapshot(item) {
        const state = item.slotHeld
            ? "held"
            : item.state === "resumption-pending"
                ? "resumption-pending"
                : item.state === "settled"
                    ? "settled"
                    : "yielded";
        return Object.freeze({
            submissionId: item.submissionId,
            submissionUnitId: item.queueId,
            state,
            ...(item.yieldReason ? { yieldReason: item.yieldReason } : {}),
            ...(item.resumeReason ? { resumeReason: item.resumeReason } : {}),
        });
    }
    addPendingIndexes(item) {
        this.pendingByQueueId.set(item.queueId, item);
        this.addIndex(this.queueIdsByBackend, backendKey(item.backend), item.queueId);
        for (const inputUnitIdentity of item.memberIdentities) {
            this.addIndex(this.queueIdsByIdentity, identityKey({
                workflowId: item.workflowId,
                inputUnitIdentity,
            }), item.queueId);
        }
    }
    /**
     * Recovered reservations are admitted, not pending, so they need the
     * duplicate-suppression identities without the pending queue entry.
     */
    addIdentityIndexes(item) {
        for (const inputUnitIdentity of item.memberIdentities) {
            this.addIndex(this.queueIdsByIdentity, identityKey({
                workflowId: item.workflowId,
                inputUnitIdentity,
            }), item.queueId);
        }
    }
    findReservationItem(submissionUnitId) {
        return this.activeByQueueId.get(submissionUnitId);
    }
    removePendingIndexes(item, options = {}) {
        this.pendingByQueueId.delete(item.queueId);
        this.removeIndex(this.queueIdsByBackend, backendKey(item.backend), item.queueId);
        if (!options.preserveIdentity) {
            this.removeIdentityIndexes(item);
        }
    }
    removeIdentityIndexes(item) {
        for (const inputUnitIdentity of item.memberIdentities) {
            this.removeIndex(this.queueIdsByIdentity, identityKey({
                workflowId: item.workflowId,
                inputUnitIdentity,
            }), item.queueId);
        }
    }
    addIndex(index, key, queueId) {
        const queueIds = index.get(key) ?? new Set();
        queueIds.add(queueId);
        index.set(key, queueIds);
    }
    removeIndex(index, key, queueId) {
        const queueIds = index.get(key);
        if (!queueIds) {
            return;
        }
        queueIds.delete(queueId);
        if (queueIds.size === 0) {
            index.delete(key);
        }
    }
    scheduleDrain(controller) {
        if (this.shuttingDown ||
            controller.completed ||
            controller.drainScheduled) {
            return;
        }
        controller.drainScheduled = true;
        this.scheduleMicrotask(() => {
            controller.drainScheduled = false;
            this.drain(controller);
        });
    }
    drain(controller) {
        if (this.shuttingDown || controller.completed) {
            return;
        }
        while (controller.active < controller.limit) {
            const item = controller.items
                .filter((candidate) => candidate.state === "resumption-pending")
                .sort((left, right) => (left.resumeOrdinal ?? 0) - (right.resumeOrdinal ?? 0))[0] ??
                controller.items.find((candidate) => candidate.state === "pending" && !candidate.recovered);
            if (!item) {
                break;
            }
            if (item.state === "resumption-pending") {
                item.state = "admitted";
                item.slotHeld = true;
                item.yieldReason = undefined;
                item.resumeOrdinal = undefined;
                controller.active += 1;
                const resolveResume = item.resolveResume;
                item.resolveResume = undefined;
                item.resumePromise = undefined;
                this.emitSlotChanged(item);
                this.log("resume-admit", {
                    submissionId: item.submissionId,
                    queueId: item.queueId,
                    unitId: item.unitId,
                    reasonCode: item.resumeReason,
                });
                item.resumeReason = undefined;
                resolveResume?.(true);
                continue;
            }
            item.state = "admitted";
            item.slotHeld = true;
            this.removePendingIndexes(item, { preserveIdentity: true });
            this.activeByQueueId.set(item.queueId, item);
            this.emitRemoved(item, "admitted");
            controller.active += 1;
            this.log("admit", {
                submissionId: item.submissionId,
                queueId: item.queueId,
                unitId: item.unitId,
            });
            void Promise.resolve()
                .then(item.execute)
                .catch((error) => {
                this.log("settle", {
                    submissionId: item.submissionId,
                    queueId: item.queueId,
                    unitId: item.unitId,
                    reasonCode: "host-queue-execution-error",
                }, error);
                return {
                    status: "failed",
                    reasonCode: "host-queue-execution-error",
                };
            })
                .then((outcome) => {
                this.settleAdmitted(controller, item, outcome);
            });
        }
        this.maybeComplete(controller);
    }
    settleAdmitted(controller, item, outcome) {
        if (item.state === "settled") {
            return;
        }
        this.cancelPendingResumption(item);
        item.state = "settled";
        this.activeByQueueId.delete(item.queueId);
        this.removeIdentityIndexes(item);
        if (item.slotHeld) {
            item.slotHeld = false;
            controller.active = Math.max(0, controller.active - 1);
        }
        controller.settled += 1;
        controller.outcomes.push(outcome);
        this.log("settle", {
            submissionId: item.submissionId,
            queueId: item.queueId,
            unitId: item.unitId,
            reasonCode: outcome.status === "succeeded" ? "succeeded" : outcome.reasonCode,
        });
        this.maybeComplete(controller);
        this.scheduleDrain(controller);
    }
    settlePending(controller, outcome) {
        controller.settled += 1;
        controller.outcomes.push(outcome);
        this.maybeComplete(controller);
    }
    maybeComplete(controller) {
        if (controller.completed || controller.settled !== controller.total) {
            return;
        }
        controller.completed = true;
        this.submissions.delete(controller.submissionId);
        const summary = summarize(controller.submissionId, controller.outcomes);
        controller.resolveCompletion(summary);
        try {
            controller.onTerminal?.(summary);
        }
        catch (error) {
            this.log("terminal-callback-error", {
                submissionId: controller.submissionId,
            }, error);
        }
    }
    toSnapshot(item) {
        return Object.freeze({
            queueId: item.queueId,
            submissionId: item.submissionId,
            unitId: item.unitId,
            unitOrder: item.unitOrder,
            workflowId: item.workflowId,
            workflowLabel: item.workflowLabel,
            taskName: item.taskName,
            memberCount: item.memberCount,
            backendType: item.backend.backendType,
            backendId: item.backend.backendId,
            createdAt: item.createdAt,
            canCancel: true,
            submission: this.submissions.get(item.submissionId)?.display ??
                Object.freeze({ symbol: "", provider: "default", model: "default" }),
        });
    }
    toActiveSubmissionUnitSnapshot(item) {
        const state = item.state === "admitted" ||
            item.state === "yielded" ||
            item.state === "resumption-pending"
            ? item.state
            : "pending";
        return Object.freeze({
            queueId: item.queueId,
            submissionId: item.submissionId,
            unitId: item.unitId,
            unitOrder: item.unitOrder,
            taskName: item.taskName,
            memberCount: item.memberCount,
            createdAt: item.createdAt,
            state,
            canCancel: state === "pending",
        });
    }
    emitRemoved(item, reason) {
        this.emit(Object.freeze({
            type: "removed",
            queueId: item.queueId,
            backend: item.backend,
            reason,
        }));
    }
    emitSlotChanged(item) {
        this.emit(Object.freeze({
            type: "slot-changed",
            queueId: item.queueId,
            backend: item.backend,
            state: this.toSlotSnapshot(item).state,
        }));
    }
    emit(event) {
        for (const listener of [...this.listeners]) {
            try {
                listener(event);
            }
            catch (error) {
                this.log("subscriber-error", {}, error);
            }
        }
    }
    log(operation, details, error) {
        this.appendRuntimeLog({
            level: error ? "warn" : "info",
            scope: "job",
            component: "workflow-submission-queue",
            operation,
            stage: "host-queue",
            message: `Workflow submission queue ${operation}`,
            details,
            ...(error === undefined ? {} : { error }),
        });
    }
}
export const workflowSubmissionQueue = new WorkflowSubmissionQueue();
