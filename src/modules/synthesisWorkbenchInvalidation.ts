import type { SynthesisWorkbenchSurfaceName } from "./synthesis/uiModel";

export type SynthesisWorkbenchSidecarChangeEvent = {
  sourceRefs?: string[];
  reason: string;
  graphMayHaveChanged?: boolean;
};

export type SynthesisWorkbenchSidecarChangeResult = {
  invalidatedListeners: number;
  invalidatedSurfaces: SynthesisWorkbenchSurfaceName[];
  reason: string;
  sourceRefs: string[];
};

type SynthesisWorkbenchSidecarChangeListener = (
  event: SynthesisWorkbenchSidecarChangeEvent,
) => void;

const sidecarChangeListeners = new Set<SynthesisWorkbenchSidecarChangeListener>();

export function registerSynthesisWorkbenchSidecarChangeListener(
  listener: SynthesisWorkbenchSidecarChangeListener,
) {
  sidecarChangeListeners.add(listener);
  return () => {
    sidecarChangeListeners.delete(listener);
  };
}

export function notifySynthesisWorkbenchSidecarChanged(
  event: SynthesisWorkbenchSidecarChangeEvent,
): SynthesisWorkbenchSidecarChangeResult {
  const invalidatedSurfaces: SynthesisWorkbenchSurfaceName[] =
    event.graphMayHaveChanged === false ? ["index"] : ["index", "graph"];
  for (const listener of sidecarChangeListeners) {
    listener(event);
  }
  return {
    invalidatedListeners: sidecarChangeListeners.size,
    invalidatedSurfaces,
    reason: event.reason,
    sourceRefs: (event.sourceRefs || []).filter(Boolean),
  };
}
