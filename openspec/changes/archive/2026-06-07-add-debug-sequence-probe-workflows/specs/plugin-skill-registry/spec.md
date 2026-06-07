## ADDED Requirements

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
