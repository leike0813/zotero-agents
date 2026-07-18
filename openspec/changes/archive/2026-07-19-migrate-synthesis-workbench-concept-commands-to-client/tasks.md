## 1. Red Tests

- [x] 1.1 Update Workbench and service-boundary tests to require all four Concept commands to use `client.concepts`, forbid the migrated direct service methods, and retain 125 public service methods and four direct consumers.
- [x] 1.2 Update contract and in-process adapter tests for strict display fields, review actions, optional targets, deletion batches, JSON normalization, invalid-request no-call behavior, missing ports, stable errors, and preserved domain failure results.
- [x] 1.3 Lock Workbench trimming, action filtering, deletion aliases, single-flight, rebuild confirmation and deferred start, callback absence, singular diagnostic handling, and Concepts/Review invalidation.

## 2. Concepts Client Capability

- [x] 2.1 Add an environment-neutral `SynthesisConceptsClient`, strict Concept request DTOs, and opaque JSON-safe command results without progress, streaming, or Workbench contracts.
- [x] 2.2 Add four narrow in-process legacy Concept ports with strict field rebuilding and validation plus stable `invalid_request`, `unavailable`, preserved client error, storage-busy, and `internal` behavior.
- [x] 2.3 Compose the four Concept ports from existing legacy service methods without changing the public service surface or migration inventory.

## 3. Workbench Migration

- [x] 3.1 Route Concept KB rebuild through the lazily resolved client while preserving protected confirmation, single-flight, deferred start, persisted progress polling, and Concepts/Review invalidation.
- [x] 3.2 Route display-text update, review action, and Concept deletion through the lazily resolved client while preserving normalization, aliases, orchestration, diagnostic behavior, and invalidation.
- [x] 3.3 Keep Concept queries and checkpoint export, Tag, Topic Graph, Sync, Topic artifact, Host Bridge, MCP, service methods, inventory, and Concept KB domain logic unchanged.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation for client-routed Concept commands and retained migration boundaries.
- [x] 4.2 Run contract and root TypeScript checks; focused core tests 125, 129, 142, 144, 152, 168, 175, and 176; the read-only UI harness; service-boundary and Synthesis invariant checks; targeted Prettier and ESLint; and `git diff --check`.
- [x] 4.3 Run the production build and strict OpenSpec validation, remove only unrelated generated help-doc artifacts, and confirm all tasks complete without altering the existing `reference/Skill-Runner` state.
