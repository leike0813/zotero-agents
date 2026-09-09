import type { BackendInstance } from "./types";

export const MANAGED_LOCAL_BACKEND_ID = "local-skillrunner-backend";

export function normalizeManagedLocalBackendId(value: unknown) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized === MANAGED_LOCAL_BACKEND_ID
    ? MANAGED_LOCAL_BACKEND_ID
    : normalized;
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function fnv1a32(input: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function computeAcpBackendConfigFingerprint(backend: BackendInstance) {
  const normalizeArray = (value: unknown) =>
    Array.isArray(value)
      ? value.map((entry) => normalizeString(entry)).filter(Boolean)
      : [];
  const env =
    backend.env &&
    typeof backend.env === "object" &&
    !Array.isArray(backend.env)
      ? Object.fromEntries(
          Object.entries(backend.env)
            .map(([key, value]) => [
              normalizeString(key),
              normalizeString(value),
            ])
            .filter(([key, value]) => key && value),
        )
      : {};
  return `acp-${fnv1a32(
    stableJson({
      command: normalizeString(backend.command),
      args: normalizeArray(backend.args),
      env,
      agentFamily: normalizeString(backend.acp?.agentFamily),
      skillRoots: normalizeArray(backend.acp?.skillRoots),
    }),
  )}`;
}

export function isAcpBackendConnectionTestPassed(backend: BackendInstance) {
  const test = backend.acp?.connectionTest;
  return (
    test?.status === "passed" &&
    normalizeString(test.configFingerprint) ===
      computeAcpBackendConfigFingerprint(backend)
  );
}

export function markAcpBackendConnectionState(
  backend: BackendInstance,
): BackendInstance {
  const test = backend.acp?.connectionTest;
  if (!test) return backend;
  const fingerprint = computeAcpBackendConfigFingerprint(backend);
  if (normalizeString(test.configFingerprint) === fingerprint) return backend;
  return {
    ...backend,
    acp: {
      ...(backend.acp || {}),
      connectionTest: {
        ...test,
        status: "stale",
        configFingerprint: normalizeString(test.configFingerprint),
        error: "ACP backend configuration changed; rerun connection test.",
      },
    },
  };
}

function normalizeToken(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function buildIdNonce() {
  const timestampPart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${timestampPart}${randomPart}`.slice(-12);
}

export function normalizeBackendDisplayName(value: unknown, fallback: string) {
  const normalized = String(value || "").trim();
  if (normalized) {
    return normalized;
  }
  return String(fallback || "").trim();
}

export function isManagedLocalBackendId(value: unknown) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return false;
  }
  return normalized === MANAGED_LOCAL_BACKEND_ID;
}

export function generateBackendInternalId(args: {
  displayName: string;
  type: string;
  usedIds: Set<string>;
}) {
  const displayToken = normalizeToken(args.displayName || "");
  const typeToken = normalizeToken(args.type || "");
  const seed = [typeToken, displayToken].filter(Boolean).join("-");
  const base = `backend-${seed || "profile"}`;
  let candidate = `${base}-${buildIdNonce()}`;
  let suffix = 2;
  while (
    args.usedIds.has(candidate) ||
    candidate === MANAGED_LOCAL_BACKEND_ID
  ) {
    candidate = `${base}-${buildIdNonce()}-${suffix}`;
    suffix += 1;
  }
  args.usedIds.add(candidate);
  return candidate;
}
