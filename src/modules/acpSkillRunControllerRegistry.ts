import {
  cancelAcpSkillRunPermissionQueue,
  clearWaitingUserDetachTimer,
  syncWaitingUserDetachTimer,
  upsertAcpSkillRun,
  type AcpSkillRunController,
  type AcpSkillRunControllerPurpose,
  type AcpSkillRunSetupController,
} from "./acpSkillRunStore";
import { clearStaleAcpSkillRunPermissionRequest } from "./acpSkillRunPermissionQueue";
import {
  acpSkillRunControllerPurposes as controllerPurposes,
  acpSkillRunControllers as controllers,
  acpSkillRunRecords as runRecords,
  acpSkillRunSetupControllers as setupControllers,
  normalizeString,
} from "./acpSkillRunState";
import { isTerminalAcpSkillRunStatus } from "./acpSkillRunStatus";

export function registerAcpSkillRunController(
  requestIdRaw: string,
  controller: AcpSkillRunController | null,
  setupController?: AcpSkillRunSetupController,
  purpose: AcpSkillRunControllerPurpose = "workflow",
): boolean {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    return false;
  }
  if (!controller) {
    controllers.delete(requestId);
    controllerPurposes.delete(requestId);
    clearWaitingUserDetachTimer(requestId);
    cancelAcpSkillRunPermissionQueue(
      requestId,
      "controller_removed_with_pending_permission",
    );
    return true;
  }
  const record = runRecords.get(requestId);
  if (
    setupController &&
    (!record ||
      isTerminalAcpSkillRunStatus(record.status) ||
      setupControllers.get(requestId) !== setupController)
  ) {
    return false;
  }
  setupControllers.delete(requestId);
  controllers.set(requestId, controller);
  controllerPurposes.set(requestId, purpose);
  upsertAcpSkillRun({
    requestId,
    conversationRecoveryState: "connected",
    connectionActionState: "idle",
    lastRecoveryError: "",
  });
  if (record) {
    syncWaitingUserDetachTimer(record);
  }
  clearStaleAcpSkillRunPermissionRequest({
    runRequestId: requestId,
    reason: "controller_registered_without_resolver",
  });
  return true;
}

export function unregisterAcpSkillRunController(
  requestIdRaw: string,
  controller: AcpSkillRunController,
) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId || controllers.get(requestId) !== controller) {
    return false;
  }
  return registerAcpSkillRunController(requestId, null);
}

export function registerAcpSkillRunSetupController(
  requestIdRaw: string,
  controller: AcpSkillRunSetupController | null,
) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    return;
  }
  if (!controller) {
    setupControllers.delete(requestId);
    return;
  }
  setupControllers.set(requestId, controller);
}

export function unregisterAcpSkillRunSetupController(
  requestIdRaw: string,
  controller: AcpSkillRunSetupController,
) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId || setupControllers.get(requestId) !== controller) {
    return;
  }
  setupControllers.delete(requestId);
}

export function hasAcpSkillRunController(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  return !!requestId && controllers.has(requestId);
}
