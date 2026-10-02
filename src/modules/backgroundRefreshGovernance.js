const policies = new Map();
const readDiagnostics = [];
function normalizeString(value) {
    return String(value || "").trim();
}
function normalizeIntervalMs(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return 0;
    }
    const normalized = Math.floor(value);
    return normalized > 0 ? normalized : 0;
}
function normalizePolicy(policy) {
    const owner = normalizeString(policy.owner);
    if (!owner) {
        throw new Error("background refresh timer policy requires owner");
    }
    const allowedDataSources = Array.from(new Set((policy.allowedDataSources || [])
        .map((entry) => normalizeString(entry))
        .filter(Boolean)));
    if (allowedDataSources.length === 0 && !policy.exemptionReason) {
        throw new Error(`background refresh timer policy ${owner} requires allowed data sources`);
    }
    return {
        owner,
        activationCondition: normalizeString(policy.activationCondition),
        scopeKey: normalizeString(policy.scopeKey),
        allowedDataSources,
        maxReadShape: normalizeString(policy.maxReadShape),
        requiresForegroundSurface: policy.requiresForegroundSurface === true,
        minimumIntervalMs: normalizeIntervalMs(policy.minimumIntervalMs),
        intervalMs: normalizeIntervalMs(policy.intervalMs) || undefined,
        exemptionReason: normalizeString(policy.exemptionReason) || undefined,
    };
}
export function registerBackgroundRefreshTimer(policy) {
    const normalized = normalizePolicy(policy);
    policies.set(normalized.owner, normalized);
    return normalized;
}
export function getBackgroundRefreshGovernanceSnapshotForTests() {
    return Array.from(policies.values())
        .map((entry) => ({
        ...entry,
        allowedDataSources: [...entry.allowedDataSources],
    }))
        .sort((a, b) => a.owner.localeCompare(b.owner));
}
export function recordBackgroundRefreshRead(diagnostic) {
    const entry = {
        owner: normalizeString(diagnostic.owner),
        surface: normalizeString(diagnostic.surface) || undefined,
        scopeKey: normalizeString(diagnostic.scopeKey) || undefined,
        readShape: diagnostic.readShape,
        at: Date.now(),
    };
    if (!entry.owner) {
        return entry;
    }
    readDiagnostics.push(entry);
    if (readDiagnostics.length > 500) {
        readDiagnostics.splice(0, readDiagnostics.length - 500);
    }
    return entry;
}
export function getBackgroundRefreshReadDiagnosticsForTests() {
    return readDiagnostics.map((entry) => ({ ...entry }));
}
export function resetBackgroundRefreshGovernanceForTests() {
    policies.clear();
    readDiagnostics.length = 0;
}
