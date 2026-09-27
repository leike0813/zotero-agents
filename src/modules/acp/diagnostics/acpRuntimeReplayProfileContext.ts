import type { AcpRuntimeReplaySurface } from "./acpRuntimeReplayProfiler";
import type { AcpRuntimeTraceSourceKind } from "./acpRuntimeSemanticTrace";

export type AcpRuntimeReplayProfileContext = {
  requestId: string;
  sourceKind: AcpRuntimeTraceSourceKind;
  surface: AcpRuntimeReplaySurface;
};

let activeContext: AcpRuntimeReplayProfileContext | undefined;

export function setAcpRuntimeReplayProfileContext(
  context?: AcpRuntimeReplayProfileContext,
) {
  activeContext = context ? { ...context } : undefined;
}

export function getAcpRuntimeReplayProfileContext() {
  return activeContext ? { ...activeContext } : undefined;
}

export function resetAcpRuntimeReplayProfileContextForTests() {
  activeContext = undefined;
}
