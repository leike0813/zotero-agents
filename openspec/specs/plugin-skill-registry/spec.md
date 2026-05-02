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

