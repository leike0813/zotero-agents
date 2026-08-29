# synthesis-workbench-topic-report-client-consumer Specification

## Purpose
Defines the Synthesis Workbench client consumer contract for topic report operations, specifying how Workbench reads and reacts to client-side state changes.

## Requirements

### Requirement: Workbench Topic Report export uses the topics client

The Synthesis Workbench SHALL obtain Topic Report data through the existing `SynthesisClient.topics.getTopicReport` capability and SHALL NOT call the legacy service report method directly.

#### Scenario: A Topic Report export is requested
- **WHEN** the Workbench exports a report for a valid Topic identifier
- **THEN** it SHALL lazily resolve the default client and request that Topic through `topics.getTopicReport`

#### Scenario: The Topic identifier is missing
- **WHEN** report export is invoked without a Topic identifier
- **THEN** the Workbench SHALL reject before resolving the client or requesting report data

### Requirement: Report export behavior is preserved

The Workbench SHALL preserve its existing report body and title handling, safe filename generation, file-picker cancellation, newline normalization, runtime file write, command single-flight, and error-reporting behavior after the client migration.

#### Scenario: An available report is exported
- **WHEN** the client returns a non-empty Markdown report and the user selects an output path
- **THEN** the Workbench SHALL write the report with exactly one required trailing newline using the existing safe title-derived filename suggestion

#### Scenario: Report body is unavailable
- **WHEN** the client result has no usable Markdown body
- **THEN** the Workbench SHALL fail with the existing unavailable-report semantics before writing a file

#### Scenario: The file picker is canceled
- **WHEN** the user does not select an output path
- **THEN** the Workbench SHALL return without writing a file

### Requirement: Migration boundaries remain unchanged

This consumer migration SHALL NOT add or modify a Synthesis client contract, remove the service report method, change migration inventory membership, or migrate progress polling, commands, or mutations.

#### Scenario: Service boundary checks run
- **WHEN** the migration boundary is inspected after the report consumer change
- **THEN** the service public method count SHALL remain 125
- **AND** the direct legacy consumer allowlist SHALL remain exactly legacy composition, Workbench, Host Bridge, and MCP

#### Scenario: Client contracts are reviewed
- **WHEN** the Topic Report migration is reviewed
- **THEN** the existing topics capability SHALL remain the sole client contract used for the report read
