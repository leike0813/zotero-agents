const sidecarChangeListeners = new Set();
export function registerSynthesisWorkbenchSidecarChangeListener(listener) {
    sidecarChangeListeners.add(listener);
    return () => {
        sidecarChangeListeners.delete(listener);
    };
}
export function notifySynthesisWorkbenchSidecarChanged(event) {
    const invalidatedSurfaces = Array.from(new Set(event.invalidatedSurfaces));
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
