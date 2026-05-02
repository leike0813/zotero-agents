# builtin-workflow-package-and-sync Specification

## Purpose
TBD - created by archiving change builtin-workflows-package-and-startup-sync. Update Purpose after archive.
## Requirements
### Requirement: Plugin package MUST include built-in workflows

The release package MUST include `workflows_builtin/**` as built-in workflow source files and `skills_builtin/**` as built-in plugin skill source files.

#### Scenario: Build artifact contains built-in workflow files
- **WHEN** the plugin build artifact is produced
- **THEN** `workflows_builtin/**` MUST be included in the packaged assets
- **AND** `skills_builtin/**` MUST be included in the packaged assets.

### Requirement: Startup MUST synchronize built-in workflows into local built-in directory

On startup, the system MUST synchronize packaged built-in workflows to local built-in target directory with force-overwrite semantics.

#### Scenario: Force overwrite local built-in directory
- **WHEN** startup sync runs
- **THEN** local built-in directory MUST be replaced by packaged built-in files
- **AND** stale built-in files not present in package MUST be removed

#### Scenario: Sync failure does not block startup
- **WHEN** built-in sync fails due to runtime IO/resource error
- **THEN** the system MUST continue startup flow
- **AND** the failure SHOULD be logged for diagnostics

#### Scenario: Source/target path safety guard
- **WHEN** built-in source and target directories are the same path or nested paths
- **THEN** synchronization MUST be rejected
- **AND** user workflow directory MUST remain untouched

#### Scenario: Sync replace failure keeps previous copy
- **WHEN** staging succeeds but target replacement fails
- **THEN** previously available built-in directory copy MUST remain available for subsequent loading
- **AND** startup flow MUST continue with warning logs

### Requirement: Workflow registry MUST merge built-in and user directories with user precedence

Registry loading MUST scan both local built-in directory and user `workflowDir`, and resolve same-id conflicts in favor of user workflows.

#### Scenario: Same workflow id exists in both directories
- **WHEN** built-in and user directories both contain workflow with same id
- **THEN** registry MUST use user workflow as effective entry
- **AND** registry SHOULD emit a warning about id override

### Requirement: Dashboard MUST show built-in marker only for effective built-in workflows

Dashboard home workflow bubbles MUST include a built-in marker for workflows whose effective source is built-in.

#### Scenario: User workflow overrides built-in id
- **WHEN** user directory provides same-id workflow overriding built-in
- **THEN** dashboard MUST treat effective source as user
- **AND** built-in marker MUST NOT be shown for that workflow

### Requirement: Preferences workflow path hints MUST avoid dynamic runtime placeholders

Preferences workflow section MUST avoid rendering built-in sync path interpolation and placeholder copy that can drift from runtime data.

#### Scenario: Workflow preferences render path hints
- **WHEN** preferences workflow section is rendered
- **THEN** it MUST keep only stable user workflow directory guidance
- **AND** it MUST NOT render built-in sync directory placeholder interpolation

