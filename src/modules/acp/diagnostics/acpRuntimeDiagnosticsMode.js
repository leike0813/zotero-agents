let activeMode = "idle";
export function getAcpRuntimeDiagnosticsMode() {
    return activeMode;
}
export function acquireAcpRuntimeDiagnosticsMode(mode) {
    if (activeMode !== "idle") {
        return false;
    }
    activeMode = mode;
    return true;
}
export function releaseAcpRuntimeDiagnosticsMode(mode) {
    if (activeMode === mode) {
        activeMode = "idle";
    }
}
export function resetAcpRuntimeDiagnosticsModeForTests() {
    activeMode = "idle";
}
