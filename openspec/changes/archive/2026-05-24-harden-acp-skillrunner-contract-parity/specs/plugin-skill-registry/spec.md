## ADDED Requirements

### Requirement: Registry SHALL validate Skill Runner package contracts

The plugin skill registry SHALL exclude malformed Skill Runner-compatible skill packages from effective entries and report structured diagnostics.

#### Scenario: Identity mismatch is rejected

- **WHEN** a candidate skill's directory name, `runner.json` id, and `SKILL.md` frontmatter name do not match
- **THEN** the registry SHALL exclude the candidate
- **AND** it SHALL report an identity mismatch diagnostic.

#### Scenario: Runner manifest fields are validated

- **WHEN** `execution_modes`, `max_attempt`, `entrypoint.result_json_filename`, `schemas`, or `runtime.default_options` contain invalid values
- **THEN** the registry SHALL exclude the candidate
- **AND** it SHALL report a runner validation diagnostic.

#### Scenario: Schema files are validated

- **WHEN** a candidate declares or provides default `input`, `parameter`, or `output` schema files
- **THEN** the registry SHALL verify that each schema is readable JSON and compileable as JSON Schema.

#### Scenario: Schema annotations are validated

- **WHEN** a schema contains `x-input-source` or `x-type`
- **THEN** `x-input-source` SHALL be limited to `file` or `inline`
- **AND** `x-type` SHALL be limited to `artifact` or `file`.

#### Scenario: User skills still shadow built-ins

- **WHEN** a valid user skill and a valid built-in skill share the same skill id
- **THEN** the user skill SHALL remain the effective entry
- **AND** the shadowed built-in entry SHALL be reported in diagnostics.

