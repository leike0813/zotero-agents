## ADDED Requirements

### Requirement: Reset scope SHALL be explicit and recoverable

Reset SHALL require explicit scope and confirmation, exclusive production ownership and a verified backup. Database reset SHALL preserve canonical data and schema identities. Clean-install reset SHALL default to preview and replace the live canonical tree only on confirmed execution. Neither operation SHALL mutate Zotero Library, plugin task storage or remote WebDAV content.

#### Scenario: Preview or confirmation mismatch

- **WHEN** clean-install reset omits dryRun or a destructive request has the wrong confirmation
- **THEN** preview reports per-table counts or confirmation_mismatch is returned
- **AND** no repository, canonical or backup write occurs

#### Scenario: Runtime work is still active

- **WHEN** a foreground call, background task, compute job, transfer session or autosync conflicts with destructive reset
- **THEN** reset fails before persistent mutation
- **AND** new calls cannot observe a partly reset repository or canonical tree

#### Scenario: Process exits across the reset transaction

- **WHEN** startup finds the reset journal after acquiring the production owner lock
- **THEN** the SQLite transaction marker determines whether to restore staged canonical data or retain the committed empty store
- **AND** recovery completes before application composition and ready publication
- **AND** failed recovery prevents state access

#### Scenario: Reset commits successfully

- **WHEN** database reset receives `RESET SYNTHESIS DATABASE` or destructive clean-install reset receives `RESET SYNTHESIS CLEAN INSTALL`
- **AND** the reset result reports reset
- **THEN** business state is empty through public reads and after reopen
- **AND** database reset retains canonical JSON and checkpoints; clean-install reset retains their backup outside the live canonical tree
- **AND** old frozen search continuations are invalidated and pending autosync cannot replay pre-reset dirty state

#### Scenario: Backup cannot be verified

- **WHEN** backup creation or verification fails
- **THEN** repository and canonical data remain unchanged
