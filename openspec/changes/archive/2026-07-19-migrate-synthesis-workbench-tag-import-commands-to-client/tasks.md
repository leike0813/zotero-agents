## 1. Red Tests

- [x] 1.1 Update Workbench and service-boundary tests to require preview and apply branches to use `client.tags`, forbid their direct service routing, and retain 125 public service methods and four direct consumers.
- [x] 1.2 Update contract and in-process adapter tests for strict preview/apply DTOs, action validation, raw payload preservation, canonical rebuilding, object normalization, missing ports, stable errors, storage-busy failures, and invalid legacy results.
- [x] 1.3 Lock Workbench preview aliases, invalid-input skipping, preview-global and apply-action single-flight arguments, immediate execution, callback/diagnostic absence, and Tags-only invalidation.

## 2. Tag Import Capability

- [x] 2.1 Add the public action union, preview/apply DTOs, and two opaque-result client methods without domain parsing, Workbench, confirmation, streaming, callback, or progress contracts.
- [x] 2.2 Add two narrow in-process legacy ports with validation-before-port, canonical request rebuilding, raw payload preservation, object result normalization, and stable `invalid_request`, `unavailable`, preserved client error, storage-busy, and `internal` behavior.
- [x] 2.3 Compose both ports from the existing legacy service methods without changing preview state, autosync, service surface, domain logic, or migration inventory.

## 3. Workbench Migration

- [x] 3.1 Route both preview host aliases through the lazily resolved client while preserving primitive-string gating, original payload forwarding, the shared preview operation, empty single-flight arguments, immediate execution, and Tags-only invalidation.
- [x] 3.2 Route apply through the lazily resolved client while preserving action normalization and allowlisting, original payload forwarding, action-only single-flight arguments, immediate execution, and Tags-only invalidation.
- [x] 3.3 Preserve invalid-input cached-surface refresh and the absence of confirmation, deferred start, progress callbacks, streaming, and singular diagnostic transformation on both routes.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation for the migrated Tag import slice and remaining direct Tag commands.
- [x] 4.2 Run contract and root TypeScript checks; focused core tests 125, 140, 144, 152, 168, 175, and 176; the read-only UI harness; service-boundary and Synthesis invariant checks; targeted Prettier and ESLint; and `git diff --check`.
- [x] 4.3 Run the production build and strict OpenSpec validation, remove only unrelated generated help-doc artifacts, and confirm all tasks complete without altering the existing `reference/Skill-Runner` state.
