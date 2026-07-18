## 1. Contract and Parity TDD

- [x] 1.1 Add Core 191 red tests for four versioned DTOs, strict request/result rebuilding, JSON safety, unknown-envelope removal, and production bounds.
- [x] 1.2 Characterize current manifest validation, artifact validation, assembly, and patch conflict/invalid/applied parity without adding duplicate low-value cases.
- [x] 1.3 Add checkpoint cancellation, malformed-result rejection, test-only Node worker parity, and environment-neutral package import guards.

## 2. Engine Implementation

- [x] 2.1 Implement Topic Structured Artifact contract DTOs, aggregate JSON bounds, rebuilders, checkpoints, and contract errors in `packages/synthesis-engine`.
- [x] 2.2 Move current manifest/artifact validation, assembly, and section-patch algorithms into the engine without semantic or error-order changes.
- [x] 2.3 Add the asynchronous in-process engine and export it through the package index without production dependencies.

## 3. Application Integration

- [x] 3.1 Add the application adapter and separate canonical naming, serialization, and current-hash helpers into an application persistence module.
- [x] 3.2 Inject the engine through `SynthesisServiceOptions`, default service construction, production legacy composition, and readonly harness composition.
- [x] 3.3 Route complete and patch Host apply through strict engine requests/results while preserving digest checks, hashes, files, metadata, index, downstream effects, autosync, and existing error mapping.
- [x] 3.4 Remove the mixed plugin module and preserve canonical state for engine throw, cancellation, bounds failure, malformed output, and patch conflict.

## 4. Guardrails, Specifications, and Documentation

- [x] 4.1 Update Core 129, 132, 136, 152, 155, and 168 for injection, parity, failure preservation, environment boundaries, and unchanged `108 / 1` inventory.
- [x] 4.2 Correct active structured-artifact current-state spec drift and update Synthesis README, runtime/rebuild, topics/discovery, persistence, performance, sequence, and knowledge-graph documentation.
- [x] 4.3 Run focused Core tests, Synthesis invariants, contracts/engine/root TypeScript, service-boundary, targeted Prettier/ESLint, help-doc check, `git diff --check`, production build, and strict OpenSpec validation.
