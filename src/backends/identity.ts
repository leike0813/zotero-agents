import { MANAGED_LOCAL_BACKEND_ID } from "../modules/skillRunnerLocalRuntimeConstants";

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
