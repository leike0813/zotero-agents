## ADDED Requirements

### Requirement: Workbench provides a Tags management page

The Synthesis Workbench SHALL provide a Tags page as the primary user interface for Synthesis KG tag vocabulary management.

#### Scenario: Tags tab is available

- **WHEN** the Workbench renders its top-level navigation
- **THEN** it SHALL include a Tags tab
- **AND** selecting it SHALL render tag vocabulary state from the Synthesis service snapshot.

#### Scenario: Tags page renders management layout

- **WHEN** tag vocabulary state is loaded
- **THEN** the Tags page SHALL render facet filtering, search, a tag list or table, and a tag inspector
- **AND** the inspector SHALL expose canonical tag, facet, note, aliases, abbrev, deprecated state, replacement, usage count, source, last synced, and validation warnings when present.

#### Scenario: Tags page exposes import and validation flows

- **WHEN** the user invokes validate or import actions
- **THEN** the page SHALL reflect validation diagnostics or import merge preview state without silently overwriting canonical vocabulary.

### Requirement: Tags page surfaces projection status

The Synthesis Workbench SHALL expose local tag-index projection status without blocking navigation or reading flows.

#### Scenario: Projection is stale

- **WHEN** the tag-index projection is stale
- **THEN** the Tags page SHALL show stale or rebuilding status
- **AND** it SHALL keep existing vocabulary data visible.
