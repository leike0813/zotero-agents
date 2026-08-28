## Purpose

Related-items sync is a visible provenance-protected operation; Zotero Library remains relation truth.

## Requirements
### Requirement: Related-items sync is visible and provenance protected

Synthesis SHALL update Zotero native related-items only through visible related-items sync operations triggered by explicit Synthesis update paths, explicit/debug commands, or approved review actions.

#### Scenario: Synthesis update changes accepted citation facts
- **WHEN** digest apply, Reference Sidecar refresh, or Advanced Matching changes accepted library-to-library citation facts
- **THEN** Synthesis MAY start a separate `related_items_sync` operation
- **AND** failure of that operation SHALL NOT roll back the triggering update.

#### Scenario: Graph cache is unavailable
- **WHEN** related-items sync needs accepted library-to-library edges
- **AND** graph cache is missing, stale, failed, empty, or graph refresh failed
- **THEN** it SHALL resolve accepted edges from active sidecar facts
- **AND** it SHALL NOT rebuild graph cache.
### Requirement: Related-items sync never owns Zotero relation truth

Synthesis SHALL treat Zotero native relation state as Zotero Library truth even when sidecar effects record attempted writes.

#### Scenario: Relation state is inspected
- **WHEN** Synthesis needs current related-items state
- **THEN** it SHALL read Zotero Library relation state
- **AND** sidecar effect rows SHALL be diagnostics/provenance only.
### Requirement: Related-items sync is stale-marked by sidecar changes


Synthesis SHALL mark related-items sync stale when sidecar changes may affect accepted library-to-library citation facts, without requiring current Citation Graph rows to already contain those facts.

#### Scenario: Digest apply marks related-items stale

- **WHEN** literature-digest apply updates sidecar facts for one source ref
- **THEN** related-items sync SHALL be marked stale for that source ref
- **AND** no related-items sync operation SHALL run during apply.

#### Scenario: Reference Sidecar refresh marks related-items stale

- **WHEN** Reference Sidecar refresh changes references artifact state for source refs
- **THEN** related-items sync SHALL be marked stale for those changed source refs
- **AND** no related-items sync operation SHALL run during Reference Sidecar refresh.
### Requirement: Related-items sync follows manual graph refresh


Related-items sync SHALL run after successful manual Citation Graph stale refresh, scoped to the final affected source refs returned by the graph refresh.

#### Scenario: Graph refresh returns source scope

- **WHEN** manual Citation Graph stale refresh expands canonical or binding deltas into affected source refs
- **THEN** the follow-up related-items sync SHALL use those affected source refs
- **AND** it SHALL NOT fall back to a full-library sync because source refs were omitted from the original stale delta.

#### Scenario: Graph refresh is skipped or failed

- **WHEN** manual Citation Graph stale refresh is skipped or fails
- **THEN** related-items sync SHALL NOT run as part of that command.

### Requirement: Successful manual incremental Graph refresh SHALL plan scoped Related Items effects

After a manual incremental Citation Graph refresh commits its graph/cache basis, the application SHALL use the final affected source refs to read accepted library-to-library edges and plan deterministic Related Items effects. Effects SHALL be persisted in `pending_external_write` before Host I/O and applied in batches of at most twenty-five.

#### Scenario: Incremental refresh changes accepted library edges
- **WHEN** a manual incremental refresh succeeds with affected source refs
- **THEN** its public result preserves `affected_source_refs` and may include a `related_items_sync` summary
- **AND** each planned effect exists durably before its Host batch is sent

#### Scenario: Full rebuild succeeds
- **WHEN** a full Citation Graph rebuild completes
- **THEN** it does not automatically start a library-wide Related Items synchronization
- **AND** the retired `syncRelatedItemsNow` public operation is not restored

### Requirement: Related Items coordination SHALL isolate effect outcomes and Graph success

The application SHALL coordinate applied, already-satisfied, not-found, failed, Synthesis ownership, undo, and echo states per effect. A Host receipt MUST correspond exactly once to every requested effect. Transport or malformed receipt failure SHALL leave the current batch pending and stop later batches.

#### Scenario: Host batch has mixed valid outcomes
- **WHEN** a valid receipt reports different outcomes for requested effects
- **THEN** each effect advances independently according to its outcome and ownership rules
- **AND** the Related Items operation records a bounded summary that survives reopen

#### Scenario: Host batch fails after Graph commit
- **WHEN** transport fails or a receipt is malformed
- **THEN** the current batch remains pending, later batches are not sent, and `related_items_sync` terminates independently
- **AND** the successful Graph refresh and its committed basis remain unchanged
