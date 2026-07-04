## ADDED Requirements

### Requirement: ACP Skills panel uses bounded recent run index

ACP Skills panel snapshots SHALL build their recent run list from a bounded
in-memory index of visible run records instead of scanning and sorting all ACP
run history on every panel refresh.

#### Scenario: Panel refresh reads bounded recent runs

- **GIVEN** ACP Skill run history contains more visible run records than the
  panel display limit
- **WHEN** an ACP Skills panel snapshot is prepared
- **THEN** the recent run list SHALL be read from the recent visible run index
- **AND** the refresh SHALL NOT perform a full run-record scan
- **AND** candidate reads SHALL be bounded by the panel display limit plus the
  truncation sentinel.

#### Scenario: Explicit old selection remains visible

- **GIVEN** a user explicitly selects a visible ACP Skill run outside the recent
  panel index window
- **WHEN** an ACP Skills panel snapshot is prepared for that selection
- **THEN** the selected run SHALL remain visible in the panel snapshot
- **AND** the panel refresh SHALL NOT perform a full run-record scan.

#### Scenario: Drawer notice is section independent

- **GIVEN** an ACP Skills drawer has a history truncation notice
- **AND** its visible sections do not include a non-empty running section
- **WHEN** the drawer is rendered
- **THEN** the notice SHALL still be displayed.
