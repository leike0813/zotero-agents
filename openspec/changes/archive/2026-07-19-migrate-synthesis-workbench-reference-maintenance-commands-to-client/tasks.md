## 1. Red Tests

- [x] 1.1 Update Workbench and service-boundary tests to require all four Reference maintenance calls to use `client.references`, forbid the migrated direct service methods, and retain 125 public service methods and four direct consumers.
- [x] 1.2 Update contract and in-process adapter tests for the four no-argument methods, opaque JSON normalization, missing ports, preserved client errors, and ordinary legacy error normalization.
- [x] 1.3 Lock callback-free commands, confirmation differences, command single-flight, three deferred starts versus immediate Reference Sidecar retry, 500 ms polling, error presentation, and Index/Review/Graph invalidation.

## 2. Reference Client Capability

- [x] 2.1 Add the environment-neutral `SynthesisReferencesClient` and opaque JSON-safe command result without progress, streaming, or Workbench DTO contracts.
- [x] 2.2 Add four narrow in-process legacy ports using shared JSON normalization and stable `unavailable`, preserved client error, storage-busy, and `internal` behavior.
- [x] 2.3 Compose the four Reference maintenance ports from existing legacy service methods without changing the public service surface or migration inventory.

## 3. Workbench Migration

- [x] 3.1 Route Reference Sidecar refresh and retry through the lazily resolved client, removing progress callbacks while preserving confirmation and deferred-start differences.
- [x] 3.2 Route advanced reference matching run and retry through the lazily resolved client, removing progress callbacks while preserving confirmation and deferred-start differences.
- [x] 3.3 Keep Reference queries, proposal/canonical mutations, related-items sync, workflow apply, other command domains, progress helpers, Host Bridge, MCP, algorithms, repositories, persistence, and public service methods unchanged.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation for client-routed Reference maintenance and polling-owned callback-free progress.
- [x] 4.2 Run contract and root TypeScript checks; focused core tests 125, 129, 143, 144, 152, 168, 175, and 176; the read-only UI harness; service-boundary and Synthesis invariant checks; targeted Prettier and ESLint; and `git diff --check`.
- [x] 4.3 Run the production build and strict OpenSpec validation, remove only unrelated generated help-doc artifacts, and confirm all tasks complete without altering the existing `reference/Skill-Runner` state.
