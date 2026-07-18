## 1. Contract and Algorithm TDD

- [x] 1.1 Add Core 187 red tests for strict binding/dedupe request and result rebuilding, versions, JSON safety, stable ordering, duplicate/dangling rejection, production bounds, and unknown-field removal.
- [x] 1.2 Characterize current binding, clustered dedupe, gold-fixture, fingerprint, action-id, and diagnostic parity before moving algorithms.
- [x] 1.3 Implement shared canonical JSON/SHA primitives, matcher DTOs, rebuilders, deterministic binding/dedupe methods, checkpoints, and the in-process engine in `packages/synthesis-engine`.

## 2. Application Adapter and Atomic Orchestration

- [x] 2.1 Add the application matcher adapter for Host/repository DTO projection, source/basis hashes, proposal/fact materialization, and strict result rebuilding.
- [x] 2.2 Inject the matcher engine through `SynthesisServiceOptions` and production legacy/readonly composition without public API changes.
- [x] 2.3 Capture repository facts under a short lock, compute both passes outside the lock, recapture the basis, and promote results in one repository transaction.
- [x] 2.4 Preserve rejected decisions and prior durable facts for throw, cancel, malformed, oversized, superseded, or transaction-failure paths; keep graph/related-items follow-up post-commit.

## 3. Harnesses and Process Boundary

- [x] 3.1 Migrate Core 151 and the gold-label helper to the engine while preserving precision/recall and danger-neighbor results.
- [x] 3.2 Migrate the realtime Index harness to the shared engine while preserving isolated-debug-only persistence.
- [x] 3.3 Add a test-only Node worker fixture and verify direct/worker parity, checkpoint abort, environment-neutral imports, and unchanged `108 / 1` inventory.
- [x] 3.4 Delete the plugin `referenceMatcher.ts` implementation and replace old static function-name guards with engine/application boundary guards.

## 4. Documentation and Validation

- [x] 4.1 Update current-state matcher, graph registry, knowledge-graph, runtime, performance, and capability documentation.
- [x] 4.2 Run focused Core tests, Synthesis invariants, contracts/engine/root TypeScript, service-boundary, targeted Prettier/ESLint, `git diff --check`, and production build.
- [x] 4.3 Run strict OpenSpec validation and complete all tasks without archiving, publishing, committing, or modifying `reference/Skill-Runner`.
