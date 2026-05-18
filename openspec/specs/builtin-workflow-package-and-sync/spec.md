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

On startup, the system MUST synchronize packaged built-in workflows to local
built-in target directory with force-overwrite semantics, using runtime-safe
packaged resource candidates across Zotero 7 and Zotero 9.

#### Scenario: Runtime resource candidates are tried deterministically

- **WHEN** startup sync reads a packaged built-in workflow file
- **THEN** it SHALL try root URI fetch before resource URI fetch
- **AND** it SHALL then try privileged request, unpacked filesystem, and
  development cwd fallbacks.

#### Scenario: Sync failure includes source diagnostics

- **WHEN** all packaged resource candidates fail
- **THEN** the sync error SHALL include candidate labels and compact failure
  reasons
- **AND** startup SHALL record the latest built-in sync failure diagnostics.

#### Scenario: Force overwrite local built-in directory

- **WHEN** startup sync runs
- **THEN** local built-in directory MUST be replaced by packaged built-in files
- **AND** stale built-in files not present in package MUST be removed.

#### Scenario: Sync failure does not block startup

- **WHEN** built-in sync fails due to runtime IO/resource error
- **THEN** the system MUST continue startup flow
- **AND** the failure SHOULD be logged for diagnostics.

### Requirement: Workflow registry MUST merge built-in and user directories with user precedence

Registry loading MUST scan both local built-in directory and user `workflowDir`,
resolve same-id conflicts in favor of user workflows, and retain built-in sync
diagnostics for debugging.

#### Scenario: Registry exposes failed built-in sync context

- **WHEN** built-in synchronization failed before registry scan
- **THEN** registry state SHALL expose the latest sync diagnostic
- **AND** loaded builtin/user workflow counts SHALL remain separately visible.

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

