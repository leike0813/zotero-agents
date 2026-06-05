## ADDED Requirements

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
