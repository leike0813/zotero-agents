## MODIFIED Requirements

### Requirement: Legacy ACP/SR task state MUST be cleared on separated-store hard cut

Plugin MUST clear legacy ACP Skills and SkillRunner local task state exactly
once when the separated run-store hard-cut schema is first initialized.

The separated run-store schema intentionally starts fresh for ACP Skills and
SkillRunner local run state.

#### Scenario: first startup after separated-store hard cut clears legacy rows

- **WHEN** plugin initializes the separated run-store hard-cut schema for the first time
- **THEN** plugin SHALL clear legacy ACP skill-run rows and SkillRunner request/context/task rows
- **AND** plugin SHALL record a reset marker in `plugin_meta`
- **AND** subsequent startups SHALL NOT clear new run-store data again.

#### Scenario: SkillRunner UI projection ignores legacy rows

- **WHEN** legacy SkillRunner task/request/context rows remain in local state
- **THEN** Dashboard, Task Manager, and assistant workspace SHALL list SkillRunner tasks from the SkillRunner run store
- **AND** they SHALL NOT restore or display tasks from legacy SkillRunner rows.
