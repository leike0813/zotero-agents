## 1. Red Tests

- [x] 1.1 Update Workbench and service-boundary tests to require all four Topic commands to use `client.topics`, forbid the migrated direct service methods, and retain 125 public service methods and four direct consumers.
- [x] 1.2 Update contract and in-process adapter tests for strict Topic/hint identifiers, unknown-field filtering, JSON normalization, invalid-request no-call behavior, missing ports, stable errors, and preserved domain failure results.
- [x] 1.3 Lock Workbench trimming, confirmation, single-flight, immediate start, callback absence, delete failure handling, singular hint diagnostics, and the two existing invalidation behaviors.

## 2. Topics Client Capability

- [x] 2.1 Extend the environment-neutral `SynthesisTopicsClient` with strict delete/hint request DTOs, four bounded commands, and opaque JSON-safe results without progress, streaming, or Workbench contracts.
- [x] 2.2 Add four narrow in-process legacy Topic ports with request rebuilding and validation plus stable `invalid_request`, `unavailable`, preserved client error, storage-busy, and `internal` behavior.
- [x] 2.3 Compose the four Topic ports from existing legacy service methods without changing the public service surface or migration inventory.

## 3. Workbench Migration

- [x] 3.1 Route Topic artifact delete and purge through the lazily resolved client while preserving confirmation, single-flight, delete failure handling, immediate start, and Home/Topics invalidation.
- [x] 3.2 Route discovery-hint reject and restore through the lazily resolved client while preserving trimming, empty-ID behavior, single-flight, singular diagnostics, immediate start, and selected-surface invalidation.
- [x] 3.3 Keep Topic queries, Topic Graph commands, Topic mirror, Tag, Sync, Topic synthesis workflow, Host Bridge, MCP, service methods, inventory, repository, and domain logic unchanged.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation for client-routed Topic commands and correct the relevant host-command counts.
- [x] 4.2 Run contract and root TypeScript checks; focused core tests 125, 129, 144, 146, 152, 168, 175, and 176; the read-only UI harness; service-boundary and Synthesis invariant checks; targeted Prettier and ESLint; and `git diff --check`.
- [x] 4.3 Run the production build and strict OpenSpec validation, remove only unrelated generated help-doc artifacts, and confirm all tasks complete without altering the existing `reference/Skill-Runner` state.
