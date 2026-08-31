## ADDED Requirements

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
