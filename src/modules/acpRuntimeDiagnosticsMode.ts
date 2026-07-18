export type AcpRuntimeDiagnosticsMode = "idle" | "recording" | "replaying";

let activeMode: AcpRuntimeDiagnosticsMode = "idle";

export function getAcpRuntimeDiagnosticsMode() {
  return activeMode;
}

export function acquireAcpRuntimeDiagnosticsMode(
  mode: Exclude<AcpRuntimeDiagnosticsMode, "idle">,
) {
  if (activeMode !== "idle") {
    return false;
  }
  activeMode = mode;
  return true;
}

export function releaseAcpRuntimeDiagnosticsMode(
  mode: Exclude<AcpRuntimeDiagnosticsMode, "idle">,
) {
  if (activeMode === mode) {
    activeMode = "idle";
  }
}

export function resetAcpRuntimeDiagnosticsModeForTests() {
  activeMode = "idle";
}
