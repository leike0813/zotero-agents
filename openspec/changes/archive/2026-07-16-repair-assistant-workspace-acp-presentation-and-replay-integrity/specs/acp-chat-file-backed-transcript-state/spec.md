## MODIFIED Requirements

### Requirement: Chat cold selection is owner-first

Selecting a Chat backend/conversation SHALL publish the new owner loading state
before indexed page read or full mirror hydration. Indexed page readiness and
full mirror readiness SHALL remain independent.

#### Scenario: The cold full mirror cache misses

- **WHEN** a historical conversation is selected
- **THEN** the indexed page can render the selected page
- **AND** full mirror cache absence does not hide the transcript.
