## 1. Contract and Parity TDD

- [x] 1.1 Add Core 185 red tests for strict request/result rebuilding, shared bounds, JSON safety, duplicate/dangling/non-finite rejection, unknown-field removal, and environment-neutral imports.
- [x] 1.2 Add metrics v2 characterization and application hash-parity coverage for weighted PageRank, components, role hints, isolated nodes, and missing years.
- [x] 1.3 Implement the metrics DTOs, canonical rebuilders, deterministic kernels, checkpoint seam, and in-process engine in `packages/synthesis-engine`.

## 2. Application and Service Orchestration

- [x] 2.1 Add the application metrics adapter and remove the old application kernel while keeping canonical hashing and persisted shape unchanged.
- [x] 2.2 Inject the metrics engine through `SynthesisServiceOptions` and production legacy/readonly composition without public API changes.
- [x] 2.3 Refactor full rebuild, incremental refresh, and manual refresh to one capture/compute/promote path with computation outside the library lock.
- [x] 2.4 Guard promotion by the current graph hash and preserve prior metrics for superseded, throwing, malformed, or oversized results.

## 3. Process Canary and Boundary Guardrails

- [x] 3.1 Add a test-only Node worker fixture and verify direct/worker structured-clone parity and checkpoint abort behavior.
- [x] 3.2 Update Core 122/129/168/176 for engine routing, lock identity, failure preservation, dependency boundaries, and unchanged `108 methods / 1 direct consumer` inventory.

## 4. Documentation and Validation

- [x] 4.1 Correct the remaining Hidden Git Sync Workbench documentation drift and update current-state Synthesis engine, runtime/rebuild, performance, and Citation Graph documentation.
- [x] 4.2 Run focused Core tests, Synthesis invariants, contracts/engine/root TypeScript, service-boundary, targeted Prettier/ESLint, `git diff --check`, and production build.
- [x] 4.3 Run strict OpenSpec validation, record unrelated global baseline failures if present, and complete all tasks without archiving, publishing, or committing.
