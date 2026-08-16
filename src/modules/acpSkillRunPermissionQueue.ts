import type { AcpPendingPermissionRequest } from "./acpTypes";
import type { RequestPermissionOutcome } from "./acpProtocol";
import type { AcpSkillRunPermissionRequestWithResolver } from "./acpSkillRunPermissionFacade";

export type AcpSkillRunPermissionQueueHost = {
  setRequest: (...args: any[]) => any;
  autoApprove: (...args: any[]) => any;
  resolve: (...args: any[]) => any;
};

let host: AcpSkillRunPermissionQueueHost | undefined;

export function configureAcpSkillRunPermissionQueueHost(
  nextHost: AcpSkillRunPermissionQueueHost,
) {
  host = nextHost;
}

function requireAcpSkillRunPermissionQueueHost() {
  if (!host) {
    throw new Error("ACP Skill Run permission queue host is not configured.");
  }
  return host;
}

export function setAcpSkillRunPermissionRequest(
  runRequestId: string,
  request: AcpSkillRunPermissionRequestWithResolver,
) {
  requireAcpSkillRunPermissionQueueHost().setRequest(runRequestId, request);
}

export function autoApproveAcpSkillRunPermissionRequest(args: {
  runRequestId: string;
  request: AcpSkillRunPermissionRequestWithResolver;
  optionId: string;
}) {
  return requireAcpSkillRunPermissionQueueHost().autoApprove(args);
}

export function resolveAcpSkillRunPermissionRequest(args: {
  runRequestId?: string;
  permissionRequestId?: string;
  outcome?: "selected" | "cancelled";
  optionId?: string;
}) {
  requireAcpSkillRunPermissionQueueHost().resolve(args);
}
