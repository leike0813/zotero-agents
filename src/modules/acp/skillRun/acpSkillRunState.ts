import type { AcpPermissionQueue } from "./acpPermissionQueue";
import type {
  AcpSkillRunController,
  AcpSkillRunControllerPurpose,
  AcpSkillRunRecord,
  AcpSkillRunRuntimeCatalog,
  AcpSkillRunSetupController,
} from "./acpSkillRunStore";

// Shared mutable state for the ACP skill run modules. The run store, the
// focused status/permission/catalog/registry/selection/actions modules, and
// the workspace data plane all read or mutate this state. Keeping it in one
// dependency-free module keeps the runtime import graph one-directional:
// state <- status <- store <- focused modules.
export const acpSkillRunRecords = new Map<string, AcpSkillRunRecord>();
export const acpSkillRunControllers = new Map<string, AcpSkillRunController>();
export const acpSkillRunControllerPurposes = new Map<
  string,
  AcpSkillRunControllerPurpose
>();
export const acpSkillRunSetupControllers = new Map<
  string,
  AcpSkillRunSetupController
>();
export const acpSkillRunApplyResultControllerDetachPromises = new Map<
  string,
  Promise<void>
>();
export const acpSkillRunRuntimeCatalogByRequestId = new Map<
  string,
  AcpSkillRunRuntimeCatalog
>();
export const acpSkillRunPermissionQueuesByRunRequestId = new Map<
  string,
  AcpPermissionQueue
>();

let selectedAcpSkillRunRequestId = "";

export function getAcpSkillRunSelectedRequestId() {
  return selectedAcpSkillRunRequestId;
}

export function setAcpSkillRunSelectedRequestId(requestId: string) {
  selectedAcpSkillRunRequestId = requestId;
}

export function nowIso() {
  return new Date().toISOString();
}

export function normalizeString(value: unknown) {
  return String(value || "").trim();
}
