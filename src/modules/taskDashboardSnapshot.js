import { BACKEND_TYPES, PASS_THROUGH_BACKEND_TYPE, } from "../config/defaults";
function cloneBackend(backend) {
    return {
        ...backend,
        auth: {
            ...(backend.auth || { kind: "none" }),
        },
    };
}
function toTime(input) {
    const parsed = Date.parse(String(input || ""));
    return Number.isFinite(parsed) ? parsed : 0;
}
function normalizeBackendKey(record) {
    const id = String(record.backendId || "").trim();
    const type = String(record.backendType || "").trim();
    const baseUrl = String(record.backendBaseUrl || "").trim();
    return { id, type, baseUrl };
}
function normalizeBackendType(value) {
    const normalized = String(value || "").trim();
    return BACKEND_TYPES.includes(normalized)
        ? normalized
        : null;
}
function appendSyntheticBackend(map, record) {
    const normalized = normalizeBackendKey(record);
    const type = normalizeBackendType(normalized.type);
    if (!normalized.id ||
        !type ||
        type === PASS_THROUGH_BACKEND_TYPE ||
        map.has(normalized.id)) {
        return;
    }
    map.set(normalized.id, {
        id: normalized.id,
        type,
        baseUrl: normalized.baseUrl || "unknown://backend",
        auth: { kind: "none" },
    });
}
export function normalizeDashboardBackends(args) {
    const map = new Map();
    for (const backend of args.configured) {
        if (backend.type === PASS_THROUGH_BACKEND_TYPE) {
            continue;
        }
        map.set(backend.id, cloneBackend(backend));
    }
    return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
}
function mergeRecordMap(target, record) {
    const existing = target.get(record.id);
    if (!existing) {
        target.set(record.id, record);
        return;
    }
    if (toTime(record.updatedAt) >= toTime(existing.updatedAt)) {
        target.set(record.id, record);
    }
}
export function mergeDashboardTaskRows(args) {
    const normalizedBackendId = String(args.backendId || "").trim();
    const merged = new Map();
    for (const row of args.history) {
        if (row.backendId !== normalizedBackendId) {
            continue;
        }
        mergeRecordMap(merged, { ...row });
    }
    for (const row of args.active) {
        if (row.backendId !== normalizedBackendId) {
            continue;
        }
        mergeRecordMap(merged, { ...row });
    }
    return Array.from(merged.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function projectDashboardQueuedRows(args) {
    if (args.backend.type !== "acp" && args.backend.type !== "skillrunner") {
        return [];
    }
    return args.queued
        .filter((entry) => entry.backendId === args.backend.id &&
        entry.backendType === args.backend.type)
        .map((entry) => ({
        id: `host-queue:${entry.queueId}`,
        rowKind: "host-queued-workflow-unit",
        queueId: entry.queueId,
        workflowId: entry.workflowId,
        workflowLabel: entry.workflowLabel,
        backendId: entry.backendId,
        backendType: entry.backendType,
        backendLabel: args.backend.displayName || entry.backendId,
        taskName: entry.taskName,
        state: "queued",
        stateSemantics: {
            normalized: "queued",
            terminal: false,
            waiting: false,
        },
        stateLabel: args.queuedStateLabel,
        createdAt: entry.createdAt,
        updatedAt: entry.createdAt,
    }));
}
export function normalizeDashboardTabKey(args) {
    const requested = String(args.requestedTabKey || "").trim();
    if (requested === "home" ||
        requested === "products" ||
        requested === "workflow-options" ||
        requested === "runtime-logs") {
        return requested;
    }
    if (args.debugModeEnabled === true &&
        args.synthesisSidecarDiagnosticsEnabled === true &&
        requested === "synthesis-sidecar") {
        return requested;
    }
    if (args.debugModeEnabled === true &&
        args.skillRunnerConnectionAuditEnabled === true &&
        requested === "skillrunner-connection-audit") {
        return requested;
    }
    const diagnosticsEnabled = args.debugModeEnabled === true &&
        (args.acpTraceRecorderEnabled === true ||
            args.acpReplayProfilerEnabled === true);
    if (diagnosticsEnabled &&
        (requested === "acp-trace-replay" ||
            (requested === "acp-trace-recorder" &&
                args.acpTraceRecorderEnabled === true) ||
            (requested === "acp-replay-profiler" &&
                args.acpReplayProfilerEnabled === true))) {
        return "acp-trace-replay";
    }
    if (requested.startsWith("backend:")) {
        const backendId = requested.slice("backend:".length);
        if (args.backends.some((entry) => entry.id === backendId)) {
            return requested;
        }
    }
    return "home";
}
