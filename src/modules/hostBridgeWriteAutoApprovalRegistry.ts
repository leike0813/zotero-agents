import type { HostBridgePermissionScope } from "./hostBridgePermissionManager";

const writeAutoApprovalRunIds = new Set<string>();
let acpSkillRunAutoApprovalResolver: (requestId: string) => boolean = () =>
  false;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export function registerHostBridgeWriteAutoApprovalScope(args: {
  requestId?: string;
  runId?: string;
}) {
  const requestId = normalizeString(args.requestId);
  const runId = normalizeString(args.runId);
  if (requestId) {
    writeAutoApprovalRunIds.add(requestId);
  }
  if (runId) {
    writeAutoApprovalRunIds.add(runId);
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
  if (!scope?.autoApproveWrites) {
    return false;
  }
  if (scope.kind !== "acp-skill-run") {
    return false;
  }
  const requestId = normalizeString(scope.requestId);
  const runId = normalizeString(scope.runId);
  if (
    (requestId &&
      (writeAutoApprovalRunIds.has(requestId) ||
        acpSkillRunAutoApprovalResolver(requestId))) ||
    (runId &&
      (writeAutoApprovalRunIds.has(runId) ||
        acpSkillRunAutoApprovalResolver(runId)))
  ) {
    return true;
  }
  return false;
}

export function resetHostBridgeWriteAutoApprovalScopesForTests() {
  writeAutoApprovalRunIds.clear();
}
