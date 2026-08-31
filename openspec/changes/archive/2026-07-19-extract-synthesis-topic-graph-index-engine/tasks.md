## 1. Contract and Parity TDD

- [x] 1.1 Add Core 190 red tests for strict request/result rebuilding,
  versions, JSON safety, deterministic ordering, unknown-field removal, and
  production bounds.
- [x] 1.2 Characterize current roots/unplaced placement parity, including
  suggested, confirmed, rejected, stale, and deleted broader relations.
- [x] 1.3 Add checkpoint cancellation, malformed-result rejection, test-only
  Node worker parity, and environment-neutral package import guards.

## 2. Engine Implementation

- [x] 2.1 Implement Topic Graph source DTOs, canonical rebuilders,
  deterministic index computation, checkpoints, and the in-process engine in
  `packages/synthesis-engine`.
- [x] 2.2 Export the engine through the package index without adding
  production dependencies.
- [x] 2.3 Add the application adapter that maps minimal engine DTOs to the
  existing full Topic Graph projection shape.

## 3. Application Integration

- [x] 3.1 Inject the Topic Graph index engine through
  `createSynthesisTopicGraphService`, `SynthesisServiceOptions`, and production
  legacy/readonly composition.
- [x] 3.2 Route projection read and rebuild through the shared engine and
  remove duplicated roots/unplaced computation.
- [x] 3.3 Preserve repository, manifest/hash/timestamp, diagnostics, progress,
  review/mutation paths, and persisted/public projection shapes.
- [x] 3.4 Preserve durable state and projection registry for engine throw,
  cancellation, malformed result, or bounds failure.

## 4. Guardrails, Documentation, and Validation

- [x] 4.1 Update Core 129, 141, 152, and 168 for injection, parity, failure
  preservation, environment boundaries, and unchanged `108 / 1` inventory.
- [x] 4.2 Update current-state Synthesis README, knowledge-graph, topics,
  runtime, performance, and persistence documentation.
- [x] 4.3 Run focused Core tests, Synthesis invariants,
  contracts/engine/root TypeScript, service-boundary, targeted
  Prettier/ESLint, help-doc check, `git diff --check`, production build, and
  strict OpenSpec validation.
