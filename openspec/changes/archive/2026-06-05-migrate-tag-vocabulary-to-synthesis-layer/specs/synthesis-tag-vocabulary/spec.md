## ADDED Requirements

### Requirement: Synthesis tag vocabulary owns staged regulator suggestions

Synthesis Tag Vocabulary SHALL store and manage staged `tag-regulator`
suggestions as part of the Synthesis tag vocabulary domain.

#### Scenario: Regulator stages a suggestion

- **WHEN** tag-regulator stages a suggested tag
- **THEN** Synthesis Tag Vocabulary SHALL persist the staged entry with tag,
  facet, note, source flow, and parent bindings when provided
- **AND** the staged entry SHALL be readable through the Synthesis service API.

#### Scenario: Existing staged suggestion is staged again

- **WHEN** the same tag is staged more than once
- **THEN** Synthesis Tag Vocabulary SHALL merge parent bindings
- **AND** it SHALL NOT create duplicate staged rows for the same tag ignoring
  case.

### Requirement: Synthesis tag vocabulary promotes staged suggestions

Synthesis Tag Vocabulary SHALL promote selected staged suggestions into the
canonical controlled vocabulary through the normal canonical write boundary.

#### Scenario: Staged suggestion is promoted

- **WHEN** a user or workflow promotes a staged tag
- **THEN** the tag SHALL be added to canonical vocabulary if not already active
- **AND** the staged entry SHALL be removed after a successful commit.

#### Scenario: Invalid staged suggestion is promoted

- **WHEN** a staged tag violates the active tag protocol
- **THEN** promotion SHALL fail with validation diagnostics
- **AND** canonical vocabulary SHALL remain unchanged.

### Requirement: Synthesis tag vocabulary supports staged discard

Synthesis Tag Vocabulary SHALL allow staged suggestions to be discarded without
changing canonical vocabulary.

#### Scenario: Staged suggestion is discarded

- **WHEN** a staged tag is discarded
- **THEN** it SHALL be removed from staged state
- **AND** canonical vocabulary SHALL remain unchanged.

### Requirement: Synthesis Workbench Tags owns staged inbox management

The Synthesis Workbench Tags page SHALL provide the only builtin UI surface for
viewing and managing staged `tag-regulator` suggestions.

#### Scenario: User views staged suggestions

- **WHEN** the Tags page is opened
- **THEN** it SHALL expose Vocabulary and Staged subviews
- **AND** the Staged subview SHALL display the staged suggestion count
- **AND** staged rows SHALL include tag, facet, note, parent binding count,
  source flow, and update timestamp when available.

#### Scenario: User filters staged suggestions

- **WHEN** a user searches staged suggestions or selects a staged facet filter
- **THEN** the Tags page SHALL filter staged rows without changing canonical
  vocabulary or staged state.

#### Scenario: User edits a staged suggestion

- **WHEN** a user edits a staged tag suffix or note from the Staged subview
- **THEN** the change SHALL be persisted through Synthesis staged suggestion
  APIs
- **AND** the Tags surface SHALL refresh from Synthesis state.

#### Scenario: User promotes a staged suggestion from Workbench

- **WHEN** a user promotes a staged suggestion from the Staged subview
- **THEN** Synthesis SHALL promote the suggestion through the canonical write
  boundary
- **AND** it SHALL apply the promoted tag to bound parent items when they exist.

#### Scenario: User discards staged suggestions from Workbench

- **WHEN** a user discards one staged suggestion or clears all staged
  suggestions
- **THEN** Synthesis SHALL remove only staged state
- **AND** clear all SHALL require explicit user confirmation in the Workbench UI.

#### Scenario: Duplicate canonical tag is promoted

- **WHEN** a staged suggestion already exists as an active canonical tag
- **THEN** promotion SHALL report it as skipped
- **AND** the staged row SHALL remain available for user action.

## MODIFIED Requirements

### Requirement: Tag vocabulary export serves tag-regulator

Synthesis Tag Vocabulary SHALL provide the only host vocabulary export used by
the builtin tag-regulator workflow.

#### Scenario: Export strips management metadata

- **WHEN** tag-regulator requests controlled tags
- **THEN** the export SHALL contain active canonical tag strings in
  deterministic order
- **AND** it SHALL exclude note, source, deprecated, staged, and UI-only
  metadata.

#### Scenario: No active tags exist

- **WHEN** canonical Synthesis tag vocabulary has no active tags
- **THEN** tag-regulator request building SHALL fail deterministically
- **AND** it SHALL NOT fall back to legacy prefs-backed vocabulary state.
