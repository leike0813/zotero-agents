// Shared mutable state for the ACP skill run modules. The run store, the
// focused status/permission/catalog/registry/selection/actions modules, and
// the workspace data plane all read or mutate this state. Keeping it in one
// dependency-free module keeps the runtime import graph one-directional:
// state <- status <- store <- focused modules.
export const acpSkillRunRecords = new Map();
export const acpSkillRunControllers = new Map();
export const acpSkillRunControllerPurposes = new Map();
export const acpSkillRunSetupControllers = new Map();
export const acpSkillRunApplyResultControllerDetachPromises = new Map();
export const acpSkillRunRuntimeCatalogByRequestId = new Map();
export const acpSkillRunPermissionQueuesByRunRequestId = new Map();
let selectedAcpSkillRunRequestId = "";
export function getAcpSkillRunSelectedRequestId() {
    return selectedAcpSkillRunRequestId;
}
export function setAcpSkillRunSelectedRequestId(requestId) {
    selectedAcpSkillRunRequestId = requestId;
}
export function nowIso() {
    return new Date().toISOString();
}
export function normalizeString(value) {
    return String(value || "").trim();
}
