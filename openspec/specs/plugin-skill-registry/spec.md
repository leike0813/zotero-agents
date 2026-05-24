# plugin-skill-registry Specification

## Purpose
TBD - created by archiving change define-plugin-skill-registry-and-acp-compatible-contract. Update Purpose after archive.
## Requirements
### Requirement: Plugin discovers user and built-in skills

The system SHALL discover plugin-side skills from `skills/` and `skills_builtin/` without requiring workflow manifests to declare a different request kind.

#### Scenario: Discover valid skills
- **WHEN** the plugin skill registry scans user and built-in roots
- **THEN** entries with both `SKILL.md` and `assets/runner.json` MUST be returned as valid skills
- **AND** each entry MUST include skill id, source kind, source path, checksum, and diagnostics.

#### Scenario: Missing skill roots
- **WHEN** either skill root does not exist
- **THEN** the registry MUST return an empty result for that root
- **AND** scanning MUST NOT fail the whole registry operation.

### Requirement: User skills override built-in skills

The system SHALL use user skills as the effective plugin-side entry when a user skill and a built-in skill share the same skill id.

#### Scenario: Duplicate skill id across sources
- **WHEN** `skills/<id>` and `skills_builtin/<id>` both define the same skill id
- **THEN** the effective registry entry MUST use the user source
- **AND** the shadowed built-in entry MUST be reported in diagnostics.

### Requirement: Registry validates basic skill structure

The system SHALL validate the minimum plugin-side skill structure before a skill is made effective.

#### Scenario: Invalid skill directory
- **WHEN** a candidate skill directory is missing `SKILL.md` or `assets/runner.json`
- **THEN** the registry MUST exclude it from effective entries
- **AND** it MUST report a diagnostic that includes the candidate path and reason.

### Requirement: Registry checksum is deterministic

The system SHALL compute a deterministic checksum for every valid plugin-side skill entry.

#### Scenario: Stable skill content
- **WHEN** the same skill directory is scanned twice without file changes
- **THEN** the registry MUST report the same checksum both times.

#### Scenario: Changed skill content
- **WHEN** a tracked skill file changes
- **THEN** the registry MUST report a different checksum for that skill.

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

