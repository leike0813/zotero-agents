# plugin-skill-registry Specification Delta

## MODIFIED Requirements

### Requirement: Plugin discovers user and built-in skills

The system SHALL discover plugin-side skills from installed official content,
optional dev-local content, and `skills/` user content without requiring
workflow manifests to declare a different request kind.

#### Scenario: Discover valid skills

- **WHEN** the plugin skill registry scans user and official roots
- **THEN** entries with both `SKILL.md` and `assets/runner.json` MUST be
  returned as valid skills
- **AND** each entry MUST include skill id, source kind, source path, checksum,
  and diagnostics.
- **AND** the directory name, `SKILL.md` frontmatter `name`, and
  `assets/runner.json` id MUST match.

### Requirement: User skills override built-in skills

The system SHALL use user skills as the effective plugin-side entry when a user
skill and an official skill share the same skill id.

#### Scenario: Duplicate skill id across sources

- **WHEN** `skills/<id>` and installed official content both define the same
  skill id
- **THEN** the effective registry entry MUST use the user source
- **AND** the shadowed official entry MUST be reported in diagnostics.

### Requirement: Registry discovers the Host Bridge CLI wrapper skill

The plugin skill registry SHALL expose the official Host Bridge CLI wrapper
skill as a normal official skill package after the official content package is
installed.

#### Scenario: Official wrapper skill is valid

- **WHEN** the registry scans installed official skills
- **THEN** `zotero-bridge-cli` SHALL be returned as an official skill when it is
  present in installed official content
- **AND** its directory name, `SKILL.md` frontmatter name, and
  `assets/runner.json` id SHALL all be `zotero-bridge-cli`.
