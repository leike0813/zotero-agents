import type { RequestPermissionOutcome } from "./acpProtocol";
import type { AcpPendingPermissionRequest } from "./acpTypes";

export type AcpSkillRunPermissionRequestWithResolver =
  AcpPendingPermissionRequest & {
    resolve: (outcome: RequestPermissionOutcome) => void;
  };

type AcpSkillRunPermissionRequestHandler = (
  runRequestId: string,
  request: AcpSkillRunPermissionRequestWithResolver,
) => void;

let handler: AcpSkillRunPermissionRequestHandler | undefined;

export function registerAcpSkillRunPermissionRequestHandler(
  nextHandler: AcpSkillRunPermissionRequestHandler,
) {
  handler = nextHandler;
}

export function setAcpSkillRunPermissionRequest(
  runRequestId: string,
  request: AcpSkillRunPermissionRequestWithResolver,
) {
  if (!handler) return false;
  handler(runRequestId, request);
  return true;
}
