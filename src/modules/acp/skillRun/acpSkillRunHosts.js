let persistenceHost;
let transcriptMirrorHost;
let workspaceDataPlaneHost;
export function configureAcpSkillRunPersistenceHost(nextHost) {
    persistenceHost = nextHost;
}
export function getAcpSkillRunPersistenceHost() {
    if (!persistenceHost) {
        throw new Error("ACP skill run persistence host is not configured.");
    }
    return persistenceHost;
}
export function configureAcpSkillRunTranscriptMirrorHost(nextHost) {
    transcriptMirrorHost = nextHost;
}
export function getAcpSkillRunTranscriptMirrorHost() {
    if (!transcriptMirrorHost) {
        throw new Error("ACP skill run transcript mirror host is not configured.");
    }
    return transcriptMirrorHost;
}
export function configureAcpSkillRunWorkspaceDataPlaneHost(nextHost) {
    workspaceDataPlaneHost = nextHost;
}
export function getAcpSkillRunWorkspaceDataPlaneHost() {
    if (!workspaceDataPlaneHost) {
        throw new Error("ACP skill run workspace data plane host is not configured.");
    }
    return workspaceDataPlaneHost;
}
