import type { RequestPermissionOutcome } from "./acpProtocol";
import type { AcpPendingPermissionRequest } from "./acpTypes";

type SkillRunnerHostBridgePermissionRequest = AcpPendingPermissionRequest & {
  resolve: (outcome: RequestPermissionOutcome) => void;
};

type SkillRunnerHostBridgePermissionResolver = {
  runRequestId: string;
  resolve: (outcome: RequestPermissionOutcome) => void;
};

type SkillRunnerHostBridgePermissionListener = () => void;

const pendingByRunRequestId = new Map<string, AcpPendingPermissionRequest>();
const resolversByPermissionRequestId = new Map<
  string,
  SkillRunnerHostBridgePermissionResolver
>();
const listeners = new Set<SkillRunnerHostBridgePermissionListener>();

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function clonePermissionRequest(
  request: AcpPendingPermissionRequest,
): AcpPendingPermissionRequest {
  return {
    requestId: normalizeString(request.requestId),
    sessionId: normalizeString(request.sessionId),
    toolCallId: normalizeString(request.toolCallId),
    toolTitle: normalizeString(request.toolTitle),
    source: normalizeString(request.source) || undefined,
    summary: normalizeString(request.summary) || undefined,
    detail: normalizeString(request.detail) || undefined,
    requestedAt: normalizeString(request.requestedAt),
    options: Array.isArray(request.options)
      ? request.options.map((option) => ({ ...option }))
      : [],
  };
}

function emitChanged() {
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch {
      // A stale UI listener must not break permission resolution.
    }
  }
}

export function subscribeSkillRunnerHostBridgePermissionRequests(
  listener: SkillRunnerHostBridgePermissionListener,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSkillRunnerHostBridgePermissionRequest(
  runRequestIdRaw: string,
  request: SkillRunnerHostBridgePermissionRequest,
) {
  const runRequestId = normalizeString(runRequestIdRaw);
  const permissionRequestId = normalizeString(request.requestId);
  if (!runRequestId || !permissionRequestId) {
    return false;
  }
  resolversByPermissionRequestId.set(permissionRequestId, {
    runRequestId,
    resolve: request.resolve,
  });
  pendingByRunRequestId.set(
    runRequestId,
    clonePermissionRequest({
      ...request,
      requestedAt:
        normalizeString(request.requestedAt) || new Date().toISOString(),
    }),
  );
  emitChanged();
  return true;
}

export function getSkillRunnerHostBridgePermissionRequest(
  runRequestIdRaw: string,
) {
  const runRequestId = normalizeString(runRequestIdRaw);
  const pending = runRequestId
    ? pendingByRunRequestId.get(runRequestId)
    : undefined;
  return pending ? clonePermissionRequest(pending) : null;
}

export function resolveSkillRunnerHostBridgePermissionRequest(args: {
  runRequestId?: string;
  permissionRequestId?: string;
  outcome?: "selected" | "cancelled";
  optionId?: string;
}) {
  const runRequestId = normalizeString(args.runRequestId);
  const permissionRequestId = normalizeString(args.permissionRequestId);
  const matched = permissionRequestId
    ? resolversByPermissionRequestId.get(permissionRequestId)
    : Array.from(resolversByPermissionRequestId.values()).find(
        (entry) => entry.runRequestId === runRequestId,
      );
  if (!matched) {
    if (runRequestId && pendingByRunRequestId.delete(runRequestId)) {
      emitChanged();
      return;
    }
    throw new Error(
      "No active SkillRunner Host Bridge permission request is available.",
    );
  }
  const outcome =
    args.outcome === "selected" && normalizeString(args.optionId)
      ? ({
          outcome: "selected",
          optionId: normalizeString(args.optionId),
        } as RequestPermissionOutcome)
      : ({ outcome: "cancelled" } as RequestPermissionOutcome);
  matched.resolve(outcome);
  for (const [requestId, entry] of resolversByPermissionRequestId.entries()) {
    if (entry === matched) {
      resolversByPermissionRequestId.delete(requestId);
    }
  }
  pendingByRunRequestId.delete(matched.runRequestId);
  emitChanged();
}

export function resetSkillRunnerHostBridgePermissionRegistryForTests() {
  pendingByRunRequestId.clear();
  resolversByPermissionRequestId.clear();
  listeners.clear();
}
