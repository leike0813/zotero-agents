## 1. Red Tests

- [x] 1.1 Update core 125 Workbench tests for client routing, defaults, trimming, single-flight, empty skips, delete confirmation ownership, Tags-only invalidation, and forbidden direct vocabulary load/save in the migrated branches.
- [x] 1.2 Update core 140 domain tests for same-tag update, true and case-only rename, exact/case-insensitive conflicts, missing update/delete, alias and replacement cascade, note clearing, protocol validation, timestamp preservation, and fault-injected rollback.
- [x] 1.3 Update core 144 autosync tests for exactly one notification after commit, no notification for diagnostics/no-op, and notification failure preserving the committed mutation.
- [x] 1.4 Update core 168/175 contract and adapter tests for strict DTO rebuilding, invalid-before-port, opaque results, stable errors, and the 128-method/four-consumer inventory.

## 2. Client and Domain Implementation

- [x] 2.1 Add strict public update/delete DTOs and `SynthesisTagsClient` methods returning opaque `SynthesisTagCommandResult`.
- [x] 2.2 Add adapter ports that rebuild canonical DTOs, discard unknown fields, normalize opaque results, and preserve stable client error categories.
- [x] 2.3 Implement transaction-scoped Tag Vocabulary entry update/delete with metadata preservation, conflict/not-found/no-op semantics, reference maintenance, warning recomputation, and complete rollback.
- [x] 2.4 Expose and compose two public service methods through `runCanonicalWriteWithAutosync`, notifying once only for committed mutations.

## 3. Workbench Migration and Inventory

- [x] 3.1 Route entry update/delete through the lazily resolved default client inside the existing single-flight closures while preserving current input normalization, confirmation, immediate execution, failure feedback, and Tags-only invalidation.
- [x] 3.2 Update the public service inventory to 128 methods and four direct consumers, classifying both methods as `tag_commands`, `knowledge.tags`, and `client_capability`.

## 4. Documentation and Validation

- [x] 4.1 Update the Synthesis README, runtime/rebuild, Workbench host/UI documentation, and service inventory to describe the atomic client-owned entry mutations and Sync as the final Workbench direct-service slice.
- [x] 4.2 Run core 125, 140, 144, 152, 168, 175, 176, and 177; the read-only UI harness; Synthesis invariant, contract/root TypeScript, and service-boundary checks; targeted Prettier/ESLint; and `git diff --check`.
- [x] 4.3 Run the production build and strict OpenSpec validation, preserving the existing `reference/Skill-Runner` state and leaving the change unarchived and uncommitted.
