import type { BackendInstance } from "../../../backends/types";
import { computeAcpBackendConfigFingerprint } from "../../../backends/identity";

export type AcpReasoningSource = "explicit" | "none";

export type AcpReasoningEffort = {
  id: string;
  label: string;
  description?: string;
};

export type AcpReasoningCatalog = {
  state: "unknown" | "ready";
  modelId: string;
  modeId: string;
  reasoningSource: AcpReasoningSource;
  reasoningEfforts: AcpReasoningEffort[];
  currentReasoningEffortId: string;
};

// Matches the existing runtime option catalog staleness rule in providers/profile.ts.
export const ACP_RUNTIME_OPTIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function pickRawString(primary: unknown, fallback: unknown) {
  return typeof primary === "string" && primary.length > 0
    ? primary
    : normalizeString(fallback);
}

function normalizeReasoningSource(value: unknown): AcpReasoningSource | null {
  return value === "explicit" || value === "none" ? value : null;
}

function normalizeEfforts(value: unknown): AcpReasoningEffort[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry) => !!entry && typeof entry === "object")
    .map((entry) => {
      const source = entry as Record<string, unknown>;
      const id = normalizeString(source.id);
      const description = normalizeString(source.description);
      return {
        id,
        label: normalizeString(source.label) || id,
        ...(description ? { description } : {}),
      };
    })
    .filter((entry) => entry.id && entry.label);
}

function isFreshTimestamp(value: unknown) {
  const ms = Date.parse(normalizeString(value));
  return (
    Number.isFinite(ms) && Date.now() - ms <= ACP_RUNTIME_OPTIONS_CACHE_TTL_MS
  );
}

/**
 * Resolves reasoning options for one model/mode context.
 * A context entry wins over the legacy cache; the legacy fields only prove the
 * exact recorded current context and never another model.
 */
export function resolveAcpReasoningCatalog(args: {
  backend: BackendInstance;
  options?: Record<string, unknown>;
}): AcpReasoningCatalog {
  const options = args.options || {};
  const cache = args.backend.acp?.runtimeOptionsCache;
  const modelId = pickRawString(options.acpModelId, cache?.currentRawModelId);
  const modeId = pickRawString(options.acpModeId, cache?.currentModeId);
  const unknown = (): AcpReasoningCatalog => ({
    state: "unknown",
    modelId,
    modeId,
    reasoningSource: "none",
    reasoningEfforts: [],
    currentReasoningEffortId: "",
  });
  if (!cache) {
    return unknown();
  }
  // A cache the backend already marked stale or unavailable cannot answer for the
  // current configuration; leaving it unknown is what triggers a fresh probe.
  if (cache.status === "stale" || cache.status === "unavailable") {
    return unknown();
  }
  const fingerprint = computeAcpBackendConfigFingerprint(args.backend);
  const revision =
    normalizeString(cache.revision) || normalizeString(cache.refreshedAt);
  const entries = Array.isArray(cache.reasoningCatalogs)
    ? cache.reasoningCatalogs
    : [];
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const source = normalizeReasoningSource(entry.reasoningSource);
    if (
      !source ||
      normalizeString(entry.modelId) !== modelId ||
      normalizeString(entry.modeId) !== modeId ||
      normalizeString(entry.configFingerprint) !== fingerprint ||
      !revision ||
      normalizeString(entry.revision) !== revision ||
      !isFreshTimestamp(entry.refreshedAt)
    ) {
      continue;
    }
    return {
      state: "ready",
      modelId,
      modeId,
      reasoningSource: source,
      reasoningEfforts:
        source === "explicit" ? normalizeEfforts(entry.reasoningEfforts) : [],
      currentReasoningEffortId:
        source === "explicit"
          ? normalizeString(entry.currentReasoningEffortId)
          : "",
    };
  }
  // Only the legacy fields need a passed connection test for the same backend
  // configuration: a targeted probe records fresh context evidence without
  // touching the connection test.
  const connectionFingerprint = normalizeString(
    args.backend.acp?.connectionTest?.configFingerprint,
  );
  if (connectionFingerprint && connectionFingerprint !== fingerprint) {
    return unknown();
  }
  const legacySource = normalizeReasoningSource(cache.reasoningSource);
  if (
    legacySource &&
    isFreshTimestamp(cache.refreshedAt) &&
    modelId === normalizeString(cache.currentRawModelId) &&
    modeId === normalizeString(cache.currentModeId)
  ) {
    return {
      state: "ready",
      modelId,
      modeId,
      reasoningSource: legacySource,
      reasoningEfforts:
        legacySource === "explicit"
          ? normalizeEfforts(cache.reasoningEfforts)
          : [],
      currentReasoningEffortId:
        legacySource === "explicit"
          ? normalizeString(cache.currentReasoningEffortId)
          : "",
    };
  }
  return unknown();
}
