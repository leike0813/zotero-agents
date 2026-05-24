import type { HostBridgePermissionScope } from "./hostBridgePermissionManager";
import { getAcpSkillRunRecord } from "./acpSkillRunStore";

const writeAutoApprovalRunIds = new Set<string>();

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
      getAcpSkillRunRecord(requestId)?.hostBridgeCli?.autoApproveWrites ===
        true) ||
    (runId &&
      getAcpSkillRunRecord(runId)?.hostBridgeCli?.autoApproveWrites === true)
  ) {
    return true;
  }
  return false;
}

export function resetHostBridgeWriteAutoApprovalScopesForTests() {
  writeAutoApprovalRunIds.clear();
}
