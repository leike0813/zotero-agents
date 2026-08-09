## ADDED Requirements

### Requirement: Index rating reads SHALL remain page bounded

Index rating projection SHALL remain bounded to the currently requested
library page and SHALL NOT become canonical persisted Synthesis state.

#### Scenario: Index loads ratings

- **WHEN** the Workbench loads an Index page
- **THEN** it SHALL inspect score notes only for the bounded current page
- **AND** it SHALL NOT perform a full-library projection
- **AND** it SHALL NOT persist rating data in the reference sidecar.

#### Scenario: Public reference index is read

- **WHEN** MCP or Host Bridge returns the reference index
- **THEN** literature rating fields SHALL NOT be added to that public DTO.
