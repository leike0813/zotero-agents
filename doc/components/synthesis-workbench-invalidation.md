# Synthesis Workbench Invalidation API

## Overview

The invalidation API ensures that the Synthesis workbench UI responds to
background changes by refreshing only the affected UI surfaces. It handles
three invalidation sources:

- **Sidecar cache changes** — artifact sidecar, references, or graph data updated
  by background jobs or external operations
- **Zotero library item changes** — items, notes, or tags modified in the
  Zotero library
- **Workbench commands** — user-triggered operations that explicitly invalidate
  related surfaces

Three modules implement this subsystem:

| Module | File | Role |
|--------|------|------|
| Invalidation hub | `src/modules/synthesisWorkbenchInvalidation.ts` | Listener registration, event dispatch, surface determination |
| UI Model | `src/modules/synthesis/uiModel.ts` | Surface name types, freshness, cache readiness |
| Workbench App | `src/synthesisWorkbenchApp.ts` | Dirty marking, debounced refresh scheduling, command mapping |

---

## Core API

`src/modules/synthesisWorkbenchInvalidation.ts`

### Event Type

```typescript
type SynthesisWorkbenchSidecarChangeEvent = {
  sourceRefs?: string[];
  reason: string;
  graphMayHaveChanged?: boolean;
};
```

| Field | Purpose |
|-------|---------|
| `sourceRefs` | Paper references that changed (optional) |
| `reason` | Human-readable description of what changed |
| `graphMayHaveChanged` | When `false`, only the index surface is invalidated. Default (`undefined` or `true`) invalidates both index and graph. |

### Registration and Notification

```typescript
function registerSynthesisWorkbenchSidecarChangeListener(
  listener: (event: SynthesisWorkbenchSidecarChangeEvent) => void,
): () => void;
```

Registers a global sidecar change listener. Returns an unsubscribe function.

```typescript
function notifySynthesisWorkbenchSidecarChanged(
  event: SynthesisWorkbenchSidecarChangeEvent,
): SynthesisWorkbenchSidecarChangeResult;
```

Dispatches the event to all registered listeners. Determines affected surfaces:

- `graphMayHaveChanged === false` → `["index"]`
- Default (including `undefined`) → `["index", "graph"]`

Returns the result containing `invalidatedListeners`, `invalidatedSurfaces`,
`reason`, and `sourceRefs`.

---

## Surface Model

`src/modules/synthesis/uiModel.ts`

### Surface Names

```typescript
type SynthesisWorkbenchSurfaceName =
  | "home"     // Overview tab
  | "topics"   // Artifacts tab
  | "index"    // Registry tab
  | "review"   // Reviews tab
  | "graph"    // Graph tab
  | "tags"     // Tags tab
  | "concepts" // Concepts tab
  | "reader";  // Reader tab
```

Tab-to-surface mapping:

| UI Tab Label | Tab Key | Surface |
|-------------|---------|---------|
| Overview | `overview` | `home` |
| Artifacts | `artifacts` | `topics` |
| Registry | `registry` | `index` |
| Reviews | `reviews` | `review` |
| Graph | `graph` | `graph` |
| Tags | `tags` | `tags` |
| Concepts | `concepts` | `concepts` |
| Reader | `reader` | `reader` |

### Related State Types

```typescript
type SynthesisUiCacheReadiness =
  | "missing"    // Cache has never been built
  | "refreshing" // Cache rebuild is in progress
  | "ready"      // Cache is usable and fresh
  | "stale"      // Cache exists but source data has changed
  | "failed";    // Cache rebuild failed

type SynthesisUiFreshness =
  | "fresh"   // Data is current
  | "stale"   // Data may be outdated
  | "dirty"   // Data is known to be outdated
  | "queued"  // Refresh is queued
  | "running" // Refresh is in progress
  | "failed"  // Last refresh attempt failed
  | "unknown";
```

---

## Workbench Invalidation Handling

`src/synthesisWorkbenchApp.ts`

### Runtime State Tracking

Each `SynthesisWorkbenchRuntime` instance tracks two surface sets:

