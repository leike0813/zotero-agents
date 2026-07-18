## 1. Red Tests

- [x] 1.1 Update Workbench and service-boundary tests to require all four canonical Reference mutations to use `client.references`, forbid the migrated direct service methods, and retain 125 public service methods and four direct consumers.
- [x] 1.2 Update contract and in-process adapter tests for strict merge pairs, optional confirmation, non-empty batches, bounded metadata patches, archive identifiers, JSON normalization, invalid-request no-call behavior, missing ports, stable errors, and preserved domain failure results.
- [x] 1.3 Lock Workbench aliases, trimming, confirmation coercion, batch filtering and canonical mapping, patch normalization, callback/confirmation behavior, batch-only deferred start, single-flight, singular `failOnDiagnostic`, and both surface invalidation sets.

## 2. Canonical Reference Mutation Client Capability

- [x] 2.1 Add environment-neutral canonical Reference mutation request contracts and opaque JSON-safe command results without progress, streaming, or Workbench DTO contracts.
- [x] 2.2 Add four narrow in-process legacy ports with strict field rebuilding and validation plus stable `invalid_request`, `unavailable`, preserved client error, storage-busy, and `internal` behavior.
- [x] 2.3 Compose the four canonical Reference mutation ports from existing legacy service methods without changing the public service surface or migration inventory.

## 3. Workbench Migration

- [x] 3.1 Route single and batch canonical merge through the lazily resolved client while preserving aliases, trimming, boolean confirmation coercion, object filtering, canonical DTO mapping, orchestration, diagnostic handling, and Index/Review/Graph invalidation.
- [x] 3.2 Route metadata update and archive through the lazily resolved client while preserving identifier aliases, trimming, patch defaulting and normalized-title mapping, orchestration, diagnostic handling, and Index/Review invalidation.
- [x] 3.3 Keep Reference queries, Tag, Concept, Topic Graph, Git/WebDAV Sync, Topic artifacts, Host Bridge, MCP, service methods, inventory, and domain logic unchanged.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation for client-routed canonical Reference mutations and retained migration boundaries.
- [x] 4.2 Run contract and root TypeScript checks; focused core tests 125, 129, 143, 144, 152, 168, 175, and 176; the read-only UI harness; service-boundary and Synthesis invariant checks; targeted Prettier and ESLint; and `git diff --check`.
- [x] 4.3 Run the production build and strict OpenSpec validation, remove only unrelated generated help-doc artifacts, and confirm all tasks complete without altering the existing `reference/Skill-Runner` state.
