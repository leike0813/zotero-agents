## Why

Concept KB index construction, overlay selection, and bounded read-only candidate
matching remain embedded in the plugin-owned persistence service. These
deterministic operations are the next Stage 1 WS3 kernel and currently couple
process-portable computation to SQLite, projection registry, canonical export,
review actions, and public service compatibility.

## What Changes

- Add a bounded, environment-neutral Concept KB index engine with separate
  index-build and read-only query contracts.
- Move search-row construction, overlay disambiguation, and exact concept/alias
  matching into `synthesis-engine`.
- Route Concept KB snapshot overlay, projection read/rebuild, and public
  candidate queries through the configured engine.
- Keep proposal merge/create/review decisions, repository state, canonical
  exports, manifests, diagnostics, review actions, and public result assembly
  in the application layer.
- Preserve public clients, database schema, persisted projection shape, query
  semantics, and the `108 methods / 1 direct consumer` inventory.
- Add a test-only Node worker canary without activating a production worker or
  sidecar runtime.

## Capabilities

### New Capabilities

- `synthesis-concept-kb-index-engine`: Defines strict index/query DTOs,
  deterministic overlay and exact-match semantics, bounds, checkpoints, result
  rebuilding, and process-readiness evidence.

### Modified Capabilities

- `synthesis-concept-kb`: Requires overlay, index, and bounded read-only query
  computation to route through the configured engine.
- `synthesis-persistence-performance`: Bounds Concept KB computation and keeps
  projection promotion failure-safe.
- `synthesis-invariant-guardrails`: Prevents environment and persistence
  dependencies from entering the Concept KB index engine.
- `synthesis-layer-doc-system`: Describes the engine/application boundary as
  current state.

## Impact

- Affects `packages/synthesis-engine`, Concept KB service composition, focused
  Core tests, and current-state Synthesis documentation.
- Adds no dependency and does not change Client APIs, service methods, database
  schema, canonical artifact formats, WebDAV behavior, production topology, or
  service inventory.
