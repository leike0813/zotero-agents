## ADDED Requirements

### Requirement: Migration scanning SHALL expose bounded real progress

The Dashboard migration view SHALL expose scan progress from real library item counts, remain indeterminate until a total is known, and update through the existing bounded Dashboard snapshot cadence. Stop SHALL prevent admission of later scan items or pages.

#### Scenario: A library scan discovers its total
- **WHEN** the first bounded library page supplies the total item count
- **THEN** the Dashboard SHALL show completed items, total items, and discovered candidate count
- **AND** progress SHALL advance monotonically without an invented percentage.

### Requirement: Migration review SHALL operate on the complete bounded plan

The Dashboard SHALL filter the complete process-local preview before paging and SHALL expose at most 25 summaries at once. A selected summary SHALL open a bounded detail drawer containing safe counts, diagnostics, concrete issues, applicable runtime-issued options, and the candidate disposition without parent refs or payload content.

#### Scenario: A user filters and opens a migration candidate
- **WHEN** the user filters by text, classification, reason, or disposition and opens one result
- **THEN** counts and paging SHALL describe the complete filtered preview
- **AND** the detail drawer SHALL expose only bounded review facts and runtime-issued option identities.

### Requirement: Blocking migration issues SHALL require explicit runtime-owned resolutions

Each independently resolvable duplicate, linkage, recovery, conflict, or declared data-loss issue SHALL have its own runtime-issued identity and applicable choices. The runtime SHALL own selected choices, recompute candidate eligibility, re-read current source facts before apply, and reject a changed basis. A candidate SHALL be included only after every blocking issue is resolved and the user explicitly approves it; skipping SHALL leave source data unchanged.

#### Scenario: A blocked candidate has several issues
- **WHEN** the user chooses a resolution for each issue and approves the resulting candidate
- **THEN** Apply SHALL replay those runtime-owned choices against a matching current basis
- **AND** canonical verification SHALL precede cleanup of consumed legacy target data.

#### Scenario: Source facts change after review
- **WHEN** a reviewed candidate no longer matches the scan basis at apply time
- **THEN** the candidate SHALL produce `changed_since_scan` without writing or cleanup
- **AND** the user SHALL need a fresh scan and review.

## MODIFIED Requirements

### Requirement: Migration SHALL preserve known non-target managed payloads

The Literature Artifact migration SHALL migrate only `references-json` and `citation-analysis-json`. It SHALL preserve `digest-markdown`, `literature-score-json`, `literature-matching-metadata-json`, `conversation-note-markdown`, and `custom-markdown` without treating their presence as unsupported input. Unknown payload types SHALL remain blocked unless the user selects a lossless preserve-and-migrate option, and cleanup SHALL remove only migrated References/Citation representations.

#### Scenario: Legacy parent contains target and known non-target payloads
- **WHEN** a writable legacy parent contains migratable References/Citation evidence together with known Digest, Literature Score, Literature Matching Metadata, Conversation, or Custom payloads
- **THEN** classification SHALL be based on the References/Citation conversion evidence without `unsupported_input`
- **AND** applying the candidate SHALL preserve every known non-target payload unchanged.

#### Scenario: Legacy parent contains an unknown payload type
- **WHEN** a legacy parent contains a payload type outside the registered target and non-target managed payload types
- **THEN** the candidate SHALL remain blocked until the user selects an applicable runtime-issued preservation option or skips it
- **AND** Apply SHALL NOT silently discard the unknown payload.

### Requirement: Dashboard candidate selection SHALL be bounded and explicit

The Dashboard SHALL project at most 25 migration candidates per page after filtering the runtime-owned scan plan and persisted candidate receipts. Ready candidates SHALL start included, review-required candidates SHALL require explicit issue review and approval, and blocked candidates SHALL remain excluded until every blocking issue has an accepted runtime-owned resolution. Applying from the Dashboard SHALL consume runtime-owned dispositions and choices and SHALL NOT require the page to hold the complete candidate ID set.

#### Scenario: A scan produces more than one candidate page
- **WHEN** a migration scan produces more than 25 candidates
- **THEN** the Dashboard SHALL render only the current filtered page with forward and backward navigation
- **AND** the candidate list SHALL remain independently scrollable
- **AND** selecting, filtering, opening details, or paging SHALL NOT expose parent refs or raw legacy payloads.

#### Scenario: User reviews candidate classifications
- **WHEN** the candidate page contains ready, review-required, and blocked candidates
- **THEN** ready candidates SHALL be included by default
- **AND** review-required candidates SHALL remain pending until their issues are reviewed and the candidate is approved
- **AND** blocked candidates SHALL remain excluded until all blocking issues are resolved or the candidate is explicitly skipped.
