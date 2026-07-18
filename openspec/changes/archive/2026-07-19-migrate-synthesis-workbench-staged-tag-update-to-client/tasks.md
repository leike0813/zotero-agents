## 1. Red Tests

- [x] 1.1 Update Workbench and service-boundary tests to require staged Tag update to use `client.tags`, forbid direct stage/discard routing in that branch, and require 126 public service methods with four direct consumers.
- [x] 1.2 Update contract and in-process adapter tests for the strict DTO, canonical trimming/deduplication/sorting, invalid-before-port behavior, opaque results, missing ports, stable errors, storage busy, and invalid legacy results.
- [x] 1.3 Add or extend Tag domain tests for same-tag update, missing original, target-free rename, exact/case collision, case-variant cleanup, field/timestamp merges, validation bypass, and full rollback after a fault-injected repository write.
- [x] 1.4 Lock Workbench host defaults, trimming, aliases, `{ tag }` single-flight arguments, empty-tag skip, immediate start, absence of extra UI orchestration, and Tags-only invalidation.

## 2. Atomic Staged Tag Update Capability

- [x] 2.1 Add the strict staged Tag update DTO and `SynthesisTagsClient.updateStagedTagSuggestion()` returning the opaque shared Tag command result.
- [x] 2.2 Implement the Tag Vocabulary domain/service command as one repository transaction with deterministic rename/collision merge semantics, rollback, no protocol validation, and no canonical autosync.
- [x] 2.3 Register the service method as `tag_commands / knowledge.tags / client_capability` and update the public method inventory to 126 while retaining four direct consumers.
- [x] 2.4 Add the narrow in-process legacy port, validation-before-port canonical adapter, result normalization, stable error mapping, and legacy service composition.

## 3. Workbench Migration

- [x] 3.1 Route staged Tag update through the lazily resolved default client inside the existing single-flight closure while preserving payload normalization and command orchestration.
- [x] 3.2 Remove only the staged-update branch's direct discard/stage calls and retain generic staging, bulk commands, Tag import, vocabulary entry mutations, and adjacent UI pending-key behavior unchanged.

## 4. Documentation and Validation

- [x] 4.1 Update Synthesis README, runtime/rebuild, Workbench host, and Workbench UI current-state documentation for the atomic staged Tag update and remaining direct Tag routes.
- [x] 4.2 Run contract and root TypeScript checks; core tests 125, 140, 144, 152, 168, 175, 176, and 177; the read-only UI harness; service-boundary and Synthesis invariant checks; targeted Prettier and ESLint; and `git diff --check`.
- [x] 4.3 Run the production build and strict OpenSpec validation, remove only unrelated generated help-doc artifacts, and confirm all tasks complete without altering `reference/Skill-Runner`.
