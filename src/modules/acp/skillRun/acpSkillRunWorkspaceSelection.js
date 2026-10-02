import { ensureAcpSkillRunStoreHydrated } from "./acpSkillRunStore";
import { pruneInactiveAcpSkillRunTranscriptMirrors } from "./acpSkillRunTranscriptMirror";
import { acpSkillRunWorkspaceChange, createAcpSkillRunWorkspaceChange, emitWorkspaceChanged, listAcpSkillRunSummaries, } from "./acpSkillRunWorkspaceDataPlane";
import { acpSkillRunRecords as runRecords, getAcpSkillRunSelectedRequestId, normalizeString, setAcpSkillRunSelectedRequestId, } from "./acpSkillRunState";
function applyAcpSkillRunSelection(requestIdRaw) {
    setAcpSkillRunSelectedRequestId(normalizeString(requestIdRaw));
    pruneInactiveAcpSkillRunTranscriptMirrors();
    const selectedRequestId = getAcpSkillRunSelectedRequestId();
    emitWorkspaceChanged(selectedRequestId
        ? acpSkillRunWorkspaceChange(selectedRequestId, ["selection"])
        : createAcpSkillRunWorkspaceChange({ kinds: ["selection"] }));
}
export async function selectAcpSkillRun(requestIdRaw) {
    ensureAcpSkillRunStoreHydrated();
    applyAcpSkillRunSelection(requestIdRaw);
}
export function ensureAcpSkillRunWorkspaceSelection() {
    ensureAcpSkillRunStoreHydrated();
    const current = normalizeString(getAcpSkillRunSelectedRequestId());
    if (current) {
        const record = runRecords.get(current);
        if (record && !record.removedAt && !record.archivedAt) {
            return current;
        }
    }
    const implicit = listAcpSkillRunSummaries({
        includeArchived: false,
        limit: 1,
    })[0]?.requestId;
    if (implicit && implicit !== current) {
        applyAcpSkillRunSelection(implicit);
    }
    return implicit || "";
}
export function getSelectedAcpSkillRunRequestId() {
    ensureAcpSkillRunStoreHydrated();
    return getAcpSkillRunSelectedRequestId();
}
