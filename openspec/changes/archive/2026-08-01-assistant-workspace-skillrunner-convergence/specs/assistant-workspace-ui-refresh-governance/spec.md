## ADDED Requirements

### Requirement: SkillRunner tab refreshes flow through the publication plane

The SkillRunner tab SHALL be refreshed only through v1 region publications
delivered to the shared assistant child page. Transcript-only updates
SHALL NOT rebuild toolbar, banner, message counts, hint, composer, context
drawer, details drawer, or permission drawer DOM. Selecting a different
run SHALL publish the new owner's loading-first state before any
transcript page read, and transcript content SHALL render page first from
the in-memory session history while background history hydration proceeds.
No legacy full-snapshot channel SHALL remain.

#### Scenario: SkillRunner transcript update preserves chrome DOM

- **GIVEN** the SkillRunner tab has rendered a selected run with its chrome regions
- **WHEN** the run receives a transcript-only snapshot while streaming
- **THEN** only the transcript region MAY repaint
- **AND** every non-transcript managed region SHALL preserve its DOM node identity.

#### Scenario: SkillRunner owner switch is owner first

- **GIVEN** the SkillRunner tab shows run A
- **WHEN** the user selects run B whose history is not yet hydrated
- **THEN** the workspace publishes run B's loading-first regions before reading its transcript page
- **AND** the transcript renders the first available page without waiting for full history hydration.
