# synthesis-workbench-ui Specification

## Purpose
TBD - created by archiving change align-topic-synthesis-detail-ui-with-structured-artifact. Update Purpose after archive.
## Requirements
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

### Requirement: Markdown Export Remains Secondary

The Workbench SHALL keep canonical Markdown export as a secondary reader view.

#### Scenario: User opens Markdown export

- **WHEN** the user chooses Markdown export from Topic Detail
- **THEN** the Workbench SHALL open the generic Markdown reader
- **AND** it SHALL NOT replace the structured detail contract.

