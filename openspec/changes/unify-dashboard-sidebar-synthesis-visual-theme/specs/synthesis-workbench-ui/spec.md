# synthesis-workbench-ui

## MODIFIED Requirements

### Requirement: Structured Topic Detail Uses A Dedicated Shell

The Synthesis Workbench SHALL render structured Topic Detail outside the
generic Workbench sidebar/topbar/content shell. The detail shell SHALL consume
the shared visual theme foundation through mapped `--topic-*` tokens.

#### Scenario: Structured detail is open

- **GIVEN** a structured topic detail DTO is loaded
- **WHEN** the Workbench renders the reader tab
- **THEN** it SHALL render a dedicated full-height topic detail shell
- **AND** it SHALL show only one topic title/topbar
- **AND** its topic-specific surfaces SHALL follow the selected light or dark
  theme.

