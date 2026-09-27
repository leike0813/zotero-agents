## ADDED Requirements

### Requirement: Migration SHALL preserve known non-target managed payloads

The Literature Artifact migration SHALL migrate only `references-json` and `citation-analysis-json`. It SHALL preserve `digest-markdown`, `literature-score-json`, `conversation-note-markdown`, and `custom-markdown` without treating their presence as unsupported input. Unknown payload types SHALL remain blocked, and cleanup SHALL remove only migrated References/Citation representations.

#### Scenario: Legacy parent contains target and known non-target payloads

- **WHEN** a writable legacy parent contains migratable References/Citation evidence together with known Digest, Literature Score, Conversation, or Custom payloads
- **THEN** classification SHALL be based on the References/Citation conversion evidence without `unsupported_input`
- **AND** applying the candidate SHALL preserve every known non-target payload unchanged.

#### Scenario: Legacy parent contains an unknown payload type

- **WHEN** a legacy parent contains a payload type outside the six registered managed payload types
- **THEN** the candidate SHALL remain blocked with `unsupported_input`
- **AND** Apply SHALL NOT offer a force path.

### Requirement: Dashboard candidate selection SHALL be bounded and explicit

The Dashboard SHALL project at most 25 migration candidates per page from the runtime-owned scan plan and persisted candidate receipts. Ready candidates SHALL start selected, review-required candidates SHALL require an explicit user selection, and blocked candidates SHALL be disabled. Applying from the Dashboard SHALL consume the runtime-owned selection and SHALL NOT require the page to hold the complete candidate ID set.

#### Scenario: A scan produces more than one candidate page

- **WHEN** a migration scan produces more than 25 candidates
- **THEN** the Dashboard SHALL render only the current page with forward and backward navigation
- **AND** the candidate list SHALL remain independently scrollable
- **AND** selecting or paging SHALL NOT expose parent refs or raw legacy payloads.

#### Scenario: User reviews candidate classifications

- **WHEN** the candidate page contains ready, review-required, and blocked candidates
- **THEN** ready candidates SHALL be selected by default
- **AND** review-required candidates SHALL remain unselected until the user opts in
- **AND** blocked candidates SHALL be disabled and excluded from Apply.

