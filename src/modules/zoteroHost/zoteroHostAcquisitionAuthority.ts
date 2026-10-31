export type AcquisitionScope = {
  grantId: string;
  kind: string;
  ownerId: string;
};

type Grant = {
  scope: AcquisitionScope;
  isLive(): boolean;
  cleanup: Set<() => void | Promise<void>>;
  parents: Map<string, { title: string; url: string }>;
};
const grants = new Map<string, Grant>();
const pendingCleanup = new Set<Promise<void>>();
const liveResolvers = new Map<string, (ownerId: string) => boolean>();

export function registerAcquisitionLiveResolver(
  kind: string,
  resolver: (ownerId: string) => boolean,
) {
  liveResolvers.set(kind, resolver);
}

export function issueAcquisitionGrantForTask(
  kind: "acp-skill-run" | "skillrunner-run",
  ownerId: string,
) {
  revokeAcquisitionGrantsForOwner(kind, ownerId);
  return issueAcquisitionGrant({
    kind,
    ownerId,
    isLive: () => liveResolvers.get(kind)?.(ownerId) === true,
  });
}

export function acquisitionScopeFromPermission(
  scope:
    | {
        kind: string;
        requestId?: string;
        frontendScopeId?: string;
        acquisitionGrantId?: string;
      }
    | null
    | undefined,
): AcquisitionScope | undefined {
  if (!scope?.acquisitionGrantId) return undefined;
  return {
    grantId: scope.acquisitionGrantId,
    kind: scope.kind,
    ownerId:
      (scope.kind === "acp-skill-run"
        ? scope.requestId
        : scope.frontendScopeId) || "",
  };
}

export function hasAcquisitionGrant(scope: AcquisitionScope | undefined) {
  try {
    requireAcquisitionGrant(scope);
    return true;
  } catch {
    return false;
  }
}

export class AcquisitionError extends Error {
  constructor(
    readonly code:
      | "permission_denied"
      | "invalid_request"
      | "conflict"
      | "unavailable",
    readonly reason: string,
  ) {
    super(`Acquisition ${reason}`);
    this.name = "AcquisitionError";
  }
}

export function acquisitionRef() {
  const bytes = new Uint8Array(16);
  if (!globalThis.crypto?.getRandomValues)
    throw new AcquisitionError("unavailable", "secure_random_unavailable");
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function issueAcquisitionGrant(input: {
  kind: "acp-skill-run" | "skillrunner-run";
  ownerId: string;
  isLive(): boolean;
}) {
  if (!input.ownerId.trim())
    throw new AcquisitionError("invalid_request", "task_owner_missing");
  const grantId = acquisitionRef();
  grants.set(grantId, {
    scope: { grantId, kind: input.kind, ownerId: input.ownerId },
    isLive: input.isLive,
    cleanup: new Set(),
    parents: new Map(),
  });
  return grantId;
}

export function requireAcquisitionGrant(scope: AcquisitionScope | undefined) {
  const grant = scope && grants.get(scope.grantId);
  const live = grant?.isLive() === true;
  if (
    !grant ||
    grant.scope.kind !== scope?.kind ||
    grant.scope.ownerId !== scope.ownerId ||
    !live
  ) {
    if (grant && !live) revokeAcquisitionGrant(grant.scope.grantId);
    throw new AcquisitionError("permission_denied", "task_grant_invalid");
  }
  return grant.scope.grantId;
}

export function onAcquisitionGrantRevoked(
  scope: AcquisitionScope,
  cleanup: () => void | Promise<void>,
) {
  requireAcquisitionGrant(scope);
  const grant = grants.get(scope.grantId)!;
  grant.cleanup.add(cleanup);
  return () => grant.cleanup.delete(cleanup);
}

export function bindAcquisitionParent(
  scope: AcquisitionScope,
  ref: PortableItemRef,
  source: { title: string; url: string },
) {
  const grant = grants.get(requireAcquisitionGrant(scope))!;
  grant.parents.set(`${ref.libraryId}:${ref.key}`, { ...source });
}

export function requireAcquisitionParent(
  scope: AcquisitionScope,
  ref: PortableItemRef,
) {
  const source = grants
    .get(requireAcquisitionGrant(scope))!
    .parents.get(`${ref.libraryId}:${ref.key}`);
  if (!source)
    throw new AcquisitionError("permission_denied", "parent_not_confirmed");
  return { ...source };
}

export function revokeAcquisitionGrant(grantId: string) {
  const grant = grants.get(grantId);
  if (!grant) return;
  grants.delete(grantId);
  for (const cleanup of grant.cleanup) {
    let pending: Promise<void>;
    try {
      pending = Promise.resolve(cleanup());
    } catch (error) {
      pending = Promise.reject(error);
    }
    pendingCleanup.add(pending);
    void pending.finally(() => pendingCleanup.delete(pending)).catch(() => {});
  }
}

export async function shutdownAcquisitionGrants() {
  for (const id of grants.keys()) revokeAcquisitionGrant(id);
  await Promise.allSettled([...pendingCleanup]);
}

export function revokeAcquisitionGrantsForOwner(kind: string, ownerId: string) {
  for (const grant of grants.values()) {
    if (grant.scope.kind === kind && grant.scope.ownerId === ownerId)
      revokeAcquisitionGrant(grant.scope.grantId);
  }
}
import type { PortableItemRef } from "../../workflows/types";