```typescript
type SynthesisWorkbenchRuntime = {
  loadedSurfaces: Set<SynthesisWorkbenchSurfaceName>; // surfaces that have been rendered
  dirtySurfaces: Set<SynthesisWorkbenchSurfaceName>;  // surfaces needing refresh
  libraryReadModelRevision: number;
  libraryReadModelDirtyTimer?: ReturnType<typeof setTimeout>;
};
```

| Function | Purpose |
|----------|---------|
| `markSurfaceLoaded(runtime, surface)` | Removes surface from dirty set, adds to loaded set |
| `markSurfaceDirty(runtime, surface)` | Adds surface to dirty set |
| `surfaceNeedsServiceRefresh(runtime, surface)` | Returns `true` if surface is not loaded or is dirty |

### Sidecar Change Flow

```
External event → notifySynthesisWorkbenchSidecarChanged(event)
  → registerSynthesisWorkbenchSidecarChangeListener
    → handleSynthesisWorkbenchSidecarChanged(event)
      → determine surfaces: graphMayHaveChanged===false → [index]
                              otherwise → [index, graph]
      → for each runtime:
          → markSurfaceDirty(runtime, surface)
          → scheduleLibraryReadModelSurfaceRefresh(runtime, surfaces)
          → sendChrome(runtime, { refreshFromService: true })
```

The handler is registered at module load time:

```typescript
registerSynthesisWorkbenchSidecarChangeListener(
  handleSynthesisWorkbenchSidecarChanged,
);
```

### Library Item Change Flow

```typescript
function notifySynthesisWorkbenchLibraryItemsChanged(args: {
  event: string;       // "modify" | "add" | "delete"
  type: string;        // "item" | "collection" | "note" | ...
  ids?: Array<string | number>;
  extraData?: Record<string, unknown>;
}): { revision, invalidatedRuntimes, invalidatedSurfaces, event, type, itemCount }
```

This is independent of the sidecar change system. It only invalidates the
`["index"]` surface (registry tab), since library changes affect paper
references but not derived graph state.

### Debounced Refresh Scheduling

```typescript
const SYNTHESIS_WORKBENCH_LIBRARY_INVALIDATION_DEBOUNCE_MS = 250;
```

`scheduleLibraryReadModelSurfaceRefresh(runtime, surfaces)`:

1. Clears any existing timer on this runtime (aggregates rapid events)
2. Sets a 250ms debounce timer
3. On timer fire:
   - Resolve the active surface from `runtime.state.selectedTab`
   - If active surface is in the invalidated list AND
     `surfaceNeedsServiceRefresh(runtime, activeSurface)` is true
   - Call `sendSurface(runtime, activeSurface, { refreshFromService: true })`

This ensures that rapid successive invalidations (e.g., from a multi-step
background job) trigger only one refresh.

### Command-based Invalidation

After a workbench command executes, the runtime determines which surfaces to
invalidate via `surfacesInvalidatedByCommand(command)`:

| Command Category | Invalidated Surfaces |
|-----------------|---------------------|
| Sidecar/ref refresh, retry | index, review, graph |
| Match proposal, merge actions | index, review, graph |
| Canonical reference update | index, review |
| Graph cache rebuild | graph |
| Tag operations | tags |
| Concept operations | concepts, review |
| Topic synthesis operations | home, topics, graph, review |
| Topic graph operations | home, topics, graph, review |
| Topic deletion | home, topics |
| Default (fallback) | current tab's surface |

After invalidation, if the active surface is affected, a service refresh is
triggered immediately (no debounce for command-initiated refreshes).

---

## Invalidation Paths Compared

| Path | Trigger | Propagation | Invalidated Surfaces | Debounce |
|------|---------|-------------|---------------------|----------|
| Sidecar Change | `notifySynthesisWorkbenchSidecarChanged()` | Global listener → all runtimes | index / index+graph | 250ms |
| Library Item Change | `notifySynthesisWorkbenchLibraryItemsChanged()` | All runtimes | index | 250ms |
| Command | `runWorkbenchCommandOnce()` | Current runtime | Per command mapping | None |
