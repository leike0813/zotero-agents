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
### Requirement: Registry discovers the Host Bridge CLI wrapper skill



The plugin skill registry SHALL expose the built-in Host Bridge CLI wrapper
skill as a normal built-in skill package.

#### Scenario: Built-in wrapper skill is valid

- **WHEN** the registry scans `skills_builtin/`
- **THEN** `zotero-bridge-cli` SHALL be returned as a built-in skill
- **AND** its directory name, `SKILL.md` frontmatter name, and
  `assets/runner.json` id SHALL all be `zotero-bridge-cli`
- **AND** its resource manifest SHALL include
  `references/host-bridge-cli.md`.
### Requirement: Plugin Skill Registry SHALL scan valid skill packages



The registry SHALL discover valid plugin-side skill packages and expose stable
metadata for ACP SkillRunner-compatible execution.

#### Scenario: Skill frontmatter description is exposed

- **WHEN** a valid `SKILL.md` contains YAML frontmatter with top-level
  `description`
- **THEN** the registry entry SHALL expose that description
- **AND** shared skill catalog entries derived from the registry SHALL preserve
  the same description.

#### Scenario: Missing description remains valid

- **WHEN** a valid skill package omits YAML frontmatter `description`
- **THEN** the registry SHALL still include the skill
- **AND** the exposed description SHALL be an empty string.
### Requirement: Debug-only plugin skills are hidden outside debug mode



The plugin skill registry SHALL omit skills whose `runner.json` declares
`debug_only: true` when debug mode is disabled.

#### Scenario: Debug skill hidden

- **WHEN** debug mode is disabled
- **AND** a plugin skill declares `debug_only: true`
- **THEN** the skill SHALL be absent from the effective plugin skill registry
- **AND** ACP shared skill catalog materialization SHALL not include that skill.

#### Scenario: Debug skill visible

- **WHEN** debug mode is enabled
- **AND** a plugin skill declares `debug_only: true`
- **THEN** the skill SHALL be present in the effective plugin skill registry.
### Requirement: Built-in skills expose current Host Bridge guidance

Built-in skills that instruct agents to use Host Bridge SHALL reference the
current generated `zotero-bridge-cli` wrapper skill guidance.

#### Scenario: Wrapper skill reference uses domain namespaces
- **WHEN** a built-in skill or agent-facing reference describes Host Bridge CLI
  or MCP usage
- **THEN** it SHALL use the domain command families and capability names
- **AND** it SHALL NOT instruct agents to call old public `synthesis.*`
  capability names or `zotero-bridge synthesis` semantic commands.
