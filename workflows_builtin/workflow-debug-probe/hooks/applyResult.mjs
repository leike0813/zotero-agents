export async function applyResult(args) {
  const runtime = args?.runtime || {};
  const globalAddon = runtime?.addon || globalThis?.addon || null;
  if (!globalAddon) {
    throw new Error("workflow debug probe runtime addon is unavailable");
  }
  const bridge = globalAddon?.data?.workflowDebugProbe || null;
  if (!bridge || typeof bridge.run !== "function") {
    throw new Error("workflow debug probe bridge is unavailable");
  }
  const selectionContext = args?.runResult?.resultJson?.selectionContext || null;
  if (!selectionContext) {
    throw new Error("workflow debug probe requires selectionContext");
  }
  return bridge.run({
    selectionContext,
    workflowId: args?.manifest?.id || "workflow-debug-probe",
  });
}
