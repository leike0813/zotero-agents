## 1. Red Tests

- [x] 1.1 Update Workbench and service-boundary tests to require all four Topic Graph commands to use `client.topicGraph`, forbid the migrated direct service methods, and retain 125 public service methods and four direct consumers.
- [x] 1.2 Update contract and in-process adapter tests for strict edge/review DTOs, JSON normalization, invalid-request no-call behavior, missing ports, stable errors, and preserved singular domain diagnostics.
- [x] 1.3 Lock Workbench trimming, action normalization, empty-edge handling, shared single-flight keys, protected/deferred rebuild, callback absence, singular diagnostics, and existing rebuild/mutation invalidation.

## 2. Topic Graph Client Capability

- [x] 2.1 Add an environment-neutral `SynthesisTopicGraphClient`, strict edge/review DTOs, review action enum, and opaque JSON-safe results without progress, streaming, or Workbench contracts.
- [x] 2.2 Add four narrow in-process legacy Topic Graph ports with request rebuilding and validation plus stable `invalid_request`, `unavailable`, preserved client error, storage-busy, and `internal` behavior.
- [x] 2.3 Compose the four Topic Graph ports from existing legacy service methods without changing the public service surface or migration inventory.

## 3. Workbench Migration

- [x] 3.1 Route Topic Graph rebuild through the lazily resolved client while preserving protected confirmation, empty single-flight args, deferred start, persisted progress polling, callback absence, and Home-only invalidation.
- [x] 3.2 Route edge accept/reject and review action through the lazily resolved client while preserving normalization, guards, single-flight, singular diagnostics, immediate start, and Home/Topics/Graph/Review invalidation.
- [x] 3.3 Keep Topic Graph queries/checkpoint export, discovery hints, Citation Graph, Host Bridge, MCP, service methods, inventory, autosync, projection, and domain logic unchanged.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation for the separate Topic Graph client and correct Topic Graph/Discovery host-command grouping.
- [x] 4.2 Run contract and root TypeScript checks; focused core tests 125, 129, 141, 144, 152, 168, 175, and 176; the read-only UI harness; service-boundary and Synthesis invariant checks; targeted Prettier and ESLint; and `git diff --check`.
- [x] 4.3 Run the production build and strict OpenSpec validation, remove only unrelated generated help-doc artifacts, and confirm all tasks complete without altering the existing `reference/Skill-Runner` state.
