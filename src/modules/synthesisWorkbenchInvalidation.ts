import type { SynthesisWorkbenchSurfaceName } from "./synthesis/uiModel";

export type SynthesisWorkbenchSidecarChangeEvent = {
  invalidatedSurfaces: SynthesisWorkbenchSurfaceName[];
  sourceRefs?: string[];
  reason: string;
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

const sidecarChangeListeners =
  new Set<SynthesisWorkbenchSidecarChangeListener>();

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
  const invalidatedSurfaces = Array.from(
    new Set<SynthesisWorkbenchSurfaceName>(event.invalidatedSurfaces),
  );
  const normalizedEvent = {
    ...event,
    invalidatedSurfaces,
  };
  for (const listener of sidecarChangeListeners) {
    listener(normalizedEvent);
  }
  return {
    invalidatedListeners: sidecarChangeListeners.size,
    invalidatedSurfaces,
    reason: event.reason,
    sourceRefs: (event.sourceRefs || []).filter(Boolean),
  };
}
