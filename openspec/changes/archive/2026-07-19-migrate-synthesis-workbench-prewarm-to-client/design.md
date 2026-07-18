## Context

The Workbench host exports `prewarmSynthesisWorkbenchSurfaces`, but the legacy Synthesis service currently performs the phased chrome and surface reads and calls UI-owned callbacks after every phase. The existing `SynthesisClient.workbench.readChrome` and `readSurface` capabilities already provide the required narrow projections, so callback-oriented prewarm composition no longer belongs on the service public surface.

The migration must preserve single-flight semantics, the current surface order, per-phase cache/runtime publication, active-surface guards, and failure boundaries. It must not add a full-snapshot, callback, or streaming method to `SynthesisClient`, and it must not change persisted data or runtime ownership.

## Goals / Non-Goals

**Goals:**

- Move phased prewarm orchestration into the Workbench host using existing client reads.
- Capture and convert Workbench state once per prewarm run.
- Preserve chrome-first ordering, explicit empty-surface behavior, event-loop yielding, surface error isolation, cache merges, and guarded UI publication.
- Remove the legacy service method and inventory group while retaining exactly four direct legacy consumers.

**Non-Goals:**

- Add or modify `SynthesisClient` contracts.
- Migrate progress polling, `getTopicReport`, commands, mutations, Host Bridge, or MCP.
- Change databases, canonical files, mirrors, Zotero ownership, or runtime process boundaries.

## Decisions

### 1. The Workbench host owns phased orchestration

`prewarmSynthesisWorkbenchSurfaces` resolves the current client and uses `readChrome` followed by `readSurface` for each requested surface. The host retains its current exported signature and single-flight promise, because scheduling and UI publication are host concerns.

Alternative: add a prewarm capability to `SynthesisClient`. Rejected because the existing region-scoped reads are sufficient and callback or full-snapshot APIs would broaden the stable client contract for UI-specific orchestration.

### 2. State is captured and converted once

Each prewarm run obtains one Workbench state snapshot and converts it once before issuing reads. Every phase receives the same JSON-safe read state, avoiding timing-dependent state drift within one run.

Alternative: capture state before every read. Rejected because it would change the existing coherent-run semantics and add repeated conversion work.

### 3. Preserve phase ordering and failure boundaries

Chrome is read first. An explicit `surfaces: []` ends after chrome, while an omitted list uses `index`, `review`, `graph`, `tags`, `concepts`, and `topics` in that exact order. Every surface read is preceded by `yieldToEventLoop`. Chrome failure rejects the inner run and is absorbed by the existing outer fallback; a surface failure is caught locally and iteration continues.

Alternative: run surface reads concurrently. Rejected because incremental publication order and event-loop responsiveness are observable Workbench behavior.

### 4. Reuse current cache and runtime publication owners

After a successful phase, the host first merges the projection into the global prewarm cache, then resolves the current Workbench runtime dynamically and merges its snapshot. Chrome publishes cached chrome. A surface is marked loaded and publishes its cached surface only when currently active. The final aggregate merge remains as a convergence step.

Alternative: capture runtime once at startup. Rejected because Workbench runtime may be mounted or replaced while prewarm awaits reads.

### 5. Retire only the legacy callback surface

Remove `warmSynthesisWorkbenchSurfaces`, its return entry, exclusive imports, and the `workbench_warmup` inventory group. No compatibility alias is retained; current-state documentation describes only client-orchestrated prewarm.

Alternative: retain a deprecated wrapper. Rejected because the method has no remaining intended consumer and would keep the callback boundary public.

## Risks / Trade-offs

- **Workbench orchestration can diverge from ordinary refresh paths** → Reuse the same client reads, conversion helpers, cache merge, runtime merge, loaded-state, and publication helpers already owned by the host.
- **A runtime can change between phases** → Resolve it dynamically after each successful cache merge.
- **Removing a public service method can miss a hidden consumer** → Enforce the exact direct-consumer allowlist and forbid the method and inventory group in boundary tests.
- **Incremental behavior can regress during refactoring** → Cover exact order, empty arrays, yields, error isolation, cache order, and active-surface publication in the existing Workbench test suite.

## Migration Plan

1. Add failing Workbench and service-boundary assertions for client routing and legacy removal.
2. Move phased orchestration to the Workbench host while preserving all guards and merges.
3. Delete the service method, return entry, exclusive imports, and inventory group.
4. Update current-state documentation and run focused through production validation.

Rollback restores the service method and host delegation; no persisted data migration is involved.

## Open Questions

None.
