## ADDED Requirements

### Requirement: Staged Tag entry points SHALL share one legacy-binding migration gate

List, stage, update, promote, discard, and clear SHALL all pass through one mutually exclusive application migration gate. The gate SHALL preserve stable refs, classify positive numeric legacy IDs separately from invalid bindings, resolve sorted unique IDs through `effects.staged_tag_binding.resolve` in batches of at most one hundred, and reject new numeric bindings at the public DTO boundary.

#### Scenario: Mixed historical bindings are migrated
- **WHEN** staged rows contain stable refs, valid legacy IDs, missing IDs, and invalid bindings
- **THEN** resolved refs are merged and sorted while missing or invalid bindings are removed without deleting the staged suggestion
- **AND** all affected rows are rewritten by one staged-revision CAS

#### Scenario: Host response is incomplete or invalid
- **WHEN** resolved and missing IDs are not a complete duplicate-free partition of the requested batch, or a resolved ref belongs to another library
- **THEN** migration fails with a stable unavailable outcome
- **AND** staged JSON and revision remain byte-for-byte unchanged

#### Scenario: Concurrent staged entry points arrive
- **WHEN** multiple staged operations encounter unmigrated rows concurrently
- **THEN** one migration attempt runs and the callers observe the same committed result
- **AND** a failed attempt is not cached and may be retried by a later entry

### Requirement: Startup SHALL attempt staged binding migration without blocking readiness

Sidecar startup SHALL perform one best-effort migration attempt and record the fixed `staged-tag-binding-migration` operation with running and completed or failed state plus processed and discarded counts. Failure SHALL not prevent readiness, but staged entry points SHALL return stable unavailable until a later gate attempt succeeds.

#### Scenario: Startup migration fails
- **WHEN** Host resolution or atomic rewrite fails during startup
- **THEN** the sidecar becomes ready and the migration operation records failure
- **AND** the original staged rows remain unchanged for a later retry
