let emission;
export function registerAcpChatWorkspaceEmission(nextEmission) {
    emission = nextEmission;
}
export function getAcpChatWorkspaceEmission() {
    return emission;
}
