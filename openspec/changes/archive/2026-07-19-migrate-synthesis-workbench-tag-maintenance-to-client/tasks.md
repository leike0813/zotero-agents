## 1. Red Tests

- [x] 1.1 Update Workbench and service-boundary tests to require all three Tag maintenance/export commands to use `client.tags`, forbid the migrated direct service methods, and retain 125 public service methods and four direct consumers.
- [x] 1.2 Update contract and in-process adapter tests for dedicated Tag exports, validation/rebuild normalization, existing export validation, missing ports, stable errors, storage-busy failures, and invalid legacy results.
- [x] 1.3 Lock empty single-flight arguments, protected/deferred rebuild, callback absence, clipboard host ownership and formatting, immediate validation/export, and existing Home/Tags invalidation behavior.

## 2. Tag Client Capability

- [x] 2.1 Extract the existing Tag contracts into an environment-neutral `tags.ts` module and add bounded validation/rebuild methods without Workbench, clipboard, confirmation, streaming, or progress callback contracts.
- [x] 2.2 Add two narrow in-process legacy Tag ports with JSON-value/object normalization plus stable `unavailable`, preserved client error, storage-busy, and `internal` behavior while retaining strict export normalization.
- [x] 2.3 Compose the validation and rebuild ports from existing no-argument legacy service calls without changing the public service surface or migration inventory.

## 3. Workbench Migration

- [x] 3.1 Route validation through the lazily resolved client while preserving empty single-flight arguments, immediate execution, no confirmation/diagnostic transformation, and Home-only invalidation.
- [x] 3.2 Route Tag projection rebuild through the lazily resolved client while preserving protected confirmation, empty single-flight arguments, deferred start, Tags invalidation, persisted progress polling, and callback absence.
- [x] 3.3 Route regulator export through the lazily resolved client while preserving immediate execution, host-owned clipboard writing, exact newline formatting, and Home-only invalidation; keep all adjacent Tag commands unchanged.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation for the migrated Tag maintenance/export slice and remaining direct Tag commands.
- [x] 4.2 Run contract and root TypeScript checks; focused core tests 125, 140, 144, 152, 168, 175, 176, and 177; the read-only UI harness; service-boundary and Synthesis invariant checks; targeted Prettier and ESLint; and `git diff --check`.
- [x] 4.3 Run the production build and strict OpenSpec validation, remove only unrelated generated help-doc artifacts, and confirm all tasks complete without altering the existing `reference/Skill-Runner` state.
