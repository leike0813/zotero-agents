## REMOVED Requirements

### Requirement: Region migration preserves the SkillRunner imperative path

Reason: SkillRunner convergence lands in this change. The SkillRunner tab
now renders through the shared assistant child page and its components;
the imperative SkillRunner path it preserved is deleted.

## ADDED Requirements

### Requirement: Assistant child page serves the SkillRunner source

The shared assistant child page (`acp-child.bundle.js`) SHALL boot with
`data-source="skillrunner"` from the SkillRunner page and SHALL render all
SkillRunner chrome regions through the same region components and props
equality boundaries as the ACP sources. SkillRunner-only DOM structures
outside the shared components SHALL NOT be introduced.

#### Scenario: SkillRunner page boots the shared child

- **WHEN** `skillrunner.html` loads with `data-source="skillrunner"`
- **THEN** the shared child runtime boots against the SkillRunner source
- **AND** chrome regions render through the region components with props-level memoization.

### Requirement: Context drawer renders SkillRunner task navigation

For the SkillRunner source, the context drawer component SHALL render the
workspace task navigation as Running and Completed sections containing
backend groups and task cards, preserving selected, related, and disabled
task states and the Completed-section collapse action. SkillRunner tasks
SHALL NOT be flattened into a generic context-entry list.

#### Scenario: SkillRunner navigation renders grouped tasks

- **GIVEN** an owner-navigation publication with running and completed task groups
- **WHEN** the context drawer renders for the SkillRunner source
- **THEN** tasks appear under their Running or Completed section and backend group
- **AND** collapse and selection state behave as they did in the legacy drawer.
