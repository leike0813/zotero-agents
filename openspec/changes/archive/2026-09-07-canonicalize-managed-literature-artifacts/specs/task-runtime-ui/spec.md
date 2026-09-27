## ADDED Requirements

### Requirement: Dashboard SHALL provide a permanent bounded Migrations region

The Dashboard system navigation SHALL include a permanent Migrations tab after Runtime Logs. Its first entry SHALL be a statically registered Literature Artifact library migration. The region SHALL render only typed metadata, library scope, availability, bounded preview/progress/attention/history, and command state; it SHALL not interpret or edit artifact payloads.

#### Scenario: Migrations is rendered after PR40 page migration
- **WHEN** the Dashboard renders its system navigation
- **THEN** Migrations SHALL appear after Runtime Logs
- **AND** the entry SHALL render through the page-region architecture without replacing or rebuilding unrelated Dashboard regions.

#### Scenario: A migration has no candidates
- **WHEN** the registered migration reports an empty scan
- **THEN** the Migrations tab and entry SHALL remain visible
- **AND** the UI SHALL show an empty typed state for that entry.

#### Scenario: A migration is unavailable
- **WHEN** a read-only library, stale definition, missing permission, or runtime capability makes apply unavailable
- **THEN** the entry SHALL show its availability and bounded reason
- **AND** the region SHALL not hide the migration surface or offer an unsafe apply control.

### Requirement: Migration UI commands SHALL be local, typed, and effect-separated

The Migrations region SHALL route scan, apply, stop, continue, preview, receipt, and history commands through the Dashboard-local typed projection. Opening or observing the region, selecting a library, deep-linking, and receiving notifications SHALL not scan or write. Apply SHALL submit only runtime-issued scan and candidate references; it SHALL not submit converted artifacts, mappings, plans, or basis authority.

#### Scenario: User opens a migration entry
- **WHEN** the user navigates to, selects, or deep-links the migration entry
- **THEN** the UI SHALL request or display an observation snapshot only
- **AND** no scan or write command SHALL be issued.

#### Scenario: User confirms selected candidate sets
- **WHEN** the user confirms ready or review-required sets
- **THEN** the UI SHALL send the scan operation identity and selected runtime candidate IDs
- **AND** it SHALL not construct a Source Reference, Citation, mapping, or conversion plan in the browser.

#### Scenario: A migration operation is active in another Dashboard window
- **WHEN** a second window opens or starts the same library migration
- **THEN** both windows SHALL observe one shared active snapshot
- **AND** a second start SHALL show typed `busy` rather than queueing work.

### Requirement: Migration history and progress SHALL remain bounded and auditable

The region SHALL render per-run and per-set state from durable typed receipts, including classification, verified/unresolved/recovered counts, reason codes, processed and remaining counts, bounded diagnostics, and terminal outcome. It SHALL not expose raw note HTML, storage paths, native IDs, full payload copies, or a second long-term backup representation.

#### Scenario: A set requires review or attention
- **WHEN** a scan or apply produces unresolved linkage, snapshot recovery, skipped review sets, or cleanup repair
- **THEN** the region SHALL show the typed classification and bounded reason/count
- **AND** it SHALL require explicit set-level review or continue action where the contract requires it.

#### Scenario: A run finishes with cleanup attention
- **WHEN** canonical data is committed but old payload cleanup fails
- **THEN** the region SHALL show `completed_with_attention` and the affected set's `repair_required` result
- **AND** it SHALL retain the canonical result while exposing the available repair action.

#### Scenario: The process restarts with an incomplete run
- **WHEN** history contains a nonterminal run after restart
- **THEN** the region SHALL display it as interrupted/failed according to the durable receipt
- **AND** it SHALL not present the old preview as directly actionable without a fresh scan.
