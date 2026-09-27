## ADDED Requirements

### Requirement: Migration history SHALL expose bounded run and set outcomes

The Dashboard SHALL present migration history as a run list and selected-run detail. Run detail SHALL include state, timestamps, processed and remaining counts, reason, and bounded diagnostics. Its paged set receipts SHALL include the persisted parent title, classification, outcome, counts, reason codes, and bounded diagnostics without exposing raw payloads or native refs. Terminal set rows SHALL display their outcome rather than an unchecked selection control.

#### Scenario: A user inspects a failed migration
- **WHEN** the user selects a failed run in migration history
- **THEN** the Dashboard SHALL identify which sets applied, failed, were skipped, changed, or still remained pending
- **AND** it SHALL expose the stable failure phase and recovery diagnostics
- **AND** Continue SHALL start a fresh scan rather than replaying the old plan.

## MODIFIED Requirements

### Requirement: Migration apply SHALL use a runtime-owned plan and one verified parent-set commit

The UI SHALL submit only a scan operation identity and runtime-issued candidate IDs. The runtime SHALL re-read current facts, permissions, definition version, and basis before each set. For a paired References/Citation set, the trusted writer SHALL commit both artifacts in the same Zotero transaction with one operation identity and one durable set receipt; it SHALL verify the pair and basis before any cleanup.

#### Scenario: A candidate changed after scan
- **WHEN** the current artifact, note revision, permission, or basis no longer matches the scan plan
- **THEN** the set SHALL produce `changed_since_scan` without writing
- **AND** other independent sets MAY continue.

#### Scenario: A paired set passes verification
- **WHEN** staging, References/Citation validation, basis verification, and parent-set commit all succeed
- **THEN** the canonical pair SHALL be visible as one committed semantic result
- **AND** only then MAY old inline payloads be removed and old user payload attachments moved to Trash.

#### Scenario: Cleanup fails after canonical commit
- **WHEN** canonical verification succeeds but cleanup cannot be completed
- **THEN** the canonical result SHALL be retained
- **AND** the set SHALL be `repair_required` and the run SHALL be `completed_with_attention`.

#### Scenario: An infrastructure failure occurs before a set commits
- **WHEN** a database or transaction failure prevents the set's commit
- **THEN** the set and run SHALL report a typed failure
- **AND** the runtime SHALL stop claiming later sets while preserving every earlier committed receipt
- **AND** independently committed sets SHALL not be rolled back by a global coordinator.

### Requirement: Migration lifecycle SHALL be durable, single-flight, and restart-safe

The migration runtime SHALL permit at most one active scan/apply in a process and SHALL share its active snapshot with multiple Dashboard windows. It SHALL persist an envelope and one receipt per completed set with library, migration ID, definition version, parent title, refs, basis/hash, classification, outcome, timestamps, bounded counts, and bounded diagnostics. Terminal run states SHALL be `completed`, `completed_with_attention`, or `failed`.

#### Scenario: A second run starts while one is active
- **WHEN** a user starts a scan or apply while another migration is active
- **THEN** the request SHALL return typed `busy` with the active run identity
- **AND** it SHALL not queue or duplicate work.

#### Scenario: The user stops a run
- **WHEN** stop is requested
- **THEN** the runtime SHALL stop claiming later sets
- **AND** a set already in commit SHALL finish verification and receipt persistence before stopping
- **AND** the run SHALL report `completed_with_attention` with processed and remaining counts.

#### Scenario: The process restarts with a nonterminal run
- **WHEN** a previously persisted run is found nonterminal after restart
- **THEN** opening migration UI SHALL classify it as `failed: interrupted`
- **AND** the runtime SHALL not replay, scan, dispatch, or continue it automatically.

#### Scenario: The user continues a prior run
- **WHEN** the user chooses Continue
- **THEN** the runtime SHALL create a new apply operation and re-read, reclassify, and revalidate every candidate
- **AND** it SHALL require fresh review when facts or classification changed.

### Requirement: Migration scanning SHALL expose bounded real progress

The Dashboard migration view SHALL expose scan progress from real library item counts, remain indeterminate until a total is known, and update through the existing bounded Dashboard snapshot cadence. Stop SHALL prevent admission of later scan items or pages.

#### Scenario: A library scan discovers its total
- **WHEN** the first bounded library page supplies the total item count
- **THEN** the Dashboard SHALL show completed items, total items, and discovered candidate count
- **AND** progress SHALL advance monotonically without an invented percentage.

#### Scenario: Scan or apply is active
- **WHEN** a scan or apply command has entered the migration runtime
- **THEN** the initiating command SHALL show a busy state and the Dashboard SHALL immediately show real progress
- **AND** filters, history selection, paging, and candidate mutation controls SHALL remain locked until the operation settles
- **AND** Stop SHALL remain available for the active run.
