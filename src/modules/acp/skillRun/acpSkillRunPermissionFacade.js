let handler;
export function registerAcpSkillRunPermissionRequestHandler(nextHandler) {
    handler = nextHandler;
}
export function setAcpSkillRunPermissionRequest(runRequestId, request) {
    if (!handler)
        return false;
    handler(runRequestId, request);
    return true;
}
