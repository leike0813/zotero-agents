## 1. Red Tests

- [x] 1.1 Update Workbench and service-boundary tests to require all three Reference review/proposal calls to use `client.references`, forbid the migrated direct service methods, and retain 125 public service methods and four direct consumers.
- [x] 1.2 Update contract and in-process adapter tests for strict canonical review, single proposal, batch decision, and discriminated manual-target DTOs; JSON normalization; invalid-request no-call behavior; missing ports; stable errors; and preserved domain failure results.
- [x] 1.3 Lock Workbench snake/camel aliases, trimming, default actions, batch filtering, callback/confirmation/deferred-start absence, single-flight, singular `failOnDiagnostic`, and Index/Review/Graph invalidation.

## 2. Reference Review Client Capability

- [x] 2.1 Add environment-neutral Reference review/proposal request contracts and opaque JSON-safe command results without progress, streaming, or Workbench DTO contracts.
- [x] 2.2 Add three narrow in-process legacy ports with strict field rebuilding and validation plus stable `invalid_request`, `unavailable`, preserved client error, storage-busy, and `internal` behavior.
- [x] 2.3 Compose the three Reference review/proposal ports from existing legacy service methods without changing the public service surface or migration inventory.

## 3. Workbench Migration

- [x] 3.1 Route canonical revision review through the lazily resolved client while preserving payload aliases, trimming, default action, command single-flight, singular diagnostic handling, and three-surface invalidation.
- [x] 3.2 Route single and batch Reference match proposal decisions through the lazily resolved client while preserving aliases, trimming, defaults, batch filtering, manual targets, orchestration, and invalidation.
- [x] 3.3 Keep canonical merge/batch merge, metadata update, archive, Reference queries and maintenance, other command domains, Host Bridge, MCP, service methods, inventory, and domain logic unchanged.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation for client-routed Reference review/proposal actions and the retained migration boundaries.
- [x] 4.2 Run contract and root TypeScript checks; focused core tests 125, 129, 143, 144, 152, 168, 175, and 176; the read-only UI harness; service-boundary and Synthesis invariant checks; targeted Prettier and ESLint; and `git diff --check`.
- [x] 4.3 Run the production build and strict OpenSpec validation, remove only unrelated generated help-doc artifacts, and confirm all tasks complete without altering the existing `reference/Skill-Runner` state.
