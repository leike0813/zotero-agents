## ADDED Requirements

### Requirement: Synthesis Tags page is a table-first workbench

The Synthesis Workbench Tags page SHALL present tag management as a summary bar
and table work area without a separate inspector panel.

#### Scenario: User opens Tags page

- **WHEN** the Tags page is rendered
- **THEN** it SHALL show a summary bar with canonical tag count, staged
  suggestion count, validation warning count, and tag cache state
- **AND** it SHALL show table-first Vocabulary and Staged subviews.

#### Scenario: User reviews canonical vocabulary

- **WHEN** the Vocabulary subview is active
- **THEN** canonical tag details such as tag, facet, status, usage, source,
  note, aliases, abbreviations, and warnings SHALL be visible in the table or
  expanded row content
- **AND** no separate tag inspector SHALL be required.

#### Scenario: User reviews staged suggestions

- **WHEN** the Staged subview is active
- **THEN** staged rows SHALL support search, facet filtering, multi-select,
  row-level promote/discard, and bulk promote/discard
- **AND** clear all SHALL require explicit user confirmation.

#### Scenario: User edits a staged suggestion

- **WHEN** a staged tag suffix or note is edited
- **THEN** the UI SHALL keep the draft visible while the update is pending
- **AND** it SHALL show saved or failed state inline without using an inspector.

#### Scenario: User opens Tags actions

- **WHEN** the Tags action bar is rendered
- **THEN** it SHALL include Validate, Export, and Import actions
- **AND** it SHALL NOT expose `rebuildTagVocabularyIndex`.
