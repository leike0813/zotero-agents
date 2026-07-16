## 1. Contract and Parity TDD

- [x] 1.1 Add Core 186 red tests for strict build request/result rebuilding, production bounds, JSON safety, stable ordering, duplicate/dangling rejection, and unknown-field removal.
- [x] 1.2 Add legacy graph/hash/diagnostic and production graph-record parity fixtures before removing duplicate builders.
- [x] 1.3 Implement build DTOs, rebuilders, deterministic graph assembly, light metrics, checkpoint seam, and in-process engine in `packages/synthesis-engine`.

## 2. Application Adapters and Service Orchestration

- [x] 2.1 Add the legacy paper-input adapter and route `buildUnifiedCitationGraph` through the build engine while preserving graph hashes.
- [x] 2.2 Add the production sidecar build adapter and remove service-private node, edge, ownership, incoming-group, and light-metric assembly.
- [x] 2.3 Inject the build engine through `SynthesisServiceOptions` and production legacy/readonly composition without public API changes.
- [x] 2.4 Route full rebuild, source-slice incremental refresh, and sidecar-backed related-items fallback through the configured engine.

## 3. Basis Guard and Process Boundary

- [x] 3.1 Capture durable graph facts under a short lock, compute outside the lock, and conditionally promote against a recaptured full or source-slice basis.
- [x] 3.2 Preserve last-good graph rows and cache basis for superseded, throwing, cancelled, malformed, or oversized builds with stable sanitized diagnostics.
- [x] 3.3 Add a test-only Node worker fixture and verify structured-clone parity, checkpoint abort, environment-neutral imports, and unchanged `108 / 1` inventory.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis engine, knowledge-graph, runtime/rebuild, persistence/performance, and capability-registry documentation.
- [x] 4.2 Run focused Core tests, Synthesis invariants, contracts/engine/root TypeScript, service-boundary, targeted Prettier/ESLint, `git diff --check`, and production build.
- [x] 4.3 Run strict OpenSpec validation and complete all tasks without archiving, publishing, committing, or modifying `reference/Skill-Runner`.
