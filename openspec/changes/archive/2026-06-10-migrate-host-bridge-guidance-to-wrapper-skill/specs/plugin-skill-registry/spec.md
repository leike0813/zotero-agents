## ADDED Requirements

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
