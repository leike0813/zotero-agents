## 1. Red Tests

- [x] 1.1 Update Workbench and service-boundary tests to require all three staged Tag bulk command branches to use `client.tags`, forbid direct service routing in those branches, and retain 125 public service methods and four direct consumers.
- [x] 1.2 Update contract and in-process adapter tests for the strict selection DTO, empty selections, canonical rebuilding, object normalization, missing ports, stable errors, storage-busy failures, and invalid legacy results.
- [x] 1.3 Lock Workbench array/singular normalization, empty-selection skipping, first-tag single-flight arguments, clear's global key, immediate execution, callback/diagnostic absence, and Tags-only invalidation; retain Workflow Host compatibility.

## 2. Staged Tag Bulk Capability

- [x] 2.1 Add the shared Tag selection DTO and opaque command result, add promote/clear methods, and narrow discard without Workbench, confirmation, streaming, callback, or progress contracts.
- [x] 2.2 Add three narrow in-process legacy ports with validation-before-port, canonical request rebuilding, object result normalization, and stable `invalid_request`, `unavailable`, preserved client error, storage-busy, and `internal` behavior.
- [x] 2.3 Compose the three ports from existing legacy service calls and update Workflow Host request typing without changing method count, notification semantics, service surface, or migration inventory.

## 3. Workbench Migration

- [x] 3.1 Route promote through the lazily resolved client while preserving array/singular normalization, empty-selection skipping, first-tag single-flight arguments, immediate execution, plural diagnostics, and Tags-only invalidation.
- [x] 3.2 Route discard through the lazily resolved client with the same preserved Workbench behavior while keeping empty selection legal for direct client and Workflow Host consumers.
- [x] 3.3 Route clear through the lazily resolved no-argument client method while preserving empty single-flight arguments, immediate execution, no confirmation/defer/progress/diagnostic transformation, and Tags-only invalidation.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation for the migrated staged Tag bulk slice and remaining direct Tag commands.
- [x] 4.2 Run contract and root TypeScript checks; focused core tests 125, 140, 144, 152, 168, 175, 176, and 177; the read-only UI harness; service-boundary and Synthesis invariant checks; targeted Prettier and ESLint; and `git diff --check`.
- [x] 4.3 Run the production build and strict OpenSpec validation, remove only unrelated generated help-doc artifacts, and confirm all tasks complete without altering the existing `reference/Skill-Runner` state.
