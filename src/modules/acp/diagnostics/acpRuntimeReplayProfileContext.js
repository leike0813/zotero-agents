let activeContext;
export function setAcpRuntimeReplayProfileContext(context) {
    activeContext = context ? { ...context } : undefined;
}
export function getAcpRuntimeReplayProfileContext() {
    return activeContext ? { ...activeContext } : undefined;
}
export function resetAcpRuntimeReplayProfileContextForTests() {
    activeContext = undefined;
}
