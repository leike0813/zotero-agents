## MODIFIED Requirements

### Requirement: Plugin package MUST include built-in workflows

The release package MUST include `workflows_builtin/**` as built-in workflow source files and `skills_builtin/**` as built-in plugin skill source files.

#### Scenario: Build artifact contains built-in workflow files
- **WHEN** the plugin build artifact is produced
- **THEN** `workflows_builtin/**` MUST be included in the packaged assets
- **AND** `skills_builtin/**` MUST be included in the packaged assets.
