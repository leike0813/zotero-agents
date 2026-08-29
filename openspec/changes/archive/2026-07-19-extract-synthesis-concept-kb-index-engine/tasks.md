## 1. Contract and Parity TDD

- [x] 1.1 Add Core 189 red tests for strict index/query request and result rebuilding, versions, JSON safety, deterministic ordering, unknown-field removal, and production bounds.
- [x] 1.2 Characterize current search, overlay disambiguation, exact/alias query, sense candidate, and ambiguity parity.
- [x] 1.3 Add checkpoint cancellation, test-only Node worker parity, and environment-neutral package import guards.

## 2. Engine Implementation

- [x] 2.1 Implement Concept KB source DTOs, canonical rebuilders, deterministic index/query computation, checkpoints, and the in-process engine in `packages/synthesis-engine`.
- [x] 2.2 Export the engine through the package index without adding production dependencies.
- [x] 2.3 Add the application adapter that maps engine DTOs to existing Concept KB domain and public query shapes.

## 3. Application Integration

- [x] 3.1 Inject the Concept KB index engine through `createSynthesisConceptKbService`, `SynthesisServiceOptions`, and production legacy/readonly composition.
- [x] 3.2 Route snapshot overlay, projection read/rebuild, and public Concept KB query through the shared engine.
- [x] 3.3 Preserve repository, manifest/hash/timestamp, review, mutation, diagnostics, progress, and persisted/public shapes.
- [x] 3.4 Preserve durable state and projection registry for engine throw, cancellation, malformed result, or bounds failure.
- [x] 3.5 Delete duplicated pure overlay, search, and exact-query helpers from plugin modules.

## 4. Guardrails, Documentation, and Validation

- [x] 4.1 Update Core 129, 142, 152, 168, and 175 for injection, parity, failure preservation, environment boundaries, public error mapping, and unchanged `108 / 1` inventory.
- [x] 4.2 Update current-state Synthesis README, knowledge-graph, concepts, runtime, performance, and persistence documentation.
- [x] 4.3 Run focused Core tests, Synthesis invariants, contracts/engine/root TypeScript, service-boundary, targeted Prettier/ESLint, help-doc check, `git diff --check`, production build, and strict OpenSpec validation.
