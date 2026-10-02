import { upsertAcpSkillRun, } from "./acpSkillRunStore";
import { AcpPermissionQueue } from "./acpPermissionQueue";
import { ensureAcpSkillRunStoreHydrated } from "./acpSkillRunPersistence";
import { registerAcpSkillRunPermissionRequestHandler, } from "./acpSkillRunPermissionFacade";
import { acpSkillRunPermissionQueuesByRunRequestId as permissionQueuesByRunRequestId, acpSkillRunRecords as runRecords, normalizeString, nowIso, } from "./acpSkillRunState";
function normalizeAcpSkillRunPermissionRequestDetails(request, permissionRequestId) {
    return {
        permissionRequestId,
        toolCallId: normalizeString(request.toolCallId),
        toolTitle: normalizeString(request.toolTitle),
        source: normalizeString(request.source) || undefined,
        summary: normalizeString(request.summary) || normalizeString(request.toolTitle),
    };
}
function normalizeAcpSkillRunPendingPermission(request, permissionRequestId) {
    return {
        requestId: permissionRequestId,
        sessionId: normalizeString(request.sessionId),
        toolCallId: normalizeString(request.toolCallId),
        toolTitle: normalizeString(request.toolTitle),
        approvalKind: request.approvalKind,
        source: normalizeString(request.source) || undefined,
        summary: normalizeString(request.summary) || undefined,
        detail: normalizeString(request.detail) || undefined,
        requestedAt: normalizeString(request.requestedAt) || nowIso(),
        options: Array.isArray(request.options)
            ? request.options.map((option) => ({ ...option }))
            : [],
    };
}
function acpSkillRunPermissionRequestedMessage(request, permissionRequestId) {
    return `Permission requested: ${normalizeString(request.toolTitle) || permissionRequestId}`;
}
export function setAcpSkillRunPermissionRequest(runRequestIdRaw, request) {
    const runRequestId = normalizeString(runRequestIdRaw);
    const permissionRequestId = normalizeString(request.requestId);
    if (!runRequestId || !permissionRequestId) {
        return;
    }
    const queue = permissionQueuesByRunRequestId.get(runRequestId) ||
        new AcpPermissionQueue();
    permissionQueuesByRunRequestId.set(runRequestId, queue);
    if (!queue.enqueue(request)) {
        return;
    }
    const active = queue.active();
    upsertAcpSkillRun({
        requestId: runRequestId,
        status: "running",
        statusReason: "start",
        pendingPermission: active
            ? normalizeAcpSkillRunPendingPermission(active, active.requestId)
            : null,
        event: {
            stage: "permission-requested",
            message: acpSkillRunPermissionRequestedMessage(request, permissionRequestId),
            level: "warn",
            details: normalizeAcpSkillRunPermissionRequestDetails(request, permissionRequestId),
        },
    });
}
registerAcpSkillRunPermissionRequestHandler(setAcpSkillRunPermissionRequest);
export function autoApproveAcpSkillRunPermissionRequest(args) {
    const runRequestId = normalizeString(args.runRequestId);
    const permissionRequestId = normalizeString(args.request.requestId);
    const optionId = normalizeString(args.optionId);
    if (!runRequestId || !permissionRequestId || !optionId) {
        return false;
    }
    const details = normalizeAcpSkillRunPermissionRequestDetails(args.request, permissionRequestId);
    args.request.resolve({
        outcome: "selected",
        optionId,
    });
    upsertAcpSkillRun({
        requestId: runRequestId,
        status: "running",
        statusReason: "start",
        pendingPermission: null,
        event: {
            stage: "permission-requested",
            message: acpSkillRunPermissionRequestedMessage(args.request, permissionRequestId),
            level: "info",
            details,
        },
    });
    upsertAcpSkillRun({
        requestId: runRequestId,
        status: "running",
        statusReason: "start",
        pendingPermission: null,
        event: {
            stage: "permission-resolved",
            message: `Permission option selected: ${optionId}`,
            level: "info",
            details: {
                ...details,
                outcome: "selected",
                optionId,
            },
        },
    });
    return true;
}
function findStaleAcpSkillRunPermissionRequest(args) {
    ensureAcpSkillRunStoreHydrated();
    const runRequestId = normalizeString(args.runRequestId);
    const permissionRequestId = normalizeString(args.permissionRequestId);
    if (!runRequestId && !permissionRequestId) {
        return null;
    }
    const candidates = runRequestId
        ? [runRecords.get(runRequestId)].filter((entry) => !!entry)
        : Array.from(runRecords.values());
    for (const record of candidates) {
        const pending = record.pendingPermission;
        if (!pending) {
            continue;
        }
        const pendingRequestId = normalizeString(pending.requestId);
        if (!pendingRequestId) {
            continue;
        }
        if (permissionRequestId && pendingRequestId !== permissionRequestId) {
            continue;
        }
        if (permissionQueuesByRunRequestId.get(record.requestId)?.active()
            ?.requestId === pendingRequestId) {
            continue;
        }
        return {
            record,
            pending,
            permissionRequestId: pendingRequestId,
        };
    }
    return null;
}
export function clearStaleAcpSkillRunPermissionRequest(args) {
    const stale = findStaleAcpSkillRunPermissionRequest(args);
    if (!stale) {
        return false;
    }
    const recoverableStatus = new Set([
        "running",
        "repairing",
    ]).has(stale.record.status)
        ? "waiting_user"
        : stale.record.status;
    upsertAcpSkillRun({
        requestId: stale.record.requestId,
        status: recoverableStatus,
        statusReason: recoverableStatus === stale.record.status ? undefined : "waiting_user",
        activePrompt: false,
        pendingPermission: null,
        replyState: "idle",
        event: {
            stage: "permission-resolved",
            message: "Permission request expired after reconnect; no live approval handler is available.",
            level: "warn",
            details: {
                permissionRequestId: stale.permissionRequestId,
                outcome: "cancelled",
                reason: args.reason,
                toolCallId: normalizeString(stale.pending.toolCallId),
                toolTitle: normalizeString(stale.pending.toolTitle),
                source: normalizeString(stale.pending.source) || undefined,
                summary: normalizeString(stale.pending.summary) ||
                    normalizeString(stale.pending.toolTitle),
            },
        },
    });
    return true;
}
export function resolveAcpSkillRunPermissionRequest(args) {
    const runRequestId = normalizeString(args.runRequestId);
    const permissionRequestId = normalizeString(args.permissionRequestId);
    const matchedRunRequestId = runRequestId ||
        Array.from(permissionQueuesByRunRequestId.entries()).find(([, queue]) => queue.active()?.requestId === permissionRequestId)?.[0] ||
        "";
    const queue = permissionQueuesByRunRequestId.get(matchedRunRequestId);
    const active = queue?.active() || null;
    if (!queue || !active) {
        if (clearStaleAcpSkillRunPermissionRequest({
            runRequestId,
            permissionRequestId,
            reason: "resolve_without_live_handler",
        })) {
            return;
        }
        const record = runRequestId ? runRecords.get(runRequestId) : undefined;
        if (record && !record.pendingPermission) {
            return;
        }
        throw new Error("No active ACP skill run permission request is available.");
    }
    if (permissionRequestId && active.requestId !== permissionRequestId) {
        throw new Error("The requested ACP skill run permission is not the active request.");
    }
    const outcome = args.outcome === "selected" && normalizeString(args.optionId)
        ? {
            outcome: "selected",
            optionId: normalizeString(args.optionId),
        }
        : { outcome: "cancelled" };
    const resolved = queue.resolveActive(permissionRequestId, outcome);
    if (!resolved) {
        throw new Error("The requested ACP skill run permission is not the active request.");
    }
    const next = queue.active();
    if (!next) {
        permissionQueuesByRunRequestId.delete(matchedRunRequestId);
    }
    upsertAcpSkillRun({
        requestId: matchedRunRequestId,
        pendingPermission: next
            ? normalizeAcpSkillRunPendingPermission(next, next.requestId)
            : null,
        event: {
            stage: "permission-resolved",
            message: outcome.outcome === "selected"
                ? `Permission option selected: ${outcome.optionId}`
                : "Permission request cancelled.",
            level: outcome.outcome === "selected" ? "info" : "warn",
            details: {
                permissionRequestId: resolved.requestId,
                outcome: outcome.outcome,
                optionId: outcome.outcome === "selected" ? outcome.optionId : undefined,
            },
        },
    });
}
