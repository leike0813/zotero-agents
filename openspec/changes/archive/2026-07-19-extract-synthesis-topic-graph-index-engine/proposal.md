## Why

Topic Graph index derivation remains duplicated inside the plugin-owned
persistence service. The deterministic roots/unplaced computation is the next
Stage 1 WS3 kernel and is still coupled to SQLite, manifest loading,
projection-registry promotion, progress reporting, and mutable graph workflows.

## What Changes

- Add a bounded, environment-neutral Topic Graph index engine.
- Move deterministic root and unplaced-topic derivation into
  `synthesis-engine`.
- Route Topic Graph projection reads and rebuilds through the configured
  engine.
- Keep graph normalization, proposal/review decisions, repository state,
  canonical checkpoints, manifests, diagnostics, progress, and registry
  promotion in the application layer.
- Preserve public clients, database schema, persisted projection shape,
  Workbench behavior, and the `108 methods / 1 direct consumer` inventory.
- Add a test-only Node worker canary without activating a production worker or
  sidecar runtime.

## Capabilities

### New Capabilities

- `synthesis-topic-graph-index-engine`: Defines strict index DTOs,
  deterministic roots/unplaced semantics, bounds, checkpoints, result
  rebuilding, and process-readiness evidence.

### Modified Capabilities

- `synthesis-topic-graph`: Requires projection derivation to route through the
  configured Topic Graph index engine.
- `synthesis-persistence-performance`: Bounds Topic Graph index computation
  and keeps projection promotion failure-safe.
- `synthesis-invariant-guardrails`: Prevents environment and persistence
  dependencies from entering the Topic Graph index engine.
- `synthesis-layer-doc-system`: Describes the engine/application boundary as
  current state.

## Impact

- Affects `packages/synthesis-engine`, Topic Graph service composition,
  focused Core tests, and current-state Synthesis documentation.
- Adds no dependency and does not change Client APIs, service methods, database
  schema, canonical artifact formats, WebDAV behavior, production topology, or
  service inventory.
