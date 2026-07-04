## ADDED Requirements

### Requirement: Assistant transcript rendering preference

The preferences UI SHALL provide a User Interface section containing
preferences for Assistant transcript pagination and virtualization, Markdown
Reader handling, and Assistant live rendering.

#### Scenario: User Interface preferences are grouped together

- **GIVEN** the preferences page is rendered
- **WHEN** the Backends section is followed by user-facing UI controls
- **THEN** those controls SHALL appear under a User Interface section
- **AND** the Agent Interface section SHALL appear after the User Interface
  section.

#### Scenario: Transcript pagination preference applies to the next scope

- **GIVEN** an ACP Skills transcript is already loaded for a selected run
- **WHEN** the user changes the transcript pagination and virtualization
  preference
- **THEN** the current transcript view SHALL keep its existing rendering mode
- **AND** the new preference value SHALL apply when a different transcript scope
  is selected or loaded.

#### Scenario: Disabled transcript pagination does not restore full snapshots

- **GIVEN** the transcript pagination and virtualization preference is disabled
- **WHEN** ACP Skills renders a selected transcript page
- **THEN** ACP Skills SHALL render the current page without virtualizing it
- **AND** it SHALL NOT request more pages from scroll events
- **AND** it SHALL NOT restore `selectedRun.transcriptItems`.
