## Why

Topic structured artifact validation, assembly, and section-patch computation
remain coupled to plugin persistence helpers and canonical-write orchestration.
This is the final Stage 1 WS3 kernel that must become environment-neutral before
the Synthesis service runtime can be extracted in WS4.

## What Changes

- Add a strict, bounded Topic Structured Artifact engine with independent
  manifest-validation, artifact-assembly, artifact-validation, and section-patch
  methods.
- Move current pure validation, assembly, and patch CAS/merge semantics into
  `packages/synthesis-engine`.
- Route Host apply through an application adapter and injected engine while
  keeping workspace reads, digest availability checks, hashing, persistence,
  durable side effects, and autosync application-owned.
- Add checkpoint cancellation, strict result rebuilding, and a test-only Node
  worker canary without activating a production worker.
- Remove the mixed plugin module after its persistence helpers are separated.
- Correct active structured-artifact specification drift so current
  `source_paper_refs` and current section requirements are authoritative.
- Preserve public APIs, canonical schemas and files, database schema, WebDAV
  behavior, and the `108 methods / 1 direct consumer` inventory.

## Capabilities

### New Capabilities

- `synthesis-topic-structured-artifact-engine`: Defines strict engine DTOs,
  current validation and assembly semantics, section-patch computation, bounds,
  checkpoints, result rebuilding, and process-readiness evidence.

### Modified Capabilities

- `topic-synthesis-structured-artifact`: Routes current Host structured-artifact
  validation and assembly through the configured engine and removes obsolete
  current-state requirements.
- `topic-synthesis-runtime-contract`: Requires split-runtime outputs to remain
  semantically compatible with the Host engine contract.
- `synthesis-layer-integration`: Preserves create/update/patch apply behavior
  and failure safety across the new engine seam.
- `synthesis-persistence-performance`: Bounds structured-artifact computation
  and keeps durable promotion failure-safe.
- `synthesis-invariant-guardrails`: Prevents environment and persistence
  dependencies from entering the structured-artifact engine.
- `synthesis-layer-doc-system`: Documents the engine/application boundary as
  current state.

## Impact

- Affects `packages/synthesis-engine`, Synthesis topic apply composition,
  focused Core tests, active OpenSpec requirements, and current-state Synthesis
  documentation.
- Adds no dependency and does not change Client DTOs, service methods,
  database schema, canonical artifact formats, Python runtime topology, WebDAV
  behavior, or production process topology.
