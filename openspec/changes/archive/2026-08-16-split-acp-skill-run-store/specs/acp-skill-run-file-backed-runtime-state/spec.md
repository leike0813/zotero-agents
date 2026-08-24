## ADDED Requirements

### Requirement: ACP Skill run store SHALL own only record and projection core

`acpSkillRunStore` SHALL retain run record persistence, transcript/output
revision projection, deletion, and reset orchestration. Status, controllers,
permissions, runtime catalog, actions, and selection SHALL live in focused
modules.

#### Scenario: Focused modules do not import store values

- **WHEN** a focused ACP Skill run module is loaded
- **THEN** it SHALL NOT import runtime values from `acpSkillRunStore`
- **AND** store-provided callbacks SHALL be the only write path into record
  state

#### Scenario: Store reset orchestrates every module

- **WHEN** ACP Skill runs are reset for tests or shutdown
- **THEN** the store SHALL reset all configured focused modules
- **AND** no module-local state SHALL survive
