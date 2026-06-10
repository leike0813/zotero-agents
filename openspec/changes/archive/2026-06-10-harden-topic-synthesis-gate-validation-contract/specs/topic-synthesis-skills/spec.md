## MODIFIED Requirements

### Requirement: Split runtime gate validation

The split topic synthesis runtime SHALL reject invalid stage payloads at the stage gate before advancing runtime state.

#### Scenario: Schema keywords are enforced

- **GIVEN** a stage payload schema declares nested required fields, enum values, min lengths, array item schemas, or numeric ranges
- **WHEN** the agent submits a payload that violates those constraints
- **THEN** the gate rejects the payload
- **AND** the current stage is not marked complete

#### Scenario: Runtime-source references are enforced

- **GIVEN** a stage payload references resolved source papers
- **WHEN** any `source_paper_refs` entry is empty or absent where required, or does not exist in the current workset
- **THEN** the gate rejects the payload before finalization

#### Scenario: Final apply requirements are checked at source stage

- **GIVEN** Host apply requires complete taxonomy, claim, timeline, coverage, external, and summary fields
- **WHEN** the corresponding stage payload omits those fields
- **THEN** the stage submit fails before the final candidate is generated
