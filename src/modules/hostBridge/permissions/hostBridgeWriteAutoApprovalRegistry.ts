import type { HostBridgePermissionScope } from "./hostBridgePermissionManager";

const GRANT_TTL_MS = 24 * 60 * 60 * 1000;

type HostBridgeWriteGrant = {
  grantId: string;
  requestId: string;
  runId?: string;
  connectionMode: "local";
  expiresAt: number;
};

const grants = new Map<string, HostBridgeWriteGrant>();
let acpSkillRunAutoApprovalResolver: (requestId: string) => boolean = () =>
  false;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function randomGrantId() {
  const bytes = new Uint8Array(16);
  const crypto = (globalThis as { crypto?: Crypto }).crypto;
  if (typeof crypto?.getRandomValues !== "function") {
    throw new Error(
      "Secure randomness is unavailable for Host Bridge write grant",
    );
  }
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

function cleanupExpired(now = Date.now()) {
  for (const [grantId, grant] of grants) {
    if (grant.expiresAt <= now) grants.delete(grantId);
  }
}

export function issueHostBridgeWriteAutoApprovalGrant(args: {
  requestId: string;
  runId?: string;
}) {
  cleanupExpired();
  revokeHostBridgeWriteAutoApprovalGrantsForRun(args.requestId);
  const grant: HostBridgeWriteGrant = {
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

export function revokeHostBridgeWriteAutoApprovalGrant(grantId: string) {
  return grants.delete(normalizeString(grantId));
}

export function revokeHostBridgeWriteAutoApprovalGrantsForRun(
  requestId: string,
) {
  const normalized = normalizeString(requestId);
  for (const [grantId, grant] of grants) {
    if (grant.requestId === normalized || grant.runId === normalized) {
      grants.delete(grantId);
    }
  }
}

export function registerAcpSkillRunAutoApprovalResolver(
  resolver: (requestId: string) => boolean,
) {
  acpSkillRunAutoApprovalResolver = resolver;
}

export function isHostBridgeWriteAutoApprovalScope(
  scope: HostBridgePermissionScope | null | undefined,
) {
  cleanupExpired();
  if (
    !scope?.autoApproveWrites ||
    scope.kind !== "acp-skill-run" ||
    scope.connectionMode !== "local"
  ) {
    return false;
  }
  const grant = grants.get(normalizeString(scope.grantId));
  const requestId = normalizeString(scope.requestId);
  const runId = normalizeString(scope.runId);
  return !!(
    grant &&
    grant.requestId === requestId &&
    (!grant.runId || grant.runId === runId) &&
    acpSkillRunAutoApprovalResolver(requestId)
  );
}

export function resetHostBridgeWriteAutoApprovalScopesForTests() {
  grants.clear();
}

export const hostBridgeWriteAutoApprovalInternalsForTests = {
  GRANT_TTL_MS,
  cleanupExpired,
};
