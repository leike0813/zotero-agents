const GRANT_TTL_MS = 24 * 60 * 60 * 1000;
const grants = new Map();
let acpSkillRunAutoApprovalResolver = () => false;
function normalizeString(value) {
    return String(value || "").trim();
}
function randomGrantId() {
    const bytes = new Uint8Array(16);
    const crypto = globalThis.crypto;
    if (typeof crypto?.getRandomValues !== "function") {
        throw new Error("Secure randomness is unavailable for Host Bridge write grant");
    }
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}
function cleanupExpired(now = Date.now()) {
    for (const [grantId, grant] of grants) {
        if (grant.expiresAt <= now)
            grants.delete(grantId);
    }
}
export function issueHostBridgeWriteAutoApprovalGrant(args) {
    cleanupExpired();
    revokeHostBridgeWriteAutoApprovalGrantsForRun(args.requestId);
    const grant = {
        grantId: randomGrantId(),
        requestId: normalizeString(args.requestId),
        runId: normalizeString(args.runId) || undefined,
        connectionMode: "local",
        expiresAt: Date.now() + GRANT_TTL_MS,
    };
    if (!grant.requestId)
        throw new Error("Host Bridge write grant requires requestId");
    grants.set(grant.grantId, grant);
    return grant.grantId;
}
export function revokeHostBridgeWriteAutoApprovalGrant(grantId) {
    return grants.delete(normalizeString(grantId));
}
export function revokeHostBridgeWriteAutoApprovalGrantsForRun(requestId) {
    const normalized = normalizeString(requestId);
    for (const [grantId, grant] of grants) {
        if (grant.requestId === normalized || grant.runId === normalized) {
            grants.delete(grantId);
        }
    }
}
export function registerAcpSkillRunAutoApprovalResolver(resolver) {
    acpSkillRunAutoApprovalResolver = resolver;
}
export function isHostBridgeWriteAutoApprovalScope(scope) {
    cleanupExpired();
    if (!scope?.autoApproveWrites ||
        scope.kind !== "acp-skill-run" ||
        scope.connectionMode !== "local") {
        return false;
    }
    const grant = grants.get(normalizeString(scope.grantId));
    const requestId = normalizeString(scope.requestId);
    const runId = normalizeString(scope.runId);
    return !!(grant &&
        grant.requestId === requestId &&
        (!grant.runId || grant.runId === runId) &&
        acpSkillRunAutoApprovalResolver(requestId));
}
export function resetHostBridgeWriteAutoApprovalScopesForTests() {
    grants.clear();
}
export const hostBridgeWriteAutoApprovalInternalsForTests = {
    GRANT_TTL_MS,
    cleanupExpired,
};
