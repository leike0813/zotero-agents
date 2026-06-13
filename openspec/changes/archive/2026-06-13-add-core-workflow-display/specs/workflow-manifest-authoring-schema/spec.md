## ADDED Requirements

### Requirement: Workflow manifests SHALL support display-only core metadata

Workflow manifests SHALL allow an optional `display` object with `core` and `emoji` fields. `display.core` SHALL be treated as false when omitted. `display.emoji` SHALL be a display prefix only and SHALL NOT change workflow ids, parameter keys, request payloads, or runtime execution.

#### Scenario: Core display metadata is accepted

- **GIVEN** a workflow manifest declares `display.core` as true and `display.emoji` as a non-empty string
- **WHEN** workflow manifests are loaded
- **THEN** the workflow loads successfully with the display metadata preserved

#### Scenario: Invalid display metadata is rejected

- **GIVEN** a workflow manifest declares `display.core` or `display.emoji` with an invalid type
- **WHEN** workflow manifests are loaded
- **THEN** the workflow is rejected with a manifest validation diagnostic
