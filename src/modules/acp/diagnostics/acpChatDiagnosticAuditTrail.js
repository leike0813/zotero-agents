import { createRuntimeAuditAppendQueue } from "../../runtimeAuditAppendQueue";
import { isDebugModeEnabled } from "../../debugMode";
import { appendRuntimeLog } from "../../runtimeLogManager";
import { appendRuntimeTextFile } from "../../runtimePersistence";
const ACP_CHAT_DIAGNOSTIC_AUDIT_SCHEMA = "zotero-skills.acp-chat.diagnostic.v1";
const discardedOwners = new Set();
function normalizeString(value) {
    return String(value || "").trim();
}
export function acpChatDiagnosticAuditOwnerKey(backendIdRaw, conversationIdRaw) {
    const backendId = normalizeString(backendIdRaw);
    const conversationId = normalizeString(conversationIdRaw);
    return backendId && conversationId ? `${backendId}\n${conversationId}` : "";
}
export function activateAcpChatDiagnosticAuditOwner(ownerKey) {
    const normalizedOwner = normalizeString(ownerKey);
    if (normalizedOwner) {
        discardedOwners.delete(normalizedOwner);
    }
}
function coordinatorOwner(ownerKey) {
    return `acp-chat-diagnostic\n${ownerKey}`;
}
function auditKey(ownerKey, path) {
    return `${coordinatorOwner(ownerKey)}\n${path}`;
}
function recordAuditWarning(args) {
    try {
        appendRuntimeLog({
            level: "warn",
            scope: "provider",
            providerId: "acp",
            requestId: args.requestId,
            component: "acp-chat-diagnostic-audit",
            operation: "write",
            stage: args.stage,
            message: args.message,
            details: {
                ownerKey: args.ownerKey,
                ...(args.details && typeof args.details === "object"
                    ? args.details
                    : {}),
            },
            error: args.error,
        });
    }
    catch {
        // Diagnostic evidence cannot fail the owning chat session.
    }
}
const auditCore = createRuntimeAuditAppendQueue({
    sink: async ({ path, lines }) => {
        await appendRuntimeTextFile(path, lines.join(""));
    },
    log: (event) => {
        if (event.kind === "overflow") {
            recordAuditWarning({
                ownerKey: event.owner,
                requestId: event.requestId,
                stage: "audit-buffer-overflow",
                message: "ACP Chat diagnostic audit buffer dropped pending evidence.",
                details: {
                    droppedEntries: event.droppedEntries,
                    droppedBytes: event.droppedBytes,
                    overflowEpisode: event.overflowEpisode,
                },
            });
            return;
        }
        recordAuditWarning({
            ownerKey: event.owner,
            requestId: event.requestId,
            stage: "audit-batch-append-failed",
            message: "ACP Chat diagnostic audit append failed.",
            error: event.error,
        });
    },
});
export function appendAcpChatDiagnosticAudit(args) {
    const ownerKey = normalizeString(args.ownerKey);
    const path = normalizeString(args.path);
    if (!isDebugModeEnabled() ||
        !ownerKey ||
        !path ||
        discardedOwners.has(ownerKey)) {
        return;
    }
    const line = `${JSON.stringify({
        schema: ACP_CHAT_DIAGNOSTIC_AUDIT_SCHEMA,
        source: "acp-chat-diagnostic",
        backendId: normalizeString(args.backendId) || undefined,
        conversationId: normalizeString(args.conversationId) || undefined,
        ...args.entry,
    })}\n`;
    auditCore.append({
        key: auditKey(ownerKey, path),
        coordinatorOwner: coordinatorOwner(ownerKey),
        owner: ownerKey,
        path,
        requestId: args.requestId,
        line,
    });
}
function resolveCoreOwner(ownerKey) {
    const normalizedOwner = normalizeString(ownerKey);
    if (typeof ownerKey !== "undefined" && !normalizedOwner) {
        return null;
    }
    return typeof ownerKey === "undefined" ? undefined : normalizedOwner;
}
export async function flushAcpChatDiagnosticAudit(ownerKey) {
    const owner = resolveCoreOwner(ownerKey);
    if (owner === null) {
        return;
    }
    await auditCore.flush(owner);
}
export async function releaseAcpChatDiagnosticAudit(ownerKey) {
    const owner = resolveCoreOwner(ownerKey);
    if (owner === null) {
        return;
    }
    await auditCore.release(owner);
}
export async function discardAcpChatDiagnosticAudit(ownerKey) {
    const normalizedOwner = normalizeString(ownerKey);
    if (!normalizedOwner) {
        return;
    }
    discardedOwners.add(normalizedOwner);
    await auditCore.discardAndWait(normalizedOwner);
}
export async function resetAcpChatDiagnosticAuditForTests() {
    await releaseAcpChatDiagnosticAudit();
    discardedOwners.clear();
}
export function discardAllAcpChatDiagnosticAuditsForTests() {
    auditCore.discardAll();
    discardedOwners.clear();
}
