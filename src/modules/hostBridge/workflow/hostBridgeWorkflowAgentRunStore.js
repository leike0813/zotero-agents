import { assertSelectionRef } from "../../selectionContext";
import { compareAndSetPluginTaskContextEntry, deletePluginTaskContextDomain, deletePluginTaskContextEntry, getPluginTaskContextEntry, listPluginTaskContextEntries, upsertPluginTaskContextEntry, } from "../../pluginStateStore";
import { getTaskHistoryRetentionConfig } from "../../taskRetentionPolicy";
const DOMAIN = "host-bridge-agent-runs";
const RETENTION_MS = getTaskHistoryRetentionConfig().retentionMs;
let sequence = 0;
function nowIso() {
    return new Date().toISOString();
}
function futureIso(from, durationMs = RETENTION_MS) {
    return new Date(Date.parse(from) + durationMs).toISOString();
}
function createAgentRunId() {
    sequence += 1;
    const random = Math.random().toString(36).slice(2, 10);
    return `agent-run-${Date.now().toString(36)}-${sequence.toString(36)}-${random}`;
}
function parseRecord(payload) {
    try {
        const record = JSON.parse(payload);
        return record?.agentRunId && record?.workflowId ? record : null;
    }
    catch {
        return null;
    }
}
function isCompletePortableItemRef(value) {
    try {
        assertSelectionRef(value);
        return true;
    }
    catch {
        return false;
    }
}
export function hasCompleteHostBridgeWorkflowSelection(selection) {
    if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
        return false;
    }
    const value = selection;
    if (value.kind === "none" &&
        Object.keys(value).length === 1 &&
        Object.prototype.hasOwnProperty.call(value, "kind")) {
        return true;
    }
    return (value.kind === "items" &&
        Object.keys(value).length === 2 &&
        Object.prototype.hasOwnProperty.call(value, "kind") &&
        Object.prototype.hasOwnProperty.call(value, "items") &&
        Array.isArray(value.items) &&
        value.items.length > 0 &&
        value.items.every(isCompletePortableItemRef));
}
function entryFor(record) {
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
function readRecord(agentRunId) {
    cleanupRetained();
    const entry = getPluginTaskContextEntry(DOMAIN, agentRunId);
    return entry ? parseRecord(entry.payload) : null;
}
function writeRecord(record) {
    upsertPluginTaskContextEntry(DOMAIN, entryFor(record));
    return record;
}
function transition(args) {
    const current = readRecord(args.agentRunId);
    if (!current || !args.expectedStates.includes(current.state))
        return null;
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
export function createHostBridgeAgentRunRecord(args) {
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
function markExpired(record) {
    if (record.state !== "prepared" ||
        Date.parse(record.expiresAt) > Date.now()) {
        return record;
    }
    return (transition({
        agentRunId: record.agentRunId,
        expectedStates: ["prepared"],
        mutate: (current) => ({ ...current, state: "expired" }),
    }) || record);
}
export function getHostBridgeAgentRunRecord(agentRunId) {
    const record = readRecord(agentRunId);
    if (!record)
        return null;
    const current = markExpired(record);
    return current.state === "expired" ? null : current;
}
export function getExpiredHostBridgeAgentRunRecord(agentRunId) {
    const record = readRecord(agentRunId);
    if (!record)
        return null;
    const current = markExpired(record);
    return current.state === "expired" ? current : null;
}
export function acquireHostBridgeAgentRunApplyLease(agentRunId) {
    return transition({
        agentRunId,
        expectedStates: ["prepared"],
        mutate: (record) => ({ ...record, state: "preflighting" }),
    });
}
export function releaseHostBridgeAgentRunApplyLease(agentRunId) {
    return transition({
        agentRunId,
        expectedStates: ["preflighting"],
        mutate: (record) => ({ ...record, state: "prepared" }),
    });
}
export function sealHostBridgeAgentRunRecord(agentRunId) {
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
export function renewHostBridgeAgentRunRecord(agentRunId) {
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
export function abandonHostBridgeAgentRunRecord(agentRunId) {
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
export function finishHostBridgeAgentRunRecord(args) {
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
export function recordHostBridgeAgentRunApplyReceipt(agentRunId, receipt) {
    const record = readRecord(agentRunId);
    if (!record)
        return null;
    const updatedAt = nowIso();
    const applyReceipt = {
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
export function getHostBridgeAgentRunApplyReceipt(agentRunId) {
    const record = readRecord(agentRunId);
    if (!record)
        return null;
    return (record.applyReceipt || {
        schema: "host-bridge.agent-apply-receipt.v2",
        agentRunId: record.agentRunId,
        workflowId: record.workflowId,
        status: "preflight",
        updatedAt: record.createdAt,
        stateChange: "unchanged",
        handleConsumption: record.sealedAt ? "consumed" : "unconsumed",
        recoverable: !record.sealedAt,
        results: [],
    });
}
export function recoverHostBridgeAgentRunStoreAfterRestart() {
    for (const entry of listPluginTaskContextEntries(DOMAIN)) {
        const record = parseRecord(entry.payload);
        if (!record)
            continue;
        if (record.state === "preflighting") {
            releaseHostBridgeAgentRunApplyLease(record.agentRunId);
        }
        else if (record.state === "applying") {
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
                        results: current.applyReceipt?.results.map((result) => result.status === "pending"
                            ? { ...result, status: "unknown" }
                            : result) || [],
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
