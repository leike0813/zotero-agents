export type BackgroundRefreshTimerPolicy = {
  owner: string;
  activationCondition: string;
  scopeKey: string;
  allowedDataSources: string[];
  maxReadShape: string;
  requiresForegroundSurface: boolean;
  minimumIntervalMs: number;
  intervalMs?: number;
  exemptionReason?: string;
};

export type BackgroundRefreshReadShape =
  | "scope-gate"
  | "dirty-gate"
  | "cache-hit"
  | "active-summary"
  | "history-summary"
  | "metadata-count"
  | "model-build"
  | "scoped-history-rows"
  | "full-history-rows"
  | "selected-detail"
  | "service-state";

export type BackgroundRefreshReadDiagnostic = {
  owner: string;
  surface?: string;
  scopeKey?: string;
  readShape: BackgroundRefreshReadShape;
  at: number;
};

const policies = new Map<string, BackgroundRefreshTimerPolicy>();
const readDiagnostics: BackgroundRefreshReadDiagnostic[] = [];

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeIntervalMs(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 0;
}

function normalizePolicy(
  policy: BackgroundRefreshTimerPolicy,
): BackgroundRefreshTimerPolicy {
  const owner = normalizeString(policy.owner);
  if (!owner) {
    throw new Error("background refresh timer policy requires owner");
  }
  const allowedDataSources = Array.from(
    new Set(
      (policy.allowedDataSources || [])
        .map((entry) => normalizeString(entry))
        .filter(Boolean),
    ),
  );
  if (allowedDataSources.length === 0 && !policy.exemptionReason) {
    throw new Error(
      `background refresh timer policy ${owner} requires allowed data sources`,
    );
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

export function registerBackgroundRefreshTimer(
  policy: BackgroundRefreshTimerPolicy,
) {
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

export function recordBackgroundRefreshRead(
  diagnostic: Omit<BackgroundRefreshReadDiagnostic, "at">,
) {
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
